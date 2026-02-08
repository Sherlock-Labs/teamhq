# Session Runner Backend Analysis: Multi-Turn Support

**Author:** Jonah (Back-End Developer)
**Date:** 2026-02-07

---

## Current Architecture Summary

The session runner (`server/src/session/runner.ts`) operates in a **fire-and-forget single-turn model**:

1. `SessionRunner.start()` spawns `claude -p --verbose --output-format stream-json` as a child process
2. The full prompt is written to `stdin`, then **`stdin.end()` is called immediately** (line 102)
3. NDJSON events are parsed from `stdout` via `readline`
4. When the process exits, the session is finalized
5. A 30-minute timeout kills the process if it runs too long

Key constraint: once `stdin.end()` is called, there is no way to send follow-up messages. The Claude process runs to completion on the initial prompt and exits. This is the fundamental limitation that blocks multi-turn support.

### Supporting Infrastructure

- **SessionManager** (`session/manager.ts`): Tracks running sessions in a `Map<sessionId, runner>`, enforces max 3 concurrent sessions, prevents duplicate sessions per project. Cleans up on session end.
- **SSE endpoint** (`routes/sessions.ts`): Clients connect to `GET /sessions/:sessionId/events`, receive replayed NDJSON history + live events via `runner.on("event", ...)`. Heartbeat every 15s. Reconnection via `offset` or `Last-Event-ID`.
- **Session store** (`store/sessions.ts`): Metadata JSON + NDJSON event log per session, stored in `data/sessions/{projectId}/{sessionId}.json` and `.ndjson`.
- **Recovery** (`session/recovery.ts`): On server restart, marks any `status: "running"` sessions as `"failed"` and clears their `activeSessionId` on the parent project.

---

## 1. SessionRunner Changes for Multi-Turn

### The Core Problem

`stdin.end()` on line 102 signals EOF to the child process. Claude CLI in `-p` (pipe) mode treats EOF as "prompt complete, process it and exit." There is no protocol for sending additional messages through the same stdin pipe after EOF.

### Options

#### Option A: Keep stdin open, use a delimiter protocol

Instead of `child.stdin.end()`, keep the pipe open and write follow-up messages when the user (or system) wants to send them. This requires Claude CLI to support a delimiter-based multi-message protocol on stdin.

**Requirements from Claude CLI:**
- Claude CLI must support a mode where stdin remains open and accepts multiple messages separated by a known delimiter (e.g., newline-separated JSON, or a special `\x04` / `\x00` sentinel)
- Claude CLI must emit an "idle" or "turn_complete" event on stdout to signal it's ready for the next input
- Claude CLI must not exit when a single prompt is processed -- it stays alive waiting for more input

**Runner changes:**
- Remove `child.stdin.end()` after initial prompt write
- Add a `sendMessage(text: string)` method that writes to `child.stdin`
- Add idle detection: parse a new `turn_complete` or `idle` event type from the NDJSON stream
- Keep the timeout logic but reset it on each new message (activity-based timeout instead of wall-clock)

**Verdict:** This is the cleanest approach, but it depends on Claude CLI supporting a multi-turn stdin protocol. As of the current implementation, `claude -p` does not support this. Marco's research should confirm whether this is available or on the CLI roadmap.

#### Option B: Use `claude --resume <conversation-id>` for follow-up turns

Claude CLI may support a `--resume` flag that re-enters an existing conversation. Each follow-up message spawns a new child process that resumes the prior conversation's context.

**Requirements from Claude CLI:**
- Claude CLI must support `--resume <conversation-id>` to continue a previous conversation
- The conversation ID must be emitted in the initial session's output (e.g., in the `system` or `result` event)

