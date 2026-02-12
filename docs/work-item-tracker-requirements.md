# Work Item Tracker — Product Requirements

**Author:** Thomas (PM)
**Date:** February 10, 2026
**Status:** Complete
**Project ID:** `work-item-tracker`

---

## 1. Product Summary

Add a lightweight work item tracker to each project's detail view on the TeamHQ projects page. Today, the project detail shows a pipeline section (which agent did what), but there's no way to see individual user stories/tasks and their status. Projects like Roadmap Tool have 30+ user stories with no visibility into which are done, in-progress, or deferred.

**One-sentence pitch:** A simple AG Grid table on each project's detail view showing all work items, their status, phase, and owner — like a lightweight Jira embedded in the project card.

**This is a TeamHQ internal enhancement, not a separate product.**

---

## 2. What Exists Today

- `data/tasks/{slug}.json` — pipeline-level task tracking per project (agent tasks: "Thomas scoped requirements", "Alice built frontend"). These are NOT user stories.
- `data/projects/{id}.json` — project records with pipeline merged from tasks files via merge-on-read.
- `js/projects.js` — renders project cards and detail views, including pipeline section.
- `projects.html` — the page template (no AG Grid loaded currently).
- AG Grid is loaded via CDN on `spreadsheets.html` and the embedded `TeamHQSpreadsheet` component is available on the projects page for spreadsheet data sections.

---

## 3. Scope

### In Scope (v1)
- New `workItems` array field on the project data structure
- AG Grid table rendered in the project detail view (below pipeline, above progress notes)
- Columns: ID, Title, Status, Phase, Owner, Priority
- Inline cell editing for Status, Phase, Owner, Priority
- Add/delete work items
- Auto-persist changes to the project's JSON file via the existing API
- Parse existing requirements docs to seed initial work items (manual trigger, not automatic)

### Out of Scope (deferred)
- Drag-and-drop reordering
- Subtasks / hierarchy
- Dependencies between work items
- Filtering / search within the work items grid
- Bulk import from external tools
- Cross-project work item views
- Due dates / time tracking
- Comments on individual work items

---

## 4. Data Model

### Work Item Schema

```json
{
  "id": "US-1",
  "title": "User signup and login",
  "status": "planned",
  "phase": "v1.0",
  "owner": "",
  "priority": "high"
}
```

**Fields:**

| Field | Type | Values | Editable | Notes |
|-------|------|--------|----------|-------|
| `id` | string | Free text (e.g., "US-1", "WI-3") | Yes (on create) | User-defined, unique within project |
| `title` | string | Free text (max 200 chars) | Yes | Short description of the work item |
| `status` | enum | `planned`, `in-progress`, `completed`, `deferred` | Yes (dropdown) | Drives visual indicators |
| `phase` | string | Free text (e.g., "v1.0", "v1.1", "v2.0") | Yes | Flexible — not a fixed enum |
| `owner` | string | Free text (e.g., "Alice", "Jonah", "") | Yes | Agent or person name |
| `priority` | enum | `high`, `medium`, `low` | Yes (dropdown) | Simple triage |

### Storage Location

Work items are stored in a new file: `data/work-items/{project-slug}.json`

```json
{
  "projectSlug": "roadmap-tool",
  "workItems": [
    { "id": "US-1", "title": "User signup and login", "status": "planned", "phase": "v1.0", "owner": "", "priority": "high" },
    { "id": "US-2", "title": "Team/workspace management", "status": "planned", "phase": "v1.0", "owner": "", "priority": "medium" }
  ]
}
```

**Why a separate file instead of embedding in the project JSON:**
- Work items can be numerous (30+ items) — keeps project JSON lean for the list view
- Avoids merge conflicts between agents updating pipeline tasks and CEO updating work items
- Follows the same pattern as spreadsheet data (`data/spreadsheets/`) — separate data files loaded on demand
- Only loaded when a project detail is expanded, not on every list load

### API Endpoints

Two new endpoints on the existing project routes:

1. **GET `/api/projects/:id/work-items`** — Returns the work items array for a project (by project ID, resolved to slug internally). Returns `{ workItems: [] }` if no file exists.

