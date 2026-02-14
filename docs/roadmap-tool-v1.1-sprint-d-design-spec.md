# Roadmap Tool v1.1 Sprint D -- Design Spec

**Author:** Robert (Product Designer)
**Date:** February 13, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Dependencies:** `docs/roadmap-tool-v1.1-sprint-d-requirements.md` (Thomas), `docs/roadmap-tool-v1.1-sprint-d-tech-approach.md` (Andrei)

---

## Overview

Sprint D adds four features that collectively move the product from a single-roadmap tool to a planning platform: Portfolio Roadmaps (RT-32), Collections / Folders (RT-33), Buckets / No-Date Mode (RT-34), and Templates (RT-35). Each feature introduces new UI surfaces but follows the established visual language from Sprints A-C without exception.

**Design approach:** No new design patterns. Every surface reuses existing tokens, component styles, and interaction conventions. Zinc neutrals, indigo accent, 4px spacing grid, compact form inputs at 36px height, ghost buttons at 32px, tabs with underline indicator, dropdowns with `--shadow-md`, muted labels at `--text-xs` uppercase. The only genuinely new visual concept is source-color-coding on portfolio items, which extends the existing palette-based coloring system.

**Existing patterns referenced throughout:**
- Roadmap card: `HomePage.module.css .card` (white bg, 1px gray-200 border, radius-xl, shadow-sm, hover shadow-md)
- Primary button: `HomePage.module.css .createBtn` (accent-600 bg, white text, radius-md, 36px height)
- Ghost button: `HomePage.module.css .ghostBtn` (transparent bg, gray-700 text, radius-md, 32px height)
- Modal: `HomePage.module.css .overlay + .modal` (rgba overlay, white modal, radius-lg, shadow-xl, 400px width)
- Section label: `HomePage.module.css .sectionLabel` (text-xs, uppercase, letter-spacing 0.05em, gray-500)
- Form input: `HomePage.module.css .modalInput` (36px height, gray-300 border, radius-md, accent focus ring)
- Swimlane card: `SwimlaneView.module.css .card` (white bg, gray-200 border, radius-lg, shadow-sm, 3px left accent bar)
- Swimlane column header: `SwimlaneView.module.css .columnHeader` (gray-50 bg, 44px height, sticky top, text-sm 600 weight)
- Empty state: `SwimlaneView.module.css .empty` (centered, text-base heading, text-sm gray-400 subtext)

---

## 1. RT-32: Portfolio Roadmaps

### 1.1 Homepage: "New Portfolio" Button

A secondary button sits alongside the existing "+ New Roadmap" primary button in the homepage header.

**Button: `.newPortfolioBtn`**
- `height: 36px`
- `padding: 0 var(--space-4)` (16px)
- `background: var(--white)`
- `color: var(--gray-900)`
- `border: 1px solid var(--gray-300)`
- `border-radius: var(--radius-md)` (6px)
- `font-size: var(--text-sm)` (13px)
- `font-weight: 500`
- `cursor: pointer`
- Label: "New Portfolio"
- Icon (left): a stacked-layers icon, 16x16, `stroke: currentColor`, `stroke-width: 1.5`. Two overlapping rectangles suggest aggregation.

**States:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `background: var(--gray-50)` |
| Active | `background: var(--gray-100)` |
| Focus-visible | `outline: 2px solid var(--accent-600)`, `outline-offset: 2px` |

**Layout:** The header row becomes:
```
.header
  h1 "Roadmaps"
  .headerActions                -> flex row, gap: var(--space-2)
    .newPortfolioBtn            -> secondary style
    .createBtn ("+ New Roadmap") -> primary style (existing)
```

### 1.2 Portfolio Creation Dialog

Triggered by clicking "New Portfolio." This is a two-step modal: name the portfolio, then select source roadmaps.

**Modal container:** Reuses existing `.overlay` + `.modal` pattern from `HomePage.module.css`.
- `width: 520px` (wider than the 400px create-roadmap modal to accommodate the source picker list)
- All other modal properties unchanged

**Step 1: Name input**

```
.portfolioCreateModal
  .modalTitle                   -> "Create Portfolio"
  .modalInput                   -> placeholder "Portfolio name"
  .sourcePicker                 -> appears below name input
    .sourcePickerLabel          -> "Select source roadmaps (2 or more)"
    .sourcePickerSearch         -> search/filter input
    .sourceList                 -> scrollable list of roadmap checkboxes
      .sourceItem (repeated)    -> checkbox + roadmap name + meta
    .sourcePickerFooter         -> selected count
  .modalActions
    .ghostBtn "Cancel"
    .createBtn "Create Portfolio"
```

**Label: `.sourcePickerLabel`**
- `font-size: var(--text-xs)` (11px)
- `font-weight: 500`
- `text-transform: uppercase`
- `letter-spacing: 0.05em`
- `color: var(--gray-500)`
- `margin-top: var(--space-5)` (20px)
- `margin-bottom: var(--space-2)` (8px)

**Search input: `.sourcePickerSearch`**
- Same styling as `.searchInput` on the homepage
- `width: 100%`
- `height: 36px`
- `margin-bottom: var(--space-2)` (8px)
- Placeholder: "Search roadmaps..."

**Source list: `.sourceList`**
- `max-height: 240px`
- `overflow-y: auto`
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-md)` (6px)
- `background: var(--white)`

**Source item: `.sourceItem`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-3)` (12px)
- `padding: var(--space-2) var(--space-3)` (8px 12px)
- `border-bottom: 1px solid var(--gray-100)` (last child: none)
- `cursor: pointer`

Content layout per item:
```
[checkbox 18x18]  [roadmap name (text-sm, 500, gray-950)]
                  [owner name (text-xs, gray-500) · item count (text-xs, gray-500)]
```

**Source item states:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `background: var(--gray-50)` |
| Checked | Checkbox filled with `var(--accent-600)`, white checkmark |
| Focus-visible | `outline: 2px solid var(--accent-600)`, `outline-offset: -2px` |

**Checkbox:** Native `<input type="checkbox">` with custom styling.
- `width: 18px`, `height: 18px`
- `border: 1.5px solid var(--gray-300)`
- `border-radius: var(--radius-sm)` (4px)
- Checked: `background: var(--accent-600)`, `border-color: var(--accent-600)`, white checkmark SVG

**Footer: `.sourcePickerFooter`**
- `margin-top: var(--space-2)` (8px)
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-500)`
- Text: "N roadmap(s) selected" (dynamic)

**Create button states:**
| State | Change |
|-------|--------|
| Default | Standard primary button |
| Disabled (fewer than 2 selected, or empty name) | `background: var(--gray-300)`, `color: var(--gray-500)`, `cursor: not-allowed` |
| Disabled tooltip | When fewer than 2 selected, show tooltip on hover: "Select at least 2 roadmaps" |
| Loading | Label becomes "Creating...", button disabled, 14x14 spinner before text |

**Error state:**
- If creation fails, show inline error below the modal actions: `font-size: var(--text-xs)`, `color: var(--error-600)`, text: "Could not create portfolio. Try again."

### 1.3 Homepage: Portfolio Card

Portfolio roadmaps appear in the same grid as standard roadmaps. They are visually distinguished by a badge and icon.

**Card modifications for portfolios:**
Reuses `.card` from `HomePage.module.css` with additions:

```
.card (existing)
  .cardTop (existing)
    .portfolioIcon              -> stacked-layers icon, 16x16, var(--gray-400)
    .cardName (existing)
    .portfolioBadge             -> "Portfolio" label
  .cardMeta (existing)
    .cardDate (existing)
    .sourceCount                -> "N sources" label
