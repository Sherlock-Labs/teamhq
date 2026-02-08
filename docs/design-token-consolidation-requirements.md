# Design Token Consolidation Requirements

**Author:** Thomas (PM)
**Date:** 2026-02-07 (updated)
**Priority:** High
**Source:** Charter Meeting #1

---

## Problem Statement

TeamHQ's design tokens are fragmented across multiple systems with no single source of truth. The two main surfaces share the same visual identity (dark theme, zinc/indigo palette, Inter typeface) but define their design tokens independently:

1. **Landing page** (`css/styles.css`) -- ~3,500 lines, CSS custom properties with `--color-` prefix, comprehensive token system (colors, typography, spacing, radii, shadows). However, 53 hardcoded hex values are scattered throughout the file outside the `:root` block, and `meetings.js` contains 7 hardcoded agent identity colors.
2. **OST Tool** (`ost-tool/client/`) -- Tailwind CSS v4, tokens defined implicitly via Tailwind's zinc/indigo utilities, no shared CSS file with the rest of the repo. Two hardcoded hex values in `TreeView.tsx`.

> **Note:** The PDF Splitter and PDF Combiner tools referenced in the original requirements have been removed from the repo. This scope has been updated to reflect the current codebase.

This creates three concrete risks:

- **Drift:** A change to a token in one place doesn't propagate to others. The landing page and OST tool happen to use the same Tailwind color values, but by coincidence, not by design.
- **Internal inconsistency:** Even within `css/styles.css`, 53 hardcoded hex values bypass the well-structured token system. Colors like `#ef4444`, `#059669`, `#7c3aed`, `#22d3ee`, `#c084fc`, and `#fbbf24` are used in the CSS but never defined as tokens.
- **Onboarding friction:** No single source of truth for "what does our design system look like?" New tools or pages have to reverse-engineer tokens from existing code.

## Current State Audit

### Token Naming Conventions

| Surface | Prefix | Example | Spacing | Radii |
|---------|--------|---------|---------|-------|
| Landing page | `--color-zinc-*`, `--color-indigo-*` | `var(--color-zinc-800)` | `--space-1` through `--space-24` | `--radius-sm/md/lg/xl` |
| OST Tool | Tailwind classes | `bg-zinc-800` | Tailwind defaults | Tailwind defaults |

### Color Values (consistent across surfaces)

Both surfaces use the same actual hex values -- the Tailwind zinc and indigo scales:

- Zinc: `#f4f4f5` (100) through `#09090b` (950) -- 10 steps
- Indigo: `#a5b4fc` (300), `#818cf8` (400), `#6366f1` (500), `#4f46e5` (600), `#4338ca` (700) -- plus `#eef2ff` (50), `#e0e7ff` (100)
- Violet: `#8b5cf6` (500) -- defined as "accent" but role unclear vs. indigo
- Status: Red `#f87171` (400), Green `#4ade80` (400), Yellow `#facc15` (400)

### Landing Page Internal Inconsistencies

The `:root` block (lines 1-109) is well-structured, but 53 hardcoded hex values exist throughout the rest of `css/styles.css`:

- `#4ade80` (green-400) used inline in 4+ places instead of `var(--color-green-400)`
- `#f87171` (red-400) used inline in 7+ places instead of `var(--color-red-400)`
- `#facc15` (yellow-400) used inline in 3+ places instead of `var(--color-yellow-400)`
- `#ef4444`, `#dc2626` (red shades) -- not defined as tokens at all
- `#059669` (emerald-600) -- not defined as tokens at all
- `#7c3aed` (violet-600) -- not defined as tokens at all
- `#22d3ee` (cyan-400), `#c084fc` (purple-400), `#fbbf24` (amber-400) -- not defined as tokens at all

Additionally, `js/meetings.js` has 7 hardcoded hex agent identity colors (`#818cf8`, `#a78bfa`, `#c084fc`, `#f472b6`, `#34d399`, `#fbbf24`, `#a1a1aa`).

Despite this, the file has ~997 `var(--` references -- strong token adoption overall, just not complete.

### OST Tool Token State

- Uses Tailwind CSS v4 with `@import "tailwindcss"` and minimal `@theme` (only sets font-sans to Inter)
- No custom color theme -- relies entirely on Tailwind's default zinc/indigo/etc palette
- Color choices match the landing page by coincidence (same Tailwind source), not by design
- 2 hardcoded hex values in `TreeView.tsx` (`#3f3f46` = zinc-700, `#27272a` = zinc-800)

### Shared Typography

Both surfaces use Inter with the same fallback stack. The landing page defines a full type scale (`--text-xs` through `--text-5xl`); the OST tool uses Tailwind's default type scale.

