# Session Introspection Phase 2-3 Requirements

**Author:** Thomas (PM)
**Date:** 2026-02-07
**Status:** Requirements complete
**Depends on:** Phase 1 (agent awareness + event grouping) — shipped

---

## Context

Phase 1 gave us agent banners, semantic event rendering, and event grouping in the session log. The multi-turn session runner architecture was designed in a separate workstream. These next two phases add **observability panels** around the session log so the CEO can see at a glance: where the project is in the pipeline, who is working, and what was produced.

All data for these features is already in the event stream. No backend changes are required. This is entirely frontend work — parsing events that are already streaming and rendering derived state above and beside the session log.

---

## Phase 2: Pipeline Phase Indicator + Team Activity Panel

### Feature 2.1: Pipeline Phase Indicator

**What:** A horizontal step indicator above the session log showing where the project is in the standard team workflow. Steps: **Research** > **Scoping** > **Architecture** > **Design** > **Implementation** > **QA**

**Why:** The CEO currently has to scroll through the session log and read agent banners to figure out where the project is. The phase indicator answers "what stage is this project in?" at a glance.

**How it works:**

- The phase is inferred from which agents have been spawned (via `Task` tool_use events already tracked by `activeAgents` and `currentAgent`)
- Phase mapping:
  - **Research**: `market-researcher` (Suki) or `tech-researcher` (Marco) spawned
  - **Scoping**: `pm` (Thomas) spawned
  - **Architecture**: `arch` (Andrei) or `ai-engineer` (Kai) spawned
  - **Design**: `designer` (Robert) spawned
  - **Implementation**: `fe` (Alice) or `be` (Jonah) spawned
  - **QA**: `qa` (Enzo) spawned
- The current phase is the **most recently entered** phase. Previous phases show as completed (checkmark or filled style). Future phases show as upcoming (muted).
- If no agents have been spawned yet (pre-team-create), the indicator shows all phases as upcoming.
- Not all projects use all phases. Research and Architecture may be skipped. The indicator should still show all six steps but mark the current one based on what agents appear. Skipped phases stay as "upcoming" — they don't retroactively fill in.

**Location:** Above the session log, below the session controls. Inside `session-log-container`, rendered as part of `renderSessionLog()` or injected above it.

**Interaction:** Static display. No clicks. The phases are informational only.

**Edge cases:**
- Agent spawned in non-standard order (e.g., QA before Design): Show the latest-spawned phase as current. Don't try to enforce linear order — the data is the source of truth.
- Multiple agents in the same phase (Alice + Jonah both in Implementation): Phase stays as Implementation. No duplication.
- Phase indicator resets when session disconnects/reconnects (same as all agent tracking state).

### Feature 2.2: Team Activity Panel

**What:** A compact sidebar or panel showing all agents that have been spawned in this session, their current status, and what they're working on.

**Why:** The CEO needs to know at a glance: who has been involved, who is currently active, and who is done. Currently this requires scrolling through the session log looking for agent banners and waiting indicators.

**How it works:**

- Track agent lifecycle from events:
  - `Task` tool_use with known agent name -> agent **spawned** (status: working)
  - `TaskOutput` for that agent's task -> agent's work is being **awaited** (status: working)
  - `SendMessage` from an agent back to team-lead -> agent likely **reporting** (status: working)
  - `tool_result` for a `TaskOutput` -> agent's work was **received** (status: done)
  - Session ends -> all agents done
- Each agent entry shows:
  - Avatar (20px, from `AGENT_REGISTRY`)
  - Name
  - Role (smaller, muted)
  - Status indicator: **working** (animated dot/spinner) or **done** (checkmark/static dot)
  - Task summary (truncated from the `Task` tool_use `input.description`, same data as the agent banner)