```

**Portfolio icon:** Same stacked-layers icon as the "New Portfolio" button. Placed before the card name.
- `width: 16px`, `height: 16px`
- `color: var(--gray-400)`
- `flex-shrink: 0`

**Portfolio badge: `.portfolioBadge`**
- `display: inline-flex`
- `align-items: center`
- `height: 20px`
- `padding: 0 var(--space-2)` (8px)
- `border-radius: var(--radius-full)` (9999px)
- `background: var(--accent-50)` (indigo-50)
- `color: var(--accent-600)` (indigo-600)
- `font-size: var(--text-xs)` (11px)
- `font-weight: 500`
- `text-transform: uppercase`
- `letter-spacing: 0.05em`
- `flex-shrink: 0`

**Source count:** Appears in the `.cardMeta` row.
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-500)`
- Text: "N sources" (e.g., "3 sources")
- Separated from `.cardDate` by a centered dot: ` · `

### 1.4 Portfolio Page: Toolbar Modifications

The portfolio page reuses the existing `RoadmapPage` shell with these modifications:

**Toolbar additions:**

```
.toolbar (existing)
  .toolbarLeft (existing)
    .portfolioBadge             -> same badge as on the card, in the toolbar area
    .ViewSwitcher               -> existing, but only shows Timeline + Swimlane (no Table)
    .FilterBuilder              -> existing
  .toolbarRight (existing)
    .sourcesDropdown            -> NEW: sources visibility toggle
    .PresenceAvatars            -> existing
    .exportCsvBtn               -> hidden for portfolios (no data of its own)
    .importCsvBtn               -> hidden for portfolios
    .presentBtn                 -> existing
    .formatBtn                  -> existing
```

**Items NOT rendered for portfolios:**
- No "Add Item" button (read-only)
- No Import CSV button
- No Export CSV button (portfolio items live in source roadmaps; export from there)

**Sources Dropdown: `.sourcesDropdown`**

A dropdown button in the toolbar that lists all source roadmaps with visibility toggles.

**Trigger button: `.sourcesBtn`**
- Same style as `.formatBtn` (ghost toolbar button, 32px height)
- Icon: eye icon (16x16), label: "Sources"
- `display: flex`, `align-items: center`, `gap: var(--space-1)`
- `color: var(--gray-700)`

**Dropdown panel: `.sourcesPanel`**
- `position: absolute`
- `top: 100%` (below the trigger)
- `right: 0`
- `width: 280px`
- `background: var(--white)`
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-lg)` (8px)
- `box-shadow: var(--shadow-lg)`
- `padding: var(--space-2)` (8px)
- `z-index: 20`

**Source row: `.sourceRow`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)
- `padding: var(--space-2)` (8px)
- `border-radius: var(--radius-sm)` (4px)
- `cursor: pointer`

Content per row:
```
[color dot 10x10]  [source roadmap name (text-sm, gray-950)]  [eye toggle icon]
```

**Color dot: `.sourceColorDot`**
- `width: 10px`, `height: 10px`
- `border-radius: var(--radius-full)`
- `background: {source color from palette}`
- `flex-shrink: 0`

**Eye toggle:** A 16x16 eye icon. When source is visible: `color: var(--gray-700)`. When hidden: `color: var(--gray-300)`, eye-off icon variant.

**Source row states:**
| State | Change |
|-------|--------|
| Default (visible) | As above |
| Hidden | Eye-off icon, source name `color: var(--gray-400)` |
| Hover | `background: var(--gray-50)` |

### 1.5 Portfolio Timeline View

The portfolio timeline reuses the existing `TimelineView` and `TimelineCanvas` components. The key difference: items are color-coded by source roadmap instead of by a field value.

**Color assignment:** Each source roadmap gets a color from the active palette in `sort_order` order. The server returns `sources: { id, name, color }[]` with colors pre-assigned. The frontend uses these directly instead of the `colorByFieldId` logic.

**Item bar modifications for portfolio:**
- The existing `.itemBar` gets its fill color from `source.color` instead of from a field value lookup.
- No behavioral change to the bar rendering -- same SVG rects, same text labels.

**Item bar tooltip (on hover):**
The existing `ItemBarTooltip` component is extended for portfolio items:

```
.tooltipContent
  .tooltipName        -> item name (text-sm, 500, white)
  .tooltipSource      -> "Source: {roadmap name}" (text-xs, gray-300) -- NEW
  .tooltipDates       -> date range (text-xs, gray-300)
  .tooltipStatus      -> status value if exists (text-xs, gray-300)
```

The "Source:" line is added above the dates line. Font: `var(--text-xs)`, `color: rgba(255,255,255,0.7)`.

**Item click behavior:** Clicking an item in the portfolio timeline navigates to the source roadmap with the item card open: `window.location.href = /roadmaps/${sourceRoadmapId}?item=${itemId}`. This opens in the same tab. The Item Card does NOT open within the portfolio.

**No drag-to-move/resize:** The `onItemUpdate` callback is not passed to `TimelineCanvas` for portfolio views. Item bars are not draggable.

**Source legend:** Shown in the `TimelineToolbar` area, below the time scale controls.

**Legend: `.portfolioLegend`**
- `display: flex`
- `flex-wrap: wrap`
- `gap: var(--space-3)` (12px)
- `padding: var(--space-2) var(--space-4)` (8px 16px)
- `border-bottom: 1px solid var(--gray-200)`
- `background: var(--white)`

**Legend item: `.legendItem`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-1)` (4px)
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-700)`

Content: `[color dot 8x8] [source name]`

**Milestones:** Milestones from all source roadmaps appear on the timeline. Each milestone label is prefixed with the source roadmap name in parentheses: "(Marketing) Launch Day". Milestone markers use the same shapes and colors from their source roadmap's milestone types.

### 1.6 Portfolio Swimlane View

The portfolio swimlane reuses the existing `SwimlaneView` component. Default configuration: `columnMode: 'field'` with columns representing source roadmaps (a virtual field).

**When grouped by source roadmap:**
- Each column header shows the source roadmap name
- Column header has a 3px bottom border in the source's assigned color (reuses `.columnHeaderColored` pattern)
- Items appear in their respective source columns

**Swimlane card for portfolio items:**
Same as standard swimlane cards (`.card`), with one addition:

**Source label: `.cardSource`**
- Appears below the card name
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-500)`
- Text: source roadmap name
- Only shown when columns are NOT grouped by source (i.e., when columns represent a shared field like Status)

**Card accent bar:** The 3px left accent bar uses the source roadmap's assigned color instead of a field-based color.

**Click behavior:** Same as timeline -- clicking navigates to the source roadmap. No item card opens in the portfolio.

**No inline creator:** The "+" add button in empty cells is not rendered for portfolio views.

### 1.7 Portfolio Settings

Portfolio settings are accessible via the existing gear icon pattern in the AppShell sidebar or page header. Settings appear in the same location as standard roadmap settings.

**Settings panel for portfolios shows:**

```
.settingsSection
  .settingsSectionTitle "Portfolio Name"
  .settingsInput (name edit)

.settingsSection
  .settingsSectionTitle "Source Roadmaps"
  .sourceManageList              -> list of current sources
    .sourceManageItem (repeated) -> source name + remove button
  .addSourceBtn                  -> "Add Source" button
```

**Section title: `.settingsSectionTitle`**
- Same as existing section label pattern
- `font-size: var(--text-xs)`, `font-weight: 500`, `text-transform: uppercase`, `letter-spacing: 0.05em`, `color: var(--gray-500)`
- `margin-bottom: var(--space-3)` (12px)

**Source manage item: `.sourceManageItem`**
- `display: flex`
- `align-items: center`
- `justify-content: space-between`
- `padding: var(--space-2) var(--space-3)` (8px 12px)
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-md)` (6px)
- `margin-bottom: var(--space-2)` (8px)

Content:
```
[color dot 8x8]  [source name (text-sm, gray-950)]  [drag handle]  [remove btn]
```

**Drag handle:** 16x16 grip icon, `color: var(--gray-300)`. Visible on hover. `cursor: grab`.

**Remove button:** Ghost icon button, 24x24, `color: var(--gray-400)`. X icon. Hover: `color: var(--error-600)`, `background: var(--error-50)`.

**Add source button: `.addSourceBtn`**
- Standard secondary button (same as `.newPortfolioBtn`)
- `height: 32px`
- `font-size: var(--text-sm)`
- Label: "+ Add Source"
- Clicking opens a popover with the same source picker list from the creation dialog (checkboxes, search, multi-select)

### 1.8 Portfolio Empty States

**No items (all sources empty):**
```
.empty
  .emptyText      -> "No items to display"
  .emptySubtext   -> "Add items to the source roadmaps to see them here."
