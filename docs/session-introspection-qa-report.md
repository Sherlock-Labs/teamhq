# Session Introspection QA Report

**Author:** Enzo (QA Engineer)
**Date:** 2026-02-07
**Scope:** Phase 1 UI (Alice) + Phase 2 Backend Multi-Turn Session Runner (Jonah)

---

## Verdict: CONDITIONAL PASS

Both Phase 1 (frontend UI) and Phase 2 (backend multi-turn runner) are well-implemented. The code is clean, the architecture is sound, and backward compatibility is preserved. I found several issues ranging from minor to moderate -- none are release-blockers on their own, but two should be addressed before this ships to avoid user-facing bugs.

**Must-fix before release:** Issues #1 and #2
**Should-fix (non-blocking):** Issues #3 through #8

---

## Phase 1 UI: Session Log Introspection

### What Was Verified

| Feature | Status | Notes |
|---------|--------|-------|
| Agent registry maps all 12 agents | PASS | `AGENT_REGISTRY` in `js/projects.js:9-22` matches `.claude/agents/` exactly. All slugs, names, roles, and avatar filenames are correct. |
| Agent banners render for Task tool_use | PASS | `renderAgentBanner()` at line 611 correctly extracts `input.name`, looks up agent, renders avatar + name + role + task description. Unknown agent fallback works (no avatar, raw name, `session-event--agent-unknown` class). |
| SendMessage renders as message cards | PASS | `renderMessageCard()` at line 639 correctly renders sender -> recipient with avatars. Broadcast variant handled (`input.type === 'broadcast'` shows "all" in italic). |
| TeamCreate/TeamDelete lifecycle events | PASS | `renderTeamLifecycle()` at line 675 correctly outputs "Team created" / "Team disbanded" with uppercase styling. |
| TaskOutput shows waiting indicator | PASS | `renderWaitingIndicator()` at line 689 renders "Waiting for {agent}..." with spinner. Agent name resolved from `activeAgents` map. |
| Hidden events (TaskUpdate, etc.) | PASS | `HIDDEN_TOOLS` map at line 28 correctly includes TaskUpdate, TaskCreate, TaskList, TaskGet. `classifyEvent()` returns `'hidden'` for both `tool_use` and `tool_result` of these tools. `appendSessionEvent()` skips rendering at line 925. |
| Read/Glob/Grep event grouping | PASS | `LOW_SIGNAL_TOOLS` at line 31, grouping logic in `appendSessionEvent()` at lines 937-955. Multi-event groups render via `renderEventGroup()` at line 707. Single-event groups correctly fall back to normal `renderToolUseEvent()` in `flushGroup()` at line 838. |
| Group expand/collapse toggle | PASS | Delegated click handler at line 2015. Uses `aria-expanded` / `aria-hidden` pattern matching existing `tool_result` toggle. CSS transitions via `grid-template-rows` at line 2565. |
| Event classification for tool_result | PASS | `classifyEvent()` at line 34 handles `tool_result` events: semantic/hidden tools return `'hidden'`, low-signal tools return `'low'`. Absorbed correctly in `appendSessionEvent()`. |
| Group summary text | PASS | `formatGroupSummary()` at line 48 correctly pluralizes ("1 file" vs "5 files", "1 grep search" vs "3 grep searches"). |
| Agent tracking state | PASS | `activeAgents`, `currentAgent`, `lastTaskToolName` tracked at lines 113-115. Reset on `disconnectSession()` at line 828. |
| State reset on disconnect | PASS | `disconnectSession()` at line 814 resets all agent tracking and grouping state. |

### CSS Verification

| Style | Status | Notes |
|-------|--------|-------|
| Agent spawn banner | PASS | Matches design spec exactly: indigo-400 border, 0.06 opacity bg, 28x28 avatar, `image-rendering: pixelated`. |
| Message card | PASS | 20x20 avatar, sender -> recipient header, 28px content padding-left. |
| Event group | PASS | `grid-template-rows: 0fr/1fr` transition, chevron rotation, hover state on summary text. |
| Team lifecycle | PASS | 2px indigo-400 border, uppercase monospace text, 0.05em letter-spacing. |
| Waiting indicator | PASS | Italic text, 12x12 spinner with indigo-400 top border, `animation: spin 1s linear infinite`. |
| Unknown agent fallback | PASS | `session-event--agent-unknown` changes border to `zinc-700`. |
| Broadcast message variant | PASS | `session-event__message-recipient--broadcast` applies zinc-500, italic, normal weight. |

---

## Phase 2 Backend: Multi-Turn Session Runner

### Architecture Review

