# Embedded Spreadsheet / Table Viewer — Technical Research Brief

**Researcher:** Marco (Technical Researcher)
**Date:** 2026-02-09
**Status:** Complete

---

## Objective

Evaluate lightweight spreadsheet/table libraries for embedding a polished, read-only tabular data viewer in the TeamHQ landing page. TeamHQ uses **plain HTML/CSS/vanilla JS** with no build step — the solution must work via CDN script tags and integrate with our existing design token system.

**Use cases:** Revenue models, metrics dashboards, competitive analysis tables, project tracking data.

---

## Libraries Evaluated

### 1. Tabulator (tabulator.info)

| Attribute | Detail |
|-----------|--------|
| **License** | MIT — free for commercial use |
| **Bundle size** | ~99 kB min+gzip (JS only); ~120 kB with CSS |
| **Vanilla JS** | First-class. No framework dependency. Works via CDN `<script>` tag |
| **Read-only mode** | Yes — omit editor definitions; columns are view-only by default |
| **Sorting** | Built-in per-column, multi-column sort |
| **Filtering** | Built-in header filters, custom filter functions |
| **Theming** | SCSS variable system with `!default` overrides; compiled CSS can be overridden with plain CSS selectors. No native CSS custom property system, but class-based overrides are straightforward |
| **Data import** | JSON arrays, AJAX endpoints, CSV (via SheetJS integration), HTML tables |
| **Responsive** | Built-in `responsiveLayout: "hide"` and `"collapse"` modes with column priority system |
| **Maintenance** | Active — v6.3 (2025), 7k+ GitHub stars, ~111k npm weekly downloads |
| **CDN** | Available via unpkg and cdnjs |

**Strengths:** Most complete feature set for our needs. Responsive layout is built in with column priority controls. Sorting, filtering, formatting — all out of the box. JSON data import is trivial. Zero dependencies. Strong documentation with live examples. The quickstart path (two CDN links + a constructor call) is about as simple as it gets for a vanilla JS project.

**Weaknesses:** Bundle is the second largest of the lightweight options (~99 kB gzipped). Theming uses SCSS variables under the hood — we don't have a build step, so we'd override compiled CSS classes directly rather than using SCSS variables. This is workable but means consulting their class reference rather than mapping tokens 1:1.

---

### 2. Grid.js (gridjs.io)

| Attribute | Detail |
|-----------|--------|
| **License** | MIT — free for commercial use |
| **Bundle size** | ~12 kB min+gzip (JS only) |
| **Vanilla JS** | First-class. Framework-agnostic core |
| **Read-only mode** | Default — no editing built in |
| **Sorting** | Built-in |
| **Filtering** | Built-in search; column-level filtering via plugins |
| **Theming** | CSS classes, fairly minimal defaults — easy to override |
| **Data import** | JSON arrays, async server-side fetch |
| **Responsive** | Basic — relies on CSS overflow. No built-in responsive column hiding |
| **Maintenance** | Unclear — last major release was v6.x, 4.5k GitHub stars. Some community activity but core development pace has slowed. The jQuery wrapper is flagged "Inactive" by Snyk |
| **CDN** | Available via unpkg and cdnjs |

**Strengths:** Extremely lightweight at ~12 kB. Dead simple API. Read-only by default (no editing to disable). Easy to style since the default CSS is minimal.

**Weaknesses:** Missing features we'd want: no built-in column filtering (only global search), no responsive column hiding, no CSV import, no number/currency formatting. Maintenance trajectory is concerning — the core package hasn't had frequent releases, and the ecosystem packages are flagged inactive. For a product we'll maintain, betting on a library with uncertain maintenance is risky.

---

### 3. AG Grid Community (ag-grid.com)

| Attribute | Detail |
|-----------|--------|
| **License** | MIT (Community edition) — free for commercial use |
| **Bundle size** | ~298 kB min+gzip (full community); reducible with module imports |
| **Vanilla JS** | Supported via CDN bundle or ES modules |
| **Read-only mode** | Yes — default (editing is opt-in) |
| **Sorting** | Built-in, multi-column |
| **Filtering** | Built-in column filters, custom filter components |
| **Theming** | Extensive theme API with CSS custom properties (v33+), multiple built-in themes |
| **Data import** | JSON arrays, async data sources |
| **Responsive** | Column auto-sizing; no built-in responsive collapse like Tabulator |
| **Maintenance** | Very active — enterprise-backed, frequent releases, 13k+ GitHub stars |
| **CDN** | Available via CDN bundles |

**Strengths:** Enterprise-grade quality. Best theming system of the group (CSS custom properties in v33+). Enormous feature set. Very active maintenance.