```
Standard empty state styling from `SwimlaneView.module.css`.

**All sources hidden:**
```
.empty
  .emptyText      -> "All sources are hidden"
  .emptySubtext   -> "Toggle a source on to see items."
```

**No sources (all removed):**
```
.empty
  .emptyText      -> "No source roadmaps"
  .emptySubtext   -> "Add source roadmaps in portfolio settings."
  .addSourceBtn   -> "+ Add Source" (primary style)
```

### 1.9 Portfolio Loading States

**Skeleton timeline:** While items are loading, show 6-8 gray placeholder bars (rectangles) across the time axis. Use `background: var(--gray-100)`, `border-radius: var(--radius-md)`, `animation: pulse 1.5s ease-in-out infinite`. Bars should vary in width (120px-300px) and be staggered vertically.

**Progress indicator for 5+ sources:**
- Shown in the toolbar area: `font-size: var(--text-xs)`, `color: var(--gray-500)`
- Text: "Loading items from N roadmaps..."
- Appears alongside a 14x14 spinner

**Error state:**
```
.empty
  .emptyText      -> "Could not load portfolio items"
  .emptySubtext   -> "Try again" (as a text link, color: var(--accent-600), cursor: pointer)
```

**Partial failure (one source failed):**
- A subtle toast/banner at the top of the view content area
- `background: var(--gray-50)`, `border-bottom: 1px solid var(--gray-200)`, `padding: var(--space-2) var(--space-4)`
- `font-size: var(--text-xs)`, `color: var(--gray-500)`
- Text: "1 source roadmap could not be loaded."

### 1.10 Portfolio Responsive Behavior

**Mobile (< 640px):**
- Portfolio creation modal: `width: calc(100vw - var(--space-8))`, `max-width: 520px`
- Source list in creation modal: `max-height: 180px` (shorter to keep modal on screen)
- Timeline/Swimlane: shows `MobileMessage` ("Best on desktop") same as standard roadmap
- Sources dropdown: full-width, anchored to bottom of toolbar

**Tablet (640px-1023px):**
- Portfolio creation modal stays at 520px width
- Legend wraps naturally with `flex-wrap: wrap`
- Source panel overlaps content (absolute positioning is fine on tablet)

**Desktop (> 1024px):**
- Full layout as described

### 1.11 Portfolio Accessibility

- Source picker checkboxes use native `<input type="checkbox">` with proper `<label>` associations
- Each source item has `role="checkbox"`, `aria-checked`, `aria-label="{roadmap name}"`
- Eye toggles in the sources dropdown have `aria-label="Hide {source name}" / "Show {source name}"`, `role="switch"`, `aria-checked`
- Portfolio legend items are informational only (no interaction needed)
- Item bars in portfolio timeline: `role="button"`, `aria-label="{item name} from {source name}"`, keyboard-accessible with Enter/Space
- Color coding is NOT the sole differentiator -- the source name appears in tooltip and in the sources dropdown. Color is supplemental.
- Focus order in creation dialog: name input -> search input -> checkbox list -> Cancel -> Create

---

## 2. RT-33: Collections / Folders

### 2.1 Homepage Layout with Collections

When collections exist, the homepage groups roadmaps into collapsible sections. When no collections exist, the homepage is unchanged (flat grid as today).

**Updated homepage structure:**

```
.page
  .header
    h1 "Roadmaps"
    .headerActions
      .newCollectionBtn           -> "+ New Collection" (ghost)
      .newPortfolioBtn            -> "New Portfolio" (secondary)
      .createBtn                  -> "+ New Roadmap" (primary)
  .searchInput                    -> existing

  .favoritesSection               -> existing, unchanged, always at top if favorites exist

  .collectionSection (repeated)   -> one per collection
    .collectionHeader
      .collectionChevron          -> expand/collapse, 12x12 chevron
      .collectionName             -> collection name
      .collectionCount            -> "(N)" roadmap count
      .collectionDragHandle       -> grip icon, hover-visible
      .collectionMenu             -> three-dot overflow menu
    .collectionBody               -> collapses/expands
      .grid (existing)            -> roadmap cards inside
      .collectionEmpty            -> shown when collection has 0 roadmaps

  .uncategorizedSection           -> roadmaps not in any collection
    .sectionLabel "Uncategorized"
    .grid
```

### 2.2 "New Collection" Button

**Button: `.newCollectionBtn`**
- Ghost button style (same as `.ghostBtn`)
- `height: 36px`
- `padding: 0 var(--space-4)` (16px)
- `background: transparent`
- `color: var(--gray-700)`
- `border: none`
- `border-radius: var(--radius-md)`
- `font-size: var(--text-sm)`
- `font-weight: 500`
- Label: "+ New Collection"

**States:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `background: var(--gray-100)` |
| Active | `background: var(--gray-200)` |
| Focus-visible | `outline: 2px solid var(--accent-600)`, `outline-offset: 2px` |
| Hidden (viewer role) | Not rendered |

**Behavior:** Clicking creates a new collection section at the top of the collections area with the name field in edit mode (inline input, auto-focused).

### 2.3 Collection Section

**Collection header: `.collectionHeader`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)
- `padding: var(--space-2) 0` (8px 0)
- `cursor: pointer` (entire header is clickable to expand/collapse)
- `user-select: none`

**Chevron: `.collectionChevron`**
- 12x12 SVG chevron (right-pointing)
- `color: var(--gray-400)`
- `transition: transform 150ms ease`
- Expanded: `transform: rotate(90deg)`
- Collapsed: `transform: rotate(0deg)`

**Collection name: `.collectionName`**
- `font-size: var(--text-sm)` (13px)
- `font-weight: 600`
- `color: var(--gray-900)`
- `flex: 1` (takes remaining space)

**When in edit mode (rename):**
- Name text is replaced by an inline `<input>`
- `height: 28px`
- `padding: 0 var(--space-2)` (8px)
- `border: 1px solid var(--accent-600)`
- `border-radius: var(--radius-sm)` (4px)
- `font-size: var(--text-sm)`
- `font-weight: 600`
- `color: var(--gray-900)`
- `box-shadow: 0 0 0 2px var(--accent-100)`
- `outline: none`
- `max-width: 240px`
- Enter to save, Escape to cancel
- `maxlength: 100`

**Count badge: `.collectionCount`**
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-400)`
- Text: "(N)" where N is the number of roadmaps in the collection
- `font-weight: 400`

**Drag handle: `.collectionDragHandle`**
- 16x16 grip icon (6 dots, 2x3 grid)
- `color: var(--gray-300)`
- `opacity: 0` by default, `opacity: 1` on `.collectionHeader:hover`
- `cursor: grab`
- `transition: opacity 150ms ease`
- Hidden for viewers

**Overflow menu: `.collectionMenu`**
- 16x16 three-dot vertical icon
- `color: var(--gray-400)`
- `opacity: 0` by default, `opacity: 1` on `.collectionHeader:hover`
- `cursor: pointer`
- `border-radius: var(--radius-sm)`
- Hover: `background: var(--gray-100)`, `color: var(--gray-700)`
- Hidden for viewers

