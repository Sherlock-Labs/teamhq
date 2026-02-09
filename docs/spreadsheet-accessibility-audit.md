# Spreadsheet Accessibility Audit

**Author:** Amara (Front-End Accessibility Specialist)
**Date:** Feb 9, 2026
**Status:** Complete
**Scope:** `spreadsheets.html`, `js/spreadsheet.js`, `js/spreadsheets.js`, `css/spreadsheet.css`, spreadsheet integrations in `js/projects.js` and `js/docs.js`

---

## Executive Summary

The embedded spreadsheet component has a solid foundation -- proper `<button>` elements for interactive controls, `aria-pressed` on density toggles, `aria-expanded`/`aria-hidden` on accordion groups, `role="alert"` on error messages, and a well-structured reduced-motion media query. Robert's design spec explicitly called out several accessibility requirements and they were implemented correctly.

However, there is one **critical** issue that undermines the entire keyboard navigation experience: `suppressCellFocus: true` in the AG Grid configuration disables cell-level keyboard navigation. This turns a rich, navigable data grid into a keyboard dead zone. There are also several WCAG AA color contrast failures, missing ARIA associations, and focus management gaps when transitioning between views.

**Issue counts by priority:**

| Priority | Count | Description |
|----------|-------|-------------|
| P1 (WCAG A violation) | 3 | Keyboard navigation disabled, missing accordion ARIA IDs, missing skip link |
| P2 (WCAG AA violation) | 5 | Color contrast failures on badges, toggles, and metadata text |
| P3 (Best practice) | 7 | Focus management, live regions, touch targets, missing announcements |

---

## 1. Keyboard Navigation

### Issue 1.1 -- `suppressCellFocus: true` disables all cell keyboard navigation (P1)

**WCAG:** 2.1.1 Keyboard (Level A)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheet.js`, line 216
**What's wrong:** The AG Grid configuration sets `suppressCellFocus: true`. This is the most significant accessibility issue in the entire component. When cell focus is suppressed:
- Arrow keys do not navigate between cells
- Tab does not move focus into the grid body
- Home/End, Ctrl+Home/Ctrl+End do not work
- Enter/Space on header cells may not trigger sort
- Screen readers cannot navigate cell-by-cell through the data

AG Grid's built-in keyboard navigation (which is one of the main reasons to use a library like AG Grid) is completely disabled. The grid becomes a visual-only component. Keyboard users and screen reader users cannot access any of the tabular data.

The design spec (Section 10b) explicitly states that arrow keys, Tab, Enter/Space, Home/End, and Ctrl+Home/End should work. The `suppressCellFocus: true` setting contradicts this.

**Why it was likely added:** `enableCellTextSelection: true` (line 217) was set to allow text selection in cells. AG Grid's default cell focus behavior (blue highlight ring) may have looked jarring with the minimal Notion-style theme. But `suppressCellFocus` is the wrong way to solve that -- it trades visual polish for accessibility.

**Fix:**

```js
// In js/spreadsheet.js, line 216-217, replace:
suppressCellFocus: true,
enableCellTextSelection: true,

// With:
suppressCellFocus: false,
enableCellTextSelection: true,
```

Then in `css/spreadsheet.css`, add a custom focus style that fits the theme:

```css
/* AG Grid cell focus — custom style matching theme */
.ag-theme-quartz .ag-cell-focus:not(.ag-cell-range-selected) {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
  border-radius: 0;
}

.ag-theme-quartz .ag-header-cell:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
```

### Issue 1.2 -- No skip-to-content link (P1)

**WCAG:** 2.4.1 Bypass Blocks (Level A)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/spreadsheets.html`
**What's wrong:** The page has a navigation bar with 7 links. Keyboard users must Tab through all of them before reaching the main content. There is no skip link to bypass the navigation. This is a site-wide issue but is particularly impactful on the spreadsheets page because users need to navigate through the nav, then through accordion headers, then into a grid -- a long Tab journey.

**Fix:** Add a skip link as the first focusable element in `<body>`:

```html
<a href="#main-content" class="skip-link">Skip to content</a>
```

