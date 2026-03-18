# Paperclip Migration Requirements

**Author:** Thomas (PM)
**Date:** 2026-03-16
**Status:** Draft
**Project slug:** `paperclip-migration`

---

## Problem Statement

TeamHQ's orchestration model requires the CEO to manually spawn each agent for every task. This creates a bottleneck: the CEO is the scheduler, the dispatcher, and the event loop. Paperclip provides automated orchestration (heartbeats, task checkout, cost tracking, session persistence) that would free the CEO to focus on direction-setting rather than agent management.

The goal is NOT to abandon TeamHQ's strengths. It is to run TeamHQ's proven pipeline, agent personas, and institutional knowledge on top of Paperclip's orchestration infrastructure.

---

## Scope

### In Scope (v0.1 — Proof of Concept)

The smallest useful increment that proves we can run our pipeline on Paperclip.

1. **Get Paperclip running locally** with PGlite (no external Postgres)
2. **Create a single company** representing TeamHQ
3. **Register 5 core pipeline agents** (Thomas, Andrei, Robert, Alice, Enzo) as Paperclip agents using the `claude_local` adapter
4. **Port agent personas** for those 5 agents via `instructionsFilePath` pointing to our existing `.claude/agents/*.md` files
5. **Execute one pipeline end-to-end** — CEO creates a task, Thomas scopes it, Andrei architects, Robert designs, Alice implements, Enzo QAs — using Paperclip's task system and heartbeats
6. **Encode pipeline sequencing** via Thomas as the orchestrating agent (he creates and assigns downstream tasks with dependencies expressed in issue descriptions and parent-child relationships)

### In Scope (v0.2 — Full Team)

After v0.1 proves the concept:

7. Register all 24 agents with personas
8. Port skills directory into Paperclip's skill injection system
9. Set up budget enforcement with reasonable per-agent limits
10. Encode parallelism rules (Phase 4 parallel track: Robert + Jonah + Priya)
11. Port operating agreements into company-level documentation or agent instructions

### Deferred (Not v0.1 or v0.2)

- Cloud deployment (Paperclip is local-first; we stay local)
- Multiple simultaneous pipelines (our operating agreement says one at a time)
- Plugin development for custom phase gates
- Clipmart template export
- MCP memory migration (keep dual-memory system as-is for now)
- Migrating existing pipeline-log history into Paperclip's activity log
- Custom UI modifications to Paperclip's dashboard

---

## Requirements

### 1. Local Setup

**US-1: Paperclip Local Installation**

As the CEO, I need Paperclip running locally so that agents can be orchestrated through it.

**Acceptance Criteria:**
- [ ] Paperclip server runs on localhost:3100 with PGlite (no external Postgres dependency)
- [ ] Paperclip UI is accessible at localhost:5173 (or configured Vite port)
- [ ] A "TeamHQ" company is created with our mission statement
- [ ] The CEO can log in to the board UI with email/password (Better Auth)
- [ ] Claude Code CLI is detected as available by the `claude_local` adapter

**Technical constraints:**
- Node.js 20+, pnpm 9.15+ required
- All agent CLIs must be installed and authenticated on the host machine
- PGlite is acceptable for v0.1; real Postgres deferred

---

### 2. Agent Registration

**US-2: Core Pipeline Agents in Paperclip**

As the CEO, I need the 5 core pipeline agents (Thomas, Andrei, Robert, Alice, Enzo) registered in Paperclip so that work can be assigned to them.

**Acceptance Criteria:**
- [ ] Each agent is created with correct name, title, and role
- [ ] Each agent uses the `claude_local` adapter with `model: "opus"`
- [ ] Each agent's `instructionsFilePath` points to the corresponding `.claude/agents/*.md` file in the TeamHQ repo
- [ ] Each agent's `cwd` is set appropriately (TeamHQ repo for Thomas/Andrei/Robert/Enzo; product repo for Alice)
- [ ] Org chart reflects reporting structure: all agents report to Thomas (PM)
- [ ] Each agent has a monthly budget set (starting estimate: $50/agent/month for v0.1 testing)
- [ ] Each agent appears in the Paperclip UI with correct metadata

**Agent Configuration Table (v0.1):**

