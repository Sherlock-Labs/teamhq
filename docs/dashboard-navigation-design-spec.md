# Dashboard Navigation — Dedicated Screens: Design Spec

**Author:** Robert (Product Designer)
**Date:** 2026-02-09
**Status:** Draft
**Inputs:** `docs/dashboard-navigation-requirements.md`, `docs/dashboard-navigation-tech-approach.md`

## Summary

This is a navigation restructuring, not a visual redesign. We move four sections from the scrolling index.html into their own pages, transform the index into a hub with a navigation card grid, and ensure consistent chrome across all pages. Every spec decision below reuses existing tokens and patterns.

---

## 1. Hub Page (index.html) — Navigation Card Grid

### Section Heading

The card grid is introduced by a section heading that matches the existing `section-title` pattern:

- **Heading text:** "Explore"
- **Class:** `.section-title` (same as Tools, Projects, etc.)
- No subtitle needed — the cards are self-explanatory

### Card Grid Layout

The grid uses the same responsive strategy as `.tools__grid`:

| Property | Value | Token |
|----------|-------|-------|
| Display | CSS Grid | — |
| Columns (mobile, <640px) | 1 column | — |
| Columns (tablet, 640px+) | 2 columns | — |
| Columns (desktop, 1024px+) | 3 columns | — |
| Gap | `var(--space-4)` (1rem) | `--space-4` |

**CSS class:** `.hub__grid`

This mirrors `.tools__grid` exactly — `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` is what Andrei suggested in the tech approach, but to match the existing tools grid breakpoint behavior (explicit `repeat(2, 1fr)` at 640px, `repeat(3, 1fr)` at 1024px), use the same explicit breakpoint pattern instead of `auto-fill`. This keeps the two grids visually aligned if they ever appear on the same page.

### Card Design

Each card is an `<a>` element (the whole card is clickable). The design follows the `.tool-card` pattern with adjustments for navigation context:

**Structure per card:**
```
[Card Name]          <- h3, semibold
[Description]        <- p, secondary color
```

**Visual properties:**

| Property | Value | Token |
|----------|-------|-------|
| Background | `var(--color-bg-card)` | `--color-bg-card` |
| Border | `1px solid var(--color-border)` | `--color-border` |
| Border radius | `var(--radius-lg)` | `--radius-lg` |
| Padding | `var(--space-5)` (1.25rem) | `--space-5` |
| Box shadow | none | `--shadow-card` |
| Text decoration | none | — |

**Card name (`.hub__card-name`):**

| Property | Value | Token |
|----------|-------|-------|
| Font size | `var(--text-lg)` | `--text-lg` |
| Font weight | `var(--font-weight-semibold)` | `--font-weight-semibold` |
| Color | `var(--color-text-primary)` | `--color-text-primary` |
| Margin bottom | `var(--space-2)` (0.5rem) | `--space-2` |

**Card description (`.hub__card-desc`):**

| Property | Value | Token |
|----------|-------|-------|
| Font size | `var(--text-sm)` | `--text-sm` |
| Line height | `var(--leading-relaxed)` | `--leading-relaxed` |
| Color | `var(--color-text-secondary)` | `--color-text-secondary` |
| Margin | 0 | — |

### Card Content

Seven cards total:

| Card | Name | Description |
|------|------|-------------|
| 1 | Tools | Products and utilities built by the team. |
| 2 | Projects | Create and manage product builds. |
| 3 | Meetings | Simulated round-table discussions with the full team. |
| 4 | Interviews | AI-powered audio interviews on any topic. |
| 5 | Docs | Project documentation and architecture records. |
| 6 | Spreadsheets | Tabular data across all projects. |
| 7 | Team | Meet the seventeen-agent AI team. |

No icons or emojis. The card names and descriptions are clear enough. Adding icons would require sourcing/designing an icon set that doesn't exist yet — out of scope.

