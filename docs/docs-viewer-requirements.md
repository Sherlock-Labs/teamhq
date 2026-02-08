# Docs Viewer — Requirements (v2)

**Author:** Thomas (PM)
**Date:** 2026-02-07 (v1), updated 2026-02-08 (v2)
**Status:** Draft

## Change Log

- **v2 (2026-02-08):** CEO feedback — docs viewer should be a **separate page**, not a section on the homepage. Also wants **richer file metadata** (author, dates, file size). Full re-scope below.
- **v1 (2026-02-07):** Initial scope — docs as a section on the landing page. Superseded.

---

## Overview

The TeamHQ `docs/` directory contains ~40+ markdown files spanning 13+ projects — requirements, tech approaches, design specs, research briefs, QA reports, and ADRs. Today, these docs are only accessible by opening files directly on disk. The CEO wants a **dedicated docs page** in TeamHQ to browse, read, and understand the team's documentation library with rich metadata about each document.

## What Exists Today

### Document Inventory

The `docs/` directory contains the following document types:

| Type | Naming Pattern | Count | Example |
|------|---------------|-------|---------|
| Requirements | `{project}-requirements.md` | 14+ | `pdf-combiner-requirements.md` |
| Tech Approach | `{project}-tech-approach.md` | 9+ | `session-introspection-tech-approach.md` |
| Design Spec | `{project}-design-spec.md` | 10+ | `teamhq-redesign-design-spec.md` |
| Research | `{project}-research.md` | 2+ | `session-runner-research.md` |
| QA Reports | `{project}-qa-report.md` | 1+ | `session-introspection-qa-report.md` |
| Analysis | `{project}-*-analysis.md` | 1+ | `session-runner-backend-analysis.md` |
| QA Audit | `qa-audit-*.md` | 2 | `qa-audit-findings.md` |
| ADRs | `adrs/NNN-*.md` | 7 | `adrs/001-vanilla-js-for-landing-page.md` |

Documents follow a consistent `{project-slug}-{doc-type}.md` naming convention, which enables automatic grouping by project.

### Author Information

Authors are **not consistently present** in doc content. Some docs have frontmatter-style metadata (e.g., `**Researcher:** Marco`, `**Decision maker:** Andrei`), but most do not. However, authorship is **deterministic from the pipeline**:

| Doc Type | Author | Role |
|----------|--------|------|
| Requirements | Thomas | PM |
| Tech Approach | Andrei | Technical Architect |
| Design Spec | Robert | Product Designer |
| Research (market) | Suki | Market Researcher |
| Research (technical) | Marco | Technical Researcher |
| QA Report / QA Audit | Enzo | QA Engineer |
| Analysis | Varies | Depends on content |
| ADRs | Listed in doc | Usually Andrei |

**Recommendation:** Derive author from doc type using a static mapping in the API. This is reliable because our pipeline is deterministic — Thomas always writes requirements, Andrei always writes tech approaches, etc. For ADRs, parse the `**Decision maker:**` line from the doc content. For edge cases (analysis, misc docs), fall back to "Team" or omit.

### File Metadata Available

The file system provides:
- **Modified date** (`mtime`) — when the file was last written
- **File size** (bytes) — useful for giving a sense of doc length
- **Filename** — already used for type/project parsing

Note: Created date (`birthtime`) is available on macOS but not reliably on all platforms. Modified date is sufficient and more meaningful (shows last update).

### Existing Landing Page & Navigation

The landing page (`index.html`) is plain HTML/CSS/vanilla JS with sections for Tools, Projects, Meetings, Team, and How It Works. The nav currently has a `#docs` anchor link from v1 planning. This needs to change to a page link.

## User Stories

### US-1: Navigate to a dedicated docs page (P0)

> As the CEO, I want a "Docs" link in the TeamHQ navigation that takes me to a separate docs page, so the docs library feels like a first-class part of the product.

**Acceptance criteria:**
- The nav bar "Docs" link navigates to a separate `docs.html` page (not an anchor scroll)
- The docs page has the same nav bar and footer as `index.html` (shared visual chrome)
- The nav bar highlights the "Docs" link as active when on the docs page
- The homepage nav links (Tools, Projects, Meetings, Team, How It Works) navigate back to `index.html` with the correct anchor
- The logo link returns to the homepage

### US-2: Browse docs grouped by project (P0)

> As the CEO, I want to see all team docs grouped by project so I can find the requirements, tech approach, and design spec for any project in one place.

