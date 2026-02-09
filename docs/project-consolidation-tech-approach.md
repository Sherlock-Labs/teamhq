# Project Consolidation — Technical Approach

**Author:** Andrei (Technical Architect)
**Status:** Draft
**Date:** 2026-02-09
**Depends on:** [project-consolidation-requirements.md](./project-consolidation-requirements.md)

---

## Overview

This document defines the technical approach for merging the Projects and Portfolio systems into a single unified project section. The change is moderate on the backend (schema extension, merge-on-read logic, precomputed stats) and significant on the frontend (merging ~490 lines from `portfolio.js` into `projects.js`, unified card/detail rendering, CSS consolidation).

The core architectural decision is **merge-on-read**: agents continue writing pipeline task data to `data/tasks/{slug}.json`, and the server merges that data into the project response at read time. This avoids changing any agent profiles and prevents write collisions.

---

## 1. Schema Changes

### 1.1 New Zod Types

Add two new schemas to `server/src/schemas/project.ts`:

```typescript
export const PipelineTaskStatus = z.enum(["completed", "in-progress", "pending", "skipped"]);

export const PipelineTaskSchema = z.object({
  title: z.string(),
  agent: z.string(),
  role: z.string(),
  status: PipelineTaskStatus,
  subtasks: z.array(z.string()).default([]),
  filesChanged: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
});

export type PipelineTask = z.infer<typeof PipelineTaskSchema>;

export const PipelineSchema = z.object({
  tasks: z.array(PipelineTaskSchema).default([]),
});

export type Pipeline = z.infer<typeof PipelineSchema>;
```

### 1.2 Extend ProjectSchema

Add `slug` and `pipeline` to the existing `ProjectSchema`:

```typescript
export const ProjectSchema = z.object({
  id: z.string(),
  slug: z.string().nullable().default(null),       // NEW — optional human-readable identifier
  name: z.string().min(1),
  description: z.string(),
  status: ProjectStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  goals: z.string().default(""),
  constraints: z.string().default(""),
  brief: z.string().default(""),
  notes: z.array(NoteSchema).default([]),
  kickoffPrompt: z.string().nullable().default(null),
  activeSessionId: z.string().nullable().default(null),
  pipeline: PipelineSchema.default({ tasks: [] }),  // NEW — pipeline task history
});
```

### 1.3 Extend CreateProjectSchema

Add optional `slug` to `CreateProjectSchema`:

```typescript
export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),                      // NEW — if omitted, auto-generated from name
  description: z.string().optional().default(""),
  status: ProjectStatus.optional().default("planned"),
  goals: z.string().optional().default(""),
  constraints: z.string().optional().default(""),
  brief: z.string().optional().default(""),
});
```

### 1.4 Backward Compatibility

Both new fields have Zod defaults (`slug` defaults to `null`, `pipeline` defaults to `{ tasks: [] }`). Existing project JSON files that lack these fields will parse correctly through `ProjectSchema.parse()` without modification. No existing file needs to be touched for the schema to work.

---

## 2. Slug Generation

### 2.1 Algorithm

Slugs are generated with a simple `toSlug()` utility function added to `server/src/store/projects.ts`:

```typescript
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")   // non-alphanumeric -> hyphen
    .replace(/^-+|-+$/g, "")        // trim leading/trailing hyphens
    .slice(0, 80);                   // reasonable max length
}
```

### 2.2 When Slugs Are Set

- **On project creation:** If `slug` is provided in the request body, use it directly. Otherwise, auto-generate from `name` using `toSlug()`.
- **On migration:** The migration script sets `slug` on existing projects (details in Section 5).
- **Slugs are immutable after creation.** Renaming a project does not change the slug. This keeps the link to `data/tasks/{slug}.json` stable.

### 2.3 Slug Uniqueness

Slugs do not need to be globally unique. Two projects with the same slug would merge the same tasks file, but in practice this is unlikely — project names are distinct, and the slug is derived from the name. No enforcement is needed; this is not a database key.

---

## 3. Merge-on-Read Logic

### 3.1 Location

