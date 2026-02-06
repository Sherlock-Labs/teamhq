# TeamHQ Phase 3a - Design Spec

This spec provides implementation-ready details for Alice. All values reference the existing CSS custom property system or give exact values to add. The design extends the existing project detail view with a live session log, session controls, and session history.

---

## 1. Session Log View

The session log is the primary new UI element. It appears inside the project detail view (the expanded card) when a session is running or when reviewing a past session. It replaces the "progress notes" area as the main content when active.

### Visual Concept

The log has a terminal-like aesthetic: dark background, monospace text, color-coded event types, timestamps in the left margin. It should feel like watching a developer work in real time -- similar to tailing a log file but with structured, readable formatting.

### Container: `.session-log`

Placed inside `.project-card__details-inner`, below the action area and above session history. When a session is active (running or viewing a past session), this is the dominant visual element.

```html
<div class="session-log" data-session-id="...">
  <div class="session-log__header">
    <span class="session-log__title">Live Session</span>
    <span class="session-log__timer">12:34</span>
  </div>
  <div class="session-log__body">
    <div class="session-log__events">
      <!-- events rendered here -->
    </div>
  </div>
  <div class="session-log__jump" aria-hidden="true">
    <button class="session-log__jump-btn" type="button">Jump to latest</button>
  </div>
</div>
```

**Container styles:**

