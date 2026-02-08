# ADR-007: Single-File Tools Pattern

**Status:** Accepted
**Date:** 2025-02
**Decision maker:** Andrei (Technical Architect)

## Context

The PDF Splitter and PDF Combiner are standalone browser tools that don't need a backend. They use third-party libraries (pdf-lib, pdf.js, JSZip, SortableJS) but have no custom build requirements. We needed to decide on a project structure for these simple tools.

## Decision

Each standalone browser tool is a single `index.html` file in its own directory (e.g., `pdf-splitter/index.html`, `pdf-combiner/index.html`). All HTML, CSS, and JavaScript are embedded in that one file. Libraries are loaded via CDN. No `package.json`, no build step, no framework. The landing page links directly to each tool's `index.html`.

## Alternatives Considered

- **Vite + React per tool** -- Rejected. These tools have no component state, no routing, and no complex interactions that warrant a framework. A build step would add `node_modules`, a config file, and a build command for tools that work perfectly as plain HTML.
- **Shared component library across tools** -- Rejected. The tools share visual design (dark theme, zinc/indigo tokens) but not functional components. Duplicating the CSS tokens in each file's `<style>` block is simpler than maintaining a shared CSS build pipeline.
- **Multi-file structure (separate .css, .js files)** -- Rejected. A single file is easier to deploy (copy one file), easier to review (everything in one place), and has no relative-path issues. The combined file size is well under the point where splitting would improve load time.

## Consequences

- **Positive:** Absolute minimum complexity. Zero build step, zero dependencies to install, zero config files. Copy the directory to any static host and it works.
- **Positive:** Each tool is completely self-contained. Deleting the directory removes the entire tool with no orphaned references.
- **Positive:** CDN-loaded libraries mean the browser caches them globally -- shared across tools that use the same libraries (e.g., both PDF tools use pdf-lib).
- **Trade-off:** Design token duplication. If the dark theme tokens change, each tool's inline `<style>` needs updating separately. At our current tool count (2), this is manageable.
- **Trade-off:** CDN dependency. If CDN is unavailable, the tools can't load their libraries. Self-hosting would mitigate this but adds hosting complexity.
