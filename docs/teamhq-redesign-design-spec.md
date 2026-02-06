# TeamHQ Landing Page Redesign - Design Spec

This spec provides implementation-ready details for Alice. All values reference the existing CSS custom property system or give exact values to add.

---

## 1. Navigation Bar

The nav bar is a new `<nav>` element added above the existing `<header class="hero">`.

### HTML Structure

```html
<nav class="nav" aria-label="Main navigation">
  <div class="container nav__inner">
    <div class="nav__brand">
      <span class="nav__title">TeamHQ</span>
      <span class="nav__label">Sherlock Labs</span>
    </div>
    <div class="nav__links">
      <a href="#tools" class="nav__link">Tools</a>
      <a href="#roster" class="nav__link">Team</a>
      <a href="#how" class="nav__link">How It Works</a>
    </div>
  </div>
</nav>
```

Note: The existing `<section>` elements need `id` attributes added to match the anchor links: `id="tools"`, `id="roster"`, `id="how"`.

### Layout

- **Position:** `sticky`, `top: 0`, `z-index: 100`
- **Height:** Auto, with `padding: var(--space-4) 0` (16px top and bottom). This will produce a bar roughly 56px tall.
- **Inner container:** Uses the existing `.container` class. Inner layout is `display: flex; align-items: center; justify-content: space-between`.
- **Background:** `#09090b` (zinc-950) — same as page background so it blends seamlessly.
- **Bottom border:** `1px solid #27272a` (zinc-800). This is the only visual separation from page content, matching the OST Tool header exactly.

### Brand (Left Side)

- **"TeamHQ"** text:
  - `font-size: var(--text-sm)` (14px)
  - `font-weight: var(--font-weight-bold)` (700)
  - `letter-spacing: 0.05em` (tracking-wide)
  - `color: #d4d4d8` (zinc-300)
- **"Sherlock Labs"** sub-label:
  - `font-size: var(--text-xs)` (12px)
  - `font-weight: var(--font-weight-normal)` (400)
  - `color: #52525b` (zinc-600) — decorative, not essential content, so zinc-600 is acceptable here per the tech approach accessibility notes
  - `margin-left: var(--space-2)` (8px)
  - This pattern directly mirrors the OST Tool header: `OST Tool` bold + `Sherlock Labs` muted beside it

### Nav Links (Right Side)

- **Layout:** `display: flex; gap: var(--space-6)` (24px between links)
- **Link style:**
  - `font-size: var(--text-sm)` (14px)
  - `font-weight: var(--font-weight-medium)` (500)
  - `color: #a1a1aa` (zinc-400)
  - `text-decoration: none`
  - `transition: color 0.15s ease`
- **Hover:** `color: #d4d4d8` (zinc-300)
- **Focus-visible:** `outline: 2px solid #6366f1` (indigo-500), `outline-offset: 2px`, `border-radius: var(--radius-sm)`

### Scroll Behavior

Add to the `html` selector in CSS:

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 64px;
}
```

The `scroll-padding-top` accounts for the nav height (~56px) plus a small buffer so content doesn't sit flush against the bottom of the nav.

---

## 2. Tools Section

This section goes between the Hero and Team Roster. It is the first content section after the hero, highlighting what the team has shipped.

### HTML Structure

```html
<section class="tools" id="tools" aria-labelledby="tools-heading">
  <div class="container">
    <h2 id="tools-heading" class="section-title">Tools</h2>
    <p class="section-subtitle">What we've built.</p>

    <div class="tools__grid">
      <article class="tool-card">
        <div class="tool-card__header">
          <h3 class="tool-card__name">OST Tool</h3>
          <span class="tool-card__badge tool-card__badge--live">Live</span>
        </div>
        <p class="tool-card__desc">Generate Opportunity Solution Trees with AI to explore product opportunities, debate solutions, and get recommendations.</p>
        <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" class="tool-card__launch">
          Launch
          <span class="tool-card__launch-arrow" aria-hidden="true">&rarr;</span>
        </a>
      </article>
    </div>
  </div>
</section>
```

### Section Background and Spacing

- **Background:** `#09090b` (zinc-950) — same as the page background. No alternating background needed; the section title and card provide enough visual structure.
- **Padding:** `var(--space-16) 0` on mobile, `var(--space-20) 0` on desktop (matching existing section padding).

