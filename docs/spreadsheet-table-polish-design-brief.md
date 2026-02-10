# Spreadsheet Table Polish — Design Brief

**Author:** Robert (Product Designer)
**Date:** Feb 9, 2026
**Priority:** High — CEO-flagged visual quality issue
**Scope:** AG Grid theming overrides in `css/spreadsheet.css`, column config in `js/spreadsheet.js`, tokens in `css/tokens.css`

---

## CEO Feedback Summary

The revenue model table at `/spreadsheets.html#view/sherlock-pdf/revenue-model-2026.json` looks functional but not exceptional. Specific complaints:

1. **Alignment inconsistency** — numeric data cells are right-aligned but column headers appear left-aligned
2. **Typography feels off** — data values don't feel like a premium financial table
3. **Vertical alignment** — row content is top-aligned instead of vertically centered
4. **Overall feel** — table reads as "functional default" rather than "crafted product"

## Current State Analysis

After inspecting the live render and computed styles, I identified these root causes:

### Problem 1: Font inheritance is partially broken
AG Grid cells show `font-family: "Helvetica Neue", sans-serif` in computed styles instead of Geist. The `--ag-font-family` CSS variable is set correctly on `.ag-theme-quartz` but AG Grid's internal cell elements use more specific selectors that override the variable in some contexts. The header text (`ag-header-cell-text`) correctly picks up Geist, but body cells fall back to the browser default.

### Problem 2: Vertical alignment is broken
AG Grid cells render as `display: inline-block` with `height: 39px` and `line-height: 22px`. There is no vertical centering mechanism — content sits at the top of the 39px box, leaving ~17px of dead space below the text. This is the single most visible quality issue.

### Problem 3: Right-aligned headers use flex-direction: row-reverse
AG Grid's approach to right-aligned headers is `flex-direction: row-reverse` on the label container, which reverses the sort icon and text order but doesn't visually right-align the header text in the way users expect. The header text shows `text-align: end` but the overall header cell layout doesn't push it to the right edge. This creates the misalignment the CEO noticed.

### Problem 4: Monospace for all numeric values is heavy
Geist Mono for every currency/number/percent cell creates a "spreadsheet" feel rather than a "dashboard" feel. The monospace letterforms are wider and more mechanical-looking. Premium dashboards (Stripe, Vercel) use the same proportional font for everything, relying on `font-variant-numeric: tabular-nums` for vertical digit alignment.

### Problem 5: Row height and padding create dead space
40px rows with 12px horizontal padding and 22px line-height leave cells feeling hollow. The content floats in too much vertical space without being centered.

### Problem 6: Header treatment is too loud
Uppercase + semibold + letter-spacing on headers in a small font creates a "screaming label" effect. Best-in-class tables (Linear, Vercel) use sentence-case or lowercase headers with medium weight — quieter and more sophisticated.

---

## Design Direction: Reference Points

**Stripe Dashboard tables:** Proportional font throughout. Right-aligned numbers with tabular figures. Subtle #697386 header text at 12px, no uppercase. 44px row height with vertically centered content. Very minimal borders — just header separator. No zebra.

**Vercel Dashboard tables:** System font stack. 13px body, 12px headers. Headers are muted gray, sentence-case, medium weight. Rows are 48px with content centered. Single bottom border per row. Generous 16px horizontal padding.

**Linear tables:** 13px Inter font. Headers at 11px, uppercase with tight letter-spacing, very muted gray. 36px rows. Borderless — whitespace separates rows. Numbers right-aligned with tabular figures.

**Common thread:** Use the product's UI font (not monospace) for numbers, with `tabular-nums` for alignment. Vertically center all content. Generous but not excessive padding. Headers are subordinate to data — quieter treatment.

---

## Specific CSS Changes

### 1. Fix Font Inheritance (Critical)

The font isn't cascading to all AG Grid cells. Add explicit font-family to the cell-level selector.

**File:** `css/spreadsheet.css`

**Add after the `.ag-theme-quartz` variable block (after line 46):**

