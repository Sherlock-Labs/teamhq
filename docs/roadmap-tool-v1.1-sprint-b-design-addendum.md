# Roadmap Tool v1.1 Sprint B -- Design Addendum

**Author:** Robert (Product Designer)
**Date:** February 12, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Sprint:** v1.1 Sprint B (Item Depth)
**Dependencies:** `docs/roadmap-tool-design-spec.md` (v1.0 design spec), `docs/roadmap-tool-v1.1-design-addendum.md` (Sprint A addendum), `docs/roadmap-tool-v1.1-sprint-b-requirements.md` (Thomas), `docs/roadmap-tool-v1.1-sprint-b-tech-approach.md` (Andrei)

---

## Overview

This is an addendum to the v1.0 design spec and the Sprint A addendum. It covers three features that deepen the item model: RT-24 (Link Items / Dependencies), RT-26 (Sub-Items), and RT-27 (Key Dates). All three add new data surfaces to the Item Card and new visual elements to the Timeline, Table, and Swimlane views.

The existing design system tokens, component patterns, and interaction conventions carry forward unchanged. This addendum references the v1.0 spec sections by number and only specifies new UI elements.

**Design goals for this sprint:**

1. **Hierarchy without clutter.** Sub-items and dependencies add structural depth. The challenge is showing that depth without overwhelming the clean, flat surfaces that make the tool feel fast. Progressive disclosure: the main views stay clean; detail lives in the Item Card.
2. **Arrows that inform, not decorate.** Dependency arrows on the Timeline must be readable at a glance. They fade into the background when you are not looking at them and become prominent when you are. The 200-arrow cap ensures performance never degrades the experience.
3. **Consistency of interaction patterns.** The new Item Card tabs (Linked Items, Sub-Items) and the Key Dates section all follow the same structural and interaction patterns established in v1.0 -- inline editing, auto-save, optimistic updates where safe, and server-confirmation where structural.

---

## B1. Link Items / Dependencies (RT-24)

### B1.1 Item Card -- Linked Items Tab

The Linked Items tab replaces the v1.0 placeholder ("Linked items will be available in v1.1") in the left panel of the Item Card.

**Tab badge:** When links exist, the "Linked Items" tab label shows a count badge to its right.

| Property | Value |
|----------|-------|
| Badge background | `--gray-200` |
| Badge text | `--text-xs`, weight 500, `--gray-700` |
| Badge padding | 2px 6px |
| Badge border-radius | `--radius-full` |
| Badge margin-left | `--space-1` (4px) |

**Tab content layout:**

```
.linkedItemsTab
  .linkGroup (one per type: "Blocks", "Blocked by", "Moves with", "Relates to")
    .linkGroupLabel            -> text-xs, weight 500, gray-500, uppercase, tracking 0.05em
    .linkRow (one per link)
      .linkTypeIcon            -> 14px, gray-400
      .linkItemName            -> text-sm, weight 400, gray-950, cursor pointer, underline on hover
      .linkRemoveBtn           -> 16px X icon, gray-400, visible on row hover only
  .addLinkBtn                  -> ghost button, bottom of tab
```

**Link group labels and icons:**

| Group | Label | Icon | Icon color |
|-------|-------|------|------------|
| Blocks | "BLOCKS" | Right-pointing arrow (12px) | `--gray-500` |
| Blocked by | "BLOCKED BY" | Left-pointing arrow (12px) | `--gray-500` |
| Moves with | "MOVES WITH" | Double horizontal arrows (12px) | `--gray-500` |
| Relates to | "RELATES TO" | Link chain icon (12px) | `--gray-500` |

Groups with no links in that category are hidden entirely. Groups are displayed in the order listed above.

**Link row spec:**

| Property | Value |
|----------|-------|
| Height | 36px |
| Padding | `--space-2` (8px) horizontal |
| Display | flex, align-items: center, gap: `--space-2` |
| Hover | `--gray-50` background |
| Border-radius | `--radius-md` |

**Link item name interaction:** Clicking the linked item name closes the current Item Card and opens the linked item's Item Card. This is a navigation action, not a panel-within-panel.

**Remove button (X):**

| Property | Value |
|----------|-------|
| Size | 16px |
| Color | `--gray-400` |
| Hover color | `--error-600` |
| Visibility | Hidden by default; visible on link row hover |
| Cursor | pointer |
| Transition | color 100ms ease |

**Link group spacing:**

| Property | Value |
|----------|-------|
| Gap between groups | `--space-4` (16px) |
| Group label margin-bottom | `--space-2` (8px) |
| Group label padding-left | `--space-2` (8px) |

### B1.2 Add Link Popover

Triggered by the "Add Link" button at the bottom of the Linked Items tab.

**Add Link button spec:**

| Property | Value |
|----------|-------|
| Variant | Ghost (per v1.0 spec section 1.6) |
| Height | 32px |
| Icon | Plus icon, 14px, `--gray-500`, left of label |
| Label | "Add Link" |
| Font | `--text-sm`, weight 500, `--gray-700` |
| Margin-top | `--space-3` (12px) |
| Full width | Yes (stretches to tab content width) |
| Hover | `--gray-100` background |

**Popover spec:**

| Property | Value |
|----------|-------|
| Width | 360px |
| Max-height | 400px |
| Background | `--white` |
| Border | 1px solid `--gray-200` |
| Border-radius | `--radius-lg` |
| Shadow | `--shadow-md` |
| Padding | `--space-4` (16px) |
| Position | Below the Add Link button, left-aligned with the tab content |
| Animation | opacity 0 to 1 + translateY(-4px) to 0, 100ms ease |

**Popover content:**

```
.addLinkPopover
  .addLinkHeader               -> "Add Link", text-sm, weight 600, gray-950
  .linkTypeSelector             -> dropdown, full width, margin-top space-3
  .directionSelector            -> only for "Blocks" type, margin-top space-2
  .itemSearchInput              -> text input, full width, margin-top space-3
  .searchResults                -> scrollable list, max-height 200px, margin-top space-2
  .addLinkFooter                -> flex row, justify-end, margin-top space-3
    .cancelBtn                  -> ghost button
    .linkBtn                    -> primary button
```