**Runner changes:**
- After the first turn completes, capture the conversation ID from the output
- On follow-up, spawn a new `claude -p --resume <id>` process with the new message on stdin
- The runner manages a sequence of child processes rather than a single long-lived one
- NDJSON parsing stays identical -- each child process emits the same event types
- Event counter continues incrementing across turns (don't reset)

**Verdict:** More compatible with the current architecture since each turn is still a discrete process spawn. The downside is process startup latency between turns and potential conversation context limits. This approach degrades gracefully -- if `--resume` isn't available, the system still works for single-turn.

#### Option C: Use Claude SDK/API directly instead of CLI

Bypass the CLI entirely and call the Claude API (or a local SDK) to manage conversations with explicit message history.

**Verdict:** Out of scope. The entire infrastructure is built around the CLI, and the CLI handles permissions, tool use, and agent teams. Rewriting this as API calls would be a different project entirely.

### Recommendation

**Option B (--resume) as the primary path, with Option A as a future upgrade if the CLI adds a persistent-stdin mode.**

Reasoning:
1. Option B works with the existing process-per-turn model, minimizing changes to the runner, manager, SSE pipeline, and recovery logic.
2. Option A requires CLI changes that may not exist yet. If they do exist or are imminent (Marco's research will tell us), we can adopt it instead.
3. Option B is more resilient -- if a turn crashes, the conversation can still be resumed from the next turn. Option A loses everything if the single long-lived process dies.

---

## 2. Process Lifecycle Management

### Current Model (single-turn)

```
spawn -> write stdin -> stdin.end() -> parse stdout -> process exits -> cleanup
```

Lifecycle is simple: one process, one prompt, one exit. The 30-minute timeout is a hard wall clock limit.

### Multi-Turn Model (proposed)

Two sub-models depending on the option chosen:

#### If Option A (persistent process):

```
spawn -> write message 1 -> [idle] -> write message 2 -> [idle] -> ... -> stdin.end() -> exit -> cleanup
```

**New lifecycle concerns:**

- **Activity timeout vs wall-clock timeout**: The current 30-minute timeout makes sense for a single turn. For multi-turn, we need both:
  - **Turn timeout** (e.g., 30 min): how long a single turn can run before we consider it stuck
  - **Session idle timeout** (e.g., 60 min): how long the session can sit idle between turns before we reclaim resources
  - **Session max lifetime** (e.g., 4 hours): hard cap to prevent zombie processes
- **Process health monitoring**: A long-lived process could become a zombie, consume excessive memory, or hang. We need:
  - Periodic PID checks (`process.kill(pid, 0)` to check if alive)
  - Memory monitoring (read `/proc/{pid}/status` or use `ps`)
  - Heartbeat expectation: if no stdout for N minutes during an active turn, consider it stuck
- **Graceful shutdown**: `SIGTERM` with a 10-second `SIGKILL` fallback (already implemented). But now we also need a way to "pause" a session (close the browser tab) without killing the process, and "resume" later (reconnect SSE).

#### If Option B (process-per-turn):

```
[Turn 1] spawn -> write stdin -> stdin.end() -> exit -> capture conversation ID
[Turn 2] spawn --resume <id> -> write stdin -> stdin.end() -> exit
...
[End] session marked complete
```

**New lifecycle concerns:**

- **Inter-turn state**: Between turns, there's no running process. The session is "paused" by default. Need a new status: `"waiting"` (between turns, ready for input).
- **Session metadata evolution**: The metadata needs to track:
  - `conversationId`: The Claude conversation ID for `--resume`
  - `turnCount`: How many turns have been executed
  - `currentTurnPid`: PID of the currently active turn's process (null between turns)
- **Turn sequencing**: Only one turn can run at a time per session. Need to reject concurrent `sendMessage` calls if a turn is already in progress.
- **Cleanup between turns**: The runner needs to reset per-turn state (event buffering, streamed block tracking) but preserve per-session state (event counter, conversation ID, total event log).

### Recommendation

Option B's lifecycle is simpler and more robust:
- No zombie process risk between turns
- Server restarts between turns are harmless (no process to recover)
- Resource usage is proportional to active work, not idle wait time
- Recovery is trivial: if a turn fails, try resuming again

---

## 3. Event Stream Implications

### NDJSON Parsing

The core NDJSON parsing in `parseCliEvent()` **does not need to change** for either option. Claude CLI emits the same event types (`system`, `content_block_start`, `content_block_delta`, `assistant`, `tool_result`, `result`) regardless of whether it was invoked fresh or via `--resume`.

### New Event Types Needed

The session event schema (`SessionEvent`) uses a flexible `data: z.record(z.unknown())` structure, so we can add new server-originated event types without schema changes. New event types to introduce:

| Event Type | Purpose | Data Fields |
|------------|---------|-------------|
| `turn_start` | Marks the beginning of a new turn | `{ turnNumber, message (truncated) }` |
| `turn_end` | Marks the end of a turn (process exited) | `{ turnNumber, exitCode, durationMs }` |
| `waiting_for_input` | Session is idle between turns | `{ turnNumber }` |
| `user_message` | The follow-up message sent by the user | `{ message (truncated), turnNumber }` |

These are emitted by the runner, not parsed from Claude CLI output. They give the frontend clear signals to update the UI (e.g., show an input prompt, update status indicators).

### SessionEventType Schema Update

```typescript
export const SessionEventType = z.enum([
  "assistant_text",
  "tool_use",
  "tool_result",
  "system",
  "error",
  // New for multi-turn:
  "turn_start",
  "turn_end",
  "waiting_for_input",
  "user_message",
]);
```

### Event Counter Continuity

The `eventCounter` in the runner must persist across turns. In Option B, this means either:
- The runner instance stays alive across turns (recommended -- the runner represents the session, not the process)
- Or the counter is loaded from the NDJSON file length on resume

Since the runner already extends `EventEmitter` and the SSE endpoint subscribes to it, keeping the runner alive between turns is the right call. The runner's relationship to a child process changes from 1:1 to 1:N.

### NDJSON Log Continuity

All events from all turns append to the same `{sessionId}.ndjson` file. The `turn_start` / `turn_end` markers let the frontend (and any replay logic) understand turn boundaries. The existing `readEventLog()` with offset-based pagination works unchanged.

---

## 4. Concurrency Concerns

### Current State

- **Max 3 concurrent sessions** (enforced by `SessionManager`)
- **Max 1 session per project** (enforced by `projectToSession` map)
- Registration is synchronous after the `canStartSession()` check (no await gap = no race condition)

### New Concerns

#### 4a. Concurrent messages to the same session

If the user sends a follow-up message while a turn is still running, we must reject it. The runner needs a `state` field:

```typescript
type RunnerState = "idle" | "processing" | "ended";
```

- `idle`: Between turns, ready for input
- `processing`: A turn is active (child process running)
- `ended`: Session is complete, no more turns accepted

The `sendMessage()` method checks state and rejects if not `idle`.

#### 4b. Race between stop and sendMessage

If a stop request and a sendMessage arrive simultaneously:
- `stop()` sets `killed = true` and sends SIGTERM
- `sendMessage()` checks `killed` before writing to stdin (Option A) or spawning a new process (Option B)
- Both operations should be serialized through the runner's state machine

#### 4c. Server restart during an active turn

This is already handled by `recovery.ts`, which marks running sessions as failed on startup. For multi-turn sessions:
- If a turn was active: mark session as failed (same as current)
- If the session was between turns (idle/waiting): the session can be recovered since no process is running. Mark as `waiting_for_input` and allow the user to resume.

This is a significant advantage of Option B: inter-turn sessions survive server restarts.

#### 4d. SSE client disconnect and reconnect

Already handled correctly. The SSE endpoint replays events from the NDJSON log using `offset`, and subscribes to live events from the runner. This works identically for multi-turn -- events from all turns are in the same log, and the runner stays alive across turns.

#### 4e. Multiple SSE clients watching the same session

Already supported. Multiple clients can `GET /sessions/:sessionId/events` simultaneously. Each gets its own `onEvent` listener on the runner. No changes needed.

#### 4f. Session cleanup

The runner's `"end"` event currently triggers cleanup in the manager. For multi-turn:
- A turn ending does NOT trigger session cleanup (only the turn's child process exits)
- Session cleanup triggers when:
  - The user explicitly stops the session
  - The session times out (max lifetime exceeded)
  - The session is programmatically closed (e.g., the agent team finishes its work and the final `result` event indicates completion)

This means the runner needs to distinguish between "turn ended" and "session ended." The `"end"` event should only fire for session end, not turn end. Add a separate `"turn_end"` event for turn completion.

---

## 5. API Surface Changes

### New Endpoints

#### `POST /api/projects/:id/sessions/:sessionId/message`

Send a follow-up message to a running (but idle) session.

```typescript
// Request
{ message: string }

// Response (202 Accepted)
{ turnNumber: number, status: "processing" }

// Error responses
// 404: Session not found
// 409: Session is not idle (turn in progress, or session ended)
// 400: Message is empty or too long
```

This endpoint:
1. Validates the session exists and is in `waiting_for_input` state
2. Writes a `user_message` event to the NDJSON log
3. Writes a `turn_start` event
4. Starts the new turn (Option A: writes to stdin; Option B: spawns new process with `--resume`)
5. Returns immediately with 202 (the turn runs asynchronously, results stream via SSE)

#### `GET /api/projects/:id/sessions/:sessionId` (modified)

The existing metadata endpoint should return additional fields:

```typescript
// New fields in SessionMetadata
{
  // ... existing fields ...
  conversationId: string | null;  // Claude conversation ID for --resume
  turnCount: number;              // Total turns completed
  state: "processing" | "idle" | "ended";  // Finer-grained than status
}
```

The `state` field is distinct from `status`:
- `status` is the session's final outcome (`running`, `completed`, `failed`, `stopped`, `timed-out`)
- `state` is the session's current operational state (is it actively running a turn, waiting for input, or done?)

For backward compatibility, `status` remains `"running"` while the session is active (whether processing or idle). The new `state` field provides the finer-grained distinction.

#### `POST /api/projects/:id/sessions/:sessionId/stop` (unchanged)

Already exists. Behavior changes slightly:
- If a turn is active: kills the child process (same as now), then marks session as stopped
- If idle between turns: marks session as stopped immediately (no process to kill)

### No New Endpoints Needed For:

- **Session creation** (`POST /sessions`): Unchanged. First turn is still the kickoff prompt.
- **Session listing** (`GET /sessions`): Unchanged.
- **SSE stream** (`GET /sessions/:sessionId/events`): Unchanged. New event types flow through the same pipe.
- **Event log** (`readEventLog`): Unchanged. All turns' events are in one file.

---

## 6. Schema Changes Summary

### `SessionMetadata` (schema update)

```typescript
export const SessionMetadataSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: SessionStatus,
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  durationMs: z.number().nullable(),
  eventCount: z.number(),
  exitCode: z.number().nullable(),
  error: z.string().nullable(),
  pid: z.number().nullable(),
  // New fields:
  conversationId: z.string().nullable().default(null),
  turnCount: z.number().default(1),
  state: z.enum(["processing", "idle", "ended"]).default("processing"),
});
```

All new fields have defaults, so existing metadata files are forward-compatible (Zod defaults fill missing fields on parse).

### `SessionEventType` (schema update)

Four new event types as described in section 3.

### `SessionRunnerOptions` (code change, not persisted)

Needs a new optional field:
```typescript
interface SessionRunnerOptions {
  // ... existing ...
  conversationId?: string;  // For resuming existing conversations
}
```

---

## 7. Runner Refactoring Sketch

The `SessionRunner` class changes from "manages one child process" to "manages a session with multiple turns." Here's the structural change:

```typescript
export class SessionRunner extends EventEmitter {
  // Existing
  private metadata: SessionMetadata;
  private eventCounter: number = 0;
  private killed: boolean = false;

  // Renamed/repurposed
  private currentProcess: ChildProcess | null = null;  // was: process
  private turnTimeoutTimer: NodeJS.Timeout | null = null;  // was: timeoutTimer

  // New
  private conversationId: string | null = null;
  private turnCount: number = 0;
  private state: "processing" | "idle" | "ended" = "processing";
  private idleTimeoutTimer: NodeJS.Timeout | null = null;

  // New method
  async sendMessage(message: string): Promise<void> {
    if (this.state !== "idle") throw new Error("Session is not idle");
    if (this.killed) throw new Error("Session has been stopped");

    this.state = "processing";
    this.turnCount++;
    this.emitSessionEvent({ type: "user_message", data: { message: message.slice(0, 500), turnNumber: this.turnCount } });
    this.emitSessionEvent({ type: "turn_start", data: { turnNumber: this.turnCount } });

    // Option B: spawn new process with --resume
    this.spawnTurn(message);
  }

  private spawnTurn(prompt: string): void {
    const args = ["-p", "--verbose", "--output-format", "stream-json", "--include-partial-messages", "--dangerously-skip-permissions"];
    if (this.conversationId) {
      args.push("--resume", this.conversationId);
    }

    const child = spawn("claude", args, { /* same opts */ });
    this.currentProcess = child;
    // ... same NDJSON parsing ...
    // On close: emit turn_end, set state to "idle", DO NOT emit session "end"
    // Capture conversationId from system/result event if present
  }

  // Modified: start() becomes "start first turn"
  start(): void {
    this.turnCount = 1;
    this.emitSessionEvent({ type: "turn_start", data: { turnNumber: 1 } });
    this.spawnTurn(this.options.prompt);
  }

  // Modified: stop kills current process AND ends the session
  stop(): void {
    this.killed = true;
    this.state = "ended";
    if (this.currentProcess) {
      this.currentProcess.kill("SIGTERM");
      // ... SIGKILL fallback ...
    }
    // Emit session end
  }
}
```

The key insight: **the runner's lifetime now spans multiple child processes.** The runner stays registered in `SessionManager` between turns. The SSE endpoint keeps its listener on the runner. The NDJSON log keeps appending. Only the child process changes.

---

## 8. Open Questions for Andrei / Marco

1. **Does Claude CLI support `--resume`?** If not, what's the alternative for multi-turn? Is there a conversation ID in the output we can use?

2. **Does Claude CLI support a persistent-stdin mode?** (Option A). If so, what's the delimiter protocol? Is there an "idle" event emitted when a turn is complete?

3. **Agent teams across turns:** If the first turn creates a team with `TeamCreate`, does `--resume` preserve the team context? Or do we need to re-establish the team on each turn?

4. **Conversation context limits:** How much context does `--resume` carry forward? If a session has 20 turns, does the 20th turn have the full history or is it truncated?

5. **Session timeout policy:** Currently 30 minutes wall-clock. For multi-turn, do we want:
   - 30-minute per-turn timeout (same as now, per turn)?
   - 60-minute idle timeout (session closes if no follow-up within an hour)?
   - 4-hour max session lifetime?
   - Configurable per project?

6. **Who sends follow-up messages?** The current UI has no input mechanism during a session. Is the follow-up message sent by:
   - The CEO directly via a text input in the session UI?
   - The system automatically (e.g., when QA fails, re-run with feedback)?
   - Another agent via `SendMessage`?

   This affects the API design -- if it's user-initiated, we need a frontend input component. If it's system-initiated, we need an internal API.

---

## 9. Migration Path

### Phase 1 (minimal viable multi-turn)

1. Add `conversationId`, `turnCount`, `state` to `SessionMetadata` schema (with defaults for backward compat)
2. Add `turn_start`, `turn_end`, `waiting_for_input`, `user_message` event types
3. Refactor `SessionRunner` to separate turn lifecycle from session lifecycle
4. Add `POST /sessions/:sessionId/message` endpoint
5. Modify `SessionManager` cleanup to not remove sessions that are between turns
6. Update `recovery.ts` to handle `state: "idle"` sessions (don't mark as failed)

### Phase 2 (robustness)

7. Add idle timeout (reclaim sessions that sit idle too long)
8. Add max session lifetime
9. Add turn history to metadata (array of `{ turnNumber, startedAt, endedAt, exitCode }`)
10. Frontend input component for sending follow-up messages

### What Stays the Same

- NDJSON event log format and file storage
- SSE endpoint protocol (event types are additive)
- Session listing and history
- The 30-minute per-turn timeout
- `stopAll()` on server shutdown
- Event replay with offset-based pagination

---

## 10. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Claude CLI doesn't support `--resume` or equivalent | High | Medium | Marco's research will confirm. Fallback: Option A (persistent stdin) or full-context replay (expensive). |
| Long-lived sessions accumulate too many events | Medium | Medium | Existing MAX_EVENTS (5000) cap. Could increase for multi-turn but need to monitor NDJSON file sizes. |
| Idle sessions consume SessionManager slots | Medium | High | Idle timeout reclaims slots. Consider not counting idle sessions against the max-3 concurrent limit. |
| Conversation context window overflows after many turns | Medium | Low-Medium | Claude CLI likely handles this internally with summarization. But we should understand the behavior. |
| Server restart loses idle session state | Low | Medium | Option B is resilient: idle sessions have no process. Just need to preserve metadata and conversationId. Recovery already handles this. |
| Race conditions between message/stop/timeout | Medium | Low | State machine in runner serializes transitions. Only `idle` -> `processing` on message, only `processing` -> `idle` on turn end. |