| Agent | Name | Title | Adapter | Instructions File | Heartbeat |
|-------|------|-------|---------|-------------------|-----------|
| Thomas | Thomas | Product Manager | claude_local | `.claude/agents/product-manager.md` | `*/10 * * * *` (every 10 min) |
| Andrei | Andrei | Technical Architect | claude_local | `.claude/agents/technical-architect.md` | Event-triggered only |
| Robert | Robert | Product Designer | claude_local | `.claude/agents/product-designer.md` | Event-triggered only |
| Alice | Alice | Frontend Developer | claude_local | `.claude/agents/frontend-developer.md` | Event-triggered only |
| Enzo | Enzo | QA Engineer | claude_local | `.claude/agents/qa.md` | Event-triggered only |

**Design decision — heartbeats:** Only Thomas gets a scheduled heartbeat in v0.1. He is the pipeline orchestrator. All other agents are event-triggered (they wake when a task is assigned to them or they are @-mentioned). This mirrors our current model where Thomas drives the pipeline.

---

### 3. Pipeline Sequencing (The Hard Problem)

**US-3: Sequential Pipeline Execution via Thomas**

As the CEO, I need our proven pipeline sequence (PM -> Arch -> Design -> FE -> QA) to execute in order, even though Paperclip has no built-in phase gates.

**Approach:** Thomas acts as the pipeline orchestrator within Paperclip. When the CEO creates a high-level task (e.g., "Build feature X"), Thomas's heartbeat picks it up, and he:

1. Checks out the task and scopes it (writes requirements)
2. Creates a child task assigned to Andrei ("Write tech approach for X") — Andrei wakes on assignment
3. When Andrei completes and posts a comment saying "done," Thomas's next heartbeat detects it
4. Thomas creates the next child tasks (Robert, Jonah in parallel if applicable)
5. Pattern continues through the pipeline until Enzo's QA pass

**Acceptance Criteria:**
- [ ] CEO creates a single top-level task describing the project/feature
- [ ] Thomas's heartbeat picks up the task and checks it out
- [ ] Thomas creates child tasks for each pipeline phase, assigned to the right agent
- [ ] Each downstream agent wakes when their task is assigned (event trigger)
- [ ] Thomas monitors child task completion via comments or status changes on subsequent heartbeats
- [ ] Thomas does NOT create the next phase's task until the current phase's task is marked complete
- [ ] The full sequence PM -> Arch -> Design -> FE -> QA executes without CEO intervention after the initial task creation
- [ ] If an agent's task fails or has questions, Thomas detects it and either re-assigns or escalates to the CEO via a comment on the top-level task

**Key constraints:**
- Paperclip's atomic checkout prevents double-work, but does NOT enforce ordering. Ordering is Thomas's responsibility.
- Thomas needs instructions that teach him the pipeline rules AND how to use Paperclip's API (checkout, create issues, post comments, check status).
- Session persistence is critical here — Thomas must remember pipeline state across heartbeats.

**Pipeline state encoding:** Thomas tracks pipeline state by:
- Using parent-child issue relationships (top-level task -> phase subtasks)
- Reading the status of child tasks on each heartbeat
- Using issue comments for inter-agent communication
- Storing phase progression in issue documents (structured key-value data attached to the issue)

---

### 4. Agent Persona Porting

**US-4: Agent Personas via Instruction Files**

As the CEO, I need each Paperclip agent to behave with the same persona, decision principles, and domain expertise as their TeamHQ counterpart.

**Acceptance Criteria:**
- [ ] Each agent's Paperclip `instructionsFilePath` points to the existing `.claude/agents/*.md` file
- [ ] The Paperclip skill injection (which teaches agents how to use the Paperclip API) is ADDITIVE to our persona files, not a replacement
- [ ] Agents receive BOTH: (a) Paperclip's operational skill (how to checkout tasks, post comments, etc.) AND (b) their TeamHQ persona (role-specific expertise, decision principles, personality)
- [ ] Agent behavior in Paperclip is indistinguishable from current TeamHQ behavior in terms of output quality (requirements docs, tech approaches, design specs, code, test plans)

