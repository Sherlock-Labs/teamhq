# CEO Response Input — Tech Approach

**Author**: Andrei (Technical Architect)
**Date**: Feb 9, 2026
**Status**: Final

## Summary

This is a frontend-only feature. The backend already provides the full message delivery pipeline: API endpoint, runner state machine, stdin delivery, and SSE event types. The frontend needs to (1) track session runner state, (2) render two ignored event types, (3) add a message input bar, and (4) wire it to the existing API. No new dependencies, no backend changes, no architectural decisions.

## Architecture Overview

```
[Input Bar] --POST--> /api/projects/:id/sessions/:sid/message
                          |
                    Runner.sendMessage()
                          |
              emits: user_message, turn_start
                          |
                    SSE event stream
                          |
              [Frontend renders events, hides input]
```

The round-trip: CEO types in input bar, sends POST, backend delivers to CLI stdin, runner emits `user_message` and `turn_start` events, SSE pushes them to the frontend, frontend renders the message and hides the input bar until the next `waiting_for_input` event.

## Files Changed

### 1. `js/projects.js` — Session viewer logic

This is the only JS file that needs changes. All changes are within the existing IIFE scope.

#### A. New state variable: `sessionRunnerState`

Add alongside existing session state variables (line ~139, near `sessionIsLive`):

```js
var sessionRunnerState = 'unknown'; // 'processing' | 'idle' | 'ended' | 'unknown'
```

**Reset in `disconnectSession()`** (line ~872): set to `'unknown'`.

**Reset in `connectToSession()`** (line ~813): set to `isLive ? 'processing' : 'ended'`.

#### B. State transitions in `appendSessionEvent()`

Inside `appendSessionEvent()` (line ~922), add state tracking before the existing event classification logic. These must be handled for all events, not just rendered ones:

```js
// --- Runner state tracking ---
if (event.type === 'turn_start') {
  sessionRunnerState = 'processing';
  hideInputBar(projectId);
}
if (event.type === 'waiting_for_input') {
  sessionRunnerState = 'idle';
  if (sessionIsLive) showInputBar(projectId);
}
```

In `handleSessionDone()` (line ~1144), add:

```js
sessionRunnerState = 'ended';
hideInputBar(projectId);
```

#### C. New API function: `apiSendMessage()`

Add alongside existing session API functions (after `apiListSessions`, line ~268):

```js
function apiSendMessage(projectId, sessionId, message) {
  return fetch(
    API_BASE + '/' + encodeURIComponent(projectId) +
    '/sessions/' + encodeURIComponent(sessionId) + '/message',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message }),
    }
  ).then(function (res) {
    if (!res.ok) return res.json().then(function (err) { throw err; });
    return res.json();
  });
}
```

#### D. New event renderers

Add two new render functions alongside existing event renderers (after `renderWaitingIndicator`, line ~752):

**`renderWaitingForInputEvent(event, timeStr)`** — renders `waiting_for_input` events as a transcript indicator:

```js
function renderWaitingForInputEvent(event, timeStr) {
  return (
    '<div class="session-event session-event--input-needed" data-event-id="' + event.id + '">' +
      '<span class="session-event__time">' + timeStr + '</span>' +
      '<div class="session-event__body">' +
        '<span class="session-event__input-needed-text">Waiting for your input</span>' +
      '</div>' +
    '</div>'
  );
}
```

**`renderUserMessageEvent(event, timeStr)`** — renders `user_message` events as CEO messages:

```js
function renderUserMessageEvent(event, timeStr) {
  var msg = (event.data && event.data.message) || '';
  return (
    '<div class="session-event session-event--user-message" data-event-id="' + event.id + '">' +
      '<span class="session-event__time">' + timeStr + '</span>' +
      '<div class="session-event__body">' +
        '<span class="session-event__user-label">You</span>' +
        '<p class="session-event__user-text">' + escapeHTML(msg) + '</p>' +
      '</div>' +
    '</div>'
  );
}
```

#### E. Update `renderSessionEvent()` switch statement

In the `switch` block (line ~563), add two new cases before the `default`:

```js
case 'waiting_for_input':
  return renderWaitingForInputEvent(event, timeStr);
case 'user_message':
  return renderUserMessageEvent(event, timeStr);
```

These event types are currently falling through to the `default: return '';` branch, which is why they are silently dropped.

#### F. Input bar HTML in `renderSessionLog()`

Add the input bar markup inside the `session-log` div, **after** the `session-log__body` div and before the closing `</div>` (line ~502). The bar is hidden by default and shown/hidden via JS:

