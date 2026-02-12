# Early QA Notification for Significant Rewrites — Requirements

**Author:** Thomas (Product Manager)
**Date:** Feb 10, 2026
**Status:** Complete
**Source:** Custom Meeting #4 — Action Item for Thomas (medium priority)
**Project ID:** `early-qa-notification`

---

## Problem Statement

The team shipped the Change Impact Classification system (project: `tech-approach-update`), which gives Andrei a structured way to flag files as Extend, Modify, or Restructure in his tech approach docs. Enzo now knows to look for those flags when he reads the tech approach.

But there's a timing gap. In the current pipeline, Enzo is spawned **after implementation is complete** (step 7 in the pipeline). By the time he reads the tech approach and sees the Restructure flags, Alice and Jonah have already finished building. The classification helps him plan regression testing, but he's still doing that planning reactively — after the code lands — rather than proactively.

The Custom Meeting #4 action item was specific: "When the tech approach identifies a significant file rewrite, notify Enzo early so he can begin regression test planning **before implementation is complete**." Enzo said: "I'd like to be looped in earlier on projects that involve full-file rewrites. Not to start testing — just to start planning."

The classification system gave us the **signal**. This project adds the **timing** — getting that signal to Enzo earlier in the pipeline so he can prepare regression test cases while developers are still building.

## What We're Changing

Update the pipeline process so that when Andrei's tech approach contains any file classified as **Restructure**, the pipeline orchestrator (Thomas / CEO) notifies Enzo with the relevant restructure details before implementation begins. Enzo uses this early notice to draft regression test cases for the affected areas, so that when he's spawned for full QA later, he can execute immediately instead of planning from scratch.

This is a **process and documentation update**, not a code feature.

## Scope

### In Scope

1. **Add an "Early QA Notification" step to the pipeline process.** After Andrei completes the tech approach, if any files are classified as Restructure, the pipeline orchestrator flags this and notifies Enzo with:
   - Which files are classified as Restructure
   - The QA impact notes for each (what existing functionality is affected)
   - The instruction to prepare regression test cases for those areas (not to start testing — just to plan)

2. **Update CLAUDE.md pipeline documentation.** Add a note to the Proven Pipeline section indicating that a Restructure classification in the tech approach triggers an early heads-up to Enzo between the Arch and Implementation steps.

3. **Update the project kickoff skill.** Add an explicit step between Andrei's tech approach and implementation that checks for Restructure flags and routes an early notification to Enzo.

4. **Update Thomas's agent definition.** Add to Thomas's Pipeline Orchestration section: when the tech approach contains Restructure-classified files, include an early QA notification step before spawning developers.

5. **Update Enzo's agent definition.** Add a section describing what Enzo does with an early notification: draft regression test cases for the affected areas. He does NOT start testing or need the dev server. He reads the tech approach's Restructure flags and QA impact notes and prepares a regression test outline that he'll execute when spawned for full QA later.

### Out of Scope (Deferred)

- Automated detection of Restructure classifications. Thomas / the CEO reads the tech approach and makes the call manually.
- Changing the pipeline order. Enzo still tests last. This is an early planning heads-up, not an early testing gate.
- Requiring Enzo to produce a formal regression plan document. He can prepare however he sees fit — the goal is giving him the signal early, not prescribing his workflow.
- Notification for Modify-classified files. Only Restructure triggers early notification. Modify risk is moderate and doesn't warrant the overhead.

## How It Works in Practice

Here's the pipeline flow with the new step:

```
1. Thomas writes requirements
2. Andrei writes tech approach (with change impact classifications)
3. IF any file is classified as Restructure:
   → Thomas/CEO sends Enzo the Restructure details and QA impact notes
   → Enzo drafts regression test cases for affected areas
   → This happens WHILE Robert designs and developers implement (parallel)
4. Robert writes design spec
5. Alice + Jonah implement
6. Robert reviews implementation
7. Enzo runs full QA (now with pre-planned regression cases from step 3)
```

Step 3 is non-blocking. It doesn't delay the pipeline. Robert and the developers proceed as normal. Enzo's early planning runs in parallel.

## Acceptance Criteria

### AC1: CLAUDE.md Pipeline Update
- [ ] The Proven Pipeline section in CLAUDE.md includes a note that Restructure-classified files in the tech approach trigger an early QA notification to Enzo
- [ ] The note is clear that this is non-blocking — it doesn't delay implementation

### AC2: Project Kickoff Skill Update
- [ ] The project kickoff skill (`skills/workflow/project-kickoff.md`) includes an explicit conditional step: "If tech approach contains Restructure flags, notify Enzo with the details before spawning developers"
- [ ] The pipeline diagram is updated to show the optional early QA notification branch

### AC3: Thomas's Agent Definition Update
- [ ] Thomas's agent definition (`.claude/agents/product-manager.md`) includes guidance in the Pipeline Orchestration section about checking for Restructure flags after Andrei's tech approach
- [ ] The guidance specifies what information to include in the notification (file names, classification, QA impact notes)

### AC4: Enzo's Agent Definition Update
- [ ] Enzo's agent definition (`.claude/agents/qa.md`) includes a section on handling early QA notifications
- [ ] The section clarifies that early notification means "plan regression testing" not "start testing"
- [ ] The section specifies that Enzo should read the tech approach's Restructure flags and QA impact notes to draft regression test cases

## Deliverables

| Deliverable | Owner | File |
|-------------|-------|------|
| Updated CLAUDE.md | Thomas | `CLAUDE.md` |
| Updated project kickoff skill | Thomas | `skills/workflow/project-kickoff.md` |
| Updated PM agent definition | Thomas | `.claude/agents/product-manager.md` |
| Updated QA agent definition | Thomas | `.claude/agents/qa.md` |

## Pipeline

This is a lightweight process update. Thomas can implement it directly since all changes are to process documentation and agent definitions — no architecture, design, or code involved. Enzo reviews to confirm the QA integration makes sense from a tester's perspective.

1. **Thomas (PM)** — requirements (this doc) + implementation of all doc/agent changes
2. **Enzo (QA)** — reviews to confirm the early notification process is useful and clear

No Andrei step needed (no architectural decisions). No Robert step needed (no UI). No FE/BE step needed (no code).

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Early notification adds pipeline overhead | Low | The notification is one message with 2-3 bullet points. Takes seconds to send. |
| Enzo's early regression plan becomes stale if the tech approach changes during implementation | Low | Restructure classifications are set at the architectural level. Implementation rarely changes which files get restructured. If it does, the developer flags it. |
| Pipeline orchestrator forgets to check for Restructure flags | Medium | Add it to Thomas's self-review checklist. The project kickoff skill also serves as a reminder. |

## Notes

- This project builds on the completed `tech-approach-update` project, which established the Extend/Modify/Restructure classification system. That project gave us the signal; this one fixes the timing.
- Enzo's exact words from Meeting #4: "I'd like to be looped in earlier on projects that involve full-file rewrites. Not to start testing — just to start planning. If I know Alice is rewriting meetings.js, I can prepare regression test cases for charter and weekly meetings before the code even lands."
- Thomas agreed in the meeting: "When the tech approach identifies a significant rewrite, I'll flag it to you so you can start planning. Doesn't change the pipeline order — you still test last — but you get the heads-up early."
