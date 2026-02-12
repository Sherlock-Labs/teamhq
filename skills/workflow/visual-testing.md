# Visual Testing with Playwright

**Category:** Workflow
**Used by:** Robert, Nina, Soren, Amara, Enzo, Alice
**Last updated:** 2026-02-11

## When to Use

When you need to visually verify UI implementation against a design spec, check responsive behavior at specific breakpoints, or validate that CSS changes look correct in the browser.

## Prerequisites

The Playwright MCP server must be running (configured in `.mcp.json`). The dev server must be active (typically `localhost:3000` for Express or `localhost:5173` for Vite).

## Available MCP Tools

### `mcp__playwright__browser_navigate`
Navigate to a URL.
```
url: "http://localhost:5173/roadmaps/123"
```

### `mcp__playwright__browser_snapshot`
Take an accessibility snapshot of the current page. Returns structured text representation of the page content — useful for verifying data presence and ARIA structure without screenshots.

### `mcp__playwright__browser_take_screenshot`
Take a screenshot of the current page or a specific element.
```
raw: true  # return as image (default false returns base64)
```

### `mcp__playwright__browser_click`
Click an element on the page. Uses accessibility snapshot references.
```
element: "Submit button"    # reference from snapshot
ref: "e12"                  # or element ref from snapshot
```

### `mcp__playwright__browser_type`
Type text into an input field.
```
element: "Search input"
ref: "e5"
text: "roadmap items"
```

### `mcp__playwright__browser_select_option`
Select an option from a dropdown.
```
element: "Status dropdown"
ref: "e8"
values: ["In Progress"]
```

### `mcp__playwright__browser_hover`
Hover over an element.
```
element: "Card item"
ref: "e15"
```

### `mcp__playwright__browser_evaluate`
Execute JavaScript in the browser to check computed styles or manipulate DOM.
```js
// Check computed style
getComputedStyle(document.querySelector('.toolbar')).overflow;

// Resize viewport
window.innerWidth;
```

### `mcp__playwright__browser_resize`
Resize the browser viewport for responsive testing.
```
width: 375
height: 812
```

## Visual QA Workflow

### 1. Full-Page Screenshot
Take a screenshot at desktop width to get the overall layout.
```
navigate → http://localhost:5173/{route}
resize → width: 1440, height: 900
screenshot → raw: true
```

### 2. Accessibility Snapshot
Use `browser_snapshot` to verify content is present and check ARIA structure. This is faster than screenshots for data verification.

### 3. Responsive Breakpoints
Check at each standard breakpoint using `browser_resize`:
- **Desktop:** width: 1440
- **Tablet landscape:** width: 1024
- **Tablet portrait:** width: 768
- **Mobile:** width: 375

```
resize → width: 375, height: 812
screenshot → raw: true

resize → width: 768, height: 1024
screenshot → raw: true
```

### 4. Interaction States
Use click, hover, or evaluate to trigger states, then screenshot:
```
# Hover state
hover → ref: "e15"
screenshot → raw: true

# Expanded accordion
click → ref: "e20"
screenshot → raw: true
```

### 5. Data Integrity Verification (CRITICAL)

**Before checking any visual/design properties, always verify that content is actually rendering.** This is the #1 failure mode — CSS changes can silently hide data while layout looks "correct."

#### a. Visual Content Check
After every CSS change, take a screenshot and confirm:
- [ ] **All columns show data** (not just the first column)
- [ ] **All rows show data** (not just headers)
- [ ] **Numeric values are visible** (not blank, not "--" when real data exists)
- [ ] **Text content is readable** (not clipped, not white-on-white, not zero-height)

