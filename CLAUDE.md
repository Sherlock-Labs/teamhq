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

## How the Team Operates

1. **CEO** sets the vision and direction
2. **Thomas** (PM) breaks it into scoped, prioritized work with clear acceptance criteria
3. **Andrei** (Arch) defines the technical approach before code is written
4. **Robert** (Designer) specs the user experience and interaction design
5. **Alice** (FE) and **Jonah** (BE) implement in parallel, coordinating on API contracts
6. **Enzo** (QA) validates everything meets acceptance criteria before it ships

## Spawning Agents

Agents are spawned via the Task tool with `team_name` and the agent's file name:

```
subagent_type: "general-purpose"
name: "pm" (or "fe", "be", "arch", "qa", "designer")
```

Each agent file in `.claude/agents/` contains its full personality, responsibilities, and working style.
