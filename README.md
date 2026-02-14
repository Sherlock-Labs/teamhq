# TeamHQ

TeamHQ is the central headquarters for **Sherlock Labs' AI agent product team** — a 24-agent team that builds software together, coordinated through [Claude Code](https://claude.ai/code).

The CEO sets the direction. The team does the rest — from research and scoping through architecture, design, implementation, QA, and launch.

## The Team

| Name | Role | Focus |
|------|------|-------|
| **Thomas** | Product Manager | Scopes work, writes requirements, runs the pipeline end-to-end |
| **Andrei** | Technical Architect | Tech stack decisions, system architecture, build-vs-buy |
| **Robert** | Product Designer | User flows, wireframes, interaction specs |
| **Alice** | Front-End Developer | UIs, components, client-side logic |
| **Jonah** | Back-End Developer | APIs, data models, server-side logic |
| **Sam** | Back-End Developer 2 | Parallel backend work, follows Jonah's patterns |
| **Enzo** | QA Engineer | Testing, test plans, release gate |
| **Morgan** | Visual QA | Pixel-perfect design reviews, responsiveness checks |
| **Atlas** | Code Reviewer | Architecture, security, and maintainability reviews |
| **Suki** | Market Researcher | Competitors, market trends, user patterns |
| **Marco** | Technical Researcher | Library evaluation, API docs, technical briefs |
| **Kai** | AI Engineer | Prompts, AI integrations, Claude CLI usage |
| **Priya** | Product Marketer | Positioning, copy, feature announcements |
| **Nadia** | Technical Writer | User guides, READMEs, documentation |
| **Yuki** | Data Analyst | Retrospective analysis, metrics, patterns |
| **Ravi** | Creative Strategist | Product ideas, business models, challenging assumptions |
| **Nina** | FE Interactions | Animations, transitions, micro-interactions |
| **Soren** | FE Responsive | Responsive layouts, CSS Grid/Flexbox, breakpoints |
| **Amara** | FE Accessibility | WCAG compliance, keyboard nav, screen readers |
| **Zara** | Mobile Developer | React Native/Expo — native feel, performance |
| **Leo** | Mobile Developer 2 | React Native/Expo — animations, gestures |
| **Howard** | Payments Engineer | Stripe, subscriptions, webhooks, PCI compliance |
| **Derek** | Integrations | Third-party services, OAuth, webhooks, API syncs |
| **Milo** | DevOps | CI/CD, Railway config, database migrations, monitoring |

Agent definitions live in `.claude/agents/` — each file contains the agent's personality, responsibilities, and working style. All agents run on **Opus**.

## How It Works

All work flows through **Thomas (PM) first**. He scopes the work, then runs the full pipeline autonomously:

```
CEO sets direction
  -> Suki + Marco research (if needed)
  -> Thomas scopes requirements              -> docs/{project}-requirements.md
  -> Andrei defines tech approach             -> docs/{project}-tech-approach.md
  -> In parallel:
     - Robert writes design spec             -> docs/{project}-design-spec.md
     - Jonah + Sam build backend
     - Priya writes messaging
     - Derek / Milo / Howard (if needed)
  -> Alice + Nina/Soren/Amara build frontend
  -> Robert reviews implementation
  -> Enzo validates (release gate)            -> pass/fail
  -> Nadia writes docs
  -> Yuki runs retrospective
```

Each step produces a document in `docs/` that downstream agents read. This creates a clean handoff chain where every agent has the context they need.

### Spawning Agents

Agents are spawned as Claude Code teammates using the `Task` tool:

```
subagent_type: "pm"    # or "fe", "be", "arch", "qa", "designer", etc.
model: "opus"
```

Spawn Thomas first. He scopes the work, writes requirements, and decides which team members to involve and in what order. **Never skip the PM** — the only exception is single-file, cosmetic-only changes with no behavior change.

## Repository Structure

```
teamhq/
├── .claude/agents/           # Agent personality/role definitions (24 agents)
├── index.html                # Landing page
├── css/styles.css            # Styles (light theme, royal jaguar green accent)
├── js/                       # Landing page JS (projects, bug reporter)
├── img/avatars/              # Pixel art SVG avatars for each agent
├── server/                   # Express API for project management (port 3002)
│   └── src/
│       ├── index.ts          # Server entry
│       ├── routes/           # REST endpoints (projects, bugs, work items)
│       └── schemas/          # Zod validation
├── data/
│   ├── projects/             # Individual project JSON files
│   ├── pipeline-log/         # Agent work logs per project
│   ├── work-items/           # Task tracking per project
│   └── bug-screenshots/      # Bug reporter captures
├── docs/                     # Planning docs per project (requirements, tech, design)
│   └── adrs/                 # Architecture Decision Records
├── skills/                   # Reusable reference docs for agents
├── mobile/                   # React Native/Expo mobile app
├── vite.config.ts            # Vite config with /api proxy to Express
├── CLAUDE.md                 # Instructions for Claude Code
└── package.json              # Root package
```

## Product Repos

Products live in their own repositories, not inside TeamHQ. Planning docs stay here in `docs/`.

| Repo | What |
|------|------|
| [Sherlock-Labs/ost-tool](https://github.com/Sherlock-Labs/ost-tool) | Opportunity Solution Tree — Vite+React + Express |
| [Sherlock-Labs/sherlockpdf](https://github.com/Sherlock-Labs/sherlockpdf) | SherlockPDF — PDF tools with Stripe billing |
| [Sherlock-Labs/pdf-splitter](https://github.com/Sherlock-Labs/pdf-splitter) | Client-side PDF splitter |
| [Sherlock-Labs/pdf-combiner](https://github.com/Sherlock-Labs/pdf-combiner) | Client-side PDF combiner |

## Running Locally

```bash
npm install
npm run dev
```

This starts both:
- **Vite** dev server for the landing page (port 5174)
- **Express** API server for project management (port 3002)

Vite proxies `/api` requests to Express.

## Tech Stack

- **Landing page**: Plain HTML, CSS, vanilla JavaScript. No frameworks.
- **API**: Express 5 + TypeScript, Zod validation, JSON file storage.
- **SaaS stack**: Railway (hosting), Clerk (auth), Stripe (payments), PostHog (analytics), Loops (email), Cloudflare R2 (storage).
- **Mobile**: React Native + Expo.
- **Products**: Vite + React + TypeScript frontends, Express backends.

## Operating Agreements

Established in Charter Meeting #1:

1. **QA is a release gate** — nothing ships without Enzo's pass/fail verdict
2. **Design review before QA** — Robert checks implementation against design spec
3. **API contract alignment** — Alice and Jonah define API shapes together before building
4. **Trivial-fix boundary** — CEO can bypass the pipeline only for single-file, cosmetic-only, no-behavior-change fixes

## A Sherlock Labs Project

Built with [Claude Code](https://claude.ai/code).
