# Embedded Spreadsheet Component -- Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** Feb 9, 2026
**Status:** Complete

## Overview

This document defines the technical approach for the embedded spreadsheet component. The CEO has directed us to use **AG Grid Community Edition** (MIT license) loaded via CDN, overriding the earlier research-phase recommendation for a custom build. AG Grid provides a mature, enterprise-grade data grid with built-in sorting, theming via CSS custom properties, and custom cell renderers -- all of which map cleanly to our requirements.

The approach: load AG Grid's UMD bundle from jsDelivr, write a thin adapter class (`TeamHQSpreadsheet`) that converts our JSON schema into AG Grid's `columnDefs`/`rowData` format, and override AG Grid's CSS variables to match our design tokens. No build step. No new backend routes.

---

## Decision: AG Grid Community via CDN

**What:** AG Grid Community Edition v34, loaded as a UMD bundle from jsDelivr CDN.

**Why the CEO chose this over custom build:**
- AG Grid handles sorting, column sizing, sticky headers, keyboard navigation, and responsive scrolling out of the box. We get production-grade table behavior for free.
- The v33+ Theming API exposes CSS custom properties (`--ag-*`) that we can map directly to our design tokens. No fighting a library's compiled SCSS -- just CSS variable overrides.
- Custom cell renderers are vanilla JS functions. We write our type-aware formatters (currency, percent, badge) as simple functions that AG Grid calls per cell. Zero framework dependency.
- The Community edition is MIT-licensed with very active maintenance (enterprise-backed, frequent releases). No license risk.
- If requirements expand (filtering, column grouping, virtual scrolling for large datasets), AG Grid already has these features. We upgrade config, not architecture.

**What we trade off:**
- Bundle size: ~298 kB min+gzip for the full community bundle. This is significantly larger than a custom build (0 kB) or Tabulator (~99 kB). For a headquarters app used by the CEO (not a public marketing page), this is an acceptable trade. The CDN caches aggressively -- repeat visits pay nothing.
- Some overkill: AG Grid has features we will never use (row grouping, pivoting, clipboard). They sit dormant. No runtime cost for unused features, just download weight on first load.

**Why not Tabulator:** AG Grid's CSS custom property theming (v33+) is a cleaner mapping to our token system than Tabulator's SCSS-compiled class overrides. AG Grid's maintenance velocity is higher. The CEO prefers it.

---

## CDN Integration

### Script and Style Tags

AG Grid v33+ includes the Quartz theme within the JS bundle when using the Theming API. However, for CDN/UMD usage without a build step, we use the legacy approach with separate CSS files. This gives us explicit control over theme loading and CSS variable overrides.

**index.html** (and docs.html, spreadsheets.html):

```html
<!-- AG Grid Community — CSS (structural + Quartz theme) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@34/styles/ag-grid.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@34/styles/ag-theme-quartz.css">

<!-- AG Grid Community — JS (UMD bundle, registers all modules automatically) -->
<script src="https://cdn.jsdelivr.net/npm/ag-grid-community@34/dist/ag-grid-community.min.js"></script>
```

**Key details:**
- Version is pinned to the major version (`@34`) so we get patch fixes automatically but avoid breaking changes.
- The UMD bundle exposes the `agGrid` global variable. All Community modules are auto-registered.
- The `ag-grid.css` file provides structural styles (layout, positioning). The `ag-theme-quartz.css` file provides the visual theme. Both are required.
- These tags go in `<head>` (CSS) and before our own scripts (JS). AG Grid must be loaded before `js/spreadsheet.js` executes.

### Load Order

```
1. css/tokens.css          -- our design tokens
2. ag-grid.css             -- AG Grid structural styles
3. ag-theme-quartz.css     -- AG Grid Quartz theme
4. css/shared.css          -- TeamHQ shared styles
5. css/styles.css          -- page-specific styles (index.html)
   css/docs.css            -- page-specific styles (docs.html)
   css/spreadsheet.css     -- our AG Grid overrides + wrapper styles (new)
6. ag-grid-community.min.js -- AG Grid UMD bundle
7. js/spreadsheet.js        -- our adapter class (new)
8. js/projects.js / js/docs.js / js/spreadsheets.js -- page scripts that use it
```

