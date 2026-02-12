# Work Log — Product Requirements

**Author:** Thomas (PM)
**Date:** February 11, 2026
**Status:** Complete
**Project ID:** `work-log`

---

## 1. Product Summary

Replace the per-session UI in the project detail view with a unified **Work Log** per project. Today, users see a list of sessions and must click between them to view events. This creates friction and hides accumulated progress behind an extra navigation layer.

The Work Log presents ONE continuous timeline of everything that happened on a project — all sessions concatenated chronologically. Sessions become an implementation detail (data storage), not a user-facing concept. When you open a project, you see the full story of its progress. When you start new work, it appends to the same log.

**One-sentence pitch:** A single, continuous progress timeline per project that shows accumulated work instead of requiring users to click through separate sessions.

**Key insight:** The data already exists in NDJSON files per session. This is primarily a presentation/aggregation change — the backend session infrastructure (spawning, NDJSON recording, SSE streaming) stays as-is.

---

## 2. What's Changing

| Area | Current State | Target State |
|------|--------------|-------------|
| **Project detail — log area** | Session history sidebar listing past sessions; click one to load its events | Unified Work Log showing all events across all sessions |
| **Project detail — panels** | Pipeline, Team Activity, Deliverables recompute per-session (reset when switching) | Panels reflect cumulative state across all sessions |
| **Session controls** | "Run Session" / "Run New Session" + "Stop Session" | "Continue Work" / "Stop" — no session language |
| **Session history sidebar** | List of sessions with date, duration, event count | Removed entirely |
| **Log header** | "Live Session" / "Session Log" with per-session timer | "Work Log" with total accumulated duration |
| **Between work blocks** | Hard boundary — separate sessions, separate views | Subtle date separators within the unified timeline |
| **Running indicator** | "Session running" | "Working" (or similar — no session language) |
| **Card badge** | Green dot with "Session running" tooltip | Green dot with "Working" tooltip |

---

## 3. What's NOT Changing

- **Backend session storage:** NDJSON files per session stay. Sessions remain the unit of recording.
- **Session runner infrastructure:** `createRunner`, `sessionManager`, SSE event streaming — all untouched.
- **Session API routes:** The existing session CRUD and SSE endpoints remain. We add a new aggregation endpoint but don't modify existing ones.
- **Event format:** The NDJSON event schema (`SessionEvent`) is unchanged.
- **Project data model:** No changes to `Project` schema. `activeSessionId` continues to track the running session internally.

---

## 4. User Stories

### US-1: View unified Work Log

As a user, when I expand a project detail view, I see a single Work Log showing all events that have ever occurred on this project, in chronological order.

**Acceptance criteria:**
- [ ] The detail view shows a "Work Log" section (replaces the session log container + session history sidebar)
- [ ] Events from all sessions are displayed in a single chronological timeline
- [ ] Events are ordered by timestamp across sessions (not grouped by session)
- [ ] The Work Log header shows "Work Log" (not "Session Log" or "Live Session")
- [ ] The Work Log header shows total accumulated duration across all sessions
- [ ] If the project has never had a session, the Work Log area shows an empty state: "No work logged yet."
- [ ] The session history sidebar is removed entirely — no list of sessions to click through
- [ ] Pipeline indicator, Team Activity, and File Deliverables panels appear above the event timeline (same position as today) and reflect cumulative state across all sessions

**Interaction states:**
- Loading: Show "Loading work log..." spinner while fetching aggregated events
- Error: "Failed to load work log" inline message with implicit retry on next expand
- Empty: "No work logged yet. Start work to begin tracking progress."

---

### US-2: Session dividers in the Work Log

As a user, I can see where one work block ended and another began, so I understand the timeline of effort.

**Acceptance criteria:**
- [ ] Between events from different sessions, a subtle date separator is shown
- [ ] The separator displays the date/time the work block started (e.g., "Feb 11, 2026 at 2:30 PM")
- [ ] The separator also shows the session duration (e.g., "14m 32s")
- [ ] The first session's events have a separator at the top with the project's first work date
- [ ] Separators are visually subtle — horizontal rule weight, muted text — they don't interrupt the flow

---

### US-3: Continue Work (start new session)

As a user, I can start new work on a project and see it append to the existing Work Log in real time.

**Acceptance criteria:**
- [ ] The action button reads "Continue Work" (not "Run Session" or "Run New Session")
- [ ] For projects that have never been worked on (status: `planned`), the button reads "Start Work" (existing behavior preserved)
- [ ] Clicking "Continue Work" spawns a new session (existing `apiStartSession` behavior)
- [ ] New events from the live session append to the bottom of the existing Work Log timeline
- [ ] A session divider is inserted before the new live events to mark the start of the new work block
- [ ] The Work Log header timer updates live (shows elapsed time for the current work block)
- [ ] The running indicator on the card shows "Working" (not "Session running")
- [ ] The SSE connection streams events for the active session and appends them to the unified log

**Interaction states:**
- Loading: Button shows "Starting..." and is disabled during the API call
- Error: Toast notification "Failed to start work" — button re-enables
- Disabled: Button is disabled while another session is already running (existing concurrency guard)

---

### US-4: Stop Work

As a user, I can stop the current work block. The events remain in the Work Log.

**Acceptance criteria:**
- [ ] The stop button reads "Stop" (concise, no "Stop Session")
- [ ] Clicking "Stop" terminates the running session (existing `apiStopSession` behavior)
- [ ] After stopping, the live timer freezes and the Work Log retains all events
- [ ] The "Continue Work" button reappears
- [ ] The running indicator is removed from the card

**Interaction states:**
- Loading: Button shows "Stopping..." and is disabled
- Error: Toast notification "Failed to stop work" — button re-enables

