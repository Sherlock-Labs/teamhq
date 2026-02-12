# Pipeline Parallelism Analysis

**Project:** pipeline-parallelism
**Author:** Thomas (PM)
**Date:** 2026-02-11
**Source:** Charter Meeting #10

---

## Problem Statement

The current pipeline is documented as a linear sequence of 11 steps. In practice, some steps already run in parallel (Alice + Jonah), but the documentation and team habits treat most steps as strictly sequential. The question is: which dependencies are real (one step's output is another step's input) and which are just convention?

## Current Pipeline (as documented)

```
1. Suki + Marco — research
2. Thomas — requirements
3. Andrei — tech approach
4. Early QA notification (conditional, non-blocking)
5. Robert — design spec
6. Alice + Jonah + Zara & Leo — implementation (parallel)
7. Robert — design review
8. Enzo — QA
9. Priya — messaging/copy
10. Nadia — documentation
11. Yuki — retrospective
```

## Dependency Analysis

### True Sequential Dependencies (one MUST finish before the next starts)

These are hard gates. The downstream step literally cannot do its job without the upstream step's output.

| Upstream | Downstream | Why It's a Hard Dependency |
|----------|------------|---------------------------|
| Research (1) | Thomas (2) | Thomas needs research findings to scope correctly. Without market/tech research, requirements are guesswork. |
| Thomas (2) | Andrei (3) | Andrei needs defined scope to make architecture decisions. What gets built determines how it gets built. |
| Thomas (2) | Robert (5) | Robert needs requirements to know what user problems to design for. He also needs the tech approach (see below). |
| Andrei (3) | Robert (5) | Robert needs technical constraints (what's feasible, what components exist, what the data model looks like) to design within reality. Designing without constraints leads to round-trips. |
| Andrei (3) | Alice + Jonah (6) | Developers need the tech approach to know the stack, file structure, schemas, and API contracts. |
| Robert (5) | Alice (6) | Alice needs the design spec to build the UI. Without it, she's guessing at layouts, interactions, and component specs. |
| Thomas (2) + Andrei (3) | Jonah (6) | Jonah needs requirements for business logic and tech approach for schemas/API contracts. He does NOT need Robert's design spec (backend is UI-independent). |
| Alice + Jonah (6) | Robert review (7) | Robert can't review what hasn't been built yet. |
| Robert review (7) | Enzo (8) | QA should test the final implementation, including any design-review fixes. Testing before review means re-testing after fixes. |
| Alice + Jonah (6) | Enzo (8) | Enzo needs working code to test. |
| Alice + Jonah (6) | Priya (9) | Priya needs to know what was actually built (not just what was planned) to write accurate messaging. |
| Enzo (8) | Ship | Nothing ships without QA pass. This is a release gate. |

### Already-Parallel Steps (documented and practiced)

| Steps | How They Run |
|-------|-------------|
| Suki + Marco (1) | Research runs in parallel — market and tech research are independent. |
| Alice + Jonah (6) | Implementation runs in parallel after API contract alignment. Proven across 5+ projects. |
| Early QA notification (4) | Already documented as non-blocking. Steps 5-6 proceed while Enzo plans. |

### Parallelism Opportunities (not currently exploited)

These are the actionable findings. Steps that could run simultaneously because they don't depend on each other's output.

#### Opportunity 1: Robert (design) + Jonah (backend) can start at the same time

**Current:** Robert (5) finishes, then Alice + Jonah (6) start.
**Proposed:** After Andrei finishes, Robert and Jonah start in parallel.

**Why this works:**
- Jonah needs Thomas's requirements + Andrei's tech approach. He does NOT need Robert's design spec. Backend work is API routes, database schemas, business logic, and WebSocket handlers -- none of which depend on visual design.
- Robert needs Thomas's requirements + Andrei's tech approach. He does NOT need Jonah's code.
- They are genuinely independent. Robert's output (design spec) feeds Alice. Jonah's output (working API) feeds Alice.

**What changes:**
- Jonah starts immediately after Andrei, in parallel with Robert.
- Alice still waits for both Robert and Jonah (she needs the design spec AND the API to build against).
- API contract alignment happens between Thomas/Andrei and Jonah (the contract is already defined in the tech approach doc, not negotiated during implementation).

**Risk:** Low. API contract is defined in the tech approach. If Robert's design spec reveals a need for a new endpoint Andrei didn't anticipate, Jonah can add it -- but this is rare and addressable mid-sprint.

**Time saved:** Robert's design phase (the full duration of design spec writing) is no longer on the critical path for backend work. On the Roadmap Tool project, this would have saved the entire design spec phase for backend start time.

**Evidence from past projects:**
- Work Item Tracker: Jonah's entire backend (schemas, store, routes, curl testing) had zero dependencies on Robert's design spec. He built from Thomas's requirements + Andrei's tech approach exclusively.
- Roadmap Tool: Jonah built 16 tables, 40+ API endpoints, WebSocket server, services layer -- all from requirements + tech approach. Robert's design spec informed zero backend decisions.
- Dashboard Navigation: No backend work needed -- but the pattern holds: backend work reads requirements + tech approach, not design spec.

#### Opportunity 2: Priya (messaging) can start after Thomas, not after implementation

**Current:** Priya (9) waits for implementation to finish.
**Proposed:** Priya starts after Thomas's requirements are done.

**Why this works:**
- Priya writes product positioning, feature announcements, and marketing copy. This is based on what the product IS, not how it's implemented.
- Thomas's requirements doc tells Priya everything she needs: what problem it solves, who it's for, what the key features are, what the competitive differentiators are.
- She doesn't need to see working code to write "Roadmap Tool: Beautiful roadmaps, built for speed" or a feature announcement.

**What changes:**
- Priya can start as soon as Thomas finishes requirements.
- If implementation reveals significant scope cuts, Priya may need a revision pass -- but this is cheaper than waiting for the full build.

**Risk:** Medium. If scope changes significantly during implementation, messaging needs updating. Mitigated by: (a) our scope rarely changes -- Thomas's requirements are the contract, and (b) Priya can do a quick revision pass after QA if needed.

**Time saved:** Priya's work moves entirely off the critical path. She finishes before implementation is done, rather than waiting until after QA.

#### Opportunity 3: Nadia (docs) can overlap with Enzo (QA)

**Current:** Nadia (10) waits for QA to pass.
**Proposed:** Nadia starts writing docs after implementation finishes (in parallel with Enzo's QA).

**Why this works:**
- Nadia writes user guides and README content based on the built product. She needs working code to document, but she doesn't need QA approval.
- If QA finds bugs and implementation changes, Nadia updates the affected doc sections -- but the vast majority of documentation (setup, usage, architecture overview) won't change from bug fixes.

**What changes:**
- Nadia starts when implementation is done, at the same time as Enzo.
- If QA causes significant rework, Nadia does a revision pass. But QA failures are typically small fixes, not scope changes.

**Risk:** Low. QA failures rarely change the documented behavior. The worst case is Nadia updates a paragraph or two.

**Time saved:** Nadia's entire work phase runs in parallel with QA instead of serially after it.

#### Opportunity 4: Yuki (retrospective) can start data collection during QA

**Current:** Yuki (11) starts after everything ships.
**Proposed:** Yuki begins collecting data and drafting analysis once implementation finishes.

**Why this works:**
- Most retrospective data (timeline, agent task counts, decisions made, blockers hit) is available once implementation is done. Yuki doesn't need QA results to analyze the process.
- QA results add one data point (pass/fail, number of bugs found) which can be appended after the fact.

**Risk:** Minimal. Yuki just adds QA data to an already-drafted retro.

**Time saved:** Small. Yuki's work is fast and post-ship, so the time savings are marginal. But it removes the artificial serialization.

### Steps That CANNOT Be Parallelized Further

| Step | Why It's Stuck Sequential |
|------|--------------------------|
| Thomas (2) after Research (1) | Thomas literally reads research output. Can't scope what you haven't researched. |
| Andrei (3) after Thomas (2) | Architecture depends on scope. Different features require different technical decisions. |
| Robert (5) after Andrei (3) | Design must respect technical constraints. Designing without knowing the data model or rendering approach leads to infeasible designs. Proven by the Roadmap Tool -- Robert needed to know "custom SVG, not a Gantt library" to design the Timeline View correctly. |
| Alice (6) after Robert (5) | Frontend needs the design spec. Building UI without a spec means guessing, then reworking. |
| Robert review (7) after implementation (6) | Can't review what doesn't exist. |
| Enzo (8) after Robert review (7) | Testing before design review means re-testing after fixes. This ordering prevents double QA effort. |

## Proposed Optimized Pipeline

```
1. Suki + Marco — research (parallel)
   |
2. Thomas — requirements
   |
   +----> Priya — messaging/copy (can start here)
   |
3. Andrei — tech approach
   |
   +----> [If Restructure flags] Early QA notification to Enzo (non-blocking)
   |
   +------+
   |      |
4a. Robert — design spec    4b. Jonah (+ Sam) — backend implementation
   |                              |
   +------> Alice (+ Zara, Leo) — frontend implementation <--+
                |
            [Implementation done]
                |
         +------+------+
         |      |      |
    5. Robert   6. Enzo    7. Nadia — docs (parallel)
       review     QA          |
         |      |             |
         +---> Enzo          Nadia revises (if QA causes changes)
               (tests after
                review fixes)
                |
            8. Yuki — retrospective
```

**Visual summary of changes:**
- Jonah moves up to run parallel with Robert (was serial after Robert)
- Priya moves up to run parallel with Andrei/Robert/Jonah (was serial after QA)
- Nadia moves up to run parallel with Enzo (was serial after QA)
- Yuki can begin data collection during QA (was serial after everything)

## Critical Path Analysis

**Current critical path (longest serial chain):**
Research -> Thomas -> Andrei -> Robert -> Implementation -> Robert review -> Enzo -> Priya -> Nadia -> Yuki

That's 10 serial steps. Every step on this chain adds directly to total project time.

**Proposed critical path:**
Research -> Thomas -> Andrei -> Robert -> Alice (FE) -> Robert review -> Enzo -> Yuki

That's 8 serial steps. Jonah, Priya, and Nadia are removed from the critical path entirely.

**What's still on the critical path that can't be removed:**
- Research -> Thomas -> Andrei: Hard dependencies. Each step reads the previous output.
- Andrei -> Robert: Design needs technical constraints.
- Robert -> Alice: Frontend needs the design spec.
- Alice -> Robert review -> Enzo: Build, verify design fidelity, then test. Can't compress.

**Note:** Jonah's backend work running parallel with Robert means Alice can potentially start frontend work sooner -- she can stub API calls against Jonah's already-running (or already-complete) backend instead of waiting for both Robert AND Jonah to finish sequentially. In practice, on larger projects, Jonah often finishes before Robert, so Alice can start building against real APIs immediately when the design spec lands.

## Impact Assessment

| Change | Time Saved | Risk | Recommendation |
|--------|-----------|------|----------------|
| Jonah parallel with Robert | High -- removes Robert's full phase from backend start time | Low -- API contracts defined in tech approach | **Do this immediately** |
| Priya after Thomas | Medium -- removes Priya from critical path entirely | Medium -- may need revision if scope changes | **Do this immediately** |
| Nadia parallel with Enzo | Low-Medium -- saves Nadia's full phase from critical path | Low -- QA fixes rarely change documented behavior | **Do this immediately** |
| Yuki data collection during QA | Low -- small time savings | Minimal | **Do this, but low priority** |

## Implementation

This is a process change, not a code change. To implement:

1. **Update CLAUDE.md** "Proven Pipeline" section to reflect the parallel steps
2. **Update `skills/workflow/project-kickoff.md`** pipeline diagram and task dependencies
3. **Update Thomas's agent definition** to reflect the new spawning order
4. **No code changes required**

## What NOT to Change

- **Alice still waits for Robert AND Jonah/Andrei.** Frontend needs the design spec and API contracts. Don't start Alice early.
- **Enzo still waits for Robert's review.** Testing before design fixes means double testing.
- **Robert's design spec still waits for Andrei.** Design without technical constraints causes rework. This was explicitly validated on the Roadmap Tool.
- **QA is still a release gate.** Nothing changes here.
- **API contract alignment still happens.** It's just defined in the tech approach doc rather than negotiated during implementation. Andrei defines contracts, Jonah builds to them.

## Open Questions

None. This analysis is based on observed evidence from 5+ shipped projects. The dependencies are well-understood and the parallelism opportunities are low-risk.

## Appendix: Evidence from Shipped Projects

**Roadmap Tool** (largest project to date):
- Jonah built 16 tables, 40+ endpoints, WebSocket server using only requirements + tech approach. Zero dependencies on Robert's design spec.
- Alice used requirements + tech approach + design spec for all frontend work. She needed all three.
- Priya and Nadia were serial after QA -- could have started earlier.

**Work Item Tracker:**
- Jonah built schemas, store, routes, and tested via curl. His inputs were requirements + tech approach only.
- Robert's design spec informed only Alice's frontend work.
- Alice + Jonah ran in parallel after all specs were done -- but Jonah could have started during Robert's design phase.

**Dashboard Navigation:**
- No backend work needed. Robert -> Alice -> Enzo pipeline was correctly serial.
- Demonstrates that not every project benefits from the same parallelism -- the optimization is conditional on having backend work.

**Early QA Notification:**
- Pure process project. No Andrei, Robert, Alice, or Jonah needed. Thomas handled it solo.
- Demonstrates that the pipeline should be adaptive, not rigid -- skip steps that aren't needed.
