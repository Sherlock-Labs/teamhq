# Spreadsheet Interactions Audit

**Author:** Nina (Front-End Interactions Specialist)
**Date:** Feb 9, 2026
**Scope:** Micro-interaction quality review of AG Grid implementation across `css/spreadsheet.css`, `js/spreadsheet.js`, `js/spreadsheets.js`, and `spreadsheets.html`.

---

## Summary

The implementation is structurally sound and faithful to Robert's design spec. The CSS variable overrides, cell type rendering, and page architecture are all correctly built. However, there are 14 interaction-level issues ranging from "looks broken" to "nice polish." Most are small CSS fixes. The biggest pain points are: the density toggle snapping without animating the grid rows, the header hover transition being missing (instant on, instant off), and the accordion chevron having a redundant duplicate transition. None of these are bugs -- they are texture gaps where the interaction layer does not yet match the rest of TeamHQ's polish level.

**Issue count by priority:**
- P1 (looks broken): 2
- P2 (feels off): 8
- P3 (nice to have): 4

---

## 1. Hover States

### 1a. Row hover -- GOOD

The row hover uses `transition: background-color 120ms ease` (line 82, `css/spreadsheet.css`). This is appropriate -- 120ms is fast enough to feel immediate on hover-in while smoothing the hover-out. The hover color (`--color-accent-light` at 4% opacity) is subtle and matches Linear's pattern. The sticky first column also correctly picks up the hover color (line 246-248).

**Verdict:** No issue.

### 1b. Header hover -- P2: Missing transition

**What's wrong:** The header cell hover (line 75-77) changes `background-color` on `:hover` but has no `transition` property. The background snaps on instantly and snaps off instantly. Every other hoverable element in TeamHQ (nav links, tool cards, project cards, buttons) uses `transition: ... 0.15s ease`. The header hover is the only interactive element in the spreadsheet that lacks a transition.

**Where:** `css/spreadsheet.css`, Section 5 (line 75-77), selector `.ag-theme-quartz .ag-header-cell:hover`

**Fix:**
```css
/* Add to Section 5, before the :hover rule */
.ag-theme-quartz .ag-header-cell {
  transition: background-color 0.15s ease;
}
```

Also add `.ag-theme-quartz .ag-header-cell` to the `prefers-reduced-motion` rule at line 683-690.

**Priority:** P2 -- the snap is noticeable when moving the mouse across headers.

### 1c. Spreadsheet group card hover -- P3: Border color jump is harsh

**What's wrong:** The `.spreadsheet-group:hover` rule (line 449) changes `border-color` from `var(--color-border)` (#e5e5e5) to `var(--color-zinc-700)` (#3f3f46). That is a jump from a very light gray to a very dark gray -- a significant contrast leap. The transition is 0.2s ease (line 445), which helps, but the destination color is much darker than what other cards in TeamHQ use. Compare: `.project-card:hover` in `styles.css` also goes to `--color-zinc-700`, so this is technically consistent, but across the whole design system that hover color is arguably too aggressive for a light theme. This is a design-level note, not a code bug.

**Where:** `css/spreadsheet.css`, line 449, selector `.spreadsheet-group:hover`