Add `id="main-content"` to the `<main>` element:

```html
<main class="spreadsheets-page" id="main-content">
```

Add visually-hidden skip link CSS to `shared.css`:

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-4);
  padding: var(--space-2) var(--space-4);
  background: var(--color-accent);
  color: var(--color-white);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-sm);
  z-index: 200;
  text-decoration: none;
}

.skip-link:focus {
  top: var(--space-2);
}
```

### Issue 1.3 -- Accordion group header lacks keyboard support for Enter (P3)

**WCAG:** N/A (best practice)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, line 106
**What's wrong:** The accordion group header is rendered as a `<button>`, which is good -- it natively supports Enter and Space activation. The implementation is correct. However, the event handler on line 288 uses delegated click on `listContainer`, which works because `<button>` elements fire `click` on Enter/Space. This is **not a bug** -- marking as verified-correct.

**Status:** PASS -- no fix needed.

### Issue 1.4 -- Active nav link is a `<span>`, not focusable (P3)

**WCAG:** Best practice
**File:** `/Users/jeffsherlock/projects/personal/teamhq/spreadsheets.html`, line 33
**What's wrong:** The active "Spreadsheets" nav link is rendered as `<span class="nav__link nav__link--active">` instead of an `<a>` element. This means it is not in the Tab order at all. Screen reader users navigating by links will not encounter the current page indicator. While this is a common pattern (the current page link is not clickable), it reduces navigability for screen reader users who use link lists to orient themselves.

**Fix:** Use an `<a>` with `aria-current="page"`:

```html
<a href="spreadsheets.html" class="nav__link nav__link--active" aria-current="page">Spreadsheets</a>
```

---

## 2. Screen Reader Experience

### Issue 2.1 -- AG Grid ARIA output may be degraded by `suppressCellFocus` (P1)

**WCAG:** 4.1.2 Name, Role, Value (Level A)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheet.js`, line 216
**What's wrong:** With `suppressCellFocus: true`, AG Grid may not render full ARIA attributes on cells (such as `aria-colindex`, `aria-rowindex`) because it assumes cells are not interactive/navigable. This needs to be verified after the fix in Issue 1.1, but the concern is that the grid's `role="grid"` contract is incomplete when cell focus is suppressed.

**Fix:** Resolving Issue 1.1 (removing `suppressCellFocus: true`) should restore full ARIA output. After the fix, verify with VoiceOver that:
- The grid announces as "table, X rows, Y columns" or similar
- Arrow key navigation announces cell content, row number, and column header
- Sort state changes are announced when sorting via header click

### Issue 2.2 -- Accordion group body lacks `id` and `aria-controls` association (P1)

**WCAG:** 4.1.2 Name, Role, Value (Level A)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, lines 104-118
**What's wrong:** The accordion pattern uses `aria-expanded` on the header button and `aria-hidden` on the body, but there is no `aria-controls` on the button pointing to the body's `id`. Screen readers cannot programmatically associate the button with the content it controls. The `aria-hidden` attribute on the body is also a problematic approach -- when `aria-hidden="true"` is set, the content is completely hidden from the accessibility tree even when it becomes visible. The CSS grid animation (`grid-template-rows: 0fr` to `1fr`) makes content visually hidden but `aria-hidden="true"` is an absolute removal from the a11y tree.

**Fix:** Add unique IDs and `aria-controls`:

```js
// In renderGroup(), add an ID to the body and aria-controls to the button:
function renderGroup(projectId, spreadsheets) {
  var bodyId = 'spreadsheet-group-body-' + projectId;
  // ...
  return (
    '<div class="spreadsheet-group" data-group="' + escapeAttr(projectId) + '">' +
      '<button class="spreadsheet-group__header" type="button" aria-expanded="false" aria-controls="' + bodyId + '">' +
        // ... (same content)
      '</button>' +
      '<div class="spreadsheet-group__body" id="' + bodyId + '" aria-hidden="true">' +
        // ... (same content)
      '</div>' +
    '</div>'
  );
}
```

### Issue 2.3 -- Loading state not announced to screen readers (P3)

