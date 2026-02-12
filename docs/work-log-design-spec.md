# Work Log — Design Spec

**Author:** Robert (Product Designer)
**Date:** February 11, 2026
**Status:** Ready for implementation
**Project ID:** `work-log`
**Dependencies:** `docs/work-log-requirements.md` (Thomas), `docs/work-log-tech-approach.md` (Andrei)

---

## Overview

Replace the per-session UI (session log + session history sidebar) with a single unified **Work Log** per project. This is primarily a subtraction — removing the session sidebar, renaming labels, and adding lightweight session dividers between work blocks. The individual event rendering inside the log is unchanged.

---

## 1. Layout Changes

### Current Detail View Structure

```
Detail Fields (goals, constraints, brief)
Dates
Action Area (session controls)
Session Log Container          ← renamed to Work Log
Session History Container      ← REMOVED
Pipeline Section
Work Items
Progress Notes
```

### New Detail View Structure

```
Detail Fields (goals, constraints, brief)
Dates
Action Area (work controls)
Work Log Container             ← unified timeline, no sidebar
Pipeline Section
Work Items
Progress Notes
```

**Key change:** The `session-history-container` div is removed entirely. The `session-log-container` becomes the sole log container and renders the unified Work Log.

No layout grid or sidebar arrangement changes — the session history was already rendered below the session log in a single column, not beside it. Removing it simply shortens the page.

---

## 2. Work Log Header

Replaces the current session log header ("Live Session" / "Session Log" + per-session timer).

### Structure

```html
<div class="session-log__header">
  <span class="session-log__title">Work Log</span>
  <span class="session-log__timer">1h 14m 32s</span>
</div>
```

### Visual Properties

The existing `.session-log__header`, `.session-log__title`, and `.session-log__timer` styles apply unchanged. The only change is the text content:

| Element | Current | New |
|---------|---------|-----|
| Title text | "Live Session" or "Session Log" | **"Work Log"** (always) |
| Timer text | Per-session duration | **Accumulated duration** across all sessions |

### Timer Behavior

- **Static (no active session):** Shows total accumulated duration from all completed sessions. Format: `formatDurationShort()` (existing helper). Example: "1h 14m 32s".
- **Live (active session):** Shows accumulated total + current session elapsed. The `--live` class (pulsing animation) applies when a session is active. Timer ticks every second, adding to the cumulative baseline.
- **No sessions:** Timer text is empty string (same as current behavior when no session is loaded).

No CSS changes needed. The existing `.session-log__timer` and `.session-log__timer--live` styles apply as-is.

---

## 3. Session Dividers

Visual separators between work blocks within the unified timeline. These are the primary new UI element.

### Structure

```html
<div class="session-divider">
  <div class="session-divider__line"></div>
  <div class="session-divider__label">
    <span class="session-divider__date">Feb 10, 2026 at 2:30 PM</span>
    <span class="session-divider__dot" aria-hidden="true"></span>
    <span class="session-divider__duration">14m 32s</span>
  </div>
  <div class="session-divider__line"></div>
</div>
```

### Visual Properties

```
.session-divider
  display: flex
  align-items: center
  gap: --space-3  (12px)
  padding: --space-4 (16px) horizontal, --space-5 (20px) vertical
  /* Generous vertical breathing room so dividers don't crowd events */
```

```
.session-divider__line
  flex: 1
  height: 1px
  background: var(--color-border)  (#e5e5e5)
```

```
.session-divider__label
  display: flex
  align-items: center
  gap: --space-2  (8px)
  flex-shrink: 0
  white-space: nowrap
```

```
.session-divider__date
  font-size: var(--text-xs)  (0.75rem / 12px)
  font-weight: var(--font-weight-medium)  (500)
  color: var(--color-text-tertiary-accessible)  (#767676 — WCAG AA safe)
  letter-spacing: 0.01em
```

```
.session-divider__dot
  width: 3px
  height: 3px
  border-radius: 50%
  background: var(--color-neutral-400)  (#a3a3a3)
```

```
.session-divider__duration
  font-family: var(--font-mono)
  font-size: var(--text-xs)  (0.75rem / 12px)
  font-weight: var(--font-weight-normal)  (400)
  color: var(--color-text-tertiary-accessible)  (#767676)
```

### Design Rationale

The divider follows the "centered rule with label" pattern — two horizontal lines flanking a text label. This is visually lightweight and won't interrupt the event flow. The muted color palette (`--color-text-tertiary-accessible`, not primary or secondary) keeps dividers subordinate to actual event content.

The dot separator between date and duration avoids the visual weight of a pipe or dash while maintaining clear separation.

### Placement Rules

1. **First session:** A divider appears at the **top** of the Work Log body, before the first event. This marks when work began on the project.
2. **Subsequent sessions:** A divider appears between the last event of session N and the first event of session N+1. Detection: when `event.sessionIndex !== previousEvent.sessionIndex`.
3. **Live session start:** When "Continue Work" spawns a new session, a divider is inserted immediately before the new live events begin streaming. The duration field is omitted for the active (in-progress) session since it hasn't ended yet.

