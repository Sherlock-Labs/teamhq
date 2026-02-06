# TeamHQ Phase 3a - Technical Approach

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Transport | SSE (Server-Sent Events) | Unidirectional server-to-client. No WebSocket complexity. Native browser `EventSource` API with auto-reconnect. |
| Event stream format | Our own normalized events over SSE, with `Last-Event-ID` for reconnection | Decouple frontend from Claude CLI internals. CLI format may change; our event model stays stable. |
| Process management | In-memory `Map<sessionId, RunningSession>` with PID tracking | Simple, fits 3a scope. No external process manager. Orphans accepted on server crash. |
| Event fan-out | In-memory `EventEmitter` per session, with NDJSON file as source of truth | Multiple SSE clients (tabs) subscribe to the same emitter. Late joiners replay from NDJSON file. |
| Event storage | Append-only NDJSON files in `data/sessions/{projectId}/` | Matches requirements. Cheap sequential writes. Easy replay. No database. |
| Session metadata | JSON sidecar file per session | Same pattern as project storage. Zod-validated. Updated on lifecycle transitions. |
| Concurrency limits | 3 global, 1 per project, enforced in memory | Simple counter. Reset on server restart (all sessions show as `failed`). |
| Security | `--dangerously-skip-permissions` for 3a | Required for headless operation. Acceptable for single-user local tool. Revisit in 3b. |
| Tool result truncation | Truncate to 200 lines per tool result, 5000 events per session | Prevents unbounded log files. Matches Thomas's risk mitigations. |
| Server restart behavior | Running sessions become `failed` | No recovery in 3a. PID files are best-effort for cleanup. |

---

## 1. Claude CLI Streaming Output Format

The `claude -p --output-format stream-json` command outputs one JSON object per line (NDJSON) to stdout. Based on the Claude Code SDK documentation and observed behavior, the stream contains events like:

```jsonl
{"type":"system","subtype":"init","session_id":"...","tools":[...],"model":"..."}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I'll start by..."}]},"session_id":"..."}
{"type":"content_block_start","content_block":{"type":"text","text":""},...}
{"type":"content_block_delta","delta":{"type":"text_delta","text":"reading"},...}
{"type":"content_block_stop",...}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"...","name":"Read","input":{"file_path":"..."}}]},...}
{"type":"tool_result","tool_use_id":"...","content":"file contents here..."}
{"type":"result","result":"final text","session_id":"...","is_error":false,"duration_ms":12345,"cost_usd":0.42}
```

Key event types from the CLI:
- `system` (subtype `init`) -- session initialization, model info
- `assistant` -- complete assistant messages (text + tool_use blocks)
- `content_block_start` / `content_block_delta` / `content_block_stop` -- incremental text streaming (when `--include-partial-messages` is used)
- `tool_use` -- embedded in `assistant` messages as content blocks
- `tool_result` -- results of tool calls
- `result` -- final session result with cost and duration

### Streaming Flag Decision

Use `--include-partial-messages` to get incremental text deltas. Without it, we only get complete assistant turns, which means long stretches of silence while the agent thinks. With it, text streams word-by-word, giving the CEO real-time visibility.

Full spawn command:
```bash
claude -p --output-format stream-json --include-partial-messages --dangerously-skip-permissions
```