**WCAG:** Best practice (4.1.3 Status Messages, Level AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, line 169
**What's wrong:** When a user clicks a spreadsheet item, the reader view shows "Loading spreadsheet..." but this text is injected via `innerHTML` without any `aria-live` region or `role="status"`. Screen reader users clicking a spreadsheet item will hear nothing -- no feedback that content is loading.

**Fix:** Add `role="status"` and `aria-live="polite"` to the loading message:

```js
readerView.innerHTML = '<p class="thq-spreadsheet-loading" role="status" aria-live="polite">Loading spreadsheet...</p>';
```

Also apply this to the docs embed loading in `js/docs.js` line 276:

```js
placeholder.innerHTML = '<p class="thq-spreadsheet-loading" role="status" aria-live="polite">Loading spreadsheet...</p>';
```

### Issue 2.4 -- Stats text update not announced (P3)

**WCAG:** Best practice (4.1.3 Status Messages, Level AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, line 58-67
**What's wrong:** The stats element (`#spreadsheets-stats`) is updated dynamically after the index loads (e.g., "3 spreadsheets across 2 projects"). This content change is not announced to screen readers. Since this is supplementary information and the page has a heading, this is low priority.

**Fix (optional):** Add `aria-live="polite"` to the stats `<p>` element in `spreadsheets.html`:

```html
<p class="spreadsheets-header__stats" id="spreadsheets-stats" aria-live="polite"></p>
```

### Issue 2.5 -- Density toggle state change has no explicit announcement (P3)

**WCAG:** Best practice
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, lines 237-249
**What's wrong:** When the density toggle is clicked, `aria-pressed` is updated on the buttons, which is correct. Screen readers that track `aria-pressed` changes will announce "pressed" or "not pressed." However, the visual effect (table rows getting taller/shorter) is not communicated. This is acceptable because `aria-pressed` is the standard mechanism for toggle buttons and the label ("Compact" / "Comfortable") is self-descriptive.

**Status:** PASS -- the existing `aria-pressed` implementation is sufficient.

---

## 3. Focus Management

### Issue 3.1 -- Focus not managed when switching from list to reader view (P3)

**WCAG:** Best practice (2.4.3 Focus Order, Level A)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, lines 161-163 and 168-189
**What's wrong:** When a user clicks a spreadsheet item in the list view, `showReaderView()` hides the list and shows the reader. But focus is not moved to the reader view content. The focus stays on the now-hidden list item button, which means:
- Screen reader users hear nothing about the view change
- The next Tab press may land in an unexpected location
- `window.scrollTo(0, 0)` (line 181) handles visual scrolling but not focus

Similarly, when clicking "Back to list" (line 318-321), focus is not returned to the previously clicked item or to the list heading.

**Fix:** After the reader view loads and renders, move focus to the reader title or back button:

```js
// In openSpreadsheet(), after renderReaderView() completes:
function openSpreadsheet(projectId, file, meta) {
  // ... existing code ...
  .then(function (data) {
    renderReaderView(data, meta);
    window.scrollTo(0, 0);
    // Move focus to the reader view title or back button
    var backBtn = readerView.querySelector('.spreadsheets-reader__back');
    if (backBtn) backBtn.focus();
  })
}
```

For the back button, restore focus to the list:

```js
// In the back button click handler:
readerView.addEventListener('click', function (e) {
  if (e.target.closest('.spreadsheets-reader__back')) {
    showListView();
    // Move focus to the page heading or the previously expanded group
    var heading = document.querySelector('.spreadsheets-header__title');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }
});
```

### Issue 3.2 -- Skeleton loading placeholders are not live-region aware (P3)

**WCAG:** Best practice
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, lines 363-365
**What's wrong:** The initial page load shows two skeleton loading placeholders. When these are replaced by the actual list content, screen readers are not notified. The `listContainer` element does not have `aria-live` or `aria-busy`.

**Fix (low priority):** Add `aria-busy="true"` to the list container during loading, then remove it when content loads:

```js
// Before skeleton loading:
listContainer.setAttribute('aria-busy', 'true');

// After content loads in the .then():
listContainer.removeAttribute('aria-busy');
```

---

## 4. ARIA Patterns

### Issue 4.1 -- Accordion `aria-hidden` applied to body is valid but risky (P3)

**WCAG:** Best practice
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, lines 111, 268-284
**What's wrong:** The collapsed accordion body uses `aria-hidden="true"`, and the CSS uses `grid-template-rows: 0fr` to visually collapse it. The `aria-hidden="true"` correctly hides the content from screen readers when collapsed. When expanded, `aria-hidden` is set to `"false"`. This is functional but there is a timing edge case: during the CSS grid transition animation (0.25s), the content is partially visible but either fully hidden or fully visible to screen readers depending on when `aria-hidden` toggles.

**Recommendation:** The current implementation is acceptable. The `aria-hidden` toggles synchronously with the click, which is the correct behavior. The visual animation is a progressive enhancement.

**Status:** PASS -- no fix needed.

### Issue 4.2 -- Density toggle group pattern is correct (P3 verification)

**WCAG:** N/A (verification)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, lines 219-224
**What's wrong:** The density toggle uses `role="group"` with `aria-label="Table density"`, and each button uses `aria-pressed`. This is the correct ARIA pattern for a toggle button group. The toggle is implemented identically in `js/projects.js` lines 494-498.

**Status:** PASS -- correct implementation.

### Issue 4.3 -- Back button has no accessible name beyond its text content (P3)

**WCAG:** Best practice (2.4.4 Link Purpose, Level A)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, line 195
**What's wrong:** The back button is `<button>&larr; Back to list</button>`. The arrow character `&larr;` is part of the accessible name. Screen readers will announce "left arrow Back to list" or similar. This is slightly verbose but not incorrect.

**Fix (optional):** Wrap the arrow in `aria-hidden="true"`:

```js
html += '<button class="spreadsheets-reader__back" type="button"><span aria-hidden="true">&larr;</span> Back to list</button>';
```

---

## 5. Color Contrast

### Issue 5.1 -- Badge `--muted` text fails WCAG AA (P2)

**WCAG:** 1.4.3 Contrast (Minimum) (Level AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 137-140
**What's wrong:** `.thq-badge--muted` uses `color: var(--color-text-tertiary)` (#999999) on `background: var(--color-bg-secondary)` (#fafafa). The contrast ratio is approximately **2.8:1**, which fails the WCAG AA requirement of 4.5:1 for normal text (the badge text at 12px/text-xs is normal text, not large text).

Badge values mapped to `--muted` include "no", "false", and "excluded". These are informational values -- they communicate the absence of a feature or capability. The `--` null placeholder is decorative, but badge values carry real semantic meaning.

**Fix:** Darken the muted text color:

```css
.thq-badge--muted {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary); /* #666666 — 5.7:1 on #fafafa */
}
```

This gives a ratio of approximately 5.7:1, comfortably passing AA. The muted badge will still look visually distinct from the neutral badge because muted keeps the grey background without any color tint.

Alternatively, if the design intent is for muted to look distinctly lighter than neutral, use a slightly darker grey:

```css
.thq-badge--muted {
  background: var(--color-bg-secondary);
  color: #767676; /* ~4.5:1 on #fafafa — minimum AA pass */
}
```

### Issue 5.2 -- Badge `--warning` text is borderline WCAG AA (P2)

**WCAG:** 1.4.3 Contrast (Minimum) (Level AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 122-125
**What's wrong:** `.thq-badge--warning` uses `color: var(--color-status-warning)` (#ca8a04) on `background: rgba(202, 138, 4, 0.1)`. On a white cell background, the effective background is approximately #fef8e6. The contrast ratio of #ca8a04 on #fef8e6 is approximately **3.9:1**, which fails the 4.5:1 AA threshold for normal-sized text.

Robert flagged this as borderline in the design spec (Section 10d).

**Fix:** Use a darker amber for warning badge text:

```css
.thq-badge--warning {
  background: rgba(202, 138, 4, 0.1);
  color: #a16207; /* amber-700 equivalent — ~5.5:1 on the tinted background */
}
```

### Issue 5.3 -- Density toggle inactive text fails WCAG AA (P2)

**WCAG:** 1.4.3 Contrast (Minimum) (Level AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 165-178
**What's wrong:** `.thq-density-toggle` uses `color: var(--color-text-tertiary)` (#999999) on a transparent background (effectively white, #ffffff). The contrast ratio is approximately **2.8:1**, which fails the 4.5:1 AA requirement. The density toggle buttons are interactive controls that users need to discover and read.

Robert noted this in the design spec as "supplementary control, but should still be discoverable." It needs to pass AA since it is a labeled interactive element.

**Fix:** Use secondary text color for inactive toggles:

```css
.thq-density-toggle {
  /* ... existing properties ... */
  color: var(--color-text-secondary); /* #666666 — 5.9:1 on white */
}
```

Update the hover state if needed to maintain a visible distinction:

```css
.thq-density-toggle:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary); /* #171717 — elevated on hover */
}
```

### Issue 5.4 -- Null cell text (`--`) fails WCAG AA (P2)

**WCAG:** 1.4.3 Contrast (Minimum) (Level AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 94-96
**What's wrong:** `.thq-cell--null` uses `color: var(--color-text-tertiary)` (#999999) on white (#ffffff). Contrast ratio is approximately **2.8:1**.

Robert's design spec (Section 10d) calls this "Decorative -- acceptable (the `--` is supplementary, not informational)." However, under WCAG 1.4.3, the exception for decorative content applies to content that is "purely decorative" -- meaning it conveys no information. The `--` null placeholder does convey information: it tells users "this cell has no value." A user scanning a column of financial data needs to distinguish between a cell with the value 0 and a cell with no data.

**Assessment:** This is a judgment call. If the team considers `--` purely decorative because the absence of a number is self-evident, the current contrast is acceptable. If `--` is informational (communicating "no data"), it needs to pass 4.5:1.

**Fix (if treating as informational):**

```css
.thq-cell--null {
  color: #767676; /* ~4.5:1 on white — minimum AA pass */
}
```

Or reference the existing secondary token:

```css
.thq-cell--null {
  color: var(--color-text-secondary); /* #666666 — 5.9:1 */
}
```

### Issue 5.5 -- Spreadsheet item description and metadata text are tertiary color (P2)

**WCAG:** 1.4.3 Contrast (Minimum) (Level AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 563-571 and 573-579
**What's wrong:** `.spreadsheet-item__desc` and `.spreadsheet-item__meta` use `color: var(--color-text-tertiary)` (#999999) on white background. The description contains the spreadsheet's description text (e.g., "Monthly recurring revenue projections...") and the metadata contains row/column count and date. Both carry meaningful information. Contrast ratio is approximately **2.8:1**.

The same issue applies to:
- `.spreadsheet-group__count` (line 472-477): "3 spreadsheets" count text
- `.spreadsheets-reader__meta` (line 626-629): reader view metadata row
- `.spreadsheets-reader__back` (line 586-598): back button text

**Fix:** For all informational tertiary text, use `var(--color-text-secondary)` (#666666) instead:

```css
.spreadsheet-item__desc {
  color: var(--color-text-secondary);
}

.spreadsheet-item__meta {
  color: var(--color-text-secondary);
}

.spreadsheet-group__count {
  color: var(--color-text-secondary);
}

.spreadsheets-reader__meta {
  color: var(--color-text-secondary);
}

.spreadsheets-reader__back {
  color: var(--color-text-secondary);
}
```

**Note:** This will make the visual hierarchy flatter (less contrast between primary and secondary text). Robert should weigh in on whether the tertiary token (#999999) needs to be darkened globally or if these specific elements should be elevated individually.

---

## 6. Reduced Motion

### Issue 6.1 -- Accordion expand/collapse transition not covered (P3)

**WCAG:** 2.3.3 Animation from Interactions (Level AAA, but best practice for AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 501-510
**What's wrong:** The `prefers-reduced-motion` media query (lines 683-697) removes transitions from AG Grid rows, density toggles, and shadow pseudo-elements. But it does not remove the `transition: grid-template-rows 0.25s ease` on `.spreadsheet-group__body` (line 505) or the `transition: transform 0.2s ease` on `.spreadsheet-group__chevron` (line 484) and its `::before` pseudo-element (line 494).

**Fix:** Add these selectors to the reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  /* ... existing rules ... */

  .spreadsheet-group__body {
    transition: none;
  }

  .spreadsheet-group__chevron,
  .spreadsheet-group__chevron::before {
    transition: none;
  }

  .spreadsheet-group {
    transition: none;
  }

  .spreadsheet-item {
    transition: none;
  }

  .spreadsheets-reader__back {
    transition: none;
  }
}
```

### Issue 6.2 -- Other missing transitions in reduced-motion (P3)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`
**What's wrong:** Several elements have `transition` properties not covered by the reduced-motion query:
- `.spreadsheet-group` border-color transition (line 445): `transition: border-color 0.2s ease`
- `.spreadsheet-item` background-color transition (line 535): `transition: background-color 0.15s ease`
- `.spreadsheets-reader__back` color transition (line 597): `transition: color 0.15s ease`

These are all hover/focus micro-transitions and are minor, but for completeness they should be covered.

**Fix:** See combined fix in Issue 6.1 above.

---

## 7. Error States

### Issue 7.1 -- Index fetch failure on standalone page lacks `role="alert"` (P3)

**WCAG:** 4.1.3 Status Messages (Level AA)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, line 383
**What's wrong:** When the index fetch fails, the error message "Unable to load spreadsheets" is rendered as:
```js
listContainer.innerHTML = '<p class="thq-spreadsheet-error">Unable to load spreadsheets</p>';
```

This lacks `role="alert"` or `aria-live`. Screen reader users will not be notified of the failure.

Compare to the reader view error (line 186) which correctly uses `role="alert"`.

**Fix:**

```js
listContainer.innerHTML = '<p class="thq-spreadsheet-error" role="alert">Unable to load spreadsheets</p>';
```

### Issue 7.2 -- Empty list state lacks `role="alert"` (P3)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, line 74
**What's wrong:** The "No spreadsheets yet." message is rendered without `role="alert"`:
```js
listContainer.innerHTML = '<p class="thq-spreadsheet-error">No spreadsheets yet.</p>';
```

**Fix:**

```js
listContainer.innerHTML = '<p class="thq-spreadsheet-error" role="status">No spreadsheets yet.</p>';
```

Using `role="status"` (rather than `role="alert"`) here because an empty state is informational, not urgent.

### Issue 7.3 -- Loading state ("Loading spreadsheet...") lacks accessible role (P3)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, line 169
**What's wrong:** Already covered in Issue 2.3. The loading text has no `role="status"` or `aria-live` attribute.

---

## 8. Data Table Semantics

### Issue 8.1 -- AG Grid semantic output is correct when `suppressCellFocus` is removed (Verification)

**WCAG:** 1.3.1 Info and Relationships (Level A)
**What's correct:** AG Grid Community renders:
- `role="grid"` on the grid container (via `role="treegrid"` or `role="grid"`)
- `role="row"` on each `<div class="ag-row">`
- `role="gridcell"` on each `<div class="ag-cell">`
- `role="columnheader"` on each header cell
- `aria-sort="ascending"`, `aria-sort="descending"`, or `aria-sort="none"` on sortable headers
- `aria-colindex` and `aria-rowindex` attributes

**What needs verification:** After removing `suppressCellFocus: true` (Issue 1.1), verify that:
1. `aria-colindex` is present on all cells
2. `aria-rowindex` is present on all rows
3. `aria-sort` updates when columns are sorted
4. The grid container has an accessible name (it currently does not -- see Issue 8.2)

### Issue 8.2 -- Grid has no accessible name (P3)

**WCAG:** Best practice (4.1.2 Name, Role, Value)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheet.js`, lines 193-235
**What's wrong:** The AG Grid instance does not have an `aria-label` or `aria-labelledby` on the grid container. Screen readers will announce it as just "grid" without context about what data it contains.

**Fix:** Pass the spreadsheet name to AG Grid's `aria` option or set it on the wrapper:

```js
// In the TeamHQSpreadsheet constructor, add to gridOptions:
var gridOptions = {
  // ... existing options ...
  // Add accessible name
};

// After grid creation, set aria-label on the grid element:
this.gridEl.setAttribute('aria-label', data.name || 'Data table');
```

Note: AG Grid may set its own `role="grid"` on an inner element, so verify which element gets the attribute. Alternatively, use `aria-labelledby` pointing to the spreadsheet header name element if it is already rendered above the grid.

### Issue 8.3 -- CSS overrides do not break semantic structure (Verification)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`
**What's correct:** The CSS overrides only affect visual properties (colors, fonts, spacing, borders). No CSS rules use `display: contents`, `role` overrides, or anything that would alter the DOM or ARIA structure. The sticky column uses `position: sticky` which does not affect semantics. Shadow pseudo-elements use `::after` which are decorative and not in the accessibility tree.

**Status:** PASS -- CSS overrides are semantically safe.

---

## 9. Touch Accessibility

### Issue 9.1 -- Density toggle buttons may be below 44x44px minimum (P3)

**WCAG:** 2.5.8 Target Size (Minimum) (Level AA -- new in WCAG 2.2)
**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 165-178
**What's wrong:** The density toggle buttons have:
- `padding: var(--space-1) var(--space-2)` = 4px top/bottom, 8px left/right
- `font-size: var(--text-xs)` = 12px
- `line-height: 1`

The computed height is approximately 12px (font) + 8px (padding) = **20px**. The width depends on the text ("Compact" or "Comfortable") but at 12px font with 16px horizontal padding, "Compact" is roughly 60px wide and "Comfortable" roughly 80px wide. The width passes the 44px minimum, but the **height of ~20px fails the 44px minimum**.

On mobile (<768px), the density toggle is hidden via `display: none`, so this only affects tablet and desktop touch users.

**Fix:** Increase the vertical padding or add `min-height`:

```css
.thq-density-toggle {
  /* ... existing properties ... */
  min-height: 32px; /* reasonable compromise between 44px ideal and current 20px */
}
```

For full WCAG 2.2 Level AA compliance on touch targets, use `min-height: 44px`. However, this may look oversized for the design. A minimum of 32px is a practical improvement that matches the compact row height.

### Issue 9.2 -- Spreadsheet list items have adequate touch targets (Verification)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 521-536
**What's correct:** `.spreadsheet-item` has `padding: var(--space-3) 0` (12px vertical) plus the content height (name + description at ~32-40px). The total touch target height is likely 44px+ when content is present. The items are full-width, providing adequate horizontal touch area.

**Status:** PASS -- touch targets are adequate.

### Issue 9.3 -- AG Grid header sort targets are adequate (Verification)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 37-38
**What's correct:** `--ag-header-height: 40px` (comfortable) or `32px` (compact). At 40px, the header cells are close to the 44px minimum and spanning the full column width. At 32px (compact and mobile), they are below 44px but still usable.

**Status:** Acceptable -- AG Grid headers span the full column width, providing adequate horizontal area.

---

## 10. Missing Alt Text / Labels

### Issue 10.1 -- Table icon SVG is correctly marked decorative (Verification)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, lines 49-54
**What's correct:** The table icon SVG includes `aria-hidden="true"`, correctly marking it as decorative. The adjacent text content (spreadsheet name) provides the meaning. No alt text is needed.

**Status:** PASS -- correctly implemented.

### Issue 10.2 -- Chevron icon is correctly marked decorative (Verification)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/js/spreadsheets.js`, line 109
**What's correct:** The chevron span includes `aria-hidden="true"`. The accordion state is communicated via `aria-expanded` on the parent button. No alt text is needed for the chevron.

**Status:** PASS -- correctly implemented.

### Issue 10.3 -- Scroll-hint shadows are decorative and non-interfering (Verification)

**File:** `/Users/jeffsherlock/projects/personal/teamhq/css/spreadsheet.css`, lines 258-274
**What's correct:** Shadow pseudo-elements use `pointer-events: none` so they do not interfere with touch or click targets. They are CSS `::after` pseudo-elements which are not in the accessibility tree. No alt text or labels needed.

**Status:** PASS -- correctly implemented.

---

## Summary of Required Fixes

### P1 -- Must Fix (WCAG A Violations)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1.1 | `suppressCellFocus: true` disables keyboard nav | `js/spreadsheet.js:216` | Remove `suppressCellFocus: true`, add custom focus CSS |
| 1.2 | No skip-to-content link | `spreadsheets.html` | Add skip link + CSS |
| 2.2 | Accordion lacks `aria-controls` / `id` | `js/spreadsheets.js:104-118` | Add `id` to body, `aria-controls` to header |

### P2 -- Should Fix (WCAG AA Violations)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 5.1 | Badge `--muted` contrast 2.8:1 | `css/spreadsheet.css:137-140` | Use `--color-text-secondary` (#666666) |
| 5.2 | Badge `--warning` contrast ~3.9:1 | `css/spreadsheet.css:122-125` | Use #a16207 for text color |
| 5.3 | Density toggle inactive contrast 2.8:1 | `css/spreadsheet.css:165-178` | Use `--color-text-secondary` (#666666) |
| 5.4 | Null cell `--` contrast 2.8:1 | `css/spreadsheet.css:94-96` | Use #767676 or `--color-text-secondary` |
| 5.5 | Metadata/description text contrast 2.8:1 | `css/spreadsheet.css` multiple | Use `--color-text-secondary` for informational text |

### P3 -- Best Practice

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1.4 | Active nav link is `<span>` not `<a>` | `spreadsheets.html:33` | Use `<a aria-current="page">` |
| 2.3 | Loading state not announced | `js/spreadsheets.js:169` | Add `role="status"` |
| 3.1 | Focus not managed on view switch | `js/spreadsheets.js` | Move focus on list/reader transitions |
| 4.3 | Back button arrow in accessible name | `js/spreadsheets.js:195` | Wrap arrow in `aria-hidden` |
| 6.1 | Accordion transitions not in reduced-motion | `css/spreadsheet.css` | Add selectors to media query |
| 7.1 | Index error lacks `role="alert"` | `js/spreadsheets.js:383` | Add `role="alert"` |
| 8.2 | Grid has no accessible name | `js/spreadsheet.js` | Add `aria-label` with spreadsheet name |

---

## Items Robert Flagged for Review -- Verdicts

1. **Badge `--warning` text (#ca8a04) contrast:** **FAILS AA.** Needs darker amber. Recommend #a16207.
2. **Badge `--muted` text (#999999) contrast:** **FAILS AA.** Needs to use secondary text color or darker grey.
3. **Density toggle inactive text (#999999):** **FAILS AA.** Needs to use secondary text color.
4. **Null cell `--` text (#999999):** **Judgment call.** Technically fails 4.5:1 but could be argued as decorative. Recommend darkening to #767676 to be safe.

---

## What Passed

These areas were reviewed and found to be correctly implemented:

- `<button>` elements used for all interactive controls (accordion headers, density toggles, list items, back button)
- `aria-expanded` on accordion headers toggles correctly
- `aria-hidden` on accordion bodies toggles correctly
- `aria-pressed` on density toggle buttons updates on click
- `role="group"` and `aria-label="Table density"` on density toggle container
- `role="alert"` on error messages in reader view and docs embed
- Table icon SVG and chevron correctly marked `aria-hidden="true"`
- `focus-visible` outline styles defined for density toggles and global buttons/links
- Reduced motion media query covers AG Grid row transitions, toggle transitions, shadow transitions, and loading pulse animations
- HTML document structure: `lang="en"`, `<meta viewport>`, `<title>`, `<meta description>`, `<main>`, `<nav aria-label>`, `<footer>`, heading hierarchy (h1 -> h2 in reader, h4/h5 in project detail)
- No `tabindex` values > 0 used anywhere
- All user data escaped with `escapeHTML()` / `escapeAttr()` or `textContent`
- Security: badge renderer uses `textContent` not `innerHTML`
