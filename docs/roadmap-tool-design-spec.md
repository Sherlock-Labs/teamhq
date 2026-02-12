# Roadmap Tool -- Design Spec

**Author:** Robert (Product Designer)
**Date:** February 10, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Dependencies:** `docs/roadmap-tool-requirements.md` (Thomas), `docs/roadmap-tool-tech-approach.md` (Andrei), `docs/roadmap-tool-product-research.md` (Suki), `docs/roadmap-tool-tech-research.md` (Marco)

---

## Overview

Design the complete UI for a roadmap visualization and planning tool -- a full Roadmunk replica. Users create roadmaps, add items with flexible fields, and visualize them in three views: Timeline (time-axis Gantt-style), Swimlane (grid-based cards), and Table (spreadsheet-style). The product includes real-time collaboration, sharing, and PNG export.

This is a standalone SaaS product in its own repo. It gets its own design system -- not TeamHQ's tokens. The visual language targets Linear/Notion-level polish: clean geometry, generous whitespace, restrained color, typography doing the heavy lifting.

---

## Design Principles

1. **Speed is the experience.** Roadmunk users complain about sluggishness. Every interaction -- switching views, opening an item, changing filters -- must feel instant. The UI should never make the user wait. Optimistic updates everywhere, no spinners for sub-200ms operations.
2. **Fewer clicks, more flow.** Roadmunk takes "8 clicks to copy an item across roadmaps." We design for common-action efficiency. Inline editing, keyboard shortcuts, contextual menus. The user should rarely leave the view they are working in.
3. **The timeline is the hero.** Timeline View is the signature feature. It must be the most visually polished, most performant, most delightful view in the product. Design energy concentrates here.
4. **Progressive disclosure.** Simple by default, powerful when you dig in. New users see a clean, focused interface. Power features (custom palettes, sub-headers, field grouping) reveal themselves through the Format Panel, not through UI clutter.
5. **Clarity through hierarchy.** Every screen has one primary action, one primary read area. Use size, weight, and whitespace to create obvious visual hierarchy. No two elements compete for attention.

---

## 1. Design System

### 1.1 Color Palette

The product uses a neutral base with a single accent color. No rainbow -- color is reserved for roadmap item bars, which are user-customizable through palettes.

**Neutrals (zinc scale):**

| Token | Hex | Usage |
|-------|-----|-------|
| `--gray-950` | `#09090B` | Primary text, headings |
| `--gray-900` | `#18181B` | Secondary text |
| `--gray-700` | `#3F3F46` | Tertiary text, labels |
| `--gray-500` | `#71717A` | Placeholder text, disabled |
| `--gray-400` | `#A1A1AA` | Borders (strong) |
| `--gray-300` | `#D4D4D8` | Borders (default) |
| `--gray-200` | `#E4E4E7` | Borders (subtle), dividers |
| `--gray-100` | `#F4F4F5` | Hover backgrounds, alternating rows |
| `--gray-50` | `#FAFAFA` | Sidebar background, panel backgrounds |
| `--white` | `#FFFFFF` | Main content background, cards |

**Accent (indigo):**

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-600` | `#4F46E5` | Primary buttons, links, active states |
| `--accent-500` | `#6366F1` | Hover on primary buttons |
| `--accent-100` | `#E0E7FF` | Selected row highlight, light accent bg |
| `--accent-50` | `#EEF2FF` | Subtle accent backgrounds |

**Semantic:**

| Token | Hex | Usage |
|-------|-----|-------|
| `--success-600` | `#16A34A` | Success messages, green indicators |
| `--warning-500` | `#EAB308` | Warning states |
| `--error-600` | `#DC2626` | Error messages, destructive actions |
| `--error-50` | `#FEF2F2` | Error background |

**Why indigo:** Neutral enough to not fight with roadmap bar colors (which use the 6 palettes). Professional and calm. The same accent family used by Linear, which is our aesthetic benchmark.

### 1.2 Typography

**Font stack:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

Inter is the workhorse. It has excellent legibility at small sizes, tabular figures for the table view, and a professional, clean feel. Load weights 400, 500, and 600 only.

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-2xl` | 24px | 600 | 32px | Page titles (Roadmap name) |
| `--text-xl` | 20px | 600 | 28px | Section headings, panel titles |
| `--text-lg` | 16px | 500 | 24px | Sub-headings, header group labels |
| `--text-base` | 14px | 400 | 20px | Body text, table cells, item names |
| `--text-sm` | 13px | 400 | 18px | Secondary labels, metadata, timestamps |
| `--text-xs` | 11px | 500 | 16px | Badges, tag labels, Timeline bar labels |

**Monospace (for dates/numbers):** `'JetBrains Mono', 'SF Mono', monospace` at `--text-sm` size. Used for date displays and numeric field values in the table.

### 1.3 Spacing Scale

8px base unit. Everything aligns to the 4px sub-grid.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-0` | 0px | -- |
| `--space-1` | 4px | Tight inner padding (badges, tags) |
| `--space-2` | 8px | Default inner padding, icon gaps |
| `--space-3` | 12px | Input padding, small gaps |
| `--space-4` | 16px | Card padding, section gaps |
| `--space-5` | 20px | Medium gaps |
| `--space-6` | 24px | Panel padding, large gaps |
| `--space-8` | 32px | Section separators |
| `--space-10` | 40px | Page-level padding |
| `--space-12` | 48px | Major layout gaps |

### 1.4 Elevation & Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards, subtle lift |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | Modals, slide-out panels |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | Item Card panel |

### 1.5 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, tags, small elements |
| `--radius-md` | 6px | Buttons, inputs, table cells |
| `--radius-lg` | 8px | Cards, panels, modals |
| `--radius-xl` | 12px | Large cards (roadmap cards) |
| `--radius-full` | 9999px | Avatars, pills |

### 1.6 Component Tokens

**Buttons:**

| Variant | Background | Text | Border | Hover bg |
|---------|-----------|------|--------|----------|
| Primary | `--accent-600` | `#FFFFFF` | none | `--accent-500` |
| Secondary | `--white` | `--gray-900` | `--gray-300` | `--gray-50` |
| Ghost | transparent | `--gray-700` | none | `--gray-100` |
| Danger | `--error-600` | `#FFFFFF` | none | `#B91C1C` |

Button sizing: height 32px (default), 36px (medium), 28px (small). Padding: `--space-2` vertical, `--space-3` horizontal. Font: `--text-sm` weight 500. Border-radius: `--radius-md`.

**Inputs:**

| Property | Value |
|----------|-------|
| Height | 36px |
| Padding | `--space-3` horizontal |
| Border | 1px solid `--gray-300` |
| Border (focus) | 1px solid `--accent-600` + 0 0 0 2px `--accent-100` outline |
| Border-radius | `--radius-md` |
| Font | `--text-base` |
| Placeholder | `--gray-500` |

**Dropdowns:**

Max-height 320px with scroll. Each option: height 36px, padding `--space-3`. Selected option: `--accent-50` background. Hover: `--gray-100` background. Search input at top for dropdowns with 8+ options.

### 1.7 Default Color Palettes

These ship as system defaults. Each palette has 8 colors. Colors are assigned to List field values in order.

**Citrus:**
`#FF6B35` `#F7C948` `#7BC950` `#3BCEAC` `#0EAD69` `#EE6C4D` `#E76F51` `#2A9D8F`

**Groovy:**
`#A855F7` `#EC4899` `#F97316` `#EAB308` `#22C55E` `#06B6D4` `#3B82F6` `#8B5CF6`

**Pastel:**
`#FDA4AF` `#FDBA74` `#FDE68A` `#BBF7D0` `#A5F3FC` `#C4B5FD` `#F9A8D4` `#D9F99D`

