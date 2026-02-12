# Task Tracker — Technical Approach

**Author:** Andrei (Arch)
**Date:** February 12, 2026
**Status:** Complete

---

## 1. Overview

The centralized task tracker is a new page (`tasks.html`) that reads all `data/work-items/*.json` files and presents them in a single AG Grid table. It extends the existing work items system — same data, new view. No new data directories, no new storage format.

**Key design decisions:**

1. **Slug-to-project-name resolution happens server-side.** The new `GET /api/tasks` endpoint reads all work-items files, cross-references with project data to resolve slugs to human-readable names and UUIDs, and returns a flat array with project info attached. Client gets everything it needs in one call.

2. **Cross-project save routes through existing per-project PUT.** When a cell is edited in the tasks grid, the client identifies the row's project UUID, collects all rows belonging to that project, strips the project wrapper, and sends the full array to `PUT /api/projects/:id/work-items`. Same write path, proven pattern.

3. **`js/tasks.js` is its own file.** The per-project work items code in `projects.js` is coupled to the project detail lifecycle (lazy-load AG Grid, destroy on collapse/expand). The tasks page has fundamentally different needs: full-page grid, eager AG Grid load, filters, a create-task modal, and cross-project save bookkeeping. Sharing code would mean extracting a third module for ~15 lines of badge renderer logic — not worth it. Duplicate the badge renderer, keep the files independent.

---

## 2. Schema Extension

### `server/src/schemas/workItem.ts` [Modify]

Add two optional fields to `WorkItemSchema` with empty string defaults. Backward-compatible — existing files without these fields will get defaults from Zod.

```typescript
export const WorkItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).default(""),
  description: z.string().default(""),        // NEW — longer context, not shown in grid v1
  status: WorkItemStatus.default("planned"),
  phase: z.string().default(""),
  owner: z.string().default(""),
  priority: WorkItemPriority.default("medium"),
  createdBy: z.string().default(""),           // NEW — who created the task
});
```

No migration needed. Zod's `.default("")` handles missing fields during parse. The `PutWorkItemsBody` and `WorkItemsFileSchema` both reference `WorkItemSchema`, so they automatically accept the new fields.

---

## 3. New API Endpoint

### `GET /api/tasks`

New route file: `server/src/routes/tasks.ts`. Mounted at `app.use("/api", taskRoutes)` in `server/src/index.ts`.

**Why a new route file?** The URL path `/api/tasks` is a top-level resource, not nested under `/api/projects`. The existing convention is one route file per top-level resource (projects, meetings, interviews, docs). Following pattern.

**Implementation:**

```typescript
import { Router } from "express";
import { listProjects } from "../store/projects.js";
import { getAllWorkItems } from "../store/workItems.js";

const router = Router();

router.get("/tasks", async (_req, res) => {
  try {
    // 1. Get all projects — build slug → { id, name } map
    const projects = await listProjects();
    const slugMap: Record<string, { id: string; name: string; slug: string }> = {};
    for (const p of projects) {
      if (p.slug) {
        slugMap[p.slug] = { id: p.id, name: p.name, slug: p.slug };
      }
    }

    // 2. Read all work-items files
    const allFiles = await getAllWorkItems();

    // 3. Flatten and attach project info
    const tasks = [];
    for (const file of allFiles) {
      const project = slugMap[file.projectSlug];
      if (!project) continue; // orphaned work-items file — skip
      for (const item of file.workItems) {
        tasks.push({ ...item, project });
      }
    }

    res.json({ tasks });
  } catch (err) {
    console.error("Error fetching all tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

export default router;
```

### New Store Function: `getAllWorkItems()`

Added to `server/src/store/workItems.ts`:

```typescript
export async function getAllWorkItems(): Promise<Array<{ projectSlug: string; workItems: WorkItem[] }>> {
  await ensureDir();
  const files = await readdir(WORK_ITEMS_DIR);
  const results: Array<{ projectSlug: string; workItems: WorkItem[] }> = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(WORK_ITEMS_DIR, file), "utf-8");
      const parsed = WorkItemsFileSchema.parse(JSON.parse(raw));
      results.push({ projectSlug: parsed.projectSlug, workItems: parsed.workItems });
    } catch {
      // skip corrupt files
    }
  }
  return results;
}
```

Imports `readdir` from `node:fs/promises` (already imported: `readFile`, `writeFile`, `mkdir` — just add `readdir`).

