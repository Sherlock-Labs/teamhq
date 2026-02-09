# Acceptance Criteria — Interaction States Checklist

**Category:** Workflow
**Used by:** Thomas, Robert, Alice, Jonah, Enzo, Nina
**Last updated:** 2026-02-09

## When to Use

When writing acceptance criteria for any user story that involves interactive UI: forms, buttons, async data loading, modals, state transitions. Append the relevant sections after the core acceptance criteria.

**Skip this entirely** for non-interactive work (data model changes, API-only endpoints, static content, documentation).

## The Checklist

Copy the sections below into your user story's acceptance criteria. Mark items as **N/A** when they don't apply — this signals to downstream agents that the case was considered and intentionally excluded. Fill in **[bracketed placeholders]** with specific behavior for the feature.

---

### Loading & Async Operations

- [ ] Loading indicator is shown while async operation is in progress
- [ ] UI element that triggered the operation is disabled during the operation (prevents double-submit)
- [ ] If the operation takes longer than [X seconds], [specific behavior — e.g., show progress text, remain in loading state]
- [ ] On success, [specific transition — e.g., clear form, show confirmation, update list]
- [ ] On success, focus moves to [specific element] (or stays in place if appropriate)

### Error States

- [ ] On failure, an inline error message appears near the point of failure (not a generic alert)
- [ ] The error message is specific enough to be actionable (e.g., "Meeting title is required" not "Invalid input")
- [ ] The user's input is preserved on error (form fields retain their values)
- [ ] There is a clear way to retry or correct the error
- [ ] If the error is transient (network), a retry option is available
- [ ] If the error is permanent (404, deleted resource), the UI reflects the new state

### Disabled & Unavailable States

- [ ] Interactive elements that cannot be used are visually disabled (reduced opacity, cursor change)
- [ ] Disabled elements have a tooltip or adjacent text explaining why they're disabled (if not obvious)
- [ ] Disabled buttons do not trigger actions on click
- [ ] Elements become enabled/disabled in response to state changes (e.g., submit enables when form is valid)

### Empty & Zero States

- [ ] If a list/container has no items, an empty state message is shown (not a blank area)
- [ ] The empty state suggests what action to take (e.g., "No meetings yet. Click 'New Meeting' to start.")
- [ ] Zero-count metrics display as "0" (not blank or hidden)

### Form State

- [ ] Required fields are marked and validated before submission
- [ ] Validation errors appear on [blur / submit] (specify which)
- [ ] Form fields are reset/cleared after successful submission (if applicable)
- [ ] Form cannot be submitted while a previous submission is in flight
- [ ] If the form has unsaved changes and the user navigates away, [specific behavior — warn, discard, or N/A]

### Optimistic Updates (if applicable)

- [ ] The UI updates immediately before server confirmation
- [ ] If the server rejects the update, the UI reverts to the previous state
- [ ] A subtle indicator shows the item is pending confirmation (or N/A if instant feel is preferred)

### Timeout & Connectivity

- [ ] If an operation times out, the user is informed (not left in a loading state indefinitely)
- [ ] If the connection is lost mid-operation, the error state is shown when reconnection occurs

---

## How Agents Use This

| Agent | How They Use It |
|-------|----------------|
| **Thomas (PM)** | Appends relevant sections to user stories when writing requirements. Fills in placeholders with specific behavior. Marks N/A items. |
| **Robert (Designer)** | References the checklist when writing design specs. Adds visual details (colors, animations, layout) to each state Thomas specified. |
| **Nina (Interactions)** | Uses the loading, disabled, and transition items as the foundation for micro-interaction specs. |
| **Alice (FE)** | Implements each checked item. If an item is ambiguous, checks with Thomas or Robert. |
| **Jonah (BE)** | Ensures API responses support the error states specified (e.g., specific error codes and messages). |
| **Enzo (QA)** | Tests each checked item explicitly. N/A items are skipped. Items without checkmarks are bugs if they don't work. |

## Guidelines

1. **Be specific, not generic.** Don't write "show a loading state." Write "the Submit button shows a spinner icon and the text changes to 'Saving...' while the request is in flight."

2. **N/A is a valid answer.** Mark items N/A when they don't apply. This proves the case was considered. An unmarked item is ambiguous — was it forgotten or intentionally excluded? N/A removes the ambiguity.

3. **Not every section applies.** A read-only data display needs Loading and Empty States but probably not Form State or Optimistic Updates. Only include sections that are relevant.

4. **This is a floor, not a ceiling.** The checklist covers common interaction cases. If a feature has unusual states (e.g., drag-and-drop reordering, multi-step wizards, real-time collaboration), add custom items.

5. **Keep it lean.** If you're spending more time on the checklist than the core AC, the feature is either too complex (break it down) or you're over-specifying (use N/A more liberally).

## Anti-patterns

- Filling out the checklist mechanically without thinking about the specific feature
- Including the checklist for non-interactive stories (API endpoints, data migrations)
- Writing vague items ("handle errors appropriately") instead of specific behavior
- Skipping the checklist because "the developer will figure it out"
- Treating every item as mandatory — liberal use of N/A is encouraged