**Autumn:**
`#B91C1C` `#C2410C` `#A16207` `#4D7C0F` `#0F766E` `#1E40AF` `#6D28D9` `#9F1239`

**Neon:**
`#FF0080` `#FF00FF` `#8B00FF` `#00BFFF` `#00FF7F` `#FFFF00` `#FF4500` `#7FFF00`

**Ocean:**
`#1E3A5F` `#2563EB` `#3B82F6` `#0EA5E9` `#06B6D4` `#14B8A6` `#0D9488` `#60A5FA`

---

## 2. Application Shell

### 2.1 Layout Structure

```
+--[ Sidebar ]--+--[ Main Content Area ]---------------------------+
|               |  [ Top Bar                                       ]|
| Logo          |  +-[ Breadcrumbs ]---------[ Actions ]----------+ |
|               |  |                                               | |
| Nav Items     |  |  [ View Content ]                             | |
|               |  |                                               | |
|               |  |                                               | |
|               |  |                                     [ Format  | |
|               |  |                                      Panel ]  | |
+---------------+--+-----------------------------------------------+
```

### 2.2 Sidebar

**Width:** 240px (collapsed: 48px).
**Background:** `--gray-50`.
**Border-right:** 1px solid `--gray-200`.
**Padding:** `--space-4` all sides.

**Contents (top to bottom):**

1. **Logo area:** Product logo or wordmark. Height 48px. Bottom margin `--space-6`.
2. **Workspace switcher:** Clerk `<OrganizationSwitcher />`. Full width. Below the logo.
3. **Nav section:**
   - "Roadmaps" link (house icon) -- navigates to Roadmaps Homepage
   - Divider (`--gray-200`, 1px)
   - "Account Settings" link (gear icon) -- Clerk `<OrganizationProfile />`
4. **User menu (bottom):** Avatar + name. Click opens profile dropdown.

**Nav item styling:** Height 36px. Padding `--space-3` horizontal. Border-radius `--radius-md`. Text: `--text-sm` weight 500. Color: `--gray-700`. Active: `--accent-50` background, `--accent-600` text. Hover: `--gray-100` background.

**Collapse behavior:** Sidebar collapses to 48px wide showing only icons. Toggle button (double-chevron) at the bottom of the sidebar. Collapse state persists in localStorage.

### 2.3 Top Bar

**Height:** 52px.
**Background:** `--white`.
**Border-bottom:** 1px solid `--gray-200`.
**Padding:** 0 `--space-6`.
**Display:** flex, align-items: center, justify-content: space-between.

**Left section (inside a roadmap):**
1. **Breadcrumbs:** "Roadmaps" (link) > "Roadmap Name" (editable on click) > "View Name"
   - Breadcrumb separator: `/` in `--gray-400`
   - "Roadmap Name" becomes an inline text input on click (press Enter to save, Escape to cancel)
   - Font: `--text-sm`, color `--gray-700` for links, `--gray-950` for current

2. **View switcher:** Dropdown button showing current view name + chevron-down icon. Click opens a dropdown listing all views with:
   - Each view shows: icon (table/timeline/swimlane icon), name, filter badge count
   - "Add New View" option at the bottom with + icon
   - Edit (rename), Delete on hover (three-dot menu per view)
   - Cannot delete the last remaining view

**Right section:**
1. **Presence avatars** (when collaborating): Stacked circles (28px diameter), max 4 visible + "+N" overflow. Each avatar shows the user's Clerk avatar. Hover tooltip: "Name -- viewing View Name".
2. **Share button:** Secondary button, "Share" label.
3. **Export button:** Secondary button, download icon.
4. **Format button:** Ghost button, sliders icon. Toggles the Format Panel.
5. **Settings:** Gear icon button. Opens roadmap settings.

### 2.4 Breadcrumbs

On the Roadmaps Homepage, no breadcrumbs (the page title serves as the location indicator).

Inside a roadmap:
```
Roadmaps  /  My Product Roadmap  /  Q1 Timeline
```

Each segment is a link except the last (current location). `--text-sm`, `--gray-700` for links, `--gray-950` for the current segment.

### 2.5 Global Search (Cmd+K)

Keyboard shortcut `Cmd/Ctrl + K` opens a centered modal search input.

**Modal:** 560px wide, vertically centered in the top third. `--shadow-xl`. `--radius-lg`. White background.

**Search input:** Full-width, no border, 48px height, `--text-lg` font. Placeholder: "Search roadmaps and items..."

**Results:** Grouped by type ("Roadmaps", "Items"). Each result shows: icon + name + parent roadmap name (for items). Max 8 results visible (scrollable). Arrow keys to navigate, Enter to select, Escape to close.

**Empty state:** "No results for 'query'" in `--gray-500`.

---

## 3. Roadmaps Homepage

### 3.1 Page Layout

**Page title:** "Roadmaps" in `--text-2xl`, top-left. Beside it: a "New Roadmap" primary button (+ icon).

**Search bar:** Below the title. Full-width, max-width 480px. Placeholder: "Search roadmaps..." Debounced 300ms.

**Three sections, stacked vertically:**

1. **Favorites** (only shown if user has favorites): Grid of roadmap cards. Section label: "Favorites" with star icon, `--text-sm` uppercase tracking-wide `--gray-500`.

2. **My Roadmaps:** Grid of roadmap cards the user created or owns.

3. **Shared with Me:** Grid of roadmap cards shared with the user by others.

4. **Recently Viewed:** Horizontal scrolling row of smaller cards (last 5 viewed).

### 3.2 Roadmap Card

**Size:** Responsive grid. Min-width 280px per card, max 3 columns. Gap: `--space-4`.

**Card styling:**
- Background: `--white`
- Border: 1px solid `--gray-200`
- Border-radius: `--radius-xl`
- Padding: `--space-5`
- Shadow: `--shadow-sm`
- Hover: `--shadow-md` transition (150ms ease)

**Card content:**
1. **Top row:** Roadmap name (`--text-lg`, `--gray-950`, truncate with ellipsis at 2 lines) + favorite toggle (star icon, right-aligned; filled gold `#EAB308` when favorited, `--gray-400` outline when not).
2. **Middle row:** Owner name (`--text-sm`, `--gray-500`) + avatar (20px circle).
3. **Bottom row:** "Last modified 2 hours ago" (`--text-xs`, `--gray-500`) + view count badge ("3 views", `--text-xs`, `--gray-100` bg, `--gray-700` text, `--radius-full`).

**Click:** Opens the roadmap, landing on the last-viewed view (or Table View if first visit).

**Context menu (right-click or three-dot icon on hover):**
- Rename
- Duplicate
- Delete (Owner only, with confirmation dialog)

### 3.3 Create Roadmap Flow

Click "New Roadmap" button opens a centered modal dialog.

**Modal:** 400px wide. `--shadow-xl`. `--radius-lg`.

**Content:**
1. Title: "Create Roadmap" (`--text-xl`)
2. Name input: text input, placeholder "Untitled Roadmap", autofocused
3. Footer: "Cancel" (ghost button) + "Create" (primary button, disabled while name is empty)

**On create:** Modal closes, user lands on the new roadmap's Table View with an empty state.

### 3.4 States

**Loading:** 6 skeleton cards (pulsing `--gray-100` background, rounded rectangles matching card layout).

**Empty:** Centered illustration (simple line art, optional) + "No roadmaps yet" (`--text-lg`, `--gray-900`) + "Create your first roadmap to get started" (`--text-base`, `--gray-500`) + "New Roadmap" primary button.

**Error:** "Failed to load roadmaps" (`--text-base`, `--gray-900`) + "Try again" text button below. Red-tinted background card (`--error-50`).

**Search no results:** "No roadmaps matching 'query'" (`--text-base`, `--gray-500`).

---

## 4. Table View

### 4.1 Layout

