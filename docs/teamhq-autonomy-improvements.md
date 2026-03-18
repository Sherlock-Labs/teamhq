# TeamHQ Autonomy — Prioritized Improvement Roadmap

**Author:** Thomas (PM)
**Date:** 2026-03-18
**Source:** Custom Meeting #26 — Autonomy Brainstorm (Thomas, Robert, Suki, Ravi, Andrei, Marco)

---

## North Star

> The CEO wakes up, checks their phone, sees: "TeamHQ shipped two bug fixes overnight, started a new project based on your Tuesday directive, and has three decisions waiting for your approval." Every improvement below is measured against: *does this get us closer to that morning?*

## Improvement Matrix

| # | Improvement | Impact | Effort | Priority | Track |
|---|-------------|--------|--------|----------|-------|
| 1 | Autonomy Dashboard — Morning Briefing | High | Medium | P0 | Full pipeline |
| 2 | System Health Checks | High | Low | P0 | Lightweight |
| 3 | Persistent Workflow State | High | Medium | P0 | Full pipeline (arch-first) |
| 4 | Directive Queue with Status Tracking | High | Low | P1 | Lightweight |
| 5 | Smart Notification Tiers | Medium | Medium | P1 | Full pipeline |
| 6 | Auto-Retry with Graceful Degradation | High | Medium | P1 | Lightweight |
| 7 | Automatic Memory Writes from Retrospectives | Medium | Low | P1 | Lightweight |
| 8 | Batch Review Approval | Medium | Low | P2 | Lightweight |
| 9 | Pipeline Templates | Medium | Medium | P2 | Full pipeline |
| 10 | Conflict Detection & File Locking | Medium | Medium | P2 | Arch-first |
| 11 | Failure Alerting | Medium | Low | P2 | Lightweight |
| 12 | Natural Language Project Kickoff | High | High | P3 | Full pipeline |
| — | Proactive Work Detection | High | High | P3 | Full pipeline |

---

## P0 — Build First

These are prerequisites. The CEO can't trust more autonomy without visibility, and the system can't support multi-heartbeat work without state persistence.

### 1. Autonomy Dashboard — Morning Briefing
**Impact: High | Effort: Medium | Owner: Robert (design) → Alice (build)**

Replace the raw heartbeat log view with a proper "morning briefing" dashboard. The CEO opens TeamHQ and gets a 30-second scan: what happened, what needs attention, what's next. Key sections: status summary (green/yellow/red), pending decisions and reviews, recent completions, active pipelines, and a timeline of agent activity. Decisions should be clickable — drill into the meeting transcript, the code diff, the full reasoning. This is the highest-leverage UX improvement and a prerequisite for granting more autonomy. Robert sketches the concept; Alice builds it on the existing autonomy.html page.

**Pipeline:** Thomas (scope) → Robert (design sketch) → Andrei (quick tech check) → Alice (build) → Robert (review) → Enzo (QA)

### 2. System Health Checks
**Impact: High | Effort: Low | Owner: Andrei (design) → Jonah (build)**

A single `/api/health` endpoint that checks all system dependencies: Claude CLI available, cron running, MCP memory server responding, API server up, heartbeat last ran within expected window. Surface this on the autonomy dashboard as a green/yellow/red status indicator. Without this, debugging failed heartbeats requires manual log inspection. Low effort (a few hours), foundational for all future autonomy work.

**Pipeline:** Lightweight — Andrei spec (1 paragraph) → Jonah builds → Enzo spot-check

### 3. Persistent Workflow State
**Impact: High | Effort: Medium | Owner: Andrei (arch) → Jonah (build)**

The heartbeat runner is currently stateless — each heartbeat starts fresh with no memory of what it was doing. This makes multi-heartbeat pipelines impossible. Add a "workflow cursor" — a JSON file that persists between heartbeats, tracking: current plan, in-flight agent sessions, pending actions, completed steps, and what to do next. Thomas reads this cursor at heartbeat start and picks up where he left off instead of re-evaluating from scratch. No external dependencies — just a JSON file managed by the heartbeat runner. Andrei designs the state model; Marco evaluates FSM patterns to inform the approach.

**Pipeline:** Marco (pattern eval) → Andrei (arch sketch) → Jonah (build) → Atlas (review) → Enzo (QA)

---

## P1 — Build Next

These amplify the P0 foundation. Better CEO communication, better resilience, better learning.

### 4. Directive Queue with Status Tracking
**Impact: High | Effort: Low | Owner: Robert (design) → Alice (build)**

The CEO inbox is currently a dumb text field. Directives go in but there's no confirmation, no status, no "your directive was picked up." Replace with a proper queue: each directive gets a status indicator — queued, picked up, acting on it, completed. The CEO can see exactly where their request is in the system. This reduces anxiety and builds trust. Mostly frontend work — the backend data (CEO inbox JSON, event log) already exists.

**Pipeline:** Lightweight — Robert (quick UX sketch) → Alice (build) → Enzo (spot-check)

### 5. Smart Notification Tiers
**Impact: Medium | Effort: Medium | Owner: Robert (design) → Jonah (build)**

Not all notifications are equal. "Pipeline blocked, need your input" is urgent. "Retrospective complete" is informational. Currently, agents post to `#agent-updates` without prioritization. Design a notification system with tiers: urgent (surfaces immediately — Slack DM or push), important (appears prominently on dashboard), and informational (batched into a digest). This prevents notification fatigue while ensuring critical items get seen.

**Pipeline:** Thomas (scope) → Robert (design) → Jonah (build) → Alice (dashboard integration) → Enzo (QA)

### 6. Auto-Retry with Graceful Degradation
**Impact: High | Effort: Medium | Owner: Andrei (design) → Jonah (build)**

