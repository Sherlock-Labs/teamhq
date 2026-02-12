# Task Detail View — Design Spec

**Author:** Robert (Product Designer)
**Date:** February 12, 2026
**Status:** Ready for implementation
**Project ID:** `task-detail`
**Dependencies:** `docs/task-detail-requirements.md` (Thomas), `docs/task-tracker-design-spec.md` (existing visual patterns)

---

## Overview

A right-anchored side panel that slides in when you click a task's ID or Title in the grid. It shows every field on the task — including the description, which has no UI anywhere today — and lets you edit them inline. The panel sits on top of the grid, not beside it. The grid stays visible to the left. Clicking the visible grid area closes the panel.

The design follows Linear's task detail pattern: panel overlays the right edge, clean key-value metadata, editable title as a heading, always-visible description textarea. No tab groups, no sidebar navigation within the panel — just the fields, laid out vertically, scrollable if needed.

---

## 1. Panel Layout

### Structure

```
.task-detail-overlay              → invisible click target (full page behind panel)
.task-detail                      → fixed panel, right edge
  .task-detail__header            → flex row: ID badge + close button
  .task-detail__body              → scrollable content area
    .task-detail__title-wrap      → editable title (heading / input toggle)
    .task-detail__description     → always-visible textarea
    .task-detail__separator       → 1px border-top divider
    .task-detail__metadata        → stacked key-value field list
      .task-detail__field         → single field row (label + value)
```

### Panel Container

```css
.task-detail {
  position: fixed;
  top: 65px;                          /* below sticky nav */
  right: 0;
  bottom: 0;
  width: 480px;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.06);
  z-index: 160;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);        /* hidden by default */
  transition: transform 200ms ease-out;
}

.task-detail--open {
  transform: translateX(0);
}
```

**Why `position: fixed`?** The panel needs to stay anchored to the viewport edge regardless of scroll. Fixed positioning lets it sit on top of the grid without affecting the grid's layout. The `top: 65px` aligns it below the sticky nav bar.

**Why no `width` animation?** Transform-only animation. GPU-composited, 60fps.

### Overlay (Click-to-Close Target)

```css
.task-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;                       /* below panel (160), above grid */
  background: transparent;             /* no dimming — the panel is a side panel, not a modal */
  display: none;
}

.task-detail-overlay--visible {
  display: block;
}
```

**No visible dimming.** The grid stays fully visible to the left of the panel. This keeps the panel feeling like a connected extension of the page (like Linear) rather than a modal interruption. The overlay exists purely to intercept clicks outside the panel for the close behavior.

### Z-Index Stack

| Layer | Z-Index | Purpose |
|-------|---------|---------|
| Nav | 100 | Sticky nav bar |
| Panel overlay | 150 | Click-to-close target |
| Detail panel | 160 | The panel itself |
| Modal overlay | 200 | New Task modal (sits above panel) |
| Toast | 300 | Error/success notifications |

This stacking means the New Task modal can open on top of the detail panel if needed — the modal's z-index (200) is higher than the panel's (160).

---

## 2. Panel Header

```css
.task-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;                      /* don't collapse when body scrolls */
}
```

### Task ID Badge

The task ID (e.g., "RT-1") displays as a compact, monospace-styled label.

```css
.task-detail__id {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: all;                    /* click to select the full ID for copying */
}
```

### Close Button

Same pattern as `.modal__close`:

```css
.task-detail__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  color: var(--color-neutral-400);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}
```

**States:**
- **Hover:** `color: var(--color-text-primary); background: rgba(0, 0, 0, 0.05)`
- **Focus-visible:** `outline: 2px solid var(--color-accent); outline-offset: 2px`
- **Active:** `background: rgba(0, 0, 0, 0.08)`

---

## 3. Panel Body (Scrollable Content)

```css
.task-detail__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
  -webkit-overflow-scrolling: touch;
}
```

The body is the only scrollable area. Header stays fixed at the top.

---

## 4. Title Field (Editable Heading)

The title displays as a heading. Click it to enter edit mode (transforms to an input). This maintains visual hierarchy while being editable.

### Display Mode (Default)

```css
.task-detail__title {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
  margin: 0 0 var(--space-4) 0;
  cursor: text;
  padding: var(--space-1) 0;
  border: 1px solid transparent;       /* reserve space for edit-mode border */
  border-radius: var(--radius-sm);
  transition: border-color 0.15s ease;
  word-break: break-word;
}
```