The Table View fills the full content area below the Top Bar. No side padding -- the table stretches edge to edge (minus the sidebar).

```
+---+--------------------+----------+---------+--------+----------+
| # | Name               | Status   | Quarter | Owner  | Start    |
+---+--------------------+----------+---------+--------+----------+
|   | Mobile App Launch  | Planned  | Q1 2026 | Sarah  | Jan 15   |
+---+--------------------+----------+---------+--------+----------+
|   | API Redesign       | Active   | Q2 2026 | James  | Mar 01   |
+---+--------------------+----------+---------+--------+----------+
|   + (Add item)         |          |         |        |          |
+---+--------------------+----------+---------+--------+----------+
                          Footer: "23 items (5 filtered)"
```

### 4.2 Table Structure

**Header row:**
- Height: 36px
- Background: `--gray-50`
- Border-bottom: 1px solid `--gray-200`
- Text: `--text-xs`, weight 500, `--gray-500`, uppercase, letter-spacing 0.05em
- Sticky top (stays visible on scroll)

**Column header interactions:**
- Click: Sort by this column (toggle asc/desc). Show a small arrow indicator.
- Drag handle (left edge): Reorder columns via drag-and-drop.
- Right-click or kebab menu: Hide column.

**Data rows:**
- Height: 40px
- Border-bottom: 1px solid `--gray-100`
- Text: `--text-base`, `--gray-950`
- Hover: `--gray-50` background
- Selected: `--accent-50` background

**Checkbox column (first column):**
- Width: 40px
- Centered checkbox. Unchecked: `--gray-300` border. Checked: `--accent-600` fill with white checkmark.
- Header checkbox: Select all / deselect all.

**Name column:**
- Min-width: 240px
- Text: `--text-base`, weight 500, `--gray-950`
- Click the name: Opens Item Card detail panel
- The name acts as a link: cursor pointer, underline on hover

**Field columns (dynamic):**
- Each field type renders differently:
  - **List (single-select):** Colored pill badge. Background is the field value's assigned color at 15% opacity; text is the color at full saturation darkened for contrast. Border-radius: `--radius-full`. Padding: `--space-1` `--space-2`.
  - **Multi-select:** Multiple pill badges, wrapping if needed.
  - **Numeric:** Right-aligned, monospace font. Currency: "$1,200". Percentage: "45%".
  - **Text:** Left-aligned, truncated with ellipsis.
  - **Date:** Monospace, format "MMM DD, YYYY" (e.g., "Jan 15, 2026").
  - **Team Member:** Avatar (20px) + name.

### 4.3 Inline Editing

Click any cell to enter edit mode. The cell expands slightly (2px border in `--accent-600`) and shows the appropriate editor:

- **List field:** Dropdown appears below the cell. Search input at top if 8+ values. Each option shows name + color dot.
- **Multi-select:** Same dropdown but with checkboxes. Selected values shown as pills above the dropdown.
- **Text:** Inline text input replaces the cell content.
- **Numeric:** Inline number input with step controls.
- **Date:** Date input field that accepts typed text ("Jan 15, 2026" or "2026-01-15") AND a calendar icon button that opens a date picker popover. The typed input is the primary interaction (faster than calendar-only, addressing Roadmunk user complaint).
- **Team Member:** Dropdown of org members with avatars.

**Save:** Click outside the cell or press Tab/Enter. Changes save immediately (auto-save with 500ms debounce, optimistic update).

**Cancel:** Press Escape to revert to previous value.

**Error:** If server rejects the change, the cell flashes red briefly (`--error-50` background, 300ms fade) and reverts to the previous value. A small tooltip shows the error message.

### 4.4 Inline Item Creation

Hover between any two rows to reveal a `+` button (centered, 24px circle, `--accent-600` background, white `+` icon). Click it to insert a new row at that position.

The new row appears with the Name cell in edit mode (text input, autofocused). Type a name and press Enter to create. Press Escape to cancel (row disappears). The item is created optimistically -- it appears in the table immediately and syncs to the server in the background.

A persistent `+ Add item` row at the bottom of the table also allows creation. Click the row to focus the name input.

### 4.5 Arrow Key Navigation

Spreadsheet-style navigation when not in edit mode:

- **Arrow keys:** Move the active cell highlight (2px `--accent-600` border) up/down/left/right.
- **Enter:** Start editing the active cell. If already editing, save and move down.
- **Tab:** Move to the next cell (right). Shift+Tab: move left.
- **Escape:** Cancel editing. If not editing, clear the active cell.

Active cell highlight: 2px solid `--accent-600` border, `--accent-50` background.

### 4.6 Bulk Select

When one or more checkboxes are checked, a floating action bar appears at the bottom of the table:

**Action bar:** Fixed to the bottom center. Background: `--gray-900`. Color: white. Border-radius: `--radius-lg`. Padding: `--space-3` `--space-5`. `--shadow-lg`.

**Content:** "N items selected" + "Delete" button (red text). "Deselect All" link.

Max 100 items per bulk delete action. If more than 100 selected, show "Select up to 100 items for bulk actions."

**Delete confirmation:** "Delete N items? This action cannot be undone." with "Cancel" and "Delete" (danger button).

### 4.7 Column Management

A "Columns" button (ghost button with columns icon) in the toolbar area opens a popover listing all fields:

- Each field shows: drag handle + checkbox (visible/hidden) + field name + field type icon
- Drag to reorder columns
- Toggle checkbox to show/hide
- "Name" column cannot be hidden (checkbox disabled)

### 4.8 Table Footer

Fixed at the bottom. Height: 32px. Background: `--gray-50`. Border-top: 1px solid `--gray-200`. Padding: 0 `--space-4`.

Content: "23 items" (or "23 items (5 filtered)" when filters are active). `--text-xs`, `--gray-500`.

### 4.9 Milestones Table Tab

A tab switcher above the table: "Items" | "Milestones". Default is Items.

The Milestones tab shows a similar table with columns: Name, Date, Milestone Type. Same inline editing behavior. Creating a milestone inline requires: name (text input), date (date picker), type (dropdown of milestone types).

---

## 5. Timeline View

This is the hero feature. It must be the most visually refined view.

### 5.1 Overall Layout

```
+---------------------------------------------------------------------+
| [ Time Scale: Months v ]  [ Compact/Spacious ]  [ Date Range ]      |  <- Timeline Toolbar
+--------+------------------------------------------------------------+
|        |  Jan     Feb     Mar     Apr     May     Jun     Jul        |  <- Time Axis
+--------+------------------------------------------------------------+
| Product|  [=== Mobile App Launch ===]                                |
|        |       [=== API Redesign ==========]                         |
+--------+------------------------------------------------------------+
| Design |  [== Brand Refresh ==]                                      |
|        |         [=== Design System v2 ============]                 |
|        |                               ◆ Launch                      |  <- Milestone
+--------+------------------------------------------------------------+
| Eng    |     [=== Infrastructure Upgrade ===========]                |
|        |  [== Security Audit ==]                                     |
+--------+------------------------------------------------------------+
|                    ↕ Today                                           |  <- Today Marker
+---------------------------------------------------------------------+
| [======= Time Slider =======]                                       |  <- Time Slider
+---------------------------------------------------------------------+
```

### 5.2 Time Axis

**Position:** Fixed to the top of the timeline area (sticky). Scrolls horizontally with the content.

**Height:** 48px.
**Background:** `--white`.
**Border-bottom:** 1px solid `--gray-200`.

**Two-row header:**
- **Top row (major):** Shows the broader time unit. For "Months" scale: year labels ("2026", "2027"). For "Quarters" scale: year labels. Height 20px. `--text-xs`, `--gray-500`, weight 500.
- **Bottom row (minor):** Shows the individual time units. For "Months" scale: month abbreviations ("Jan", "Feb", "Mar"). For "Quarters" scale: "Q1", "Q2", "Q3", "Q4". Height 28px. `--text-sm`, `--gray-700`, weight 500.

