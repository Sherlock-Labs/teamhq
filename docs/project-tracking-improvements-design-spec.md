# Project Tracking Improvements — Design Spec

## Section Placement

The Portfolio section sits between the existing Projects section (`#projects`) and the Meetings section (`#meetings`). It uses the same `<section>` + `<div class="container">` wrapper as all other sections.

HTML id: `portfolio`
Nav link text: `Portfolio` (add to nav bar between "Projects" and "Meetings")

---

## 1. Section Header & Summary Stats

### Heading
- Tag: `<h2>` with class `section-title`
- Text: "Portfolio"
- Subtitle `<p class="section-subtitle">`: "What the team has shipped."

### Stats Row (`.portfolio__stats`)
A horizontal row of 6 metric cards showing aggregate data.

**Layout:**
- `display: flex; flex-wrap: wrap; gap: var(--space-4);`
- Each stat card: `flex: 1 1 auto; min-width: 100px;`
- Desktop: all 6 in a row
- Tablet: wraps to 3 per row
- Mobile (< 640px): wraps to 2 per row

**Stat Card (`.portfolio__stat`):**
- `padding: var(--space-4);`
- `border: 1px solid var(--color-border);`
- `border-radius: var(--radius-lg);` (4px)
- `background: var(--color-bg-card);`
- No shadow

**Stat Number (`.portfolio__stat-value`):**
- `font-size: var(--text-2xl);` (1.5rem)
- `font-weight: var(--font-weight-bold);`
- `color: var(--color-text-primary);`
- `line-height: 1;`
- `margin-bottom: var(--space-1);`

**Stat Label (`.portfolio__stat-label`):**
- `font-size: var(--text-xs);`
- `font-weight: var(--font-weight-medium);`
- `color: var(--color-text-tertiary);`
- `text-transform: uppercase;`
- `letter-spacing: 0.05em;`

**Stat items (in order):**
1. Projects (total count)
2. Completed (completed count)
3. Agents (unique agent count)
4. Tasks (total tasks across all projects)
5. Files (total unique files changed across all projects)
6. Decisions (total decisions across all projects)

---

## 2. Project Cards (`.portfolio-card`)

### Card Container
- Vertical stack of cards with `gap: var(--space-3);` between them
- Container class: `.portfolio__list`

### Card (`.portfolio-card`)
- `background: var(--color-bg-card);`
- `border: 1px solid var(--color-border);`
- `border-radius: var(--radius-lg);` (4px)
- `transition: border-color 0.15s ease;`
- No shadow

**Hover:** `border-color: var(--color-accent);`

**Expanded state** (when `aria-expanded="true"`):
- `border-left: 3px solid var(--color-accent);`
- (Matches existing project-card expanded treatment)

### Card Header (`.portfolio-card__header`)
A `<button>` element for accessibility.

**Layout:** `display: flex; align-items: center; gap: var(--space-4); padding: var(--space-5);`
- Full width, transparent background, no border, cursor pointer

**Left side (`.portfolio-card__info`):** `flex: 1; min-width: 0;`

**Project Name (`.portfolio-card__name`):**
- `font-size: var(--text-base);`
- `font-weight: var(--font-weight-semibold);`
- `color: var(--color-text-primary);`
- `margin-bottom: var(--space-1);`

