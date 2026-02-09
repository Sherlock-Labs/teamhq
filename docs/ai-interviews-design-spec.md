# AI-Powered Audio Interviews -- Design Spec

**Author:** Robert (Product Designer)
**Date:** February 9, 2026
**Status:** Ready for implementation
**Project ID:** `ai-interviews`
**Dependencies:** `docs/ai-interviews-requirements.md` (Thomas), `docs/ai-interviews-tech-approach.md` (Andrei), `docs/ai-interviews-market-research.md` (Suki), `docs/ai-interviews-gemini-evaluation.md` (Marco)

---

## Overview

Design the UI for AI-powered audio interviews embedded in the TeamHQ meetings section. The CEO clicks a button, speaks with a Gemini-powered AI interviewer through their browser microphone, and the completed interview appears in the meetings list as a fully structured meeting record with transcript, summary, decisions, and action items.

This is an **audio-only** experience. No video, no avatar, no visual representation of the AI. The interface communicates the AI's presence through audio visualization, status text, and timing indicators. The design must feel like a natural extension of the existing meetings section -- not a bolted-on feature.

---

## Design Principles

1. **Audio is the interface.** The voice conversation is the primary interaction. The visual UI exists to support it -- start/stop controls, status feedback, error recovery -- not to compete with it. Keep the visual footprint calm and minimal so the CEO can focus on the conversation.
2. **Same section, new capability.** Interviews live in the meetings section alongside charter, weekly, and custom meetings. They use the same card layout, detail view, and toolbar location. A returning user should recognize every pattern.
3. **Transparent status at every moment.** The user must always know: Am I connected? Is the AI listening? How long has this been going? Is something wrong? Audio is invisible -- the UI must make the invisible visible.
4. **Errors are recoverable.** Mic permission denied, WebSocket dropped, backend unreachable -- every failure state has a clear message and an obvious next step. No dead ends.
5. **One action to start, one action to stop.** Configuration should be minimal. Fill in a topic, click start. When done, click end. Everything else happens automatically.

---

## 1. Interview Button in the Toolbar

### Placement

A new "Interview" button appears in `.meetings__buttons`, after the existing "New Meeting" button.

```
[ Run Charter ]  [ Run Weekly ]  [ New Meeting ]  [ Interview ]
```

### Styling

The button uses the same `.meetings__run-btn` base class with a new `--interview` modifier. Color: **amber** (`--color-amber-400` / `#fbbf24` background area, dark amber text for the badge). Amber is unused by other meeting types (charter = green, weekly = violet, custom = indigo) and signals a different kind of interaction -- live audio rather than a simulated text meeting.

```css
.meetings__run-btn--interview {
  background: #d97706;  /* amber-600 -- dark enough for white text contrast */
}

.meetings__run-btn--interview:hover:not(:disabled) {
  background: #b45309;  /* amber-700 */
}
```

The amber-600 value (`#d97706`) is used for the button background rather than amber-400 because amber-400 is too light for white text (fails WCAG AA). Amber-600 provides 4.5:1 contrast ratio against white.

### Icon (Optional)

A small microphone icon (inline SVG, 14x14) can precede the label text to reinforce that this is an audio feature. The icon is decorative (`aria-hidden="true"`). If the icon adds visual clutter at small sizes, omit it and rely on the amber color and "Interview" label alone.

### States

| State | Appearance |
|-------|------------|
| **Default** | Amber background, white text, cursor pointer |
| **Hover** | Darker amber background |
| **Disabled** (meeting running) | `opacity: 0.4`, `cursor: not-allowed` |
| **Active** (interview in progress) | Disabled state. The "End Interview" button in the active panel is the primary action. |

### Disabled Logic

The Interview button is disabled when:
- Any meeting is currently running (charter, weekly, custom, or interview)
- The interview configuration panel is already open for another type

This uses the same guard mechanism as existing meeting buttons.

---

## 2. Interview Configuration Panel

### Layout

The configuration panel appears below the toolbar and above the meetings list, using the same collapsible panel pattern as the custom meeting creation form. It slides open using `grid-template-rows: 0fr -> 1fr` animation.

```
+--------------------------------------------------------------------+
|  meetings__toolbar                                                  |
|  [ Run Charter ] [ Run Weekly ] [ New Meeting ] [ Interview ]       |
+--------------------------------------------------------------------+
|  interview-config (slides open)                                     |
|  +----------------------------------------------------------------+|
|  |  Topic *                                                       ||
|  |  +------------------------------------------------------------+||
|  |  | e.g. Q1 strategy review                                    |||
|  |  +------------------------------------------------------------+||
|  |                                                                 ||
|  |  Additional context (optional)                                  ||
|  |  +------------------------------------------------------------+||
|  |  | Focus on mobile launch timeline and hiring plan...          |||
|  |  |                                                             |||
|  |  +------------------------------------------------------------+||
|  |                                                                 ||
|  |                                     [ Start Interview ]         ||
|  +----------------------------------------------------------------+|
+--------------------------------------------------------------------+
|  meetings-list                                                      |
+--------------------------------------------------------------------+
```

