# Dashboard Navigation — Dedicated Screens: Tech Approach

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-09
**Status:** Draft
**Inputs:** `docs/dashboard-navigation-requirements.md`

## Summary

Extract four sections from `index.html` into standalone HTML pages (`projects.html`, `tools.html`, `meetings.html`, `team.html`) following the proven pattern established by `docs.html` and `spreadsheets.html`. Transform `index.html` into a hub page. Update nav links across all seven pages. No backend changes, no new dependencies, no routing framework.

## 1. File Structure

### New Files

```
projects.html      — Projects section + modals + projects.js
tools.html         — Tools section (static, no JS)
meetings.html      — Meetings section + forms + meetings.js, interview.js, gemini-client.js
team.html          — Team roster + roster.js
```

### Modified Files

```
index.html         — Strip sections, add nav card grid, remove section JS
docs.html          — Update nav links only
spreadsheets.html  — Update nav links only
```

No new CSS or JS files. Each page loads existing `css/styles.css` for its section styles (per R4). No CSS splitting in this scope.

## 2. HTML Page Template

Every page follows the same skeleton, proven by `spreadsheets.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Section} — TeamHQ</title>
  <meta name="description" content="{description}">
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!-- CSS -->
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/shared.css">
  <link rel="stylesheet" href="css/styles.css">
  {page-specific CSS if needed}
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to content</a>
  <!-- Nav (shared, copy per page) -->
  <nav class="nav" aria-label="Main navigation">...</nav>
  <!-- Main content -->
  <main id="main-content">
    <div class="container">
      {section content from index.html}
    </div>
  </main>
  <!-- Footer -->
  <footer class="footer">...</footer>
  <!-- Scripts -->
  {page-specific JS}
</body>
</html>
```

### Page-Specific Head Additions

| Page | Extra CSS | Extra JS |
|------|-----------|----------|
| `projects.html` | none | `js/projects.js` |
| `tools.html` | none | none |
| `meetings.html` | none | `marked` CDN, `js/meetings.js`, `js/gemini-client.js`, `js/interview.js` |
| `team.html` | none | `js/roster.js` |

**Note on AG Grid:** `meetings.html` does NOT need AG Grid CSS/JS. Only `docs.html` and `spreadsheets.html` load AG Grid (they embed spreadsheet components). The current `index.html` loads AG Grid globally because everything is on one page — after the split, AG Grid only loads on pages that actually use it.

## 3. Shared Nav Component Strategy

**Approach: Copy-paste per page (same as today).**

The nav is already duplicated in `docs.html` and `spreadsheets.html`. We continue this pattern for the four new pages. Seven total pages with a copied nav is manageable.

### Standard Nav Block (All Pages)

```html
<nav class="nav" aria-label="Main navigation">
  <div class="container nav__inner">
    <div class="nav__brand">
      <a href="index.html" class="nav__logo-link">
        <img src="img/sherlock-labs-logo.svg" alt="Sherlock Labs" class="nav__logo" width="180" height="36">
      </a>
    </div>
    <div class="nav__links">
      <a href="tools.html" class="nav__link">Tools</a>
      <a href="projects.html" class="nav__link">Projects</a>
      <a href="meetings.html" class="nav__link">Meetings</a>
      <a href="docs.html" class="nav__link">Docs</a>
      <a href="spreadsheets.html" class="nav__link">Spreadsheets</a>
      <a href="team.html" class="nav__link">Team</a>
    </div>
  </div>
</nav>
```

**Per-page active state:** On each page, the current page's link gets `class="nav__link nav__link--active"` and `aria-current="page"`. Example for `projects.html`:

```html
<a href="projects.html" class="nav__link nav__link--active" aria-current="page">Projects</a>
```

**Changes from current nav:**
- "How It Works" link removed from nav (per R3 — it stays on landing page only)
- All links now point to dedicated `.html` pages (no more `index.html#section` anchors)
- Sub-pages use the `<img>` logo (linking to `index.html`), not the inline SVG logo used on `index.html`

**`index.html` nav:** On the hub page, no nav link gets the active state. The hub uses the inline SVG logo (current behavior), and all nav links point to dedicated pages.

### Inconsistency Fix

`docs.html` currently uses `<span class="nav__link nav__link--active">Docs</span>` (no `<a>`, no `aria-current`). Standardize to `<a href="docs.html" class="nav__link nav__link--active" aria-current="page">Docs</a>` for consistency with `spreadsheets.html` and the requirements.

## 4. What to Extract from index.html

### Section → Page Mapping