The merge logic lives in `server/src/store/projects.ts`, in a new helper function `mergeTasksPipeline()`. It is called from two places:

1. **`getProject(id)`** — merges pipeline data into the single-project response
2. **`listProjects()`** — merges pipeline data into each project in the list (for stats and avatar computation)

### 3.2 Tasks File Schema

Add a lightweight schema for parsing `data/tasks/{slug}.json` files:

```typescript
const TasksFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().default(""),
  status: z.string().optional().default("planned"),
  completedDate: z.string().optional(),
  tasks: z.array(PipelineTaskSchema).default([]),
});
```

### 3.3 Merge Function

```typescript
const TASKS_DIR = join(import.meta.dirname, "../../../data/tasks");

async function mergeTasksPipeline(project: Project): Promise<Project> {
  if (!project.slug) return project;

  try {
    const tasksPath = join(TASKS_DIR, `${project.slug}.json`);
    const raw = await readFile(tasksPath, "utf-8");
    const tasksFile = TasksFileSchema.parse(JSON.parse(raw));

    if (tasksFile.tasks.length > 0) {
      // External file takes precedence (R2: source of truth for agent-written data)
      return {
        ...project,
        pipeline: { tasks: tasksFile.tasks },
      };
    }
  } catch {
    // No matching tasks file or parse error — return project unchanged
  }

  return project;
}
```

**Key behaviors:**
- If `project.slug` is `null`, no merge is attempted (project has no tasks file link).
- If the tasks file does not exist, the project is returned unchanged — no error.
- If the tasks file exists and has tasks, those tasks **replace** the project's `pipeline.tasks` entirely. The external file is the source of truth per R2.
- If the tasks file exists but has an empty `tasks` array, the project's embedded `pipeline.tasks` is kept.

### 3.4 Updated Store Functions

**`getProject(id)`:**
```typescript
export async function getProject(id: string): Promise<Project> {
  const raw = await readFile(projectPath(id), "utf-8");
  const project = ProjectSchema.parse(JSON.parse(raw));
  return mergeTasksPipeline(project);
}
```

**`listProjects()`:**
```typescript
export async function listProjects(): Promise<Project[]> {
  await ensureDir();
  const files = await readdir(DATA_DIR);
  const projects: Project[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf-8");
      const project = ProjectSchema.parse(JSON.parse(raw));
      projects.push(await mergeTasksPipeline(project));
    } catch {
      // skip corrupt files
    }
  }
  return projects.sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
```

### 3.5 Performance Consideration

The merge reads one additional file per project that has a slug. For 10-20 projects, this adds 10-20 file reads on `listProjects()`. Each tasks file is small (typically 5-50KB). On a local filesystem, this is negligible (<10ms total). No caching layer is needed for v1.

---

## 4. List Endpoint Changes

### 4.1 Precomputed Pipeline Stats

The `GET /api/projects` endpoint currently strips `notes` and `kickoffPrompt` for a lean payload. It should also precompute pipeline summary stats so the frontend doesn't need the full `pipeline.tasks` array for the list view.

**Updated list endpoint in `server/src/routes/projects.ts`:**

```typescript
router.get("/projects", async (_req, res) => {
  try {
    const projects = await listProjects();
    const summaries = projects.map(({ notes, kickoffPrompt, pipeline, ...rest }) => {
      // Precompute pipeline stats for list view
      const pipelineStats = computePipelineStats(pipeline);
      return {
        ...rest,
        pipeline: pipelineStats,
      };
    });
    res.json({ projects: summaries });
  } catch (err) {
    console.error("Error listing projects:", err);
    res.status(500).json({ error: "Failed to list projects" });
  }
});
```

### 4.2 Pipeline Stats Shape

Add a `computePipelineStats()` helper in the routes file (or a shared utils):

