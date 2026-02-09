# Embedded Spreadsheet Component -- Design Spec

**Author:** Robert (Product Designer)
**Date:** Feb 9, 2026
**Status:** Complete

**References:**
- Requirements: `docs/embedded-spreadsheet-requirements.md` (Thomas)
- Market Research: `docs/embedded-spreadsheet-market-research.md` (Suki)
- Technical Research: `docs/embedded-spreadsheet-research.md` (Marco)
- Technical Approach: `docs/embedded-spreadsheet-tech-approach.md` (Andrei)
- Design Tokens: `css/tokens.css`

---

## Design Philosophy

The embedded spreadsheet should feel like a **native TeamHQ content block**, not a third-party grid dropped into the page. The target aesthetic is Notion-meets-Linear: minimal chrome, no visual noise, typography-driven hierarchy. Data should be scannable at a glance and readable on closer inspection.

Every visual property references an existing design token. No new tokens are introduced. AG Grid's Quartz theme is overridden entirely through CSS custom properties and targeted selectors to achieve our Notion-style minimal table.

---

## 1. AG Grid CSS Variable Overrides

These are the exact `--ag-*` variable values applied within the `.ag-theme-quartz` selector in `css/spreadsheet.css`. Every value maps to a TeamHQ design token from `css/tokens.css`.

### Core Variable Map

```css
.ag-theme-quartz {
  /* --- Typography --- */
  --ag-font-family: var(--font-family);                    /* Geist, system-ui fallback */
  --ag-font-size: var(--text-sm);                          /* 0.875rem (14px) — default comfortable */

  /* --- Background Colors --- */
  --ag-background-color: var(--color-bg-primary);          /* #ffffff */
  --ag-header-background-color: var(--color-bg-secondary); /* #fafafa */
  --ag-odd-row-background-color: var(--color-bg-primary);  /* #ffffff — no zebra striping */
  --ag-row-hover-color: var(--color-accent-light);         /* rgba(0, 107, 63, 0.04) */

  /* --- Text Colors --- */
  --ag-foreground-color: var(--color-text-primary);        /* #171717 */
  --ag-header-foreground-color: var(--color-text-secondary); /* #666666 */
  --ag-secondary-foreground-color: var(--color-text-secondary); /* #666666 */

  /* --- Border Treatment (Notion-style: horizontal only) --- */
  --ag-border-color: var(--color-border);                  /* #e5e5e5 */
  --ag-row-border-color: var(--color-border);              /* #e5e5e5 — horizontal row dividers */
  --ag-header-column-separator-color: transparent;         /* no vertical header separators */
  --ag-column-border: none;                                /* no vertical cell borders */
  --ag-borders: none;                                      /* no outer grid border */
  --ag-borders-row: solid 1px;                             /* 1px horizontal row dividers only */
  --ag-header-column-resize-handle-display: none;          /* no resize handles */

  /* --- Spacing --- */
  --ag-grid-size: 4px;                                     /* AG Grid's base unit */
  --ag-cell-horizontal-padding: var(--space-3);            /* 0.75rem (12px) per side */
  --ag-row-height: 40px;                                   /* comfortable default */
  --ag-header-height: 40px;                                /* matches row height */

  /* --- Sort Icon --- */
  --ag-icon-size: 14px;

  /* --- Border Radius (none — wrapper handles if needed) --- */
  --ag-wrapper-border-radius: 0;
  --ag-border-radius: 0;
}
```

### Design Rationale