**Overflow menu popover: `.collectionMenuPopover`**
- Same pattern as existing overflow menus throughout the app
- `width: 160px`
- `background: var(--white)`
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-lg)` (8px)
- `box-shadow: var(--shadow-md)`
- `padding: var(--space-1)` (4px)
- `z-index: 20`

**Menu items:**
```
Rename       -> icon: pencil 16x16, text-sm, gray-950
Delete       -> icon: trash 16x16, text-sm, color: var(--error-600)
```

**Menu item: `.menuItem`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)
- `height: 32px`
- `padding: 0 var(--space-2)` (8px)
- `border-radius: var(--radius-sm)` (4px)
- `font-size: var(--text-sm)` (13px)
- `cursor: pointer`
- Hover: `background: var(--gray-50)`
- Delete item hover: `background: var(--error-50)`

### 2.4 Collection Body (Collapsed/Expanded)

**Collapse animation:**
- Use `grid-template-rows: 1fr -> 0fr` CSS Grid trick for smooth animation
- `transition: grid-template-rows 200ms ease`
- Content overflow: `overflow: hidden` during transition
- Respect `prefers-reduced-motion`: `transition: none`

**Collapse state persistence:** Stored in `localStorage` per user. Key: `forge-collections-collapsed`. Value: array of collection IDs that are collapsed.

### 2.5 Collection Empty State

When a collection has no roadmaps:

**`.collectionEmpty`**
- Shown inside the collection body (below the header, within the collapsible region)
- `padding: var(--space-6) var(--space-4)` (24px 16px)
- `text-align: center`
- `color: var(--gray-400)`
- `font-size: var(--text-sm)` (13px)
- `border: 1px dashed var(--gray-200)`
- `border-radius: var(--radius-lg)` (8px)
- `margin-bottom: var(--space-4)` (16px)
- Text: "No roadmaps in this collection. Drag a roadmap here or use the roadmap menu to add one."

### 2.6 Roadmap Card: "Move to Collection" Menu

Each roadmap card on the homepage gets a three-dot overflow menu. This is a new addition to the card component.

**Card overflow button: `.cardMenuBtn`**
- Positioned in the top-right corner of the card
- `position: absolute`, `top: var(--space-3)`, `right: var(--space-3)`
- `width: 24px`, `height: 24px`
- `border-radius: var(--radius-sm)` (4px)
- `display: flex`, `align-items: center`, `justify-content: center`
- `color: var(--gray-400)`
- `opacity: 0` by default
- `.card:hover .cardMenuBtn { opacity: 1 }`
- Hover: `background: var(--gray-100)`, `color: var(--gray-700)`
- `.card` needs `position: relative` (already has it if not, add)

**Card menu popover: `.cardMenuPopover`**
- `width: 220px`
- Same styling as `.collectionMenuPopover`

**Menu item:** "Move to Collection..." with a folder icon (16x16).

Clicking opens a submenu / collection picker popover:

**Collection picker: `.collectionPicker`**
- Replaces the menu or appears as a nested panel
- `width: 220px`
- Header: "Collections" in `font-size: var(--text-xs)`, `font-weight: 500`, `text-transform: uppercase`, `letter-spacing: 0.05em`, `color: var(--gray-500)`, `padding: var(--space-2)` (8px)
- List of collections with checkboxes (multi-select since a roadmap can be in multiple collections)

**Collection checkbox row:**
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)
- `padding: var(--space-2)` (8px)
- `border-radius: var(--radius-sm)` (4px)
- `font-size: var(--text-sm)` (13px)
- `color: var(--gray-950)`
- `cursor: pointer`
- Hover: `background: var(--gray-50)`

**Checkbox:** Same 18x18 custom checkbox as in the portfolio source picker.

**Optimistic behavior:** Checking/unchecking a collection immediately moves the roadmap visually. If the server rejects, revert and show a toast.

### 2.7 Uncategorized Section

Roadmaps not in any collection appear in an "Uncategorized" section at the bottom.

**Section label:** Uses existing `.sectionLabel` pattern.
- Text: "Uncategorized"
- Only shown if at least one roadmap is uncategorized AND at least one collection exists
- If no collections exist, the original flat layout is shown (no "Uncategorized" label)

### 2.8 Delete Collection Confirmation

**Confirmation dialog:** Standard modal pattern.
- `width: 400px`
- Title: "Delete collection?"
- Body: `font-size: var(--text-sm)`, `color: var(--gray-700)`, text: "Roadmaps in this collection will not be deleted. They will appear in Uncategorized."
- Actions: "Cancel" (ghost), "Delete" (destructive style)

**Destructive button: `.deleteBtn`**
- `height: 36px`
- `padding: 0 var(--space-4)` (16px)
- `background: transparent`
- `color: var(--error-600)`
- `border: 1px solid var(--error-600)`
- `border-radius: var(--radius-md)` (6px)
- `font-size: var(--text-sm)` (13px)
- `font-weight: 500`
- Hover: `background: var(--error-50)`
- Active: `background: var(--error-600)`, `color: var(--white)`

### 2.9 Drag and Drop Interactions

**Collection reorder (dragging collection headers):**
- Drag handle appears on hover (grip icon)
- During drag: the dragged collection header gets `opacity: 0.6`, `box-shadow: var(--shadow-md)`
- Drop target indicator: a 2px horizontal line in `var(--accent-600)` appears between collection sections at valid drop positions
- On drop: order updates optimistically, server confirms

**Roadmap reorder within collections (dragging cards):**
- Cards are draggable within and between collection sections
- During drag: card gets `opacity: 0.5`, `box-shadow: var(--shadow-lg)`, `transform: rotate(1deg)` (subtle tilt)
- Drop target: 2px border highlight on the target cell position or collection section
- Dragging a card into a different collection section adds it to that collection (and removes from the source collection if it was the only copy, or keeps it in both if multi-collection)
- On drop: optimistic update, server confirms

**Reduced motion:** When `prefers-reduced-motion: reduce`, skip the rotation and shadow transitions. Instant repositioning.

### 2.10 Collections Loading and Error States

**Creating a collection:**
- Inline name input shows a subtle 14x14 spinner to the right while saving
- On success: input converts to the regular collection header text
- On failure: input border turns `var(--error-600)`, error text below: "Could not create collection. Try again." in `var(--text-xs)`, `var(--error-600)`

**Renaming:**
- Optimistic: name updates immediately
- On failure: reverts to previous name, toast: "Rename failed."

**Adding roadmap to collection:**
- Optimistic: checkbox checks immediately, roadmap moves visually
- On failure: checkbox reverts, toast: "Could not add roadmap to collection."

**Reorder timeout:**
- If reorder fails: toast "Reorder could not be saved." Visual order reverts to server state.

**Toast pattern:** Existing toast system (if one exists) or a simple fixed-bottom-right notification:
- `position: fixed`, `bottom: var(--space-4)`, `right: var(--space-4)`
- `background: var(--gray-900)`, `color: var(--white)`
- `padding: var(--space-3) var(--space-4)` (12px 16px)
- `border-radius: var(--radius-lg)` (8px)
- `box-shadow: var(--shadow-lg)`
- `font-size: var(--text-sm)` (13px)
- `animation: slideUp 200ms ease-out`
- Auto-dismiss after 4 seconds with fade-out

### 2.11 Collections Responsive Behavior

**Mobile (< 640px):**
- Header buttons stack: "+ New Collection" and "New Portfolio" below the title row, full-width
- Collection headers remain functional (tap to expand/collapse)
- Drag reorder: disabled on mobile (touch drag is unreliable for this pattern). Reorder via overflow menu if needed in future.
- Card overflow menu: always visible (no hover on mobile), icon at 24x24 for touch target
- Collection picker: appears as a bottom sheet or full-width popover

**Tablet (640px-1023px):**
- Cards grid: `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`
- Drag reorder: enabled with touch support
- Collection header buttons visible on hover/touch

**Desktop (> 1024px):**
- Full layout as described

### 2.12 Collections Accessibility

- Collection headers use `role="button"`, `aria-expanded="true/false"`, keyboard-accessible with Enter/Space
- Drag handles have `aria-label="Reorder collection"`, `role="button"`
- Card overflow menu: `aria-haspopup="menu"`, `aria-expanded`
- Collection picker checkboxes: `aria-label="Add to {collection name}" / "Remove from {collection name}"`
- Inline rename input: `aria-label="Collection name"`, `role="textbox"`
- Delete confirmation dialog: `role="alertdialog"`, `aria-labelledby`, `aria-describedby`
- Screen reader announcement on collection create: "Collection {name} created"
- Screen reader announcement on roadmap move: "Roadmap moved to {collection name}"

---

## 3. RT-34: Buckets (No-Date Mode)

### 3.1 Roadmap Settings: Planning Mode Toggle

Bucket mode is toggled in roadmap settings. This adds a new section to the existing settings panel.

**Settings section: "Planning Mode"**

```
.settingsSection
  .settingsSectionTitle "Planning Mode"
  .planningModeToggle
    .planningModeOption (active)   -> "Dates" with radio button
    .planningModeOption            -> "Buckets" with radio button
  .planningModeDescription        -> contextual help text
