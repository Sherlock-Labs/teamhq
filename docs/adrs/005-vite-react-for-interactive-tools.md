# ADR-005: Vite + React for Interactive Tools

**Status:** Accepted
**Date:** 2025-02
**Decision maker:** Andrei (Technical Architect)

## Context

The OST tool required an interactive tree visualization with node expansion/collapse, drag interactions, and complex state management (debates, recommendations). The landing page and PDF tools are primarily static content with light interactivity. We needed a consistent policy for when to use a framework versus vanilla JS.

## Decision

Use React (with Vite as the build tool) only when the interactivity demands it. The OST tool uses React because React Flow (the tree visualization library) requires component state and a React runtime. Everything else -- the landing page, PDF tools, project management UI -- uses vanilla JS because DOM manipulation with fetch and template literals is sufficient.

## Alternatives Considered

- **React everywhere** -- Rejected. Migrating the landing page to React would mean rebuilding the hero, tools, roster, and how-it-works sections as React components for zero functional benefit. The PDF tools would need a build step they don't currently require.
- **Vue or Svelte for the OST tool** -- Rejected. React Flow is a React library with no equivalent in Vue/Svelte that matches its feature set. Choosing Vue/Svelte would mean building tree visualization from scratch with D3, which is significantly more work.
- **D3 instead of React Flow** -- Rejected for the OST tool. React Flow provides built-in node/edge management, layout algorithms, and interaction handling. D3 would require implementing all of this manually. React Flow's React dependency is the cost of using it, but it's worth it.
- **Vanilla JS for the OST tool** -- Rejected. The tree visualization has component state (expanded/collapsed nodes, selected items, debate views), real-time updates, and conditional rendering. Template literals and manual DOM diffing would be fragile and hard to maintain.

## Consequences

- **Positive:** Each tool uses the minimum technology it needs. No framework overhead where it's not needed.
- **Positive:** The landing page and PDF tools load instantly with no JavaScript bundle to parse.
- **Positive:** React Flow provides a polished tree visualization that would have taken weeks to build from scratch.
- **Trade-off:** Two different frontend paradigms (React vs. vanilla JS) across the project. Developers need to context-switch. Acceptable because the tools are independent -- you work on one at a time.
