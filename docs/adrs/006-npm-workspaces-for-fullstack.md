# ADR-006: npm Workspaces for Full-Stack Tools

**Status:** Accepted
**Date:** 2025-02
**Decision maker:** Andrei (Technical Architect)

## Context

The OST tool has a Vite + React frontend and an Express backend that need to run together during development. The TeamHQ landing page later added its own Express backend for project management. We needed a project structure that co-locates frontend and backend with shared development scripts.

## Decision

Use npm workspaces with `/server` and `/client` packages (for the OST tool) or a root-level Vite config with a `/server` workspace (for TeamHQ). One `npm run dev` command starts both the Vite dev server and the Express API server via `concurrently`. Vite's dev proxy forwards `/api` requests to Express, eliminating CORS issues during development.

## Alternatives Considered

- **Separate repositories** -- Rejected. The frontend and backend are tightly coupled (shared types, same deployment). Separate repos would mean maintaining two git histories, two CI pipelines, and coordinating releases across repos. Overkill for tools with a single developer working on both.
- **Monorepo tools (Turborepo, Nx, Lerna)** -- Rejected. These add configuration complexity and learning curve for what is essentially two packages that need to `npm run dev` together. Plain npm workspaces + concurrently is simpler and sufficient.
- **Single package with both frontend and backend** -- Rejected. Mixing Vite config with Express server config in one `package.json` creates confusion about which scripts do what. Workspaces keep dependencies and scripts cleanly separated.

## Consequences

- **Positive:** One `npm run dev` starts everything. No need to open multiple terminals or remember multiple commands.
- **Positive:** Vite's `/api` proxy means the frontend can use relative paths (`/api/projects`) with zero CORS configuration.
- **Positive:** Shared `node_modules` at the workspace root reduces disk usage and ensures dependency consistency.
- **Trade-off:** npm workspaces have quirks (hoisting behavior, workspace-aware commands). The team has learned these and they're manageable.
