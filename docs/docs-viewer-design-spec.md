# Docs Viewer — Design Spec (v2)

**Author:** Robert (Product Designer)
**Date:** 2026-02-07 (v1), updated 2026-02-08 (v2)
**Status:** Draft

## Change Log

- **v2 (2026-02-08):** Redesigned for a dedicated `docs.html` page per CEO feedback. Added nav active state, page header with summary stats, richer doc items with author avatars and reading time, metadata bar in reading view. All docs-specific CSS moves to a new `css/docs.css`. Supersedes v1.
- **v1 (2026-02-07):** Initial design for docs as a homepage section. Superseded.

---

## Overview

The docs viewer is a **dedicated page** (`docs.html`) that lets the CEO browse and read the team's ~47 markdown files. It shares the same nav bar and footer as the homepage but has its own content area optimized for document browsing and reading.

The page has two views: a **list view** (default) showing docs grouped by project with rich metadata, and a **reading view** that displays a single doc's rendered markdown. These views toggle in place — no page navigation, no URL changes.

All docs-specific styles go in `css/docs.css` (loaded after `css/styles.css`), per Andrei's architecture decision. Shared styles (nav, footer, container, design tokens) come from `styles.css`.

## Navigation

### Nav Bar on `docs.html`

The docs page duplicates the nav and footer from `index.html`. Key differences:

```html
<nav class="nav" aria-label="Main navigation">
  <div class="container nav__inner">
    <div class="nav__brand">
      <a href="index.html" class="nav__logo-link">
        <img src="img/sherlock-labs-logo.svg" alt="Sherlock Labs" class="nav__logo" width="180" height="36">
      </a>
    </div>
    <div class="nav__links">
      <a href="index.html#tools" class="nav__link">Tools</a>
      <a href="index.html#projects" class="nav__link">Projects</a>
      <a href="index.html#meetings" class="nav__link">Meetings</a>
      <span class="nav__link nav__link--active">Docs</span>
      <a href="index.html#roster" class="nav__link">Team</a>
      <a href="index.html#how" class="nav__link">How It Works</a>
    </div>
  </div>
</nav>
```

