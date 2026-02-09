# CEO Response Input — Requirements

**Author**: Thomas (PM)
**Date**: Feb 9, 2026
**Status**: Draft

## Problem Statement

The TeamHQ web interface displays live and historical session transcripts via the session viewer. During a running session, agents sometimes ask the CEO for input — questions like "Want to green-light this?" or "The ball's in your court." These prompts appear as `assistant_text` events in the session log. However, the web UI is entirely read-only. The CEO sees the questions but has no way to respond from the browser. They must switch to the CLI terminal where the session process is running and type a response there.

This creates a confusing and frustrating UX gap: the web viewer shows questions directed at the CEO, but offers no affordance to answer them.

## One-Sentence Summary

Add a text input to the session viewer so the CEO can respond to agent questions directly from the web UI during a running session.

## Key Technical Discovery

The hard problem — "how does a response from the web UI reach the running CLI session?" — is **already solved.** The backend has all the infrastructure in place:

1. **`POST /api/projects/:id/sessions/:sessionId/message`** — a fully implemented endpoint that accepts a `{ message: string }` body, validates it, looks up the active runner, and calls `runner.sendMessage()`. Returns 202 with turn number and state.
2. **`BaseSessionRunner.sendMessage()`** — validates the session is in `idle` state, increments turn count, emits `user_message` and `turn_start` events, and calls `deliverMessage()` on the subclass.
3. **`StreamingRunner.deliverMessage()`** — writes an NDJSON message to the long-lived CLI process's stdin. The process stays alive between turns, so follow-up messages are delivered instantly.
4. **`ResumeRunner.deliverMessage()`** — spawns a new CLI process with `--resume <session_id>` and passes the message as stdin. Same effect, different mechanism.
5. **Session state machine** — the runner transitions between `processing` -> `idle` -> `processing` states. The `sendMessage()` method enforces that the session must be `idle` before accepting input. When a turn completes, a `waiting_for_input` event is emitted, and an idle timer starts (30 minutes).
6. **Event types** — `SessionEventType` already includes `waiting_for_input` and `user_message` types in the Zod schema. These events are emitted by the runner but completely ignored by the frontend.

**What's missing is purely frontend.** The web UI needs to:
- Detect `waiting_for_input` events and show an input field
- Send the CEO's response via the existing message API
- Render `user_message` events in the transcript
- Handle the state transitions (processing, idle, ended) visually

## Scope

### In Scope (v1)

