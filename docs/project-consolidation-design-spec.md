# Project Consolidation — Design Spec

**Author:** Robert (Product Designer)
**Status:** Draft
**Date:** 2026-02-09
**Depends on:** [project-consolidation-requirements.md](./project-consolidation-requirements.md), [project-consolidation-tech-approach.md](./project-consolidation-tech-approach.md)

---

## Overview

This spec defines the visual and interaction design for merging the Projects and Portfolio sections into a single unified project section. The goal is straightforward: one section, one mental model, no duplicate views. Projects that have pipeline data show it; projects that do not stay clean.

The design philosophy is **additive layering** — the existing project card and detail view are the base, and pipeline elements layer on top conditionally. Nothing changes for projects with no pipeline history.

---

## 1. Summary Stats Row

### Placement

The stats row sits between the toolbar (section title + "New Project" button) and the project list. It provides a glanceable overview of the team's total output across all projects.

```
+--------------------------------------------------+
| Projects                        [+ New Project]   |
+--------------------------------------------------+
| 18 Projects | 14 Completed | 12 Agents | ...      |
+--------------------------------------------------+
| [project cards...]                                 |
+--------------------------------------------------+
```

### Content

Six metric cards, in this fixed order:

| # | Label | Value Source |
|---|-------|-------------|
| 1 | Projects | Total project count |
| 2 | Completed | Projects with `status: "completed"` |
| 3 | Agents | Count of unique agent names across all pipeline tasks |
| 4 | Tasks | Total pipeline tasks across all projects |
| 5 | Files | Total `filesChanged` entries across all pipeline tasks |
| 6 | Decisions | Total `decisions` entries across all pipeline tasks |

### Visual Treatment

Reuse the existing Portfolio stats card pattern with renamed CSS classes (`projects__stats`, `projects__stat`, `projects__stat-value`, `projects__stat-label`). The styling is identical — the rename is for namespace clarity.

**Each stat card:**
- Border: `1px solid var(--color-border)`
- Border radius: `var(--radius-lg)` (4px)
- Background: `var(--color-bg-card)` (white)
- Padding: `var(--space-4)` (16px)
- Value: `var(--text-2xl)` (24px), `var(--font-weight-bold)`, `var(--color-text-primary)`, `line-height: 1`
- Label: `var(--text-xs)` (12px), `var(--font-weight-medium)`, `var(--color-text-tertiary)`, uppercase, `letter-spacing: 0.05em`
- Value sits above label with `var(--space-1)` (4px) gap

### Layout

- Container: `display: flex; flex-wrap: wrap; gap: var(--space-4);`
- Each stat: `flex: 1 1 auto; min-width: 100px;`
- Margin bottom: `var(--space-6)` (24px) to separate from project cards below

### Responsive Behavior

- **Desktop (1024px+):** All 6 stats in a single row
- **Tablet (640px-1023px):** Wraps naturally — typically 4+2 or 3+3 depending on container width
- **Mobile (<640px):** 2 per row — `min-width: calc(50% - var(--space-4))`

### Visibility Rules

- **Hidden** when there are zero projects (empty state shows "No projects yet" instead)
- **Visible** when at least one project exists
- Stats update on any list re-render (project create, delete, or status change)
- Agents/Tasks/Files/Decisions may all be 0 if no projects have pipeline data — that is fine, the stats row still shows. It simply reads "0 Tasks" etc.

### Container HTML

```html
<div class="projects__stats" id="projects-stats" aria-label="Project summary statistics"></div>
```

The container lives in the DOM at all times. When hidden (no projects), it is simply empty. JS populates it with stat cards when projects exist.

---

## 2. Unified Project Card

### Design Principle

The project card is the base. Pipeline elements are layered on conditionally.

- **Without pipeline data:** The card looks exactly like it does today — name, description, status badge, date, running indicator, edit/delete actions, chevron.
- **With pipeline data:** The card gains an agent avatar cluster and a pipeline stat line, placed within the existing card header layout.

### Card Anatomy (With Pipeline Data)