**States:**
- **Hover:** `border-color: var(--color-border)` — subtle border appears, signaling editability
- **Focus-visible (keyboard):** `outline: 2px solid var(--color-accent); outline-offset: 2px`

### Edit Mode

On click, the heading is replaced by an `<input>` element:

```css
.task-detail__title-input {
  width: 100%;
  font-family: var(--font-family);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
  margin: 0 0 var(--space-4) 0;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15);
}

.task-detail__title-input:focus {
  outline: none;
}
```

**Behavior:**
- Click heading → replace with input, auto-select all text
- Enter or blur → save value, switch back to heading display
- Escape → revert to original value, switch back to heading display

---

## 5. Description Field (Always-Visible Textarea)

The headline feature. Description is always a visible textarea — not a click-to-reveal field. It auto-grows with content.

```css
.task-detail__description {
  width: 100%;
  min-height: 80px;
  max-height: 300px;                   /* cap growth, then scroll internally */
  font-family: var(--font-family);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-primary);
  line-height: var(--leading-normal);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  resize: vertical;                    /* user can drag to resize */
  transition: border-color 0.15s ease;
  margin-bottom: var(--space-6);
}

.task-detail__description::placeholder {
  color: var(--color-text-tertiary-accessible);
}
```

**Placeholder text:** "Add a description..."

**States:**
- **Default:** `border-color: var(--color-border)`
- **Hover:** `border-color: var(--color-border-strong)`
- **Focus:** `border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15); outline: none`
- **Empty + not focused:** Shows placeholder text in `--color-text-tertiary-accessible`

**Auto-grow behavior:** JavaScript sets textarea height based on `scrollHeight` on each input event. Start at `min-height: 80px` (~4 lines), grow up to `max-height: 300px`, then the textarea scrolls internally. This keeps the panel body scrollable without the textarea consuming the entire viewport.

**Save trigger:** Blur. No explicit save button. Same debounced PUT as all other fields.

---

## 6. Metadata Separator

A simple divider between the description and the metadata section.

```css
.task-detail__separator {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0 0 var(--space-5) 0;
}
```

Uses an `<hr>` element for semantic separation.

---

## 7. Metadata Section (Key-Value Fields)

A stacked list of field rows. Each row has a label on the left and a value/control on the right.

### Field Row Layout

```css
.task-detail__metadata {
  display: flex;
  flex-direction: column;
  gap: 0;                             /* rows are tightly packed */
}

.task-detail__field {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: var(--space-2) 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);  /* very subtle separator */
}

.task-detail__field:last-child {
  border-bottom: none;
}
```

### Field Label

```css
.task-detail__label {
  width: 100px;
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary-accessible);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
}
```

### Field Value (Base)

```css
.task-detail__value {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  line-height: 1.3;
}
```

### Field Layout Order

| # | Label | Type | Component |
|---|-------|------|-----------|
| 1 | Status | Editable select | Dropdown with badge preview |
| 2 | Priority | Editable select | Dropdown with badge preview |
| 3 | Owner | Editable text | Text input |
| 4 | Phase | Editable text | Text input |
| 5 | Project | Read-only link | Navigates to `projects.html#{slug}` |
| 6 | Created by | Read-only text | Static text |

---

## 8. Editable Metadata Fields

### Select Fields (Status, Priority)

Use native `<select>` elements styled to match the filter bar selects. The current value also displays as a badge for visual consistency with the grid.

```css
.task-detail__select {
  appearance: none;
  font-family: var(--font-family);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-6) var(--space-1) var(--space-2);
  height: 28px;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239a9a9a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 12px;
}
```

**States:**
- **Default:** Transparent background and border — looks like plain text with a subtle chevron
- **Hover:** `border-color: var(--color-border); background: var(--color-bg-secondary)`
- **Focus:** `border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15); outline: none`

**Status options:** planned, in-progress, completed, deferred — same as grid.
**Priority options:** high, medium, low — same as grid.

**Badge display:** Instead of a plain select, wrap the select in a container that shows the current value as a `.thq-badge` (same badge styles as the grid columns). The native select sits on top with `opacity: 0`, so clicking the badge opens the native dropdown. This gives the visual richness of badges with the simplicity of native selects.

```html
<div class="task-detail__field">
  <span class="task-detail__label">Status</span>
  <div class="task-detail__badge-select">
    <span class="thq-badge thq-badge--accent">In Progress</span>
    <select class="task-detail__select-native" aria-label="Status">
      <option value="planned">Planned</option>
      <option value="in-progress" selected>In Progress</option>
      <option value="completed">Completed</option>
      <option value="deferred">Deferred</option>
    </select>
  </div>
</div>
```

