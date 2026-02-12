# Roadmap Tool v1.1 Sprint A -- Stakeholder & Daily Use

**Author:** Thomas (PM)
**Date:** February 12, 2026
**Status:** Ready for pipeline
**Project ID:** `roadmap-tool`
**Sprint goal:** Make the roadmap tool presentation-ready and daily-driver smooth. Three features: PNG export, timeline drag-and-drop, and presentation mode.

---

## 1. Sprint Context

### Where we are

Forge v1.0 is shipped and deployed. All three views (Timeline, Swimlane, Table) work. Items, fields, milestones, filtering, format panel, color palettes, real-time collaboration, and sharing are all functional. The product is usable but missing key daily-workflow features.

### Why these three features first

The v1.1 backlog has 8 items. We are not scoping all 8 at once. We are picking the batch that delivers the most value fastest.

**RT-19 (Export to PNG)** -- This was deferred from v1.0. Users need to drop roadmap images into slide decks, emails, and Notion pages. Without export, they're screenshotting. This is the single most-requested missing capability for stakeholder communication.

**RT-25 (Drag items on Timeline)** -- The Timeline is the hero feature, but you can't move items on it. Changing dates requires opening the Item Card, editing two date fields, and closing. This is the "8 clicks" problem from Roadmunk user research. Drag-and-drop makes the Timeline feel like a direct manipulation canvas, not a read-only visualization.

**RT-30 (Presentation mode)** -- Trivial to build, high impact for meetings. Full-screen, no editing chrome, Escape to exit. This pairs with PNG export -- both solve "I need to show this to my boss."

### What's deferred (later sprints)

| ID | Feature | Why deferred |
|----|---------|--------------|
| RT-24 | Link items (dependencies) | Schema change + SVG dependency lines + auto-date-adjustment. Medium-large scope. Sprint B. |
| RT-26 | Sub-items | Schema change (parentId on items) + nested rendering in all 3 views. Sprint B. |
| RT-27 | Key dates | Small feature, but depends on sub-items being in place (key dates attach to items and sub-items). Sprint B. |
| RT-28 | Comments and activity log | Real-time comment thread + @mentions + notifications. Standalone sprint. Sprint C. |
| RT-29 | CSV import/export | Data portability. Important but not blocking daily use. Sprint C. |
| RT-31 | Fiscal year settings | Account-level setting + Timeline header recalculation. Low priority. Sprint C. |
| RT-32 | Portfolio roadmaps | v2.0 scope. Multi-roadmap roll-up. Sprint D. |
| RT-33 | Collections / folders | v2.0 scope. Roadmap organization. Sprint D. |
| RT-34 | Buckets (no-date mode) | v2.0 scope. Fundamental data model change. Sprint D. |
| RT-35 | Templates | v2.0 scope. Seed data + template picker UI. Sprint D. |

---

## 2. Scope

### In scope

1. **RT-19: Export to PNG** -- Export any view (Timeline, Swimlane, Table) as a high-resolution PNG image
2. **RT-25: Drag items on Timeline** -- Move items horizontally (dates) and vertically (streams), resize by dragging edges
3. **RT-30: Presentation mode** -- Full-screen, read-only view for meetings

### Out of scope

- Server-side PNG export (Puppeteer fallback) -- client-side only for v1.1. Revisit if users report issues with complex SVGs.
- Drag-and-drop in Swimlane view (card reordering) -- not in this sprint
- Drag-and-drop in Table view (row reordering) -- not in this sprint
- Undo stack beyond Cmd/Ctrl+Z for the last drag operation -- no persistent undo history
- Presentation mode slide navigation (cycling between views) -- manual view switching only
- Printing / PDF export -- PNG only

---

## 3. User Stories

### 3.1 RT-19: Export to PNG

**US-19: Export any view as a high-resolution PNG**
As a user, I can export the current view as a PNG image so I can paste it into presentations, documents, and messages.

#### Acceptance criteria

