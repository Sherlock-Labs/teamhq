# TeamHQ Phase 3 - Live Agent Progress

## Problem Statement

Today, when the CEO clicks "Start Work" on a project, they get a kickoff prompt to copy into a Claude Code terminal session. From that point on, the web UI goes dark -- there's no visibility into what the agents are doing, what stage the work is at, or whether anything has gone wrong. The CEO has to alt-tab to the terminal to check progress, and manually add notes in the web UI to track what happened.

Phase 3 closes this gap. The CEO should be able to start an agent session from the browser and watch the team work in real time -- who's active, what they're doing, what they've produced. When they come back later, the full history of agent work should be there to review.

---

## How Claude Code Works Programmatically

Understanding the CLI is critical to scoping this correctly:

- `claude -p "prompt"` runs a one-shot prompt with full tool access and exits
- `claude -p --output-format stream-json` streams NDJSON events in real time as the agent works (tool calls, text output, status updates)
- `claude -p --output-format json` returns a single JSON envelope when done
- `--agent <name>` selects an agent definition from `.claude/agents/`
- `--agents <json>` defines custom agents inline
- `--include-partial-messages` includes incremental text chunks during streaming
- `--dangerously-skip-permissions` bypasses permission prompts (necessary for headless operation)
- `--max-budget-usd <amount>` sets a spending cap
- The CLI runs in the repo working directory and has full filesystem access
- Sessions can run for 10-30+ minutes for complex agent work

The team already uses `claude -p` in the OST tool (`ost-tool/server/src/agents/claude-runner.ts`). Phase 3 extends this pattern to long-running, streaming sessions.

---

## Phasing Strategy

This is a large feature. We phase aggressively to deliver value early.

### Phase 3a: Headless Session Execution + Live Log (MVP)

**The single most valuable thing:** Replace the copy-paste kickoff with a "Run" button that actually executes the agent session server-side, and stream a live log of what's happening to the browser.

### Phase 3b: Structured Agent Activity View

**Next level:** Parse the streaming output into a structured view -- per-agent status cards, tool call history, file changes, decisions. Instead of a raw log, the CEO sees an organized dashboard of agent activity.

### Phase 3c: Session Control + Multi-Session Management

**Power features:** Pause/resume sessions, send follow-up instructions mid-session, manage multiple concurrent sessions, session history and replay.

**This requirements document covers Phase 3a only.** Phases 3b and 3c will be scoped after 3a ships.

---

## Phase 3a Scope

### What We're Building

1. **Server-side session runner** -- The Express server spawns `claude -p --output-format stream-json` as a child process, fed with the kickoff prompt
2. **Real-time streaming to browser** -- Server-Sent Events (SSE) push the live output to the frontend as the agent works
3. **Live activity log** -- The project detail view shows a scrolling log of agent activity (text output, tool calls, status)
4. **Session persistence** -- Session events are stored to disk so the CEO can review the log after the session ends
5. **Basic session lifecycle** -- Start, monitor, and see when a session completes or fails

### What We're NOT Building (Deferred to 3b/3c)

- Per-agent status cards or structured agent parsing
- Pause/resume or mid-session instructions
- Multiple concurrent sessions per project
- Session replay or timeline view
- Cost tracking or budget management UI
- Agent-level progress tracking (which agent is active)
- Automated task extraction from agent output

---

## User Stories

### US-1: Run Agent Session from Browser

**As** the CEO, **I want** to click "Run" on a project and have the agent session execute automatically, **so that** I don't have to copy-paste the kickoff prompt into a terminal.

**Acceptance Criteria:**
- Projects with status `in-progress` show a **"Run Session"** button in the detail view (alongside the existing "View Prompt" link)
- Projects with status `planned` can still use "Start Work" which now both starts the project AND offers to run the session
- Clicking "Run Session" spawns a headless Claude Code session on the server
- The server runs `claude -p --output-format stream-json --dangerously-skip-permissions` with the kickoff prompt as input
- The session runs in the `teamhq` repo working directory so agents can read/write files
- If a session is already running for this project, the button shows "Session Running" (disabled) and the live log is visible
- The CEO can also still copy the kickoff prompt manually (the existing flow continues to work)