```js
'<div class="session-log__input-bar" aria-hidden="true">' +
  '<input class="session-log__input" type="text" placeholder="Reply to the team..." autocomplete="off" maxlength="10000">' +
  '<button class="session-log__send-btn" type="button" disabled>Send</button>' +
  '<span class="session-log__input-error" aria-hidden="true"></span>' +
'</div>'
```

The input bar sits below the scrollable event area but inside the `session-log` container, giving it a fixed position relative to the log.

#### G. Input bar show/hide/disable functions

Add three utility functions:

**`showInputBar(projectId)`** — shows the input bar when session transitions to idle:

```js
function showInputBar(projectId) {
  var logContainer = getLogContainer(projectId);
  if (!logContainer) return;
  var bar = logContainer.querySelector('.session-log__input-bar');
  if (bar) {
    bar.setAttribute('aria-hidden', 'false');
    var input = bar.querySelector('.session-log__input');
    var sendBtn = bar.querySelector('.session-log__send-btn');
    if (input) { input.disabled = false; input.value = ''; }
    if (sendBtn) sendBtn.disabled = false;
    clearInputError(projectId);
  }
}
```

**`hideInputBar(projectId)`** — hides the input bar on turn_start, session_done, or session end:

```js
function hideInputBar(projectId) {
  var logContainer = getLogContainer(projectId);
  if (!logContainer) return;
  var bar = logContainer.querySelector('.session-log__input-bar');
  if (bar) bar.setAttribute('aria-hidden', 'true');
}
```

**`clearInputError(projectId)`** — clears the inline error text:

```js
function clearInputError(projectId) {
  var logContainer = getLogContainer(projectId);
  if (!logContainer) return;
  var errorEl = logContainer.querySelector('.session-log__input-error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.setAttribute('aria-hidden', 'true');
  }
}
```

#### H. Send message handler

Add `handleSendMessage(projectId)`:

```js
function handleSendMessage(projectId) {
  var logContainer = getLogContainer(projectId);
  if (!logContainer) return;

  var input = logContainer.querySelector('.session-log__input');
  var sendBtn = logContainer.querySelector('.session-log__send-btn');
  var errorEl = logContainer.querySelector('.session-log__input-error');
  if (!input || !sendBtn) return;

  var message = input.value.trim();
  if (!message) return;

  // Disable input and button immediately (prevents double-send)
  input.disabled = true;
  sendBtn.disabled = true;
  clearInputError(projectId);

  apiSendMessage(activeSessionProjectId, viewingSessionId, message)
    .then(function () {
      // Success: clear input. The SSE events (user_message, turn_start)
      // will hide the input bar and render the message.
      input.value = '';
    })
    .catch(function (err) {
      // Re-enable input so the user can retry
      input.disabled = false;
      sendBtn.disabled = false;

      var msg = 'Failed to send message';
      if (err && err.error) {
        msg = err.error;
      }
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.setAttribute('aria-hidden', 'false');
      }
      // Do NOT clear the input — preserve the user's text for retry
    });
}
```

#### I. Wire event listeners

In the existing `listContainer.addEventListener('click', ...)` handler (line ~2285), add a clause for the send button:

```js
var sendBtn = e.target.closest('.session-log__send-btn');
if (sendBtn) {
  var card = sendBtn.closest('.project-card');
  var id = card.getAttribute('data-project-id');
  handleSendMessage(id);
  return;
}
```

In the existing `listContainer.addEventListener('keydown', ...)` handler (line ~2509), add Enter key handling for the input:

```js
if (e.key === 'Enter' && e.target.classList.contains('session-log__input')) {
  e.preventDefault();
  var card = e.target.closest('.project-card');
  var id = card.getAttribute('data-project-id');
  handleSendMessage(id);
}
```

Also add an `input` event listener for enabling/disabling the send button based on input content. Add this inside the IIFE, near the other event listeners:

```js
listContainer.addEventListener('input', function (e) {
  if (e.target.classList.contains('session-log__input')) {
    var card = e.target.closest('.project-card');
    if (!card) return;
    var sendBtn = card.querySelector('.session-log__send-btn');
    if (sendBtn) {
      sendBtn.disabled = !e.target.value.trim();
    }
  }
});
```

### 2. `css/styles.css` — New styles

Add after the existing session event styles (after `.session-event__waiting-spinner` styles, around line 2630).

#### Input bar styles

```css
/* Session Log — CEO Input Bar */

.session-log__input-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.session-log__input-bar[aria-hidden="true"] {
  display: none;
}

.session-log__input {
  flex: 1;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  transition: border-color 0.15s ease;
}

.session-log__input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15);
}

.session-log__input::placeholder {
  color: var(--color-neutral-400);
}

.session-log__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.session-log__send-btn {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-white);
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
}

.session-log__send-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.session-log__send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.session-log__input-error {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-status-error);
  padding-top: var(--space-1);
}

.session-log__input-error[aria-hidden="true"] {
  display: none;
}
```

