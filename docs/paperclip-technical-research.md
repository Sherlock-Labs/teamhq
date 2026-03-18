# Paperclip Technical Research Brief

**Researcher:** Marco (Technical Researcher)
**Date:** 2026-03-16
**Source:** https://github.com/paperclipai/paperclip (commit 7034ea5, 1024 commits, ~128K LoC TypeScript)

---

## 1. What Paperclip Is

Paperclip is an open-source (MIT) **orchestration control plane for AI agent companies**. It is not an agent framework and does not build agents -- it manages organizations of agents. The tagline is: "If OpenClaw is an employee, Paperclip is the company."

**Core value proposition:** You define a company with a mission, org chart, goals, and budgets. You "hire" AI agents (Claude Code, Codex, Cursor, Gemini, OpenClaw, etc.) into roles on that org chart. Paperclip coordinates their work through a ticketing system, scheduled heartbeats, budget enforcement, and governance approvals -- while you monitor everything from a dashboard.

**Key differentiator from other agent tools:** Paperclip models the *organizational layer* -- org charts, reporting lines, budgets, governance gates, goal hierarchies -- rather than agent internals. It treats agents as interchangeable labor and focuses on coordination, accountability, and cost control.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20+, TypeScript |
| **Package manager** | pnpm 9.15+ with workspaces |
| **Server** | Express.js REST API (port 3100) |
| **Database** | PostgreSQL (embedded PGlite for dev, external Postgres for prod) |
| **ORM** | Drizzle ORM |
| **Frontend** | React 18 + Vite, TanStack Query, Tailwind CSS, shadcn/ui, Lucide icons |
| **Testing** | Vitest (unit), Playwright (e2e) |
| **Build** | esbuild, TypeScript compiler |
| **Auth** | Better Auth (email/password, session-based for board users; JWT bearer tokens for agents) |
| **Secrets** | Local encrypted secrets (AES via master key file) or env-based |
| **Storage** | Local disk or S3-compatible |
| **CLI** | Commander.js |
| **Realtime** | Server-Sent Events (SSE) for live dashboard updates |
| **Plugins** | JSON-RPC protocol between host and worker processes |

---

## 3. Architecture

### 3.1 Monorepo Structure

```
paperclip/
  cli/                    # CLI tool (paperclipai command)
  server/                 # Express API server + orchestration services
    src/
      adapters/           # Agent runtime adapters (claude, codex, cursor, etc.)
      routes/             # REST API routes
      services/           # Business logic (heartbeat, costs, approvals, etc.)
      auth/               # Better Auth integration
      realtime/           # SSE live events
      storage/            # File storage abstraction
      secrets/            # Encrypted secrets management
  ui/                     # React + Vite frontend
    src/
      pages/              # 30 pages (Dashboard, Agents, Issues, OrgChart, etc.)
      components/         # Reusable UI components
      api/                # API client layer
      plugins/            # Plugin UI slot system
  packages/
    db/                   # Drizzle schema, migrations
    shared/               # Shared types, constants, validators
    adapter-utils/        # Base adapter utilities
    adapters/             # Agent adapter packages (one per runtime)
      claude-local/       # Claude Code CLI adapter
      codex-local/        # Codex CLI adapter
      cursor-local/       # Cursor CLI adapter
      gemini-local/       # Gemini CLI adapter
      openclaw-gateway/   # OpenClaw SSE gateway adapter
      opencode-local/     # OpenCode adapter
      pi-local/           # Pi adapter
    plugins/
      sdk/                # Plugin SDK (@paperclipai/plugin-sdk)
      create-paperclip-plugin/  # Plugin scaffolding tool
      examples/           # Example plugins
  skills/                 # Claude Code skills injected into agents at runtime
  docs/                   # Mintlify-based docs site
```

### 3.2 Key Architectural Patterns

