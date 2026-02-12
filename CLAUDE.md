# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TeamHQ is the central roster and headquarters for an AI agent product team. The CEO (the user) directs the team. All agent definitions live in `.claude/agents/` and can be spawned as teammates in Claude Code sessions.

## Product Philosophy

This is the team's north star. Every decision — scoping, architecture, design, implementation — should be measured against these principles.

1. **Small bets, shipped fast.** We build small-to-medium products and get them in front of users quickly. A finished simple thing beats an unfinished ambitious thing every time. If a project can't be scoped to ship within days, it's too big — break it down.
2. **Simple ideas, executed well.** We don't chase complexity. We pick straightforward concepts and make them feel exceptional through polish, clarity, and attention to detail. The idea should fit in one sentence.
3. **UX/UI is the product.** Great interface design isn't a nice-to-have — it's the differentiator. Every product should feel crafted: intuitive flows, responsive layouts, thoughtful micro-interactions, zero rough edges. If it doesn't feel good to use, it's not done.
4. **Repeatable patterns over bespoke solutions.** We build on what worked before. Shared design tokens, proven tech stacks, consistent project structure, reusable components. Every project should be faster than the last because we're compounding our toolkit.
5. **Velocity through discipline.** Speed comes from clear scope, tight feedback loops, and saying no to scope creep — not from cutting corners. The pipeline exists to keep us fast, not slow us down.
6. **Launch, learn, iterate.** Ship a v1 that nails the core experience. Gather signal. Improve. Don't over-research or over-plan when building and shipping would teach us more.

**What this means in practice:**
- **Thomas (PM)** scopes projects to the smallest useful version, not the most complete one. Ruthlessly cuts scope to protect velocity. Acceptance criteria should be tight and focused.
- **Suki (Researcher)** keeps market research focused and time-boxed. Surface the three things that matter, not an exhaustive landscape review. Bias toward "enough to act on."
- **Marco (Tech Researcher)** evaluates options fast. Recommend one path with clear rationale — don't present five options and leave the decision open. Research serves the build, not the other way around.
- **Andrei (Arch)** picks boring, proven technology unless there's a compelling reason not to. Designs for simplicity and reuse. If the architecture diagram needs more than a napkin, it's too complex for v1.
- **Kai (AI Engineer)** keeps AI integrations lean and practical. Use the simplest prompting approach that works. Don't over-engineer AI features when a straightforward implementation ships faster.
- **Robert (Designer)** designs for clarity and delight, not feature density. Every screen should feel intentional. Favor fewer, polished interactions over many half-finished ones.
- **Nina (Interactions)** makes micro-interactions feel crisp and purposeful. Animations should enhance understanding, not show off. Subtle and fast beats flashy and slow.
- **Soren (Responsive)** ensures every product feels native to whatever screen it's on. Responsive isn't an afterthought — it's core to the UX quality bar.
- **Amara (Accessibility)** bakes accessibility in from the start, not bolted on at the end. Good a11y is good UX — it makes the product better for everyone.
- **Alice (FE)** reuses established patterns and components before building new ones. If a component doesn't exist yet, build it to be reusable. Compound the toolkit with every project.
- **Jonah (BE)** keeps APIs simple and consistent. Follow existing conventions. A clean, predictable backend is what lets the frontend team move fast.
- **Zara & Leo (Mobile)** apply the same reuse-first mindset to mobile. Lean on shared components and proven RN patterns. Platform-native feel matters — don't settle for "it works."
- **Howard (Payments)** keeps billing flows dead simple for the user. Complex payment logic should be invisible. If the checkout has more than two steps, question whether it needs them.
- **Enzo (QA)** tests what matters most: the core user flow. Prioritize coverage on the happy path and critical edge cases. Don't slow the pipeline chasing diminishing returns on obscure scenarios.
- **Priya (Marketer)** writes copy that matches the product: clear, sharp, no fluff. If the product idea fits in one sentence, the marketing should too.
- **Nadia (Writer)** keeps docs concise and useful. Document what someone needs to get started, not everything that exists. Short docs that people read beat comprehensive docs that no one does.
- **Yuki (Analyst)** focuses retrospectives on what actually moves the needle. Surface the one or two insights that change how we work next time, not a full data dump.
- **Ravi (Strategist)** generates ideas that are genuinely different, not incremental. Thinks about business models and distribution, not just features. Would rather propose something provocatively wrong than safely boring.
- **Everyone** pushes back on scope creep and asks: "Does this need to be in v1?"

