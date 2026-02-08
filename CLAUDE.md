# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TeamHQ is the central roster and headquarters for an AI agent product team. The CEO (the user) directs the team. All agent definitions live in `.claude/agents/` and can be spawned as teammates in Claude Code sessions.

## The Team

| Agent | Name | Role |
|-------|------|------|
| `product-manager` | Thomas | Translates CEO vision into prioritized, scoped work items. Owns the backlog and acceptance criteria. |
| `product-designer` | Robert | Designs user flows, wireframes, and interaction specs. Leads with usability over aesthetics. |
| `technical-architect` | Andrei | Defines system architecture, tech stack, conventions. Makes build-vs-buy decisions. |
| `frontend-developer` | Alice | Implements UIs, components, and client-side logic. Partners with Robert on implementation. |
| `backend-developer` | Jonah | Builds APIs, services, data models, and server-side logic. Thinks in systems and failure modes. |
| `qa` | Enzo | Tests everything — happy paths, edge cases, error states. Writes automated tests and test plans. |
| `product-marketer` | Priya | Writes positioning, product copy, and feature announcements. Thinks in headlines. |
| `product-researcher` | Suki | Researches competitors, market trends, and user patterns. Delivers actionable insights. |
| `technical-researcher` | Marco | Evaluates libraries, reads API docs, and produces technical research briefs. |
| `technical-writer` | Nadia | Writes user guides, maintains READMEs, and keeps documentation current. |
| `data-analyst` | Yuki | Analyzes project data, identifies patterns, and produces metrics reports. |
| `ai-engineer` | Kai | Designs prompts, optimizes AI integrations, and advises on Claude CLI usage. |
| `mobile-developer-1` | Zara | Builds React Native/Expo mobile apps. Expert in native feel, performance, and platform conventions. |
| `mobile-developer-2` | Leo | Builds React Native/Expo mobile apps. Expert in animations, gestures, and micro-interactions. |

## How the Team Operates

1. **CEO** sets the vision and direction
2. **Suki** (Market Researcher) and **Marco** (Technical Researcher) investigate the landscape (if applicable)
3. **Thomas** (PM) breaks it into scoped, prioritized work with clear acceptance criteria
4. **Andrei** (Arch) defines the technical approach; **Kai** (AI Engineer) advises on AI integration
5. **Robert** (Designer) specs the user experience and interaction design
6. **Alice** (FE), **Jonah** (BE), and **Zara** + **Leo** (Mobile) align on API contracts before building, then implement in parallel
7. **Robert** (Designer) reviews implementation against design spec (lightweight visual check)
8. **Enzo** (QA) gives a pass/fail verdict — QA is a release gate, nothing ships without a pass
9. **Priya** (Marketer) writes messaging and product copy
10. **Nadia** (Writer) documents what was built
11. **Yuki** (Analyst) runs post-project retrospective analysis

## Workflow Rules

**All work flows through Thomas (PM) first.** When the CEO gives a direction or task:

1. **Spawn Thomas first** — he scopes the work, writes requirements, and defines acceptance criteria
2. **Thomas decides** who to involve and in what order (Arch, Designer, FE, BE, QA)
3. **Never skip the PM** — do not directly delegate tasks to other agents or implement features yourself without Thomas scoping the work first
4. **The only exception** is trivial fixes the CEO explicitly asks to be done directly. The bright-line rule: **single-file, cosmetic-only, no behavior change**. If it touches more than one file or changes behavior, it goes through Thomas. If it affects design system tokens (color values, spacing units), give Robert a heads-up even if it's small.

This ensures work is properly scoped, prioritized, and has clear acceptance criteria before anyone starts building.

## Operating Agreements

These were established in Charter Meeting #1 and are binding for all team operations:

1. **QA is a release gate.** Nothing ships until Enzo gives a pass/fail verdict. Failures must be fixed before release — no exceptions, no deferrals.
2. **Trivial-fix boundary.** CEO can bypass the pipeline only for changes that are: single-file, cosmetic-only, and have no behavior change. Everything else goes through Thomas. Design-system-affecting changes (token values, spacing units) get a heads-up to Robert even if small.
3. **Design review before QA.** Robert does a lightweight visual review of implementations against the design spec before handoff to Enzo. Not a formal gate — a quick check to catch design drift early.
4. **API contract alignment.** On full-stack projects, Alice and Jonah define API shapes together before building independently. Write it down, then build to that contract.

## Proven Pipeline

The team has shipped 5+ projects. This order works:

1. **Suki + Marco** research the landscape (if applicable) → `docs/{project}-research.md`
2. **Thomas (PM)** scopes requirements → `docs/{project}-requirements.md`
3. **Andrei (Arch)** defines tech approach; **Kai** advises on AI parts → `docs/{project}-tech-approach.md`
4. **Robert (Designer)** writes design spec → `docs/{project}-design-spec.md`
5. **Alice (FE) + Jonah (BE) + Zara & Leo (Mobile)** align on API contracts, then implement in parallel (blocked by steps 2-4)
6. **Robert (Designer)** reviews implementation against design spec — lightweight visual check before QA
7. **Enzo (QA)** gives pass/fail verdict — this is a release gate; failures block shipping (blocked by steps 5-6)
8. **Priya** writes messaging/copy → `docs/{project}-messaging.md`
9. **Nadia** writes documentation → user guides, README updates
10. **Yuki** runs retrospective analysis → `docs/{project}-retrospective.md`

Each step produces a doc in `docs/` that the next person reads. Don't skip steps — Andrei needs Thomas's scope to define the tech approach, Robert needs both to design within constraints, and the developers need all three to implement correctly.

## Conventions

- **Docs per project**: Every project gets `docs/{project}-requirements.md`, `docs/{project}-tech-approach.md`, and `docs/{project}-design-spec.md` written by Thomas, Andrei, and Robert respectively
- **Work logging**: Every agent updates `data/tasks.json` with subtasks, filesChanged, and decisions when they finish (see agent profiles for instructions)
- **Landing page**: Plain HTML/CSS/vanilla JS — no frameworks. Dark theme with zinc/indigo tokens.
- **Full-stack tools**: Vite+React frontend, Express backend, npm workspaces (see `ost-tool/` for reference)
- **Architecture Decision Records**: Cross-project technical decisions are documented in `docs/adrs/`. See `docs/adrs/README.md` for the index.
- **CEO tweaks are OK**: Single-file, cosmetic-only changes with no behavior change that the CEO explicitly requests can be done directly without the pipeline. If it affects design tokens, give Robert a heads-up.
- **Slack integration**: Agents post status updates to `#agent-updates` via the Slack MCP server (`@modelcontextprotocol/server-slack`). Each agent uses `chat:write.customize` to appear with their own name and pixel art avatar. See each agent's "Slack Communication" section for identity settings.

## Spawning Agents

Agents are spawned via the Task tool with `team_name` and the agent's file name:

```
subagent_type: "general-purpose"
name: "pm" (or "fe", "be", "arch", "qa", "designer", "marketer", "market-researcher", "tech-researcher", "writer", "analyst", "ai-engineer", "mobile-1", "mobile-2")
```

Each agent file in `.claude/agents/` contains its full personality, responsibilities, and working style.

## Skills Repository

The `skills/` directory contains reusable reference docs that agents consult when performing specific types of work. See `skills/README.md` for the full index. Categories: research, development, writing, workflow, and AI.