No item counts. The count would require JS to fetch and populate (projects count, meetings count, etc.), which contradicts the goal of a static hub page with zero JS. If counts become desirable later, they can be added in a future iteration.

### Hover & Focus States

Follow the `.tool-card` hover pattern exactly:

| State | Property | Value |
|-------|----------|-------|
| Hover | `border-color` | `var(--color-accent)` |
| Hover | `transition` | `border-color 0.15s ease` |
| Focus-visible | `outline` | `2px solid var(--color-accent)` |
| Focus-visible | `outline-offset` | `2px` |

The entire card is the click target (the `<a>` wraps all content). Cursor is `pointer` by default since it's a link.

### Connection to Hero

The hub grid sits between the Hero section and How It Works:

- **Hero** has `padding-bottom: var(--space-8)` (desktop: `var(--space-8)`)
- **Hub section** uses the same section padding as `.tools`: `padding-top: var(--space-8)`, `padding-bottom: var(--space-8)` (desktop: `--space-12` / `--space-12`)
- **Border-top:** `1px solid var(--color-border)` — same as other sections, provides clear visual separation from the hero
- The grid reads as the first real content below the hero, which is exactly the right visual hierarchy for a hub page

---

## 2. Dedicated Pages — Consistent Chrome

### Page Header Pattern

Each dedicated page gets a simple header inside `<main>`:

```
[Page Title]         <- h1
```

**Specs:**

| Property | Value | Token |
|----------|-------|-------|
| Font family | `'Chromatica', var(--font-heading)` | (custom font) |
| Font size | `var(--text-2xl)` (desktop: `var(--text-3xl)`) | `--text-2xl` / `--text-3xl` |
| Font weight | 700 | — |
| Color | `var(--color-text-primary)` | `--color-text-primary` |
| Margin bottom | `var(--space-6)` | `--space-6` |

This matches the existing `.section-title` style but as an `<h1>`. On dedicated pages, the section content is the page content, so the section heading becomes the page heading.

**Exception — pages with toolbars:** Projects and Meetings already have toolbar rows (subtitle + buttons) below their headings. These stay as-is. The heading is the `<h2>` from the original section (now semantically an `<h1>` since it's the page's primary heading, but the class and styling remain `.section-title`). Actually, keep the heading as `<h2>` with `.section-title` for consistency — the `<h1>` is implicit from the page title. *Correction:* Use `<h2>` with `.section-title` on all dedicated pages, matching the existing section heading pattern exactly. This keeps the HTML identical to what's being extracted and avoids CSS changes.

### Page Padding & Max Width

All pages use the existing `.container` for content width:

| Property | Value | Token |
|----------|-------|-------|
| Max width | 1120px | (set in `.container`) |
| Side padding (mobile) | `var(--space-5)` | `--space-5` |
| Side padding (640px+) | `var(--space-8)` | `--space-8` |

Section padding (top/bottom) follows the existing section pattern:

| Breakpoint | Padding top | Padding bottom |
|------------|-------------|----------------|
| Mobile | `var(--space-8)` | `var(--space-8)` |
| Desktop (1024px+) | `var(--space-12)` | `var(--space-12)` |

### Back-to-Hub Affordance

**None for v1.** The logo in the nav already links to `index.html`, which is the standard web convention for "home." Adding a back link or breadcrumb would be redundant. The nav provides clear wayfinding to every page.

---

## 3. Navigation Updates

### Updated Nav Links

All pages share the same nav structure. The updated link list:

| Label | href | Notes |
|-------|------|-------|
| Tools | `tools.html` | Was `#tools` / `index.html#tools` |
| Projects | `projects.html` | Was `#projects` / `index.html#projects` |
| Meetings | `meetings.html` | Was `#meetings` / `index.html#meetings` |
| Interviews | `interviews.html` | Split from Meetings — new first-class section |
| Docs | `docs.html` | Unchanged |
| Spreadsheets | `spreadsheets.html` | Unchanged |
| Team | `team.html` | Was `#roster` / `index.html#roster` |