#### b. DOM vs. Render Verification
Use `browser_evaluate` to cross-check that what's in the DOM is actually visible:
```js
// Verify cell content matches visual output
(() => {
  const cells = document.querySelectorAll('.ag-cell');
  const issues = [];
  cells.forEach(c => {
    const rect = c.getBoundingClientRect();
    const text = c.textContent.trim();
    const style = window.getComputedStyle(c);
    if (text && rect.height < 5) issues.push(`Cell "${text}" has height ${rect.height}px`);
    if (text && parseFloat(style.top) > parseFloat(style.height))
      issues.push(`Cell "${text}" top:${style.top} exceeds row height:${style.height}`);
    if (text && style.color === style.backgroundColor)
      issues.push(`Cell "${text}" text color matches background`);
  });
  return issues.length ? issues : 'All cells rendering correctly';
})()
```

#### c. Before/After Comparison
When reviewing CSS changes, **always compare the same page before and after**:
1. Screenshot the page before applying changes
2. Apply the CSS changes
3. Hard-reload (bust cache: append `?v=timestamp` to stylesheet URLs)
4. Screenshot the same page after
5. Confirm all data that was visible before is still visible after

### 6. Compare Against Design Spec
When reviewing screenshots, check:
- [ ] **Data is present and readable** (check this FIRST, before anything else)
- [ ] Color tokens match (backgrounds, borders, text)
- [ ] Typography hierarchy correct (size, weight, spacing)
- [ ] Spacing consistent with design token scale
- [ ] Interactive elements have visible hover/focus states
- [ ] Responsive layout adapts correctly at breakpoints
- [ ] No horizontal overflow or layout breaking
- [ ] Empty states render correctly
- [ ] Column widths are proportional to content (no oversized empty columns)

## AG Grid Gotchas

CSS overrides on AG Grid are high-risk. These have caused production regressions:

| Override | Risk | What Breaks |
|----------|------|-------------|
| `display: flex` on `.ag-cell` | **CRITICAL** | AG Grid cells use `position: absolute`. Adding flex breaks the absolute layout — cells stack or collapse. |
| `position: sticky` on `.ag-cell:first-child` | **HIGH** | Makes the first cell flow-positioned. Sibling absolute cells with `top: auto` resolve their static position *after* the sticky cell, pushing them off-screen. **Fix:** always pair with `top: 0` on all `.ag-cell`. |
| `overflow: hidden` on `.ag-row` or viewport | **HIGH** | Can clip absolute-positioned cells that extend beyond expected bounds. |
| `line-height` on `.ag-cell` without `top: 0` | **MEDIUM** | Changes the static position calculation for absolute cells in the same row. |
| `font-family` on `.ag-cell` only | **LOW** | Must also target `.ag-cell-value` or content inherits from AG Grid's default. |

**Golden rule:** After ANY AG Grid CSS change, run the DOM vs. Render verification script (Section 5b) to confirm cells are still visible.

## Common Checks by Role

### ALL ROLES — Mandatory First Check
Before doing any role-specific checks:
- [ ] **Take a screenshot and confirm all data cells have visible content**
- [ ] Run DOM vs. Render verification (Section 5b) if the change touches CSS

### Robert (Design Review)
- Data is present and readable in all columns (check FIRST)
- Overall visual fidelity to design spec
- Color and typography consistency
- Layout proportions and spacing — columns sized proportionally to content
- Empty states and edge cases

### Nina (Interactions)
- Data still renders after triggering interactive states
- Hover states on interactive elements
- Transition smoothness (use evaluate to trigger)
- Focus ring appearance and color
- Animation timing — density toggle doesn't hide data during transition

### Soren (Responsive)
- Data visible at ALL breakpoints, not just desktop
- Screenshots at all 4 breakpoints
- Touch target sizing on mobile
- Content reflow and stacking behavior
- No horizontal scroll on narrow viewports (unless table overflows naturally)

### Amara (Accessibility)
- Data visible with all accessibility features enabled
- Focus ring visibility and contrast
- Color contrast verification (evaluate getComputedStyle)
- ARIA state changes visible in DOM
- Reduced motion behavior

### Enzo (QA)
- **Data integrity: all cells that should have data DO have visible data** (smoke test FIRST)
- Full page at each breakpoint
- All interactive states (hover, active, focus, disabled)
- Error states rendered correctly
- Loading/skeleton states
- Before/after comparison when reviewing CSS changes
