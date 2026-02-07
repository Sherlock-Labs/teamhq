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

## How the Team Operates

1. **CEO** sets the vision and direction
2. **Suki** (Market Researcher) and **Marco** (Technical Researcher) investigate the landscape (if applicable)
3. **Thomas** (PM) breaks it into scoped, prioritized work with clear acceptance criteria
4. **Andrei** (Arch) defines the technical approach; **Kai** (AI Engineer) advises on AI integration
5. **Robert** (Designer) specs the user experience and interaction design
6. **Alice** (FE) and **Jonah** (BE) implement in parallel, coordinating on API contracts
7. **Enzo** (QA) validates everything meets acceptance criteria before it ships
8. **Priya** (Marketer) writes messaging and product copy
9. **Nadia** (Writer) documents what was built
10. **Yuki** (Analyst) runs post-project retrospective analysis

## Workflow Rules

**All work flows through Thomas (PM) first.** When the CEO gives a direction or task:

1. **Spawn Thomas first** — he scopes the work, writes requirements, and defines acceptance criteria
2. **Thomas decides** who to involve and in what order (Arch, Designer, FE, BE, QA)
3. **Never skip the PM** — do not directly delegate tasks to other agents or implement features yourself without Thomas scoping the work first
4. **The only exception** is trivial fixes the CEO explicitly asks to be done directly (typos, one-line changes, etc.)

This ensures work is properly scoped, prioritized, and has clear acceptance criteria before anyone starts building.

## Proven Pipeline

The team has shipped 5+ projects. This order works:

1. **Suki + Marco** research the landscape (if applicable) → `docs/{project}-research.md`
2. **Thomas (PM)** scopes requirements → `docs/{project}-requirements.md`
3. **Andrei (Arch)** defines tech approach; **Kai** advises on AI parts → `docs/{project}-tech-approach.md`
4. **Robert (Designer)** writes design spec → `docs/{project}-design-spec.md`
5. **Alice (FE) + Jonah (BE)** implement in parallel (blocked by steps 2-4)
6. **Enzo (QA)** validates against acceptance criteria (blocked by step 5)
7. **Priya** writes messaging/copy → `docs/{project}-messaging.md`
8. **Nadia** writes documentation → user guides, README updates
9. **Yuki** runs retrospective analysis → `docs/{project}-retrospective.md`

Each step produces a doc in `docs/` that the next person reads. Don't skip steps — Andrei needs Thomas's scope to define the tech approach, Robert needs both to design within constraints, and the developers need all three to implement correctly.

## Conventions

- **Docs per project**: Every project gets `docs/{project}-requirements.md`, `docs/{project}-tech-approach.md`, and `docs/{project}-design-spec.md` written by Thomas, Andrei, and Robert respectively
- **Work logging**: Every agent updates `data/tasks.json` with subtasks, filesChanged, and decisions when they finish (see agent profiles for instructions)
- **Landing page**: Plain HTML/CSS/vanilla JS — no frameworks. Dark theme with zinc/indigo tokens.
- **Full-stack tools**: Vite+React frontend, Express backend, npm workspaces (see `ost-tool/` for reference)
- **CEO tweaks are OK**: Small visual fixes (color adjustments, text changes, layout tweaks) that the CEO explicitly requests can be done directly without the full pipeline

## Spawning Agents

Agents are spawned via the Task tool with `team_name` and the agent's file name:

```
subagent_type: "general-purpose"
name: "pm" (or "fe", "be", "arch", "qa", "designer", "marketer", "market-researcher", "tech-researcher", "writer", "analyst", "ai-engineer")
```

Each agent file in `.claude/agents/` contains its full personality, responsibilities, and working style.

## Skills Repository

The `skills/` directory contains reusable reference docs that agents consult when performing specific types of work. See `skills/README.md` for the full index. Categories: research, development, writing, workflow, and AI.
