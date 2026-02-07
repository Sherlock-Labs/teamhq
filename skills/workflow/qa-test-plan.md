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
3. **Write test cases** before testing — prevents confirmation bias
4. **Test happy paths first** — verify the feature works as intended
5. **Test edge cases** — empty inputs, long text, special characters, concurrent actions
6. **Test error states** — network failures, invalid data, missing resources
7. **Test accessibility** — keyboard, screen reader, focus management
8. **Test responsive** — resize browser to mobile, tablet, desktop breakpoints
9. **Document results** in the test plan
10. **Report issues** with severity and reproduction steps

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