```css
/* --- 1b. Font Inheritance Fix --- */

.ag-theme-quartz .ag-cell,
.ag-theme-quartz .ag-cell-value {
  font-family: var(--font-family);
}
```

This ensures every cell inherits Geist regardless of AG Grid's internal specificity.

### 2. Fix Vertical Centering (Critical)

AG Grid cells are `inline-block` with no vertical centering. Override to use flexbox centering on the cell value container.

**File:** `css/spreadsheet.css`

**Add new section after the font fix:**

```css
/* --- 1c. Cell Vertical Centering --- */

.ag-theme-quartz .ag-cell {
  display: flex;
  align-items: center;
}
```

If `display: flex` on `.ag-cell` causes layout issues with AG Grid's internal positioning, the alternative approach is:

```css
.ag-theme-quartz .ag-cell {
  line-height: var(--ag-row-height);
}
```

This makes line-height match the row height, centering single-line text. The `display: flex` approach is preferred if AG Grid accepts it — try flex first, fall back to line-height matching if it breaks the grid layout.

**Important:** Also verify the cell wrapper. AG Grid v34 may have `.ag-cell-wrapper` with `display: flex; align-items: center` but a constrained height. If the wrapper exists and has a fixed height, also add:

```css
.ag-theme-quartz .ag-cell-wrapper {
  height: 100%;
  display: flex;
  align-items: center;
}
```

### 3. Fix Header/Data Alignment Consistency (Critical)

Right-aligned numeric headers need to visually align with their right-aligned data. AG Grid's `row-reverse` approach doesn't produce clean visual alignment.

**File:** `css/spreadsheet.css`

**Add:**

```css
/* --- 2b. Right-Aligned Header Fix --- */

.ag-theme-quartz .ag-right-aligned-header .ag-header-cell-label {
  flex-direction: row;
  justify-content: flex-end;
}
```

This overrides AG Grid's default `row-reverse` with a standard `row` direction plus `justify-content: flex-end`, which right-aligns the header text and places the sort icon naturally.

If the sort icon position becomes incorrect (sort icon should be to the left of text for right-aligned headers), adjust to:

```css
.ag-theme-quartz .ag-right-aligned-header .ag-header-cell-label {
  justify-content: flex-end;
}

.ag-theme-quartz .ag-right-aligned-header .ag-sort-ascending-icon,
.ag-theme-quartz .ag-right-aligned-header .ag-sort-descending-icon,
.ag-theme-quartz .ag-right-aligned-header .ag-sort-none-icon {
  order: -1;
  margin-right: var(--space-1);
}
```

### 4. Switch from Monospace to Tabular Proportional Figures (High)

Replace Geist Mono with Geist + tabular-nums for all numeric cells. This is the single biggest "feel" upgrade — it transforms the table from "spreadsheet" to "dashboard."

**File:** `css/spreadsheet.css`

**Change section 7 from:**

```css
.ag-theme-quartz .thq-cell--mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

**To:**

```css
/* --- 7. Numeric Cell Class --- */

