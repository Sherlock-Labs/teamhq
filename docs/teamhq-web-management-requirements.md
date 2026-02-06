# TeamHQ Web Management Interface - Requirements

## Problem Statement

TeamHQ's landing page is a static display of past projects and the team roster. The CEO currently has no way to create new projects, track project status, or manage work through the web interface. All project management happens outside the system. The CEO wants TeamHQ to become an interactive management hub where he can create projects, update their status, and see the current state of all work at a glance.

This is a large project requiring a real backend, interactive UI, and data persistence. It will be delivered in phases.

---

## Phasing Strategy

### Phase 1 (MVP) - Project Management Board

The minimum useful version: a web interface where the CEO can create projects, update their status, and see all projects in one view. This replaces the static "Tasks" section with a live, editable project board.

### Phase 2 (Future) - Task Management Within Projects

Add the ability to manage individual tasks within projects: create tasks, assign them to agents, track per-task status. This turns the project cards into full project detail views.

### Phase 3 (Future) - Richer Workflow

Agent work assignment triggers, project templates, activity feeds, filtering/search, archiving completed projects, etc.

**This document scopes Phase 1 only. Phases 2-3 are explicitly deferred.**

---

## Phase 1 Scope

### In Scope

1. **Create projects** via the web UI (name, description, status)
2. **View all projects** in a dashboard/board layout with status indicators
3. **Edit project details** (name, description, status) inline or via a form
4. **Delete projects** with confirmation
5. **Persist projects** to a backend data store (not just in-memory)
6. **REST API** for project CRUD operations
7. **Preserve the existing landing page sections** (hero, tools, team roster, how it works) -- the management UI either replaces the Tasks section or coexists alongside it
8. **Responsive design** matching the existing dark theme

### Out of Scope (Deferred to Phase 2+)

- Task management within projects (subtasks, per-agent breakdown)
- Agent assignment from the UI (Thomas handles this via Claude Code)
- Activity/history log
- Filtering, search, or sorting
- Authentication or multi-user support
- Project templates
- Drag-and-drop reordering
- Archiving projects
- Export/import

---

## User Stories

### US-1: Create a Project

**As** the CEO, **I want** to create a new project with a name, description, and initial status, **so that** I can track a new piece of work from inception.

**Acceptance Criteria:**
- A "New Project" button or action is visible on the project board
- Clicking it opens a form/modal with fields: project name (required), description (optional), status (defaults to "Planned")
- On submit, the project is created via API and appears immediately on the board
- Validation: name is required, status must be one of the allowed values

### US-2: View All Projects

**As** the CEO, **I want** to see all projects at a glance with their current status, **so that** I know what's planned, in progress, and completed.

**Acceptance Criteria:**
- All projects are displayed on the page, grouped or tagged by status
- Each project card shows: name, description (truncated if long), status badge, and creation/completion date
- Status badges use consistent color coding: green (Completed), yellow (In Progress), gray (Planned)
- Projects are ordered with In Progress first, then Planned, then Completed (most recent first within each group)

### US-3: Edit a Project

**As** the CEO, **I want** to edit a project's name, description, or status, **so that** I can update it as work progresses.

**Acceptance Criteria:**
- Each project card has an edit action (button/icon)
- Editing opens inline editing or a modal with pre-filled fields
- Changes are saved via API and reflected immediately on the board
- Status changes update the badge color and position/grouping in real time

### US-4: Delete a Project

**As** the CEO, **I want** to delete a project I no longer need, **so that** the board stays clean.

**Acceptance Criteria:**
- Each project card has a delete action
- Deleting requires confirmation (e.g., "Are you sure?")
- On confirm, the project is removed via API and disappears from the board

### US-5: Persist Data Across Refreshes

**As** the CEO, **I want** my projects to survive page refreshes and server restarts, **so that** I don't lose work.

**Acceptance Criteria:**
- Projects are stored persistently (file-based or database)
- The API reads from and writes to persistent storage
- Refreshing the page shows the same data
- Restarting the server preserves all data

---

## Data Model

### Current State

`data/tasks.json` stores a flat array of projects with nested task arrays. This is read-only (loaded via `fetch()` in the browser). There is no backend -- the JSON file is served as a static asset.

### Phase 1 Target

A `projects` collection with CRUD operations. Each project has:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string (UUID) | auto-generated | Unique identifier |
| `name` | string | yes | Project name |
| `description` | string | no | Brief project description |
| `status` | enum | yes | `planned`, `in-progress`, `completed` |
| `createdAt` | ISO timestamp | auto-generated | When the project was created |
| `updatedAt` | ISO timestamp | auto-generated | Last modification time |
| `completedAt` | ISO timestamp | auto | Set when status changes to `completed` |

The existing `data/tasks.json` seed data should be migrated/importable so the history of past projects is preserved.

### Storage Decision (for Andrei)

Needs architectural decision: SQLite, JSON file with locking, or another lightweight option. Key constraints:
- Single user (the CEO)
- Low volume (dozens of projects, not thousands)
- Must survive server restarts
- Must be simple to set up (no external database server)

---

## Technical Considerations (for Andrei)

These are questions for the Technical Architect to decide:

1. **Architecture**: Does this become a new Express backend for the TeamHQ landing page? Does it share infrastructure with the OST tool's server? Or is it a separate app?
2. **Frontend approach**: The landing page is currently plain HTML/CSS/JS. Adding interactive CRUD management may warrant React (like the OST tool uses). Or it might be achievable with enhanced vanilla JS. What's the right call?
3. **Data storage**: SQLite vs. JSON file vs. something else for persistent project storage?
4. **Coexistence**: How does the new management UI coexist with the existing static sections (hero, tools, team roster, how it works)?
5. **Port/routing**: What port does the backend run on? Does the frontend proxy to it like the OST tool does?

---

## Team Involvement (Phase 1)

| Order | Agent | Role | What They Do |
|-------|-------|------|-------------|
| 1 | Andrei | Technical Architect | Defines backend architecture, data storage, frontend approach, API design |
| 2 | Robert | Product Designer | Designs the project management UI: board layout, create/edit forms, card design |
| 3 | Alice | Front-End Developer | Builds the interactive management UI |
| 3 | Jonah | Back-End Developer | Builds the REST API and data persistence layer |
| 4 | Enzo | QA | Validates all user stories against acceptance criteria |

Alice and Jonah work in parallel after Andrei and Robert have defined the approach and design. They coordinate on API contracts (Andrei will define these in the tech approach).

---

## Success Criteria

Phase 1 is done when:
1. The CEO can create, view, edit, and delete projects through the web UI
2. Data persists across page refreshes and server restarts
3. The existing landing page content (hero, tools, team, how it works) remains intact
4. The design matches the existing dark theme aesthetic
5. The UI is responsive across mobile, tablet, and desktop