```

**Planning mode option: `.planningModeOption`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-3)` (12px)
- `padding: var(--space-3)` (12px)
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-md)` (6px)
- `cursor: pointer`
- `margin-bottom: var(--space-2)` (8px)

Content per option:
```
[radio 18x18]  [label block]
                 [name (text-sm, 500, gray-950)]
                 [description (text-xs, gray-500)]
```

**Dates option:**
- Label: "Dates"
- Description: "Items have start and end dates. Use Timeline, Swimlane, and Table views."

**Buckets option:**
- Label: "Buckets"
- Description: "Items are organized by time horizons (Now / Next / Later). No specific dates."

**Radio button:** 18x18 circle.
- `border: 1.5px solid var(--gray-300)`
- `border-radius: var(--radius-full)`
- Selected: `border-color: var(--accent-600)`, inner dot `8px` diameter filled with `var(--accent-600)`

**Option states:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `border-color: var(--gray-400)` on the option container |
| Selected | `border-color: var(--accent-600)`, `background: var(--accent-50)` on the option container |
| Disabled ("Dates" when in bucket mode) | `opacity: 0.5`, `cursor: not-allowed`, note below |

**Disabled note (when already in bucket mode):**
- Shown below the "Dates" option
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-400)`
- `font-style: italic`
- Text: "Cannot switch back to date mode. Create a new roadmap to use dates."

### 3.2 Bucket Mode Confirmation Dialog

Triggered when selecting "Buckets" on a date-mode roadmap. This is a destructive action (dates are lost).

**Modal: standard pattern, 440px width**

```
.bucketConfirmModal
  .modalTitle                    -> "Switch to bucket mode?"
  .modalBody                     -> warning text
  .warningBox                    -> yellow warning callout
  .modalActions
    .ghostBtn "Cancel"
    .switchBtn "Switch to Buckets"
```

**Warning box: `.warningBox`**
- `display: flex`
- `gap: var(--space-3)` (12px)
- `padding: var(--space-3)` (12px)
- `background: #FFFBEB` (amber-50)
- `border: 1px solid #FDE68A` (amber-200)
- `border-radius: var(--radius-md)` (6px)
- `margin-bottom: var(--space-5)` (20px)

Content:
```
[warning triangle icon 16x16, color: #D97706]
[warning text block]
  "Items will be organized by buckets instead of dates."
  "Existing date values will be removed."
  "This cannot be undone."
```

Warning text: `font-size: var(--text-sm)` (13px), `color: var(--gray-700)`, `line-height: var(--leading-sm)` (18px). Each sentence on its own line.

**Switch button:** Primary style, `height: 36px`.
- Label: "Switch to Buckets"

**Switch button states:**
| State | Change |
|-------|--------|
| Default | Standard primary button |
| Loading | Label becomes "Switching...", 14x14 spinner, disabled |
| Error | Modal stays open, inline error below actions: "Could not switch to bucket mode. Your dates have not been changed. Try again." |

### 3.3 Bucket Management (Settings)

When a roadmap is in bucket mode, the settings panel shows a "Manage Buckets" section.

```
.settingsSection
  .settingsSectionTitle "Buckets"
  .bucketList
    .bucketItem (repeated)        -> bucket name + overflow menu + drag handle
  .addBucketBtn                   -> "+ Add Bucket" button
  .bucketLimitNote                -> shown when at 10 buckets
```

**Bucket item: `.bucketItem`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)
- `padding: var(--space-2) var(--space-3)` (8px 12px)
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-md)` (6px)
- `margin-bottom: var(--space-2)` (8px)
- `background: var(--white)`

Content:
```
[drag handle 16x16]  [bucket name (text-sm, 500, gray-950)]  [overflow menu 16x16]
```

**Drag handle:** Same as collection drag handle. `color: var(--gray-300)`, visible on hover, `cursor: grab`.

**Bucket name in edit mode:** Same inline input pattern as collection rename.
- `height: 28px`, `max-width: 200px`
- `border: 1px solid var(--accent-600)`, `box-shadow: 0 0 0 2px var(--accent-100)`
- Enter to save, Escape to cancel
- `maxlength: 50`

**Overflow menu:** Same as collection overflow menu.
- Items: "Rename" (pencil icon), "Delete" (trash icon, `color: var(--error-600)`)

**Add bucket button: `.addBucketBtn`**
- Ghost button style
- `height: 32px`
- Label: "+ Add Bucket"
- `color: var(--gray-700)`
- Hover: `background: var(--gray-100)`

**Add bucket button states:**
| State | Change |
|-------|--------|
| Default | As above |
| Disabled (10 buckets) | `opacity: 0.5`, `cursor: not-allowed` |
| Disabled tooltip | "Maximum 10 buckets" |

**Bucket limit note: `.bucketLimitNote`**
- Shown when at 10 buckets
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-400)`
- Text: "Maximum 10 buckets reached."
- `margin-top: var(--space-1)` (4px)

**Delete bucket confirmation:**
- Standard modal, 400px width
- Title: "Delete bucket?"
- Body: "Items in this bucket will become unassigned."
- Actions: "Cancel" (ghost), "Delete" (destructive style)

### 3.4 Swimlane View in Bucket Mode

When a roadmap is in bucket mode and the swimlane view uses `columnMode: 'buckets'`, columns represent buckets instead of fields or dates.

**Column structure:**
```
[Bucket 1: "Now"]  [Bucket 2: "Next"]  [Bucket 3: "Later"]  [Unassigned]
```

**Bucket column header: `.columnHeader` (reused)**
- Same styling as existing column headers: `height: 44px`, `background: var(--gray-50)`, `border-bottom: 1px solid var(--gray-200)`
- `font-size: var(--text-sm)`, `font-weight: 600`, `color: var(--gray-700)`
- Bucket name + item count badge

**Item count in column header:**
- `font-weight: 400`
- `color: var(--gray-400)`
- `margin-left: var(--space-1)` (4px)
- Text: "(N)" where N is the count of items in that bucket

**"Unassigned" column:**
- Same column header styling but with muted treatment
- Name: "Unassigned"
- `color: var(--gray-400)` for the header text (slightly muted vs other buckets)
- `border-bottom: 1px dashed var(--gray-300)` (dashed instead of solid to distinguish from real buckets)

**Swimlane cards in bucket mode:**
- Same card styling as standard swimlane (`.card`)
- No date display (dates do not exist in bucket mode)
- Card shows: name, description (truncated), field chips
- Accent bar color: from `colorByField` (field-based coloring still works in bucket mode)

**Drag between bucket columns:**
- Dragging a card from one bucket column to another reassigns the item's `bucketId`
- During drag: card gets `opacity: 0.5`, `box-shadow: var(--shadow-lg)`
- Drop target column: subtle highlight, `background: var(--accent-50)` on the column header
- On drop: optimistic update, card appears in new column immediately
- Failure: card snaps back, toast: "Could not reassign item."

**Empty bucket column:**
- Shows the existing empty cell pattern with the "+" add button
- Placeholder text in the cell: "Drag items here" in `var(--text-xs)`, `var(--gray-400)`, centered

**No items in any bucket (roadmap has 0 items):**
- Standard empty state: "No items yet. Add an item to get started."

### 3.5 Table View in Bucket Mode

When a roadmap is in bucket mode, the Table view adjusts:

**Hidden columns:** Start Date and End Date columns are not shown. They are removed from the visible columns list.

**Bucket column:**
- Added as a built-in column (not a user-created field column)
- Column header: "Bucket" -- same styling as other table headers
- Cell content: a dropdown/select showing the current bucket name