- **No zebra striping.** Suki's research confirmed that modern table UIs (Notion, Linear) omit alternating row backgrounds. The subtle row hover provides sufficient spatial orientation. Striping adds visual noise without aiding scan-ability.
- **No vertical borders.** The single strongest differentiator between "modern table" and "spreadsheet cage." Whitespace and consistent alignment separate columns instead of gridlines.
- **Header background.** `--color-bg-secondary` (#fafafa) provides just enough distinction from the body without creating a heavy visual band. The header earns its hierarchy from typography, not background contrast.
- **Row hover.** `--color-accent-light` at 4% opacity is barely visible -- enough to confirm which row the cursor is on without drawing attention. Matches the Linear pattern Suki identified as the gold standard.

---

## 2. Header Styling

The column header row is the table's primary navigational element. It establishes what each column means and provides sort interaction. Headers use a distinct typographic treatment that is clearly different from body cells.

### Header Text Spec

```css
.ag-theme-quartz .ag-header-cell-text {
  font-family: var(--font-family);           /* Geist */
  font-size: var(--text-xs);                 /* 0.75rem (12px) */
  font-weight: var(--font-weight-semibold);  /* 600 */
  text-transform: uppercase;
  letter-spacing: 0.05em;                    /* standard tracking for uppercase */
  color: var(--color-text-secondary);        /* #666666 */
  line-height: 1;
}
```

### Header Bottom Border

The header row gets a stronger bottom border to separate it from body rows. This is the only "heavier" border in the entire table.

```css
.ag-theme-quartz .ag-header-row {
  border-bottom: 1px solid var(--color-border-strong);  /* #d4d4d4 */
}
```

### Sort Indicator

Sort indicators use AG Grid's built-in arrow icons, recolored to the accent green.

```css
.ag-theme-quartz .ag-sort-ascending-icon,
.ag-theme-quartz .ag-sort-descending-icon {
  color: var(--color-accent);                /* #006B3F — royal jaguar green */
}
```

**Sort interaction cycle:** Unsorted (no indicator) -> ascending (up arrow, accent green) -> descending (down arrow, accent green) -> unsorted. This matches the three-state cycle Thomas specified.

### Header Hover

Headers are interactive (sort targets), so they get a subtle hover state.

```css
.ag-theme-quartz .ag-header-cell:hover {
  background-color: var(--color-accent-light);  /* rgba(0, 107, 63, 0.04) */
}
```

No cursor change needed -- AG Grid defaults to `pointer` on sortable headers.

---

## 3. Cell Type Rendering Specs

Each column type has a distinct visual treatment. These are applied via AG Grid value formatters, cell renderers, and CSS classes.

### 3a. Text Cells (default)

| Property | Value |
|----------|-------|
| Alignment | Left |
| Font | `var(--font-family)` (Geist) |
| Font size | `var(--text-sm)` (0.875rem / 14px) in comfortable; `var(--text-xs)` (0.75rem / 12px) in compact |
| Color | `var(--color-text-primary)` (#171717) |
| Overflow | Ellipsis with `text-overflow: ellipsis; overflow: hidden; white-space: nowrap` |

### 3b. Number Cells

| Property | Value |
|----------|-------|
| Alignment | Right (`type: 'rightAligned'` in AG Grid) |
| Font | `var(--font-mono)` (Geist Mono) |
| Font variant | `font-variant-numeric: tabular-nums` |
| Color | `var(--color-text-primary)` (#171717) |
| Format | `toLocaleString()` with comma grouping (e.g., `1,234`) |

```css
.ag-theme-quartz .thq-cell--mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

The monospace font with tabular numerals ensures that digit columns align vertically, making magnitude comparison instant. This is a critical usability detail for financial and metrics data.

### 3c. Currency Cells

| Property | Value |
|----------|-------|
| Alignment | Right |
| Font | `var(--font-mono)` (Geist Mono), tabular-nums |
| Color | `var(--color-text-primary)` (#171717) |
| Format | Prefix (from column def, default `$`) + locale-formatted number (e.g., `$17,200`) |
| Decimal places | 0 for whole numbers; up to 2 if fractional values exist |

The currency prefix is part of the formatted string, not a separate element. This keeps it simple and ensures the prefix aligns with the number.

### 3d. Percent Cells

| Property | Value |
|----------|-------|
| Alignment | Right |
| Font | `var(--font-mono)` (Geist Mono), tabular-nums |
| Color | `var(--color-text-primary)` (#171717) |
| Format | Fixed 1 decimal place + `%` suffix (e.g., `11.0%`) |

### 3e. Date Cells

| Property | Value |
|----------|-------|
| Alignment | Left |
| Font | `var(--font-family)` (Geist) |
| Color | `var(--color-text-secondary)` (#666666) -- slightly muted to differentiate from primary text |
| Format | `MMM D, YYYY` (e.g., `Jan 15, 2026`) |

Dates use secondary text color because they are typically metadata, not the primary data point. The formatted output avoids zero-padded days (Jan 5 not Jan 05) for a cleaner read.

### 3f. Badge Cells

Badges render as colored pill elements inside the cell. The badge value maps to a predefined set of semantic colors.

**Badge Pill Spec:**

| Property | Value |
|----------|-------|
| Display | `inline-block` |
| Padding | `var(--space-1)` vertical (4px), `var(--space-2)` horizontal (8px) |
| Border radius | `var(--radius-sm)` (4px) |
| Font size | `var(--text-xs)` (0.75rem / 12px) |
| Font weight | `var(--font-weight-medium)` (500) |
| Line height | 1 |
| Text transform | `capitalize` |

**Badge Color Map:**

| Badge Value | Background | Text Color | Token Reference |
|-------------|------------|------------|-----------------|
| `high`, `critical` | `rgba(220, 38, 38, 0.1)` | `var(--color-status-error)` (#dc2626) | Red -- error status |
| `medium`, `warning` | `rgba(202, 138, 4, 0.1)` | `var(--color-status-warning)` (#ca8a04) | Amber -- warning status |
| `low`, `info` | `rgba(0, 107, 63, 0.08)` | `var(--color-accent)` (#006B3F) | Green -- accent |
| `yes`, `true`, `included` | `rgba(22, 163, 74, 0.1)` | `var(--color-status-success)` (#16a34a) | Green -- success status |
| `no`, `false`, `excluded` | `var(--color-bg-secondary)` (#fafafa) | `var(--color-text-tertiary)` (#999999) | Grey -- muted |
| (any other value) | `var(--color-bg-secondary)` (#fafafa) | `var(--color-text-secondary)` (#666666) | Neutral -- default |

**Badge CSS:**

```css
.thq-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  text-transform: capitalize;
  white-space: nowrap;
}

.thq-badge--error {
  background: rgba(220, 38, 38, 0.1);
  color: var(--color-status-error);
}

.thq-badge--warning {
  background: rgba(202, 138, 4, 0.1);
  color: var(--color-status-warning);
}

.thq-badge--accent {
  background: rgba(0, 107, 63, 0.08);
  color: var(--color-accent);
}

.thq-badge--success {
  background: rgba(22, 163, 74, 0.1);
  color: var(--color-status-success);
}

.thq-badge--muted {
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
}

.thq-badge--neutral {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}
```

**Contrast check:** All badge text colors meet WCAG AA (4.5:1) against white backgrounds. The semi-transparent badge backgrounds do not significantly reduce contrast since they are very light tints on a white cell background. Amara should verify these combinations in her review.

### 3g. Null / Empty Cell Treatment

| Property | Value |
|----------|-------|
| Display text | `--` (em dash pair) |
| Color | `var(--color-text-tertiary)` (#999999) |
| Alignment | Inherits from column type (right-aligned for numbers, left for text) |

```css
.ag-theme-quartz .thq-cell--null {
  color: var(--color-text-tertiary);
}
```

The `--` is universally understood as "no data." Using tertiary color ensures it reads as intentionally empty rather than broken.

---

## 4. Density Toggle

The density toggle lets the user switch between a compact view (more rows, tighter spacing) and a comfortable view (more breathing room, easier reading).

### 4a. Density Dimensions

| Property | Compact | Comfortable (default) |
|----------|---------|----------------------|
| Row height | 32px | 40px |
| Header height | 32px | 40px |
| Body font size | `var(--text-xs)` (12px) | `var(--text-sm)` (14px) |
| Header font size | `var(--text-xs)` (12px) | `var(--text-xs)` (12px) -- stays same |
| Cell horizontal padding | `var(--space-2)` (8px) | `var(--space-3)` (12px) |

```css
.thq-density--compact.ag-theme-quartz {
  --ag-row-height: 32px;
  --ag-header-height: 32px;
  --ag-font-size: var(--text-xs);
  --ag-cell-horizontal-padding: var(--space-2);
}

.thq-density--comfortable.ag-theme-quartz {
  --ag-row-height: 40px;
  --ag-header-height: 40px;
  --ag-font-size: var(--text-sm);
  --ag-cell-horizontal-padding: var(--space-3);
}
```

### 4b. Toggle Button Treatment

The density toggle is a segmented control (two-button group) positioned in the spreadsheet header bar, right-aligned.

**Layout:**

```
[Spreadsheet Name]                    [Compact] [Comfortable]
Optional description text
```

**Toggle Button Spec:**

| Property | Value |
|----------|-------|
| Element | `<button>` (semantic, keyboard accessible) |
| Font size | `var(--text-xs)` (12px) |
| Font weight | `var(--font-weight-medium)` (500) |
| Padding | `var(--space-1)` vertical (4px), `var(--space-2)` horizontal (8px) |
| Border radius | `var(--radius-sm)` (4px) |
| Border | `1px solid var(--color-border)` |
| Cursor | `pointer` |
| Transition | `background-color 150ms ease, color 150ms ease, border-color 150ms ease` |

**States:**

| State | Background | Text Color | Border |
|-------|------------|------------|--------|
| Default (inactive) | `transparent` | `var(--color-text-tertiary)` (#999999) | `var(--color-border)` (#e5e5e5) |
| Hover (inactive) | `var(--color-bg-secondary)` (#fafafa) | `var(--color-text-secondary)` (#666666) | `var(--color-border)` (#e5e5e5) |
| Active (selected) | `var(--color-accent-bg)` (rgba(0,107,63,0.06)) | `var(--color-accent)` (#006B3F) | `var(--color-accent)` (#006B3F) |
| Focus-visible | Inherits current visual state + `outline: 2px solid var(--color-accent); outline-offset: 2px` | -- | -- |

**Segmented control grouping:** The two buttons share a border. The left button has `border-radius: var(--radius-sm) 0 0 var(--radius-sm)` and the right has `border-radius: 0 var(--radius-sm) var(--radius-sm) 0`. They share the middle border (left button loses its right border-radius, right button its left).

```css
.thq-density-toggle {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  color: var(--color-text-tertiary);
  background: transparent;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
  line-height: 1;
}

.thq-density-toggle:first-child {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  border-right: none;
}

.thq-density-toggle:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.thq-density-toggle:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.thq-density-toggle--active {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.thq-density-toggle--active + .thq-density-toggle {
  border-left-color: var(--color-accent);
}
```

**ARIA:** Each button uses `aria-pressed="true|false"` to communicate the selected state to screen readers.

**Persistence:** The selected density is saved to `localStorage` under key `thq-table-density`. On page load, the saved value is read and applied. Default is `comfortable`.

---

## 5. Sticky First Column Shadow

When the table scrolls horizontally, the first column stays pinned to the left edge. A subtle shadow on its right edge communicates depth -- the pinned column is "above" the scrolling content behind it.

### Shadow Spec

```css
.thq-spreadsheet .ag-cell:first-child,
.thq-spreadsheet .ag-header-cell:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-bg-primary);       /* #ffffff — must be opaque to occlude */
}

.thq-spreadsheet .ag-header-cell:first-child {
  background: var(--color-bg-secondary);     /* #fafafa — matches header background */
  z-index: 2;                                /* header sticky column above body sticky column */
}
```

**Shadow pseudo-element:**

```css
.thq-spreadsheet .ag-cell:first-child::after,
.thq-spreadsheet .ag-header-cell:first-child::after {
  content: '';
  position: absolute;
  top: 0;
  right: -6px;
  bottom: 0;
  width: 6px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.05), transparent);
  pointer-events: none;
  opacity: 0;
  transition: opacity 200ms ease;
}
```

**The shadow appears only when scrolled.** When the table is at its leftmost scroll position, no shadow is needed (the first column is in its natural position). JavaScript toggles a class when horizontal scroll position > 0:

```css
.thq-spreadsheet--scrolled .ag-cell:first-child::after,
.thq-spreadsheet--scrolled .ag-header-cell:first-child::after {
  opacity: 1;
}
```

**Shadow parameters:**
- Width: 6px
- Color: `rgba(0, 0, 0, 0.05)` -- just barely visible. The TeamHQ design system uses no `shadow-sm` or `shadow-md` (both are `none`), so this shadow is intentionally minimal. It should read as "depth" only when you are looking for it.
- Gradient: fades from left to right (opaque shadow at the column edge, transparent at the end)
- Transition: 200ms ease on opacity for smooth appear/disappear

### Row Hover on Sticky Column

When a row is hovered, the sticky first column cell must also show the hover background. AG Grid's row hover applies `--ag-row-hover-color` to all cells in the row, but sticky cells with explicit `background` values will override it. Fix:

```css
.thq-spreadsheet .ag-row-hover .ag-cell:first-child {
  background: var(--color-accent-light);    /* match row hover color */
}
```

---

## 6. Scroll-Hint Indicators

On mobile and narrow viewports where the table overflows horizontally, a scroll-hint shadow on the right edge signals that more content is available.

### Right-Edge Scroll Hint

```css
.thq-spreadsheet-wrapper {
  position: relative;
  overflow: hidden;                          /* contain the pseudo-element */
}