**Fix (if Robert agrees):** Use `var(--color-border-strong)` (#d4d4d4) instead of `var(--color-zinc-700)` for a subtler hover. Or keep it as-is for consistency with project cards.

**Priority:** P3 -- design consistency call, not a code defect.

### 1d. Spreadsheet list item hover -- GOOD

The `.spreadsheet-item:hover` (line 542-544) uses `background: var(--color-accent-light)` with a 0.15s ease transition (line 535). Consistent with the grid row hover feel. No issue.

### 1e. Back button hover -- GOOD

The `.spreadsheets-reader__back:hover` (line 600-602) transitions color from tertiary to primary with 0.15s ease (line 597). Matches the standard TeamHQ text-link hover pattern. No issue.

### 1f. Density toggle hover -- GOOD

The toggle buttons have a `transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease` (line 176). The hover state (line 189-192) changes background to secondary and text to secondary. Clean and consistent. No issue.

---

## 2. Transitions

### 2a. Density toggle grid animation -- P1: Grid rows snap, no animation

**What's wrong:** When the user clicks the density toggle, `setDensity()` in `js/spreadsheet.js` (line 298-306) does two things: (1) swaps the CSS class from `thq-density--compact` to `thq-density--comfortable` (or vice versa), and (2) calls `gridApi.updateGridOptions({ rowHeight, headerHeight })`. The CSS class swap changes `--ag-*` variables. The `updateGridOptions` call forces AG Grid to re-render rows at the new height. The result is an instant snap -- every row jumps from 32px to 40px (or back) in a single frame. There is no height animation.

This is the most noticeable interaction gap. The density toggle buttons themselves animate beautifully (color, background, border all transition), but the thing they control -- the grid -- snaps. It creates a disconnect: polished control, jarring result.

**Where:** `js/spreadsheet.js`, line 298-306, `setDensity()` method. Also `css/spreadsheet.css` density overrides at lines 149-161.

**Fix:** AG Grid does not natively support animating row height changes. A CSS transition on `--ag-row-height` will not work because AG Grid sets explicit pixel heights on row DOM elements via inline styles. The practical fix is a crossfade: fade the grid out, apply the change, fade it back in. This makes the snap invisible and adds a sense of "settling."

```javascript
TeamHQSpreadsheet.prototype.setDensity = function (density) {
  this.density = density;
  // Crossfade: fade out, swap, fade in
  this.gridEl.style.transition = 'opacity 120ms ease-out';
  this.gridEl.style.opacity = '0.3';
  var self = this;
  setTimeout(function () {
    self.gridEl.className = 'thq-spreadsheet ag-theme-quartz thq-density--' + density;
    self.gridApi.updateGridOptions({
      rowHeight: density === 'compact' ? 32 : 40,
      headerHeight: density === 'compact' ? 32 : 40
    });
    // Let AG Grid re-render, then fade back in
    requestAnimationFrame(function () {
      self.gridEl.style.opacity = '1';
      self.gridEl.style.transition = 'opacity 180ms ease-in';
      // Clean up inline styles after animation
      setTimeout(function () {
        self.gridEl.style.transition = '';
        self.gridEl.style.opacity = '';
      }, 200);
    });
  }, 130);
  TeamHQSpreadsheet.saveDensity(density);
};
```

For `prefers-reduced-motion`, skip the crossfade and apply instantly (check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before applying the animation).

**Priority:** P1 -- the density toggle is a featured interaction and the snap makes it feel unfinished.

### 2b. View transitions (list to reader) -- P2: Instant show/hide with no motion

**What's wrong:** When the user clicks a spreadsheet item, `showReaderView()` in `js/spreadsheets.js` (line 161-163) sets `listView.style.display = 'none'` and `readerView.style.display = ''`. This is an instant cut. The reverse (`showListView()`, line 151-158) is also an instant cut. Every other page-level transition in TeamHQ (modal open/close, accordion expand, card enter/leave) has some kind of motion. This list-to-reader swap is the only major view transition with zero animation.

**Where:** `js/spreadsheets.js`, lines 151-163, `showListView()` and `showReaderView()` functions.

**Fix:** A simple opacity crossfade. When switching views:

```javascript
function showReaderView() {
  listView.style.transition = 'opacity 150ms ease-out';
  listView.style.opacity = '0';
  setTimeout(function () {
    listView.style.display = 'none';
    listView.style.transition = '';
    listView.style.opacity = '';
    readerView.style.display = '';
    readerView.style.opacity = '0';
    // Force reflow before animating in
    void readerView.offsetHeight;
    readerView.style.transition = 'opacity 150ms ease-in';
    readerView.style.opacity = '1';
    setTimeout(function () {
      readerView.style.transition = '';
      readerView.style.opacity = '';
    }, 160);
  }, 160);
}
```

Apply the same pattern in reverse for `showListView()`. For `prefers-reduced-motion`, skip the animation and do the instant swap.

**Priority:** P2 -- the instant cut is functional but feels jarring compared to the rest of TeamHQ.

### 2c. Accordion expand/collapse -- GOOD, but one nit

The accordion uses the CSS grid `grid-template-rows: 0fr -> 1fr` transition trick (lines 502-514). Duration is 0.25s ease. This is a solid, well-understood pattern. The chevron also rotates with a 0.2s ease transition (lines 483-498).

**Nit (P3):** The chevron has its transition declared twice -- once on `.spreadsheet-group__chevron` (line 483) and once on `.spreadsheet-group__chevron::before` (line 494). The `::before` pseudo-element is what actually rotates (via `transform`), so the transition on the parent span is unnecessary. It will not cause a visible problem, but it is dead code.

**Where:** `css/spreadsheet.css`, line 483

**Fix:** Remove `transition: transform 0.2s ease;` from `.spreadsheet-group__chevron` (line 483). The `::before` element (line 494) already has the transition.

**Priority:** P3 -- dead code, no visual impact.

### 2d. Scroll shadow appearance/disappearance -- GOOD

Both the sticky column shadow (line 236, 200ms ease) and the scroll-hint shadow (line 268, 200ms ease) fade smoothly. The 200ms duration is appropriate for a shadow that should feel ambient, not attention-grabbing. No issue.

---

## 3. Cell Selection

### 3a. Cell focus suppressed -- GOOD decision, but leaves a gap

**What's wrong:** `suppressCellFocus: true` (line 216, `js/spreadsheet.js`) removes AG Grid's default blue focus ring on cells. `enableCellTextSelection: true` (line 217) allows text selection. This is the right call for a read-only viewer -- there is nothing to "focus" on since there is no editing. However, AG Grid's default cell focus outline (a blue border) would normally appear when users Tab into the grid and arrow-key navigate. With it suppressed, keyboard users who Tab into the grid get no visual feedback about their position.

**Where:** `js/spreadsheet.js`, lines 216-217

**Fix:** This is an accessibility concern more than an interaction concern. Since the table is read-only and text-selectable, the suppression is defensible. But if keyboard navigation is expected (the design spec Section 10b says arrow keys should move between cells), then there should be a custom focus indicator. Add:

```css
.ag-theme-quartz .ag-cell:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
```

Then change `suppressCellFocus` to `false` (or remove it) so AG Grid tracks cell focus for keyboard users. But this is a product decision -- if the table is purely view-only with text selection, suppressing focus is fine. Flag for Amara's accessibility review.

**Priority:** P2 -- accessibility gap if keyboard navigation is expected.

### 3b. No range selection -- GOOD

`rowSelection: undefined` (line 213) means no row or range selection highlighting. For a read-only data viewer, this is correct. No blue selection rectangles, no shift-click ranges. The user can still select text within cells via `enableCellTextSelection`. No issue.

---

## 4. Scroll Behavior

### 4a. Sticky column shadow -- GOOD

The shadow appears when `scrollLeft > 0` and disappears at 0. The JS toggle (lines 253-273 in `spreadsheet.js`) is clean and uses a passive scroll listener. The 200ms opacity transition makes the shadow fade in and out smoothly. No issue.

### 4b. Scroll-hint gradient -- GOOD

The right-edge gradient (lines 258-274 in CSS) appears when `scrollWidth > clientWidth` and disappears when scrolled to the end. The 24px width is wide enough to notice, and the 4% opacity is barely perceptible -- a "hint" as Robert specified. No issue.

### 4c. Horizontal scroll -- P3: No scroll-behavior: smooth

**What's wrong:** AG Grid's horizontal scroll uses the browser's default scroll behavior, which is fine for mouse/trackpad. But when using keyboard navigation (if re-enabled), or when a column near the edge is sorted, the scroll jump is instant. Adding `scroll-behavior: smooth` to the AG Grid viewport would make programmatic scrolls smooth.

**Where:** Would be added to `css/spreadsheet.css`.

**Fix:**
```css
.thq-spreadsheet .ag-body-viewport,
.thq-spreadsheet .ag-body-horizontal-scroll-viewport {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  .thq-spreadsheet .ag-body-viewport,
  .thq-spreadsheet .ag-body-horizontal-scroll-viewport {
    scroll-behavior: auto;
  }
}
```

**Priority:** P3 -- barely noticeable with mouse scrolling, only matters for keyboard/programmatic scrolls.

---

## 5. Density Toggle

### 5a. Toggle button animation -- GOOD

The button state changes (active to inactive, inactive to active) animate background-color, color, and border-color over 150ms ease. Smooth and crisp. The segmented control grouping with shared borders and the active-state accent coloring feel polished. No issue with the buttons themselves.

### 5b. Grid content animation -- See Issue 2a (P1)

The grid rows snap when density changes. Covered above.

---

## 6. Loading States

### 6a. Pulse animation -- GOOD

The `thq-pulse` keyframe (lines 321-324) oscillates opacity between 0.4 and 1.0 over 1.5s with ease-in-out. This is a well-calibrated loading pulse -- not too fast (which feels anxious) and not too slow (which feels frozen). The reduced-motion override (lines 692-696) correctly stops the animation and sets opacity to 1. No issue.

### 6b. Skeleton loading -- P2: No staggered entrance

**What's wrong:** The two skeleton group cards (rendered in `js/spreadsheets.js`, lines 363-365) both pulse in sync. They appear at the same time with the same animation phase. This is fine, but a small stagger (the second card starting 200ms after the first) would make the loading state feel more dynamic and less "placeholder-y."

**Where:** `js/spreadsheets.js`, lines 363-365, and `css/spreadsheet.css`, lines 359-368.

**Fix:** Add an animation-delay to the second skeleton:

```css
.thq-skeleton--group:nth-child(2) {
  animation-delay: 0.2s;
}
```

Or apply via inline style in the JS:

```javascript
listContainer.innerHTML =
  '<div class="thq-skeleton thq-skeleton--group"></div>' +
  '<div class="thq-skeleton thq-skeleton--group" style="animation-delay: 0.2s"></div>';
```

**Priority:** P2 -- minor polish, but staggered loading skeletons are a hallmark of premium UI.

### 6c. Loading text to grid -- P2: No transition from loading state to rendered grid

**What's wrong:** When a spreadsheet is opened in the reader view, `openSpreadsheet()` (line 168-189, `js/spreadsheets.js`) first sets `readerView.innerHTML` to a loading paragraph, then replaces it entirely with the full reader view (title, metadata, grid) via `renderReaderView()`. The swap is instant -- one frame the loading text is pulsing, the next frame the full view appears. There is no fade-in for the rendered content.

**Where:** `js/spreadsheets.js`, lines 168-189 and 191-251.

**Fix:** After `renderReaderView` sets the innerHTML, fade in the reader content:

```javascript
.then(function (data) {
  renderReaderView(data, meta);
  // Fade in the rendered content
  readerView.style.opacity = '0';
  void readerView.offsetHeight; // force reflow
  readerView.style.transition = 'opacity 200ms ease-in';
  readerView.style.opacity = '1';
  setTimeout(function () {
    readerView.style.transition = '';
    readerView.style.opacity = '';
  }, 220);
  window.scrollTo(0, 0);
})
```

**Priority:** P2 -- the abrupt swap from pulsing text to full grid is one of the more noticeable rough edges.

---

## 7. Badge Pills

### 7a. Badge hover states -- GOOD (intentionally none)

The badge pills have no `:hover` styles, no `cursor: pointer`, and no transitions. This is correct. Badges are data display elements, not interactive controls. They should feel static. Adding a hover state would imply clickability. No issue.

### 7b. Badge appearance within cells -- P3: No entrance animation on sort

**What's wrong:** When the user sorts a badge column, the rows reorder and badge pills appear in their new positions instantly. Because `animateRows: false` is set (line 212, `js/spreadsheet.js`), there is no row movement animation on sort. The badges just pop into place. A subtle fade-in or slide on sort would make the reorder feel smoother.

**Where:** `js/spreadsheet.js`, line 212.

**Fix:** Enabling `animateRows: true` would let AG Grid animate row position changes on sort. However, Robert's design spec and Andrei's tech approach explicitly disabled this (`animateRows: false`, noted as "animateRows disabled for snappy sorts"). This was a deliberate decision for performance and snappiness. Respect this decision.

If reconsideration is desired, the compromise is to enable it and keep the animation short. AG Grid's default row animation is 400ms, which can be overridden:

```css
.ag-theme-quartz {
  --ag-row-animation-speed: 200ms;
}
```

But this should go through Robert first. Do not change without design approval.

**Priority:** P3 -- intentional design decision to keep sorts snappy.

---

## 8. Back Button and Navigation

### 8a. Back button feel -- P2: No arrow animation on hover

**What's wrong:** The back button `<- Back to list` (line 195, `js/spreadsheets.js`) uses an HTML entity `&larr;` for the arrow. On hover, only the text color transitions (tertiary to primary, 0.15s ease). The arrow does not move. Across TeamHQ, the `.tool-card__launch-arrow` (in `styles.css`, line 257-260) translates the arrow on hover (`transform: translateX(2px)`). The back button arrow should do the equivalent in reverse -- a small `translateX(-2px)` nudge to the left.

**Where:** `css/spreadsheet.css`, lines 586-602, selectors `.spreadsheets-reader__back` and `.spreadsheets-reader__back:hover`. Also `js/spreadsheets.js` line 195 where the arrow is rendered inline.

**Fix:** The arrow needs to be a separate element to animate independently. Refactor the back button HTML in `js/spreadsheets.js`:

```javascript
html += '<button class="spreadsheets-reader__back" type="button">' +
  '<span class="spreadsheets-reader__back-arrow">&larr;</span> Back to list</button>';
```

Then in CSS:

```css
.spreadsheets-reader__back-arrow {
  display: inline-block;
  transition: transform 0.15s ease;
}

.spreadsheets-reader__back:hover .spreadsheets-reader__back-arrow {
  transform: translateX(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .spreadsheets-reader__back-arrow {
    transition: none;
  }
}
```

**Priority:** P2 -- a small touch but it is a pattern already established elsewhere in TeamHQ. The back button is a prominent interaction point.

### 8b. Reader-to-list transition -- See Issue 2b (P2)

The instant `display: none` / `display: ''` swap is covered under transitions above.

---

## 9. Micro-Interactions

### 9a. Sort indicator animation -- P2: Sort icon appears/disappears without transition

**What's wrong:** When a column is sorted, AG Grid adds/removes the `.ag-sort-ascending-icon` or `.ag-sort-descending-icon` elements. The icon color is correctly set to `var(--color-accent)` (line 69-71). However, the icon itself has no entrance or exit animation -- it just appears and disappears in a single frame. A subtle fade-in (opacity 0 to 1 over 150ms) would make the sort state change feel smoother.

**Where:** `css/spreadsheet.css`, Section 4, lines 68-71.

**Fix:**

```css
.ag-theme-quartz .ag-sort-ascending-icon,
.ag-theme-quartz .ag-sort-descending-icon {
  color: var(--color-accent);
  animation: thq-sort-icon-in 150ms ease-out;
}

@keyframes thq-sort-icon-in {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Add the keyframe animation to the `prefers-reduced-motion` override to disable it.

**Priority:** P2 -- sort is the only interactive feature of the grid, so its feedback should be crisp and polished.

### 9b. Column resize handle -- NOT APPLICABLE

`resizable: false` is set on all columns (line 136, `js/spreadsheet.js`) and `--ag-header-column-resize-handle-display: none` is set in CSS (line 32). No resize handles are visible. No issue.

### 9c. Header cell cursor -- P2: No cursor: pointer on sortable headers

**What's wrong:** AG Grid's built-in Quartz theme does not add `cursor: pointer` to sortable header cells by default. Headers are interactive (clicking sorts), but the cursor remains the default arrow. This is inconsistent with every other clickable element in the spreadsheet (list items, toggle buttons, back button, accordion headers) which all have `cursor: pointer`.

**Where:** `css/spreadsheet.css`, needs a new rule.

**Fix:**

```css
.ag-theme-quartz .ag-header-cell {
  cursor: pointer;
}
```

This is safe because all columns have `sortable: true` (line 135, `js/spreadsheet.js`).

**Priority:** P2 -- users expect the pointer cursor on clickable elements. Its absence on headers contradicts the hover background feedback.

### 9d. Group header lacks hover feedback -- P2: Click target has no hover state

**What's wrong:** The `.spreadsheet-group__header` button (lines 452-464) is clickable (expands/collapses the accordion) and has `cursor: pointer`, but it has no hover background color. Every other clickable row in TeamHQ (`.spreadsheet-item`, `.detail__note`, `.project-card`, `.meeting-card`) changes background or border on hover. The group header has nothing -- only the parent card's border-color changes, which is a much more subtle signal.

**Where:** `css/spreadsheet.css`, lines 452-464. Missing a `:hover` rule.

**Fix:**

```css
.spreadsheet-group__header:hover {
  background: var(--color-bg-secondary);
}
```

This matches the density toggle inactive hover (background: secondary) and provides a clear hover signal on the click target itself rather than relying on the parent card's border alone.

**Priority:** P2 -- the header is a large click target with no direct hover feedback.

---

## 10. AG Grid Default Overrides

### 10a. AG Grid focus ring override -- P1: Blue focus ring leaks on grid wrapper

**What's wrong:** AG Grid adds `outline` styles to the grid wrapper element (`.ag-root-wrapper`) when it receives focus (e.g., when a user Tabs into the grid). The default outline is a blue browser focus ring or AG Grid's own `--ag-input-focus-border-color` blue. Since `css/spreadsheet.css` does not override this, the default blue outline can appear around the grid wrapper when focused, clashing with TeamHQ's green accent focus rings.

Additionally, even though `suppressCellFocus: true` is set, AG Grid may still show focus indicators on the wrapper or header elements during keyboard interaction.

**Where:** `css/spreadsheet.css` -- missing an override for AG Grid focus styles.

**Fix:**

```css
/* Override AG Grid default focus to match TeamHQ */
.ag-theme-quartz .ag-root-wrapper:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Remove default blue focus on grid internals */
.ag-theme-quartz .ag-root-wrapper:focus {
  outline: none;
}

.ag-theme-quartz :focus {
  outline: none;
}

.ag-theme-quartz :focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
```

This aligns AG Grid focus rings with the global TeamHQ pattern defined in `shared.css` (lines 38-43).

**Priority:** P1 -- a blue focus ring on a page themed entirely in green accent looks broken. It signals an unthemed third-party component.

### 10b. AG Grid header menu icon -- No issue

AG Grid Community does not show header menu icons by default in read-only mode without column menu features enabled. No issue.

### 10c. AG Grid tooltip -- No issue

With `enableBrowserTooltips` not explicitly set, AG Grid does not show cell tooltips. If cells are truncated, there is no tooltip. This is fine for v1 -- the content is visible via horizontal scroll and text selection. Not a priority to address now.

### 10d. AG Grid sort icon animation -- See Issue 9a

AG Grid does not animate its built-in sort icons. Covered above.

---

## Fix Priority Summary

| # | Issue | Priority | Type | Effort |
|---|-------|----------|------|--------|
| 10a | Blue focus ring leaks on grid wrapper | P1 | CSS | 10 min |
| 2a | Density toggle snaps grid (no crossfade) | P1 | JS + CSS | 30 min |
| 1b | Header hover has no transition | P2 | CSS | 5 min |
| 2b | List-to-reader view has no transition | P2 | JS | 20 min |
| 3a | Keyboard cell focus suppressed (a11y gap) | P2 | CSS + JS | 15 min |
| 6b | Skeleton cards have no staggered entrance | P2 | CSS | 5 min |
| 6c | Loading-to-grid has no fade-in | P2 | JS | 10 min |
| 8a | Back button arrow has no hover nudge | P2 | CSS + JS | 10 min |
| 9a | Sort icon appears without transition | P2 | CSS | 5 min |
| 9c | Header cells lack cursor: pointer | P2 | CSS | 2 min |
| 9d | Group header lacks hover background | P2 | CSS | 5 min |
| 2c | Dead transition on chevron parent | P3 | CSS | 2 min |
| 4c | No scroll-behavior: smooth on viewport | P3 | CSS | 5 min |
| 7b | Badge sort has no row animation | P3 | Deferred | Design decision |

**Estimated total effort for P1+P2 fixes:** ~2 hours.

---

## Recommended Fix Order

1. **10a** -- Blue focus ring (P1, CSS-only, fast)
2. **2a** -- Density toggle crossfade (P1, JS change)
3. **9c** -- Header cursor: pointer (P2, CSS-only, 2 min)
4. **1b** -- Header hover transition (P2, CSS-only, 5 min)
5. **9d** -- Group header hover (P2, CSS-only, 5 min)
6. **9a** -- Sort icon entrance animation (P2, CSS-only, 5 min)
7. **6b** -- Skeleton stagger (P2, CSS-only, 5 min)
8. **8a** -- Back button arrow nudge (P2, CSS + JS)
9. **6c** -- Loading-to-grid fade-in (P2, JS)
10. **2b** -- View transition crossfade (P2, JS)
11. **3a** -- Cell focus indicator (P2, coordinate with Amara)
12. **2c, 4c** -- P3 cleanup items

CSS-only fixes first (items 1-7 can be shipped as a single CSS commit), then JS interaction improvements (items 8-10), then the accessibility-gated item (11) after Amara's input.