**Bucket cell dropdown: `.bucketDropdown`**
- Standard inline dropdown pattern
- `height: 32px`
- `padding: 0 var(--space-2)` (8px)
- `border: none` (borderless in default state, border on focus)
- `font-size: var(--text-sm)` (13px)
- `color: var(--gray-950)`
- `background: transparent`
- `cursor: pointer`
- `border-radius: var(--radius-sm)` (4px)

**Dropdown states:**
| State | Change |
|-------|--------|
| Default | Bucket name displayed, no border |
| Hover | `background: var(--gray-50)` |
| Open | `border: 1px solid var(--accent-600)`, `box-shadow: 0 0 0 2px var(--accent-100)`, dropdown panel appears below |
| Unassigned | Text: "Unassigned" in `color: var(--gray-400)`, `font-style: italic` |

**Dropdown options panel:**
- Same styling as other dropdown panels in the app
- `width: 160px`, `max-height: 240px`
- `background: var(--white)`, `border: 1px solid var(--gray-200)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-md)`
- Lists all buckets in sort order + "Unassigned" at the bottom
- Selected bucket has a checkmark icon and `background: var(--accent-50)`

**Sorting by Bucket:** Sorts by `bucket.sortOrder`. Unassigned items sort last.

**Filtering by Bucket:** The existing filter builder supports a "Bucket" pseudo-field. Filter options list all bucket names + "Unassigned."

### 3.6 Item Card in Bucket Mode

When a roadmap is in bucket mode, the Item Card's date section is replaced.

**Hidden:** Start Date and End Date pickers are not rendered. Key Dates section is hidden (key dates are date-specific).

**Bucket field:** Appears in the Fields section of the Item Card left panel.

**Bucket field row: `.bucketField`**
- Same layout as other field rows in the Item Card
- Label: "Bucket" with a columns/kanban icon (16x16, `color: var(--gray-400)`)
- Value: dropdown showing the current bucket name

**Dropdown:** Same pattern as the table bucket dropdown.
- Options: all buckets in sort order + "Unassigned"
- Selecting a bucket updates the item's `bucketId`
- Optimistic: bucket name changes immediately, reverts on failure

### 3.7 Timeline View in Bucket Mode

Timeline view is disabled for bucket-mode roadmaps.

**Disabled state:** When a user tries to create a Timeline view on a bucket-mode roadmap, or when an existing roadmap converts to bucket mode (timeline views are deleted).

**Fallback message for Timeline view tab:**
If the user somehow navigates to a timeline view URL on a bucket-mode roadmap:

```
.bucketTimelineDisabled
  .emptyText      -> "Timeline view requires dates"
  .emptySubtext   -> "This roadmap uses bucket mode. Switch to Swimlane or Table view."
```

Standard empty state styling from `SwimlaneView.module.css`.

**Create View Modal:** When in bucket mode, the "Timeline" option in the Create View Modal is disabled.
- `opacity: 0.5`, `cursor: not-allowed`
- Tooltip: "Timeline view is not available in bucket mode"

### 3.8 Bucket Mode Toast on Transition

When bucket mode is enabled and timeline views are deleted:

**Toast notification:**
- Same toast pattern as collections (fixed bottom-right, gray-900 bg, white text)
- Text: "Timeline view is not available in bucket mode. Switched to Swimlane."
- Auto-dismiss after 5 seconds

### 3.9 Bucket Mode Responsive Behavior

**Mobile (< 640px):**
- Swimlane in bucket mode: `MobileMessage` ("Best on desktop") + mobile list fallback (same as standard swimlane mobile)
- Table in bucket mode: bucket column dropdown works as a native `<select>` on mobile for better UX
- Item Card bucket field: full-width dropdown
- Settings: planning mode options stack vertically, full-width

**Tablet (640px-1023px):**
- Swimlane: columns may be narrower (`min-width: 160px` instead of `200px`)
- Bucket management in settings: full-width within the settings panel

**Desktop (> 1024px):**
- Full layout as described

### 3.10 Bucket Mode Accessibility

- Planning mode radio buttons: `role="radiogroup"`, individual options `role="radio"`, `aria-checked`
- Confirmation dialog: `role="alertdialog"`, `aria-labelledby`, `aria-describedby`
- Bucket column headers in swimlane: `role="columnheader"`, `aria-label="Bucket: {name}"`
- Bucket dropdown in table/item card: native `<select>` or `role="listbox"` with `aria-label="Assign bucket"`
- Drag between bucket columns: `aria-label="Drag to reassign bucket"` on cards, announce "Item moved to {bucket name}" via live region
- Disabled Timeline option in Create View: `aria-disabled="true"`, tooltip text available to screen readers

---

## 4. RT-35: Templates

### 4.1 Template Picker Integration

The "New Roadmap" creation flow changes. Clicking "+ New Roadmap" now opens a template picker dialog instead of the current simple name-input modal.

**Flow:**
1. User clicks "+ New Roadmap"
2. Template picker dialog opens
3. User either selects a template or chooses "Start from scratch"
4. Name input step appears
5. User names the roadmap and clicks "Create"

### 4.2 Template Picker Dialog

**Modal container:**
- `width: 720px` (wider to accommodate the card grid)
- `max-height: 80vh`
- `overflow: hidden` (the content area scrolls)
- All other modal properties from `HomePage.module.css` (overlay, shadow-xl, radius-lg)

```
.templatePickerModal
  .templatePickerHeader
    .modalTitle                  -> "Create a roadmap"
    .closeBtn                    -> 24x24 X icon, top-right
  .templatePickerBody
    .categoryTabs                -> filter tabs
    .templateGrid                -> scrollable grid of template cards
      .scratchCard               -> "Start from scratch" option
      .templateCard (repeated)   -> one per template
  .templatePickerFooter
    .ghostBtn "Cancel"
    .useTemplateBtn "Use Template"
```

### 4.3 Category Tabs

**Tab bar: `.categoryTabs`**
- `display: flex`
- `gap: var(--space-1)` (4px)
- `padding: 0 var(--space-6)` (0 24px)
- `margin-bottom: var(--space-4)` (16px)
- `border-bottom: 1px solid var(--gray-200)`
- `overflow-x: auto` (for mobile horizontal scroll)
- `-webkit-overflow-scrolling: touch`

**Tab: `.categoryTab`**
- `height: 36px`
- `padding: 0 var(--space-3)` (12px)
- `font-size: var(--text-sm)` (13px)
- `font-weight: 500`
- `color: var(--gray-500)`
- `border: none`
- `background: transparent`
- `border-bottom: 2px solid transparent`
- `cursor: pointer`
- `white-space: nowrap`
- `transition: color 150ms ease, border-color 150ms ease`

**Tab states:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `color: var(--gray-700)` |
| Active (selected) | `color: var(--accent-600)`, `border-bottom-color: var(--accent-600)` |
| Focus-visible | `outline: 2px solid var(--accent-600)`, `outline-offset: -2px` |

**Tab values:** "All" (default), "Product", "Agile", "Strategy", "Marketing", "Design", "Engineering", "Sales", "HR", "Operations"

Only tabs that have at least one template are shown. "All" always shows. Order follows the list above.

### 4.4 Template Grid

**Grid: `.templateGrid`**
- `display: grid`
- `grid-template-columns: repeat(3, 1fr)`
- `gap: var(--space-4)` (16px)
- `padding: 0 var(--space-6) var(--space-6)` (0 24px 24px)
- `overflow-y: auto`
- `max-height: calc(80vh - 160px)` (header + tabs + footer height subtracted)

### 4.5 "Start from Scratch" Card

**Card: `.scratchCard`**
- First position in the grid (top-left), always visible regardless of category filter
- `background: var(--gray-50)`
- `border: 2px dashed var(--gray-300)`
- `border-radius: var(--radius-xl)` (12px)
- `padding: var(--space-6)` (24px)
- `display: flex`
- `flex-direction: column`
- `align-items: center`
- `justify-content: center`
- `gap: var(--space-3)` (12px)
- `min-height: 160px`
- `cursor: pointer`
- `transition: border-color 150ms ease, background 150ms ease`

