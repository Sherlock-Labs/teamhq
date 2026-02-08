# Update Operating Docs — Requirements

**Project:** update-operating-docs
**Author:** Thomas (PM)
**Source:** Charter Meeting #1 (2026-02-07)
**Priority:** Medium

## Summary

Update CLAUDE.md and agent definition files to codify the four new operating agreements established in Charter Meeting #1. These agreements formalize practices the team discussed and committed to. The docs should reflect reality — what we actually agreed to — not aspirational process.

## Background

The charter meeting produced seven decisions. Four of them require documentation updates because they change how the team operates day-to-day:

1. **QA as release gate** — Enzo's QA pass is mandatory before anything ships. Pass/fail verdict required. Failures block release.
2. **Trivial-fix boundary** — Single-file, cosmetic-only, no behavior change = CEO can do directly. Everything else goes through Thomas. Design-system-affecting changes get a heads-up to Robert.
3. **Design review step** — Robert does a lightweight visual review of implementations against the design spec before handoff to QA. Not a formal gate, just a quick check.
4. **API contract review** — Alice and Jonah align on API shapes before building on full-stack projects. Define the contract together, then build independently.

## Scope

### In Scope

**1. Update CLAUDE.md** (primary deliverable)

Changes to the "Workflow Rules" section:
- Replace the vague "trivial fixes" exception with the specific bright-line rule: single-file, cosmetic-only, no behavior change. Note that design-system-affecting changes (token values, spacing units) need a heads-up to Robert even if small.

Changes to the "Proven Pipeline" section:
- Insert a design review step between implementation (step 5) and QA (step 6): "Robert reviews implementation against design spec (lightweight visual check)"
- Insert an API contract step: after design spec (step 4), note that Alice and Jonah align on API contracts before building in parallel
- Strengthen QA language: make it explicit that QA is a release gate with pass/fail verdict, not just "validates"

Changes to the "How the Team Operates" section:
- Update step 6 (Alice/Jonah) to mention API contract alignment happening before parallel implementation
- Update step 7 (Enzo) to say "release gate" language — nothing ships without QA pass

Add a new section: "Operating Agreements" (or fold into existing sections)
- QA as release gate: mandatory pass/fail verdict, failures block release
- Trivial-fix boundary: one file, cosmetic only, no behavior change
- Design review: Robert checks implementation before QA handoff
- API contract review: FE+BE align on API shapes before building

**2. Update agent definition files**

`qa.md` (Enzo):
- Add language about QA being a release gate (not just validation). His verdict is pass/fail and it blocks release.
- This is already partially there ("give a clear pass/fail verdict") but needs strengthening to match the "release gate" commitment.

`product-designer.md` (Robert):
- Add the design review responsibility: review implementations against design spec before QA handoff
- Add note about receiving heads-up on CEO tweaks that affect design system tokens

`frontend-developer.md` (Alice):
- Add API contract alignment step: define API shapes with Jonah before building
- Add design review step: Robert reviews before handoff to QA

`backend-developer.md` (Jonah):
- Add API contract alignment step: define API shapes with Alice before building
- This is partially there ("design APIs collaboratively") but needs to be formalized as a required step

`product-manager.md` (Thomas — self):
- Update task creation guidance to include the design review step between implementation and QA
- Update trivial-fix exception definition
- Add technical constraints reminder (from Andrei's feedback: include performance targets, browser support, infrastructure constraints in requirements)

### Out of Scope

- Mission statement addition to CLAUDE.md (separate project if desired)
- 30/60/90 day roadmap documentation (separate project)
- Design token consolidation (separate action item from charter)
- ADR log creation (Andrei's action item, separate project)
- Backend pattern documentation (Jonah's action item, separate project)
- Performance budgets, monitoring, accessibility audit processes (discussed in charter open floor, not formalized as operating agreements)

### Deferred

- Adding the charter meeting mission statement to CLAUDE.md or landing page (CEO decision — out of scope for this project)
- Updating the skills/ repository with the new operating agreements (can be done later if valuable)

## Acceptance Criteria

1. CLAUDE.md "Workflow Rules" section includes the specific trivial-fix bright-line rule (single-file, cosmetic-only, no behavior change) with the Robert heads-up note
2. CLAUDE.md "Proven Pipeline" section includes:
   - API contract alignment between steps 4 and 5
   - Design review between steps 5 and 6
   - Strengthened QA release gate language at step 6
3. CLAUDE.md "How the Team Operates" section reflects the updated pipeline steps
4. A clear "Operating Agreements" subsection exists in CLAUDE.md (or equivalent visibility) documenting all four agreements
5. `qa.md` explicitly states QA is a release gate that blocks shipping
6. `product-designer.md` includes the design review responsibility and design-system heads-up note
7. `frontend-developer.md` includes API contract alignment step and design review awareness
8. `backend-developer.md` includes formalized API contract alignment step
9. `product-manager.md` includes updated pipeline steps, trivial-fix definition, and technical constraints reminder
10. All changes are consistent with each other — no contradictions between CLAUDE.md and agent files
11. No existing content is removed unless it directly contradicts a new agreement
12. Language is concise and actionable — these are operating rules, not aspirational prose

## Team Involvement

| Agent | Role in This Project | Blocked By |
|-------|---------------------|------------|
| Thomas (PM) | Write requirements, define scope | — |
| Nadia (Writer) | Execute all doc updates across CLAUDE.md and agent files | Thomas |
| Andrei (Arch) | Review technical accuracy of changes (optional, lightweight) | Nadia |

**Why Nadia, not the team lead directly?**
This is a documentation project. Nadia is the technical writer — her job is keeping CLAUDE.md and team docs accurate and current. She'll ensure consistent terminology, no contradictions, and clean formatting across all files. The changes are straightforward enough that Andrei's review is optional but recommended as a sanity check.

## Notes for Nadia

- Read the full charter meeting transcript at `data/meetings/fac2deb3-141d-4ca6-a799-2e4e7ae5c220.json` — the decisions section has the canonical wording
- The existing CLAUDE.md is well-structured. Preserve its style. Don't over-write.
- Agent files each have their own voice/style. Match each file's existing tone when adding content.
- The changes are additive — you're strengthening and clarifying, not restructuring.
- The "Proven Pipeline" numbering will shift when you insert new steps. Re-number carefully.