**Risk:** Paperclip's skill injection and our persona files may conflict on workflow instructions. Our personas currently say "read docs in `docs/`, update `data/pipeline-log/`." In Paperclip, the equivalent actions are "checkout task via API, post comments, update status." The persona files will need a Paperclip-specific addendum that overrides workflow mechanics while preserving domain expertise.

**Decision:** For v0.1, we will create a thin wrapper instruction file per agent that:
1. Includes the original persona via reference ("Read your full role definition at: {path}")
2. Adds Paperclip-specific workflow overrides (use API instead of file-based tracking)
3. Preserves all domain expertise, decision principles, and personality

---

### 5. Skills Porting

**US-5: TeamHQ Skills Available to Paperclip Agents**

As the CEO, I need agents running in Paperclip to have access to our skills directory (development patterns, workflow checklists, design references).

**Acceptance Criteria:**
- [ ] Paperclip's skill injection mechanism includes our `skills/` directory
- [ ] Agents can reference skills like `skills/development/saas-stack.md` during execution
- [ ] Our skills coexist with Paperclip's built-in skills (no conflicts)
- [ ] Skills are sourced from the TeamHQ repo (single source of truth, not copied into Paperclip)

**Approach:** Paperclip's Claude adapter supports `--add-dir` for skill injection. Configure the adapter to include both Paperclip's native skills directory AND TeamHQ's `skills/` directory.

---

### 6. Institutional Knowledge

**US-6: Institutional Knowledge Preservation**

As the CEO, I need our accumulated patterns, lessons, and decisions to remain accessible when working through Paperclip.

**Acceptance Criteria:**
- [ ] CLAUDE.md remains the authoritative source of team conventions
- [ ] MCP memory (team-memory.db) remains accessible to agents via MCP tools
- [ ] MEMORY.md auto-memory continues to function
- [ ] Agents can search past decisions and patterns during Paperclip execution
- [ ] No institutional knowledge is lost in the migration

**Approach:** Since Paperclip spawns Claude Code as a child process with a `cwd`, and Claude Code automatically loads CLAUDE.md and MEMORY.md from the project directory, institutional knowledge flows through naturally. MCP tools are available if the MCP servers are configured in the environment. No migration needed — just ensure `cwd` points to TeamHQ.

---

## What We Gain

1. **Autonomous pipeline execution.** CEO creates one task, walks away, comes back to a scoped + built + tested feature. Today this requires 5-8 manual agent spawns.
2. **Cost visibility.** Per-agent, per-run token tracking. We currently have zero insight into what each pipeline run costs.
3. **Session persistence.** Agents resume context across runs. Today every spawn starts fresh (unless using worktrees, which is manual).
4. **Audit trail.** Every action logged in a database with full traceability. Today we have pipeline-log JSON files that are best-effort.
5. **Dashboard.** Visual org chart, cost charts, run transcripts, issue board — all in a React UI we do not have to build or maintain.
6. **Concurrency safety.** Atomic task checkout prevents two agents from working on the same thing. Today we rely on sequential spawning.
7. **Budget guardrails.** Auto-pause agents that exceed budget. No equivalent today.

## What We Lose (or Risk)

1. **Simplicity.** TeamHQ is files + conventions. Paperclip is a 128K LoC system with 45+ database tables. Operational complexity increases significantly.
2. **Direct CEO control.** The CEO currently sees every agent spawn and every output. Autonomous heartbeats mean agents run without the CEO watching. This is the point, but it is also a loss of hands-on control.
3. **Pipeline enforcement.** Our pipeline is currently encoded in prose (CLAUDE.md) that the CEO enforces by spawning order. Moving enforcement to Thomas-as-orchestrator means pipeline discipline depends on Thomas following instructions correctly across heartbeats. If Thomas makes a mistake, the pipeline breaks.
4. **File-based simplicity for docs.** Today agents write to `docs/` and we have a clean paper trail. In Paperclip, work artifacts may end up split between issue documents (in the DB) and files on disk. We need a clear convention.
5. **Bus factor on Paperclip.** 942 of 1024 commits are from one contributor. If that person stops maintaining it, we own a 128K LoC dependency.
6. **Local-only execution.** All agents must run on the same machine. No cloud scale-out. This matches our current setup but constrains future growth.

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Thomas fails to orchestrate pipeline correctly across heartbeats | High | Extensive testing in v0.1. Session persistence helps. Fall back to manual spawning if needed. |
| Paperclip skill injection conflicts with our persona files | Medium | Thin wrapper approach (US-4) isolates concerns. Test with one agent first. |
| PGlite data loss (embedded, not production-grade) | Low | v0.1 is a proof of concept. Real Postgres in v0.2. Existing TeamHQ files are the source of truth. |
| Agent budget burns through faster than expected | Low | Start with generous budgets ($50/agent/month). Monitor. Adjust. |
| Paperclip upstream changes break our setup | Medium | Pin to a specific commit. Update deliberately. Maintain fork if needed. |
| Pipeline artifacts (requirements, tech approach, design spec) end up in DB instead of files | Medium | Convention: agents still write docs to `docs/` in the repo. Paperclip issues are for tracking, not artifact storage. |

