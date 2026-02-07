# Technical Documentation

**Category:** Writing
**Used by:** Nadia
**Last updated:** 2026-02-07

## When to Use

When writing user-facing documentation, READMEs, getting-started guides, or API documentation.

## Document Types

### README
- Project overview (1 paragraph)
- Quick start (numbered steps to get running)
- Features (bullet list)
- Architecture (brief, for contributors)
- Contributing guidelines

### User Guide
- Overview: what the tool does and who it's for
- Getting Started: step-by-step setup
- Usage: common workflows with examples
- Reference: complete feature documentation
- Troubleshooting: common issues and solutions

### API Documentation
- Endpoint: `METHOD /path`
- Description: what it does
- Parameters: table with name, type, required, description
- Response: example JSON with field descriptions
- Errors: possible error codes and meanings

## Procedure

1. **Read all project docs** — requirements, tech approach, design spec
2. **Read the code** — understand what was actually built (not just what was planned)
3. **Identify the audience** — developer? End user? Both?
4. **Outline the structure** — headings first, then fill in
5. **Write for the newcomer** — assume zero context
6. **Include code examples** — for every non-trivial feature
7. **Test the docs** — can someone follow them without asking a question?

## Formatting Conventions

- Use ATX headings (`#`, `##`, `###`) — no more than 3 levels deep
- Code blocks with language specifiers (```js, ```bash, etc.)
- Tables for structured data (parameters, options, comparisons)
- Callout pattern: `> **Note:** ...` for important information
- Numbered lists for sequential steps, bullet lists for non-sequential items

## Conventions

- Keep CLAUDE.md accurate after every project
- One source of truth — don't duplicate information across docs
- Use consistent terminology — define terms in a glossary if needed
- Date the document — readers need to know how current it is
- Link to related docs rather than repeating content

## Anti-patterns

- Writing documentation before the feature is implemented
- Documenting internal implementation details in user-facing docs
- Using jargon without explanation
- Screenshots without alt text or descriptions
- Documentation that is only updated at launch and never maintained
