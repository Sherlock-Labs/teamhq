# ADR-003: JSON File Storage Over Database

**Status:** Accepted
**Date:** 2025-02
**Decision maker:** Andrei (Technical Architect)

## Context

Both the OST tool (session state) and TeamHQ (project management, session event logs) needed persistent data storage that survives server restarts. We needed to decide between a database and simpler alternatives.

## Decision

One JSON file per entity on disk, no database. Projects are stored as individual `{id}.json` files in `data/projects/`. Session metadata as `{sessionId}.json` sidecars. Session event logs as append-only NDJSON files (`{sessionId}.ndjson`). The filesystem is the database.

## Alternatives Considered

- **SQLite** -- Rejected. Adds a native dependency (`better-sqlite3` or similar) that complicates setup and cross-platform builds. For dozens of projects and low-volume reads/writes, filesystem I/O is fast enough. SQLite's benefits (queries, transactions, indexes) aren't needed at our scale.
- **PostgreSQL/MySQL** -- Rejected. Requires running a database server, managing connections, and handling migrations. Massive overkill for a single-user local tool.
- **Single JSON file for all entities** -- Rejected in favor of per-entity files. Individual files are safer (a write to one project can't corrupt another), reads of a single entity are O(1) instead of loading the entire collection, and diffs are cleaner in git.

## Consequences

- **Positive:** Zero infrastructure. No database server to install, configure, or manage. `npm install && npm run dev` and the data layer works.
- **Positive:** Human-readable. You can `cat` a project file and see its full state. Great for debugging.
- **Positive:** NDJSON for event logs is append-only and cheap -- perfect for streaming session events from Claude CLI.
- **Trade-off:** No query capability. Listing all projects means reading every file in the directory. At our scale (dozens, not thousands), this is fast enough.
- **Trade-off:** No concurrency protection. Two simultaneous writes to the same file could corrupt it. Acceptable for a single-user tool.
