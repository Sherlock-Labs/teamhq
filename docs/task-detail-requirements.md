# Task Detail View — Product Requirements

**Author:** Thomas (PM)
**Date:** February 12, 2026
**Status:** Complete
**Project ID:** `task-detail`

---

## 1. Product Summary

Add a side panel to the Tasks page that shows full task details when you click into a task. Today, the grid shows 7 columns and you can inline-edit 4 of them — but there's no way to see or edit the `description` field, no way to see who created a task, and no place for richer context beyond a one-line title. The detail panel fixes this.

**One-sentence pitch:** Click a task row to slide open a detail panel showing all fields — including description — without leaving the grid.

**This extends the Task Tracker (project: `task-tracker`), not a separate product.**

---

## 2. What Exists Today

- `tasks.html` — cross-project AG Grid with columns: Project, ID, Title, Status, Priority, Owner, Phase
- Clicking any non-editable cell (Project, ID, Title) navigates to `projects.html#{slug}`
- Inline editing for Status, Priority, Owner, Phase via single-click
- `description` (string) and `createdBy` (string) fields exist in the schema and API response but have no UI anywhere
- "New Task" modal creates tasks with: Project, Title, Status, Priority, Owner, Phase — no description field
- Save mechanism: per-project debounced PUT (500ms) to `PUT /api/projects/:id/work-items`
- `js/tasks.js` — ~670 lines, IIFE pattern, AG Grid v34

**From the original task-tracker requirements, explicitly deferred:**
- "Task detail side panel (inline editing is enough for v1)"
- "Comments / activity log on individual tasks"

This project ships the first item. Comments remain deferred.

---

## 3. Scope

### In Scope (v1)

- **Side panel** — slides in from the right when a task row is clicked (via ID or Title cell)
- **All task fields displayed** — ID, Title, Description, Status, Priority, Owner, Phase, Project, Created By
- **Editable fields** — Title, Description, Status, Priority, Owner, Phase (same editability as the grid, plus Title and Description)
- **Description textarea** — multi-line text area, the main new editable content. This is the headline feature.
- **Read-only fields** — ID, Project (link to project page), Created By
- **Real-time grid sync** — edits in the panel update the grid row immediately
- **Same save mechanism** — per-project debounced PUT, same as grid inline editing
- **Description field in "New Task" modal** — add an optional description textarea to the existing create modal
- **Close behavior** — X button, Escape key, clicking outside the panel (on the grid)

### Out of Scope (deferred)

- Comments / activity log — requires new data model (comments collection, timestamps, author tracking). Next natural addition after this ships.
- File attachments
- Due dates / time tracking
- URL deep-linking (`?task=RT-1` for sharing direct links to tasks)
- Keyboard shortcuts (arrow keys to navigate between tasks while panel is open)
- Markdown rendering in description
- Task deletion from the detail panel
- Subtask creation from the detail panel

---

## 4. Click Behavior Change

The current row click behavior changes. This is the most important UX decision in this project.

**Current behavior:**
- Click any non-editable cell (Project, ID, Title) → navigate to `projects.html#{slug}`

**New behavior:**
| Cell clicked | Action |
|---|---|
| **Project** | Navigate to `projects.html#{slug}` (unchanged) |
| **ID** | Open detail panel for this task (new) |
| **Title** | Open detail panel for this task (new) |
| **Status** | Inline edit — dropdown (unchanged) |
| **Priority** | Inline edit — dropdown (unchanged) |
| **Owner** | Inline edit — text (unchanged) |
| **Phase** | Inline edit — text (unchanged) |

**Why this split:** The Project cell is already styled as a link (underline on hover, accent color). ID and Title are the task's identity — clicking them to see details is the intuitive action. Editable cells stay editable. No existing behavior is lost.

---

## 5. Data Model

**No schema changes.** All fields already exist:

```json
{
  "id": "RT-1",
  "title": "User signup and login",
  "description": "",
  "status": "completed",
  "phase": "v1.0",
  "owner": "Jonah",
  "priority": "high",
  "createdBy": ""
}
```

The `description` field was added in the task-tracker project as a `z.string().default("")`. It's been stored (and passed through the API) since then — it just has no UI. This project gives it one.

**No new API endpoints.** The existing `PUT /api/projects/:id/work-items` handles all saves. The `GET /api/tasks` response already includes `description` and `createdBy`.

**One small addition to the "New Task" modal:** Add a `description` textarea field (optional). When submitted, description is included in the PUT payload. Currently the modal creates tasks with `description: ""`.

---

## 6. User Stories

### US-TD-1: Open task detail panel from grid