The AG Grid CSS loads after `tokens.css` so our token values are available for the override layer. Our `spreadsheet.css` loads after AG Grid's CSS so our overrides win by specificity.

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `js/spreadsheet.js` | `TeamHQSpreadsheet` adapter class. Converts our JSON schema to AG Grid config. Contains value formatters, cell renderers, and density toggle logic. |
| `css/spreadsheet.css` | AG Grid CSS variable overrides mapped to our design tokens. Wrapper styles for scroll container, density toggle, table header bar. |
| `spreadsheets.html` | Standalone spreadsheets browse page (like `docs.html`). |
| `js/spreadsheets.js` | Page logic for `spreadsheets.html` -- fetches index, renders list, handles full-width view. |
| `data/spreadsheets/index.json` | Cross-project index mapping project IDs to their spreadsheet files. |
| `data/spreadsheets/{project-id}/{spreadsheet-id}.json` | Individual spreadsheet data files. |

### Existing Files Modified

| File | Change |
|------|--------|
| `index.html` | Add AG Grid CDN tags, `css/spreadsheet.css`, `js/spreadsheet.js`. Add "Spreadsheets" nav link. |
| `docs.html` | Add AG Grid CDN tags, `css/spreadsheet.css`, `js/spreadsheet.js`. |
| `spreadsheets.html` | New page (nav, header, list container, reader container, footer). |
| `js/projects.js` | Add "Data" section rendering in `renderDetailView()` after Progress Notes. |
| `js/docs.js` | Add spreadsheet directive detection and rendering in `renderReadingView()`. |

---

## Data Format Adapter

### Our JSON Schema (Thomas's format)

```json
{
  "id": "revenue-model-2026",
  "projectId": "sherlock-pdf",
  "name": "Revenue Model",
  "description": "Monthly MRR projections.",
  "columns": [
    { "key": "month", "label": "Month", "type": "text" },
    { "key": "total", "label": "Total MRR", "type": "currency", "prefix": "$" }
  ],
  "rows": [
    { "month": "Jan 2026", "total": 17200 }
  ]
}
```

### AG Grid Format

```javascript
{
  columnDefs: [
    { field: "month", headerName: "Month", sortable: true, ... },
    { field: "total", headerName: "Total MRR", sortable: true, type: "rightAligned", valueFormatter: currencyFormatter, ... }
  ],
  rowData: [
    { month: "Jan 2026", total: 17200 }
  ]
}
```

### The Adapter: `TeamHQSpreadsheet.convertColumn(col)`

A single function maps each column definition from our schema to an AG Grid `colDef` object. The conversion is per-column, based on the `type` field:

```javascript
TeamHQSpreadsheet.convertColumn = function (col) {
  var def = {
    field: col.key,
    headerName: col.label,
    sortable: true,
    resizable: false
  };

  switch (col.type) {
    case 'number':
      def.type = 'rightAligned';
      def.valueFormatter = numberFormatter;
      def.comparator = numericComparator;
      def.cellClass = 'thq-cell--mono';
      break;

    case 'currency':
      def.type = 'rightAligned';
      def.valueFormatter = currencyFormatter(col.prefix || '$');
      def.comparator = numericComparator;
      def.cellClass = 'thq-cell--mono';
      break;

    case 'percent':
      def.type = 'rightAligned';
      def.valueFormatter = percentFormatter;
      def.comparator = numericComparator;
      def.cellClass = 'thq-cell--mono';
      break;

    case 'date':
      def.valueFormatter = dateFormatter;
      def.comparator = dateComparator;
      break;

    case 'badge':
      def.cellRenderer = badgeCellRenderer;
      def.comparator = textComparator;
      break;

    case 'text':
    default:
      def.comparator = textComparator;
      break;
  }

  return def;
};
```

**Row data passes through unchanged.** Our `rows` array is already in the `{ key: value }` format AG Grid expects for `rowData`. No transformation needed.

---

## Column Type Rendering

### Value Formatters (return strings)

Used for `number`, `currency`, `percent`, and `date` types. AG Grid calls these functions for each cell value and displays the returned string.

| Type | Formatter Logic | Output Example |
|------|-----------------|----------------|
| `number` | `value.toLocaleString()` | `1,234` |
| `currency` | `prefix + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })` | `$17,200` |
| `percent` | `value.toFixed(1) + '%'` | `11.0%` |
| `date` | `new Date(value)` formatted as `MMM DD, YYYY` | `Jan 15, 2026` |

**Null handling:** All formatters check for `null`/`undefined` and return `'--'` (displayed in tertiary color via CSS class). This matches Thomas's spec.

