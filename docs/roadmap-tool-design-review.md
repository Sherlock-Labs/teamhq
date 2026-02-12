# Roadmap Tool — Design Review

**Author:** Robert (Product Designer)
**Date:** February 11, 2026
**Scope:** Full frontend design + interaction audit against `docs/roadmap-tool-design-spec.md`
**Codebase:** `/Users/jeffsherlock/projects/personal/roadmap-tool/client/src/`

---

## Summary

The implementation is a solid first pass. The token system is accurately ported, the three-view architecture works, and the real-time collaboration plumbing is well-structured. However, there are meaningful gaps between the design spec and what's built — particularly in the Timeline View (widespread use of hardcoded colors instead of CSS variables), inline editing completeness, and several missing features called out in the spec. This review catalogs every gap with specific file references and recommended fixes.

**Totals:** 18 Must-fix, 22 Should-fix, 14 Nice-to-have

---

## Must-Fix (Blocks shipping / breaks spec contract)

### M1. Timeline View uses hardcoded colors throughout instead of CSS variables

**Files affected:**
- `components/timeline/TimeAxis.tsx` — Lines 30-88 use raw hex values (`#FFFFFF`, `#E4E4E7`, `#71717A`, `#3F3F46`, `#F4F4F5`) for SVG fill/stroke attributes instead of token references.
- `components/timeline/HeaderGroups.tsx` — Lines 38-50 use hardcoded `#FFFFFF`, `#FAFAFA`, `#E4E4E7`, `#3F3F46`.
- `components/timeline/ItemBar.tsx` — Lines 45-95 use hardcoded hex for stroke, fill, and text colors.
- `components/timeline/GridLines.tsx` — Uses hardcoded `#F4F4F5` for line color.
- `components/timeline/TodayMarker.tsx` — Mix of token references and hardcoded values.
- `components/timeline/MilestoneMarker.tsx` — Hardcoded `#FFFFFF` for knockout stroke.

**Why it matters:** Design spec Section 1.1 establishes tokens as the single source of truth. Hardcoded hex makes future theming impossible and creates maintenance burden. Since Timeline is the hero view, it must be the most polished, not the least tokenized.

**Fix:** SVG elements can't directly use CSS custom properties in attributes, but they CAN use `currentColor` and CSS `fill`/`stroke` properties when styled via CSS classes. Create a `TimelineView.module.css` with classes for each SVG element type, using CSS variables. For SVG `<rect>`, `<line>`, `<text>` elements, apply classes and use `fill: var(--gray-200)` etc. in CSS. Alternatively, use `getComputedStyle(document.documentElement).getPropertyValue('--gray-200')` to read tokens at render time if SVG attribute-based rendering is required.

---

### M2. No CSS module file exists for Timeline — all components use inline styles

**Files affected:**
- `components/timeline/TimelineView.tsx` — Container and scroll wrapper use inline `style={{}}`.
- `components/timeline/TimelineToolbar.tsx` — Entire component is inline styles (~60 lines of style objects).
- `components/timeline/TimelineEmpty.tsx` — Entire component is inline styles.
- `components/timeline/TimelineCanvas.tsx` — SVG container and scroll wrapper use inline styles.
- `components/timeline/TimeSlider.tsx` — All styling is inline.
- `components/timeline/ItemBarTooltip.tsx` — Tooltip portal uses inline styles.

**Why it matters:** Every other view (Table, Swimlane) and every panel (ItemCard, FormatPanel) uses CSS Modules. The Timeline inconsistency means no hover pseudo-classes, no media queries for responsive behavior, no animations via CSS, and no maintainable styling. The spec calls for responsive behavior at tablet breakpoints — impossible with inline styles alone.

**Fix:** Create `TimelineView.module.css` and extract all inline styles into CSS classes. This is a prerequisite for M1 (token usage) and several other fixes in this review.

---

### M3. Inline editing for List fields renders a text input instead of a dropdown

**File:** `components/table/InlineEditor.tsx` (entire file — only supports text/number)
**File:** `components/table/TableRow.tsx` — Lines 95-110, field rendering falls through to InlineEditor for all types.

**Spec reference:** Section 4.3 — "List field: Dropdown appears below the cell. Search input at top if 8+ values. Each option shows name + color dot."

