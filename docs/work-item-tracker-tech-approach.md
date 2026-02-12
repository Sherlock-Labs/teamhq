# Work Item Tracker — Technical Approach

**Author:** Andrei (Arch)
**Date:** February 10, 2026
**Status:** Complete

---

## 1. Data Storage

Work items live in `data/work-items/{slug}.json`, keyed by the project's slug (same slug used for `data/tasks/{slug}.json`). The directory is created on first write.

### Zod Schema (`server/src/schemas/workItem.ts`)

```typescript
import { z } from "zod";

export const WorkItemStatus = z.enum(["planned", "in-progress", "completed", "deferred"]);
export const WorkItemPriority = z.enum(["high", "medium", "low"]);

export const WorkItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).default(""),
  status: WorkItemStatus.default("planned"),
  phase: z.string().default(""),
  owner: z.string().default(""),
  priority: WorkItemPriority.default("medium"),
});

export type WorkItem = z.infer<typeof WorkItemSchema>;

export const WorkItemsFileSchema = z.object({
  projectSlug: z.string(),
  workItems: z.array(WorkItemSchema).default([]),
});

export const PutWorkItemsBody = z.object({
  workItems: z.array(WorkItemSchema).min(0).max(200),
});
```

---

## 2. API Endpoints

Two new endpoints, added to the existing project routes file (`server/src/routes/projects.ts`). The routes use the project UUID in the URL and resolve to the slug internally via `getProject()`.

### GET `/api/projects/:id/work-items`

1. `getProject(id)` to get the slug. 404 if project not found.
2. Read `data/work-items/{slug}.json`. If file doesn't exist, return `{ workItems: [] }`.
3. Parse through `WorkItemsFileSchema` for validation.
4. Return `{ workItems: [...] }`.

### PUT `/api/projects/:id/work-items`

1. `getProject(id)` to get the slug. 404 if project not found. 400 if project has no slug.
2. Validate request body with `PutWorkItemsBody.parse(req.body)`.
3. Write `{ projectSlug, workItems }` to `data/work-items/{slug}.json`.
4. Return `{ workItems: [...] }` (the saved array).

### Store Function (`server/src/store/workItems.ts`)

```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { WorkItemsFileSchema } from "../schemas/workItem.js";
import type { WorkItem } from "../schemas/workItem.js";

const WORK_ITEMS_DIR = join(import.meta.dirname, "../../../data/work-items");

async function ensureDir(): Promise<void> {
  await mkdir(WORK_ITEMS_DIR, { recursive: true });
}

export async function getWorkItems(slug: string): Promise<WorkItem[]> {
  try {
    const raw = await readFile(join(WORK_ITEMS_DIR, `${slug}.json`), "utf-8");
    const parsed = WorkItemsFileSchema.parse(JSON.parse(raw));
    return parsed.workItems;
  } catch {
    return []; // file doesn't exist yet — empty array
  }
}

export async function putWorkItems(slug: string, workItems: WorkItem[]): Promise<WorkItem[]> {
  await ensureDir();
  const data = { projectSlug: slug, workItems };
  await writeFile(join(WORK_ITEMS_DIR, `${slug}.json`), JSON.stringify(data, null, 2));
  return workItems;
}
```

### Route Pattern

Add the two routes directly to `server/src/routes/projects.ts`, after the existing `/projects/:id/notes` routes. Import from the new store and schema files. Follow the existing error-handling pattern (ZodError -> 400, ENOENT -> 404, catch-all -> 500).

---

## 3. AG Grid Integration on Projects Page

### Loading Strategy: Lazy-load on first detail expand

AG Grid is ~200KB. Don't load it eagerly on every projects page visit. Instead:

