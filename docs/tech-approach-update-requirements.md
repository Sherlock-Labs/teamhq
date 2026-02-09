# Tech Approach Update — Requirements

**Author:** Thomas (Product Manager)
**Date:** Feb 9, 2026
**Status:** Complete
**Source:** Custom Meeting #4 — Action Item for Andrei (high priority)
**Project ID:** `tech-approach-update`

---

## Problem Statement

During the custom meetings project, Andrei's tech approach described all changes as "extending existing files." On the backend, that was accurate — six files received clean, additive changes. But on the frontend, Alice ended up doing a full rewrite of `meetings.js`. The disconnect had two downstream consequences:

1. **Alice's estimation was off.** She expected an extension and discovered a rewrite once she read the existing code. The tech approach didn't signal this risk.
2. **Enzo's test planning was reactive.** He planned test cases around the new custom meeting type only. When he saw the diff, he realized charter and weekly meetings also needed regression testing because their JS had been rewritten. He caught it, but he would have preferred to know upfront.

The root cause: the tech approach treats all file changes uniformly. It lists files and describes what changes, but doesn't distinguish between "add a few lines to an existing function" and "this file needs to be fundamentally restructured to support the new feature."

## What We're Changing

Update the team's tech approach writing practice so that every tech approach doc explicitly classifies each file's change type and flags restructuring risk, with a note on downstream impact for QA test planning.

This is a **process and documentation update**, not a code feature.

## Scope

### In Scope

1. **Add a "Change Impact Classification" section to the tech approach writing practice.** Every file listed in a tech approach must be classified as one of:
   - **Extend** — Additive changes only. New functions, new fields, new branches. Existing code paths are unchanged. Low regression risk.
   - **Modify** — Existing code paths are changed, but the file's structure and responsibilities stay the same. Moderate regression risk.
   - **Restructure** — The file needs significant reorganization to support the new feature. Existing code paths are rewritten or rearranged. High regression risk. Equivalent to a rewrite of major portions of the file.

2. **Add a "QA Impact Notes" field for restructured files.** When a file is classified as "Restructure," the tech approach must include a brief note on what existing functionality is affected, so Enzo can plan regression testing before implementation starts. Example: "meetings.js restructure affects charter and weekly meeting rendering, button state management, and SSE event handling — regression test all meeting types."

3. **Update Andrei's agent definition** to include this classification requirement in his self-review checklist and "How You Work" section.

4. **Update the QA test plan skill** to reference the tech approach's change impact classifications as an input for test planning. Enzo should check the tech approach for restructuring flags before writing his test plan.

5. **Update the project kickoff skill** to mention that the tech approach includes change impact classifications that downstream agents (especially QA) should read.

### Out of Scope (Deferred)

- Creating a formal tech approach template file. Andrei's tech approaches vary in structure depending on the project, and that flexibility is valuable. We're adding a required section, not a rigid template.
- Retroactively updating past tech approach docs. The new practice applies going forward.
- Changing how Enzo structures his test plans. This update gives him better input; how he uses it is his call.
- Automated tooling to detect restructuring risk. This is a human judgment call by the architect.

## Acceptance Criteria

### AC1: Agent Definition Update
- [ ] Andrei's agent definition (`.claude/agents/technical-architect.md`) includes the change impact classification requirement in the "How You Work" section
- [ ] Andrei's self-review checklist includes: "Have I classified each file's change type (extend/modify/restructure)?"
- [ ] Andrei's self-review checklist includes: "Have I added QA impact notes for any restructured files?"

### AC2: QA Test Plan Skill Update
- [ ] The QA test plan skill (`skills/workflow/qa-test-plan.md`) references the tech approach's change impact classifications as a pre-testing input
- [ ] The skill mentions that restructured files require regression testing of affected existing functionality

### AC3: Project Kickoff Skill Update
- [ ] The project kickoff skill (`skills/workflow/project-kickoff.md`) notes that the tech approach includes change impact classifications
- [ ] The "What Each Agent Reads and Produces" table mentions that Enzo reads the tech approach (in addition to requirements and design spec) for restructuring flags

### AC4: Classification Definitions Are Clear
- [ ] The three classification levels (Extend, Modify, Restructure) are defined with clear criteria and examples
- [ ] Each classification level includes an expected regression risk level (low, moderate, high)
- [ ] The "Restructure" classification requires a QA impact note describing what existing functionality is affected

## Deliverables

| Deliverable | Owner | File |
|-------------|-------|------|
| Updated agent definition | Andrei | `.claude/agents/technical-architect.md` |
| Updated QA test plan skill | Andrei | `skills/workflow/qa-test-plan.md` |
| Updated project kickoff skill | Andrei | `skills/workflow/project-kickoff.md` |

## Pipeline

This is a process/documentation update, not a code feature. The pipeline is:

1. **Thomas (PM)** — requirements (this doc) -- DONE
2. **Andrei (Arch)** — implements the changes to his agent definition and the two skill docs
3. **Enzo (QA)** — reviews the changes to confirm the QA integration is useful and the classification definitions are clear from a tester's perspective

No design step needed (no UI). No FE/BE step needed (no code). No design review needed.

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Classification feels bureaucratic | Low | Three levels is minimal. Andrei already writes file-by-file breakdowns — this adds one word per file. |
| Andrei classifies everything as "Extend" to avoid scrutiny | Very Low | The team will notice when a "Extend" turns into a rewrite. The custom meetings experience already demonstrated the cost of under-classifying. |
| Enzo doesn't read the tech approach | Low | Enzo already reads it (he said so in Meeting #4). The update just makes the signal clearer. |

## Notes

- This change was unanimously agreed upon in Custom Meeting #4 by Thomas, Andrei, Alice, Robert, and Enzo.
- Alice specifically called out that a heads-up like "frontend JS will require significant restructuring" would have helped her estimate better and would have told Enzo to plan regression testing on all meeting types.
- Enzo confirmed he already reads the tech approach but the "extend" signal wasn't there — he needs the restructuring flag to plan proactively.
