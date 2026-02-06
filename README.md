# TeamHQ

TeamHQ is the central headquarters for **Sherlock Labs' AI agent product team** — a six-agent team that works together to build software, coordinated through [Claude Code](https://claude.ai/code).

The team consists of a Product Manager, Technical Architect, Product Designer, Front-End Developer, Back-End Developer, and QA Engineer. Each agent has a defined personality, role, and set of responsibilities. The CEO (you) sets the direction; the team does the rest.

## The Team

| Name | Role | What They Do |
|------|------|-------------|
| **Thomas** | Product Manager | Translates the CEO's vision into scoped, prioritized work. Writes requirements, defines acceptance criteria, decides who to involve. |
| **Andrei** | Technical Architect | Makes tech stack decisions, defines system architecture, and guides the team toward simple, proven approaches. |
| **Robert** | Product Designer | Designs user flows and interaction specs. Leads with usability over aesthetics. Writes implementation-ready design specs. |
| **Alice** | Front-End Developer | Builds UIs with a craftsperson's eye for responsiveness, accessibility, and polish. Implements directly from Robert's specs. |
| **Jonah** | Back-End Developer | Designs APIs, data models, and server-side logic. Thinks in systems and failure modes. |
| **Enzo** | QA Engineer | The team's constructive skeptic. Tests what users actually do, not just the happy path. |

Agent definitions live in `.claude/agents/` — each file contains the agent's full personality, responsibilities, and working style.

## How It Works

All work flows through **Thomas (PM) first**. The pipeline:

```
CEO sets direction
    → Thomas scopes requirements       → docs/{project}-requirements.md
    → Andrei defines tech approach      → docs/{project}-tech-approach.md
    → Robert writes design spec         → docs/{project}-design-spec.md
    → Alice (FE) + Jonah (BE) build     → code changes
    → Enzo validates                    → QA pass/fail
```

Each step produces a document in `docs/` that the next person reads. This creates a clean handoff chain where every agent has the context they need.

### Spawning Agents

Agents are spawned as Claude Code teammates using the `Task` tool:

```
TeamCreate → spawn Thomas first → Thomas recommends who's next
```

Thomas scopes the work, writes requirements, and decides which team members to involve and in what order. Never skip the PM.

### Work Logging

Every agent self-documents their work. When they finish, they update `data/tasks.json` with:
- **subtasks** — what they specifically did
- **filesChanged** — every file they touched
- **decisions** — key trade-offs and why

This gives the CEO a detailed audit trail of what happened on every project.

## Repository Structure

```
teamhq/
├── .claude/agents/          # Agent personality/role definitions
│   ├── product-manager.md   # Thomas
│   ├── technical-architect.md # Andrei
│   ├── product-designer.md  # Robert
│   ├── frontend-developer.md # Alice
│   ├── backend-developer.md # Jonah
│   ├── qa.md                # Enzo
│   └── program-manager.md   # Dan (means well)
│
├── index.html               # Landing page
├── css/styles.css           # Styles (dark theme, zinc/indigo tokens)
├── js/projects.js           # Project management UI (vanilla JS)
├── img/avatars/             # Pixel art SVG avatars
│
├── server/                  # Express API for project management
│   └── src/
│       ├── index.ts         # Server entry (port 3002)
│       ├── routes/projects.ts # REST CRUD endpoints
│       ├── schemas/project.ts # Zod validation schemas
│       ├── store/projects.ts  # JSON file-based storage
│       └── migrate.ts       # One-time migration from tasks.json
│
├── data/
│   ├── tasks.json           # Project history with detailed work logs
│   └── projects/            # Individual project JSON files (API store)
│
├── docs/                    # Requirements, tech approach, design specs
│   ├── {project}-requirements.md
│   ├── {project}-tech-approach.md
│   └── {project}-design-spec.md
│
├── ost-tool/                # Opportunity Solution Tree web app
│   ├── client/              # Vite + React frontend
│   └── server/              # Express backend + Claude CLI integration
│
├── vite.config.ts           # Vite config with /api proxy to Express
├── package.json             # Root package with workspaces
└── CLAUDE.md                # Instructions for Claude Code
```

## Running Locally

### Landing Page + Project Management API

```bash
npm install
npm run dev
```

This starts both:
- **Vite** dev server for the landing page (port 5174)
- **Express** API server for project management (port 3002)

Vite proxies `/api` requests to Express.

### OST Tool

```bash
cd ost-tool
npm install
npm run dev
```

This starts:
- **Vite** dev server for the OST frontend (port 5173)
- **Express** API server for OST backend (port 3001)

Requires Claude CLI installed locally for AI features (`claude -p`).

## Tech Stack

**Landing page**: Plain HTML, CSS, and vanilla JavaScript. No frameworks, no build step beyond Vite's dev server. Dark theme using CSS custom properties (zinc/indigo color system).

**Project management API**: Express 5 + TypeScript, Zod for validation, JSON files on disk for storage. One file per project in `data/projects/`.

**OST Tool**: Vite + React + TypeScript frontend, Express + TypeScript backend, Claude CLI for AI-powered tree generation and debate.

The team deliberately chose the simplest tech that fits each problem: plain HTML/CSS for a mostly-static page, React only where interactivity demands it (OST tree visualization), and file-based storage over a database for a single-user tool.

## Projects Shipped

| Project | What It Is |
|---------|-----------|
| **TeamHQ Landing Page** | The original static landing page introducing the team |
| **OST Tool** | Full-stack Opportunity Solution Tree tool with AI-powered generation, debate, and recommendations |
| **TeamHQ Redesign** | Dark theme, navigation bar, Tools section |
| **Task History** | Expandable project cards with detailed agent work breakdowns |
| **Detailed Work Logging** | Rich task schema + agent self-documentation |
| **Project Management UI** | Web-based CRUD for creating and managing projects |
| **OST Recommendation Redesign** | Simplified colors, expandable debater reasoning, improved hierarchy |

## Design Philosophy

- **Ship incrementally** — every project is phased. Phase 1 is always the minimum useful thing.
- **The PM decides** — Thomas scopes work. The CEO sets direction, Thomas figures out how to get there.
- **Docs are the handoff** — requirements → tech approach → design spec. Each agent reads the previous docs.
- **Simple tech** — use the boring, proven approach. Only add complexity when the problem demands it.
- **Agents self-document** — every agent logs what they did, what they changed, and what they decided.

## A Sherlock Labs Project

Built with [Claude Code](https://claude.ai/code).