```typescript
function computePipelineStats(pipeline: Pipeline): {
  taskCount: number;
  fileCount: number;
  decisionCount: number;
  agents: string[];   // lowercased agent names for avatar rendering
} {
  const agentSet = new Set<string>();
  let fileCount = 0;
  let decisionCount = 0;

  for (const task of pipeline.tasks) {
    agentSet.add(task.agent.toLowerCase());
    fileCount += task.filesChanged.length;
    decisionCount += task.decisions.length;
  }

  return {
    taskCount: pipeline.tasks.length,
    fileCount,
    decisionCount,
    agents: Array.from(agentSet),
  };
}
```

### 4.3 Detail Endpoint

The `GET /api/projects/:id` endpoint returns the full project including the full `pipeline.tasks` array (no stripping). This is used by the detail view to render the full pipeline section.

No change to the detail endpoint shape — it already returns everything from `getProject()`, which now includes merged pipeline data.

---

## 5. Migration Script

### 5.1 Purpose

The migration script links existing projects to their tasks files by setting the `slug` field, and creates new project entries for tasks-only projects (those that exist in `data/tasks/` but not in `data/projects/`).

### 5.2 File: `scripts/migrate-projects.mjs`

```
Input:
  - data/tasks/index.json (list of slugs)
  - data/tasks/{slug}.json (task files)
  - data/projects/*.json (existing projects)

Output:
  - Updated data/projects/*.json files (slug field added)
  - New data/projects/{slug}.json files (for tasks-only projects)

Side effects: None on data/tasks/ — those files are left intact.
```

### 5.3 Algorithm

1. **Load all existing projects** from `data/projects/` into a map keyed by filename (without `.json` extension).
2. **Load `data/tasks/index.json`** to get the list of all task slugs.
3. **For each slug** in the index:
   a. **Check if a project file exists with that slug as filename** (e.g., `data/projects/ost-tool.json`). If so, read it, add `slug: "{slug}"` and `pipeline: { tasks: [] }` (defaults), and write it back. Log as "updated".
   b. **If no slug-named file exists**, scan all project files for one whose `name` matches the task file's `name` (case-insensitive). If found, add `slug` to that project and write it back. Log as "matched by name".
   c. **If no match at all**, create a new project file at `data/projects/{slug}.json` with:
      - `id`: the slug (these are the legacy slug-ID projects)
      - `slug`: the slug
      - `name`, `description`, `status` from the tasks file
      - `createdAt`, `updatedAt`: now (or derived from `completedDate` if available)
      - `completedAt`: derived from `completedDate` if status is `completed`, else `null`
      - `goals`, `constraints`, `brief`: empty strings
      - `notes`: empty array
      - `kickoffPrompt`: null
      - `activeSessionId`: null
      - `pipeline`: `{ tasks: [] }` (will be merged on read anyway)
      - Log as "created".
4. **UUID-only projects** (those in `data/projects/` with UUID filenames and no matching slug) are left unchanged. They already have `pipeline` defaulting to `{ tasks: [] }` via Zod.
5. **Log summary**: "Updated: N, Matched by name: N, Created: N, Skipped: N".

### 5.4 Idempotency

The script is idempotent:
- Setting `slug` on a project that already has the correct `slug` is a no-op.
- Creating a project file that already exists (from a previous run) overwrites with the same data.
- The script checks for existing `slug` values before overwriting.

### 5.5 Current Data Landscape

Based on the actual files:

| Project File | Named By | Has Tasks File? | Action |
|---|---|---|---|
| `ost-tool.json` | slug | Yes (`data/tasks/ost-tool.json`) | Add `slug: "ost-tool"` |
| `teamhq-landing-page.json` | slug | Yes | Add `slug: "teamhq-landing-page"` |
| `teamhq-redesign.json` | slug | Yes | Add `slug: "teamhq-redesign"` |
| `task-history.json` | slug | Yes | Add `slug: "task-history"` |
| `85f12716-...json` | UUID | No | Skip (PDF editor, no pipeline) |
| `764cecde-...json` | UUID | Yes (`revenue-model`) | Match by name, add slug |
| `a40d5cfc-...json` | UUID | Check | Match by name if applicable |
| `7726b222-...json` | UUID | Check | Match by name if applicable |
| `0adfe81c-...json` | UUID | Check | Match by name if applicable |
| `e6d4689e-...json` | UUID | Check | Match by name if applicable |

