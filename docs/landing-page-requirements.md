# TeamHQ Landing Page Requirements

## What This Is

A single-page static landing page that introduces TeamHQ: the central headquarters and roster for an AI agent product team. The page should communicate what TeamHQ is, who's on the team, and how the team operates.

Target audience: the CEO (user) and anyone they share the link with to understand the concept.

---

## Sections

### 1. Hero

- Headline communicating the core concept: "Your AI product team, assembled and ready"
- One-liner subhead explaining TeamHQ is a headquarters for a 6-agent AI team
- No CTA button needed — this is informational, not a SaaS signup

### 2. Team Roster

- Grid or card layout showing all 6 agents:
  - **PM** — Product Manager
  - **FE** — Front-End Developer
  - **BE** — Back-End Developer
  - **Arch** — Technical Architect
  - **QA** — QA Engineer
  - **Designer** — Product Designer
- Each card shows: agent name, role title, one-sentence description of what they do
- Descriptions should come from the agent definitions in `.claude/agents/`

### 3. How It Works

- Brief explanation (3-4 steps max) of the team's operating model:
  1. CEO sets direction
  2. PM scopes and prioritizes
  3. Team builds in parallel (Arch, Designer, FE, BE)
  4. QA validates before ship
- Keep it visual — numbered steps or a simple flow, not a wall of text

### 4. Footer

- Minimal footer: project name, a line like "Built with Claude Code"
- No nav links, no social icons, no legal boilerplate

---

## Acceptance Criteria

- [ ] Page loads as a single HTML page (no routing, no SPA framework)
- [ ] All 6 agents are displayed with name, role, and description
- [ ] Operating model is presented in a clear, scannable format
- [ ] Page is responsive — works on desktop and mobile
- [ ] No external API calls or dynamic data fetching at runtime
- [ ] Clean, professional visual design (Designer specs the details)
- [ ] Page content matches the agent definitions in `.claude/agents/`

---

## Out of Scope

- **No interactivity beyond basic responsiveness** — no chat, no forms, no modals
- **No authentication or user accounts**
- **No backend or database** — purely static
- **No multi-page navigation** — single page only
- **No CMS or content management** — content is hardcoded
- **No analytics or tracking scripts**
- **No deployment pipeline** — we'll figure that out later

---

## Tech Stack Decision

Deferred to Arch. PM recommendation: keep it dead simple. A single `index.html` with inline or co-located CSS is fine. No build step unless Arch has a strong reason.

---

## Dependencies

- Agent definitions in `.claude/agents/` (content source for roster section)
- Designer specs for layout, typography, colors (blocks visual implementation)
- Arch decision on tech approach (blocks FE implementation)

---

## Notes

This is milestone 1. The landing page exists to give TeamHQ a face. We can iterate on it later — ship something clean now, polish later.
