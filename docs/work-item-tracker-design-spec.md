# Work Item Tracker -- Design Spec

**Author:** Robert (Product Designer)
**Date:** February 10, 2026
**Status:** Ready for implementation
**Project ID:** `work-item-tracker`
**Dependencies:** `docs/work-item-tracker-requirements.md` (Thomas), `docs/work-item-tracker-tech-approach.md` (Andrei)

---

## Overview

Add an AG Grid work items table to each project's detail view. This follows existing TeamHQ AG Grid patterns from `css/spreadsheet.css` -- same theming, same badge styles. The spec defines only the work-item-specific details.

---

## 1. Placement

The work items section renders inside the project detail view, **after the pipeline section and before progress notes**. It only appears for projects that have a slug (i.e., projects connected to a tasks file).

```
Session History
Pipeline Section
--> Work Items Section  <-- NEW
Progress Notes
Spreadsheet Data Section
```

### Section Header

```html
<div class="detail__work-items">
  <div class="detail__work-items-header">
    <span class="detail__label">Work Items <span class="detail__count-badge">(23)</span></span>
    <div class="detail__work-items-actions">
      <button class="detail__btn--ghost" type="button">Import</button>
      <button class="detail__btn--ghost" type="button">+ Add</button>
    </div>
  </div>
  <div class="detail__work-items-grid ag-theme-quartz"></div>
</div>
```

**Header styling:**
- Uses existing `detail__label` class for the "Work Items" text (`--text-xs`, uppercase, `--font-weight-medium`, `--color-text-tertiary-accessible`, `letter-spacing: 0.05em`).
- Count badge: inline `--text-xs`, `--color-text-secondary`, normal case. E.g., "(23)".
- Actions right-aligned. Buttons use ghost style: `--text-xs`, `--font-weight-medium`, `--color-text-secondary`, hover `--color-text-primary`. Height 28px. Padding `--space-1` `--space-2`.
- Flex row, justify-content: space-between, align-items: center. Margin-bottom: `--space-3`.

**Grid container:** No border wrapping -- the AG Grid rows provide their own horizontal borders. Margin-bottom: `--space-6` (matches spacing between detail sections).

---

## 2. AG Grid Column Configuration

Uses existing TeamHQ AG Grid theming from `css/spreadsheet.css` -- all `--ag-*` variable overrides, header text styling, row hover, focus rings, and border treatment apply automatically.

| Column | Field | Width | Editable | Cell Renderer | Notes |
|--------|-------|-------|----------|---------------|-------|
| ID | `id` | 80px | No (after creation) | Plain text | Pinned left. `--font-weight-medium`, `--color-text-secondary` |
| Title | `title` | flex: 2 | Yes (text) | Plain text | `--color-text-primary` |
| Status | `status` | 130px | Yes (select) | Badge renderer | See section 3 |
| Phase | `phase` | 100px | Yes (text) | Plain text | `--color-text-secondary` |
| Owner | `owner` | 120px | Yes (text) | Plain text | `--color-text-secondary` |
| Priority | `priority` | 100px | Yes (select) | Badge renderer | See section 3 |
| Actions | -- | 40px | No | Delete button | See section 5 |

**Grid options:** Use existing AG Grid defaults -- `--ag-row-height: 44px`, `--ag-header-height: 40px`, comfortable density. No density toggle needed (always comfortable).

**Default sort:** Status (custom order: in-progress first, planned, deferred, completed last), then ID ascending.

---

## 3. Badge Cell Renderers

Use the existing `.thq-badge` base class from `css/spreadsheet.css`. The status and priority columns render as pill badges.

### Status Badges

| Value | Badge Class | Result |
|-------|-------------|--------|
| `planned` | `thq-badge thq-badge--muted` | Gray bg, secondary text |
| `in-progress` | `thq-badge thq-badge--accent` | Green-tinted bg, accent text |
| `completed` | `thq-badge thq-badge--success` | Green bg, green text |
| `deferred` | `thq-badge thq-badge--warning` | Amber bg, amber-700 text |

### Priority Badges

| Value | Badge Class | Result |
|-------|-------------|--------|
| `high` | `thq-badge thq-badge--error` | Red-tinted bg, red text |
| `medium` | `thq-badge thq-badge--warning` | Amber bg, amber-700 text |
| `low` | `thq-badge thq-badge--muted` | Gray bg, secondary text |

All badge classes already exist in `css/spreadsheet.css`. No new CSS needed.

---

## 4. Add Work Item

Click "+ Add" button in the section header. Behavior:

1. A new row appends to the bottom of the grid.
2. Auto-generated ID: `WI-{n+1}` where n is the current highest numeric suffix (e.g., if last item is WI-12, next is WI-13).
3. Default values: status `planned`, phase empty, owner empty, priority `medium`.
4. The ID cell on the new row is temporarily editable (text input) so the user can change it (e.g., to "US-24").
5. Focus moves to the Title cell for immediate editing.
6. Debounced auto-save (500ms) triggers after the user finishes editing.

The new row uses AG Grid's `applyTransaction({ add: [newItem] })` for an optimistic append.

---

## 5. Delete Interaction

The Actions column (last column, 40px) renders a delete button per row.

**Default:** Invisible (row at rest shows nothing in the actions column).

**Row hover:** A small `x` icon appears. Size: 16px. Color: `--color-text-tertiary`. Cursor: pointer. Hover on the icon: `--color-status-error`.

**Click the X (non-empty row -- has a title):** Inline confirmation replaces the entire row content with:
- Background: `--color-status-error` at 5% opacity (rgba(220,38,38,0.05)).
- Text: "Delete this item?" in `--text-sm`, `--color-text-primary`.
- Two small buttons: "Delete" (destructive style: `--color-status-error` text, `--text-xs`) and "Cancel" (ghost, `--text-xs`).
- Auto-dismiss after 5 seconds (reverts to normal row).

**Click the X (empty row -- no title):** Delete immediately, no confirmation.

**After delete:** Row removed via `applyTransaction({ remove: [item] })`. Auto-save triggers.

---

## 6. Import Modal

Triggered by the "Import" button in the section header. Visible when the table is empty as a primary action; when non-empty, it appears as the ghost button.

**Modal:** 520px wide. Uses standard TeamHQ modal pattern:
- Overlay: `rgba(0,0,0,0.5)`.
- Modal: `--color-bg-card`, `--radius-lg`, `--shadow-lg`.
- Header: "Import Work Items" (`--text-lg`, `--font-weight-semibold`). Close button (X) right-aligned.

**Step 1 -- Paste:**
- Textarea: full width, 200px height, monospace font (`--font-mono`), `--text-xs`.
- Placeholder: "Paste a markdown table with ID and Title columns..."
- Below: "Parse" primary button. "Cancel" ghost button.

**Step 2 -- Preview:**
- Replaces the textarea with a simple list of parsed items.
- Each item: `ID` in `--font-weight-medium` + Title. One item per line.
- Count summary: "Found 23 work items" in `--text-sm`, `--color-text-secondary`.
- If no items parsed: "No work items found. Expected format: markdown table with ID and Title columns." in `--color-status-error`.
- "Confirm" primary button (adds items to the grid). "Back" ghost button (returns to paste step).

**On confirm:** Items added with status `planned`, owner empty, priority `medium`. Phase extracted from the markdown table if a Phase column exists. Modal closes. Auto-save triggers.

---

## 7. Empty State

When no work items exist for a project:

```
No work items tracked yet.
[+ Add Work Item]  [Import from Requirements]
```

- Text: `--text-sm`, `--color-text-tertiary`. Centered within the grid container area.
- Buttons: side by side. "+ Add Work Item" is a secondary button. "Import from Requirements" is a ghost button.
- Padding: `--space-8` vertical.

---

## 8. Interaction States

**Cell editing:** Uses AG Grid's built-in cell editing. Focus ring: 2px `--color-accent` outline (already defined in `spreadsheet.css` as `.ag-cell-focus`). Select dropdowns (Status, Priority) use AG Grid's `agSelectCellEditor`.

**Save feedback:** After successful auto-save, use AG Grid's `flashCells` API on the changed cell. Flash color: `--color-accent` at 10% opacity, 500ms fade. This is a built-in AG Grid feature, no custom CSS needed.

**Save error:** Toast notification (bottom-right): "Failed to save work items" in `--text-sm`, `--color-text-primary`, on a card with `--shadow-md`. Red left border (3px, `--color-status-error`). Auto-retry once after 2 seconds. Dismiss after success or second failure.

**Row hover:** `rgba(0,0,0,0.02)` background (already set via `--ag-row-hover-color` in spreadsheet.css).

**Loading:** "Loading work items..." text in `--text-sm`, `--color-text-tertiary`, pulsing opacity (use existing `thq-pulse` animation from spreadsheet.css). Shown briefly during lazy-load of AG Grid + data fetch.

**Error (fetch failure):** "Failed to load work items." + "Retry" text link in `--color-accent`. Same placement as the empty state area.

---

*Design spec written by Robert (Product Designer). Alice: use existing AG Grid theming from spreadsheet.css -- no new CSS classes needed except the section header layout (.detail__work-items, .detail__work-items-header, .detail__work-items-actions). Badge renderers reuse the existing .thq-badge classes exactly.*
