# TPI-2: Pipeline Status Dashboard — Scope

**Track:** Lightweight iteration (Agreement #5)
**Owner:** Alice (build) → Robert (eyeball) → Enzo (spot-check)
**Date:** 2026-03-18

---

## What

Add a "Pipeline Status" section to `index.html` (the Dashboard page) that gives the CEO a 10-second scan of what's happening across all active projects. This is the first slice of the morning briefing vision (see `docs/teamhq-morning-briefing-design-sketch.md`).

## Why

The CEO currently has to check the Projects page, Reviews page, and Tasks page separately to understand what's moving and what needs attention. A dashboard summary eliminates that friction.

## What's In Scope

1. **Status banner** — A colored bar at the top of the dashboard content area. Green = nominal, amber = needs attention, red = blocked. Shows: pending review count, active project count, last heartbeat timestamp.

2. **Pending reviews list** — Inline cards for each pending review with project name, gate, agent, summary preview, and an "Open Review" link. This section is hidden when there are zero pending reviews.

3. **Active pipelines** — For each in-progress project, show: project name, current phase (which work item is in-progress), and a mini progress bar (completed tasks / total tasks).

4. **Recent completions** — Last 3-5 completed projects with completion date and a link to the project detail.

## What's Out of Scope (Deferred)

- Inline approve/reject (full morning briefing feature — later)
- Agent question response from dashboard
- Real-time updates / WebSocket push
- Health check integration (TPI-1 ships first, integrate later)

## Data Sources

All data already exists via these APIs — no new backend needed:
- `GET /api/reviews?status=pending` → pending reviews
- `GET /api/projects` → project list with status
- `GET /api/projects/:id/work-items` → task progress per project
- `GET /api/heartbeats` → last heartbeat timestamp (if available)

## Acceptance Criteria

- [ ] Status banner visible at top of dashboard with correct color state
- [ ] Pending reviews rendered with project name, gate, agent, summary
- [ ] Active pipelines show current task and progress fraction
- [ ] Recent completions show last 3-5 shipped projects
- [ ] Sections hide gracefully when empty (no "No data" placeholders)
- [ ] Matches existing TeamHQ visual style (JetBrains Mono, premium-shadow, subtle-label)
- [ ] Responsive — readable on mobile and desktop

## Technical Notes

- Plain HTML/CSS/vanilla JS — consistent with all TeamHQ pages
- Fetch from APIs on page load, no polling needed for v1
- Follow Robert's morning briefing sketch for visual direction (especially the status banner and left-border card pattern)