Tasks files without matching projects (e.g., `ost-recommendation-redesign`, `phase3a-live-agent-progress`, `teamhq-mobile-app`, `activity-profiles`, `teamhq-redesign-v2`, `custom-meetings`, `project-tracking-improvements`, `ac-template-expansion`, `embedded-spreadsheet`, `ai-interviews`, `project-consolidation`, etc.) will get new project entries created.

---

## 6. Frontend Merge Strategy

### 6.1 What Moves from `portfolio.js` to `projects.js`

The following rendering functions from `portfolio.js` move into `projects.js`, namespaced under a `pipeline` prefix to avoid collisions:

| portfolio.js function | New name in projects.js | Purpose |
|---|---|---|
| `computeStats()` | `computePipelineStats()` | Aggregate stats across all projects |
| `getProjectAgents()` | (inline in card render) | Extract agent list from pipeline tasks |
| `getProjectTaskCount()` | (inline) | Count tasks |
| `getProjectFileCount()` | (inline) | Count files |
| `getProjectDecisionCount()` | (inline) | Count decisions |
| `getContributors()` | `renderPipelineContributors()` | Contributors summary |
| `getAllDecisions()` | `renderPipelineDecisions()` | Decisions rollup |
| `renderTaskItem()` | `renderPipelineTaskItem()` | Single task entry |
| `renderTaskDetails()` | `renderPipelineTaskDetails()` | Subtasks/files/decisions for a task |
| `renderContributors()` | (part of `renderPipelineContributors()`) | Contributor cards |
| `renderDecisionsRollup()` | (part of `renderPipelineDecisions()`) | Decisions accordion |
| `renderStats()` | `renderPipelineStatsRow()` | Stats bar HTML |

### 6.2 What Stays Unique to Each

**`projects.js` keeps all existing functionality unchanged:**
- Project CRUD (create, edit, delete modals)
- Session management (SSE, session history, session controls, input bar)
- Pipeline phase indicator, team activity, file deliverables
- Progress notes
- Spreadsheet data section
- All event handling for the above

**New in `projects.js`:**
- Stats row rendering at the top of the list (from portfolio)
- Pipeline section in the detail view (below session history, above notes)
- Agent avatar cluster on cards (from portfolio)
- Pipeline mini-stats on cards (from portfolio)

### 6.3 Data Flow Change

**Before:** `portfolio.js` fetches `data/tasks/index.json`, then fetches each tasks file, then renders.

**After:** `projects.js` fetches `GET /api/projects` (which already includes precomputed pipeline stats per project). For the detail view, `GET /api/projects/:id` returns the full `pipeline.tasks` array. No separate tasks file fetching from the frontend.

### 6.4 Size Impact

`portfolio.js` is ~490 lines. Of those, roughly:
- ~150 lines are utility/aggregation functions (some overlap with projects.js utilities)
- ~200 lines are rendering functions (these move to projects.js)
- ~70 lines are event handlers (collapse/expand — already exist in projects.js)
- ~70 lines are initialization and data fetching (replaced by API calls)

Net addition to `projects.js`: approximately 250-300 lines of pipeline rendering logic. This brings `projects.js` from ~1200 to ~1500 lines. Acceptable for a single-section file; the pipeline rendering is a self-contained block.

---

## 7. CSS Consolidation

### 7.1 Strategy

The portfolio CSS classes (`.portfolio-card__*`, `.portfolio__*`) are used extensively in `css/styles.css` (lines 4393-4870+). Rather than renaming all of them, the approach is:

1. **Keep the task-item classes as-is.** The `.task-item`, `.task-item__header`, `.task-item__content`, `.task-item__status`, `.task-item__details`, `.task-item__subtasks`, `.task-item__files`, `.task-item__decisions`, `.task-item__file-pill`, `.task-item__chevron` classes are generic and not prefixed with `portfolio-`. They can be reused directly in the projects detail view pipeline section.

