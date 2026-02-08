# Sherlock Labs Logo — Requirements

**Author:** Thomas (PM)
**Date:** 2026-02-06
**Status:** Draft

## Overview

Create an SVG logo for Sherlock Labs that reflects a developer-first, terminal-inspired aesthetic. The logo should feel at home in a dark-themed developer tool UI and lean into monospace/terminal typography conventions.

## CEO Brief

> "I'd love to create a SherlockLabs logo, something that's kind of developer-y and kind of leans into the terminal font. Just go ahead and create a logo, and we'll see what it looks like."

Key takeaways:
- Developer-themed, not corporate
- Terminal/monospace font style is central to the identity
- CEO wants to see a concrete output, not just concepts
- Iterate from something real — ship it, then refine

## Requirements

### R1: Format & Deliverables

- **SVG format** — scalable, crisp at any size, editable
- Output file: `img/sherlock-labs-logo.svg`
- Should render well at small sizes (32px nav icon) and large sizes (hero display)
- Clean, hand-authored SVG (not exported from a design tool) — consistent with the repo's existing SVG style (see `img/avatars/`)

### R2: Visual Identity

- **Monospace/terminal typography** — the wordmark should feel like it belongs in a terminal. Use a system monospace font stack or embed glyph paths for a monospace-style font.
- **Developer aesthetic** — think: code editors, terminal prompts, CLI tools. Not enterprise SaaS.
- **Dark-theme native** — primary version should look great on dark backgrounds (zinc-900 / `#18181b`). Should also work on light backgrounds as a secondary concern.
- **Color palette** — use the existing brand tokens from the site:
  - Primary: indigo-500 (`#6366F1`) / indigo-600 (`#4F46E5`)
  - Accent: violet-500 (`#8B5CF6`)
  - Text: zinc-100 (`#f4f4f5`) for dark backgrounds
  - May incorporate a subtle terminal green (`#4ADE80` / green-400) as a nod to classic terminals — but sparingly

### R3: Composition

The logo should include:
1. **A logomark (icon)** — a simple, recognizable symbol that works standalone (favicons, small avatars). Could reference: magnifying glass (Sherlock), terminal cursor/prompt, code brackets, or a clever combination.
2. **A wordmark** — "Sherlock Labs" or "SherlockLabs" in a monospace-inspired typeface. Consider a terminal prompt prefix like `>` or `$` as a design element.
3. **Combined lockup** — the icon + wordmark together as the primary logo form

### R4: Technical Constraints

- Pure SVG — no raster images, no external dependencies
- Use `viewBox` for scalability (no fixed width/height on the root element, or provide both viewBox and reasonable defaults)
- Keep file size reasonable (under 10KB)
- Use `currentColor` or explicit fills — no reliance on CSS inheritance for core rendering
- Accessible: include a `<title>` element for screen readers

### R5: Compatibility with Existing Site

- Should integrate into the TeamHQ landing page nav bar (currently shows "TeamHQ" text + "Sherlock Labs" label)
- Designed to eventually replace or complement the text-only nav brand
- Consistent with the dark zinc/indigo design language already in use

## Acceptance Criteria

1. An SVG file exists at `img/sherlock-labs-logo.svg`
2. The logo includes both a standalone icon and a wordmark lockup
3. It renders cleanly on the TeamHQ dark background (`#18181b`)
4. The typography feels monospace/terminal-inspired
5. File is under 10KB, pure SVG, no external dependencies
6. Includes `<title>` element for accessibility

## Team & Sequence

This is a design-focused project with a short pipeline:

1. **Robert (Designer)** — design the logo concept and create the SVG. Robert is the right person here since this is fundamentally a visual design task. He should produce the actual SVG file, not just a spec.
2. **CEO review** — the CEO wants to see the concrete output and will iterate from there.

**Not needed for this project:**
- Andrei (Arch) — no architectural decisions needed for a static SVG
- Alice (FE) — integration into the site can happen later if the CEO likes the logo; right now we just need the logo itself
- Jonah (BE) — no backend component
- Enzo (QA) — validation is visual; the CEO's eye is the QA here
- Dan — no.

## Open Questions

- "Sherlock Labs" vs "SherlockLabs" (one word) — CEO to decide. Default to "Sherlock Labs" (two words) for readability.
- Should the logomark reference a magnifying glass (Sherlock Holmes nod) or lean purely into developer iconography (terminal, brackets)? Robert should explore both directions.
