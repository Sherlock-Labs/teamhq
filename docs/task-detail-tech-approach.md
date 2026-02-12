# Task Detail View — Technical Approach

**Author:** Andrei (Arch)
**Date:** February 12, 2026
**Status:** Complete

---

## 1. Overview

The task detail side panel is a pure frontend addition to the existing Tasks page. No backend changes, no new API endpoints, no schema changes. All data needed is already in memory from the `GET /api/tasks` response. Saves route through the existing per-project debounced PUT.

**Key design decisions:**

1. **Panel reads from AG Grid row data, not from a separate data source.** When the panel opens, it gets the row node by its composite ID (`slug::id`) and reads `node.data`. No additional fetch. When a panel field changes, it writes back via `rowNode.setDataValue()`, which automatically triggers AG Grid's `onCellValueChanged` → `scheduleTaskSave()`. Zero new save logic.

2. **Static HTML shell in `tasks.html`, populated by JS.** The panel DOM structure lives in the HTML file (like the modal), not built dynamically in JS. Field elements are grabbed by ID on page load. Content is swapped when a task is selected. This follows the same pattern as the existing New Task modal.

3. **Click routing via `colDef.field`, not separate cell renderers.** The existing `onCellClicked` handler already gates on `colDef.editable`. We extend it to check `colDef.field` — if `id` or `title`, open panel; if `project`, navigate; if editable, AG Grid handles it.

---

## 2. Panel State Management

### New State Variables

Add these to the existing IIFE state block (after line 18 in `js/tasks.js`):

```javascript
var _panelOpen = false;           // is the panel currently visible?
var _panelRowId = null;           // composite row ID of the displayed task (e.g. "roadmap-tool::RT-1")
var _panelEditOriginal = null;    // original value of a field being edited (for Escape cancel)
var _panelEditField = null;       // field name currently being edited (null when not editing)
```

### Panel DOM Refs

Grabbed once on page load, same pattern as modal refs (lines 40-47):

```javascript
var panelEl = document.getElementById('task-panel');
var panelIdEl = document.getElementById('panel-task-id');
var panelTitleInput = document.getElementById('panel-title');
var panelDescriptionEl = document.getElementById('panel-description');
var panelStatusSelect = document.getElementById('panel-status');
var panelPrioritySelect = document.getElementById('panel-priority');
var panelOwnerInput = document.getElementById('panel-owner');
var panelPhaseInput = document.getElementById('panel-phase');
var panelProjectLink = document.getElementById('panel-project-link');
var panelCreatedBy = document.getElementById('panel-created-by');
var panelCloseBtn = document.getElementById('panel-close');
```

---

## 3. Click Behavior Change

### Current (`onCellClicked`, line 189)

```javascript
onCellClicked: function (event) {
  if (event.colDef && event.colDef.editable) return;
  window.location = 'projects.html#' + event.data.project.slug;
}
```

### New

```javascript
onCellClicked: function (event) {
  // Editable cells (Status, Priority, Owner, Phase) → AG Grid handles inline edit
  if (event.colDef && event.colDef.editable) return;

  var field = event.colDef ? event.colDef.field : null;

  // ID or Title cell → open (or update) detail panel
  if (field === 'id' || field === 'title') {
    var compositeId = event.data.project.slug + '::' + event.data.id;
    openPanel(compositeId);
    return;
  }

  // Project cell → navigate to project page (existing behavior)
  if (field === 'project') {
    window.location = 'projects.html#' + event.data.project.slug;
    return;
  }
}
```

**What changes for the user:** Clicking the ID or Title cell no longer navigates to the project page — it opens the detail panel. The Project cell retains its navigation behavior. Editable cells are unaffected. No existing behavior is lost; the Project cell link still works.

### Cursor Styling

Add `cursor: pointer` to the ID and Title column `cellStyle` definitions (lines 97-98, 105) so they signal clickability. The Project cell already has cursor via the `.tasks__project-link` renderer.

---

## 4. Panel Lifecycle

### `openPanel(compositeRowId)`