2. **Rename portfolio-card detail classes to pipeline- prefix.** The portfolio-card detail classes used inside the project detail view get renamed:
   - `.portfolio-card__metrics` -> `.pipeline__metrics`
   - `.portfolio-card__metric` -> `.pipeline__metric`
   - `.portfolio-card__metric-value` -> `.pipeline__metric-value`
   - `.portfolio-card__metric-label` -> `.pipeline__metric-label`
   - `.portfolio-card__contributors` -> `.pipeline__contributors`
   - `.portfolio-card__contributor` -> `.pipeline__contributor`
   - `.portfolio-card__contributor-avatar` -> `.pipeline__contributor-avatar`
   - `.portfolio-card__contributor-name` -> `.pipeline__contributor-name`
   - `.portfolio-card__contributor-summary` -> `.pipeline__contributor-summary`
   - `.portfolio-card__decisions-rollup` -> `.pipeline__decisions-rollup`
   - `.portfolio-card__decisions-toggle` -> `.pipeline__decisions-toggle`
   - `.portfolio-card__decisions-content` -> `.pipeline__decisions-content`
   - `.portfolio-card__decisions-list` -> `.pipeline__decisions-list`
   - `.portfolio-card__decision-agent` -> `.pipeline__decision-agent`

3. **Keep avatar classes for the card header.** The `.portfolio-card__avatar` and `.portfolio-card__avatar-overflow` styles are reused on the project card, renamed to:
   - `.project-card__avatar` / `.project-card__avatar-overflow`

4. **Stats classes rename:**
   - `.portfolio__stats` -> `.projects__stats`
   - `.portfolio__stat` -> `.projects__stat`
   - `.portfolio__stat-value` -> `.projects__stat-value`
   - `.portfolio__stat-label` -> `.projects__stat-label`

### 7.2 Classes to Delete

After migration, all `.portfolio-card`, `.portfolio-card__header`, `.portfolio-card__info`, `.portfolio-card__name`, `.portfolio-card__desc`, `.portfolio-card__meta`, `.portfolio-card__badge`, `.portfolio-card__date`, `.portfolio-card__chevron`, `.portfolio-card__details`, `.portfolio-card__details-inner` classes can be deleted. These are the card-level classes that are replaced by the existing `.project-card__*` equivalents.

Also delete: `.portfolio`, `.portfolio__list`, `.portfolio__empty`, `.portfolio__error`, `.portfolio__noscript`.

### 7.3 Classes to Keep (Renamed)

All `.task-item*` classes stay as-is. All detail/metrics/contributors/decisions classes get renamed with the `pipeline__` prefix as listed above. Stats classes get the `projects__` prefix.

---

## 8. HTML Changes

### 8.1 Remove Portfolio Section

Delete the entire portfolio section from `index.html` (lines 222-236):

```html
<!-- DELETE THIS BLOCK -->
<section class="portfolio" id="portfolio" aria-labelledby="portfolio-heading">
  ...
</section>
```

### 8.2 Remove Portfolio Nav Link

Delete from the nav (line 38):
```html
<!-- DELETE -->
<a href="#portfolio" class="nav__link">Portfolio</a>
```

### 8.3 Remove Portfolio Script Tag

Delete from the bottom of the file (line 499):
```html
<!-- DELETE -->
<script src="js/portfolio.js" defer></script>
```

### 8.4 Add Stats Container to Projects Section

Add a stats container inside the projects section, between the toolbar and the list:

```html
<section class="projects" id="projects" aria-labelledby="projects-heading">
  <div class="container">
    <h2 id="projects-heading" class="section-title">Projects</h2>
    <div class="projects__toolbar">
      <p class="projects__subtitle">Create and manage projects.</p>
      <button class="projects__new-btn" type="button">+ New Project</button>
    </div>
    <!-- NEW: Pipeline stats row -->
    <div class="projects__stats" id="projects-stats" aria-label="Project summary statistics"></div>
    <div id="projects-list">
      <noscript>
        <p class="projects__noscript">Enable JavaScript to manage projects.</p>
      </noscript>
    </div>
  </div>
</section>
```

### 8.5 Update Section Title Pseudo-element