```
+------------------------------------------------------------------+
| [header button]                                          [actions]|
|  Project Name                                                     |
|  Description text that may truncate on mobile...                  |
|  [avatar][avatar][avatar][+2]  3 tasks  12 files    [badge] date |
|                                                           [chevron]|
+------------------------------------------------------------------+
```

### Card Anatomy (Without Pipeline Data)

```
+------------------------------------------------------------------+
| [header button]                                          [actions]|
|  Project Name                                                     |
|  Description text...                                              |
|                                           [running dot] [badge] date |
|                                                           [chevron]|
+------------------------------------------------------------------+
```

### Avatar Cluster

Shown only when `pipeline.taskCount > 0` (from precomputed list endpoint stats).

- **Placement:** Within the `.project-card__meta` area, before the status badge. On the same line as badge and date.
- **Max shown:** 5 avatars
- **Overflow:** `+N` pill when more than 5 unique agents contributed
- **Avatar size:** 24x24px, circular, `border: 2px solid var(--color-bg-card)` (white border for stacking)
- **Stacking:** Negative margin (`margin-left: -6px`) creates the overlapping cluster effect. First avatar has `margin-left: 0`.
- **Overflow pill:** Same size as avatars (24x24px circle), `background: var(--color-neutral-200)`, `color: var(--color-text-secondary)`, `font-size: 10px`, `font-weight: var(--font-weight-semibold)`, white border matching avatars

**CSS classes (new, on the project card):**
- `.project-card__avatars` — flex container
- `.project-card__avatar` — individual avatar image
- `.project-card__avatar-overflow` — the `+N` overflow pill

These reuse the exact same CSS values as the current `.portfolio-card__avatar*` classes, just with the `project-card__` prefix.

### Pipeline Stat Counts

Shown only when `pipeline.taskCount > 0`.

- **Placement:** Within the `.project-card__meta` area, between avatars and status badge
- **Format:** Inline text, e.g., `3 tasks  12 files`
- **Show:** Task count and file count. Decision count is omitted from the card header to avoid clutter — it appears in the detail view.
- **Style:** `var(--text-xs)`, `var(--color-text-tertiary)`, `white-space: nowrap`
- **CSS class:** `.project-card__pipeline-stats` — a span containing the counts

### Running Session Indicator

Preserved unchanged. The green pulsing dot (`project-card__running-indicator`) appears before the status badge when `activeSessionId` is non-null.

### Card Sorting

Unchanged from current behavior:
1. `in-progress` first
2. `planned` second
3. `completed` third
4. Within each group: sorted by `updatedAt` descending

### Expand/Collapse

Unchanged. One-at-a-time accordion behavior. Clicking a card header expands it and collapses any previously expanded card.

### Mobile (<640px)

- Avatar cluster is **hidden** on mobile (matches current portfolio behavior — `display: none` below 640px)
- Pipeline stat counts remain visible (they are small text and fit fine)
- Card layout wraps as it does today: summary takes full width minus chevron space, meta row wraps below

---

## 3. Unified Detail View — Section Order

When a project card is expanded, the detail view renders inside `.project-card__details-inner`. The section order is:

```
1. Goals / Constraints / Brief         (existing — unchanged)
2. Dates                               (existing — unchanged)
3. Action Area (Start Work / Session)   (existing — unchanged)
4. Session Log Container                (existing — unchanged)
5. Session History Container            (existing — unchanged)
6. Pipeline Section                     (NEW — conditional)
7. Progress Notes                       (existing — unchanged)
8. Data Section (Spreadsheets)          (existing — unchanged)
```

### Pipeline Section Placement Rationale

The Pipeline section goes **between session history and progress notes**. This ordering reflects the information hierarchy:

- Session-related content (controls, live log, history) groups together at the top — it is the most time-sensitive.
- Pipeline section represents the structured pipeline history — which agents did what, what files changed, what decisions were made. It is a retrospective view.
- Progress notes are freeform, chronological entries — they sit at the bottom as a running log.
- Data/spreadsheets are supplementary and remain last.