**Grid lines:** Vertical lines at each minor time unit boundary. Color: `--gray-100`. Extend full height of the timeline.

**Time scale options and their display ranges:**
- Weeks: up to 2 years. Minor ticks = week numbers, Major ticks = month names.
- Months: up to 5 years. Minor ticks = month abbreviations, Major ticks = year.
- Quarters: up to 8 years. Minor ticks = Q1-Q4, Major ticks = year.
- Halves: up to 15 years. Minor ticks = H1/H2, Major ticks = year.
- Years: unlimited. Minor ticks = year numbers.

### 5.3 Header Groups (Left-Side Labels)

**Width:** 200px fixed (resizable via drag handle on the right edge).
**Background:** `--white`.
**Border-right:** 1px solid `--gray-200`.
**Position:** Sticky left (stays visible during horizontal scroll).

**Header labels:**
- Padding: `--space-3` `--space-4`.
- Text: `--text-base`, weight 500, `--gray-950`.
- Chevron icon (right of text): Click to collapse/expand the group. Rotates 90deg on collapse.
- Bottom border: 1px solid `--gray-200`.
- Background alternation: odd groups `--white`, even groups `--gray-50` (subtle differentiation).

**Collapsed group:** Height collapses to 36px showing only the header label. Items within are hidden.

**Sub-headers (when configured):**
- Indented 16px from the parent header.
- Text: `--text-sm`, weight 400, `--gray-700`.
- Lighter border: 1px solid `--gray-100`.

### 5.4 Item Bars

The core visual element of the Timeline.

**Bar shape:**
- SVG `<rect>` with rx/ry = 4px (rounded corners).
- Height: 28px (spacious layout) or 20px (compact layout).
- Min-width: 24px (even for very short duration items, so they remain clickable).

**Bar color:**
- Fill: Determined by the active "color-by" field. The bar uses the field value's palette color.
- Opacity: 100%. No translucency on the bar itself.
- Stroke: none (the bar color provides enough contrast against the white background).

**Bar label (item name):**
- **"Above" orientation (default):** Label sits above the bar, left-aligned with the bar's start position.
  - Text: `--text-xs`, weight 500, `--gray-900`. Truncated with ellipsis if wider than the bar + 100px overhang.
  - Gap between label and bar: 2px.

- **"Inside" orientation:** Label is rendered inside the bar.
  - Text: `--text-xs`, weight 500, white (or dark text if the bar color is light -- auto-contrast calculation).
  - Truncated with ellipsis at bar width - 8px padding.
  - If the bar is too narrow for any text (< 60px), the label floats above instead.

**Label suffix (optional):** If configured, a second line or appended text shows another field value.
  - Text: `--text-xs`, weight 400, `--gray-500`. E.g., "Mobile App Launch -- Q1 2026".

**Bar spacing:**
- Vertical gap between bars in the same track: 4px (spacious) or 2px (compact).
- Vertical gap between tracks within a stream: 4px.

### 5.5 Item Bar States

**Default:** As described above.

**Hover:** The bar gets a 1px outline in the bar's color darkened 20%. Cursor: pointer. A tooltip appears after 300ms delay:
- Tooltip: `--gray-900` bg, white text, `--radius-md`, `--shadow-md`, max-width 280px.
- Content: Item name (bold), date range, field values (2-3 key fields).

**Selected (clicked, Item Card open):** The bar gets a 2px outline in `--accent-600`. Slight brightness increase (filter: brightness(1.05)).

**Focus (keyboard navigation):** Same as selected state + a focus ring (2px `--accent-600` outline with 2px offset).

### 5.6 Milestones

Milestones are rendered as shaped markers on the timeline, positioned at their date on the x-axis.

**Milestone marker:**
- SVG shape determined by milestone type: diamond (rotated square), circle, triangle, or square.
- Size: 14px (width and height).
- Fill: The milestone type's configured color.
- Stroke: 2px white (creates a knockout effect against the background).

**Milestone label (when enabled):**
- Positioned below the marker.
- Text: `--text-xs`, weight 500, color matches the milestone marker.
- Date (when enabled): Below the label, `--text-xs`, weight 400, `--gray-500`.

**Milestone vertical position:** Milestones render at the bottom of the stream they belong to (or at the top of the overall timeline if not associated with a specific header group). They sit in their own "milestone track" below the item bars.

**Hover:** Tooltip with milestone name, date, and type. Same tooltip styling as item bars.

### 5.7 Today Marker

A vertical line at the current date position.

**Styling:**
- Stroke: `--accent-600`, 1.5px width, dashed pattern (4px dash, 3px gap).
- Extends from the Time Axis to the bottom of the timeline.
- A small label at the top of the line: "Today" in `--text-xs`, `--accent-600`, `--radius-sm` badge with `--accent-50` background.

### 5.8 Time Slider

A horizontal control at the bottom of the timeline for panning the visible date range.

**Container:** Full width, height 24px. Background: `--gray-100`. Border-top: 1px solid `--gray-200`.

**Slider thumb:** A draggable handle representing the currently visible date range. Background: `--gray-400`. Border-radius: `--radius-sm`. Height: 16px (vertically centered). Width proportional to the visible range vs. total data range.

**Interaction:** Drag the thumb to pan. Drag the edges of the thumb to zoom (expand/contract the visible range). The time axis updates in real-time as the slider is dragged.

### 5.9 Zoom and Pan

**Horizontal scroll:** Trackpad horizontal scroll gesture, or Shift+scroll wheel. Pans the timeline left/right, updating the Time Slider position.

**Time scale change:** Selecting a different time scale (from the toolbar or Format Panel) adjusts the date range to match the new scale's max range, centered on the current midpoint.

**Keyboard panning:** Left/Right arrow keys (when not editing) pan the timeline by one minor time unit.

### 5.10 Empty State

When no items have dates (or no items exist):

Centered in the timeline area:
- Icon: Calendar icon, 48px, `--gray-300`.
- "No items with dates yet" (`--text-lg`, `--gray-900`).
- "Add dates to your items in the Table View, or create items with dates here." (`--text-base`, `--gray-500`).
- "Switch to Table View" text button.

### 5.11 Compact vs. Spacious Layout

**Spacious (default):**
- Item bar height: 28px
- Vertical gap between bars: 4px
- Header group padding: `--space-4` top/bottom
- Stream padding: `--space-3` top/bottom

**Compact:**
- Item bar height: 20px
- Vertical gap between bars: 2px
- Header group padding: `--space-2` top/bottom
- Stream padding: `--space-1` top/bottom
- Labels forced to "inside" orientation to save vertical space

---

## 6. Swimlane View

### 6.1 Layout

A two-axis grid where items appear as cards at the intersection of row and column values.

```
+--------+----------+----------+----------+----------+
|        | Planned  | Active   | Done     | Backlog  |  <- Column Headers
+--------+----------+----------+----------+----------+
| Product| [Card]   | [Card]   |          | [Card]   |
|        | [Card]   |          |          |          |
+--------+----------+----------+----------+----------+
| Design |          | [Card]   | [Card]   |          |
|        |          | [Card]   |          |          |
+--------+----------+----------+----------+----------+
| Eng    | [Card]   | [Card]   | [Card]   | [Card]   |
|        |          | [Card]   | [Card]   |          |
+--------+----------+----------+----------+----------+
```

### 6.2 Column Headers

**Position:** Sticky top. Height: 44px.
**Background:** `--gray-50`.
**Border-bottom:** 1px solid `--gray-200`.
**Text:** `--text-sm`, weight 600, `--gray-700`.
**Alignment:** Center-aligned text.
**Min-width per column:** 200px.

If the color-by field is the column field, each column header has a 3px colored bottom border matching the palette color.

