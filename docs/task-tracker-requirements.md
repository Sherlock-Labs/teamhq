# Task Tracker — Product Requirements

**Author:** Thomas (PM)
**Date:** February 12, 2026
**Status:** Complete
**Project ID:** `task-tracker`

---

## 1. Product Summary

Add a centralized, cross-project task tracker to TeamHQ. Today, work items live inside each project's detail view — there's no way to see all tasks across all projects in one place. The CEO needs a single view to triage, assign, and track tasks regardless of which project they belong to.

**One-sentence pitch:** One AG Grid table showing every task from every project, with filtering, inline editing, and the ability to create tasks — a lightweight Linear for TeamHQ.

**This is a TeamHQ internal enhancement, not a separate product.**

---

## 2. What Exists Today

- `data/work-items/{slug}.json` — per-project work item files with arrays of items (id, title, status, phase, owner, priority). Rendered in AG Grid within each project's detail view on `projects.html`.
- `data/tasks/{slug}.json` — pipeline process tracking (which agent did what). NOT user tasks. Different concept entirely.
- `js/projects.js` — renders the per-project work items grid using AG Grid.
- 7 nav links: Tools, Projects, Meetings, Interviews, Docs, Spreadsheets, Team.
- AG Grid v34 CDN already loaded on projects.html and spreadsheets.html.

**Key insight:** The work items data is already task data — it just lacks a cross-project view and a couple of fields. We extend work items rather than creating a parallel system.

---

## 3. Scope

### In Scope (v1)

- **New `tasks.html` page** with its own AG Grid table
- **Navigation update** — add "Tasks" link to nav on all pages (between Projects and Meetings)
- **Cross-project task view** — reads all `data/work-items/*.json` files and renders in one table
- **Extended work item schema** — add `description` and `createdBy` fields (backward-compatible; existing items default to empty)
- **AG Grid columns:** Project, ID, Title, Status, Priority, Owner, Phase
- **Inline editing** for Status, Priority, Owner, Phase (same as per-project grid)
- **Create task** — "New Task" button with modal: select project, enter title, status, priority, owner, phase
- **Filter bar** — dropdown filters for Project, Status, Priority, Owner; plus a text search on title
- **Backend API** — new endpoint to fetch all work items across all projects in one call
- **Row click → project link** — clicking a row navigates to the project's detail view on projects.html

### Out of Scope (deferred)

- Comments / activity log on individual tasks
- Task detail side panel (inline editing is enough for v1)
- Description column display (field stored but only used in future detail panel)
- Drag-and-drop reordering
- Subtasks / hierarchy
- Dependencies between tasks
- Due dates / time tracking
- Kanban / board view
- Bulk operations (multi-select, bulk status change)
- Saved filters / custom views
- Notifications / alerts

---

## 4. Data Model

### Extended Work Item Schema

The existing schema is extended with two optional fields. Existing data files are untouched — the new fields default when absent.

```json
{
  "id": "US-1",
  "title": "User signup and login",
  "description": "",
  "status": "planned",
  "phase": "v1.0",
  "owner": "",
  "priority": "high",
  "createdBy": ""
}
```

**New fields:**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `description` | string | `""` | Longer description / context. Not shown in grid v1 — stored for future detail panel. |
| `createdBy` | string | `""` | Who created the task (agent name or "CEO"). Auto-set on create. |

**Unchanged fields:** `id`, `title`, `status`, `phase`, `owner`, `priority` — identical to current work item schema.

**Project association** is implicit — derived from the file slug (`data/work-items/roadmap-tool.json` → project "Roadmap Tool"). The cross-project API resolves slugs to project names.

### Storage

No new files or data directories. Tasks continue to live in `data/work-items/{slug}.json`. The cross-project view reads them all.

### API Endpoints

One new endpoint:

**GET `/api/tasks`** — Returns all tasks across all projects.

Response shape:
```json
{
  "tasks": [
    {
      "id": "US-1",
      "title": "User signup and login",
      "description": "",
      "status": "completed",
      "phase": "v1.0",
      "owner": "Jonah",
      "priority": "high",
      "createdBy": "",
      "project": {
        "slug": "roadmap-tool",
        "name": "Roadmap Tool"
      }
    }
  ]
}
```

Query parameters (server-side filtering — optional, can do client-side in v1 since data is small):
- `?project=roadmap-tool` — filter by project slug
- `?status=in-progress` — filter by status

**Existing endpoints unchanged:**
- `GET /api/projects/:id/work-items` — still works for per-project view
- `PUT /api/projects/:id/work-items` — still works for saving from per-project and cross-project editing

**Writes from the cross-project view** use the existing per-project PUT endpoint. When the user edits a task in the cross-project grid, the client sends the full updated array for that project to `PUT /api/projects/:id/work-items`. This avoids a new write path — same mechanism, different UI.