```css
.task-detail__badge-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.task-detail__select-native {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  font-size: var(--text-sm);         /* ensures native dropdown text is readable */
}
```

**On change:** Update the badge text + class, fire the save. The badge classes map the same way as the grid:
- Status: planned → `--muted`, in-progress → `--accent`, completed → `--success`, deferred → `--warning`
- Priority: high → `--error`, medium → `--warning`, low → `--muted`

### Text Input Fields (Owner, Phase)

Inline text inputs that look like plain text when not focused.

```css
.task-detail__text-input {
  width: 100%;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  height: 28px;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.task-detail__text-input::placeholder {
  color: var(--color-text-tertiary-accessible);
}
```

**States:**
- **Default:** Transparent border — looks like plain text
- **Hover:** `border-color: var(--color-border); background: var(--color-bg-secondary)`
- **Focus:** `border-color: var(--color-accent); background: var(--color-bg-primary); box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15); outline: none`

**Placeholder text:**
- Owner: "Assign owner..."
- Phase: "Set phase..."

**Save trigger:** Blur. Same debounced PUT.

---

## 9. Read-Only Metadata Fields

### Project Link

```css
.task-detail__project-link {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.task-detail__project-link:hover {
  color: var(--color-accent);
  text-decoration: underline;
}

.task-detail__project-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

Navigates to `projects.html#{slug}` on click, same as the grid's Project column.

### Created By

```css
.task-detail__readonly {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.task-detail__readonly--empty {
  color: var(--color-text-tertiary-accessible);
}
```

If `createdBy` is empty, display "—" with the `--empty` modifier.

---

## 10. Slide-In / Slide-Out Animation

### Entrance (Opening)

```css
.task-detail {
  transform: translateX(100%);
  transition: transform 200ms ease-out;
}

.task-detail--open {
  transform: translateX(0);
}
```

- **Direction:** Slide in from the right edge
- **Duration:** 200ms
- **Easing:** `ease-out` — decelerates as it arrives, feels natural
- **Property:** `transform` only — GPU-composited, no layout recalculation

### Exit (Closing)

```css
.task-detail--closing {
  transform: translateX(100%);
  transition: transform 200ms ease-in;
}
```

- **Direction:** Slide out to the right
- **Duration:** 200ms
- **Easing:** `ease-in` — accelerates as it leaves, feels snappy

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .task-detail {
    transition: none;
  }
}
```

With reduced motion, the panel appears/disappears instantly (no slide). Still functional, just not animated.

### Task-to-Task Transition

When clicking a different task while the panel is already open (per US-TD-1 AC7):
- **No close-reopen animation.** The panel stays in place.
- Content updates immediately with a subtle crossfade on the body content.

```css
.task-detail__body--transitioning {
  opacity: 0.5;
  transition: opacity 100ms ease;
}
```

Reset to `opacity: 1` after data population. Quick 100ms dim-and-restore signals the content changed without the heavier slide animation.

---

## 11. Overlay & Close Behavior

### What Closes the Panel

| Action | Behavior |
|--------|----------|
| Close button (X) | Closes panel |
| Escape key | If editing a field: cancels field edit first. Second Escape: closes panel |
| Click overlay (grid area) | Closes panel |
| Click a different task's ID/Title | Updates panel content (doesn't close) |

### Overlay Click Handling

The `.task-detail-overlay` is an invisible full-page div positioned below the panel. It captures clicks and triggers close. It does NOT dim the grid — the grid remains fully visible and interactive for its clickable elements (project links still work through the overlay by event delegation, but this requires JS to handle — simplest approach is the overlay captures ALL clicks and closes the panel, then the user interacts with the grid directly).

**Note for Alice:** The overlay should intercept clicks to close the panel. If the user clicks a Project link in the visible grid area, the panel closes first (on click), and the user would click the link again. This is the simplest and most predictable behavior — no passthrough click logic.

---

## 12. Responsive Behavior

### Mobile (< 640px)

Panel goes full-width, covering the grid entirely:

```css
@media (max-width: 639px) {
  .task-detail {
    width: 100%;
    top: 65px;
  }

  .task-detail__body {
    padding: var(--space-5);
  }

  .task-detail__label {
    width: 80px;                      /* tighter label width on mobile */
  }
}
```

At mobile, the panel IS the page. The grid is completely behind it. This is fine — the user clicked into a task and is now focused on its details. Close to return to the grid.

Touch target sizes: All interactive elements (close button, selects, inputs) are at least 44px in touch target via their padding/height. The close button is 32px visually but 44px+ in tap area via padding on the header.

### Tablet (640px–960px)

Panel stays at 480px width. At 640px viewport, this leaves 160px of visible grid — not much, but enough to see part of the grid as context. At 768px, 288px visible. At 960px, 480px visible (half-and-half).

```css
@media (min-width: 640px) and (max-width: 959px) {
  /* No width override — stays at 480px */
  /* Panel may cover most of the grid, which is acceptable */
  /* The overlay click-to-close provides the exit path */
}
```

No special tablet overrides needed. The 480px width works at these sizes.

### Desktop (>= 960px)

Full 480px panel width. Grid visible to the left with meaningful content (480px+ of visible grid on a 960px+ viewport).

At 1120px (the `.container` max-width + padding), the panel covers roughly the right 40% of the grid — the Project, ID, and Title columns remain visible, which is the most useful context.

---

## 13. Description in New Task Modal (US-TD-5)

### Placement

New "Description" textarea added between the Title field and the Status field in the existing New Task modal form.

### HTML

```html
<div class="modal__field">
  <label class="modal__label" for="task-description">Description</label>
  <textarea class="modal__textarea modal__textarea--brief"
            id="task-description" name="description"
            placeholder="Add details, context, or notes..."
            rows="3"></textarea>
