# Task History Feature - Requirements

## Goal

Add a "Tasks" view to the TeamHQ landing page so the CEO can see a summary of recent projects the team has executed. For each project, the user should be able to see the project name, the subtasks that were performed, which agent handled which task, and the status of each task.

## Why

As the team ships more projects, there's no record of what was done, who did what, or how work was structured. The CEO wants a lightweight way to review the team's output history -- click on a "Tasks" tab in the nav and see all recent projects with their breakdown.

---

## What the Feature Does

### User Interaction

1. User clicks "Tasks" in the top nav bar
2. Page scrolls to a new "Tasks" section (between Tools and Team, or between Team and How It Works -- Designer decides placement)
3. User sees a list of projects, each displayed as an expandable card
4. Clicking a project card expands it to reveal the subtasks, who handled each one, and the status
5. Collapsing returns the card to its summary state

### Navigation Integration

- Add "Tasks" to the existing nav bar: `Tools | Tasks | Team | How It Works`
- Link scrolls to the `#tasks` section using the existing smooth-scroll behavior

---

## Data Structure

Use a static JSON file (`data/tasks.json`) to store the project history. This keeps data separate from markup, is easy to maintain, and requires only minimal JavaScript to load and render.

### Schema

```json
{
  "projects": [
    {
      "id": "project-slug",
      "name": "Project Name",
      "description": "One-line summary of what the project was.",
      "status": "completed",
      "completedDate": "2025-12",
      "tasks": [
        {
          "title": "Task description",
          "agent": "Agent Name",
          "role": "Role Title",
          "status": "completed"
        }
      ]
    }
  ]
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | URL-safe slug for the project |
| `name` | string | Human-readable project name |
| `description` | string | One-line summary of what the project delivered |
| `status` | enum | `completed`, `in-progress`, `planned` |
| `completedDate` | string | Month/year the project shipped (e.g. "2025-12") |
| `tasks` | array | Ordered list of subtasks within the project |
| `tasks[].title` | string | What the task was |
| `tasks[].agent` | string | Name of the agent who performed the task |
| `tasks[].role` | string | Role title of the agent (e.g. "Product Manager") |
| `tasks[].status` | enum | `completed`, `in-progress`, `blocked`, `skipped` |

---

## Seed Data

Populate `data/tasks.json` with the following three projects based on the team's actual history:

### 1. TeamHQ Landing Page

- **Description:** Built the original TeamHQ landing page -- a single-page static site introducing the AI product team.
- **Status:** completed
- **Date:** 2025-01
- **Tasks:**
  1. Thomas (PM) -- Scoped requirements and acceptance criteria
  2. Andrei (Architect) -- Defined tech approach (plain HTML/CSS, no build step)
  3. Robert (Designer) -- Created design spec (layout, typography, colors)
  4. Alice (Front-End) -- Implemented the landing page
  5. Enzo (QA) -- Validated against acceptance criteria

### 2. OST Tool

- **Description:** Full-stack Opportunity Solution Tree tool -- generates trees with AI, supports debate between solutions, and provides recommendations.
- **Status:** completed
- **Date:** 2025-02
- **Tasks:**
  1. Andrei (Architect) -- Designed system architecture (Vite+React frontend, Express backend, Claude CLI integration)
  2. Alice (Front-End) -- Built React Flow tree visualization, debate UI, and recommendation view
  3. Jonah (Back-End) -- Built Express API, Claude CLI integration, and session store
  4. Enzo (QA) -- Validated end-to-end flows and edge cases

### 3. TeamHQ Redesign

- **Description:** Redesigned the TeamHQ landing page with a dark theme, navigation bar, and Tools section to serve as a central hub.
- **Status:** completed
- **Date:** 2025-02
- **Tasks:**
  1. Thomas (PM) -- Scoped redesign requirements
  2. Andrei (Architect) -- Confirmed tech approach (stay with plain HTML/CSS)
  3. Robert (Designer) -- Created dark theme design spec
  4. Alice (Front-End) -- Implemented dark theme, nav bar, and Tools section
  5. Enzo (QA) -- Validated redesign against acceptance criteria

---

## UI Approach

### Project Cards (Collapsed)

Each project shows as a card with:
- Project name (bold)
- One-line description
- Status badge (e.g., "Completed" in green, same style as the tool card badges)
- Date
- Task count summary (e.g., "5 tasks")
- Expand/collapse affordance (chevron or similar)

### Project Cards (Expanded)

When expanded, the card reveals:
- A list of subtasks, each showing:
  - Agent avatar (first letter circle, matching the Team Roster style)
  - Agent name and role
  - Task description
  - Status indicator (checkmark for completed, etc.)
- The list should be vertically ordered to show the workflow progression

### Visual Design

- Follow the existing dark theme (zinc-950 background, zinc-900 cards, zinc-800 borders, indigo accents)
- Match the card style used in other sections (border-radius, padding, hover states)
- Agent avatars in the task list should use the same style as the Team Roster (indigo circle with letter)
- Keep transitions smooth -- expand/collapse should animate

---

## Technical Constraints

- **Minimal JavaScript only.** The page is currently pure HTML/CSS. Adding a small vanilla JS script to:
  1. Fetch and parse `data/tasks.json`
  2. Render the project cards
  3. Handle expand/collapse interactions

  ...is acceptable. No frameworks, no build step, no bundler.

- **File organization:**
  - `data/tasks.json` -- project history data
  - `js/tasks.js` -- script to load data and render the tasks section
  - Styles go in the existing `css/styles.css`

- **Progressive enhancement:** The section should show a reasonable fallback if JS is disabled (e.g., a message like "Enable JavaScript to view task history").

---

## Acceptance Criteria

1. A "Tasks" link appears in the nav bar and smooth-scrolls to the Tasks section
2. The Tasks section displays all projects from `data/tasks.json`
3. Each project card shows the project name, description, status, date, and task count
4. Clicking a project card expands it to show the subtask breakdown
5. Each subtask shows the agent name, role, avatar, task description, and status
6. Clicking an expanded card collapses it back to the summary view
7. The three seed projects (Landing Page, OST Tool, TeamHQ Redesign) are populated with accurate data
8. The visual design matches the existing dark theme and card styles
9. The page remains responsive (cards stack on mobile, expand naturally)
10. No frameworks or build steps are introduced -- vanilla JS only
11. Data is loaded from a separate JSON file, not hardcoded in HTML
12. The expand/collapse interaction is smooth (CSS transitions)

---

## Out of Scope

- **No real-time task tracking or sync** -- this is a static display of historical data, manually maintained
- **No editing UI** -- projects and tasks are updated by editing the JSON file directly
- **No filtering, search, or sorting** -- just a chronological list of projects
- **No backend** -- the JSON file is loaded client-side via fetch
- **No authentication** -- the page is public
- **No pagination** -- the team won't have enough projects to need it anytime soon
- **No integration with Claude Code's task system** -- seed data is manually curated

---

## Dependencies

- Arch must define the technical approach (how to add JS to the static page, JSON loading strategy, file structure)
- Designer must spec the visual treatment of the cards (collapsed/expanded states, animations, layout within the page)
- Both must complete before FE can implement

---

## Notes

- The JSON file approach means adding new projects in the future is as simple as editing `data/tasks.json` -- no code changes needed
- This is the first feature on the TeamHQ page that introduces JavaScript, so the Architect should set a pattern that's clean and maintainable
- The expand/collapse is the only interactive behavior -- keep it simple