**Weaknesses:** Massively over-engineered for our use case. ~298 kB gzipped is 3x Tabulator and 25x Grid.js. The API surface is huge — it's designed for enterprise data grids with thousands of rows, pivoting, row grouping, etc. We're displaying simple read-only tables. Using AG Grid here is like hiring a moving truck to deliver a sandwich. The module system can reduce bundle size, but that requires a build step (imports/tree-shaking), which conflicts with our no-build vanilla JS setup.

---

### 4. jspreadsheet CE (jspreadsheet.com)

| Attribute | Detail |
|-----------|--------|
| **License** | MIT (Community Edition v4/v5) — free for commercial use |
| **Bundle size** | ~30-40 kB min+gzip (CE) |
| **Vanilla JS** | First-class. No framework dependency |
| **Read-only mode** | Yes — `editable: false` config option |
| **Sorting** | Built-in |
| **Filtering** | Available in Pro only; CE has limited filtering |
| **Theming** | CSS class overrides; minimal built-in theming system |
| **Data import** | JSON arrays, CSV, programmatic data loading |
| **Responsive** | Minimal — horizontal scroll, no column collapsing |
| **Maintenance** | Active for Pro; CE is maintained but feature-gated — new features go to Pro |
| **CDN** | Available |

**Strengths:** Spreadsheet-native feel (cells, formulas in Pro). Good CSV import. Lightweight CE bundle. Vanilla JS native.

**Weaknesses:** The CE/Pro split creates a feature cliff. Column filtering requires Pro. The library is oriented toward editable spreadsheets, not read-only data viewers — we'd be fighting against its design intent. Responsive behavior is weak. The community edition increasingly feels like a teaser for Pro.

---

### 5. Handsontable

| Attribute | Detail |
|-----------|--------|
| **License** | **Non-commercial only** (changed from MIT in 2019). Commercial use requires a paid license |
| **Bundle size** | ~180 kB min+gzip |
| **Vanilla JS** | Supported |
| **Read-only mode** | Yes |

**Verdict: Disqualified.** Handsontable dropped its MIT license in 2019 and now requires a paid license for commercial use. Not viable for our needs.

---

### 6. SlickGrid / SlickGrid-Universal

| Attribute | Detail |
|-----------|--------|
| **License** | MIT |
| **Bundle size** | Large — @slickgrid-universal/common alone is 8.5 MB (unpacked npm size); the vanilla-bundle has 9 dependencies |
| **Vanilla JS** | Supported via @slickgrid-universal/vanilla-bundle |
| **Read-only mode** | Yes |
| **Sorting/Filtering** | Comprehensive |
| **Theming** | CSS customizable |
| **Maintenance** | Active — v9.9, regular releases |

**Strengths:** Powerful grid for enterprise use. Handles massive datasets with virtual scrolling.

**Weaknesses:** The dependency chain is heavy. Originally a jQuery-era library that's been modernized, but it carries architectural baggage. The vanilla-bundle setup is more complex than Tabulator or Grid.js. Designed for complex enterprise scenarios (virtual scrolling over 100k+ rows) — overkill for our read-only viewer tables.

---

### 7. TanStack Table (@tanstack/table-core)

| Attribute | Detail |
|-----------|--------|
| **License** | MIT |
| **Bundle size** | ~10-15 kB min+gzip (core) |
| **Vanilla JS** | Supported via @tanstack/table-core |
| **Read-only mode** | Yes (headless — no editing unless you build it) |
| **Theming** | N/A — headless (no UI rendered) |

**Strengths:** Extremely lightweight core. Headless architecture means total styling control.

**Weaknesses:** Headless means **you build all the UI yourself** — every table row, cell, header, sort indicator, filter input. For a no-build vanilla JS project, this means writing substantial DOM manipulation code. The "10 kB" headline is misleading because you'd need to add significant custom code (likely 5-10 kB+ of your own rendering logic) to match what Tabulator gives you in one constructor call. There's no CDN-friendly way to use this without a build step (it ships as ES modules expecting imports). Bad fit for our stack.

---

## Custom Build Option: CSS Grid + Vanilla JS

**Could we skip libraries entirely and build a lightweight table component?**

### What we'd build
- CSS Grid or `<table>` element with custom styling
- Vanilla JS for sort-on-click, optional filter inputs
- JSON data binding via `fetch()` + DOM manipulation

### What we'd get
- Zero dependencies, zero bundle overhead
- Perfect design token integration (our CSS, our way)
- Full control over responsive behavior