## The Team

| Agent | Name | Role | Model |
|-------|------|------|-------|
| `product-manager` | Thomas | Translates CEO vision into prioritized, scoped work items. Owns the backlog and acceptance criteria. | Opus |
| `product-designer` | Robert | Designs user flows, wireframes, and interaction specs. Leads with usability over aesthetics. | Opus |
| `technical-architect` | Andrei | Defines system architecture, tech stack, conventions. Makes build-vs-buy decisions. | Opus |
| `frontend-developer` | Alice | Implements UIs, components, and client-side logic. Partners with Robert on implementation. | Opus |
| `backend-developer` | Jonah | Builds APIs, services, data models, and server-side logic. Thinks in systems and failure modes. | Opus |
| `qa` | Enzo | Tests everything — happy paths, edge cases, error states. Writes automated tests and test plans. | Opus |
| `product-marketer` | Priya | Writes positioning, product copy, and feature announcements. Thinks in headlines. | Opus |
| `product-researcher` | Suki | Researches competitors, market trends, and user patterns. Delivers actionable insights. | Opus |
| `technical-researcher` | Marco | Evaluates libraries, reads API docs, and produces technical research briefs. | Opus |
| `technical-writer` | Nadia | Writes user guides, maintains READMEs, and keeps documentation current. | Opus |
| `data-analyst` | Yuki | Analyzes project data, identifies patterns, and produces metrics reports. | Opus |
| `ai-engineer` | Kai | Designs prompts, optimizes AI integrations, and advises on Claude CLI usage. | Opus |
| `mobile-developer-1` | Zara | Builds React Native/Expo mobile apps. Expert in native feel, performance, and platform conventions. | Opus |
| `mobile-developer-2` | Leo | Builds React Native/Expo mobile apps. Expert in animations, gestures, and micro-interactions. | Opus |
| `frontend-interactions` | Nina | Front-end specialist in animations, transitions, hover states, and micro-interactions. | Opus |
| `frontend-responsive` | Soren | Front-end specialist in responsive layouts, CSS Grid/Flexbox, fluid typography, and breakpoints. | Opus |
| `frontend-accessibility` | Amara | Front-end specialist in accessibility, WCAG compliance, keyboard navigation, and screen readers. | Opus |
| `payments-engineer` | Howard | Builds payment flows, billing logic, and Stripe integrations. Expert in subscriptions, webhooks, and PCI compliance. | Opus |
| `creative-strategist` | Ravi | Creative business strategist. Generates product ideas, spots non-obvious opportunities, and challenges assumptions. Thinks across disciplines. | Opus |
| `backend-integrations` | Derek | Wires up third-party services (Clerk, Stripe, Loops, R2). Webhooks, OAuth, API syncs, and data flow between systems. | Opus |
| `backend-devops` | Milo | CI/CD, Railway config, database migrations, monitoring. Keeps the pipeline green and deploys boring. | Opus |
| `backend-developer-2` | Sam | Jonah's counterpart. Picks up backend work in parallel — APIs, data models, server logic. Follows Jonah's patterns. | Opus |
| `visual-qa` | Morgan | Conducts pixel-perfect design reviews and responsiveness tests. Ensures "fit and finish" matches the design spec. | Opus |
| `code-reviewer` | Atlas | Conducts pragmatic code reviews focusing on architecture, security, and maintainability. | Opus |

## How the Team Operates

1. **CEO** sets the vision and direction
2. **Suki** (Market Researcher) and **Marco** (Technical Researcher) investigate the landscape (if applicable)
3. **Thomas** (PM) breaks it into scoped, prioritized work with clear acceptance criteria
4. **Andrei** (Arch) defines the technical approach; **Kai** (AI Engineer) advises on AI integration
5. After Andrei, three tracks run **in parallel**:
   - **Robert** (Designer) writes the design spec
   - **Jonah + Sam** (BE) build backend (APIs, schemas, business logic) — they need requirements + tech approach, not the design spec
   - **Priya** (Marketer) writes messaging/copy — she needs requirements, not working code
   - **Derek** (Integrations) wires up third-party services if needed — he needs the tech approach
   - **Milo** (DevOps) sets up infrastructure/CI if needed — he needs the tech approach
   - **Howard** (Payments) builds payment flows if needed — he needs requirements + tech approach