| Component | Status | Notes |
|-----------|--------|-------|
| Base runner (`base-runner.ts`) | PASS | Clean separation of concerns. State machine (processing/idle/ended) is correct. Timer management (turn timeout, idle timeout, max lifetime) is well-implemented. Event counter persists across turns. |
| StreamingRunner (`streaming-runner.ts`) | PASS | Correctly keeps stdin open, writes NDJSON messages. Turn boundaries detected via `result` events through `handleResultEvent()` override. Process close handler treats exit as session-level event (not turn-level). |
| ResumeRunner (`resume-runner.ts`) | PASS | Correctly spawns new process per turn with `--resume`. Process close transitions to idle (not ended). `deliverMessage()` delegates to `spawnTurn()`. |
| Runner factory (`runner.ts`) | PASS | Clean factory function with `SESSION_RUNNER_MODE` env var. Default: streaming. |
| Schema changes (`session.ts`) | PASS | `cliSessionId`, `turnCount`, `state` added with defaults. `RunnerState` enum added. Four new event types added to `SessionEventType`. All backward-compatible. |
| Session store (`sessions.ts`) | PASS | `createSessionFiles()` includes new fields with correct defaults. `SessionMetadataSchema.parse()` fills defaults for existing metadata files. |
| Recovery (`recovery.ts`) | PASS | Correctly distinguishes between idle and processing sessions on restart. Idle sessions marked as "stopped" (not "failed"). Sets `state: "ended"` on both paths. |
| Message endpoint (`routes/sessions.ts`) | PASS | Input validation (empty message, max length 100K). Checks runner exists and state is idle. Returns 202 with turn number. Correct error codes (400, 404, 409). |
| Session manager (`manager.ts`) | PASS | Unchanged from previous. Idle sessions stay registered and count against concurrency limits (by design). |

### State Machine Verification

| Transition | Status | Notes |
|------------|--------|-------|
| `start()` -> processing | PASS | `turnCount = 1`, emits `turn_start`, calls `spawnTurn()`. |
| Turn complete -> idle | PASS | `onTurnComplete()` emits `turn_end` + `waiting_for_input`, resets per-turn state, starts idle timer. |
| `sendMessage()` -> processing | PASS | Validates `state === 'idle'`, clears idle timer, increments turn count, emits `user_message` + `turn_start`, calls `deliverMessage()`. |
| `stop()` -> ended | PASS | Sets `killed = true`, clears all timers, kills process, finalizes. |
| Turn timeout -> ended | PASS | `startTurnTimeout()` sets timer, kills process and finalizes as `"timed-out"`. |
| Idle timeout -> ended | PASS | `startIdleTimer()` sets timer, kills process and finalizes as `"timed-out"`. |
| Max lifetime -> ended | PASS | `startMaxLifetimeTimer()` at session start, kills process and finalizes. |

### Timeout Values

| Timeout | Value | Verified |
|---------|-------|----------|
| Turn timeout | 30 min (1,800,000 ms) | PASS |
| Idle timeout | 30 min (1,800,000 ms) | PASS |
| Max session lifetime | 4 hours (14,400,000 ms) | PASS |
| Process kill fallback | 10 seconds after SIGTERM | PASS |

### Backward Compatibility

| Aspect | Status | Notes |
|--------|--------|-------|
| Existing session metadata parses | PASS | All new fields have `.default()` in Zod schema. Existing JSON files get `cliSessionId: null`, `turnCount: 1`, `state: "processing"`. |
| SSE endpoint unchanged | PASS | New event types flow through same pipe. Frontend `switch` default case handles unknown types gracefully (renders nothing). |
| Session creation API unchanged | PASS | `POST /sessions` contract identical. New fields added to response but don't break existing clients. |
| NDJSON event log format unchanged | PASS | New event types appended to same file. `readEventLog()` with offset-based pagination works unchanged. |
| Frontend rendering of new event types | PASS | `renderSessionEvent()` switch default returns `''` for unknown types like `turn_start`, `turn_end`, etc. No crashes. |

---

## Issues Found

### Issue #1 (Moderate): `formatRelativeSessionTime` uses `sessionStartTime` which is `Date.now()` at connection time, not the actual session start time

**File:** `js/projects.js:1224-1233`
**Severity:** Moderate
**Impact:** Relative timestamps (e.g., "+1:23") on session events are inaccurate when viewing historical (completed) sessions. The function subtracts the session start time from the event timestamp, but `sessionStartTime` is set to `Date.now()` when the SSE connection is established (line 1076), not to the session's actual `startedAt`. For live sessions this is approximately correct (connected at start), but for replayed historical sessions, all timestamps show "+0:00" or similar meaningless values.

**Expected:** Timestamps should be relative to the session's actual `startedAt` value.
**Actual:** Timestamps are relative to `Date.now()` at connection time.