### What we'd lose
- **Column sorting** — need to implement ourselves (~50-80 lines)
- **Column filtering** — need to implement ourselves (~80-120 lines)
- **Responsive column hiding** — significant effort to build well (~100+ lines)
- **Data formatting** (currency, percentages, dates) — need custom formatters
- **Pagination** — need to implement if datasets grow
- **Edge cases** — empty states, loading states, error handling, keyboard navigation
- **Ongoing maintenance** — every bug and feature request is on us

### Estimated effort
~300-500 lines of JS + ~200 lines of CSS for a basic version with sort and filter. A week of Alice's time to build and polish, vs. a day to integrate Tabulator.

### Verdict
A custom build makes sense **only if** the table is truly minimal (no sorting, no filtering, just styled rows) OR if bundle size is an absolute hard constraint. For a polished viewer with sorting, filtering, and responsive behavior, the custom path costs 3-5x more development time than using Tabulator and produces a less robust result.

---

## Comparison Matrix

| Criteria | Tabulator | Grid.js | AG Grid | jspreadsheet CE | Custom Build |
|----------|-----------|---------|---------|-----------------|--------------|
| **License** | MIT | MIT | MIT (Community) | MIT (CE) | N/A |
| **Bundle (gzip)** | ~99 kB | ~12 kB | ~298 kB | ~35 kB | 0 kB |
| **Vanilla JS (CDN)** | Excellent | Good | Acceptable | Good | N/A |
| **Read-only** | Yes | Default | Default | Config flag | N/A |
| **Sorting** | Built-in | Built-in | Built-in | Built-in | Build it |
| **Filtering** | Built-in | Search only | Built-in | Pro only | Build it |
| **Responsive** | Built-in (column priority) | None | Auto-size only | None | Build it |
| **Theming** | CSS override | CSS override | CSS vars (v33+) | CSS override | Native |
| **Maintenance** | Active (111k/wk) | Slowing | Very active | CE is secondary | On us |
| **Setup complexity** | 2 CDN links + constructor | 2 CDN links + constructor | CDN bundle + config | 2 CDN links + constructor | 300-500 lines |
| **Fit for use case** | Excellent | Decent | Overkill | Decent | Depends on scope |

---

## Recommendation: Custom Build for v1, Tabulator on Standby for v2

After reviewing Thomas's requirements doc and Suki's market research, I'm updating my recommendation. Thomas scoped v1 as **read-only with sorting only** — no column filtering, no responsive column hiding (just horizontal scroll + sticky first column), no CSV import. Given that scope:

**For v1: Build custom.** Thomas's call is correct. Here's why:

1. **The v1 feature set is small enough.** Read-only rendering + click-to-sort + type formatting + sticky first column is approximately 200-300 lines of JS and 200 lines of CSS. Alice can build this in a day. It's well within the complexity threshold where custom code is simpler than learning and theming a library.

2. **Zero bundle overhead.** No ~99 kB gzipped payload for features we're not using (column filtering, responsive column hiding, header filter inputs, pagination). For a landing page, every kilobyte matters.

3. **Perfect design token integration.** A custom build uses our tokens natively — no CSS override layer fighting against a library's default styles. Robert's design spec (Notion-style, no column borders, monospace numbers, badge pills) will be easier to implement without a library's opinions in the way.

4. **Full control over semantics and accessibility.** We render our own `<table>`, `<thead>`, `<th scope="col">`, `aria-sort` — exactly the way Amara specifies. No auditing a library's ARIA output.

5. **No dependency risk.** The custom component lives in `js/table.js` and depends on nothing. No library deprecation, no license changes, no breaking updates.

**For v2 (if scope expands): Use Tabulator.** The tipping point is when the team wants:

- **Column filtering** — building a good filter UI (per-column dropdowns, text search, clear buttons) from scratch is 200+ lines of JS and significant UX design work. Tabulator has this built in.
- **Responsive column hiding** — Tabulator's `responsiveLayout: "collapse"` with column priority is hard to replicate well. Our v1 uses horizontal scroll instead, which is fine, but if the CEO wants columns to hide/collapse on mobile, Tabulator solves it in one config line.
- **Pagination or virtual scrolling** — if datasets grow beyond 500 rows, Tabulator handles this natively.

If any two of those three features land in the v2 requirements, switch to Tabulator. The migration cost is low — replace the `TeamHQTable` class constructor with a `Tabulator` constructor, map our JSON schema to Tabulator's column definitions, and apply CSS overrides.

### Why Tabulator specifically (not the others)

