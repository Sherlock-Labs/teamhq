# Task History Feature - Design Spec

This spec provides implementation-ready details for Alice. All values reference existing CSS custom properties or give exact values where new tokens are needed.

---

## 1. Section Placement

The Tasks section sits **between Tools and Team Roster**, making the page flow:

1. Nav
2. Hero
3. Tools -- "What we've built"
4. **Tasks** -- "How we built it"
5. Team Roster -- "Who built it"
6. How It Works
7. Footer

This ordering follows a natural narrative: the user sees the products first (Tools), then the work breakdown behind them (Tasks), then the people who did it (Team). It also places Tasks right below Tools, creating a visual relationship -- the user can mentally connect a tool card above to the project card that built it below.

### Navigation Update

Add "Tasks" to the nav bar between "Tools" and "Team":

```html
<a href="#tools" class="nav__link">Tools</a>
<a href="#tasks" class="nav__link">Tasks</a>
<a href="#roster" class="nav__link">Team</a>
<a href="#how" class="nav__link">How It Works</a>
```

The existing `scroll-behavior: smooth` and `scroll-padding-top: 64px` handle smooth scrolling to the anchor.

---

## 2. Section Container

### HTML Structure

```html
<section class="tasks" id="tasks" aria-labelledby="tasks-heading">
  <div class="container">
    <h2 id="tasks-heading" class="section-title">Tasks</h2>
    <p class="section-subtitle">A history of what we've shipped.</p>
    <div id="tasks-list">
      <noscript>
        <p class="tasks__noscript">Enable JavaScript to view task history.</p>
      </noscript>
    </div>
  </div>
</section>
```

### Section Styling

- **Background:** `var(--color-bg-primary)` (zinc-950) -- same as Tools section above it, no alternating bands
- **Padding:** `var(--space-16) 0` on mobile, `var(--space-20) 0` on desktop (matches all other sections)
- **Uses existing `.section-title` and `.section-subtitle`** -- no overrides needed

```css
.tasks {
  background: var(--color-bg-primary);
  padding-top: var(--space-16);
  padding-bottom: var(--space-16);
}

@media (min-width: 1024px) {
  .tasks {
    padding-top: var(--space-20);
    padding-bottom: var(--space-20);
  }
}
```

### Noscript Fallback

```css
.tasks__noscript {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-8) 0;
}
```

### Project Card List Layout

Cards stack vertically in a single column at all breakpoints. Unlike the Tools grid (which allows two columns) or the Roster grid (which allows three), project cards are content-heavy when expanded and benefit from full width.

```css
#tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```

Gap of `var(--space-4)` (16px) between cards -- tighter than the `var(--space-6)` used in other grids because these cards are visually denser (they have a clear header row with metadata) and the tighter spacing reinforces that they are items in a list rather than standalone cards.

---

## 3. Project Card -- Collapsed State

Each project renders as an `<article>` element with a clickable `<button>` header. The collapsed state shows a summary row with all key metadata.

### HTML Structure (rendered by JS)

```html
<article class="project-card" data-project="teamhq-landing-page">
  <button class="project-card__header" aria-expanded="false">
    <div class="project-card__summary">
      <h3 class="project-card__name">TeamHQ Landing Page</h3>
      <p class="project-card__desc">Built the original TeamHQ landing page...</p>
    </div>
    <div class="project-card__meta">
      <span class="project-card__badge" data-status="completed">Completed</span>
      <span class="project-card__date">2025-01</span>
      <span class="project-card__count">5 tasks</span>
    </div>
    <span class="project-card__chevron" aria-hidden="true"></span>
  </button>
  <div class="project-card__details" aria-hidden="true">
    <div class="project-card__details-inner">
      <!-- task items go here -->
    </div>
  </div>
</article>
```

### Card Container

- **Background:** `var(--color-bg-card)` (zinc-900)
- **Border:** `1px solid var(--color-border)` (zinc-800)
- **Border-radius:** `var(--radius-lg)` (12px)
- **Transition:** `border-color 0.2s ease`
- **Hover:** `border-color: var(--color-zinc-700)` -- same pattern as tool cards and agent cards

```css
.project-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color 0.2s ease;
}

.project-card:hover {
  border-color: var(--color-zinc-700);
}
```

### Header Button

The entire header is a `<button>` for accessibility (keyboard navigable, screen reader announces as interactive). It resets default button styles and uses flex layout.

