# Tasks Multi-Select Tech Approach

**Status:** Approved
**Owner:** Andrei (Arch)
**Date:** 2024-05-23

## 1. Overview
This feature adds the ability to select multiple tasks in the global Tasks grid and perform bulk operations (Status, Priority, Owner, Delete). The challenge is effectively managing state updates across tasks that may belong to different projects, as the backend API is project-centric (`PUT /api/projects/:id/work-items`).

We will use AG Grid's native selection capabilities and implement an "Optimistic UI" pattern: update the grid immediately, then fan out parallel API requests to persist changes to each affected project.

## 2. Architecture Decisions

### 2.1 AG Grid Selection
We will enable **Multiple Row Selection** using AG Grid's built-in features.
- **Checkbox Column:** A new pinned column at the start.
- **Select All:** Native header checkbox selection (respects filters).
- **Click Behavior:** Row clicks will continue to open the detail panel (`suppressRowClickSelection: true`). Only clicking the checkbox triggers selection.

### 2.2 Bulk Action Bar
A new UI component `div.bulk-action-bar` will be added to `tasks.html`. It will handle its own visibility based on `selectionChanged` events from the grid. It acts as the controller for bulk operations.

### 2.3 Batch Persistence Strategy
Since we don't have a `/api/tasks/bulk-update` endpoint, we must orchestrate updates on the client.
- **Grouping:** Selected tasks will be grouped by `projectId`.
- **Concurrency:** We will execute saves in parallel using `Promise.allSettled`.
- **Optimistic UI:** The grid is updated *before* the API calls. This makes the UI feel instant.
- **Debounce Bypass:** Bulk actions will bypass the existing `scheduleTaskSave` debounce mechanism to ensure immediate persistence triggers, though we will reuse the `saveProjectTasks` core logic.

## 3. Data Flow

### Bulk Update Sequence
1. **User Action:** User selects rows and clicks "Set Status: Completed".
2. **Flagging:** Set `_isBulkUpdating = true` to suppress individual `onCellValueChanged` triggers.
3. **Grid Update:** Iterate selected nodes and update data (e.g., `node.setDataValue('status', 'completed')`).
4. **Grouping:** Identify unique `projectId`s from the selected nodes.
5. **Reset Flag:** Set `_isBulkUpdating = false`.
6. **Persistence:**
   - Loop through unique `projectId`s.
   - Call `saveProjectTasks(projectId)` for each.
   - Use `Promise.allSettled` to track completion.
7. **Feedback:**
   - **Success:** Show toast "Updated X tasks". Clear selection.
   - **Partial/Fail:** Show toast "Failed to update X projects". Keep selection active so user can retry.

## 4. Implementation Details

### 4.1 Grid Configuration (`js/tasks.js`)

**New Column Definition:**
Add this as the first item in `columnDefs`:
```javascript
{
  headerCheckboxSelection: true,
  headerCheckboxSelectionFilteredOnly: true,
  checkboxSelection: true,
  width: 50,
  minWidth: 50,
  maxWidth: 50,
  pinned: 'left',
  lockPosition: true,
  resizable: false,
  suppressMovable: true,
  field: '_selection', // dummy field
  cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
}
```

**Grid Options Updates:**
```javascript
rowSelection: 'multiple',
suppressRowClickSelection: true,
onSelectionChanged: handleSelectionChanged,
```

### 4.2 Bulk Action Bar Logic
**State:**
- `_selectedNodes`: Array of currently selected AG Grid row nodes.

**Event Handler (`handleSelectionChanged`):**
- Update `_selectedNodes`.
- Update text: "X tasks selected".
- Toggle visibility: `bulkBar.classList.toggle('visible', count > 0)`.

**Bulk Update Function:**
```javascript
function executeBulkUpdate(field, value) {
  var nodes = _gridApi.getSelectedNodes();
  if (!nodes.length) return;

  var affectedProjectIds = new Set();
  _isBulkUpdating = true; // Flag to suppress individual auto-saves

  // 1. Update Grid UI
  nodes.forEach(function(node) {
    node.setDataValue(field, value);
    affectedProjectIds.add(node.data.project.id);
  });

  _isBulkUpdating = false;

  // 2. Persist Changes
  var promises = [];
  affectedProjectIds.forEach(function(projectId) {
    // reusing existing save logic but perhaps returning the fetch promise
    promises.push(saveProjectTasks(projectId, 0, true)); // true = return promise
  });

  Promise.allSettled(promises).then(function(results) {
    var failed = results.filter(r => r.status === 'rejected');
    if (failed.length === 0) {
      showToast('Updated ' + nodes.length + ' tasks');
      _gridApi.deselectAll();
    } else {
      showToast('Completed with errors. Failed to save ' + failed.length + ' projects.');
    }
  });
}
```

*Note: `saveProjectTasks` needs a small modification to return the `fetch` promise so we can track it.*

### 4.3 Delete Logic
Delete is slightly different:
1. Confirm with native `confirm()`.
2. Collect nodes and `projectId`s.
3. Remove nodes from grid: `_gridApi.applyTransaction({ remove: dataList })`.
4. Trigger saves for affected projects.

## 5. UI Structure (`tasks.html`)

Add inside `main` or just before closing `body`:

```html
<div class="bulk-action-bar" id="bulk-action-bar" aria-hidden="true">
  <div class="bulk-action-bar__count" id="bulk-count">0 selected</div>
  <div class="bulk-action-bar__controls">
    <select id="bulk-status" aria-label="Bulk set status">
      <option value="" disabled selected>Set Status...</option>
      <option value="planned">Planned</option>
      ...
    </select>
    <select id="bulk-priority" aria-label="Bulk set priority">
      <option value="" disabled selected>Set Priority...</option>
      ...
    </select>
    <div class="bulk-action-bar__input-group">
      <input type="text" id="bulk-owner" placeholder="Set Owner">
      <button type="button" id="bulk-owner-apply">Apply</button>
    </div>
    <button type="button" class="bulk-action-bar__delete" id="bulk-delete">Delete</button>
  </div>
</div>
```

## 6. Change Impact

| File | Classification | Impact |
|------|---------------|--------|
| `tasks.html` | **Modify** | Adding Bulk Action Bar markup. |
| `css/tasks.css` | **Modify** | Styling for the Bulk Action Bar (fixed position, z-index). |
| `js/tasks.js` | **Restructure** | Adding multi-select logic, bulk update orchestration, and modifying `saveProjectTasks` to support promise return. Significant logic addition. |
| `docs/bug-reporter-user-guide.md` | **Extend** | Mention bulk actions if applicable (unlikely). |

**QA Impact Notes (`tasks.js` [Restructure]):**
- **Regression Test:**
  - Single cell editing (status, priority).
  - Row clicking (must still open panel).
  - New task creation.
  - Filtering and sorting (selection must persist or clear logically).
- **New Tests:**
  - Select All with active filters (should only select filtered).
  - Bulk update status -> check reload.
  - Bulk delete -> check reload.
  - Cross-project updates (select tasks from Proj A and Proj B, update, reload page to verify).

## 7. Risks & Mitigations
- **Race Conditions:** User edits a cell while bulk saving. *Mitigation:* The `_isBulkUpdating` flag helps, but concurrent network requests are always tricky. We rely on the "last write wins" nature of the full-project PUT.
- **Performance:** Selecting 1000 rows. *Mitigation:* AG Grid handles large selections well. The bottleneck is firing 20+ API calls if 20 projects are touched. *Decision:* We won't throttle API calls for v1 (assuming <10 active projects usually), but we will keep an eye on it.
