# Roadmap Tool v1.1 Sprint A -- Design Addendum

**Author:** Robert (Product Designer)
**Date:** February 12, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Sprint:** v1.1 Sprint A (Stakeholder & Daily Use)
**Dependencies:** `docs/roadmap-tool-design-spec.md` (v1.0 design spec), `docs/roadmap-tool-v1.1-requirements.md` (Thomas)

---

## Overview

This is an addendum to the v1.0 design spec, not a replacement. It covers three features: Export to PNG (RT-19), Drag Items on Timeline (RT-25), and Presentation Mode (RT-30). All three are frontend-only. The existing design system tokens, component patterns, and interaction conventions carry forward unchanged.

**Reference:** The v1.0 design spec defines the full design system (section 1), application shell (section 2), all three views, the Item Card, Format Panel, and all interaction state tables. This addendum references those sections by number and only specifies new UI elements.

---

## A1. Export to PNG (RT-19)

### A1.1 Export Button Placement

The Export button lives in the Top Bar right section (`TopBar .right`), between the Share button and the Format button. It replaces the current placeholder Export button noted in the v1.0 spec (section 2.3).

**Button spec:**

| Property | Value |
|----------|-------|
| Variant | Secondary (per v1.0 spec section 1.6) |
| Height | 32px |
| Icon | Download icon (arrow pointing down into a tray), 16px, `--gray-700` |
| Label | "Export" |
| Font | `--text-sm`, weight 500 |
| Padding | `--space-2` vertical, `--space-3` horizontal |
| Border-radius | `--radius-md` |
| Gap between icon and label | `--space-2` (8px) |

### A1.2 Export Dropdown

Clicking the Export button opens a dropdown menu below and right-aligned to the button.

**Dropdown spec:**

| Property | Value |
|----------|-------|
| Width | 200px |
| Background | `--white` |
| Border | 1px solid `--gray-200` |
| Border-radius | `--radius-lg` |
| Shadow | `--shadow-md` |
| Padding | `--space-1` (4px) vertical |
| Animation | opacity 0 to 1 + translateY(-4px) to 0, 100ms ease (per v1.0 spec section 17) |

**Single option (v1.1):**

| Property | Value |
|----------|-------|
| Height | 36px |
| Padding | `--space-2` (8px) left, `--space-3` (12px) right |
| Icon | Image icon (landscape frame), 16px, `--gray-500`, left of label |
| Label | "Download as PNG" |
| Font | `--text-sm`, weight 400, `--gray-900` |
| Hover | `--gray-100` background |
| Border-radius | `--radius-md` (inside the dropdown) |
| Gap between icon and label | `--space-2` |

**Disabled state (empty view):** When the current view has no items, the option text becomes `--gray-400`, the icon becomes `--gray-300`, and `pointer-events: none`. A tooltip on hover (on the option row) reads: "Add items to export".

### A1.3 Export Loading State

When the user clicks "Download as PNG", the dropdown stays open and the option transitions to a loading state.

**Loading option spec:**

| Property | Value |
|----------|-------|
| Icon | Replaced by a 16px spinner (circular, `--gray-500` stroke, 1.5px width, rotating 360deg over 800ms linear infinite) |
| Label | "Generating..." |
| Font color | `--gray-500` |
| Pointer-events | none (disabled during export) |

**Extended loading (> 5 seconds):**

| Property | Value |
|----------|-------|
| Label | "Still generating..." |
| Sub-label | "(large roadmap)" in `--text-xs`, `--gray-400`, below the main label |

### A1.4 Export Success

On success:
1. The file downloads automatically via the browser download mechanism.
2. The dropdown closes.
3. Focus returns to the Export button.
4. No toast or other feedback -- the download itself is the confirmation.

### A1.5 Export Error

On failure:
1. The dropdown closes.
2. A toast notification appears (per v1.0 spec section 10.3): "Export failed. Try again."
3. Toast spec: bottom-right corner, `--gray-900` background, white text, `--radius-lg`, `--shadow-lg`. Appears with translateY(16px to 0) + opacity, 200ms ease. Auto-dismisses after 5 seconds.
4. The Export button re-enables for retry.

### A1.6 Export Content Rules

What the PNG captures:

| Included | Excluded |
|----------|----------|
| View title (roadmap name + view name, rendered as a 40px header at the top of the export) | Top Bar (toolbar, breadcrumbs, buttons) |
| Date headers / Time Axis (Timeline) | Sidebar |
| Header groups with labels (Timeline) | Format Panel |
| All item bars within current date range (Timeline) | Item Card |
| Today marker (Timeline) | Time Slider |
| Legend (if visible in Format Panel settings) | Scrollbars |
| Column headers + row/column headers (Swimlane, Table) | Any hover tooltips or popovers |
| Milestone markers and labels (Timeline) | Selection highlights / active cell borders |

**Export header:** The PNG includes a title bar at the top:
- Height: 40px
- Background: `--white`
- Text: Roadmap name in `--text-lg`, weight 600, `--gray-950`. View name in `--text-sm`, weight 400, `--gray-500`, separated by a ` -- ` dash.
- Padding: `--space-4` left
- Border-bottom: 1px solid `--gray-200`

**Legend rendering in export:** When the "Show Legend" toggle is on in the Format Panel, the legend renders in the bottom-right of the export as a small panel:
- Background: `--white`
- Border: 1px solid `--gray-200`
- Border-radius: `--radius-lg`
- Padding: `--space-3`
- Each row: 10px color circle + field value name in `--text-xs`, `--gray-700`
- Row gap: `--space-1`
- Max width: 180px

### A1.7 Accessibility

- The Export button has `aria-haspopup="true"` and `aria-expanded` toggling with dropdown state.
- The dropdown has `role="menu"`, the option has `role="menuitem"`.
- Focus traps within the dropdown when open. Escape closes the dropdown and returns focus to the Export button.
- The loading state has `aria-live="polite"` and announces "Generating export" to screen readers.
- On success, `aria-live="polite"` announces "Export downloaded".
- On error, `aria-live="assertive"` announces the error message.

---

## A2. Drag Items on Timeline (RT-25)

This is the largest feature in the sprint. It transforms the Timeline from a read-only visualization into a direct-manipulation canvas.

### A2.1 Design Goals

1. **The bar is the handle.** No separate drag handles for the move gesture -- the entire bar body is draggable. This keeps the surface clean and the interaction obvious.
2. **Resize lives at the edges.** Resize handles appear on hover at the left and right edges of the bar. They are visually subtle until the user reaches for them.
3. **Visual feedback is continuous.** The user always knows where the item will land: ghost preview, snap lines, date tooltip, stream highlight.
4. **60fps is non-negotiable.** All drag visuals update via SVG transforms, not React re-renders. The spec describes visual states; Alice implements with `transform: translate()` on the dragged `<g>` element.

### A2.2 Cursor States

The cursor communicates what action is available before the user clicks.

| Zone | Cursor | When |
|------|--------|------|
| Bar body (not near edges) | `grab` | Hovering over any item bar |
| Bar body during drag | `grabbing` | Pointer is down, drag in progress |
| Left edge (within 6px of bar start) | `col-resize` | Hovering over left resize handle zone |
| Right edge (within 6px of bar end) | `col-resize` | Hovering over right resize handle zone |
| Left/right edge during resize | `col-resize` | Resize in progress |
| Bar body (viewer role) | `default` | User lacks edit permission |
| Bar body (edit-locked) | `not-allowed` | Item is locked by another user |

### A2.3 Resize Handles

Resize handles are subtle visual affordances at the bar edges. They appear on hover and disappear when the mouse leaves the bar.

**Handle spec:**

| Property | Value |
|----------|-------|
| Width | 4px |
| Height | Equal to bar height (28px spacious, 20px compact) |
| Position | Flush with the left/right edge of the bar, inside the bar bounds |
| Fill | White at 50% opacity (`rgba(255,255,255,0.5)`) |
| Border-radius | 2px (slight rounding) |
| Visibility | Hidden by default; visible on bar hover |
| Transition | opacity 0 to 1, 100ms ease |

**Why inside the bar, not outside:** Handles that extend beyond the bar boundary create visual noise between tightly-packed items and can overlap adjacent bars. Keeping them inside the bar maintains the clean geometry of the timeline while still providing a clear affordance. The `col-resize` cursor reinforces the interaction.

**Handle hit area:** The actual pointer hit zone for resize is 6px wide (wider than the visible handle), extending 3px outside and 3px inside the bar edge. This gives a comfortable target without requiring pixel precision.

### A2.4 Ghost Preview (During Drag)