- **Layout:** `display: flex; align-items: center; gap: var(--space-4)`
- **Padding:** `var(--space-5)` (20px) -- slightly less than tool card padding (24px) since the card is more compact
- **Width:** `100%`
- **Cursor:** `pointer`
- **Background:** `transparent`
- **Border:** `none`
- **Text align:** `left`
- **Color:** `inherit`
- **Font:** `inherit`

```css
.project-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-5);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}
```

### Summary Area (Left)

The summary area takes up the remaining space (`flex: 1; min-width: 0` to handle text overflow).

```css
.project-card__summary {
  flex: 1;
  min-width: 0;
}
```

**Project name (`project-card__name`):**
- `font-size: var(--text-base)` (16px)
- `font-weight: var(--font-weight-semibold)` (600)
- `color: var(--color-zinc-200)`
- `margin-bottom: var(--space-1)` (4px)

**Project description (`project-card__desc`):**
- `font-size: var(--text-sm)` (14px)
- `line-height: var(--leading-relaxed)` (1.625)
- `color: var(--color-text-secondary)` (zinc-400)
- On mobile, truncate with ellipsis to keep cards compact:

```css
.project-card__name {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
  margin-bottom: var(--space-1);
}

.project-card__desc {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 640px) {
  .project-card__desc {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }
}
```

### Meta Area (Right)

The meta area sits to the right of the summary and contains the status badge, date, and task count in a horizontal row.

- **Layout:** `display: flex; align-items: center; gap: var(--space-3)` (12px)
- **Flex-shrink:** `0` -- meta area doesn't compress; the summary truncates instead

```css
.project-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}
```

**Status badge (`project-card__badge`):**
Reuses the exact same visual pattern as `tool-card__badge`:

- `font-size: var(--text-xs)` (12px)
- `font-weight: var(--font-weight-medium)` (500)
- `padding: var(--space-1) var(--space-3)` (4px 12px)
- `border-radius: 9999px` (pill)
- `text-transform: uppercase`
- `letter-spacing: 0.05em`
- `white-space: nowrap`

Badge variants by `data-status`:

| Status | Text Color | Background |
|--------|-----------|------------|
| `completed` | `#4ade80` (green-400) | `rgba(74, 222, 128, 0.1)` |
| `in-progress` | `#facc15` (yellow-400) | `rgba(250, 204, 21, 0.1)` |
| `planned` | `var(--color-zinc-400)` | `rgba(161, 161, 170, 0.1)` |

```css
.project-card__badge {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.project-card__badge[data-status="completed"] {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.project-card__badge[data-status="in-progress"] {
  color: #facc15;
  background: rgba(250, 204, 21, 0.1);
}

.project-card__badge[data-status="planned"] {
  color: var(--color-zinc-400);
  background: rgba(161, 161, 170, 0.1);
}
```

**Date (`project-card__date`):**
- `font-size: var(--text-xs)` (12px)
- `color: var(--color-text-tertiary)` (zinc-600)
- `white-space: nowrap`

**Task count (`project-card__count`):**
- `font-size: var(--text-xs)` (12px)
- `color: var(--color-text-tertiary)` (zinc-600)
- `white-space: nowrap`

```css
.project-card__date,
.project-card__count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}
```

### Chevron

A CSS-only chevron that rotates on expand.

- **Size:** 12px x 12px (created with borders)
- **Color:** `var(--color-zinc-600)` -- subtle, not competing with content
- **Rotation:** `0deg` collapsed, `180deg` expanded
- **Transition:** `transform 0.3s ease` -- matches the expand/collapse timing
- **Flex-shrink:** `0`
- **Margin-left:** `var(--space-2)` (8px)

```css
.project-card__chevron {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin-left: var(--space-2);
  border-right: 2px solid var(--color-zinc-600);
  border-bottom: 2px solid var(--color-zinc-600);
  transform: rotate(45deg);
  transition: transform 0.3s ease;
}

.project-card__header[aria-expanded="true"] .project-card__chevron {
  transform: rotate(-135deg);
}
```

### Responsive: Collapsed Card on Mobile

On screens below 640px, the meta area wraps below the summary to avoid cramping. The header changes to a multi-row layout:

```css
@media (max-width: 639px) {
  .project-card__header {
    flex-wrap: wrap;
  }

  .project-card__summary {
    flex-basis: calc(100% - 32px); /* full width minus chevron space */
  }

  .project-card__meta {
    flex-basis: 100%;
    padding-top: var(--space-2);
  }

  .project-card__chevron {
    position: absolute;
    right: var(--space-5);
    top: var(--space-6);
  }

  .project-card {
    position: relative;
  }
}
```

