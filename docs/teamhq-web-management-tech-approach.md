# TeamHQ Web Management Interface - Technical Approach

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Vanilla JS (enhanced) | No framework migration. The page is one screen with 4 CRUD operations — React is overkill. |
| Backend | Express + TypeScript | Same stack as OST tool. The team knows it. |
| Data storage | JSON files on disk | Same pattern as OST tool's session store. Simple, no setup, survives restarts. |
| Project structure | New `server/` directory at repo root | Dedicated backend for TeamHQ. Not inside `ost-tool/`, not a shared server. |
| Dev setup | Vite proxies `/api` to Express | Same pattern as OST tool. One `npm run dev` starts both. |

---

## 1. Frontend: Stay Vanilla JS

**Decision: No React. Enhance the existing vanilla JS approach.**

The landing page is plain HTML/CSS/JS and it works well. The new management features are:
- A "New Project" button that opens a form
- Inline editing of project fields
- A delete button with a confirmation dialog
- Fetching project data from an API instead of a static JSON file

This is standard DOM manipulation. A form, some fetch calls, and DOM updates. The existing `js/tasks.js` already does fetch + template rendering. The management layer extends this pattern, it doesn't replace it.

Why not React:
- Migrating the landing page to React means rebuilding the hero, tools, roster, and how-it-works sections as React components — all for zero functional benefit on those sections.
- The interactive surface area is small: one form, one list, edit/delete actions.
- The team would need to set up React, a build pipeline, JSX, and then rewrite all existing HTML as components.
- The OST tool used React because it has a complex tree visualization with React Flow. The management board is a flat list of cards.

What the vanilla approach looks like:
- A new `js/projects.js` module that replaces the static `js/tasks.js` rendering in the Tasks section.
- It fetches from `/api/projects` instead of `data/tasks.json`.
- Create/edit uses a modal form built with DOM APIs.
- Optimistic updates: update the DOM immediately, roll back on API failure.
- The existing static sections (hero, tools, roster, how it works) remain untouched HTML.

### JS Conventions (same as existing)

- IIFE wrapper, strict mode, no globals
- Fetch API for HTTP calls
- Template literals for HTML generation
- Single delegated event listener pattern on the container
- No external JS dependencies

---

## 2. Backend: Express + TypeScript

**Decision: New Express server dedicated to TeamHQ, same stack as OST tool.**

The OST tool's backend uses Express 5 + TypeScript + tsx for dev. Replicate this exactly:

- Express 5 for the HTTP server
- TypeScript with tsx for dev (watch mode)
- Zod for request validation
- uuid for ID generation

The TeamHQ server is separate from the OST tool's server. They serve different apps at different ports. No shared backend.

### Port Assignment

| Service | Port |
|---------|------|
| TeamHQ Vite dev server (frontend) | 5174 |
| TeamHQ Express server (backend) | 3002 |
| OST Tool Vite (for reference) | 5173 |
| OST Tool Express (for reference) | 3001 |

Port 5174 for the landing page Vite dev server (currently it's on Vite's default, which is 5173 — but that conflicts with OST tool, so we pin it to 5174). Port 3002 for the TeamHQ API.

---

## 3. Data Storage: JSON Files on Disk

**Decision: One JSON file per project, stored in `data/projects/`.**

This is the same pattern as the OST tool's session store (`ost-tool/data/sessions/`). It works well for single-user, low-volume use:

- Each project is a separate `{id}.json` file in `data/projects/`.
- Reads: parse the file. Writes: serialize and overwrite the file.
- List all: read the directory, parse each file, sort, return.
- No database server, no SQLite driver, no migrations. Just the filesystem.

Why not SQLite:
- SQLite adds a native dependency (better-sqlite3 or similar) that complicates setup.
- For dozens of projects, filesystem read/write is fast enough.
- The OST tool already uses this pattern successfully.

Why not a single JSON file:
- Individual files are safer: a write to one project can't corrupt another.
- Reads of a single project are O(1) instead of loading the entire collection.
- Cleaner diffs in git if projects are committed.

### Data Directory

