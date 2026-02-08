# Session Runner Tech Approach: Multi-Turn Architecture

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-07
**Status:** Complete (revised — CLI-only, no API key)
**Inputs:** Thomas's requirements, Marco's research (`session-runner-research.md`), Jonah's analysis (`session-runner-backend-analysis.md`)

---

## Constraint

**No API key.** The CEO confirmed that TeamHQ runs on Claude CLI subscription auth (Pro/Max). The Agent SDK requires a separate `ANTHROPIC_API_KEY` with separate billing — that's off the table. The architecture must use the `claude` CLI binary.

This eliminates the Agent SDK approach from the previous version of this doc. The three remaining CLI-based options are:

1. **`--input-format stream-json`** — persistent process, keep stdin open, write follow-up messages as NDJSON
2. **`--resume`** — process-per-turn, chain sequential single-turn calls with session persistence
3. **Interactive mode with stream-json** — run `claude` (not `-p`) with `--output-format stream-json`, manage the conversation loop

---

## Architecture Decision: Dual-Mode CLI Runner

**Decision:** Build a `SessionRunner` that supports two CLI strategies behind a common interface. Try `--input-format stream-json` as the primary mode. Fall back to `--resume` if the streaming input mode fails or hangs.

**Why not pick just one?**

- **`--input-format stream-json`** is the right architecture (single long-lived process, no turn latency, real-time streaming throughout) but Marco found known bugs (#3187 hanging on 2nd message, #5034 duplicate entries). These bugs are from older reports and may be resolved in the current CLI version, but we can't know until we test.
- **`--resume`** is safe and proven (it's how `claude -c` works) but has real drawbacks: 2-5 second startup latency per turn, no streaming between turns, and concurrent teammate reports need a queue to prevent session corruption.

The pragmatic call: **build the streaming mode first, validate it works, and keep `--resume` as a tested fallback.** Both modes share the same `SessionRunner` interface — same event types, same SSE contract, same API surface. Jonah can swap between them with a config flag.

### Rejected

| Approach | Why Rejected |
|----------|-------------|
| Agent SDK | Requires `ANTHROPIC_API_KEY` — hard blocker from CEO |
| Interactive mode (`claude` without `-p`) | Designed for terminal interaction. No clear programmatic input protocol. The REPL prompt detection is fragile. |
| MCP server pattern | Inverts control flow. Over-engineered for our needs. |

---

## How the Two Modes Work

### Mode A: Streaming Input (`--input-format stream-json`)

```
spawn claude -p --input-format stream-json --output-format stream-json ...
  │
  ├─ write NDJSON message 1 to stdin ──→ Claude processes turn 1
  │                                       ├─ NDJSON events on stdout
  │                                       └─ result event (turn complete)
  │
  ├─ write NDJSON message 2 to stdin ──→ Claude processes turn 2
  │                                       ├─ NDJSON events on stdout
  │                                       └─ result event (turn complete)
  │
  └─ stdin.end() ──→ Claude exits
```

**Key characteristics:**
- Single long-lived process for the entire session
- stdin stays open — we write NDJSON lines as follow-up messages
- stdout is a continuous stream of NDJSON events across all turns
- Turn boundaries detected by `result` events in the output stream
- Process exits when we close stdin or send SIGTERM

**Stdin message format** (per Marco's research):
```jsonl
{"type":"user","message":{"role":"user","content":"Start the project"}}
```

**Turn detection:** Watch for `result` type events in the NDJSON output. When a `result` event arrives, the current turn is complete and Claude is ready for the next message on stdin.

### Mode B: Session Resume (`--resume`)

```
[Turn 1] spawn claude -p "kickoff prompt" --output-format stream-json ...
           ├─ NDJSON events on stdout
           ├─ result event (includes session_id)
           └─ process exits → capture session_id

[Turn 2] spawn claude -p "follow-up message" --resume <session_id> --output-format stream-json ...
           ├─ NDJSON events on stdout
           ├─ result event
           └─ process exits

[Turn N] ... repeat ...
```

**Key characteristics:**
- Each turn is a separate process
- Session context is persisted to disk by the CLI between turns
- `session_id` captured from the `result` event of the first turn
- No process running between turns (session is "paused")
- 2-5 second startup latency per turn (context reloading)

**Session ID extraction:** The `result` event from `claude -p` includes a `session_id` field. Parse it from the NDJSON output.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│  Frontend (projects.js)                               │
│  - SSE client (unchanged)                             │
│  - Agent banners, event grouping (Phase 1, unchanged) │
│  - Future: message input for follow-up turns          │
│                                                       │
│  GET /sessions/:id/events  (SSE, unchanged)           │
│  POST /sessions/:id/message (new)                     │
└──────────────┬───────────────────────────┬────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────────────────────────────────┐
│  Express Routes (routes/sessions.ts)                  │
│  - POST /sessions           → create + start          │
│  - GET /sessions/:id/events → SSE stream (unchanged)  │
│  - POST /sessions/:id/message → inject user message   │
│  - POST /sessions/:id/stop    → stop session          │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  SessionRunner (refactored)                           │
│                                                       │
│  Common interface regardless of mode:                 │
│  - start()        → begin first turn                  │
│  - sendMessage()  → inject follow-up message          │
│  - stop()         → end session                       │
│  - on("event")    → SessionEvent stream               │
│  - on("end")      → session finalized                 │
│                                                       │
│  Internally dispatches to:                            │
│  - StreamingRunner  (--input-format stream-json)      │
│  - ResumeRunner     (--resume <session_id>)           │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  claude CLI (subscription auth)                       │
│  --output-format stream-json                          │
│  --verbose --include-partial-messages                  │
│  --dangerously-skip-permissions                        │
│  CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1               │
└──────────────────────────────────────────────────────┘
```

### What Changes

| Component | Change |
|-----------|--------|
| `SessionRunner` | Refactored — split into common base + two mode implementations |
| `SessionManager` | Minor — state semantics change (idle sessions stay registered between turns) |
| `routes/sessions.ts` | New `POST /:sessionId/message` endpoint |
| `schemas/session.ts` | Additive — new event types, new metadata fields |
| `store/sessions.ts` | No change |
| `recovery.ts` | Updated — handle idle-between-turns sessions |
| `kickoff.ts` | No change |
| `server/package.json` | No new dependencies |
| Frontend (`projects.js`) | No change |

### What Stays the Same

- NDJSON event log format and file storage
- SSE endpoint protocol (`session_event`, `session_done`)
- Event replay with offset-based pagination
- Session listing and history API
- Frontend rendering (Phase 1 agent banners, event grouping, etc.)
- `SessionManager` concurrency limits (max 3 sessions, 1 per project)
- Project schema and store
- No new npm dependencies

---

## SessionRunner Refactoring

### State Machine

The runner tracks session state independent of which mode it uses:

```typescript
type RunnerState = "processing" | "idle" | "ended";
```

- **`processing`** — a turn is active (CLI process is running and producing events)
- **`idle`** — between turns, ready for a follow-up message (Mode A: process alive, waiting for stdin; Mode B: no process running)
- **`ended`** — session is complete, no more turns accepted

State transitions:

```
start()        → processing
result event   → idle         (turn complete, ready for next message)
sendMessage()  → processing   (new turn started)
stop()         → ended        (session terminated)
finalize()     → ended        (all turns done, session complete)
```

### Common Base

```typescript
export class SessionRunner extends EventEmitter {
  private state: RunnerState = "processing";
  private turnCount: number = 0;
  private metadata: SessionMetadata;
  private eventCounter: number = 0;
  private cliSessionId: string | null = null;  // captured from result event
  private idleTimer: NodeJS.Timeout | null = null;
  private maxLifetimeTimer: NodeJS.Timeout | null = null;

  // Per-turn state (reset between turns)
  protected process: ChildProcess | null = null;
  protected lastToolName: string = "";
  protected streamedTextBlockIds: Set<number> = new Set();
  protected currentContentBlockIndex: number = -1;
  protected killed: boolean = false;

  constructor(protected options: SessionRunnerOptions) {
    super();
    // ... metadata init (same as current) ...
  }

  // --- Public API (same for both modes) ---

  start(): void {
    this.turnCount = 1;
    this.emitSessionEvent({ type: "system", data: { message: "Session started" } });
    this.emitSessionEvent({ type: "turn_start", data: { turnNumber: 1 } });
    this.startMaxLifetimeTimer();
    this.spawnTurn(this.options.prompt);
  }

  sendMessage(message: string): void {
    if (this.state !== "idle") throw new Error("Session is not idle");
    if (this.killed) throw new Error("Session has been stopped");

    this.clearIdleTimer();
    this.state = "processing";
    this.turnCount++;
    this.emitSessionEvent({
      type: "user_message",
      data: { message: message.slice(0, 500), turnNumber: this.turnCount }
    });
    this.emitSessionEvent({
      type: "turn_start",
      data: { turnNumber: this.turnCount }
    });
    this.deliverMessage(message);
  }

  stop(): void {
    if (this.state === "ended") return;
    this.killed = true;
    this.state = "ended";
    this.clearIdleTimer();
    this.clearMaxLifetimeTimer();
    this.killProcess();
    this.finalize("stopped");
  }

  get currentState(): RunnerState { return this.state; }
  get sessionTurnCount(): number { return this.turnCount; }

  // --- Abstract: mode-specific behavior ---

  protected abstract spawnTurn(prompt: string): void;
  protected abstract deliverMessage(message: string): void;
  protected abstract killProcess(): void;

  // ... (parseCliEvent, emitSessionEvent, finalize — same as current runner)
}
```

### Mode A: StreamingRunner

```typescript
export class StreamingRunner extends SessionRunner {
  private turnTimeoutTimer: NodeJS.Timeout | null = null;

  protected spawnTurn(prompt: string): void {
    const child = spawn("claude", [
      "-p",
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--dangerously-skip-permissions",
    ], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: this.options.workingDirectory,
      env: { ...process.env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
    });

    this.process = child;
    this.metadata.pid = child.pid ?? null;

    // Write initial message as NDJSON (don't close stdin!)
    const ndjsonMessage = JSON.stringify({
      type: "user",
      message: { role: "user", content: prompt }
    });
    child.stdin.write(ndjsonMessage + "\n");
    // NOTE: do NOT call child.stdin.end()

    this.startTurnTimeout();
    this.setupOutputParsing(child);
    this.setupProcessHandlers(child);
  }

  protected deliverMessage(message: string): void {
    // Write follow-up message to the same process's stdin
    if (!this.process || !this.process.stdin.writable) {
      throw new Error("Process stdin not available");
    }

    const ndjsonMessage = JSON.stringify({
      type: "user",
      message: { role: "user", content: message }
    });
    this.process.stdin.write(ndjsonMessage + "\n");
    this.resetTurnState();
    this.startTurnTimeout();
  }

  protected killProcess(): void {
    if (this.process) {
      // Close stdin first (graceful), then SIGTERM, then SIGKILL
      try { this.process.stdin.end(); } catch {}
      this.process.kill("SIGTERM");
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill("SIGKILL");
        }
      }, 10_000);
    }
  }

  private setupOutputParsing(child: ChildProcess): void {
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (line.trim()) {
        this.parseCliEvent(line);
      }
    });
  }

  // Override parseCliEvent to detect turn boundaries
  protected parseCliEvent(line: string): void {
    // ... same parsing as current runner ...

    // NEW: detect result events as turn boundaries
    const parsed = JSON.parse(line);
    if (parsed.type === "result") {
      // Capture session ID if present
      if (parsed.session_id) {
        this.cliSessionId = parsed.session_id;
      }

      this.clearTurnTimeout();

      // Emit turn_end event
      this.emitSessionEvent({
        type: "turn_end",
        data: {
          turnNumber: this.turnCount,
          durationMs: parsed.duration_ms,
          costUsd: parsed.cost_usd,
        }
      });

      // Transition to idle
      this.state = "idle";
      this.updateMetadata();
      this.emitSessionEvent({
        type: "waiting_for_input",
        data: { turnNumber: this.turnCount }
      });

      this.resetTurnState();
      this.startIdleTimer();
      return; // Don't pass to default handling
    }

    // ... existing switch (system, assistant, content_block_*, tool_result) ...
  }
}
```

### Mode B: ResumeRunner

```typescript
export class ResumeRunner extends SessionRunner {
  private turnTimeoutTimer: NodeJS.Timeout | null = null;

