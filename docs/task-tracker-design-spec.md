# Task Tracker — Design Spec

**Author:** Robert (Product Designer)
**Date:** February 12, 2026
**Status:** Ready for implementation
**Project ID:** `task-tracker`
**Dependencies:** `docs/task-tracker-requirements.md` (Thomas), `docs/task-tracker-tech-approach.md` (Andrei)

---

## Overview

A full-page AG Grid table showing all work items across all projects. Think of it as the cross-project sibling of the per-project work items grid — same badge renderers, same AG Grid theming, same save behavior, but with filters above it and a "New Task" button for creating items from the centralized view.

The page follows the `spreadsheets.html` pattern: page header, content area, full-width grid. No sidebar, no detail panel. The grid IS the page.

---

## 1. Page Layout

### Structure

```
.nav (sticky nav bar — standard, with "Tasks" link active)
.tasks-page
  .container
    .tasks-header
      .tasks-header__title-row
        h1.tasks-header__title          → "Tasks"
        button.tasks-header__new-btn    → "+ New Task"
      p.tasks-header__stats             → "47 tasks across 5 projects"
    .tasks-filter-bar                   → filter controls (section 2)
    #tasks-grid.ag-theme-quartz         → AG Grid container
.footer
```

### Page Container

```css
.tasks-page {
  background: var(--color-bg-primary);
  min-height: calc(100vh - 65px);     /* viewport minus nav height */
  padding-top: var(--space-10);
  padding-bottom: var(--space-16);
}
```

Follows `spreadsheets-page` pattern exactly.

### Page Header

```css
.tasks-header {
  margin-bottom: var(--space-6);
}

.tasks-header__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.tasks-header__title {
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.tasks-header__stats {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}
```

At desktop (>= 1024px):

```css
.tasks-header__title {
  font-size: var(--text-3xl);
}
```

### "New Task" Button

Primary button, same pattern as `.projects__new-btn`:

```css
.tasks-header__new-btn {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family);
  color: var(--color-white);
  background: var(--color-accent);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
  white-space: nowrap;
}
```

**States:**
- **Hover:** `background: var(--color-accent-active)`
- **Focus-visible:** `outline: 2px solid var(--color-accent); outline-offset: 2px`
- **Active:** `background: var(--color-accent-active)`

---

## 2. Filter Bar

The filter bar is the primary new UI pattern on this page — a horizontal row of controls above the grid. It provides immediate, client-side filtering via AG Grid's external filter API. No submit button — all filters apply instantly.

### Structure

```html
<div class="tasks-filter-bar">
  <div class="tasks-filter-bar__filters">
    <div class="tasks-filter-bar__field">
      <select class="tasks-filter-bar__select" id="filter-project">
        <option value="">All Projects</option>
        <!-- populated dynamically -->
      </select>
    </div>
    <div class="tasks-filter-bar__field">
      <select class="tasks-filter-bar__select" id="filter-status">
        <option value="">All Statuses</option>
        <option value="planned">Planned</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="deferred">Deferred</option>
      </select>
    </div>
    <div class="tasks-filter-bar__field">
      <select class="tasks-filter-bar__select" id="filter-priority">
        <option value="">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
    <div class="tasks-filter-bar__field">
      <select class="tasks-filter-bar__select" id="filter-owner">
        <option value="">All Owners</option>
        <option value="__unassigned">Unassigned</option>
        <!-- populated dynamically from unique owners -->
      </select>
    </div>
    <div class="tasks-filter-bar__field tasks-filter-bar__field--search">
      <input class="tasks-filter-bar__search" type="text" id="filter-search"
             placeholder="Search tasks..." aria-label="Search tasks by title">
    </div>
  </div>
  <div class="tasks-filter-bar__actions">
    <span class="tasks-filter-bar__badge" id="filter-badge" hidden>3 filters</span>
    <button class="tasks-filter-bar__clear" id="filter-clear" type="button" hidden>Clear</button>
  </div>
</div>
```

### Filter Bar Layout