**Current state:** Clicking a List cell opens a plain text input. The user must type the exact value name. This is the most common field type in roadmaps (Status, Priority, etc.) and the editing experience is broken.

**Fix:** Create a `ListCellEditor` component that renders a positioned dropdown of field values with color dots, filtered by a search input when 8+ options exist. The ItemCard already has `ListFieldEditor` (inside `ItemCard.tsx`, ~line 680) — extract and reuse that pattern for the table cell context.

---

### M4. Inline editing for Date fields has no date picker

**File:** `components/table/InlineEditor.tsx` — Only supports `type="text"` and `type="number"` inputs.

**Spec reference:** Section 4.3 — "Date: Date input field that accepts typed text AND a calendar icon button that opens a date picker popover."

**Fix:** Create a `DateCellEditor` that uses `<input type="date">` as a base with a visual calendar popover. At minimum, use the browser's native date input which gives calendar functionality for free.

---

### M5. ItemCard description is a plain textarea, not a rich text editor

**File:** `components/item-card/ItemCard.tsx` — ~Line 520, `<textarea>` for description editing.

**Spec reference:** Section 7.2 — "Description: Tiptap-powered rich text editor. Supports: bold, italic, bullet lists, numbered lists, code blocks, links. Toolbar appears on text selection (floating toolbar, not fixed)."

**Why it matters:** Rich descriptions are a core differentiator from Roadmunk. Users need formatting for detailed item specs.

**Fix:** Integrate Tiptap (already in the tech approach as a dependency). Create a `RichTextEditor` component with a floating toolbar that appears on text selection. Use Tiptap's `StarterKit` + `Link` extensions.

---

### M6. SwimlaneView uses `prompt()` for inline item creation

**File:** `components/swimlane/SwimlaneView.tsx` — Line ~285: `const name = prompt('Item name:');`

**Spec reference:** Swimlane Section 6.3 — Card creation should use an inline creator within the cell, not a browser prompt.

**Why it matters:** `prompt()` breaks the flow, isn't styleable, doesn't match any other creation pattern in the app, and feels like a prototype.

**Fix:** When the `+` button in an empty cell is clicked, render an inline text input within the cell (similar to `InlineItemCreator` in Table View). On Enter, create the item. On Escape, cancel.

---

### M7. SharedViewPage is a stub placeholder

**File:** `routes/SharedViewPage.tsx` — Entire file is 12 lines rendering "Shared view: {token}".

**Spec reference:** Section 10 — Full read-only shared view with embedded viewer, no sidebar, no editing.

**Why it matters:** Sharing is a core feature. The route exists but renders nothing.

**Fix:** Implement the shared view page per spec: fetch the shared roadmap/view data via the share token API, render the appropriate view component (Table/Timeline/Swimlane) in read-only mode, with a minimal header showing the roadmap name.

---

### M8. No Cmd+K global search

**Spec reference:** Section 2.5 — "Keyboard shortcut Cmd/Ctrl + K opens a centered modal search input."

**Current state:** Not implemented anywhere. No keyboard listener, no search modal component.

**Fix:** Create a `SearchModal` component rendered in `App.tsx`. Register a global keydown listener for Cmd/Ctrl+K. The modal should use the existing `api.searchRoadmaps()` endpoint (already in `api.ts`, line 145).

---

### M9. TopBar breadcrumbs show hardcoded "Roadmap" text

**File:** `components/shell/TopBar.tsx` — Line ~32: `<span className={styles.breadcrumbCurrent}>Roadmap</span>`

**Spec reference:** Section 2.3 — Breadcrumbs should show "Roadmaps / My Product Roadmap / Q1 Timeline" with actual names.

**Current state:** Just shows the word "Roadmap" regardless of which roadmap is open. No link back to the roadmap list.

**Fix:** Pass the roadmap name and active view name as props to TopBar. Render: `<Link to="/">Roadmaps</Link>` / `{roadmapName}` / `{viewName}`. The roadmap name segment should be editable on click per spec (inline text input).

---

### M10. TopBar right section is completely empty

**File:** `components/shell/TopBar.tsx` — Line ~36: Comment reads `{/* Presence avatars, Share, Export, Format — will be added per-view */}`.

**Spec reference:** Section 2.3 — Right section should have: Presence avatars, Share button, Export button, Format button, Settings icon.