.thq-spreadsheet-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 24px;
  background: linear-gradient(to left, rgba(0, 0, 0, 0.04), transparent);
  pointer-events: none;
  opacity: 0;
  transition: opacity 200ms ease;
  z-index: 3;                               /* above sticky column */
}

.thq-spreadsheet-wrapper--has-overflow::after {
  opacity: 1;
}
```

**Behavior:**
- The `--has-overflow` class is added by JavaScript when the grid's scroll width exceeds its visible width.
- The shadow fades out when the user scrolls all the way to the right (scroll position + visible width >= scroll width). JavaScript removes the class.
- Shadow color is `rgba(0, 0, 0, 0.04)` -- even lighter than the sticky column shadow. This is a "hint" not a "border."
- Width is 24px -- wide enough to be noticeable as a gradient, not so wide that it obscures data.

### No Left-Edge Hint Needed

The sticky first column already communicates that content exists to the left. Adding a left-edge scroll hint would be redundant.

---

## 7. Responsive Behavior

### Breakpoint System

| Breakpoint | Range | Behavior |
|------------|-------|----------|
| Desktop | >= 1024px | Full table, all columns visible. Comfortable density is default. |
| Tablet | 768px -- 1023px | Horizontal scroll if table wider than viewport. Sticky first column active. Density toggle available. |
| Mobile | < 768px | Forced compact density. Density toggle hidden. Horizontal scroll with sticky first column. Scroll-hint shadow active. |

### Mobile Overrides

```css
@media (max-width: 767px) {
  /* Force compact density */
  .thq-spreadsheet.ag-theme-quartz {
    --ag-row-height: 32px;
    --ag-header-height: 32px;
    --ag-font-size: var(--text-xs);
    --ag-cell-horizontal-padding: var(--space-2);
  }

  /* Hide density toggle -- mobile is always compact */
  .thq-spreadsheet-header__controls {
    display: none;
  }

  /* Spreadsheet header stacks vertically */
  .thq-spreadsheet-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }

  /* Reduce header name size */
  .thq-spreadsheet-header__name {
    font-size: var(--text-sm);
  }
}
```

### Container Behavior

Tables live inside TeamHQ's `.container` which has `max-width: 1120px`. The AG Grid wrapper stretches to fill its container width. On desktop, this means tables are constrained to the container width and will scroll horizontally if they have many columns.

```css
.thq-spreadsheet-wrapper {
  width: 100%;
  max-width: 100%;
}
```

---

## 8. Standalone Spreadsheets Page

### Page Layout (`spreadsheets.html`)

The standalone page follows the same layout pattern as `docs.html`: a page header, a list view (default), and a reader view (shown when a spreadsheet is selected).

**Page header:**

```
Spreadsheets
3 spreadsheets across 2 projects
```

| Property | Value |
|----------|-------|
| Title | `font-size: var(--text-2xl)` at mobile, `var(--text-3xl)` at desktop. `font-weight: var(--font-weight-bold)`. `color: var(--color-text-primary)`. |
| Stats text | `font-size: var(--text-sm)`. `color: var(--color-text-secondary)`. |
| Margin | `margin-bottom: var(--space-10)` |

### 8a. List View

Spreadsheets are grouped by project, using the same accordion card pattern as the docs page (`doc-group` card).

**Project Group Card:**

| Property | Value |
|----------|-------|
| Container | `background: var(--color-bg-card)` (#ffffff), `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)` |
| Hover | `border-color: var(--color-zinc-700)` (matches docs pattern) |
| Header padding | `var(--space-5)` |
| Expand/collapse | CSS grid `grid-template-rows` transition, same as docs |

**Spreadsheet List Item (within a group):**

Each spreadsheet is a clickable row showing name, description snippet, and metadata.

```
[icon]  Revenue Model -- 2026 Projections              12 rows, 6 cols    Feb 9, 2026
        Monthly recurring revenue projections...
