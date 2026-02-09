# Project Consolidation — Requirements

**Author:** Thomas (Product Manager)
**Status:** Draft
**Date:** 2026-02-09

---

## Problem Statement

TeamHQ has two separate, overlapping systems for tracking projects:

1. **Projects** (`data/projects/*.json`, `js/projects.js`) — the active project tracker. Each project has a UUID-based ID, metadata (name, description, status, goals, constraints, brief), progress notes, a kickoff prompt, and Claude CLI sessions with live SSE event streaming. Backend is a full Express API (`server/src/routes/projects.ts`, `server/src/store/projects.ts`) with CRUD, session management, and Zod-validated schemas.

2. **Portfolio** (`data/tasks/*.json`, `js/portfolio.js`) — the pipeline work log. Each project has a slug-based ID, metadata (name, description, status), and an array of `tasks` entries recording which agent did what (subtasks, filesChanged, decisions). Displayed as expandable cards with aggregate stats. Data is static JSON fetched client-side — no backend API.

These often represent the same work. For example, "OST Tool" exists in both systems (`data/projects/ost-tool.json` and `data/tasks/ost-tool.json`) with different data structures and no link between them. Some projects exist only in one system — the newer UUID-based projects (PDF editor, CEO Input Test, Podcast Show Notes research) exist only in Projects, while older pipeline projects (teamhq-landing-page, ost-recommendation-redesign) exist only in Portfolio.

The result: two separate sections on the landing page (Projects and Portfolio), two navigation links, two mental models, and no unified view of a project's full lifecycle from creation through pipeline execution to completion.

## Goal

Merge both systems into a single unified project section that combines the active management features of Projects (creation, sessions, notes) with the pipeline history features of Portfolio (agent task entries, stats, decisions).

## Non-Goals (Explicitly Out of Scope for v1)

- Redesigning the session log or SSE streaming infrastructure
- Changing how agents write task entries (the `data/tasks/*.json` format stays)
- Adding new features like filtering, search, or timeline visualization
- Changing the meeting system's "Start as Project" flow (beyond updating its target)
- Mobile app changes
- Migrating existing data automatically (manual migration script is acceptable)

## Current Data Structures