---

## 5. User Stories

### US-TT-1: View all tasks across projects

As the CEO, I can see a single table showing all tasks from all projects, so I can triage and track work without clicking into each project individually.

**Acceptance criteria:**
- [ ] New `tasks.html` page loads with a full-page AG Grid table
- [ ] Grid shows columns: Project, ID, Title, Status, Priority, Owner, Phase
- [ ] Project column displays the human-readable project name (e.g., "Roadmap Tool"), not the slug
- [ ] Tasks are loaded from all `data/work-items/*.json` files via the new GET `/api/tasks` endpoint
- [ ] Default sort: Status (in-progress first, then planned, then deferred, then completed), then Priority (high → medium → low), then Project name
- [ ] If no work items exist across any project, show empty state: "No tasks tracked yet. Create work items on individual projects to see them here."
- [ ] Page title: "Tasks — TeamHQ"
- [ ] AG Grid uses the same theming as the spreadsheet and project work items grids

**Interaction states:**
- Loading: "Loading tasks..." centered text while fetching
- Empty: Message with guidance (see AC above)
- Error: "Failed to load tasks." with retry link

### US-TT-2: Filter and search tasks

As the CEO, I can filter the task list by project, status, priority, and owner, and search by title text, so I can focus on what matters right now.

**Acceptance criteria:**
- [ ] Filter bar renders above the AG Grid table
- [ ] Project dropdown: lists all projects that have work items, plus "All Projects" default
- [ ] Status dropdown: All, Planned, In Progress, Completed, Deferred
- [ ] Priority dropdown: All, High, Medium, Low
- [ ] Owner dropdown: lists all unique owners found across tasks, plus "All" and "Unassigned"
- [ ] Text search input: filters on title (case-insensitive substring match)
- [ ] Filters are AND-combined (selecting Project: Roadmap Tool + Status: In Progress shows only in-progress tasks for Roadmap Tool)
- [ ] Filters apply instantly (no submit button) via AG Grid's external filter API
- [ ] Active filter count shown as a badge (e.g., "3 filters active")
- [ ] "Clear filters" button resets all filters to defaults
- [ ] URL does not update with filter state (no query params needed for v1)

**Interaction states:**
- N/A — filtering is instant, client-side, synchronous

### US-TT-3: Edit tasks inline from cross-project view

As the CEO, I can edit task fields directly in the cross-project grid, and changes save back to the correct project's work items file.

**Acceptance criteria:**
- [ ] Status column: dropdown cell editor (planned, in-progress, completed, deferred)
- [ ] Priority column: dropdown cell editor (high, medium, low)
- [ ] Owner column: text cell editor
- [ ] Phase column: text cell editor
- [ ] Project, ID, and Title columns: read-only in the cross-project view (edit these on the project page)
- [ ] On cell value change, debounced auto-save (500ms) — sends the full updated array for that task's project to `PUT /api/projects/:id/work-items`
- [ ] Brief cell flash on successful save (AG Grid flashCells API)
- [ ] If save fails, toast notification "Failed to save — retrying..." with single auto-retry after 2s

**Interaction states:**
- Loading: Cell edit is instant (client-side); save is async
- Error: Toast notification on save failure with auto-retry
- Optimistic: Cell value updates immediately; revert on save failure

### US-TT-4: Create a task from the cross-project view

As the CEO, I can create a new task and assign it to a project without navigating to the project page.

**Acceptance criteria:**
- [ ] "New Task" button in the top-right area of the page (primary style, consistent with other pages)
- [ ] Clicking opens a modal with fields: Project (required dropdown), Title (required text), Status (dropdown, defaults to "planned"), Priority (dropdown, defaults to "medium"), Owner (optional text), Phase (optional text)
- [ ] Project dropdown lists all projects that have a slug (i.e., projects with existing work item files or projects connected to task files)
- [ ] On submit, task is appended to the selected project's work items file via `PUT /api/projects/:id/work-items`
- [ ] Task ID is auto-generated: `TT-{n+1}` where n is the current task count for that project
- [ ] `createdBy` is set to "CEO" (since this is the only user)
- [ ] After successful creation, the grid refreshes to show the new task
- [ ] Modal closes on successful submit and on clicking outside / pressing Escape

**Interaction states:**
- Loading: Submit button shows "Creating..." and disables during save
- Error: Inline error below the modal form: "Failed to create task. Please try again."
- Form: Title is required; validation on submit (not blur). Focus starts on Title field.
- Empty: N/A

### US-TT-5: Navigate from task to project

As the CEO, I can click on a task row to jump to the project it belongs to, so I can see the full project context.

**Acceptance criteria:**
- [ ] Single-clicking a task row navigates to `projects.html#{project-slug}` which expands that project's detail view
- [ ] Navigation happens on row click, not on cell click when editing (only fires on non-editable cells or when not in edit mode)
- [ ] Project name cell in the grid is styled as a link (underline on hover, pointer cursor)

