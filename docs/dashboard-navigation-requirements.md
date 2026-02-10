# Dashboard Navigation — Dedicated Screens: Requirements

**Author:** Thomas (PM)
**Date:** 2026-02-09
**Status:** Draft
**Project ID:** `dashboard-navigation`

## One-Liner

Move each dashboard section from the single scrolling index page into its own dedicated HTML page with a unique URL.

## Problem

The current `index.html` is a single long-scrolling page containing Tools, Projects, Meetings, Team Roster, and How It Works. As content grows (more projects, more meetings, more tools), scroll depth increases and navigation becomes unwieldy. Anchor-based hash links (`#projects`, `#meetings`) don't give each section a proper URL, making it harder to link directly to a section or bookmark it.

Docs and Spreadsheets already have their own dedicated pages (`docs.html`, `spreadsheets.html`). This project brings the remaining sections to parity.

## Current State

| Section | Current Location | Status |
|---------|-----------------|--------|
| Tools | `index.html#tools` | Needs own page |
| Projects | `index.html#projects` | Needs own page |
| Meetings | `index.html#meetings` | Needs own page |
| Interviews | `index.html#meetings` (embedded) | Needs own page (split from Meetings) |
| Docs | `docs.html` | Already done |
| Spreadsheets | `spreadsheets.html` | Already done |
| Team | `index.html#roster` | Needs own page |
| How It Works | `index.html#how` | Stays on index |

## Scope

### In Scope

1. **Five new dedicated pages:** `projects.html`, `tools.html`, `meetings.html`, `interviews.html`, `team.html`
2. **Updated index.html:** Becomes a landing/hub page (Hero + overview cards linking to each section)
3. **Updated navigation:** All nav links point to dedicated pages; active state indicates current page
4. **Move existing JS:** Each section's JS runs on its dedicated page (projects.js on projects.html, meetings.js on meetings.html, interview.js + gemini-client.js + audio-worklet-processor.js on interviews.html, roster.js on team.html)
5. **Move modals:** Project modals (create/edit, delete, kickoff) move to projects.html. Meeting creation form moves to meetings.html. Interview config panel + interview active panel move to interviews.html.
6. **Split Interviews from Meetings:** The AI Interview feature is its own first-class section, NOT part of Meetings. The Interview button, config panel, and active interview UI move to `interviews.html`. Meetings page only has meetings.

### Out of Scope

- Visual redesign of any section content (same HTML, same CSS, same functionality)
- New features or functionality
- Client-side routing framework (separate HTML files, no SPA)
- Changes to the Express backend or API endpoints
- Changes to Docs or Spreadsheets pages (already done)

## Detailed Requirements

### R1: New Dedicated Pages

Each new page follows the established pattern from `spreadsheets.html` and `docs.html`:

- Same `<head>` (fonts, tokens.css, shared.css, page-specific CSS)
- Same nav bar with logo linking to `index.html` and all section links
- `nav__link--active` class + `aria-current="page"` on the current page's link
- Same footer
- Section content lifted from index.html without modification
- Only the JS files needed for that page

**projects.html:**
- Page title: "Projects — TeamHQ"
- Contains: Projects section content, project modals (create/edit, delete, kickoff)
- JS: `projects.js`
- CSS: `styles.css` (for project-specific styles already there)

**tools.html:**
- Page title: "Tools — TeamHQ"
- Contains: Tools section content (tool cards grid)
- JS: None needed (static content)
- CSS: `styles.css` (for tool card styles)