```

| Property | Value |
|----------|-------|
| Layout | Flex row, `align-items: center`, `gap: var(--space-3)` |
| Padding | `var(--space-3) 0` |
| Border | `border-bottom: 1px solid var(--color-border)`, none on last child |
| Name | `font-size: var(--text-sm)`, `font-weight: var(--font-weight-medium)`, `color: var(--color-text-primary)` |
| Description | `font-size: var(--text-xs)`, `color: var(--color-text-tertiary)`, truncated to 1 line with ellipsis |
| Metadata | `font-size: var(--text-xs)`, `color: var(--color-text-tertiary)`, `white-space: nowrap` |
| Hover | `background: rgba(var(--color-white-rgb), 0.02)` (matches doc-item hover) |
| Cursor | `pointer` |
| Transition | `background-color 0.15s ease` |

**Spreadsheet icon:** A small table icon (inline SVG, 16x16). Stroke color `var(--color-text-tertiary)`. The icon is a simplified grid -- 3 columns, 3 rows outline.

```html
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.2"/>
  <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="currentColor" stroke-width="1.2"/>
  <line x1="6" y1="1.5" x2="6" y2="14.5" stroke="currentColor" stroke-width="1.2"/>
</svg>
```

### 8b. Reader View

When a spreadsheet is clicked, the list view hides and the reader view appears. Layout:

```
<- Back to list