### Container

```css
.interview-config {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.interview-config[aria-hidden="false"] {
  grid-template-rows: 1fr;
}

.interview-config__inner {
  overflow: hidden;
}

.interview-config__content {
  padding: var(--space-5);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
}
```

### Topic Field

- **Element:** `<input type="text">` with `id="interview-topic"`
- **Label:** "Topic" with a required indicator (`*`)
- **Placeholder:** `"e.g. Q1 strategy review, Product roadmap priorities"`
- **Validation:** Non-empty, trimmed. If empty on submit, show inline error text below the field in `var(--color-status-error)`.
- **Styling:** Same `.modal__input` pattern used elsewhere -- `font-size: var(--text-sm)`, `padding: var(--space-3)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-sm)`. Focus ring: `outline: 2px solid var(--color-accent)`.

### Context Field

- **Element:** `<textarea>` with `id="interview-context"`, `rows="3"`
- **Label:** "Additional context" with "(optional)" in `var(--color-text-tertiary)`
- **Placeholder:** `"Any specific questions, background, or areas to focus on..."`
- **Styling:** Same as the custom meeting instructions textarea -- `.meetings__create-form-textarea` pattern.

### Start Button

- **Element:** `<button type="button" id="interview-start-btn">`
- **Label:** "Start Interview"
- **Styling:** Same `.meetings__run-btn--interview` amber styling (dark amber-600 background, white text)
- **Position:** Right-aligned within the panel actions area
- **Disabled:** When topic field is empty

### Cancel Behavior

When the Interview button in the toolbar is clicked while the config panel is open, the panel collapses and the button returns to its default label. No explicit "Cancel" button needed -- the toolbar button toggles the panel, matching the custom meeting creation pattern.

---

## 3. Pre-Interview: Connecting State

When the user clicks "Start Interview," the system must:
1. Validate the topic field
2. Request microphone permission
3. Call `POST /api/interviews/start` to create the meeting record and get an ephemeral token
4. Open the WebSocket to Gemini
5. Wait for `SetupComplete`

### UI During Connection

The configuration panel content is replaced by a connecting state:

```
+----------------------------------------------------------------+
|                                                                  |
|         [mic icon]                                               |
|                                                                  |
|         Connecting...                                            |
|         Setting up your interview on "Q1 Strategy Review"       |
|                                                                  |
|         [ Cancel ]                                               |
|                                                                  |
+----------------------------------------------------------------+
```

### Mic Permission Prompt

If `getUserMedia` triggers the browser's permission dialog, the connecting text updates to:

```
Waiting for microphone access...
```

If permission is denied, transition immediately to the mic error state (see section 6).

### Visual Indicators

- A small spinner or pulsing dot next to "Connecting..." to indicate activity
- Use the same `indicator-pulse` animation that the running meeting dot uses, but in amber

```css
.interview-connecting__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d97706;
  animation: indicator-pulse 2s ease-in-out infinite;
}
```

### Cancel

A "Cancel" button (secondary style -- text button, no fill) lets the user abort during connection. Clicking it closes the WebSocket if open, releases the mic, and returns to the configuration panel with the topic and context fields preserved.

### Timing

If connection takes longer than 8 seconds, update the text to:

```
Still connecting... This may take a moment.
```

If connection fails entirely after 15 seconds, transition to the connection error state (see section 6).

---

## 4. Active Interview UI

Once `SetupComplete` is received and audio is streaming, the configuration panel is replaced by the active interview panel.

### Layout

```
+--------------------------------------------------------------------+
|  meetings__toolbar                                                  |
|  [ Run Charter ] [ Run Weekly ] [ New Meeting ] [ Interview ]       |
|     (all disabled)                                                  |
+--------------------------------------------------------------------+
|  interview-active                                                   |
|  +----------------------------------------------------------------+|
|  |                                                                 ||
|  |  [recording dot]  Interview in progress                        ||
|  |  Topic: Q1 Strategy Review                          12:34      ||
|  |                                                                 ||
|  |  +------------------------------------------------------------+||
|  |  |                                                             |||
|  |  |          [   audio waveform visualization   ]               |||
|  |  |                                                             |||
|  |  +------------------------------------------------------------+||
|  |                                                                 ||
|  |                        [ End Interview ]                        ||
|  |                                                                 ||
|  +----------------------------------------------------------------+|
+--------------------------------------------------------------------+
```

### Header Row

Left side:
- **Recording indicator:** A pulsing amber dot (same 8px circle, `indicator-pulse` animation) followed by "Interview in progress" in `var(--color-text-primary)`, `font-weight: var(--font-weight-semibold)`, `font-size: var(--text-sm)`.
- **Topic:** Below the status text. "Topic: Q1 Strategy Review" in `var(--color-text-secondary)`, `font-size: var(--text-sm)`.