The prompt is piped via stdin (same pattern as the OST tool's `claude-runner.ts`).

---

## 2. Normalized Event Model

We do NOT pass raw Claude CLI events to the frontend. Instead, we normalize them into our own event types. This decouples the frontend from Claude's internal format and lets us control what we expose.

### Our Event Types

```typescript
// server/src/schemas/session.ts

import { z } from "zod";

export const SessionStatus = z.enum([
  "running",
  "completed",
  "failed",
  "stopped",
  "timed-out",
]);

export type SessionStatus = z.infer<typeof SessionStatus>;

export const SessionEventType = z.enum([
  "assistant_text",
  "tool_use",
  "tool_result",
  "system",
  "error",
]);

export type SessionEventType = z.infer<typeof SessionEventType>;

export const SessionEventSchema = z.object({
  id: z.number(),                    // Sequential event ID (0-indexed), used for SSE reconnection
  timestamp: z.string().datetime(),
  type: SessionEventType,
  data: z.record(z.unknown()),       // Varies by type, see below
});

export type SessionEvent = z.infer<typeof SessionEventSchema>;

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
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
```

### Event Data Shapes

| Type | `data` fields | Notes |
|------|--------------|-------|
| `assistant_text` | `{ text: string, delta?: boolean }` | `delta: true` for incremental chunks, `false`/absent for complete turns |
| `tool_use` | `{ tool: string, input: Record<string, unknown> }` | Tool name and its input parameters |
| `tool_result` | `{ tool: string, output: string, truncated: boolean }` | Output truncated to 200 lines max |
| `system` | `{ message: string }` | Lifecycle events: "Session started", "Session completed (duration: 5m 23s)", etc. |
| `error` | `{ message: string, code?: number }` | Process errors, spawn failures, timeouts |

### CLI-to-Event Mapping

The `SessionRunner` class (section 3) implements this mapping:

| CLI Event | Our Event | Logic |
|-----------|-----------|-------|
| `{"type":"system","subtype":"init",...}` | `system` | `{ message: "Session started" }` |
| `{"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}` | `assistant_text` | `{ text: delta.text, delta: true }` |
| `{"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}` | `assistant_text` | `{ text: content.text }` -- emitted for complete text blocks only if we haven't already streamed the deltas |
| `{"type":"assistant","message":{"content":[{"type":"tool_use",...}]}}` | `tool_use` | `{ tool: content.name, input: content.input }` |
| `{"type":"tool_result","content":"..."}` | `tool_result` | `{ tool: lastToolName, output: truncate(content, 200), truncated: boolean }` |
| `{"type":"result",...}` | `system` | `{ message: "Session completed (duration: Xm Ys, cost: $Z.ZZ)" }` |
| Process exit non-zero | `error` | `{ message: "Process exited with code N", code: N }` |
| Timeout | `error` | `{ message: "Session timed out after 30 minutes" }` |

**Important parsing note:** The `assistant` events contain a `message.content` array that can have both `text` and `tool_use` blocks. We iterate over the array and emit separate events for each block. When `--include-partial-messages` is active, we track whether we've already streamed text via `content_block_delta` events and skip the final `assistant` text block to avoid duplication.

---

## 3. Session Runner Architecture

### New File: `server/src/session/runner.ts`

The `SessionRunner` class manages the lifecycle of a single Claude CLI child process.

```typescript
// server/src/session/runner.ts

import { spawn, ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { appendFile, writeFile } from "node:fs/promises";
import { SessionEvent, SessionMetadata, SessionStatus } from "../schemas/session.js";

interface SessionRunnerOptions {
  sessionId: string;
  projectId: string;
  prompt: string;
  metadataPath: string;    // Path to {sessionId}.json
  eventLogPath: string;    // Path to {sessionId}.ndjson
  timeoutMs: number;       // Default 30 minutes = 1_800_000
  workingDirectory: string; // The teamhq repo root
}

export class SessionRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private metadata: SessionMetadata;
  private eventCounter: number = 0;
  private lastToolName: string = "";
  private streamedTextBlockIds: Set<string> = new Set(); // Track blocks streamed via deltas
  private killed: boolean = false;

  constructor(private options: SessionRunnerOptions) {
    super();
    this.metadata = { /* initial metadata */ };
  }

  // Emits: "event" (SessionEvent), "end" (SessionMetadata)
}
```

### Key Methods

**`start(): void`**
1. Spawn `claude` with args: `["-p", "--output-format", "stream-json", "--include-partial-messages", "--dangerously-skip-permissions"]`
2. Set `stdio: ["pipe", "pipe", "pipe"]` -- stdin for prompt, stdout for NDJSON stream, stderr for errors
3. Write the kickoff prompt to `child.stdin`, then `child.stdin.end()`
4. Set up the timeout timer: `setTimeout(() => this.kill("timed-out"), timeoutMs)`
5. Write initial metadata to `{sessionId}.json` with `status: "running"` and `pid: child.pid`
6. Emit a `system` event: `{ message: "Session started" }`
7. Pipe `child.stdout` through a line splitter and process each line through `parseCliEvent()`
8. On `child.close`: clear timeout, update metadata with final status, emit `end`
9. On `child.error`: emit `error` event, update metadata to `failed`

**`parseCliEvent(line: string): void`**
1. `JSON.parse(line)` -- if parse fails, skip (some CLI output isn't JSON)
2. Map the CLI event to our event type(s) per the mapping table in section 2
3. For each mapped event, call `emitEvent(event)`

**`emitEvent(event: Omit<SessionEvent, "id" | "timestamp">): void`**
1. Assign `id: this.eventCounter++` and `timestamp: new Date().toISOString()`
2. Append the event as a JSON line to the NDJSON file: `appendFile(eventLogPath, JSON.stringify(event) + "\n")`
3. Update `metadata.eventCount`
4. Emit `"event"` on the EventEmitter so SSE clients receive it
5. If `eventCount >= 5000`, emit an `error` event with "Event limit reached" and kill the process

**`stop(): void`**
Called by the API to manually stop a session.
1. Set `this.killed = true`
2. Send `SIGTERM` to the child process
3. Start a 10-second kill timer: if process hasn't exited, send `SIGKILL`
4. Status will be set to `stopped` in the `close` handler (checks `this.killed`)

**`kill(reason: SessionStatus): void`**
Internal method for timeout and event limit.
1. Set the target status
2. Send `SIGTERM`, then `SIGKILL` after 10 seconds

### Process Close Handler Logic

```typescript
child.on("close", (code, signal) => {
  clearTimeout(this.timeoutTimer);

  let status: SessionStatus;
  if (this.killed && this.targetStatus) {
    status = this.targetStatus; // "stopped" or "timed-out"
  } else if (code === 0) {
    status = "completed";
  } else {
    status = "failed";
  }

  const endedAt = new Date().toISOString();
  this.metadata.status = status;
  this.metadata.endedAt = endedAt;
  this.metadata.durationMs = Date.now() - new Date(this.metadata.startedAt).getTime();
  this.metadata.exitCode = code;
  this.metadata.pid = null;

  // Write final metadata
  writeFile(this.options.metadataPath, JSON.stringify(this.metadata, null, 2));

  // Emit final system/error event
  if (status === "completed") {
    this.emitEvent({ type: "system", data: { message: `Session completed (${formatDuration(this.metadata.durationMs)})` } });
  } else if (status === "timed-out") {
    this.emitEvent({ type: "error", data: { message: "Session timed out after 30 minutes" } });
  } else if (status === "stopped") {
    this.emitEvent({ type: "system", data: { message: "Session stopped by user" } });
  } else {
    this.emitEvent({ type: "error", data: { message: `Session failed (exit code ${code})`, code } });
  }

  this.emit("end", this.metadata);
});
```

### Line Splitting

The stdout stream from `claude` is a raw byte stream. We need to split it on newlines to get individual JSON objects. Use a simple `readline`-style approach:

```typescript
import { createInterface } from "node:readline";

const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
rl.on("line", (line) => {
  if (line.trim()) {
    this.parseCliEvent(line);
  }
});
```

This handles partial lines and buffering automatically.

---

## 4. Session Manager

### New File: `server/src/session/manager.ts`

A singleton that tracks all running sessions and enforces concurrency limits.

```typescript
// server/src/session/manager.ts

import { SessionRunner } from "./runner.js";
import { SessionMetadata } from "../schemas/session.js";

const MAX_CONCURRENT_SESSIONS = 3;

class SessionManager {
  private runningSessions: Map<string, SessionRunner> = new Map(); // keyed by sessionId
  private projectToSession: Map<string, string> = new Map(); // projectId -> sessionId

  get runningCount(): number {
    return this.runningSessions.size;
  }

  canStartSession(projectId: string): { ok: boolean; reason?: string } {
    if (this.projectToSession.has(projectId)) {
      return { ok: false, reason: "A session is already running for this project" };
    }
    if (this.runningSessions.size >= MAX_CONCURRENT_SESSIONS) {
      return { ok: false, reason: `Maximum concurrent sessions (${MAX_CONCURRENT_SESSIONS}) reached` };
    }
    return { ok: true };
  }

  registerSession(sessionId: string, projectId: string, runner: SessionRunner): void {
    this.runningSessions.set(sessionId, runner);
    this.projectToSession.set(projectId, sessionId);

    runner.on("end", () => {
      this.runningSessions.delete(sessionId);
      this.projectToSession.delete(projectId);
    });
  }

  getRunner(sessionId: string): SessionRunner | undefined {
    return this.runningSessions.get(sessionId);
  }

  getRunnerByProject(projectId: string): SessionRunner | undefined {
    const sessionId = this.projectToSession.get(projectId);
    return sessionId ? this.runningSessions.get(sessionId) : undefined;
  }

  stopSession(sessionId: string): boolean {
    const runner = this.runningSessions.get(sessionId);
    if (!runner) return false;
    runner.stop();
    return true;
  }

  // Called on server shutdown for graceful cleanup
  async stopAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [, runner] of this.runningSessions) {
      promises.push(new Promise<void>((resolve) => {
        runner.on("end", () => resolve());
        runner.stop();
      }));
    }
    await Promise.allSettled(promises);
  }
}

export const sessionManager = new SessionManager();
```

### Graceful Shutdown

In `server/src/index.ts`, add a shutdown hook:

```typescript
process.on("SIGTERM", async () => {
  console.log("Server shutting down, stopping all sessions...");
  await sessionManager.stopAll();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Server interrupted, stopping all sessions...");
  await sessionManager.stopAll();
  process.exit(0);
});
```

This sends SIGTERM to all running claude processes before the server exits. If the server crashes unexpectedly (not SIGTERM/SIGINT), the claude processes become orphans. That's acceptable for 3a -- they'll eventually hit their own timeout or run to completion.

### Server Restart Recovery

On startup, the server scans `data/sessions/` for any session metadata files with `status: "running"`. Since these sessions are no longer being tracked in memory (the server restarted), they're marked as `failed` with `error: "Server restarted while session was running"`.

```typescript
// server/src/session/recovery.ts

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SESSIONS_DIR = join(import.meta.dirname, "../../../data/sessions");

export async function recoverOrphanedSessions(): Promise<void> {
  // Walk data/sessions/*/
  // For each .json file, parse it
  // If status === "running", update to "failed" with error message
  // This is a best-effort cleanup
}
```

Called from `start()` in `index.ts` before `app.listen()`.

---

## 5. Session Storage

### Directory Structure

```
data/
  sessions/
    {projectId}/
      {sessionId}.json      # Session metadata (small, frequently updated)
      {sessionId}.ndjson     # Append-only event log (can be large)
```

### New File: `server/src/store/sessions.ts`

```typescript
import { readFile, writeFile, readdir, mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { SessionMetadataSchema } from "../schemas/session.js";
import type { SessionMetadata, SessionEvent } from "../schemas/session.js";

const SESSIONS_DIR = join(import.meta.dirname, "../../../data/sessions");

function sessionDir(projectId: string): string {
  return join(SESSIONS_DIR, projectId);
}

function metadataPath(projectId: string, sessionId: string): string {
  return join(SESSIONS_DIR, projectId, `${sessionId}.json`);
}

function eventLogPath(projectId: string, sessionId: string): string {
  return join(SESSIONS_DIR, projectId, `${sessionId}.ndjson`);
}

export async function createSessionFiles(
  projectId: string
): Promise<{ sessionId: string; metadataPath: string; eventLogPath: string }> {
  const sessionId = uuidv4();
  const dir = sessionDir(projectId);
  await mkdir(dir, { recursive: true });

  const meta: SessionMetadata = {
    id: sessionId,
    projectId,
    status: "running",
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMs: null,
    eventCount: 0,
    exitCode: null,
    error: null,
    pid: null,
  };

  const mPath = metadataPath(projectId, sessionId);
  const ePath = eventLogPath(projectId, sessionId);

  await writeFile(mPath, JSON.stringify(meta, null, 2));
  await writeFile(ePath, ""); // Create empty NDJSON file

  return { sessionId, metadataPath: mPath, eventLogPath: ePath };
}

export async function getSessionMetadata(
  projectId: string,
  sessionId: string
): Promise<SessionMetadata> {
  const raw = await readFile(metadataPath(projectId, sessionId), "utf-8");
  return SessionMetadataSchema.parse(JSON.parse(raw));
}

export async function listSessions(projectId: string): Promise<SessionMetadata[]> {
  const dir = sessionDir(projectId);
  try {
    const files = await readdir(dir);
    const sessions: SessionMetadata[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(dir, file), "utf-8");
        sessions.push(SessionMetadataSchema.parse(JSON.parse(raw)));
      } catch {
        // Skip corrupt files
      }
    }
    return sessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  } catch {
    return []; // Directory doesn't exist yet
  }
}

export async function readEventLog(
  projectId: string,
  sessionId: string,
  offset: number = 0
): Promise<SessionEvent[]> {
  const path = eventLogPath(projectId, sessionId);
  const raw = await readFile(path, "utf-8");
  const lines = raw.trim().split("\n").filter(Boolean);
  return lines.slice(offset).map((line) => JSON.parse(line));
}

export { metadataPath, eventLogPath };
```

---

## 6. SSE Endpoint Design

### New File: `server/src/routes/sessions.ts`

#### `GET /api/projects/:id/sessions/:sessionId/events`

This is the SSE streaming endpoint. It handles two scenarios:

**1. Live session (status: `running`):**
- Set response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- Read existing events from the NDJSON file (for late-joining clients or reconnection)
- Send all existing events as SSE `data:` lines with `id:` set to the event ID
- Subscribe to the `SessionRunner`'s `EventEmitter` for new events
- Forward new events to the SSE stream as they arrive
- On session `end`, send a final event and close the connection
- Send a heartbeat comment (`: heartbeat\n\n`) every 15 seconds to keep the connection alive
- On client disconnect (`req.on("close")`), unsubscribe from the emitter and clean up

**2. Completed session (status: `completed`/`failed`/`stopped`/`timed-out`):**
- Read all events from the NDJSON file
- Send them all as SSE events
- Send a `done` event type to signal end of stream
- Close the connection

### SSE Message Format

```
id: 0
event: session_event
data: {"id":0,"timestamp":"...","type":"system","data":{"message":"Session started"}}

id: 1
event: session_event
data: {"id":1,"timestamp":"...","type":"assistant_text","data":{"text":"I'll start by","delta":true}}

: heartbeat

id: 42
event: session_done
data: {"status":"completed","durationMs":323000}
```

- `id:` field enables `Last-Event-ID` reconnection via the `offset` query parameter
- `event: session_event` for normal events, `event: session_done` for stream end
- `: heartbeat` is an SSE comment (ignored by EventSource but keeps the connection alive)

### Reconnection Handling

The `EventSource` API automatically reconnects on connection drop. When it reconnects, the browser sends `Last-Event-ID` as a header. Our endpoint also accepts an `offset` query parameter as a fallback.

```typescript
const offset = parseInt(req.query.offset as string) ||
               parseInt(req.headers["last-event-id"] as string) || 0;
```

We replay all events from `offset` onward, then subscribe to live events. This means the client never misses events, even if the connection drops mid-stream.

### Heartbeat

A heartbeat comment every 15 seconds prevents proxies and load balancers from closing idle connections. The heartbeat is an SSE comment (starts with `:`) so the browser's `EventSource` ignores it.

```typescript
const heartbeat = setInterval(() => {
  res.write(": heartbeat\n\n");
}, 15_000);

req.on("close", () => {
  clearInterval(heartbeat);
});
```

### Multiple Clients (Tab Fan-Out)

If the CEO opens the same project in two tabs, both tabs connect to the SSE endpoint. Both subscribe to the same `SessionRunner`'s `EventEmitter`. The `EventEmitter` naturally fans out to all listeners. No special logic needed -- Node's `EventEmitter` supports multiple listeners on the same event.

### Vite Proxy Consideration

The Vite dev proxy (`/api` -> `http://localhost:3002`) needs to handle SSE properly. Vite's built-in proxy (powered by `http-proxy`) supports SSE by default, but we should make sure it doesn't buffer responses. If buffering is an issue, we can add `ws: true` or configure the proxy, but this likely works out of the box since Vite passes through `Transfer-Encoding: chunked` responses.

---

## 7. API Endpoints

All new session endpoints go in `server/src/routes/sessions.ts`, mounted under `/api/projects/:projectId/sessions`.

### Route Summary

| Method | Path | Handler | Response |
|--------|------|---------|----------|
| `POST` | `/api/projects/:id/sessions` | Start a new session | `201` with session metadata |
| `GET` | `/api/projects/:id/sessions` | List sessions for project | `200` with `{ sessions: [...] }` |
| `GET` | `/api/projects/:id/sessions/:sessionId` | Get session metadata | `200` with session metadata |
| `GET` | `/api/projects/:id/sessions/:sessionId/events` | SSE event stream | `text/event-stream` |
| `POST` | `/api/projects/:id/sessions/:sessionId/stop` | Stop a running session | `200` with updated metadata |

### `POST /api/projects/:id/sessions` -- Start Session

```typescript
router.post("/", async (req, res) => {
  const projectId = req.params.id;

  // 1. Validate project exists
  let project;
  try {
    project = await getProject(projectId);
  } catch {
    return res.status(404).json({ error: "Project not found" });
  }

  // 2. If status is "planned", transition to "in-progress" first
  if (project.status === "planned") {
    const kickoffPrompt = generateKickoffPrompt(project);
    project = await startProject(projectId, kickoffPrompt);
  }

  // 3. Check if project already has a running session
  const check = sessionManager.canStartSession(projectId);
  if (!check.ok) {
    const code = check.reason?.includes("already running") ? 409 : 429;
    return res.status(code).json({ error: check.reason });
  }

  // 4. Create session files
  const { sessionId, metadataPath, eventLogPath } = await createSessionFiles(projectId);

  // 5. Get the kickoff prompt (either already exists or was just generated)
  const prompt = project.kickoffPrompt!;

  // 6. Create and start the runner
  const runner = new SessionRunner({
    sessionId,
    projectId,
    prompt,
    metadataPath,
    eventLogPath,
    timeoutMs: 1_800_000, // 30 minutes
    workingDirectory: process.cwd(), // teamhq repo root
  });

  sessionManager.registerSession(sessionId, projectId, runner);

  // 7. Update project with activeSessionId
  await updateProject(projectId, {}); // Touch updatedAt
  // Also need to set activeSessionId -- see schema changes below

  runner.start();

  // 8. On session end, clear activeSessionId
  runner.on("end", async () => {
    // Clear activeSessionId from project
  });

  // 9. Return session metadata
  const metadata = await getSessionMetadata(projectId, sessionId);
  res.status(201).json(metadata);
});
```

### `POST /api/projects/:id/sessions/:sessionId/stop` -- Stop Session

```typescript
router.post("/:sessionId/stop", async (req, res) => {
  const { id: projectId, sessionId } = req.params;

  // Get metadata to verify it exists and is running
  let metadata;
  try {
    metadata = await getSessionMetadata(projectId, sessionId);
  } catch {
    return res.status(404).json({ error: "Session not found" });
  }

  if (metadata.status !== "running") {
    return res.status(409).json({ error: "Session is not running" });
  }

  const stopped = sessionManager.stopSession(sessionId);
  if (!stopped) {
    return res.status(409).json({ error: "Session is not tracked (may have already ended)" });
  }

  // Wait briefly for the process to exit and metadata to update
  await new Promise((resolve) => setTimeout(resolve, 500));

  const updated = await getSessionMetadata(projectId, sessionId);
  res.json(updated);
});
```

### `GET /api/projects/:id/sessions/:sessionId/events` -- SSE Stream

```typescript
router.get("/:sessionId/events", async (req, res) => {
  const { id: projectId, sessionId } = req.params;

  // Validate session exists
  let metadata;
  try {
    metadata = await getSessionMetadata(projectId, sessionId);
  } catch {
    return res.status(404).json({ error: "Session not found" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering if applicable
  res.flushHeaders();

  // Determine offset for reconnection
  const offset = parseInt(req.query.offset as string) ||
                 parseInt(req.headers["last-event-id"] as string) || 0;

  // Replay existing events from NDJSON
  const existingEvents = await readEventLog(projectId, sessionId, offset);
  for (const event of existingEvents) {
    res.write(`id: ${event.id}\nevent: session_event\ndata: ${JSON.stringify(event)}\n\n`);
  }

  // If session is not running, send done and close
  if (metadata.status !== "running") {
    res.write(`event: session_done\ndata: ${JSON.stringify({ status: metadata.status, durationMs: metadata.durationMs })}\n\n`);
    res.end();
    return;
  }

  // Session is running -- subscribe to live events
  const runner = sessionManager.getRunner(sessionId);
  if (!runner) {
    // Runner not found but status is "running" -- stale state
    res.write(`event: session_done\ndata: ${JSON.stringify({ status: "failed" })}\n\n`);
    res.end();
    return;
  }

  const onEvent = (event: SessionEvent) => {
    if (event.id >= offset) {
      res.write(`id: ${event.id}\nevent: session_event\ndata: ${JSON.stringify(event)}\n\n`);
    }
  };

  const onEnd = (finalMetadata: SessionMetadata) => {
    res.write(`event: session_done\ndata: ${JSON.stringify({ status: finalMetadata.status, durationMs: finalMetadata.durationMs })}\n\n`);
    res.end();
  };

  runner.on("event", onEvent);
  runner.once("end", onEnd);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15_000);

  // Cleanup on client disconnect
  req.on("close", () => {
    runner.off("event", onEvent);
    runner.off("end", onEnd);
    clearInterval(heartbeat);
  });
});
```

---

## 8. Schema Changes

### Project Schema Update

Add `activeSessionId` to the project schema:

```typescript
// In server/src/schemas/project.ts -- add to ProjectSchema

activeSessionId: z.string().nullable().default(null),
```

This field is set when a session starts and cleared when it ends. The list endpoint already strips heavy fields; `activeSessionId` is lightweight and should be included in the list response so the frontend can show running indicators.

### New Schema File: `server/src/schemas/session.ts`

Contains `SessionStatus`, `SessionEventType`, `SessionEventSchema`, and `SessionMetadataSchema` as defined in section 2.

---

## 9. Integration with Existing Code

### Changes to Existing Files

| File | Change |
|------|--------|
| `server/src/schemas/project.ts` | Add `activeSessionId: z.string().nullable().default(null)` to `ProjectSchema` |
| `server/src/store/projects.ts` | Add `setActiveSession(projectId, sessionId)` and `clearActiveSession(projectId)` functions |
| `server/src/routes/projects.ts` | Include `activeSessionId` in the list endpoint response (don't strip it) |
| `server/src/index.ts` | Mount session routes, add shutdown hooks, call `recoverOrphanedSessions()` on startup |
| `server/package.json` | No new dependencies needed (uses Node built-ins: `child_process`, `readline`, `events`, `fs`) |

### New Files

| File | Purpose |
|------|---------|
| `server/src/schemas/session.ts` | Session metadata and event Zod schemas and TypeScript types |
| `server/src/store/sessions.ts` | Session file I/O (create, read metadata, list, read event log) |
| `server/src/session/runner.ts` | `SessionRunner` class -- spawns and manages a single claude child process |
| `server/src/session/manager.ts` | `SessionManager` singleton -- tracks running sessions, enforces limits |
| `server/src/session/recovery.ts` | Startup recovery -- marks orphaned "running" sessions as "failed" |
| `server/src/routes/sessions.ts` | Express router for all session API endpoints |

### Mount Point in `index.ts`

```typescript
import sessionRoutes from "./routes/sessions.js";

// Mount after project routes
app.use("/api/projects/:id/sessions", sessionRoutes);
```

Note: Express 5 preserves `req.params` from parent routers, so `req.params.id` (the projectId) is available in the session routes.

---

## 10. Safety and Limits

### Concurrency Enforcement

- **Per-project limit (1):** The `SessionManager.projectToSession` map prevents starting a second session for the same project.
- **Global limit (3):** The `SessionManager.runningSessions` map size is checked before starting.
- Both checks happen in the `POST /sessions` route handler before spawning the process.
- Race condition mitigation: The route handler is synchronous from check to register (no `await` between `canStartSession` and `registerSession`), so two simultaneous requests for the same project won't both pass the check.

### Timeout

- 30-minute default, hardcoded in the `POST /sessions` route.
- The `SessionRunner` sets a `setTimeout` that sends SIGTERM, waits 10 seconds, then SIGKILL.
- The timeout timer is cleared on normal process exit.

### Event Limit

- 5000 events per session. After this, the runner emits an error event and kills the process.
- Tool result truncation: each `tool_result` event's `output` field is truncated to the first 200 lines. Lines beyond that are replaced with `[... truncated, N total lines]`.

### The `--dangerously-skip-permissions` Flag

This flag gives the spawned Claude agent full filesystem and tool access without interactive permission prompts. This is required because:
1. The process runs headless -- there's no terminal to approve prompts
2. The agent needs to read/write files, run commands, etc.
3. This is a local development tool used by the CEO, not a production service

For 3a, this is acceptable. In future phases, we could scope permissions with `--allowedTools` to limit which tools the agent can use.

### Working Directory

The claude process runs with `cwd` set to the teamhq repo root (same directory the server runs in). This gives agents access to the full repo, including `.claude/agents/`, `docs/`, `server/`, etc. This is the expected behavior -- agents need repo access to do their work.

---

## 11. Frontend Integration Points

This section defines the contracts Alice needs to implement the frontend. The backend provides:

### EventSource Connection

```typescript
// Frontend pseudocode
const es = new EventSource(`/api/projects/${projectId}/sessions/${sessionId}/events?offset=${lastEventId}`);

es.addEventListener("session_event", (e) => {
  const event = JSON.parse(e.data);
  // event: { id, timestamp, type, data }
  appendToLog(event);
});

es.addEventListener("session_done", (e) => {
  const { status, durationMs } = JSON.parse(e.data);
  showSessionComplete(status, durationMs);
  es.close();
});

es.onerror = () => {
  // EventSource auto-reconnects. On reconnect, the browser sends
  // Last-Event-ID header, and the server replays from that offset.
  // No manual reconnection logic needed for basic cases.
  // For custom backoff: close the EventSource, reconnect with offset param.
};
```

### API Calls

```typescript
// Start session
POST /api/projects/${projectId}/sessions
// Returns: SessionMetadata with status "running"

// Stop session
POST /api/projects/${projectId}/sessions/${sessionId}/stop
// Returns: SessionMetadata with status "stopped"

// List sessions
GET /api/projects/${projectId}/sessions
// Returns: { sessions: SessionMetadata[] }

// Get session metadata
GET /api/projects/${projectId}/sessions/${sessionId}
// Returns: SessionMetadata
```

### Project Response Changes

The `GET /api/projects` list endpoint now includes `activeSessionId` on each project. The frontend uses this to:
- Show "running" indicator on project cards
- Determine whether to show "Run Session" or "Session Running" button
- Auto-connect to the SSE stream when viewing a project with an active session

---

## 12. Key Notes for Team

### For Jonah (Backend)

- **Start with the schemas** (`session.ts`), then the store (`sessions.ts`), then the runner, then the manager, then the routes. Each layer builds on the previous.
- **The `SessionRunner` is the most complex piece.** Get the basic spawn-and-stream working first, then add timeout/stop/event-limit features.
- **Test the CLI output format manually first.** Run `echo "What is 2+2?" | claude -p --output-format stream-json --include-partial-messages` to see the actual NDJSON output. The event mapping may need adjustment based on the real output.
- **The `readline` approach for line splitting** is battle-tested and handles buffering correctly. Don't try to split on `\n` manually.
- **No new npm dependencies are needed.** Everything uses Node built-ins: `child_process`, `readline`, `events`, `fs/promises`. Express's response object supports SSE natively.
- **Express 5 param merging:** When mounting routes with `app.use("/api/projects/:id/sessions", sessionRoutes)`, the `:id` param is available in session routes via `req.params.id`. No special configuration needed in Express 5.
- **Race condition on session start:** The check-then-register pattern is synchronous (no `await` between them), so it's safe in single-threaded Node. Don't add any async operations between the concurrency check and the session registration.
- **The NDJSON append is fire-and-forget.** Use `appendFile` without `await` in the hot path (`emitEvent`). The small risk of event loss on crash is acceptable for 3a. If you prefer safety, `await` is fine too -- the throughput is low enough (events come in at human-reading speed, not thousands per second).

### For Alice (Frontend)

- **The SSE contract is simple.** Connect to the `events` endpoint, listen for `session_event` and `session_done` events. The browser's `EventSource` handles reconnection automatically.
- **Event IDs enable reconnection.** If the connection drops, `EventSource` reconnects and sends `Last-Event-ID`. The server replays from that point. No client-side dedup needed.
- **Tool result events may have `truncated: true`.** Show a "(truncated)" indicator when displaying these.
- **`assistant_text` events with `delta: true`** are incremental. Concatenate them into the current text block until you get a non-delta `assistant_text` or a different event type. This gives the streaming-text-appearing effect.
- **The project's `activeSessionId` field tells you** whether to show the live log on page load. If it's set, immediately connect to the SSE stream.

### For Robert (Designer)

- **Event types map to visual treatment:**
  - `assistant_text` (delta) -- streaming text, append character by character
  - `tool_use` -- a distinct log entry with tool name and input summary
  - `tool_result` -- collapsed by default, expandable
  - `system` -- status messages (session start/end)
  - `error` -- red/warning treatment
- **The log is append-only.** New events always go at the bottom. No reordering.
- **Session metadata** (status, duration, event count) is available for the session history list. Design the list item with these fields.

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Claude CLI output format changes | Parser is resilient: unknown event types are logged and skipped, not crashed on. Pin to known types. |
| Large NDJSON files (long sessions) | 5000 event cap + tool result truncation at 200 lines. Worst case ~5MB per session. |
| Multiple tabs cause duplicate SSE connections | Each tab gets its own SSE connection. `EventEmitter` fans out naturally. No state corruption. |
| NDJSON append race (multiple events written simultaneously) | `appendFile` in Node is safe for sequential calls from the same process. Events come from a single child process stdout, processed sequentially by `readline`. No race. |
| Server crash orphans claude processes | Accepted for 3a. Orphans run until they finish or hit their own timeout. On restart, their sessions are marked `failed`. |
| Vite proxy buffers SSE | Unlikely with default settings. If it does, add `configure: (proxy) => { proxy.on('proxyRes', (proxyRes) => { proxyRes.headers['X-Accel-Buffering'] = 'no'; }); }` to vite.config.ts. |