**Company-scoped multi-tenancy.** Every entity (agent, issue, goal, project, approval, cost event) is scoped to a `company_id`. A single Paperclip deployment can run multiple independent "companies" with complete data isolation. This is not SaaS multi-tenancy -- it is meant for one operator running multiple autonomous businesses.

**Adapter-based agent integration.** Agents are not built into Paperclip. Each supported agent runtime has an "adapter" package that knows how to:
- Spawn the agent as a child process (e.g., `claude --print - --output-format stream-json`)
- Parse its stdout for structured results, session IDs, usage/cost data
- Resume sessions across heartbeats
- Test environment readiness (is the CLI installed? is auth configured?)

The supported adapters are:
- `claude_local` -- Claude Code CLI
- `codex_local` -- Codex CLI
- `cursor` -- Cursor CLI
- `gemini_local` -- Gemini CLI
- `openclaw_gateway` -- OpenClaw via SSE
- `opencode_local` -- OpenCode CLI
- `pi_local` -- Pi CLI
- `hermes_local` -- Hermes adapter
- `process` -- Generic process spawner (fallback)
- `http` -- Generic HTTP endpoint

**Heartbeat execution model.** Agents do not run continuously. They wake on scheduled heartbeats (cron expressions) or event triggers (task assignment, @-mentions in comments). Each heartbeat is a discrete execution window:
1. Agent wakes up
2. Checks its inbox for assigned tasks
3. Checks out a task (atomic, prevents double-work)
4. Does work using its own tools
5. Updates task status, posts comments
6. Exits

Sessions persist across heartbeats -- a Claude Code agent resumes the same session ID, so context carries over between runs.

**Goal hierarchy and alignment.** Goals are hierarchical (parent-child). Issues link to goals. When an agent picks up a task, it sees the full goal ancestry chain, so it understands not just *what* to do but *why*. Goal levels include mission, objective, key result, and task.

**Governance and approvals.** Certain actions require human approval before execution. The `approvals` table tracks requests, decisions, and decision notes. The human operator is "the board" and can approve/reject, pause agents, override strategy, or terminate any agent at any time.

**Atomic task checkout.** When an agent wants to work on a task, it must POST to `/api/issues/{id}/checkout`. This is atomic -- if another agent already has it checked out, the response is `409 Conflict` and the agent must pick a different task. This prevents two agents from working on the same thing.

**Budget enforcement.** Each agent has `budget_monthly_cents` and `spent_monthly_cents`. When spend hits 100%, the agent is auto-paused. Above 80%, agents are instructed to focus on critical tasks only. Cost events are recorded per heartbeat run with token counts and USD amounts.

---

## 4. Database Schema (Key Tables)

| Table | Purpose | Notable Columns |
|-------|---------|----------------|
| `companies` | Company entities | `id`, `name` |
| `agents` | AI agents in the org | `name`, `role`, `title`, `reportsTo`, `adapterType`, `adapterConfig`, `budgetMonthlyCents`, `spentMonthlyCents`, `status`, `permissions` |
| `issues` | Tasks/tickets | `title`, `status`, `priority`, `assigneeAgentId`, `checkoutRunId`, `parentId`, `goalId`, `projectId`, `requestDepth` |
| `goals` | Hierarchical goals | `title`, `level`, `status`, `parentId`, `ownerAgentId` |
| `projects` | Project containers | Linked to workspaces |
| `project_workspaces` | Git repos / local dirs per project | `cwd`, `repoUrl`, `repoRef` |
| `heartbeat_runs` | Execution log per agent run | `agentId`, `status`, `startedAt`, `finishedAt`, `exitCode`, `usageJson`, `resultJson`, `sessionIdBefore`, `sessionIdAfter` |
| `heartbeat_run_events` | Events within a run | Granular tracing |
| `cost_events` | Token/cost tracking | Per-run cost records |
| `approvals` | Governance requests | `type`, `status`, `payload`, `decidedByUserId` |
| `agent_task_sessions` | Session persistence per agent-task pair | `sessionId`, `sessionParams` |
| `agent_config_revisions` | Config version history | Enables rollback |
| `activity_log` | Immutable audit trail | All mutations logged |
| `issue_comments` | Comment threads on issues | Agent-to-agent and human-to-agent communication |
| `issue_documents` | Structured docs attached to issues | Plans, specs (key-value with revisions) |
| `agent_api_keys` | Agent auth keys (hashed) | Short-lived JWTs for local adapters |
| `company_secrets` | Encrypted secrets per company | API keys, tokens agents need |