1. **Message input bar** — a text input with a send button that appears at the bottom of the session log when the session is in `idle` state (i.e., a `waiting_for_input` event has been received and no new turn has started)
2. **Idle state detection** — track the session runner state from SSE events; show the input when `waiting_for_input` is received, hide it when `turn_start` is received or session ends
3. **Send message via API** — POST to `/api/projects/:id/sessions/:sessionId/message` with the CEO's text; handle success (202), validation errors (400), not-active errors (404), and state conflicts (409)
4. **User message rendering** — render `user_message` events in the session transcript with a distinct visual style (the CEO's messages should look different from agent messages)
5. **Waiting-for-input indicator** — render `waiting_for_input` events in the transcript as a visual indicator that the session is paused and awaiting CEO input
6. **Input state management** — disable the input while a message is being sent (optimistic UI), re-enable on error, clear on success; disable/hide when session ends
7. **Error handling** — show inline error if the message fails to send (e.g., session ended between typing and sending); allow retry

### Out of Scope (deferred)

- **Queued responses for ended sessions** — if the CLI session has ended, the response has nowhere to go. v1 will simply show "Session ended" and disable the input. Queuing messages for future sessions introduces significant complexity (session continuity, message ordering, stale context) with unclear value. Revisit if the CEO frequently encounters this.
- **Rich text or structured responses** — v1 is plain text only. No markdown, no file attachments, no structured choices (e.g., "approve/reject" buttons).
- **Response suggestions** — no AI-generated response suggestions or quick-reply buttons. The CEO types what they want.
- **Multi-line input / textarea** — v1 uses a single-line input. If the CEO needs to write long responses, we can add a textarea in v2.
- **Notification when input is needed** — no browser notifications, no sound, no visual badge on the nav. The CEO discovers the prompt by looking at the session viewer. Notifications are a good v2 candidate.
- **Mobile-specific layout** — the session viewer is already scrollable on mobile. The input bar should work at mobile widths via the existing responsive layout, but no special mobile optimization (e.g., sticky keyboard handling) is planned for v1.

## User Stories

### US1: Respond to an Agent Question During a Live Session

**As the CEO**, I want to type a response directly in the web session viewer when an agent asks me a question, so I don't have to switch to the CLI terminal.

**Acceptance Criteria:**
- [ ] When a running session enters `idle` state (a `waiting_for_input` event is received via SSE), a text input bar appears at the bottom of the session log
- [ ] The input has a placeholder like "Reply to the team..." and a send button
- [ ] Typing a message and pressing Enter or clicking Send posts the message to the API
- [ ] On success (202), the input clears and the session resumes processing (the turn_start event arrives via SSE, and the input hides until the next idle state)
- [ ] On error, an inline message appears below the input (e.g., "Session is no longer active" for 404, "Session is still processing" for 409)
- [ ] The send button is disabled while the request is in flight (prevents double-send)

### US2: See My Responses in the Session Transcript

**As the CEO**, I want to see my sent messages rendered in the session transcript, so I can follow the conversation flow.

**Acceptance Criteria:**
- [ ] `user_message` events are rendered in the session transcript with a distinct visual style (differentiated from agent text, tool use, and system events)
- [ ] The message text is displayed (the `data.message` field, which is truncated to 500 chars in the event)
- [ ] The timestamp is shown, consistent with other event timestamps
- [ ] User messages appear in correct chronological order within the event stream
- [ ] User messages are visible in both live sessions and historical session logs

### US3: See When the Session Is Waiting for Input

**As the CEO**, I want a clear visual indicator in the transcript when the session is paused and waiting for my input, so I know when it's my turn to respond.

**Acceptance Criteria:**
- [ ] `waiting_for_input` events are rendered in the transcript as a distinct visual element (e.g., a banner or highlighted row)
- [ ] The indicator clearly communicates "the session is waiting for your input" (not just a generic system message)
- [ ] The indicator is visible in both live sessions and historical session logs
- [ ] In historical (completed) sessions, the indicator is shown as a past event without the active input bar

### US4: Input Bar Disappears When Not Applicable

**As the CEO**, I want the input bar to only appear when it's actually possible to send a message, so I'm not confused by a non-functional input.

**Acceptance Criteria:**
- [ ] The input bar is NOT shown when the session is in `processing` state (agent is working)
- [ ] The input bar is NOT shown when the session has ended (`session_done` received)
- [ ] The input bar is NOT shown when viewing a historical (completed) session
- [ ] The input bar IS shown only when: session is live AND session is in idle/waiting state
- [ ] If the session ends while the input bar is visible (e.g., idle timeout), the input bar disappears and a "Session ended" indicator replaces it

## Frontend Changes

### Session Log — Input Bar

Add a message input bar at the bottom of the `.session-log` container, inside the `.session-log__body` but below the events list. The bar should:

- Be a horizontal layout: text input (flex-grow) + send button
- Use existing design token styling (same input styles as progress notes input)
- Only render/show when the session is live and in `idle` state
- Stick to the bottom of the session log viewport (the events scroll above it)

### Session Events — New Renderers

Add rendering functions for two event types currently ignored:

1. **`waiting_for_input`** — render as a distinct session event row. Suggested: a highlighted banner with an icon (e.g., a subtle chat/reply icon) and text like "Waiting for your input." Use a CSS class like `session-event--waiting` to allow targeted styling. Should feel like an invitation, not an error.

2. **`user_message`** — render as a distinct session event row. Suggested: right-aligned or differently colored to distinguish from agent messages (similar to a chat UI where "your messages" look different). Show the message text from `event.data.message` and the timestamp. Use a CSS class like `session-event--user-message`.

### Session State Tracking

The frontend currently tracks `sessionIsLive` but does not track the runner state (`processing`/`idle`/`ended`). Add a variable (e.g., `sessionRunnerState`) that updates based on SSE events:

- On `turn_start`: set to `processing`, hide input bar
- On `waiting_for_input`: set to `idle`, show input bar
- On `session_done`: set to `ended`, hide input bar
- On connect to historical session: set to `ended`, never show input bar

### API Integration

Add a function (e.g., `apiSendMessage(projectId, sessionId, message)`) that POSTs to the existing message endpoint. Wire it to the input bar's submit handler.

## API Changes

**None.** The backend is fully implemented. The endpoint, validation, runner integration, and event types are all in place. This is a frontend-only feature.

Existing endpoint for reference:
```
POST /api/projects/:id/sessions/:sessionId/message
Body: { message: string }
Returns: 202 { turnNumber, state: "processing" }
Errors: 400 (empty/too long), 404 (session not active), 409 (session not idle)
```

## Technical Constraints

- **No new npm dependencies** — vanilla JS frontend, no frameworks
- **No backend changes** — all infrastructure already exists
- **Same SSE pattern** — the `waiting_for_input` and `user_message` events already flow through the existing SSE connection; the frontend just needs to handle them
- **Same session lifecycle** — no changes to session state machine, timers, or finalization
- **Message size limit** — the backend enforces a 100,000 character max. The frontend input doesn't need to enforce this (single-line input naturally limits length), but should gracefully handle a 400 error if it occurs.

## Design Direction

The input bar should feel like a natural extension of the session log, not a bolted-on chat widget. Key principles:

1. **Contextual** — appears only when relevant (session is idle and waiting)
2. **Minimal** — one input, one button, no frills
3. **Consistent** — uses existing design tokens, same visual language as progress notes input and session log styling
4. **Clear state communication** — the transition from "processing" to "waiting for input" to "processing again" should feel smooth and obvious

The user message rendering should make it easy to scan the transcript and distinguish CEO messages from agent output. A subtle background color difference or left/right alignment shift would suffice.

## Risks

1. **Timing edge case** — the CEO types a message while the session is `idle`, but the session ends (idle timeout) between when they start typing and when they hit send. The API returns 404 or 409. Mitigation: show a clear error message and don't lose their typed text (they can copy it for the next session).
2. **Double-send** — the CEO hits Enter twice quickly, sending the same message twice. Mitigation: disable the input immediately on send, re-enable only after the API response (success or error).
3. **Long idle wait** — the session has a 30-minute idle timeout. If the CEO doesn't respond in time, the session ends. v1 accepts this behavior. Future enhancement: show a countdown or warning when idle timeout is approaching.
4. **Message truncation** — the `user_message` event stores only the first 500 characters of the message (see `sendMessage()` in base-runner.ts). The full message is sent to the CLI, but the event log and transcript only show a truncated version. This is acceptable for v1 (most responses will be short), but should be documented in the UI if we add multi-line input later.
5. **No notification** — the CEO has to be looking at the session viewer to know the session is waiting. If they navigate away or close the tab, they won't know. Acceptable for v1; notifications are a good v2 feature.