**Current state:** The presence avatars and Format button ARE implemented — but in `RoadmapPage.tsx` toolbar, not in the TopBar. The TopBar's right section renders nothing. This means the top bar has wasted space and the toolbar duplicates what should be unified.

**Fix:** Either move the presence avatars, share, export, and format controls INTO the TopBar (passing them as children or via render prop), or remove the TopBar right section comment to avoid confusion. The current RoadmapPage toolbar approach works but should be documented as the intentional pattern.

---

### M11. Table header applies `.toUpperCase()` in JS instead of CSS `text-transform`

**File:** `components/table/TableHeader.tsx` — Line ~42: `{field.name.toUpperCase()}`

**Spec reference:** Section 4.2 — "Text: `--text-xs`, weight 500, `--gray-500`, uppercase, letter-spacing 0.05em"

**Why it matters:** Using JS `.toUpperCase()` means screen readers announce the text in all caps (each letter individually). CSS `text-transform: uppercase` is visually identical but preserves the original text for assistive technology.

**Fix:** Remove `.toUpperCase()` from the JSX. Add `text-transform: uppercase; letter-spacing: 0.05em;` to the `.headerCell` class in `TableHeader.module.css`.

---

### M12. Delete/Backspace shortcut deletes without confirmation dialog

**File:** `components/table/TableView.tsx` — Lines 132-136: Pressing Delete/Backspace when items are selected immediately calls `deleteItems.mutate()`.

**Spec reference:** Section 4.6 — "Delete confirmation: 'Delete N items? This action cannot be undone.' with 'Cancel' and 'Delete' (danger button)."

**Current state:** The BulkActionBar's delete button correctly implements a two-step confirmation. But the keyboard shortcut bypasses it entirely and deletes immediately.

**Fix:** When Delete/Backspace is pressed with selected items, show the same confirmation dialog used by BulkActionBar's delete button instead of immediately mutating.

---

### M13. Duplicate palette definitions in two files

**File:** `lib/colors.ts` — Lines 3-66: Defines `DEFAULT_PALETTES` with 6 palettes.
**File:** `lib/palettes.ts` — Lines 1-65: Defines `DEFAULT_PALETTES` again with identical data.

**Why it matters:** Two sources of truth for palette colors. If one is updated, the other becomes stale. SwimlaneView imports from `palettes.ts`; FormatPanel imports from `colors.ts`.

**Fix:** Delete `palettes.ts`. Move `getPaletteById()` and `getColorForIndex()` into `colors.ts`. Update SwimlaneView import.

---

### M14. Milestones have no styled tooltip — use raw `<title>` element

**File:** `components/timeline/MilestoneMarker.tsx` — Line ~55: Uses `<title>{name}: {formattedDate}</title>` for hover info.

**Spec reference:** Section 5.6 — "Hover: Tooltip with milestone name, date, and type. Same tooltip styling as item bars."

**Current state:** Item bars get a styled, positioned `ItemBarTooltip` component. Milestones get the browser's default title tooltip (unstyled, delayed, inconsistent across browsers).

**Fix:** Reuse or adapt `ItemBarTooltip` for milestone markers. Show name, date, and milestone type on hover with the same dark-bg tooltip styling.

---

### M15. No column reorder drag-and-drop in Table View

**Spec reference:** Section 4.2 — "Drag handle (left edge): Reorder columns via drag-and-drop."

**Current state:** Table headers have no drag handles and no reorder capability.

**Fix:** Add a drag handle to each column header. Implement drag-and-drop reorder using the HTML Drag and Drop API or a lightweight library. Persist column order to the view config.

---

### M16. MobileMessage uses inline styles with hardcoded colors

**File:** `components/shell/MobileMessage.tsx` — Entire component uses inline `style={{}}` with hardcoded hex values like `'#F4F4F5'`, `'#3F3F46'`, etc.

**Why it matters:** Same token violation as M1. Also prevents responsive behavior via CSS media queries.

**Fix:** Create `MobileMessage.module.css` and use CSS variables.

---

### M17. HomePage missing key card elements from spec

**File:** `routes/HomePage.tsx`

**Spec reference:** Section 3.2 — Cards should have: favorite toggle (star icon), owner name + avatar, view count badge, last modified date. Section 3.1 — Page should have "Favorites", "My Roadmaps", "Shared with Me", "Recently Viewed" sections.