---

## 4. Project Card -- Expanded State

### Expand/Collapse Animation

Uses CSS `grid-template-rows` transition for smooth height animation (per the tech approach). This avoids measuring heights or using JS animation.

```css
.project-card__details {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.project-card__details[aria-hidden="false"] {
  grid-template-rows: 1fr;
}

.project-card__details-inner {
  overflow: hidden;
}
```

The `<div class="project-card__details-inner">` wraps the task items inside the grid cell. When `grid-template-rows` goes to `0fr`, the inner div collapses to zero height with `overflow: hidden`. When it goes to `1fr`, it expands to fit the content. The transition handles the animation smoothly.

### Separator Line

A top border separates the header from the expanded details:

```css
.project-card__details[aria-hidden="false"] .project-card__details-inner {
  border-top: 1px solid var(--color-border);
}
```

### Details Inner Padding

```css
.project-card__details-inner {
  overflow: hidden;
  padding: 0 var(--space-5);
}

.project-card__details[aria-hidden="false"] .project-card__details-inner {
  padding-top: var(--space-4);
  padding-bottom: var(--space-5);
  border-top: 1px solid var(--color-border);
}
```

Note: Padding is only applied in the expanded state. If padding were always present, the grid-row animation would not fully collapse the content (padding adds height even at `0fr`). Instead, apply padding conditionally when `aria-hidden="false"`. The transition on `grid-template-rows` handles the height smoothly, and the padding appears instantly (which is fine -- the height transition provides the visual continuity).

---

## 5. Task Item Layout

Each subtask within an expanded card shows the agent, their role, the task description, and a status indicator.

### HTML Structure (rendered by JS)

```html
<div class="task-item">
  <div class="task-item__avatar" aria-hidden="true">T</div>
  <div class="task-item__content">
    <div class="task-item__agent-line">
      <span class="task-item__agent">Thomas</span>
      <span class="task-item__role">Product Manager</span>
    </div>
    <p class="task-item__title">Scoped requirements and acceptance criteria</p>
  </div>
  <span class="task-item__status" data-status="completed" aria-label="Completed"></span>
</div>
```

### Task Item Container

- **Layout:** `display: flex; align-items: flex-start; gap: var(--space-3)` (12px)
- **Padding:** `var(--space-3) 0` (12px top and bottom) -- vertical rhythm between items
- **Border-bottom:** `1px solid var(--color-border)` on all items except the last

```css
.task-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}

.task-item:last-child {
  border-bottom: none;
}
```

### Agent Avatar

Reuses the same visual pattern as `.agent-card__avatar` from the Team Roster, but smaller (inline size vs. card header size).

- **Size:** 32px x 32px (smaller than the 48px roster avatars -- appropriate for inline list items)
- **Border-radius:** `50%`
- **Background:** `var(--color-accent-light)` (indigo at 10%)
- **Text color:** `var(--color-accent-hover)` (indigo-400)
- **Font-size:** `var(--text-sm)` (14px)
- **Font-weight:** `var(--font-weight-semibold)` (600)
- **Flex-shrink:** `0`
- **Margin-top:** `2px` -- aligns the avatar optically with the first line of text

```css
.task-item__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent-light);
  color: var(--color-accent-hover);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
```

### Task Content Area

Takes the remaining horizontal space.

```css
.task-item__content {
  flex: 1;
  min-width: 0;
}
```

**Agent line:** Agent name and role on the same line.

```css
.task-item__agent-line {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: 2px;
}
```

**Agent name (`task-item__agent`):**
- `font-size: var(--text-sm)` (14px)
- `font-weight: var(--font-weight-semibold)` (600)
- `color: var(--color-zinc-200)`

**Agent role (`task-item__role`):**
- `font-size: var(--text-xs)` (12px)
- `font-weight: var(--font-weight-medium)` (500)
- `color: var(--color-accent-hover)` (indigo-400) -- matches the role color from agent cards

**Task title (`task-item__title`):**
- `font-size: var(--text-sm)` (14px)
- `line-height: var(--leading-relaxed)` (1.625)
- `color: var(--color-text-secondary)` (zinc-400)
- `margin: 0`

```css
.task-item__agent {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
}

.task-item__role {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent-hover);
}

.task-item__title {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
}
```