| Content Block | Lines in index.html | Target Page | Notes |
|---------------|---------------------|-------------|-------|
| `<section class="tools">` | Lines 59-102 | `tools.html` | Static HTML, no JS needed |
| `<section class="projects">` | Lines 105-119 | `projects.html` | Includes toolbar, stats, list container |
| Project create/edit modal | Lines 122-183 | `projects.html` | Modal overlay + form |
| Project delete modal | Lines 186-202 | `projects.html` | Confirmation dialog |
| Project kickoff modal | Lines 205-220 | `projects.html` | Kickoff prompt display |
| `<section class="meetings">` | Lines 223-293 | `meetings.html` | Includes interview config, interview panel, create form, list |
| `<section class="roster">` | Lines 296-460 | `team.html` | Full roster grid + recent output div |
| `<section class="how-it-works">` | Lines 463-496 | **Stays** on `index.html` | Below the new nav card grid |
| Hero | Lines 48-54 | **Stays** on `index.html` | Badge, headline, subhead |

### What index.html Keeps

- Hero section (badge, headline, subhead)
- **New:** Navigation card grid (replaces extracted sections)
- How It Works section
- Footer
- No section-specific JS (index.html becomes fully static)
- No AG Grid CSS/JS
- No `marked` library

### What index.html Loses

- All `<section>` blocks except Hero and How It Works
- All three project modals
- All meeting forms and interview panels
- The roster grid
- All `<script>` tags: `projects.js`, `meetings.js`, `gemini-client.js`, `interview.js`, `roster.js`, `spreadsheet.js`
- AG Grid CSS/JS CDN links

## 5. index.html Hub Page — Nav Card Grid

Replace the extracted sections with a card grid linking to each dedicated page. This is new HTML but uses a simple pattern:

```html
<section class="hub" aria-labelledby="hub-heading">
  <div class="container">
    <h2 id="hub-heading" class="section-title">Explore</h2>
    <div class="hub__grid">
      <a href="tools.html" class="hub__card">
        <h3 class="hub__card-name">Tools</h3>
        <p class="hub__card-desc">Products and utilities built by the team.</p>
      </a>
      <a href="projects.html" class="hub__card">
        <h3 class="hub__card-name">Projects</h3>
        <p class="hub__card-desc">Create and manage product builds.</p>
      </a>
      <a href="meetings.html" class="hub__card">
        <h3 class="hub__card-name">Meetings</h3>
        <p class="hub__card-desc">Simulated round-table discussions and interviews.</p>
      </a>
      <a href="docs.html" class="hub__card">
        <h3 class="hub__card-name">Docs</h3>
        <p class="hub__card-desc">Project documentation and architecture records.</p>
      </a>
      <a href="spreadsheets.html" class="hub__card">
        <h3 class="hub__card-name">Spreadsheets</h3>
        <p class="hub__card-desc">Tabular data across all projects.</p>
      </a>
      <a href="team.html" class="hub__card">
        <h3 class="hub__card-name">Team</h3>
        <p class="hub__card-desc">Meet the seventeen-agent AI team.</p>
      </a>
    </div>
  </div>
</section>
```

**CSS for the hub grid** goes in `css/styles.css` alongside the existing section styles. It's a simple CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`. Card styles follow the existing `tool-card` pattern (border, padding, hover state, border-radius).

## 6. API Routes

**No new API routes needed.** All existing endpoints remain unchanged:

- `GET /api/projects` — used by `projects.js`
- `POST/PUT/DELETE /api/projects/:id` — used by `projects.js`
- `GET/POST /api/meetings` — used by `meetings.js`
- `GET /api/sessions` — used by `roster.js`
- `POST /api/interviews/token` — used by `interview.js`
- Static file serving continues as-is (Express serves from project root)

The Express server already serves `.html` files from the root directory. Adding `projects.html`, `tools.html`, `meetings.html`, and `team.html` to the root means they're automatically served at `/projects.html`, `/tools.html`, etc. Zero backend config changes.

## 7. CSS Organization

### For v1 (This Project)

- `css/tokens.css` — loaded everywhere (unchanged)
- `css/shared.css` — loaded everywhere (nav, footer, container, focus styles)
- `css/styles.css` — loaded on `index.html`, `projects.html`, `tools.html`, `meetings.html`, `team.html`
- `css/docs.css` — loaded on `docs.html` only (unchanged)
- `css/spreadsheet.css` — loaded on `docs.html` and `spreadsheets.html` (unchanged)

**New CSS added to `styles.css`:**
- `.hub__grid`, `.hub__card`, `.hub__card-name`, `.hub__card-desc` — the nav card grid on the hub page
- Minimal: ~40 lines of CSS

**No CSS splitting.** Pages may load styles for sections they don't contain (e.g., `tools.html` loads meeting styles from `styles.css`). This is explicitly acceptable per R4 — the file is small and this avoids unnecessary complexity.

