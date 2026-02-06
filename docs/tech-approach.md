# Tech Approach: TeamHQ Landing Page

## Decision

**Plain HTML + CSS. No build tools, no frameworks, no JavaScript framework.**

A single `index.html` with an inline or linked CSS file. If any interactivity is needed (e.g., a subtle animation or hover state), vanilla JS in a `<script>` tag or small linked file.

## Rationale

This is one page displaying static content (team roster, project description). There is nothing here that benefits from React, Astro, Tailwind, or any build step:

- **No routing** -- single page
- **No dynamic data** -- the team roster is hardcoded content
- **No component reuse** -- one page means no component library payoff
- **No build/deploy complexity** -- open `index.html` in a browser and it works

Adding a framework or build tool would cost more in setup, dependencies, and maintenance than it saves. The boring approach is the right approach here.

## File Structure

```
teamhq/
  index.html          # The landing page (markup + content)
  css/
    styles.css        # All styles
  assets/
    (any images, icons, or SVGs as needed)
  docs/
    tech-approach.md  # This file
  .claude/
    agents/           # Agent definitions (existing)
```

## Conventions

- **CSS**: Use CSS custom properties (variables) for colors, fonts, and spacing so the Designer's specs are easy to apply consistently.
- **Responsive**: Use modern CSS (flexbox, grid, clamp(), media queries) for responsive layout. Mobile-first.
- **Semantic HTML**: Use `<header>`, `<main>`, `<section>`, `<footer>` appropriately.
- **No external dependencies**: No CDN links, no npm packages. Everything is self-contained.
- **Fonts**: Use system font stack (`system-ui, -apple-system, ...`) unless the Designer specifies a web font. If a web font is needed, load it via a `<link>` to Google Fonts -- that's the one acceptable external dependency.

## Dev Workflow

```bash
# Open in browser -- that's it
open index.html

# Or use any local server if you prefer live reload:
python3 -m http.server 8000
# Then visit http://localhost:8000
```

No install step. No build step. No package.json.

## What This Decision Does NOT Cover

If TeamHQ later grows beyond a single landing page (e.g., interactive dashboards, agent management UI), we would revisit this decision and likely adopt a framework. But that is a future problem for a future scope.
