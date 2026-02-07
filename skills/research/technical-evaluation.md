# Technical Evaluation

**Category:** Research
**Used by:** Marco, Andrei
**Last updated:** 2026-02-07

## When to Use

When the team needs to choose between libraries, frameworks, or technical approaches for a feature.

## Procedure

1. **Define criteria** — what matters for this decision? Common criteria:
   - Bundle size / performance impact
   - API ergonomics and developer experience
   - Maintenance status (last release, open issues, contributors)
   - Documentation quality
   - Browser/platform support
   - License compatibility
   - Community size and ecosystem
2. **Identify candidates** — list 3-5 options including "build it ourselves"
3. **Research each candidate** using official docs, GitHub repos, npm/package stats
4. **Build a comparison table** with criteria as columns, candidates as rows
5. **Test if needed** — for close calls, write a small proof-of-concept
6. **Write a recommendation** with clear reasoning
7. **Document in** `docs/{project}-technical-research.md`

## Examples

From past projects: Andrei evaluated plain HTML/CSS vs. React for the landing page. The criteria were simplicity, no build step requirement, and team familiarity. Plain HTML won because the page is mostly static content.

## Conventions

- Always check the npm page or GitHub repo for maintenance indicators
- Include specific version numbers in evaluations
- Note any known security vulnerabilities
- If evaluating an API, include a code snippet showing basic usage
- Preference for tools already used in the codebase (reduce dependency count)

## Anti-patterns

- Choosing the most popular library without evaluating fit
- Ignoring bundle size for client-side libraries
- Not checking maintenance status — abandoned libraries are a liability
- Evaluating only the happy path — test edge cases and error handling
- Over-engineering the evaluation — if one option is obviously better, just pick it