### 6.3 Row Headers

**Position:** Sticky left. Width: 160px.
**Background:** `--white`.
**Border-right:** 1px solid `--gray-200`.
**Text:** `--text-sm`, weight 600, `--gray-900`.
**Padding:** `--space-3` `--space-4`.

**Group Rows By (optional):** When a grouping field is configured, row headers are nested:
- Group label: `--text-xs`, weight 500, uppercase, `--gray-500`, tracking-wide. Full-width background `--gray-50`. Height 32px. Collapsible (chevron icon).
- Row headers indent 12px under their group.

### 6.4 Inversion Arrows

A small swap icon (two arrows in a circle, 20px) at the top-left corner where row and column headers meet. Click to swap the row and column field assignments. Hover: `--gray-100` circle background.

### 6.5 Swimlane Cards

Cards represent items at the intersection of their row and column field values.

**Standard mode:**
- Width: fills the cell width minus 16px padding (8px each side).
- Background: `--white`.
- Border: 1px solid `--gray-200`.
- Border-radius: `--radius-lg`.
- Padding: `--space-3`.
- Shadow: `--shadow-sm`.
- Hover: `--shadow-md`, cursor pointer.

**Card content (standard mode):**
1. **Color accent:** 3px left border in the item's palette color.
2. **Name:** `--text-sm`, weight 500, `--gray-950`. Truncate at 2 lines with ellipsis.
3. **Dates:** `--text-xs`, `--gray-500`. Format: "Jan 15 -- Mar 30, 2026". Omitted if no dates.
4. **Description preview:** `--text-xs`, `--gray-500`. First 80 characters of description, truncated with ellipsis. Omitted if empty.
5. **Detail chips (bottom row):** Small icons with counts:
   - Linked items icon + count (v1: placeholder, displays "0")
   - Attachment icon + count
   - Sub-item count (v1: placeholder)
   - Each chip: `--text-xs`, `--gray-400`, 4px gap between chips.

**Compact mode:**
- Same card structure but:
  - Description preview omitted
  - Detail chips omitted
  - Only: color accent + name + dates
  - Card padding: `--space-2`
  - Reduced vertical spacing between cards: `--space-1`

**Card click:** Opens the Item Card detail panel.

### 6.6 Cell Empty State

Empty cells (no items at that intersection) show a subtle `+` icon on hover. The icon is 20px, `--gray-300`, centered. Click to create an item pre-populated with that cell's row and column field values.

### 6.7 Cell Layout

Multiple cards in a single cell stack vertically with `--space-2` gap. Cells have a min-height of 80px (standard) or 48px (compact). If cards overflow the visible cell area, the cell expands to fit (no scrolling within cells).

---

## 7. Item Card (Detail Panel)

### 7.1 Panel Behavior

Click any item (in Table, Timeline, or Swimlane) to open the Item Card as a slide-out panel from the right.

**Panel width:** 640px.
**Animation:** Slide in from right, 200ms ease-out.
**Background:** `--white`.
**Shadow:** `--shadow-xl` on the left edge.
**Overlay:** Semi-transparent `rgba(0,0,0,0.15)` overlay behind the panel. Click overlay to close (with unsaved changes check).

The content behind remains visible (dimmed). The panel does not push content -- it overlays.

### 7.2 Panel Header

**Height:** 56px.
**Border-bottom:** 1px solid `--gray-200`.
**Padding:** `--space-4` `--space-6`.

**Content:**
- **Item name:** Inline editable text. `--text-xl`, weight 600, `--gray-950`. Click to edit. Full width minus action buttons.
- **Close button (X):** Right-aligned, 32px square, ghost style.
- **Actions menu (three dots):** Left of close button. Dropdown with:
  - Copy Item URL
  - Duplicate Item
  - Delete Item (red text, confirmation dialog)

### 7.3 Two-Panel Layout

Below the header, the panel splits into two vertical sections:

```
+-----[ Left Panel (Context) ]-----+---[ Right Panel (Details) ]---+
|                                   |                               |
|  [Overview] [Linked] [Sub-Items]  |  [Fields] [Activity]          |
|                                   |                               |
|  Description editor               |  Start Date: [Jan 15, 2026]   |
|  ...                              |  End Date: [Mar 30, 2026]     |
|                                   |  Status: [In Progress ▾]      |
|  Attachments                      |  Quarter: [Q1 2026 ▾]         |
|  [ file.pdf ] [ image.png ]       |  Owner: [Sarah ▾]             |
|                                   |                               |
+-----------------------------------+-------------------------------+
```

**Left panel:** 60% width. Scrollable.
**Right panel:** 40% width. Scrollable independently. Collapsible via a button (double-chevron left). When collapsed, the left panel takes full width.

### 7.4 Left Panel -- Tabs

Three tabs: **Overview**, **Linked Items**, **Sub-Items**.

**Tab bar:** Height 40px. `--text-sm`, weight 500. Active tab: `--accent-600` text + 2px bottom border in `--accent-600`. Inactive: `--gray-500` text. Hover: `--gray-700`.

#### Overview Tab

1. **Description editor:** Rich text using Tiptap. Toolbar: Bold, Italic, Underline, Link, Bullet List, Ordered List. Toolbar only visible when the editor is focused. Placeholder: "Add a description..." `--text-base`, `--gray-950`.

2. **Attachments section:** Below the editor. Label: "Attachments" (`--text-sm`, weight 500, `--gray-700`).
   - Each attachment: file icon + filename + file size + delete button (X, on hover).
   - "Add attachment" button: ghost button with paperclip icon. Opens file picker. Max 10MB per file.
   - Upload progress: inline progress bar below the filename.

#### Linked Items Tab (v1: Display only)

"Linked items will be available in v1.1" message in `--gray-500`. A subtle dashed border area with link icon.

#### Sub-Items Tab (v1: Display only)

"Sub-items will be available in v1.1" message in `--gray-500`. A subtle dashed border area with hierarchy icon.

### 7.5 Right Panel -- Tabs

Two tabs: **Fields**, **Activity**.

#### Fields Tab

A vertical list of all fields assigned to this roadmap, with inline editors for each.

**Date fields (Start Date, End Date):**
- Label: `--text-sm`, `--gray-500`, weight 500.
- Value: Inline date input (text input + calendar icon button).
- Text input accepts typed dates: "Jan 15, 2026", "2026-01-15", "1/15/26". Parsed on blur or Enter.
- Calendar icon opens a date picker popover: month grid with day cells.
- Validation: End Date >= Start Date (if both set). Show `--error-600` text below the input if violated.

**List fields:**
- Colored dot + value name. Click to open dropdown.
- Dropdown: search input at top (if 8+ values), value list with color dots.

**Multi-select fields:**
- Multiple colored pills. Click to open dropdown with checkboxes.

**Numeric fields:**
- Number input. Sub-format display: "$1,200" for currency, "45%" for percentage.

**Text fields:**
- Single-line text input.

**Team Member fields:**
- Avatar + name. Click to open dropdown of org members.

**Field spacing:** Each field row: 36px height. Label above value, or label left / value right (label width 100px) -- use the label-above layout for consistency and to accommodate long field names.

#### Activity Tab

Chronological log of all changes. Each entry:
- Avatar (20px) + "Sarah changed Status from Planned to Active" + timestamp ("2 hours ago").
- `--text-sm`, `--gray-700`. Timestamp: `--text-xs`, `--gray-500`.
- New entries animate in with a subtle slide-down (150ms).

v1: Display only (no comments). Show "Comments coming in v1.1" placeholder at the top with a text input that is disabled.

### 7.6 Save Actions

**Footer bar:** Fixed to the bottom of the panel. Height: 56px. Background: `--gray-50`. Border-top: 1px solid `--gray-200`. Padding: `--space-3` `--space-6`.

