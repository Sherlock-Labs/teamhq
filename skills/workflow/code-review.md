# Code Review

**Category:** Workflow
**Used by:** Enzo, Alice, Jonah
**Last updated:** 2026-02-07

## When to Use

When reviewing code changes before they ship. Enzo does formal QA; Alice and Jonah peer-review each other's work.

## Review Checklist

### Correctness
- [ ] Does the code do what the requirements specify?
- [ ] Are edge cases handled?
- [ ] Are error states handled gracefully?

### Security
- [ ] Is user input sanitized/escaped before rendering in HTML?
- [ ] Are API endpoints validating input?
- [ ] Are there any hardcoded secrets or credentials?
- [ ] Is data from external sources treated as untrusted?

### Accessibility
- [ ] Do interactive elements have focus-visible styles?
- [ ] Are ARIA attributes used correctly (aria-hidden, aria-expanded, aria-label)?
- [ ] Can the feature be used with keyboard only?
- [ ] Do images have alt text?

### Performance
- [ ] Are large lists rendered efficiently?
- [ ] Are network requests handled with loading/error states?
- [ ] Are assets optimized (SVGs, images)?

### Code Quality
- [ ] Is the code consistent with existing patterns in the codebase?
- [ ] Are variable names clear and descriptive?
- [ ] Is there unnecessary complexity that could be simplified?
- [ ] Are there any TODO comments that should be resolved?

### Responsive Design
- [ ] Does the layout work on mobile (< 640px)?
- [ ] Does the layout work on tablet (640px-1024px)?
- [ ] Does the layout work on desktop (> 1024px)?

## Conventions

- Review against the design spec, not just the requirements
- Test in a browser, not just by reading code
- Focus on bugs and issues, not style preferences
- Be specific: "Line 42: missing null check on `project.name`" not "needs more error handling"

## Anti-patterns

- Approving without testing
- Nitpicking style in code you did not write
- Blocking on suggestions that are not bugs or accessibility issues
- Reviewing only the happy path