---

## Migration Phases

### Phase 1: v0.1 — Proof of Concept (THIS SCOPE)

**Goal:** Run one complete pipeline on Paperclip with 5 agents.

1. Clone and set up Paperclip locally
2. Create TeamHQ company
3. Register 5 core agents with personas
4. Configure Thomas with pipeline orchestration instructions
5. CEO creates a test task
6. Observe: does the pipeline execute PM -> Arch -> Design -> FE -> QA without intervention?
7. Evaluate: quality of output, cost per run, failure modes

**Success criteria:** One feature goes from "CEO creates task" to "Enzo approves QA" without the CEO manually spawning any agent. Output quality is comparable to current manual pipeline.

**Estimated effort:** Andrei (setup + adapter config) + Kai (instruction tuning for Thomas's orchestration behavior). 1-2 sessions.

### Phase 2: v0.2 — Full Team

Register all 24 agents. Encode parallelism rules. Set up real budgets. Run 3+ pipelines to validate reliability.

### Phase 3: v0.3 — Operational Maturity

Real Postgres. Session compaction tuning. Custom governance rules. Plugin for phase-gate enforcement (if Thomas-as-orchestrator proves unreliable). Retire file-based pipeline-log tracking.

---

## Pipeline Recommendation

**For v0.1 setup, the pipeline is:**

1. **Andrei (Arch)** — reads this requirements doc. Writes tech approach for Paperclip setup: adapter configuration, instruction file structure, workspace configuration, how Thomas's orchestration loop should work technically. Also evaluates whether Paperclip's skill injection plays nicely with our agents.
2. **Kai (AI Engineer)** — writes the orchestration prompt/instructions for Thomas-in-Paperclip. This is the hardest part: teaching Thomas to use the Paperclip API to drive the pipeline (create tasks, check status, assign agents, detect completion). Runs after or in parallel with Andrei.
3. **Milo (DevOps)** — handles actual Paperclip setup: clone, install, configure, get it running locally. Creates the company and registers agents per Andrei's tech approach.
4. **Enzo (QA)** — validates the end-to-end pipeline execution. Creates a test task and observes whether all 5 agents execute in sequence without manual intervention. Checks output quality.

**No Robert, Alice, Jonah, or frontend/backend work needed.** This is an infrastructure/orchestration project, not a product build. No UI to design, no features to implement. The "product" is the pipeline itself working on Paperclip.

**No early QA notification needed** — no Restructure-classified files (we are not modifying existing code, we are configuring an external system).

---

## Open Questions for the CEO

1. **Test project for v0.1:** Should we use a real (small) feature or a synthetic test task to validate the pipeline? A synthetic task is safer but does not prove real-world viability. Recommendation: use a real but trivial feature from the backlog.

2. **Budget allocation:** $50/agent/month for v0.1 testing feels right. Want to adjust?

3. **Paperclip versioning:** Pin to a specific commit or track main? Pinning is safer but means we manually pull updates. Recommendation: pin to the commit Marco researched (7034ea5) for v0.1.

4. **Fallback plan:** If v0.1 fails (Thomas cannot reliably orchestrate), do we (a) invest in a custom phase-gate plugin, (b) fall back to manual spawning with cost tracking only, or (c) abandon Paperclip? Recommendation: option (b) — use Paperclip for cost tracking and session persistence while keeping manual spawning.
