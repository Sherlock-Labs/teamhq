# Project Kickoff

**Category:** Workflow
**Used by:** Thomas, all agents
**Last updated:** 2026-02-07

## When to Use

When starting a new project. This checklist ensures the proven pipeline is followed.

## Pipeline Order

```
Suki + Marco (research, if applicable)
  ↓
Thomas (PM) — requirements
  ↓
Andrei (Arch) — tech approach
  ↓
Robert (Designer) — design spec
  ↓
Alice (FE) + Jonah (BE) — implementation (parallel)
  ↓
Enzo (QA) — validation
  ↓
Priya (Marketer) — messaging (if applicable)
  ↓
Nadia (Writer) — documentation
  ↓
Yuki (Analyst) — retrospective (if applicable)
```

## Task Dependencies

When creating tasks in the task list:

1. **Research tasks** (Suki, Marco) — no dependencies, can start immediately
2. **Thomas's task** — blocked by research tasks (if any)
3. **Andrei's task** — blocked by Thomas's requirements
4. **Robert's task** — blocked by Thomas's requirements AND Andrei's tech approach
5. **Alice + Jonah's tasks** — blocked by Thomas, Andrei, AND Robert
6. **Enzo's task** — blocked by Alice AND Jonah
7. **Priya's task** — blocked by implementation (needs to know what was built)
8. **Nadia's task** — blocked by implementation and QA
9. **Yuki's task** — blocked by everything (post-ship analysis)

## What Each Agent Reads and Produces

| Agent | Reads | Produces |
|-------|-------|----------|
| Suki | CEO brief | `docs/{project}-research.md` |
| Marco | CEO brief, requirements | `docs/{project}-technical-research.md` |
| Thomas | CEO brief, research | `docs/{project}-requirements.md` |
| Andrei | Requirements | `docs/{project}-tech-approach.md` (includes file-level change impact classifications) |
| Robert | Requirements, tech approach | `docs/{project}-design-spec.md` |
| Alice | All specs | Implementation code |
| Jonah | All specs | Implementation code |
| Enzo | All specs (especially tech approach for restructuring flags), code | Test results, bug reports |
| Priya | Requirements, design spec | `docs/{project}-messaging.md` |
| Nadia | All docs, code | User guides, README updates |
| Yuki | All data | `docs/{project}-retrospective.md` |

## Checklist

Before starting a project:
- [ ] CEO brief is clear and specific
- [ ] Research is done (if the domain is unfamiliar)
- [ ] Thomas has created tasks with proper dependencies
- [ ] Each task description specifies what to read and what to produce

## Notes

- **Tech approach includes change impact classifications.** Andrei classifies every file in the tech approach as Extend (low risk), Modify (moderate risk), or Restructure (high risk). Files marked Restructure include QA impact notes describing what existing functionality is affected. Enzo should read these before writing his test plan to plan regression testing proactively.

## Anti-patterns

- Skipping Thomas and going straight to implementation
- Starting implementation before the tech approach is defined
- Designing without understanding technical constraints
- Forgetting QA — Enzo should always be the last implementation step
- Not creating blocking dependencies — agents should not start until their inputs are ready