When a drag starts, two visual elements appear: the ghost bar (showing destination) and the origin bar (showing source).

**Origin bar (where the item was):**

| Property | Value |
|----------|-------|
| Opacity | 0.2 |
| Fill | Same color as the bar |
| No stroke, no label | Just a faded silhouette |
| Position | Fixed at the original location for the entire drag |

**Ghost bar (where the item will land):**

| Property | Value |
|----------|-------|
| Opacity | 0.4 |
| Fill | Same color as the bar |
| Stroke | 1px dashed, same color at 60% opacity |
| Border-radius | Same as original bar (rx/ry = 4px) |
| Label | Same label text as original, at 0.6 opacity |
| Position | Follows the pointer with snap applied |
| Transition | None during drag (updates per-frame via `requestAnimationFrame`) |

**Ghost positioning logic:** The ghost bar tracks the pointer position, but its coordinates are snapped to the active snap grid (see A2.6). The ghost's x position determines the start date; its width stays constant during a move drag (duration preserved). During a resize drag, the ghost width changes as one edge follows the pointer.

### A2.5 Date Tooltip (During Drag)

A floating tooltip near the cursor shows the dates that the item would have if dropped at the current position.

**Tooltip spec:**

| Property | Value |
|----------|-------|
| Position | 8px above the ghost bar's top edge, horizontally centered on the bar |
| Background | `--gray-900` |
| Color | `--white` |
| Font | `--text-xs`, weight 500 |
| Padding | `--space-1` (4px) vertical, `--space-2` (8px) horizontal |
| Border-radius | `--radius-sm` (4px) |
| Shadow | `--shadow-md` |
| Content (move) | "Jan 15 -- Mar 30, 2026" (start date -- end date) |
| Content (resize left) | "Jan 15" (just the changing date) |
| Content (resize right) | "Mar 30" (just the changing date) |
| Date format | "MMM D, YYYY" (e.g., "Jan 15, 2026") |
| Arrow | 4px downward-pointing triangle centered below the tooltip, same background color |

**Update cadence:** The tooltip text updates only when the snapped date changes, not on every pixel of pointer movement. This prevents jittery text.

### A2.6 Snap Behavior

Snap lines appear at time unit boundaries during drag to show where dates will land.

**Snap grid by zoom level:**

| Zoom Level | Snap Unit | Visual |
|------------|-----------|--------|
| Weeks | Day | Line at each day boundary |
| Months | Day | Line at each day boundary |
| Quarters | Week | Line at each week boundary |
| Halves | Week | Line at each week boundary |
| Years | Month | Line at each month boundary |

**Snap line spec (visible during drag only):**

| Property | Value |
|----------|-------|
| Stroke | `--gray-200` |
| Stroke-width | 1px |
| Stroke-dasharray | none (solid) |
| Extends | From Time Axis bottom to the full height of the header group the ghost bar is in |
| Visibility | Only the 3-5 snap lines nearest the ghost bar's edges are drawn (not the full grid) |
| Transition | Appear instantly on drag start, disappear instantly on drag end |

**Free positioning (Alt/Option held):** When Alt/Option is held during drag, snap lines disappear and the ghost bar follows the exact pointer position. The date tooltip shows the exact date (to the day regardless of zoom). A small indicator appears next to the cursor: "Free" in `--text-xs`, `--accent-600`, 4px left of the date tooltip.

### A2.7 Stream Highlight (Vertical Drag)

When the user drags a bar vertically, the target header group highlights to show where the item will be re-categorized.

**Highlight spec:**

| Property | Value |
|----------|-------|
| Background | `--accent-50` (the entire header group row area) |
| Border | 1px solid `--accent-100` at the top and bottom of the group |
| Transition | Background fades in over 100ms ease |
| Appears when | Ghost bar's vertical center enters a different header group than the origin |
| Disappears when | Ghost bar returns to the original group |

**Group detection:** The target group is determined by which header group's Y range the vertical center of the ghost bar falls within. The header group label on the left side gets a subtle emphasis: `--gray-950` text color (from `--gray-700`) and weight 600 (from 500) while highlighted.

### A2.8 Shift+Drag Constraint

Holding Shift during drag restricts movement to vertical only. The ghost bar's X position stays locked to the original X. This is useful for changing an item's stream without accidentally shifting its dates.