---

## 5. How It Works (User Experience)

### 5.1 Setup

```bash
npx paperclipai onboard --yes
# OR
git clone ... && pnpm install && pnpm dev
```

Embedded PGlite spins up automatically. No external database needed for development.

### 5.2 Creating a Company

From the UI or CLI, you create a company with a name. This becomes the container for all agents, goals, projects, and work.

### 5.3 Hiring Agents

You create agents in the UI with:
- **Name** and **title** (e.g., "Alice", "Frontend Engineer")
- **Adapter type** (claude_local, codex_local, cursor, etc.)
- **Adapter config** (model, cwd, env vars, prompt template, timeout, etc.)
- **Reports to** (manager agent -- builds the org chart)
- **Monthly budget** in cents
- **Heartbeat schedule** (cron expression, e.g., `*/15 * * * *` for every 15 minutes)

### 5.4 Setting Goals

Goals are hierarchical. You might set:
- **Mission:** "Build the #1 AI note-taking app to $1M MRR"
  - **Objective:** "Launch MVP by Q2"
    - **Key Result:** "Ship core editor with real-time sync"
      - **Task:** (linked issues)

### 5.5 Creating and Assigning Work

Issues (tasks) are created in the board UI or by agents themselves (delegation). Each issue has:
- Title, description, status, priority
- Assignee (agent or human)
- Parent issue (for subtasks)
- Goal link (for alignment)
- Project link

### 5.6 Agent Execution Cycle

When a heartbeat fires (cron or event trigger):
1. Server selects the agent and builds execution context
2. Server calls the adapter's `execute()` function
3. Adapter spawns the agent CLI as a child process with:
   - Environment variables: `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_API_URL`, `PAPERCLIP_RUN_ID`, `PAPERCLIP_TASK_ID`, `PAPERCLIP_API_KEY`
   - A prompt containing the agent's identity and work context
   - Skills directory (symlinked into a temp dir so Claude Code discovers them)
   - Session ID for resumption
4. Agent runs, makes API calls back to Paperclip (checkout task, read comments, update status, create subtasks, post comments)
5. When the agent exits, the adapter parses results (token usage, cost, session ID, summary)
6. Server records the heartbeat run, updates costs, emits live events to the UI

### 5.7 Dashboard and Monitoring

The React UI provides:
- **Dashboard** -- metric cards (active agents, open issues, costs), run activity charts, recent issues
- **Agents** -- list with status, budget utilization, last heartbeat
- **Agent Detail** -- config, run history with full transcripts, budget
- **Issues** -- kanban-style board, list view, search
- **Issue Detail** -- description, comments thread, documents, linked goal ancestry
- **Goals** -- hierarchical goal tree
- **Org Chart** -- visual org chart based on `reportsTo` relationships
- **Costs** -- per-agent cost breakdown, monthly trends
- **Approvals** -- pending/resolved governance requests
- **Activity** -- immutable audit log of all mutations
- **Inbox** -- personal task inbox (assigned to you)
- **Projects** -- project containers with workspace configs
- **Plugins** -- plugin manager and per-plugin settings

---

## 6. Key Features That Make It Interesting

### 6.1 Bring Your Own Agent (BYOA)