**Link type selector:**

| Property | Value |
|----------|-------|
| Trigger | Dropdown button, full width, `--gray-300` border |
| Height | 36px |
| Default value | "Blocks" (first option) |
| Options | "Blocks", "Moves with", "Relates to" |
| Option height | 36px |
| Option hover | `--gray-100` background |
| Selected option | `--accent-50` background, `--accent-600` text |

**Direction selector (Blocks only):**

When "Blocks" is selected as the link type, a segmented control appears below:

| Property | Value |
|----------|-------|
| Options | "This item blocks [target]" / "[Target] blocks this item" |
| Default | "This item blocks [target]" |
| Styling | Per v1.0 spec section 8.6 segmented control |
| Height | 32px |
| Font | `--text-xs`, weight 500 |

**Item search input:**

| Property | Value |
|----------|-------|
| Placeholder | "Search items..." |
| Height | 36px |
| Border | 1px solid `--gray-300` |
| Focus | 1px solid `--accent-600` + `0 0 0 2px var(--accent-100)` ring |
| Font | `--text-base` (14px) |
| Icon | Search icon (16px, `--gray-400`) inside left padding |
| Left padding (with icon) | 36px |

**Search results list:**

| Property | Value |
|----------|-------|
| Max-height | 200px (scrollable) |
| Border | 1px solid `--gray-200` |
| Border-radius | `--radius-md` |
| Background | `--white` |

**Search result item:**

| Property | Value |
|----------|-------|
| Height | 40px |
| Padding | `--space-2` (8px) `--space-3` (12px) |
| Display | flex, align-items: center |
| Name | `--text-sm`, weight 400, `--gray-950`, truncate with ellipsis |
| Hover | `--gray-100` background |
| Selected (clicked) | `--accent-50` background, `--accent-600` left border (2px) |
| Cursor | pointer |
| Disabled (self / already linked) | `--gray-400` text, `pointer-events: none` |

Items that are the current item (self-link) or already linked with the selected type appear disabled.

**Footer buttons:**

| Button | Variant | Label |
|--------|---------|-------|
| Cancel | Ghost | "Cancel" |
| Link | Primary | "Link" (disabled until an item is selected) |

### B1.3 Add Link States

**Loading (creating link):**

| State | Behavior |
|-------|----------|
| Button text | Replaced by 14px spinner (same pattern as v1.0 spec section 14.1) |
| Button | Disabled |
| Popover | Remains open |

**Success:**

| State | Behavior |
|-------|----------|
| Popover closes | Yes |
| New link appears in list | Immediately in correct group |
| Tab badge count | Increments |
| Focus | Returns to "Add Link" button |

**Error (inline, below popover footer):**

| Property | Value |
|----------|-------|
| Text | Error message from server (e.g., "These items are already linked.") |
| Font | `--text-xs`, `--error-600` |
| Icon | Warning triangle, 12px, `--error-600`, left of text |
| Margin-top | `--space-2` |
| Animation | fadeIn, 150ms ease |

**Error messages:**

| Condition | Message |
|-----------|---------|
| Duplicate link | "These items are already linked." |
| Self-link | "An item cannot link to itself." |
| Target deleted | "Item not found. It may have been deleted." |
| Server error | "Failed to create link. Try again." |

**Empty state (no links yet):**

| Property | Value |
|----------|-------|
| Text | "No linked items yet. Add links to show dependencies between items." |
| Font | `--text-sm`, `--gray-500` |
| Alignment | Center |
| Padding | `--space-8` (32px) top and bottom |
| Icon | Link chain icon, 32px, `--gray-300`, above text |

**Disabled (viewer role):**

| Element | Behavior |
|---------|----------|
| "Add Link" button | Disabled state (per v1.0 spec section 14.1), tooltip: "You don't have permission to edit this item" |
| Remove (X) buttons | Hidden entirely |
| Link item names | Still clickable (navigation is read-only friendly) |

### B1.4 Timeline Dependency Arrows