2. **PUT `/api/projects/:id/work-items`** — Replaces the entire work items array. Body: `{ workItems: [...] }`. Validates each item against the schema. Returns the saved array.

**Why PUT (full replace) instead of per-item CRUD:**
- The AG Grid client already holds the full dataset in memory
- Sending the complete array on each edit is simpler than tracking individual mutations
- Work item counts are small (typically 10-50 items) — no performance concern
- Eliminates ordering/conflict issues from concurrent partial updates

---

## 5. User Stories

### US-WIT-1: View work items for a project

As the CEO, I can see a work items table when I expand a project's detail view, showing all tracked user stories/tasks with their status, phase, owner, and priority.

**Acceptance criteria:**
- [ ] Work items section appears in the project detail view, below the pipeline section and above progress notes
- [ ] Section has a header labeled "Work Items" with an item count badge (e.g., "Work Items (12)")
- [ ] AG Grid table renders with columns: ID, Title, Status, Phase, Owner, Priority
- [ ] Status column uses color-coded cell renderer: planned (gray), in-progress (blue), completed (green), deferred (amber)
- [ ] Priority column uses color-coded cell renderer: high (red), medium (amber), low (gray)
- [ ] Table sorts by default: status (in-progress first, then planned, then deferred, then completed), then by ID
- [ ] If no work items exist, show empty state: "No work items tracked yet."
- [ ] Work items section only shows for projects that have a slug (i.e., projects connected to a tasks file)

**Interaction states:**
- Loading: Show "Loading work items..." text while fetching (N/A — inline fetch is fast for JSON files)
- Empty: "No work items tracked yet." with an "Add Work Item" button
- Error: If fetch fails, show "Failed to load work items." with retry link

### US-WIT-2: Edit work item fields inline

As the CEO, I can click on a cell in the work items table to edit its value directly, and changes are saved automatically.