```javascript
function numberFormatter(params) {
  if (params.value == null) return '--';
  return Number(params.value).toLocaleString();
}

function currencyFormatter(prefix) {
  return function (params) {
    if (params.value == null) return '--';
    return prefix + Number(params.value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };
}

function percentFormatter(params) {
  if (params.value == null) return '--';
  return Number(params.value).toFixed(1) + '%';
}

function dateFormatter(params) {
  if (params.value == null) return '--';
  var d = new Date(params.value);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}
```

### Cell Renderer (returns DOM -- badge type only)

The `badge` type needs HTML (a colored pill), not just a string. AG Grid's `cellRenderer` function returns a DOM element or HTML string.

```javascript
function badgeCellRenderer(params) {
  if (params.value == null) return '--';
  var value = String(params.value).toLowerCase();
  var colorClass = badgeColorClass(value);
  var span = document.createElement('span');
  span.className = 'thq-badge ' + colorClass;
  span.textContent = params.value;
  return span;
}

function badgeColorClass(value) {
  switch (value) {
    case 'high': case 'critical':
      return 'thq-badge--error';
    case 'medium': case 'warning':
      return 'thq-badge--warning';
    case 'low': case 'info':
      return 'thq-badge--accent';
    case 'yes': case 'true': case 'included':
      return 'thq-badge--success';
    case 'no': case 'false': case 'excluded':
      return 'thq-badge--muted';
    default:
      return 'thq-badge--neutral';
  }
}
```

Badge CSS uses the existing status color tokens from `tokens.css`:

```css
.thq-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  text-transform: capitalize;
}
.thq-badge--error   { background: rgba(220, 38, 38, 0.1); color: var(--color-status-error); }
.thq-badge--warning { background: rgba(202, 138, 4, 0.1); color: var(--color-status-warning); }
.thq-badge--accent  { background: rgba(0, 107, 63, 0.08); color: var(--color-accent); }
.thq-badge--success { background: rgba(22, 163, 74, 0.1); color: var(--color-status-success); }
.thq-badge--muted   { background: var(--color-bg-secondary); color: var(--color-text-tertiary); }
.thq-badge--neutral { background: var(--color-bg-secondary); color: var(--color-text-secondary); }
```

### Sort Comparators

AG Grid provides built-in sorting, but custom comparators handle our type-specific needs (nulls last, date parsing):

```javascript
function numericComparator(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;   // nulls last
  if (b == null) return -1;
  return a - b;
}

function textComparator(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return String(a).localeCompare(String(b));
}

function dateComparator(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}
```

---

## Theming: AG Grid CSS Variables to Design Tokens

AG Grid's Quartz theme exposes `--ag-*` CSS custom properties. We override these in `css/spreadsheet.css` within the `.ag-theme-quartz` selector to map to our design tokens.

### Core Overrides

```css
.ag-theme-quartz {
  /* Typography */
  --ag-font-family: var(--font-family);
  --ag-font-size: var(--text-sm);

  /* Colors — backgrounds */
  --ag-background-color: var(--color-bg-primary);
  --ag-header-background-color: var(--color-bg-secondary);
  --ag-odd-row-background-color: var(--color-bg-primary);
  --ag-row-hover-color: var(--color-accent-light);

  /* Colors — text */
  --ag-foreground-color: var(--color-text-primary);
  --ag-header-foreground-color: var(--color-text-secondary);
  --ag-secondary-foreground-color: var(--color-text-secondary);

  /* Colors — borders */
  --ag-border-color: var(--color-border);
  --ag-header-column-separator-color: transparent;
  --ag-row-border-color: var(--color-border);
  --ag-column-border: none;

  /* Spacing */
  --ag-grid-size: 4px;
  --ag-cell-horizontal-padding: var(--space-3);
  --ag-row-height: 40px;
  --ag-header-height: 40px;

  /* Borders — minimal (Notion-style) */
  --ag-borders: none;
  --ag-borders-row: solid 1px;
  --ag-header-column-resize-handle-display: none;

  /* Sort icon */
  --ag-icon-size: 14px;

  /* No outer border radius — the wrapper handles this */
  --ag-wrapper-border-radius: 0;
  --ag-border-radius: 0;
}
```

### What This Achieves