```
data/
  projects/           # New — one JSON file per project
    {uuid}.json
  tasks.json          # Existing — legacy static data (kept for reference)
```

### Migration from `data/tasks.json`

The existing `data/tasks.json` contains 5 seed projects. On first server start, if `data/projects/` is empty, the server reads `data/tasks.json` and creates individual project files from it. This is a one-time migration that preserves history.

The migration maps the existing fields:
- `id` → keep as-is (these are slug IDs like `teamhq-landing-page`, not UUIDs — that's fine)
- `name`, `description`, `status` → copy directly
- `completedDate` → map to `completedAt` as an ISO timestamp
- `tasks` array → **not migrated in Phase 1** (task management is Phase 2). Stored as-is in the JSON for future use, but not exposed via the API.
- `createdAt` → infer from `completedDate` or set to migration timestamp
- `updatedAt` → set to migration timestamp

---

## 4. API Design

### Base URL

All API routes are under `/api/projects`.

### Endpoints

#### `GET /api/projects`

List all projects, ordered by: in-progress first, then planned, then completed (most recent first within each group).

**Response: `200 OK`**
```json
{
  "projects": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "TeamHQ Web Management",
      "description": "Interactive project management through the web UI.",
      "status": "in-progress",
      "createdAt": "2025-02-06T10:00:00.000Z",
      "updatedAt": "2025-02-06T12:00:00.000Z",
      "completedAt": null
    }
  ]
}
```

#### `POST /api/projects`

Create a new project.

**Request body:**
```json
{
  "name": "New Project",
  "description": "Optional description",
  "status": "planned"
}
```

- `name` — required, non-empty string
- `description` — optional string, defaults to `""`
- `status` — optional, one of `planned`, `in-progress`, `completed`. Defaults to `planned`.

**Response: `201 Created`**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "New Project",
  "description": "",
  "status": "planned",
  "createdAt": "2025-02-06T10:00:00.000Z",
  "updatedAt": "2025-02-06T10:00:00.000Z",
  "completedAt": null
}
```

**Error: `400 Bad Request`**
```json
{
  "error": "Validation failed",
  "details": [{ "field": "name", "message": "Name is required" }]
}
```

#### `GET /api/projects/:id`

Get a single project by ID.

**Response: `200 OK`** — same shape as a single project object above.

**Error: `404 Not Found`**
```json
{
  "error": "Project not found"
}
```

#### `PATCH /api/projects/:id`

Update a project. Only include the fields being changed.

**Request body (partial):**
```json
{
  "status": "completed"
}
```

All fields are optional. Allowed fields: `name`, `description`, `status`.

When `status` changes to `completed`, the server sets `completedAt` to the current timestamp. When `status` changes away from `completed`, the server clears `completedAt` to `null`.

`updatedAt` is always set to the current timestamp on any update.

**Response: `200 OK`** — the full updated project object.

**Error: `400 Bad Request`** — validation errors (same shape as POST).

**Error: `404 Not Found`** — project doesn't exist.

#### `DELETE /api/projects/:id`

Delete a project.

**Response: `204 No Content`**

**Error: `404 Not Found`** — project doesn't exist.

### Validation Schema (Zod)

```typescript
import { z } from "zod";

const ProjectStatus = z.enum(["planned", "in-progress", "completed"]);

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  status: ProjectStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  status: ProjectStatus.optional().default("planned"),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  description: z.string().optional(),
  status: ProjectStatus.optional(),
});
```

---

## 5. Project Structure

### Directory Layout

```
teamhq/
  index.html                  # Landing page (unchanged)
  css/styles.css              # Landing page styles (add management UI styles)
  js/
    tasks.js                  # Existing static task history renderer (replaced by projects.js)
    projects.js               # New: project management UI (fetch, render, CRUD forms)
  data/
    tasks.json                # Legacy static data (kept, read by migration)
    projects/                 # New: one JSON file per project
  server/                     # New: Express backend for TeamHQ
    package.json
    tsconfig.json
    src/
      index.ts                # Express app entry point
      routes/
        projects.ts           # CRUD route handlers
      schemas/
        project.ts            # Zod schemas
      store/
        projects.ts           # File-system read/write operations
      migrate.ts              # One-time migration from data/tasks.json
  ost-tool/                   # Existing (unchanged)
  docs/                       # Existing (unchanged)
  package.json                # Root: update to add workspace + scripts
  vite.config.ts              # New: configure Vite proxy for /api