When an agent session fails (Claude timeout, CLI crash, network issue), the system currently logs it and moves on. Add automatic retry with exponential backoff: first retry after 30s, second after 2 min, third after 10 min. If all retries fail, create a review for the CEO explaining what broke and why. Extend the existing Opus→Sonnet model fallback to all agent spawning, not just meetings. The meeting runner already has partial fallback logic — generalize it.

**Pipeline:** Lightweight — Andrei (spec) → Jonah (build) → Enzo (spot-check)

### 7. Automatic Memory Writes from Retrospectives
**Impact: Medium | Effort: Low | Owner: Kai (design) → Jonah (build)**

When a pipeline completes and Yuki runs a retrospective, the insights live in a markdown file that nobody reads again. Add a post-retrospective step that extracts patterns, decisions, and lessons and writes them to MCP team memory as searchable entities. Every future project benefits from accumulated knowledge without agents having to manually search. Kai designs the extraction prompt; Jonah adds the memory write integration to the pipeline.

**Pipeline:** Lightweight — Kai (prompt design) → Jonah (build) → Enzo (spot-check)

---

## P2 — Polish and Harden

These are valuable but not blocking. Build as capacity allows.

### 8. Batch Review Approval
**Impact: Medium | Effort: Low | Owner: Alice**

The reviews page works but requires clicking into each review individually. Add a batch mode: show all pending reviews on one screen with approve/reject buttons inline. The CEO should be able to clear their review queue in 60 seconds, not 5 minutes. Purely frontend — the review API already supports individual approve/reject.

**Pipeline:** Lightweight — Alice (build) → Robert (eyeball) → Enzo (spot-check)

### 9. Pipeline Templates
**Impact: Medium | Effort: Medium | Owner: Thomas (define) → Jonah (build)**

Thomas currently reconstructs the pipeline order mentally for each project. Define named templates: "full pipeline" (research → scope → arch → design + backend → frontend → review → QA), "lightweight iteration" (scope → build → eyeball → spot-check), "frontend-only" (scope → design → frontend → review → QA), "research spike" (research → doc → done). Selecting a template auto-generates work items with the right agent assignments and dependencies. Thomas picks a template, adjusts if needed, and goes.

**Pipeline:** Thomas (define templates) → Jonah (API + data model) → Alice (UI in project creation) → Enzo (QA)

### 10. Conflict Detection & File Locking
**Impact: Medium | Effort: Medium | Owner: Andrei (design) → Jonah (build)**

When two agents (or two heartbeats) touch the same file simultaneously, race conditions occur. Add a lightweight file locking mechanism: before an agent starts work, it registers a lock on the files it plans to modify. Other agents check locks before starting. Not bulletproof (semantic conflicts still possible), but catches the obvious collisions. Locks auto-expire after a timeout to prevent deadlocks.

**Pipeline:** Andrei (arch) → Jonah (build) → Atlas (review) → Enzo (QA)

### 11. Failure Alerting
**Impact: Medium | Effort: Low | Owner: Jonah**

If a heartbeat fails twice in a row, or the system can't reach Claude for 15 minutes, send an alert. Could be a Slack DM to the CEO, an email, or a push notification to the mobile app. The CEO shouldn't have to check the dashboard to discover the system is down. Builds on the health check endpoint (#2) — adds monitoring logic and notification dispatch.

**Pipeline:** Lightweight — Jonah (build) → Enzo (spot-check)

---

## P3 — Ambitious / Future

These fundamentally change how the CEO interacts with TeamHQ. Build after P0-P2 establish trust and infrastructure.

### 12. Natural Language Project Kickoff
**Impact: High | Effort: High | Owner: Ravi (vision) → Thomas (scope) → full pipeline**

Instead of opening Claude Code and typing prompts, the CEO opens TeamHQ in a browser, types "build me a tool that converts CSV to JSON," and the system handles everything: parse intent, create project, pick pipeline template, spawn Thomas, run the pipeline. This is the CEO inbox with superpowers. It's the biggest UX leap on this list but requires P0 (persistent state, dashboard) and P1 (directive queue, templates) to be in place first.

**Pipeline:** Full — Ravi (vision) → Thomas (scope) → Andrei (arch) → Kai (NLP design) → Robert (design) → Jonah + Alice → Enzo (QA)

### Proactive Work Detection (bonus — not numbered because it's aspirational)
**Impact: High | Effort: High | Staged delivery**

The system watches the event log, notices patterns — three bug reports in the same area, a stale task stuck for two days, a shipped project with no retrospective — and proactively proposes work. Not a notification, but a scoped proposal: "I noticed X, here's what I'd do, approve or reject." This is the ultimate autonomy feature. Build incrementally: first detect patterns and surface them on the dashboard, then generate proposals, then (eventually) execute automatically for low-risk items. Each stage requires the CEO to explicitly expand the trust boundary.

---

## Execution Approach

**Phase 1 (now):** P0 items (#1-3) plus supporting research. The 6 projects approved by the CEO (north star vision, workflow state eval, competitive scan, morning briefing sketch, persistent workflow arch, this roadmap) are the research and design foundation for P0.

**Phase 2 (after P0 ships):** P1 items (#4-7). These are mostly lightweight — they can run in parallel and several are pure frontend or pure backend.

**Phase 3 (as capacity allows):** P2 items (#8-11). These harden the system. Some can start earlier if they don't compete for the same agents.

**Phase 4 (after trust is established):** P3 items. Natural language kickoff and proactive detection are the endgame.

---

*This roadmap is a living document. Reprioritize as we learn from building P0. The north star is constant: the CEO wakes up, checks their phone, and everything is under control.*