### Conditional Rendering

The Pipeline section renders **only when the project has pipeline tasks** (`pipeline.tasks` array is non-empty on the full detail response). If a project has no pipeline data:

- No Pipeline section header
- No empty pipeline placeholder
- No "No pipeline data" message

The detail view simply skips from session history to progress notes, identical to how it looks today. Clean, no clutter.

---

## 4. Pipeline Section Design

### Section Header

```
Pipeline
7 tasks | 10 files | 24 decisions
```

- **Label:** "Pipeline" — rendered as a `.detail__label` (same style as "Progress Notes" label)
- **Metrics row:** Inline metrics showing task count, file count, decision count
- **Separator:** Top border (`1px solid var(--color-border)`) with `var(--space-5)` padding-top and `var(--space-5)` margin-top to visually separate from session history above

**CSS class:** `.pipeline__section` — wrapper for the entire pipeline block

### Pipeline Metrics Row

```html
<div class="pipeline__metrics">
  <div class="pipeline__metric">
    <span class="pipeline__metric-value">7</span>
    <span class="pipeline__metric-label">tasks</span>
  </div>
  <div class="pipeline__metric">
    <span class="pipeline__metric-value">10</span>
    <span class="pipeline__metric-label">files</span>
  </div>
  <div class="pipeline__metric">
    <span class="pipeline__metric-value">24</span>
    <span class="pipeline__metric-label">decisions</span>
  </div>
</div>
```

**Styling (identical to current portfolio metrics, renamed):**
- Container: `display: flex; gap: var(--space-6); margin-bottom: var(--space-5); padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border);`
- Each metric: `display: flex; align-items: baseline; gap: var(--space-1);`
- Value: `var(--text-sm)`, `var(--font-weight-semibold)`, `var(--color-text-primary)`
- Label: `var(--text-xs)`, `var(--color-text-tertiary)`

### Task List

Each pipeline task renders as a `.task-item` — the exact same component used in the current portfolio detail view. No visual changes to the task item itself.

```
[avatar] Agent Name  Role                              [status dot]  [v]
         Task title text here...
```

**Task item structure (unchanged):**
- `.task-item` — outer wrapper, `border-bottom: 1px solid var(--color-border)`, last child has no bottom border
- `.task-item__header` — flex row: avatar, content, status indicator, chevron
- `.task-item__avatar` — 32x32px circle with agent avatar SVG image
- `.task-item__content` — flex column: agent line (name + role) and task title
- `.task-item__agent` — `var(--text-sm)`, `var(--font-weight-semibold)`
- `.task-item__role` — `var(--text-xs)`, `var(--color-text-tertiary)`
- `.task-item__title` — `var(--text-sm)`, `var(--color-text-secondary)`
- `.task-item__status` — colored dot indicating task status:
  - `completed`: `var(--color-status-success)` (green)
  - `in-progress`: `var(--color-status-warning)` (yellow/amber)
  - `blocked`: `var(--color-status-error)` (red)
  - `pending` / `skipped`: `var(--color-neutral-300)` (gray)
- `.task-item__chevron` — only present when the task has expandable details (subtasks, files, or decisions)

### Expandable Task Details

Each task item is independently expandable (nested accordion, independent of the parent card accordion). A task is expandable when it has at least one of: subtasks, filesChanged, or decisions.

**Interaction:**
- Expandable task headers are rendered as `<button>` with `aria-expanded="false"`
- Click toggles `aria-expanded` and the details panel's `aria-hidden`
- Each task expands/collapses independently — multiple tasks can be open simultaneously
- Non-expandable tasks render the header as a `<div>` (no button, no chevron, not clickable)

**Details panel (`.task-item__details`):**

Uses the CSS grid expand/collapse pattern: `display: grid; grid-template-rows: 0fr` collapsed, `1fr` expanded. Inner content sits in `.task-item__details-inner` with `overflow: hidden`.

Three optional subsections, rendered in order if they have data:

1. **Subtasks** (`.task-item__subtasks`)
   - Unordered list
   - `var(--text-xs)`, `var(--color-text-secondary)`
   - Custom bullet: `::before` pseudo-element, small green circle (`var(--color-accent)`, 6x6px)

2. **Files Changed** (`.task-item__files`)
   - Section label: "Files changed" — `.task-item__detail-label` (`var(--text-xs)`, `var(--font-weight-semibold)`, `var(--color-text-tertiary)`, uppercase, `letter-spacing: 0.05em`)
   - File pills: `.task-item__file-pill` — inline code-style pills
     - `var(--font-mono)`, `var(--text-xs)`, `var(--color-text-secondary)`
     - `background: rgba(0, 0, 0, 0.04)`, `border-radius: var(--radius-sm)` (4px)
     - `padding: 2px var(--space-2)`, inline-flex layout
     - Wrap naturally within the container

3. **Decisions** (`.task-item__decisions`)
   - Section label: "Decisions" — same `.task-item__detail-label` style
   - Unordered list
   - `var(--text-xs)`, `var(--color-text-secondary)`
   - Custom bullet: `::before` pseudo-element, small square outline (`1.5px solid var(--color-neutral-400)`, 6x6px, `border-radius: 2px`)

### Contributors Summary

Appears below the task list, separated by a top border.

```
Contributors
[avatar] Thomas    8 subtasks, 3 files
[avatar] Alice     14 subtasks, 12 files
[avatar] Jonah     6 subtasks, 10 files
```

**Structure:**

```html
<div class="pipeline__contributors">
  <span class="task-item__detail-label">Contributors</span>
  <div class="pipeline__contributors-list">
    <div class="pipeline__contributor">
      <img class="pipeline__contributor-avatar" src="img/avatars/thomas.svg" alt="" width="20" height="20">
      <span class="pipeline__contributor-name">Thomas</span>
      <span class="pipeline__contributor-summary">8 subtasks, 3 files</span>
    </div>
    ...
  </div>
</div>
```

**Styling (renamed from portfolio-card__ to pipeline__):**
- `.pipeline__contributors`: `padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);`
- `.pipeline__contributors-list`: `display: flex; flex-wrap: wrap; gap: var(--space-4);`
- `.pipeline__contributor`: `display: flex; align-items: center; gap: var(--space-2);`
- `.pipeline__contributor-avatar`: `20x20px`, circular, `flex-shrink: 0`
- `.pipeline__contributor-name`: `var(--text-xs)`, `var(--font-weight-medium)`, `var(--color-text-primary)`
- `.pipeline__contributor-summary`: `var(--text-xs)`, `var(--color-text-tertiary)`

**Sorting:** Contributors sorted by subtask count descending (most active contributor first).

### Key Decisions Rollup

Appears below contributors, separated by a top border. **Collapsed by default.**

```
Key Decisions (24)                                            [v]
  > Thomas — Merge-on-read over single-file-per-project...
  > Alice — Reuse existing task-item components...
  > Jonah — Express API for project CRUD...
```

**Structure:**

```html
<div class="pipeline__decisions-rollup">
  <button class="pipeline__decisions-toggle" type="button" aria-expanded="false">
    <span class="pipeline__decisions-toggle-text">Key Decisions (24)</span>
    <span class="pipeline__decisions-toggle-chevron" aria-hidden="true"></span>
  </button>
  <div class="pipeline__decisions-content" aria-hidden="true">
    <div class="pipeline__decisions-content-inner">
      <ul class="pipeline__decisions-list">
        <li>
          <strong class="pipeline__decision-agent">Thomas</strong> — Decision text here...
        </li>
        ...
      </ul>
    </div>
  </div>
</div>
```