Paperclip is runtime-agnostic. The adapter system means any agent that can receive a prompt via stdin and output structured results via stdout can be integrated. The existing adapters cover the major coding agents (Claude Code, Codex, Cursor, Gemini), plus OpenClaw for more autonomous agents, and generic process/HTTP fallbacks.

### 6.2 Session Persistence Across Heartbeats

Claude Code session IDs are tracked per agent-task pair in `agent_task_sessions`. When an agent wakes for the same task, it resumes the same session -- preserving conversation history and context. There is also session compaction logic: after 200 runs or 2M input tokens or 72 hours, the session rotates with a handoff markdown summary.

### 6.3 Atomic Checkout and Concurrency Control

The checkout mechanism (`POST /api/issues/{id}/checkout`) prevents two agents from working on the same task simultaneously. This is enforced at the database level. The heartbeat service also has per-agent start locks and configurable max concurrent runs (default 1, max 10).

### 6.4 Cost Tracking and Budget Enforcement

Every heartbeat run captures token usage (input, cached input, output) and cost in USD. This rolls up to per-agent monthly spend. When an agent exceeds its budget, it is auto-paused. The UI shows cost breakdowns and trends.

### 6.5 Plugin System

Paperclip has a full plugin architecture:
- Plugins run as separate worker processes communicating via JSON-RPC
- Plugin SDK (`@paperclipai/plugin-sdk`) provides `definePlugin()` with event subscriptions, job scheduling, state storage, and data providers
- Plugins can register UI slots that render in the main Paperclip UI
- Plugin lifecycle management (install, enable, disable, uninstall)
- Plugin log retention, config validation, manifest validation

### 6.6 Company Portability / Templates

Companies can be exported (with secret scrubbing and collision handling) and imported into other Paperclip instances. This enables "Clipmart" -- a planned marketplace for pre-built company templates (full org structures, agent configs, and skills).

### 6.7 Governance Model

The human operator is "the board." They can:
- Approve or reject agent requests (hiring, strategy changes)
- Pause or terminate any agent at any time
- Override budgets
- Roll back config changes (agent config revisions are versioned)
- Review every decision via the immutable activity log

### 6.8 Skills Injection

Paperclip ships a `skills/` directory that is symlinked into a temporary `.claude/skills/` directory and passed to Claude Code via `--add-dir`. This means agents automatically learn the Paperclip workflow (heartbeat procedure, API endpoints, checkout rules, comment style) without any custom training. The main skill `skills/paperclip/SKILL.md` is essentially a comprehensive operating manual for how an agent should behave within the Paperclip system.

---

## 7. Comparison: Paperclip vs. TeamHQ

| Dimension | Paperclip | TeamHQ |
|-----------|-----------|--------|
| **Core metaphor** | "Run an AI company" -- org charts, budgets, governance | "AI agent product team" -- pipeline, roles, docs |
| **Agent orchestration** | Automated via heartbeats, cron schedules, event triggers | Manual via Task tool spawning from Claude Code |
| **Persistence** | PostgreSQL database, session tracking, activity logs | File-based (JSON, Markdown docs), git-tracked |
| **Agent coordination** | API-based: agents call Paperclip REST API to checkout tasks, post comments, delegate | Agent-definition files + system prompts, CEO manually spawns agents |
| **Cost tracking** | Built-in per-agent budgets, token tracking, auto-pause | None |
| **Governance** | Approval gates, config rollback, board controls | Operating agreements (documented conventions) |
| **UI** | Full React dashboard (30 pages, org chart, cost charts, run transcripts) | Static HTML landing page + data viewer |
| **Multi-agent runtime** | Claude Code, Codex, Cursor, Gemini, OpenClaw, HTTP, process | Claude Code only (via Task tool) |
| **Autonomy level** | High -- agents run on schedules autonomously, 24/7 | Low -- CEO manually spawns each agent per task |
| **Pipeline model** | Flat ticketing with goal hierarchy; agents self-organize via checkout | Sequential pipeline (PM -> Arch -> Design -> FE/BE -> QA) defined in CLAUDE.md |
| **Documentation** | Issue documents with revisions, stored in DB | Markdown docs per project in `docs/` directory |
| **Plugin system** | Yes -- JSON-RPC plugin SDK with UI slots | No |
| **Maturity** | 1024 commits, ~128K LoC, active development (16+ contributors) | Smaller, focused on pipeline conventions |