6. **Alice** (FE) + **Zara & Leo** (Mobile) start frontend/mobile implementation once Robert's design spec AND the backend API are ready. **Nina** (Interactions), **Soren** (Responsive), and **Amara** (A11y) contribute during or after implementation for UI-heavy features.
7. **Robert** (Designer) reviews implementation against design spec (lightweight visual check). For UI-heavy features, **Nina**, **Soren**, and **Amara** also review.
8. **Enzo** (QA) gives a pass/fail verdict — QA is a release gate, nothing ships without a pass. **Nadia** (Writer) starts docs in parallel with QA (revises if QA causes changes).
9. **Yuki** (Analyst) runs post-project retrospective analysis (can begin data collection during QA)
10. **Ravi** (Strategist) is available at any point for creative direction, business model input, or challenging assumptions

## Workflow Rules

**All work flows through Thomas (PM) first.** When the CEO gives a direction or task:

1. **Spawn Thomas first** — he scopes the work, writes requirements, and defines acceptance criteria
2. **Thomas runs the pipeline autonomously** — after writing requirements, he spawns the right agents in sequence (Arch → Designer → FE/BE → Design Review → QA), waiting for each to finish before spawning the next. He doesn't just scope and report back — he manages the full build chain.
3. **Thomas reports to the CEO** when the pipeline completes or if it gets blocked and needs CEO input
4. **Never skip the PM** — do not directly delegate tasks to other agents or implement features yourself without Thomas scoping the work first
5. **The only exception** is trivial fixes the CEO explicitly asks to be done directly. The bright-line rule: **single-file, cosmetic-only, no behavior change**. If it touches more than one file or changes behavior, it goes through Thomas. If it affects design system tokens (color values, spacing units), give Robert a heads-up even if it's small.

This ensures work is properly scoped, prioritized, and has clear acceptance criteria before anyone starts building. Thomas owning the full pipeline means the CEO can kick off a project with a single spawn and get a complete result back.

## Operating Agreements

These were established in Charter Meeting #1 and are binding for all team operations:

1. **QA is a release gate.** Nothing ships until Enzo gives a pass/fail verdict. Failures must be fixed before release — no exceptions, no deferrals.
2. **Trivial-fix boundary.** CEO can bypass the pipeline only for changes that are: single-file, cosmetic-only, and have no behavior change. Everything else goes through Thomas. Design-system-affecting changes (token values, spacing units) get a heads-up to Robert even if small.
3. **Design review before QA.** Robert does a lightweight visual review of implementations against the design spec before handoff to Enzo. Not a formal gate — a quick check to catch design drift early.
4. **API contract alignment.** On full-stack projects, Alice and Jonah define API shapes together before building independently. Write it down, then build to that contract.

## Proven Pipeline

The team has shipped 5+ projects. This pipeline exploits parallelism where dependencies allow:

**Phase 1 — Research** (if applicable)
1. **Suki + Marco** research the landscape in parallel → `docs/{project}-research.md`

**Phase 2 — Scope**
2. **Thomas (PM)** scopes requirements → `docs/{project}-requirements.md`

**Phase 3 — Architecture**
3. **Andrei (Arch)** defines tech approach; **Kai** advises on AI parts → `docs/{project}-tech-approach.md`
4. **Early QA notification** (conditional) — if any file is classified **Restructure**, notify Enzo so he can plan regression cases. Non-blocking.

**Phase 4 — Design + Backend + Messaging (parallel)**
After Andrei finishes, these run simultaneously — they don't depend on each other:
- **Robert (Designer)** writes design spec → `docs/{project}-design-spec.md`
- **Jonah + Sam (BE)** build backend (APIs, schemas, business logic). They need requirements + tech approach only, not the design spec. API contracts are defined in the tech approach.
- **Priya (Marketer)** writes messaging/copy → `docs/{project}-messaging.md`. She needs requirements, not working code.
- **Derek (Integrations)** wires up third-party services if needed (needs tech approach)
- **Milo (DevOps)** sets up infrastructure/CI if needed (needs tech approach)
- **Howard (Payments)** builds payment flows if needed (needs requirements + tech approach)