Note: The input bar uses the same token-based styling pattern as the existing `.detail__notes-input` and `.detail__notes-add-btn` (lines 1530-1569 in styles.css). Same border, radius, padding, focus ring, and placeholder color.

#### Waiting-for-input event styles

```css
/* Event: waiting_for_input */

.session-event--input-needed {
  padding: var(--space-2) var(--space-4);
  background: rgba(var(--color-green-accent-rgb), 0.04);
}

.session-event--input-needed .session-event__body {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.session-event__input-needed-text {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent);
  font-style: italic;
}
```

Uses the same green accent background as tool_use events, signaling "your attention is needed" without looking like an error. The font styling (italic, accent color) differentiates it from the existing `session-event--waiting` style (which uses neutral-500 for "Waiting for agent..." messages during TaskOutput).

#### User message event styles

```css
/* Event: user_message */

.session-event--user-message {
  padding: var(--space-2) var(--space-4);
  background: rgba(var(--color-green-accent-rgb), 0.06);
}

.session-event--user-message .session-event__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.session-event__user-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.session-event__user-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-primary);
}
```

CEO messages get a slightly stronger green accent background than the waiting indicator, plus a "You" label in the accent color. This distinguishes them from agent assistant_text (which has no background) and tool_use events (which have the tool icon + name pattern).

## SSE Event Handling — Current vs New

| Event Type | Currently Handled | Action Needed |
|---|---|---|
| `assistant_text` | Yes (rendered with streaming) | No change |
| `tool_use` | Yes (rendered, grouped) | No change |
| `tool_result` | Yes (rendered, collapsible) | No change |
| `system` | Yes (rendered as system message) | No change |
| `error` | Yes (rendered as error) | No change |
| `turn_start` | **No** (falls through to `default: ''`) | Add state tracking: set `sessionRunnerState = 'processing'`, hide input bar. No visual rendering needed (turn starts are implicit from agent activity). |
| `turn_end` | **No** (falls through to `default: ''`) | No action needed. The `waiting_for_input` event that follows handles the idle transition. |
| `waiting_for_input` | **No** (falls through to `default: ''`) | Add state tracking: set `sessionRunnerState = 'idle'`, show input bar. Render as a transcript event with the new `renderWaitingForInputEvent()`. |
| `user_message` | **No** (falls through to `default: ''`) | Render as a transcript event with the new `renderUserMessageEvent()`. |

Note: `turn_start` and `turn_end` events were already emitted by the backend but ignored. `turn_start` now serves as the signal to hide the input bar and set state to processing. `turn_end` remains unrendered — the interesting transitions are `waiting_for_input` (idle) and `turn_start` (processing).

## Session Runner State Machine

```
                    connectToSession(isLive=true)
                              |
                              v
  +------------------+   turn_start   +------------------+
  |                  | <------------- |                  |
  |    processing    |                |    idle          |
  |                  | ------------> |                  |
  +------------------+ waiting_for_  +------------------+
          |               input              |
          |                                  |
          |   session_done                   |   session_done
          |   (or idle timeout)              |   (or idle timeout)
          v                                  v
  +------------------+
  |     ended        |
  +------------------+

Input bar visible: ONLY in `idle` state AND `sessionIsLive === true`
Input bar hidden:  in `processing`, `ended`, or historical sessions
```

State transitions are driven purely by SSE events. The frontend never sets state optimistically based on the POST response — it waits for the SSE `turn_start` event to confirm the transition. This avoids race conditions where the POST succeeds but the SSE hasn't delivered the event yet.

## Input Bar Lifecycle

1. **Session connects (live):** `sessionRunnerState = 'processing'`. Input bar hidden.
2. **`waiting_for_input` received:** `sessionRunnerState = 'idle'`. Input bar shown with empty input and enabled send button.
3. **CEO types message:** Send button enables when input is non-empty.
4. **CEO presses Enter / clicks Send:** Input and button disabled immediately. POST fires.
5. **POST succeeds (202):** Input cleared. Input bar stays visible but disabled. Waiting for SSE events.
6. **`user_message` SSE arrives:** Rendered in transcript as CEO message.
7. **`turn_start` SSE arrives:** `sessionRunnerState = 'processing'`. Input bar hidden.
8. **Agent works... turn completes... `waiting_for_input` arrives:** Back to step 2.
9. **POST fails:** Input and button re-enabled. Error shown inline. User's text preserved.
10. **`session_done` arrives at any point:** `sessionRunnerState = 'ended'`. Input bar hidden permanently.