Right side:
- **Elapsed timer:** `MM:SS` format, `font-family: var(--font-mono)`, `font-size: var(--text-lg)`, `color: var(--color-text-primary)`. Updates every second. Starts at `00:00`.
- At **15 minutes**, the timer text color changes to `var(--color-status-warning)` (`#ca8a04`) with a subtle transition to signal the soft limit.
- At **55 minutes**, the timer text turns `var(--color-status-error)` to signal approaching hard limit.

```css
.interview-active__timer {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  transition: color 0.5s ease;
}

.interview-active__timer--warning {
  color: var(--color-status-warning);
}

.interview-active__timer--danger {
  color: var(--color-status-error);
}
```

### Audio Visualization

A horizontal bar visualization that reacts to audio input/output levels. This is the centerpiece of the active interview state -- it makes the invisible audio conversation visible.

**Design:**
- A row of vertical bars (16-24 bars) centered horizontally in the panel
- Each bar is `4px` wide with `2px` gap, `border-radius: 2px`
- Bar height oscillates based on audio amplitude, constrained between `4px` (silence) and `32px` (peak)
- Color: `#d97706` (amber-600) for user mic input, `var(--color-accent)` (green) for AI audio output
- Default/idle state: all bars at minimum height (4px), subtle idle animation

**Implementation approach:**
- Use an `AnalyserNode` from the Web Audio API connected to both mic input and playback output
- Read `getByteFrequencyData()` at ~30fps via `requestAnimationFrame`
- Map frequency bins to bar heights with smoothing (exponential moving average)

```css
.interview-visualizer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 48px;
  padding: var(--space-4) 0;
}

.interview-visualizer__bar {
  width: 4px;
  min-height: 4px;
  max-height: 32px;
  border-radius: 2px;
  background: #d97706;
  transition: height 0.05s ease;
}

.interview-visualizer--ai-speaking .interview-visualizer__bar {
  background: var(--color-accent);
}
```

**Idle animation (when neither party is speaking):**
A gentle wave animation across all bars -- a subtle sine wave that sweeps left to right, each bar offset slightly in phase. This keeps the visualization alive during pauses without implying speech.

```css
@keyframes idle-wave {
  0%, 100% { height: 4px; }
  50% { height: 10px; }
}

.interview-visualizer--idle .interview-visualizer__bar {
  animation: idle-wave 2s ease-in-out infinite;
}

/* Stagger each bar */
.interview-visualizer--idle .interview-visualizer__bar:nth-child(1) { animation-delay: 0s; }
.interview-visualizer--idle .interview-visualizer__bar:nth-child(2) { animation-delay: 0.1s; }
/* ... etc, up to bar count */
```

**`prefers-reduced-motion`:** Under reduced motion, the idle wave is disabled. Bars remain at 4px static height. Active audio bars still respond to amplitude (this is functional feedback, not decorative animation).

### End Interview Button

- **Element:** `<button type="button" id="interview-end-btn">`
- **Label:** "End Interview"
- **Styling:** Outlined/secondary style to prevent accidental taps. `border: 1.5px solid var(--color-border-strong)`, `background: transparent`, `color: var(--color-text-primary)`, `font-weight: var(--font-weight-semibold)`, `border-radius: var(--radius-sm)`, `padding: var(--space-2) var(--space-5)`.
- **Hover:** `border-color: var(--color-status-error)`, `color: var(--color-status-error)`.
- **Position:** Centered below the visualizer.

Why outlined and not filled red: The end action should be intentional, not impulsive. A subtle secondary button prevents accidental clicks during an active conversation. The hover state signals destructive intent without making the button itself look alarming at rest.

### Mute/Unmute (Stretch)

A small icon-only button (microphone icon) in the header row, to the left of the timer, allows the user to mute their mic during the interview. When muted:
- The mic icon gets a slash through it
- The visualizer bars go to idle state
- A small "Muted" label appears

This is a nice-to-have for v1. If it adds complexity, defer it. The core flow works without it (the user can simply stop talking).

---

## 5. Post-Interview: Processing State

When the user clicks "End Interview" or the AI wraps up:

1. WebSocket closes gracefully
2. Mic stream is released
3. Assembled transcript is sent to `POST /api/interviews/:id/complete`
4. Claude post-processing runs

### UI During Processing

The active interview panel transitions to a processing state:

```
+----------------------------------------------------------------+
|                                                                  |
|    [check icon]  Interview complete                              |
|    Duration: 14:23                                               |
|                                                                  |
|    Processing transcript...                                      |
|    [progress indicator]                                          |
|                                                                  |
+----------------------------------------------------------------+
```

- **"Interview complete"** in `var(--color-text-primary)`, `font-weight: var(--font-weight-semibold)`
- **Duration** in mono, showing the final elapsed time
- **"Processing transcript..."** in `var(--color-text-secondary)`, with a small animated spinner or pulsing dots

### Completion

When the backend responds with `status: "completed"`:
1. The processing panel collapses with the same `grid-template-rows` animation
2. The meetings list refreshes (dispatch `CustomEvent('interview-complete')`)
3. The newly created interview card appears at the top of the list
4. A success toast appears: "Interview saved" in the standard toast style (green accent, auto-dismiss after 4 seconds)
5. All meeting buttons re-enable
6. The new interview card auto-expands to show the full detail view