---

### US-5: Cumulative panels

As a user, the Pipeline, Team Activity, and Deliverables panels reflect the total work done on a project — not just the latest session.

**Acceptance criteria:**
- [ ] When loading the Work Log, pipeline phase state is computed by processing ALL events across all sessions
- [ ] Team Activity panel shows every agent that has been spawned across all sessions, with their latest status
- [ ] File Deliverables panel shows all files written/edited across all sessions, with cumulative edit counts
- [ ] When a live session is running, new events continue to update the panels incrementally (existing behavior, but starting from cumulative baseline)

---

### US-6: Reply to work in progress

As a user, I can send messages to the running session from the Work Log input bar.

**Acceptance criteria:**
- [ ] The input bar appears at the bottom of the Work Log when a session is actively running and idle (waiting for input)
- [ ] Placeholder text: "Reply to the team..." (existing)
- [ ] Sending a message routes to the active session's message endpoint (existing behavior)
- [ ] The input bar hides when no session is running or when the session is processing

**Interaction states:**
- Loading: Input and send button disabled while message is in flight
- Error: Inline error message below input; user's text preserved for retry
- Disabled: Input bar hidden when no active session or session is processing

---

### US-7: Work Log aggregation API

As a frontend consumer, I can fetch all events for a project across all sessions in one request.

**Acceptance criteria:**
- [ ] New endpoint: `GET /api/projects/:id/work-log`
- [ ] Returns events from all sessions for the project, merged chronologically
- [ ] Each event includes a `sessionId` field so the frontend can detect session boundaries for dividers
- [ ] Each event includes a `sessionIndex` field (0-based) to identify which work block it belongs to
- [ ] The response includes a `sessions` array with metadata for each session (id, startedAt, endedAt, durationMs, status) — used for divider labels
- [ ] Supports `offset` query param for pagination: skip the first N events (for large logs)
- [ ] Response shape: `{ events: SessionEvent[], sessions: SessionMetadata[], totalEvents: number }`
- [ ] If no sessions exist, returns `{ events: [], sessions: [], totalEvents: 0 }`

---

### US-8: Live SSE integration with Work Log

As a frontend consumer, when a session is running, I can stream live events and append them to the Work Log.

**Acceptance criteria:**
- [ ] The existing SSE endpoint (`GET /api/projects/:id/sessions/:sessionId/events`) is used unchanged
- [ ] The frontend loads historical events via the Work Log aggregation endpoint, then connects SSE for the active session only
- [ ] SSE events append to the end of the aggregated timeline
- [ ] On reconnection, the SSE offset ensures no duplicate events
- [ ] When the session ends (`session_done` event), the log transitions to static view — all events remain

---

## 5. Scope Boundaries

**In scope:**
- New backend endpoint for aggregated work log
- Frontend: remove session history sidebar
- Frontend: unified Work Log rendering with session dividers
- Frontend: cumulative panel state computation
- Frontend: rename session-related labels ("Continue Work", "Stop", "Working", "Work Log")
- Frontend: accumulated duration display

**Deferred (not v1):**
- Search/filter within the Work Log
- Collapsible session blocks (expand/collapse individual work blocks)
- Work Log pagination with infinite scroll (v1 loads all events; optimize if performance issues arise)
- Exporting the Work Log
- Summary/digest view (AI-generated summary of what happened)

**Out of scope (no plans):**
- Changing backend session storage format
- Changing the session runner or CLI spawning mechanism
- Removing the session API endpoints (they continue to work; the work-log endpoint is additive)

---

## 6. Technical Constraints

- **Performance:** Projects with many sessions could have thousands of events. The aggregation endpoint should handle concatenation efficiently. Defer pagination to v1.1 only if real performance issues surface — current projects have <500 events total.
- **Event ordering:** Events are ordered by timestamp. Within the same timestamp, preserve session order (earlier sessions first) and event ID order within a session.
- **No data migration:** Existing session data files are read as-is. No schema changes needed.
- **SSE hybrid approach:** Historical events load via REST; only the active session streams via SSE. This avoids building a new SSE aggregation layer.

---

## 7. Pipeline Recommendation

This is a frontend-heavy project with a small backend addition. No design system changes, no complex architecture.

**Recommended pipeline:**
1. **Andrei (Arch)** — Tech approach for the aggregation endpoint and frontend refactor strategy. Key decisions: how to merge NDJSON files efficiently, how to structure the frontend state for cumulative panels.
2. **Phase 4 (parallel):**
   - **Robert (Designer)** — Design spec for the Work Log layout, session dividers, updated controls. Lightweight — mostly removing UI (session sidebar) and relabeling.
   - **Jonah (BE)** — Build the `/api/projects/:id/work-log` aggregation endpoint.
3. **Alice (FE)** — Implement the Work Log UI: remove session sidebar, unified timeline, cumulative panels, renamed controls.
4. **Robert (Designer)** — Design review.
5. **Enzo (QA)** — QA pass. Key test areas: multi-session aggregation, live SSE appending to historical log, cumulative panel accuracy, session dividers.

**Agents NOT needed:**
- No Priya (marketing) — internal tool improvement
- No Nadia (writer) — no user-facing docs needed
- No Nina/Soren/Amara — not a UI-heavy component redesign, mostly removing UI and renaming labels
- No Kai (AI) — no AI integration
- No mobile — no mobile app impact

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Large event logs cause slow load times | Low (current projects <500 events) | Medium | Defer pagination to v1.1; monitor performance |
| Cumulative panel state is inaccurate when processing events from multiple sessions | Medium | Medium | Unit test panel state computation with multi-session fixtures |
| SSE reconnection drops events at session boundaries | Low | High | Use existing offset-based reconnection for live session; historical events are static |
