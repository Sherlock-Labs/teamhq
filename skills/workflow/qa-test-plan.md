# QA Test Plan

**Category:** Workflow
**Used by:** Enzo
**Last updated:** 2026-02-07

## When to Use

When validating a feature against acceptance criteria before it ships.

## Test Plan Template

```markdown
# Test Plan: {Feature Name}

## Scope
What is being tested and what is out of scope.

## Test Environment
- Browser(s): Chrome, Safari, Firefox
- Devices: Desktop (1440px), Tablet (768px), Mobile (375px)
- Server: localhost:{port}

## Test Cases

### Happy Path
1. [Test case description]
   - Steps: ...
   - Expected: ...
   - Status: PASS / FAIL

### Edge Cases
1. [Test case description]
   - Steps: ...
   - Expected: ...
   - Status: PASS / FAIL

### Error States
1. [Test case description]
   - Steps: ...
   - Expected: ...
   - Status: PASS / FAIL

### Accessibility
1. Keyboard navigation works
2. Screen reader announces state changes
3. Focus management is correct

### Responsive
1. Mobile layout (< 640px)
2. Tablet layout (640px-1024px)
3. Desktop layout (> 1024px)

## Results Summary
- Total: X tests
- Pass: X
- Fail: X
- Blocked: X

## Issues Found
1. [Issue description] — severity: high/medium/low
```

## Procedure

1. **Read the requirements** — understand what acceptance criteria must be met
2. **Read the design spec** — understand the expected user experience
3. **Check the tech approach for change impact classifications** — identify files flagged as Restructure (see below)
4. **Write test cases** before testing — prevents confirmation bias
5. **Test happy paths first** — verify the feature works as intended
6. **Test edge cases** — empty inputs, long text, special characters, concurrent actions
7. **Test error states** — network failures, invalid data, missing resources
8. **Test accessibility** — keyboard, screen reader, focus management
9. **Test responsive** — resize browser to mobile, tablet, desktop breakpoints
10. **Document results** in the test plan
11. **Report issues** with severity and reproduction steps

## Using Change Impact Classifications

Andrei's tech approach classifies each file as **Extend** (low risk), **Modify** (moderate risk), or **Restructure** (high risk). Use these to prioritize your testing:

- **Extend files** — Test the new functionality. Existing behavior is unlikely to regress.
- **Modify files** — Test new functionality plus the specific code paths that changed. Moderate regression risk.
- **Restructure files** — These need dedicated regression testing. The tech approach includes **QA impact notes** for each Restructure file describing what existing functionality is affected. Plan regression test cases for all mentioned areas, not just the new feature.

When writing your test plan, add a **Regression (Restructured Files)** section for any files flagged as Restructure. Cover the existing functionality called out in the QA impact notes.

## Severity Levels

| Level | Definition | Example |
|-------|-----------|---------|
| High | Feature broken, data loss, security issue | Form submission silently fails |
| Medium | Feature works but UX is poor | Button label truncated on mobile |
| Low | Cosmetic or minor polish | 1px alignment issue at one breakpoint |

## Anti-patterns

- Only testing happy paths
- Testing without reading the requirements first
- Reporting "it doesn't look right" without specifying what's wrong
- Skipping responsive testing
- Not documenting test results — if it wasn't recorded, it wasn't tested