### Failure During Processing

If `POST /api/interviews/:id/complete` fails after retries:
- Processing text changes to: "Interview saved, but summary generation failed. The full transcript has been preserved."
- The panel collapses after 3 seconds
- The meeting card appears with transcript but without summary/takeaways (the card still works, just shows "No summary available" in the summary text area)

---

## 6. Error States

Every error state follows the same pattern: clear description of what went wrong, specific guidance on how to fix it, and an action button.

### Container

```css
.interview-error {
  padding: var(--space-5);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
}

.interview-error__icon {
  width: 32px;
  height: 32px;
  margin: 0 auto var(--space-3);
  color: var(--color-status-error);
}

.interview-error__title {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.interview-error__message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.interview-error__action {
  /* Same as .meetings__run-btn--interview but outlined */
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2) var(--space-5);
  border: 1.5px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
}
```

### Error: Microphone Permission Denied

**Title:** "Microphone access required"
**Message:** "Interviews need microphone access to work. Please allow microphone access in your browser settings and try again."
**Action:** "Try Again" button (re-triggers `getUserMedia`)

If permission is denied a second time, the message updates to include browser-specific instructions:
- Chrome: "Click the lock icon in the address bar, then set Microphone to Allow."
- Safari: "Go to Safari > Settings > Websites > Microphone and allow this site."
- Firefox: "Click the lock icon in the address bar and clear the blocked permission."

Detection: Check `navigator.userAgent` for browser identification (imperfect but sufficient for help text).

### Error: No Microphone Found

**Title:** "No microphone detected"
**Message:** "Please connect a microphone and try again."
**Action:** "Try Again"

### Error: Microphone In Use

**Title:** "Microphone unavailable"
**Message:** "Your microphone is being used by another application. Close other apps using the mic and try again."
**Action:** "Try Again"

### Error: Connection Failed

**Title:** "Unable to connect"
**Message:** "Could not reach the interview service. Check your internet connection and try again."
**Action:** "Retry"

### Error: Connection Lost (Mid-Interview)

This is a special case. If all 3 reconnection attempts fail during an active interview:

**The active interview panel updates in-place** (does not switch to the error panel pattern). The visualizer is replaced by:

```
+----------------------------------------------------------------+
|  [warning icon]  Connection lost                                 |
|                                                                  |
|  Your transcript up to this point has been saved.                |
|  Duration: 8:47                                                  |
|                                                                  |
|                 [ Close ]                                         |
+----------------------------------------------------------------+
```

- The warning icon and "Connection lost" text use `var(--color-status-warning)` (not error red -- the transcript was saved, so this is a degraded success, not a failure)
- "Close" collapses the panel, triggers the meeting list refresh, and the partial interview appears as a meeting with whatever transcript was captured

### Error: Meeting Already Running

**Title:** (none -- handled by disabled button state)

The Interview button is disabled when a meeting is running. If somehow the user reaches the start endpoint with a conflict:

**Message in the config panel:** "Another meeting is in progress. Please wait for it to finish."

This replaces the Start Interview button area. No action needed -- the button returns to enabled when the running meeting completes.

### Error: Backend Unreachable on Start

**Title:** "Unable to start interview"
**Message:** "The server is not responding. Please try again in a moment."
**Action:** "Try Again" (retries `POST /api/interviews/start`)

---

## 7. Interview Cards in the Meetings List

### Badge

Add a `.meeting-card__badge--interview` variant:

```css
.meeting-card__badge--interview {
  color: #d97706;  /* amber-600 */
  background: rgba(var(--color-amber-400-rgb), 0.10);
}
```

This follows the existing badge pattern: colored text on a tinted background. Amber distinguishes interviews from charter (green), weekly (violet), and custom (indigo).

**Label:** "Interview" (uppercase, matching existing badge text-transform).

### Card Layout

Interview cards use the same `.meeting-card` structure as other meeting types. Differences:

1. **Badge:** "INTERVIEW" in amber
2. **Topic as subtitle:** The interview topic appears below the summary text in `var(--color-text-secondary)`, `font-size: var(--text-xs)`, prefixed with a label.

```html
<p class="meeting-card__topic">Topic: Q1 Strategy Review</p>
```

```css
.meeting-card__topic {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}
```

3. **Participants:** Instead of agent avatars, show text: "CEO + AI Interviewer" in the same `.meeting-card__participant-names` style. No avatar images (there is no avatar for the CEO or the AI interviewer).

```html
<div class="meeting-card__participants">
  <span class="meeting-card__participant-names">CEO + AI Interviewer</span>
</div>
```

4. **Everything else is identical:** summary text, mood, date, duration, chevron, expand/collapse.

### Card Rendering in JS

In the `renderCard()` function in `meetings.js`, add the interview type:

```javascript
var typeBadge = 'Charter';
if (meeting.type === 'weekly') typeBadge = 'Weekly';
else if (meeting.type === 'custom') typeBadge = 'Custom';
else if (meeting.type === 'interview') typeBadge = 'Interview';
```

For the topic subtitle, check for `meeting.interviewConfig`:

```javascript
var topicHtml = '';
if (meeting.interviewConfig && meeting.interviewConfig.topic) {
  topicHtml = '<p class="meeting-card__topic">Topic: ' +
    escapeHTML(meeting.interviewConfig.topic) + '</p>';
}
```

For participants, check the participant list for the interview pattern:

```javascript
if (meeting.type === 'interview') {
  participantsHtml =
    '<div class="meeting-card__participants">' +
      '<span class="meeting-card__participant-names">CEO + AI Interviewer</span>' +
    '</div>';
}
```

### Running Interview Card

When an interview is in progress, the meetings list shows a running card at the top (same pattern as existing running meetings):

```html
<div class="meeting-card meeting-card--running">
  <div class="meeting-card__header">
    <div class="meeting-card__meta">
      <span class="meeting-card__badge meeting-card__badge--interview">Interview</span>
      <span class="meeting-card__running-text">
        <span class="meeting-card__running-dot" style="background: #d97706;"></span>
        Interview in progress...
      </span>
    </div>
  </div>
</div>
```

The running dot uses amber instead of the default green accent to match the interview color.

### Expanded Detail View

When an interview card is expanded, it shows the same detail sections as other meetings:

1. **Key Takeaways** -- bulleted list
2. **Decisions** -- each with participants and rationale
3. **Action Items** -- with owner, description, and priority
4. **Transcript** -- speaker turns with speaker name and role
5. **Next Meeting Topics** -- if any

The transcript rendering needs one addition: the "CEO" and "AI Interviewer" speakers do not have entries in the `AGENTS` object (which maps agent names to avatars). The transcript renderer should handle unknown speakers gracefully by showing the speaker name without an avatar, using a default text color.

```javascript
// In transcript rendering:
var agent = AGENTS[entry.speaker];
if (agent) {
  // Render with avatar and agent color (existing behavior)
} else {
  // Render with speaker name, no avatar, default color
  // This handles "CEO" and "AI Interviewer" speakers
}
```

Speaker label styling for non-agent participants:
- "CEO": `font-weight: var(--font-weight-semibold)`, `color: var(--color-text-primary)`
- "AI Interviewer": `font-weight: var(--font-weight-semibold)`, `color: #d97706` (amber-600)

---

## 8. Responsive Behavior

### Breakpoints

TeamHQ uses two responsive thresholds: `640px` (mobile/tablet) and `1024px` (desktop).

### Desktop (>=1024px)

Full layout as described above. Configuration panel, active interview panel, and meeting cards all display at their default sizes.

### Tablet (640px - 1023px)

- **Toolbar buttons:** May wrap to a second line if space is tight. The Interview button wraps alongside the others.
- **Config panel:** Full width. No layout changes needed.
- **Active interview panel:** Full width. Timer and status remain on one line.
- **Meeting cards:** Same as desktop (the existing card layout handles this range well).

### Mobile (<640px)

#### Toolbar
The existing mobile behavior stacks the subtitle and buttons. The Interview button sits alongside the other three buttons, which wrap as needed:

```css
@media (max-width: 639px) {
  .meetings__buttons {
    justify-content: center;
    flex-wrap: wrap;
  }
}
```

If four buttons do not fit on one line at small widths, they wrap to two rows. The amber Interview button is visually distinct enough to remain scannable even when wrapped.

#### Config Panel
Full width, no changes. The topic input and context textarea are already full-width block elements.

#### Active Interview Panel
- The header row stacks: status text and topic on top, timer below (right-aligned or centered).
- The audio visualizer shrinks to fit. Reduce bar count to 12 bars at `<640px` to avoid visual cramping.
- The End Interview button is full-width.

```css
@media (max-width: 639px) {
  .interview-active__header {
    flex-direction: column;
    gap: var(--space-2);
  }

  .interview-active__timer {
    align-self: flex-end;
  }

  .interview-active__end-btn {
    width: 100%;
  }

  .interview-visualizer {
    gap: 3px;
  }
}
```

#### Error States
Error panels are already centered text with constrained max-width (400px). They render well at all widths. No mobile-specific changes needed.

#### Meeting Cards
Interview cards follow the existing mobile card behavior:
- Header wraps
- Info row (mood, date, duration) goes full width
- Mood text is hidden at `<640px` (existing behavior)

---

## 9. Accessibility Requirements

### Keyboard Navigation

| Element | Keyboard Behavior |
|---------|-------------------|
| Interview button | Standard button. `Enter`/`Space` to activate. Focusable in tab order with other toolbar buttons. |
| Topic input | Standard text input. `Tab` to focus, type to enter. |
| Context textarea | Standard textarea. `Tab` to focus, type to enter. |
| Start Interview button | Standard button. `Enter`/`Space` to start. Disabled when topic is empty (conveyed via `aria-disabled` and visual opacity). |
| End Interview button | Standard button. `Enter`/`Space` to end. |
| Cancel button (connecting state) | Standard button. `Enter`/`Space` to cancel. |
| Error "Try Again" buttons | Standard button. `Enter`/`Space` to retry. |

