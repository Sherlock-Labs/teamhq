# ADR Log - Requirements

## Goal

Create a lightweight Architecture Decision Record (ADR) log that documents the cross-project technical decisions already made across TeamHQ, plus establishes a simple process for recording future decisions as they happen.

## Why

We have 5+ shipped projects with significant architectural decisions scattered across tech-approach docs, tasks.json entries, and CLAUDE.md notes. There is no single place to look up "why did we choose X over Y?" When a new project starts, Andrei and the team re-derive context that already exists. An ADR log gives us:

- A single canonical source for "we decided X because Y"
- Faster onboarding for new projects (read the ADRs, skip the archaeology)
- A record of what we considered and rejected, not just what we chose

This is a documentation project, not a tooling project. No code changes, no new features, no UI work.

---

## Scope

### In Scope

- An ADR directory at `docs/adrs/` containing one Markdown file per decision
- A lightweight ADR template (not heavyweight MADR or full RFC format)
- Retrospective ADRs for the 6-8 most significant cross-project decisions already made
- An index file (`docs/adrs/README.md`) listing all ADRs with one-line summaries
- A brief mention in `CLAUDE.md` pointing to the ADR directory so agents know it exists

### Out of Scope

- Tooling to generate or manage ADRs (no CLI tool, no automation)
- ADRs for per-project UI/design decisions (those belong in design specs)
- ADRs for team process decisions (those belong in CLAUDE.md)
- Changing any existing docs — the ADR log supplements, it doesn't replace tech-approach docs
- Any code changes

### Deferred

- A formal "when to write an ADR" policy (organic adoption first, formalize later if needed)
- ADRs for future decisions (the process is established, Andrei writes them as decisions happen)

---

## ADR Template

Each ADR is a Markdown file named `NNN-short-title.md` (e.g., `001-vanilla-js-for-landing-page.md`). The format:

```markdown
# ADR-NNN: Title

**Status:** Accepted
**Date:** YYYY-MM-DD
**Decision maker:** [Agent name]

## Context

What is the problem or situation that required a decision?

## Decision

What did we decide?

## Alternatives Considered

What else did we evaluate, and why did we reject it?

## Consequences

What are the implications — both positive and trade-offs?
```

That's it. Four sections plus metadata. No "compliance" fields, no approval chains, no status lifecycle beyond "Accepted" and (rarely) "Superseded."

---

## Retrospective ADRs to Write

These are the cross-project decisions worth documenting. They come from existing tech-approach docs and tasks.json records.

### ADR-001: Plain HTML/CSS for the Landing Page
- **Decision:** No framework for the TeamHQ landing page. Plain HTML, CSS, vanilla JS.
- **Source:** Landing page tech-approach, confirmed again during redesign
- **Key rationale:** Single static page, no routing, no component reuse, no dynamic data. React/Astro/Tailwind all rejected as overkill.

### ADR-002: Express + TypeScript for All Backends
- **Decision:** Express 5 + TypeScript + tsx for every backend service.
- **Source:** OST tool architecture, replicated in TeamHQ web management server
- **Key rationale:** Team familiarity, simple setup, sufficient for single-user tools. Same stack across projects reduces context-switching.

### ADR-003: JSON File Storage Over Database
- **Decision:** One JSON file per entity on disk, no database.
- **Source:** OST tool session store, TeamHQ project management data layer
- **Key rationale:** Single-user, low-volume, no concurrency concerns. Survives restarts, human-readable, zero infrastructure. A database would add complexity for no benefit at our scale.

### ADR-004: Client-Side PDF Processing
- **Decision:** PDF tools (Splitter, Combiner) run 100% in the browser using pdf-lib and pdf.js via CDN. No server.
- **Source:** PDF Splitter and PDF Combiner tech approaches
- **Key rationale:** Privacy (no file uploads to a server), simplicity (no backend needed), portability (works offline once loaded). Libraries are mature and well-supported.

### ADR-005: Vite + React for Interactive Tools, Vanilla JS for Static Pages
- **Decision:** Use React only when interactivity demands it (OST tool's tree visualization via React Flow). Keep vanilla JS for everything else.
- **Source:** OST tool vs. landing page architectural split
- **Key rationale:** React Flow requires component state and a real framework. The landing page, PDF tools, and management features don't. Avoid framework migration costs when DOM manipulation suffices.

### ADR-006: npm Workspaces for Full-Stack Tools
- **Decision:** Full-stack tools (OST tool) use npm workspaces with `/server` and `/client` packages.
- **Source:** OST tool package structure
- **Key rationale:** Co-locates frontend and backend with shared scripts (one `npm run dev`). Vite proxy forwards `/api` to Express during development. Avoids multi-repo complexity for tightly coupled frontend/backend.

### ADR-007: Single-File Tools Pattern
- **Decision:** Standalone browser tools (PDF Splitter, PDF Combiner) are a single `index.html` file in their own directory. No build step, no package.json, no framework.
- **Source:** PDF Splitter and PDF Combiner implementations
- **Key rationale:** Zero build complexity, instant loading, trivially deployable. Libraries loaded via CDN. One file = one tool. The landing page links directly to them.

---

## Acceptance Criteria

1. A `docs/adrs/` directory exists with the template and all retrospective ADRs listed above
2. Each ADR follows the template format: Context, Decision, Alternatives Considered, Consequences
3. Each ADR accurately reflects the decisions and rationale from existing project records (tech-approach docs, tasks.json)
4. A `docs/adrs/README.md` index lists all ADRs with number, title, status, and one-line summary
5. `CLAUDE.md` has a one-line addition pointing to `docs/adrs/` so agents know ADRs exist
6. No existing files are modified beyond the CLAUDE.md addition
7. The ADR content is factually accurate and matches what actually happened (Andrei should verify against his own tech-approach docs)

---

## Team Involvement

| Agent | Role | What they do |
|-------|------|-------------|
| **Andrei** (Technical Architect) | Primary author | Writes all 7 retrospective ADRs. He made these decisions and owns the rationale. |
| **Nadia** (Technical Writer) | Reviewer | Reviews ADRs for clarity, consistency, and completeness. Light editorial pass, not a rewrite. |

That's it. Two people. This is a low-priority documentation task, not a multi-agent project.

### Phasing

**Single phase.** No need to break this into increments — the total output is ~7 short Markdown files plus an index. Andrei writes them, Nadia reviews, done.

### Task Order

1. Andrei writes all ADRs and the index to `docs/adrs/`
2. Nadia reviews for clarity and consistency
3. Andrei addresses any feedback and adds the CLAUDE.md reference

---

## Notes

- Keep ADRs short. A good ADR is 20-40 lines, not 200. If it takes more than a page to explain, the decision was probably more complex than one ADR should cover — split it.
- "Alternatives Considered" is the most valuable section. The decision itself is usually obvious in hindsight. What makes ADRs useful is knowing what else was on the table and why it lost.
- Don't backfill ADRs for minor decisions (which CSS property to use, which port number). Only decisions that affect multiple projects or set a precedent worth referencing.