  protected spawnTurn(prompt: string): void {
    const args = [
      "-p",
      "--output-format", "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--dangerously-skip-permissions",
    ];

    // Resume from previous turn if we have a session ID
    if (this.cliSessionId) {
      args.push("--resume", this.cliSessionId);
    }

    const child = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: this.options.workingDirectory,
      env: { ...process.env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
    });

    this.process = child;
    this.metadata.pid = child.pid ?? null;

    // Write prompt to stdin and close (single-turn per process)
    child.stdin.write(prompt);
    child.stdin.end();

    this.startTurnTimeout();
    this.setupOutputParsing(child);

    // On process close: transition to idle (not ended!)
    child.on("close", (code) => {
      this.clearTurnTimeout();
      this.process = null;
      this.metadata.pid = null;

      if (this.killed) {
        // Session was stopped — finalize
        this.finalize("stopped");
        return;
      }

      if (code !== 0) {
        this.emitSessionEvent({
          type: "error",
          data: { message: `Turn ${this.turnCount} failed (exit code ${code})` }
        });
        // Don't end the session on a single turn failure — allow retry
      }

      // Emit turn_end
      this.emitSessionEvent({
        type: "turn_end",
        data: { turnNumber: this.turnCount, exitCode: code }
      });

      // Transition to idle
      this.state = "idle";
      this.updateMetadata();
      this.emitSessionEvent({
        type: "waiting_for_input",
        data: { turnNumber: this.turnCount }
      });

      this.resetTurnState();
      this.startIdleTimer();
    });
  }

  protected deliverMessage(message: string): void {
    // Spawn a new process with --resume
    this.resetTurnState();
    this.spawnTurn(message);
  }

  protected killProcess(): void {
    if (this.process) {
      this.process.kill("SIGTERM");
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill("SIGKILL");
        }
      }, 10_000);
    }
  }

  // parseCliEvent captures session_id from result events
  protected parseCliEvent(line: string): void {
    const parsed = JSON.parse(line);
    if (parsed.type === "result" && parsed.session_id) {
      this.cliSessionId = parsed.session_id;
    }
    // ... existing event parsing (unchanged) ...
  }
}
```

### Which Mode to Use

```typescript
// In routes/sessions.ts or a config
const RUNNER_MODE = process.env.SESSION_RUNNER_MODE || "streaming";