### US-2: Live Activity Log

**As** the CEO, **I want** to see what the agents are doing in real time as they work, **so that** I have visibility into the session without opening a terminal.

**Acceptance Criteria:**
- When a session is running, the project detail view shows a **live activity log** below the action area
- The log displays events as they stream in from the server:
  - **Assistant text** -- what the agent is saying/thinking (the main narrative)
  - **Tool use** -- when the agent calls a tool (e.g., "Read file: server/src/index.ts", "Edit file: js/projects.js", "Running: npm test")
  - **Tool results** -- abbreviated results of tool calls (first few lines, with expand option)
  - **System messages** -- session start, completion, errors
- The log auto-scrolls to the bottom as new events arrive (with a "scroll lock" -- if the CEO scrolls up, auto-scroll pauses; clicking "Jump to latest" resumes)
- Events are timestamped
- The log has a maximum display of ~500 recent events (older events are still persisted, just not rendered)
- The log works for sessions that are already in progress (connecting mid-session shows events from the beginning via persistence)

### US-3: Session Completion + History

**As** the CEO, **I want** to see the full log of a completed session, **so that** I can review what the agents did after the fact.

**Acceptance Criteria:**
- When a session completes (agent exits normally), the log shows a "Session completed" marker with a timestamp and duration
- When a session fails (non-zero exit, timeout, spawn error), the log shows an error marker with details
- Completed session logs are persisted and viewable from the project detail view at any time
- The project detail view shows session history: a list of past sessions with start time, duration, and status (completed/failed)
- Clicking a past session loads its log
- Session logs are stored as files on disk (not in the project JSON -- they can be large)

### US-4: Session Timeout + Safety

**As** the CEO, **I want** agent sessions to have safety limits, **so that** a runaway session doesn't consume unlimited resources.

**Acceptance Criteria:**
- Sessions have a default timeout of 30 minutes (configurable per-project in the future, hardcoded for now)
- When a session hits the timeout, it's terminated with SIGTERM, then SIGKILL after 10 seconds
- The log shows a timeout marker
- Only one session can run per project at a time (attempting to start a second shows an error)
- A maximum of 3 concurrent sessions across all projects (to limit resource usage)
- The CEO can **stop** a running session via a "Stop Session" button
- Stopping sends SIGTERM to the process

---

## Data Model Changes

### New: Session Model

Sessions are stored as individual files in `data/sessions/{projectId}/`.

```
data/
  sessions/
    {projectId}/
      {sessionId}.json      # Session metadata
      {sessionId}.ndjson     # Session event log (append-only NDJSON)
```

#### Session Metadata (`{sessionId}.json`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Session identifier |
| `projectId` | string | The project this session belongs to |
| `status` | enum | `running`, `completed`, `failed`, `stopped`, `timed-out` |
| `startedAt` | ISO timestamp | When the session started |
| `endedAt` | ISO timestamp / null | When the session ended |
| `durationMs` | number / null | Total duration in milliseconds |
| `eventCount` | number | Total number of events logged |
| `exitCode` | number / null | Process exit code |
| `error` | string / null | Error message if failed |
| `pid` | number / null | Process ID (while running) |

#### Session Event Log (`{sessionId}.ndjson`)

One JSON object per line, appended as events stream from the CLI. Each event:

| Field | Type | Notes |
|-------|------|-------|
| `timestamp` | ISO string | When the event was received |
| `type` | enum | `assistant_text`, `tool_use`, `tool_result`, `system`, `error` |
| `data` | object | Event-specific payload (varies by type) |

Event types:

- **`assistant_text`**: `{ text: string }` -- what the agent is writing
- **`tool_use`**: `{ tool: string, input: object }` -- tool being called (e.g., `{ tool: "Bash", input: { command: "npm test" } }`)
- **`tool_result`**: `{ tool: string, output: string (truncated) }` -- result from a tool call
- **`system`**: `{ message: string }` -- session lifecycle events (started, completed, etc.)
- **`error`**: `{ message: string, code?: number }` -- errors and failures