**Removed:** "How It Works" — it's secondary content on the hub page and doesn't warrant a nav link.

### Active Link Styling

The active link pattern already exists in `shared.css`:

```css
.nav__link--active {
  color: var(--color-text-primary);
  cursor: default;
}
```

**Per page:**
- Each page's own link gets `class="nav__link nav__link--active"` and `aria-current="page"`
- On `index.html`, no link is active (it's the hub, not a section)

### docs.html Fix

Currently `docs.html` uses a `<span>` for the active link. Change to `<a href="docs.html" class="nav__link nav__link--active" aria-current="page">Docs</a>` — consistent with `spreadsheets.html` and all new pages.

### Logo Behavior

- **index.html:** Uses the inline SVG logo (current behavior, links to `#`)
- **All other pages:** Use the `<img>` tag logo linking to `index.html` (established pattern from `docs.html` and `spreadsheets.html`)

### Page Transitions

**None for v1.** Standard browser page navigation. No crossfade, no AJAX page loading. Fast, predictable, zero complexity.

---

## 4. What NOT to Redesign

- **Section content:** Lifted from index.html without modification. Same HTML, same classes, same IDs.
- **Nav header structure:** Same flex layout, same sticky behavior, same frosted glass background.
- **Footer:** Identical on every page — logo + attribution.
- **Existing dedicated pages:** `docs.html` and `spreadsheets.html` content is untouched. Only their nav links change.
- **Section-specific modals and forms:** Move wholesale to their new pages. No visual changes.

---

## 5. CSS Additions

All new CSS goes in `css/styles.css`. Approximately 40 lines:

### Hub Section

```css
.hub {
  background: var(--color-bg-primary);
  padding-top: var(--space-8);
  padding-bottom: var(--space-8);
  border-top: 1px solid var(--color-border);
}

@media (min-width: 1024px) {
  .hub {
    padding-top: var(--space-12);
    padding-bottom: var(--space-12);
  }
}
```

### Hub Grid

```css
.hub__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 640px) {
  .hub__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .hub__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Hub Card

```css
.hub__card {
  display: block;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  text-decoration: none;
  transition: border-color 0.15s ease;
}

.hub__card:hover {
  border-color: var(--color-accent);
}

.hub__card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.hub__card-name {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.hub__card-desc {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
}
```

That's it. No other CSS changes needed. All existing section styles work as-is on their new dedicated pages.

---

## 6. Implementation Notes for Alice

1. **Start from `spreadsheets.html` as the template** — it has the cleanest, most up-to-date page structure (skip link, correct nav pattern, proper `<main>` tag)
2. **Copy-paste the sections from `index.html`** without modification — don't restyle, don't rename IDs, don't restructure
3. **For projects.html**, include all three modal overlays (`project-modal-overlay`, `delete-modal-overlay`, `kickoff-modal-overlay`) — they're part of the projects section
4. **For interviews.html**, extract the interview config panel, interview active panel, and audio worklet from the meetings section. This is a NEW separate page — interviews are NOT part of meetings. Load `interview.js`, `gemini-client.js`, and `audio-worklet-processor.js`.
5. **For meetings.html**, do NOT include interview UI (button, config panel, active panel). Only meetings content + custom meeting form.
6. **The hub grid CSS** follows the tool-card pattern exactly — same border, padding, radius, hover state. Alice can reference `.tool-card` in `styles.css` for the values. The grid now has 7 cards (including Interviews).
7. **Nav on each page** — copy the nav block with 7 links (Tools, Projects, Meetings, Interviews, Docs, Spreadsheets, Team), set the correct active class and `aria-current="page"` for that page
8. **Test each page independently** — verify JS still works by loading `projects.html` directly and creating/editing a project, loading `meetings.html` and starting a meeting, loading `interviews.html` and configuring an interview, etc.