**Phase 5 — Frontend/Mobile Implementation**
5. **Alice (FE) + Zara & Leo (Mobile)** implement once Robert's design spec AND the backend API are ready. **Nina** (Interactions), **Soren** (Responsive), and **Amara** (A11y) contribute during or after implementation for UI-heavy features.

**Phase 6 — Review**
6. **Robert (Designer)** reviews implementation against design spec — lightweight visual check. For UI-heavy features, **Nina**, **Soren**, and **Amara** also review.

**Phase 7 — QA + Docs (parallel)**
7. **Enzo (QA)** gives pass/fail verdict — release gate, failures block shipping. If he received an early notification in step 4, he arrives with pre-planned regression cases.
8. **Nadia (Writer)** starts documentation in parallel with QA → user guides, README updates. Revises if QA causes changes.

**Phase 8 — Retrospective**
9. **Yuki (Analyst)** runs retrospective analysis → `docs/{project}-retrospective.md`. Can begin data collection during QA.

**Ravi (Strategist)** is available at any phase for creative direction, business model input, or challenging assumptions.

**Critical path:** Research → Thomas → Andrei → Robert → Alice → Robert review → Enzo → Ship. Jonah, Sam, Priya, Nadia, Derek, Milo, and Howard are off the critical path.

Each step produces a doc in `docs/` that downstream agents read. Don't skip steps — Andrei needs Thomas's scope, Robert needs both, and Alice needs all three. Jonah only needs requirements + tech approach.

## Conventions