The CSS rule at line 46 (`#portfolio-heading::before`) that adds the section icon needs to be removed. No replacement needed — the Projects section already has its own heading style.

---

## 9. File Structure

### 9.1 New Files

| File | Purpose |
|---|---|
| `scripts/migrate-projects.mjs` | One-time migration script |

### 9.2 Modified Files

| File | Changes |
|---|---|
| `server/src/schemas/project.ts` | Add `PipelineTaskSchema`, `PipelineSchema`, `slug` and `pipeline` fields |
| `server/src/store/projects.ts` | Add `toSlug()`, `mergeTasksPipeline()`, update `createProject()`, `getProject()`, `listProjects()` |
| `server/src/routes/projects.ts` | Add `computePipelineStats()`, update list endpoint to include pipeline stats |
| `js/projects.js` | Add pipeline rendering (stats row, card avatars/stats, detail pipeline section), remove portfolio.js dependency |
| `css/styles.css` | Rename portfolio classes to pipeline/projects prefixes, remove portfolio section/card styles, add project-card avatar styles |
| `index.html` | Remove portfolio section, remove portfolio nav link, remove portfolio.js script, add stats container |

### 9.3 Deleted Files

| File | Reason |
|---|---|
| `js/portfolio.js` | All rendering logic merged into `projects.js`; data fetching replaced by API |

### 9.4 Unchanged Files

| File | Reason |
|---|---|
| `data/tasks/*.json` | Agent write target — untouched per R2 |
| `data/tasks/index.json` | Continues to exist for agent workflows per R8 |
| `.claude/agents/*.md` | No agent profile changes per R8 |
| All session-related server files | Session infrastructure is out of scope |

---

## 10. Implementation Order

### Phase 1: Backend (Jonah)

**Step 1: Schema extension**
- Add `PipelineTaskSchema`, `PipelineSchema` to `server/src/schemas/project.ts`
- Add `slug` and `pipeline` fields to `ProjectSchema` with defaults
- Add `slug` to `CreateProjectSchema`
- Verify existing project files still parse (Zod defaults handle missing fields)

**Step 2: Slug generation and creation**
- Add `toSlug()` to `server/src/store/projects.ts`
- Update `createProject()` to accept optional `slug`, auto-generate from name if omitted
- Set `slug` on the project object before writing

**Step 3: Merge-on-read**
- Add `TasksFileSchema` for parsing tasks files
- Add `mergeTasksPipeline()` function
- Update `getProject()` to call `mergeTasksPipeline()`
- Update `listProjects()` to call `mergeTasksPipeline()` for each project

**Step 4: List endpoint pipeline stats**
- Add `computePipelineStats()` helper
- Update `GET /api/projects` to include pipeline stats (taskCount, fileCount, decisionCount, agents) and strip full pipeline.tasks array
- Ensure `GET /api/projects/:id` returns full pipeline.tasks

**Step 5: Migration script**
- Create `scripts/migrate-projects.mjs`
- Implement the algorithm from Section 5
- Test idempotency
- Run against actual data

**Estimated effort:** Moderate. ~200 lines of new backend code. The merge-on-read is the trickiest part — filesystem reads need graceful error handling.

### Phase 2: Frontend (Alice)

**Step 1: HTML changes**
- Remove portfolio section from `index.html`
- Remove portfolio nav link
- Remove portfolio.js script tag
- Add `#projects-stats` container to projects section

**Step 2: Stats row**
- Add `computePipelineStats()` and `renderPipelineStatsRow()` to `projects.js`
- Call after project list loads
- Wire stats to the `#projects-stats` container

**Step 3: Card enhancements**
- Update `renderCard()` to include agent avatar cluster and pipeline mini-stats when `pipeline.taskCount > 0`
- Use precomputed stats from the list endpoint (no full tasks array needed)

**Step 4: Detail view pipeline section**
- Add pipeline rendering functions (task items, contributors, decisions rollup) to `projects.js`
- Insert pipeline section into `renderDetailView()` between session history and progress notes
- Only render when `pipeline.tasks` is non-empty