```css
.tasks-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.tasks-filter-bar__filters {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.tasks-filter-bar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
```

### Filter Select Inputs

Use the same base styling as `.modal__select`, scaled to compact height:

```css
.tasks-filter-bar__select {
  appearance: none;
  font-family: var(--font-family);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-6) var(--space-1) var(--space-2);
  height: 32px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
  /* Chevron icon — same SVG as modal__select */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239a9a9a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 12px;
}
```

**States:**
- **Hover:** `border-color: var(--color-border-strong)`
- **Focus-visible:** `outline: 2px solid var(--color-accent); outline-offset: 2px`
- **Active filter (has non-default value):** `color: var(--color-text-primary); border-color: var(--color-accent)` — applied via `.tasks-filter-bar__select--active` class when value != ""

```css
.tasks-filter-bar__select--active {
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}
```

### Search Input

```css
.tasks-filter-bar__search {
  font-family: var(--font-family);
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  height: 32px;
  width: 180px;
  transition: border-color 0.15s ease, width 0.2s ease;
}

.tasks-filter-bar__search::placeholder {
  color: var(--color-text-tertiary-accessible);
}

.tasks-filter-bar__search:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15);
  width: 240px;
}
```

### Filter Badge

Shows count of active filters. Hidden when no filters are active.

```css
.tasks-filter-bar__badge {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent);
  background: rgba(var(--color-green-accent-rgb), 0.08);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  line-height: 1;
}
```

### Clear Button

Ghost button to reset all filters.

```css
.tasks-filter-bar__clear {
  font-family: var(--font-family);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  transition: color 0.15s ease;
  line-height: 1;
}

.tasks-filter-bar__clear:hover {
  color: var(--color-text-primary);
}

.tasks-filter-bar__clear:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

### Responsive Behavior

At mobile (< 640px):

```css
@media (max-width: 639px) {
  .tasks-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .tasks-filter-bar__filters {
    flex-direction: column;
  }

  .tasks-filter-bar__select,
  .tasks-filter-bar__search {
    width: 100%;
  }

  .tasks-filter-bar__search:focus {
    width: 100%;
  }

  .tasks-filter-bar__actions {
    justify-content: flex-end;
  }
}
```

At tablet (640px–1023px), the filter bar wraps naturally — `flex-wrap: wrap` handles it. No explicit override needed.

---

## 3. AG Grid Column Configuration

Uses existing TeamHQ AG Grid theming from `css/spreadsheet.css`. All `--ag-*` variable overrides, header text styling, row hover, focus rings, and border treatment apply automatically.

### Columns

| Column | Field | Width | Editable | Cell Renderer | Notes |
|--------|-------|-------|----------|---------------|-------|
| Project | `project` | 160px | No | Link renderer | See below |
| ID | `id` | 90px | No | Plain text | `--font-weight-medium`, `--color-text-secondary` |
| Title | `title` | flex: 2 | No | Plain text | `--color-text-primary` |
| Status | `status` | 130px | Yes (select) | Badge renderer | See section 4 |
| Priority | `priority` | 110px | Yes (select) | Badge renderer | See section 4 |
| Owner | `owner` | 130px | Yes (text) | Avatar + name | See below |
| Phase | `phase` | 100px | Yes (text) | Plain text | `--color-text-secondary` |

### Grid Options

```javascript
{
  domLayout: 'autoHeight',
  rowHeight: 44,
  headerHeight: 40,
  animateRows: true,
  singleClickEdit: true,
  stopEditingWhenCellsLoseFocus: true,
  defaultColDef: {
    sortable: true,
    resizable: false,
    suppressMovable: true
  }
}
```

### Project Column — Link Renderer

The project name renders as a styled link that navigates to the project's detail view.

```css
.tasks__project-link {
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s ease;
}