**Interaction states:**
- N/A — synchronous page navigation

### US-TT-6: Add Tasks to navigation

As the CEO, the Tasks page is accessible from the main navigation on all pages.

**Acceptance criteria:**
- [ ] "Tasks" link added to the nav bar on all 8 HTML pages (index.html, tools.html, projects.html, meetings.html, interviews.html, docs.html, spreadsheets.html, team.html)
- [ ] Link position: between "Projects" and "Meetings"
- [ ] Active state styling when on tasks.html (same `nav__link--active` pattern)
- [ ] Hub page (index.html): add a "Tasks" card to the navigation grid, positioned after Projects

---

## 6. Technical Constraints

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| AG Grid source | CDN v34 (same as existing) | Already proven in projects and spreadsheets |
| Max total tasks | 1000 (soft limit) | AG Grid handles this easily; keeps load time reasonable |
| Save mechanism | Debounced PUT per-project (500ms) | Same as per-project work items — proven pattern |
| Data format | Existing `data/work-items/*.json` files | No new data directories; extend, don't duplicate |
| No build step | Vanilla JS (IIFE pattern) | Consistent with all TeamHQ pages |
| Filter method | Client-side via AG Grid external filter | Data volume is small enough (<1000 rows); avoids server round-trips |

---

## 7. AG Grid Configuration

Recommended column definitions:

```javascript
var columnDefs = [
  { field: 'project', headerName: 'Project', width: 160, editable: false,
    valueGetter: function(params) { return params.data.project.name; } },
  { field: 'id', headerName: 'ID', width: 90, editable: false },
  { field: 'title', headerName: 'Title', flex: 2, editable: false },
  { field: 'status', headerName: 'Status', width: 130, editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['planned', 'in-progress', 'completed', 'deferred'] } },
  { field: 'priority', headerName: 'Priority', width: 110, editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['high', 'medium', 'low'] } },
  { field: 'owner', headerName: 'Owner', width: 120, editable: true },
  { field: 'phase', headerName: 'Phase', width: 100, editable: true }
];
```

Use the existing TeamHQ AG Grid theming (ag-theme-quartz customization from `css/spreadsheet.css`). Match status and priority cell renderers from the per-project work items grid.

---

## 8. Pipeline Recommendation

This is a contained enhancement extending existing patterns. Recommended pipeline:

1. **Andrei (Arch)** — Tech approach: confirm API design for cross-project fetch, how to resolve project slugs to names, how the cross-project save delegates to per-project PUT. Should be lightweight — we're composing existing patterns.
2. **Phase 4 — parallel:**
   - **Robert (Designer)** — Design spec: tasks page layout, filter bar, new task modal, AG Grid styling. Follows existing page patterns.
   - **Jonah (BE)** — New `GET /api/tasks` endpoint, extend work item Zod schema with optional `description` and `createdBy` fields.
3. **Alice (FE)** — `tasks.html` page, AG Grid setup, filter bar, new task modal, inline editing with cross-project save, navigation updates across all pages.
4. **Robert (Designer)** — Lightweight design review.
5. **Enzo (QA)** — QA pass. Release gate.

**Skip Nina/Soren/Amara** — this is a data table, not a UI-heavy component. AG Grid handles the heavy lifting.

**Skip Priya** — internal tool, no marketing needed.

**No Restructure files** — all changes are additive (new page, new endpoint, schema extension). No early QA notification needed.

---

## 9. Risks and Open Questions

**Risks:**
1. **Navigation congestion** — Adding an 8th nav link ("Tasks") may crowd the nav bar. Mitigation: keep link text short, test at narrow widths. If too crowded, consider grouping Projects/Tasks under a dropdown later.
2. **Cross-project save complexity** — Edits in the cross-project view need to route back to the correct project's PUT endpoint. The client must track which project each row belongs to and send the full updated array for that project. Not hard, but requires careful bookkeeping.
3. **Data consistency** — If the per-project grid and the tasks page are open in two tabs, edits in one won't reflect in the other until refresh. Acceptable for v1 (single user, same machine).

**Resolved decisions:**
1. **Extend work items, don't duplicate.** The cross-project view reads the same `data/work-items/` files. One data source, two views. Avoids a parallel tracking system.
2. **No new data directory.** Tasks are work items. Adding fields to the work item schema is backward-compatible (new fields default to empty string).
3. **Client-side filtering.** Total task count is well under 1000. AG Grid's external filter API is instant. No need for server-side filtering in v1.
4. **Title and ID are read-only in cross-project view.** These are identity fields — editing them should happen in the project context where you can see all project-level items. Prevents confusion.

---

*Requirements written by Thomas (PM). Downstream agents: read this doc in full before starting your work.*
