# Acceptance Criteria Template Expansion — Requirements

**Author**: Thomas (PM)
**Date**: Feb 9, 2026
**Status**: Complete
**Project ID**: ac-template-expansion

## Problem Statement

Our acceptance criteria in requirements docs cover core user flows well — "button is visible," "clicking it submits the form," "data renders correctly" — but interaction edge cases are covered inconsistently. Whether a requirements doc mentions disabled states, loading indicators, error recovery, or form state during async operations depends on whether the PM happened to think of it that day.

Evidence from our own docs:
- **ceo-response-input-requirements.md** — explicitly covers disabled send button during flight, error states for 404/409, and input clearing on success. This is one of our best examples.
- **custom-meetings-requirements.md** — mentions "validates inputs before submission and shows clear error states" but doesn't specify what those error states look like or how the form behaves during submission.
- **project-tracking-improvements-requirements.md** — no mention of loading states when fetching `data/tasks.json`, no empty state if the file fails to load.

The inconsistency means Robert (Designer) and Alice (FE) have to guess at interaction behavior, and Enzo (QA) doesn't have explicit criteria to test against. This causes round-trips: Enzo flags something in QA, Alice asks "was that in the spec?", and the answer is no — it was never specified.

## One-Sentence Summary

Add a structured interaction states checklist to the AC template so every requirements doc systematically covers async operations, disabled states, error recovery, and other edge cases that are currently addressed ad-hoc.

## Scope

### In Scope

1. **Interaction States Checklist** — a reusable checklist section that gets appended to user stories in requirements docs when they involve interactive UI
2. **Updated PM agent definition** — add the checklist to the product-manager agent's instructions so it's built into every requirements doc going forward
3. **New workflow skill** — create a `skills/workflow/acceptance-criteria.md` reference doc that all agents can consult
4. **Documentation** — requirements doc (this file) explaining the rationale and the template itself

### Out of Scope

- Retroactively updating all existing requirements docs (those projects are shipped)
- Changing the QA test plan template (Enzo already tests edge cases — this gives him explicit criteria to test against)
- Changing the design spec template (Robert can reference the AC checklist as-is)
- Any code changes — this is a process/documentation deliverable

### Deferred

- Automated linting or validation that requirements docs include the checklist
- Per-component-type templates (form-specific, list-specific, modal-specific) — start with one general checklist, specialize later if needed

## The Template

### Interaction States Checklist

This checklist is appended to any user story that involves interactive UI (forms, buttons, async data loading, state changes). Not every item applies to every story — the PM marks items as N/A when they don't apply, so downstream agents know it was considered and intentionally excluded rather than forgotten.

```markdown
#### Interaction States

**Loading & Async Operations:**
- [ ] Loading indicator is shown while async operation is in progress
- [ ] UI element that triggered the operation is disabled during the operation (prevents double-submit)
- [ ] If the operation takes longer than [X seconds], [specific behavior — e.g., show progress text, remain in loading state]
- [ ] On success, [specific transition — e.g., clear form, show confirmation, update list]
- [ ] On success, focus moves to [specific element] (or stays in place if appropriate)

**Error States:**
- [ ] On failure, an inline error message appears near the point of failure (not a generic alert)
- [ ] The error message is specific enough to be actionable (e.g., "Meeting title is required" not "Invalid input")
- [ ] The user's input is preserved on error (form fields retain their values)
- [ ] There is a clear way to retry or correct the error
- [ ] If the error is transient (network), a retry option is available
- [ ] If the error is permanent (404, deleted resource), the UI reflects the new state

**Disabled & Unavailable States:**
- [ ] Interactive elements that cannot be used are visually disabled (reduced opacity, cursor change)
- [ ] Disabled elements have a tooltip or adjacent text explaining why they're disabled (if not obvious)
- [ ] Disabled buttons do not trigger actions on click
- [ ] Elements become enabled/disabled in response to state changes (e.g., submit enables when form is valid)

**Empty & Zero States:**
- [ ] If a list/container has no items, an empty state message is shown (not a blank area)
- [ ] The empty state suggests what action to take (e.g., "No meetings yet. Click 'New Meeting' to start.")
- [ ] Zero-count metrics display as "0" (not blank or hidden)

**Form State:**
- [ ] Required fields are marked and validated before submission
- [ ] Validation errors appear on blur or on submit (specify which)
- [ ] Form fields are reset/cleared after successful submission (if applicable)
- [ ] Form cannot be submitted while a previous submission is in flight
- [ ] If the form has unsaved changes and the user navigates away, [specific behavior — warn, discard, or N/A]

**Optimistic Updates (if applicable):**
- [ ] The UI updates immediately before server confirmation
- [ ] If the server rejects the update, the UI reverts to the previous state
- [ ] A subtle indicator shows the item is pending confirmation (or N/A if instant feel is preferred)

**Timeout & Connectivity:**
- [ ] If an operation times out, the user is informed (not left in a loading state indefinitely)
- [ ] If the connection is lost mid-operation, the error state is shown when reconnection occurs
```

### How to Use

