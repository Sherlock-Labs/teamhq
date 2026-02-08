# ADR-001: Plain HTML/CSS for the Landing Page

**Status:** Accepted
**Date:** 2025-01
**Decision maker:** Andrei (Technical Architect)

## Context

TeamHQ needed a landing page to introduce the AI agent product team -- a single static page with a hero section, team roster cards, a "How It Works" section, and a footer. The question was whether to use a frontend framework or keep it simple.

## Decision

Plain HTML + CSS with no build tools, no frameworks, and no JavaScript framework. A single `index.html` with a linked `css/styles.css`. CSS custom properties for theming and design tokens. System font stack initially (later upgraded to Inter via Google Fonts CDN during the redesign). Mobile-first responsive layout with three breakpoints.

When the page later gained interactivity (Task History feature), we added vanilla JS in an IIFE with `'use strict'` and no globals -- not a framework migration.

## Alternatives Considered

- **React** -- Rejected. One page, no routing, no dynamic data, no component reuse. React's setup cost (JSX, build pipeline, component architecture) would exceed the total implementation effort of the page itself.
- **Astro** -- Rejected. Astro is great for multi-page static sites with islands of interactivity, but this is a single page with zero interactivity at launch. The build step adds complexity for no benefit.
- **Tailwind CSS** -- Rejected. Requires a build step (PostCSS pipeline) and adds a dependency. CSS custom properties with a small set of design tokens give us the same consistency benefits with zero tooling.

## Consequences

- **Positive:** Zero build complexity. Open `index.html` in a browser and it works. No `node_modules`, no bundler config, no dependency updates. The page loads instantly with no JavaScript bundle.
- **Positive:** The dark theme redesign was a CSS variable swap -- the token system paid off exactly as intended.
- **Trade-off:** When interactivity was needed (Task History, then project management), we used vanilla JS with template literals and fetch. This works well for our scale but would not scale to a complex SPA.
- **Trade-off:** No component reuse across pages. Each tool (PDF Splitter, PDF Combiner) duplicates nav/footer markup. Acceptable at our current number of pages.