- **No vertical cell borders** -- `--ag-column-border: none` and `--ag-header-column-separator-color: transparent` remove all vertical lines. Only horizontal row dividers remain.
- **Subtle row hover** -- `--ag-row-hover-color` uses our `--color-accent-light` (rgba green at 4% opacity), matching the Linear-style barely-visible hover.
- **Header styling** -- secondary background, secondary text color, no resize handles. Clean and minimal.
- **Our fonts** -- Geist family via `--ag-font-family`.

### Additional CSS Overrides

Some visual details require direct CSS selectors beyond variable overrides:

```css
/* Header text — semibold, slightly smaller */
.ag-theme-quartz .ag-header-cell-text {
  font-weight: var(--font-weight-semibold);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

/* Monospace for numeric cells */
.ag-theme-quartz .thq-cell--mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

/* Null/empty cell styling */
.ag-theme-quartz .ag-cell:has(.thq-null),
.ag-theme-quartz .ag-cell[data-null="true"] {
  color: var(--color-text-tertiary);
}

/* Sort icon color */
.ag-theme-quartz .ag-sort-ascending-icon,
.ag-theme-quartz .ag-sort-descending-icon {
  color: var(--color-accent);
}

/* Row hover transition */
.ag-theme-quartz .ag-row {
  transition: background-color 120ms ease;
}
```

---

## The `TeamHQSpreadsheet` Class

This is the main adapter that Alice will implement. It wraps AG Grid's `createGrid` API and provides a consistent interface for all three integration surfaces.

### Constructor

```javascript
/**
 * TeamHQSpreadsheet — adapter between our JSON schema and AG Grid.
 *
 * @param {HTMLElement} container — the DOM element to mount the grid into
 * @param {Object} data — the spreadsheet JSON (our schema)
 * @param {Object} [options] — optional config
 * @param {string} [options.density] — 'compact' or 'comfortable' (default)
 * @param {number} [options.height] — explicit height in px (default: auto-height)
 */
function TeamHQSpreadsheet(container, data, options) {
  options = options || {};
  this.container = container;
  this.data = data;
  this.density = options.density || TeamHQSpreadsheet.getSavedDensity();

  // Build AG Grid config
  var columnDefs = data.columns.map(TeamHQSpreadsheet.convertColumn);
  var gridOptions = {
    columnDefs: columnDefs,
    rowData: data.rows,
    defaultColDef: {
      sortable: true,
      resizable: false,
      suppressMovable: true
    },
    domLayout: options.height ? 'normal' : 'autoHeight',
    suppressHorizontalScroll: false,
    animateRows: false,
    rowSelection: undefined,
    headerHeight: 40,
    rowHeight: this.density === 'compact' ? 32 : 40,
    suppressCellFocus: true,
    enableCellTextSelection: true
  };

  // Create wrapper with theme class
  this.wrapperEl = document.createElement('div');
  this.wrapperEl.className = 'thq-spreadsheet ag-theme-quartz thq-density--' + this.density;
  if (options.height) {
    this.wrapperEl.style.height = options.height + 'px';
  }
  container.appendChild(this.wrapperEl);

  // Create the AG Grid instance
  this.gridApi = agGrid.createGrid(this.wrapperEl, gridOptions);
}
```

### Key Methods

```javascript
/** Toggle between compact and comfortable density */
TeamHQSpreadsheet.prototype.setDensity = function (density) {
  this.density = density;
  this.wrapperEl.className = 'thq-spreadsheet ag-theme-quartz thq-density--' + density;
  this.gridApi.updateGridOptions({
    rowHeight: density === 'compact' ? 32 : 40
  });
  TeamHQSpreadsheet.saveDensity(density);
};

/** Destroy the grid instance (cleanup) */
TeamHQSpreadsheet.prototype.destroy = function () {
  if (this.gridApi) {
    this.gridApi.destroy();
    this.gridApi = null;
  }
};

/** Static: read/write density preference to localStorage */
TeamHQSpreadsheet.getSavedDensity = function () {
  try { return localStorage.getItem('thq-table-density') || 'comfortable'; }
  catch (e) { return 'comfortable'; }
};

TeamHQSpreadsheet.saveDensity = function (density) {
  try { localStorage.setItem('thq-table-density', density); }
  catch (e) { /* localStorage unavailable */ }
};
```

### Density CSS

```css
/* Compact density overrides */
.thq-density--compact.ag-theme-quartz {
  --ag-row-height: 32px;
  --ag-font-size: var(--text-xs);
  --ag-cell-horizontal-padding: var(--space-2);
}

/* Comfortable density (default) */
.thq-density--comfortable.ag-theme-quartz {
  --ag-row-height: 40px;
  --ag-font-size: var(--text-sm);
  --ag-cell-horizontal-padding: var(--space-3);
}
```

