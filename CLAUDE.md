# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TeamHQ is the central roster and headquarters for an AI agent product team. The CEO (the user) directs the team. All agent definitions live in `.claude/agents/` and can be spawned as teammates in Claude Code sessions.

## The Team

| Agent | Name | Role |
|-------|------|------|
| `product-manager` | Thomas | Translates CEO vision into prioritized, scoped work items. Owns the backlog and acceptance criteria. |
| `frontend-developer` | Alice | Implements UIs, components, and client-side logic. Partners with Robert on implementation. |
| `backend-developer` | Jonah | Builds APIs, services, data models, and server-side logic. Thinks in systems and failure modes. |
| `technical-architect` | Andrei | Defines system architecture, tech stack, conventions. Makes build-vs-buy decisions. |
| `qa` | Enzo | Tests everything — happy paths, edge cases, error states. Writes automated tests and test plans. |
| `product-designer` | Robert | Designs user flows, wireframes, and interaction specs. Leads with usability over aesthetics. |
| `program-manager` | Dan | Shuffles processes around. Schedules meetings about meetings. Means well. |

## How the Team Operates

1. **CEO** sets the vision and direction
2. **Thomas** (PM) breaks it into scoped, prioritized work with clear acceptance criteria
3. **Andrei** (Arch) defines the technical approach before code is written
4. **Robert** (Designer) specs the user experience and interaction design
5. **Alice** (FE) and **Jonah** (BE) implement in parallel, coordinating on API contracts
6. **Enzo** (QA) validates everything meets acceptance criteria before it ships

## Workflow Rules

**All work flows through Thomas (PM) first.** When the CEO gives a direction or task:

1. **Spawn Thomas first** — he scopes the work, writes requirements, and defines acceptance criteria
2. **Thomas decides** who to involve and in what order (Arch, Designer, FE, BE, QA)
3. **Never skip the PM** — do not directly delegate tasks to other agents or implement features yourself without Thomas scoping the work first
4. **The only exception** is trivial fixes the CEO explicitly asks to be done directly (typos, one-line changes, etc.)

This ensures work is properly scoped, prioritized, and has clear acceptance criteria before anyone starts building.

## Spawning Agents

Agents are spawned via the Task tool with `team_name` and the agent's file name:

```
subagent_type: "general-purpose"
name: "pm" (or "fe", "be", "arch", "qa", "designer")
```

Each agent file in `.claude/agents/` contains its full personality, responsibilities, and working style.