### Status Indicator

A small circle indicator on the right side of each task item, aligned with the first line of text.

- **Size:** 8px x 8px
- **Border-radius:** `50%`
- **Flex-shrink:** `0`
- **Margin-top:** `8px` -- vertically centers with the agent name line
- **Margin-left:** `auto` -- pushes it to the far right (though it's already last in the flex row, this ensures it)

Status colors by `data-status`:

| Status | Color | Meaning |
|--------|-------|---------|
| `completed` | `#4ade80` (green-400) | Task finished |
| `in-progress` | `#facc15` (yellow-400) | Actively being worked on |
| `blocked` | `#f87171` (red-400) | Waiting on a dependency |
| `skipped` | `var(--color-zinc-600)` | Not needed / bypassed |

```css
.task-item__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 8px;
}

.task-item__status[data-status="completed"] {
  background: #4ade80;
}

.task-item__status[data-status="in-progress"] {
  background: #facc15;
}

.task-item__status[data-status="blocked"] {
  background: #f87171;
}

.task-item__status[data-status="skipped"] {
  background: var(--color-zinc-600);
}
```

---

## 6. Responsive Behavior

### Mobile (<640px)

- **Project card header:** Wraps to two rows. Summary text takes full width (minus chevron space). Meta badges/date/count wrap below the summary.
- **Description:** Truncates with ellipsis to keep collapsed cards compact (single line).
- **Chevron:** Positioned absolutely at top-right of the card header.
- **Task items:** Full width. Avatar, content, and status dot all fit comfortably even at 320px.
- **Cards:** Stack in a single column with `var(--space-4)` gap.

### Tablet (640px - 1023px)

- **Project card header:** Single row. Summary and meta sit side by side. Description shows in full.
- **Cards:** Single column, same as mobile. Project cards are content-heavy and don't benefit from two columns.
- **Task items:** No changes needed.

### Desktop (1024px+)

- **Cards:** Single column. Full-width cards look intentional at desktop widths because the expanded state needs the space for task item rows.
- **Section padding:** Increases to `var(--space-20)`.
- **No layout changes** from tablet -- the card just uses more horizontal space, which is fine.

---

## 7. Visual Consistency Checklist

This section maps every design decision to an existing pattern to ensure consistency:

| Element | Pattern Source | Matching Property |
|---------|---------------|-------------------|
| Card background | Tool card, Agent card | `var(--color-bg-card)` (zinc-900) |
| Card border | Tool card, Agent card | `1px solid var(--color-border)` (zinc-800) |
| Card border-radius | Tool card, Agent card | `var(--radius-lg)` (12px) |
| Card hover | Tool card, Agent card | `border-color: var(--color-zinc-700)` |
| Status badge (completed) | `tool-card__badge--live` | Same green-400 pill pattern |
| Section title/subtitle | All sections | Uses shared `.section-title` / `.section-subtitle` |
| Agent avatars | `.agent-card__avatar` | Same indigo circle + letter, smaller (32px vs 48px) |
| Agent role color | `.agent-card__role` | `var(--color-accent-hover)` (indigo-400) |
| Name text color | `.agent-card__name`, `.tool-card__name` | `var(--color-zinc-200)` |
| Body text color | `.agent-card__desc`, `.tool-card__desc` | `var(--color-text-secondary)` (zinc-400) |
| Section padding | All sections | `var(--space-16)` mobile, `var(--space-20)` desktop |
| Focus-visible | Global rule | `2px solid var(--color-accent)`, offset 2px |

---

## 8. Interaction Details

### Click to Expand

1. User clicks the project card header button
2. JS sets `aria-expanded="true"` on the button
3. JS sets `aria-hidden="false"` on `.project-card__details`
4. CSS transitions `grid-template-rows` from `0fr` to `1fr` over `0.3s ease`
5. Chevron rotates from `45deg` (pointing down) to `-135deg` (pointing up) over `0.3s ease`
6. Card border remains unchanged (no special expanded border color)

### Click to Collapse

1. User clicks the header button again
2. JS sets `aria-expanded="false"` on the button
3. JS sets `aria-hidden="true"` on `.project-card__details`
4. CSS transitions `grid-template-rows` from `1fr` to `0fr` over `0.3s ease`
5. Chevron rotates back to `45deg`
6. The inner content clips via `overflow: hidden` as the row shrinks

### Multiple Cards

Only one card can be expanded at a time. When the user clicks a different card header, the currently expanded card collapses first, then the clicked card expands. This prevents the page from becoming too long and keeps focus clear.

JS should handle this by: before expanding a card, find any card with `aria-expanded="true"` and collapse it. Both transitions happen simultaneously (0.3s).

### Keyboard Interaction

Because the header is a `<button>`, keyboard users can:
- **Tab** to navigate between project card headers
- **Enter** or **Space** to toggle expand/collapse
- No additional ARIA is needed beyond `aria-expanded` on the button and `aria-hidden` on the details panel

---

## 9. Error and Empty States

### Fetch Error

If `data/tasks.json` fails to load, display an inline message:

```html
<p class="tasks__error">Unable to load task history.</p>
```

```css
.tasks__error {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-8) 0;
}
```

### Empty Data

If the JSON loads but `projects` is an empty array, display:

```html
<p class="tasks__empty">No projects yet.</p>
```

Same styling as `.tasks__error`.

---

## 10. Complete CSS Reference

For Alice's convenience, here is the full set of new CSS rules to add to `css/styles.css`, in the order they should appear (between the Tools Section and Team Roster Section blocks):

```css
/* ===========================
   Tasks Section
   =========================== */

.tasks {
  background: var(--color-bg-primary);
  padding-top: var(--space-16);
  padding-bottom: var(--space-16);
}

@media (min-width: 1024px) {
  .tasks {
    padding-top: var(--space-20);
    padding-bottom: var(--space-20);
  }
}

.tasks__noscript,
.tasks__error,
.tasks__empty {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-8) 0;
}

/* Tasks List */

#tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Project Card */

.project-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color 0.2s ease;
}

.project-card:hover {
  border-color: var(--color-zinc-700);
}

/* Project Card Header (Button) */

.project-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-5);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}

.project-card__summary {
  flex: 1;
  min-width: 0;
}

.project-card__name {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
  margin-bottom: var(--space-1);
}

.project-card__desc {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 640px) {
  .project-card__desc {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }
}

/* Project Card Meta */

.project-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.project-card__badge {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.project-card__badge[data-status="completed"] {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.project-card__badge[data-status="in-progress"] {
  color: #facc15;
  background: rgba(250, 204, 21, 0.1);
}

.project-card__badge[data-status="planned"] {
  color: var(--color-zinc-400);
  background: rgba(161, 161, 170, 0.1);
}

.project-card__date,
.project-card__count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

/* Project Card Chevron */

.project-card__chevron {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin-left: var(--space-2);
  border-right: 2px solid var(--color-zinc-600);
  border-bottom: 2px solid var(--color-zinc-600);
  transform: rotate(45deg);
  transition: transform 0.3s ease;
}

.project-card__header[aria-expanded="true"] .project-card__chevron {
  transform: rotate(-135deg);
}

/* Project Card Details (Expand/Collapse) */

.project-card__details {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.project-card__details[aria-hidden="false"] {
  grid-template-rows: 1fr;
}

.project-card__details-inner {
  overflow: hidden;
  padding: 0 var(--space-5);
}

.project-card__details[aria-hidden="false"] .project-card__details-inner {
  padding-top: var(--space-4);
  padding-bottom: var(--space-5);
  border-top: 1px solid var(--color-border);
}

/* Task Item */

.task-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}

.task-item:last-child {
  border-bottom: none;
}

.task-item__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent-light);
  color: var(--color-accent-hover);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.task-item__content {
  flex: 1;
  min-width: 0;
}

.task-item__agent-line {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: 2px;
}

.task-item__agent {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
}

.task-item__role {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent-hover);
}

.task-item__title {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
}

.task-item__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 8px;
}

.task-item__status[data-status="completed"] {
  background: #4ade80;
}

.task-item__status[data-status="in-progress"] {
  background: #facc15;
}

.task-item__status[data-status="blocked"] {
  background: #f87171;
}

.task-item__status[data-status="skipped"] {
  background: var(--color-zinc-600);
}

/* Responsive: Mobile card layout */

@media (max-width: 639px) {
  .project-card {
    position: relative;
  }

  .project-card__header {
    flex-wrap: wrap;
  }

  .project-card__summary {
    flex-basis: calc(100% - 32px);
  }

  .project-card__meta {
    flex-basis: 100%;
    padding-top: var(--space-2);
  }

  .project-card__chevron {
    position: absolute;
    right: var(--space-5);
    top: var(--space-6);
  }
}
```