**Step 5: Event handlers**
- Add click handlers for pipeline task expand/collapse (nested accordion)
- Add click handler for decisions rollup toggle
- These are independent of existing project card expand/collapse

**Step 6: CSS consolidation**
- Rename portfolio CSS classes per Section 7
- Delete unused portfolio section/card classes
- Add project-card avatar styles
- Test visual parity with current portfolio rendering

**Step 7: Delete portfolio.js**
- Remove `js/portfolio.js`
- Verify no remaining references

**Estimated effort:** Significant. ~300 lines of new code in `projects.js`, plus CSS refactoring. The detail view pipeline section is the most complex part — it needs to coexist with session log, session history, and progress notes.

---

## 11. Risk Mitigations

### Risk 1: projects.js complexity (~1500 lines after merge)

**Mitigation:** Keep pipeline rendering as a self-contained block within `projects.js`. All pipeline functions are prefixed with `pipeline` or `renderPipeline*`. They don't interact with session state, note state, or modal state. If the file becomes unwieldy post-merge, it can be split into a `projects-pipeline.js` module in a follow-up — but for v1, a single file avoids coordination complexity.

### Risk 2: Slug matching mismatches

**Mitigation:** The migration script handles the initial linking. For new projects created after migration, `toSlug()` auto-generates from the name. Agents use the same slug convention (kebab-case from project name). If a mismatch occurs, the project simply won't show pipeline data — it degrades gracefully to the current project-only view. No errors, no broken UI.

### Risk 3: Stats computation performance on list load

**Mitigation:** Pipeline stats are precomputed on the server (Section 4). The list endpoint returns flat numbers (taskCount, fileCount, decisionCount, agents array) — not the full tasks array. The frontend never needs to iterate over all tasks just to render the card list. Full tasks are only loaded on detail expand (`GET /api/projects/:id`).

### Risk 4: Visual density in the unified card

**Mitigation:** Pipeline elements (avatars, stats) are conditional — they only appear when `pipeline.taskCount > 0`. New/planned projects with no pipeline history show the clean, uncluttered card they have today. This matches the current behavior where the portfolio section only shows projects that have pipeline data.

### Risk 5: Migration script data loss

**Mitigation:** The script only adds data (slug field, new project files). It never deletes files or removes fields. It is idempotent. Running it twice produces the same result. Back up `data/projects/` before running if needed.

### Risk 6: Breaking the "Start as Project" meeting flow

**Mitigation:** The meeting flow creates projects via `POST /api/projects`, which will now auto-generate a slug. No change needed to the meeting code. The created project gets a slug, and if Thomas later creates a matching `data/tasks/{slug}.json`, the merge-on-read will pick it up automatically.

---

## Open Questions (Resolved)

**Q1: Should the list endpoint precompute pipeline stats per project?**
**A: Yes.** Precomputed stats on the list endpoint (Section 4). The frontend gets flat numbers for the card view and only loads full tasks on detail expand.

**Q2: Should the slug be auto-generated from the project name on creation?**
**A: Yes, auto-generated with kebab-case, overridable.** `toSlug(name)` runs by default. The `CreateProjectSchema` accepts an optional `slug` field for cases where the caller wants to set it explicitly (e.g., the migration script).

**Q3: Should the migration script clean up `data/tasks/` files?**
**A: No.** Tasks files are left intact. They continue to serve as the agent write target per R2. The merge-on-read logic reads them on every request, so they remain the source of truth for pipeline data.

---

## Summary

This is a moderate-scope change that consolidates two overlapping systems without disrupting agent workflows or session infrastructure. The key architectural decision — merge-on-read — keeps the agent write path unchanged while giving the frontend a unified data model. The migration script handles the one-time linking of existing data, and the schema changes are fully backward-compatible via Zod defaults.

Backend effort is concentrated in the store layer (merge logic) and route layer (stats computation). Frontend effort is concentrated in the rendering layer (merging portfolio rendering into the projects detail view). CSS changes are mechanical renames. The implementation can proceed in two parallel-safe phases: Jonah (backend + migration) first, then Alice (frontend + CSS).