**meetings.html:**
- Page title: "Meetings — TeamHQ"
- Contains: Meetings section, custom meeting form (NO interview UI — that's on interviews.html)
- JS: `meetings.js`, `marked` lib
- CSS: `styles.css` (for meeting-specific styles)

**interviews.html:**
- Page title: "Interviews — TeamHQ"
- Contains: Interview config panel, active interview panel (audio visualizer, controls)
- JS: `interview.js`, `gemini-client.js`, `audio-worklet-processor.js`
- CSS: `styles.css` (for interview-specific styles already in styles.css)

**team.html:**
- Page title: "Team — TeamHQ"
- Contains: Team roster grid, recent output section
- JS: `roster.js`
- CSS: `styles.css` (for roster-specific styles)

### R2: Updated Landing Page (index.html)

After sections move out, `index.html` becomes a hub page:

- **Keep:** Hero section (badge, headline, subhead)
- **Keep:** How It Works section
- **Keep:** Footer
- **Replace sections with:** A grid of navigation cards — one per section (Projects, Tools, Meetings, Interviews, Docs, Spreadsheets, Team). Each card has the section name, a one-line description, and links to the dedicated page.
- **Remove:** All section-specific JS (projects.js, meetings.js, interview.js, gemini-client.js, roster.js, spreadsheet.js)
- **Remove:** All modals and inline forms
- **Remove:** AG Grid CSS/JS (not needed on hub page)

The navigation cards provide a visual overview and quick access to all sections. This replaces the old scroll-based navigation with clear, intentional links.

### R3: Navigation Updates

The nav bar is shared across all pages (copy in each HTML file, as currently done for docs.html and spreadsheets.html):

**Nav links (all pages):**
| Label | Target |
|-------|--------|
| Tools | `tools.html` |
| Projects | `projects.html` |
| Meetings | `meetings.html` |
| Interviews | `interviews.html` |
| Docs | `docs.html` |
| Spreadsheets | `spreadsheets.html` |
| Team | `team.html` |

- Remove "How It Works" from the nav (it stays on the landing page but doesn't need its own nav link — it's secondary content)
- The current page gets `nav__link--active` class and `aria-current="page"` (already the pattern on docs.html and spreadsheets.html)
- The logo/brand links to `index.html` (already the pattern on sub-pages)
- On `index.html` itself, no nav link is active (it's the hub, not a section page)

### R4: Page-Specific CSS

All section styles currently live in `css/styles.css`. For v1, each dedicated page can include `styles.css` and get its styles. No CSS refactoring needed.

Future improvement (out of scope): split `styles.css` into per-section CSS files so each page only loads what it needs.

### R5: JavaScript Loading

Each page only loads the JS it needs:

| Page | Scripts |
|------|---------|
| `index.html` | None (static hub page) |
| `projects.html` | `projects.js` |
| `tools.html` | None (static content) |
| `meetings.html` | `marked`, `meetings.js` |
| `interviews.html` | `interview.js`, `gemini-client.js`, `audio-worklet-processor.js` |
| `team.html` | `roster.js` |
| `docs.html` | `marked`, `spreadsheet.js`, `docs.js` (unchanged) |
| `spreadsheets.html` | `spreadsheet.js`, `spreadsheets.js` (unchanged) |

## Acceptance Criteria

1. **AC1:** Each section (Projects, Tools, Meetings, Interviews, Team) has its own HTML page at a distinct URL
2. **AC2:** Clicking any nav link navigates to the correct dedicated page
3. **AC3:** The active nav link is visually distinguished on each page with `nav__link--active` and `aria-current="page"`
4. **AC4:** `index.html` displays a hub/landing page with Hero, navigation cards linking to all sections, and How It Works
5. **AC5:** All existing functionality works identically on the new dedicated pages (projects CRUD, meetings creation, interview config/audio on interviews page, team roster expansion)
6. **AC6:** No JS or CSS files are loaded on pages that don't need them (index.html has no section JS)
7. **AC7:** Browser back/forward navigation works correctly between pages
8. **AC8:** The logo/brand on every sub-page links back to `index.html`
9. **AC9:** Docs and Spreadsheets pages are unmodified except for nav link updates (their links should point to the new dedicated pages instead of `index.html#section` anchors)
10. **AC10:** All existing URLs for docs.html and spreadsheets.html continue to work

## Technical Notes for Andrei

- Follow the `spreadsheets.html` / `docs.html` pattern: separate HTML files, shared nav copied per page, same CSS/tokens
- The nav is duplicated per page (no templating system). This is fine for 7 pages. If we add more, consider a shared nav component later.
- `meetings.js` currently queries DOM elements by ID that exist on index.html. Verify these IDs exist on the new meetings.html (they will, since we're moving the HTML).
- The projects section has three modals. These move to projects.html wholesale.
- `roster.js` fetches from `/api/sessions` — no backend changes needed, the API is already there.

## Risks

- **Low:** Nav duplication across 7 files means manual updates when adding/removing a nav link. Acceptable for v1.
- **Low:** `styles.css` loaded on pages that only need a subset of its styles. No performance concern at current size.

## Dependencies

- None. This is a pure frontend restructuring with no backend changes.
