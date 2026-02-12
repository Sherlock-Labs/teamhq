# Tasks Multi-Select Requirements

**Status:** In Progress
**Owner:** Thomas (PM)
**Date:** 2024-05-23

## 1. Overview
The Tasks page currently allows managing tasks one by one. As the number of tasks grows, maintaining them becomes tedious. Users need a way to perform bulk actions—specifically updating status, priority, and assignments, or deleting obsolete tasks—to keep the backlog clean and up-to-date efficiently.

This feature introduces multi-row selection to the AG Grid implementation and a bulk action bar to execute changes across selected items, even if they belong to different projects.

## 2. Scope

### In Scope
- **Row Selection:** Checkbox selection in the first column of the AG Grid.
- **Select All:** Header checkbox to select/deselect all currently filtered/visible rows.
- **Bulk Action Bar:** A floating or fixed bar that appears when 1 or more rows are selected.
- **Bulk Operations:**
  - **Status Update:** Set status to Planned, In Progress, Completed, or Deferred.
  - **Priority Update:** Set priority to High, Medium, or Low.
  - **Assign Owner:** Set the owner field for all selected tasks.
  - **Delete:** Permanently remove selected tasks.
- **Cross-Project Updates:** Actions must correctly update the underlying data for each project involved.
- **Keyboard Support:** Shift+Click for range selection (standard AG Grid behavior).

### Out of Scope
- **Bulk Edit Text Fields:** No bulk editing of titles, descriptions, or phases.
- **Undo/Redo:** No undo stack for bulk actions.
- **Drag-and-Drop:** No reordering of rows via drag-and-drop.
- **Complex Filtering:** No changes to existing filter logic, just respecting it for "Select All".

## 3. User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-1 | As a user, I want to select multiple tasks using checkboxes so that I can act on them as a group. | P0 |
| US-2 | As a user, I want to select all visible tasks with one click so that I can quickly clear a backlog. | P1 |
| US-3 | As a user, I want to update the status of selected tasks in one go so that I can mark a sprint as completed. | P0 |
| US-4 | As a user, I want to bulk assign tasks to an owner so that I can distribute work efficiently. | P1 |
| US-5 | As a user, I want to bulk delete tasks so that I can remove test data or duplicates. | P1 |
| US-6 | As a user, I want to see how many tasks are selected so that I am confident in my action. | P2 |

## 4. Acceptance Criteria

### US-1 & US-2: Selection
- [ ] First column of the grid contains a checkbox.
- [ ] Header of the first column contains a "Select All" checkbox.
- [ ] Clicking a row's checkbox toggles selection for that row.
- [ ] Clicking "Select All" selects all rows currently visible in the grid (respecting current filters).
- [ ] Clicking "Select All" again deselects all rows.
- [ ] Shift+Click allows selecting a range of rows.
- [ ] Selection persists when sorting columns.

### US-3, US-4, US-5: Bulk Actions
- [ ] **Bulk Action Bar** appears at the bottom (or replaces filter bar) when at least one row is selected.
- [ ] Bar displays "X tasks selected".
- [ ] Bar contains controls for:
  - **Status:** Dropdown (Planned, In Progress, Completed, Deferred).
  - **Priority:** Dropdown (High, Medium, Low).
  - **Owner:** Text input or dropdown with "Apply" button.
  - **Delete:** Button (red/danger style).
- [ ] **Status Change:** Selecting a new status immediately updates all selected rows in the grid and saves changes to their respective project files.
- [ ] **Priority Change:** Selecting a new priority immediately updates all selected rows and saves.
- [ ] **Owner Change:** Entering a name and confirming updates all selected rows and saves.
- [ ] **Delete:** Clicking Delete triggers a browser confirmation dialog ("Are you sure you want to delete X tasks?"). Confirming removes rows and updates project files.
- [ ] After a successful bulk action, selection is **cleared** (except for Delete, where rows are gone anyway).
- [ ] A toast notification confirms the action ("Updated 5 tasks").

### Interaction States Checklist
- [ ] **Loading:** If bulk save takes time, show a loading indicator or disable the action bar to prevent double-submissions.
- [ ] **Error:** If saving fails for some projects, show an error toast ("Failed to update 2 projects"). The grid should ideally reflect the state of what *did* succeed, or revert (simple error toast is acceptable for v1).
- [ ] **Empty:** When no rows are selected, the Bulk Action Bar is hidden.
- [ ] **Disabled:** "Apply" buttons for Owner should be disabled if the input is empty.
- [ ] **Partially Selected:** If "Select All" is clicked but some rows were manually deselected, the header checkbox should show indeterminate state (if supported by AG Grid) or uncheck.

## 5. Technical Considerations
- **AG Grid Config:** Use `rowSelection: 'multiple'`, `suppressRowClickSelection: true` (to keep click-to-open-panel working), and `checkboxSelection: true` on the first column.
- **Data Persistence:** The current `saveProjectTasks` function saves *all* tasks for a project. For bulk updates affecting multiple projects, we must iterate through the unique set of project IDs in the selection and trigger a save for each.
- **Race Conditions:** Ensure rapid successive edits don't overwrite each other. The existing debounced save (`scheduleTaskSave`) might need adjustment or we might need a direct `saveAll(projectIds)` function for bulk ops to ensure immediate execution.
- **Performance:** Updating 50+ rows and triggering 5+ API calls (one per project) should be handled gracefully. `Promise.all` for the save requests is recommended.

## 6. Design Guidelines
- **Bulk Bar Position:** Fixed at the bottom of the viewport or floating above the grid bottom. High contrast background (e.g., dark charcoal `var(--color-bg-tertiary)` or similar) to distinguish from the light theme.
- **Typography:** Clear, legible labels.
- **Icons:** Use standard icons for Delete (trash can).

## 7. Pipeline Plan
1. **Thomas (PM):** Requirements (Done).
2. **Andrei (Arch):** Tech approach for handling multi-project batch updates and AG Grid config.
3. **Robert (Designer):** Design the Bulk Action Bar and selection visual states.
4. **Alice (FE):** Implement changes in `tasks.js` and `tasks.html`.
5. **Robert (Designer):** Review implementation.
6. **Enzo (QA):** Verify bulk actions and data integrity.