### Projects schema (`data/projects/*.json`)
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "status": "planned | in-progress | completed",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "completedAt": "ISO datetime | null",
  "goals": "string",
  "constraints": "string",
  "brief": "string",
  "notes": [{ "id": "uuid", "content": "string", "createdAt": "ISO datetime" }],
  "kickoffPrompt": "string | null",
  "activeSessionId": "string | null"
}
```

### Tasks/Portfolio schema (`data/tasks/*.json`)
```json
{
  "id": "slug",
  "name": "string",
  "description": "string",
  "status": "completed | in-progress | planned",
  "completedDate": "YYYY-MM (optional)",
  "tasks": [
    {
      "title": "string",
      "agent": "string (display name)",
      "role": "string",
      "status": "completed | in-progress | pending",
      "subtasks": ["string"],
      "filesChanged": ["string"],
      "decisions": ["string"]
    }
  ]
}
```

### Key Differences

| Dimension | Projects | Portfolio (Tasks) |
|-----------|----------|-------------------|
| ID format | UUID | Slug |
| Storage | `data/projects/` | `data/tasks/` |
| Backend | Express API (CRUD, sessions) | Static JSON (no API) |
| JS file | `js/projects.js` (~1200 lines) | `js/portfolio.js` (~490 lines) |
| Session support | Yes (SSE, session history) | No |
| Pipeline tasks | No | Yes (agent entries with subtasks, files, decisions) |
| Progress notes | Yes | No |
| Kickoff prompt | Yes | No |
| Goals/Constraints/Brief | Yes | No |
| Aggregate stats | No | Yes (tasks, files, decisions, agents) |
| Contributor breakdown | No | Yes |
| Decisions rollup | No | Yes |
| Creation UI | Modal form | None (agents write directly) |
| Index file | None (directory scan) | `data/tasks/index.json` |

## Requirements

### R1: Unified Data Model

The consolidated project stores all data in a single JSON file per project in `data/projects/`.

**Unified schema:**
```json
{
  "id": "uuid",
  "slug": "string (optional, human-readable identifier)",
  "name": "string",
  "description": "string",
  "status": "planned | in-progress | completed",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "completedAt": "ISO datetime | null",
  "goals": "string",
  "constraints": "string",
  "brief": "string",
  "notes": [{ "id": "uuid", "content": "string", "createdAt": "ISO datetime" }],
  "kickoffPrompt": "string | null",
  "activeSessionId": "string | null",
  "pipeline": {
    "tasks": [
      {
        "title": "string",
        "agent": "string",
        "role": "string",
        "status": "completed | in-progress | pending | skipped",
        "subtasks": ["string"],
        "filesChanged": ["string"],
        "decisions": ["string"]
      }
    ]
  }
}
```

**Acceptance criteria:**
- The `pipeline` field is an object containing a `tasks` array that uses the exact same shape as the current Portfolio task entries
- The `pipeline` field defaults to `{ "tasks": [] }` for projects with no pipeline history
- The `slug` field is optional and used only for backward compatibility with agent task-writing conventions
- The Zod schema in `server/src/schemas/project.ts` is updated to include `pipeline` and `slug` with appropriate defaults
- Existing project JSON files without `pipeline` parse correctly (Zod default)

### R2: Agent Task Writing — Separate Files, Merged on Read

Agents continue writing pipeline task entries to `data/tasks/{slug}.json` as they do today. This avoids write collisions between concurrent agents and requires no changes to any agent profile.

**Acceptance criteria:**
- The `data/tasks/` directory and `data/tasks/index.json` continue to exist and function
- Agents write to `data/tasks/{slug}.json` exactly as they do today — no agent profile changes
- When a project is loaded via the API, the server checks if a matching `data/tasks/{slug}.json` exists and merges its `tasks` array into the project's `pipeline.tasks` field
- Matching is done by `slug` field on the project — when a project is created, a slug can be set (derived from the name or manually specified)
- If both the project's embedded `pipeline.tasks` and the external tasks file have entries, the external file takes precedence (it's the source of truth for agent-written data)
- The `GET /api/projects/:id` response includes the merged `pipeline` data

### R3: Single Unified Section on Landing Page

The Projects and Portfolio sections merge into a single "Projects" section.

**Acceptance criteria:**
- The Portfolio section (`<section class="portfolio">`) is removed from `index.html`
- The Portfolio nav link is removed
- The Projects section remains and becomes the single project view
- The `js/portfolio.js` script tag is removed from `index.html`
- The `#portfolio` anchor no longer exists; any internal links to it are updated or removed

### R4: Unified Project Card

Each project card in the list view combines elements from both the current project card and the portfolio card.

**From Projects (keep):**
- Project name, description
- Status badge with `planned`, `in-progress`, `completed` states
- Running session indicator (green dot)
- Date display
- Edit and Delete action buttons
- Chevron expand/collapse

**From Portfolio (add to project card):**
- Agent avatar cluster (max 5 shown, +N overflow) — shown only when the project has pipeline tasks
- Per-project stats in the collapsed card header area: task count, file count, decision count — shown only when pipeline data exists

**Acceptance criteria:**
- Project cards show the existing project card layout when no pipeline data exists (clean, uncluttered for new/planned projects)
- Project cards show agent avatars and pipeline stats when `pipeline.tasks` is non-empty
- Cards sort the same way as current Projects: in-progress first, then planned, then completed (by updatedAt desc within group)
- The expand/collapse interaction is one-at-a-time, consistent with existing behavior

### R5: Unified Detail View

The expanded detail view combines elements from both systems.

**Top section (from Projects — keep all):**
- Goals, Constraints, Brief fields (or empty state with "Add details" action)
- Dates (created, updated, completed)
- Session controls (Run Session, Stop, View Prompt)
- Session log container (SSE events, pipeline indicator, team activity, file deliverables)
- Session history list
- Progress notes with add/delete

**New "Pipeline" section (from Portfolio — add below session history, above notes):**
- Per-project metrics row: tasks, files, decisions
- Task list with agent avatars, names, roles, titles, status indicators
- Expandable task details: subtasks, files changed, decisions
- Contributors summary: avatar, name, subtask count, file count
- Key decisions rollup: collapsible, agent-attributed

**Acceptance criteria:**
- The Pipeline section appears only when `pipeline.tasks` is non-empty
- The Pipeline section uses the same visual treatment and interaction patterns as the current Portfolio expanded view (task-item components, nested accordion, decisions toggle)
- The Pipeline section is positioned below the session controls/log area and above progress notes — it represents the structured pipeline history, distinct from the live session log
- All existing session functionality (SSE streaming, session history, session controls, input bar) is preserved unchanged
- All existing progress notes functionality is preserved unchanged

### R6: Summary Stats Row

Aggregate stats currently shown at the top of the Portfolio section move to the top of the unified Projects section.

**Acceptance criteria:**
- The stats row (Projects, Completed, Agents, Tasks, Files, Decisions) appears at the top of the Projects section, below the toolbar
- Stats are computed from all projects' merged pipeline data
- The stats row uses the same layout and styling as the current Portfolio stats
- Stats update when the project list is re-rendered (after create, delete, status change)
- The stats row is hidden when there are no projects

### R7: Data Migration

A one-time migration script handles existing data.

**Acceptance criteria:**
- A `scripts/migrate-projects.mjs` Node script is created
- For each slug in `data/tasks/index.json`, the script:
  - Checks if a matching project exists in `data/projects/` (by filename matching the slug, e.g., `data/projects/ost-tool.json`)
  - If a match exists: adds a `slug` field to the project JSON and copies `pipeline.tasks` from the tasks file
  - If no match exists: creates a new project in `data/projects/` with a UUID, the slug, and the data from the tasks file (name, description, status, pipeline.tasks), with sensible defaults for the new fields (empty goals/constraints/brief, no notes, no kickoffPrompt)
- UUID-only projects in `data/projects/` that have no matching tasks file are left unchanged (they already have no pipeline data)
- The script is idempotent — running it twice produces the same result
- The script logs what it does (created N, updated N, skipped N)
- After migration, the Portfolio section renders identically from the merged project data as it did from the separate tasks files (visual parity)

### R8: Backward Compatibility for Agent Workflows

The meeting "Start as Project" feature and agent task-writing workflow continue to work.

**Acceptance criteria:**
- Meeting action items that create projects via "Start as Project" continue to work — they create projects in `data/projects/` as they do today
- When Thomas (PM) scopes a project and creates a task tracking file at `data/tasks/{slug}.json`, it is merged into the project view automatically
- The `data/tasks/index.json` file continues to be maintained by agents
- No changes to any `.claude/agents/*.md` file are required

## UI Layout (Unified Section)

```
+--------------------------------------------------+
| Projects                        [+ New Project]   |
+--------------------------------------------------+
| Stats: 18 Projects | 14 Completed | 12 Agents... |
+--------------------------------------------------+
|                                                    |
| [card] CEO Input Test             [In Progress] o |
|   brief...                               Feb 2026 |
|                                                    |
| [card] Embedded Spreadsheet       [In Progress]   |
|   desc...  [avatars] 3 tasks 12 files    Feb 2026 |
|                                                    |
| [card] Custom Meetings              [Completed]   |
|   desc...  [avatars] 7 tasks 10 files    Feb 2026 |
|   > expanded detail view:                          |
|     Goals / Constraints / Brief                    |
|     Session controls + Session log                 |
|     Session history                                |
|     ---                                            |
|     Pipeline: 7 tasks | 10 files | 24 decisions   |
|       [Thomas] Scoped requirements...    [done]    |
|       [Andrei] Define technical approach [done]    |
|       [Robert] Design custom meeting...  [done]    |
|       ...                                          |
|     Contributors: Thomas 8, Alice 14, Jonah 12...  |
|     Key Decisions (24) [expand]                    |
|     ---                                            |
|     Progress Notes                                 |
|                                                    |
+--------------------------------------------------+
```

## Technical Approach Guidance

This is a primarily frontend project with a moderate backend change. The implementation should:

1. **Backend:** Extend the existing project schema and API to include `pipeline` and `slug`. Add a merge step in `getProject()` that reads the matching tasks file if one exists. No new routes needed.

2. **Frontend:** Merge `portfolio.js` rendering logic into `projects.js`. The portfolio card rendering (task items, contributors, decisions rollup) moves into the project detail view. The stats computation moves to the projects list. The `portfolio.js` file can then be deleted.

3. **CSS:** Portfolio-specific CSS classes (`.portfolio-card__*`) are either reused with new names or aliased. Most of the task-item and detail CSS is already shared or can be.

4. **Migration:** One-time script, run manually, committed to `scripts/`.

## Risks

1. **projects.js complexity** — Already ~1200 lines. Adding portfolio rendering logic will make it larger. Mitigate by keeping the pipeline section as a self-contained rendering block with clear function boundaries.

2. **Merge logic edge cases** — Matching projects to tasks files by slug could have mismatches. Mitigate with explicit slug field and clear fallback (no merge if no match).

3. **Stats computation performance** — Computing aggregate stats across all projects including pipeline data means loading more data on the list endpoint. Mitigate by including pipeline task counts in the list summary (precomputed on the server).

4. **Visual density** — The unified card and detail view will show more information. Mitigate by showing pipeline elements conditionally (only when pipeline data exists) and keeping the clean empty state for new projects.

## Implementation Order

1. **Andrei** — Technical approach (schema changes, merge logic, migration strategy)
2. **Robert** — Design spec (unified card treatment, detail view layout, transition from two sections to one)
3. **Jonah** — Backend (schema update, merge-on-read logic, list endpoint pipeline stats)
4. **Alice** — Frontend (merge portfolio rendering into projects, unified card, detail view, stats row, remove portfolio section)
5. **Robert** — Design review
6. **Enzo** — QA

## Open Questions for Arch/Design

1. Should the list endpoint precompute pipeline stats per project (task count, file count, agent list) to avoid loading all task files on every page load? Recommend yes.
2. Should the slug be auto-generated from the project name on creation, or manually set? Recommend auto-generated with kebab-case, editable in advanced options.
3. Should the migration script also clean up `data/tasks/` files that have been merged, or leave them as the ongoing agent-write target? Recommend leave them — they continue to serve as the agent write target per R2.