**Current state:** Cards only show name + last modified date. No favorites, no owner, no view count, no sections, no context menu (right-click for Rename/Duplicate/Delete).

**Fix:** Add the missing card elements and organize into sections per spec.

---

### M18. No Milestones Tab in Table View

**Spec reference:** Section 4.9 — "A tab switcher above the table: 'Items' | 'Milestones'. Default is Items."

**Current state:** Table View only shows items. No tab switcher, no milestones table.

**Fix:** Add a segmented control above the table. When "Milestones" is selected, render a milestone-specific table with Name, Date, Type columns.

---

## Should-Fix (Quality / consistency gaps)

### S1. TimelineToolbar uses a single button label instead of segmented control for layout

**File:** `components/timeline/TimelineToolbar.tsx` — Line ~45: Layout toggle shows button text cycling through "Spacious"/"Compact" on click.

**Spec reference:** Section 5.1 diagram — `[ Compact/Spacious ]` shown as a segmented control with both options visible.

**Fix:** Replace the single toggle button with a two-segment control (like the one in `FormatPanel.tsx`) showing both Compact and Spacious options simultaneously.

---

### S2. No hover-between-rows insert button for Table View

**Spec reference:** Section 4.4 — "Hover between any two rows to reveal a + button (centered, 24px circle, --accent-600 background, white + icon)."

**Current state:** Only the bottom `+ Add item` row exists (via `InlineItemCreator`). No hover-activated insert between existing rows.

**Fix:** Add hover zones between rows. On hover, show a `+` circle button centered on the divider line. On click, insert a new row at that position with the name cell in edit mode.

---

### S3. Active cell highlight missing background color

**File:** `components/table/TableRow.module.css` — `.cellActive` class has `outline: 2px solid var(--accent-600)` but no background change.

**Spec reference:** Section 4.5 — "Active cell highlight: 2px solid --accent-600 border, --accent-50 background."

**Fix:** Add `background: var(--accent-50);` to `.cellActive`.

---

### S4. PresenceAvatars uses `title` attribute instead of styled tooltip

**File:** `components/collab/PresenceAvatars.tsx` — Line 19: `title={...}` for hover info.

**Spec reference:** Section 2.3 — "Hover tooltip: 'Name — viewing View Name'."

**Current state:** Uses browser native title tooltip. Every other tooltip in the app uses styled components.

**Fix:** Replace `title` with a CSS/React tooltip component that matches the app's tooltip styling.

---

### S5. CursorOverlay uses `document.getElementById` for cell positioning

**File:** `components/collab/CursorOverlay.tsx` — Line 29: `document.getElementById(\`cell-${cursor.row}-${cursor.col}\`)`.

**Why it matters:** Direct DOM queries bypass React's rendering model. If cells re-render or reorder, the overlay positions may be stale. Also, table cells don't currently set `id` attributes matching this pattern.

**Fix:** Either ensure table cells consistently set `id={`cell-${rowIndex}-${colIndex}`}` or refactor to use `ref` forwarding or a layout context that provides cell positions.

---

### S6. ConnectionStatus retry button reloads the entire page

**File:** `components/collab/ConnectionStatus.tsx` — Line 23: `onClick={() => window.location.reload()}`.

**Why it matters:** A full page reload destroys all client state (unsaved edits, scroll position, active cell). The socket connection has built-in reconnection logic (`reconnectionAttempts: Infinity` in `useSocket.ts` line 33).

**Fix:** Instead of reload, trigger a manual socket reconnection: `socket.disconnect(); socket.connect();`. Or simply remove the retry button since auto-reconnection is already configured.

---

### S7. Sidebar nav doesn't show "Fields" link when inside a roadmap

**File:** `components/shell/Sidebar.tsx` — Navigation items are static. The spec says "When viewing a roadmap: Roadmaps, Fields (for that roadmap), Settings."

**Current state:** I see from the RoadmapPage that there IS a FieldsPage route, but the Sidebar doesn't dynamically add a "Fields" link based on context.

**Fix:** When the URL matches `/roadmaps/:id/*`, add a "Fields" nav link pointing to `/roadmaps/${id}/fields`.

---

### S8. ItemCard missing "Save & New" button