**Styling (renamed from portfolio-card__ to pipeline__):**
- `.pipeline__decisions-rollup`: `padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--color-border);`
- `.pipeline__decisions-toggle`: Full-width button, `display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) 0;`, transparent background, no border, cursor pointer
- `.pipeline__decisions-toggle:focus-visible`: `outline: 2px solid var(--color-accent); outline-offset: 2px;`
- `.pipeline__decisions-toggle-text`: `var(--text-sm)`, `var(--font-weight-semibold)`, `var(--color-text-primary)`
- `.pipeline__decisions-toggle-chevron`: 8x8px chevron using border trick (`1.5px solid var(--color-neutral-400)`), rotates from 45deg (collapsed) to -135deg (expanded) with `0.25s ease` transition
- `.pipeline__decisions-content`: CSS grid expand/collapse (`grid-template-rows: 0fr` / `1fr`), `0.25s ease` transition
- `.pipeline__decisions-list li`: `var(--text-xs)`, `var(--color-text-secondary)`, custom square bullet (outline, `var(--color-neutral-400)`)
- `.pipeline__decision-agent`: `var(--font-weight-semibold)`, `var(--color-text-primary)`

**Interaction:**
- Click toggle button to expand/collapse
- Default state: collapsed (`aria-expanded="false"`, content `aria-hidden="true"`)
- Independent of task item accordions and the parent card accordion

---

## 5. Transition Treatment — Removing Portfolio

### What Gets Removed

1. **Nav link:** The `<a href="#portfolio" class="nav__link">Portfolio</a>` is deleted from the navigation bar. The nav reads: Tools, Projects, Meetings, Docs, Spreadsheets, Team, How It Works.

2. **Section:** The entire `<section class="portfolio" id="portfolio">` block is deleted from `index.html`, including the stats container, list container, and noscript fallback.

3. **Script tag:** `<script src="js/portfolio.js" defer></script>` is removed.

4. **JS file:** `js/portfolio.js` is deleted after its rendering logic has been merged into `projects.js`.

5. **CSS heading rule:** The `#portfolio-heading::before` rule (currently `display: none`) is removed.

6. **Section divider:** The `.portfolio` entry in the border-top rule (line 57 area) is removed.

### What About Bookmarks or Deep Links?

There is no redirect or notice needed. The Portfolio section was only accessible via the nav link and scroll. There are no external URLs pointing to `#portfolio` — this is a local landing page. If someone has a browser bookmark to `index.html#portfolio`, the anchor simply will not resolve and the page will load at the top, which is fine.

### No "Portfolio Moved" Notice

No transition notice, toast, or banner. The consolidation is a simplification — users will see all the same data in the Projects section. There is no loss of functionality to call attention to.

---

## 6. Empty States

### No Projects at All

When the project list is empty (zero projects), the existing empty state renders unchanged:

```
No projects yet.
Click "New Project" to get started.
```

The stats row is hidden (empty container). No pipeline-related UI appears.

### Project With No Pipeline Data

The project card shows its standard layout — name, description, status badge, date, running indicator, edit/delete, chevron. No avatar cluster, no pipeline stat counts, no empty "0 tasks" text.

In the detail view, the Pipeline section is simply absent. The detail view flows directly from session history to progress notes. There is no "No pipeline data" placeholder, no "Pipeline will appear when agents contribute" hint. The absence is clean and intentional — it avoids suggesting the user needs to do something.

### Project With Pipeline Data But No Decisions

The decisions rollup is hidden. The Pipeline section shows the metrics row (with `0 decisions`), the task list, and the contributors summary. The key decisions toggle does not appear.

### Project With Pipeline Data But No Contributors (Edge Case)

If somehow all tasks have zero subtasks and zero files (e.g., tasks with only decisions), the contributors section is hidden. This is unlikely but handled gracefully.

---

## 7. Responsive Behavior

### Stats Row

| Breakpoint | Layout |
|---|---|
| 1024px+ | 6 stats in one row |
| 640px-1023px | Natural flex wrap (typically 4+2 or 3+3) |
| <640px | 2 per row (`min-width: calc(50% - var(--space-4))`) |

### Project Card — Avatar Cluster

| Breakpoint | Behavior |
|---|---|
| 640px+ | Visible, max 5 avatars + overflow |
| <640px | Hidden (`display: none`) |