---

## Integration Surfaces

### Surface 1: Project Detail View (`js/projects.js`)

**Where:** After the "Progress Notes" section in `renderDetailView()`.

**How:**

1. When a project detail view renders, check the spreadsheet index (`data/spreadsheets/index.json`) to see if the project has associated spreadsheets.
2. If the project has spreadsheets, render a "Data" section with a heading and one `TeamHQSpreadsheet` instance per spreadsheet file.
3. If the project has no spreadsheets, the section does not render (no empty state).

```javascript
// Inside renderDetailView(), after progress notes section:

function renderDataSection(projectId, containerEl) {
  fetch('data/spreadsheets/index.json')
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function (index) {
      if (!index || !index[projectId] || index[projectId].length === 0) return;

      var files = index[projectId];
      var sectionEl = document.createElement('div');
      sectionEl.className = 'detail__section detail__data-section';
      sectionEl.innerHTML = '<h4 class="detail__label">Data</h4>';
      containerEl.appendChild(sectionEl);

      files.forEach(function (filename) {
        fetch('data/spreadsheets/' + projectId + '/' + filename)
          .then(function (res) { return res.json(); })
          .then(function (data) {
            var wrapper = document.createElement('div');
            wrapper.className = 'detail__spreadsheet';

            // Header: name + density toggle
            var header = document.createElement('div');
            header.className = 'thq-spreadsheet-header';
            header.innerHTML =
              '<div class="thq-spreadsheet-header__info">' +
                '<h5 class="thq-spreadsheet-header__name">' + escapeHTML(data.name) + '</h5>' +
                (data.description ? '<p class="thq-spreadsheet-header__desc">' + escapeHTML(data.description) + '</p>' : '') +
              '</div>' +
              '<div class="thq-spreadsheet-header__controls">' +
                '<button class="thq-density-toggle" type="button" data-density="compact">Compact</button>' +
                '<button class="thq-density-toggle" type="button" data-density="comfortable">Comfortable</button>' +
              '</div>';
            wrapper.appendChild(header);

            // Grid container
            var gridContainer = document.createElement('div');
            wrapper.appendChild(gridContainer);
            sectionEl.appendChild(wrapper);

            var table = new TeamHQSpreadsheet(gridContainer, data);

            // Density toggle wiring
            header.addEventListener('click', function (e) {
              var btn = e.target.closest('.thq-density-toggle');
              if (!btn) return;
              table.setDensity(btn.getAttribute('data-density'));
            });
          })
          .catch(function () { /* silently skip failed loads */ });
      });
    })
    .catch(function () { /* no index file -- no data section */ });
}
```

**Lifecycle:** Spreadsheet instances are created when the project detail expands. They should be destroyed when the detail view collapses (call `table.destroy()`). Track instances in an array on the project detail element, and clean up on collapse.

### Surface 2: Docs Reader View (`js/docs.js`)

**Where:** After markdown is rendered in `renderReadingView()`.

**How:**

1. After `marked.parse(markdown)` produces HTML, scan the rendered content for spreadsheet directives: `<!-- spreadsheet: path/to/file.json -->`.
2. Replace each directive with a container element, then instantiate `TeamHQSpreadsheet` into it.

```javascript
// After markdown rendering:
function processSpreadsheetDirectives(contentEl) {
  // Find HTML comments matching the directive pattern
  var walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_COMMENT);
  var directives = [];
  var node;
  while (node = walker.nextNode()) {
    var match = node.textContent.trim().match(/^spreadsheet:\s*(.+)$/);
    if (match) {
      directives.push({ node: node, path: match[1].trim() });
    }
  }

  directives.forEach(function (directive) {
    var placeholder = document.createElement('div');
    placeholder.className = 'docs-spreadsheet-embed';
    placeholder.innerHTML = '<p class="docs-spreadsheet-embed__loading">Loading spreadsheet...</p>';
    directive.node.parentNode.replaceChild(placeholder, directive.node);

    fetch('data/spreadsheets/' + directive.path)
      .then(function (res) {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(function (data) {
        placeholder.innerHTML = '';

        // Header
        var header = document.createElement('div');
        header.className = 'thq-spreadsheet-header thq-spreadsheet-header--inline';
        header.innerHTML =
          '<h5 class="thq-spreadsheet-header__name">' + escapeHTML(data.name) + '</h5>';
        placeholder.appendChild(header);

        new TeamHQSpreadsheet(placeholder, data);
      })
      .catch(function () {
        placeholder.innerHTML = '<p class="docs-spreadsheet-embed__error">Spreadsheet not found</p>';
      });
  });
}
```