### Active Session Divider Variant

For a running session (no `endedAt` yet), the duration span is simply omitted — the dot separator is also hidden so the date stands alone:

```html
<div class="session-divider">
  <div class="session-divider__line"></div>
  <div class="session-divider__label">
    <span class="session-divider__date">Feb 11, 2026 at 10:00 AM</span>
  </div>
  <div class="session-divider__line"></div>
</div>
```

No extra class needed — just conditionally omit the dot and duration elements in the render function when `sessionMeta.durationMs` is null.

### Responsive Behavior

- **Mobile (< 640px):** Divider padding reduces to `--space-3` vertical, `--space-3` horizontal. Date format shortens to "Feb 10, 2:30 PM" (drop the year and "at").
- **Desktop:** Full treatment as specified.

---

## 4. Work Controls

Replaces `renderSessionControls`. Same structure, different labels.

### Running State

```html
<div class="detail__session-controls">
  <div class="detail__session-status">
    <span class="detail__session-indicator detail__session-indicator--running"></span>
    <span class="detail__session-status-text">Working</span>
  </div>
  <button class="detail__stop-btn" type="button" data-session-id="...">Stop</button>
  <button class="detail__kickoff-view-btn" type="button">View Prompt</button>
</div>
```

### Idle State (has past sessions)

```html
<div class="detail__session-controls">
  <button class="detail__run-btn" type="button">Continue Work</button>
  <button class="detail__kickoff-view-btn" type="button">View Prompt</button>
</div>
```

### First Session State (project status: `planned`)

The "Start Work" button in `detail__action-area` is already rendered correctly for planned projects. No change needed — this button already reads "Start Work" (see `renderDetailView` line 434).

### Label Changes Summary

| Element | Current Text | New Text |
|---------|-------------|----------|
| Status text (running) | "Session running" | **"Working"** |
| Stop button | "Stop Session" | **"Stop"** |
| Run button (has sessions) | "Run New Session" | **"Continue Work"** |
| Run button (no sessions) | "Run Session" | **"Continue Work"** (or "Start Work" if status is `planned`) |

### Interaction States

All button interaction states (hover, active, disabled, focus-visible) remain exactly as defined in the existing CSS:

- **`.detail__run-btn`** — green accent background, white text, hover darkens
- **`.detail__stop-btn`** — neutral border, text color, hover reveals red accent
- **Disabled during API call:** Both buttons get `:disabled` state (opacity 0.5, cursor not-allowed)
- **Loading text:** "Starting..." on run button, "Stopping..." on stop button (set via JS `textContent` during the API call, revert on success/error)

No CSS changes needed for controls. This is purely a text-content change in `renderWorkControls`.

---

## 5. Card Badge Tooltip

The running indicator on project cards changes its tooltip text.

### Current

```html
<span class="project-card__running-indicator" title="Session running"></span>
```

### New

```html
<span class="project-card__running-indicator" title="Working"></span>
```

No visual change — same green pulsing dot. Only the `title` attribute text changes.

---

## 6. Empty State

When a project has no sessions (work log returns empty).

### Structure

```html
<div class="session-log">
  <div class="session-log__header">
    <span class="session-log__title">Work Log</span>
    <span class="session-log__timer"></span>
  </div>
  <div class="session-log__body" role="log" aria-live="polite">
    <div class="session-log__empty">
      <p class="session-log__empty-text">No work logged yet.</p>
      <p class="session-log__empty-subtext">Start work to begin tracking progress.</p>
    </div>
  </div>
</div>
```

### Visual Properties

```
.session-log__empty
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  padding: --space-10 (40px) vertical, --space-4 (16px) horizontal
  text-align: center
```

```
.session-log__empty-text
  font-size: var(--text-sm)  (0.875rem)
  font-weight: var(--font-weight-medium)  (500)
  color: var(--color-text-secondary)  (#666666)
  margin-bottom: --space-1  (4px)
```

```
.session-log__empty-subtext
  font-size: var(--text-xs)  (0.75rem)
  color: var(--color-text-tertiary-accessible)  (#767676)
```

### Design Notes

Intentionally minimal — no illustration, no call-to-action button. The "Start Work" / "Continue Work" button is already present in the controls area above. The empty state is informational only.

---

## 7. Loading State

Shown while the work-log aggregation endpoint is being fetched.

### Structure

```html
<div class="session-log">
  <div class="session-log__header">
    <span class="session-log__title">Work Log</span>
    <span class="session-log__timer"></span>
  </div>
  <div class="session-log__body" role="log" aria-live="polite">
    <div class="session-log__loading">
      <span class="session-log__loading-text">Loading work log...</span>
    </div>
  </div>
</div>
```

### Visual Properties

```
.session-log__loading
  display: flex
  align-items: center
  justify-content: center
  padding: --space-10 (40px) vertical
```