**Buttons (right-aligned):**
1. "Save & Close" -- primary button. Saves all changes and closes the panel.
2. "Save" -- secondary button. Saves without closing.
3. "Save & New" -- ghost button. Saves and opens a new blank Item Card.

**Disabled state:** All save buttons disabled when no changes have been made. They enable as soon as any edit occurs.

**Unsaved changes guard:** If the user clicks the close button or overlay while unsaved changes exist, show a confirmation dialog: "You have unsaved changes. Discard?" with "Cancel" and "Discard" buttons.

### 7.7 Item Card States

**Loading:** Skeleton placeholders in both panels. Left panel: 3 text-block skeletons. Right panel: 6 field-row skeletons.

**Error (save failure):** Red toast notification at the top of the panel: "Failed to save. Your changes have been preserved -- try again." with a "Retry" button.

**Edit locked (by another user):** Banner at the top of the panel: "Being edited by Sarah" in `--warning-500` background, white text. All inputs are disabled (read-only). The banner disappears when the lock is released.

---

## 8. Format Panel

### 8.1 Panel Behavior

Toggled by the Format button in the Top Bar. Slides in from the right, overlaying the content area (not pushing it).

**Width:** 320px.
**Background:** `--white`.
**Border-left:** 1px solid `--gray-200`.
**Shadow:** `--shadow-lg`.
**Animation:** Slide in from right, 150ms ease.

Note: The Format Panel and Item Card cannot be open simultaneously. Opening one closes the other.

### 8.2 Panel Structure

**Header:** "Format" (`--text-lg`, weight 600). Close button (X) right-aligned. Height: 48px.

**Content:** Scrollable. Padding: `--space-4`.

**Sections vary by view type.** Each section has a label (`--text-xs`, weight 500, `--gray-500`, uppercase, tracking-wide) and controls below.

### 8.3 Timeline Format Controls

**Section: Headers**
- "Header Field" -- dropdown of List fields. Selects the primary grouping.
- "Sub-Header" -- dropdown of List fields (optional). Adds a second grouping level.
- "Hide Empty Headers" -- toggle switch. When on, groups with no items in the visible range are hidden.
- "Header Orientation" -- segmented control: "Horizontal" | "Vertical".

**Section: Items**
- "Label Position" -- segmented control: "Above Bar" | "Inside Bar".
- "Label Suffix" -- dropdown of fields. Appends a field value to the item label.
- "Layout" -- segmented control: "Spacious" | "Compact".

**Section: Time**
- "Time Scale" -- segmented control (5 options): W | M | Q | H | Y (weeks/months/quarters/halves/years).
- "Start Date" -- date input (text + calendar).
- "End Date" -- date input (text + calendar).

**Section: Colors**
- "Color By" -- dropdown of List fields. Only List fields can drive color coding.
- "Palette" -- grid of 6 default palette swatches (2x3 grid, each swatch shows the first 4 colors as small dots). Clicking a palette applies it. Selected palette has a 2px `--accent-600` border.
- "Custom Palette" -- button to create a custom palette (opens a sub-panel with hex color pickers).
- **Legend:** Below the palette picker, auto-generated. Each row: color dot (12px circle) + field value name. Reorder by drag-and-drop to reassign colors.
- "Show Legend" -- toggle switch. When on, the legend appears on the timeline itself (floating bottom-right corner).

**Section: Milestones**
- "Show Labels" -- toggle switch.
- "Show Dates" -- toggle switch.

### 8.4 Swimlane Format Controls

**Section: Axes**
- "Column Field" -- dropdown of fields.
- "Row Field" -- dropdown of List fields.
- "Group Rows By" -- dropdown of List/Multi-Select/Team Member fields (optional).
- Swap button (⇄) to swap column and row.

**Section: Cards**
- "Card Display" -- segmented control: "Standard" | "Compact".

**Section: Colors**
- Same as Timeline (Color By, Palette, Legend).

### 8.5 Table Format Controls

**Section: Columns**
- Reorderable list of all fields. Each row: drag handle + checkbox (visible/hidden) + field name.
- "Name" field is always visible and cannot be reordered to a non-first position.

### 8.6 Segmented Control Component

Used throughout the Format Panel.

**Styling:** Background: `--gray-100`. Border-radius: `--radius-md`. Each segment: padding `--space-2` `--space-3`. Selected segment: `--white` background, `--shadow-sm`, `--radius-sm`. Text: `--text-xs`, weight 500. Unselected: `--gray-500`. Selected: `--gray-900`.

### 8.7 Toggle Switch Component

**Size:** 36px wide, 20px tall.
**Off:** `--gray-300` track, white thumb.
**On:** `--accent-600` track, white thumb.
**Transition:** 150ms ease.

---

## 9. Views System

### 9.1 View Switcher

Located in the Top Bar (see section 2.3). A dropdown button showing the current view name.

**Dropdown panel:**
- Max-height: 400px (scrollable).
- Width: 260px.
- Each view entry: icon (based on type: grid icon for table, horizontal-lines icon for timeline, layout-grid icon for swimlane) + view name + filter badge (number of active filters, if any, in a small `--gray-400` circle).
- Hover: `--gray-100` background.
- Click: Switch to that view.
- Three-dot menu on hover: Rename, Set as Default, Delete.
- **"Add New View"** at the bottom: + icon, `--accent-600` text.

### 9.2 Create View Modal

Triggered by "Add New View" in the view switcher.

**Modal:** 400px wide.

**Fields:**
1. "View Name" -- text input, placeholder "Untitled View".
2. "View Type" -- segmented control: Table | Timeline | Swimlane. Each with a small icon.
3. "Copy Filters From" -- dropdown of existing views (optional). Default: "No filters".

**Footer:** "Cancel" (ghost) + "Create" (primary, disabled while name is empty).

### 9.3 Filter Builder

Accessed via a "Filters" button in the toolbar (funnel icon). Badge shows active filter count.

**Filter panel:** Dropdown/popover, 480px wide. Appears below the filter button.

**Structure:**
- Each filter condition is a row with three dropdowns:
  1. Field (dropdown of all fields)
  2. Operator (depends on field type):
     - List: equals, not equals, is empty, is not empty
     - Text: contains, equals, is empty, is not empty
     - Numeric: equals, not equals, greater than, less than, between
     - Date: before, after, between, is empty, is not empty
     - Team Member: equals, is empty
  3. Value (depends on field and operator):
     - List: dropdown of field values
     - Text: text input
     - Numeric: number input (or two inputs for "between")
     - Date: date input (or two inputs for "between")
     - Team Member: dropdown of org members

- "Add Filter" link at the bottom (+ icon).
- Each row has a remove button (X) on the right.
- "Clear All" link at the bottom.

**Filter logic:** All conditions combined with AND. Display "All of the following conditions must match" at the top of the panel.

**Active filter indicator:** When filters are active, the Filters button shows a blue dot badge with the count. The table footer and view switcher also show the filter count.

### 9.4 View Configuration Persistence

All view settings (filters, format panel config, color palette) are saved to the view's config JSONB in the database. Changes save immediately (debounced 1s) when the user adjusts any format or filter setting.

---

## 10. Sharing and Export

### 10.1 Share Dialog

Opened by the "Share" button in the Top Bar.

**Modal:** 480px wide. `--shadow-xl`. `--radius-lg`.

**Header:** "Share [Roadmap Name]" (`--text-xl`).

**Add member section:**
- Input: "Add people by name or email" -- combo input that searches org members. Autocomplete dropdown shows matching members with avatar + name + email.
- Role selector: "Editor" | "Viewer" dropdown (default: Viewer).
- "Add" button.

**Members list:** Below the input. Each row:
- Avatar (28px) + Name + Email (`--text-sm`, `--gray-500`) + Role dropdown (Editor/Viewer) + Remove button (X, visible on hover).
- Owner row has "Owner" badge instead of a role dropdown (not changeable).