Avatar cluster is hidden on mobile because the card header already wraps to multiple lines, and stacked avatars compete with the status badge and date for limited horizontal space.

### Project Card — Pipeline Stat Counts

| Breakpoint | Behavior |
|---|---|
| 640px+ | Visible inline with meta |
| <640px | Visible, wraps with meta row |

The stat counts are small text and fit fine on mobile within the meta row.

### Pipeline Section (Detail View)

| Breakpoint | Behavior |
|---|---|
| 640px+ | Full layout, contributors wrap naturally via flexbox |
| <640px | Full-width stacking, contributors stack vertically if needed |

Specific mobile considerations:

- **Pipeline metrics row:** Flex with wrap. On narrow screens the three metrics may wrap to a second line. This is acceptable — the flex gap handles spacing.
- **Task items:** Already mobile-friendly. The avatar, content, and status indicator use flex with `align-items: flex-start`, so the content wraps naturally. File pills wrap to multiple lines.
- **Contributors list:** `flex-wrap: wrap` handles narrow screens. Each contributor card is small enough to fit 2 per row on most phones.
- **Decisions rollup:** Text-only list, inherently responsive. No layout changes needed.

### Reduced Motion

All new animated elements respect `prefers-reduced-motion: reduce`:
- Pipeline decisions toggle chevron rotation: `transition: none`
- Pipeline decisions content expand/collapse: `transition: none`
- Task item details expand/collapse: Already covered by existing reduced-motion rules in `styles.css`

Add to the existing `@media (prefers-reduced-motion: reduce)` block:

```css
.pipeline__decisions-content {
  transition: none;
}

.pipeline__decisions-toggle-chevron {
  transition: none;
}
```

---

## 8. Accessibility

### Stats Row

- Container has `aria-label="Project summary statistics"` for screen readers
- Each stat is a plain `<div>` — no interactive role needed, the content is self-describing (value + label)
- No focus management needed — stats are informational, not interactive

### Project Card — Avatar Cluster

- Each avatar `<img>` has `alt=""` (decorative — the agent names are not conveyed via avatars in the card header; they appear in the detail view task list where they have full text labels)
- Overflow pill (`+N`) is also decorative in this context
- The avatars container has no ARIA role — it is supplementary visual information

### Project Card — Pipeline Stats

- The pipeline stat text ("3 tasks  12 files") is plain text within the card header button, so it is read by screen readers as part of the button's accessible name
- No additional ARIA needed

### Pipeline Section — Task List

Task items with expandable details use the existing accessible pattern:

- Expandable headers are `<button type="button">` elements with `aria-expanded="false"|"true"`
- Details panels have `aria-hidden="true"|"false"` matching the expanded state
- Status indicator has `aria-label` set to the formatted status text (e.g., "Completed", "In Progress")
- Non-expandable task headers are `<div>` elements (no button role, no keyboard interaction — they are static content)

### Pipeline Section — Decisions Toggle

- The toggle is a `<button type="button">` with `aria-expanded="false"|"true"`
- The content panel has `aria-hidden="true"|"false"`
- `focus-visible` outline: `2px solid var(--color-accent), outline-offset: 2px`
- Toggle text includes the count (e.g., "Key Decisions (24)") so screen readers know how many items are behind the toggle

### Keyboard Navigation

All new interactive elements are natively keyboard accessible:

- **Task item headers** (when expandable): Focusable `<button>`, activated via Enter or Space
- **Decisions toggle**: Focusable `<button>`, activated via Enter or Space
- **Tab order**: Follows DOM order within the detail view, which is logical (task items top-to-bottom, then contributors, then decisions toggle)

### Color Contrast

All text meets WCAG 2.1 AA minimum contrast (4.5:1 for normal text, 3:1 for large text):

