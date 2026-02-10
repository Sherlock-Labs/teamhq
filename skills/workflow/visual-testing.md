# Visual Testing with Puppeteer

**Category:** Workflow
**Used by:** Robert, Nina, Soren, Amara, Enzo, Alice
**Last updated:** 2026-02-09

## When to Use

When you need to visually verify UI implementation against a design spec, check responsive behavior at specific breakpoints, or validate that CSS changes look correct in the browser.

## Prerequisites

The Puppeteer MCP server must be running (configured in `.mcp.json`). The dev server must be active (typically `localhost:3000` for Express or `localhost:5173` for Vite).

## Available MCP Tools

### `mcp__puppeteer__puppeteer_navigate`
Navigate to a URL.
```
url: "http://localhost:3000/spreadsheets.html"
```

### `mcp__puppeteer__puppeteer_screenshot`
Take a screenshot of the current page or a specific element.
```
name: "spreadsheet-grid"           # descriptive name
selector: "#spreadsheets-grid-container"  # optional CSS selector
width: 1440                        # viewport width (default 800)
height: 900                        # viewport height (default 600)
```

### `mcp__puppeteer__puppeteer_evaluate`
Execute JavaScript in the browser to interact with elements or check computed styles.
```js
// Click a button
document.querySelector('.spreadsheet-group__header').click();

// Check computed style
getComputedStyle(document.querySelector('.ag-header-cell')).color;

// Resize viewport for responsive testing
// (prefer using width/height in screenshot instead)
```

### `mcp__puppeteer__puppeteer_click`
Click an element by CSS selector.
```
selector: ".spreadsheet-item"
```

## Visual QA Workflow

### 1. Full-Page Screenshot
Take a screenshot at desktop width to get the overall layout.
```
navigate → http://localhost:3000/{page}
screenshot → name: "page-desktop", width: 1440, height: 900
```

### 2. Component-Level Screenshots
Focus on specific components using CSS selectors.
```
screenshot → name: "grid-header", selector: ".ag-header", width: 1440
screenshot → name: "stats-row", selector: ".projects__stats", width: 1440
```

### 3. Responsive Breakpoints
Check at each standard breakpoint:
- **Desktop:** width: 1440
- **Tablet landscape:** width: 1024
- **Tablet portrait:** width: 768
- **Mobile:** width: 375

```
screenshot → name: "page-mobile", width: 375, height: 812
screenshot → name: "page-tablet", width: 768, height: 1024
```

### 4. Interaction States
Use evaluate or click to trigger states, then screenshot:
```
# Hover state (evaluate to add class)
evaluate → document.querySelector('.ag-row').classList.add('ag-row-hover')
screenshot → name: "row-hover-state"

# Expanded accordion
click → ".spreadsheet-group__header"
screenshot → name: "group-expanded"

# Density toggle
click → "[data-density='compact']"
screenshot → name: "grid-compact"
```

### 5. Compare Against Design Spec
When reviewing screenshots, check:
- [ ] Color tokens match (backgrounds, borders, text)
- [ ] Typography hierarchy correct (size, weight, spacing)
- [ ] Spacing consistent with design token scale
- [ ] Interactive elements have visible hover/focus states
- [ ] Responsive layout adapts correctly at breakpoints
- [ ] No horizontal overflow or layout breaking
- [ ] Empty states render correctly

## Common Checks by Role

### Robert (Design Review)
- Overall visual fidelity to design spec
- Color and typography consistency
- Layout proportions and spacing
- Empty states and edge cases

### Nina (Interactions)
- Hover states on interactive elements
- Transition smoothness (use evaluate to trigger)
- Focus ring appearance and color
- Animation timing

### Soren (Responsive)
- Screenshots at all 4 breakpoints
- Touch target sizing on mobile
- Content reflow and stacking behavior
- No horizontal scroll on narrow viewports

### Amara (Accessibility)
- Focus ring visibility and contrast
- Color contrast verification (evaluate getComputedStyle)
- ARIA state changes visible in DOM
- Reduced motion behavior

### Enzo (QA)
- Full page at each breakpoint
- All interactive states (hover, active, focus, disabled)
- Error states rendered correctly
- Loading/skeleton states
