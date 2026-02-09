# CEO Response Input — Design Spec

**Author:** Robert (Product Designer)
**Date:** Feb 9, 2026
**Status:** Final
**Inputs:** Thomas's requirements (4 user stories), Andrei's tech approach (state machine, event handling), existing `css/styles.css` and `css/tokens.css` design system

---

## Design Principles for This Feature

1. **The input is part of the conversation, not bolted onto it.** The input bar should feel like a natural continuation of the session log timeline, not a floating chat widget grafted onto a read-only viewer. Same visual language, same spatial rhythm.
2. **States must be self-evident.** The CEO should never wonder "can I type here?" or "did that send?" Every state transition — idle, sending, error, session ended — should be immediately obvious without reading any instructions.
3. **CEO messages are first-class events.** When the CEO responds, that message becomes part of the permanent session transcript. It should have the same level of visual polish as agent messages, not look like a debug annotation.
4. **Minimal footprint.** One input, one button, one error line. No chrome, no avatars, no options menu. The CEO is the only person who can respond, so the UI does not need to identify who is typing. The session log is the star; the input bar is its supporting actor.

---

## 1. Input Bar

**Purpose:** Allow the CEO to type and send a response to the agent during a live session that is in `idle` state (i.e., waiting for input).

### Layout

```
+------------------------------------------------------------------+
| Session Log Header                                    00:12:34   |
|------------------------------------------------------------------|
|  +0:01  [assistant_text event]                                   |
|  +0:08  [tool_use event]                                         |
|  +0:11  [assistant_text event]                                   |
|  +0:12  Waiting for your input                                   |
|------------------------------------------------------------------|
|  [ Reply to the team...                            ] [ Send ]    |
|                                                                  |
+------------------------------------------------------------------+
```