Content:
```
[plus icon 32x32, color: var(--gray-400)]
"Start from scratch" (text-sm, 600, gray-700)
"Empty roadmap, you set it up" (text-xs, gray-500)
```

**States:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `border-color: var(--gray-400)`, `background: var(--white)` |
| Selected | `border-color: var(--accent-600)`, `border-style: solid`, `background: var(--accent-50)` |
| Focus-visible | `outline: 2px solid var(--accent-600)`, `outline-offset: 2px` |

### 4.6 Template Card

**Card: `.templateCard`**
- `background: var(--white)`
- `border: 2px solid var(--gray-200)`
- `border-radius: var(--radius-xl)` (12px)
- `padding: var(--space-5)` (20px)
- `cursor: pointer`
- `min-height: 160px`
- `display: flex`
- `flex-direction: column`
- `gap: var(--space-2)` (8px)
- `transition: border-color 150ms ease, box-shadow 150ms ease`

```
.templateCard
  .templateCardHeader
    .templateIcon                -> category-specific icon, 32x32
    .templateCategoryBadge       -> category label badge
  .templateCardBody
    .templateName                -> template name
    .templateDescription         -> one-line description
  .templateCardFooter
    .templateItemCount           -> "N items" label
```

**Template icon: `.templateIcon`**
- `width: 32px`, `height: 32px`
- `border-radius: var(--radius-md)` (6px)
- `display: flex`, `align-items: center`, `justify-content: center`
- Background and icon color by category:

| Category | Background | Icon Color | Icon |
|----------|-----------|------------|------|
| Product | `#EEF2FF` (indigo-50) | `#4F46E5` (indigo-600) | Rocket 20x20 |
| Agile | `#F0FDF4` (green-50) | `#16A34A` (green-600) | Zap/sprint 20x20 |
| Strategy | `#FFF7ED` (orange-50) | `#EA580C` (orange-600) | Target 20x20 |
| Marketing | `#FDF2F8` (pink-50) | `#DB2777` (pink-600) | Megaphone 20x20 |
| Design | `#F5F3FF` (violet-50) | `#7C3AED` (violet-600) | Palette 20x20 |
| Engineering | `#EFF6FF` (blue-50) | `#2563EB` (blue-600) | Code 20x20 |
| Sales | `#ECFDF5` (emerald-50) | `#059669` (emerald-600) | TrendingUp 20x20 |
| HR | `#FEF3C7` (amber-50) | `#D97706` (amber-600) | Users 20x20 |
| Operations | `#F1F5F9` (slate-50) | `#475569` (slate-600) | Settings/gear 20x20 |

**Category badge: `.templateCategoryBadge`**
- Same badge pattern as `.portfolioBadge` but with category-appropriate colors
- `height: 20px`
- `padding: 0 var(--space-2)` (8px)
- `border-radius: var(--radius-full)` (9999px)
- `font-size: var(--text-xs)` (11px)
- `font-weight: 500`
- `text-transform: capitalize` (not uppercase -- category names are readable words)
- Background and text color from the category color pairs above (50 bg, 600 text)

**Template name: `.templateName`**
- `font-size: var(--text-sm)` (13px)
- `font-weight: 600`
- `color: var(--gray-950)`

**Template description: `.templateDescription`**
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-500)`
- `display: -webkit-box`
- `-webkit-line-clamp: 2`
- `-webkit-box-orient: vertical`
- `overflow: hidden`
- `line-height: var(--leading-xs)` (16px)

**Item count: `.templateItemCount`**
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-400)`
- `margin-top: auto` (pushes to bottom of card)
- Text: "N items" (e.g., "15 items")

**Card states:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `border-color: var(--gray-300)`, `box-shadow: var(--shadow-md)` |
| Selected | `border-color: var(--accent-600)`, `box-shadow: 0 0 0 1px var(--accent-600)` (double border effect) |
| Focus-visible | `outline: 2px solid var(--accent-600)`, `outline-offset: 2px` |

### 4.7 Template Picker Footer

**Footer: `.templatePickerFooter`**
- `display: flex`
- `justify-content: flex-end`
- `gap: var(--space-2)` (8px)
- `padding: var(--space-4) var(--space-6)` (16px 24px)
- `border-top: 1px solid var(--gray-200)`
- `background: var(--white)`

**"Use Template" button: `.useTemplateBtn`**
- Standard primary button, 36px height
- Label: "Use Template" (when a template is selected) / "Continue" (when scratch is selected)

**States:**
| State | Change |
|-------|--------|
| Default | Standard primary |
| Disabled (nothing selected) | `background: var(--gray-300)`, `color: var(--gray-500)` |
| Hover | `background: var(--accent-500)` |

### 4.8 Name Input Step

After selecting a template (or scratch), the dialog transitions to the name input step.

**Transition:** The template grid content fades out (`opacity: 1 -> 0`, 150ms) and the name input content fades in (`opacity: 0 -> 1`, 150ms). Modal width animates to `440px` (from 720px) over `200ms ease`.

With `prefers-reduced-motion: reduce`, skip the width animation. Instant switch.

**Name input step layout:**

```
.nameStep
  .nameStepHeader
    .backBtn                     -> arrow-left icon, returns to template grid
    .nameStepTitle               -> "Name your roadmap" or "Name your roadmap (from {template name})"
  .nameStepBody
    .modalInput                  -> name input, pre-filled with template name or "Untitled Roadmap"
    .nameStepHint                -> "(template name)" label showing what was selected
  .modalActions
    .ghostBtn "Cancel"
    .createBtn "Create"
```

**Back button: `.backBtn`**
- Ghost icon button, 32x32
- Arrow-left icon, 16x16
- `color: var(--gray-500)`
- Hover: `background: var(--gray-100)`, `color: var(--gray-700)`

**Name step title:** If a template was selected: "Name your roadmap". No need to repeat the template name in the title since it's pre-filled in the input and shown in the hint.

**Name step hint: `.nameStepHint`**
- Shown below the input when a template was selected
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-500)`
- `margin-top: var(--space-1)` (4px)
- Text: "Using template: {template name}" (e.g., "Using template: Product Launch")
- Not shown for "Start from scratch"

**Name input:**
- Pre-filled: template name (editable) for templates, "Untitled Roadmap" for scratch
- `autoFocus`
- Same `.modalInput` styling as existing create-roadmap modal
- `maxlength: 200`

**Create button states:**
| State | Change |
|-------|--------|
| Default | Standard primary |
| Disabled (empty name) | `background: var(--gray-300)`, `color: var(--gray-500)` |
| Loading (creating) | Label: "Creating...", 14x14 spinner, disabled |

### 4.9 Template Loading States

**Skeleton cards:** While the template list loads, show 6 skeleton placeholder cards in the grid.
- Same dimensions as `.templateCard`
- `background: var(--gray-100)`
- `border: 2px solid var(--gray-100)` (no visible border)
- `border-radius: var(--radius-xl)`
- `animation: pulse 1.5s ease-in-out infinite`
- Internal skeleton shapes: one 32x32 rect (icon), one 60% width rect (name), one 80% width rect (description)

**Template load failure:**
```
.templateLoadError
  .emptyText      -> "Could not load templates"
  .emptySubtext   -> "Start from scratch or try again."
  .templateLoadErrorActions
    .ghostBtn "Try Again"
    .createBtn "Start from Scratch"