**File:** `components/item-card/ItemCard.tsx` — Footer area (~line 610) has "Save" and close button.

**Spec reference:** Section 7.3 — "Footer: Three buttons — 'Save & Close' (primary), 'Save & New' (secondary, saves current item and immediately opens a blank new-item card), 'Cancel' (ghost)."

**Current state:** Only two buttons. No "Save & New" workflow.

**Fix:** Add "Save & New" secondary button that saves the current item, then resets the card to a blank new-item state (clear all fields, generate new ID).

---

### S9. ViewSwitcher filter badge uses gray instead of spec's colored indicator

**File:** `components/views/ViewSwitcher.tsx` — Filter count badge styling.
**File:** `components/views/ViewSwitcher.module.css` — `.filterBadge` uses `--gray-100` background.

**Spec reference:** Section 2.3 — View items in the switcher should show a blue dot/indicator when filters are active.

**Fix:** Use `--accent-600` for the filter indicator dot/badge instead of gray.

---

### S10. Tab key in Table View starts editing immediately when not in edit mode

**File:** `components/table/TableView.tsx` — Lines 160-164: `case 'Tab': ... setEditingCell(activeCell);`

**Spec reference:** Section 4.5 — "Tab: Move to the next cell (right). Shift+Tab: move left."

**Current state:** Tab triggers edit mode on the current cell instead of moving to the next cell. The `handleTab` function (which does move cells) is only called from within InlineEditor's onTab callback.

**Fix:** In the `handleKeyDown` switch, `Tab` should call `handleTab(activeCell.row, activeCell.col, e.shiftKey)` to navigate, not enter edit mode.

---

### S11. Timeline HeaderGroups text truncation uses approximate character width

**File:** `components/timeline/HeaderGroups.tsx` — Line ~62: Uses `8 * charWidth` approximation for text truncation.

**Why it matters:** This causes inconsistent truncation across different fonts, weights, and characters (e.g., "WWWWWW" vs "iiiiii" have very different widths).

**Fix:** Use a `<text>` element with SVG's built-in text overflow handling, or measure text width using `canvas.measureText()` or a hidden DOM element.

---

### S12. Timeline mobile button uses inline styles with hardcoded colors

**File:** `components/timeline/TimelineView.tsx` — ~Line 85: Mobile "Switch to Table View" button uses inline `style={{ background: '#4F46E5', color: '#fff' }}`.

**Fix:** Move to CSS module class using `var(--accent-600)` and `var(--white)`.

---

### S13. Timeline tablet banner uses inline styles

**File:** `components/timeline/TimelineView.tsx` — ~Line 70: Tablet warning banner uses inline `style={{ background: '#FEF9C3', borderBottom: '1px solid #FDE68A' }}`.

**Fix:** Move to CSS module class using semantic color tokens.

---

### S14. FormatPanel palette grid should show color swatches, not just names

**File:** `components/format-panel/FormatPanel.tsx` — The palette picker shows palette names with small preview dots.

**Spec reference:** Section 8.3 — "Palette grid (2×3) with color swatches. Each palette shows all 8 colors in a horizontal strip."

**Current state:** Palette selection works but the visual presentation could better match the spec's "horizontal strip" showing all 8 colors.

**Fix:** Render each palette option as a horizontal row of 8 color circles/squares so users can see the full palette at a glance before selecting.

---

### S15. No export functionality

**Spec reference:** Section 2.3 — "Export button: Secondary button, download icon." Section 9 — Timeline PNG export.

**Current state:** No export button, no export logic anywhere in the codebase.

**Fix:** Add an "Export" button to the toolbar. Implement PNG export for Timeline View using `html2canvas` or SVG-to-PNG conversion. Table View can export as CSV.

---

### S16. No Share button or sharing UI

**Spec reference:** Section 2.3 — "Share button: Secondary button, 'Share' label." Section 10 — Full sharing system with public links.

**Current state:** No share button, no sharing modal. (SharedViewPage exists as a stub — see M7.)

**Fix:** Add a "Share" button to the toolbar that opens a modal for generating/managing share links.

---

### S17. Multi-select field editing not supported in Table inline editor

**File:** `components/table/InlineEditor.tsx` — No multi-select support.
**File:** `components/table/TableRow.tsx` — Multi-select values render correctly as pills but editing falls through to the text input.