### Response Shape

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
        "id": "a7f1fd11-8d8f-4d47-b54b-ac382e97b085",
        "slug": "roadmap-tool",
        "name": "Roadmap Tool"
      }
    }
  ]
}
```

Note: `project.id` is included so the client can construct PUT URLs without a slug-to-UUID lookup. Thomas's spec showed `slug` and `name` — I'm adding `id` because the PUT endpoint uses the UUID: `PUT /api/projects/:id/work-items`.

---

## 4. Cross-Project Save Strategy

The tasks grid displays rows from multiple projects. When a cell is edited, the save must route to the correct project's PUT endpoint. Here's the flow:

### On Cell Edit

1. `onCellValueChanged` fires. The changed row has `data.project.id` identifying its project.
2. Debounced save (500ms) is scheduled, keyed by `project.id`. If the same project gets another edit within 500ms, the timer resets. Different projects can have independent timers.
3. When the timer fires:
   a. Iterate all grid rows via `api.forEachNode()`.
   b. Filter to rows where `data.project.id === targetProjectId`.
   c. Strip each row to the work item fields only: `{ id, title, description, status, phase, owner, priority, createdBy }`.
   d. Send `PUT /api/projects/{projectId}/work-items` with `{ workItems: [...] }`.
4. On success: flash the affected cells.
5. On failure: toast "Failed to save — retrying..." → single auto-retry after 2s.

### Why Per-Project Debounce?

Editing a "Roadmap Tool" task shouldn't delay saving a "Task Tracker" task edited moments later. Independent timers mean saves don't collide across projects.

### Save Function Pseudocode (for Alice)

```javascript
var _taskSaveTimers = {}; // projectId -> timeout id

function scheduleTaskSave(projectId) {
  if (_taskSaveTimers[projectId]) clearTimeout(_taskSaveTimers[projectId]);
  _taskSaveTimers[projectId] = setTimeout(function () {
    delete _taskSaveTimers[projectId];
    saveProjectTasks(projectId);
  }, 500);
}

function saveProjectTasks(projectId, retryCount) {
  retryCount = retryCount || 0;
  var workItems = [];
  gridApi.forEachNode(function (node) {
    if (node.data.project.id !== projectId) return;
    workItems.push({
      id: node.data.id,
      title: node.data.title,
      description: node.data.description || '',
      status: node.data.status || 'planned',
      phase: node.data.phase || '',
      owner: node.data.owner || '',
      priority: node.data.priority || 'medium',
      createdBy: node.data.createdBy || ''
    });
  });

  fetch('/api/projects/' + encodeURIComponent(projectId) + '/work-items', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workItems: workItems })
  })
    .then(function (res) {
      if (!res.ok) throw new Error('Save failed');
      // flash cells for the saved project
    })
    .catch(function () {
      if (retryCount < 1) {
        showToast('Failed to save — retrying...', true);
        setTimeout(function () { saveProjectTasks(projectId, 1); }, 2000);
      } else {
        showToast('Failed to save.', true);
      }
    });
}
```

---

## 5. New Page Structure

### `tasks.html` [New]

Standard TeamHQ page template. Copy the HTML skeleton from any existing page (e.g., `projects.html`). Key differences:

- **Title:** "Tasks — TeamHQ"
- **AG Grid loaded eagerly** — the grid IS the page, no lazy-load needed. Include AG Grid CSS + JS in the `<head>` and before `</body>` respectively.
- **No sidebar, no detail panel.** Full-width grid with filter bar above it.
- **Scripts:** `js/tasks.js` (new) loaded after AG Grid.
- **CSS:** Links to `css/spreadsheet.css` (AG Grid theme overrides) — same as projects.html and spreadsheets.html.

```html
<!-- AG Grid CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@34/styles/ag-grid.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@34/styles/ag-theme-quartz.css">
<link rel="stylesheet" href="css/spreadsheet.css">