- [ ] "Export" button in the top toolbar (next to the Share button)
- [ ] Clicking Export opens a small dropdown with one option: "Download as PNG"
- [ ] Export captures the FULL view content, not just the visible viewport:
  - Timeline: all header groups and items within the current date range, including content below the scroll fold
  - Swimlane: the full grid including all rows and columns
  - Table: all visible rows and columns (respecting current filters)
- [ ] Export renders at 2x pixel density (retina/high-DPI) for crisp output
- [ ] Downloaded file name format: `{roadmap-name}-{view-name}.png`
  - Spaces replaced with hyphens, lowercase, max 100 chars
  - Example: `product-roadmap-q1-timeline.png`
- [ ] Color palette and formatting are preserved exactly (item bar colors, legend, header styling)
- [ ] Today marker is included in Timeline exports
- [ ] Milestones are included in Timeline exports
- [ ] The export does NOT include UI chrome (toolbar, sidebar, Format Panel, Item Card)
- [ ] The export DOES include: view title, legend (if visible), date headers (Timeline), row/column headers (Swimlane), column headers (Table)

#### Technical approach

Use `html-to-image` library (already specified in the tech approach but not yet installed). Client-side capture via `toPng()`:

```typescript
import { toPng } from 'html-to-image';

// Target the view content container (not the full page)
const dataUrl = await toPng(viewElement, {
  pixelRatio: 2,
  backgroundColor: '#ffffff',
  width: viewElement.scrollWidth,
  height: viewElement.scrollHeight,
});
```

For SVG-based Timeline View: `html-to-image` handles SVG elements correctly. No special SVG-to-Canvas conversion needed.

If `html-to-image` struggles with the Timeline SVG (a known edge case with foreign objects), fall back to `dom-to-image-more` which has better SVG handling.

#### Interaction states

**Loading & Async:**
- [ ] When export starts, the "Download as PNG" button text changes to "Generating..." with a spinner icon
- [ ] The button is disabled during export to prevent double-clicks
- [ ] If export takes longer than 5 seconds, the button text changes to "Still generating... (large roadmap)"
- [ ] On success, the file downloads automatically and the dropdown closes
- [ ] Focus returns to the Export button after download completes

**Error:**
- [ ] If the export fails, show a toast notification: "Export failed. Try again."
- [ ] The button re-enables so the user can retry
- [ ] If the view is empty (no items), disable the export option with tooltip: "Add items to export"

**Disabled:**
- [ ] Export is disabled when the view is in a loading state (data still fetching)
- [ ] N/A: no form state, no optimistic updates

---

### 3.2 RT-25: Drag Items on Timeline

**US-25: Drag items on the Timeline to change dates and stream assignments**
As a user, I can grab an item bar on the Timeline and drag it to change its dates or move it to a different stream, with visual feedback during the drag.

#### Acceptance criteria

**Core drag behaviors:**
- [ ] **Horizontal drag (move):** Grab an item bar anywhere on its body. Drag left/right to change start and end dates. Duration (end - start) is preserved. Release to commit.
- [ ] **Vertical drag (restream):** Drag an item bar up/down to move it to a different header group or stream. The item's field value for the header field updates to match the target group.
- [ ] **Combined drag:** Diagonal drag changes both dates and stream assignment simultaneously.
- [ ] **Shift+drag:** Restricts to vertical-only movement (no date change). Useful for re-categorizing without accidentally shifting dates.
- [ ] **Edge resize (start date):** Hover over the LEFT edge of an item bar. Cursor changes to `col-resize`. Drag left/right to change the start date only. End date stays fixed. Duration changes.
- [ ] **Edge resize (end date):** Hover over the RIGHT edge of an item bar. Cursor changes to `col-resize`. Drag left/right to change the end date only. Start date stays fixed. Duration changes.
- [ ] **Minimum duration:** Resizing cannot make an item shorter than 1 day.

