# Project Kickoff

**Category:** Workflow
**Used by:** Thomas, all agents
**Last updated:** 2026-02-11

## When to Use

When starting a new project. This checklist ensures the proven pipeline is followed.

## Pipeline Order

```
Phase 1 — Research (if applicable)
  Suki + Marco (parallel)
    ↓
Phase 2 — Scope
  Thomas (PM) — requirements
    ↓
Phase 3 — Architecture
  Andrei (Arch) — tech approach; Kai (AI) advises
  [If Restructure flags] → Early QA notification to Enzo (non-blocking)
    ↓
Phase 4 — Design + Backend + Messaging (PARALLEL)
  ┌──────────────────────────────────────────────────────┐
  │  Robert (Designer) — design spec                     │
  │  Jonah + Sam (BE) — backend implementation           │
  │  Priya (Marketer) — messaging/copy                   │
  │  Derek (Integrations) — third-party services (if needed) │
  │  Milo (DevOps) — infrastructure/CI (if needed)       │
  │  Howard (Payments) — payment flows (if needed)       │
  └──────────────────────────────────────────────────────┘
    ↓ (Robert's design spec + backend API ready)
Phase 5 — Frontend/Mobile Implementation
  Alice (FE) + Zara & Leo (Mobile)
  Nina (Interactions) + Soren (Responsive) + Amara (A11y) — for UI-heavy features
    ↓
Phase 6 — Review
  Robert (Designer) — design review
  Nina + Soren + Amara — review (for UI-heavy features)
    ↓
Phase 7 — QA + Docs (PARALLEL)
  ┌──────────────────────────────────────────┐
  │  Enzo (QA) — validation (release gate)   │
  │  Nadia (Writer) — documentation          │
  └──────────────────────────────────────────┘
    ↓
Phase 8 — Retrospective
  Yuki (Analyst) — retrospective (can start data collection during QA)

Ravi (Strategist) — available at any phase for creative direction
```

## Task Dependencies

When creating tasks in the task list:

1. **Research tasks** (Suki, Marco) — no dependencies, can start immediately
2. **Thomas's task** — blocked by research tasks (if any)
3. **Andrei's task** — blocked by Thomas's requirements. Kai advises on AI parts.
4. **Early QA notification** (conditional) — if Andrei's tech approach contains any Restructure-classified files, notify Enzo with the file names and QA impact notes. Non-blocking.
5. **Phase 4 parallel track** — all blocked by Andrei's tech approach (and Thomas's requirements):
   - **Robert's task** — blocked by Thomas + Andrei
   - **Jonah + Sam's tasks** — blocked by Thomas + Andrei (NOT by Robert — backend doesn't need the design spec)
   - **Priya's task** — blocked by Thomas only (needs requirements, not working code)
   - **Derek's task** (if needed) — blocked by Andrei's tech approach
   - **Milo's task** (if needed) — blocked by Andrei's tech approach
   - **Howard's task** (if needed) — blocked by Thomas + Andrei
6. **Alice + Zara & Leo's tasks** — blocked by Robert's design spec AND Jonah's backend API. Nina, Soren, Amara contribute for UI-heavy features.
7. **Robert's design review** — blocked by implementation (Alice + Jonah). Nina, Soren, Amara also review for UI-heavy features.
8. **Enzo's task** — blocked by Robert's design review (arrives with pre-planned regression cases if notified in step 4)
9. **Nadia's task** — blocked by implementation only (runs parallel with Enzo). Revises if QA causes changes.
10. **Yuki's task** — can begin data collection during QA; final retro after ship

## What Each Agent Reads and Produces

| Agent | Reads | Produces |
|-------|-------|----------|
| Suki | CEO brief | `docs/{project}-research.md` |
| Marco | CEO brief, requirements | `docs/{project}-technical-research.md` |
| Thomas | CEO brief, research | `docs/{project}-requirements.md` |
| Andrei | Requirements | `docs/{project}-tech-approach.md` (includes file-level change impact classifications) |
| Kai | Requirements, tech approach | AI integration advice (within tech approach) |
| Robert | Requirements, tech approach | `docs/{project}-design-spec.md` |
| Alice | Requirements, tech approach, design spec | Frontend implementation code |
| Jonah | Requirements, tech approach | Backend implementation code (does NOT need design spec) |
| Sam | Requirements, tech approach | Backend implementation code (follows Jonah's patterns) |
| Zara & Leo | Requirements, tech approach, design spec | Mobile implementation code |
| Nina | Design spec, implementation code | Interaction/animation refinements |
| Soren | Design spec, implementation code | Responsive layout refinements |
| Amara | Design spec, implementation code | Accessibility refinements |
| Derek | Tech approach | Third-party service integrations |
| Milo | Tech approach | Infrastructure/CI setup |
| Howard | Requirements, tech approach | Payment flow implementation |
| Enzo | All specs, code (especially tech approach for restructuring flags) | Test results, bug reports |
| Priya | Requirements | `docs/{project}-messaging.md` |
| Nadia | All docs, code | User guides, README updates |
| Yuki | All data | `docs/{project}-retrospective.md` |
| Ravi | CEO brief, requirements | Creative direction, business model input |

## Checklist

Before starting a project:
- [ ] CEO brief is clear and specific
- [ ] Research is done (if the domain is unfamiliar)
- [ ] Thomas has created tasks with proper dependencies
- [ ] Each task description specifies what to read and what to produce
- [ ] Phase 4 parallel agents are identified (which of Jonah/Sam, Priya, Derek, Milo, Howard are needed?)

## Notes

- **Tech approach includes change impact classifications.** Andrei classifies every file in the tech approach as Extend (low risk), Modify (moderate risk), or Restructure (high risk). Files marked Restructure include QA impact notes describing what existing functionality is affected. Enzo should read these before writing his test plan to plan regression testing proactively.
- **Early QA notification for Restructure flags.** After Andrei completes the tech approach, the pipeline orchestrator (Thomas / CEO) checks for Restructure-classified files. If any exist, Enzo receives a notification with: (1) which files are classified as Restructure, (2) the QA impact notes for each, and (3) an instruction to draft regression test cases for those areas. This is non-blocking — Phase 4 proceeds in parallel. Enzo doesn't start testing; he starts planning.
- **Jonah doesn't need Robert.** Backend work (APIs, schemas, business logic) depends on requirements + tech approach. API contracts are defined in the tech approach, not negotiated during implementation. This is validated across 5+ shipped projects.
- **Priya doesn't need working code.** Messaging is about what the product IS, not how it's implemented. If scope changes during build (rare), she does a revision pass.
- **Nadia can overlap with Enzo.** Docs are based on what was built, not whether QA passed. QA bug fixes rarely change documented behavior. She revises if needed.

## Anti-patterns

- Skipping Thomas and going straight to implementation
- Starting implementation before the tech approach is defined
- Designing without understanding technical constraints
- Making Jonah wait for Robert's design spec (he doesn't need it)
- Making Priya wait for implementation (she doesn't need working code)
- Making Nadia wait for QA to finish (she can write docs in parallel)
- Forgetting QA — Enzo should always be the release gate
- Not creating blocking dependencies — agents should not start until their inputs are ready
- Forgetting to identify which Phase 4 agents are needed for this specific project
