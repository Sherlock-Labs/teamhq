# Work Log — Technical Approach

**Author:** Andrei (Arch)
**Date:** February 11, 2026
**Status:** Complete

---

## 1. Overview

The Work Log replaces per-session UI with a unified timeline per project. The data model is unchanged — sessions remain the unit of storage (NDJSON files + JSON metadata per session). The change is purely aggregation (backend) and presentation (frontend).

**Key architectural decision:** server-side aggregation via a new REST endpoint. The frontend fetches one merged timeline, then overlays live SSE for the active session. This avoids client-side multi-file fetching and keeps the frontend simple.

---

## 2. Backend: Aggregation Endpoint

### `GET /api/projects/:id/work-log`

A new route in `server/src/routes/sessions.ts` that reads all sessions for a project, merges their NDJSON event logs chronologically, and returns a single response.

### How It Works

1. **List sessions** — call existing `listSessions(projectId)` to get all `SessionMetadata[]`, sorted by `startedAt` ascending (reverse the current descending sort, or re-sort).
2. **Read NDJSON files** — for each session, call existing `readEventLog(projectId, sessionId)` to get `SessionEvent[]`.
3. **Inject session context** — for each event, add `sessionId` and `sessionIndex` (0-based, matching position in the sorted sessions array). This is done in-memory during merge; the NDJSON files are NOT modified.
4. **Merge chronologically** — since sessions don't overlap (enforced by concurrency guard), merging is simply concatenation in session-start order. Within a session, events are already ordered by `id`. No cross-session sort needed.
5. **Build response** — return `{ events, sessions, totalEvents }`.

### Why Concatenation, Not Sort

Sessions are sequential (the concurrency guard in `sessionManager.canStartSession` prevents overlapping sessions per project). So merging is: session 1 events, then session 2 events, etc. — already in chronological order. This is O(n) concatenation, not O(n log n) sort. Correct and fast.

### Pagination

The requirements define an `offset` query param (skip first N events). Implementation:

```typescript
const offset = parseInt(req.query.offset as string) || 0;
const allEvents = [...mergedEvents]; // after concatenation
const sliced = offset > 0 ? allEvents.slice(offset) : allEvents;
```

For v1, we load all events. Offset is available for future infinite-scroll but not wired up in the frontend yet. Projects currently have <500 events total, so full load is fine.

### Response Shape

```typescript
interface WorkLogResponse {
  events: (SessionEvent & { sessionId: string; sessionIndex: number })[];
  sessions: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    durationMs: number | null;
    status: string;
    eventCount: number;
  }[];
  totalEvents: number;
}
```

### Performance Considerations

- **Current scale:** Most projects have 1 session, max observed is 3. Event counts are <500 per project. Full in-memory merge is fine.
- **File I/O:** Reading N NDJSON files sequentially. For 3 files with <200 lines each, this takes <10ms. Use `Promise.all` for parallel reads if needed, but sequential is fine for v1.
- **No caching:** Events are immutable once written (append-only NDJSON). But we still re-read on every request because session metadata (status, durationMs) can change for running sessions. Caching is a v1.1 optimization if needed.

### Store Function

Add a new function in `server/src/store/sessions.ts`:

```typescript
export async function getWorkLog(projectId: string, offset: number = 0) {
  const sessions = await listSessions(projectId);
  // Sort ascending by startedAt (listSessions returns descending)
  sessions.sort((a, b) =>
    new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  const allEvents: (SessionEvent & { sessionId: string; sessionIndex: number })[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const events = await readEventLog(projectId, session.id);
    for (const event of events) {
      allEvents.push({
        ...event,
        sessionId: session.id,
        sessionIndex: i,
      });
    }
  }

  const totalEvents = allEvents.length;
  const sliced = offset > 0 ? allEvents.slice(offset) : allEvents;

  const sessionSummaries = sessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    durationMs: s.durationMs,
    status: s.status,
    eventCount: s.eventCount,
  }));

  return { events: sliced, sessions: sessionSummaries, totalEvents };
}
```

---

## 3. Frontend Refactor Strategy

This is the big lift. The current `js/projects.js` has ~2500 lines with session state management spread across many functions. The refactor replaces the per-session paradigm with a unified Work Log paradigm.

### 3.1 What Gets Removed

- **Session history sidebar** — `renderSessionHistory()`, `loadSessionHistory()`, the `session-history-container` div in `renderDetailView()`, and click handlers for session history items.
- **Session switching** — `loadSessionLog()` which loads a single session's events. The concept of `viewingSessionId` as "which session log am I looking at" changes meaning (see below).
- **Session-language labels** — "Session running", "Run Session", "Run New Session", "Stop Session", "Live Session", "Session Log".

### 3.2 What Gets Added/Changed

#### New API function