**Visual feedback:**
- [ ] **Ghost preview:** During drag, a semi-transparent copy of the bar (40% opacity) shows where the item will land. The original bar stays in place at reduced opacity (20%) until drop.
- [ ] **Snap indicators:** During drag, light vertical guide lines appear at snap points (day/week/month boundaries depending on zoom level) to show where dates will snap.
- [ ] **Date tooltip:** During horizontal drag or resize, a floating tooltip near the cursor shows the new date(s): "Jan 15 - Mar 30" (both dates for move, single date for resize).
- [ ] **Stream highlight:** During vertical drag, the target header group highlights with a subtle background color change to show where the item will land.
- [ ] **Resize handles:** On hover over an item bar, small grab handles (4px wide) appear at the left and right edges. The cursor changes to `col-resize` over these handles.

**Snap behavior:**
- [ ] Dates snap to the nearest time unit based on the current zoom level:
  - Weeks zoom: snap to nearest day
  - Months zoom: snap to nearest day
  - Quarters zoom: snap to nearest week
  - Halves zoom: snap to nearest week
  - Years zoom: snap to nearest month
- [ ] Hold Alt/Option while dragging to disable snap (free positioning to exact pixel -> date)

**Saving:**
- [ ] On drop, the new dates and/or field value are saved immediately via the existing item update API (`PATCH /api/v1/roadmaps/:roadmapId/items/:id`)
- [ ] The save is optimistic: the bar stays in its new position immediately. If the server rejects, the bar animates back to its original position.
- [ ] Real-time: the drag update broadcasts to other connected users via the existing WebSocket `item-updated` event. Other users see the bar move after the server confirms.

**Undo:**
- [ ] `Cmd/Ctrl + Z` undoes the last drag operation (reverts to pre-drag dates and field value)
- [ ] Undo is single-level only (one Cmd+Z undoes the last drag; pressing again does nothing)
- [ ] Undo calls the same PATCH API with the original values

