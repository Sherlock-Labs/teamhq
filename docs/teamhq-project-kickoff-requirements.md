# TeamHQ Project Kickoff - Requirements

## Problem Statement

The TeamHQ web interface lets the CEO create, edit, and delete projects -- but that's all it does. Creating a project just saves a record to disk. There is no connection between the web UI and the agent team's actual work. The CEO still has to manually open a Claude Code session, spawn Thomas, explain the project, and manage everything through the CLI.

The CEO wants the web interface to be the starting point for real work: create a project, provide enough context, and kick off the agent workflow -- all from the browser.

---

## How TeamHQ Agent Work Currently Happens

Understanding the existing workflow is critical to designing this feature. Today:

1. CEO opens a Claude Code session in the `teamhq` repo
2. CEO describes what they want to the team lead (the root Claude agent)
3. Team lead spawns Thomas (PM) as a teammate via `Task` tool with the agent definition from `.claude/agents/product-manager.md`
4. Thomas scopes the work, writes requirements to `docs/`, creates tasks in the task list
5. Team lead spawns additional agents (Arch, Designer, FE, BE, QA) as teammates based on Thomas's recommendations
6. Agents work on tasks, reading/writing files in the repo, communicating via `SendMessage`
7. Work products are code changes in the repo

Key facts:
- Agents are spawned via Claude Code's `Task` tool (subagent spawning), not via any HTTP API
- Agent definitions live in `.claude/agents/*.md` -- these are personality/instruction files
- All agent work happens inside a Claude Code session -- there is no standalone agent runtime
- The `claude` CLI can be invoked programmatically: `claude -p "prompt"` runs a one-shot prompt, `claude` with flags can run in headless mode
- The team already uses `claude -p` in the OST tool for structured AI output

---

## Phase 2 Scope

### The Core Interaction: "Start Work" on a Project

When the CEO has a project on the board and is ready to kick off work, they should be able to trigger the agent workflow from the web UI. The flow:

1. CEO creates a project (Phase 1 -- already done) with name and description
2. CEO provides additional context for the project: **goals**, **constraints**, and **brief** (what they want built, why, any key requirements)
3. CEO clicks **"Start Work"** to initiate the agent workflow
4. The system kicks off work by invoking the agent pipeline
5. CEO can see that work has been initiated and track high-level progress

### What "Start Work" Actually Does

This is the critical design question. There are two realistic options:

**Option A: Generate a Kickoff Brief (Recommended for Phase 2)**

"Start Work" generates a structured kickoff document that the CEO can copy into a Claude Code session. The web UI doesn't directly spawn agents -- it prepares everything so the CEO can start a session with one click/paste.

- The system generates a kickoff prompt that includes: the project context, the team workflow instructions, which agents to spawn and in what order, and the full project brief
- The CEO copies this into a Claude Code terminal session
- This is the pragmatic approach: it bridges the web UI to the CLI workflow without requiring a headless agent runtime

**Option B: Direct Agent Invocation (Future -- Phase 3+)**

"Start Work" actually spawns a Claude Code session headlessly via the CLI and runs the full agent pipeline. This requires:
- Running `claude` as a child process from the Express server
- Managing long-running agent sessions from a web backend
- Streaming progress/output back to the browser
- Handling failures, timeouts, and session management

This is significantly more complex and should be deferred.

### Recommendation: Phase 2 = Option A (Kickoff Brief Generation)

Phase 2 delivers the **connection** between the web UI and agent work without the complexity of a headless agent runtime. The CEO gets:
- A richer project creation flow (goals, constraints, brief)
- A one-click "Start Work" that generates a ready-to-paste agent kickoff prompt
- A way to mark projects as "in progress" and track status from the web
- Progress tracking fields that can be updated as work proceeds

Phase 3 can later replace the "copy and paste" step with direct invocation.

---

## User Stories

### US-1: Provide Project Context (Brief)

**As** the CEO, **I want** to add goals, constraints, and a detailed brief to a project, **so that** the agent team has enough context to start working.

**Acceptance Criteria:**
- The project create/edit form has new fields: **goals** (textarea), **constraints** (textarea), **brief** (larger textarea)
- Goals: what success looks like for this project (e.g., "Users can create accounts and log in")
- Constraints: any boundaries or limitations (e.g., "No external auth providers, keep it simple")
- Brief: the detailed description of what to build and why -- this is what the PM will scope from
- All fields are optional -- a project can start with just a name and be filled in later
- Fields persist via the API and are displayed on the project detail view

### US-2: Start Work on a Project

**As** the CEO, **I want** to click "Start Work" on a project and get a ready-to-use kickoff prompt, **so that** I can immediately start an agent session without writing instructions from scratch.

**Acceptance Criteria:**
- Each project card (when status is `planned`) shows a **"Start Work"** button
- Clicking "Start Work" does two things:
  1. Changes the project status to `in-progress`
  2. Opens a modal/panel showing the generated **kickoff prompt**
- The kickoff prompt includes:
  - The project name, description, goals, constraints, and brief
  - Instructions to spawn Thomas (PM) first for scoping
  - The standard team workflow (PM -> Arch -> Designer -> FE/BE -> QA)
  - A note about the docs/ directory convention for requirements, tech approach, design spec