- Agents appear in the panel **in the order they were spawned**. New agents append to the bottom.
- If no agents have been spawned yet, the panel is hidden (don't show an empty panel).

**Location:** Positioned above the session events list, below the phase indicator. Not a sidebar — the session log is already in a constrained-width container inside the project card detail. A sidebar would fight for horizontal space. Instead, render it as a collapsible section that sits between the phase indicator and the event stream.

**Interaction:**
- Collapsible (defaults to expanded for live sessions, collapsed for historical sessions). Uses the same expand/collapse pattern as event groups.
- No agent click actions in this phase.

**Edge cases:**
- Unknown agent name: Show raw slug, no avatar, generic status.
- Agent spawned multiple times in one session: Update existing entry, don't duplicate.
- Very long sessions with many agents (unlikely in current workflow): Scrollable list, max-height.

---

## Phase 3: Deliverables Sidebar

### Feature 3.1: File Tracker

**What:** A panel that tracks files created or modified during the session, extracted from `Write` and `Edit` tool_use events.

**Why:** Right now, files produced by agents are buried in `tool_use` events with long file paths and tool result outputs. The CEO has to scroll through the log to find what was actually produced. This surfaces deliverables — the actual outputs of the session — in one place.

**How it works:**

- Monitor the event stream for:
  - `Write` tool_use: `input.file_path` -> file was created/overwritten
  - `Edit` tool_use: `input.file_path` -> file was modified
- Build a deduplicated list of file paths with metadata:
  - File path (relative to project root if possible, full path as fallback)
  - Action: **created** (first `Write` to this path) or **modified** (subsequent `Write` or any `Edit`)
  - Agent: which agent produced it (from `currentAgent` at time of event)
  - Time: when the event occurred
  - Edit count: how many times this file was touched (Write/Edit combined)
- Group files by category (inferred from path/extension):
  - **Docs**: `docs/*.md`, `*.md` files
  - **Code**: `js/*.js`, `css/*.css`, `server/**/*.ts`, `*.json` (excluding data files)
  - **Data**: `data/**/*.json`
  - **Config**: `package.json`, `tsconfig.json`, etc.
  - **Other**: anything else
- Files appear in reverse chronological order within each category (most recently touched first).

**Location:** Same position pattern as Team Activity — a collapsible section below the Team Activity panel (or below the phase indicator if Team Activity is hidden). Lives above the event stream.

**Interaction:**
- Collapsible (defaults to collapsed, both live and historical).
- Each file entry is **not clickable** in this phase — we don't have a file viewer. But the path is displayed in a copyable format (monospace, full path).
- The panel header shows a count badge: "Deliverables (7 files)"

**Edge cases:**
- Same file written by multiple agents: Show latest agent, accumulate edit count.
- Very long paths: Truncate from the left (show `.../{dir}/{filename}`) — the filename is the most important part.
- Agent reads a file then writes a modified version: Only `Write`/`Edit` events count. `Read` events don't create deliverables.
- Files in `data/tasks.json` (work logging): Include these — they're legitimate deliverables.
- Extremely large number of files (50+): Show first 20 with a "Show all" toggle.

---

## What's In Scope

- Pipeline phase indicator (static, inferred from spawned agents)
- Team activity panel (live agent tracking with status)
- File deliverables panel (extracted from Write/Edit events)
- All three render above the session event stream
- All three reset when session disconnects/changes
- All three work for both live and historical sessions (historical sessions replay events, so the state builds up the same way)

## What's Out of Scope / Deferred

- Clicking deliverables to open/view file contents
- Agent-to-agent communication graph or visualization
- Session cost/token tracking (the `result` event has `cost_usd` but we're not surfacing it yet)
- Real-time agent progress bars (would need sub-task granularity)
- Persisting phase/activity/deliverables state server-side (it's all derived from events client-side)
- Phase indicator customization (adding/removing phases per project)

---

## Acceptance Criteria

### Phase 2

- [ ] Pipeline phase indicator renders above the session log for live and historical sessions
- [ ] Phase updates automatically as agents are spawned during live sessions
- [ ] Current phase is visually distinct from completed and upcoming phases
- [ ] Team activity panel shows all spawned agents with name, role, avatar, status, and task
- [ ] Agent status updates from "working" to "done" when their work is received
- [ ] Panel is collapsible with consistent expand/collapse UX
- [ ] No new backend changes or API calls required
- [ ] Phase indicator and activity panel reset correctly when switching sessions
- [ ] Works correctly for historical session replay (not just live)

### Phase 3

- [ ] Deliverables panel tracks files from Write and Edit events
- [ ] Files are deduplicated (same file appears once, edit count accumulates)
- [ ] Files are grouped by category (Docs, Code, Data, Config, Other)
- [ ] Each entry shows file path, action, agent, and edit count
- [ ] Panel shows count badge in header
- [ ] Collapsible, defaults to collapsed
- [ ] Works for both live and historical sessions
- [ ] Long file paths are truncated sensibly (filename always visible)

---

## Technical Constraints

- **No backend changes.** All data comes from the existing SSE event stream. No new endpoints, no schema changes, no server-side state.
- **Vanilla JS.** Consistent with the existing `projects.js` — no frameworks, no build step.
- **Existing design system.** Use zinc/indigo tokens, BEM naming, same spacing scale. No new colors or fonts.
- **Performance.** The phase indicator, activity panel, and deliverables tracker all build state incrementally from streaming events. Don't re-scan the full event array on every event — maintain running state like `currentAgent` and `activeAgents` already do.
- **DOM budget.** The session log already caps at 500 rendered events. These panels add a fixed number of elements (6 phases, up to ~12 agents, up to ~50 files) — negligible DOM overhead.

---

## Implementation Approach: Both Phases Together

Phases 2 and 3 should be implemented together. Reasons:

1. **Shared layout concern.** All three panels (phase indicator, team activity, deliverables) sit in the same location — above the session event stream. Designing and implementing them separately means Robert and Alice touch the same layout twice.

2. **Shared state tracking.** The file tracker (Phase 3) uses the same `currentAgent` state as the team activity panel (Phase 2). Building them together avoids re-learning the state model.

3. **Scope is small.** Each feature is a single new render function + incremental state tracking in `appendSessionEvent()`. Together, they're roughly the same scope as Phase 1 was.

4. **Testing is more efficient.** Enzo can validate all three panels in one pass with the same test sessions.

---

## Team Plan

| Order | Agent | Task | Blocked By |
|-------|-------|------|------------|
| 1 | Thomas (PM) | Requirements (this doc) | -- |
| 2 | Andrei (Arch) | Tech approach — state tracking, rendering architecture, panel layout strategy | Thomas |
| 3 | Robert (Designer) | Design spec — phase indicator, team activity panel, deliverables panel visual design | Thomas, Andrei |
| 4 | Alice (FE) | Implement all three panels in `js/projects.js` + `css/styles.css` | Thomas, Andrei, Robert |
| 5 | Robert (Design Review) | Lightweight visual check of implementation against spec | Alice |
| 6 | Enzo (QA) | Validate all acceptance criteria with live and historical sessions | Robert (review) |

No backend developer needed — this is entirely frontend. No researcher needed — no unknowns to investigate.

---

## Agent Instructions

### For Andrei (Tech Approach)

Read this requirements doc and the Phase 1 tech approach (`docs/session-introspection-tech-approach.md`). Design:

1. **State model extensions** — what new state variables are needed in `appendSessionEvent()` to track pipeline phase, agent lifecycle status, and file deliverables? Build on the existing `activeAgents`, `currentAgent` pattern.
2. **Rendering architecture** — where exactly do the three panels render in the DOM? How do they update incrementally as events stream in? Are they part of `renderSessionLog()` or separate functions called from `appendSessionEvent()`?
3. **Panel layout strategy** — these panels sit above the scrollable event stream. How do they interact with auto-scroll? Do they push the events down or are they sticky/fixed?
4. **Event-to-phase mapping** — define the exact logic for mapping agent spawns to pipeline phases. Handle non-linear spawn orders.

Write to `docs/session-introspection-p2-tech-approach.md`.

### For Robert (Design Spec)

Read this requirements doc, Andrei's tech approach, and the Phase 1 design spec (`docs/session-introspection-design-spec.md`). Design:

1. **Phase indicator** — horizontal step layout, current/completed/upcoming visual states, responsive behavior in the constrained project card width.
2. **Team activity panel** — agent list layout, status indicators, collapsible section styling, empty state.
3. **Deliverables panel** — file list with category grouping, count badge, collapsible styling, file entry layout.
4. **Visual hierarchy** — how the three panels stack above the event stream without overwhelming it. The event stream is still the primary content.

Write to `docs/session-introspection-p2-design-spec.md`.

### For Alice (Implementation)

Read this requirements doc, Andrei's tech approach, and Robert's design spec. Implement all three panels in `js/projects.js` and `css/styles.css`. No new files.

### For Enzo (QA)

Read this requirements doc and acceptance criteria. Test with:
1. A live session with a full agent pipeline (PM -> Arch -> Designer -> FE/BE -> QA)
2. A historical session replay
3. Edge cases: no agents spawned, single agent, non-linear agent order, many files modified
4. Verify panels reset correctly when switching between sessions
5. Verify collapsible panels work (expand/collapse)