---

## 8. How Paperclip Could Complement TeamHQ

### 8.1 Patterns TeamHQ Could Adopt

**Heartbeat-based autonomy.** TeamHQ currently requires the CEO to manually spawn each agent. Paperclip's heartbeat model -- where agents wake on a schedule, check their inbox, and self-direct -- would enable truly autonomous pipeline execution. Thomas could be set on a heartbeat that checks for new CEO directions and autonomously kicks off the pipeline.

**Structured cost tracking.** TeamHQ has no visibility into how much each agent run costs. Paperclip's per-run token tracking and monthly budget enforcement would prevent runaway spending -- a real risk with 20+ agents.

**Atomic task checkout.** TeamHQ's pipeline relies on sequential spawning to prevent conflicts. Paperclip's checkout mechanism would allow parallel agent work with guaranteed no-double-work, enabling more parallelism in the pipeline.

**Persistent agent sessions.** TeamHQ agents start fresh each time they are spawned. Paperclip's session persistence means an agent can resume exactly where it left off, which would be valuable for long-running tasks that exceed a single session.

**Immutable activity log.** TeamHQ tracks work via pipeline-log JSON files. Paperclip's database-backed activity log with full audit trail is more robust for understanding what happened and why.

**Agent-to-agent communication via comments.** TeamHQ agents communicate indirectly through docs. Paperclip's comment system with @-mentions and event-triggered wakeups would enable direct agent-to-agent coordination.

### 8.2 What Paperclip Could Replace

TeamHQ could potentially run *inside* Paperclip. The entire team roster (Thomas, Andrei, Robert, Alice, Jonah, Enzo, etc.) could be modeled as Paperclip agents with:
- Org chart reflecting the reporting structure
- Goals reflecting project objectives
- Issues replacing work items
- Heartbeats replacing manual spawning
- Budget enforcement per agent
- The pipeline sequence encoded as a workflow pattern rather than prose in CLAUDE.md

### 8.3 What TeamHQ Has That Paperclip Lacks

**Domain-specific pipeline.** TeamHQ's pipeline (PM -> Arch -> Design -> FE/BE -> QA) is a hard-won, battle-tested sequence with specific dependency rules. Paperclip has no concept of sequential pipeline phases -- it is a flat ticket system where agents pick up whatever is assigned to them. The pipeline logic would need to live in the CEO/PM agent's instructions.

**Rich agent personas.** TeamHQ agents have detailed personality descriptions, decision principles, and domain expertise baked into their system prompts. Paperclip agents get a role and a prompt template but the persona depth comes from whatever instructions you configure.

**Specialized skills per agent.** TeamHQ's agent definitions in `.claude/agents/` contain deep, role-specific guidance (e.g., QA knows what "done" means, the designer knows the design token system). Paperclip's skill injection is more generic -- the main skill teaches agents how to use the Paperclip API, not domain expertise.

**Proven product patterns.** TeamHQ has shipped 5+ products and accumulated patterns, conventions, and lessons learned (stored in MEMORY.md and MCP memory). This institutional knowledge is TeamHQ's real asset. Paperclip provides the coordination infrastructure but not the domain knowledge.

### 8.4 Integration Possibilities

1. **Use Paperclip as the orchestration layer for TeamHQ agents.** Keep TeamHQ's agent definitions, pipeline conventions, and docs. Use Paperclip to handle scheduling, cost tracking, task management, and the dashboard UI. The TeamHQ agent instructions could be passed to Paperclip via `instructionsFilePath` in adapter config.