Dependency arrows render in a dedicated SVG layer (`DependencyLayer`) between GridLines and HeaderGroups in the render order (per Andrei's tech approach section 6.1).

**"Blocks" arrow spec:**

| Property | Value |
|----------|-------|
| Stroke color (normal) | `var(--gray-400)` (#A1A1AA) |
| Stroke color (conflict) | `var(--error-600)` (#DC2626) |
| Stroke width | 1.5px |
| Stroke dasharray | none (solid) |
| Path style | Right-angle routing: exit right edge of blocker, horizontal to midpoint, vertical to target Y, horizontal to left edge of blocked |
| Arrowhead | 6px equilateral triangle at the path endpoint, pointing right/down toward the blocked item |
| Opacity (default) | 0.5 |
| Opacity (parent item hovered or selected) | 1.0 |
| Transition | opacity 150ms ease |

**Conflict detection (visual only, per requirements -- no auto-scheduling):** An arrow renders in `--error-600` when the blocker item's `endDate` is after (or equal to) the blocked item's `startDate`. This is a date comparison at render time.

**Arrowhead marker definition:**

```svg
<defs>
  <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
    <polygon points="0 0, 6 3, 0 6" fill="var(--gray-400)" />
  </marker>
  <marker id="dep-arrow-error" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
    <polygon points="0 0, 6 3, 0 6" fill="var(--error-600)" />
  </marker>
</defs>
```

**"Moves with" line spec:**

| Property | Value |
|----------|-------|
| Stroke color | `var(--gray-300)` (#D4D4D8) |
| Stroke width | 1.5px |
| Stroke dasharray | `2 2` (2px dash, 2px gap) |
| Path style | Straight line between the vertical centers of both items |
| Arrowhead | None |
| Opacity (default) | 0.4 |
| Opacity (parent item hovered or selected) | 0.8 |
| Transition | opacity 150ms ease |

**"Relates to" links:** Not rendered on the Timeline (per requirements). Visible only in the Item Card.

**Right-angle routing details:**

The path from blocker (source) to blocked (target) follows this algorithm:

1. **Start point:** Right edge of source bar, vertical center.
2. **End point:** Left edge of target bar, vertical center.
3. **Case 1 (target right of source):** `M startX startY H midX V endY H endX` where `midX = startX + (endX - startX) / 2`. This creates a clean right-angle with the vertical segment centered between the two bars.
4. **Case 2 (target left of or overlapping source):** Route around by going right from source, down below both bars, then left to target. Uses a 12px clearance gap below the lower bar.

If routing produces a path that would overlap other item bars, fall back to a diagonal line. Visual refinement of routing can happen post-QA.

**Path minimum clearance:** 12px from bar edges. No path segment should run closer than 12px to any item bar edge.

### B1.5 Arrow Interaction States

**Default (no hover, no selection):**

| Property | Value |
|----------|-------|
| All "blocks" arrows | Opacity 0.5, stroke `--gray-400` |
| All "moves with" lines | Opacity 0.4, stroke `--gray-300` |

**Item hovered:**

When a user hovers over an item bar on the Timeline:

| Property | Value |
|----------|-------|
| Arrows connected to hovered item | Opacity 1.0 (blocks) or 0.8 (moves with), stroke width increases to 2px |
| All other arrows | Opacity 0.2 |
| Connected item bars | Normal opacity (1.0) |
| Unrelated item bars | Opacity dims to 0.7 |
| Transition | All opacity/width changes: 150ms ease |

**Item selected (Item Card open):**

Same highlighting as hover, but persists until the item is deselected or the Item Card closes.

**During drag (RT-25 interaction):**

| Property | Value |
|----------|-------|
| Arrows connected to dragged item | Update in real time, following the ghost bar position |
| All other arrows | Opacity 0.15 (nearly invisible, reducing visual noise during drag) |
| Transition | None during drag (per-frame updates for 60fps) |

### B1.6 Arrow Performance Cap

When more than 200 "blocks" + "moves with" arrows are visible in the current viewport:

1. All arrows are hidden.
2. Only arrows connected to the currently hovered or selected item are shown.
3. A subtle indicator appears in the bottom-left of the timeline area:

| Property | Value |
|----------|-------|
| Text | "Showing links for selected item" |
| Font | `--text-xs`, `--gray-500` |
| Background | `--white` at 80% opacity |
| Padding | `--space-1` `--space-2` |
| Border-radius | `--radius-sm` |
| Position | Fixed bottom-left of timeline content, 8px from edges |
| Visibility | Only when cap is active AND an item is hovered/selected |

When no item is hovered or selected and the cap is active, no arrows render and no indicator shows. Arrows reappear as soon as the user hovers or selects an item.

### B1.7 Table View -- Links Column

A new optional column "Links" can be added to the Table View via the column manager.

**Column header:** "LINKS" (uppercase, per v1.0 spec section 4.2 header styling).

**Cell content:**

| Property | Value |
|----------|-------|
| Display | Count badge pill |
| Badge text | "N links" (e.g., "3 links") or "1 link" |
| Badge background | `--gray-100` |
| Badge text color | `--gray-700` |
| Badge font | `--text-xs`, weight 500 |
| Badge padding | 2px 8px |
| Badge border-radius | `--radius-full` |
| Click | Opens the item's Item Card on the Linked Items tab |
| Cursor | pointer |
| Hover | `--gray-200` background on badge |

**Empty cell (no links):** Dash character "--" in `--gray-400`.

**Column width:** 100px default, resizable.

### B1.8 Accessibility

- Each dependency arrow path has `role="img"` and `aria-label`: "Dependency: [Source item name] blocks [Target item name]" or "Link: [Item A] moves with [Item B]".
- Conflict arrows additionally include: ", conflict: blocker ends after blocked item starts".
- The Add Link popover uses `role="dialog"` with `aria-label="Add link"`. Focus traps within the popover when open.
- The search input in the popover has `aria-label="Search items to link"`.
- Search results use `role="listbox"`, each result `role="option"`.
- The link type selector uses `role="listbox"`.
- On link creation success, `aria-live="polite"` announces: "Linked [item name] as [link type]".
- On link removal, `aria-live="polite"` announces: "Link removed".
- The remove (X) button on each link row has `aria-label="Remove link to [item name]"`.

---

## B2. Sub-Items (RT-26)

### B2.1 Item Card -- Sub-Items Tab

The Sub-Items tab replaces the v1.0 placeholder ("Sub-items will be available in v1.1") in the left panel of the Item Card.

**Tab badge:** When sub-items exist, the "Sub-Items" tab label shows a count badge (same spec as B1.1 tab badge).

**Tab content layout:**

```
.subItemsTab
  .subItemsList
    .subItemRow (one per sub-item, draggable)
      .dragHandle               -> 6-dot grip icon, 12px, gray-300, visible on hover
      .subItemCheckbox           -> 16px checkbox (decorative, for future status use)
      .subItemName               -> text-sm, weight 400, gray-950, cursor pointer
      .subItemMeta               -> text-xs, gray-500 (status field value + dates if set)
      .subItemMenu               -> three-dot icon, 14px, gray-400, visible on hover
  .addSubItemBtn                 -> ghost button, bottom of list
```

**Sub-item row spec:**

| Property | Value |
|----------|-------|
| Height | 40px |
| Padding | `--space-2` (8px) left (after drag handle), `--space-3` (12px) right |
| Display | flex, align-items: center, gap: `--space-2` |
| Border-bottom | 1px solid `--gray-100` |
| Hover | `--gray-50` background |
| Border-radius | `--radius-md` (on hover, clip the background) |

**Drag handle:**

| Property | Value |
|----------|-------|
| Icon | 6-dot grip (3 rows of 2 dots) |
| Size | 12px wide, 16px tall |
| Color | `--gray-300` |
| Visibility | Hidden by default; visible on row hover |
| Cursor | `grab` (changes to `grabbing` during drag) |
| Hit area | 24px wide (12px padding each side of icon) |

**Sub-item name:**

| Property | Value |
|----------|-------|
| Font | `--text-sm`, weight 400, `--gray-950` |
| Hover | Underline, cursor pointer |
| Click | Closes current Item Card, opens the sub-item's Item Card |
| Truncation | Ellipsis at available width (flex: 1, min-width: 0) |

**Sub-item meta (inline, right of name):**

| Property | Value |
|----------|-------|
| Font | `--text-xs`, `--gray-500` |
| Content | First list-type field value (as colored pill, same spec as table cell pills but smaller: height 18px, `--text-xs`) + date range if set ("Jan 15 -- Mar 30") |
| Max width | 200px, truncate with ellipsis |

**Three-dot menu:**

| Property | Value |
|----------|-------|
| Icon | Three vertical dots, 14px, `--gray-400` |
| Hover | `--gray-700` |
| Visibility | Hidden by default; visible on row hover |
| Click | Opens dropdown menu |

**Three-dot dropdown menu:**

| Property | Value |
|----------|-------|
| Width | 180px |
| Background | `--white` |
| Border | 1px solid `--gray-200` |
| Border-radius | `--radius-lg` |
| Shadow | `--shadow-md` |
| Padding | `--space-1` (4px) vertical |
| Animation | opacity 0 to 1 + translateY(-4px) to 0, 100ms ease |

**Menu options:**

| Option | Font | Color | Icon |
|--------|------|-------|------|
| "Open" | `--text-sm`, weight 400 | `--gray-900` | External link icon, 14px |
| "Remove from parent" | `--text-sm`, weight 400 | `--gray-900` | Outdent icon, 14px |
| "Delete" | `--text-sm`, weight 400 | `--error-600` | Trash icon, 14px |

Option height: 36px. Padding: `--space-2` (8px) `--space-3` (12px). Hover: `--gray-100` background. Delete option hover: `--error-50` background.

### B2.2 Add Sub-Item

**"Add Sub-Item" button spec:**

| Property | Value |
|----------|-------|
| Variant | Ghost button (full width) |
| Height | 36px |
| Icon | Plus icon, 14px, `--gray-500` |
| Label | "Add Sub-Item" |
| Font | `--text-sm`, weight 500, `--gray-700` |
| Margin-top | `--space-2` (8px) |
| Hover | `--gray-100` background |

**Inline creation flow:**

1. Click "Add Sub-Item" button.
2. A new row appears at the bottom of the list with an empty text input focused (optimistic -- row appears immediately).
3. The text input replaces the sub-item name area in the row.

**Inline text input spec:**

| Property | Value |
|----------|-------|
| Height | 36px |
| Padding | `--space-2` (8px) |
| Border | 1px solid `--accent-600` |
| Border-radius | `--radius-md` |
| Font | `--text-sm`, weight 400 |
| Placeholder | "Sub-item name..." in `--gray-500` |
| Background | `--white` |
| Focus ring | `0 0 0 2px var(--accent-100)` |

**Save:** Press Enter or blur with non-empty text. The sub-item is created via API.
**Cancel:** Press Escape or blur with empty text. The row fades out (opacity 1 to 0, 150ms ease) and is removed.

### B2.3 Sub-Item Drag Reorder

Sub-item rows in the Item Card tab can be reordered via drag-and-drop.

**Drag feedback:**

| Property | Value |
|----------|-------|
| Dragged row | Lifted appearance: `--shadow-md`, background `--white`, scale(1.02), z-index above siblings |
| Drop target indicator | 2px horizontal line in `--accent-600` between rows at the drop position |
| Other rows | Animate to make space (translateY, 150ms ease) |
| Cursor | `grabbing` |

**On drop:** The sub-item's `sortOrder` is updated via API. The row settles into its new position with a 150ms ease transition.

**`prefers-reduced-motion`:** The lift/drop animations are disabled. The dragged row simply moves to the new position. The drop indicator line still appears.

### B2.4 Sub-Item States

**Loading (creating sub-item):**

| State | Behavior |
|-------|----------|
| New row | Appears immediately (optimistic), name input focused |
| Save trigger | On Enter/blur with text |
| Server confirmation | Row confirmed, no visible change |
| Server failure | Row fades out (opacity 1 to 0, 150ms), toast: "Failed to create sub-item. Try again." |

**Error messages:**

| Condition | Message | Display |
|-----------|---------|---------|
| Nesting under sub-item | "Sub-items cannot have their own sub-items." | Inline error in `--text-xs`, `--error-600`, below the row |
| Max sub-items (50) | "Maximum of 50 sub-items per item." | Toast notification |
| Server error | "Failed to create sub-item. Try again." | Toast notification |

**Empty state:**

| Property | Value |
|----------|-------|
| Text | "No sub-items yet. Break this item into smaller pieces." |
| Font | `--text-sm`, `--gray-500` |
| Alignment | Center |
| Padding | `--space-8` (32px) top and bottom |
| Icon | Hierarchy/tree icon, 32px, `--gray-300`, above text |

**Disabled (viewer role):**

| Element | Behavior |
|---------|----------|
| "Add Sub-Item" button | Disabled state, tooltip: "You don't have permission to edit this item" |
| Drag handles | Hidden |
| Three-dot menus | Hidden |
| Sub-item names | Still clickable (navigation) |

**Delete parent confirmation dialog:**

When deleting a parent item that has sub-items, the standard delete confirmation changes:

| Property | Value |
|----------|-------|
| Title | "Delete [item name]?" |
| Message | "This will also delete [N] sub-item[s]. This action cannot be undone." |
| Cancel button | Ghost: "Cancel" |
| Delete button | Danger: "Delete All" |

### B2.5 Timeline View -- Summary Bars

Parent items that have sub-items render as a "summary bar" on the Timeline. Sub-item bars render below the summary bar.

**Summary bar spec:**

| Property | Value |
|----------|-------|
| Height | 8px (spacious layout), 6px (compact layout) |
| Fill | Parent's assigned palette color at 40% opacity |
| Border-radius | 2px |
| Stroke | None |
| Label | Parent item name, positioned above the summary bar (same label spec as v1.0 section 5.4, but with `--gray-700` color instead of `--gray-900` to de-emphasize relative to child bars) |

**Bracket marks at summary bar ends:**

| Property | Value |
|----------|-------|
| Shape | Small downward-pointing ticks, 3px tall, 1.5px wide |
| Color | Same as the summary bar fill color but at 80% opacity |
| Position | Left and right edges of the summary bar, extending downward from the bottom edge |

**Summary bar date span logic:**

| Condition | Bar span |
|-----------|----------|
| Parent has own dates AND sub-items | Summary bar spans the parent's own `startDate` to `endDate` |
| Parent has NO dates but sub-items have dates | Summary bar auto-spans from `min(child.startDate)` to `max(child.endDate)` |
| Neither parent nor children have dates | Parent does not appear on timeline |

**Sub-item bars:** Render below the summary bar at normal height (28px spacious, 20px compact). They follow the same `ItemBar` component spec from v1.0 section 5.4, with one addition: a 24px left indent in the header group label area to visually communicate the hierarchy.

**Vertical spacing:**

| Element | Gap |
|---------|-----|
| Summary bar to first sub-item bar | 4px (spacious), 2px (compact) |
| Between sub-item bars | 4px (spacious), 2px (compact) -- same as regular item spacing |
| Summary bar label to summary bar top | 2px (same as regular bar label gap) |

### B2.6 Timeline -- Expand/Collapse

Parent items on the Timeline have an expand/collapse chevron.

**Chevron spec:**

| Property | Value |
|----------|-------|
| Position | In the header group label area, left of the parent item name |
| Icon | Chevron-right (collapsed) or chevron-down (expanded), 12px |
| Color | `--gray-400` |
| Hover color | `--gray-700` |
| Cursor | pointer |
| Hit area | 24px square (centered on the 12px icon) |

**Collapsed state:**

| Property | Value |
|----------|-------|
| Sub-item bars | Hidden |
| Summary bar | Visible (the only representation of the parent) |
| Group height | Shrinks to accommodate only the summary bar track |
| Transition | Height change: 200ms ease. Sub-item bars: opacity 1 to 0 over 100ms, then display none. |

**Expanded state (default):**

Summary bar visible, sub-item bars visible below it.

**Collapse state persistence:** Stored in the view config JSONB as `collapsedParents: string[]` (array of parent item IDs). Persists across page reloads. Shared between all users of the same view.

**`prefers-reduced-motion`:** Height transitions and opacity fades are replaced by instant show/hide.

### B2.7 Table View -- Sub-Item Indentation

Sub-items appear directly below their parent in the Table View, indented to communicate hierarchy.

**Parent row additions:**

| Element | Spec |
|---------|------|
| Expand/collapse chevron | 12px icon, `--gray-400`, left of the name cell content. Rotates 90deg clockwise when expanded (points down). |
| Chevron hit area | 24px square |
| Chevron transition | `transform: rotate()`, 150ms ease |

**Sub-item row indentation:**

| Property | Value |
|----------|-------|
| Name cell left padding | 24px additional (on top of the base cell padding) |
| Visual indent marker | A thin vertical line, 1px, `--gray-200`, running from the parent row to the last child row, positioned 12px from the left edge of the name cell |
| Sub-item row background | `--white` (same as parent) |
| Sub-item row hover | `--gray-50` (same as parent) |

**Row ordering:** Parents and their children are contiguous. Within a parent group, sub-items are sorted by `sortOrder`. When the table is sorted by a column, parent items sort by that column; sub-items stay grouped under their parent and sort among siblings only.

**Collapsed sub-items:** When a parent's chevron is collapsed, sub-items are hidden. The parent row shows a small count indicator:

| Property | Value |
|----------|-------|
| Display | Inline, after the parent name |
| Text | "(3)" or "(N)" |
| Font | `--text-xs`, `--gray-500` |
| Margin-left | `--space-1` (4px) |

**Collapse state:** Uses the same `collapsedParents` array in the table view config.

**Footer update:** The footer item count includes both parents and sub-items:

| Property | Value |
|----------|-------|
| Format | "23 items (5 sub-items)" |
| Sub-item count | In `--gray-400`, parenthetical |

### B2.8 Swimlane View -- Sub-Item Count Badge

Parent items in the Swimlane show a count badge. Sub-items themselves do NOT appear as separate cards.

**Badge spec:**

| Property | Value |
|----------|-------|
| Position | Bottom-right corner of the swimlane card, inside the card padding |
| Background | `--gray-100` |
| Text | "N sub-items" or "1 sub-item" |
| Font | `--text-xs`, weight 500, `--gray-600` |
| Padding | 2px 8px |
| Border-radius | `--radius-full` |
| Cursor | pointer |
| Hover | `--gray-200` background |
| Click | Opens the parent's Item Card, scrolled to the Sub-Items tab |

**Swimlane item filtering:** Items with a non-null `parentId` are excluded from the Swimlane grid entirely. Only top-level items (parent items and standalone items) appear as cards.

### B2.9 Sub-Item Accessibility

- The expand/collapse chevron has `aria-expanded="true/false"` and `aria-label="Expand sub-items for [item name]"` or `aria-label="Collapse sub-items for [item name]"`.
- Sub-item rows in the Item Card tab have `role="listitem"` within a `role="list"` container.
- The drag reorder handles have `aria-label="Reorder [sub-item name]"`. Keyboard reorder is not supported in this sprint (reorder via the three-dot menu or the handle is pointer-only). The sort order can also be adjusted by editing `sortOrder` via the API directly.
- The sub-item inline creation input has `aria-label="New sub-item name"`.
- In the Table View, indented sub-item rows have `aria-level="2"` to communicate hierarchy to screen readers. Parent rows have `aria-level="1"`.
- The swimlane badge has `aria-label="[N] sub-items. Click to view."`.
- On sub-item creation, `aria-live="polite"` announces: "Sub-item created".
- On sub-item deletion, `aria-live="polite"` announces: "Sub-item deleted".

---

## B3. Key Dates (RT-27)

### B3.1 Item Card -- Key Dates Section

Key dates are managed in the Item Card's right panel Fields tab, in a dedicated section below the standard fields.

**Section layout:**

```
.keyDatesSection
  .keyDatesSectionHeader        -> flex row, justify-between
    .keyDatesSectionLabel        -> text-xs, weight 500, gray-500, uppercase, tracking 0.05em
    .keyDateCount               -> text-xs, gray-400 ("3 of 10")
  .keyDatesList
    .keyDateRow (one per key date)
      .keyDateName               -> text-sm, gray-950, click to edit inline
      .keyDateDate               -> text-sm, gray-700, monospace, click to open date picker
      .keyDateRemoveBtn          -> 14px X icon, gray-400, visible on hover
  .addKeyDateBtn                 -> ghost button
```

**Section header:**

| Property | Value |
|----------|-------|
| Label | "KEY DATES" |
| Font | `--text-xs`, weight 500, `--gray-500`, uppercase, letter-spacing 0.05em |
| Count (when dates exist) | "N of 10" in `--text-xs`, `--gray-400` |
| Margin-top | `--space-6` (24px) -- visual separator from standard fields |
| Padding-bottom | `--space-2` (8px) |
| Border-top | 1px solid `--gray-200` (separating from the fields above) |

**Key date row spec:**

| Property | Value |
|----------|-------|
| Height | 36px |
| Padding | `--space-2` (8px) horizontal |
| Display | flex, align-items: center, gap: `--space-3` (12px) |
| Border-bottom | 1px solid `--gray-100` |
| Hover | `--gray-50` background |

**Key date name (inline editable):**

| Property | Value |
|----------|-------|
| Font | `--text-sm`, weight 400, `--gray-950` |
| Click | Switches to inline text input |
| Inline input | Same spec as v1.0 Item Card text field editing (section 7.5), height 28px |
| Placeholder (new) | "Key date name..." in `--gray-500` |
| Max characters | 100 |
| Width | flex: 1, min-width: 0 (fills remaining space) |

**Key date date (inline editable):**

| Property | Value |
|----------|-------|
| Font | `--text-sm`, weight 400, `--gray-700`, font-family: `var(--font-mono)` |
| Format | "MMM DD, YYYY" (e.g., "Mar 15, 2026") |
| Click | Opens a date picker popover (same component as the existing date fields in section 7.5) |
| Width | 120px (fixed, right-aligned) |

**Remove button (X):**

| Property | Value |
|----------|-------|
| Size | 14px |
| Color | `--gray-400` |
| Hover color | `--error-600` |
| Visibility | Hidden by default; visible on row hover |
| Cursor | pointer |
| `aria-label` | "Remove key date [name]" |

**"Add Key Date" button:**

| Property | Value |
|----------|-------|
| Variant | Ghost button (full width) |
| Height | 32px |
| Icon | Plus icon, 14px, `--gray-500` |
| Label | "Add Key Date" |
| Font | `--text-sm`, weight 500, `--gray-700` |
| Margin-top | `--space-2` (8px) |
| Hover | `--gray-100` background |
| Disabled (10 key dates) | `--gray-400` text, `pointer-events: none`, tooltip: "Maximum of 10 key dates per item" |

### B3.2 Add Key Date Flow

1. Click "Add Key Date".
2. A new row appears at the bottom of the list with both fields empty.
3. The name field is an inline text input, immediately focused.
4. After typing a name, press Tab to move to the date field. Or click the date field directly.
5. The date field opens a date picker popover on focus/click.
6. When both name and date are filled, the key date auto-saves (500ms debounce after last change).
7. If only one field is filled on blur, the row persists as a client-side draft (not sent to server). It shows a subtle dashed border to indicate unsaved state.

**Draft row indicator:**

| Property | Value |
|----------|-------|
| Border | 1px dashed `--gray-300` (replaces the solid bottom border) |
| Background | `--gray-50` |
| Status text | "Fill both fields to save" in `--text-xs`, `--gray-400`, below the row |

### B3.3 Key Date States

**Auto-save (500ms debounce):**

| State | Behavior |
|-------|----------|
| Saving | No visible indicator (seamless background save, same pattern as v1.0 inline editing) |
| Save success | No change |
| Save failure | Brief red outline on the row (2px `--error-600` border, 300ms fade), tooltip: "Failed to save key date" |

**Error messages:**

| Condition | Message | Display |
|-----------|---------|---------|
| Empty name on save | "Name is required." | Inline error below name input, `--text-xs`, `--error-600` |
| Max 10 key dates | "Maximum of 10 key dates per item." | Tooltip on disabled "Add Key Date" button |
| Server error | "Failed to save key date." | Red outline on row + tooltip |

**Empty state:**

| Property | Value |
|----------|-------|
| Text | "No key dates. Track important milestones within this item." |
| Font | `--text-sm`, `--gray-500` |
| Alignment | Center |
| Padding | `--space-4` (16px) top and bottom |
| Icon | Diamond/milestone icon, 24px, `--gray-300`, above text |

**Disabled (viewer role):**

| Element | Behavior |
|---------|----------|
| "Add Key Date" button | Disabled state |
| Remove (X) buttons | Hidden |
| Name and date inputs | Read-only (not editable, but text is selectable) |

### B3.4 Timeline View -- Key Date Markers

Key dates render as small diamond markers positioned on the item bar at the x-coordinate corresponding to the key date's date.

**Diamond marker spec:**

| Property | Value |
|----------|-------|
| Shape | Rotated square (45-degree `<rect>`) |
| Size | 8px width and height (diagonal: ~11px) |
| Fill (inside item date range) | `--gray-600` (#3F3F46) |
| Fill (outside item date range) | Transparent (no fill) |
| Stroke (inside range) | None |
| Stroke (outside range) | 1px dashed `--gray-600` |
| Position | Centered on the item bar's vertical midpoint, at the x-position of the key date |
| z-index | Above the item bar fill, below the item bar label |

**SVG implementation:**

```svg
<!-- Inside range marker -->
<rect
  x="{markerX - 4}"
  y="{barCenterY - 4}"
  width="8"
  height="8"
  transform="rotate(45 {markerX} {barCenterY})"
  fill="var(--gray-600)"
/>

<!-- Outside range marker -->
<rect
  x="{markerX - 4}"
  y="{barCenterY - 4}"
  width="8"
  height="8"
  transform="rotate(45 {markerX} {barCenterY})"
  fill="none"
  stroke="var(--gray-600)"
  stroke-width="1"
  stroke-dasharray="2 1"
/>
```

**Outside-range detection:**

```typescript
const isOutsideRange =
  keyDate.date < item.startDate || keyDate.date > item.endDate;
```

**Multiple key dates on same bar:** If two key dates are within 6px of each other (horizontally), offset the second marker vertically by 4px above the bar center to avoid overlapping. If three or more cluster, stack them vertically (alternating 4px above and below center).

### B3.5 Key Date Tooltip

Hovering over a key date marker shows a tooltip.

**Tooltip spec:**

| Property | Value |
|----------|-------|
| Position | 8px above the diamond marker, horizontally centered on the marker |
| Background | `--gray-900` |
| Color | `--white` |
| Font | `--text-xs`, weight 500 |
| Padding | `--space-1` (4px) vertical, `--space-2` (8px) horizontal |
| Border-radius | `--radius-sm` (4px) |
| Shadow | `--shadow-md` |
| Content | "[Key date name]: [formatted date]" (e.g., "Design Complete: Mar 15, 2026") |
| Arrow | 4px downward-pointing triangle, `--gray-900`, centered below |
| Delay | 200ms (faster than item bar tooltip's 300ms, since the marker is small and the user is being precise) |
| Animation | opacity 0 to 1, 100ms ease |

The tooltip does NOT conflict with the item bar's main tooltip. When the user hovers the diamond marker specifically, the key date tooltip shows. When hovering the bar body (away from markers), the standard item bar tooltip shows.

**Hit area for marker hover:** 16px square (8px expansion around the 8px diamond), to make the small target easier to hit.

### B3.6 Table View -- Key Dates Column

A new optional column "Key Dates" can be added to the Table View.

**Column header:** "KEY DATES" (uppercase, per v1.0 spec section 4.2).

**Cell content logic:**

1. Find the next upcoming key date (date >= today). If found, display it.
2. If all key dates are in the past, display the most recent one.
3. If no key dates exist, display "--" in `--gray-400`.

**Cell display spec:**

| Property | Value |
|----------|-------|
| Primary text | "[Name]: [Date]" (e.g., "Design Complete: Mar 15") |
| Font | `--text-xs`, weight 400, `--gray-700` |
| Date format | "MMM DD" (short, no year -- to save space. Full date in tooltip on hover.) |
| Truncation | Truncate name at cell width, keep date visible |

**Multiple key dates indicator:**

| Property | Value |
|----------|-------|
| Text | "+N more" (e.g., "+2 more") |
| Font | `--text-xs`, weight 500, `--gray-500` |
| Margin-left | `--space-1` (4px) |
| Cursor | pointer |
| Click | Opens the item's Item Card, right panel scrolled to Key Dates section |
| Hover | Underline |

**Column width:** 160px default, resizable.

### B3.7 Key Date Accessibility

- Diamond markers on the Timeline have `role="img"` and `aria-label="Key date: [name], [full date]"` (e.g., "Key date: Design Complete, March 15 2026").
- Outside-range markers additionally include: "(outside item date range)".
- The Key Dates section in the Item Card uses `role="list"` for the rows and `role="listitem"` for each key date.
- The "Add Key Date" button has `aria-label="Add key date"`.
- Inline name inputs have `aria-label="Key date name"`.
- Date inputs use the native `<input type="date">` for screen reader compatibility and have `aria-label="Key date: [name] date"`.
- On key date creation, `aria-live="polite"` announces: "Key date added: [name]".
- On key date deletion, `aria-live="polite"` announces: "Key date removed: [name]".

---

## B4. Animation and Transition Summary

All new transitions in this addendum, consolidated for Alice and Nina's reference:

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Add Link popover open | opacity + translateY(-4px to 0) | 100ms | ease |
| Add Link popover close | opacity 1 to 0 | 100ms | ease |
| Link creation spinner | rotate(0 to 360deg) | 800ms | linear, infinite |
| Link row appear (new link added) | opacity 0 to 1 + translateY(4px to 0) | 150ms | ease-out |
| Link row remove | opacity 1 to 0 + height collapse | 150ms | ease |
| Sub-item inline creation row appear | opacity 0 to 1 | 100ms | ease |
| Sub-item creation failure row fade | opacity 1 to 0 | 150ms | ease |
| Sub-item drag lift | box-shadow + scale(1.02) | 150ms | ease |
| Sub-item drag settle | transform to new position | 150ms | ease |
| Sub-item drop target line | opacity 0 to 1 | 50ms | ease |
| Timeline summary bar collapse | height shrink + sub-item opacity 1 to 0 | 200ms | ease |
| Timeline summary bar expand | height grow + sub-item opacity 0 to 1 | 200ms | ease |
| Table expand/collapse chevron rotation | transform: rotate(0 to 90deg) | 150ms | ease |
| Dependency arrow opacity (hover/unhover) | opacity transition | 150ms | ease |
| Dependency arrow stroke-width (hover) | stroke-width 1.5px to 2px | 150ms | ease |
| Key date tooltip appear | opacity 0 to 1 | 100ms | ease |
| Key date save failure red outline | border-color flash + fade out | 300ms | ease-out |
| Three-dot dropdown appear | opacity + translateY(-4px to 0) | 100ms | ease |

**`prefers-reduced-motion` overrides:**

All animations above are disabled except:
- Opacity transitions (these are not motion, per WCAG guidance)
- Instant show/hide replaces slide/scale animations
- Sub-item drag-and-drop uses instant repositioning (no lift/settle animation)
- Timeline expand/collapse is instant (no height transition)
- Dependency arrow opacity transitions still apply (not motion)

---

## B5. Responsive Behavior

These features follow the responsive breakpoints established in the v1.0 design spec (section 13).

### Desktop (1280px+)

Full experience as described in all sections above.

### Large Tablet / Small Desktop (1024px - 1279px)

| Feature | Adjustment |
|---------|------------|
| Item Card (Linked Items, Sub-Items tabs) | No change -- Item Card width reduces to 560px per v1.0 spec, content reflows within |
| Timeline dependency arrows | No change -- arrows render identically |
| Timeline summary bars | No change |
| Key date markers | No change |
| Add Link popover | Width reduces from 360px to 320px |

### Tablet (768px - 1023px)

| Feature | Adjustment |
|---------|------------|
| Item Card | Full-screen overlay (per v1.0 spec). All tabs and sections remain functional. |
| Timeline dependency arrows | Render normally. Timeline is read-only at this breakpoint per v1.0 spec -- arrows are read-only already. |
| Add Link popover | Width: 100% of Item Card width minus padding |

### Mobile (< 768px)

| Feature | Adjustment |
|---------|------------|
| Item Card | Full-screen overlay. All tabs functional. Sub-item drag reorder disabled (touch reorder deferred). Three-dot menu is the primary interaction for reordering. |
| Timeline | Simplified read-only view per v1.0 spec. Summary bars render. Dependency arrows are hidden (too detailed for the mini-timeline). Key date markers render but without tooltip (tap opens Item Card instead). |
| Swimlane | Sub-item badge still appears on cards. |
| Table | Sub-item indentation still renders. Expand/collapse still works. Links and Key Dates columns can be hidden to save space (hidden by default on mobile). |

---

## B6. Keyboard Shortcut Additions

No new keyboard shortcuts are introduced in Sprint B. All new interactions use existing patterns (Enter to confirm, Escape to cancel, Tab to move between fields).

The existing shortcuts from v1.0 and Sprint A continue to work. In particular:
- Arrow keys still navigate table cells (sub-item rows are included in the navigation grid).
- Escape still closes popovers, panels, and dropdowns.
- Cmd/Ctrl+K still opens global search (which can find sub-items by name).

---

## B7. Component Architecture Notes

Structural notes for Alice -- where new code should live.

### RT-24 (Links)

- **New component:** `client/src/components/item-card/LinkedItemsTab.tsx` -- link list grouped by type, add link popover.
- **New component:** `client/src/components/item-card/AddLinkPopover.tsx` -- extracted popover for item search and link creation. Could be inline in LinkedItemsTab if the component stays under 200 lines.
- **New component:** `client/src/components/timeline/DependencyLayer.tsx` -- SVG `<g>` element rendering all dependency arrows. Sits in the TimelineCanvas render tree between GridLines and HeaderGroups.
- **Modified component:** `client/src/components/timeline/TimelineCanvas.tsx` -- add DependencyLayer to render tree. Pass `links`, `itemPositions`, `selectedItemId`, `hoveredItemId` as props.
- **Modified component:** `client/src/components/timeline/ItemBar.tsx` -- add `onMouseEnter`/`onMouseLeave` callbacks to update `hoveredItemId` in the view store for arrow highlighting.
- **Modified component:** `client/src/components/table/TableView.tsx` -- add Links column rendering using the reserved field ID `__links__`.
- **Modified store:** `client/src/stores/viewStore.ts` -- add `hoveredItemId: string | null` for dependency arrow highlighting.

### RT-26 (Sub-Items)

- **New component:** `client/src/components/item-card/SubItemsTab.tsx` -- sub-items list with drag reorder, inline creation, three-dot menus.
- **New component:** `client/src/components/timeline/SummaryBar.tsx` -- thin bar rendering for parent items.
- **Modified component:** `client/src/components/timeline/TimelineCanvas.tsx` -- integrate SummaryBar rendering. Modify layout computation to handle parent/child hierarchy. Add collapse state.
- **Modified library:** `client/src/lib/timelineLayout.ts` -- extend `prepareTimelineItems` and `computeLayout` for parent/child grouping and summary bar track computation.
- **Modified component:** `client/src/components/table/TableView.tsx` -- add indentation logic, expand/collapse chevrons, sub-item display ordering. Update footer count.
- **Modified component:** `client/src/components/table/TableRow.tsx` -- accept `indentLevel` prop for sub-item rendering.
- **Modified component:** `client/src/components/swimlane/SwimlaneView.tsx` -- filter out sub-items from grid. Add count badge to parent cards.
- **Modified component:** `client/src/components/item-card/ItemCard.tsx` -- update delete confirmation for parent items with sub-items.

### RT-27 (Key Dates)

- **New component:** `client/src/components/timeline/KeyDateMarkers.tsx` -- diamond markers on item bars.
- **New section in:** `client/src/components/item-card/ItemCard.tsx` (Fields tab) -- Key Dates section at the bottom of the Fields tab.
- **Modified component:** `client/src/components/timeline/TimelineCanvas.tsx` -- render KeyDateMarkers for each item bar.
- **Modified component:** `client/src/components/timeline/ItemBar.tsx` -- pass key dates data through. KeyDateMarkers renders as children within the ItemBar `<g>` element, or as a sibling layer.
- **Modified component:** `client/src/components/table/TableView.tsx` -- add Key Dates column rendering using reserved field ID `__key_dates__`.

### Shared

- **Modified hooks:** `client/src/hooks/useItems.ts` -- update response type to `ItemsResponse` (items + links). Add cache update handlers for new WebSocket events (`link-created`, `link-deleted`, `key-date-created`, `key-date-updated`, `key-date-deleted`).

---

*Design addendum written by Robert (Product Designer). Alice: implement from this spec in conjunction with the v1.0 design spec and Sprint A addendum. Nina: review dependency arrow rendering feel, summary bar collapse animation, and sub-item drag reorder during your pass. Reference the token values and CSS properties directly. Ask me if any detail is ambiguous.*