.tasks__project-link:hover {
  color: var(--color-accent);
  text-decoration: underline;
}
```

The link renderer creates a `<span class="tasks__project-link">` with the project name as text content.

### Owner Column — Avatar + Name Renderer

Same pattern as the per-project work items grid in `projects.js`:

```
[20px avatar] [name text]
```

- Avatar: 20px circle (`border-radius: 50%`), loaded from `img/avatars/{name.toLowerCase()}.svg`. On error, hide the image.
- Name: plain text, `--color-text-primary`.
- Layout: `display: inline-flex; align-items: center; gap: 6px`.
- Empty owner: render nothing (empty cell).

### Default Sort

Custom comparator for Status column:

```
in-progress → 0
planned → 1
deferred → 2
completed → 3
```

Initial sort: Status ascending (in-progress first), then Priority ascending (high → medium → low). Uses AG Grid's `initialState.sort.sortModel`.

### Row Click Navigation

Clicking any non-editable cell navigates to `projects.html#{project-slug}`. The `onRowClicked` handler checks `event.colDef.editable` — if the clicked column is editable, the click is consumed by the cell editor, not navigation.

---

## 4. Badge Cell Renderers

Identical to the per-project work items grid. Uses existing `.thq-badge` classes from `css/spreadsheet.css`. No new CSS needed.

### Status Badges

| Value | Badge Class | Visual |
|-------|-------------|--------|
| `planned` | `thq-badge thq-badge--muted` | Gray bg, secondary text |
| `in-progress` | `thq-badge thq-badge--accent` | Green-tinted bg, accent text |
| `completed` | `thq-badge thq-badge--success` | Green bg, green text |
| `deferred` | `thq-badge thq-badge--warning` | Amber bg, amber-700 text |

### Priority Badges

| Value | Badge Class | Visual |
|-------|-------------|--------|
| `high` | `thq-badge thq-badge--error` | Red-tinted bg, red text |
| `medium` | `thq-badge thq-badge--warning` | Amber bg, amber-700 text |
| `low` | `thq-badge thq-badge--muted` | Gray bg, secondary text |

Badge text is capitalized via `text-transform: capitalize` on the `.thq-badge` class.

---

## 5. New Task Modal

Triggered by the "New Task" button. Uses the existing modal pattern from `css/styles.css` (`.modal-overlay`, `.modal`, `.modal__header`, `.modal__form`, etc.).

### Structure

```html
<div class="modal-overlay" id="task-modal-overlay" aria-hidden="true">
  <div class="modal" role="dialog" aria-labelledby="task-modal-title" aria-modal="true">
    <div class="modal__header">
      <h3 class="modal__title" id="task-modal-title">New Task</h3>
      <button class="modal__close" type="button" aria-label="Close">&times;</button>
    </div>
    <form class="modal__form" id="task-form" novalidate>
      <div class="modal__field">
        <label class="modal__label" for="task-project">Project <span class="modal__required">*</span></label>
        <select class="modal__select" id="task-project" name="project" required>
          <option value="">Select a project...</option>
          <!-- populated from GET /api/projects -->
        </select>
        <p class="modal__error" aria-live="polite"></p>
      </div>
      <div class="modal__field">
        <label class="modal__label" for="task-title">Title <span class="modal__required">*</span></label>
        <input class="modal__input" type="text" id="task-title" name="title"
               placeholder="e.g. Add user profile page" required autocomplete="off">
        <p class="modal__error" aria-live="polite"></p>
      </div>
      <div class="modal__field">
        <label class="modal__label" for="task-status">Status</label>
        <select class="modal__select" id="task-status" name="status">
          <option value="planned" selected>Planned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="deferred">Deferred</option>
        </select>
      </div>
      <div class="modal__field">
        <label class="modal__label" for="task-priority">Priority</label>
        <select class="modal__select" id="task-priority" name="priority">
          <option value="high">High</option>
          <option value="medium" selected>Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="modal__field">
        <label class="modal__label" for="task-owner">Owner</label>
        <input class="modal__input" type="text" id="task-owner" name="owner"
               placeholder="e.g. Alice" autocomplete="off">
      </div>
      <div class="modal__field">
        <label class="modal__label" for="task-phase">Phase</label>
        <input class="modal__input" type="text" id="task-phase" name="phase"
               placeholder="e.g. v1.0" autocomplete="off">
      </div>
      <div class="modal__actions">
        <button class="modal__cancel" type="button">Cancel</button>
        <button class="modal__submit" type="submit">Create Task</button>
      </div>
    </form>
  </div>
</div>
```