```
- Standard empty state centered in the grid area
- "Start from Scratch" button creates a blank roadmap (bypasses template selection)
- "Try Again" re-fetches the template list

**Creation loading (with template):**
- Create button shows "Creating..." with spinner
- Template seeding may take 1-2 seconds
- On success: navigate to new roadmap, toast "Roadmap created from template."
- On failure: inline error "Could not create roadmap. Try again." (if roadmap creation itself failed)
- On partial failure (template seeding failed): roadmap created empty, toast "Template could not be applied. Your roadmap was created empty."

### 4.10 Template Picker Responsive Behavior

**Mobile (< 640px):**
- Modal: `width: 100%`, `height: 100%`, `border-radius: 0` (full-screen modal on mobile)
- Grid: `grid-template-columns: 1fr` (single column)
- Category tabs: horizontal scroll with `-webkit-overflow-scrolling: touch`
- Cards: full-width, `min-height: 120px`
- Name step: modal stays full-screen, `width: 100%`

**Tablet (640px-1023px):**
- Modal: `width: 640px`
- Grid: `grid-template-columns: repeat(2, 1fr)` (2 columns)
- Category tabs: wrap if needed

**Desktop (> 1024px):**
- Full layout as described (720px modal, 3-column grid)

### 4.11 Template Picker Accessibility

- Template cards: `role="radio"`, `aria-checked`, `aria-label="{template name}: {description}"`
- Template grid: `role="radiogroup"`, `aria-label="Choose a template"`
- Category tabs: `role="tablist"`, individual tabs `role="tab"`, `aria-selected`
- Keyboard navigation: Tab moves between cards, Enter/Space selects, arrow keys move between cards in the grid
- Screen reader: when a card is selected, announce "{template name} selected. Press Enter to continue."
- Back button in name step: `aria-label="Back to template selection"`
- Close button: `aria-label="Close dialog"`
- Loading state: `aria-busy="true"` on the grid area, `aria-label="Loading templates"`
- Skeleton cards: `aria-hidden="true"`

---

## 5. Shared Patterns

### 5.1 Toast Notification Component

If a toast component does not already exist, this sprint needs one. Multiple features use toasts for error recovery and confirmations.

**Toast: `.toast`**
- `position: fixed`
- `bottom: var(--space-4)` (16px)
- `right: var(--space-4)` (16px)
- `max-width: 360px`
- `background: var(--gray-900)`
- `color: var(--white)`
- `padding: var(--space-3) var(--space-4)` (12px 16px)
- `border-radius: var(--radius-lg)` (8px)
- `box-shadow: var(--shadow-lg)`
- `font-size: var(--text-sm)` (13px)
- `line-height: var(--leading-sm)` (18px)
- `z-index: 100`
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)

**Entry animation:** `transform: translateY(16px) -> translateY(0)`, `opacity: 0 -> 1`, `200ms ease-out`

**Exit animation:** `opacity: 1 -> 0`, `150ms ease-in`

**Auto-dismiss:** After 4 seconds (5 seconds for longer messages). A thin progress bar at the bottom of the toast shows remaining time:
- `height: 2px`, `background: rgba(255,255,255,0.3)`, `width: 100% -> 0%` over the dismiss duration

**Reduced motion:** No slide animation. Instant appear/disappear with opacity only.

**Stacking:** Multiple toasts stack upward from the bottom. Each toast above the previous gets `bottom: {previous bottom + previous height + 8px}`.

**Error variant:** Add a small 16x16 warning-circle icon before the text, `color: #FCA5A5` (red-300). No background color change -- the dark toast already provides sufficient contrast.

**Success variant:** Add a small 16x16 check-circle icon, `color: #86EFAC` (green-300).

### 5.2 Confirmation Dialog Pattern

Multiple features use confirmation dialogs (delete collection, switch to bucket mode, delete bucket). The pattern:

**Modal:** Standard overlay + modal.
- `width: 400px` (440px for bucket mode confirmation, which has more content)
- `padding: var(--space-6)` (24px)

**Title:** `font-size: var(--text-xl)` (20px), `font-weight: 600`, `color: var(--gray-950)`, `margin-bottom: var(--space-3)` (12px)

**Body:** `font-size: var(--text-sm)` (13px), `color: var(--gray-700)`, `line-height: var(--leading-sm)` (18px), `margin-bottom: var(--space-5)` (20px)

**Actions:** `display: flex`, `justify-content: flex-end`, `gap: var(--space-2)` (8px)

**Standard destructive actions:** "Cancel" (ghost) + "Delete" (destructive outline)

**Non-destructive confirmations (bucket mode switch):** "Cancel" (ghost) + action (primary)

### 5.3 Inline Name Input Pattern

Used for: collection name creation, collection rename, bucket rename.

**Input: `.inlineNameInput`**
- `height: 28px`
- `padding: 0 var(--space-2)` (8px)
- `border: 1px solid var(--accent-600)`
- `border-radius: var(--radius-sm)` (4px)
- `font-size: var(--text-sm)` (13px)
- `font-weight: 600`
- `color: var(--gray-900)`
- `background: var(--white)`
- `box-shadow: 0 0 0 2px var(--accent-100)`
- `outline: none`
- Auto-focused on render
- Enter to save, Escape to cancel, blur to save

**Validation:** If the name is empty on save, show a brief shake animation (`translateX(-4px -> 4px -> 0)`, 200ms) and do not save. If over max length, truncate visually and prevent further input via `maxlength`.

---

## 6. Animation and Transition Summary

All animations follow the project convention: 150ms for micro-interactions, 200-300ms for layout changes.

| Interaction | Duration | Easing | Property |
|------------|----------|--------|----------|
| Button hover bg | 100ms | ease | background-color |
| Card hover shadow | 150ms | ease | box-shadow |
| Collection expand/collapse | 200ms | ease | grid-template-rows |
| Modal open | 200ms | ease-out | opacity + transform (scale 0.95 -> 1) |
| Modal close | 150ms | ease-in | opacity |
| Template picker width change | 200ms | ease | width |
| Template grid fade in/out | 150ms | ease | opacity |
| Toast appear | 200ms | ease-out | opacity + translateY |
| Toast dismiss | 150ms | ease-in | opacity |
| Drag card | 0ms (instant) | n/a | transform (position follows cursor) |
| Drop card | 150ms | ease | opacity, box-shadow |
| Chevron rotate | 150ms | ease | transform |
| Inline input shake | 200ms | ease | translateX |
| Skeleton pulse | 1500ms | ease-in-out | opacity (0.5 -> 1 -> 0.5) |

All animations respect `prefers-reduced-motion: reduce` -- non-essential animations are disabled. Essential state changes (expand/collapse, modal open/close) use instant transitions instead.

---

## 7. Color Palette for Portfolio Source Coding

Portfolio source roadmaps get colors from the active palette. The default palette ("Citrus") assigns colors in this order:

```
Source 1: palette color 0
Source 2: palette color 1
Source 3: palette color 2
...
Source N: palette color (N-1) % paletteLength
```

If the user changes the palette, source colors change accordingly. Colors are deterministic by sort order, not persisted.

The legend shows all sources with their assigned colors. The eye-toggle in the Sources dropdown matches these colors.

---

## 8. Files Changed

This spec covers design for four features across the following UI surfaces:

| Surface | Feature | New Components / Changes |
|---------|---------|------------------------|
| Homepage | RT-32, RT-33 | Portfolio card variant, collection sections, "New Portfolio" button, "New Collection" button, card overflow menu, collection picker |
| Portfolio page | RT-32 | Sources dropdown, legend bar, modified toolbar (no add/import/export), portfolio badge |
| Portfolio Timeline | RT-32 | Source-colored items, source tooltip line, click-through navigation |
| Portfolio Swimlane | RT-32 | Source-colored cards, source label, no inline creator |
| Portfolio Settings | RT-32 | Source management list, add source popover |
| Roadmap Settings | RT-34 | Planning mode toggle, bucket management section |
| Swimlane View | RT-34 | Bucket column mode, drag between buckets |
| Table View | RT-34 | Bucket column, bucket dropdown |
| Item Card | RT-34 | Bucket field (replaces dates), hidden key dates |
| Create View Modal | RT-34 | Disabled Timeline option for bucket mode |
| Template Picker | RT-35 | Full new dialog: category tabs, template grid, scratch card, template cards, name step |
| Toast | All | New shared component for error/success notifications |

---

*Design spec written by Robert (Product Designer). Alice: implement directly from this spec -- CSS values, spacing tokens, typography, and interaction states are specified to the pixel. Nina: drag interactions between bucket columns and between collections are the key micro-interaction surfaces. Soren: template picker grid responsiveness (3 -> 2 -> 1 columns) and collection sections on mobile need attention. Enzo: use Thomas's section 8 test table alongside this spec for visual verification.*