function createRunner(options: SessionRunnerOptions): SessionRunner {
  if (RUNNER_MODE === "resume") {
    return new ResumeRunner(options);
  }
  return new StreamingRunner(options);
}
```

Default to `streaming` mode. If bugs are encountered, switch to `resume` via env var. No code changes needed.

---

## Schema Changes

### SessionMetadata (additive)

```typescript
export const SessionMetadataSchema = z.object({
  // Existing fields (unchanged)
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

  // New fields (all have defaults for backward compat)
  cliSessionId: z.string().nullable().default(null),
  turnCount: z.number().default(1),
  state: z.enum(["processing", "idle", "ended"]).default("processing"),
});
```

All new fields have defaults. Existing metadata files parse without errors.

### SessionEventType (additive)

```typescript
export const SessionEventType = z.enum([
  // Existing
  "assistant_text",
  "tool_use",
  "tool_result",
  "system",
  "error",
  // New
  "turn_start",
  "turn_end",
  "waiting_for_input",
  "user_message",
]);
```

Four new event types. The frontend's `renderSessionEvent()` switch falls through to default for unknown types — forward-compatible.

---

## API Changes

### New: `POST /api/projects/:id/sessions/:sessionId/message`

Send a follow-up message to an idle session.

```typescript
router.post("/:sessionId/message", async (req: Request, res: Response) => {
  const sessionId = getSessionId(req);
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const runner = sessionManager.getRunner(sessionId);
  if (!runner) {
    res.status(404).json({ error: "Session not found or not active" });
    return;
  }

  try {
    runner.sendMessage(message.trim());
    res.status(202).json({ turnNumber: runner.sessionTurnCount, state: "processing" });
  } catch (err) {
    res.status(409).json({ error: err instanceof Error ? err.message : "Cannot send message" });
  }
});
```

### Modified: `POST /:sessionId/stop`

Unchanged in contract. Internally calls `runner.stop()` which now handles both modes.

### Unchanged

- `POST /sessions` (create) — still generates kickoff prompt, creates files, starts runner
- `GET /sessions` (list) — unchanged
- `GET /sessions/:id` (metadata) — returns additional fields but backward compatible
- `GET /sessions/:id/events` (SSE) — unchanged, new event types flow through same pipe

---

## SessionManager Changes

### Idle Session Handling

Between turns, the session is `idle` but still registered in the manager. The `"end"` event only fires when the session truly ends (not between turns).

**Design decision:** Idle sessions count against concurrency limits. An idle session holds CLI session context and will resume work when the next message arrives.

### Cleanup

The manager already listens for `runner.on("end")` to unregister sessions. This doesn't change — the runner's `"end"` event means session over, not turn over.

---

## Timeout Policy

| Timeout | Value | Enforced By | Purpose |
|---------|-------|-------------|---------|
| Turn timeout | 30 min | Runner (per-turn timer) | Kill a turn that hangs. Same as current wall-clock timeout. |
| Idle timeout | 30 min | Runner (idle timer) | End sessions that sit idle between turns. Reclaim resources. |
| Session max lifetime | 4 hours | Runner (lifetime timer) | Hard cap to prevent runaway sessions. |

All timers are in the runner, not the manager.

---

## Recovery Changes

### Current Behavior

`recovery.ts` marks any `status: "running"` sessions as `"failed"` on server restart.

### New Behavior

```typescript
if (metadata.status === "running") {
  if (metadata.state === "idle" && metadata.cliSessionId) {
    // Session was between turns — no process was running.
    // For resume mode: the session could theoretically be resumed.
    // For now: mark as stopped (conservative).
    metadata.status = "stopped";
    metadata.error = "Server restarted between turns";
  } else {
    // Session was actively processing — process is gone.
    metadata.status = "failed";
    metadata.error = "Server restarted while session was running";
  }
  metadata.state = "ended";
  metadata.endedAt = new Date().toISOString();
  metadata.pid = null;
  // ... write and clear activeSessionId ...
}
```

**Future improvement (resume mode only):** If the session was idle between turns and has a `cliSessionId`, we could resume it by spawning a new process with `--resume`. Deferred — not needed for initial implementation.

---

## NDJSON Event Parsing

### What Changes

The existing `parseCliEvent()` method stays almost identical. The only addition is detecting `result` events as turn boundaries (for streaming mode) and capturing `session_id` from the result payload.

### What Stays the Same

- All existing event types (`system`, `content_block_start`, `content_block_delta`, `content_block_stop`, `assistant`, `tool_result`, `result`) are parsed the same way
- The `emitSessionEvent()` flow is unchanged
- NDJSON log appending is unchanged
- All events from all turns append to the same `.ndjson` file

### Event Counter Continuity

The `eventCounter` persists across turns. The runner instance is long-lived (it represents the session, not a single process). In resume mode, the runner stays alive between turns even though the CLI process exits.

---

## Implementation Plan for Jonah

### Step 1: Validate `--input-format stream-json`

Before writing any runner code, validate that the streaming input mode works:

1. Open a terminal and run:
   ```bash
   claude -p --input-format stream-json --output-format stream-json --verbose --dangerously-skip-permissions
   ```
2. Paste a NDJSON message to stdin:
   ```json
   {"type":"user","message":{"role":"user","content":"What is 2+2?"}}
   ```
3. Verify NDJSON events appear on stdout
4. Wait for the `result` event
5. Paste a second message:
   ```json
   {"type":"user","message":{"role":"user","content":"Now multiply that by 3"}}
   ```
6. Verify the second turn processes correctly with context from the first

If step 5-6 fails (hangs, crashes, or loses context), fall back to `--resume` mode for the implementation.

### Step 2: Validate `--resume`

1. Run a single-turn session:
   ```bash
   claude -p "What is 2+2?" --output-format stream-json --verbose --dangerously-skip-permissions
   ```
2. Capture the `session_id` from the `result` event
3. Resume with a follow-up:
   ```bash
   claude -p "Now multiply that by 3" --resume <session_id> --output-format stream-json --verbose --dangerously-skip-permissions
   ```
4. Verify the resumed session has context from turn 1

### Step 3: Build the Base Runner

1. Create `server/src/session/base-runner.ts` — extract common logic from current `runner.ts`:
   - State machine (`processing` / `idle` / `ended`)
   - `parseCliEvent()` (unchanged)
   - `emitSessionEvent()` (unchanged)
   - Metadata management
   - Timer management (turn timeout, idle timeout, max lifetime)
   - Event counter continuity

### Step 4: Build StreamingRunner

1. Create `server/src/session/streaming-runner.ts`
2. Implement `spawnTurn()` — spawns `claude -p --input-format stream-json ...`, writes NDJSON to stdin, does NOT close stdin
3. Implement `deliverMessage()` — writes NDJSON to the existing process's stdin
4. Implement `killProcess()` — close stdin, SIGTERM, SIGKILL fallback
5. Implement `result` event detection for turn boundaries

### Step 5: Build ResumeRunner

1. Create `server/src/session/resume-runner.ts`
2. Implement `spawnTurn()` — spawns `claude -p --resume <id> ...`, writes prompt to stdin, closes stdin
3. Implement `deliverMessage()` — spawns a new process with `--resume`
4. Implement `killProcess()` — SIGTERM, SIGKILL fallback
5. Implement `session_id` capture from `result` events
6. Handle process `close` event — transition to `idle`, not `ended`

### Step 6: Update Schemas

1. Add `cliSessionId`, `turnCount`, `state` to `SessionMetadataSchema` (with defaults)
2. Add `turn_start`, `turn_end`, `waiting_for_input`, `user_message` to `SessionEventType`
3. Verify existing metadata files parse without errors

### Step 7: Update Routes

1. Add `POST /:sessionId/message` endpoint
2. Update session creation to use the factory function (`createRunner()`)
3. Verify SSE endpoint works unchanged
4. Verify stop endpoint works with new runner

### Step 8: Update Recovery

1. Handle `state: "idle"` sessions in `recoverOrphanedSessions()`
2. Don't mark idle sessions as failed — mark as stopped

### Step 9: Integration Test

1. Start a session → verify turn 1 streams events
2. Wait for turn 1 to complete → verify `turn_end` and `waiting_for_input` events
3. Send a follow-up message → verify turn 2 starts and streams events
4. Stop a session mid-turn → verify clean shutdown
5. Stop a session while idle → verify clean shutdown
6. Test with agent teams (TeamCreate, Task) → verify teammates work across turns
7. Test the mode you didn't implement first (switch env var, repeat tests)

### Step 10: Pick Default Mode and Ship

Based on integration test results:
- If streaming mode works reliably → ship with `streaming` as default
- If streaming mode has bugs → ship with `resume` as default, file upstream bugs
- Document the mode switch env var for future reference

---

## What the Frontend Needs (Eventually)

No frontend changes required for this phase. The new event types (`turn_start`, `turn_end`, `waiting_for_input`, `user_message`) render as nothing (the switch statement's default case) until the frontend is updated.

When we're ready (future phase):

1. **Turn separators:** `turn_start` / `turn_end` render as horizontal rules with turn number
2. **Waiting state:** `waiting_for_input` shows a text input in the session log
3. **User messages:** `user_message` renders as a styled card
4. **Session status:** Show `idle` / `processing` state in the session controls

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `--input-format stream-json` hangs on 2nd message (bug #3187) | Medium | Test in Step 1 before building. Fall back to `--resume` mode. |
| `--input-format stream-json` produces duplicate events (#5034) | Medium | Dedup by event ID in the parser. Fall back to `--resume` mode. |
| `--resume` loses context between turns | Low | CLI sessions are persisted to disk by design. This is how `claude -c` works. |
| `--resume` concurrent calls corrupt session | Medium | The `state` machine prevents concurrent `sendMessage()` calls. Only one turn runs at a time. |
| `result` event format changes across CLI versions | Low | Defensive parsing — check for `session_id` field existence, don't crash if missing. |
| Long-running streaming process becomes zombie | Low | Turn timeout (30 min) and session max lifetime (4 hours) kill stuck processes. |
| Server restart during active turn loses work | Medium | Same as current. Mark as failed. Future: resume from `cliSessionId` in `--resume` mode. |

---

## ADR Summary

| Decision | Rationale |
|----------|-----------|
| CLI-only, no API key | CEO constraint. Use subscription auth via `claude` binary. |
| Dual-mode runner (streaming + resume) | Streaming mode is architecturally superior but has known bugs. Resume mode is safe fallback. Both share a common interface. |
| Streaming mode as default | Lower latency, simpler process management, real-time streaming throughout. Test first, fall back if buggy. |
| New files over modifying existing | `base-runner.ts`, `streaming-runner.ts`, `resume-runner.ts`. Keep old `runner.ts` until confident. |
| Idle sessions count against concurrency | Conservative. An idle session still holds context. |
| 30-min turn timeout, 30-min idle timeout, 4-hour max lifetime | Balanced between allowing long agent pipelines and reclaiming resources. |
| No new npm dependencies | Everything uses Node.js built-ins (`child_process`, `readline`, `events`). |
| Frontend changes deferred | New event types are additive. Current UI works. Update when multi-turn is proven. |