<!-- Before </body> -->
<script src="https://cdn.jsdelivr.net/npm/ag-grid-community@34/dist/ag-grid-community.min.js"></script>
<script src="js/tasks.js"></script>
```

### `js/tasks.js` [New]

Vanilla JS IIFE. Responsibilities:

1. **Fetch & render:** Call `GET /api/tasks` on page load. Populate AG Grid.
2. **Filter bar:** Project/Status/Priority/Owner dropdowns + text search. Use AG Grid's `isExternalFilterPresent` + `doesExternalFilterPass` API.
3. **Inline editing:** Status and Priority use `agSelectCellEditor`. Owner and Phase use text editors. Title, ID, and Project are read-only.
4. **Cross-project save:** Per-project debounced PUT (see section 4).
5. **New task modal:** Opens on button click, fetches `GET /api/projects` to populate project dropdown, submits via `PUT /api/projects/:id/work-items`.
6. **Row click navigation:** Click on non-editable cell → `window.location = 'projects.html#' + slug`.

**Badge renderers:** Duplicate the ~15-line `wiBadgeCellRenderer` and status/priority color maps from `projects.js`. Same badge class names (`thq-badge thq-badge--{variant}`), same color mapping.

**Column definitions:**

```javascript
var columnDefs = [
  {
    field: 'project',
    headerName: 'Project',
    width: 160,
    editable: false,
    valueGetter: function (params) { return params.data.project.name; },
    cellStyle: { cursor: 'pointer', color: 'var(--color-text-secondary)' },
    cellRenderer: function (params) {
      var el = document.createElement('span');
      el.className = 'tasks__project-link';
      el.textContent = params.value;
      return el;
    }
  },
  { field: 'id', headerName: 'ID', width: 90, editable: false,
    cellStyle: { fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' } },
  { field: 'title', headerName: 'Title', flex: 2, editable: false,
    cellStyle: { color: 'var(--color-text-primary)' } },
  {
    field: 'status', headerName: 'Status', width: 130, editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['planned', 'in-progress', 'completed', 'deferred'] },
    cellRenderer: function (params) { return badgeCellRenderer(params, STATUS_BADGE); },
    comparator: statusComparator
  },
  {
    field: 'priority', headerName: 'Priority', width: 110, editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['high', 'medium', 'low'] },
    cellRenderer: function (params) { return badgeCellRenderer(params, PRIORITY_BADGE); }
  },
  {
    field: 'owner', headerName: 'Owner', width: 130, editable: true,
    cellRenderer: function (params) {
      // Avatar + name pattern — same as projects.js owner renderer
      if (!params.value) return '';
      var wrapper = document.createElement('span');
      wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
      var img = document.createElement('img');
      img.src = 'img/avatars/' + params.value.toLowerCase() + '.svg';
      img.alt = '';
      img.width = 20;
      img.height = 20;
      img.style.cssText = 'border-radius:50%;flex-shrink:0;';
      img.onerror = function () { img.style.display = 'none'; };
      wrapper.appendChild(img);
      var name = document.createElement('span');
      name.textContent = params.value;
      wrapper.appendChild(name);
      return wrapper;
    }
  },
  { field: 'phase', headerName: 'Phase', width: 100, editable: true,
    cellStyle: { color: 'var(--color-text-secondary)' } }
];
```

**Grid options:**

```javascript
var gridOptions = {
  columnDefs: columnDefs,
  rowData: tasks,
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
  },
  getRowId: function (params) {
    // Composite key: project slug + item id (ensures uniqueness across projects)
    return params.data.project.slug + '::' + params.data.id;
  },
  isExternalFilterPresent: function () { return hasActiveFilters(); },
  doesExternalFilterPass: function (node) { return passesFilters(node.data); },
  onCellValueChanged: function (event) {
    scheduleTaskSave(event.data.project.id);
  },
  onRowClicked: function (event) {
    // Navigate to project only if not clicking an editable cell
    if (event.colDef && event.colDef.editable) return;
    window.location = 'projects.html#' + event.data.project.slug;
  },
  initialState: {
    sort: {
      sortModel: [
        { colId: 'status', sort: 'asc' },
        { colId: 'priority', sort: 'asc' }
      ]
    }
  }
};
```

**Important: `getRowId` uses a composite key** (`slug::id`) because different projects can have items with the same ID (e.g., both might have "US-1"). Without this, AG Grid would deduplicate rows.

### New Task Modal

- Opened by "New Task" button click.
- Fetches `GET /api/projects` to populate the Project dropdown (all projects with slugs, not just those with existing tasks).
- On submit:
  1. Reads the selected project from the dropdown (has project `id` and `slug`).
  2. Gets all existing tasks for that project from the grid (filter by `project.id`).
  3. Generates next ID: `TT-{n+1}` where n = count of items for that project.
  4. Appends the new item to the array.
  5. Sends `PUT /api/projects/:id/work-items`.
  6. On success: adds the new row to the grid via `api.applyTransaction({ add: [newRow] })`, closes modal.

---

## 6. Navigation Updates

### US-TT-6: Add "Tasks" to all pages

**8 HTML files to update** (copy-paste nav, same as every other nav change):

`index.html`, `tools.html`, `projects.html`, `tasks.html` (new), `meetings.html`, `interviews.html`, `docs.html`, `spreadsheets.html`, `team.html`

**Nav link addition** — insert between "Projects" and "Meetings":

```html
<a href="tasks.html" class="nav__link">Tasks</a>
```

On `tasks.html`, this link gets the `nav__link--active` class and `aria-current="page"`.

**Hub card addition** (`index.html` only) — insert after the "Projects" card:

```html
<a href="tasks.html" class="hub__card">
  <h3 class="hub__card-name">Tasks</h3>
  <p class="hub__card-desc">Track all work items across every project.</p>