- Logo link points to `index.html` (homepage)
- All section links point to `index.html#section`
- "Docs" is a `<span>` (not a link — you're already on the page) with `nav__link--active`

### Nav Active State

Add to `css/styles.css` (since it's shared nav behavior, not docs-specific):

```css
.nav__link--active {
  color: var(--color-zinc-200);
  cursor: default;
}

.nav__link--active:hover {
  color: var(--color-zinc-200);            /* no hover change — it's the current page */
}
```

This is a simple brightness bump from the default `zinc-400` to `zinc-200`. Understated, consistent with the nav's quiet design. No underline, no indicator — just brighter text that says "you are here."

### Update `index.html` Nav

Change the Docs link from an anchor to a page link:

```html
<!-- Before -->
<a href="#docs" class="nav__link">Docs</a>

<!-- After -->
<a href="docs.html" class="nav__link">Docs</a>
```

## Page Layout

### Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- same meta, fonts as index.html -->
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/docs.css">
</head>
<body>
  <!-- Nav (shared, with active state on Docs) -->
  <main class="docs-page">
    <div class="container">
      <!-- Page Header -->
      <div class="docs-header">
        <h1 class="docs-header__title">Docs</h1>
        <p class="docs-header__stats"><!-- JS-rendered summary stats --></p>
      </div>

      <!-- List View (shown by default) -->
      <div id="docs-list-view">
        <div id="docs-list">
          <!-- JS-rendered doc groups -->
        </div>
      </div>

      <!-- Reading View (hidden by default) -->
      <div id="docs-reader-view" style="display: none;">
        <!-- JS-rendered reading view -->
      </div>
    </div>
  </main>
  <!-- Footer (shared) -->

  <script src="https://cdn.jsdelivr.net/npm/marked@15/lib/marked.umd.min.js"></script>
  <script src="js/docs.js" defer></script>
</body>
</html>
```

### Page Container

The docs page is more utilitarian than the homepage. No hero section. The main content area starts immediately after the nav.

```css
.docs-page {
  background: var(--color-bg-primary);
  min-height: calc(100vh - 65px);          /* fill viewport minus nav height */
  padding-top: var(--space-10);            /* 2.5rem */
  padding-bottom: var(--space-16);         /* 4rem */
}
```

## Page Header

A compact header with the page title and summary statistics. Not a hero — just context.

```
Docs
47 documents across 14 projects
```

```css
.docs-header {
  margin-bottom: var(--space-10);          /* 2.5rem — space before the doc list */
}

.docs-header__title {
  font-size: var(--text-2xl);             /* 1.5rem */
  font-weight: var(--font-weight-bold);
  color: var(--color-zinc-100);
  margin-bottom: var(--space-2);          /* 0.5rem */
}

.docs-header__stats {
  font-size: var(--text-sm);              /* 0.875rem */
  color: var(--color-text-secondary);     /* zinc-400 */
}

@media (min-width: 1024px) {
  .docs-header__title {
    font-size: var(--text-3xl);           /* 1.875rem */
  }
}
```

Format: `47 documents across 14 projects` — plain text, no boxes or cards. The numbers come from the API's `summary.totalDocs` and `summary.totalProjects`.

## Doc List

```css
#docs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);                     /* 1rem between group cards */
}
```

## Doc Group Card

Each project's documents are grouped into a single expandable card. Same card pattern as project cards: zinc-900 background, zinc-800 border, 12px radius, CSS grid expand/collapse.

### Collapsed State (Default)

```
+--------------------------------------------------------------+
| [Project Name]                          [3 docs]     [v]     |
+--------------------------------------------------------------+
```

```css
.doc-group {
  background: var(--color-bg-card);        /* zinc-900 */
  border: 1px solid var(--color-border);   /* zinc-800 */
  border-radius: var(--radius-lg);         /* 12px */
  transition: border-color 0.2s ease;
}

.doc-group:hover {
  border-color: var(--color-zinc-700);
}
```

**Header (clickable button):**

```css
.doc-group__header {
  display: flex;
  align-items: center;
  gap: var(--space-4);                     /* 1rem */
  width: 100%;
  padding: var(--space-5);                 /* 1.25rem */
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}
```

**Header content:**

- **Project name:**
  ```css
  .doc-group__name {
    flex: 1;
    min-width: 0;
    font-size: var(--text-base);           /* 1rem */
    font-weight: var(--font-weight-semibold); /* 600 */
    color: var(--color-zinc-200);
  }
  ```

- **Doc count:**
  ```css
  .doc-group__count {
    font-size: var(--text-xs);             /* 0.75rem */
    color: var(--color-text-tertiary);     /* zinc-600 */
    white-space: nowrap;
    flex-shrink: 0;
  }
  ```
  Format: `3 docs` / `1 doc`

- **Chevron:**
  ```css
  .doc-group__chevron {
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    margin-left: var(--space-2);
    border-right: 2px solid var(--color-zinc-600);
    border-bottom: 2px solid var(--color-zinc-600);
    transform: rotate(45deg);
    transition: transform 0.3s ease;
  }

  .doc-group__header[aria-expanded="true"] .doc-group__chevron {
    transform: rotate(-135deg);
  }
  ```

### Expanded State

**CSS grid expand/collapse animation:**

```css
.doc-group__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.doc-group__body[aria-hidden="false"] {
  grid-template-rows: 1fr;
}

.doc-group__body-inner {
  overflow: hidden;
  padding: 0 var(--space-5);
}

.doc-group__body[aria-hidden="false"] .doc-group__body-inner {
  padding-top: var(--space-4);
  padding-bottom: var(--space-5);
  border-top: 1px solid var(--color-border);
}

.doc-group__list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
```

## Individual Document Row (v2 — Richer Metadata)

Each doc row now shows: type badge, title, author avatar + name, reading time, and modified date. This is the key visual change from v1.

### Desktop Layout

```
| [Badge]  Title                    [avatar] Author   ~5 min   Feb 5 |
```

```css
.doc-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);                     /* 0.75rem */
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
  width: 100%;
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
  transition: background-color 0.15s ease;
}