1. Look up the row node: `var rowNode = _gridApi.getRowNode(compositeRowId);`
2. If not found (shouldn't happen), bail.
3. Set `_panelRowId = compositeRowId`.
4. Populate all panel fields from `rowNode.data`:
   - `panelIdEl.textContent = rowNode.data.id`
   - `panelTitleInput.value = rowNode.data.title`
   - `panelDescriptionEl.value = rowNode.data.description || ''`
   - `panelStatusSelect.value = rowNode.data.status`
   - `panelPrioritySelect.value = rowNode.data.priority`
   - `panelOwnerInput.value = rowNode.data.owner || ''`
   - `panelPhaseInput.value = rowNode.data.phase || ''`
   - `panelProjectLink.textContent = rowNode.data.project.name`
   - `panelProjectLink.href = 'projects.html#' + rowNode.data.project.slug`
   - `panelCreatedBy.textContent = rowNode.data.createdBy || '—'`
5. Set `panelEl.setAttribute('aria-hidden', 'false')`.
6. Add `task-panel--open` class to trigger CSS slide-in animation.
7. Set `_panelOpen = true`.

**If the panel is already open for a different task:** Skip step 6 (no animation) — just repopulate fields. The panel stays in place and content swaps instantly.

### `closePanel()`

1. If `!_panelOpen`, return.
2. Remove `task-panel--open` class → CSS slide-out animation (200ms).
3. Set `panelEl.setAttribute('aria-hidden', 'true')`.
4. Set `_panelOpen = false`, `_panelRowId = null`.
5. Clear any active field edit state: `_panelEditOriginal = null`, `_panelEditField = null`.
6. Return focus to the grid. If the previously-selected row is still visible, focus that row node via `_gridApi.ensureNodeVisible(rowNode)` and `_gridApi.setFocusedCell(rowNode.rowIndex, 'title')`. If the row was filtered out, focus falls to the grid container.

### Close Triggers

| Trigger | Action |
|---------|--------|
| Close button (X) click | `closePanel()` |
| Escape key (when no field editing) | `closePanel()` |
| Click on grid area outside panel | `closePanel()` |
| Click on ID/Title of a *different* task | `openPanel(newId)` — panel stays open, content updates |
| Click on Project cell | `closePanel()` then navigate (navigation will leave the page anyway) |

### Click-Outside Handling

Use a document-level `mousedown` listener (not `click` — mousedown fires before blur, avoiding race conditions with field saves):

```javascript
document.addEventListener('mousedown', function (e) {
  if (!_panelOpen) return;
  if (panelEl.contains(e.target)) return; // click inside panel — ignore
  // Click outside panel — close it.
  // (Grid cell clicks that should open/update panel are handled by onCellClicked,
  //  which fires after mousedown. We close here; if onCellClicked also fires,
  //  it will re-open the panel for the new task.)
  closePanel();
});
```

**Important:** The `onCellClicked` handler fires *after* mousedown. So clicking ID/Title on a different row will:
1. `mousedown` → `closePanel()`
2. `onCellClicked` → `openPanel(newId)`

This gives the correct result: the panel closes briefly and reopens for the new task. If we want to avoid the visual close-reopen flicker, we can add a small refinement: in `mousedown`, check if the target is inside the grid. If it is, set a flag `_panelPendingClose = true` and defer the close to a `setTimeout(0)`. In `onCellClicked`, if the click opens the panel, clear the flag. In the timeout, if the flag is still set, close. This prevents the flicker for task-to-task clicks. Alice can decide whether this refinement is worth the complexity — the flicker may not even be visible at 200ms.

---

## 5. Panel ↔ Grid Sync

This is the critical integration point. The key insight: **`rowNode.setDataValue()` triggers AG Grid's `onCellValueChanged`, which already calls `scheduleTaskSave()`**. So panel edits automatically use the existing save path with zero new save code.

### On Panel Field Change

For every editable field in the panel:

```javascript
function panelFieldChanged(field, newValue) {
  if (!_panelRowId) return;
  var rowNode = _gridApi.getRowNode(_panelRowId);
  if (!rowNode) return;

  // Update the row data — this triggers onCellValueChanged → scheduleTaskSave
  rowNode.setDataValue(field, newValue);

  // For title/description, setDataValue may not trigger a visual refresh
  // because those columns don't have custom renderers that depend on the value.
  // Force a cell refresh to be safe:
  _gridApi.refreshCells({ rowNodes: [rowNode], columns: [field], force: true });
}
```

### Field Bindings

| Panel Element | Event | Action |
|--------------|-------|--------|
| Title input | `blur` | `panelFieldChanged('title', panelTitleInput.value.trim())` |
| Title input | `keydown` Enter | Blur the input (triggers the blur handler above) |
| Description textarea | `blur` | `panelFieldChanged('description', panelDescriptionEl.value)` |
| Status select | `change` | `panelFieldChanged('status', panelStatusSelect.value)` |
| Priority select | `change` | `panelFieldChanged('priority', panelPrioritySelect.value)` |
| Owner input | `blur` | `panelFieldChanged('owner', panelOwnerInput.value.trim())` |
| Phase input | `blur` | `panelFieldChanged('phase', panelPhaseInput.value.trim())` |

**Note on `setDataValue` for `title` and `description`:** These fields are not AG Grid columns that are editable via the grid (the grid shows them as read-only). `setDataValue` still updates `node.data` and fires `onCellValueChanged`, which is all we need. The grid cell re-renders with the new value.

### Reverse Sync: Grid Edit → Panel Update

If the panel is open and the user edits a field in the *grid* (e.g., changes Status via the dropdown), the panel should reflect the change. Add to the existing `onCellValueChanged` handler:

```javascript
onCellValueChanged: function (event) {
  scheduleTaskSave(event.data.project.id);

  // If panel is showing this task, update the panel field
  if (_panelOpen && _panelRowId === event.data.project.slug + '::' + event.data.id) {
    updatePanelField(event.colDef.field, event.newValue);
  }
}
```

Where `updatePanelField` maps the field name to the correct panel DOM element and sets its value.

---

## 6. Escape Key Handling

### Current Behavior

There's already an Escape listener for the modal (line 611-614):

```javascript
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && modalOverlay.getAttribute('aria-hidden') === 'false') {
    closeModal();
  }
});
```

### New Behavior

Extend the keydown listener to handle panel Escape. Priority order:
1. If modal is open → close modal (modal takes precedence)
2. If panel field is being edited → cancel edit (restore original, blur without saving)
3. If panel is open → close panel

```javascript
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;

  // 1. Modal takes precedence
  if (modalOverlay.getAttribute('aria-hidden') === 'false') {
    closeModal();
    return;
  }

  // 2. If editing a panel field, cancel the edit
  if (_panelOpen && _panelEditField) {
    cancelPanelEdit();
    return;
  }

  // 3. If panel is open, close it
  if (_panelOpen) {
    closePanel();
    return;
  }
});
```

### Escape-to-Cancel Edit Logic

When a panel text input or textarea gets focus:
1. Store `_panelEditOriginal = currentValue` and `_panelEditField = fieldName`.

When the field blurs normally (tab away, click elsewhere):
1. If value changed → `panelFieldChanged(field, newValue)` (saves).
2. Clear `_panelEditField = null`, `_panelEditOriginal = null`.

When Escape is pressed while editing:
1. `cancelPanelEdit()`:
   - Restore the input's value to `_panelEditOriginal`.
   - Set a `_panelCancellingEdit = true` flag.
   - Blur the input (this triggers the blur handler).
   - In the blur handler, check `_panelCancellingEdit` — if true, skip the save and clear the flag.
2. Clear `_panelEditField`, `_panelEditOriginal`.

**This does not apply to `<select>` elements** (Status, Priority). Selects commit on change, not on blur. There's no "editing" state to cancel — the value changes immediately when the user picks an option.

---

## 7. DOM Structure

### Panel HTML (add to `tasks.html`, after the grid container, before the modal)

```html
<!-- Task Detail Panel -->
<aside class="task-panel" id="task-panel" aria-hidden="true" aria-label="Task details">
  <div class="task-panel__header">
    <span class="task-panel__id" id="panel-task-id"></span>
    <button class="task-panel__close" id="panel-close" type="button" aria-label="Close panel">&times;</button>
  </div>
  <div class="task-panel__body">
    <!-- Title (editable) -->
    <div class="task-panel__section">
      <input type="text" class="task-panel__title-input" id="panel-title"
             placeholder="Task title" autocomplete="off">
    </div>

    <!-- Description (editable textarea) -->
    <div class="task-panel__section">
      <label class="task-panel__label" for="panel-description">Description</label>
      <textarea class="task-panel__description" id="panel-description"
                placeholder="Add a description..." rows="4"></textarea>
    </div>

    <!-- Metadata (key-value pairs) -->
    <div class="task-panel__meta">
      <div class="task-panel__row">
        <span class="task-panel__label">Status</span>
        <select class="task-panel__select" id="panel-status">
          <option value="planned">Planned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="deferred">Deferred</option>
        </select>
      </div>
      <div class="task-panel__row">
        <span class="task-panel__label">Priority</span>
        <select class="task-panel__select" id="panel-priority">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="task-panel__row">
        <span class="task-panel__label">Owner</span>
        <input type="text" class="task-panel__input" id="panel-owner"
               placeholder="Assign owner..." autocomplete="off">
      </div>
      <div class="task-panel__row">
        <span class="task-panel__label">Phase</span>
        <input type="text" class="task-panel__input" id="panel-phase"
               placeholder="Set phase..." autocomplete="off">
      </div>
      <div class="task-panel__row">
        <span class="task-panel__label">Project</span>
        <a class="task-panel__project-link" id="panel-project-link" href="#"></a>
      </div>
      <div class="task-panel__row">
        <span class="task-panel__label">Created by</span>
        <span class="task-panel__value task-panel__value--readonly" id="panel-created-by">—</span>
      </div>
    </div>
  </div>
</aside>
```

### Description Textarea in New Task Modal

Add between the Title field and the Status field in the existing modal form:

```html
<div class="modal__field">
  <label class="modal__label" for="task-description">Description</label>
  <textarea class="modal__textarea" id="task-description" name="description"
            placeholder="Add details, context, or notes..." rows="3"></textarea>
</div>
```

**JS change in `handleModalSubmit`:** Read `document.getElementById('task-description').value` and include it in the `newTask` object instead of hardcoded `description: ''`.

---

## 8. CSS Approach

### Panel Positioning

The panel uses `position: fixed` on the right edge, full-height below the nav. This keeps it in place while the grid scrolls and avoids layout shifts.

```css
.task-panel {
  position: fixed;
  top: 65px;              /* nav height */
  right: 0;
  bottom: 0;
  width: 480px;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  z-index: 200;           /* above grid, below modal overlay (300) */
  transform: translateX(100%);
  transition: transform 200ms ease;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.task-panel--open {
  transform: translateX(0);
}
```

**z-index layering:** Panel (200) < Toast (300) < Modal overlay. Panel should not block toasts or modals.

### Responsive

```css
@media (max-width: 639px) {
  .task-panel {
    width: 100%;
  }
}
```

At full-width mobile, the panel covers the grid entirely. This is fine — the user opened the panel intentionally and can close it with X, Escape, or the close button.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .task-panel {
    transition: none;
  }
}
```

---

## 9. No Backend Changes Needed

Confirming what Thomas noted in the requirements:

- **No new API endpoints.** The panel reads from client-side state (AG Grid row data). All task fields — including `description` and `createdBy` — are already returned by `GET /api/tasks`.
- **No schema changes.** `description` and `createdBy` were added in the task-tracker project. They exist in the schema, are stored in JSON files, and are returned in API responses. They just had no UI until now.
- **Same save mechanism.** Panel edits use `rowNode.setDataValue()` → `onCellValueChanged` → `scheduleTaskSave()` → per-project debounced `PUT /api/projects/:id/work-items`. This is the exact same path as grid inline edits.
- **`description` already included in the save payload.** The existing `saveProjectTasks` function (line 330) already sends `description` and `createdBy` in the PUT body. No changes to the save function.

---

## 10. File Classification

### No New Files

Everything extends existing files. No new JS, CSS, or HTML files.

### Extended Files

| File | Classification | What Changes |
|------|---------------|-------------|
| `js/tasks.js` | **Extend** | ~150-200 lines added: panel state variables, panel DOM refs, `openPanel()`, `closePanel()`, `panelFieldChanged()`, `updatePanelField()`, `cancelPanelEdit()`, Escape key extension, `onCellClicked` rewrite (3 branches replacing 1), focus/blur handlers for panel fields, description in modal submit. No existing functions are rewritten — the `onCellClicked` handler changes its branching logic but the save/filter/modal/grid code is untouched. |
| `css/tasks.css` | **Extend** | ~60-80 lines added: `.task-panel` and child styles, slide animation, responsive override, description textarea in modal. No existing CSS rules are changed. |
| `tasks.html` | **Extend** | Panel `<aside>` element added after the grid container. Description `<textarea>` added inside the existing modal form. No existing HTML is modified. |

### No Restructure. No Modify.

All changes are purely additive. The existing `onCellClicked` handler's body changes (different branching), but the function signature, position, and integration with AG Grid are the same. This is an Extend, not a Modify — we're adding behavior branches, not rewriting the function.

---

## 11. Build Order (Alice)

Alice implements this as one sequential task. Suggested order:

1. **Panel HTML** — Add the `<aside>` to `tasks.html`. Add the description `<textarea>` to the modal.
2. **Panel CSS** — Add `.task-panel` styles to `css/tasks.css`. Get the slide animation working with a hardcoded open state, then remove the hardcoding.
3. **Click behavior** — Rewrite `onCellClicked` with the 3-branch routing. Add cursor styles to ID/Title columns.
4. **Panel open/close** — Implement `openPanel()`, `closePanel()`, close button, Escape handler, click-outside.
5. **Field editing** — Wire up blur/change handlers for all panel fields. Implement `panelFieldChanged()` with `setDataValue`.
6. **Reverse sync** — Add panel update logic to `onCellValueChanged` so grid edits reflect in the panel.
7. **Escape cancel** — Implement the edit-cancel-on-Escape flow with `_panelEditOriginal` tracking.
8. **Description in modal** — Wire `task-description` into `handleModalSubmit`.

Steps 1-5 form the core. Steps 6-8 are polish that can be verified independently.

---

## 12. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| **`setDataValue` firing `onCellValueChanged` for non-editable columns** — AG Grid might treat `setDataValue` on a read-only column differently. | Test early. If `setDataValue` doesn't fire the handler for read-only columns (`title`, `description`), fall back to directly mutating `node.data.title = newValue` and calling `scheduleTaskSave(node.data.project.id)` manually. The save function reads from `node.data`, so this works either way. |
| **Blur-before-mousedown race condition** — Clicking outside the panel fires blur on a panel field (triggering save) and mousedown (triggering close) in quick succession. | The save is debounced (500ms), so the close doesn't interrupt it. The blur handler updates `node.data` synchronously before the debounced save fires. No race. |
| **Panel open + grid inline edit overlap** — User opens the panel for row A, then single-click-edits the Status cell of row B in the grid. | This works fine. AG Grid's inline edit is independent of the panel. The `onCellValueChanged` handler saves the grid edit AND updates the panel if it's showing the same task. If it's a different task, the panel is unaffected. |
| **Description textarea auto-grow** — In the panel, description should grow with content (per requirements: "grows with content, min-height ~80px"). In the modal, it should be fixed-height (per requirements: "does not auto-grow in the modal"). | Panel textarea: use CSS `field-sizing: content` with `min-height: 80px` (modern browsers, aligns with our vanilla JS approach — no JS auto-resize needed). Modal textarea: fixed `rows="3"`, no `field-sizing`. If `field-sizing` support is a concern, Alice can fall back to a JS `input` event handler that sets `style.height = scrollHeight + 'px'`. |

---

*Tech approach written by Andrei (Arch). Downstream agents: Robert reads this for layout constraints and DOM structure. Alice builds from the HTML template, field bindings, and click routing described above.*
