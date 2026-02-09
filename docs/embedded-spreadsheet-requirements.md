# Embedded Spreadsheet Component — Requirements

**Author**: Thomas (PM)
**Date**: Feb 9, 2026
**Status**: Draft

## Problem Statement

The team produces tabular data during sessions — revenue models, competitive analyses, metrics dashboards, pricing comparisons, feature matrices — but there is no way to display this data natively within TeamHQ. Today, tables end up as markdown in docs or get pasted into external tools. The CEO wants a polished, embedded spreadsheet viewer that makes tabular data a first-class citizen in and around project docs, with a modern aesthetic that feels native to TeamHQ (think Notion tables or Airtable's read view, not Excel).

## One-Sentence Summary

A read-only, sortable, filterable table component that renders structured data inline within TeamHQ project views and doc pages.

## Scope

### In Scope (v1)

1. **Reusable `<thq-table>` component** — a vanilla JS class that renders a table from a JSON data structure, styled to match TeamHQ's design system. No external dependencies.
2. **Column sorting** — click a column header to sort ascending/descending. Visual indicator shows sort direction.
3. **Column type awareness** — columns declare their type (`text`, `number`, `currency`, `percent`, `date`, `badge`). Sorting and formatting respect the declared type.
4. **Responsive behavior** — horizontal scroll on narrow viewports with a sticky first column. No layout breakage.
5. **Data format: JSON** — spreadsheets are defined as JSON files with a simple schema: column definitions + row data. Stored per-project in `data/spreadsheets/{project-id}/`.
6. **Embedding in project detail views** — project detail views gain a "Data" section that lists and renders any spreadsheets associated with the project.
7. **Embedding in doc pages** — the docs reader view can render spreadsheet blocks when a doc references a spreadsheet file.
8. **Standalone spreadsheet page** — a `/spreadsheets.html` page that lists all spreadsheets across projects, filterable by project, and lets you view any one in full-width.
9. **Stripe-style row hover** — subtle row highlight on hover for scan-ability.
10. **Compact and comfortable density modes** — toggle between tight (more rows visible) and relaxed (more padding) display.

### Out of Scope (deferred)

- Inline cell editing or data mutation (read-only for v1)
- Formula evaluation or computed columns
- CSV/Excel import/export
- Column resizing via drag
- Column filtering UI (deferred — sorting is enough for v1)
- Pivot tables or aggregation views
- Real-time collaborative editing
- Server-side pagination (v1 handles datasets up to ~500 rows client-side)
- Chart/visualization generation from table data

## User Stories

### US1: View Spreadsheet Data in a Project

**As the CEO**, I want to see tabular data that agents produced during a project rendered as a polished, readable table inside the project detail view, so I can quickly scan revenue models, comparisons, and metrics without leaving TeamHQ.

**Acceptance Criteria:**
- [ ] When a project has associated spreadsheet data, a "Data" section appears in the project detail view (after Progress Notes)
- [ ] Each spreadsheet renders as a styled table with column headers, typed formatting, and row striping
- [ ] Clicking a column header sorts the table by that column (ascending, then descending, then unsorted)
- [ ] A sort indicator (arrow) appears on the active sort column
- [ ] Tables scroll horizontally on narrow screens; the first column stays sticky
- [ ] Hover over a row highlights it with a subtle background change
- [ ] If the project has no spreadsheet data, the "Data" section does not appear (no empty state needed)

### US2: View Spreadsheet in Docs

**As the CEO**, I want spreadsheet data referenced in a project doc to render inline as a table in the docs reader view, so tabular data is part of the reading flow instead of a separate artifact.

**Acceptance Criteria:**
- [ ] A doc can reference a spreadsheet using a directive (e.g., `<!-- spreadsheet: filename.json -->`)
- [ ] When the docs reader encounters this directive, it fetches and renders the spreadsheet inline
- [ ] The rendered table has the same styling, sorting, and responsive behavior as the project view
- [ ] If the referenced file is missing, a small inline error message appears ("Spreadsheet not found")
- [ ] Multiple spreadsheet directives in a single doc each render independently

### US3: Browse All Spreadsheets

**As the CEO**, I want a dedicated page where I can browse all spreadsheets across all projects, so I can find and view any table the team has produced.

**Acceptance Criteria:**
- [ ] A "Spreadsheets" link appears in the nav (or under a "Data" section)
- [ ] The page lists all spreadsheets grouped by project, showing spreadsheet name, description (if any), row/column count, and last-modified date
- [ ] Clicking a spreadsheet opens it in a full-width reader view on the same page
- [ ] The full-width view includes the table name, description, column count, row count, and the rendered table
- [ ] A "Back to list" action returns to the index

### US4: Density Toggle

**As the CEO**, I want to switch between compact and comfortable table density, so I can see more rows when scanning or more whitespace when reading carefully.

**Acceptance Criteria:**
- [ ] A small toggle (icon or text) appears above each table: "Compact" / "Comfortable"
- [ ] Compact mode reduces row padding and font size slightly
- [ ] Comfortable mode uses the default, more spacious layout
- [ ] The preference persists in `localStorage` across page loads

## Data Model

### Spreadsheet JSON Schema

Each spreadsheet is a single JSON file stored at `data/spreadsheets/{project-id}/{spreadsheet-id}.json`.

```json
{
  "id": "revenue-model-2026",
  "projectId": "sherlock-pdf",
  "name": "Revenue Model — 2026 Projections",
  "description": "Monthly recurring revenue projections for SherlockPDF across three pricing tiers.",
  "createdAt": "2026-02-09T15:00:00.000Z",
  "updatedAt": "2026-02-09T15:00:00.000Z",
  "createdBy": "yuki",
  "columns": [
    { "key": "month",    "label": "Month",     "type": "text" },
    { "key": "starter",  "label": "Starter",   "type": "currency", "prefix": "$" },
    { "key": "pro",      "label": "Pro",       "type": "currency", "prefix": "$" },
    { "key": "team",     "label": "Team",      "type": "currency", "prefix": "$" },
    { "key": "total",    "label": "Total MRR", "type": "currency", "prefix": "$" },
    { "key": "growth",   "label": "Growth",    "type": "percent" }
  ],
  "rows": [
    { "month": "Jan 2026", "starter": 2400, "pro": 5900, "team": 8900, "total": 17200, "growth": null },
    { "month": "Feb 2026", "starter": 2800, "pro": 6500, "team": 9800, "total": 19100, "growth": 11.0 },
    { "month": "Mar 2026", "starter": 3200, "pro": 7200, "team": 10800, "total": 21200, "growth": 11.0 }
  ]
}
```

### Column Types

| Type | Behavior | Sorting | Display |
|------|----------|---------|---------|
| `text` | Plain string | Alphabetical (locale-aware) | As-is |
| `number` | Numeric | Numeric | Locale-formatted (e.g., `1,234`) |
| `currency` | Numeric with prefix | Numeric | `prefix` + locale-formatted (e.g., `$1,234`) |
| `percent` | Numeric | Numeric | Value + `%` suffix (e.g., `11.0%`) |
| `date` | ISO date string | Chronological | Formatted (e.g., `Jan 15, 2026`) |
| `badge` | Enum string | Alphabetical | Colored pill badge (uses status palette) |

### Badge Values

The `badge` column type supports a predefined set of status-like values. Each maps to an existing design token color:

| Value | Color Token |
|-------|-------------|
| `high` / `critical` | `--color-status-error` (red) |
| `medium` / `warning` | `--color-status-warning` (amber) |
| `low` / `info` | `--color-accent` (green) |
| `yes` / `true` / `included` | `--color-status-success` (green) |
| `no` / `false` / `excluded` | `--color-text-tertiary` (grey) |
| (any other) | `--color-text-secondary` (neutral) |

### Spreadsheet Index

Each project's spreadsheet directory needs no index file. The server (or client) reads the directory listing. If we want a lightweight index for the standalone page, a `data/spreadsheets/index.json` file maps project IDs to their spreadsheet files:

```json
{
  "sherlock-pdf": ["revenue-model-2026.json", "competitor-pricing.json"],
  "teamhq-redesign-v2": ["design-token-audit.json"]
}
```

### How Agents Produce Spreadsheet Data

Agents write spreadsheet JSON files during sessions using the `Write` tool. The format is documented in this spec. Agents responsible for tabular output (Yuki for analytics, Suki for competitive analysis, Thomas for roadmaps, Howard for pricing models) should be instructed in their agent definitions to output tabular data in this format when appropriate.

No special tooling is needed — agents already write JSON files. The schema is simple enough that an agent can produce it from a single prompt instruction.

## API

### Read-only — No new endpoints for v1

Spreadsheet JSON files are static data files, like task JSON files. The frontend fetches them directly:

- `GET /data/spreadsheets/index.json` — the cross-project index
- `GET /data/spreadsheets/{project-id}/{spreadsheet-id}.json` — individual spreadsheet data

These are served as static files by the Express static middleware (already configured for `data/`). No new API routes needed.

If we later need CRUD operations (creating/editing spreadsheets through the UI), we add API routes then. For v1, agents produce the files during sessions and the UI reads them.

## Component Architecture

### `TeamHQTable` class (vanilla JS)

The table component is a single JS class that:

1. Accepts a spreadsheet JSON object
2. Renders a `<table>` element with proper `<thead>` / `<tbody>` structure
3. Handles click-to-sort on column headers
4. Formats cell values according to column type
5. Applies density class based on user preference
6. Returns a DOM element that can be appended anywhere

```javascript
// Usage
var table = new TeamHQTable(spreadsheetData, { density: 'comfortable' });
document.getElementById('container').appendChild(table.el);
```

This class lives in `js/table.js` and is included on any page that needs tables (index.html, docs.html, spreadsheets.html).

### CSS

Table styles live in `css/table.css` — a new stylesheet included on pages that use tables. All values reference design tokens from `tokens.css`:

- Row striping uses `--color-bg-secondary` on alternating rows
- Hover uses `--color-accent-light`
- Header uses `--color-bg-secondary` background with `--font-weight-semibold`
- Borders use `--color-border`
- Sort indicator uses `--color-accent`
- Badge pills use the status color tokens
- Sticky first column uses a subtle right border shadow

## Frontend Integration Points

### 1. Project Detail View (`js/projects.js`)

After the "Progress Notes" section in `renderDetailView()`, add a "Data" section:

- On project expand, fetch `data/spreadsheets/index.json` to check if the project has spreadsheets
- If yes, fetch each spreadsheet JSON and render using `TeamHQTable`
- Each table gets a heading (spreadsheet name), optional description, and density toggle
- No "Data" section if the project has no spreadsheets (clean empty state)

### 2. Docs Reader View (`js/docs.js`)

The docs reader already renders markdown content. Extend it to detect `<!-- spreadsheet: filename.json -->` directives:

- After markdown rendering, scan the rendered HTML for spreadsheet directives
- Replace each directive with a rendered `TeamHQTable` instance
- The directive specifies a path relative to `data/spreadsheets/`

### 3. Standalone Spreadsheets Page (`spreadsheets.html` + `js/spreadsheets.js`)

A new page similar to `docs.html`:

- Fetches the spreadsheet index
- Lists spreadsheets grouped by project
- Click to view in a full-width reader layout
- Linked from the main nav

## Styling Direction

The table should feel modern and minimal — closer to Notion or Linear than to Excel:

- **No cell borders between columns** — use padding and alignment to separate columns, not gridlines
- **Thin horizontal row dividers** — 1px `--color-border` between rows
- **Header row** — `--color-bg-secondary` background, `--font-weight-semibold`, uppercase tracking on header text, `--text-xs` font size
- **Body text** — `--text-sm`, `--color-text-primary`
- **Number alignment** — right-aligned for `number`, `currency`, `percent` columns
- **Monospace numbers** — use `--font-mono` for numeric values so columns align neatly
- **Row hover** — `--color-accent-light` background transition (120ms ease)
- **Alternating rows** — subtle `--color-bg-secondary` on even rows
- **Sort indicator** — small triangle (CSS border-based, not icon) next to sorted header, colored `--color-accent`
- **Sticky header** — `position: sticky; top: 0` on `<thead>` when table is tall
- **Sticky first column** — `position: sticky; left: 0` on first `<td>` and `<th>` with a subtle right shadow
- **Density: compact** — `--space-1` vertical padding, `--text-xs` body text
- **Density: comfortable** — `--space-2` vertical padding, `--text-sm` body text (default)
- **Null/empty cells** — render as `--` in `--color-text-tertiary`
- **Badge pills** — `--radius-sm` border radius, `--text-xs`, `--space-1` horizontal padding, semi-transparent background

## Responsive Behavior

- **Desktop (>1024px)**: Full table visible, all columns shown
- **Tablet (768-1024px)**: Horizontal scroll if table is wider than viewport. First column sticky.
- **Mobile (<768px)**: Horizontal scroll with sticky first column. Density forced to compact. Scroll hint shadow on the right edge.
- **Container**: Tables are wrapped in a `<div class="table-scroll-container">` that provides `overflow-x: auto` and the scroll shadow indicators.

## Technical Constraints

- **No new npm dependencies** — vanilla JS, no table libraries. The component is simple enough (read-only, sort-only) that a library adds weight without value.
- **No React** — TeamHQ landing page is vanilla HTML/CSS/JS. The component must work in that environment.
- **Static file serving** — spreadsheet JSON is served as static files. No database, no new API routes for v1.
- **Design tokens only** — all colors, spacing, fonts, and radii must reference `tokens.css` custom properties. No hardcoded values.
- **Performance** — handle up to 500 rows without pagination. For v1, this is sufficient. Virtual scrolling is deferred.
- **Accessibility** — proper `<table>` semantics (`<thead>`, `<th scope="col">`, `<tbody>`, `<td>`). Sort buttons have `aria-sort` attributes. Density toggle is keyboard accessible. Screen readers announce column type via `aria-label` on `<th>`.

## Implementation Sequence

This maps to the team's proven pipeline:

1. **Andrei (Arch)** — tech approach: file structure, component API, integration points
2. **Robert (Designer)** — design spec: exact spacing, colors, hover states, responsive breakpoints, density modes
3. **Alice (FE)** — implements `TeamHQTable` class, `css/table.css`, project view integration, docs integration
4. **Soren (Responsive)** — responsive review: sticky columns, scroll behavior, mobile density
5. **Amara (A11y)** — accessibility review: table semantics, ARIA attributes, keyboard navigation
6. **Robert** — design review
7. **Enzo (QA)** — test pass: sorting, types, responsive, a11y, edge cases (empty data, single row, many columns)

Backend work is minimal (static files), so Jonah is not needed unless we add CRUD API endpoints.

## Seed Data

For development and demo purposes, ship v1 with 2-3 sample spreadsheets:

1. **Revenue Model** — monthly MRR projections with currency and percent columns (realistic for SherlockPDF)
2. **Competitor Analysis** — feature comparison matrix with badge columns (yes/no/partial)
3. **Sprint Velocity** — agent output metrics with number columns

These live in `data/spreadsheets/` and serve as both test data and documentation of the format.

## Risks

1. **Column type mismatch** — agents may produce data that doesn't match declared column types (e.g., a string in a `number` column). Mitigation: the component should gracefully fall back to rendering raw values when formatting fails.
2. **Wide tables** — tables with 15+ columns may be hard to scan even with horizontal scroll. Mitigation: document a recommended max of 8-10 columns in agent instructions. Not a hard limit, just a guideline.
3. **Stale data** — spreadsheet files are static snapshots. If agents update data, the old file is overwritten. Mitigation: acceptable for v1; versioning is out of scope.
4. **Directory listing** — the frontend needs to discover which spreadsheets exist per project. The index.json approach avoids server-side directory listing but requires agents to update it. Mitigation: if the index is stale, the worst case is a missing table (not a crash). Agents can be instructed to update the index.

## Success Criteria

- Tables render correctly with all 6 column types
- Sorting works for all column types, including null handling (nulls sort last)
- Tables look polished and native to TeamHQ on desktop, tablet, and mobile
- Seed data spreadsheets render without issues
- Density toggle works and persists
- Doc embedding works with the directive syntax
- Standalone spreadsheets page lists and renders all spreadsheets
- Enzo gives a QA pass
