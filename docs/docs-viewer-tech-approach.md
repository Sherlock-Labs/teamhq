# Docs Viewer — Technical Approach (v2)

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-07 (v1), updated 2026-02-08 (v2)
**Status:** Draft

## Change Log

- **v2 (2026-02-08):** Updated for separate-page architecture, enriched metadata (author, reading time, title extraction), CSS strategy decision, and nav active state. Supersedes v1.
- **v1 (2026-02-07):** Initial approach for docs-as-homepage-section. Superseded.

---

## Overview

The docs viewer is a **separate page** (`docs.html`) that lets the CEO browse and read the ~47 markdown files in `docs/`. It follows existing patterns: vanilla JS frontend (ADR-001), Express/TypeScript backend (ADR-002), same server (port 3002), Vite proxy at `/api`.

## Architecture

```
docs/                    Express API              docs.html
  *.md files    -->   GET /api/docs (list)    -->   js/docs.js
  adrs/*.md     -->   GET /api/docs/* (read)  -->   marked.parse() -> reading view
                      (metadata: title, author,
                       readingTime, modifiedAt)
```

**New files:**
- `docs.html` — full HTML page with shared nav/footer
- `js/docs.js` — docs page JavaScript
- `css/docs.css` — docs-specific styles (see CSS Strategy below)
- `server/src/routes/docs.ts` — API endpoints

**Modified files:**
- `index.html` — update nav "Docs" link from `#docs` to `docs.html`
- `server/src/index.ts` — mount docs routes

## Separate Page Architecture

### Why a separate page (not a section)

The CEO explicitly requested this. It also makes architectural sense: the docs viewer has its own data source, its own reading view with significant CSS (markdown typography), and its own interaction model (list -> reading view -> back). Embedding all of that in `index.html` would bloat a page that already has 395 lines of HTML and 2194 lines of JS.

### Shared nav and footer

`docs.html` duplicates the nav and footer HTML from `index.html`. There is no templating system (ADR-001 — no frameworks), so this is the pragmatic approach. The duplication is small (~30 lines of nav + ~5 lines of footer) and changes infrequently.

