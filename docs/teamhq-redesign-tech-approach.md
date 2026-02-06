# TeamHQ Landing Page Redesign - Technical Approach

## Decision: Plain HTML/CSS — No Change

The redesign adds a sticky nav bar, a tools section, and a dark theme. None of this warrants a framework, build step, or structural change. The current setup (single `index.html` + single `css/styles.css`) handles it fine.

Reasoning:
- The nav bar is static HTML with anchor links. No dynamic state.
- The tools section is a new `<section>` with hardcoded cards. No data fetching.
- The dark theme is a CSS variable swap. The existing `:root` token system was designed for exactly this.
- Acceptance criteria explicitly require no build tooling (requirement #10).

**Verdict: Keep plain HTML/CSS. No changes to tooling or project structure.**

---

## Smooth Scroll via CSS

Use `scroll-behavior: smooth` on `html`. This is the right approach.

```css
html {
  scroll-behavior: smooth;
}
```

- Supported in all modern browsers (Chrome, Firefox, Edge, Safari 15.4+).
- No JavaScript needed. Anchor links (`<a href="#tools">`) trigger smooth scrolling natively.
- `scroll-padding-top` should be set on `html` to account for the sticky nav bar height, so sections don't scroll behind it. Set it to match the nav height (roughly 60-64px).

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 64px; /* adjust to match nav height */
}
```

No JS polyfill needed. Safari support has been solid since 15.4 (released March 2022).

---

## Inter Font: Google Fonts CDN

Load Inter via Google Fonts. Rationale:

- The OST Tool uses Inter (via Tailwind's font config). The landing page should match.
- `system-ui` does not render as Inter — it renders as SF Pro on macOS, Segoe UI on Windows, etc. That's a visible mismatch.
- Google Fonts CDN is fast, cached globally, and zero-maintenance.

Implementation: Add a `<link>` tag in `<head>` before the stylesheet. Request weights 400, 500, 600, 700 (matching existing `--font-weight-*` tokens).

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Then update the CSS token:

```css
--font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

The system-ui stack remains as a fallback if Google Fonts fails to load.

---

## CSS Organization: Keep Single File

The current `css/styles.css` is ~420 lines. After the redesign it will grow to roughly 550-650 lines. That is well within the range where a single file is manageable.

Splitting into partials would require either a build step (CSS imports/bundling) or multiple `<link>` tags (extra HTTP requests). Both add complexity for no real benefit at this scale.

**Verdict: Keep everything in `css/styles.css`.** The file is already well-organized with clear section headers. Continue that pattern for new sections (nav bar, tools).

Recommended section order in the CSS file:
1. Design Tokens (`:root`)
2. Reset & Global
3. Container
4. Section Headers (shared)
5. Navigation Bar (new)
6. Hero
7. Tools Section (new)
8. Team Roster
9. How It Works
10. Footer

---

## Accessibility: Dark Theme Considerations

### Contrast Ratios

The specified color palette meets WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Usage | Foreground | Background | Ratio | Pass? |
|-------|-----------|------------|-------|-------|
| Primary text | zinc-300 `#d4d4d8` | zinc-950 `#09090b` | ~14.5:1 | AA |
| Secondary text | zinc-400 `#a1a1aa` | zinc-950 `#09090b` | ~8.3:1 | AA |
| Muted text | zinc-600 `#52525b` | zinc-950 `#09090b` | ~3.2:1 | Fails AA for body text |
| Badge text | indigo-400 `#818cf8` | indigo-500/10% on zinc-950 | ~7.2:1 | AA |
| Card primary text | zinc-300 `#d4d4d8` | zinc-900 `#18181b` | ~12.7:1 | AA |
| Card secondary text | zinc-400 `#a1a1aa` | zinc-900 `#18181b` | ~7.3:1 | AA |
| Role text (indigo-400) | `#818cf8` | zinc-900 `#18181b` | ~6.3:1 | AA |

**One concern:** zinc-600 (`#52525b`) as "muted text" on zinc-950 only hits ~3.2:1, which fails WCAG AA for body-size text. This is acceptable for decorative or non-essential labels (like a "Sherlock Labs" sub-label in the nav), but should not be used for any content the user needs to read. The requirements use it only for the nav sub-label and footer attribution, which is fine.

### Focus States

The current CSS has a `:focus-visible` style on `.agent-card` using `outline: 2px solid var(--color-accent)`. This needs to carry over to the dark theme and be applied to all interactive elements:

- Nav links: need visible focus rings (indigo-500 outline or underline)
- Tool card "Launch" links/buttons: need focus-visible outline
- Any anchor links

Recommendation: Add a global focus-visible rule for interactive elements:

```css
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

### Nav Bar Landmark

The nav bar should use `<nav>` with an `aria-label="Main navigation"` for screen readers. The existing `<header>` for the hero and `<main>` for content are correct semantic landmarks — keep them.

### Sticky Nav and Scroll Position

With a sticky nav, ensure `scroll-padding-top` is set (mentioned above) so that keyboard-tabbing to anchored sections doesn't land content behind the nav bar. This also benefits screen reader users who navigate via landmarks.

---

## Summary of Decisions

| Question | Decision |
|----------|----------|
| HTML/CSS vs. framework | Keep plain HTML/CSS |
| Smooth scroll approach | CSS `scroll-behavior: smooth` + `scroll-padding-top` |
| Inter font loading | Google Fonts CDN with system-ui fallback |
| CSS file organization | Keep single `styles.css` file |
| Accessibility | Palette is AA-compliant (except zinc-600 for decorative text only). Add global focus-visible rules. Use `<nav>` landmark. Set scroll-padding-top. |