1. **When writing a user story**, append the "Interaction States" section after the core acceptance criteria
2. **Mark items as N/A** when they genuinely don't apply. The goal is to prove you considered them, not to force-fit every item.
3. **Fill in the bracketed placeholders** with specific behavior for this feature (e.g., "[X seconds]" becomes "3 seconds", "[specific transition]" becomes "clears the form and shows a success toast")
4. **Skip the entire section** for non-interactive stories (e.g., data model changes, API-only work, static content)

### Example: Before and After

**Before (current pattern):**
```markdown
### US1: Create a Custom Meeting
**Acceptance Criteria:**
- [ ] A "New Meeting" button is visible in the meetings toolbar
- [ ] Clicking it opens a creation form with participant selection and instructions
- [ ] At least 2 participants must be selected; max 6
- [ ] Instructions field is required and must be non-empty
- [ ] Submitting the form calls the API and starts the meeting
- [ ] The form validates inputs before submission and shows clear error states
- [ ] After submission, the meeting appears in the list with a "running" indicator
```

**After (with interaction states):**
```markdown
### US1: Create a Custom Meeting
**Acceptance Criteria:**
- [ ] A "New Meeting" button is visible in the meetings toolbar
- [ ] Clicking it opens a creation form with participant selection and instructions
- [ ] At least 2 participants must be selected; max 6
- [ ] Instructions field is required and must be non-empty
- [ ] Submitting the form calls the API and starts the meeting
- [ ] After submission, the meeting appears in the list with a "running" indicator

#### Interaction States

**Loading & Async Operations:**
- [ ] The "Start Meeting" button shows a loading spinner and is disabled after submission
- [ ] N/A — no extended loading threshold (API returns 202 immediately)
- [ ] On success, the creation form closes and the new meeting card appears in the list
- [ ] On success, focus moves to the new meeting card in the list

**Error States:**
- [ ] On API error, an inline error appears below the Submit button
- [ ] Error message reflects the specific failure (e.g., "A meeting is already running")
- [ ] All form inputs (selected participants, instructions text) are preserved on error
- [ ] User can correct and resubmit without re-entering data
- [ ] N/A — no transient retry (errors are validation or concurrency conflicts)
- [ ] N/A — no permanent resource errors possible

**Disabled & Unavailable States:**
- [ ] "Start Meeting" button is disabled until at least 2 participants are selected AND instructions is non-empty
- [ ] N/A — disabled state is self-evident from the form requirements
- [ ] "Start Meeting" does not trigger on click when disabled
- [ ] Button enables/disables reactively as the user adds/removes participants or types instructions

**Empty & Zero States:**
- [ ] N/A — participant grid always shows all 18 agents (none are conditionally hidden)
- [ ] N/A
- [ ] N/A

**Form State:**
- [ ] Participant count (minimum 2) and instructions (non-empty) are validated on submit
- [ ] Validation errors appear on submit attempt, not on blur
- [ ] Form fields are NOT reset on close (if user cancels and re-opens, state is preserved within the session)
- [ ] Form cannot be submitted while a previous submission is in flight (button disabled)
- [ ] N/A — no unsaved changes concern (form is ephemeral)
```

## Design Decisions

1. **Checklist, not prose.** The template is a checkbox list, not a paragraph-form spec. This matches our existing AC format and is fast for the PM to fill out, easy for devs to implement against, and easy for QA to test against.

2. **N/A is an answer.** Marking items as N/A is just as important as filling them in. It signals to Robert, Alice, and Enzo that the interaction case was considered and intentionally excluded. No more "was this in the spec?" round-trips.

3. **One general checklist, not per-component.** We could have separate templates for forms, lists, modals, etc. But that adds complexity without clear payoff at our current scale. Start general, specialize later if patterns emerge.

4. **Append, don't replace.** The core AC stays the same. The interaction states section is additive — it goes after the main acceptance criteria, not instead of it.

5. **PM owns it.** This is part of the PM's requirements writing process. Robert and Nina can suggest additions, but the PM decides which items apply to a given story.

## Validation

- **Robert (Designer):** The checklist covers the interaction states he typically specs in design docs. His design spec can reference the AC checklist and add visual details.
- **Alice (FE) / Jonah (BE):** The checklist covers the edge cases they encounter during implementation — disabled button states, error message placement, loading indicators.
- **Enzo (QA):** The checklist gives him explicit criteria for testing interaction edge cases, which he currently has to invent during testing.
- **Nina (Interactions):** The loading, disabled, and transition states align with the micro-interaction work she does.

## Deliverables

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Requirements doc (this file) | `docs/ac-template-expansion-requirements.md` | Complete |
| 2 | AC workflow skill | `skills/workflow/acceptance-criteria.md` | Pending |
| 3 | PM agent definition update | `.claude/agents/product-manager.md` | Pending |

## Risks

1. **Template bloat.** If the checklist is too long, PMs (me) will skip it or fill it out mechanically. Mitigation: keep it to ~20 items max, encourage liberal use of N/A, and skip the section entirely for non-interactive work.
2. **False sense of completeness.** The checklist can't cover every edge case — it covers the common ones. Mitigation: treat it as a floor, not a ceiling. If a story has unusual interaction states, add them ad-hoc.