**Constraints:**
- [ ] Items without dates cannot be dragged (they don't appear on the Timeline)
- [ ] Viewer-role users cannot drag (cursor stays default, no drag handlers)
- [ ] Edit-locked items (locked by another user) cannot be dragged. Show the existing lock indicator.
- [ ] Performance: drag must feel 60fps smooth. Use `requestAnimationFrame` for position updates during drag. Do NOT re-render the full SVG on every mouse move -- only update the dragged bar's transform.

#### Technical approach

The Timeline is SVG-based. Drag implementation uses native pointer events on the SVG:

1. **Pointer events on ItemBar:** `onPointerDown` starts the drag. `onPointerMove` (on document, not the bar) updates position. `onPointerUp` commits.
2. **Transform during drag:** During the drag, update the bar's `transform: translate(dx, dy)` attribute. This is a single attribute change per frame -- no React re-render needed.
3. **Date calculation on drop:** Use the existing `xScale.invert(pixelX)` from `d3-scale` to convert the final pixel position back to a date. Apply snap rounding.
4. **Stream detection on drop:** Calculate which header group the bar's Y position falls into. If it's a different group than the original, update the item's field value for the header field.
5. **Hit detection for resize handles:** Check if the pointer is within 6px of the bar's left or right edge during `onPointerDown`. If so, enter resize mode instead of move mode.

The drag state should live in a Zustand store (or local component state in TimelineCanvas), NOT in React Query cache. Only commit to the cache/API on drop.

#### Interaction states

**Loading & Async:**
- [ ] During the save after drop, no loading indicator is needed (optimistic update)
- [ ] On success (server confirms), no visible change (bar is already in position)
- [ ] On failure (server rejects), the bar animates back to its original position over 200ms with an ease-out curve, and a toast shows "Failed to move item. Try again."

**Error:**
- [ ] If the drag target position is invalid (e.g., start date after end date on a resize), the bar snaps back to its original position
- [ ] If the server rejects due to permissions, show toast: "You don't have permission to edit this item"

**Disabled:**
- [ ] Drag is disabled for viewer-role users (no visual drag affordance shown)
- [ ] Drag is disabled for edit-locked items (lock indicator shown on hover)
- [ ] N/A: no form state, no empty state

**Optimistic updates:**
- [ ] The bar position updates immediately on drop (before server response)
- [ ] On server rejection, the bar animates back to its pre-drag position
- [ ] No pending indicator needed -- the update should feel instant

---

### 3.3 RT-30: Presentation Mode

**US-30: Full-screen presentation view for meetings**
As a user, I can enter a full-screen, read-only view of my roadmap for presenting in meetings without any editing UI visible.

#### Acceptance criteria

- [ ] "Present" button in the top toolbar (icon: expand/fullscreen icon)
- [ ] Clicking "Present" enters presentation mode:
  - Browser enters fullscreen (via Fullscreen API: `document.documentElement.requestFullscreen()`)
  - All editing chrome is hidden: sidebar, top toolbar, Format Panel, Item Card, breadcrumbs
  - Only the view content is visible, centered in the viewport
  - A minimal overlay appears in the bottom-right corner: roadmap name, view name, and a small "Exit" button
- [ ] The current view (Timeline, Swimlane, or Table) renders at the full viewport size
- [ ] View switching: a small, semi-transparent view switcher appears on hover at the top-center of the screen. The user can click to switch between saved views without leaving presentation mode.
- [ ] `Escape` key exits presentation mode and returns to the normal editing view
- [ ] Clicking the "Exit" button in the overlay also exits presentation mode
- [ ] If the browser exits fullscreen independently (e.g., user presses Esc at the OS level), presentation mode also exits
- [ ] Items are NOT clickable in presentation mode (no Item Card opens). Hovering still shows tooltips.
- [ ] Milestones, today marker, legend, and color coding are all visible in presentation mode
- [ ] The view respects current filters and formatting -- presentation mode shows exactly what the user was looking at, just fullscreen

#### Technical approach

Use the browser Fullscreen API. Create a `PresentationMode` wrapper component that:
1. Calls `requestFullscreen()` on mount
2. Listens for `fullscreenchange` event to detect exit
3. Renders the current view component with an `isPresentation={true}` prop that hides editing UI
4. Adds the minimal overlay (roadmap name, exit button, hover-activated view switcher)

This is primarily a CSS and layout concern, not a new feature. The views already render content -- presentation mode just controls which chrome is visible.

#### Interaction states

**Loading & Async:**
- [ ] N/A -- no async operations in presentation mode

**Error:**
- [ ] If the Fullscreen API is not available (rare, some embedded iframes block it), show a toast: "Fullscreen not available in this browser context." Fall back to a maximized in-page view (hide sidebar + toolbar but don't enter browser fullscreen).

**Disabled:**
- [ ] Present button is disabled if the view has no items (same as export)
- [ ] N/A: no form state, no optimistic updates

---

## 4. Technical Constraints

| Constraint | Value | Notes |
|-----------|-------|-------|
| `html-to-image` library | Must be added to `client/package.json` | Not yet installed. Specified in the tech approach. |
| Drag performance | 60fps minimum | Use `requestAnimationFrame` + SVG transforms. No React re-renders during drag. |
| PNG export resolution | 2x pixel density | Standard retina output |
| Max items for export | 350 (existing Timeline cap) | Export respects the existing view limits |
| Snap precision | Day-level minimum | Even at Years zoom, snap to nearest month (not year) |
| Presentation mode | Fullscreen API | Graceful degradation if Fullscreen API unavailable |
| Undo depth | 1 level | Single undo for drag operations only |

---

## 5. Dependencies Between Stories

```
RT-19 (Export) -- no dependencies, can be built independently
RT-25 (Drag)  -- no dependencies, can be built independently
RT-30 (Present) -- no dependencies, can be built independently
```

All three are independent. They can be implemented in parallel by Alice (FE). There are no backend changes required for any of these features -- they all use existing APIs.

- **RT-19** adds an npm dependency (`html-to-image`) and a new button + capture logic
- **RT-25** adds pointer event handlers to the existing Timeline SVG components and a Zustand drag state
- **RT-30** adds a wrapper component with Fullscreen API and CSS visibility toggles

---

## 6. Pipeline Recommendation

This is a **frontend-only sprint**. No backend changes. No schema changes. No new API endpoints.

**Recommended pipeline:**

1. **Andrei (Arch)** -- NOT needed. No architecture decisions. The tech approach from v1.0 already specifies `html-to-image` for export and SVG pointer events for drag. The patterns are established.

2. **Robert (Designer)** -- Lightweight design pass. Needs to spec:
   - Export button placement and dropdown styling
   - Drag visual feedback (ghost bar, snap lines, date tooltip, resize handles)
   - Presentation mode overlay design (roadmap name position, exit button, hover view switcher)
   - This should be a short addendum to the existing design spec, not a full re-spec.

3. **Alice (FE)** -- Implements all three features. They are independent and can be done in any order. Suggested order: RT-30 (smallest, warmup), RT-19 (medium), RT-25 (largest).

4. **Robert (Designer)** -- Lightweight design review of implementation.

5. **Enzo (QA)** -- Test all three features. Release gate. Focus areas:
   - Export: verify PNG captures full content, correct resolution, correct filename
   - Drag: verify date accuracy after drag, snap behavior, undo, edge resize, permission enforcement
   - Present: verify fullscreen entry/exit, Escape key, view switching, tooltip behavior

**Agents NOT needed:**
- Jonah/Sam (BE) -- no backend work
- Nina/Soren/Amara -- drag interactions are important enough that Nina should review, but Soren/Amara can skip this sprint (no new responsive layouts, no new a11y patterns beyond what exists)
- Priya/Nadia/Derek/Milo/Howard -- no marketing, docs, integrations, infra, or payment changes

**Revised pipeline with Nina:**
1. Robert (Designer) -- design addendum
2. Alice (FE) -- implementation
3. Nina (Interactions) -- review drag feel (60fps, ghost preview, snap, undo feedback)
4. Robert (Designer) -- design review
5. Enzo (QA) -- release gate

---

## 7. Acceptance Test Summary

| Feature | Happy path test | Key edge cases |
|---------|----------------|----------------|
| **Export** | Export Timeline with 10 items -> PNG downloads, colors correct, all items visible | Export empty view (disabled), export large Swimlane (100+ items), export with legend visible |
| **Drag (move)** | Drag item right 2 weeks -> dates shift by 2 weeks, duration preserved | Drag to different stream (field value changes), Shift+drag (vertical only), drag near date range edge |
| **Drag (resize)** | Drag right edge -> end date changes, start date fixed | Resize to minimum (1 day), resize with snap at different zoom levels, Alt+drag (no snap) |
| **Drag (undo)** | Drag item, Cmd+Z -> item returns to original position | Undo after stream change (field value reverts), undo when nothing to undo (no-op) |
| **Drag (permissions)** | Viewer cannot drag | Edit-locked item cannot be dragged, optimistic revert on server error |
| **Present** | Click Present -> fullscreen, Escape -> exit | Fullscreen API unavailable (fallback), view switch in presentation, click item (should NOT open card) |

---

## 8. Sprint Sequencing (Full v1.1 Roadmap)

For planning awareness. Only Sprint A is scoped in this document.

| Sprint | Items | Theme | Estimated complexity |
|--------|-------|-------|---------------------|
| **Sprint A (this sprint)** | RT-19, RT-25, RT-30 | Stakeholder & daily use | Frontend-only, 3-5 days |
| **Sprint B** | RT-24, RT-26, RT-27 | Item depth (dependencies, sub-items, key dates) | Full-stack, schema changes, medium |
| **Sprint C** | RT-28, RT-29, RT-31 | Collaboration & data (comments, CSV, fiscal year) | Full-stack, medium |
| **Sprint D (v2.0)** | RT-32, RT-33, RT-34, RT-35 | Portfolio & scale | Full-stack, large |

Sprint B should come next because dependencies and sub-items add the most product depth. Sprint C is lower-priority polish. Sprint D is a major version bump.

---

*Requirements written by Thomas (PM). Robert: read this for the design addendum. Alice: read this + the existing tech approach for implementation context. Enzo: use section 7 as your test plan starting point.*