```
.session-log__loading-text
  font-size: var(--text-sm)  (0.875rem)
  color: var(--color-text-tertiary-accessible)  (#767676)
  animation: timer-pulse 2s ease-in-out infinite
  /* Reuses existing timer-pulse keyframes for subtle pulsing */
```

---

## 8. Error State

Shown when the work-log aggregation endpoint fails.

### Structure

```html
<div class="session-log">
  <div class="session-log__header">
    <span class="session-log__title">Work Log</span>
    <span class="session-log__timer"></span>
  </div>
  <div class="session-log__body" role="log" aria-live="polite">
    <div class="session-log__error">
      <p class="session-log__error-text">Failed to load work log.</p>
    </div>
  </div>
</div>
```

### Visual Properties

```
.session-log__error
  display: flex
  align-items: center
  justify-content: center
  padding: --space-10 (40px) vertical
  text-align: center
```

```
.session-log__error-text
  font-size: var(--text-sm)  (0.875rem)
  color: var(--color-text-tertiary-accessible)  (#767676)
```

### Recovery

No explicit retry button. The work log re-fetches on the next detail view expand (collapse + re-expand). This matches the current session loading pattern — implicit retry on next interaction.

---

## 9. CSS Changes Summary

### New CSS Classes

These are the only new CSS additions needed in `css/styles.css`:

| Class | Purpose |
|-------|---------|
| `.session-divider` | Container for the session boundary separator |
| `.session-divider__line` | Horizontal rule segments |
| `.session-divider__label` | Date + duration text container |
| `.session-divider__date` | Date/time text |
| `.session-divider__dot` | Tiny dot separator between date and duration |
| `.session-divider__duration` | Duration text in mono font |
| `.session-log__empty` | Empty state container |
| `.session-log__empty-text` | Primary empty message |
| `.session-log__empty-subtext` | Secondary empty message |
| `.session-log__loading` | Loading state container |
| `.session-log__loading-text` | Loading message with pulse |
| `.session-log__error` | Error state container |
| `.session-log__error-text` | Error message |

### CSS to Remove (when session history sidebar is gone)

The entire `.session-history` block can be removed from `styles.css` (lines ~3349–3470). This includes:
- `.session-history`, `.session-history--with-log`
- `.session-history__header`, `.session-history__count`
- `.session-history__list`, `.session-history__item` and all its variants
- `.session-history__empty`, `.session-history__empty-text`

This cleanup removes ~120 lines of dead CSS. Do it in the same PR — don't leave orphaned styles.

### No Changes Needed

- `.session-log` container styles — unchanged
- `.session-log__header` — unchanged (text content changes, not CSS)
- `.session-log__body` — unchanged
- `.session-log__timer`, `.session-log__timer--live` — unchanged
- `.session-log__jump`, `.session-log__jump-btn` — unchanged
- `.session-log__input-bar` and input styles — unchanged
- `.session-event` and all event rendering styles — unchanged
- `.detail__session-controls` — unchanged (label text changes only)
- `.detail__run-btn`, `.detail__stop-btn` — unchanged
- All session event type styles — unchanged

---

## 10. Accessibility

- **Session dividers:** Use `role="separator"` on `.session-divider` for screen reader semantics. Add `aria-label` with the full date and duration text (e.g., `aria-label="Work block started February 10, 2026 at 2:30 PM, duration 14 minutes 32 seconds"`).
- **Work Log heading:** The `session-log__title` "Work Log" text acts as a visual heading. Ensure the parent `.session-log` has `aria-label="Work Log"` for landmark identification.
- **Empty/loading/error states:** Already inside `role="log" aria-live="polite"` — screen readers will announce state changes.
- **Timer:** The timer is decorative (visual polish). No `aria-live` needed — it updates every second and would be noisy for screen readers.
- **Keyboard navigation:** No changes — the Work Log body is scrollable (existing tab stop behavior) and the input bar, buttons all have existing keyboard support.

---

## 11. What's NOT Changing

For Alice's clarity — these elements stay exactly as they are:

- **Event rendering:** All `.session-event` markup, the `appendSessionEvent` visual output, agent avatars, tool summaries, text events, system events, grouped low-signal events — all unchanged.
- **Panel rendering:** Pipeline indicator, Team Activity, File Deliverables panels — same markup and styles. Only their *data source* changes (cumulative vs per-session), which is a JS logic change, not a visual change.
- **Input bar:** "Reply to the team..." input, Send button, error message — unchanged.
- **Jump to latest:** Sticky "Jump to latest" button — unchanged.
- **Session log container:** Background, border, border-radius, overflow — unchanged.
- **Log body:** Max-height (480px), scrollbar styling, padding — unchanged.

---

*Design spec written by Robert (Product Designer). Alice: this is a lightweight spec — mostly text-content changes and the removal of the session history sidebar. The only new CSS is the session divider treatment and the empty/loading/error states. No structural layout changes, no new component patterns, no design system additions.*