2. **Adopt Paperclip's heartbeat pattern in TeamHQ.** Without replacing the whole system, TeamHQ could implement a lightweight heartbeat loop where Thomas (PM) checks for new work on a schedule and autonomously runs the pipeline -- reducing CEO involvement to setting direction and reviewing outputs.

3. **Use Paperclip for multi-project management.** TeamHQ's "one pipeline at a time" rule exists because manual orchestration is expensive. With Paperclip's automated coordination, multiple pipelines could run in parallel with proper isolation.

---

## 9. Risks and Gotchas

1. **Maturity.** Paperclip is young (first commit in 2026, 1024 commits). The codebase is substantial (~128K LoC) but the contributor base is dominated by one person (Dotta, 942 of 1024 commits). Bus factor is low.

2. **Complexity.** Paperclip is a large system -- 30 UI pages, 45+ database tables, 10 adapter packages, a full plugin SDK. Running it adds significant operational complexity compared to TeamHQ's file-based approach.

3. **Local-first bias.** Paperclip is designed for local execution. Agents are spawned as child processes on the same machine. This means the machine running Paperclip needs all agent CLIs installed and authenticated. Scaling to cloud agents is on the roadmap but not yet solved.

4. **No pipeline concept.** Paperclip has no built-in notion of sequential phases. If you need "backend must finish before frontend starts," you would need to encode that logic in agent instructions or in a manager agent's behavior. TeamHQ's explicit pipeline is an advantage here.

5. **Embedded Postgres in dev.** PGlite is convenient for getting started but is not production-grade. For serious use, you need a real Postgres instance.

6. **Agent quality depends on skill injection.** The skill markdown that teaches agents how to use Paperclip is clever but brittle -- if an agent does not follow the instructions perfectly (misses checkout, forgets to update status), the system breaks. There is no enforcement layer for protocol compliance, only instructions.

---

## 10. Recommendation

**Do not migrate TeamHQ to Paperclip right now.** The operational overhead of running Paperclip (Postgres, server process, 128K LoC codebase to understand) is not justified for TeamHQ's current scale and workflow. TeamHQ's file-based, convention-driven approach is simpler and gives the CEO more direct control.

**Do adopt specific patterns from Paperclip:**

1. **Cost tracking** -- Add per-agent token/cost tracking to TeamHQ. This is the highest-value, lowest-effort adoption. Even a simple JSON log per agent run would provide visibility that does not exist today.

2. **Heartbeat-based autonomy for Thomas** -- Implement a lightweight version where Thomas can be triggered on a schedule or by a webhook, checks for new CEO directions, and autonomously manages the pipeline. This would reduce the CEO's need to manually orchestrate every step.

3. **Task checkout semantics** -- If TeamHQ moves toward more parallel work, adopt Paperclip's atomic checkout pattern to prevent two agents from working on the same thing.

4. **Session persistence** -- Track Claude Code session IDs per agent-task pair so agents can resume context across multiple spawns.

**Keep Paperclip on the radar.** If it matures and solves the cloud-agent problem, it could become a compelling orchestration layer. The "Clipmart" concept (downloadable company templates) is particularly interesting -- TeamHQ's agent roster and pipeline could become a Clipmart template.

---

## Sources

- Repository: https://github.com/paperclipai/paperclip (cloned and read at commit 7034ea5)
- Key files examined: README.md, AGENTS.md, package.json, pnpm-workspace.yaml, all database schema files (45 tables), server/src/services/heartbeat.ts (heartbeat orchestration), server/src/adapters/registry.ts (adapter system), packages/adapters/claude-local/src/server/execute.ts (Claude adapter implementation), skills/paperclip/SKILL.md (agent skill injection), ui/src/App.tsx and pages/ (all 30 UI pages), server/src/config.ts (configuration), packages/plugins/sdk/src/index.ts (plugin SDK), server/src/services/cron.ts (scheduler)