**Spec reference:** Section 4.3 — "Multi-select: Same dropdown but with checkboxes."

**Fix:** Create a `MultiSelectCellEditor` with a dropdown showing checkboxes next to each option.

---

### S18. Team Member field type has no special rendering or editing

**Spec reference:** Section 4.2 — "Team Member: Avatar (20px) + name." Section 4.3 — "Team Member: Dropdown of org members with avatars."

**Current state:** Team member fields render as plain text.

**Fix:** Render as avatar + name. Edit as a dropdown of organization members.

---

### S19. useSocket hardcodes `auth: { token: 'dev_bypass' }`

**File:** `hooks/useSocket.ts` — Line 29: `auth: { token: 'dev_bypass' }`

**Why it matters:** This needs to be replaced with actual Clerk session tokens before shipping.

**Fix:** Integrate with Clerk's `getToken()` to pass a real session token.

---

### S20. No keyboard panning for Timeline View

**Spec reference:** Section 5.11 — "Arrow keys: Pan left/right/up/down when the Timeline has focus. Hold Shift+Arrow for faster panning."

**Current state:** Only wheel-based horizontal scrolling is implemented.

**Fix:** Add keydown listener for arrow keys on the timeline container to adjust scroll position.

---

### S21. No field value error flash on rejected save

**Spec reference:** Section 4.3 — "Error: If server rejects the change, the cell flashes red briefly (--error-50 background, 300ms fade) and reverts to the previous value."

**File:** `components/table/TableView.tsx` — Line 255: The `.catch()` only invalidates queries. No visual error feedback.

**Fix:** On catch, flash the affected cell with `--error-50` background for 300ms and show a toast or tooltip with the error message.

---

### S22. Error state on HomePage uses wrong background color

**File:** `routes/HomePage.tsx` — Error state rendering (~line 85).

**Spec reference:** Section 3.4 — "Red-tinted background card (--error-50)."

**Current state:** The error state renders with default background, not the specified red-tinted card.

**Fix:** Add `background: var(--error-50)` to the error state container.

---

## Nice-to-Have (Polish / delight items)

### N1. No row drag-and-drop reorder in Table View

**Spec reference:** Implied by sortOrder field on items. Manual reorder by dragging rows would match the expected UX.

**Fix:** Add drag handles to the row checkbox column. Implement drag-to-reorder using HTML Drag and Drop API.

---

### N2. No column resize handles in Table View

**Spec reference:** Column widths are currently auto-sized. Spec mentions customizable column widths in FormatPanel.

**Fix:** Add resize handles on column header borders. Persist column widths to the view config.

---

### N3. Swimlane card compact mode could be more differentiated

**File:** `components/swimlane/SwimlaneView.module.css` — `.compactCard` reduces padding slightly.

**Spec reference:** Compact cards should show name only (no metadata row).

**Current state:** Compact mode reduces padding but still shows the same content structure.

**Fix:** In compact mode, hide the metadata row and show only the item name.

---

### N4. No animation on view switching

**File:** `routes/RoadmapPage.module.css` — `.viewTransition` class exists but has minimal styling.

**Spec reference:** Views should fade in on switch.

**Current state:** The `key={activeViewId}` on the view container forces a remount, which gives a brief flash. No explicit fade animation.

**Fix:** Add a CSS fade-in animation: `animation: fadeIn 200ms ease-out` on `.viewTransition`.

---

### N5. CreateViewModal type icons are SVG but could be more visually distinct

**File:** `components/views/CreateViewModal.tsx` — View type icons are simple SVG paths.

**Fix:** Use more detailed/recognizable icons for each view type. Consider using the same icons that appear in ViewSwitcher for consistency.

---

### N6. FilterBuilder could show a count badge on the trigger button

**File:** `components/views/FilterBuilder.tsx` — The "Filter" button doesn't indicate active filter count.

**Spec reference:** Filter state should be visible at a glance in the toolbar.

**Fix:** Show a count badge (e.g., "Filter (3)") when filters are active.

---

### N7. No loading state for field value saves in table cells

**Current state:** Saves happen silently via debounced optimistic update. No loading indicator.

**Fix:** Show a subtle spinner or pulsing border on the cell while the save is in flight.

---

### N8. Sidebar collapse animation could be smoother