- `background: var(--color-zinc-950)` (#09090b) -- darker than the card background to create visual depth
- `border: 1px solid var(--color-zinc-800)` (#27272a)
- `border-radius: var(--radius-md)` (8px)
- `margin-bottom: var(--space-5)` (20px)
- `overflow: hidden` -- clips the inner scroll container's corners

**Header (`.session-log__header`):**

- `display: flex; align-items: center; justify-content: space-between`
- `padding: var(--space-3) var(--space-4)` (12px 16px)
- `border-bottom: 1px solid var(--color-zinc-800)` (#27272a)
- `background: rgba(24, 24, 27, 0.5)` -- subtle zinc-900 tint, slightly elevated from the log body

**Title (`.session-log__title`):**

- `font-size: var(--text-xs)` (12px)
- `font-weight: var(--font-weight-semibold)` (600)
- `color: var(--color-zinc-400)` (#a1a1aa)
- `text-transform: uppercase`
- `letter-spacing: 0.05em`
- For completed sessions, text changes to "Session Log" instead of "Live Session"

**Timer (`.session-log__timer`):**

- `font-family: var(--font-mono)`
- `font-size: var(--text-xs)` (12px)
- `color: var(--color-zinc-400)` (#a1a1aa)
- Format: `mm:ss` while running (e.g., `12:34`), final duration when complete (e.g., `5m 23s`)
- When running, add a subtle pulse animation to indicate liveness (see section 1.7)

**Body (`.session-log__body`):**

- `max-height: 480px` -- tall enough to show meaningful content without dominating the page
- `overflow-y: auto`
- `padding: var(--space-3) 0` (12px top/bottom, 0 sides -- events have their own horizontal padding)
- Custom scrollbar styling (matching the existing kickoff prompt area):
  ```css
  .session-log__body::-webkit-scrollbar { width: 6px; }
  .session-log__body::-webkit-scrollbar-track { background: transparent; }
  .session-log__body::-webkit-scrollbar-thumb { background: var(--color-zinc-700); border-radius: 3px; }
  ```

### 1.1 Event: `assistant_text`

Assistant text is the main narrative -- what the agent is saying/thinking. This is the most common event type and gets the most visual weight.

```html
<div class="session-event session-event--text">
  <span class="session-event__time">+0:42</span>
  <div class="session-event__body">
    <span class="session-event__content">I'll start by reading the project requirements to understand the scope...</span>
  </div>
</div>
```

**Styles:**

- `font-family: var(--font-mono)`
- `font-size: var(--text-sm)` (14px)
- `line-height: var(--leading-relaxed)` (1.625)
- `color: var(--color-zinc-300)` (#d4d4d8) -- default text color, highest contrast for the most important content
- `padding: var(--space-1) var(--space-4)` (4px 16px)

**Delta streaming behavior:**

When `delta: true`, append the text character-by-character to the current text block's `.session-event__content` span. Do not create a new event element for each delta -- accumulate into the current one. When a non-delta `assistant_text` arrives or a different event type arrives, the current text block is considered complete.

To indicate active streaming, add a blinking cursor at the end of the current text block:

```css
.session-event--text.session-event--streaming .session-event__content::after {
  content: "";
  display: inline-block;
  width: 7px;
  height: 14px;
  background: var(--color-indigo-400);
  margin-left: 1px;
  vertical-align: text-bottom;
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

Remove the `.session-event--streaming` class when the text block completes (new event type arrives or non-delta text arrives).

### 1.2 Event: `tool_use`

Tool use events are the second most important -- they show what the agent is doing. They get a distinct visual treatment with the indigo accent color.

```html
<div class="session-event session-event--tool-use">
  <span class="session-event__time">+1:15</span>
  <div class="session-event__body">
    <span class="session-event__tool-icon" aria-hidden="true"></span>
    <span class="session-event__tool-name">Read</span>
    <span class="session-event__tool-input">server/src/index.ts</span>
  </div>
</div>
```

**Styles:**

- `padding: var(--space-2) var(--space-4)` (8px 16px) -- slightly more vertical padding than text events to create visual separation
- `background: rgba(99, 102, 241, 0.04)` -- very subtle indigo tint to distinguish from assistant text

**Tool icon (`.session-event__tool-icon`):**

- A small wrench/gear indicator. Use a CSS-only approach:
  ```css
  .session-event__tool-icon {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 1.5px solid var(--color-indigo-400);
    border-radius: 3px;
    margin-right: var(--space-2);
    vertical-align: middle;
    flex-shrink: 0;
  }
  ```
- Alternatively, use the unicode character `>` (terminal prompt style) -- Alice can decide which reads better.

**Tool name (`.session-event__tool-name`):**

- `font-family: var(--font-mono)`
- `font-size: var(--text-sm)` (14px)
- `font-weight: var(--font-weight-semibold)` (600)
- `color: var(--color-indigo-400)` (#818cf8)
- `margin-right: var(--space-2)` (8px)

**Tool input (`.session-event__tool-input`):**

- `font-family: var(--font-mono)`
- `font-size: var(--text-sm)` (14px)
- `color: var(--color-zinc-400)` (#a1a1aa)
- Display logic for the input summary:
  - **Read**: Show `file_path` value (e.g., `server/src/index.ts`)
  - **Edit**: Show `file_path` value
  - **Write**: Show `file_path` value
  - **Bash**: Show first 80 chars of `command` value (e.g., `npm test`)
  - **Grep**: Show `pattern` value
  - **Glob**: Show `pattern` value
  - **WebFetch**: Show truncated URL
  - **Other/unknown**: Show tool name only, no input summary
  - If input is too long, truncate with `...` at 80 characters
  - Use `text-overflow: ellipsis; white-space: nowrap; overflow: hidden` on the input span

### 1.3 Event: `tool_result`

Tool results can be very large (up to 200 lines after server truncation). They are collapsed by default to keep the log readable. The CEO can expand them if they want to see the full output.

```html
<div class="session-event session-event--tool-result">
  <span class="session-event__time">+1:16</span>
  <div class="session-event__body">
    <button class="session-event__result-toggle" type="button" aria-expanded="false">
      <span class="session-event__result-chevron" aria-hidden="true"></span>
      <span class="session-event__tool-name session-event__tool-name--result">Read</span>
      <span class="session-event__result-label">result</span>
      <span class="session-event__result-truncated">(truncated)</span>
    </button>
    <div class="session-event__result-content" aria-hidden="true">
      <pre class="session-event__result-output"><code>file contents here...</code></pre>
    </div>
  </div>
</div>
```

**Collapsed state (default):**

- Toggle button fills the width:
  - `display: flex; align-items: center; gap: var(--space-2)`
  - `width: 100%`
  - `background: none; border: none; cursor: pointer`
  - `font-family: var(--font-mono)`
  - `padding: 0`

- Chevron (`.session-event__result-chevron`):
  - Same pattern as the existing `.project-card__chevron` but smaller:
  - `width: 8px; height: 8px`
  - `border-right: 1.5px solid var(--color-zinc-600); border-bottom: 1.5px solid var(--color-zinc-600)`
  - `transform: rotate(-45deg)` -- points right when collapsed
  - `transition: transform 0.2s ease`
  - When expanded (`aria-expanded="true"`): `transform: rotate(45deg)` -- points down

- Tool name in result: `font-size: var(--text-sm); color: var(--color-zinc-500); font-weight: var(--font-weight-medium)`
- Result label: `font-size: var(--text-xs); color: var(--color-zinc-600)`
- Truncated indicator (`.session-event__result-truncated`):
  - Only visible when `data.truncated === true`
  - `font-size: var(--text-xs); color: var(--color-zinc-600); font-style: italic`
  - `display: none` by default, `display: inline` when truncated

**Expanded state:**

- Toggle button has `aria-expanded="true"`
- Content container (`.session-event__result-content`):
  - Uses the same `grid-template-rows` expand/collapse animation as existing card details:
    ```css
    .session-event__result-content {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.2s ease;
    }
    .session-event__result-content[aria-hidden="false"] {
      grid-template-rows: 1fr;
    }
    ```
  - Inner `<pre>` overflow is `hidden` during animation, `auto` when expanded

- Output (`<pre><code>`):
  - `font-family: var(--font-mono)`
  - `font-size: 12px` -- slightly smaller than other event text to fit more content
  - `line-height: 1.5`
  - `color: var(--color-zinc-500)` (#71717a) -- deliberately muted so expanded results don't overwhelm the log
  - `background: rgba(9, 9, 11, 0.5)` -- slightly darker than the log body
  - `border: 1px solid var(--color-zinc-800)`
  - `border-radius: var(--radius-sm)` (6px)
  - `padding: var(--space-3)` (12px)
  - `margin-top: var(--space-2)` (8px)
  - `max-height: 300px; overflow-y: auto`
  - `white-space: pre-wrap; word-wrap: break-word`

### 1.4 Event: `system`

System events are lifecycle messages -- session started, session completed, etc. They get a centered, muted treatment that separates them from the main log flow.

```html
<div class="session-event session-event--system">
  <span class="session-event__time">+0:00</span>
  <div class="session-event__body">
    <span class="session-event__system-text">Session started</span>
  </div>
</div>
```

**Styles:**

- `padding: var(--space-2) var(--space-4)` (8px 16px)
- The body has a left border for visual accent:
  ```css
  .session-event--system .session-event__body {
    border-left: 2px solid var(--color-zinc-700);
    padding-left: var(--space-3);
  }
  ```

**System text (`.session-event__system-text`):**

- `font-family: var(--font-mono)`
- `font-size: var(--text-xs)` (12px)
- `color: var(--color-zinc-500)` (#71717a)
- `font-style: italic`

**Completion variant:** When the system message contains "completed", use a green accent:
- `border-left-color: #4ade80` (green-400)
- `.session-event__system-text { color: #4ade80 }`

### 1.5 Event: `error`

Error events demand attention. Red accent, bold treatment.

```html
<div class="session-event session-event--error">
  <span class="session-event__time">+5:12</span>
  <div class="session-event__body">
    <span class="session-event__error-text">Session timed out after 30 minutes</span>
  </div>
</div>
```

**Styles:**

- `padding: var(--space-2) var(--space-4)` (8px 16px)
- `background: rgba(248, 113, 113, 0.05)` -- very subtle red tint

**Error text (`.session-event__error-text`):**

- `font-family: var(--font-mono)`
- `font-size: var(--text-sm)` (14px)
- `color: #f87171` (red-400)
- `font-weight: var(--font-weight-medium)` (500)

**Error body border:**
```css
.session-event--error .session-event__body {
  border-left: 2px solid #f87171;
  padding-left: var(--space-3);
}
```

### 1.6 Timestamps

All events have a timestamp in the left margin showing relative time from session start.

**Timestamp (`.session-event__time`):**

- `font-family: var(--font-mono)`
- `font-size: 11px`
- `color: var(--color-zinc-600)` (#52525b)
- `min-width: 48px` -- ensures timestamps align vertically
- `flex-shrink: 0`
- `user-select: none` -- prevent accidental text selection of timestamps
- `text-align: right`
- `margin-right: var(--space-3)` (12px)

**Event row layout:**

Each event uses flexbox to align the timestamp and body:

```css
.session-event {
  display: flex;
  align-items: flex-start;
  padding: var(--space-1) var(--space-4);
}
```

**Time format:** `+m:ss` for times under 10 minutes, `+mm:ss` for longer. Examples: `+0:00`, `+1:42`, `+12:05`.

### 1.7 Auto-Scroll and "Jump to Latest"

**Auto-scroll behavior:**

- When the log body is scrolled to the bottom (or within 50px of the bottom), new events auto-scroll the container.
- When the CEO manually scrolls up (more than 50px from the bottom), auto-scroll pauses.
- The "Jump to latest" button appears when auto-scroll is paused.

**Jump button (`.session-log__jump`):**

- Positioned at the bottom of the log container, overlaying the last row of events:
  ```css
  .session-log__jump {
    position: sticky;
    bottom: 0;
    display: flex;
    justify-content: center;
    padding: var(--space-2) 0;
    background: linear-gradient(transparent, var(--color-zinc-950) 60%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .session-log__jump[aria-hidden="false"] {
    opacity: 1;
    pointer-events: auto;
  }
  ```
- The gradient creates a fade-to-black effect that obscures the last event row, drawing attention to the button.

**Jump button (`.session-log__jump-btn`):**

- `font-size: var(--text-xs)` (12px)
- `font-weight: var(--font-weight-medium)` (500)
- `color: var(--color-zinc-300)`
- `background: var(--color-zinc-800)` (#27272a)
- `border: 1px solid var(--color-zinc-700)`
- `border-radius: 9999px` (pill)
- `padding: var(--space-1) var(--space-4)` (4px 16px)
- `cursor: pointer`
- `transition: background-color 0.15s ease, border-color 0.15s ease`
- Hover: `background: var(--color-zinc-700); border-color: var(--color-zinc-600)`

**Timer pulse animation (for running sessions):**

```css
.session-log__timer--live {
  animation: timer-pulse 2s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 2. Session Controls

Session controls are integrated into the existing detail view action area (`.detail__action-area`). They replace the "Start Work" button when applicable.

### 2.1 Action Area States

The action area has four states depending on project and session status:

**State A: No session, project is `planned`**

Existing behavior. Show "Start Work" button. No changes.

**State B: No session, project is `in-progress`**

Show both "Run Session" and "View Prompt" side by side.

```html
<div class="detail__action-area">
  <div class="detail__session-controls">
    <button class="detail__run-btn" type="button">Run Session</button>
    <button class="detail__kickoff-view-btn" type="button">View Prompt</button>
  </div>
</div>
```

**Run Session button (`.detail__run-btn`):**

- Same base styles as `.detail__start-btn`:
  - `font-size: var(--text-sm); font-weight: var(--font-weight-semibold)`
  - `color: var(--color-white); background: var(--color-indigo-500)`
  - `border: none; border-radius: var(--radius-md)`
  - `padding: var(--space-2) var(--space-5)`
  - `cursor: pointer; transition: background-color 0.15s ease`
- Hover: `background: var(--color-indigo-600)`
- Disabled (while starting): `opacity: 0.5; cursor: not-allowed`
- Loading text: "Starting..." while the POST request is in flight

**Session controls layout (`.detail__session-controls`):**

- `display: flex; align-items: center; gap: var(--space-3)` (12px)

**State C: Session is running**

Show the running indicator and stop button.

```html
<div class="detail__action-area">
  <div class="detail__session-controls">
    <div class="detail__session-status">
      <span class="detail__session-indicator detail__session-indicator--running"></span>
      <span class="detail__session-status-text">Session running</span>
    </div>
    <button class="detail__stop-btn" type="button">Stop Session</button>
    <button class="detail__kickoff-view-btn" type="button">View Prompt</button>
  </div>
</div>
```

**Session indicator (`.detail__session-indicator`):**

- A small animated dot:
  ```css
  .detail__session-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .detail__session-indicator--running {
    background: #4ade80;
    animation: indicator-pulse 2s ease-in-out infinite;
  }
  @keyframes indicator-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
    50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(74, 222, 128, 0); }
  }
  ```

**Session status text (`.detail__session-status-text`):**

- `font-size: var(--text-sm); color: var(--color-zinc-300); font-weight: var(--font-weight-medium)`

**Session status container (`.detail__session-status`):**

- `display: flex; align-items: center; gap: var(--space-2)` (8px)

**Stop button (`.detail__stop-btn`):**

- `font-size: var(--text-sm); font-weight: var(--font-weight-medium)`
- `color: var(--color-zinc-400)`
- `background: transparent`
- `border: 1px solid var(--color-zinc-700)`
- `border-radius: var(--radius-md)` (8px)
- `padding: var(--space-2) var(--space-4)` (8px 16px)
- `cursor: pointer`
- `transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease`
- Hover: `color: #f87171; border-color: rgba(248, 113, 113, 0.3); background: rgba(248, 113, 113, 0.1)` -- same destructive hover pattern as the delete button
- Disabled (while stopping): text changes to "Stopping...", `opacity: 0.5; cursor: not-allowed`

**State D: Session completed/failed/stopped (reviewing)**

Show session result summary and option to run again.

```html
<div class="detail__action-area">
  <div class="detail__session-controls">
    <button class="detail__run-btn" type="button">Run New Session</button>
    <button class="detail__kickoff-view-btn" type="button">View Prompt</button>
  </div>
</div>
```

The "Run New Session" button uses the same styles as "Run Session" from State B.

---

## 3. Session History

Session history appears below the session log (or below the action area if no active session). It lists past sessions for the project.

### HTML Structure

```html
<div class="session-history">
  <div class="session-history__header">
    <span class="detail__label">Sessions</span>
    <span class="session-history__count">3 sessions</span>
  </div>
  <div class="session-history__list">
    <button class="session-history__item" type="button" data-session-id="...">
      <span class="session-history__item-status" data-status="completed"></span>
      <span class="session-history__item-date">Feb 6, 2026 at 2:34 PM</span>
      <span class="session-history__item-duration">5m 23s</span>
      <span class="session-history__item-events">347 events</span>
      <span class="session-history__item-chevron" aria-hidden="true"></span>
    </button>
    <!-- more items -->
  </div>
</div>
```

### Styles

**Container (`.session-history`):**

- `margin-bottom: var(--space-5)` (20px)
- `border-top: 1px solid var(--color-border)` if preceded by the session log, otherwise no top border

**Header (`.session-history__header`):**

- `display: flex; align-items: center; justify-content: space-between`
- `margin-bottom: var(--space-3)` (12px)

**Count (`.session-history__count`):**

- `font-size: var(--text-xs); color: var(--color-zinc-600)`

**List (`.session-history__list`):**

- `display: flex; flex-direction: column; gap: 0` -- items butt up against each other with dividers

**Item (`.session-history__item`):**

- `display: flex; align-items: center; gap: var(--space-3)` (12px)
- `width: 100%`
- `padding: var(--space-3) var(--space-3)` (12px)
- `background: transparent`
- `border: none`
- `border-bottom: 1px solid var(--color-zinc-800)`
- `cursor: pointer`
- `font-family: var(--font-family)` -- override button default
- `text-align: left`
- `transition: background-color 0.15s ease`
- Hover: `background: rgba(255, 255, 255, 0.02)`
- Last item: `border-bottom: none`

**Status dot (`.session-history__item-status`):**

- Same size and style as `.task-item__status`:
  - `width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0`
- Color by status:
  - `[data-status="completed"]`: `background: #4ade80` (green-400)
  - `[data-status="failed"]`: `background: #f87171` (red-400)
  - `[data-status="stopped"]`: `background: var(--color-zinc-600)` (#52525b)
  - `[data-status="timed-out"]`: `background: #facc15` (yellow-400)
  - `[data-status="running"]`: `background: #4ade80` with the pulse animation

**Date (`.session-history__item-date`):**

- `font-size: var(--text-sm); color: var(--color-zinc-300); flex: 1; min-width: 0`

**Duration (`.session-history__item-duration`):**

- `font-family: var(--font-mono)`
- `font-size: var(--text-xs); color: var(--color-zinc-400)`
- `white-space: nowrap`

**Events count (`.session-history__item-events`):**

- `font-size: var(--text-xs); color: var(--color-zinc-600)`
- `white-space: nowrap`

**Chevron (`.session-history__item-chevron`):**

- Same pattern as `.task-item__chevron`:
  - `width: 8px; height: 8px`
  - `border-right: 1.5px solid var(--color-zinc-600); border-bottom: 1.5px solid var(--color-zinc-600)`
  - `transform: rotate(-45deg)` -- points right, indicating "click to view"
  - `flex-shrink: 0`

**Active/selected item (viewing a past session):**

When a past session is loaded in the log above, highlight its history item:

```css
.session-history__item--active {
  background: var(--color-accent-light);
  border-left: 2px solid var(--color-indigo-400);
}
```

**Empty state (no sessions yet):**

```html
<div class="session-history__empty">
  <p class="session-history__empty-text">No sessions yet.</p>
</div>
```

- `font-size: var(--text-sm); color: var(--color-zinc-600); text-align: center; padding: var(--space-4) 0`

---

## 4. Project Card Running Indicator

When a project has `activeSessionId` set (a session is running), the project card in the list view shows a visual indicator so the CEO can spot active sessions without expanding cards.

### Implementation

Add a running indicator dot to the project card header, next to the status badge:

```html
<div class="project-card__meta">
  <span class="project-card__running-indicator" title="Session running"></span>
  <span class="project-card__badge" data-status="in-progress">In Progress</span>
  <span class="project-card__date">Feb 2026</span>
</div>
```

**Running indicator (`.project-card__running-indicator`):**

- `display: inline-block`
- `width: 8px; height: 8px; border-radius: 50%`
- `background: #4ade80` (green-400)
- `animation: indicator-pulse 2s ease-in-out infinite` (reuse from section 2.1)
- Only rendered when `activeSessionId` is set. Not rendered otherwise.

This is deliberately simple -- a single green pulsing dot beside the status badge. No text, no label. The badge already says "In Progress"; the dot adds "...and something is actively happening."

---

## 5. Detail View Layout (Updated)

The detail view now has more sections. Here is the complete layout order when a session is running:

```
1. Detail fields (goals, constraints, brief) -- existing
2. Dates (created, updated) -- existing
3. Action area (session controls) -- updated
4. Session log (new) -- live or reviewing past
5. Session history (new) -- past sessions list
6. Progress notes -- existing (pushed down)
```

When no session is active:

```
1. Detail fields -- existing
2. Dates -- existing
3. Action area (Run Session button) -- updated
4. Session history (if any past sessions) -- new
5. Progress notes -- existing
```

The session log is the dominant element when present, taking up the most visual space. Progress notes are pushed below it but remain accessible.

---

## 6. Responsive Behavior

### Mobile (< 640px)

**Session log:**

- `max-height: 360px` -- reduced from 480px to prevent the log from consuming the entire viewport
- Timestamps can be hidden on very narrow screens to save space:
  ```css
  @media (max-width: 479px) {
    .session-event__time { display: none; }
    .session-event { padding-left: var(--space-3); }
  }
  ```

**Session controls:**

- Stack vertically on mobile:
  ```css
  @media (max-width: 639px) {
    .detail__session-controls {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-2);
    }
    .detail__run-btn,
    .detail__stop-btn {
      width: 100%;
      text-align: center;
    }
  }
  ```

**Session history items:**

- The events count is hidden on mobile to save space:
  ```css
  @media (max-width: 639px) {
    .session-history__item-events { display: none; }
  }
  ```

### Tablet (640px+)

- Full layout, no modifications needed.

### Desktop (1024px+)

- Full layout. Session log at `max-height: 480px`.

---

## 7. Interaction Specification

### Starting a Session

1. CEO clicks "Run Session"
2. Button text changes to "Starting..." and becomes disabled
3. `POST /api/projects/:id/sessions` fires
4. On success:
   - Action area switches to State C (running indicator + stop button)
   - Session log appears with the header showing "Live Session" and timer at `+0:00`
   - SSE connection opens to `/api/projects/:id/sessions/:sessionId/events`
   - Events render in the log as they arrive
   - Timer ticks up every second
   - Running indicator dot appears on the project card
5. On error:
   - Button reverts to "Run Session"
   - Toast shows error message (e.g., "Maximum concurrent sessions reached")

### Stopping a Session

1. CEO clicks "Stop Session"
2. Button text changes to "Stopping..." and becomes disabled
3. `POST /api/projects/:id/sessions/:sessionId/stop` fires
4. The session log shows a "Session stopped by user" system event
5. Timer stops
6. Action area switches to State D (completed)
7. Running indicator dot disappears from project card

### Viewing a Past Session

1. CEO clicks a session in the session history list
2. The clicked item gets the `--active` highlight
3. Session log appears above with header showing "Session Log" and final duration
4. All events render from the stored NDJSON (via SSE endpoint which sends batch + closes)
5. No auto-scroll -- the log starts at the top and the CEO can scroll freely

### Connecting Mid-Session

1. CEO navigates to a project that has `activeSessionId` set
2. The detail view loads and detects `activeSessionId` is not null
3. Action area immediately shows State C (running)
4. Session log appears and connects to SSE
5. SSE endpoint replays all existing events, then streams new ones
6. Timer is calculated from `startedAt` to now, then ticks from there

---

## 8. CSS Architecture

All new styles go in `css/styles.css`, appended after the existing sections. New section headers:

```css
/* ===========================
   Session Log
   =========================== */

/* ... session-log, session-event styles ... */

/* ===========================
   Session Controls
   =========================== */

/* ... detail__session-controls, detail__run-btn, detail__stop-btn ... */

/* ===========================
   Session History
   =========================== */

/* ... session-history styles ... */
```

### New CSS Custom Properties

Add to `:root`:

```css
/* Session log colors */
--color-green-400: #4ade80;
--color-red-400: #f87171;
--color-yellow-400: #facc15;
```

These are already used inline throughout the codebase (status badges, error states) but formalizing them as tokens improves consistency.

### Keyframe Animations

Three new keyframe animations:

1. `cursor-blink` -- blinking cursor for streaming text (section 1.1)
2. `indicator-pulse` -- pulsing dot for running session indicator (section 2.1)
3. `timer-pulse` -- subtle timer opacity pulse (section 1.7, reuses indicator-pulse timing)

---

## 9. Accessibility

### Keyboard Navigation

- All session history items are `<button>` elements, keyboard focusable
- Tool result expand/collapse toggles are `<button>` elements with `aria-expanded`
- "Jump to latest" button is keyboard focusable
- Stop Session button has visible focus ring (inherited from global focus-visible rule)

### ARIA

- Session log body has `role="log"` and `aria-live="polite"` -- screen readers will announce new events without interrupting
- For live sessions, `aria-live="polite"` on the events container avoids overwhelming screen readers with every delta event. Only completed event blocks should be announced.
- Expand/collapse on tool results uses `aria-expanded` and `aria-hidden` (same pattern as project cards)
- Running indicator has `title="Session running"` for tooltip context

### Color Contrast

All text colors meet WCAG AA minimum contrast (4.5:1) against the zinc-950 background:

| Element | Color | Contrast vs #09090b |
|---------|-------|---------------------|
| Assistant text | zinc-300 (#d4d4d8) | ~13:1 |
| Tool name | indigo-400 (#818cf8) | ~5.8:1 |
| Tool input | zinc-400 (#a1a1aa) | ~7:1 |
| System text | zinc-500 (#71717a) | ~4.8:1 |
| Error text | red-400 (#f87171) | ~5.5:1 |
| Timestamp | zinc-600 (#52525b) | ~3.4:1 (decorative, non-essential) |

Timestamps at zinc-600 are below the 4.5:1 threshold but are decorative supplementary information. The same approach is used for dates and attribution text throughout the existing design.