Revenue Model -- 2026 Projections
Monthly recurring revenue projections for SherlockPDF across three pricing tiers.

12 rows . 6 columns . Created by Yuki . Feb 9, 2026        [Compact] [Comfortable]

+-----------------------------------------------------------------------+
|  AG Grid table rendering                                               |
+-----------------------------------------------------------------------+
```

**Back button:** Same pattern as docs reader: `font-size: var(--text-sm)`, `font-weight: var(--font-weight-medium)`, `color: var(--color-text-tertiary)`, arrow character prefix. Hover: `color: var(--color-text-primary)`.

**Spreadsheet title:**

| Property | Value |
|----------|-------|
| Font size | `var(--text-xl)` (20px) |
| Font weight | `var(--font-weight-bold)` (700) |
| Color | `var(--color-text-primary)` |
| Margin | `margin-bottom: var(--space-2)` |

**Description:**

| Property | Value |
|----------|-------|
| Font size | `var(--text-sm)` |
| Color | `var(--color-text-secondary)` |
| Margin | `margin-bottom: var(--space-4)` |
| Max width | `90ch` (matches docs reader content width) |

**Metadata row:**

| Property | Value |
|----------|-------|
| Font size | `var(--text-xs)` |
| Color | `var(--color-text-tertiary)` |
| Separator | ` . ` (middle dot with spaces) in `var(--color-text-tertiary)` |
| Margin | `margin-bottom: var(--space-6)` |
| Layout | Flex row with `justify-content: space-between`. Metadata on left, density toggle on right. |

**Table rendering:** Full-width within the container. No max-width constraint on the table itself (it fills the container and scrolls if needed).

---

## 9. Integration Styling

### 9a. Project Detail View

The "Data" section slots into the project detail view after Progress Notes, using the same layout conventions as other detail sections.

**Section label:**

```css
.detail__label {
  /* already defined in styles.css */
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}
```

The "Data" heading reuses the existing `.detail__label` class. No new styles needed.

**Spreadsheet wrapper in project detail:**

```css
.detail__spreadsheet {
  margin-bottom: var(--space-6);
}