- **AG Grid** (~298 kB) is 3x the size for enterprise features we'll never use, and its module system needs a build step to get smaller.
- **Grid.js** (~12 kB) is tiny but missing column filtering, responsive column hiding, and number formatting. Maintenance trajectory is worrying.
- **jspreadsheet CE** (~35 kB) gates column filtering behind Pro. The CE/Pro split means we'd hit a wall on features.
- **SlickGrid** carries too many dependencies and architectural complexity for a simple viewer.
- **TanStack Table** (~10-15 kB) is headless/ESM-only — requires a build step and we'd write all the rendering ourselves anyway.
- **Handsontable** is disqualified (non-commercial license).

Tabulator hits the sweet spot: MIT license, CDN-friendly, zero dependencies, responsive column modes, built-in filtering, ~99 kB gzipped. It's the only library in this evaluation that would let us skip writing custom sort/filter/responsive logic and still work with our no-build vanilla JS setup.

### Tabulator v2 integration reference (for when/if we migrate)

```html
<!-- CDN (no build step required) -->
<link href="https://unpkg.com/tabulator-tables@6.3/dist/css/tabulator.min.css" rel="stylesheet">
<script src="https://unpkg.com/tabulator-tables@6.3/dist/js/tabulator.min.js"></script>
```

```javascript
// Minimal setup — JSON data, sortable columns, responsive
const table = new Tabulator("#data-table", {
  data: tableData, // JSON array
  responsiveLayout: "collapse",
  layout: "fitColumns",
  columns: [
    { title: "Metric", field: "metric", responsive: 0 }, // always visible
    { title: "Q1", field: "q1", responsive: 1 },
    { title: "Q2", field: "q2", responsive: 1 },
    { title: "Q3", field: "q3", responsive: 2 }, // hidden first on small screens
    { title: "Q4", field: "q4", responsive: 2 },
  ],
});
```

```css
/* Override Tabulator styles with our design tokens */
.tabulator {
  font-family: var(--font-family);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.tabulator .tabulator-header {
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}
.tabulator .tabulator-header .tabulator-col {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}
.tabulator .tabulator-row .tabulator-cell {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border-right: none;
}
.tabulator .tabulator-row.tabulator-row-even {
  background-color: var(--color-bg-secondary);
}
```

### What to tell the team

- **Thomas (PM):** Your custom build call is correct for v1 scope. The research confirms no library justifies its weight for read-only + sorting. I've documented Tabulator as the migration target if v2 expands to filtering or responsive column hiding.
- **Andrei (Arch):** v1 is custom build — zero dependencies, `js/table.js` + `css/table.css`. If we ever need a library, Tabulator is MIT, zero dependencies, CDN-loadable, ~99 kB gzipped.
- **Robert (Designer):** Custom build means our CSS uses tokens directly — no library style overrides. You have total control over the Notion-style aesthetic.
- **Alice (FE):** Build the `TeamHQTable` class as specced. The sort implementation is straightforward — `Array.sort()` with type-aware comparators. I've included Tabulator's column definition pattern above for v2 reference if we migrate later.
- **Soren (Responsive):** v1 uses horizontal scroll + sticky first column (CSS `position: sticky`). If we later want responsive column hiding/collapsing, that's when Tabulator earns its weight.
- **Amara (A11y):** Custom build gives us full control over table semantics — `<th scope="col">`, `aria-sort`, keyboard navigation. No auditing a library's ARIA output.

---

## Sources

- [Tabulator Official Site](https://tabulator.info/)
- [Tabulator GitHub](https://github.com/olifolkerd/tabulator) — 7k+ stars, MIT license
- [Tabulator Themes Documentation](https://tabulator.info/docs/6.3/theme)
- [Tabulator Responsive Layout](https://tabulator.info/docs/6.3/layout)
- [Tabulator Quickstart](https://tabulator.info/docs/6.3/quickstart)
- [Tabulator on npm](https://www.npmjs.com/package/tabulator-tables) — 111k weekly downloads
- [Grid.js Official Site](https://gridjs.io/)
- [Grid.js GitHub](https://github.com/grid-js/gridjs) — 4.5k stars
- [AG Grid Community](https://www.ag-grid.com/) — MIT community edition
- [AG Grid Bundle Size Optimization](https://blog.ag-grid.com/minimising-bundle-size/)
- [jspreadsheet CE GitHub](https://github.com/jspreadsheet/ce)
- [Handsontable License Change](https://handsontable.com/blog/handsontable-drops-open-source-for-a-non-commercial-license)
- [SlickGrid-Universal](https://github.com/ghiscoding/slickgrid-universal)
- [TanStack Table](https://tanstack.com/table/latest)
- [Best JavaScript Data Grids in 2025 — Bryntum](https://bryntum.com/blog/the-best-javascript-data-grids-in-2025/)
- [DataTables Alternatives 2026 — TFC](https://www.thefrontendcompany.com/posts/datatables-alternatives)
