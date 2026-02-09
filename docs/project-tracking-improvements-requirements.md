# Project Tracking Improvements — Requirements

## Problem Statement

The TeamHQ landing page has rich project history data in `data/tasks.json` (9 projects with per-agent tasks, subtasks, decisions, files changed, completion dates) but the current Projects section only shows API-driven project cards from the Express backend. The historical data that documents what the team has actually built — the subtask breakdowns, architectural decisions, agent contributions, and file deliverables — is completely invisible to visitors.

The old `js/tasks.js` that rendered this data targeted a `#tasks-list` container that no longer exists in the HTML. The data is there; the UI just doesn't surface it.

## Goal

Add a **Team Portfolio** section to the landing page that showcases the team's completed and in-progress work using the rich data from `data/tasks.json`. This section should make it immediately obvious that this is a real, productive team — not just a roster of agent descriptions.

## Scope

### In Scope
- New "Portfolio" section on the landing page between the existing Projects section and the Meetings section
- Reads from `data/tasks.json` (static JSON file, no backend changes needed)
- Shows all projects with status, dates, descriptions, and agent contributions
- Expandable project cards that reveal per-agent task breakdowns
- Summary statistics that convey team productivity at a glance
- Fully responsive (mobile, tablet, desktop)
- Matches existing light theme design system (Geist font, green accent, 4px radius, no shadows)

### Out of Scope
- No backend API changes
- No changes to the existing Projects section (the API-driven project management cards)
- No changes to `data/tasks.json` structure
- No new npm dependencies
- No build step — plain HTML/CSS/vanilla JS like the rest of the landing page

### Deferred
- Filtering by status or agent
- Timeline/gantt visualization
- Search functionality

## Requirements

### R1: Portfolio Section Header with Summary Stats
Display a section header ("Portfolio") with aggregate statistics derived from the task data:
- Total projects count
- Total completed projects count
- Total unique agents who have contributed
- Total tasks completed across all projects
- Total files changed across all projects
- Total decisions made across all projects

These stats should be displayed as a compact row of metric cards below the section heading. Each stat should have a label and a number.

**Acceptance Criteria:**
- [ ] Section appears between existing Projects section and Meetings section
- [ ] Stats are computed dynamically from `data/tasks.json` on load
- [ ] Stats display on a single row on desktop, wrapping to 2 or 3 per row on mobile
- [ ] Numbers are correct when cross-checked against the raw JSON

### R2: Project Cards with Rich Summaries
Each project renders as a card showing:
- Project name
- Status badge (Completed / In Progress / Planned) with existing color treatment
- Completion date (for completed projects)
- Project description
- Agent avatar row: small overlapping avatar circles for each unique agent who contributed, with a count like "+3" if more than 5
- Key metrics per project: task count, files changed count, decisions made count

**Acceptance Criteria:**
- [ ] All projects from `data/tasks.json` are rendered
- [ ] Projects are sorted: in-progress first, then completed (most recent first), then planned
- [ ] Status badge uses same styling as existing project cards (green/yellow/gray pills)
- [ ] Agent avatars use the existing `img/avatars/{name}.svg` files at 24x24px
- [ ] Overlapping avatars show the first 5, with a "+N" overflow indicator
- [ ] Per-project metrics (tasks, files, decisions) are computed from the task data

### R3: Expandable Task Breakdown
Clicking a project card header expands it to reveal the full per-agent task breakdown. This uses the same grid-template-rows animation pattern already established in the codebase.

Each task row shows:
- Agent avatar (24px circle with the agent's SVG)
- Agent name and role
- Task title
- Status indicator dot (green = completed, yellow = in-progress, gray = pending)
- Expandable subtask details (nested accordion): subtask list, files changed as pills, and decisions list

**Acceptance Criteria:**
- [ ] Accordion behavior: only one project expanded at a time
- [ ] Expand/collapse uses CSS `grid-template-rows` animation (consistent with existing patterns)
- [ ] Each task row can be further expanded to show subtasks, files, decisions (nested accordion)
- [ ] Nested task expansion does NOT collapse other tasks within the same project
- [ ] Chevron rotation indicates expanded/collapsed state
- [ ] Keyboard accessible: Enter/Space to toggle, proper `aria-expanded` and `aria-hidden`

### R4: Agent Contribution Highlights
Within the expanded project view, after the task list, show a compact "Contributors" summary:
- Horizontal list of agents with avatars, names, and a one-line summary of their contribution (e.g., "5 subtasks, 3 files")

**Acceptance Criteria:**
- [ ] Contributors section appears below the task list in the expanded view
- [ ] Each contributor shows avatar, name, subtask count, and file count
- [ ] Agents are ordered by the number of subtasks (most active first)

### R5: Key Decisions Rollup
Within the expanded project view, show a "Key Decisions" section that aggregates all decisions from all agents into a single readable list. This surfaces the most interesting content — the "why" behind how things were built.

**Acceptance Criteria:**
- [ ] Decisions from all task entries are combined into a single list
- [ ] Each decision shows which agent made it
- [ ] Section is collapsible (collapsed by default to save space)
- [ ] If no decisions exist for a project, the section is hidden

### R6: Visual Design Consistency
The entire Portfolio section must match the existing landing page design system:
- Light white background
- Geist font family
- Green accent (#006B3F) for interactive elements
- 4px border radius on all cards
- No box shadows on cards (border-only treatment)
- Existing design tokens from `css/tokens.css`

**Acceptance Criteria:**
- [ ] All colors use CSS custom properties from `tokens.css`
- [ ] No new design tokens needed (use existing palette)
- [ ] Cards use `var(--color-border)` for borders, `var(--color-bg-card)` for background
- [ ] Status badges match exact same treatment as existing project cards
- [ ] Typography uses existing `--text-*` and `--font-weight-*` tokens
- [ ] Responsive at all breakpoints (mobile < 640px, tablet 640-1023px, desktop 1024px+)
- [ ] Hover state on cards: border-color transitions to accent

## Technical Constraints
- Plain HTML/CSS/vanilla JS — no frameworks, no build step
- JS should follow existing patterns: IIFE wrapper, strict mode, no globals, delegated event listeners
- Fetch `data/tasks.json` via Fetch API (same as existing `roster.js` pattern)
- New JS file: `js/portfolio.js`
- CSS added to existing `css/styles.css` (no new CSS file)
- HTML additions in `index.html`: new section element, script tag
- This is a **frontend-only change** — no Express backend modifications

## Implementation Notes for Downstream Agents
- **Robert (Designer):** The summary stats row, project cards, and expandable task breakdowns need design specs. The nested accordion pattern already exists — lean on it. Avatar overlap and "+N" indicator need precise pixel specs.
- **Alice (FE):** Reference `js/roster.js` for the pattern of fetching `data/tasks.json` and building DOM. Reference the existing task-item styles in `css/styles.css` for the task breakdown styling. The expand/collapse pattern with `grid-template-rows` is well-established.
- **Enzo (QA):** Verify stat calculations against raw JSON. Test all accordion states (project expand, task expand, nested). Test keyboard navigation. Test responsive at all breakpoints.

## Risks
- `data/tasks.json` is a static file — it won't reflect real-time changes from the Express API. This is acceptable because the portfolio is meant to showcase historical work, not manage active projects.
- Nine projects with full task breakdowns could make the page long when expanded. The accordion pattern (one-at-a-time) mitigates this.