```javascript
function apiGetWorkLog(projectId, offset) {
  var url = API_BASE + '/' + encodeURIComponent(projectId) + '/work-log';
  if (offset) url += '?offset=' + offset;
  return fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load work log');
      return res.json();
    });
}
```

#### Renamed Controls (renderSessionControls → renderWorkControls)

| Current | New |
|---------|-----|
| "Session running" | "Working" |
| "Run Session" / "Run New Session" | "Start Work" (planned) / "Continue Work" (has sessions) |
| "Stop Session" | "Stop" |

The function is renamed from `renderSessionControls` to `renderWorkControls`. Same structure, different labels:

```javascript
function renderWorkControls(project) {
  var hasActiveSession = !!project.activeSessionId;
  var hasPastSessions = /* check from work log data or sessions array */;
  var html = '<div class="detail__session-controls">';

  if (hasActiveSession) {
    html +=
      '<div class="detail__session-status">' +
        '<span class="detail__session-indicator detail__session-indicator--running"></span>' +
        '<span class="detail__session-status-text">Working</span>' +
      '</div>' +
      '<button class="detail__stop-btn" type="button" data-session-id="' + escapeAttr(project.activeSessionId) + '">Stop</button>';
  } else {
    var label = hasPastSessions ? 'Continue Work' : 'Start Work';
    html += '<button class="detail__run-btn" type="button">' + label + '</button>';
  }
  // ... kickoff prompt button unchanged
  html += '</div>';
  return html;
}
```

#### Work Log Loading (replaces connectToSession for initial load)

New function `loadWorkLog(projectId)` replaces the current `initSessionsForProject` + `loadSessionHistory` pattern:

1. Fetch `GET /api/projects/:id/work-log`.
2. Store the `sessions` metadata array (needed for divider rendering).
3. Render the Work Log container (replaces `renderSessionLog`).
4. Process all historical events through the existing `appendSessionEvent` logic to build up panel state (pipeline, team activity, deliverables).
5. If the project has an active session, connect SSE for that session only (existing `connectToSession` SSE logic, but appending to the already-populated log).

#### Session Dividers

When rendering events, detect session boundaries by comparing `sessionIndex` between consecutive events. When `sessionIndex` changes, insert a divider element:

```javascript
function renderSessionDivider(sessionMeta) {
  var dateStr = formatSessionDate(sessionMeta.startedAt);
  var durationStr = sessionMeta.durationMs ? formatDurationShort(sessionMeta.durationMs) : '';
  return (
    '<div class="session-divider">' +
      '<div class="session-divider__line"></div>' +
      '<div class="session-divider__label">' +
        '<span class="session-divider__date">' + escapeHTML(dateStr) + '</span>' +
        (durationStr ? '<span class="session-divider__duration">' + escapeHTML(durationStr) + '</span>' : '') +
      '</div>' +
      '<div class="session-divider__line"></div>' +
    '</div>'
  );
}
```

The first session always gets a divider at the top. Subsequent sessions get a divider when `event.sessionIndex !== previousEvent.sessionIndex`.

#### Work Log Header

Replaces "Live Session" / "Session Log" with "Work Log". The timer shows accumulated duration across all sessions, plus live elapsed time for the current work block:

```javascript
var totalDurationMs = 0;
for (var i = 0; i < sessions.length; i++) {
  if (sessions[i].durationMs) totalDurationMs += sessions[i].durationMs;
}
// Header: "Work Log" + formatDurationShort(totalDurationMs)
// When live: timer adds current elapsed on top of totalDurationMs
```

#### Cumulative Panel State

This is the critical correctness concern. Currently, `appendSessionEvent` updates pipeline phase, team activity, and deliverables state — but this state is reset in `disconnectSession()`. For the Work Log:

1. **On initial load:** Process ALL historical events from the work-log endpoint through the panel state updaters. This means calling the pipeline/team/deliverables tracking logic in `appendSessionEvent` for every event.
2. **On live session:** Continue updating from the cumulative baseline. SSE events just keep incrementing the same state.
3. **The state variables** (`pipelinePhase`, `completedPhases`, `teamAgents`, `teamAgentIndex`, `deliverableFiles`, `deliverableOrder`, `activeAgents`, `currentAgent`) are initialized once when the work log loads and never reset until the detail view is collapsed.

**Important subtlety:** The `currentAgent` variable tracks "most recently spawned agent" for message sender attribution. When processing historical events, this naturally advances through all the agents. When the live session starts, it picks up from wherever history left off. No special handling needed.

#### SSE Hybrid Approach

The Work Log uses a two-phase loading pattern:

1. **Phase 1 (REST):** `GET /api/projects/:id/work-log` → all historical events rendered in bulk.
2. **Phase 2 (SSE):** If `project.activeSessionId` exists, connect SSE to `GET /api/projects/:id/sessions/:sessionId/events` with offset = number of events from that session already in the work log.