**Footer:** "Done" button.

### 10.2 Share Link Generator

A tab within the Share Dialog: "Members" | "Link".

**Link tab:**
- "Anyone with the link can view this roadmap (read-only)."
- "Generate Link" primary button.
- After generating: URL displayed in a read-only input with a "Copy" button. "Revoke Link" danger text button.
- **Password protection:** "Protect with password" toggle. When on, a password input appears. Password is set on link generation (or updated later).

### 10.3 Export

Triggered by the Export button in the Top Bar.

**Dropdown menu:**
1. **Export as PNG** -- triggers client-side export of the current view. Full content (not just viewport). A progress indicator appears: "Generating export..." in a small toast. File downloads as `{roadmap-name}-{view-name}.png`.
2. **Share Link** -- opens the Share Dialog's Link tab.

**Export progress toast:** Bottom-right corner. `--gray-900` background, white text. Shows a small spinner + "Generating export...". Disappears when download starts or after 15 seconds (error: "Export failed. Try again.").

### 10.4 Shared Link Viewer

A separate page (`/shared/:token`) that renders a roadmap view in read-only mode.

**Layout:**
- No sidebar.
- Minimal top bar: Product logo (left) + "Powered by [Product Name]" (right) + "Sign Up Free" CTA button.
- The view renders identically to the authenticated experience, but with all editing UI removed (no inline editing, no item creation, no format panel toggle).
- Item Card opens in read-only mode (no save buttons, no editable fields).

**Password-protected links:** Show a centered card with:
- Lock icon + "This roadmap is password-protected"
- Password input + "View Roadmap" button
- Error: "Incorrect password" inline text in `--error-600`.

---

## 11. Real-Time Collaboration UI

### 11.1 Presence Avatars

Displayed in the Top Bar (right section, before the Share button).

**Layout:** Stacked horizontally, each avatar overlapping the previous by 8px. Max 4 visible. If 5+, show 4 avatars + a "+N" badge.

**Avatar:** 28px circle. 2px white border (creates separation between stacked avatars). Image from Clerk user profile. Fallback: first letter of name on `--accent-100` background.

**"+N" badge:** 28px circle. `--gray-200` background. `--text-xs`, weight 600, `--gray-700`. Shows count of additional users.

**Hover tooltip (on each avatar):** "Name -- viewing View Name". Appears below the avatar. `--gray-900` background, white text, `--radius-md`.

**Current user's avatar is not shown** in the presence list (they know they are here).

### 11.2 Live Cursors (Table View)

When other users are in Table View, their active cell is highlighted.

**Other user's cell highlight:**
- 2px border in a user-assigned color (cycle through a set: blue, green, purple, orange, pink).
- Small name label above the cell: user's first name in `--text-xs`, same color as the border, `--radius-sm` background matching the color at 10% opacity.

**Transition:** Cursor movements animate smoothly (100ms ease) between cells.

### 11.3 Edit Lock Indicator

When another user has an Item Card open and is editing:

**In the view (Table/Timeline/Swimlane):**
- A small lock icon overlays the item's row/bar/card.
- Tooltip on hover: "Being edited by Sarah".

**In the Item Card (if you open the same item):**
- Banner at the top: "Being edited by Sarah. You can view but not edit." Yellow background (`--warning-500` at 15% opacity), `--warning-500` icon, `--gray-900` text.
- All inputs disabled.

### 11.4 Live Update Indicators

When another user changes data:

**Table View:** The changed cell briefly flashes with a highlight (`--accent-100` background, 500ms fade-out).

**Timeline View:** The changed item bar briefly pulses (slight scale 1.02, 300ms, then back to 1.0).

**Swimlane View:** The changed card's border briefly flashes `--accent-600` (300ms fade).

### 11.5 View Config Change Notification

When another user changes a shared view's configuration (filters, format settings):

- A toast notification appears: "View updated by Sarah" with an undo-style "Refresh" link (though the view auto-updates).
- The toast auto-dismisses after 5 seconds.

### 11.6 Connection Status

**Connected (normal):** No indicator -- absence of indicator means everything is fine.

**Connecting:** Small banner below the Top Bar: "Connecting..." with a subtle pulse animation. `--gray-100` background, `--gray-500` text. Disappears when connected.

**Disconnected:** Banner: "Live sync unavailable. Changes will sync when reconnected." `--warning-500` at 10% opacity background. Persists until reconnected. A small retry button.

---

## 12. Field Management

### 12.1 Fields Page

Accessible from a "Fields" link in the sidebar (when inside a roadmap context) or from the roadmap settings menu.

**Layout:** Full page. Two sections side by side:

**Left: Roadmap Fields**
- List of fields scoped to this roadmap.
- Each row: drag handle + field name + type badge (small pill: "List", "Numeric", etc.) + three-dot menu.
- Three-dot menu: Edit, Archive, Promote to Account, Delete.

**Right: Account Fields**
- List of fields shared across all roadmaps in the org.
- Same row format. Three-dot menu: Edit, Archive, Delete (no promote -- already account level).

### 12.2 Create/Edit Field Modal

**Modal:** 440px wide.

**Fields:**
1. "Field Name" -- text input, max 100 chars.
2. "Field Type" -- dropdown: List, Multi-Select, Numeric, Text, Date, Team Member. **Disabled after creation** (type is immutable). Show a lock icon and tooltip "Field type cannot be changed after creation."
3. "Numeric Format" (only for Numeric type) -- segmented control: Number | Currency | Percentage.
4. "Level" -- segmented control: "This Roadmap" | "All Roadmaps" (account level).

**For List and Multi-Select fields, a "Values" section appears below:**
- Existing values listed with: drag handle + color dot + name + edit (pencil) + delete (X).
- "Add Value" input at the bottom: text input + color picker button + "Add" button.
- Color picker: Small popover with the current palette colors as swatches + hex input.
- Drag to reorder values.

### 12.3 Promote to Account Field

Confirmation dialog: "Promote '[Field Name]' to an account-level field? This will make it available across all roadmaps and cannot be undone."

"Cancel" + "Promote" (primary button).

---

## 13. Responsive Behavior

### 13.1 Desktop (1280px+)

Full experience as described in all sections above. Sidebar expanded. All views fully functional.

### 13.2 Large Tablet / Small Desktop (1024px - 1279px)

- Sidebar auto-collapses to icon-only mode (48px).
- Format Panel width reduces to 280px.
- Item Card width reduces to 560px.
- Table View: horizontal scroll for many columns.
- Timeline View: unchanged (horizontal scroll is natural).
- Swimlane View: column min-width reduces to 160px.

### 13.3 Tablet (768px - 1023px)

- Sidebar hidden by default, accessible via hamburger menu.
- Format Panel becomes a full-screen overlay.
- Item Card becomes a full-screen overlay (not slide-out).
- Table View: Functional but may need horizontal scroll.
- Timeline View: Read-only with pan/zoom. A banner: "For the best editing experience, use a larger screen."
- Swimlane View: Columns stack vertically or reduce to 2 visible with horizontal scroll.

### 13.4 Mobile (< 768px)

- Roadmaps Homepage: Single-column card layout. Fully functional.
- Item Card: Full-screen overlay. Fully functional for viewing and editing.
- Table View: Simplified -- shows Name column + 2 most important fields. Horizontal scroll for more.
- Timeline View: "Best on desktop" message with a simplified read-only mini-timeline (items as colored bars, no interaction).
- Swimlane View: "Best on desktop" message with a list-view fallback (items grouped by row field, no grid).
- Sidebar: Off-screen, accessible via hamburger menu.

---

## 14. Interaction States Reference

### 14.1 Buttons