**Visual indicator:** When Shift is held during drag, the date tooltip hides (dates are not changing). Instead, a small label appears 8px above the ghost bar: the target group name in `--text-xs`, weight 500, `--accent-600`.

### A2.9 Drag-in-Progress Visual State

The overall timeline appearance changes subtly during drag to reduce visual noise and focus attention on the action.

| Element | Change During Drag |
|---------|--------------------|
| All other item bars (not being dragged) | Opacity reduces to 0.6 |
| Grid lines | No change |
| Today marker | No change |
| Milestone markers | Opacity reduces to 0.6 |
| Time Axis | No change |
| Header group labels | No change (except the target group highlight per A2.7) |

**Transition:** Other bars fade to 0.6 opacity over 150ms ease on drag start, fade back to 1.0 over 150ms ease on drag end.

### A2.10 Drop Success (Optimistic)

On drop:
1. The ghost bar disappears.
2. The origin bar (at 0.2 opacity) animates to the new position over 200ms ease-out, fading from 0.2 to 1.0 opacity.
3. All other bars return to 1.0 opacity over 150ms.
4. The date tooltip disappears.
5. Snap lines disappear.
6. No toast or explicit success feedback -- the bar being in its new position is the confirmation.
7. The PATCH API call fires in the background. The bar is already in position (optimistic).

### A2.11 Drop Failure (Revert)

If the server rejects the update:
1. The bar animates back from the new position to the original position over 300ms ease-out.
2. During the revert animation, the bar has a brief red tint: `--error-600` at 15% opacity overlay, fading out as it reaches the original position.
3. A toast appears: "Failed to move item. Try again." (same toast spec as v1.0 section 14.8).
4. The item's dates and field values revert to pre-drag state.

### A2.12 Undo (Cmd/Ctrl+Z)

After a successful drag-and-drop, pressing Cmd/Ctrl+Z reverts the item to its pre-drag state.

**Undo animation:** Same as drop success animation, but in reverse. The bar animates from its current (post-drag) position to the original (pre-drag) position over 200ms ease-out.

**Undo availability:** Only one level of undo is available. After undo, pressing Cmd/Ctrl+Z again does nothing. A new drag operation overwrites the undo state.

**No visual indicator for undo availability.** The user discovers undo via keyboard shortcut. No undo button in the UI -- this keeps the toolbar clean.

### A2.13 Disabled States

**Viewer role:** No resize handles appear on hover. Cursor stays `default` over bars (not `grab`). No pointer event handlers for drag. The bar's hover state (outline + tooltip) still works -- viewers can still inspect items.

**Edit-locked item:** The existing lock indicator from v1.0 spec (section 11.3) appears on the bar. On hover, cursor is `not-allowed`. No drag handlers. Tooltip includes the lock message: "Being edited by Sarah".

**Item without dates:** Not applicable -- items without dates do not appear on the Timeline.

### A2.14 Performance Notes for Alice

These are implementation constraints, not visual specs. Included here because they affect the perceived quality of the interaction.

1. **During drag, only update the ghost bar's `transform` attribute.** Do not re-render the full SVG or recalculate layout. The ghost bar is a single `<g>` element with `transform: translate(dx, dy)`.
2. **Use `requestAnimationFrame` for pointer move handling.** Throttle to one update per frame.
3. **Snap calculation is a pure function.** Given a pixel X and the current zoom level, return the snapped pixel X. No state involved.
4. **Date tooltip text only updates when the snapped date changes.** Compare the new date string to the previous one before updating React state.
5. **Batch the opacity reduction of other bars.** Apply a single CSS class to the parent `<g>` that reduces child opacity, not individual style changes on each bar.

### A2.15 Accessibility

- Drag operations are pointer-only (no keyboard equivalent for free-form drag). This is acceptable because keyboard users can still edit dates via the Item Card (click bar, edit start/end date fields). The Item Card path is always available.
- The `aria-label` on each bar (from v1.0 spec section 16.3) does not change during drag -- it reflects the committed state only.
- After a drag completes and the server confirms, an `aria-live="polite"` region announces: "Moved [item name] to [new start date] -- [new end date]" (or "Moved [item name] to [new group name]" for vertical moves).
- After undo: announces "Undone: [item name] returned to original position".
- `prefers-reduced-motion`: When the user prefers reduced motion, the ghost bar snaps to position instantly (no per-frame animation). The drop animation (200ms ease-out) is replaced by an instant position change. The opacity fade on other bars still applies (opacity transitions are not motion).