- The prompt has a **"Copy to Clipboard"** button
- If goals/brief are empty, "Start Work" prompts the CEO to fill them in first (or allows proceeding with a warning)

### US-3: View Project Details

**As** the CEO, **I want** to see the full details of a project (including goals, constraints, brief), **so that** I can review the context before and during work.

**Acceptance Criteria:**
- Clicking on a project card opens a **detail view** (expanded card, side panel, or dedicated view)
- The detail view shows: name, description, status, goals, constraints, brief, dates
- The detail view includes the edit and delete actions
- The detail view shows the kickoff prompt if the project has been started (status is `in-progress` or `completed`)

### US-4: Track Project Progress (Manual)

**As** the CEO, **I want** to add progress notes to an in-progress project, **so that** I can track what's been done and what's left.

**Acceptance Criteria:**
- Projects with status `in-progress` show a **progress notes** section
- The CEO can add timestamped notes (free text) to track progress
- Notes are displayed in reverse chronological order (newest first)
- Notes persist via the API
- This is a lightweight manual log -- not automated agent status tracking (that's Phase 3)

---

## Data Model Changes

### New Fields on Project

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `goals` | string | no | What success looks like |
| `constraints` | string | no | Boundaries and limitations |
| `brief` | string | no | Detailed description of what to build and why |
| `notes` | array of Note | auto | Progress notes, newest first |
| `kickoffPrompt` | string | auto | Generated when "Start Work" is clicked, stored for reference |

### Note Object

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (UUID) | Unique identifier |
| `content` | string | The note text |
| `createdAt` | ISO timestamp | When the note was added |

### API Changes

**Updated endpoints:**

- `POST /api/projects` -- accept new optional fields: `goals`, `constraints`, `brief`
- `PATCH /api/projects/:id` -- accept new optional fields: `goals`, `constraints`, `brief`
- `GET /api/projects/:id` -- return all fields including notes and kickoffPrompt

**New endpoints:**

- `POST /api/projects/:id/start` -- triggers "Start Work": sets status to `in-progress`, generates and stores the kickoff prompt, returns the prompt text
- `POST /api/projects/:id/notes` -- add a progress note
- `DELETE /api/projects/:id/notes/:noteId` -- delete a progress note

### Kickoff Prompt Generation

The `POST /api/projects/:id/start` endpoint generates the kickoff prompt server-side. This is a template filled with project data, not an AI call. The template:

```
You have a new project to work on.

## Project: {name}

**Description:** {description}

**Goals:**
{goals}

**Constraints:**
{constraints}

**Brief:**
{brief}

## How to Proceed

1. Spawn Thomas (PM) first. He will scope the work, write requirements, and define who else needs to be involved.
2. Thomas will write requirements to docs/ and create tasks with dependencies.
3. Follow Thomas's recommendations for who to spawn next (typically: Andrei for architecture, Robert for design, then Alice and Jonah for implementation, Enzo for QA).
4. All work flows through Thomas first -- do not skip the PM.

## Team Reference

The agent definitions are in .claude/agents/:
- product-manager.md (Thomas) -- PM, scopes work
- technical-architect.md (Andrei) -- architecture decisions
- product-designer.md (Robert) -- UI/UX design
- frontend-developer.md (Alice) -- frontend implementation
- backend-developer.md (Jonah) -- backend implementation
- qa.md (Enzo) -- testing and validation
```

---

## What's NOT in Phase 2 (Deferred)

- **Direct agent invocation** from the web UI (Phase 3) -- no spawning agents from the browser
- **Automated progress tracking** -- no live streaming of agent output to the web
- **Task management within projects** -- still deferred, separate from kickoff
- **Agent assignment from UI** -- Thomas still decides who to involve
- **Session management** -- no tracking which Claude Code sessions are running
- **Webhooks or notifications** -- no alerting when work is done

---

## Team Involvement (Phase 2)

| Order | Agent | Role | What They Do |
|-------|-------|------|-------------|
| 1 | Andrei | Technical Architect | Defines how kickoff prompt generation works, API design for new endpoints, data model changes. Key question: should prompt generation be server-side template or involve AI? |
| 2 | Robert | Product Designer | Designs the enriched project form (goals/constraints/brief fields), the "Start Work" flow, the kickoff prompt display modal, the project detail view, and the progress notes UI |
| 3 | Alice | Front-End Developer | Builds the updated project forms, "Start Work" button + modal, project detail view, progress notes UI, copy-to-clipboard |
| 3 | Jonah | Back-End Developer | Adds new fields to project schema/store, builds /start and /notes endpoints, implements kickoff prompt template generation |
| 4 | Enzo | QA | Validates all user stories against acceptance criteria |

---

## Success Criteria

Phase 2 is done when:
1. The CEO can add goals, constraints, and a brief to any project
2. Clicking "Start Work" on a planned project generates a ready-to-paste kickoff prompt
3. The kickoff prompt includes all project context and team workflow instructions
4. The CEO can copy the prompt to clipboard with one click
5. Projects can have timestamped progress notes
6. The project detail view shows all fields including notes
7. All existing Phase 1 functionality continues to work
8. The design matches the existing dark theme