1. **Add AG Grid CSS links to `projects.html` `<head>`** — CSS is tiny (~5KB combined) and prevents FOUC when the grid appears. Add the same two CDN links used in `spreadsheets.html`:
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@34/styles/ag-grid.css">
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@34/styles/ag-theme-quartz.css">
   ```

2. **Also add the existing `css/spreadsheet.css`** link to `projects.html` — this is the TeamHQ AG Grid theme override.

3. **Lazy-load the AG Grid JS** when a project detail is first expanded and the project has a slug. Use a simple script-injection pattern:
   ```javascript
   var _agGridLoaded = false;
   var _agGridLoading = null; // Promise

   function ensureAgGrid() {
     if (_agGridLoaded) return Promise.resolve();
     if (_agGridLoading) return _agGridLoading;
     _agGridLoading = new Promise(function (resolve, reject) {
       var script = document.createElement('script');
       script.src = 'https://cdn.jsdelivr.net/npm/ag-grid-community@34/dist/ag-grid-community.min.js';
       script.onload = function () { _agGridLoaded = true; resolve(); };
       script.onerror = function () { reject(new Error('AG Grid failed to load')); };
       document.head.appendChild(script);
     });
     return _agGridLoading;
   }
   ```

4. **`renderWorkItemsSection(projectId, slug, containerEl)`** — called from `renderDetail()` after the pipeline section, before progress notes. This function:
   - Calls `ensureAgGrid()` first.
   - Fetches `GET /api/projects/{id}/work-items`.
   - Creates the AG Grid instance with the column defs from the requirements.
   - Wires up cell editing, add/delete, and debounced auto-save.

### Cell Renderers

Status and priority columns use the existing `badgeCellRenderer` pattern from `js/spreadsheet.js`. However, since `spreadsheet.js` scopes that function inside its IIFE, Alice will need to either:
- **(Recommended)** Duplicate the badge renderer logic in the work items code — it's ~15 lines, not worth a shared module for two uses.
- The status badge needs custom color mapping (planned=gray, in-progress=blue, completed=green, deferred=amber), which differs from the generic `badgeColorClass` in spreadsheet.js anyway.

### Grid Lifecycle

Store a reference to the grid API in a module-level map (like `_spreadsheetInstances` in the existing code). Destroy and recreate when the detail is collapsed/re-expanded to prevent leaks.

---

## 4. File Classification

### New Files
| File | Purpose |
|------|---------|
| `server/src/schemas/workItem.ts` | Zod schema for work items |
| `server/src/store/workItems.ts` | Read/write `data/work-items/{slug}.json` |
| `data/work-items/` | Directory for per-project work item JSON (created at runtime) |

### Extended Files
| File | Classification | What Changes |
|------|---------------|-------------|
| `server/src/routes/projects.ts` | **Extend** | Two new route handlers appended (GET + PUT work-items). No changes to existing routes. |
| `projects.html` | **Extend** | Add AG Grid CSS links to `<head>`. No other changes. |
| `js/projects.js` | **Extend** | New `renderWorkItemsSection()` function, `ensureAgGrid()` loader, work item grid config, add/delete handlers, debounced save logic. Called from existing `renderDetail()`. No changes to existing functions — just a new call site in `renderDetail()` and new functions at the bottom of the IIFE. |
| `css/spreadsheet.css` | **Extend** | May need minor additions for work-item-specific badge colors (status=deferred amber). Existing badge classes cover most cases. |

### No Restructure files. All changes are additive.

---

## 5. API Contract (Alice + Jonah alignment)

This is the contract both developers build to. Jonah implements the server side, Alice consumes it.

### `GET /api/projects/:id/work-items`

**Response (200):**
```json
{
  "workItems": [
    {
      "id": "US-1",
      "title": "User signup and login",
      "status": "planned",
      "phase": "v1.0",
      "owner": "",
      "priority": "high"
    }
  ]
}
```

**Response (200, no items yet):**
```json
{ "workItems": [] }
```

**Response (404):** `{ "error": "Project not found" }`

### `PUT /api/projects/:id/work-items`

**Request body:**
```json
{
  "workItems": [
    { "id": "US-1", "title": "User signup and login", "status": "in-progress", "phase": "v1.0", "owner": "Alice", "priority": "high" },
    { "id": "US-2", "title": "Team management", "status": "planned", "phase": "v1.0", "owner": "", "priority": "medium" }
  ]
}
```

**Response (200):** Same shape as GET — `{ "workItems": [...] }`
**Response (400):** `{ "error": "Validation failed", "details": [...] }` (Zod errors)
**Response (404):** `{ "error": "Project not found" }`

### Build Order

Alice and Jonah can work in parallel after Robert's design spec:
- **Jonah:** schema + store + routes (server-side). Test with curl.
- **Alice:** AG Grid integration, lazy loader, cell editors, add/delete, import parser, auto-save. Can stub the API (hardcode JSON) until Jonah's endpoints are ready — the contract above is the handshake.

---

*Tech approach written by Andrei (Arch). Downstream agents: Robert reads this for design constraints, Alice and Jonah build to the API contract above.*