**Acceptance criteria:**
- [ ] Status column: dropdown cell editor with options (planned, in-progress, completed, deferred)
- [ ] Phase column: text cell editor (free-form input)
- [ ] Owner column: text cell editor (free-form input)
- [ ] Priority column: dropdown cell editor with options (high, medium, low)
- [ ] Title column: text cell editor
- [ ] ID column: read-only after creation (not editable inline)
- [ ] On cell value change, debounced auto-save (500ms) — PUT the full work items array to the API
- [ ] Visual feedback: brief cell flash on successful save (use AG Grid's flashCells API)
- [ ] If save fails, show a toast notification "Failed to save — retrying..." and retry once after 2 seconds

**Interaction states:**
- Loading: Cell editor works instantly (client-side); save is async and non-blocking
- Error: Toast notification on save failure with single auto-retry
- Disabled: N/A — all editable cells are always editable
- Form: Dropdown editors for Status and Priority, free-text for others
- Optimistic: Cell value updates immediately on edit; revert on save failure

### US-WIT-3: Add and delete work items

As the CEO, I can add new work items to the table and delete existing ones.

**Acceptance criteria:**
- [ ] "Add Work Item" button below the table (subtle, secondary style)
- [ ] Clicking "Add Work Item" appends a new row with auto-generated ID (WI-{n+1} where n is the current count) and focuses the Title cell for immediate editing
- [ ] ID is editable on the newly created row (user can change from "WI-5" to "US-5" before saving)
- [ ] Delete: right-click context menu on any row with "Delete" option, or a small "x" button visible on row hover
- [ ] Delete requires confirmation for non-empty rows (rows with a title) — inline confirm, not a modal
- [ ] After add or delete, auto-save triggers (same debounced PUT as inline edit)

**Interaction states:**
- Loading: Add is instant (client-side); save is async
- Error: Toast on save failure with retry
- Empty: After deleting the last item, show empty state from US-WIT-1
- Form: New row ID is editable, Title auto-focused

### US-WIT-4: Seed work items from requirements doc

As the CEO, I can populate the work items table from an existing requirements document's user story index.

**Acceptance criteria:**
- [ ] "Import from Requirements" button visible when the work items table is empty (or as a menu option when non-empty)
- [ ] The button opens a simple text input modal where the CEO pastes the user story index table (markdown table format)
- [ ] Parser extracts ID, Title, Phase from the pasted markdown table (best-effort — handles the format used in `docs/roadmap-tool-requirements.md` Appendix A)
- [ ] Parsed items are previewed in a simple list before confirming
- [ ] On confirm, items are added to the work items table with status "planned", owner empty, priority "medium"
- [ ] Existing work items are preserved (import appends, does not replace)

**Interaction states:**
- Loading: Parsing is instant (client-side regex)
- Error: If no items are parsed, show "No work items found in the pasted text. Expected format: markdown table with ID and Title columns."
- Empty: N/A (button only shown contextually)
- Form: Textarea for paste input, preview list, Confirm/Cancel buttons

---

## 6. Technical Constraints

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| AG Grid source | CDN v34 (same as spreadsheets page) | Already loaded on the page via TeamHQSpreadsheet dependency |
| Max work items per project | 200 (soft limit) | AG Grid handles this easily; keeps JSON files reasonable |
| Save mechanism | Debounced PUT (500ms) | Balances responsiveness with API call frequency |
| Data format | JSON file in `data/work-items/` | Consistent with existing data patterns |
| No build step | Vanilla JS (IIFE pattern) | Consistent with existing projects.js |

---

## 7. AG Grid Configuration

Recommended column definitions (for Andrei/Alice reference):

```javascript
var columnDefs = [
  { field: 'id', headerName: 'ID', width: 90, editable: false, pinned: 'left' },
  { field: 'title', headerName: 'Title', flex: 2, editable: true },
  { field: 'status', headerName: 'Status', width: 130, editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['planned', 'in-progress', 'completed', 'deferred'] } },
  { field: 'phase', headerName: 'Phase', width: 100, editable: true },
  { field: 'owner', headerName: 'Owner', width: 120, editable: true },
  { field: 'priority', headerName: 'Priority', width: 100, editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['high', 'medium', 'low'] } }
];
```

Use the existing TeamHQ AG Grid theming (ag-theme-quartz customization from `css/spreadsheet.css`).

---

## 8. Pipeline Recommendation

This is a small, contained enhancement. Recommended pipeline:

1. **Andrei (Arch)** — Quick tech approach: confirm data storage pattern, API contract, AG Grid integration approach. Should be lightweight — we're extending existing patterns, not inventing new ones.
2. **Robert (Designer)** — Design spec: work items table styling within the project detail, status/priority cell renderers, add/delete interactions, import modal. Keep it tight — this follows existing patterns.
3. **Alice (FE) + Jonah (BE)** — Parallel implementation after API contract alignment.
   - **Alice:** AG Grid integration in project detail, cell editors, add/delete, import parser, auto-save
   - **Jonah:** Two new endpoints (GET/PUT work items), Zod schema, file I/O in `data/work-items/`
4. **Robert (Designer)** — Lightweight design review
5. **Enzo (QA)** — QA pass. Release gate.

**Skip Nina/Soren/Amara** for this one — it's a data table, not a UI-heavy component. AG Grid handles the heavy lifting.

**No Restructure files** — all changes are additive (new files, new section in existing detail view). No early QA notification needed.

---

## 9. Risks and Open Questions

**Risks:**
- AG Grid CDN needs to be loaded on `projects.html` (currently only on `spreadsheets.html`). This adds ~200KB to the projects page. Mitigation: lazy-load the AG Grid script only when a project detail is expanded.

**Open Questions (resolved):**
1. **Where does work item data live?** Separate file (`data/work-items/{slug}.json`) — keeps project JSON lean, loaded on demand.
2. **How do work items get created?** Three paths: manual add button, paste-import from requirements doc, or agents could write to the file directly.
3. **Should work items link to pipeline tasks?** No — they're different concepts. Pipeline tasks are "Thomas scoped requirements" (process). Work items are "US-1: User signup" (product). Keep them separate.

---

*Requirements written by Thomas (PM). Downstream agents: read this doc in full before starting your work.*