### Tools Grid

- **Layout:** `display: grid`
- **Mobile:** `grid-template-columns: 1fr` (single column, full width)
- **Tablet (640px+):** `grid-template-columns: 1fr` (still single column since there's only one tool — this avoids a half-empty grid)
- **Desktop (1024px+):** `grid-template-columns: repeat(2, 1fr)` — two-column grid ready for when a second tool is added. The single card will take one column, leaving the other open.
- **Gap:** `var(--space-6)` (24px)
- **Max width:** No additional constraint beyond the `.container` max-width (1120px). Cards will naturally be wider than agent cards since the grid has fewer columns.

### Tool Card

The tool card is wider and more horizontal than agent cards. It has three stacked areas: header row, description, and launch link.

- **Background:** `#18181b` (zinc-900)
- **Border:** `1px solid #27272a` (zinc-800)
- **Border-radius:** `var(--radius-lg)` (12px)
- **Padding:** `var(--space-6)` (24px)
- **Transition:** `border-color 0.2s ease`

**Hover state:**
- `border-color: #3f3f46` (zinc-700) — a subtle lightening of the border, not a glow. This is enough feedback on dark backgrounds without being distracting.

**Focus-visible state:**
- `outline: 2px solid #6366f1` (indigo-500)
- `outline-offset: 2px`

### Tool Card Header Row

- **Layout:** `display: flex; align-items: center; justify-content: space-between`
- **Margin-bottom:** `var(--space-3)` (12px)

**Tool name (`tool-card__name`):**
- `font-size: var(--text-lg)` (18px)
- `font-weight: var(--font-weight-semibold)` (600)
- `color: #e4e4e7` (zinc-200)

**Status badge (`tool-card__badge`):**
- `font-size: var(--text-xs)` (12px)
- `font-weight: var(--font-weight-medium)` (500)
- `padding: var(--space-1) var(--space-3)` (4px 12px)
- `border-radius: 9999px` (pill shape)
- `text-transform: uppercase`
- `letter-spacing: 0.05em`

Badge variant — "Live":
- `color: #4ade80` (green-400)
- `background: rgba(74, 222, 128, 0.1)` (green-400 at 10% opacity)

Badge variant — "Coming Soon" (for future use):
- `color: #a1a1aa` (zinc-400)
- `background: rgba(161, 161, 170, 0.1)` (zinc-400 at 10% opacity)

### Tool Card Description

- `font-size: var(--text-sm)` (14px)
- `line-height: var(--leading-relaxed)` (1.625)
- `color: #a1a1aa` (zinc-400)
- `margin-bottom: var(--space-5)` (20px)

### Tool Card Launch Link

The launch link sits at the bottom of the card. It is styled as an inline link, not a button — keeping it lightweight.

- `display: inline-flex; align-items: center; gap: var(--space-2)` (8px gap between text and arrow)
- `font-size: var(--text-sm)` (14px)
- `font-weight: var(--font-weight-semibold)` (600)
- `color: #6366f1` (indigo-500)
- `text-decoration: none`
- `transition: color 0.15s ease`

**Hover:** `color: #818cf8` (indigo-400)

**Arrow (`tool-card__launch-arrow`):**
- `transition: transform 0.15s ease`
- On hover of the parent link: `transform: translateX(4px)` — a subtle rightward nudge indicating navigation

**Focus-visible:** `outline: 2px solid #6366f1`, `outline-offset: 2px`, `border-radius: var(--radius-sm)`

---

## 3. Dark Theme Application

### Design Token Updates

Replace the current `:root` semantic tokens:

```css
:root {
  /* ... keep raw color definitions ... */

  /* Add new zinc-scale tokens */
  --color-zinc-100: #f4f4f5;
  --color-zinc-200: #e4e4e7;
  --color-zinc-300: #d4d4d8;
  --color-zinc-400: #a1a1aa;
  --color-zinc-600: #52525b;
  --color-zinc-700: #3f3f46;
  --color-zinc-800: #27272a;
  --color-zinc-900: #18181b;
  --color-zinc-950: #09090b;

  /* Add indigo-400 */
  --color-indigo-400: #818cf8;

  /* Update semantic tokens */
  --color-bg-primary: var(--color-zinc-950);
  --color-bg-secondary: var(--color-zinc-950);  /* No alternating bg in dark theme */
  --color-bg-card: var(--color-zinc-900);
  --color-text-primary: var(--color-zinc-300);
  --color-text-secondary: var(--color-zinc-400);
  --color-text-tertiary: var(--color-zinc-600);
  --color-border: var(--color-zinc-800);
  --color-accent: var(--color-indigo-500);
  --color-accent-hover: var(--color-indigo-400);
  --color-accent-light: rgba(99, 102, 241, 0.1);

  /* Update font family */
  --font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
```

### Hero Section

- **Background:** `var(--color-bg-primary)` (zinc-950) — already uses this token, so it updates automatically.
- **Headline:** `color: var(--color-zinc-100)` — override `--color-text-primary` for the headline specifically, since `#f4f4f5` is brighter than zinc-300 and appropriate for the largest text on the page.
- **Subhead:** `var(--color-text-secondary)` (zinc-400) — no change needed, the token handles it.
- **Top padding adjustment:** With the sticky nav now present, reduce the hero's `padding-top` slightly. Use `var(--space-12)` on mobile and `var(--space-20)` on desktop (was 16/24). The nav adds visual weight above, so less padding prevents the hero from feeling too far down.

### Team Roster Section

The roster section currently alternates background with `--color-bg-secondary` (gray-50). In the dark theme, this becomes zinc-950 (same as page). This is intentional — use the card borders to create visual separation rather than background bands.

- **Section background:** `var(--color-bg-secondary)` (zinc-950 — same as page). The cards provide enough contrast.
- **Card background:** `var(--color-bg-card)` (zinc-900) — already uses this token.
- **Card border:** `var(--color-border)` (zinc-800) — already uses this token.
- **Avatar circle:**
  - Background: `var(--color-accent-light)` (indigo at 10% opacity) — already uses this token.
  - Text: `var(--color-accent-hover)` (indigo-400) — update from `--color-accent` to get the brighter indigo on dark.
- **Name text:** `var(--color-zinc-200)` — slightly brighter than primary text for emphasis. Override `.agent-card__name` color.
- **Role text:** `var(--color-accent-hover)` (indigo-400) — brighter than indigo-500 for readability on dark. Update `.agent-card__role`.
- **Description text:** `var(--color-text-secondary)` (zinc-400) — already uses this token.
- **Hover state:** Remove `transform: translateY(-2px)` and `box-shadow` changes. Replace with:
  - `border-color: var(--color-zinc-700)` (#3f3f46) — same approach as tool cards
  - This is the key dark-theme adjustment: shadows are invisible on dark backgrounds, so border lightening provides the hover feedback instead.

### How It Works Section

- **Background:** `var(--color-bg-primary)` (zinc-950) — already uses this token.
- **Step number circles:** Keep `background: var(--color-accent)` (indigo-500) + `color: white`. These are fine as-is.
- **Step titles:** `var(--color-zinc-200)` — override to match card names.
- **Step descriptions:** `var(--color-text-secondary)` (zinc-400) — already uses this token.
- **Connecting line (desktop):** Update from `--color-gray-200` to `var(--color-zinc-800)`. The line should be subtle on dark backgrounds.

### Footer

- **Background:** `var(--color-zinc-900)` (#18181b) — slightly elevated from the page background to create a visual footer boundary.
- **Top border:** `1px solid var(--color-zinc-800)` — add this to delineate the footer from the content above.
- **"TeamHQ" text:** `var(--color-zinc-100)` (#f4f4f5)
- **Attribution text:** `var(--color-zinc-600)` (#52525b) — decorative, low priority.

---

## 4. Badge Readability Fix

The hero badge (`<span class="hero__badge">Sherlock Labs</span>`) currently uses `--color-accent` on `--color-accent-light`. On the dark background, update to:

- **Text color:** `var(--color-indigo-400)` (#818cf8)
- **Background:** `var(--color-accent-light)` (rgba(99, 102, 241, 0.1)) — the updated token value provides indigo at 10% opacity over zinc-950
- **Contrast ratio:** ~7.2:1 (indigo-400 on the effective background color), which passes WCAG AA

Implementation — update `.hero__badge`:

```css
.hero__badge {
  color: var(--color-accent-hover);  /* indigo-400 */
  background: var(--color-accent-light);  /* indigo-500 at 10% */
}
```

No new classes needed. The existing tokens, once updated, handle this.

---

## 5. Responsive Behavior

### Navigation Bar

- **All breakpoints:** The nav uses `flex-wrap: wrap` and `gap` to handle overflow gracefully. No hamburger menu (per requirements).
- **Mobile (<640px):**
  - The brand and links stack if needed. Apply `flex-wrap: wrap` on `.nav__inner`.
  - Brand takes full width on its own line if links don't fit beside it: `nav__brand { flex-shrink: 0 }`, `nav__links { flex-wrap: wrap; gap: var(--space-4) }`.
  - Reduce link gap to `var(--space-4)` (16px) at mobile to fit more links.
  - With only 3 short links ("Tools", "Team", "How It Works"), they should fit beside the brand on most phones in portrait. Only very narrow screens (< 360px) might wrap.
- **Tablet (640px+):** Brand and links fit comfortably on one line. No changes needed.
- **Desktop (1024px+):** No changes needed.

### Tools Section

- **Mobile:** Single column grid. Tool card takes full width.
- **Tablet (640px+):** Single column. One card doesn't need two columns.
- **Desktop (1024px+):** Two-column grid. With one card, it sits in the left column. When a second tool is added, it fills the right column naturally.

### Agent Cards (Existing)

No changes to the existing responsive grid: 1 col mobile, 2 col tablet, 3 col desktop.

### Section Padding

Keep the existing pattern: `var(--space-16)` vertical padding on mobile, scaling to `var(--space-20)` on desktop.

---

## 6. Hover and Focus States

### General Principle

On dark backgrounds, **border color shifts** replace **shadow lifts** as the primary hover feedback. Shadows are nearly invisible on zinc-950, so they waste a CSS transition for no visual payoff. A border going from zinc-800 to zinc-700 is subtle but perceptible.

### Interactive Elements Summary

| Element | Hover | Focus-Visible |
|---------|-------|---------------|
| Nav links | `color: zinc-300` (from zinc-400) | `outline: 2px solid indigo-500`, `outline-offset: 2px` |
| Agent cards | `border-color: zinc-700` (from zinc-800) | `outline: 2px solid indigo-500`, `outline-offset: 2px` |
| Tool cards | `border-color: zinc-700` (from zinc-800) | `outline: 2px solid indigo-500`, `outline-offset: 2px` |
| Launch link | `color: indigo-400` (from indigo-500), arrow shifts right 4px | `outline: 2px solid indigo-500`, `outline-offset: 2px` |
| Hero badge | No hover (not interactive) | N/A |

### Global Focus Rule

Add a global focus-visible rule to catch any interactive elements:

```css
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

This ensures all links and buttons have visible keyboard focus indicators without needing per-component rules. Component-specific rules (like agent cards) can override as needed.

### Transition Timing

All interactive transitions use `0.15s ease` or `0.2s ease`. Keep these consistent — don't mix durations. Recommendation: use `0.15s ease` for color changes (fast, snappy) and `0.2s ease` for spatial changes like border-color and transforms (slightly more gradual to avoid flickering).

---

## Section Order (Final)

For reference, the final page structure top to bottom:

1. `<nav class="nav">` — sticky navigation bar
2. `<header class="hero">` — hero with badge, headline, subhead
3. `<section class="tools" id="tools">` — tools grid (new)
4. `<section class="roster" id="roster">` — team roster cards
5. `<section class="how-it-works" id="how">` — workflow steps
6. `<footer class="footer">` — footer

---

## CSS File Organization

Per the tech approach, all styles stay in `css/styles.css`. Add new sections in this order:

1. Design Tokens (`:root`) — update existing
2. Reset & Global — add `html` smooth scroll, global focus rule
3. Container — no changes
4. Section Headers — no changes (tokens handle colors)
5. **Navigation Bar (new)**
6. Hero — minor token overrides
7. **Tools Section (new)**
8. Team Roster — hover state update, avatar/name/role color overrides
9. How It Works — connecting line color update, title color override
10. Footer — background, border, and color updates