### Updated: Project Schema

Add a field to track the active session:

| Field | Type | Notes |
|-------|------|-------|
| `activeSessionId` | string / null | ID of the currently running session, null if none |

---

## API Changes

### New Endpoints

#### `POST /api/projects/:id/sessions`

Start a new agent session for a project.

**Behavior:**
1. Validate the project exists and has status `in-progress` (or `planned` -- if `planned`, also run the "start" logic to transition to `in-progress`).
2. Check no session is already running for this project. Return 409 if one is.
3. Check total concurrent sessions < 3. Return 429 if at limit.
4. Create a session record (metadata file + empty event log).
5. Spawn `claude -p --output-format stream-json --dangerously-skip-permissions` with the kickoff prompt piped to stdin.
6. Set `project.activeSessionId` to the new session ID.
7. Begin writing streamed output to the session event log (NDJSON file).
8. Return the session metadata (status: `running`).

**Response: `201 Created`**
```json
{
  "id": "session-uuid",
  "projectId": "project-uuid",
  "status": "running",
  "startedAt": "...",
  "endedAt": null,
  "durationMs": null,
  "eventCount": 0
}
```

**Errors:**
- `404` -- project not found
- `409` -- session already running for this project
- `429` -- too many concurrent sessions

#### `GET /api/projects/:id/sessions`

List all sessions for a project.

**Response: `200 OK`**
```json
{
  "sessions": [
    {
      "id": "...",
      "status": "completed",
      "startedAt": "...",
      "endedAt": "...",
      "durationMs": 542000,
      "eventCount": 347
    }
  ]
}
```

Sorted by `startedAt` descending (newest first).

#### `GET /api/projects/:id/sessions/:sessionId`

Get session metadata.

**Response: `200 OK`** -- returns the session metadata object.

#### `GET /api/projects/:id/sessions/:sessionId/events`

Stream session events to the client via SSE.

**Behavior:**
- If the session is `running`: opens an SSE connection, sends all existing events as a batch, then streams new events in real time as they arrive.
- If the session is completed/failed/stopped: sends all events as a batch and closes the connection.

**SSE Event Format:**
```
data: {"timestamp":"...","type":"assistant_text","data":{"text":"I'll start by..."}}

data: {"timestamp":"...","type":"tool_use","data":{"tool":"Read","input":{"file_path":"server/src/index.ts"}}}
```

**Query Parameters:**
- `offset` (optional) -- start from event N (for reconnection). Default: 0.

**Response:** `text/event-stream` with SSE events.

#### `POST /api/projects/:id/sessions/:sessionId/stop`

Stop a running session.

**Behavior:**
1. Check the session exists and is `running`. Return 409 if not running.
2. Send SIGTERM to the process.
3. Set a 10-second timer; if not exited, send SIGKILL.
4. Update session metadata (status: `stopped`).
5. Clear `project.activeSessionId`.

**Response: `200 OK`** -- returns updated session metadata.

### Updated Endpoints

**`GET /api/projects/:id`** -- now includes `activeSessionId` in the response.

**`GET /api/projects`** -- now includes `activeSessionId` in the summary (so the list can show which projects have active sessions).

---

## Frontend Changes

### Project Detail View Updates

The existing project detail view gets a new section below the action area:

1. **Action area changes:**
   - For `in-progress` projects: show "Run Session" button alongside "View Prompt"
   - If a session is running: show "Session Running" indicator + "Stop Session" button
   - Show session count: "3 sessions" linking to session history

2. **Live Activity Log:**
   - Appears when a session is running OR when viewing a past session
   - Monospace font, dark background (terminal-like aesthetic)
   - Color-coded event types:
     - Assistant text: default text color
     - Tool use: indigo/blue accent
     - Tool results: muted/gray, collapsed by default with "Show output" toggle
     - System messages: green for success, red for errors, yellow for warnings
   - Timestamps in the left margin (relative time, e.g., "+0:42")
   - Auto-scroll behavior with "Jump to latest" button when scrolled up