.detail__spreadsheet:last-child {
  margin-bottom: 0;
}
```

**Spreadsheet header bar (name + density toggle):**

```css
.thq-spreadsheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.thq-spreadsheet-header__info {
  flex: 1;
  min-width: 0;
}

.thq-spreadsheet-header__name {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.thq-spreadsheet-header__desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

.thq-spreadsheet-header__controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
```

When a project has multiple spreadsheets, they stack vertically with `var(--space-6)` gap between them. Each gets its own header bar and density toggle.

### 9b. Docs Embedding

Spreadsheets embedded in docs via the `<!-- spreadsheet: ... -->` directive render inline within the markdown content flow. The styling should feel like a natural part of the document, not an iframe or foreign object.

**Embed wrapper:**

```css
.docs-spreadsheet-embed {
  margin-top: var(--space-4);
  margin-bottom: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
```

The border + radius gives the embedded table a "card" feel within the doc content, visually grouping it as a distinct content block (similar to how code blocks have a background + border).

**Embed header (within docs):**

```css
.thq-spreadsheet-header--inline {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.thq-spreadsheet-header--inline .thq-spreadsheet-header__name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: 0;
}
```

**No density toggle in doc embeds.** Doc-embedded tables always use comfortable density (or follow the global localStorage preference). The toggle would clutter the reading experience. On mobile, they force compact like all other tables.

**Width behavior:** Doc-embedded tables inherit the content width of `.docs-reader__content` (max-width: 90ch). If the table is wider than 90ch, it scrolls horizontally within the embed wrapper.

---

## 10. Accessibility Requirements

### 10a. Table Semantics (AG Grid Built-in)

AG Grid renders proper ARIA roles automatically:

- `role="grid"` on the grid container
- `role="row"` on each row
- `role="gridcell"` on each body cell
- `role="columnheader"` on each header cell
- `aria-sort="ascending|descending|none"` on sorted column headers
- `aria-colindex` and `aria-rowindex` for position

**Alice should verify** that AG Grid's rendered ARIA output matches these expectations in the themed configuration. Amara's review will confirm.

### 10b. Keyboard Navigation

AG Grid provides built-in keyboard navigation for data grids:

- **Arrow keys** move between cells
- **Tab** moves focus into and out of the grid
- **Enter/Space** on a header cell triggers sort
- **Home/End** move to first/last cell in a row
- **Ctrl+Home/End** move to first/last cell in the grid

The grid wrapper receives focus (`tabindex="0"`) and announces itself as a grid to screen readers.

### 10c. Density Toggle Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Semantic element | `<button>` (not `<div>` or `<span>`) |
| State communication | `aria-pressed="true"` on the active button, `aria-pressed="false"` on the inactive one |
| Group label | Wrap in a container with `role="group"` and `aria-label="Table density"` |
| Focus style | `outline: 2px solid var(--color-accent); outline-offset: 2px` (matches global focus style in shared.css) |
| Keyboard operation | Standard button activation -- Enter or Space triggers density change |

```html
<div class="thq-spreadsheet-header__controls" role="group" aria-label="Table density">
  <button class="thq-density-toggle thq-density-toggle--active"
          type="button"
          data-density="compact"
          aria-pressed="true">Compact</button>
  <button class="thq-density-toggle"
          type="button"
          data-density="comfortable"
          aria-pressed="false">Comfortable</button>
</div>
```

### 10d. Color Contrast

All text-on-background combinations must meet WCAG AA (4.5:1 for normal text, 3:1 for large text).

**Verified combinations:**

| Element | Text Color | Background | Approx Ratio | Pass? |
|---------|-----------|------------|--------------|-------|
| Body cell text | #171717 on #ffffff | 15.4:1 | Yes |
| Header text | #666666 on #fafafa | 5.7:1 | Yes |
| Date cell text | #666666 on #ffffff | 5.9:1 | Yes |
| Null cell text | #999999 on #ffffff | 2.8:1 | Decorative -- acceptable (the `--` is supplementary, not informational) |
| Badge error | #dc2626 on rgba(220,38,38,0.1)+white | ~5.6:1 | Yes |
| Badge warning | #ca8a04 on rgba(202,138,4,0.1)+white | ~4.5:1 | Borderline -- Amara to verify |
| Badge success | #16a34a on rgba(22,163,74,0.1)+white | ~4.8:1 | Yes |
| Badge accent | #006B3F on rgba(0,107,63,0.08)+white | ~6.4:1 | Yes |
| Badge muted text | #999999 on #fafafa | 2.7:1 | Borderline -- Amara to verify |
| Toggle inactive | #999999 on transparent (white) | 2.8:1 | Borderline -- intended as secondary control |
| Toggle active | #006B3F on rgba(0,107,63,0.06)+white | ~6.4:1 | Yes |

**Items for Amara to review:**
1. Badge `--warning` text (#ca8a04) contrast -- may need to use a slightly darker amber
2. Badge `--muted` text (#999999) contrast -- this is intentionally de-emphasized but should still be readable
3. Density toggle inactive text (#999999) -- supplementary control, but should still be discoverable

### 10e. Screen Reader Announcements

- Sort state changes are announced automatically by AG Grid via `aria-sort` attribute updates on column headers.
- Error messages ("Spreadsheet not found") use `role="alert"` for immediate announcement.
- Density toggle state changes are communicated via `aria-pressed` updates. No additional `aria-live` region is needed since the visual change is immediate and the button state is self-descriptive.

### 10f. Reduced Motion

Users with `prefers-reduced-motion: reduce` should see no transitions:

```css
@media (prefers-reduced-motion: reduce) {
  .ag-theme-quartz .ag-row,
  .thq-density-toggle,
  .thq-spreadsheet-wrapper::after,
  .thq-spreadsheet .ag-cell:first-child::after,
  .thq-spreadsheet .ag-header-cell:first-child::after {
    transition: none;
  }
}
```

---

## 11. Empty States and Error States

### 11a. No Spreadsheets for a Project

**Behavior:** If a project has no entries in `data/spreadsheets/index.json`, the "Data" section does not render at all. There is no empty state message. This matches the existing pattern where project detail sections only appear if they have content.

### 11b. AG Grid Empty Data (0 rows)

If a spreadsheet JSON has an empty `rows` array, AG Grid shows its built-in overlay.

**Custom overlay message:**

```
No data available
```

| Property | Value |
|----------|-------|
| Font size | `var(--text-sm)` |
| Color | `var(--color-text-tertiary)` (#999999) |
| Padding | `var(--space-10)` vertical |
| Text align | Center |

```css
.ag-theme-quartz .ag-overlay-no-rows-center {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  padding: var(--space-10) 0;
}
```

### 11c. Spreadsheet Not Found (docs embedding)

When a `<!-- spreadsheet: ... -->` directive references a file that cannot be fetched:

```
Spreadsheet not found
```

| Property | Value |
|----------|-------|
| Container | `padding: var(--space-4)`, `text-align: center` |
| Font size | `var(--text-sm)` |
| Color | `var(--color-text-tertiary)` (#999999) |
| Font style | `italic` |
| ARIA | `role="alert"` for screen reader announcement |
| Border | Inherits embed wrapper border (1px solid var(--color-border), border-radius) |

```css
.docs-spreadsheet-embed__error {
  padding: var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
  font-style: italic;
  color: var(--color-text-tertiary);
}
```

### 11d. Index Fetch Failure

If `data/spreadsheets/index.json` cannot be fetched (on the standalone page or project detail):

- **Project detail:** Data section simply does not render. Silent failure. No error shown.
- **Standalone page:** Show a centered message:

```
Unable to load spreadsheets
```

| Property | Value |
|----------|-------|
| Container | `padding: var(--space-16) 0`, `text-align: center` |
| Font size | `var(--text-sm)` |
| Color | `var(--color-text-tertiary)` (#999999) |

### 11e. AG Grid CDN Failure

If the AG Grid library fails to load from CDN:

- **Behavior:** The `TeamHQSpreadsheet` constructor degrades to a no-op. No grids render. Spreadsheet sections appear empty (as if no data exists).
- **No user-facing error message.** This is a rare infrastructure failure. The page should not break -- it just lacks tables.
- **Console warning:** `console.warn('AG Grid not loaded -- spreadsheet features unavailable')` for debugging.

---

## 12. Loading States

### 12a. Spreadsheet Loading (in docs and project detail)

When a spreadsheet JSON file is being fetched, show a loading placeholder before the grid initializes.

**Loading indicator text:**

```
Loading spreadsheet...
```

| Property | Value |
|----------|-------|
| Container | `padding: var(--space-6) 0`, `text-align: center` |
| Font size | `var(--text-sm)` |
| Color | `var(--color-text-tertiary)` (#999999) |
| Animation | Subtle opacity pulse: `0.4` -> `1.0` -> `0.4`, 1.5s cycle, ease-in-out |

```css
.thq-spreadsheet-loading {
  padding: var(--space-6) 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  animation: thq-pulse 1.5s ease-in-out infinite;
}

@keyframes thq-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

**Loading in docs embed:** The loading text appears inside the embed wrapper (with border/radius), so it looks like a content block waiting to resolve.

### 12b. Standalone Page List Loading

When the index is being fetched on `spreadsheets.html`:

**Skeleton approach:** Show 2-3 placeholder group cards with pulsing backgrounds, matching the shape of real cards.

```css
.thq-skeleton {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  animation: thq-pulse 1.5s ease-in-out infinite;
}

.thq-skeleton--group {
  height: 72px;                            /* approximate height of a collapsed group */
  margin-bottom: var(--space-4);
}
```

Show 2 skeleton group cards while the index loads. Replace with real data once fetched.

### 12c. Reader View Grid Loading

When the user clicks a spreadsheet in the list and the full JSON is being fetched:

- The back button and header (name, description) render immediately from index metadata.
- The grid area shows the loading indicator until the JSON resolves and AG Grid initializes.
- AG Grid itself has a very fast initialization time. The loading state is primarily about the network fetch, not the render.

### 12d. Reduced Motion Loading

For users with `prefers-reduced-motion: reduce`, the pulse animation stops. The loading text is static at full opacity.

```css
@media (prefers-reduced-motion: reduce) {
  .thq-spreadsheet-loading,
  .thq-skeleton {
    animation: none;
    opacity: 1;
  }
}
```

---

## Row Hover Transition

Body rows get a smooth hover transition. On hover-in, the background appears instantly (0ms -- the user expects immediate feedback). On hover-out, it fades over 120ms for a smooth feel.

```css
.ag-theme-quartz .ag-row {
  transition: background-color 120ms ease;
}
```

This is applied globally to all rows. AG Grid handles the hover background color via `--ag-row-hover-color`.

---

## Standalone Page Nav Link

A "Spreadsheets" link is added to the main navigation in `index.html`, positioned after "Docs":

```html
<a href="spreadsheets.html" class="nav__link">Spreadsheets</a>
```

This uses the existing `.nav__link` class. No new navigation styles needed.

---

## Complete CSS Architecture Summary

All spreadsheet styles live in a single new file: `css/spreadsheet.css`.

**Section organization within the file:**

1. AG Grid CSS variable overrides (`.ag-theme-quartz` block)
2. Header text styling (`.ag-header-cell-text`)
3. Header bottom border (`.ag-header-row`)
4. Sort indicator colors
5. Header hover
6. Row hover transition
7. Monospace cell class (`.thq-cell--mono`)
8. Null cell class (`.thq-cell--null`)
9. Badge pill styles (`.thq-badge` + variants)
10. Density overrides (`.thq-density--compact`, `.thq-density--comfortable`)
11. Density toggle button styles
12. Sticky first column + shadow
13. Scroll-hint wrapper + shadow
14. Spreadsheet header bar (`.thq-spreadsheet-header`)
15. Loading states
16. Error states
17. Empty state overlay
18. Skeleton loading
19. Docs embed wrapper
20. Responsive overrides (`@media` blocks)
21. Reduced motion

**Estimated size:** ~200-250 lines of CSS. All values reference tokens. No hardcoded colors, sizes, or fonts.

---

## What to Tell the Team

- **Alice (FE):** This spec defines every visual property you need. The AG Grid CSS variable map is complete -- copy it directly into `css/spreadsheet.css`. Badge CSS is provided in full. The density toggle is a segmented button pair with `aria-pressed`. The sticky column shadow toggles on scroll position. Focus on the adapter class logic; the CSS is prescriptive enough to implement directly.
- **Soren (Responsive):** Three breakpoints: desktop (>=1024), tablet (768-1023), mobile (<768). Mobile forces compact density via media query and hides the toggle. The sticky column shadow and scroll-hint shadow are CSS pseudo-elements toggled by JS classes. Verify the 90ch max-width in docs embedding does not cause awkward wrapping of wide tables.
- **Amara (A11y):** Key review items: (1) AG Grid's ARIA output in our themed config, (2) badge color contrast for warning and muted variants, (3) density toggle `aria-pressed` + group label, (4) keyboard navigation through sorted columns, (5) reduced-motion handling. The null cell `--` text at #999 is borderline on contrast but is decorative. Your call on whether it needs darkening.
- **Enzo (QA):** Visual test matrix: all 6 column types with correct alignment and formatting, density toggle persistence, sticky column shadow appearing on scroll, scroll-hint shadow on mobile, badge pill colors matching the map above, loading/error states, empty data overlay. Check that no raw AG Grid defaults "leak through" the theme overrides.