**Recommendation:** Set `sessionStartTime` from the session metadata's `startedAt` field when connecting, or from the first event's timestamp. The `connectToSession()` function receives `sessionMeta` but doesn't use its `startedAt` for the timer start time.

---

### Issue #2 (Moderate): Spinner visibility for completed sessions depends on `data-session-status` attribute that is never set

**File:** `css/styles.css:2628`
**Severity:** Moderate
**Impact:** The CSS rule `.session-log[data-session-status="completed"] .session-event__waiting-spinner { display: none; }` hides spinners for completed sessions. However, the `renderSessionLog()` function at `js/projects.js:438-458` never sets a `data-session-status` attribute on the `.session-log` element. This means waiting spinners will keep spinning in completed session logs, which is misleading per Robert's design spec (section 5: "For historical (completed) sessions: hide the spinner").

**Expected:** Spinners should not spin in completed session logs.
**Actual:** Spinners spin perpetually in all sessions, including completed ones.

**Recommendation:** Either set `data-session-status` on the `.session-log` element in `renderSessionLog()` based on session status, or remove the spinner element entirely when the session is not live.

---

### Issue #3 (Minor): `handleResultEvent` in `StreamingRunner` passes `0` as exit code, not actual exit code

**File:** `server/src/session/streaming-runner.ts:122`
**Severity:** Minor
**Impact:** In streaming mode, when a turn completes via a `result` event, `handleResultEvent` calls `this.onTurnComplete(0, durationMs, costUsd)`. The exit code is hardcoded to `0` because the process hasn't actually exited (it stays alive in streaming mode). This is technically correct -- the process didn't exit with an error -- but the `turn_end` event will show `exitCode: 0` which may be misleading since no process exit actually occurred.

**Recommendation:** Pass `null` instead of `0` to distinguish "process exited with code 0" from "turn completed without process exit." The `onTurnComplete` signature already accepts `number | null`.

---

### Issue #4 (Minor): `classifyEvent` doesn't handle `tool_result` events where `event.data.tool` is undefined

**File:** `js/projects.js:34-38`
**Severity:** Minor
**Impact:** For `tool_result` events, `classifyEvent` checks `event.data.tool` to determine classification. However, `tool_result` events get their `tool` field from `lastToolName` in the runner (line 302 of `base-runner.ts`). If `lastToolName` was never set (e.g., first event in a session is somehow a `tool_result`), `event.data.tool` would be an empty string, which would fall through to `'high'`. This is a safe default, so no user-facing bug, but the function could be more explicit about this edge case.

**Recommendation:** No action needed -- the fallback to `'high'` is correct and safe.

---

### Issue #5 (Minor): `groupToggle` `aria-expanded` set to boolean, not string

**File:** `js/projects.js:2018`
**Severity:** Minor
**Impact:** The group toggle handler sets `aria-expanded` to a boolean value (`!isExpanded`) instead of a string (`'true'` / `'false'`). Compare with the result toggle handler at line 2006 which correctly uses string values. The `setAttribute` method will coerce the boolean to a string, so `true` becomes `"true"` and `false` becomes `"false"`, which means this works correctly in practice. However, it's inconsistent with the result toggle pattern and technically `setAttribute('aria-expanded', false)` sets the attribute to the string `"false"`, which happens to be the correct value. Still, using explicit strings would be more robust and consistent.

**Recommendation:** Change line 2018 to:
```javascript
groupToggle.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
```
And line 2021-2022 to:
```javascript
content.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
```
This matches the pattern at lines 2006-2010.

---

### Issue #6 (Minor): `deliverMessage` in `StreamingRunner` resets turn timeout but doesn't reset per-turn state

**File:** `server/src/session/streaming-runner.ts:89-100`
**Severity:** Minor
**Impact:** When `deliverMessage()` is called in streaming mode, it writes the message to stdin and starts a turn timeout, but it does not call `this.resetTurnState()`. The turn state reset is handled by `onTurnComplete()` (which is called after each turn finishes), and `sendMessage()` in the base runner calls `deliverMessage()` without resetting turn state. In the `ResumeRunner`, `deliverMessage()` calls `spawnTurn()` which starts fresh. In `StreamingRunner`, the old `lastToolName`, `streamedTextBlockIds`, and `currentContentBlockIndex` carry over from the previous turn.

However, looking more carefully: `onTurnComplete()` already calls `resetTurnState()` at the end of each turn (line 202 in base-runner.ts). So by the time `sendMessage()` -> `deliverMessage()` is called, the state should already be reset. This is fine.

**Recommendation:** No action needed -- state is already reset by `onTurnComplete()` before the next turn starts.

---

### Issue #7 (Minor): Recovery doesn't distinguish between streaming and resume mode