.ag-theme-quartz .thq-cell--mono {
  font-family: var(--font-family);
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.01em;
}
```

**Rationale:** Geist supports OpenType `tnum` and `lnum` features. `tabular-nums` ensures equal-width digits for vertical alignment (the entire reason monospace was chosen). `lining-nums` ensures digits sit on the baseline at cap height (no old-style descending figures). The slight negative letter-spacing tightens the numbers to feel more precise.

**Also rename the CSS class** for semantic clarity. In `js/spreadsheet.js`, change all instances of `cellClass: 'thq-cell--mono'` to `cellClass: 'thq-cell--numeric'`. Update the CSS selector to match. (Alice can do the rename or keep both selectors temporarily.)

### 5. Refine Header Typography (High)

Tone down the header treatment from "SCREAMING LABEL" to "quiet guide."

**File:** `css/spreadsheet.css`

**Change section 2 from:**

```css
.ag-theme-quartz .ag-header-cell-text {
  font-family: var(--font-family);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  line-height: 1;
}
```

**To:**

```css
.ag-theme-quartz .ag-header-cell-text {
  font-family: var(--font-family);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary-accessible);
  line-height: 1;
}
```

**Changes:**
- `font-weight`: 600 (semibold) down to 500 (medium) — headers should guide, not dominate
- `color`: `--color-text-secondary` (#666) down to `--color-text-tertiary-accessible` (#767676) — subordinates headers to data while maintaining AA contrast (4.5:1 on white)
- `letter-spacing`: 0.05em up to 0.06em — slightly more air in the uppercase text compensates for the lighter weight

### 6. Increase Row Height and Optimize Padding (Medium)

Increase row height from 40px to 44px for comfortable density. This gives content more breathing room and matches Stripe's row height.

**File:** `css/spreadsheet.css`

**Change the AG Grid variable overrides:**

```css
/* Spacing */
--ag-grid-size: 4px;
--ag-cell-horizontal-padding: var(--space-4);
--ag-row-height: 44px;
--ag-header-height: 40px;
```

**Changes:**
- `--ag-row-height`: 40px up to 44px — more vertical breathing room for data rows
- `--ag-header-height`: stays at 40px — header is slightly shorter than data rows, subordinating it visually (Stripe does this)
- `--ag-cell-horizontal-padding`: `var(--space-3)` (12px) up to `var(--space-4)` (16px) — more horizontal air between columns

**Also update the comfortable density override:**

```css
.thq-density--comfortable.ag-theme-quartz {
  --ag-row-height: 44px;
  --ag-header-height: 40px;
  --ag-font-size: var(--text-sm);
  --ag-cell-horizontal-padding: var(--space-4);
}
```

**And update the JS constructor to match:**

In `js/spreadsheet.js`, update the default heights:
- `headerHeight: this.density === 'compact' ? 32 : 40`
- `rowHeight: this.density === 'compact' ? 32 : 44`

And in `setDensity()`:
- `rowHeight: density === 'compact' ? 32 : 44`
- `headerHeight: density === 'compact' ? 32 : 40`

### 7. Strengthen the Header Bottom Border (Medium)

The header-to-body separator should be the strongest visual line in the table. Currently it uses `--color-border-strong` (#d4d4d4). Make it slightly darker.

**File:** `css/spreadsheet.css`

**Change section 3:**

```css
.ag-theme-quartz .ag-header-row {
  border-bottom: 1.5px solid var(--color-neutral-400);
}
```

**Changes:**
- Border width: 1px up to 1.5px — distinguishes the header separator from row dividers
- Border color: `--color-border-strong` (#d4d4d4) to `--color-neutral-400` (#a3a3a3) — noticeably darker than row borders, creating clear hierarchy

### 8. Soften Row Dividers (Medium)

Row borders should be barely visible — just enough to guide the eye horizontally.

**File:** `css/spreadsheet.css`

**Change the AG Grid variable:**

```css
--ag-row-border-color: var(--color-border);
```

This is already correct (#e5e5e5). But also add transparency to make them even subtler:

```css
--ag-row-border-color: rgba(0, 0, 0, 0.06);
```

This creates a row divider that's present but nearly invisible — the Vercel approach. The data should organize itself through alignment, not through visible rules.

### 9. Data Cell Font Weight and Color Refinement (Medium)

Numeric values should feel slightly bolder/darker than text to draw the eye to the data.

**File:** `css/spreadsheet.css`

**Add to the numeric cell class:**

```css
.ag-theme-quartz .thq-cell--mono {
  font-family: var(--font-family);
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.01em;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}
```

**Change:** Adding `font-weight: 500` (medium) to numeric cells. Text cells stay at 400 (normal). This creates a subtle but effective hierarchy where numbers — the primary data — have slightly more visual weight than labels.

### 10. Null Cell Treatment Polish (Low)

The `--` null placeholder should be even quieter — it's the absence of data and should recede.

**File:** `css/spreadsheet.css`

**Change section 8:**

```css
.ag-theme-quartz .thq-cell--null {
  color: var(--color-neutral-300);
  font-weight: var(--font-weight-normal);
}
```

**Change:** From `--color-text-tertiary-accessible` (#767676) to `--color-neutral-300` (#d4d4d4). The em-dash placeholder isn't informational text that users need to read — it's a decorative indicator of emptiness. It should almost blend with the row divider. This is not an accessibility concern because `--` is not meaningful content; the cell being empty is the information, and screen readers already announce "blank" for null cells.

### 11. Row Hover Refinement (Low)

Current hover uses `--color-accent-light` (rgba green 4%). Change to a neutral tint — hover should highlight the row without implying the row is interactive/clickable.

**File:** `css/spreadsheet.css`

**Change:**

```css
--ag-row-hover-color: rgba(0, 0, 0, 0.02);
```

**Rationale:** Green tint on hover implies clickability. In a read-only data table, hover is for tracking which row you're scanning, not for indicating an action. A neutral 2% black tint provides the tracking aid without the interaction promise.

Also update the sticky column hover to match:

```css
.thq-spreadsheet .ag-row-hover .ag-cell:first-child {
  background: rgba(0, 0, 0, 0.02);
}
```

### 12. Last Row Border Removal (Low)

The bottom row should not have a bottom border — it creates a double-line effect with the grid container edge.

**File:** `css/spreadsheet.css`

**Add:**

```css
.ag-theme-quartz .ag-row-last {
  border-bottom: none;
}
```

---

## Summary of Changes by File

### `css/spreadsheet.css`
1. Add font inheritance fix (`.ag-cell`, `.ag-cell-value`)
2. Add vertical centering (`.ag-cell` flex or line-height)
3. Add right-aligned header fix (`.ag-right-aligned-header .ag-header-cell-label`)
4. Change `.thq-cell--mono` from monospace to proportional + tabular-nums
5. Tone down header text: weight 600 to 500, color to tertiary-accessible
6. Row height 40px to 44px, header stays 40px, padding 12px to 16px
7. Header border: 1px to 1.5px, color to neutral-400
8. Row dividers: soften to rgba(0,0,0,0.06)
9. Numeric cells: add font-weight medium
10. Null cells: lighten to neutral-300
11. Row hover: green tint to neutral 2% tint
12. Remove last-row bottom border

### `js/spreadsheet.js`
1. Update comfortable row height from 40 to 44 in constructor and setDensity()
2. Optionally rename `thq-cell--mono` to `thq-cell--numeric` (semantic cleanup)

### `css/tokens.css`
No new tokens needed — all values use existing tokens or explicit rgba values.

---

## Implementation Priority

**Critical (do first — these fix the CEO's explicit complaints):**
1. Fix font inheritance
2. Fix vertical centering
3. Fix header/data alignment consistency
4. Switch to tabular proportional figures

**High (do next — these elevate the feel):**
5. Refine header typography
6. Increase row height and padding

**Medium (polish pass):**
7. Strengthen header bottom border
8. Soften row dividers
9. Numeric font weight

**Low (refinement):**
10. Null cell treatment
11. Hover tint change
12. Last row border

---

## Visual Before/After Expectation

**Before:** Functional AG Grid table with monospace numbers, top-aligned text, misaligned headers, and a "data entry" feel.

**After:** A dashboard-quality data table with:
- Vertically centered content in every row
- Right-aligned headers sitting directly above right-aligned numbers
- Proportional Geist font with tabular figures — clean and modern
- Quietly authoritative headers that guide without shouting
- Subtle row dividers that organize without cluttering
- Slightly taller, more spacious rows that breathe
- Numbers in medium weight that draw the eye to the data
- Null cells that recede into the background
- Neutral hover that aids scanning without implying interactivity

The overall impression should shift from "we themed AG Grid" to "we designed a table."

---

## Testing Checklist for Alice

After implementation, verify against these spreadsheets:
- `sherlock-pdf/revenue-model-2026.json` — all-numeric table, tests alignment + tabular figures + vertical centering
- `sherlock-pdf/competitor-pricing.json` — mixed types (text, badge, currency), tests header alignment per column type
- `teamhq-redesign-v2/design-token-audit.json` — varied badge values, tests visual hierarchy with color badges

Verify at both densities (compact and comfortable) and at mobile breakpoint.