```

### Root `package.json` Changes

The current root `package.json` uses Vite as a static dev server. Update it to:

1. Add `server` as an npm workspace.
2. Add a `dev` script that runs both Vite (for the static frontend) and Express (for the API) concurrently, same pattern as the OST tool.
3. Pin the Vite dev server to port 5174.

```json
{
  "name": "teamhq",
  "private": true,
  "workspaces": ["server"],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev -w server\" \"vite --port 5174\"",
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "concurrently": "^9.1.2"
  }
}
```

### Vite Configuration

Add a `vite.config.ts` at the repo root to proxy `/api` calls to the Express server:

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3002",
    },
  },
});
```

This means the frontend JS can fetch `/api/projects` and Vite transparently proxies to Express during development. No CORS issues.

---

## 6. Migration Path

### Step-by-step transition

1. **Backend first (Jonah):** Create the `server/` directory with Express, routes, store, and migration logic. The server reads `data/tasks.json` on first start and populates `data/projects/`. The API is functional and testable via curl before any frontend work.

2. **Frontend in parallel (Alice):** Create `js/projects.js` that replaces the Tasks section rendering. Instead of fetching `data/tasks.json`, it fetches from `/api/projects`. Add the "New Project" button, create/edit form modal, and delete confirmation. Add the management-specific CSS to `css/styles.css`.

3. **Swap the script tag:** In `index.html`, replace `<script src="js/tasks.js" defer></script>` with `<script src="js/projects.js" defer></script>`. The Tasks section becomes the Projects section.

4. **Update nav and section headings:** Rename "Tasks" to "Projects" in the nav link and section heading. Update the subtitle from "A history of what we've shipped" to something like "Create and manage projects."

### What stays the same

- `index.html` structure: hero, tools, projects (renamed from tasks), roster, how it works, footer
- `css/styles.css`: all existing styles preserved; new management styles appended
- All existing sections besides Tasks: completely unchanged
- `data/tasks.json`: kept as a read-only archive; the migration reads it once

### What changes

- The Tasks section becomes interactive instead of read-only
- A new Express server provides the API
- Project data moves from a static JSON file to a server-managed data directory
- `npm run dev` now starts both Vite and Express

---

## 7. Key Technical Notes for the Team

### For Jonah (Backend)

- Follow the OST tool's session store pattern exactly for the file-based store. See `ost-tool/server/src/session-store.ts`.
- Use Express 5 (same version as OST tool).
- The migration from `data/tasks.json` should be idempotent: if `data/projects/` already has files, skip the migration.
- Path IDs from the legacy data (like `teamhq-landing-page`) are fine as-is. New projects get UUIDs.
- Validate all inputs with Zod. Return structured error responses.

### For Alice (Frontend)

- No build step for the frontend JS. Keep it as plain vanilla JS loaded via `<script>` tag.
- The project cards should reuse the existing `.project-card` CSS classes where possible. The visual change is adding action buttons (edit, delete) and a "New Project" button/form.
- Optimistic updates: add the project to the DOM immediately on create, remove on delete. If the API call fails, revert and show an error.
- The form for create/edit should be a modal overlay. Keep it simple: name input, description textarea, status select.
- The existing task-level expand/collapse behavior (subtasks, files changed, decisions) can be removed in Phase 1 since we're not exposing tasks yet. Just show the project-level cards.

### For Robert (Designer)

- The management UI lives inside the existing Tasks section (renamed to Projects). It should feel like a natural part of the page, not a separate app.
- Key new elements to design: "New Project" button, create/edit form modal, action buttons (edit/delete) on project cards, confirmation dialog for delete, empty state.
- Match the existing dark theme design tokens exactly. No new colors needed — use the existing indigo accent, zinc neutrals, and status colors (green/yellow/gray).