**File:** `server/src/session/recovery.ts:35`
**Severity:** Minor
**Impact:** Recovery checks `metadata.state === "idle" && metadata.cliSessionId` to decide whether to mark a session as "stopped" vs "failed". In streaming mode, an idle session still has a running process (stdin is open, process is alive). If the server restarts while a streaming session is idle, the process is lost but the session is marked as "stopped" rather than "failed", which may be confusing since the process was actually alive and running.

In resume mode, this distinction is correct: idle sessions have no running process, so they can be cleanly stopped. In streaming mode, idle sessions have a live process that died with the server, which is closer to "failed."

The recovery code doesn't know which mode was in use, but since both modes correctly kill the process on server restart anyway (it's gone), marking as "stopped" is a reasonable conservative choice.

**Recommendation:** Consider storing the runner mode in session metadata for more accurate recovery. Low priority -- current behavior is acceptable.

---

### Issue #8 (Informational): `data-session-status="completed"` CSS rule is specific to "completed" but sessions can end as "stopped", "failed", or "timed-out"

**File:** `css/styles.css:2628`
**Severity:** Informational
**Impact:** Even if Issue #2 is fixed (setting `data-session-status` on the log element), the CSS rule only hides spinners for `completed` sessions. Sessions that ended as `stopped`, `failed`, or `timed-out` would still show spinning indicators. All non-running sessions should hide the spinner.

**Recommendation:** If fixing Issue #2, use a broader selector:
```css
.session-log:not([data-session-status="running"]) .session-event__waiting-spinner {
  display: none;
}
```
Or conditionally omit the spinner element entirely when rendering non-live sessions.

---

## TypeScript Type Consistency

| Check | Status |
|-------|--------|
| `RunnerState` type used consistently across schema, base-runner, and metadata | PASS |
| `SessionEventType` enum includes all new event types | PASS |
| `SessionMetadata` type includes all new fields with correct types | PASS |
| Factory function returns `BaseSessionRunner` type | PASS |
| Manager uses `SessionRunner` which is re-exported as `BaseSessionRunner` | PASS |
| Routes use correct request/response types | PASS |
| `sendMessage()` parameter type matches route body parsing | PASS |

---

## Security Review

| Check | Status | Notes |
|-------|--------|-------|
| Message input validation | PASS | Max 100K characters, non-empty, string type check. |
| Message truncation in events | PASS | `user_message` event truncates to 500 chars (line 121 in base-runner). |
| Task description truncation | PASS | Frontend truncates to 120 chars (line 621 in projects.js). |
| Message content truncation | PASS | Frontend truncates to 200 chars (line 654 in projects.js). |
| HTML escaping | PASS | All user-visible content goes through `escapeHTML()` or `escapeAttr()`. |
| Process kill escalation | PASS | SIGTERM -> 10s -> SIGKILL. Clean shutdown path. |
| Stdin close on streaming kill | PASS | `killProcess()` override in StreamingRunner closes stdin first. |
| No path traversal in session IDs | PASS | Session IDs are UUIDs generated server-side. |
| No injection in CLI args | PASS | Prompt is written to stdin, not passed as CLI argument. |

---

## Recommendations

1. **Fix Issue #1 (timestamp accuracy)** -- This is user-facing. Historical session timestamps being wrong makes the session log confusing.

2. **Fix Issue #2 (spinner visibility)** -- Perpetually spinning indicators on completed sessions is misleading.

3. **Consider Issue #5 (aria-expanded consistency)** -- Minor but easy to fix for consistency.

4. **Consider Issue #3 (exit code semantics)** -- Pass `null` instead of `0` for streaming mode turn completions.

5. **Test with real Claude CLI** -- This QA was a code review. The multi-turn architecture is well-designed but the actual behavior of `--input-format stream-json` and `--resume` needs end-to-end validation with the Claude CLI. Marco's research notes known bugs (#3187 hanging on 2nd message, #5034 duplicate entries). Integration testing with real CLI is the critical next step.

---

## Summary

The Phase 1 frontend work is solid -- agent banners, message cards, event grouping, lifecycle events, and waiting indicators are all correctly implemented against the design spec. The event classification and grouping algorithm handles edge cases well (single-event groups, tool_result absorption, hidden events).

The Phase 2 backend is architecturally clean -- the base runner / streaming runner / resume runner separation is well-factored, the state machine is correct, timers are properly managed, and backward compatibility is preserved. The dual-mode approach with the factory function is pragmatic.

Two moderate issues need fixing before release (timestamps and spinner visibility). The remaining issues are minor or informational. After fixing the two moderate issues, this is ready to ship -- pending end-to-end testing with the actual Claude CLI.
