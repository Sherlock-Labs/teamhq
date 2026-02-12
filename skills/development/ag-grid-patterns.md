# AG Grid Patterns

**Category:** Development
**Used by:** Alice, Jonah, Robert, Nina, Soren, Amara, Enzo
**Last updated:** 2026-02-10

## When to Use

When building or modifying any AG Grid table in TeamHQ. Read this **before** writing AG Grid code. Every gotcha documented here was discovered the hard way — skipping this doc means repeating the same bugs.

## AG Grid Version & Setup

- **Version:** Community v34 (loaded via CDN from jsdelivr)
- **Theme:** `ag-theme-quartz` with TeamHQ overrides in `css/spreadsheet.css`
- **Rendering:** Vanilla JS (no React wrapper) — use `agGrid.createGrid(el, options)`
- **Lazy loading:** Use `ensureAgGrid()` pattern (see `js/projects.js`) when AG Grid isn't needed on page load

## Critical Rule: JS API Takes Precedence Over CSS Variables

**This is the #1 source of bugs.** AG Grid v34 CSS variables (`--ag-row-height`, `--ag-header-height`) are *defaults* that AG Grid's JavaScript overrides with its own calculations. If you don't set `rowHeight` and `headerHeight` in the gridOptions JS object, AG Grid computes row height as `gridSize * 6 + 1` (25px with our 4px grid-size), silently ignoring your `--ag-row-height: 44px`.

### Always set these in gridOptions:

```js
var gridOptions = {
  rowHeight: 44,        // REQUIRED — do not rely on CSS variable alone
  headerHeight: 40,     // REQUIRED — do not rely on CSS variable alone
  // ... other options
};
```

For compact density: `rowHeight: 32, headerHeight: 32`.

## Standard Grid Options Template

Copy this when creating a new AG Grid instance:

```js
var gridOptions = {
  columnDefs: columnDefs,
  rowData: data,

  // Sizing — ALWAYS set explicitly (CSS vars alone are unreliable)
  rowHeight: 44,
  headerHeight: 40,

  // Layout
  domLayout: 'autoHeight',  // Grid grows with content, no scroll
  // OR set a fixed height on the container and omit domLayout

  // Defaults
  defaultColDef: {
    sortable: true,
    resizable: false,
    suppressMovable: true,
    flex: 1                 // Columns fill available width
  },

  // Interaction
  singleClickEdit: true,                    // If editable
  stopEditingWhenCellsLoseFocus: true,       // If editable
  suppressCellFocus: false,                  // Keep for keyboard nav
  enableCellTextSelection: true,             // Allow copy-paste

  // Performance
  animateRows: true,

  // Accessibility
  // Add aria-label to gridEl after creation:
  // gridEl.setAttribute('aria-label', 'Table name');
};

var gridApi = agGrid.createGrid(gridEl, gridOptions);
```

## CSS Gotchas & Required Overrides

All of these are already in `css/spreadsheet.css`. If creating a new page with AG Grid, make sure it loads `spreadsheet.css`.

### 1. Cell Positioning: Always set `top: 0`

AG Grid uses `position: absolute` on cells. The `position: sticky` rule on the first-child cell (for frozen columns) pushes other absolute-positioned cells off-screen unless `top: 0` is set.

```css
/* REQUIRED on all .ag-cell elements */
.ag-theme-quartz .ag-cell {
  top: 0;
}
```

### 2. Never use `display: flex` on `.ag-cell`

AG Grid's absolute cell positioning breaks if cells become flex containers. Use `line-height` for vertical centering instead:

```css
.ag-theme-quartz .ag-cell {
  line-height: 44px;  /* Match rowHeight */
}

.ag-theme-quartz .ag-cell-wrapper {
  line-height: 44px;  /* Match rowHeight */
}
```

For compact density, update to `line-height: 32px`.

### 3. Column Sizing: Use `flex` on defaultColDef

Don't rely on `autoSizeStrategy` alone. Set `flex: 1` on the `defaultColDef` and override with explicit `width` or `flex` on individual columns that need it:

```js
defaultColDef: {
  flex: 1  // Fill available width
},
columnDefs: [
  { field: 'id', width: 80, flex: undefined },      // Fixed width
  { field: 'title', flex: 2 },                       // Double width
  { field: 'status', width: 130, flex: undefined },  // Fixed width
]
```

### 4. Right-Aligned Headers Need Override

AG Grid's right-aligned column headers break the standard label layout. Always add:

```css
.ag-theme-quartz .ag-right-aligned-header .ag-header-cell-label {
  flex-direction: row;
  justify-content: flex-start;
}
```

### 5. Header Text Styling

Our header convention: uppercase, extra-small, medium-weight, letter-spaced.

```css
.ag-theme-quartz .ag-header-cell-text {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

### 6. Notion-Style Borders (Horizontal Only)

```css
.ag-theme-quartz {
  --ag-borders: none;
  --ag-borders-row: solid 1px;
  --ag-header-column-separator-color: transparent;
  --ag-column-border: none;
  --ag-row-border-color: rgba(0, 0, 0, 0.06);
}
```

## Cell Renderer Patterns

### Badge/Pill Renderer

Use the existing `.thq-badge` CSS classes. Return a DOM element, not an HTML string:

```js
function badgeCellRenderer(params, badgeMap) {
  if (!params.value) return '';
  var variant = badgeMap[params.value] || 'muted';
  var el = document.createElement('span');
  el.className = 'thq-badge thq-badge--' + variant;
  el.textContent = params.value;
  return el;
}
```

Available badge variants: `error`, `warning`, `accent`, `success`, `muted`, `neutral`.

Badge map examples:
```js
var STATUS_BADGE = {
  'planned': 'muted',
  'in-progress': 'accent',
  'completed': 'success',
  'deferred': 'warning'
};