**Directive format in markdown docs:**

```markdown
Here is our revenue projection:

<!-- spreadsheet: sherlock-pdf/revenue-model-2026.json -->

And the competitor analysis:

<!-- spreadsheet: sherlock-pdf/competitor-pricing.json -->
```

The path is relative to `data/spreadsheets/`. The directive is an HTML comment, which markdown renderers pass through untouched.

### Surface 3: Standalone Spreadsheets Page (`spreadsheets.html`)

**Structure mirrors `docs.html`:**

1. **List view** (default): Fetches `data/spreadsheets/index.json`, groups spreadsheets by project. Each item shows name, description, row/column count, and modified date.
2. **Reader view**: Click a spreadsheet to see it full-width with a `TeamHQSpreadsheet` instance. Includes name, description, metadata, and a density toggle.
3. **Back button**: Returns to the list view.

```html
<!-- spreadsheets.html structure -->
<main class="spreadsheets-page">
  <div class="container">
    <div class="spreadsheets-header">
      <h1 class="spreadsheets-header__title">Spreadsheets</h1>
      <p class="spreadsheets-header__stats" id="spreadsheets-stats"></p>
    </div>

    <div id="spreadsheets-list-view">
      <div id="spreadsheets-list"></div>
    </div>

    <div id="spreadsheets-reader-view" style="display: none;"></div>
  </div>
</main>
```

**`js/spreadsheets.js`** follows the same IIFE + delegated event pattern as `js/docs.js`:

1. Fetch index.
2. For each project ID in the index, fetch each spreadsheet's JSON to get name/description/row count (or store these in the index to avoid N+1 fetches -- see optimization below).
3. Render list grouped by project with accordion expand/collapse.
4. On click, switch to reader view and instantiate `TeamHQSpreadsheet`.

**Index optimization:** To avoid fetching every spreadsheet JSON just to display the list, the index should include metadata:

```json
{
  "sherlock-pdf": [
    {
      "file": "revenue-model-2026.json",
      "name": "Revenue Model -- 2026 Projections",
      "description": "Monthly MRR projections.",
      "rows": 12,
      "columns": 6,
      "updatedAt": "2026-02-09T15:00:00.000Z"
    }
  ]
}
```

This avoids N+1 fetches on the list page. The full JSON is only fetched when the user clicks to view a specific spreadsheet.

---

## Responsive Behavior

AG Grid handles horizontal scrolling natively. Additional configuration:

### Grid Options

```javascript
{
  suppressHorizontalScroll: false,  // allow horizontal scroll
  suppressColumnVirtualisation: true // render all columns (needed for sticky first column CSS)
}
```

### Sticky First Column