| State | Primary | Secondary | Ghost | Danger |
|-------|---------|-----------|-------|--------|
| Default | `--accent-600` bg, white text | White bg, `--gray-900` text, `--gray-300` border | Transparent, `--gray-700` text | `--error-600` bg, white text |
| Hover | `--accent-500` bg | `--gray-50` bg | `--gray-100` bg | `#B91C1C` bg |
| Active | `--accent-700` bg | `--gray-100` bg | `--gray-200` bg | `#991B1B` bg |
| Disabled | `--gray-300` bg, `--gray-500` text | `--gray-50` bg, `--gray-400` text, `--gray-200` border | `--gray-400` text | `--gray-300` bg, `--gray-500` text |
| Loading | Spinner replaces label (centered, 16px, same text color) | Same | Same | Same |

### 14.2 Inputs

| State | Styling |
|-------|---------|
| Default | `--gray-300` border |
| Hover | `--gray-400` border |
| Focus | `--accent-600` border + 0 0 0 2px `--accent-100` ring |
| Error | `--error-600` border + `--error-50` background. Error text below: `--text-xs`, `--error-600` |
| Disabled | `--gray-100` background, `--gray-400` text, `--gray-200` border |

### 14.3 Dropdowns

| State | Styling |
|-------|---------|
| Closed | Button with chevron-down icon, `--gray-300` border |
| Open | Button with `--accent-600` border, panel below with `--shadow-md` |
| Option hover | `--gray-100` background |
| Option selected | `--accent-50` background, `--accent-600` text, checkmark icon |
| Option disabled | `--gray-400` text, not clickable |

### 14.4 Cards (Roadmap Card, Swimlane Card)

| State | Styling |
|-------|---------|
| Default | `--gray-200` border, `--shadow-sm` |
| Hover | `--shadow-md`, border unchanged. Transition 150ms ease |
| Active/Pressed | `--shadow-sm`, `--gray-300` border |
| Selected | `--accent-600` 2px border, `--accent-50` background |
| Loading (skeleton) | Pulsing `--gray-100` background blocks matching content layout |

### 14.5 Table Cells

| State | Styling |
|-------|---------|
| Default | Transparent background, `--gray-100` bottom border |
| Hover (row) | `--gray-50` background |
| Active cell | 2px `--accent-600` border, `--accent-50` background |
| Editing | Cell expands with `--accent-600` 2px border, editor appears |
| Error | `--error-50` flash (300ms fade), tooltip with error message |
| Other user cursor | 2px colored border (user-specific color), name label above |

### 14.6 Timeline Item Bars

| State | Styling |
|-------|---------|
| Default | Filled bar with palette color, label above or inside |
| Hover | 1px outline (color darkened 20%), tooltip appears (300ms delay) |
| Selected | 2px `--accent-600` outline, brightness(1.05) filter |
| Focus (keyboard) | Same as selected + focus ring |
| Locked (by other user) | Small lock icon overlay, dimmed to 70% opacity |

### 14.7 Loading States

| Component | Loading Behavior |
|-----------|-----------------|
| Roadmaps Homepage | 6 skeleton cards |
| Table View | 10 skeleton rows with gray blocks |
| Timeline View | Header groups visible, skeleton bars (rounded gray rectangles) |
| Swimlane View | Grid structure visible, skeleton cards in cells |
| Item Card | Left panel: 3 text-block skeletons. Right panel: 6 field-row skeletons |
| View switch | 200ms fade transition. If data already cached, instant swap |

### 14.8 Error States

| Component | Error Behavior |
|-----------|---------------|
| Page-level load failure | Centered: "Something went wrong. Try again." + Retry button |
| Inline edit failure | Cell flashes red, reverts to previous value, tooltip error |
| Item Card save failure | Red toast in panel: "Failed to save" + Retry button |
| Export failure | Toast: "Export failed. Try again." |
| WebSocket disconnect | Banner: "Live sync unavailable" with reconnecting status |

### 14.9 Empty States

| Component | Empty State |
|-----------|-------------|
| Roadmaps Homepage | Illustration + "No roadmaps yet" + CTA |
| Table View (no items) | "No items yet. Click + to add your first item." |
| Timeline View (no dated items) | Calendar icon + "No items with dates yet" + Switch to Table link |
| Swimlane View (no items matching) | "No items match the current view configuration" |
| Filter results empty | "No items match the current filters. Try adjusting your criteria." |
| Item Card Activity | "No activity yet." |
| Field values (empty list) | "No values yet. Add one to organize your items." |

---

## 15. Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl + K` | Open global search | Anywhere |
| `Escape` | Close panel, cancel edit, close modal | Anywhere |
| `Enter` | Start editing cell / Confirm edit | Table View |
| `Tab` / `Shift+Tab` | Move to next/previous cell | Table View |
| `Arrow keys` | Navigate cells | Table View (not editing) |
| `Arrow keys` | Pan timeline | Timeline View |
| `Delete` / `Backspace` | Delete selected items (with confirmation) | Table View (items selected) |
| `Cmd/Ctrl + S` | Save Item Card | Item Card open |
| `Cmd/Ctrl + D` | Duplicate item | Item Card open |

---

## 16. Accessibility

### 16.1 Color

- All text meets WCAG AA contrast (4.5:1 for normal text, 3:1 for large text).
- Color coding on roadmap bars is supplemented by text labels. Color is never the sole conveyor of information.
- The color legend includes text names alongside color dots.
- Focus indicators use a visible 2px outline, never relying on color change alone.

### 16.2 Keyboard Navigation

- All interactive elements are reachable via Tab.
- Table View supports full arrow-key navigation (spreadsheet model).
- Timeline item bars are focusable with Tab, activatable with Enter/Space.
- Modals and panels trap focus until closed.
- Escape closes the topmost overlay (modal > panel > dropdown).

### 16.3 Screen Readers

- Timeline SVG elements have `role="img"` and `aria-label` describing each item: "Item: Mobile App Launch, January 15 to March 30 2026, Status: Active".
- Milestone markers have `aria-label`: "Milestone: Q1 Release, March 31 2026".
- View type changes are announced: `aria-live="polite"` region for "Switched to Timeline View".
- Table View uses semantic `<table>`, `<thead>`, `<th>`, `<td>` markup with proper scope attributes.
- Dropdowns use `role="listbox"` and `role="option"`.
- The Item Card panel uses `role="dialog"` with `aria-label="Item details"`.

### 16.4 Focus Management

- Opening the Item Card moves focus to the item name.
- Closing the Item Card returns focus to the element that triggered it.
- Opening a modal traps focus. Closing returns focus to the trigger.
- Filter builder fields auto-focus the first empty dropdown when adding a new condition.

---

## 17. Animation and Transitions

All transitions serve a functional purpose (communicating state change) rather than being decorative.

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Panel slide in/out (Item Card, Format) | translateX | 200ms ease-out |
| Modal appear | opacity + scale(0.95 -> 1.0) | 150ms ease |
| Dropdown open | opacity + translateY(-4px -> 0) | 100ms ease |
| View switch | opacity crossfade | 200ms ease |
| Card hover shadow | box-shadow transition | 150ms ease |
| Toggle switch | thumb translateX | 150ms ease |
| Skeleton pulse | opacity 0.5 -> 1.0 loop | 1.5s ease-in-out |
| Toast appear | translateY(16px -> 0) + opacity | 200ms ease |
| Toast dismiss | opacity -> 0, then remove | 150ms ease |
| Live update cell flash | background-color fade | 500ms ease-out |
| Timeline item pulse (live update) | scale(1 -> 1.02 -> 1) | 300ms ease |
| Active cell navigation | border-color transition | 50ms (near-instant) |

---

*Design spec written by Robert (Product Designer). Alice: implement from this spec. Reference the design tokens, component states, and CSS values directly. Ask me if any detail is ambiguous.*