## Edge Cases

### 1. Session ends while typing

The CEO is typing a response but the session times out (30-minute idle timeout). The `session_done` SSE event arrives and `handleSessionDone()` fires, which sets `sessionRunnerState = 'ended'` and hides the input bar. If the CEO then somehow submits (e.g., there is a small race window), the POST returns 404 ("Session not found or not active"), and the error handler shows the error inline. The CEO's text is preserved in the now-disabled input, but since the bar is hidden this is a no-op.

**Mitigation:** The `hideInputBar()` function runs synchronously on `session_done`, preventing any further interaction. No additional handling needed.

### 2. Double-send / rapid Enter presses

The CEO presses Enter twice quickly. The first press disables the input and button immediately (synchronous DOM operation, before the async fetch). The second Enter keydown fires, but `sendBtn.disabled` is already true and `input.disabled` is true, so `handleSendMessage()` returns early because the input value is empty or the input is disabled.

**Mitigation:** Immediate synchronous disable before the async POST. Already handled by design.

### 3. SSE reconnection during idle

The EventSource connection drops and reconnects (auto-reconnect is built into EventSource). On reconnect, the backend replays all events from the `offset` (last event ID). The replayed events will include the `waiting_for_input` event that put the session into idle. The `appendSessionEvent()` state tracking will process this event and show the input bar again.

**Mitigation:** Reconnection handling is already built into the SSE infrastructure. The state tracking in `appendSessionEvent()` is idempotent — processing the same `waiting_for_input` event twice just sets `sessionRunnerState = 'idle'` again and shows the input bar (which is already shown). No duplicated DOM elements because `showInputBar()` operates on a single fixed DOM element, not appended elements.

### 4. Historical session replay

When viewing a completed session, `connectToSession()` is called with `isLive = false`, which sets `sessionRunnerState = 'ended'`. The replayed events include `waiting_for_input` and `user_message` events from the historical session. These are **rendered in the transcript** (the renderer functions run), but the state tracking check `if (sessionIsLive)` prevents the input bar from showing. The transcript shows the full conversation history including CEO messages and waiting indicators, but with no active input bar.

### 5. Message too long (>100,000 chars)

The HTML `maxlength="10000"` attribute on the input provides a soft client-side limit. If somehow a message exceeding 100,000 characters reaches the backend, the API returns 400 with `"Message too long"`. The error handler shows this inline. In practice, a single-line `<input type="text">` with `maxlength="10000"` makes this nearly impossible.

### 6. Empty message

The send button is disabled when the input is empty (via the `input` event listener). If `handleSendMessage()` is called with an empty/whitespace-only string (defensive check), it returns early without firing the POST. The backend also validates `!message.trim()` and returns 400.

## Naming Decisions

- **CSS class: `session-event--input-needed`** (not `session-event--waiting-for-input`). The existing `session-event--waiting` class is already used for the TaskOutput "Waiting for agent..." indicator. Using `--input-needed` avoids confusion and CSS specificity conflicts.
- **CSS class: `session-event--user-message`** matches the backend event type name exactly, for direct mapping.
- **CSS class: `session-log__input-bar`** follows the BEM convention used throughout the session log component (`session-log__header`, `session-log__body`, `session-log__jump`).
- **State variable: `sessionRunnerState`** distinguishes from `sessionIsLive` (which tracks whether the SSE connection is to a running vs historical session) and from the backend `RunnerState` type (which tracks `processing`/`idle`/`ended`). The values match the backend enum for clarity.

## Implementation Notes

1. **No new npm dependencies.** Everything uses the existing vanilla JS patterns.
2. **No backend changes.** The existing `POST /:sessionId/message` endpoint, `BaseSessionRunner.sendMessage()`, `StreamingRunner.deliverMessage()`, and `ResumeRunner.deliverMessage()` are all fully implemented and tested.
3. **No new HTML file changes.** The input bar is dynamically generated by `renderSessionLog()` in `js/projects.js`, same as all other session log elements.
4. **The `turn_start` event should NOT be rendered as a visible transcript event.** It is only used for state tracking. Adding it to the transcript would create noise — the user can see the agent is working from the streaming text and tool_use events.
5. **The existing `session-event--waiting` class (TaskOutput waiting spinner)** is a completely different feature from the new `session-event--input-needed` class. The former shows "Waiting for Thomas..." with a spinner when the orchestrator is polling for agent output. The latter shows "Waiting for your input" when the session is idle. They should not be merged or confused.
6. **Error message placement.** The `session-log__input-error` span is positioned below the input bar as a block element. It is hidden by default and shown only on API error. It is cleared on the next successful send or when the input bar is reshown.