### Focus Management

- When the config panel opens, focus moves to the topic input field.
- When the connecting state appears, focus moves to the Cancel button.
- When the active interview state appears, focus moves to the End Interview button (so the user can press Enter/Space to end at any time without reaching for the mouse).
- When an error state appears, focus moves to the action button (Try Again / Retry / Close).
- When the panel collapses after completion, focus returns to the Interview button in the toolbar.

### ARIA

**Config panel:**
```html
<div class="interview-config" id="interview-config" aria-hidden="true">
```
Toggle `aria-hidden` with panel visibility.

**Topic field validation:**
```html
<input id="interview-topic" aria-required="true" aria-describedby="interview-topic-error">
<p id="interview-topic-error" role="alert" aria-live="polite"></p>
```

**Active interview status:**
```html
<div class="interview-active" role="status" aria-live="polite" aria-label="Interview in progress">
```

The `role="status"` and `aria-live="polite"` ensure screen readers announce state changes (connecting, active, processing, complete, error) without interrupting the user's current focus.

**Timer:**
```html
<span class="interview-active__timer" aria-label="Elapsed time: 12 minutes 34 seconds" aria-live="off">
  12:34
</span>
```

`aria-live="off"` prevents the timer from being announced every second. The elapsed time is available on demand when the user navigates to it. Update the `aria-label` to a human-readable format ("X minutes Y seconds") even though the visual display shows `MM:SS`.

**Audio visualizer:**
```html
<div class="interview-visualizer" role="img" aria-label="Audio activity indicator">
```

The visualizer is decorative feedback. `role="img"` with a static label prevents screen readers from trying to parse individual bars.

**Error states:**
```html
<div class="interview-error" role="alert">
```

`role="alert"` ensures errors are announced immediately.

### Screen Reader Announcements

Key state transitions should produce screen reader announcements via a visually hidden live region:

| Transition | Announcement |
|-----------|-------------|
| Config panel opens | "Interview configuration. Enter a topic to begin." |
| Connecting | "Connecting to interview service." |
| Active | "Interview started. Speak into your microphone." |
| 15-minute mark | "Fifteen minutes elapsed." |
| Processing | "Interview ended. Processing transcript." |
| Complete | "Interview saved. View it in the meetings list." |
| Error (any) | The error title and message text are announced via `role="alert"`. |

Implementation: a single `<div class="sr-only" aria-live="assertive">` element that JS updates with announcement text, then clears after a short delay.

### Color Contrast

All text and interactive elements meet WCAG AA (4.5:1 for normal text, 3:1 for large text and UI components):

| Element | Foreground | Background | Ratio |
|---------|-----------|-----------|-------|
| Interview button text | `#ffffff` | `#d97706` (amber-600) | 4.5:1 |
| Interview badge text | `#d97706` | `rgba(251,191,36,0.10)` on white | >4.5:1 |
| Timer text | `#171717` | `#fafafa` (secondary bg) | >15:1 |
| Warning timer | `#ca8a04` | `#fafafa` | 4.5:1 |
| Error title | `#dc2626` | `#fafafa` | 5.3:1 |
| Error message | `#666666` | `#fafafa` | 5.7:1 |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .interview-config,
  .interview-config__inner {
    transition: none;
  }

  .interview-connecting__dot,
  .meeting-card__running-dot {
    animation: none;
  }

  .interview-visualizer--idle .interview-visualizer__bar {
    animation: none;
  }

  /* Active visualizer bars still respond to audio amplitude --
     this is functional status feedback, not decorative animation */
}
```

---

## 10. Animation and Transition Specs

### Panel Slide Open/Close

```css
.interview-config {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}
```

Same pattern used by `.meeting-card__details`. Smooth height animation without layout thrash.

### State Transitions (Config -> Connecting -> Active -> Processing -> Collapse)

Each state transition within the panel uses a simple **fade crossfade**:

1. Current state content fades out (`opacity: 1 -> 0`, `150ms ease`)
2. New state content fades in (`opacity: 0 -> 1`, `150ms ease`, `50ms delay`)

Total transition time: ~350ms. Fast enough to feel responsive, slow enough to register the change.

```css
.interview-panel__state {
  transition: opacity 0.15s ease;
}

.interview-panel__state--entering {
  opacity: 0;
}

.interview-panel__state--active {
  opacity: 1;
}
```

Implementation: the panel has a single container. JS swaps the inner HTML and toggles the entering/active classes with a requestAnimationFrame bridge.

### Recording Indicator Pulse

Reuses the existing `indicator-pulse` keyframes:

```css
@keyframes indicator-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

Applied to the amber dot in the active interview header. Period: 2s (matching existing meeting-running pulse).

### Audio Visualizer