As the CEO, I can click a task's ID or Title in the grid to open a side panel showing all task details, so I can see the full picture without navigating away.

**Acceptance criteria:**
- [ ] Clicking the ID or Title cell opens a side panel sliding in from the right
- [ ] The panel overlays the right portion of the page (grid remains visible behind/to the left)
- [ ] Panel width: ~480px on desktop, full-width on mobile (<640px)
- [ ] The clicked task's data populates the panel immediately (no additional API call — data is already in the grid)
- [ ] Clicking the Project cell still navigates to `projects.html#{slug}` (not the panel)
- [ ] Clicking editable cells (Status, Priority, Owner, Phase) still triggers inline editing (not the panel)
- [ ] If a panel is already open for a different task, it updates to show the newly clicked task (no close-then-reopen)
- [ ] Panel entrance animation: slide in from right (200ms ease)

**Interaction states:**
- Loading: N/A — data is already in memory from the grid
- Empty: N/A — you can only open the panel for an existing task
- Error: N/A — panel reads from client-side state, not the server

### US-TD-2: View all task fields in the detail panel

As the CEO, I can see all information about a task in one place — including the description and who created it — so I have full context.

**Acceptance criteria:**
- [ ] Panel displays all fields in this layout order:
  1. **Header row:** Task ID (e.g., "RT-1") on the left, Close button (X) on the right
  2. **Title** — prominent, editable (see US-TD-3)
  3. **Description** — multi-line area below title, editable (see US-TD-3). Shows placeholder "Add a description..." when empty.
  4. **Metadata section** — compact key-value layout:
     - Status (badge, same styling as grid)
     - Priority (badge, same styling as grid)
     - Owner (avatar + name, same as grid)
     - Phase
     - Project (link to project page)
     - Created by (read-only text, dimmed if empty)
- [ ] Project name is a clickable link that navigates to `projects.html#{slug}`
- [ ] If `createdBy` is empty, show "—" as placeholder text in secondary color
- [ ] Description shows full text without truncation (scrollable if very long)

### US-TD-3: Edit task fields from the detail panel

As the CEO, I can edit task fields directly in the detail panel, and changes are saved and reflected in the grid.

**Acceptance criteria:**
- [ ] **Title:** Editable text input. Click to edit, blur or Enter to save. Shows current value as styled text when not editing.
- [ ] **Description:** Editable textarea. Always visible (not a click-to-edit toggle). Grows with content, min-height ~80px. Blur to save.
- [ ] **Status:** Dropdown select (planned, in-progress, completed, deferred). Change fires save.
- [ ] **Priority:** Dropdown select (high, medium, low). Change fires save.
- [ ] **Owner:** Editable text input. Blur to save.
- [ ] **Phase:** Editable text input. Blur to save.
- [ ] **ID, Project, Created By:** Read-only. Not editable.
- [ ] On any field change, the corresponding grid cell updates immediately (via `applyTransaction` or direct node update)
- [ ] Save uses the existing per-project debounced PUT mechanism (same as grid inline edits)
- [ ] On save failure, show toast notification (same as grid save errors)

**Interaction states:**

_Loading & Async Operations:_
- [ ] Save is async via debounced PUT — no explicit loading indicator needed (inline editing pattern)
- [ ] N/A — no blocking async operations in the panel

_Error States:_
- [ ] On save failure, toast notification "Failed to save — retrying..." (same as grid, existing toast)
- [ ] User's input is preserved on error (field keeps its new value)
- [ ] N/A — no validation errors (all text fields, no constraints beyond what the schema enforces)

_Disabled & Unavailable States:_
- [ ] Read-only fields (ID, Project, Created By) are visually distinct — no edit affordance, secondary text color
- [ ] N/A — no conditionally disabled fields

_Empty & Zero States:_
- [ ] Empty description shows "Add a description..." placeholder
- [ ] Empty owner shows empty input with placeholder "Assign owner..."
- [ ] Empty phase shows empty input with placeholder "Set phase..."
- [ ] Empty createdBy shows "—"

_Form State:_
- [ ] No form submission — each field saves independently on change/blur
- [ ] N/A — no required fields, no validation, no "unsaved changes" warning

_Optimistic Updates:_
- [ ] Grid cell updates immediately when panel field changes (before server confirmation)
- [ ] If server rejects, toast appears but field value is not reverted (matches grid inline edit behavior — optimistic with toast on failure)

_Timeout & Connectivity:_
- [ ] Same timeout/retry behavior as grid saves (single auto-retry after 2s)

### US-TD-4: Close the detail panel

As the CEO, I can close the detail panel to return to the full-width grid view.