---

## A3. Presentation Mode (RT-30)

### A3.1 Design Goals

1. **Disappearing chrome.** Everything that is not the roadmap content itself should vanish. The view fills the screen.
2. **Subtle controls on demand.** A minimal overlay provides exit and view switching, but it recedes when the user is not interacting.
3. **Preserve the reading experience.** Tooltips still work on hover. The legend stays visible if it was on. Colors, formatting, and filters are exactly what the user saw before entering presentation mode.

### A3.2 Entering Presentation Mode

**Present button in the Top Bar:**

| Property | Value |
|----------|-------|
| Position | Top Bar right section, after the Export button, before the Format button |
| Variant | Ghost button (per v1.0 spec section 1.6) |
| Height | 32px |
| Icon | Expand icon (four outward-pointing arrows from center), 16px, `--gray-700` |
| Label | None (icon only) |
| Tooltip | "Present" (appears after 300ms hover) |
| Border-radius | `--radius-md` |
| Hover | `--gray-100` background |
| Active | `--gray-200` background |
| Disabled | When view has no items: opacity 0.5, `pointer-events: none`, tooltip "Add items to present" |

**Transition into presentation mode:**

1. User clicks the Present button.
2. The browser enters fullscreen via the Fullscreen API (`document.documentElement.requestFullscreen()`).
3. The following elements are hidden (not removed from the DOM -- hidden via CSS `display: none` or a wrapper with `visibility: hidden`):
   - Sidebar
   - Top Bar (toolbar, breadcrumbs, all buttons)
   - Format Panel (if open)
   - Item Card (if open, close it first)
4. The current view content expands to fill the entire viewport.
5. The presentation overlay fades in over 200ms ease.

**Fullscreen API fallback:** If `requestFullscreen()` fails (some embedded contexts block it), fall back to a maximized in-page mode:
- Sidebar: `display: none`
- Top Bar: `display: none`
- View content: takes full viewport with `position: fixed; inset: 0; z-index: 50`
- A toast appears: "Fullscreen not available. Showing maximized view." (auto-dismisses after 3 seconds)

### A3.3 Presentation Overlay

A minimal overlay provides context and controls. It sits in the bottom-right corner and auto-fades when idle.

**Overlay container spec:**

| Property | Value |
|----------|-------|
| Position | Fixed, bottom 24px (`--space-6`), right 24px (`--space-6`) |
| Background | `--white` at 90% opacity (`rgba(255,255,255,0.9)`) with `backdrop-filter: blur(8px)` |
| Border | 1px solid `--gray-200` |
| Border-radius | `--radius-lg` |
| Shadow | `--shadow-md` |
| Padding | `--space-3` (12px) horizontal, `--space-2` (8px) vertical |
| z-index | 60 (above the view content) |

**Overlay content (single row, flex):**

| Element | Spec |
|---------|------|
| Roadmap name | `--text-sm`, weight 500, `--gray-950`. Truncate at 200px with ellipsis. |
| Separator | ` / ` in `--gray-400` |
| View name | `--text-sm`, weight 400, `--gray-500`. Truncate at 150px with ellipsis. |
| Exit button | "Exit" label, `--text-sm`, weight 500, `--gray-700`. Padding `--space-1` `--space-2`. Border-radius `--radius-sm`. Hover: `--gray-100` background. Margin-left: `--space-3`. |

**Auto-fade behavior:**
- The overlay is fully visible for 3 seconds after entering presentation mode or after any mouse movement.
- After 3 seconds of no mouse movement, the overlay fades to 0 opacity over 500ms ease.
- On any mouse movement, the overlay fades back to full opacity over 200ms ease.
- The overlay stays visible while the mouse is hovering directly over it (regardless of idle timer).

### A3.4 View Switcher (Hover-Activated)

A view switcher appears at the top center of the screen on mouse hover, letting the user switch between saved views without leaving presentation mode.

**Trigger zone:**
- Invisible hit area: full viewport width, 60px tall, top of screen.
- When the mouse enters this zone, the view switcher slides down.

**View switcher spec:**

