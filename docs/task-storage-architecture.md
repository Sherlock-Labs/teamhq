# Task Storage Architecture Decision

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-09
**Status:** Recommendation

## The Problem

`data/tasks.json` is a single 58KB flat file. Every agent across every pipeline reads the whole file, modifies their entry, and writes it back. With two pipelines running concurrently (Custom Meetings and Project Tracking Improvements), the last writer wins and the other's changes are silently lost.

This is not a hypothetical risk. It is a guaranteed data loss scenario whenever two agents finish their pipeline stage within the same few-second window.

## Recommendation: Per-Project JSON Files (Option 2)

Split `data/tasks.json` into `data/tasks/{project-id}.json`. Each file contains one project object (the same shape as today, minus the `projects` wrapper array).

### Why This One

**It eliminates cross-project collisions entirely.** The Custom Meetings pipeline writes to `data/tasks/custom-meetings.json`. The Project Tracking pipeline writes to `data/tasks/project-tracking-improvements.json`. They never touch the same file. Since our pipelines are per-project and agents work sequentially within a pipeline, within-project collisions do not happen.

**It matches what already works.** The Express server already stores projects as per-file JSON in `data/projects/`. The meetings system stores per-meeting JSON in `data/meetings/`. This is the established pattern on this codebase. Boring is beautiful.

**Migration is trivial.** Read the existing file, loop over `projects`, write each one to `data/tasks/{id}.json`. Ten lines of code. The old file stays as an archive.

**Agent workflow change is minimal.** Agents currently do: read `data/tasks.json`, find their project, edit their task, write the whole file. New workflow: read `data/tasks/{project-id}.json`, edit their task, write it back. The edit target is smaller and scoped. Every agent profile references `data/tasks.json` and will need a one-line update to point at the per-project path.

**The landing page change is small.** `js/tasks.js` and `js/roster.js` currently `fetch('data/tasks.json')`. They would instead fetch a manifest or glob the directory. The simplest approach: add a `data/tasks/index.json` that lists project IDs, and the JS fetches each one. Or serve them through a lightweight Express endpoint that aggregates on read (reads are safe to aggregate; writes are where collisions happen).

### Why Not the Others

**SQLite (Option 1):** Already in the stack for team memory, yes, but the team memory MCP server is a separate process with its own protocol. Adding SQLite for task storage means either (a) agents learn to use SQL via a new tool, or (b) we build a new server endpoint and agents call it via curl/fetch. Both are bigger workflow changes than "write to a different file path." SQLite solves problems we don't have (complex queries, transactions across projects, high write throughput). We have 9 projects. This is a file management problem, not a database problem.

**Server API for writes (Option 3):** Correct in theory, but agents run as Claude CLI sessions with file I/O tools. They don't have an HTTP client in their natural workflow. Routing all task writes through Express means agents would need to `curl localhost:3002/api/tasks/...` instead of editing a file. That is a fundamental workflow change for every agent. It also makes the Express server a single point of failure for task logging, which is currently zero-dependency. Overkill for this problem.

**Hybrid approaches:** Not needed. The per-project split solves the actual collision vector (cross-project concurrent writes) with the smallest possible change. If we later need within-project concurrency (e.g., two agents writing to the same project simultaneously), we can add file-level locking or move to the API approach then. We don't have that problem today because pipeline stages are sequential within a project.

### Migration Plan

1. Create `data/tasks/` directory
2. Write a one-time script: read `data/tasks.json`, write each project to `data/tasks/{id}.json`
3. Add `data/tasks/index.json` listing all project IDs (for client-side aggregation)
4. Update `js/tasks.js` and `js/roster.js` to read from the new location
5. Update all 18 agent profiles to reference `data/tasks/{project-id}.json`
6. Update `CLAUDE.md` work logging convention
7. Keep `data/tasks.json` as a read-only archive (do not delete)

### What This Does Not Solve

- **Within-project write collisions.** If two agents on the same project try to update the same project file simultaneously, last-write-wins still applies. This does not happen today because pipeline stages are sequential, but it is worth naming. If it ever becomes a problem, file-level advisory locking (`flock`) or the API approach would be the next step.

### Decision

Per-project JSON files. Smallest change, eliminates the real collision vector, matches existing codebase patterns, requires no new infrastructure. Ship it.