</div>
```

### Styling

Uses existing `.modal__textarea` class (already defined in `styles.css`), plus the `--brief` modifier for compact height:

```css
/* Already exists in styles.css: */
.modal__textarea {
  width: 100%;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  transition: border-color 0.15s ease;
}

/* Already exists in styles.css: */
.modal__textarea--brief {
  min-height: auto;
  resize: none;                        /* fixed height in modal to keep it compact */
}
```

### Behavior

- **Optional field** — no required marker, no validation
- **Fixed height** — 3 rows (`rows="3"` attribute), no auto-grow in the modal. The modal should stay compact.
- **No resize** — `resize: none` on the `--brief` modifier
- **Placeholder:** "Add details, context, or notes..."
- **On submit:** Include `description` value in the work item payload. If empty, send `""`.

---

## 14. Grid Sync Behavior

When a field is edited in the detail panel, the corresponding grid cell must update immediately.

### Flow

1. User changes a field value in the panel (blur on text, change on select)
2. JavaScript updates the AG Grid row data via `api.applyTransaction({ update: [rowData] })` or direct node update
3. Badge cells re-render with new value (AG Grid handles this via cell renderers)
4. The existing debounced PUT fires to persist the change (same save path as inline grid editing)
5. On save failure, toast notification appears (same toast pattern from the task tracker spec)

### Field-to-Column Mapping

| Panel Field | Grid Column | Update Method |
|-------------|-------------|---------------|
| Title | Title | `applyTransaction` — text cell refreshes |
| Status | Status | `applyTransaction` — badge re-renders |
| Priority | Priority | `applyTransaction` — badge re-renders |
| Owner | Owner | `applyTransaction` — avatar+name re-renders |
| Phase | Phase | `applyTransaction` — text cell refreshes |
| Description | (no column) | No grid update — description isn't a grid column |

---

## 15. Accessibility

### Keyboard Navigation

- **Tab order within panel:** Close button → Title (click to edit) → Description textarea → Status select → Priority select → Owner input → Phase input → Project link
- **Escape behavior (two-stage):**
  1. If a field is being edited (input focused): Escape cancels the edit (reverts value)
  2. If no field is being edited: Escape closes the panel
- **Focus on open:** Focus moves to the close button (first focusable element in the panel). This is the safest default — the user can Tab forward into the content or press Escape to close immediately.
- **Focus on close:** Focus returns to the grid row that was clicked (the ID or Title cell), or if that row is no longer in view, to the grid container.
- **No focus trap.** Unlike a modal, the panel does NOT trap focus. Users can Tab out of the panel and into the grid. This is correct for a side panel — it's supplementary UI, not blocking UI.

### Screen Reader

- **Panel landmark:** `role="complementary"` with `aria-label="Task details"`. This announces the panel as a complementary region.
- **Panel live region:** On open, `aria-live="polite"` container announces "Task RT-1 details" (the task ID).
- **Close button:** `aria-label="Close task details"`
- **Title heading:** The title displays as text with `role="heading" aria-level="2"` when in display mode. In edit mode, it's a standard `<input>` with `aria-label="Task title"`.
- **Field labels:** Each metadata row uses a visible `<span>` for the label (already readable) and the input/select has a matching `aria-label`.
- **Read-only fields:** No special ARIA needed — they're just text. The label provides context.

### Contrast

All text passes WCAG AA (4.5:1 on white background):
- Labels: `--color-text-tertiary-accessible` (#767676) — 4.5:1
- Values: `--color-text-primary` (#171717) — ~15:1
- Placeholder text: `--color-text-tertiary-accessible` (#767676) — 4.5:1
- ID badge: `--color-text-secondary` (#666666) on `--color-bg-secondary` (#fafafa) — 5.4:1
- Project link: `--color-text-secondary` (#666666) — 5.7:1

### Touch Targets

- Close button: 32px visual, 44px+ touch area (header padding provides the extra space)
- Selects (Status, Priority): 28px height minimum, but the full field row is 36px min-height — adequate for touch
- Text inputs (Owner, Phase): Same 28px/36px sizing
- On mobile (< 640px), all row heights naturally increase with the larger touch-friendly padding

---

## 16. Full CSS Summary

### New Classes Needed

| Class | Purpose | Approx Lines |
|-------|---------|-------------|
| `.task-detail-overlay` | Click-to-close target | 8 |
| `.task-detail` | Panel container, fixed position, slide animation | 15 |
| `.task-detail__header` | Header row (ID + close) | 8 |
| `.task-detail__id` | Task ID badge | 10 |
| `.task-detail__close` | Close button | 15 |
| `.task-detail__body` | Scrollable content area | 6 |
| `.task-detail__title` / `__title-input` | Editable title (two states) | 25 |
| `.task-detail__description` | Description textarea | 15 |
| `.task-detail__separator` | Divider | 4 |
| `.task-detail__metadata` | Metadata container | 4 |
| `.task-detail__field` | Field row | 8 |
| `.task-detail__label` | Field label | 8 |
| `.task-detail__badge-select` / `__select-native` | Badge + invisible select | 12 |
| `.task-detail__text-input` | Inline text input | 15 |
| `.task-detail__project-link` | Project link | 10 |
| `.task-detail__readonly` | Read-only field | 6 |
| Responsive overrides | Mobile, tablet | 15 |
| Reduced motion | Transition removal | 5 |
| Animation states | `--open`, `--closing`, `--transitioning` | 10 |

**Total: ~190 lines.** All go in `css/tasks.css` alongside the existing task page styles.

### No New Files

- CSS additions go into `css/tasks.css`
- JS additions go into `js/tasks.js`
- HTML additions go into `tasks.html` (panel markup + modal description field)

---

## Summary for Alice

1. **Panel HTML:** Add the `.task-detail-overlay` and `.task-detail` markup after the grid container in `tasks.html`. The panel starts hidden (`transform: translateX(100%)`). Toggle the `--open` class to show/hide.

2. **Click behavior change:** ID and Title cells open the panel instead of navigating. Project cell still navigates. Editable cells still inline-edit. Use AG Grid's `onCellClicked` to check the column field name.

3. **Title editing:** Render as a styled `<span>`. On click, replace with an `<input>` pre-filled with the current value. On blur/Enter, save and switch back. On Escape, revert and switch back.

4. **Description textarea:** Always visible, auto-grows via JS (`textarea.style.height = textarea.scrollHeight + 'px'` on input). Save on blur.

5. **Badge selects:** For Status and Priority, overlay an invisible `<select>` on top of a `.thq-badge`. On change, update the badge class and text, then fire the save.

6. **Text inputs:** Owner and Phase use ghost-style inputs (transparent border by default, accent border on focus). Same pattern as the title, but always an input (not a toggle).

7. **Grid sync:** On any panel field change, call `api.applyTransaction({ update: [updatedRowData] })` to refresh the grid row. Same debounced PUT save.

8. **Close behavior:** X button, Escape (two-stage), overlay click. On close, slide out with `ease-in`, remove `--open` class after transition ends.

9. **Modal description:** Add a `.modal__textarea.modal__textarea--brief` field between Title and Status in the New Task form. 3 rows, no auto-grow, optional.

10. **Responsive:** Full-width panel at mobile (< 640px). 480px at tablet+. No grid dimming at any size.

---

*Design spec written by Robert (Product Designer). This panel follows established TeamHQ patterns: tokens from `tokens.css`, modal close button from `styles.css`, badge renderers from `spreadsheet.css`, input focus rings from the shared focus pattern. The only novel element is the badge-over-select technique for Status/Priority — everything else is composition of existing patterns.*