| Property | Value |
|----------|-------|
| Position | Fixed, top 12px, horizontally centered |
| Background | `--white` at 90% opacity with `backdrop-filter: blur(8px)` |
| Border | 1px solid `--gray-200` |
| Border-radius | `--radius-lg` |
| Shadow | `--shadow-md` |
| Padding | `--space-1` (4px) |
| Layout | Flex row, gap `--space-1` |
| Animation (enter) | translateY(-20px) to 0 + opacity 0 to 1, 150ms ease-out |
| Animation (exit) | opacity 1 to 0 + translateY(0) to -12px, 100ms ease-in. Triggered 500ms after mouse leaves the trigger zone. |

**View buttons (one per saved view):**

| Property | Value |
|----------|-------|
| Height | 32px |
| Padding | `--space-2` (8px) horizontal |
| Font | `--text-sm`, weight 400, `--gray-700` |
| Border-radius | `--radius-md` |
| Icon | View type icon (grid for table, horizontal-lines for timeline, layout-grid for swimlane), 14px, left of label |
| Gap | `--space-1` between icon and label |
| Active view | `--accent-50` background, `--accent-600` text, weight 500 |
| Hover (non-active) | `--gray-100` background |
| Click | Switches to that view. The view content crossfades (200ms opacity transition, per v1.0 spec section 17). |

### A3.5 Interaction Restrictions in Presentation Mode

| Interaction | Behavior |
|-------------|----------|
| Click on item bar (Timeline) | No action. Item Card does not open. |
| Hover on item bar (Timeline) | Tooltip still appears (per v1.0 spec section 5.5) |
| Click on swimlane card | No action. Item Card does not open. |
| Hover on swimlane card | Hover shadow still applies |
| Click on table row | No action. No cell editing. |
| Horizontal scroll/pan (Timeline) | Still works. Trackpad gestures and shift+scroll pan the view. |
| Keyboard arrow pan (Timeline) | Still works. Left/Right arrow keys pan the timeline. |
| Cmd/Ctrl+K (global search) | Disabled in presentation mode |
| Drag items (Timeline) | Disabled in presentation mode. Cursor stays `default`, not `grab`. |

### A3.6 Exiting Presentation Mode

Three exit paths:

1. **Escape key:** Exits fullscreen and returns to normal editing view.
2. **Exit button in overlay:** Same effect as Escape.
3. **Browser exits fullscreen independently:** Listen for the `fullscreenchange` event. If `document.fullscreenElement` becomes null, exit presentation mode.

**Transition out:**
1. Browser exits fullscreen (or the fixed overlay is removed in fallback mode).
2. All hidden chrome (sidebar, top bar) reappears with no animation (instant).
3. The view content returns to its normal dimensions within the layout.
4. Focus returns to the Present button in the Top Bar.

### A3.7 View Content in Presentation Mode

The view renders identically to normal mode with these adjustments:

**Timeline View:**
- The TimelineToolbar (time scale selector, layout toggle) is hidden. The current settings are preserved.
- The Timeline content (SVG) fills the full viewport width and height.
- The Time Slider at the bottom is hidden. Panning is via scroll gestures and arrow keys.
- Header groups are still visible on the left.

**Swimlane View:**
- The view content fills the full viewport.
- Row and column headers remain visible.
- No editing affordances (no `+` icon on empty cells).

**Table View:**
- Column headers remain visible (sticky top).
- No checkbox column.
- No "Add item" row at the bottom.
- No inline editing.
- The table footer remains visible (item count).

### A3.8 Responsive Behavior

Presentation mode is desktop-only. The Present button is hidden at viewport widths below 1024px (tablet and mobile). At those sizes, the view already has a "best on desktop" message or simplified layout that is not suitable for presentation.

```css
@media (max-width: 1023px) {
  .presentBtn { display: none; }
}
```

### A3.9 Accessibility

- The Present button has `aria-label="Enter presentation mode"`.
- Entering presentation mode announces via `aria-live="polite"`: "Presentation mode. Press Escape to exit."
- The overlay Exit button has `aria-label="Exit presentation mode"`.
- Escape key always exits (this is standard for the Fullscreen API and does not need custom handling beyond the `fullscreenchange` listener).
- The view switcher buttons are keyboard-accessible (Tab navigates between views when the switcher is visible).
- `prefers-reduced-motion`: The overlay auto-fade transitions are disabled (overlay stays at full opacity always). The view switcher slide animation is replaced by an instant appear/disappear.

---

## A4. Keyboard Shortcut Additions