- Stat values: `var(--color-text-primary)` (#171717) on white = 18.4:1
- Stat labels: `var(--color-text-tertiary)` (#999999) on white = 2.8:1 — **Note:** This is below 4.5:1 but matches the existing Portfolio stats. These labels are paired with large bold values that provide context. For this spec, we maintain visual parity with the existing design. If this needs to be addressed, it should be done as a global token update across all uses of `--color-text-tertiary` as a follow-up.
- Pipeline metric labels: Same as stat labels (same token, same consideration)
- Task item agent name: `var(--font-weight-semibold)` on `var(--color-text-primary)` = full contrast
- Task item role: `var(--color-text-tertiary)` — same consideration as stat labels
- Decision text: `var(--color-text-secondary)` (#666666) on white = 5.7:1 (passes AA)
- Decision agent name: `var(--color-text-primary)` = full contrast

---

## 9. CSS Class Mapping

For Alice's reference — the full mapping from old portfolio classes to new classes.

### Stats (section-level)

| Old Class | New Class |
|---|---|
| `.portfolio__stats` | `.projects__stats` |
| `.portfolio__stat` | `.projects__stat` |
| `.portfolio__stat-value` | `.projects__stat-value` |
| `.portfolio__stat-label` | `.projects__stat-label` |

### Card Avatar Cluster (on project card header)

| Old Class | New Class |
|---|---|
| `.portfolio-card__avatars` | `.project-card__avatars` |
| `.portfolio-card__avatar` | `.project-card__avatar` |
| `.portfolio-card__avatar-overflow` | `.project-card__avatar-overflow` |

### Pipeline Detail Section (inside project detail view)

| Old Class | New Class |
|---|---|
| `.portfolio-card__metrics` | `.pipeline__metrics` |
| `.portfolio-card__metric` | `.pipeline__metric` |
| `.portfolio-card__metric-value` | `.pipeline__metric-value` |
| `.portfolio-card__metric-label` | `.pipeline__metric-label` |
| `.portfolio-card__contributors` | `.pipeline__contributors` |
| `.portfolio-card__contributors-list` | `.pipeline__contributors-list` |
| `.portfolio-card__contributor` | `.pipeline__contributor` |
| `.portfolio-card__contributor-avatar` | `.pipeline__contributor-avatar` |
| `.portfolio-card__contributor-name` | `.pipeline__contributor-name` |
| `.portfolio-card__contributor-summary` | `.pipeline__contributor-summary` |
| `.portfolio-card__decisions-rollup` | `.pipeline__decisions-rollup` |
| `.portfolio-card__decisions-toggle` | `.pipeline__decisions-toggle` |
| `.portfolio-card__decisions-toggle-text` | `.pipeline__decisions-toggle-text` |
| `.portfolio-card__decisions-toggle-chevron` | `.pipeline__decisions-toggle-chevron` |
| `.portfolio-card__decisions-content` | `.pipeline__decisions-content` |
| `.portfolio-card__decisions-content-inner` | `.pipeline__decisions-content-inner` |
| `.portfolio-card__decisions-list` | `.pipeline__decisions-list` |
| `.portfolio-card__decision-agent` | `.pipeline__decision-agent` |

### Unchanged (Reused As-Is)

All `.task-item*` classes remain unchanged. They are already generic and not namespaced to portfolio:
- `.task-item`, `.task-item__header`, `.task-item__avatar`, `.task-item__content`, `.task-item__agent-line`, `.task-item__agent`, `.task-item__role`, `.task-item__title`, `.task-item__status`, `.task-item__chevron`, `.task-item__details`, `.task-item__details-inner`, `.task-item__subtasks`, `.task-item__files`, `.task-item__file-list`, `.task-item__file-pill`, `.task-item__decisions`, `.task-item__detail-label`, `.task-item--expandable`

### Deleted (No Replacement Needed)

Portfolio card-level and section-level classes that are replaced by existing project-card equivalents:
- `.portfolio`, `.portfolio__list`, `.portfolio__empty`, `.portfolio__error`, `.portfolio__noscript`
- `.portfolio-card`, `.portfolio-card__header`, `.portfolio-card__info`, `.portfolio-card__name`, `.portfolio-card__desc`, `.portfolio-card__meta`, `.portfolio-card__badge`, `.portfolio-card__date`, `.portfolio-card__chevron`, `.portfolio-card__details`, `.portfolio-card__details-inner`, `.portfolio-card__task-list`

---

## 10. New CSS Class — `.pipeline__section`

One new class not derived from a rename:

```css
.pipeline__section {
  padding-top: var(--space-5);
  margin-top: var(--space-5);
  border-top: 1px solid var(--color-border);
}
```

This wraps the entire pipeline block (header, metrics, task list, contributors, decisions) within the detail view. It provides the visual separation from the session history above.

---

## 11. New CSS Class — `.project-card__pipeline-stats`

```css
.project-card__pipeline-stats {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}
```

This is the inline stat text shown on the card header (e.g., "3 tasks  12 files"). It sits within `.project-card__meta`, between the avatar cluster and the status badge.

---

## 12. Visual Parity Verification

After implementation, the pipeline section within the project detail view should be visually identical to the current portfolio expanded card view. The only differences:

1. **Context:** Pipeline content is inside a project card detail view (which also has goals, sessions, notes) rather than inside a standalone portfolio card
2. **Header:** The pipeline section has a "Pipeline" label and metrics row instead of being the only content in the card
3. **CSS class names:** Renamed from `portfolio-card__*` to `pipeline__*` — same CSS values

Everything else — task item layout, avatar sizes, status dots, chevron animations, expand/collapse behavior, contributor cards, decisions rollup — should be pixel-identical to the current portfolio rendering.

---

## 13. Implementation Checklist for Alice

This is the recommended order:

1. **HTML changes** — Remove portfolio section, nav link, script tag. Add `#projects-stats` container.
2. **Stats row** — Port `computeStats()` and `renderStats()` from portfolio.js into projects.js (renamed). Wire to `#projects-stats` container after project list loads.
3. **Card enhancements** — Update `renderCard()` to include avatar cluster and pipeline stat counts when `pipeline.taskCount > 0`. Use precomputed stats from the list API response.
4. **Detail view pipeline section** — Add `renderPipelineSection()` to projects.js. Insert into `renderDetailView()` between session history container and progress notes div. Only render when `pipeline.tasks.length > 0`.
5. **Pipeline rendering functions** — Port from portfolio.js: `renderPipelineTaskItem()`, `renderPipelineTaskDetails()`, `renderPipelineContributors()`, `renderPipelineDecisions()`. Prefix all with `pipeline` or `renderPipeline`.
6. **Event handlers** — Add click handlers for pipeline task expand/collapse and decisions toggle. These are independent of existing card accordion. Attach via event delegation on `listContainer`.
7. **CSS** — Rename portfolio classes per the mapping table. Add new `.pipeline__section` and `.project-card__pipeline-stats` classes. Add avatar cluster classes on project-card. Delete all unused portfolio section/card classes. Update reduced-motion rules.
8. **Delete portfolio.js** — Verify no remaining references.
9. **Visual parity check** — Expand a project that has pipeline data. Compare task items, contributors, and decisions rollup against the current portfolio rendering. They should be identical.

---

## Summary

The consolidation is a straightforward merge: one section instead of two, one mental model instead of two. The existing project card and detail view are the foundation. Pipeline elements layer on conditionally — visible when data exists, invisible when it does not. The visual language is unchanged; it is the same stats cards, task items, avatar clusters, and expand/collapse patterns that already exist in the portfolio, relocated into their proper home within the project detail view.

The key design decisions:

1. **Additive layering** over redesign — the project card gains elements, it does not change shape
2. **Conditional visibility** over empty states — no "Pipeline: empty" messages, no placeholder text
3. **Maintain visual parity** — the pipeline section in the detail view should look identical to the current portfolio expanded view
4. **Clean removal** — the portfolio section disappears without fanfare, no transition notices
5. **Pipeline section placement** — below session history, above progress notes, reflecting the information hierarchy from live activity to structured history to freeform notes