- The input bar sits **below** the scrollable event area (`session-log__body`) but **inside** the `session-log` container
- It is a fixed element relative to the log — events scroll above it, the bar stays anchored at the bottom
- Horizontal flex layout: text input (flex-grow) + send button (fixed width)
- Separated from the event area by a `1px solid var(--color-border)` top border
- Background matches the card surface: `var(--color-bg-card)` (#ffffff)

### Component Structure

```html
<div class="session-log__input-bar" aria-hidden="true">
  <input
    class="session-log__input"
    type="text"
    placeholder="Reply to the team..."
    autocomplete="off"
    maxlength="10000"
    aria-label="Reply to the session"
  >
  <button class="session-log__send-btn" type="button" disabled>
    Send
  </button>
  <span class="session-log__input-error" role="alert" aria-hidden="true"></span>
</div>
```

- The bar is rendered in the DOM at page load but hidden via `aria-hidden="true"` / `display: none`
- Shown/hidden by toggling `aria-hidden` — no DOM insertion/removal, keeping show/hide idempotent across SSE reconnections

### Typography & Sizing

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Input text | `--font-family` (Geist) | `--text-sm` (14px) | `--font-weight-normal` (400) | `--color-text-primary` (#171717) |
| Placeholder | `--font-family` (Geist) | `--text-sm` (14px) | `--font-weight-normal` (400) | `--color-neutral-400` (#a3a3a3) |
| Send button label | `--font-family` (Geist) | `--text-sm` (14px) | `--font-weight-medium` (500) | `--color-white` (#ffffff) |
| Error text | `--font-family` (Geist) | `--text-xs` (12px) | `--font-weight-normal` (400) | `--color-status-error` (#dc2626) |

### Spacing

- Bar padding: `--space-3` (12px) vertical, `--space-4` (16px) horizontal
- Gap between input and button: `--space-2` (8px)
- Input internal padding: `--space-2` (8px) vertical, `--space-3` (12px) horizontal
- Send button padding: `--space-2` (8px) vertical, `--space-4` (16px) horizontal
- Error text: `--space-1` (4px) top padding, displayed as a block element below the input row

### Input Field Styling

The input follows the exact same pattern as `.detail__notes-input` (progress notes input):

- Background: `#ffffff`
- Border: `1px solid var(--color-border)` (#e5e5e5)
- Border radius: `var(--radius-md)` (4px)
- Focus state: `border-color: var(--color-accent)` (#006B3F) + `box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15)` — the standard green accent focus ring used throughout the app
- Disabled state: `opacity: 0.6; cursor: not-allowed`
- Transition: `border-color 0.15s ease`

**Design rationale:** Reusing the notes input pattern exactly means zero new visual language. The CEO has already seen and used this input style. Familiarity reduces cognitive load.

### Send Button Styling

The send button uses a filled accent style (same approach as `.detail__run-btn`):

- Background: `var(--color-accent)` (#006B3F) — Royal Jaguar Green
- Text: `var(--color-white)` (#ffffff)
- Border: none
- Border radius: `var(--radius-md)` (4px)
- Hover: `background: var(--color-accent-hover)` (#008C52)
- Disabled: `opacity: 0.5; cursor: not-allowed`
- Transition: `background-color 0.15s ease, opacity 0.15s ease`
- `white-space: nowrap` to prevent label wrapping at narrow widths

**Design rationale:** The send button is the primary action in this context. A filled green button signals "this is the thing you do next" — same visual weight as the "Run Session" button. It earns its prominence because the entire input bar only appears when action is needed.

### Error State

When a send fails (404 session ended, 409 session not idle, network error), an inline error message appears below the input bar:

```
+------------------------------------------------------------------+
|  [ my typed message stays here                     ] [ Send ]    |
|  Session is no longer active                                     |
+------------------------------------------------------------------+
```

- The error text is a `<span>` with `role="alert"` for screen reader announcement
- Hidden by default (`aria-hidden="true"`, `display: none`)
- Shown by setting `textContent` and toggling `aria-hidden="false"`
- Color: `var(--color-status-error)` (#dc2626) — the standard error red
- Size: `--text-xs` (12px) — subordinate to the input, does not dominate
- The user's typed text is preserved in the input for retry or copy
- Error clears automatically when: (a) the user sends successfully, or (b) the input bar is reshown after a new `waiting_for_input` event

**Design rationale:** Inline error (not toast) because the error is contextual to the input action. The existing `showToast()` system is for transient project-level messages — using it here would dislocate the feedback from the action. Keeping the error adjacent to the input lets the CEO immediately understand what went wrong and retry.

---

## 2. "Waiting for Input" Event

**Purpose:** Mark the moment the session pauses and the agent is waiting for the CEO's response. This is the cue that says "it is your turn."

### Layout

```
+------------------------------------------------------------------+
|  +5:42  Waiting for your input                                   |
+------------------------------------------------------------------+
```

- Full-width row within the session event stream
- Same flex layout as all session events: timestamp on the left, body on the right
- Subtle green accent background to draw attention without alarm

### Visual Treatment

- Background: `rgba(var(--color-green-accent-rgb), 0.04)` — a barely-there green wash. This matches the opacity level used for tool_use events, signaling "your attention is needed" in the same visual register as "the agent is using a tool." It is noticeable when scanning but does not compete with the content.
- No border-left accent line — unlike agent spawn banners (which use a colored left border to mark a structural break in the timeline), the waiting indicator is a momentary status event, not a section boundary. A left border would overstate its importance.
- Padding: `--space-2` (8px) vertical, `--space-4` (16px) horizontal — same as system events

### Typography

| Element | Font | Size | Weight | Color | Style |
|---------|------|------|--------|-------|-------|
| "Waiting for your input" | `--font-family` (Geist) | `--text-sm` (14px) | `--font-weight-medium` (500) | `--color-accent` (#006B3F) | italic |
| Timestamp | `--font-mono` (Geist Mono) | 11px | Normal | `--color-text-tertiary` (#999999) | normal |

**Design rationale for italic:** The italic style differentiates this from the existing `session-event--waiting` (TaskOutput "Waiting for Thomas...") which uses `--color-neutral-500` and italic. The waiting-for-input event uses accent green + italic, which says "this one is for you" versus the neutral gray of "the system is waiting for an agent." Same form factor, different semantic color.

**Design rationale for accent green text:** Green is the action color throughout TeamHQ. Using it here signals invitation — "it is your turn to act" — without using error red (which would feel alarming) or neutral gray (which would feel ignorable).

### Body Layout

The body is a simple flex row with center alignment:

```css
display: flex;
align-items: center;
gap: var(--space-2);
```

This matches the existing `.session-event--waiting .session-event__body` layout exactly. No icon — the text and color treatment are sufficient. Adding an icon would introduce a new visual element that nothing else in the event stream uses, breaking continuity.

### States

- **Live session, currently idle:** The event appears in the stream AND the input bar shows below. The event text ("Waiting for your input") and the input bar's presence create a redundant but reinforcing signal. The CEO sees the prompt in-context in the timeline and the affordance to act at the bottom.
- **Live session, no longer idle (turn resumed):** The event remains in the transcript as a historical marker. The input bar hides. The event is now just a log entry showing "the session paused here."
- **Historical session:** The event appears in the transcript as a past event. No input bar. No special styling change — the green text simply reads as "the session was waiting for input at this point." No spinner, no animation, no "active" treatment.

### Accessibility

- The event row is a non-interactive `<div>` — no focus target needed
- Color contrast: `--color-accent` (#006B3F) on white background = 7.2:1 contrast ratio, passes WCAG AA and AAA
- The semantic meaning is conveyed by text content ("Waiting for your input"), not color alone

---

## 3. "User Message" Event

**Purpose:** Render the CEO's sent message as a distinct event in the session transcript, making CEO responses visually distinguishable from agent output.

### Layout

```
+------------------------------------------------------------------+
|  +5:43  YOU                                                      |
|         Go ahead and ship it.                                    |
+------------------------------------------------------------------+
```

- Full-width row within the session event stream
- Same flex layout as all session events: timestamp on the left, body on the right
- Slightly stronger green accent background than the waiting indicator

### Visual Treatment

- Background: `rgba(var(--color-green-accent-rgb), 0.06)` — one step more visible than the waiting indicator (0.04). This creates a subtle visual pairing: the waiting indicator at 0.04 opacity says "your turn," and the user message at 0.06 opacity says "you responded." Scanning the transcript, these two adjacent events form a perceptible green cluster that marks the CEO interaction point.
- No right-alignment — while chat UIs typically right-align "your" messages, the session log is a timeline, not a chat. Right-aligning would break the uniform left-aligned flow that every other event type follows. Instead, the distinct background + "YOU" label provides sufficient differentiation without disrupting the timeline's spatial rhythm.
- Padding: `--space-2` (8px) vertical, `--space-4` (16px) horizontal

### Body Layout

The body uses a vertical stack:

```css
display: flex;
flex-direction: column;
gap: var(--space-1);
```

Two elements stacked:
1. **"YOU" label** — a small uppercase label that identifies the message source
2. **Message text** — the CEO's actual response

### Typography

| Element | Font | Size | Weight | Color | Other |
|---------|------|------|--------|-------|-------|
| "You" label | `--font-family` (Geist) | `--text-xs` (12px) | `--font-weight-semibold` (600) | `--color-accent` (#006B3F) | `text-transform: uppercase; letter-spacing: 0.04em` |
| Message text | `--font-mono` (Geist Mono) | `--text-sm` (14px) | `--font-weight-normal` (400) | `--color-text-primary` (#171717) | `line-height: var(--leading-relaxed)` |
| Timestamp | `--font-mono` (Geist Mono) | 11px | Normal | `--color-text-tertiary` (#999999) | normal |

**Design rationale for "You" label:** Agent messages in the session log do not have a sender label because the agent is implicitly the speaker in all `assistant_text` events. The CEO's messages need a label because they break that assumption. "You" is personal and immediate — it reads naturally in the transcript: "You said: Go ahead and ship it." The uppercase treatment and accent color match the `.session-event__lifecycle-text` pattern used for team lifecycle events, establishing it as a structural label rather than content.

**Design rationale for monospace message text:** All other content in the session event stream (assistant_text, tool_use input, tool_result output) uses `--font-mono`. CEO messages should match — they are part of the same technical conversation. Using the system font here would make CEO messages look like they belong to a different interface.

### Message Content

- Displays the value of `event.data.message`
- Text is HTML-escaped via `escapeHTML()` to prevent injection
- No markdown rendering — the CEO's input is a single-line plaintext field, so there is no markdown to parse. Rendering as a `<p>` with monospace font is sufficient.
- The backend truncates the event's stored message to 500 characters. For v1 this is acceptable (most CEO responses are short directives). No truncation indicator is needed because the single-line input naturally limits message length well below 500 characters.

### Accessibility

- The event row is a non-interactive `<div>` — no focus target needed
- Color contrast: `--color-accent` (#006B3F) on the 0.06-opacity green wash background has slightly reduced contrast versus pure white, but remains above 7:1 — passes WCAG AA and AAA
- `--color-text-primary` (#171717) on the green wash background passes WCAG AAA
- The "You" label provides a text-based identification of the message source, not relying on color alone

---

## 4. State Machine & Transitions

The input bar's visibility is driven entirely by SSE events. The CEO never needs to manually show/hide it. Here is how the four states map to the UI:

### State: Processing (agent is working)

- **Input bar:** Hidden (`aria-hidden="true"`, `display: none`)
- **Transcript:** Agent events stream in (assistant_text, tool_use, tool_result)
- **Trigger:** `turn_start` event received via SSE

No visual indicator that the session is "processing" beyond the existing streaming text and tool use events. The activity itself is the indicator.

### State: Idle (waiting for CEO input)

- **Input bar:** Visible, input enabled, send button enabled (disabled until text is entered), error cleared
- **Transcript:** "Waiting for your input" event appears in the stream
- **Trigger:** `waiting_for_input` event received via SSE, AND `sessionIsLive === true`
- **Focus:** Do NOT auto-focus the input. The CEO may be reading the transcript, and auto-focus would scroll them to the bottom and interrupt reading. The input is visible and discoverable; the CEO can click or tab into it when ready.

**Design rationale for no auto-focus:** Auto-focus is a common pattern for chat inputs, but the session log is a read-first interface. The CEO is likely scanning the agent's last output to understand the question before responding. Yanking focus to the input would prioritize typing over reading, which is the wrong default for this context.

### State: Sending (POST in flight)

- **Input bar:** Visible, input disabled (grayed out, `opacity: 0.6`), send button disabled (`opacity: 0.5`)
- **User's typed text:** Stays in the input field (not cleared yet — cleared only on success confirmation)
- **Duration:** Typically < 200ms (local API call). No loading spinner needed — the disabled state is sufficient feedback for a sub-second operation.

**Design rationale for no spinner:** Adding a spinner to the send button or input would be over-engineering feedback for a near-instant local API call. The disabled state communicates "I heard you, give me a moment." If the call takes > 1 second (unusual), the disabled state still holds. A spinner would introduce animation overhead and visual noise for a state that lasts a fraction of a second.

### State: Ended (session done)

- **Input bar:** Hidden (`aria-hidden="true"`, `display: none`)
- **Transcript:** The existing session-done handling shows the session end state
- **Trigger:** `session_done` event received via SSE, OR session was historical when loaded

No special "session ended" replacement for the input bar. The bar simply disappears. The session log already communicates completion via the timer stopping and the event stream ending. Adding an explicit "Session ended" message in the input bar's position would be redundant with the existing session status indicator.

### Transition: Session ends while input bar is visible

If the 30-minute idle timeout fires while the CEO has the input bar open:

1. `session_done` SSE event arrives
2. `handleSessionDone()` sets `sessionRunnerState = 'ended'`
3. `hideInputBar()` hides the bar immediately
4. If the CEO had typed but not sent, their text is lost from the UI (the bar is hidden). This is acceptable for v1 — the session is gone, so the text has nowhere to go. No toast or warning is shown.
5. If a race condition occurs where the CEO clicks Send between the SSE event arriving and the bar hiding (extremely narrow window), the POST returns 404, and the error handler fires — but the bar is already hidden, so the error is invisible. This is acceptable because the session is over regardless.

### Transition: SSE reconnects during idle

If the EventSource connection drops and reconnects:

1. Events replay from the last offset
2. The replayed `waiting_for_input` event re-triggers `showInputBar()`
3. Since `showInputBar()` operates on a single fixed DOM element (not appended elements), calling it twice is idempotent — no duplicate bars, no stale state
4. The input field is cleared and re-enabled on each `showInputBar()` call. If the CEO had typed something before the disconnect, it is lost. This is acceptable — SSE reconnection is rare and transient, and preserving stale input text across reconnections could be confusing.

---

## 5. Responsive Behavior

### Breakpoint: >= 640px (default, desktop/tablet)

Standard layout as described above. Input and send button side by side, comfortably sized.

### Breakpoint: < 640px (mobile)

The session log body already shrinks to `max-height: 360px` at this breakpoint. The input bar should:

- **Remain a horizontal flex row.** The input field shrinks naturally via `flex: 1`. The send button has `white-space: nowrap` and fixed padding, so it stays readable. At 320px viewport width, there is still ~200px for the input field, which is sufficient for the single-line use case.
- **No layout change needed.** The input bar's flex layout handles narrow widths gracefully. No stacking, no icon-only button, no special mobile treatment. Thomas explicitly scoped mobile-specific optimization (sticky keyboard handling, viewport resize) as out of scope for v1.

### Breakpoint: < 480px (small mobile)

The existing session log hides timestamps at this breakpoint (`.session-event__time { display: none }`). The input bar has no timestamp, so it is unaffected. The waiting-for-input and user-message events lose their timestamps at this width, which is fine — the text content is what matters.

The input bar error text at `--text-xs` (12px) remains legible at narrow widths. No truncation or wrapping issues — error messages are short sentences.

---

## 6. Accessibility

### Keyboard

- **Tab order:** The input field and send button are naturally focusable elements. They participate in the document's tab order when the input bar is visible. When hidden (`display: none`), they are removed from the tab order automatically.
- **Enter to send:** Pressing Enter while the input is focused triggers `handleSendMessage()`. This is the expected interaction pattern for a single-line input — same as the progress notes input.
- **No Shift+Enter:** Since this is a single-line `<input type="text">`, Shift+Enter is not applicable. No special handling needed.

### ARIA

- **Input bar container:** `aria-hidden="true"` when hidden, `"false"` when visible. This ensures screen readers do not announce the hidden bar.
- **Input field:** `aria-label="Reply to the session"` — provides a label since there is no visible `<label>` element. The placeholder text ("Reply to the team...") is not a reliable accessible name.
- **Error span:** `role="alert"` ensures the error message is announced by screen readers immediately when it appears. `aria-hidden="true"` when no error, `"false"` when error is shown.
- **Send button:** The button text "Send" is its accessible name. No additional ARIA needed. When disabled, the `disabled` attribute communicates the state to assistive technology.

### Focus Management

- **No auto-focus on idle:** As discussed in Section 4, the input is not auto-focused when the bar appears. The CEO can tab or click into it.
- **Focus on error:** When a send fails and the input is re-enabled, focus is not programmatically moved. The CEO's focus is already on the input (they just pressed Enter or clicked Send), so it naturally stays there. The `role="alert"` on the error span ensures the error is announced without a focus move.
- **Focus trap:** None. The input bar is part of the page flow, not a modal. Tab moves freely in and out of the bar.

### Color Contrast Summary

| Element | Foreground | Background | Ratio | WCAG |
|---------|-----------|------------|-------|------|
| Input text | #171717 | #ffffff | 18.4:1 | AAA |
| Placeholder | #a3a3a3 | #ffffff | 2.6:1 | Informational only (placeholder) |
| Send button label | #ffffff | #006B3F | 7.2:1 | AAA |
| Error text | #dc2626 | #ffffff | 4.6:1 | AA |
| "Waiting for your input" | #006B3F | ~#ffffff (0.04 green wash) | ~7.2:1 | AAA |
| "You" label | #006B3F | ~#ffffff (0.06 green wash) | ~7.1:1 | AAA |
| Message text | #171717 | ~#ffffff (0.06 green wash) | ~18:1 | AAA |

All interactive and content text passes WCAG AA. Placeholder text intentionally does not meet AA contrast — this is standard practice per WCAG guidance (placeholders are supplementary, not the accessible name).

---

## 7. CSS Specification

All new styles use existing design tokens. No new tokens are introduced.

### Input Bar

```css
/* Session Log -- CEO Input Bar */

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
  width: 100%;
  font-size: var(--text-xs);
  color: var(--color-status-error);
  padding-top: var(--space-1);
}

.session-log__input-error[aria-hidden="true"] {
  display: none;
}
```

**Note on `flex-wrap`:** The input bar does not use `flex-wrap`. At narrow widths, the input shrinks and the button retains its natural width. If the viewport is narrower than ~280px (which is below any realistic mobile width), the button text would overflow — but this is an extreme edge case not worth solving for v1.

### Waiting-for-Input Event

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

### User Message Event

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
  margin: 0;
}
```

### Responsive Additions

No new responsive CSS is needed. The existing mobile breakpoints handle the new elements correctly:

- At `< 480px`: `.session-event__time { display: none }` hides timestamps on both new event types (they inherit the base `.session-event` class)
- At `< 640px`: `.session-log__body { max-height: 360px }` compresses the scroll area; the input bar sits below it unaffected

If testing reveals the input bar feels cramped on small screens, a responsive tweak to reduce padding from `--space-4` to `--space-3` at `< 480px` can be added. But this should be validated empirically, not preemptively designed.

---

## 8. Visual Hierarchy in the Transcript

When the CEO interacts with a live session, the transcript will show a distinctive visual pattern at each interaction point. Here is how the elements read together:

```
  [neutral bg]    +5:38   Agent text asking a question...
  [neutral bg]    +5:39   Agent text continuing...
  [green 0.04]    +5:42   Waiting for your input              <-- attention cue
  [green 0.06]    +5:43   YOU                                  <-- CEO's response
                          Go ahead and ship it.
  [neutral bg]    +5:43   [agent resumes processing...]
```

The green wash at 0.04 and 0.06 opacity creates a subtle two-tone cluster that marks the CEO interaction point. When scanning a long transcript, these green bands are the visual anchors for "this is where the CEO weighed in." They contrast with:

- Agent `assistant_text` — no background (neutral)
- `tool_use` events — `rgba(var(--color-green-accent-rgb), 0.04)` background (same as waiting-for-input, which is fine — they are both "attention" events)
- `tool_result` events — no background
- System events — no background
- Error events — red-tinted background
- Agent spawn banners — indigo-tinted background
- Message events (agent-to-agent) — no background

The CEO interaction events are the only elements that pair a 0.04 + 0.06 green sequence, making them uniquely identifiable in the visual rhythm.

---

## 9. What This Design Does NOT Include

Per Thomas's scoping decisions, the following are explicitly out of v1:

1. **No notification when input is needed.** No browser notification, no tab badge, no sound. The CEO discovers the waiting state by viewing the session log.
2. **No idle timeout countdown.** No visible timer showing how long before the session times out. The session has a 30-minute idle timeout, which is generous.
3. **No multi-line input.** Single-line `<input type="text">` only. Most CEO responses are short directives.
4. **No quick-reply buttons.** No "Approve" / "Reject" shortcuts. The CEO types freeform text.
5. **No response suggestions.** No AI-generated reply options.
6. **No avatar or identity treatment on the input bar.** The CEO is the only user; there is no need to show who is typing.
7. **No special mobile keyboard handling.** No viewport resize detection, no sticky keyboard behavior. The standard browser input behavior is acceptable for v1.

---

## 10. Implementation Notes for Alice

- **All CSS uses existing tokens.** No new entries in `tokens.css`. Cross-check the token names against the file before implementing — the spec references the same token names verbatim.
- **The input bar pattern matches `detail__notes-input` exactly.** If unsure about any styling detail, reference that component in `css/styles.css` lines 1536-1556.
- **The send button pattern matches `detail__run-btn`.** Same accent green fill, same hover state, same disabled treatment. Reference lines 2736-2755 in `css/styles.css`.
- **BEM naming follows existing `session-log__*` convention.** The new classes (`session-log__input-bar`, `session-log__input`, `session-log__send-btn`, `session-log__input-error`) are siblings of `session-log__header`, `session-log__body`, `session-log__jump`.
- **Event class naming follows existing `session-event--*` convention.** The new variant classes (`session-event--input-needed`, `session-event--user-message`) are peers of `session-event--text`, `session-event--tool-use`, `session-event--system`, etc.
- **The `session-event--input-needed` class name avoids collision** with the existing `session-event--waiting` class (used for TaskOutput "Waiting for Thomas..." spinner). These are different features with different visual treatments. Do not merge them.
- **Error span has `width: 100%`** to ensure it takes a full line below the input and button, even within the flex container. Alternatively, the input bar could use `flex-wrap: wrap` with the error span on a new line — either approach works, pick whichever is simpler in practice.