**Nav link differences on `docs.html`:**
- The "Docs" link has no `href` (it's the current page) and gets an `nav__link--active` class
- All other nav links (`Tools`, `Projects`, `Meetings`, `Team`, `How It Works`) point to `index.html#section` instead of `#section`
- The logo link points to `index.html` (homepage)

### Nav active state

Add a new CSS class `nav__link--active`:

```css
.nav__link--active {
  color: var(--color-zinc-200);
}
```

Simple color change — the active link is brighter than the default `zinc-400` but doesn't use an underline or indicator. This is lightweight and consistent with the understated nav design. Robert can refine if needed.

## API Design

### `GET /api/docs`

Returns all docs with enriched metadata, grouped by project.

**Response shape:**

```json
{
  "summary": {
    "totalDocs": 47,
    "totalProjects": 14
  },
  "groups": [
    {
      "project": "session-introspection",
      "label": "Session Introspection",
      "docCount": 4,
      "latestModifiedAt": "2026-02-05T15:00:00.000Z",
      "docs": [
        {
          "path": "session-introspection-requirements.md",
          "title": "Session Introspection — Requirements",
          "type": "requirements",
          "typeLabel": "Requirements",
          "author": {
            "name": "Thomas",
            "avatar": "img/avatars/thomas.svg"
          },
          "readingTime": 5,
          "modifiedAt": "2026-02-05T14:30:00.000Z"
        }
      ]
    },
    {
      "project": "adrs",
      "label": "Architecture Decision Records",
      "docCount": 7,
      "latestModifiedAt": "2026-01-20T12:00:00.000Z",
      "docs": [...]
    }
  ]
}
```

**New fields compared to v1:**
- `summary` — top-level stats for the page header (US-6)
- `title` — extracted from the first `# ` heading in the file content (see Title Extraction below)
- `author` — derived from doc type using a static mapping (see Author Derivation below)
- `readingTime` — integer, minutes, calculated from word count (see Reading Time below)
- `typeLabel` — human-readable label for the doc type badge (avoids client-side mapping)
- `docCount` — per-group count (avoids client counting)

### `GET /api/docs/*`

Returns the raw markdown content of a single document. Unchanged from v1.

**Parameters:**
- Catch-all path after `/docs/`, e.g., `session-introspection-requirements.md` or `adrs/001-vanilla-js-for-landing-page.md`

**Response:**
```
Content-Type: text/plain; charset=utf-8

# Session Introspection — Requirements
...raw markdown content...
```

**Implementation:**
- Read file from `docs/{path}` using `fs.readFile`
- Path traversal protection (unchanged from v1 — see Security section)
- Return 404 if file doesn't exist
- Return raw text, not JSON

## Metadata Extraction

### Title Extraction

**Approach:** Read the first 5 lines of each file and look for a line starting with `# ` (markdown H1). Use the text after `# ` as the title. Fall back to a formatted version of the filename if no H1 is found.

```typescript
async function extractTitle(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n', 5);
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.slice(2).trim();
    }
  }
  return formatFilenameAsTitle(path.basename(filePath, '.md'));
}
```

**Why read the full file instead of just the first N bytes?** We also need the full content for word count (reading time), so we read the file once and extract both title and word count from the same read. At ~47 files with an average size of ~10KB and max ~38KB, this totals ~500KB of I/O per request — well under 1ms on any modern disk.

**Caching decision: No caching.** At 47 files, the full scan (readdir + stat + read first lines) completes in single-digit milliseconds. Caching would add complexity (invalidation, startup logic) for no measurable benefit. If the doc count grows to hundreds, we can add a simple in-memory cache with mtime-based invalidation, but that's a future concern.

### Author Derivation

**Approach:** Static mapping from doc type to team member. This is reliable because the pipeline is deterministic.

```typescript
const AUTHOR_MAP: Record<string, { name: string; avatar: string }> = {
  'requirements':      { name: 'Thomas', avatar: 'img/avatars/thomas.svg' },
  'tech-approach':     { name: 'Andrei', avatar: 'img/avatars/andrei.svg' },
  'design-spec':       { name: 'Robert', avatar: 'img/avatars/robert.svg' },
  'research':          { name: 'Suki',   avatar: 'img/avatars/suki.svg' },
  'qa-report':         { name: 'Enzo',   avatar: 'img/avatars/enzo.svg' },
  'qa-findings':       { name: 'Enzo',   avatar: 'img/avatars/enzo.svg' },
  'backend-analysis':  { name: 'Jonah',  avatar: 'img/avatars/jonah.svg' },
  'adr':               { name: 'Andrei', avatar: 'img/avatars/andrei.svg' },
};
```

- For types not in the map, omit the author field (or return `null`). The frontend handles this gracefully by not rendering an author.
- ADRs: The requirements suggest parsing `**Decision maker:**` from the doc content. This adds complexity and the ADR author is almost always Andrei. Decision: use the static map for now (`adr` -> Andrei). If the CEO notices an incorrect attribution, we can add content parsing for ADRs specifically.

### Reading Time

**Approach:** Count words in the full file content, divide by 200 (standard reading WPM), round up to nearest integer.

```typescript
function calculateReadingTime(content: string): number {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
```

The API returns `readingTime` as an integer (minutes). The frontend formats it as `"~5 min read"`.

### Filename Parsing Logic

Unchanged from v1. Summary:

**Known doc type suffixes** (matched longest-first):
- `backend-analysis`, `tech-approach`, `design-spec`, `qa-report`, `qa-findings`, `p2-requirements`
- `requirements`, `research`

**Special cases:**
- `adrs/*.md` — type `"adr"`, project `"adrs"`
- `tech-approach.md` / `design-spec.md` (no project prefix) — project `"landing-page"`
- `adrs/README.md` — excluded from listing
- Unmatched files — type `"other"`, title from filename

**Type labels:**

| Type | Label |
|------|-------|
| `requirements` | Requirements |
| `tech-approach` | Tech Approach |
| `design-spec` | Design Spec |
| `research` | Research |
| `qa-report` | QA Report |
| `qa-findings` | QA Findings |
| `backend-analysis` | Analysis |
| `adr` | ADR |
| `other` | Doc |

## CSS Strategy

**Decision: Supplementary `css/docs.css` file.**

**Rationale:**
- `styles.css` is already 4362 lines. Adding markdown typography (headings, lists, tables, code blocks, blockquotes), doc list styles, reading view layout, and metadata display would push it past 5000 lines with no logical connection to the landing page.
- The docs page has domain-specific styles that the landing page will never use: markdown rendering, doc metadata bars, reading time badges, etc.
- A separate file makes it easy for Alice to work on docs styles without touching the landing page CSS (reduces merge conflicts).
- Shared styles (nav, footer, design tokens, typography base, container) stay in `styles.css` and are loaded by both pages.

**Loading order in `docs.html`:**
```html
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/docs.css">
```

`docs.css` can use all the design tokens and utility classes from `styles.css`. It only needs to define docs-specific component styles.

**What goes in `docs.css`:**
- Page header and summary stats
- Doc group cards (expand/collapse)
- Doc list items (title, metadata row, type badges)
- Reading view layout (max-width content area, back button)
- Markdown typography (`.docs-reader` scoped styles for `h1`-`h6`, `p`, `ul`/`ol`, `table`, `pre`/`code`, `blockquote`, `hr`)

**What stays in `styles.css`:**
- Nav, footer, container, design tokens, base typography — already there, shared by both pages

## Markdown Rendering — Client-Side

### Library: `marked` via CDN (unchanged)

**Decision stands from v1.** `marked` remains the right choice:
- ~13KB gzipped, zero dependencies
- Handles all required features: headings, lists, tables, code blocks, bold/italic, links, horizontal rules
- Simple CDN usage: `marked.parse(markdown)` returns HTML
- Well-maintained, stable API

**CDN source:**
```html
<script src="https://cdn.jsdelivr.net/npm/marked@15/lib/marked.umd.min.js"></script>
```

**Alternatives re-evaluated for v2:**
- **markdown-it** — Still heavier (~100KB), plugin system unnecessary. Our docs use standard GFM markdown.
- **Server-side rendering** — Would require building HTML on the server, inflating response sizes, and adding templating. Client-side is simpler and lets us show a loading state while fetching.

**Syntax highlighting:** Still not in scope. The code blocks in our docs are short config/shell snippets. Can be added later with `highlight.js` via CDN if the CEO requests it.

## Frontend Architecture

### New file: `js/docs.js`

IIFE pattern, same as `js/projects.js` and `js/meetings.js`:

```javascript
(function () {
  'use strict';

  var API_BASE = '/api/docs';
  // ... state, API calls, rendering, event handlers
})();
```

### View states:

The docs page has two mutually exclusive views:

1. **List view** — shows project groups with expandable doc lists. Visible on page load.
2. **Reading view** — shows a single doc's rendered markdown with metadata header. Replaces the list view when a doc is clicked. A back button returns to the list view.

Implementation: two container divs, toggle `display: none` / `display: block`. No routing, no URL changes. The list view's scroll position is preserved when returning from the reading view.

### Data flow:

1. Page load: `GET /api/docs` -> render summary stats + project groups (collapsed)
2. Click group header: expand/collapse (client-side only, same pattern as project cards)
3. Click doc title: `GET /api/docs/{path}` -> `marked.parse()` -> show reading view with metadata header
4. Click back: hide reading view, show list view (no re-fetch)

### Author avatars:

The API returns avatar paths relative to the site root (e.g., `img/avatars/thomas.svg`). The frontend renders them as small inline images:

```html
<img src="img/avatars/thomas.svg" alt="Thomas" width="20" height="20" class="doc-meta__avatar">
```

Since `docs.html` is in the root directory alongside `index.html`, relative paths to `img/avatars/` work without adjustment.

## Backend Structure

### New file: `server/src/routes/docs.ts`

Two route handlers:

```typescript
import { Router } from "express";
import fs from "fs/promises";
import path from "path";

const router = Router();
const DOCS_DIR = path.resolve(process.cwd(), "docs");

router.get("/docs", async (_req, res) => {
  // Scan docs/, extract metadata, group by project, return JSON
});

router.get("/docs/*", async (req, res) => {
  // Path traversal check, read file, return raw text
});

export default router;
```

No schema validation (read-only), no store file (filesystem is the source of truth).

### Registration in `server/src/index.ts`:

```typescript
import docRoutes from "./routes/docs.js";
// ...
app.use("/api", docRoutes);
```

### Security — Path Traversal Protection

Unchanged from v1. The `GET /api/docs/*` endpoint validates the resolved path stays within `DOCS_DIR`:

```typescript
const requestedPath = req.params[0]; // catch-all param
const resolved = path.resolve(DOCS_DIR, requestedPath);
if (!resolved.startsWith(DOCS_DIR + path.sep)) {
  return res.status(400).json({ error: "Invalid path" });
}
```

Reject any path containing `..` or absolute paths. This is mandatory — Jonah must implement this.

## Doc Type Badge Colors

Suggested palette (Robert to finalize):

| Type | Label | Color |
|------|-------|-------|
| requirements | Requirements | Indigo |
| tech-approach | Tech Approach | Emerald |
| design-spec | Design Spec | Purple |
| research | Research | Amber |
| qa-report | QA Report | Rose |
| qa-findings | QA Findings | Rose |
| backend-analysis | Analysis | Cyan |
| adr | ADR | Zinc |
| other | Doc | Zinc |

## What Developers Need to Know

### For Jonah (Backend):

- Create `server/src/routes/docs.ts` with two routes: `GET /docs` and `GET /docs/*`
- The list endpoint reads every `.md` file in `docs/` and `docs/adrs/` (excluding `adrs/README.md`)
- For each file: `fs.stat` for mtime, `fs.readFile` for title extraction (first `# ` line) and word count
- Group by project slug parsed from filename, sort groups by most recent `modifiedAt` descending
- Author comes from a static type-to-agent map — no content parsing needed
- Reading time = `Math.ceil(wordCount / 200)`, minimum 1
- Content endpoint: path traversal protection is mandatory, return raw text
- Register in `server/src/index.ts`
- No store file, no schemas, no Zod

### For Alice (Frontend):

- Create `docs.html` — full page with nav + footer copied from `index.html`. Nav links to homepage sections use `index.html#section`. "Docs" link gets `nav__link--active` class.
- Create `js/docs.js` following the IIFE pattern
- Create `css/docs.css` for all docs-specific styles. Load after `styles.css`.
- Load `marked` from jsDelivr CDN
- Two views: list view (default) and reading view (toggled by clicking doc / clicking back)
- Render author avatars inline from `img/avatars/` paths
- Format `readingTime` as `"~N min read"`, `modifiedAt` as relative time
- Expand/collapse for project groups follows the project card pattern
- Update `index.html`: change the "Docs" nav link from `#docs` to `docs.html`

### API Contract:

```
GET /api/docs     -> { summary: { totalDocs, totalProjects }, groups: DocGroup[] }
GET /api/docs/*   -> raw markdown text (Content-Type: text/plain)
```

Where each doc in a group has: `path`, `title`, `type`, `typeLabel`, `author` (`{ name, avatar }` or null), `readingTime` (int minutes), `modifiedAt` (ISO string).

## Integration Points

- **Vite proxy** — Already configured. No changes needed.
- **Nav links** — `index.html` nav gets "Docs" link pointing to `docs.html`. `docs.html` nav links point back to `index.html#section`.
- **Script loading** — `docs.html` loads `styles.css`, `docs.css`, marked CDN, and `js/docs.js`.
- **Avatars** — Existing SVGs in `img/avatars/` are reused. No new assets needed.

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Nav/footer get out of sync between `index.html` and `docs.html` | Medium | Nav and footer change infrequently. Document in CLAUDE.md that both files share nav/footer and must be updated together. |
| Title extraction misses H1 in some docs | Low | Fallback to formatted filename. Our docs consistently start with `# Title`. |
| Reading time feels inaccurate | Low | 200 WPM is an industry standard. Round up to be conservative. |
| Large markdown files slow down rendering | Low | Largest doc is ~38KB. `marked.parse()` handles this in <10ms. |
| Path traversal attack | Medium | Explicit validation with `path.resolve()` check. Mandatory for Jonah. |
| CDN unavailability | Low | jsDelivr has excellent uptime. Can self-host the ~40KB file if needed. |

## Decisions Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Separate page vs. section? | Separate `docs.html` page | CEO request. Also better separation of concerns — docs have their own data source, reading view, and CSS. |
| CSS strategy? | Supplementary `css/docs.css` | `styles.css` is already 4362 lines. Docs styles (markdown typography, metadata layout) are domain-specific and don't belong in the shared file. |
| Markdown library? | `marked` via CDN (unchanged) | Lightweight, battle-tested, handles all our markdown features. No reason to switch. |
| Title extraction approach? | Read first 5 lines, look for `# ` | Simple, reliable, our docs always start with an H1. Fallback to formatted filename. |
| Caching for title extraction? | No caching | 47 files, ~500KB total I/O, completes in milliseconds. Caching adds complexity for no benefit at this scale. |
| Author derivation? | Static type-to-agent map | Pipeline is deterministic. No need to parse doc content. |
| Nav active state? | `nav__link--active` CSS class with brighter color | Minimal, consistent with understated nav design. |
| Syntax highlighting? | Not in scope | Code blocks are short snippets. Can add highlight.js later if needed. |