### Behavior

1. **Open:** Click "New Task" button. Modal overlay fades in, modal slides up from `translateY(8px)`. Focus moves to the Title field (skip Project — user likely wants to type the title first, but Project is required, so they'll select it before submitting).
2. **Close:** Click X, click overlay backdrop, press Escape, or submit success. Modal fades out.
3. **Validation:** On submit, check Project (required) and Title (required). If invalid, add `.modal__input--invalid` class (red border) and show error message in `.modal__error` below the field. Validate on submit, not on blur.
4. **Submit:** Button text changes to "Creating..." and button is disabled. On success: add new row to grid via `applyTransaction`, close modal, reset form. On error: show inline error below the form: "Failed to create task. Please try again." in `--text-sm`, `--color-status-error`.

### Modal Sizing

Uses default `.modal` max-width of 480px. No override needed.

### Focus Management

On open: focus moves to `#task-title` input (the first field the user types into). On close: focus returns to the "New Task" button. Standard focus trap within the modal (Tab cycles through form fields + buttons).

---

## 6. Interaction States

### Cell Editing

AG Grid's built-in cell editing. Editable cells (Status, Priority, Owner, Phase) enter edit mode on single click. Focus ring: 2px `--color-accent` outline (existing `.ag-cell-focus` style from `spreadsheet.css`).

- **Status, Priority:** `agSelectCellEditor` dropdown. Values match the badge options.
- **Owner, Phase:** Text editors (AG Grid default text input).

### Save Feedback

After successful auto-save (500ms debounce), use AG Grid's `flashCells` API on the changed cells. Flash color: accent at 10% opacity, 500ms fade. Built-in AG Grid feature.

### Save Error

Toast notification (bottom-right):
- Background: `var(--color-bg-card)`
- Border: `1px solid var(--color-border)`, with 3px left border in `--color-status-error`
- Text: "Failed to save — retrying..." in `--text-sm`, `--color-text-primary`
- Shadow: `var(--shadow-lg)`
- Border-radius: `var(--radius-sm)`
- Auto-retry once after 2s
- Dismiss on success or second failure (fade out after 3s)

```css
.tasks-toast {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-status-error);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  z-index: 300;
  animation: tasks-toast-in 200ms ease-out;
}

@keyframes tasks-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Row Hover

`rgba(0,0,0,0.02)` background — already set via `--ag-row-hover-color` in `spreadsheet.css`.

---

## 7. Loading State

Shown while `GET /api/tasks` is in-flight.

```html
<div class="tasks-loading" id="tasks-loading">Loading tasks...</div>
```

```css
.tasks-loading {
  padding: var(--space-16) 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary-accessible);
  animation: thq-pulse 1.5s ease-in-out infinite;
}
```

Uses existing `thq-pulse` keyframes from `spreadsheet.css`. Hidden once data loads (replaced by the grid).

---

## 8. Empty State

Shown when `GET /api/tasks` returns an empty `tasks` array.

```html
<div class="tasks-empty" id="tasks-empty">
  <p class="tasks-empty__text">No tasks tracked yet.</p>
  <p class="tasks-empty__hint">Create work items on individual projects to see them here.</p>
</div>
```

```css
.tasks-empty {
  text-align: center;
  padding: var(--space-16) 0;
}

.tasks-empty__text {
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2) 0;
}

.tasks-empty__hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}
```

---

## 9. Error State

Shown when `GET /api/tasks` fails.

```html
<div class="tasks-error" id="tasks-error">
  <p>Failed to load tasks. <a href="#" id="tasks-retry">Retry</a></p>