3. **Session History:**
   - Below the live log area
   - List of past sessions: status badge, start time, duration
   - Click to load that session's log

### New: Session Running Indicator

When a session is running on any project, the project card in the list view shows a subtle "running" indicator (animated dot or similar) so the CEO can see at a glance which projects have active sessions.

### Connection Handling

- The frontend connects to the SSE endpoint when the user views a project with an active session
- On disconnect, the frontend reconnects with the `offset` parameter to avoid re-fetching all events
- When the user navigates away from the project detail, the SSE connection is closed
- A small reconnection backoff (1s, 2s, 4s, max 10s) handles transient network issues

---

## Technical Decisions for the Architect

These are the key architectural questions for Andrei:

1. **SSE vs WebSocket** -- SSE is recommended for simplicity (server-to-client only), but Andrei should confirm. We don't need bidirectional communication in 3a.

2. **Event parsing** -- The `claude -p --output-format stream-json` output format needs to be mapped to our event types. Andrei should define the mapping from Claude's NDJSON output to our `assistant_text`, `tool_use`, `tool_result`, `system` types.

3. **Process management** -- How to track child processes across server restarts. If the server crashes, orphaned claude processes need cleanup. Andrei should decide: PID file? Process group? Just accept orphans in 3a?

4. **Event log size** -- NDJSON files could get large for long sessions. Should we cap per-event size (truncate tool results)? Cap total events? This affects storage and the "load past session" performance.

5. **Concurrency safety** -- Multiple SSE clients watching the same session (e.g., CEO opens two tabs). How do we fan out events? In-memory event bus? File tailing?

6. **Security** -- `--dangerously-skip-permissions` gives the agent full system access. Is this acceptable for 3a? Should we limit with `--allowedTools`? Should we run in a sandboxed directory?

---

## Team Involvement

| Order | Agent | Role | What They Do |
|-------|-------|------|-------------|
| 1 | Andrei | Technical Architect | Session management architecture, SSE streaming design, event parsing from Claude CLI, process lifecycle, storage decisions. This is the most architecturally complex phase -- Andrei goes first. |
| 2 | Robert | Product Designer | Live log UI design, session history layout, running indicator design, terminal-like log aesthetic, auto-scroll UX |
| 3 | Jonah | Back-End Developer | Session runner (child process management), SSE endpoint, event log storage, session CRUD API, process cleanup |
| 3 | Alice | Front-End Developer | SSE client, live log rendering, auto-scroll, session history UI, connection management, running indicators |
| 4 | Enzo | QA | Session lifecycle testing, SSE connection testing, error handling, timeout behavior, concurrent session limits |

---

## Success Criteria

Phase 3a is done when:

1. The CEO can click "Run Session" on an in-progress project and a Claude Code session starts server-side
2. The live activity log shows real-time agent output as the session runs
3. The log displays assistant text, tool calls, and tool results with visual differentiation
4. The log auto-scrolls and supports manual scroll lock
5. Completed sessions are persisted and can be reviewed later
6. The CEO can stop a running session
7. Sessions have a 30-minute timeout
8. Only one session runs per project, max 3 concurrent total
9. The existing "Start Work" and copy-to-clipboard flows continue to work
10. Session history shows past sessions with status and duration

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Claude CLI output format changes | Low | High | Pin to known output format, add resilience in parser |
| Long sessions produce massive event logs | Medium | Medium | Truncate tool results to first 200 lines, cap at 5000 events per session |
| Server restart loses running session state | Medium | Medium | Accept in 3a -- session shows as "failed" after restart. Proper recovery in 3c. |
| Permission errors from headless agent | Medium | Low | Use `--dangerously-skip-permissions` for 3a. Revisit in 3b with scoped permissions. |
| SSE connection drops | High | Low | Auto-reconnect with offset parameter to resume from last event |
| CEO accidentally runs multiple expensive sessions | Low | Medium | Enforce concurrent session limit (3 total), per-project limit (1) |