### Shared Component Patterns

- **Nav bar**: Sticky, zinc-950 bg, zinc-800 border-bottom, logo + links/back
- **Footer**: zinc-900 bg, zinc-800 border-top, centered logo + attribution
- **Primary buttons**: indigo-500 bg, white text, 8px radius, hover to indigo-400 or indigo-600
- **Cards**: zinc-900 bg, zinc-800 border, 12px radius, hover to zinc-700 border

### What the Landing Page Already Has Right

The landing page's `css/styles.css` `:root` block (lines 1-109) is already a well-structured token system. It has:

- Raw color scales (zinc, indigo, violet)
- Semantic aliases (`--color-bg-primary`, `--color-text-primary`, `--color-accent`, etc.)
- Full typography scale with line heights and font weights
- Spacing scale (4px increments)
- Border radius scale
- Shadow scale
- Legacy gray scale (marked as legacy, kept for reference)

This is a solid foundation. The two problems are: (1) the token system lives inside a 3,500-line file alongside all the landing page component styles, and (2) even within the landing page, 53 hardcoded hex values bypass the token system.

## Scope

### In Scope

1. **Extract shared tokens into a standalone file** -- Pull the `:root` token block out of `css/styles.css` into a new `css/tokens.css` (or equivalent) that all surfaces can import
2. **Rationalize the color palette** -- Consolidate into a coherent, minimal set. Clarify violet's role vs. indigo. Define a complete status color set. Add tokens for all colors currently hardcoded in the CSS (emerald, cyan, purple, amber, etc.)
3. **Eliminate hardcoded hex values in CSS** -- Replace all 53 hardcoded hex values in `css/styles.css` (outside `:root`) with token references
4. **Eliminate hardcoded hex values in JS** -- Replace the 7 hardcoded agent identity colors in `meetings.js` with a shared reference
5. **Extract shared component styles** -- Nav, footer, and common button patterns into a shared `css/shared.css` (or equivalent) that tools can import
6. **Document the token system** -- Produce a reference doc that lists every token, its value, and when to use it, plus document how CSS custom property tokens map to Tailwind classes
7. **OST Tool alignment** -- Extend the OST tool's Tailwind `@theme` to reference canonical tokens (or at minimum, document the mapping so future changes stay consistent)

### Out of Scope (Deferred)

- **Migrating the OST tool to use CSS custom properties** -- The OST tool uses Tailwind, and forcing it onto a CSS-variable system would be over-engineering. As long as the same color/spacing values are used, visual consistency is maintained.
- **Building a component library** -- We're consolidating tokens and shared styles, not building a reusable UI library with variants and slots.
- **Theming / light mode** -- Dark theme only for now. Semantic aliases already exist for easy theming later if needed.
- **Changing any visual appearance** -- This is a refactoring project. Nothing should look different after completion.
- **Motion/animation tokens** -- Not enough usage to warrant tokenizing.
- **Component-level tokens** (button sizes, card padding) -- Semantic tokens are sufficient for now.
- **Automated token generation pipeline** (e.g., Style Dictionary) -- Evaluate in a future phase if the manual approach becomes burdensome.

## Acceptance Criteria

1. A single `css/tokens.css` file exists containing all design tokens (colors, typography, spacing, radii, shadows) with the standardized `--color-`, `--text-`, `--space-`, `--radius-`, `--shadow-` prefix convention
2. `css/styles.css` imports `tokens.css` instead of defining tokens inline, and continues to work identically
3. Zero hardcoded hex values in `css/styles.css` outside the `:root`/token definitions -- all color references use `var(--token-name)` syntax
4. Agent identity colors in `meetings.js` reference CSS custom properties or a shared JS constant derived from tokens
5. A `css/shared.css` file exists with shared component patterns (nav, footer, primary button styles)
6. All surfaces render identically before and after the migration (visual regression: zero pixel differences)
7. A `docs/design-tokens-reference.md` documents every token, its value, its semantic purpose, and the Tailwind class equivalent
8. No new dependencies introduced (no Sass, no PostCSS, no build step for the vanilla HTML tools)
9. Violet's role is clarified -- either it's the accent and indigo is the brand, or violet is deprecated. Robert decides.
10. Legacy gray scale is formally deprecated (or removed) -- zinc is the canonical neutral

## Technical Constraints

- **No build step for vanilla HTML tools.** The landing page is plain HTML/CSS with no bundler. The shared files must be importable via `<link>` tags and CSS `@import`.
- **OST tool stays on Tailwind.** The OST tool uses Tailwind CSS v4 and should not be forced to switch. Alignment is via Tailwind `@theme` extension or documentation, not replacing Tailwind classes.
- **No visual changes.** This is a zero-visual-diff refactoring. The design system should look exactly the same before and after.
- **Browser support.** CSS custom properties are supported in all modern browsers. No IE11 consideration needed.