.doc-item:last-child {
  border-bottom: none;
}

.doc-item:hover {
  background: rgba(255, 255, 255, 0.02);
}
```

**Type badge** (unchanged from v1):

```css
.doc-item__badge {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  flex-shrink: 0;
}
```

**Title** (unchanged):

```css
.doc-item__title {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-normal);
  color: var(--color-zinc-300);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-item:hover .doc-item__title {
  color: var(--color-zinc-100);
}
```

**Metadata cluster** (new — groups author, reading time, and date on the right):

```css
.doc-item__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);                     /* 0.75rem */
  flex-shrink: 0;
}
```

**Author** (new — avatar + name):

```css
.doc-item__author {
  display: flex;
  align-items: center;
  gap: var(--space-2);                     /* 0.5rem */
  flex-shrink: 0;
}

.doc-item__avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
}

.doc-item__author-name {
  font-size: var(--text-xs);
  color: var(--color-zinc-400);
  white-space: nowrap;
}
```

**Reading time** (new):

```css
.doc-item__reading-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);       /* zinc-600 */
  white-space: nowrap;
  flex-shrink: 0;
}
```

Format: `~5 min` (derived from API's `readingTime` integer)

**Modified date** (carried from v1):

```css
.doc-item__date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);       /* zinc-600 */
  white-space: nowrap;
  flex-shrink: 0;
}
```

Format: `Feb 5` (short month + day, more precise than v1's month+year since we're on a dedicated page with more room)

### Doc Item HTML Structure

```html
<button class="doc-item" type="button" data-path="..." data-type="..." data-title="...">
  <span class="doc-item__badge doc-item__badge--requirements">Requirements</span>
  <span class="doc-item__title">Session Introspection — Requirements</span>
  <span class="doc-item__meta">
    <span class="doc-item__author">
      <img class="doc-item__avatar" src="img/avatars/thomas.svg" alt="" width="18" height="18">
      <span class="doc-item__author-name">Thomas</span>
    </span>
    <span class="doc-item__reading-time">~5 min</span>
    <span class="doc-item__date">Feb 5</span>
  </span>