</a>
```

The hub grid currently has 7 cards. Adding an 8th makes a clean 4x2 grid (the CSS `hub__grid` likely uses auto-fill or a fixed column count — Alice should verify it wraps cleanly).

---

## 7. File Classification

### New Files

| File | Purpose |
|------|---------|
| `tasks.html` | New page — full-page AG Grid task tracker |
| `js/tasks.js` | Tasks page logic — grid, filters, modal, cross-project save |
| `server/src/routes/tasks.ts` | New route file — `GET /api/tasks` endpoint |

### Extended Files

| File | Classification | What Changes |
|------|---------------|-------------|
| `server/src/schemas/workItem.ts` | **Modify** | Add `description` and `createdBy` fields to `WorkItemSchema` (optional, empty defaults). Existing field definitions unchanged. |
| `server/src/store/workItems.ts` | **Extend** | Add `getAllWorkItems()` function and `readdir` import. Existing `getWorkItems` and `putWorkItems` untouched. |
| `server/src/index.ts` | **Extend** | Import and mount new `tasks` route. One import + one `app.use` line. |
| `index.html` | **Extend** | Add "Tasks" hub card after "Projects". Add "Tasks" nav link. |
| `tools.html` | **Extend** | Add "Tasks" nav link between "Projects" and "Meetings". |
| `projects.html` | **Extend** | Add "Tasks" nav link. |
| `meetings.html` | **Extend** | Add "Tasks" nav link. |
| `interviews.html` | **Extend** | Add "Tasks" nav link. |
| `docs.html` | **Extend** | Add "Tasks" nav link. |
| `spreadsheets.html` | **Extend** | Add "Tasks" nav link. |
| `team.html` | **Extend** | Add "Tasks" nav link. |

### No Restructure files. All changes are additive or minimal modification.

The `workItem.ts` schema change is **Modify** (not Extend) because we're adding fields to the existing `WorkItemSchema` object definition — the shape of the type changes. However, the change is backward-compatible (defaults make it non-breaking) and risk is low.

---

## 8. API Contract (Alice + Jonah Alignment)

This is the contract both developers build to. Jonah implements the server side, Alice consumes it.

### `GET /api/tasks` (NEW)

**Response (200):**
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
        "id": "a7f1fd11-8d8f-4d47-b54b-ac382e97b085",
        "slug": "roadmap-tool",
        "name": "Roadmap Tool"
      }
    }
  ]
}
```

**Response (200, no work items):**
```json
{ "tasks": [] }
```

**Response (500):** `{ "error": "Failed to fetch tasks" }`

### Existing Endpoints (unchanged)

**`GET /api/projects/:id/work-items`** — Still works for per-project view. Response now includes `description` and `createdBy` fields (with empty defaults for existing data).

**`PUT /api/projects/:id/work-items`** — Still works for saves from both per-project and cross-project views. Request body can now include `description` and `createdBy`.

**`GET /api/projects`** — Used by the new task modal to populate the project dropdown. No changes to this endpoint.

---

## 9. Build Order

### Jonah (BE) — Can start immediately after this doc

1. Extend `WorkItemSchema` in `server/src/schemas/workItem.ts` — add `description` and `createdBy` fields.
2. Add `getAllWorkItems()` to `server/src/store/workItems.ts`.
3. Create `server/src/routes/tasks.ts` with `GET /api/tasks`.
4. Mount the new route in `server/src/index.ts`.
5. Test with curl: `curl localhost:3000/api/tasks | jq`

### Alice (FE) — Needs Robert's design spec AND Jonah's API

1. Create `tasks.html` from existing page template.
2. Create `js/tasks.js` — AG Grid setup, column defs, badge renderers.
3. Wire up cross-project save (per-project debounced PUT).
4. Build filter bar (Project/Status/Priority/Owner dropdowns + text search).
5. Build new task modal.
6. Add row-click navigation to project page.
7. Update nav on all 8+ HTML pages (add "Tasks" link).
8. Add "Tasks" hub card to `index.html`.

**Alice can stub the API** with hardcoded JSON matching the contract above until Jonah's endpoints are ready. The API contract is the handshake.

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| **Composite row IDs** — AG Grid needs unique row IDs across all projects. Two projects could have "US-1". | `getRowId` uses `slug::id` as a composite key. Documented in section 5. |
| **Cross-project save correctness** — Must save ALL rows for a project, not just the changed row. | Save function iterates `forEachNode`, filters by project ID, sends the full array. Same pattern as per-project save. |
| **Nav congestion** — 8 nav links is more than the current 7. | Links are short labels. At narrow widths, the nav may need to wrap or truncate. Alice should verify. Not a blocker — can be addressed in design review. |
| **Orphaned work-items files** — A work-items file could exist for a deleted project. | The `GET /api/tasks` endpoint skips work-items files whose slug doesn't match any project. Silent skip, no error. |

---

*Tech approach written by Andrei (Arch). Downstream agents: Robert reads this for design constraints, Alice and Jonah build to the API contract in section 8.*