## Recommended Team & Phasing

### Phase 1: Define + Document (Andrei, Robert)

| Order | Agent | Task |
|-------|-------|------|
| 1 | **Andrei** (Arch) | Define the file structure, naming conventions, extraction strategy, and OST tool integration approach. Write `docs/design-token-consolidation-tech-approach.md`. |
| 2 | **Robert** (Designer) | Rationalize the color palette. Validate token taxonomy. Clarify violet vs. indigo. Define the complete status color set and agent identity colors. Write `docs/design-token-consolidation-design-spec.md`. |

### Phase 2: Landing Page Implementation (Alice)

| Order | Agent | Task |
|-------|-------|------|
| 3 | **Alice** (FE) | Execute the extraction and migration: create `css/tokens.css` and `css/shared.css`, update `css/styles.css` (replace all 53 hardcoded hex values), update `meetings.js`. |
| 4 | **Robert** (Designer) | Lightweight visual review -- confirm landing page renders identically post-migration. |
| 5 | **Enzo** (QA) | Visual regression check, verify file structure, confirm no broken references. Pass/fail verdict. |

### Phase 3: OST Tool Alignment (Alice or Andrei)

| Order | Agent | Task |
|-------|-------|------|
| 6 | **Alice** or **Andrei** | Extend OST tool's Tailwind `@theme` to reference canonical tokens. Replace 2 hardcoded hex values in `TreeView.tsx`. |
| 7 | **Enzo** (QA) | Verify OST tool renders correctly. Pass/fail verdict. |

### Phase 4: Documentation (Nadia)

| Order | Agent | Task |
|-------|-------|------|
| 8 | **Nadia** (Writer) | Write `docs/design-tokens-reference.md` -- the token reference doc with Tailwind mapping. |

### Why These People

- **Andrei** -- This is fundamentally an architectural decision about file structure and CSS import strategy. He needs to decide how the shared files are structured and how they compose.
- **Robert** -- He owns the design system. He needs to rationalize the palette, validate the token taxonomy, and confirm it covers all current and foreseeable needs.
- **Alice** -- She implements the CSS changes. This is a front-end refactoring task.
- **Enzo** -- QA is a release gate. Visual regression testing is his call.
- **Nadia** -- The token reference doc is technical documentation. This is her lane.

### Who Is NOT Needed

- **Jonah** (BE) -- No backend work. This is purely CSS/HTML.
- **Kai** (AI) -- No AI integration needed for this project.
- **Priya** (Marketer) -- No external-facing messaging needed.
- **Suki/Marco** (Researchers) -- No research phase needed; this is an internal refactoring.
- **Yuki** (Analyst) -- No data analysis needed for this scope.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CSS `@import` causes FOUC (flash of unstyled content) | Low | Medium | Use `<link>` tags in HTML rather than CSS `@import`. Andrei to decide in tech approach. |
| Shared nav/footer styles conflict with tool-specific overrides | Medium | Low | BEM naming convention already in use. Shared styles should be additive, not overriding. |
| OST tool Tailwind config drifts from shared tokens | Low | Low | Explicit `@theme` mapping or documented reference keeps alignment. |
| Visual regression from replacing hardcoded values | Low | High | QA visual regression testing by Enzo. Pixel-perfect match required. |
| Scope creep into component library | Medium | Medium | Token systems can grow unbounded. Phase 1 defines the boundary; resist adding tokens for hypothetical needs. |

## Open Questions for Andrei

1. Should `tokens.css` use `@import` or should each HTML file link it separately via `<link>`? (Performance vs. convenience trade-off.)
2. Should shared component styles (nav, footer) go into `tokens.css` or a separate `shared.css`? (Separation of concerns vs. fewer files.)
3. For the OST tool: is it worth extending `@theme` in the Tailwind config to map custom properties to Tailwind theme values, or is documentation sufficient?
4. Should agent identity colors live in `tokens.css` as CSS custom properties, or in a separate JS constants file?

## Open Questions for Robert

1. What is violet's role? Is it the accent color (with indigo as brand), or should it be deprecated in favor of indigo for everything?
2. The CSS uses colors not in the token set: emerald-600 (`#059669`), cyan-400 (`#22d3ee`), purple-400 (`#c084fc`), amber-400 (`#fbbf24`). Should these be added as tokens or replaced with existing palette colors?
3. Should agent identity colors (currently 7 hardcoded hex values in `meetings.js`) be standardized as part of the token system?