**Acceptance criteria:**
- Docs are grouped by project (e.g., "PDF Combiner" shows requirements, tech approach, and design spec together)
- Projects are listed in reverse chronological order (most recently modified doc in the group determines the group's sort order)
- Each project group shows the project name and document count
- Each project group is expandable/collapsible (collapsed by default, expand to see individual docs)
- ADRs appear as their own group at the end (they are cross-project, not tied to one project)

### US-3: See rich metadata for each document (P0)

> As the CEO, I want to see who wrote each doc, when it was last updated, and how long it is, so I have context before opening it.

**Acceptance criteria:**
- Each doc in the list shows:
  - **Title** — the doc's `<h1>` heading (parsed from content) or a formatted version of the filename as fallback
  - **Type badge** — "Requirements", "Tech Approach", "Design Spec", "Research", "QA Report", "ADR", etc.
  - **Author** — the team member who wrote it (with their avatar), derived from doc type
  - **Last modified** — relative time (e.g., "2 days ago") or absolute date
  - **File size** — displayed as approximate reading time or word count (e.g., "~5 min read" or "2.4k words"), not raw bytes
- Author shows the agent's pixel art avatar (16x16 or 20x20) and name

### US-4: Read a doc with rendered markdown (P0)

> As the CEO, I want to click on a doc and read its full rendered contents on the docs page.

**Acceptance criteria:**
- Clicking a doc title opens a reading view with the full rendered markdown
- Markdown renders with proper formatting: headings, lists, tables, code blocks, bold/italic, horizontal rules
- The reading view shows the doc's metadata at the top (title, author with avatar, type badge, last modified, reading time)
- A clear "back" control returns to the doc list without a full page reload
- Long docs are scrollable
- The reading view has comfortable line length and spacing optimized for reading

### US-5: Identify doc types at a glance (P1)

> As the CEO, I want to quickly distinguish between requirements, tech approaches, design specs, and other doc types.

**Acceptance criteria:**
- Each doc type has a color-coded badge (subtle, consistent with the existing design system)
- Badge colors are distinct enough to scan quickly but not garish
- Suggested palette (Robert to finalize):
  - Requirements: blue/indigo
  - Tech Approach: green/emerald
  - Design Spec: purple/violet
  - Research: amber/yellow
  - QA Report: red/rose
  - ADR: zinc/gray

### US-6: Page-level summary statistics (P2)

> As the CEO, I want a quick overview of the docs library at the top of the page.

**Acceptance criteria:**
- The docs page header shows summary stats: total doc count, project count, and optionally the most recently updated doc/project
- Keep it minimal — 1-2 lines, not a dashboard

## Scope

### In Scope (v2)

- **Separate docs page** (`docs.html`) with shared nav/footer
- **Navigation updates**: "Docs" link in nav becomes a page link (not anchor); homepage nav links from docs page point to `index.html#section`; active state on nav link
- **Backend API endpoints:**
  - `GET /api/docs` — list all docs with metadata (filename, type, project, author, modifiedAt, size, title)
  - `GET /api/docs/:filename` — serve a single doc's raw markdown content (for reading view)
  - ADRs served from `docs/adrs/` subdirectory (filename includes `adrs/` prefix)
- **Author derivation** — static mapping from doc type to team member, with avatar URL
- **Title extraction** — parse `<h1>` from markdown content (first `# ` line), fall back to formatted filename
- **Reading time calculation** — word count / 200 wpm, returned by the API
- **Client-side markdown rendering** with a CDN library
- **Project grouping** with expand/collapse
- **Doc type badges** with color coding
- **Metadata display** (author + avatar, last modified, reading time, type)
- **Reading view** with back navigation (no full page reload — show/hide list vs. reader)
- **Page header** with summary stats

### Out of Scope (Deferred)

- Search/filtering across docs
- Editing docs from the web UI
- PDF export of docs
- Doc versioning or git history
- Full-text search within a doc's reading view
- Linking docs to their parent project cards in the Projects section
- Created date (only modified date — simpler and more meaningful)
- SPA routing / URL-based deep links to individual docs (keep it simple with show/hide)

## Technical Constraints

- **No frameworks** — the docs page must use plain HTML/CSS/vanilla JS per ADR-001. New `docs.html` follows the same pattern as `index.html`.
- **Shared CSS** — `css/styles.css` is already shared. New docs-specific styles can go in the same file or a supplementary `css/docs.css` (Andrei to decide).
- **Markdown rendering** — needs a client-side library loaded via CDN. Must handle tables, code blocks with syntax highlighting (if reasonable), and standard markdown. Andrei to pick the library.
- **Express API** — new routes in a new `server/src/routes/docs.ts` file, following the same patterns as `routes/projects.ts`. Mounted at `/api` in `server/src/index.ts`.
- **Performance** — with ~40 docs, the list endpoint should return all docs in one call. Title extraction requires reading the first few lines of each file — acceptable at this scale. Doc content loaded on demand.
- **No build step** — JS in a standalone `js/docs.js` file loaded by `docs.html`.
- **File sizes** — largest docs are ~30-38KB. Markdown rendering should handle this without noticeable lag.

## Design Guidance for Robert

- **Separate page, same visual language** — `docs.html` should feel like a sibling of `index.html`, not a different app. Same nav bar, same footer, same dark theme, same zinc/indigo tokens.
- **Nav bar active state** — needs a way to show which page is active (currently all links are anchor-based, so this is new). A subtle underline or color change on the active link.
- **Page layout** — the docs page is more utilitarian than the homepage. No hero section. A compact header with title ("Docs") and summary stats, then the doc list.
- **Project groups** — similar expand/collapse pattern to project cards, but simpler. The group header shows project name, doc count, and the most recent modified date. Expanding reveals the individual docs with their metadata.
- **Doc list items** — each doc shows: title, type badge, author (avatar + name), modified date, reading time. Compact but scannable. Think of it like a file browser crossed with a blog index.
- **Reading view** — this is where you'll spend the most design effort. When a doc is opened, the list slides away (or is hidden) and the reading view takes over the page. Key considerations:
  - Comfortable reading width (max ~720px content, centered)
  - Proper typography for rendered markdown (heading hierarchy, list indentation, table styling, code blocks with monospace font and background)
  - Doc metadata bar at the top (author avatar, name, type badge, date, reading time)
  - Clear back button/breadcrumb to return to the list
  - Code blocks are frequent in tech approaches and design specs — they need to be legible
  - Tables are frequent in requirements — they need proper borders and padding
- **ADR group** — visually distinct from project groups. Consider a different icon or label style since ADRs are cross-cutting decisions.
- **Author avatars** — use the existing pixel art SVGs from `img/avatars/`. Show them small (16-20px) inline with the author name.
- **Empty state** — if `docs/` is empty (unlikely but handle it), show a simple message.

## Impact on Existing Files

This is a **new page**, not a modification of the homepage. Impact is limited:

| File | Change |
|------|--------|
| `index.html` | Update nav "Docs" link from `#docs` to `docs.html` |
| `docs.html` | **New file** — full HTML page with shared nav/footer, docs-specific content |
| `js/docs.js` | **New file** — docs page JavaScript (API calls, rendering, markdown) |
| `css/styles.css` | Add docs-specific styles (or create `css/docs.css`) |
| `server/src/index.ts` | Mount new docs routes |
| `server/src/routes/docs.ts` | **New file** — API endpoints for listing and serving docs |

The homepage sections (Tools, Projects, Meetings, Team, How It Works) are **unchanged**. No need to remove anything from `index.html` — the docs section was never implemented there.

## Team Involvement

1. **Thomas (PM)** — this document (requirements v2)
2. **Andrei (Arch)** — tech approach: API design, markdown library choice, CSS strategy (shared vs. separate file), file scanning and metadata extraction approach
3. **Robert (Designer)** — design spec: page layout, doc list, reading view, nav active state, type badge colors, responsive behavior
4. **Alice (FE)** — implement `docs.html`, `js/docs.js`, CSS, nav updates on `index.html`
5. **Jonah (BE)** — implement `server/src/routes/docs.ts` API endpoints
6. **Robert (Designer)** — lightweight design review of implementation
7. **Enzo (QA)** — pass/fail verdict before shipping

Alice and Jonah can work in parallel after the design spec is done, following the API contract alignment agreement. They should agree on the API response shapes before building independently.

## Open Questions

1. **CSS strategy** — one shared `styles.css` or a supplementary `docs.css`? Andrei to decide based on file size and maintainability.
2. **Markdown library** — `marked`, `markdown-it`, or something else? Andrei to evaluate. Syntax highlighting for code blocks would be a nice-to-have but not required.
3. **Title extraction** — reading the first line of every file on each list request adds I/O. Should we cache titles in memory on server start? Andrei to decide based on scale (~40 files, probably fine without caching).