</div>
```

```css
.tasks-error {
  text-align: center;
  padding: var(--space-16) 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary-accessible);
}

.tasks-error a {
  color: var(--color-accent);
  text-decoration: none;
  cursor: pointer;
}

.tasks-error a:hover {
  text-decoration: underline;
}
```

---

## 10. Navigation Update

### Nav Bar — All Pages

Add "Tasks" link between "Projects" and "Meetings" on all 9 HTML pages:

```html
<a href="projects.html" class="nav__link">Projects</a>
<a href="tasks.html" class="nav__link">Tasks</a>     <!-- NEW -->
<a href="meetings.html" class="nav__link">Meetings</a>
```

On `tasks.html`, the Tasks link gets the active state:

```html
<a href="tasks.html" class="nav__link nav__link--active" aria-current="page">Tasks</a>
```

**Nav order (8 links):** Tools, Projects, Tasks, Meetings, Interviews, Docs, Spreadsheets, Team.

The nav already handles wrapping via `flex-wrap: wrap` with `gap: var(--space-4)` (mobile) / `gap: var(--space-6)` (desktop). 8 links will wrap on narrow viewports — this is acceptable and consistent with how the nav handles overflow today.

### Hub Card — index.html

Insert after the "Projects" card:

```html
<a href="tasks.html" class="hub__card">
  <h3 class="hub__card-name">Tasks</h3>
  <p class="hub__card-desc">Track all work items across every project.</p>
