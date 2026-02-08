# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting the significant cross-project technical decisions made across TeamHQ.

## Index

| # | Title | Status | Summary |
|---|-------|--------|---------|
| [001](001-vanilla-js-for-landing-page.md) | Plain HTML/CSS for the Landing Page | Accepted | No framework for the landing page -- plain HTML, CSS, and vanilla JS. React, Astro, and Tailwind rejected as overkill for a single static page. |
| [002](002-express-typescript-for-backends.md) | Express + TypeScript for All Backends | Accepted | Express 5 + TypeScript + tsx for every backend service. Same stack across projects to reduce context-switching. |
| [003](003-json-file-storage.md) | JSON File Storage Over Database | Accepted | One JSON file per entity on disk, no database. Sufficient for single-user, low-volume tools. SQLite and PostgreSQL rejected as overkill. |
| [004](004-client-side-pdf-processing.md) | Client-Side PDF Processing | Accepted | PDF tools run 100% in the browser using pdf-lib and pdf.js via CDN. No server, no file uploads. Privacy and simplicity over server-side processing. |
| [005](005-vite-react-for-interactive-tools.md) | Vite + React for Interactive Tools | Accepted | React only when interactivity demands it (OST tool's tree visualization). Vanilla JS for everything else. |
| [006](006-npm-workspaces-for-fullstack.md) | npm Workspaces for Full-Stack Tools | Accepted | Co-locate frontend and backend with npm workspaces. One `npm run dev` starts both via concurrently, Vite proxy handles /api routing. |
| [007](007-single-file-tools-pattern.md) | Single-File Tools Pattern | Accepted | Standalone browser tools are a single `index.html` with embedded CSS/JS and CDN libraries. No build step, no framework, no package.json. |

## Writing New ADRs

When making a cross-project technical decision, create a new ADR following the template:

```markdown
# ADR-NNN: Title

**Status:** Accepted
**Date:** YYYY-MM-DD
**Decision maker:** [Agent name]

## Context
## Decision
## Alternatives Considered
## Consequences
```

Keep ADRs short (20-40 lines). The "Alternatives Considered" section is the most valuable -- document what else was on the table and why it was rejected.