The SSE connection is ONLY for the active session. Historical sessions are static and don't need streaming.

**Computing SSE offset:** The work-log response includes events with `sessionId`. Count how many events have `sessionId === activeSessionId` — that's the offset for the SSE connection, preventing duplicate events.

```javascript
var activeSessionEventCount = 0;
for (var i = 0; i < workLogData.events.length; i++) {
  if (workLogData.events[i].sessionId === project.activeSessionId) {
    activeSessionEventCount++;
  }
}
// Connect SSE with ?offset=activeSessionEventCount
```

When a NEW session is started via "Continue Work," insert a session divider, then connect SSE with offset=0 (no historical events for the new session yet).

#### Card Badge

The running indicator tooltip changes from "Session running" to "Working":

```javascript
// In renderCard:
(project.activeSessionId ? '<span class="project-card__running-indicator" title="Working"></span>' : '')
```

### 3.3 State Variable Changes

| Variable | Current Use | Work Log Use |
|----------|------------|-------------|
| `viewingSessionId` | Which session log is displayed | Unused — remove or repurpose as `activeSessionId` reference |
| `sessionEvents` | Events for the current session | Events for the entire work log (all sessions) |
| `sessionStartTime` | Start of current session (for relative timestamps) | Start of first event overall (for relative timestamps) |
| `sessionIsLive` | Whether current view is a live session | Whether the project has an active session |
| `activeSessionId` | Which session's SSE we're connected to | Same — still tracks the SSE session |

New state:
- `workLogSessions` — array of session metadata from the work-log response (for divider rendering)
- `workLogTotalDuration` — accumulated duration for the header timer

### 3.4 Rendering Flow

**Current flow:**
1. Expand card → `renderDetailView()` → `initSessionsForProject()` → connect SSE for active session or load session history sidebar
2. Click session in sidebar → `loadSessionLog()` → `connectToSession()` → render that session's events

**New flow:**
1. Expand card → `renderDetailView()` → `loadWorkLog()` → fetch all events → render unified timeline with dividers and cumulative panels
2. If active session exists → connect SSE → append new events to existing timeline
3. No session sidebar. No session switching.

---

## 4. File Classification

### New Files

None. All changes are to existing files.

### Extended Files

| File | Classification | What Changes |
|------|---------------|-------------|
| `server/src/store/sessions.ts` | **Extend** | New `getWorkLog()` function appended. Existing functions unchanged. |
| `server/src/routes/sessions.ts` | **Extend** | New `GET /` route handler for work-log endpoint (or add to projects.ts — see routing note below). Existing routes unchanged. |

### Modified Files

| File | Classification | What Changes |
|------|---------------|-------------|
| `server/src/routes/projects.ts` | **Modify** | Add route mounting for the new work-log endpoint. Small change — just a new route definition. |

### Restructured Files

| File | Classification | What Changes |
|------|---------------|-------------|
| `js/projects.js` | **Restructure** | Session state management, rendering, and event handling are refactored from per-session to unified Work Log. `renderSessionControls` → `renderWorkControls`, `renderSessionLog` → `renderWorkLog`, `initSessionsForProject` → `loadWorkLog`. Session history sidebar removed. Cumulative panel computation changes. SSE connection logic changes. Affects ~15 functions across ~400 lines. |

**QA impact note for `js/projects.js` [Restructure]:** Affects session rendering, panel state computation, SSE event handling, session controls, and the card running indicator. Regression test: expanding a project detail view, starting a session, live event streaming, stopping a session, panel accuracy (pipeline, team, deliverables), and re-expanding a project that already has historical sessions.

### Unchanged Files

| File | Notes |
|------|-------|
| `projects.html` | No HTML changes needed — the session-log-container and session-history-container divs are populated by JS. The removal of the session history sidebar happens in JS, not HTML. |
| `server/src/schemas/session.ts` | SessionEvent and SessionMetadata schemas unchanged. |
| `css/styles.css` | Minor CSS additions may be needed for session dividers, but no restructure. Robert will specify in the design spec. |

---

## 5. Routing Decision

**Where does the new endpoint live?**

Option A: Add `GET /api/projects/:id/work-log` to `server/src/routes/projects.ts`
Option B: Add it to `server/src/routes/sessions.ts` (mounted at `/api/projects/:id/sessions`)

**Decision: Option A** — add to `projects.ts`. The work-log endpoint is a project-level aggregation, not a session-level operation. It sits alongside other project routes like `/projects/:id/work-items`. The URL is `/api/projects/:id/work-log`, not `/api/projects/:id/sessions/work-log`.

---

## 6. API Contract (Alice + Jonah Alignment)