AG Grid Community does not include column pinning (that's an Enterprise feature). We achieve the sticky first column effect with CSS:

```css
/* Sticky first column */
.thq-spreadsheet .ag-cell:first-child,
.thq-spreadsheet .ag-header-cell:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-bg-primary);
}

.thq-spreadsheet .ag-header-cell:first-child {
  background: var(--color-bg-secondary);
}

/* Subtle right shadow on sticky column */
.thq-spreadsheet .ag-cell:first-child::after,
.thq-spreadsheet .ag-header-cell:first-child::after {
  content: '';
  position: absolute;
  top: 0;
  right: -4px;
  bottom: 0;
  width: 4px;
  background: linear-gradient(to right, rgba(0,0,0,0.06), transparent);
  pointer-events: none;
}
```

### Breakpoint Behavior

```css
/* Mobile: force compact density */
@media (max-width: 767px) {
  .thq-spreadsheet.ag-theme-quartz {
    --ag-row-height: 32px;
    --ag-font-size: var(--text-xs);
    --ag-cell-horizontal-padding: var(--space-2);
  }

  /* Hide density toggle on mobile -- forced compact */
  .thq-spreadsheet-header__controls {
    display: none;
  }
}

/* Scroll hint shadow on container */
.thq-spreadsheet-wrapper {
  position: relative;
}

.thq-spreadsheet-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 24px;
  background: linear-gradient(to left, rgba(0,0,0,0.04), transparent);
  pointer-events: none;
  opacity: 0;
  transition: opacity 200ms ease;
}

.thq-spreadsheet-wrapper--scrollable::after {
  opacity: 1;
}
```

The `--scrollable` class is toggled by JS when the grid's scroll width exceeds its visible width.

---

## Accessibility

AG Grid provides strong baseline accessibility for data grids. Our configuration ensures it meets our standards:

### Built-in AG Grid Accessibility

- AG Grid renders proper `role="grid"`, `role="row"`, `role="gridcell"`, `role="columnheader"` ARIA roles.
- Keyboard navigation between cells is built in (arrow keys, Tab, Enter).
- Sort state is announced via `aria-sort` on column headers.
- Column headers have `scope="col"` equivalent via ARIA roles.

### Our Additions

- **Density toggle**: Keyboard accessible (`<button>` elements). Active state indicated via `aria-pressed`.
- **Spreadsheet header**: Each spreadsheet has a heading (`<h5>`) for document outline navigation.
- **Error states**: "Spreadsheet not found" messages use `role="alert"` for screen reader announcement.
- **Null cells**: The `'--'` string for null values is readable by screen readers. No ARIA override needed.

### What Amara Should Review

- Verify AG Grid's keyboard navigation works correctly within our themed grid.
- Confirm sort state announcements are clear.
- Check color contrast of badge pills against their backgrounds.
- Verify density toggle is operable by keyboard and announced correctly.
- Ensure the sticky first column does not break tab order or screen reader navigation.

---

## Performance

### Bundle Impact

| Asset | Size (gzipped) | Cached? |
|-------|----------------|---------|
| `ag-grid-community.min.js` | ~298 kB | Yes (jsDelivr CDN, long cache) |
| `ag-grid.css` + `ag-theme-quartz.css` | ~40 kB | Yes (jsDelivr CDN) |
| `js/spreadsheet.js` (our adapter) | ~3-4 kB | Yes (local) |
| `css/spreadsheet.css` (our overrides) | ~2-3 kB | Yes (local) |

**First load:** ~340 kB gzipped for AG Grid assets. Subsequent visits: served from browser/CDN cache.

**Mitigation:** AG Grid script tags can use `defer` to avoid blocking page render. The grid initializes only when spreadsheet data is present -- no wasted work on pages/projects with no spreadsheets.

### Runtime Performance

- AG Grid handles 500 rows without virtual scrolling easily. For our v1 scope (up to 500 rows), no pagination or virtualization is needed.
- `domLayout: 'autoHeight'` avoids fixed-height containers and lets the grid size itself to its content. For very tall tables (100+ rows), we can set an explicit height and let AG Grid's built-in virtual scrolling handle it.
- `animateRows: false` disables row animation for snappier sort transitions.

---

## Error Handling

### Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| AG Grid CDN fails to load | `spreadsheet.js` checks for `window.agGrid` before initializing. If missing, renders a static HTML table fallback using the same data. |
| Spreadsheet JSON fetch fails | Inline error message: "Spreadsheet not found" with `--color-text-tertiary` styling. |
| Index JSON fetch fails | Data sections and spreadsheet page show no content. No crash. |
| Column type mismatch (string in number column) | Formatters `try/catch` and fall back to displaying the raw value as text. |
| Empty rows array | AG Grid shows its built-in "No Rows To Show" overlay. We can customize this message. |

### CDN Fallback

```javascript
// In spreadsheet.js — check AG Grid is loaded
if (typeof agGrid === 'undefined') {
  console.warn('AG Grid not loaded — spreadsheet features unavailable');
  // Expose a no-op constructor so page scripts don't crash
  window.TeamHQSpreadsheet = function () {};
  window.TeamHQSpreadsheet.prototype.destroy = function () {};
  window.TeamHQSpreadsheet.prototype.setDensity = function () {};
  return;
}
```

---

## Implementation Sequence

1. **Alice (FE)** implements:
   - `js/spreadsheet.js` -- the `TeamHQSpreadsheet` class with all formatters, renderers, and comparators
   - `css/spreadsheet.css` -- AG Grid CSS variable overrides and wrapper styles
   - `spreadsheets.html` + `js/spreadsheets.js` -- standalone browse page
   - Integration into `js/projects.js` (Data section in detail view)
   - Integration into `js/docs.js` (directive processing)
   - Seed data: 3 spreadsheet JSON files in `data/spreadsheets/`
   - CDN tags added to `index.html`, `docs.html`, `spreadsheets.html`

2. **Soren (Responsive)** reviews:
   - Sticky first column behavior across breakpoints
   - Horizontal scroll with scroll-hint shadow
   - Mobile forced-compact density
   - AG Grid within our `.container` max-width

3. **Amara (A11y)** reviews:
   - AG Grid's ARIA output in our themed configuration
   - Keyboard navigation within the grid
   - Badge color contrast
   - Density toggle operability

4. **Robert (Designer)** reviews:
   - AG Grid theming matches design spec (Notion-style minimal table)
   - Badge pill styling
   - Density modes visual quality
   - Integration with project detail view layout

5. **Enzo (QA)** tests:
   - All 6 column types render correctly
   - Sorting works for each type, including null handling
   - Responsive behavior at all breakpoints
   - Density toggle persists across page loads
   - Doc embedding directive works with multiple spreadsheets
   - Standalone page list and reader views
   - Edge cases: empty rows, single row, many columns (15+), missing spreadsheet file

---

## Seed Data Files

Three spreadsheet JSON files for development and demo. These also serve as format documentation for agents.

### 1. `data/spreadsheets/sherlock-pdf/revenue-model-2026.json`

Revenue projections with `currency` and `percent` column types. 12 rows (monthly).

### 2. `data/spreadsheets/sherlock-pdf/competitor-pricing.json`

Feature comparison matrix with `badge` column type (`yes`/`no`/`partial`), `text`, and `currency`. ~8 rows.

### 3. `data/spreadsheets/teamhq-redesign-v2/design-token-audit.json`

Token audit with `text`, `number`, and `badge` columns. ~10 rows.

### Index File: `data/spreadsheets/index.json`

```json
{
  "sherlock-pdf": [
    {
      "file": "revenue-model-2026.json",
      "name": "Revenue Model -- 2026 Projections",
      "description": "Monthly recurring revenue projections for SherlockPDF across three pricing tiers.",
      "rows": 12,
      "columns": 6,
      "updatedAt": "2026-02-09T15:00:00.000Z"
    },
    {
      "file": "competitor-pricing.json",
      "name": "Competitor Pricing Comparison",
      "description": "Feature and pricing comparison across PDF tool competitors.",
      "rows": 8,
      "columns": 7,
      "updatedAt": "2026-02-09T15:00:00.000Z"
    }
  ],
  "teamhq-redesign-v2": [
    {
      "file": "design-token-audit.json",
      "name": "Design Token Audit",
      "description": "Audit of design token usage across the redesign.",
      "rows": 10,
      "columns": 5,
      "updatedAt": "2026-02-09T15:00:00.000Z"
    }
  ]
}
```

---

## What to Tell the Team

- **Thomas (PM):** Tech approach uses AG Grid Community via CDN per CEO direction. All v1 requirements are achievable -- sorting, type-aware rendering, density toggle, three integration surfaces, responsive. The JSON schema you defined maps directly to AG Grid's columnDefs/rowData with a thin adapter.
- **Robert (Designer):** AG Grid's Quartz theme gives us CSS custom properties (`--ag-*`) that map to our tokens. I have specified the full variable mapping. You have control over header weight, row hover color, border treatment, and font choices. Badge pills are custom CSS outside AG Grid. The grid will look Notion-style minimal, not Excel-style dense.
- **Alice (FE):** The `TeamHQSpreadsheet` class is the central implementation. It converts our JSON schema to AG Grid config via `convertColumn()`. Value formatters handle number/currency/percent/date. A cell renderer handles badges. AG Grid does the heavy lifting for sorting, keyboard nav, and scroll. You are writing ~150-200 lines of adapter JS, not a table from scratch.
- **Soren (Responsive):** AG Grid handles horizontal scroll natively. The sticky first column is CSS-only (AG Grid Community does not include column pinning). Mobile forces compact density via media query. The scroll-hint shadow is a CSS pseudo-element on the wrapper.
- **Amara (A11y):** AG Grid has built-in ARIA roles, keyboard navigation, and sort announcements. Your review should focus on verifying these work correctly within our themed configuration, badge color contrast, and density toggle operability.
- **Enzo (QA):** Test the 6 column types, sorting (including nulls-last), responsive behavior, density persistence, doc embedding, and the standalone page. Edge cases: empty data, wide tables, missing files, CDN failure fallback.