New shortcuts added in this sprint (extending v1.0 spec section 15):

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl + Z` | Undo last drag operation | Timeline View, after a drag-and-drop |
| `Escape` | Exit presentation mode | Presentation mode |
| `Shift` (held during drag) | Constrain drag to vertical only | Timeline View, during drag |
| `Alt/Option` (held during drag) | Disable snap (free positioning) | Timeline View, during drag |

---

## A5. Animation & Transition Summary

All new transitions in this addendum, consolidated for Alice and Nina's reference:

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Export dropdown open | opacity + translateY(-4px to 0) | 100ms | ease |
| Export spinner rotation | rotate(0 to 360deg) | 800ms | linear, infinite |
| Drag start: other bars fade | opacity 1.0 to 0.6 | 150ms | ease |
| Drag end: other bars return | opacity 0.6 to 1.0 | 150ms | ease |
| Resize handles appear | opacity 0 to 1 | 100ms | ease |
| Drop success: bar moves to new position | translate + opacity 0.2 to 1.0 | 200ms | ease-out |
| Drop failure: bar reverts | translate back + red tint fade | 300ms | ease-out |
| Undo: bar reverts | translate back | 200ms | ease-out |
| Stream highlight appear | background-color fade | 100ms | ease |
| Presentation overlay auto-fade | opacity 1 to 0 | 500ms | ease |
| Presentation overlay reappear | opacity 0 to 1 | 200ms | ease |
| View switcher enter | translateY(-20px to 0) + opacity | 150ms | ease-out |
| View switcher exit | opacity + translateY(0 to -12px) | 100ms | ease-in |
| View switch in presentation | opacity crossfade | 200ms | ease |

**`prefers-reduced-motion` overrides:** All animations above except opacity transitions are disabled. Drag feedback uses instant position updates. The presentation overlay stays at full opacity (no auto-fade).

---

## A6. Component Architecture Notes

These are structural notes for Alice -- where the new code should live in the existing component tree.

### Export (RT-19)

- **New component:** `client/src/components/export/ExportButton.tsx` -- the button + dropdown.
- **New utility:** `client/src/lib/export.ts` already exists as a placeholder. Add the `toPng` logic there.
- **Integration point:** The ExportButton renders in TopBar's right section. It needs the current view's content element ref to pass to `html-to-image`.
- **New dependency:** `html-to-image` (add to `client/package.json`).

### Drag (RT-25)

- **Modified component:** `client/src/components/timeline/ItemBar.tsx` -- add pointer event handlers for drag start, resize handle rendering.
- **New component:** `client/src/components/timeline/DragLayer.tsx` -- renders the ghost bar, snap lines, date tooltip, and stream highlight. This sits as a sibling to the ItemBar elements within the SVG, on a higher z-layer.
- **New store slice:** Add `dragState` to `viewStore.ts` (or create a dedicated `dragStore.ts`):
  ```typescript
  interface DragState {
    itemId: string;
    mode: 'move' | 'resize-start' | 'resize-end';
    originX: number;
    originY: number;
    currentX: number;
    currentY: number;
    snappedDate: Date;
    snappedEndDate?: Date;
    targetGroupId: string | null;
    preDragItem: { startDate: string; endDate: string; fieldValues: any };
  }
  ```
- **Integration point:** `TimelineCanvas.tsx` wraps pointer event listeners on the SVG root for `pointermove` and `pointerup` during drag. The `DragLayer` reads drag state from the store and renders the visual feedback.

### Presentation Mode (RT-30)

- **New component:** `client/src/components/presentation/PresentationMode.tsx` -- wraps the view content, manages fullscreen API, renders the overlay and view switcher.
- **Integration point:** In `AppShell.tsx` or the roadmap page route, conditionally render the `PresentationMode` wrapper when presentation mode is active. Add `isPresentationMode` to `viewStore.ts`.
- **CSS approach:** Add a `[data-presentation]` attribute to the root element. Use CSS to hide chrome:
  ```css
  [data-presentation] .sidebar,
  [data-presentation] .topbar,
  [data-presentation] .format-panel { display: none; }
  [data-presentation] .content { position: fixed; inset: 0; z-index: 50; }
  ```

---

*Design addendum written by Robert (Product Designer). Alice: implement from this spec in conjunction with the v1.0 design spec. Nina: review the drag interaction feel during your pass -- especially the ghost bar responsiveness, snap behavior, and cursor transitions. Reference the token values and CSS properties directly. Ask me if any detail is ambiguous.*