**File:** `components/shell/AppShell.module.css` — Sidebar uses `transition: width 200ms`.

**Fix:** Add `transition: width 200ms ease, padding 200ms ease` and animate the nav text opacity to fade out before width collapses.

---

### N9. No keyboard shortcut hints in tooltips

**Current state:** Buttons don't show keyboard shortcuts on hover (e.g., Format button should show "Ctrl+Shift+F" or similar).

**Fix:** Add shortcut hints to button tooltips and implement the corresponding keyboard listeners.

---

### N10. FieldModal color picker is a click-to-cycle control

**File:** `components/fields/FieldModal.tsx` — Lines 304-309: Color picker cycles through 15 colors on click.

**Fix:** Replace with a small color swatch grid (3×5) so users can directly pick their desired color instead of cycling through all options.

---

### N11. BulkActionBar enter/exit animation could use CSS transitions

**File:** `components/table/BulkActionBar.module.css` — Has `@keyframes slideUp` animation.

**Current state:** Only has enter animation. No exit animation (bar disappears instantly when items are deselected).

**Fix:** Add exit animation using the existing `useClosingAnimation` hook pattern.

---

### N12. No empty state illustration

**Spec reference:** Section 3.4 — "Centered illustration (simple line art, optional)"

**Current state:** Empty states use text only.

**Fix:** Add simple SVG illustrations to empty states for visual warmth.

---

### N13. TimeSlider could show date labels at thumb position

**File:** `components/timeline/TimeSlider.tsx`

**Current state:** Slider shows a draggable thumb for panning but no date context.

**Fix:** Show the visible date range (start–end) as small labels near the slider thumb.

---

### N14. No skeleton loading state for Timeline View

**Current state:** Timeline shows a loading text message while data fetches. Table View has a proper skeleton state.

**Fix:** Create a Timeline skeleton with gray rectangles approximating header groups and item bars.

---

## Cross-Cutting Observations

### Token Compliance Score

| Area | Score | Notes |
|------|-------|-------|
| Design Tokens (CSS) | 10/10 | `tokens.css` is a perfect match to spec |
| Table View | 8/10 | Good token usage. Header uppercase done in JS, minor gaps |
| Timeline View | 3/10 | Pervasive hardcoded hex. No CSS module. Critical gap |
| Swimlane View | 7/10 | CSS Modules used, some inline overrides |
| Item Card | 8/10 | Good token usage. Rich text editor missing |
| Format Panel | 9/10 | Clean implementation, matches spec well |
| Collab Components | 7/10 | Good structure. Native tooltips instead of styled |
| Shell (Sidebar/TopBar) | 7/10 | TopBar right section empty. Breadcrumbs incomplete |
| Homepage | 6/10 | Missing major spec features (favorites, sections) |

### Architecture Observations

1. **CSS Modules pattern is well-established** — Timeline is the sole outlier. Fixing M2 brings the entire codebase into consistency.
2. **Optimistic updates are thorough** — Table and ItemCard handle rollback on error correctly.
3. **Real-time collab infrastructure is solid** — Socket events cover all CRUD operations. Lock system is well-designed.
4. **Component decomposition is clean** — Good separation of concerns between views, editors, and panels.
5. **Hook patterns are consistent** — `useFocusTrap`, `useClosingAnimation`, `useMediaQuery` are reusable and well-written.

### Recommended Fix Priority

**Sprint 1 (Core experience):**
M1, M2 (Timeline tokens + CSS modules — unblocks all other Timeline fixes)
M3, M4 (Inline editing — most common user interaction)
M6 (Swimlane prompt → inline creator)
M11 (Accessibility — screen reader uppercase)
M12 (Delete confirmation — data safety)
M13 (Duplicate palettes — code hygiene)

**Sprint 2 (Feature completeness):**
M5 (Rich text editor)
M9, M10 (TopBar/breadcrumbs)
M15 (Column reorder)
M17, M18 (Multi-select + Team member fields)
S1-S3 (Timeline + table polish)

**Sprint 3 (Ship-ready polish):**
M7, M8 (Shared views, Cmd+K search)
M14 (Milestone tooltips)
M17 (HomePage features)
S15, S16 (Export, Share)
All Nice-to-haves

---

*End of review. Questions → Robert.*
