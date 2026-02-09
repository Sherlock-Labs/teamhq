# Spreadsheet Responsive Audit

**Author:** Soren (Front-End Responsive Specialist)
**Date:** Feb 9, 2026
**Status:** Complete

**Files Audited:**
- `css/spreadsheet.css` (697 lines -- AG Grid overrides, standalone page styles, responsive)
- `js/spreadsheet.js` (338 lines -- TeamHQSpreadsheet adapter)
- `js/spreadsheets.js` (385 lines -- standalone page list + reader)
- `spreadsheets.html` (page structure)
- `js/projects.js` (renderDataSection -- project detail embed)
- `js/docs.js` (processSpreadsheetDirectives -- docs embed)
- `css/tokens.css` (design tokens)
- `css/shared.css` (container, nav)
- `css/docs.css` (docs reader content area)
- `docs/embedded-spreadsheet-design-spec.md` (Robert's spec)

**Viewports Tested (mental model audit):** 320px, 375px, 414px, 640px, 768px, 1024px, 1280px, 1440px, 1920px

---

## Summary

The spreadsheet implementation is solid at its core. The responsive breakpoint at 767px, sticky column mechanics, scroll-hint shadow, and density system are well-built. However, there are meaningful gaps in how the grid and supporting UI adapt across the full breakpoint spectrum. The biggest issues center around: missing coverage in the 768px-1023px tablet range, touch target sizing on several interactive elements, the docs-embedded spreadsheet being overly constrained by the 90ch content width, and the lack of any intermediate breakpoint behavior between mobile and desktop.

I found **16 issues** across the 10 audit areas. The breakdown: **3 P1** (broken or overflow-causing layout), **7 P2** (awkward but functional), **6 P3** (polish improvements).

---

## 1. Grid Container Sizing

### 1a. PASS -- Container width containment

The `.thq-spreadsheet-wrapper` correctly sets `width: 100%` and `max-width: 100%` (line 254-255 of `spreadsheet.css`). The wrapper lives inside `.container` which caps at `max-width: 1120px` with horizontal padding (`space-5` at mobile, `space-8` at 640px+). The grid will never overflow its parent container horizontally at the wrapper level.

### 1b. ISSUE -- Wrapper missing `overflow: hidden` from design spec

**Priority:** P3

**What's wrong:** Robert's design spec (Section 6) specifies `overflow: hidden` on `.thq-spreadsheet-wrapper` to "contain the pseudo-element." The implementation omits this. Robert flagged it in design review and accepted it as intentional for AG Grid compatibility, and Enzo noted it as non-blocking. However, without `overflow: hidden`, the `::after` pseudo-element (scroll-hint shadow) technically extends 24px beyond the wrapper boundary on the right edge. In practice, this is invisible because the gradient fades to transparent, but on very narrow containers (such as the docs embed within 90ch), there is a theoretical risk of the pseudo-element contributing to overflow calculation.

**Where:** `css/spreadsheet.css`, line 252-256 (`.thq-spreadsheet-wrapper`)

**Fix:** Add `overflow: hidden` only on the wrapper's inline axis to avoid interfering with AG Grid's vertical autoHeight layout:

```css
.thq-spreadsheet-wrapper {
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow-x: clip; /* contain pseudo-element without affecting vertical layout */
}
```

Using `overflow-x: clip` (supported in all modern browsers) is preferable to `overflow: hidden` because it does not create a new scroll container on the x-axis, which would interfere with AG Grid's own horizontal scrolling. If older browser support is needed, keep the current behavior (omit it).

---

## 2. Horizontal Scrolling

### 2a. ISSUE -- No `-webkit-overflow-scrolling: touch` on AG Grid viewport

**Priority:** P2

**What's wrong:** On older iOS devices (pre-iOS 13), horizontal scrolling within the AG Grid body viewport may feel janky without `-webkit-overflow-scrolling: touch` to enable momentum scrolling. The docs.css file applies this to markdown tables (`docs-reader__content table`, line 444) but the spreadsheet CSS does not apply it to the AG Grid scroll container. Modern iOS (13+) handles this natively, but the omission creates inconsistency with the docs approach.

**Where:** `css/spreadsheet.css` -- missing rule

**Fix:** Add to the AG Grid scroll viewport:

```css
.thq-spreadsheet .ag-body-viewport,
.thq-spreadsheet .ag-body-horizontal-scroll-viewport {
  -webkit-overflow-scrolling: touch;
}
```

### 2b. PASS -- Scroll-hint shadow behavior

The scroll-hint shadow implementation is correct. JavaScript in `spreadsheet.js` (lines 253-296) properly: (1) detects overflow on initial render via `_checkOverflow`, (2) tracks scroll position via `_handleScroll` with a passive listener, (3) removes the shadow when scrolled to the end (`scrollLeft + clientWidth >= scrollWidth - 1`), and (4) re-evaluates on resize via `ResizeObserver`. The 24px gradient with `rgba(0,0,0,0.04)` is appropriately subtle.

### 2c. ISSUE -- No visual scroll affordance on touch devices

**Priority:** P2

**What's wrong:** On touch devices, users have no scrollbar visible by default. The right-edge scroll-hint shadow communicates "more content exists to the right," but there is no affordance to communicate that the table itself is scrollable. Users unfamiliar with horizontal-scroll patterns in tables may not realize they can swipe. Desktop browsers show a horizontal scrollbar on hover (depending on OS settings), but mobile browsers hide scrollbars entirely.

**Where:** Conceptual gap -- no file/line reference

**Fix:** Consider a brief horizontal scroll pulse animation on first render to hint at scrollability. This is a P2 polish item, not a layout break. A lightweight approach:

```css
@keyframes thq-scroll-hint {
  0% { transform: translateX(0); }
  30% { transform: translateX(-12px); }
  60% { transform: translateX(4px); }
  100% { transform: translateX(0); }
}

.thq-spreadsheet-wrapper--has-overflow .thq-spreadsheet {
  animation: thq-scroll-hint 0.6s ease-out 0.5s 1;
}

@media (prefers-reduced-motion: reduce) {
  .thq-spreadsheet-wrapper--has-overflow .thq-spreadsheet {
    animation: none;
  }
}
```

Alternatively, on first touch interaction, let the system handle it naturally -- the scroll-hint shadow should be sufficient for most users.

---

## 3. Column Sizing

### 3a. ISSUE -- No minimum column widths defined

**Priority:** P1

**What's wrong:** AG Grid is set with `resizable: false` and no explicit `minWidth` or `width` on column definitions (`spreadsheet.js`, line 131-181, `convertColumn` function). AG Grid's default auto-sizing distributes available width equally across columns. On narrow viewports (320-414px), a spreadsheet with 6-7 columns can result in columns as narrow as 50-60px. At `text-xs` (12px) font size with `space-2` (8px) horizontal padding, a 50px column can only display about 2-3 characters before truncation. Column headers (uppercase, letter-spaced) are particularly affected -- "REVENUE" in a 60px column will be truncated to "REV..."

This is most severe in the docs embed context where the containing width is capped at 90ch (~720px). A 7-column spreadsheet inside 720px gives ~103px per column, minus padding leaves ~87px of content width -- workable but tight. But on a 320px mobile viewport with the same 7 columns, each column gets about 46px, which is not usable.

**Where:** `js/spreadsheet.js`, lines 131-181 (`convertColumn` function)

**Fix:** Add sensible minimum widths per column type:

```javascript
function convertColumn(col) {
  var def = {
    field: col.key,
    headerName: col.label,
    sortable: true,
    resizable: false,
    minWidth: 80, /* baseline minimum */
    cellClassRules: {
      'thq-cell--null': function (params) { return params.value == null; }
    }
  };

  switch (col.type) {
    case 'number':
    case 'currency':
    case 'percent':
      def.minWidth = 90;
      /* ... existing code ... */
      break;
    case 'date':
      def.minWidth = 110; /* "Jan 15, 2026" needs ~110px */
      break;
    case 'badge':
      def.minWidth = 80;
      break;
    case 'text':
    default:
      def.minWidth = 100;
      break;
  }

  return def;
}
```

This ensures columns never collapse below readable widths. The trade-off is more horizontal scrolling on narrow screens, but that is vastly preferable to illegible truncated data.

### 3b. ISSUE -- First column has no explicit width for sticky behavior

**Priority:** P2

**What's wrong:** The sticky first column (`position: sticky; left: 0`) works, but its width is entirely auto-determined by AG Grid. On a dataset where the first column has short values (e.g., single-digit IDs), the sticky column may be extremely narrow (40-50px), which looks odd as a pinned anchor. Conversely, if the first column has long text values, it may consume 40-50% of the viewport width while pinned, leaving very little room for the scrollable columns behind it.

**Where:** `css/spreadsheet.css`, lines 211-217 (sticky first column); `js/spreadsheet.js`, line 131 (no width set)

**Fix:** Consider setting a `flex` or `maxWidth` on the first column via AG Grid config. A reasonable approach: cap the first column at 200px on mobile, let it auto-size on desktop:

```javascript
// In convertColumn, or applied after mapping:
if (colIndex === 0) {
  def.maxWidth = window.innerWidth < 768 ? 200 : undefined;
}
```

Alternatively, this could be handled purely via CSS clamp, but AG Grid manages column widths internally so the JS approach is more reliable.

### 3c. PASS -- Sticky column overlap

The sticky column shadow pseudo-element is correctly positioned with `right: -6px` (line 230) so it does not overlap the adjacent column's content. The z-index layering (body cells z-1, header cell z-2) prevents sticky column content from appearing behind scrolling content.

---

## 4. Breakpoint Behavior

### 4a. ISSUE -- No tablet-specific breakpoint (768px-1023px gap)

**Priority:** P2

**What's wrong:** The responsive CSS has exactly two breakpoints:

1. `@media (max-width: 767px)` -- mobile overrides (line 637)
2. `@media (min-width: 1024px)` -- desktop title bump (line 675)

The 768px-1023px tablet range gets no specific treatment. This means:

- Tablets get the "comfortable" density with 40px rows, which may be too spacious for data-dense spreadsheets on a 768px screen
- The density toggle remains visible, but users must manually switch to compact
- The spreadsheet header bar remains in horizontal flex layout (name left, controls right), which is fine at 768px but starts feeling cramped if the spreadsheet name is long
- The `.spreadsheets-reader__meta-row` stays in flex row layout (line 619-623), which can cause the metadata + density toggle to wrap awkwardly around 768-900px

**Where:** `css/spreadsheet.css`, lines 635-679 (responsive section)

**Fix:** Add a tablet breakpoint to smooth the transition:

```css
@media (max-width: 1023px) and (min-width: 768px) {
  /* Suggest compact density but don't force it */
  .thq-spreadsheet-header__name {
    font-size: var(--text-sm);
  }

  .spreadsheets-reader__title {
    font-size: var(--text-lg);
  }
}
```

### 4b. ISSUE -- Reader view metadata row wrapping at 768-900px

**Priority:** P2

**What's wrong:** The `.spreadsheets-reader__meta-row` uses `display: flex; justify-content: space-between` (line 619-623). At 768px, this row contains: metadata text on the left ("12 rows . 6 columns . Created by Yuki . Feb 9, 2026") and the density toggle on the right. The metadata text alone is ~300px wide. The density toggle buttons are ~180px wide. At 768px with container padding, the available width is about 700px. This is tight but fits. However, at widths where the metadata text wraps (e.g., adding more metadata items), the layout can become awkward with the density toggle floating right while the metadata stacks.

The mobile override at 767px stacks the meta row vertically (`flex-direction: column`), but at 768px it snaps back to horizontal. This creates a jarring jump right at the breakpoint boundary.

**Where:** `css/spreadsheet.css`, lines 619-623 (`.spreadsheets-reader__meta-row`) and lines 668-672 (mobile override)

**Fix:** Use `flex-wrap: wrap` so the density toggle wraps gracefully below the metadata when space runs out, instead of relying on a hard breakpoint:

```css
.spreadsheets-reader__meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}
```

This allows the layout to self-adjust at any intermediate width. The mobile override can remain as-is for the forced column layout.

### 4c. PASS -- 640px container padding transition

The `.container` padding transitions from `space-5` (20px) to `space-8` (32px) at 640px via `shared.css` (line 54-59). This is consistent across all pages and the spreadsheet content respects it properly.

---

## 5. List View Responsiveness

### 5a. ISSUE -- Spreadsheet item metadata does not stack on narrow screens

**Priority:** P2

**What's wrong:** The `.spreadsheet-item` is a flex row with the icon, info (name + description), and meta (rows/cols + date) side by side. At 320-375px, the meta column (`flex-shrink: 0; white-space: nowrap`) forces the info column to compress. Since the description has `text-overflow: ellipsis`, it gets heavily truncated. But the meta text ("12 rows, 6 cols" + "Feb 9, 2026") at `text-xs` takes about 100-120px. On a 320px screen with 20px padding each side, that leaves only ~180px for the icon + name + description.

The docs page has a similar pattern and handles it with a `flex-wrap` + `order` approach at 639px (docs.css lines 549-569), but the spreadsheet list items have no equivalent.

**Where:** `css/spreadsheet.css`, lines 521-579 (`.spreadsheet-item` and children)

**Fix:** Add a mobile stacking rule:

```css
@media (max-width: 639px) {
  .spreadsheet-item {
    flex-wrap: wrap;
  }

  .spreadsheet-item__meta {
    flex-basis: 100%;
    text-align: left;
    padding-left: 28px; /* 16px icon + 12px gap */
  }
}
```

### 5b. PASS -- Accordion expand/collapse

The accordion groups use CSS `grid-template-rows: 0fr / 1fr` transitions, which is a robust pattern that works at all screen sizes. The `overflow: hidden` on `.spreadsheet-group__body-inner` correctly prevents content flash during transitions.

### 5c. ISSUE -- Group header padding not responsive

**Priority:** P3

**What's wrong:** `.spreadsheet-group__header` has fixed `padding: var(--space-5)` (20px) at all screen sizes (line 456). On 320px screens, 20px padding on each side of a group header consumes 40px of the 280px content area (after container padding), leaving only 240px for the group name + count + chevron. This is tight but usually works. However, the `space-5` feels visually heavy on small screens relative to other mobile spacing.

**Where:** `css/spreadsheet.css`, line 456

**Fix:**

```css
@media (max-width: 639px) {
  .spreadsheet-group__header {
    padding: var(--space-3) var(--space-4);
  }

  .spreadsheet-group__list {
    padding: 0 var(--space-4) var(--space-4);
  }
}
```

---

## 6. Reader View Header

### 6a. ISSUE -- Back button touch target too small

**Priority:** P1

**What's wrong:** The `.spreadsheets-reader__back` button has `padding: 0` (line 593). The button text is `font-size: var(--text-sm)` (14px) with `line-height` inherited from body (1.5). This gives a touch target of approximately 14px * 1.5 = 21px height. On mobile, this is well below the 44px minimum touch target required by WCAG 2.1 Success Criterion 2.5.5 and Apple/Google HIG guidelines. The button is the primary "escape hatch" from the reader view -- it must be easy to tap.

**Where:** `css/spreadsheet.css`, lines 586-602 (`.spreadsheets-reader__back`)

**Fix:**

```css
.spreadsheets-reader__back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-family);
  margin-bottom: var(--space-4);
  margin-left: calc(-1 * var(--space-3)); /* offset padding for visual alignment */
  transition: color 0.15s ease;
}
```

The `min-height: 44px` ensures the touch target meets the minimum, and the negative margin-left compensates for the padding so the text still aligns with the left edge of the content.

### 6b. PASS -- Reader title responsive sizing

The title uses `font-size: var(--text-xl)` (20px) at desktop, dropping to `var(--text-lg)` (18px) at mobile via the 767px breakpoint (line 664-665). This is a reasonable step-down. The description's `max-width: 90ch` prevents excessively long lines on wide screens.

### 6c. PASS -- Mobile meta row stacking

At 767px and below, the meta row correctly switches to `flex-direction: column` with `align-items: flex-start` (lines 668-672), stacking the metadata above the density toggle area. Since the toggle is hidden on mobile, only the metadata text shows.

---

## 7. Typography Scaling

### 7a. PASS -- Cell text sizing

The density system handles text scaling correctly. Comfortable uses `text-sm` (14px) and compact uses `text-xs` (12px). Mobile forces compact. At 320px with 12px text, cell content is readable on modern high-DPI screens.

### 7b. ISSUE -- Page title lacks fluid scaling

**Priority:** P3

**What's wrong:** The `.spreadsheets-header__title` uses `font-size: var(--text-2xl)` (24px) by default and jumps to `var(--text-3xl)` (30px) at 1024px (line 675-679). This is a hard jump with no intermediate sizing. At 640px-1023px, the 24px title looks slightly small for a page heading. A fluid scale would smooth this transition.

**Where:** `css/spreadsheet.css`, lines 420-425 and 675-679

**Fix:**

```css
.spreadsheets-header__title {
  font-size: clamp(var(--text-2xl), 2vw + 1rem, var(--text-3xl));
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2) 0;
}
```

This eliminates the need for the `@media (min-width: 1024px)` override and provides smooth scaling.

### 7c. PASS -- Header cell text

AG Grid header cells use `text-xs` (12px) at all densities, which is consistent and readable. The `text-transform: uppercase` with `letter-spacing: 0.05em` maintains legibility.

---

## 8. Touch Targets

### 8a. ISSUE -- Density toggle buttons too small on touch

**Priority:** P1

**What's wrong:** The `.thq-density-toggle` buttons have `padding: var(--space-1) var(--space-2)` (4px 8px) with `font-size: var(--text-xs)` (12px) and `line-height: 1`. This produces a button height of approximately 12px + 8px = 20px, well below the 44px minimum. On mobile this is hidden (good), but on tablets (768px+) the toggle is visible and 20px tall.

While iPad users may be using mouse/trackpad, many tablet users tap with fingers. A 20px touch target is unreliable.

**Where:** `css/spreadsheet.css`, lines 165-207 (`.thq-density-toggle`)

**Fix:**

```css
.thq-density-toggle {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  min-height: 36px; /* compromise: 44px feels oversized for this control */
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

@media (pointer: coarse) {
  .thq-density-toggle {
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
  }
}
```

The `@media (pointer: coarse)` query specifically targets touch devices, expanding the target only where needed.

### 8b. ISSUE -- Spreadsheet group headers and items meet 44px but barely

**Priority:** P3

**What's wrong:** The `.spreadsheet-group__header` has `padding: var(--space-5)` (20px top + 20px bottom = 40px content area, plus line-height gives ~54px total). This meets the 44px minimum. The `.spreadsheet-item` has `padding: var(--space-3) 0` (12px top + 12px bottom = 24px padding). With the name at `text-sm` (14px, line-height 1.5 = 21px) plus optional description at `text-xs` (12px, line-height ~1.5 = 18px), the total height is roughly 24px + 21px + 18px = 63px. This meets the minimum.

However, for items without a description, the height drops to approximately 24px + 21px = 45px, which is borderline.

**Where:** `css/spreadsheet.css`, lines 521-536

**Fix:** No code change needed -- the 45px height meets the 44px requirement. Flagging as informational only.

### 8c. ISSUE -- AG Grid sort header touch targets

**Priority:** P3

**What's wrong:** AG Grid header cells use `--ag-header-height: 40px` in comfortable mode and `32px` in compact. The 40px is close to but below the 44px recommendation. On mobile (forced compact), the 32px header height is well below the threshold. However, sorting is a secondary interaction (not navigation), and the full header cell width provides a large horizontal touch area. The effective touch area is 32px * column-width, which compensates somewhat.

**Where:** `css/spreadsheet.css`, lines 37-38 and 150-151

**Fix:** No change recommended for v1. The 32px compact header on mobile is a deliberate density trade-off to show more data. If sort-on-mobile proves problematic in user testing, consider: (1) increasing `--ag-header-height` in the mobile override to 40px while keeping row height at 32px, or (2) adding a sort icon that expands the touch target.

---

## 9. Embedded Spreadsheets

### 9a. ISSUE -- Docs-embedded spreadsheet constrained by 90ch max-width with no breakout

**Priority:** P2

**What's wrong:** The `.docs-reader__content` has `max-width: 90ch` and `margin: 0 auto` (docs.css line 367-368). Spreadsheets embedded via `<!-- spreadsheet: ... -->` directives are rendered inside `.docs-spreadsheet-embed` which inherits this constraint. On a 1440px screen, the 90ch (~720px) container means a 7-column spreadsheet has only ~103px per column. The spreadsheet scrolls horizontally within its 720px container, but this feels cramped when there is 360px of unused whitespace on each side.

By contrast, the standalone spreadsheets page renders the grid at full `.container` width (1120px), giving 160px per column for the same spreadsheet. Markdown tables in docs get `display: block; overflow-x: auto` but they at least visually fill the 90ch width since their columns auto-size.

**Where:** `css/docs.css`, line 367 (`max-width: 90ch`); `css/spreadsheet.css`, lines 372-384 (`.docs-spreadsheet-embed`)

**Fix:** Allow docs-embedded spreadsheets to break out of the 90ch content width and fill the full `.container` width:

```css
.docs-reader__content .docs-spreadsheet-embed {
  max-width: none;
  width: calc(100% + 2 * (50% - 45ch)); /* break out to container edges */
  margin-left: calc(50% - 45ch - 50%);  /* center the breakout */
  margin-left: calc(-1 * max(0px, 50% - 45ch)); /* only break out if container is wider than 90ch */
}
```

A simpler alternative that avoids the calc complexity -- use a negative margin approach:

```css
@media (min-width: 1024px) {
  .docs-reader__content .docs-spreadsheet-embed {
    margin-left: calc(-1 * var(--space-8));
    margin-right: calc(-1 * var(--space-8));
    max-width: calc(100% + var(--space-8) * 2);
  }
}
```

However, the cleanest fix is probably to move the spreadsheet embed processing to insert the embed *after* the `.docs-reader__content` container rather than inside it, so it naturally inherits the full `.container` width. This would require a JS change in `docs.js`.

### 9b. PASS -- Project detail view embedding

Spreadsheets in the project detail view (`detail__spreadsheet`) render at full panel width. The `detail__data-section` has no constraining `max-width`, so the grid fills the available space. This works correctly.

### 9c. ISSUE -- Docs embed header padding does not reduce on mobile

**Priority:** P3

**What's wrong:** `.thq-spreadsheet-header--inline` has fixed `padding: var(--space-3) var(--space-4)` (12px 16px) at all widths (line 381). On 320px screens with the container at 280px, the 32px of horizontal padding plus the border (2px total) leaves 246px for the header name. This is fine for most names, but there is no responsive reduction. The project detail headers and reader view headers all reduce their sizing at 767px, but the inline embed header does not.

**Where:** `css/spreadsheet.css`, lines 380-391 (`.thq-spreadsheet-header--inline`)

**Fix:**

```css
@media (max-width: 639px) {
  .thq-spreadsheet-header--inline {
    padding: var(--space-2) var(--space-3);
  }
}
```

---

## 10. Container Queries vs. Media Queries

### 10a. ISSUE -- Media queries used where container queries would be more appropriate

**Priority:** P3

**What's wrong:** The spreadsheet component renders in three different container contexts:

1. **Standalone page** -- full `.container` width (up to 1120px)
2. **Project detail view** -- within the detail panel (width varies based on layout)
3. **Docs embed** -- within `.docs-reader__content` at 90ch (~720px max)

The responsive CSS uses `@media (max-width: 767px)` for mobile overrides. This works for the standalone page, but for the docs embed (always ~720px or narrower), the density toggle is shown even though the available width is similar to a tablet. And in the project detail view, if the detail panel is narrow, the media query does not fire because the *viewport* is wide even though the *container* is narrow.

Container queries would allow the spreadsheet to respond to its actual available width rather than the viewport width.

**Where:** `css/spreadsheet.css`, lines 635-679 (all responsive overrides)

**Fix:** This is the right architectural direction but represents a meaningful refactor. For v1, the media-query approach is acceptable because:

- The docs embed hides the density toggle by not rendering it (no toggle in inline embeds per design spec)
- The project detail panel is always reasonably wide on desktop
- Mobile correctly forces compact

For v2, the recommended approach:

```css
.thq-spreadsheet-wrapper {
  container-type: inline-size;
  container-name: spreadsheet;
}

@container spreadsheet (max-width: 600px) {
  .thq-spreadsheet.ag-theme-quartz {
    --ag-row-height: 32px;
    --ag-header-height: 32px;
    --ag-font-size: var(--text-xs);
    --ag-cell-horizontal-padding: var(--space-2);
  }

  .thq-spreadsheet-header__controls {
    display: none;
  }

  .thq-spreadsheet-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
}
```

This would make the component truly self-contained and responsive to its context, not the viewport. Container queries have strong browser support (Chrome 105+, Safari 16+, Firefox 110+) which covers the target audience.

---

## Issue Summary Table

| # | Area | Issue | Priority | Type |
|---|------|-------|----------|------|
| 1b | Grid container | Wrapper missing `overflow-x: clip` | P3 | CSS fix |
| 2a | Horizontal scroll | Missing `-webkit-overflow-scrolling: touch` | P2 | CSS addition |
| 2c | Horizontal scroll | No visual scroll affordance on touch | P2 | CSS animation |
| 3a | Column sizing | No minimum column widths -- columns collapse on narrow screens | P1 | JS fix |
| 3b | Column sizing | Sticky first column has no width constraints | P2 | JS fix |
| 4a | Breakpoints | No tablet-specific breakpoint (768-1023px) | P2 | CSS addition |
| 4b | Breakpoints | Reader meta row wrapping at 768-900px | P2 | CSS fix |
| 5a | List view | Spreadsheet item metadata does not stack on mobile | P2 | CSS addition |
| 5c | List view | Group header padding not responsive | P3 | CSS addition |
| 6a | Reader header | Back button touch target below 44px minimum | P1 | CSS fix |
| 7b | Typography | Page title lacks fluid scaling | P3 | CSS enhancement |
| 8a | Touch targets | Density toggle buttons below 44px on touch | P1 | CSS fix |
| 8c | Touch targets | AG Grid header height 32px in compact on mobile | P3 | Informational |
| 9a | Embedded | Docs embed over-constrained by 90ch content width | P2 | CSS/JS fix |
| 9c | Embedded | Inline embed header padding not responsive | P3 | CSS addition |
| 10a | Architecture | Media queries where container queries would be better | P3 | V2 refactor |

---

## Recommended Fix Priority

**Immediate (P1 -- broken layout / accessibility violations):**
1. **3a** -- Add minimum column widths to prevent data illegibility
2. **6a** -- Fix back button touch target (accessibility requirement)
3. **8a** -- Fix density toggle touch target (accessibility requirement)

**Next pass (P2 -- awkward but usable):**
4. **4b** -- Add `flex-wrap` to reader meta row
5. **5a** -- Stack spreadsheet item metadata on mobile
6. **2a** -- Add `-webkit-overflow-scrolling: touch`
7. **9a** -- Docs embed breakout from 90ch constraint
8. **4a** -- Add tablet breakpoint
9. **3b** -- Constrain sticky first column width
10. **2c** -- Touch scroll affordance animation

**Polish (P3 -- refinements):**
11. **7b** -- Fluid title scaling with clamp()
12. **5c** -- Responsive group header padding
13. **9c** -- Inline embed header responsive padding
14. **1b** -- Add overflow-x: clip to wrapper
15. **10a** -- Container query migration (v2)
16. **8c** -- Informational, no change needed

---

## What I'd Tell the Team

- **Alice:** Issues 3a (minWidth) and 3b (first column constraint) require changes in `js/spreadsheet.js` `convertColumn()`. I can provide the exact config but you own the adapter code.
- **Robert:** The docs-embed width constraint (9a) is a design decision -- should embedded spreadsheets break out of the 90ch content width? I recommend yes, but want your sign-off.
- **Amara:** Issues 6a, 8a, and 8c are touch target / accessibility concerns. The P1s (back button, density toggle) need fixing before shipping. The header height (8c) is a judgment call.
- **Thomas:** Three P1 issues identified. All are fixable within the existing architecture without scope expansion. Recommend addressing before next QA pass.