</a>
```

The hub grid uses `repeat(4, 1fr)` at desktop. With 8 cards, this creates a clean 4x2 grid. At tablet (2 columns), 4 rows. At mobile (1 column), 8 rows. All handled by existing CSS.

---

## 11. Responsive Behavior

### Mobile (< 640px)

- **Page header:** Title row stacks — title on top, "New Task" button below, centered.
- **Filter bar:** Stacks vertically — each filter takes full width.
- **AG Grid:** Forced to compact density (`--ag-row-height: 32px`, `--ag-header-height: 32px`, `--text-xs`). Already handled by the existing `@media (max-width: 767px)` rule in `spreadsheet.css` if the grid has the `thq-spreadsheet` class, but since we're NOT using that class (no sticky column, no scroll hint), Alice should add equivalent compact overrides scoped to the tasks grid.
- **Horizontal scroll:** Grid will overflow horizontally. AG Grid handles this natively. Consider hiding the Phase column at mobile to reduce horizontal overflow.

```css
@media (max-width: 639px) {
  .tasks-header__title-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .tasks-header__new-btn {
    align-self: center;
  }

  .tasks-header__title {
    text-align: center;
  }
}
```

### Tablet (640px–1023px)

No special overrides. Filter bar wraps naturally. Grid uses comfortable density.

### Desktop (>= 1024px)

Full layout. All columns visible. Filter bar is a single horizontal row. Grid uses comfortable density (44px rows, 40px header).

---

## 12. Animation & Transitions

- **Modal open:** Overlay opacity 0 → 1 (200ms ease). Modal translateY(8px) → 0 (200ms ease). Existing pattern.
- **Modal close:** Reverse of open. Existing pattern.
- **Filter select active state:** `border-color` transition (150ms ease). Already specified.
- **Search input focus width:** 180px → 240px (200ms ease). Desktop only.
- **Toast notification:** Slide up + fade in (200ms ease-out). See section 6.
- **AG Grid row hover:** Background transition (120ms ease). Existing `spreadsheet.css`.
- **AG Grid sort icon:** 150ms ease-out slide in. Existing `spreadsheet.css`.

**Reduced motion:**

```css
@media (prefers-reduced-motion: reduce) {
  .tasks-filter-bar__search {
    transition: none;
  }

  .tasks-toast {
    animation: none;
  }

  .tasks-loading {
    animation: none;
    opacity: 1;
  }
}
```

---

## 13. Accessibility

### Keyboard Navigation

- **Tab order:** Nav → "New Task" button → filter dropdowns (Project → Status → Priority → Owner) → search input → clear button (when visible) → AG Grid
- **AG Grid:** Standard AG Grid keyboard nav — arrow keys between cells, Enter to edit, Escape to cancel edit, Tab to move to next editable cell.
- **Modal:** Focus trap. Tab cycles through form fields. Escape closes modal.
- **Filter selects:** Standard `<select>` keyboard interaction (arrow keys, type-to-search). No custom dropdown.

### Screen Reader

- **Page:** `<h1>` is "Tasks". Grid container has `role="grid"` (AG Grid default).
- **Stats:** `aria-live="polite"` on `.tasks-header__stats` — announces count updates.
- **Filter badge:** Announce active filter count. Badge has implicit text content ("3 filters").
- **Clear button:** Button text "Clear" is self-describing.
- **Modal:** `role="dialog"`, `aria-labelledby`, `aria-modal="true"`. Error messages use `aria-live="polite"`.
- **Nav:** Active page link has `aria-current="page"`.

### Contrast

All text meets WCAG AA (4.5:1 on white):
- `--color-text-primary` (#171717): ~15:1
- `--color-text-secondary` (#666666): ~5.7:1
- `--color-text-tertiary-accessible` (#767676): ~4.5:1
- `--color-accent` (#006B3F): ~7.2:1
- Badge text colors: all verified in existing badge class definitions.

### Touch Targets

- Filter selects: 32px height (desktop). At mobile, full-width and 44px min-height via native `<select>` rendering.
- "New Task" button: 36px height minimum. Fine on desktop. Mobile: native touch target.
- Clear button: small, but is a supplementary action. The "x" in search or re-selecting defaults are alternative paths.

---

## 14. CSS File Strategy

New styles go in a `css/tasks.css` file if the volume warrants it, but given that most of the page is AG Grid (styled by `spreadsheet.css`) and the modal uses existing `.modal` classes, the tasks-specific CSS is modest:

- `.tasks-page`, `.tasks-header*` — page layout (~20 lines)
- `.tasks-filter-bar*` — filter bar controls (~60 lines)
- `.tasks__project-link` — project column link style (~5 lines)
- `.tasks-toast` — save error toast (~15 lines)
- `.tasks-loading`, `.tasks-empty`, `.tasks-error` — state screens (~25 lines)
- Responsive overrides (~20 lines)

**Total: ~145 lines.** Small enough to add to `css/spreadsheet.css` alongside the existing AG Grid overrides, or a separate `css/tasks.css` — Alice's call. Either approach works because `tasks.html` already loads `spreadsheet.css`.

---

## Summary for Alice

1. **Page skeleton:** Copy from `spreadsheets.html`. Swap content for tasks-specific header, filter bar, and grid container. Load AG Grid CDN CSS + JS, `spreadsheet.css`, and either add task styles to `spreadsheet.css` or a new `tasks.css`.

2. **Filter bar:** New pattern. 4 native `<select>` elements + 1 text `<input>`. Compact height (32px). All styles specified above — no guessing needed.

3. **AG Grid:** Standard TeamHQ theming. Column defs per Andrei's tech approach (section 5). Badge renderers: duplicate ~15 lines from `projects.js`. Owner renderer: avatar + name inline-flex.

4. **Modal:** Copy the existing `.modal-overlay` + `.modal` HTML pattern from `projects.html`. Simpler form (6 fields, no advanced toggle). All classes exist in `styles.css`.

5. **States:** Loading, empty, error are ~10 lines of HTML each. Styles follow existing patterns (pulsing text, centered message, accent-colored retry link).

6. **Nav:** Add "Tasks" between "Projects" and "Meetings" on all 9 HTML files. Add hub card after "Projects" on `index.html`.

---

*Design spec written by Robert (Product Designer). Alice: existing AG Grid theming from spreadsheet.css applies automatically. The filter bar is the only significant new CSS — everything else reuses established patterns (modal, badges, page layout, loading/empty/error states).*