</button>
```

If the API returns no author (null), omit the `.doc-item__author` element entirely.

### Mobile Responsive (< 640px)

On narrow screens, the metadata wraps below the title:

```css
@media (max-width: 639px) {
  .doc-item {
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .doc-item__badge {
    order: 1;
  }

  .doc-item__title {
    order: 2;
    flex-basis: 100%;
    white-space: normal;
  }

  .doc-item__meta {
    order: 3;
    flex-basis: 100%;
  }
}
```

## Doc Type Badges

Same pill pattern as v1. Updated color palette per Andrei's v2 suggestions — **tech-approach changes from cyan to emerald** and **QA badges change from green to rose** to better differentiate them and align with Thomas's v2 guidance:

| Type | Label | Text Color | Background |
|------|-------|-----------|------------|
| `requirements` | Requirements | `var(--color-indigo-400)` (`#818cf8`) | `rgba(129, 140, 248, 0.1)` |
| `tech-approach` | Tech Approach | `#34d399` (emerald-400) | `rgba(52, 211, 153, 0.1)` |
| `design-spec` | Design Spec | `#c084fc` (purple-400) | `rgba(192, 132, 252, 0.1)` |
| `research` | Research | `#fbbf24` (amber-400) | `rgba(251, 191, 36, 0.1)` |
| `qa-report` | QA Report | `#fb7185` (rose-400) | `rgba(251, 113, 133, 0.1)` |
| `qa-findings` | QA Findings | `#fb7185` (rose-400) | `rgba(251, 113, 133, 0.1)` |
| `backend-analysis` | Analysis | `#22d3ee` (cyan-400) | `rgba(34, 211, 238, 0.1)` |
| `adr` | ADR | `var(--color-zinc-400)` (`#a1a1aa`) | `rgba(161, 161, 170, 0.1)` |
| `other` | Doc | `var(--color-zinc-400)` (`#a1a1aa`) | `rgba(161, 161, 170, 0.1)` |

```css
.doc-item__badge--requirements {
  color: var(--color-indigo-400);
  background: rgba(129, 140, 248, 0.1);
}

.doc-item__badge--tech-approach {
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
}

.doc-item__badge--design-spec {
  color: #c084fc;
  background: rgba(192, 132, 252, 0.1);
}

.doc-item__badge--research {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.doc-item__badge--qa-report,
.doc-item__badge--qa-findings {
  color: #fb7185;
  background: rgba(251, 113, 133, 0.1);
}

.doc-item__badge--backend-analysis {
  color: #22d3ee;
  background: rgba(34, 211, 238, 0.1);
}

.doc-item__badge--adr,
.doc-item__badge--other {
  color: var(--color-zinc-400);
  background: rgba(161, 161, 170, 0.1);
}
```

**Rationale for color changes from v1:**
- Tech Approach now uses **emerald** instead of cyan — emerald connotes engineering/architecture, while cyan is freed up for the new `backend-analysis` type.
- QA badges now use **rose** instead of green — rose signals "attention/review" better than green, and avoids confusion with the project "Completed" badge. QA reports are about findings and verdicts, not success.
- New `backend-analysis` type uses **cyan** — neutral, analytical feel.

## ADR Group

Unchanged from v1. ADRs appear at the bottom, dimmer group name:

```css
.doc-group--adr .doc-group__name {
  color: var(--color-zinc-400);
}
```

## Reading View (v2 — Richer Metadata Header)

The reading view now has a **metadata bar** at the top showing author, type badge, date, and reading time — giving the reader full context before they start.

### Layout

```
+----------------------------------------------------------------------+
| [<- Back to docs]                                                     |
|                                                                       |
| [Badge: Requirements]  ~5 min read                                    |
| # Session Introspection — Requirements                                |
|                                                                       |
| [avatar] Thomas  ·  Last updated Feb 5, 2026                          |
|                                                                       |
| ─────────────────────────────────────                                 |
|                                                                       |
| (rendered markdown content...)                                        |
|                                                                       |
+----------------------------------------------------------------------+
```

### View Toggle

The list view and reading view are sibling containers. Toggling between them uses `display: none` / `display: block`. The list view's scroll position is preserved when returning from reading view (no re-fetch, no re-render).

### Back Button

```css
.docs-reader__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-400);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2) 0;
  margin-bottom: var(--space-6);
  transition: color 0.15s ease;
}

.docs-reader__back:hover {
  color: var(--color-zinc-200);
}

.docs-reader__back::before {
  content: "\2190";
  font-size: var(--text-base);
}
```

### Metadata Header (new in v2)

Between the back button and the markdown content, a compact metadata bar gives context.

```html
<div class="docs-reader__meta">
  <div class="docs-reader__meta-top">
    <span class="doc-item__badge doc-item__badge--requirements">Requirements</span>
    <span class="docs-reader__reading-time">~5 min read</span>
  </div>
  <div class="docs-reader__meta-bottom">
    <span class="docs-reader__author">
      <img class="docs-reader__author-avatar" src="img/avatars/thomas.svg" alt="" width="20" height="20">
      <span class="docs-reader__author-name">Thomas</span>
    </span>
    <span class="docs-reader__meta-sep">·</span>
    <span class="docs-reader__date">Last updated Feb 5, 2026</span>
  </div>
</div>
```

```css
.docs-reader__meta {
  margin-bottom: var(--space-6);           /* 1.5rem */
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.docs-reader__meta-top {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);           /* 0.75rem */
}

.docs-reader__reading-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.docs-reader__meta-bottom {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.docs-reader__author {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.docs-reader__author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.docs-reader__author-name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-300);
}

.docs-reader__meta-sep {
  font-size: var(--text-sm);
  color: var(--color-zinc-600);
}

.docs-reader__date {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
}
```

Format for date: `Last updated Feb 5, 2026` (full date in reading view — more room than the list)

If no author is available, omit the author element and the separator; the date stands alone.

### Reading Content Container

```css
.docs-reader__content {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-zinc-300);
  max-width: 72ch;
}
```

The 72ch max-width is unchanged. On a dedicated page, the content naturally centers within the `.container` (1120px max), giving generous margins on large screens. This creates a comfortable reading column without needing explicit centering of the content div.

### Rendered Markdown Typography

All markdown typography styles are unchanged from v1. They move from `css/styles.css` to `css/docs.css` since they're docs-page-specific. Full reference:

#### Headings

```css
.docs-reader__content h1 {
  font-size: var(--text-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-zinc-100);
  margin-top: var(--space-8);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.docs-reader__content h1:first-child {
  margin-top: 0;
}

.docs-reader__content h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
  margin-top: var(--space-8);
  margin-bottom: var(--space-3);
}

.docs-reader__content h3 {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
  margin-top: var(--space-6);
  margin-bottom: var(--space-3);
}

.docs-reader__content h4 {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-300);
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
}
```

#### Paragraphs

```css
.docs-reader__content p {
  margin-bottom: var(--space-4);
}
```

#### Lists

```css
.docs-reader__content ul,
.docs-reader__content ol {
  margin-bottom: var(--space-4);
  padding-left: var(--space-6);
}

.docs-reader__content li {
  margin-bottom: var(--space-2);
}

.docs-reader__content li > ul,
.docs-reader__content li > ol {
  margin-top: var(--space-2);
  margin-bottom: 0;
}

.docs-reader__content ul {
  list-style-type: disc;
}

.docs-reader__content ol {
  list-style-type: decimal;
}
```

#### Tables

```css
.docs-reader__content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--space-6);
  font-size: var(--text-sm);
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.docs-reader__content th {
  text-align: left;
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--color-zinc-700);
  white-space: nowrap;
}

.docs-reader__content td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

.docs-reader__content tr:last-child td {
  border-bottom: none;
}
```

#### Code

```css
.docs-reader__content code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-zinc-200);
  background: var(--color-zinc-800);
  padding: 0.15em 0.4em;
  border-radius: var(--radius-sm);
}

.docs-reader__content pre {
  margin-bottom: var(--space-4);
  background: var(--color-zinc-800);
  border: 1px solid var(--color-zinc-700);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.docs-reader__content pre code {
  background: none;
  padding: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--color-zinc-300);
}
```

#### Blockquotes

```css
.docs-reader__content blockquote {
  border-left: 3px solid var(--color-zinc-700);
  padding-left: var(--space-4);
  margin-bottom: var(--space-4);
  color: var(--color-zinc-400);
  font-style: italic;
}
```

#### Horizontal Rules

```css
.docs-reader__content hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--space-8) 0;
}
```

#### Links

```css
.docs-reader__content a {
  color: var(--color-indigo-400);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.docs-reader__content a:hover {
  color: var(--color-zinc-100);
}
```

#### Bold and Italic

```css
.docs-reader__content strong {
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
}

.docs-reader__content em {
  font-style: italic;
}
```

## Empty State

```css
.docs__empty {
  text-align: center;
  padding: var(--space-16) 0;
}

.docs__empty-text {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-400);
  margin-bottom: var(--space-2);
}
```

Text: "No docs yet."

## Loading State

```css
.docs__loading {
  text-align: center;
  padding: var(--space-8) 0;
  font-size: var(--text-sm);
  color: var(--color-zinc-600);
}
```

Text during list load: "Loading docs..."
Text during content load: "Loading..."

## Interaction States

### Group Expand/Collapse

- Click the group header to toggle expanded/collapsed
- Only one group expanded at a time
- Smooth 0.3s grid-template-rows animation
- Chevron rotates on expand
- `aria-expanded` on header, `aria-hidden` on body

### Doc Item Click

- Click a doc item to switch from list view to reading view
- List view is hidden (`display: none`), reading view is shown
- While markdown loads, show the loading state in the reading view container
- Once loaded, render with `marked.parse()` and display metadata header

### Back to Docs

- Click the back button to return to the list view
- Reading view is hidden, list view is re-shown (not re-rendered — scroll position preserved)
- The previously-expanded group remains expanded

### Keyboard Navigation

- All interactive elements are focusable `<button>` elements
- Focus ring: `2px solid var(--color-accent)` with `2px offset` (existing global style)

## Accessibility

- Page title: `<title>Docs — TeamHQ</title>`
- Main landmark: `<main class="docs-page">`
- Heading hierarchy: `<h1>` for page title, doc group names are not headings (they're button labels), markdown content provides its own heading hierarchy in reading view
- Expand/collapse: `aria-expanded` on header, `aria-hidden` on body
- Author avatars: `alt=""` (decorative — the name is in text next to it)
- Color contrast: all combinations meet WCAG AA

## CSS File Strategy

### `css/styles.css` — Add only:
- `.nav__link--active` (shared nav behavior, used by any page)

### `css/docs.css` — All docs-specific styles:
- `.docs-page` page container
- `.docs-header` page header and stats
- `.doc-group` cards and expand/collapse
- `.doc-item` rows with metadata
- `.doc-item__badge` type badge variants
- `.doc-group--adr` ADR group treatment
- `.docs-reader` reading view (back button, metadata header, markdown typography)
- `.docs__empty` and `.docs__loading` states
- Responsive overrides

## Design Decisions

1. **Dedicated page, not a section** — CEO request. Also architecturally cleaner: docs have their own data source, reading view, and CSS. Keeping them on the homepage would bloat a page that already has 2000+ lines of JS.

2. **Compact page header, not a hero** — The docs page is utilitarian. A hero would add visual noise between the nav and the content the user came to see. Title + stats is enough context.

3. **View toggle with display:none (not content replacement)** — v1 replaced the container innerHTML. v2 uses two sibling containers toggled with display. This preserves the list view's DOM state (scroll position, expanded group) when returning from reading. No re-fetch, no re-render.

4. **Metadata bar in reading view** — On a dedicated page there's room to give the reader more context before they start. Author avatar + name, type badge, reading time, and full date are displayed in a compact bar separated from the content by a border.

5. **Richer doc items with author + reading time** — The CEO explicitly asked for richer metadata (US-3). Author avatars at 18px are small enough to not dominate the row but large enough to be recognizable (these are distinctive pixel art SVGs).

6. **Badge color adjustments** — Tech Approach moves to emerald (green) per Andrei's v2 suggestion. QA moves to rose (pink-red) to signal "attention/review" rather than "success." Analysis gets cyan (the color tech-approach used to have). These align better with the semantic meaning of each doc type.

7. **Date format change** — List items show `Feb 5` (month + day) instead of v1's `Feb 2026` (month + year). On a dedicated page with fewer space constraints, the more precise date is more useful.

8. **72ch reading width unchanged** — Still the right line length for long-form reading. On the dedicated page it naturally sits within the 1120px container with comfortable margins.

9. **Single group expansion unchanged** — Even on a dedicated page, single-expansion keeps the list compact and scannable with 13+ groups.