### Page → CSS Loading Matrix

| Page | tokens | shared | styles | docs | spreadsheet | AG Grid |
|------|--------|--------|--------|------|-------------|---------|
| `index.html` | yes | yes | yes | no | no | no |
| `projects.html` | yes | yes | yes | no | no | no |
| `tools.html` | yes | yes | yes | no | no | no |
| `meetings.html` | yes | yes | yes | no | no | no |
| `team.html` | yes | yes | yes | no | no | no |
| `docs.html` | yes | yes | no | yes | yes | yes |
| `spreadsheets.html` | yes | yes | no | no | yes | yes |

**Key change:** `index.html` no longer loads AG Grid CSS/JS or `spreadsheet.css`. It also drops `docs.css`.

## 8. JavaScript DOM Dependencies

Each JS module queries DOM elements by ID on load. After the split, these IDs must exist on the correct page:

### projects.js
Queries: `#projects-list`, `#projects-stats`, `#project-modal-overlay`, `#project-form`, `#project-name`, `#project-brief`, `#project-description`, `#project-goals`, `#project-constraints`, `#project-status`, `#advanced-toggle`, `#advanced-fields`, `#delete-modal-overlay`, `#delete-project-name`, `#kickoff-modal-overlay`, `#kickoff-prompt-text`, `.projects__new-btn`

All of these currently live in `index.html` within the projects section and modals. They move wholesale to `projects.html`. No ID changes needed.

### meetings.js
Queries: `#meetings-list`, `#meeting-charter-btn`, `#meeting-weekly-btn`, `#meeting-custom-btn`, `#meetings-create-form`, `#participant-grid`, `#participant-count`, `#meeting-instructions`, `#meeting-start-btn`

All within the meetings section. Move to `meetings.html`.

### interview.js
Queries: `#interview-btn`, `#interview-config`, `#interview-topic`, `#interview-context`, `#interview-topic-error`, `#interview-start-btn`, `#interview-panel`, `#interview-sr-announce`

All within the meetings section. Move to `meetings.html` alongside meetings.js.

### roster.js
Queries: `.roster__grid`, `#recent-output`

Within the roster section. Move to `team.html`.

### Null Guards
Every JS module already uses an early `if (!container) return;` guard. If a script were accidentally loaded on the wrong page, it would safely no-op. No changes needed to the guard pattern.

## 9. Migration Approach (Order of Operations)

This is a pure frontend restructuring. All steps can be done in a single implementation pass.

### Step 1: Create the Four New Pages

For each of `projects.html`, `tools.html`, `meetings.html`, `team.html`:
1. Start from the page template (Section 2)
2. Copy the relevant section HTML from `index.html` (Section 4 mapping)
3. For `projects.html`: also copy the three modal overlays
4. Set the correct `<title>`, `<meta description>`, skip link, active nav state
5. Add only the JS scripts needed (Section 2 table)

### Step 2: Update Nav Links on All Pages

All seven pages get the updated nav block (Section 3):
- All links point to dedicated pages (no `index.html#section` anchors)
- "How It Works" link removed
- Active state set per page
- `docs.html` fix: change `<span>` to `<a>` with `aria-current="page"`

### Step 3: Transform index.html into Hub Page

1. Remove all section blocks except Hero and How It Works
2. Remove all modal overlays
3. Add the nav card grid between Hero and How It Works (Section 5)
4. Remove all `<script>` tags for section JS
5. Remove AG Grid CSS/JS CDN links
6. Remove `css/spreadsheet.css` link
7. Update nav links to point to dedicated pages
8. Add hub card CSS to `css/styles.css`

### Step 4: Verify

- Each page loads independently at its URL
- All nav links navigate correctly
- Active states render on each page
- JS functionality works (projects CRUD, meetings, interviews, roster)
- `index.html` is fully static (no JS errors in console)
- Back/forward browser navigation works between pages
- Skip link targets exist on each page

## 10. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Nav duplication means 7 places to update when adding a link | Low (acceptable for 7 files) | Well-documented pattern; if we grow to 10+, consider JS-include or build step |
| JS module loads on wrong page | None | Existing null guards handle this |
| Stale cached index.html still tries to load removed sections | Low | Standard browser refresh resolves; no service worker in play |
| `styles.css` loaded unnecessarily on pages that don't need all styles | None (acceptable) | File is small; CSS splitting deferred per R4 |

## 11. What This Does NOT Change

- No visual redesign of any section content
- No new features or functionality
- No client-side routing framework
- No Express backend changes
- No changes to API endpoints
- No changes to `docs.html` or `spreadsheets.html` content (only nav links)
- No changes to any JS module logic (only which page loads which scripts)
- No CSS refactoring beyond adding ~40 lines for the hub card grid