### `GET /api/projects/:id/work-log`

**Query params:**
- `offset` (optional, number) — skip first N events. Default: 0.

**Response (200):**
```json
{
  "events": [
    {
      "id": 0,
      "timestamp": "2026-02-10T14:30:00.000Z",
      "type": "system",
      "data": { "message": "Session started" },
      "sessionId": "abc-123",
      "sessionIndex": 0
    },
    {
      "id": 1,
      "timestamp": "2026-02-10T14:30:05.000Z",
      "type": "assistant_text",
      "data": { "text": "Starting work..." },
      "sessionId": "abc-123",
      "sessionIndex": 0
    }
  ],
  "sessions": [
    {
      "id": "abc-123",
      "startedAt": "2026-02-10T14:30:00.000Z",
      "endedAt": "2026-02-10T14:45:00.000Z",
      "durationMs": 900000,
      "status": "completed",
      "eventCount": 42
    },
    {
      "id": "def-456",
      "startedAt": "2026-02-11T10:00:00.000Z",
      "endedAt": null,
      "durationMs": null,
      "status": "running",
      "eventCount": 18
    }
  ],
  "totalEvents": 60
}
```

**Response (200, no sessions):**
```json
{
  "events": [],
  "sessions": [],
  "totalEvents": 0
}
```

**Response (404):**
```json
{ "error": "Project not found" }
```

**Notes:**
- Event `id` values are per-session (each session starts at 0). They are NOT globally unique across sessions. Use `sessionId` + `id` for uniqueness.
- `sessionIndex` is 0-based, ordered by `startedAt` ascending.
- The `sessions` array is always sorted ascending by `startedAt`.

### Existing endpoints unchanged

- `POST /api/projects/:id/sessions` — still creates a new session ("Continue Work" / "Start Work")
- `POST /api/projects/:id/sessions/:sessionId/stop` — still stops a session ("Stop")
- `GET /api/projects/:id/sessions/:sessionId/events` — still SSE stream for a single session
- `POST /api/projects/:id/sessions/:sessionId/message` — still sends messages to active session

---

## 7. Build Order

1. **Jonah (BE):** Build the `getWorkLog()` store function and the `GET /api/projects/:id/work-log` route. Test with curl against a project that has multiple sessions (project `b79e7b71-206b-4d80-9d2d-0e163b4270f1` has 3 sessions). Verify events are ordered correctly with `sessionId` and `sessionIndex` injected.

2. **Robert (Designer):** Design spec for Work Log layout — session dividers visual treatment, updated controls, header timer, empty states. Lightweight since this is mostly removing UI (session sidebar) and renaming labels.

3. **Alice (FE):** Implement the Work Log UI. This is the biggest piece:
   - Replace `initSessionsForProject` with `loadWorkLog`
   - Remove session history sidebar rendering
   - Add session divider rendering
   - Refactor panel state to cumulative
   - Update all session-language labels
   - Wire up SSE hybrid (historical REST + live SSE)
   - Update card badge tooltip

Alice needs BOTH Robert's design spec (for visual treatment of dividers, updated controls layout) AND Jonah's endpoint (for the data). She can start with the frontend refactor and stub the API response shape from the contract above while Jonah builds.

---

## 8. Decisions Log

| # | Decision | Rationale | Alternatives Rejected |
|---|----------|-----------|----------------------|
| 1 | Server-side aggregation (not client-side multi-fetch) | Single request, simpler frontend, server has direct filesystem access | Client fetching N session NDJSON files via separate requests |
| 2 | Concatenation, not sort | Sessions are sequential (concurrency guard), so concat is correct and O(n) | Cross-session timestamp sort — unnecessary complexity |
| 3 | Route in projects.ts, not sessions.ts | Work log is project-level aggregation, matches URL pattern `/projects/:id/work-log` | Nesting under sessions path `/projects/:id/sessions/work-log` |
| 4 | Inject sessionId/sessionIndex in response, not in NDJSON files | NDJSON files are append-only logs; don't mutate them. Injection is cheap and stateless. | Writing sessionId into NDJSON at session creation time |
| 5 | Per-session event IDs (not globally unique) | Existing schema, no migration. Frontend uses sessionId+id for uniqueness. | Re-numbering events globally — requires rewriting files |
| 6 | Process all historical events through panel updaters | Reuses existing panel state logic, ensures correctness | Separate "summary" endpoint that pre-computes panel state |
| 7 | SSE offset computed from work-log event count per session | Prevents duplicate events without changing SSE endpoint | New SSE endpoint for "work log stream" — overengineered |

---

*Tech approach written by Andrei (Arch). Downstream agents: Robert reads this for layout decisions and constraints. Jonah builds the API to the contract in section 6. Alice implements the frontend refactor described in section 3.*