**Acceptance criteria:**
- [ ] Close button (X) in the panel header closes the panel
- [ ] Pressing Escape closes the panel (only when not editing a field — if editing, Escape cancels the field edit first, second Escape closes panel)
- [ ] Clicking on the grid area (outside the panel) closes the panel
- [ ] Panel exit animation: slide out to the right (200ms ease)
- [ ] After closing, the grid resumes its previous state (scroll position, filters, sort preserved)
- [ ] Focus returns to the grid row that was selected (or to a sensible default)

### US-TD-5: Add description to New Task modal

As the CEO, I can add a description when creating a new task, so tasks start with context from day one.

**Acceptance criteria:**
- [ ] New optional "Description" textarea field added to the New Task modal, between Title and Status
- [ ] Placeholder text: "Add details, context, or notes..."
- [ ] Field is optional — no validation
- [ ] On submit, the `description` value is included in the work item saved to the API
- [ ] Textarea has a reasonable default height (~3 rows) and does not auto-grow in the modal (fixed height to keep the modal compact)
- [ ] Existing modal behavior unchanged — Project and Title remain required

**Interaction states:**
- N/A — same as existing modal (US-TT-4 in task-tracker requirements covers all modal interaction states)

---

## 7. Technical Constraints

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| No new API endpoints | Reuse GET /api/tasks + PUT /api/projects/:id/work-items | Data already available; saves use existing path |
| No new schema fields | `description` and `createdBy` already exist | Added in task-tracker project, just need UI |
| Panel width | 480px desktop, 100% mobile | Matches standard side panel sizing; grid stays visible at desktop |
| Save mechanism | Same debounced PUT (500ms) | Don't introduce a second save path |
| Vanilla JS | IIFE pattern, extend js/tasks.js | Consistent with all TeamHQ pages |
| Panel renders from client state | No API call on open | Task data is already in memory from grid fetch |

---

## 8. Pipeline Recommendation

This is a contained UI addition to an existing page. No backend work needed. Lightweight pipeline:

1. **Andrei (Arch)** — Quick tech approach: how the panel integrates with the existing `js/tasks.js` code (event handling changes, panel state management, grid sync). Should be very lightweight — no API changes, no schema changes.
2. **Robert (Designer)** — Design spec: panel layout, field styling, animations, responsive behavior. Can run in parallel with Andrei since there are no backend dependencies.
3. **Alice (FE)** — Implementation: side panel HTML/CSS/JS, click behavior changes, field editing, grid sync, description in New Task modal.
4. **Robert (Designer)** — Lightweight design review.
5. **Enzo (QA)** — QA pass. Release gate.

**Skip Jonah/Sam** — no backend changes.
**Skip Nina/Soren/Amara** — the side panel follows established patterns (no novel interactions). If the design review reveals issues, we can pull them in.
**Skip Priya** — internal tool.
**No Restructure files** — all changes extend `js/tasks.js`, `css/tasks.css`, and `tasks.html`. No existing functionality is being rebuilt.

---

## 9. Risks and Open Questions

**Risks:**

1. **Click behavior change** — Users (the CEO) currently expect clicking a row to navigate to the project. This changes to opening a detail panel for ID/Title clicks. The Project cell still navigates. Risk: muscle memory disruption. Mitigation: the Project cell retains its link styling, and the panel provides a "View Project" link for easy navigation.

2. **Grid + panel layout at narrow widths** — At tablet widths (~768px), a 480px panel would overlap most of the grid. Mitigation: panel goes full-width below 640px (covers the grid entirely, which is fine for mobile). Between 640px and ~960px, panel could either overlay or push the grid — Robert should decide.

3. **Description field size** — If someone writes a very long description, the panel needs to scroll. Not complex, but needs explicit handling in the design spec.

**Resolved decisions:**

1. **Side panel over modal or page.** Panel maintains grid context (you can still see which task you selected), and it's the standard pattern for task trackers (Linear, Asana, Jira).
2. **Click target: ID and Title cells.** These are the task identity — clicking them to see details is the natural action. Project cell keeps its navigation behavior.
3. **No comments system.** Would require a new data model (array of comments per task, timestamps, authors). Deferred to a separate project. The detail panel is useful without it.
4. **No new API.** All data is already fetched and available in client-side state. Panel reads from the grid's data. Saves use the same debounced PUT.
5. **Description added to New Task modal.** If we're surfacing description in the detail panel, the modal should let you set it at creation time too. Small addition.

---

*Requirements written by Thomas (PM). Downstream agents: read this doc and `docs/task-tracker-requirements.md` (for existing context) before starting your work.*