- **Active bars:** Height transitions via inline style (JS sets `height` per frame). The CSS `transition: height 0.05s ease` provides minimal smoothing.
- **Idle wave:** CSS keyframe animation, staggered per bar (see section 4).
- **State switch (active <-> idle):** No explicit animation. The bars simply switch behavior source (JS amplitude vs CSS keyframe).

### Chevron Rotation (Meeting Cards)

Existing behavior, no changes:

```css
.meeting-card__chevron {
  transition: transform 0.3s ease;
}
.meeting-card__header[aria-expanded="true"] .meeting-card__chevron {
  transform: rotate(-135deg);
}
```

### Toast Notification

Existing toast component. Slides in from the top, auto-dismisses after 4 seconds. No new animation work needed.

### Performance Budget

All animations target 60fps. The audio visualizer is the most demanding:
- Read `AnalyserNode` data via `getByteFrequencyData` (~0.1ms)
- Update 16-24 bar heights via inline style (~0.3ms)
- Total frame budget: ~0.4ms of 16.6ms available -- well within budget

No `transform` or `filter` animations on the visualizer bars. Height-only changes are simple layout operations that modern browsers handle efficiently. If profiling reveals jank, fall back to `transform: scaleY()` for GPU compositing.

---

## 11. Design Token Reference

All new CSS for the interview feature must use tokens from `css/tokens.css`. No hardcoded values except where tokens do not exist (annotated below).

### Colors Used

| Token / Value | Usage |
|--------------|-------|
| `var(--color-bg-primary)` | Page background |
| `var(--color-bg-secondary)` | Config panel, error panel backgrounds |
| `var(--color-bg-card)` | Meeting card background |
| `var(--color-text-primary)` | Headings, primary text, timer |
| `var(--color-text-secondary)` | Labels, topic text, participant names |
| `var(--color-text-tertiary)` | Optional hints, card date/duration |
| `var(--color-border)` | Panel borders, card borders, input borders |
| `var(--color-border-strong)` | End button border, hover states |
| `var(--color-accent)` | Focus rings, AI speaking visualizer bars, success toast |
| `var(--color-status-error)` | Error titles, danger timer, end button hover |
| `var(--color-status-warning)` | Warning timer at 15min, connection-lost icon |
| `#d97706` | Interview button bg, badge text, recording dot, user visualizer bars. **Note:** This is amber-600, not currently a named token. Recommend adding `--color-amber-600: #d97706;` and `--color-amber-700: #b45309;` to tokens.css. |
| `rgba(var(--color-amber-400-rgb), 0.10)` | Interview badge background tint |

### Typography

| Token | Usage |
|-------|-------|
| `var(--font-family)` | All UI text |
| `var(--font-mono)` | Timer display |
| `var(--text-xs)` | Badges, topic subtitle, card metadata |
| `var(--text-sm)` | Labels, input text, status text, buttons |
| `var(--text-base)` | Error titles |
| `var(--text-lg)` | Timer |
| `var(--font-weight-medium)` | Timer, input labels |
| `var(--font-weight-semibold)` | Buttons, status text, error titles, badges |

### Spacing

| Token | Usage |
|-------|-------|
| `var(--space-1)` | Badge padding vertical, topic margin-top |
| `var(--space-2)` | Badge padding horizontal variant, error message margin, header row gaps |
| `var(--space-3)` | Input/textarea padding, badge padding horizontal, button gap, meta gaps |
| `var(--space-4)` | Config panel margin-bottom, visualizer vertical padding, detail border-top padding |
| `var(--space-5)` | Config panel inner padding, card padding, button horizontal padding |

### Borders / Radius

| Token | Usage |
|-------|-------|
| `var(--radius-sm)` | Buttons, input fields |
| `var(--radius-lg)` | Config panel, error panel, meeting cards |

---

## 12. New CSS Tokens to Add

Add these to `css/tokens.css` in the "Category Accents" section:

```css
/* Amber scale (for interview badge and UI) */
--color-amber-500: #f59e0b;
--color-amber-600: #d97706;
--color-amber-700: #b45309;

/* RGB for amber-600 (for rgba() transparency) */
--color-amber-600-rgb: 217, 119, 6;
```