**Project Description (`.portfolio-card__desc`):**
- `font-size: var(--text-sm);`
- `line-height: var(--leading-relaxed);`
- `color: var(--color-text-secondary);`
- Desktop: full text visible
- Mobile: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`

**Right side (`.portfolio-card__meta`):** `display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0;`

Contains:
1. **Agent Avatars (`.portfolio-card__avatars`):**
   - Horizontal overlapping row
   - Each avatar: `width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--color-bg-card);`
   - Overlap: `margin-left: -6px;` (first child: `margin-left: 0;`)
   - Use `<img>` tags with `src="img/avatars/{name}.svg"`
   - Max 5 shown. If more, show "+N" overflow indicator:
     - `.portfolio-card__avatar-overflow`: same 24px circle, `background: var(--color-neutral-200); color: var(--color-text-secondary); font-size: 10px; font-weight: var(--font-weight-semibold); display: flex; align-items: center; justify-content: center;`

2. **Status Badge:** Same exact treatment as existing `.project-card__badge`:
   - Completed: green text on green-10% background
   - In Progress: warning text on warning-10% background
   - Planned: secondary text on black-4% background
   - Same pill shape (9999px radius), same typography (text-xs, medium weight, uppercase, 0.05em spacing)

3. **Date (`.portfolio-card__date`):**
   - `font-size: var(--text-xs); color: var(--color-text-tertiary);`
   - Show completion date for completed, empty for in-progress

4. **Chevron (`.portfolio-card__chevron`):** Same treatment as existing `.project-card__chevron`:
   - 12x12px, 2px borders, `rotate(45deg)` default, `rotate(-135deg)` when expanded
   - `transition: transform 0.3s ease;`

**Responsive (< 640px):**
- Header becomes: `flex-wrap: wrap;`
- Agent avatars hidden on mobile (saves space)
- Meta items wrap below the info section

---

## 3. Card Expanded Content (`.portfolio-card__details`)

Uses the same `grid-template-rows` animation pattern:

```
.portfolio-card__details {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}
.portfolio-card__details[aria-hidden="false"] {
  grid-template-rows: 1fr;
}
.portfolio-card__details-inner {
  overflow: hidden;
}
.portfolio-card__details[aria-hidden="false"] .portfolio-card__details-inner {
  padding: var(--space-4) var(--space-5) var(--space-5);
  border-top: 1px solid var(--color-border);
}
```

### 3a. Per-Project Metrics Row (`.portfolio-card__metrics`)

A compact inline metrics display at the top of the expanded content.

**Layout:** `display: flex; gap: var(--space-6); margin-bottom: var(--space-5); padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border);`

Each metric (`.portfolio-card__metric`):
- `display: flex; align-items: baseline; gap: var(--space-1);`
- Number: `font-size: var(--text-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);`
- Label: `font-size: var(--text-xs); color: var(--color-text-tertiary);`

Metrics: "N tasks", "N files", "N decisions"

### 3b. Task List

Reuses the exact same `.task-item` patterns from existing styles.css. Each task row:

- `.task-item` with border-bottom separator
- `.task-item__header` as `<button>` (if expandable) or `<div>` (if no details)
- `.task-item__avatar`: 32px circle. Use `<img>` tag with agent SVG avatar instead of initial letter.
- `.task-item__content`: agent name, role, task title
- `.task-item__status`: 8px colored dot
- `.task-item__chevron`: 8px, if expandable

Nested expansion (`.task-item__details`) uses existing grid-template-rows pattern.

Expanded task details show:
- **Subtasks** (`.task-item__subtasks`): bulleted list, text-xs, secondary color, small dot bullets
- **Files Changed** (`.task-item__files`): label "Files changed" + mono-font pills
- **Decisions** (`.task-item__decisions`): label "Decisions" + bulleted list with square markers

All of these reuse the EXACT existing CSS classes from styles.css. No new classes needed for task details.

**Important:** Nested task expansion is independent — expanding one task does NOT collapse others. Only the project-level accordion is one-at-a-time.

### 3c. Contributors Summary (`.portfolio-card__contributors`)

Below the task list, separated by a border-top.

**Layout:**
- `padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);`
- Label: "Contributors" using `.task-item__detail-label` style (text-xs, semibold, secondary, uppercase)
- Contributor list: `display: flex; flex-wrap: wrap; gap: var(--space-4);`

Each contributor (`.portfolio-card__contributor`):
- `display: flex; align-items: center; gap: var(--space-2);`
- Avatar: 20px circle with agent SVG
- Name: `font-size: var(--text-xs); font-weight: var(--font-weight-medium); color: var(--color-text-primary);`
- Summary: `font-size: var(--text-xs); color: var(--color-text-tertiary);` (e.g., "5 subtasks, 3 files")

Ordered by subtask count (most active first).

### 3d. Key Decisions Rollup (`.portfolio-card__decisions-rollup`)

Below contributors, separated by a border-top. **Collapsed by default.**

**Toggle Header (`.portfolio-card__decisions-toggle`):**
- `<button>` element
- `display: flex; align-items: center; gap: var(--space-2);`
- `padding: var(--space-3) 0;`
- Text: "Key Decisions (N)" — text-sm, semibold, text-primary
- Chevron: 8px, same pattern as task-item chevron
- Full width, transparent bg, pointer cursor

**Content:** Grid-template-rows animation, collapsed by default.
- Each decision: `font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: var(--space-2); padding-left: var(--space-4);`
- Agent attribution: `font-weight: var(--font-weight-semibold); color: var(--color-text-primary);` as a prefix (e.g., "Andrei — Plain HTML/CSS over any framework...")
- Same diamond marker as existing decisions list (`::before` with 6px bordered square)

If a project has zero decisions, this section is omitted entirely.

---

## 4. Responsive Breakpoints

### Mobile (< 640px)
- Stats: 2 per row
- Card header: description truncated with ellipsis
- Agent avatars in card header: hidden
- Meta items stack below info
- Task items: full width, no changes needed (already compact)

### Tablet (640px - 1023px)
- Stats: 3 per row
- Card header: full description shown
- Agent avatars visible
- Everything else same as desktop

### Desktop (1024px+)
- Stats: all 6 in a row
- Full layout as described above

---

## 5. Accessibility

- Portfolio section: `aria-labelledby="portfolio-heading"`
- Project card headers: `<button>` with `aria-expanded="true/false"`
- Card details: `aria-hidden="true/false"`
- Task headers (when expandable): `<button>` with `aria-expanded="true/false"`
- Task details: `aria-hidden="true/false"`
- Decisions toggle: `<button>` with `aria-expanded="true/false"`
- All interactive elements: `focus-visible` outline: `2px solid var(--color-accent); outline-offset: 2px;`
- Keyboard: Enter/Space toggle all accordion buttons
- Agent avatar images: `alt=""` (decorative, agent name is in adjacent text)
- Reduced motion: respect `prefers-reduced-motion` by disabling grid-template-rows transitions

---

## 6. Animation Specs

All animations follow existing patterns:
- **Card expand/collapse:** `grid-template-rows 0.3s ease` (matches project-card)
- **Task expand/collapse:** `grid-template-rows 0.25s ease` (matches task-item)
- **Decisions expand/collapse:** `grid-template-rows 0.25s ease`
- **Card hover border:** `border-color 0.15s ease`
- **Chevron rotation:** `transform 0.3s ease` (card-level), `transform 0.25s ease` (task/decision-level)

---

## 7. Sort Order

Projects are sorted:
1. In-progress projects first (newest first by id)
2. Completed projects next (newest completedDate first)
3. Planned projects last