var PRIORITY_BADGE = {
  'high': 'error',
  'medium': 'warning',
  'low': 'muted'
};
```

### Action Button Renderer

For row-action buttons that appear on hover:

```js
function actionCellRenderer(params) {
  var btn = document.createElement('button');
  btn.className = 'wi-action-delete';
  btn.textContent = '\u00D7';  // × symbol
  btn.title = 'Delete';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    // Handle action
  });
  return btn;
}
```

CSS for hover-reveal:
```css
.wi-action-delete { opacity: 0; transition: opacity 150ms ease; }
.ag-row-hover .wi-action-delete { opacity: 1; }
```

## Inline Editing Pattern

### Select Editor (Dropdowns)

```js
{
  field: 'status',
  editable: true,
  cellEditor: 'agSelectCellEditor',
  cellEditorParams: { values: ['planned', 'in-progress', 'completed', 'deferred'] }
}
```

### Debounced Auto-Save

After any cell edit, save all data with a debounced PUT:

```js
var _saveTimeout = null;

function scheduleSave(id) {
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(function() {
    var api = _grids[id];
    if (!api) return;
    var items = [];
    api.forEachNode(function(node) {
      var d = Object.assign({}, node.data);
      delete d._newRow;        // Strip internal flags
      delete d._confirmDelete;
      items.push(d);
    });
    fetch('/api/endpoint/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items })
    });
  }, 500);
}
```

Wire to grid:
```js
onCellValueChanged: function(event) {
  scheduleSave(projectId);
}
```

## Lazy Loading AG Grid

AG Grid is heavy (~300KB). Load it on-demand:

```js
var _agGridLoaded = false;
var _agGridPromise = null;

function ensureAgGrid() {
  if (_agGridLoaded) return Promise.resolve();
  if (_agGridPromise) return _agGridPromise;
  _agGridPromise = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/ag-grid-community@34/dist/ag-grid-community.min.js';
    script.onload = function() { _agGridLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return _agGridPromise;
}
```

Also add the CSS links in the page `<head>`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@34/styles/ag-grid.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@34/styles/ag-theme-quartz.css">
<link rel="stylesheet" href="css/spreadsheet.css">
```

## Density Toggle

Support compact (32px rows) and comfortable (44px rows):

```js
function setDensity(gridApi, gridEl, density) {
  gridEl.className = 'ag-theme-quartz thq-density--' + density;
  gridApi.updateGridOptions({
    rowHeight: density === 'compact' ? 32 : 44,
    headerHeight: density === 'compact' ? 32 : 40
  });
}
```

The CSS classes `.thq-density--compact` and `.thq-density--comfortable` update line-heights and cell padding to match.

## Frozen/Sticky Column

For tables wider than the viewport, freeze the first column:

1. Add `.thq-spreadsheet` class to the grid container
2. CSS in `spreadsheet.css` handles the sticky positioning and scroll shadow

```js
// Track horizontal scroll for shadow effect
gridEl.querySelector('.ag-body-viewport').addEventListener('scroll', function(e) {
  gridEl.classList.toggle('thq-spreadsheet--scrolled', e.target.scrollLeft > 0);
});
```

## Visual Testing Checklist

After building or modifying an AG Grid table, verify with Puppeteer screenshots:

1. **Data renders** — rows have visible content, not blank or clipped
2. **Row height** — cells are 44px (comfortable) or 32px (compact)
3. **Badge pills** — colored background, readable text, not clipped
4. **Header text** — uppercase, correct alignment
5. **Horizontal borders** — visible between rows, no vertical column borders
6. **Hover state** — subtle background on row hover
7. **Empty state** — message shown when no data
8. **Responsive** — table doesn't overflow viewport, text doesn't truncate at mobile widths

Use the DOM inspection pattern to verify computed styles:
```js
// Verify row height is correct
var row = document.querySelector('.ag-row');
var computed = getComputedStyle(row);
console.log('Row height:', computed.height); // Should be "44px"
```

## Anti-Patterns

| Don't | Do Instead |
|-------|-----------|
| Rely on `--ag-row-height` CSS variable alone | Always set `rowHeight` in gridOptions JS |
| Use `display: flex` on `.ag-cell` | Use `line-height` for vertical centering |
| Forget `top: 0` on `.ag-cell` | Always include in theme overrides |
| Return HTML strings from cellRenderer | Return DOM elements |
| Use `autoSizeStrategy` without `flex` | Set `flex: 1` on defaultColDef |
| Skip `headerHeight` in gridOptions | Always set alongside `rowHeight` |
| Set row height via CSS only | Set in both CSS (for line-height) AND JS gridOptions |

## Reference Files

- **Theme overrides:** `css/spreadsheet.css`
- **Working grid example:** `js/spreadsheet.js` (ThqSpreadsheet class)
- **Work items grid:** `js/projects.js` (search for `wiCreateGridWithItems`)
- **Design tokens:** `css/tokens.css`