This keeps amber-400 and amber-400-rgb (already present) and adds the darker values needed for accessible text and button backgrounds. The interview feature is the first to use amber as a semantic color (beyond Enzo's agent identity), so these tokens formalize it.

---

## 13. File Changes Summary

### New CSS Classes

| Class | File | Purpose |
|-------|------|---------|
| `.meetings__run-btn--interview` | `css/styles.css` | Interview toolbar button |
| `.interview-config` | `css/styles.css` | Config panel container (collapsible) |
| `.interview-config__inner` | `css/styles.css` | Config panel overflow wrapper |
| `.interview-config__content` | `css/styles.css` | Config panel padded inner |
| `.interview-config__field` | `css/styles.css` | Field wrapper (label + input) |
| `.interview-config__label` | `css/styles.css` | Field labels |
| `.interview-config__input` | `css/styles.css` | Topic input |
| `.interview-config__textarea` | `css/styles.css` | Context textarea |
| `.interview-config__actions` | `css/styles.css` | Button alignment |
| `.interview-connecting` | `css/styles.css` | Connecting state container |
| `.interview-connecting__dot` | `css/styles.css` | Pulsing amber dot |
| `.interview-active` | `css/styles.css` | Active interview panel |
| `.interview-active__header` | `css/styles.css` | Status + timer row |
| `.interview-active__status` | `css/styles.css` | Recording indicator + text |
| `.interview-active__topic` | `css/styles.css` | Topic display |
| `.interview-active__timer` | `css/styles.css` | Elapsed time display |
| `.interview-active__timer--warning` | `css/styles.css` | 15-min warning color |
| `.interview-active__timer--danger` | `css/styles.css` | 55-min danger color |
| `.interview-active__end-btn` | `css/styles.css` | End Interview button |
| `.interview-visualizer` | `css/styles.css` | Audio bar container |
| `.interview-visualizer__bar` | `css/styles.css` | Individual frequency bar |
| `.interview-visualizer--idle` | `css/styles.css` | Idle wave animation |
| `.interview-visualizer--ai-speaking` | `css/styles.css` | Green bars for AI output |
| `.interview-processing` | `css/styles.css` | Processing state container |
| `.interview-error` | `css/styles.css` | Error state container |
| `.interview-error__icon` | `css/styles.css` | Error icon |
| `.interview-error__title` | `css/styles.css` | Error heading |
| `.interview-error__message` | `css/styles.css` | Error description |
| `.interview-error__action` | `css/styles.css` | Error action button |
| `.meeting-card__badge--interview` | `css/styles.css` | Amber badge for interview cards |
| `.meeting-card__topic` | `css/styles.css` | Topic subtitle on cards |

### Modified Files

| File | Changes |
|------|---------|
| `css/tokens.css` | Add `--color-amber-500`, `--color-amber-600`, `--color-amber-700`, `--color-amber-600-rgb` |
| `css/styles.css` | Add all interview-related CSS classes listed above |
| `index.html` | Add Interview button to `.meetings__buttons`, add interview config panel HTML, add interview active/processing/error panel HTML |
| `js/meetings.js` | Add "Interview" badge type in `renderCard()`, handle interview participants and topic display, handle non-agent speakers in transcript rendering |

### New Files

| File | Purpose |
|------|---------|
| `js/interview.js` | Interview UI module -- state machine, button handlers, panel transitions, communication with backend |
| `js/gemini-client.js` | WebSocket + audio client (per Andrei's tech approach) |
| `js/audio-worklet-processor.js` | AudioWorklet for PCM capture (per Andrei's tech approach) |

---

## 14. Interaction Flow Summary

```
[Idle]
  |
  |  CEO clicks "Interview" button
  v
[Config Panel Open]
  |
  |  CEO enters topic (required) + context (optional)
  |  CEO clicks "Start Interview"
  v
[Connecting]
  |
  |  Request mic -> Get ephemeral token -> Open WebSocket -> Setup
  |  (Errors branch to error states)
  v
[Active Interview]
  |
  |  CEO speaks with AI interviewer
  |  Audio visualizer shows activity
  |  Timer counts up
  |  (Session reconnects transparently at ~9min intervals)
  |  (15min: timer goes warning amber)
  |  (55min: timer goes danger red)
  |  (60min: auto-end)
  |
  |  CEO clicks "End Interview" or AI wraps up
  v
[Processing]
  |
  |  Transcript sent to backend
  |  Claude post-processing runs
  |  (Failure: save raw transcript, show degraded message)
  v
[Complete]
  |
  |  Panel collapses
  |  Meeting list refreshes
  |  New interview card appears and auto-expands
  |  Success toast: "Interview saved"
  |  All buttons re-enabled
  v
[Idle]
```

---

## 15. Open Design Questions

1. **Mute button:** Include in v1 or defer? My recommendation: defer. The core flow works without it, and it adds a button that could confuse the interaction model (is the AI still listening when I'm muted?). The user can simply pause speaking.

2. **Live transcript display:** Andrei notes the Gemini API delivers real-time transcription that could be shown in the UI. Thomas explicitly deferred this to v2. I agree with the deferral -- showing a live transcript during a voice conversation splits attention. The UI should encourage the user to focus on speaking, not reading.

3. **Audio level meter vs. waveform vs. bars:** I spec'd vertical frequency bars because they are the most visually distinct and easiest to implement with Web Audio AnalyserNode data. An alternative is a single horizontal waveform line. The bars are more engaging and provide clearer per-frequency feedback. If Alice finds bars hard to tune, a simple single-bar "volume meter" (one horizontal bar that scales with overall amplitude) is an acceptable fallback.

4. **Interview button label on mobile:** At very small widths, four toolbar buttons may crowd. Consider abbreviating to a mic icon only (no text) at `<480px`. Deferred to Soren's responsive review.