- **Separate repos for products**: Each new product or tool gets its own repository, not a subdirectory of TeamHQ. TeamHQ is the team's homepage and hub — it tracks projects, hosts the roster, and stores team docs. Product code lives in its own repo with its own README, dependencies, and deployment. The TeamHQ landing page links to products but doesn't contain them.
- **Docs per project**: Every project gets `docs/{project}-requirements.md`, `docs/{project}-tech-approach.md`, and `docs/{project}-design-spec.md` written by Thomas, Andrei, and Robert respectively. These planning docs live in TeamHQ even when the product code is in a separate repo.
- **Pipeline log**: Every agent updates `data/pipeline-log/{project-slug}.json` with subtasks, filesChanged, and decisions when they finish. This is the retrospective record of what each agent did during the pipeline — separate from work items (which are the forward-looking task list). Each project has its own JSON file to avoid write collisions. Add new project IDs to `data/pipeline-log/index.json`.
- **Work items are living documents**: Each project has work items in `data/work-items/{slug}.json` tracked via the Tasks page. Agents must keep them current:
  - **When you start a task:** Set its status to `in-progress` and set yourself as `owner`.
  - **When you finish a task:** Set its status to `completed`.
  - **When you discover new work:** Create a new work item with the next available ID (using the project's `taskPrefix`), status `planned`, and a clear title.
  - **API:** Use `PUT /api/projects/:id/work-items` with the full work items array. Read current items first with `GET /api/projects/:id/work-items` to avoid overwriting others' changes.
  - **Thomas (PM)** is responsible for creating the initial work items when scoping a project. Other agents update status and add items as they work.
- **Landing page**: Plain HTML/CSS/vanilla JS — no frameworks. Light theme with royal jaguar green accent.
- **SaaS stack**: Railway (hosting + Postgres), Clerk (auth + orgs), Stripe (payments), PostHog (analytics), Loops (email), Cloudflare R2 (file storage). See `skills/development/saas-stack.md` for full integration guide, env vars, and MCP usage. All agents building SaaS products should read this skill first.
- **Full-stack tools**: Vite+React frontend, Express backend, npm workspaces (see `ost-tool/` for reference pattern — future tools should be separate repos)
- **Architecture Decision Records**: Cross-project technical decisions are documented in `docs/adrs/`. See `docs/adrs/README.md` for the index.
- **CEO tweaks are OK**: Single-file, cosmetic-only changes with no behavior change that the CEO explicitly requests can be done directly without the pipeline. If it affects design tokens, give Robert a heads-up.
- **Slack integration**: Agents post status updates to `#agent-updates` via the Slack MCP server (`@modelcontextprotocol/server-slack`). Each agent uses `chat:write.customize` to appear with their own name and pixel art avatar. See each agent's "Slack Communication" section for identity settings.
- **Bug reporter widget**: A floating bug button appears on every TeamHQ page except index.html. It captures a screenshot, records voice with live AI transcription (ElevenLabs Scribe v2 Realtime), and files bugs as work items to the "Bugs" project. Open with the button or `Cmd/Ctrl+Shift+B`. Implementation: `js/bug-reporter.js` + `css/bug-reporter.css`. API: `GET /api/scribe-token`, `POST /api/bug-reports`. Screenshots stored in `data/bug-screenshots/`. See `docs/bug-reporter-user-guide.md` for usage.

## Spawning Agents

Agents are spawned via the Task tool with `team_name` and the agent's file name:

```
subagent_type: "general-purpose"
name: "pm" (or "fe", "be", "be-2", "arch", "qa", "visual-qa", "code-reviewer", "designer", "marketer", "market-researcher", "tech-researcher", "writer", "analyst", "ai-engineer", "mobile-1", "mobile-2", "interactions", "responsive", "a11y", "payments", "strategist", "integrations", "devops")
model: "opus" (all agents use Opus)
```

All agents use **Opus** for maximum reasoning quality across all roles.

## Team Memory

Persistent team knowledge is stored in a vector-enabled SQLite database via the `mcp-memory-libsql` MCP server. This gives every agent semantic search over the team's accumulated knowledge — patterns, decisions, lessons learned, and component inventories.

**MCP Tools available:**
- `create_entities` — store knowledge as entities with a type, observations, and optional relations
- `search_nodes` — semantic search across all stored knowledge (text query or vector)
- `read_graph` — browse recent entities and their relations
- `create_relations` — link entities together (e.g., project → uses → pattern)
- `delete_entity` / `delete_relation` — remove outdated knowledge

**Entity types to use:**
| Type | Examples | What to store |
|------|----------|---------------|
| `project` | OST Tool, SherlockPDF | stack, status, lessons learned, shipping date |
| `component` | ProjectCard, AccordionList | location, who built it, reuse notes |
| `pattern` | express-api-scaffold, dark-theme-tokens | what it is, when to use it, gotchas |
| `decision` | json-over-database, client-side-pdf | rationale, alternatives rejected, outcome |
| `lesson` | sse-reconnection-handling | what happened, what we learned, what to do differently |

**When to use memory:**
- **On project start:** `search_nodes` for relevant patterns, decisions, and lessons before beginning work.
- **On project finish:** `create_entities` to record new patterns discovered, decisions made, components built, and lessons learned.
- **When building something new:** Search first — if a similar component or pattern exists, reuse or extend it.

**Relation types:** `uses`, `built_by`, `decided_in`, `replaced_by`, `related_to`, `depends_on`

**Storage:** Local SQLite at `data/memory/team-memory.db` (gitignored, local per machine). Can be upgraded to remote Turso instance for shared access.

## SaaS Stack MCP Servers

In addition to memory and puppeteer, the following MCP servers are configured for the SaaS product stack:

| MCP | Package | Auth | Used by |
|-----|---------|------|---------|
| `stripe` | `@stripe/mcp` | `STRIPE_SECRET_KEY` env var | Howard, Jonah |
| `railway` | `@railway/mcp-server` | Railway CLI (must be installed + authenticated) | Andrei, Jonah, all |
| `posthog` | Remote SSE (`mcp.posthog.com`) | Browser login on first use | Yuki, Kai, all |
| `clerk` | Remote MCP (`mcp.clerk.com`) | Browser login on first use | Jonah, Alice |

**Prerequisites:**
- Railway CLI installed and authenticated (`npm install -g @railway/cli && railway login`)
- `STRIPE_SECRET_KEY` set in your environment (use test mode key for development)
- PostHog and Clerk MCPs authenticate via browser on first connection

See `skills/development/saas-stack.md` for full integration patterns, env var reference, and service connection map.

## Skills Repository

The `skills/` directory contains reusable reference docs that agents consult when performing specific types of work. See `skills/README.md` for the full index. Categories: research, development, writing, workflow, and AI.
