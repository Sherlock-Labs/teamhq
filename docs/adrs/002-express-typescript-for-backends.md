# ADR-002: Express + TypeScript for All Backends

**Status:** Accepted
**Date:** 2025-02
**Decision maker:** Andrei (Technical Architect)

## Context

The OST tool needed a backend API server for tree generation, debates, and recommendations (with Claude CLI integration). Later, TeamHQ itself needed a backend for project management CRUD and live agent session streaming. We needed to pick a server framework and language for both.

## Decision

Express 5 + TypeScript + tsx (for dev watch mode) for every backend service. Zod for request/response validation. Same stack across all projects to reduce context-switching. Each backend is a standalone Express server in its own directory (`ost-tool/server/`, `server/`) with its own `package.json`.

## Alternatives Considered

- **Fastify** -- Rejected. Fastify is faster and has built-in schema validation, but the team is more familiar with Express. Performance is irrelevant for single-user local tools. Express 5's async error handling closes the main gap.
- **Hono** -- Rejected. Lightweight and modern, but less ecosystem support and the team would need to learn new patterns. Express's middleware ecosystem (cors, body parsing) is battle-tested.
- **Plain Node `http` module** -- Rejected. No routing, no middleware, no body parsing out of the box. Express adds minimal overhead while saving significant boilerplate.
- **Python (Flask/FastAPI)** -- Rejected. The frontend is JavaScript, the CLI tools are Node-based, and the team thinks in TypeScript. Mixing languages adds context-switching cost with no benefit.

## Consequences

- **Positive:** Same mental model across all backends. Any team member who worked on the OST tool backend can work on the TeamHQ backend immediately.
- **Positive:** Zod provides runtime type safety for both API inputs and AI-generated JSON (critical for Claude CLI integration in the OST tool).
- **Positive:** tsx gives instant dev reloads with zero config -- no `tsc` watch + nodemon setup.
- **Trade-off:** Express 5 is still in pre-release (as of our adoption). We haven't hit issues, but it's worth noting.
