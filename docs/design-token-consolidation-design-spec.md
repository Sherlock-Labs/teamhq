# Design Token Consolidation — Design Spec

**Author:** Robert (Product Designer)
**Date:** 2026-02-07
**Depends on:** `docs/design-token-consolidation-requirements.md` (Thomas), `docs/design-token-consolidation-tech-approach.md` (Andrei)

---

## Summary

This spec defines the canonical color palette, typography scale, spacing system, and semantic token assignments for TeamHQ. It answers the three open questions from the requirements doc and provides the complete token taxonomy that Alice will implement in `css/tokens.css`.

**Design principle:** This is a consolidation, not a redesign. Every value in this spec already exists somewhere in the codebase. The goal is to name them, organize them, and make them referenceable -- not to change how anything looks.

---

## Open Questions — Answers

### 1. What is violet's role?

**Decision: Violet is the secondary accent. Indigo is the primary brand/accent color.**

Violet is currently used in exactly two places: the weekly meeting button (`var(--color-violet-500)`) and the weekly meeting badge. This is a deliberate differentiation from the indigo used for standard/charter meetings. Violet serves as a secondary accent for "special" or "variant" UI elements -- a supporting role, not competing with indigo.

- `--color-accent` remains `var(--color-indigo-500)` (unchanged)
- Violet-500 stays in the palette as a named raw token
- Add `--color-violet-400` (`#a78bfa`) and `--color-violet-600` (`#7c3aed`) since both are already used in the codebase (agent identity and phase badge respectively)
- No semantic alias needed for violet -- it's used directly via raw tokens in specific contexts

### 2. Should the undocumented colors be added as tokens or replaced?

**Decision: Add them all as tokens. They each serve a distinct, justified purpose.**

Every hardcoded color in the CSS exists for a reason:

| Color | Hex | Purpose | Verdict |
|-------|-----|---------|---------|
| Cyan-400 | `#22d3ee` | Doc badge: tech approach | **Add as token.** Distinct category color, not replaceable with existing palette. |
| Purple-400 | `#c084fc` | Doc badge: design spec, agent identity (Robert) | **Add as token.** Already used in two contexts. |
| Amber-400 | `#fbbf24` | Doc badge: research, agent identity (Enzo) | **Add as token.** Already used in two contexts. |
| Emerald-600 | `#059669` | "Copied" button success state | **Add as token.** Darker green for bg contrast against white text. Green-400 is too light for backgrounds. |
| Emerald-400 | `#34d399` | Agent identity (Jonah) | **Add as token.** Needed for agent system. |
| Red-500 | `#ef4444` | Delete button background | **Add as token.** Distinct from red-400 (which is for text/borders). |
| Red-600 | `#dc2626` | Delete button hover | **Add as token.** Hover state of red-500. |
| Violet-400 | `#a78bfa` | Agent identity (Andrei) | **Add as token.** Needed for agent system. |
| Violet-600 | `#7c3aed` | Weekly meeting button hover | **Add as token.** Hover state of violet-500. |
| Pink-400 | `#f472b6` | Agent identity (Alice) | **Add as token.** Needed for agent system. |

### 3. Should agent identity colors be part of the token system?

**Decision: Yes. All 12 agents get a named `--color-agent-{name}` token.**

Andrei's tech approach already specifies this pattern. I'm extending it from 6 agents to all 12. The color assignments are designed to:
- Be visually distinguishable from each other in a list context (meetings transcript, roster)
- Use colors that are already in the palette where possible
- Avoid collision with status colors (no pure red/green/yellow for agents)
- Group by warm/cool to create natural visual rhythm

---

## Color Palette

### Raw Scale Tokens

These are the foundational color values. They map 1:1 to Tailwind's color palette.

#### Neutrals — Zinc (canonical)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-zinc-100` | `#f4f4f5` | — |
| `--color-zinc-200` | `#e4e4e7` | — |
| `--color-zinc-300` | `#d4d4d8` | Primary text |
| `--color-zinc-400` | `#a1a1aa` | Secondary text, muted elements |
| `--color-zinc-500` | `#71717a` | — |
| `--color-zinc-600` | `#52525b` | Tertiary text |
| `--color-zinc-700` | `#3f3f46` | Borders (subtle) |
| `--color-zinc-800` | `#27272a` | Borders (standard), card separators |
| `--color-zinc-900` | `#18181b` | Card/panel backgrounds |
| `--color-zinc-950` | `#09090b` | Page background |

#### Brand — Indigo

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-indigo-50` | `#eef2ff` | — |
| `--color-indigo-100` | `#e0e7ff` | — |
| `--color-indigo-300` | `#a5b4fc` | — |
| `--color-indigo-400` | `#818cf8` | Accent hover, interactive highlights |
| `--color-indigo-500` | `#6366f1` | Primary accent, CTA buttons, active states |
| `--color-indigo-600` | `#4f46e5` | — |
| `--color-indigo-700` | `#4338ca` | — |

#### Secondary Accent — Violet

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-violet-400` | `#a78bfa` | Agent identity (Andrei) |
| `--color-violet-500` | `#8b5cf6` | Weekly meeting variant accent |
| `--color-violet-600` | `#7c3aed` | Weekly meeting button hover |

#### Status & Feedback

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-green-400` | `#4ade80` | Success text, completed badges, live indicators |
| `--color-emerald-400` | `#34d399` | Agent identity (Jonah) |
| `--color-emerald-600` | `#059669` | Success backgrounds (darker, for white text contrast) |
| `--color-red-400` | `#f87171` | Error text, validation, destructive hover text |
| `--color-red-500` | `#ef4444` | Destructive button backgrounds |
| `--color-red-600` | `#dc2626` | Destructive button hover |
| `--color-yellow-400` | `#facc15` | Warning text, in-progress badges |

#### Category Accents (doc badges, skill categories)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-cyan-400` | `#22d3ee` | Tech approach badge |
| `--color-purple-400` | `#c084fc` | Design spec badge, agent identity (Robert) |
| `--color-amber-400` | `#fbbf24` | Research badge, agent identity (Enzo) |
| `--color-pink-400` | `#f472b6` | Agent identity (Alice) |

#### Legacy (deprecated)

| Token | Hex | Notes |
|-------|-----|-------|
| `--color-white` | `#ffffff` | Keep for now -- used in button text |
| `--color-gray-50` through `--color-gray-900` | (slate scale) | **DEPRECATED.** Use zinc equivalents. Move to bottom of `tokens.css` with deprecation comment. |

### Semantic Tokens

These reference raw tokens and provide role-based naming. If we ever add a light theme, only these need to change.

#### Backgrounds

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-bg-primary` | `var(--color-zinc-950)` | Page background |
| `--color-bg-secondary` | `var(--color-zinc-950)` | Section background (currently same as primary) |
| `--color-bg-card` | `var(--color-zinc-900)` | Card/panel background |

#### Text

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-text-primary` | `var(--color-zinc-300)` | Body text, primary content |
| `--color-text-secondary` | `var(--color-zinc-400)` | Supporting text, descriptions |
| `--color-text-tertiary` | `var(--color-zinc-600)` | Placeholder text, disabled text |

#### Interactive

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-accent` | `var(--color-indigo-500)` | Primary accent, CTA buttons |
| `--color-accent-hover` | `var(--color-indigo-400)` | Accent hover state |
| `--color-accent-light` | `rgba(99, 102, 241, 0.1)` | Accent tint background |

#### Borders

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-border` | `var(--color-zinc-800)` | Standard border color |

#### Status

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-status-success` | `var(--color-green-400)` | Success text and indicators |
| `--color-status-error` | `var(--color-red-400)` | Error text and validation |
| `--color-status-warning` | `var(--color-yellow-400)` | Warning text and in-progress states |

---

## Agent Identity Colors

All 12 team members get a named color token. These are used in meeting transcripts, roster displays, and any context where agents need visual differentiation.

**Design rationale:** Colors are chosen to be:
- Visually distinct from each other when seen in a list
- From different hue families to avoid confusion
- Consistent with existing assignments (Thomas = indigo-400, Andrei = violet-400, etc.)
- Not conflicting with status semantics (no agent gets pure red, green, or yellow)

| Token | Value | Hex | Agent | Role |
|-------|-------|-----|-------|------|
| `--color-agent-thomas` | `var(--color-indigo-400)` | `#818cf8` | Thomas | Product Manager |
| `--color-agent-andrei` | `var(--color-violet-400)` | `#a78bfa` | Andrei | Technical Architect |
| `--color-agent-robert` | `var(--color-purple-400)` | `#c084fc` | Robert | Product Designer |
| `--color-agent-alice` | `var(--color-pink-400)` | `#f472b6` | Alice | Front-End Developer |
| `--color-agent-jonah` | `var(--color-emerald-400)` | `#34d399` | Jonah | Back-End Developer |
| `--color-agent-enzo` | `var(--color-amber-400)` | `#fbbf24` | Enzo | QA Engineer |
| `--color-agent-priya` | `var(--color-rose-400)` | `#fb7185` | Priya | Product Marketer |
| `--color-agent-suki` | `var(--color-teal-400)` | `#2dd4bf` | Suki | Market Researcher |
| `--color-agent-marco` | `var(--color-orange-400)` | `#fb923c` | Marco | Technical Researcher |
| `--color-agent-nadia` | `var(--color-sky-400)` | `#38bdf8` | Nadia | Technical Writer |
| `--color-agent-yuki` | `var(--color-lime-400)` | `#a3e635` | Yuki | Data Analyst |
| `--color-agent-kai` | `var(--color-cyan-400)` | `#22d3ee` | Kai | AI Engineer |
| `--color-agent-default` | `var(--color-zinc-400)` | `#a1a1aa` | (fallback) | Unknown agent |

**New raw tokens required** for agent colors not already in the palette:

| Token | Hex | Source |
|-------|-----|--------|
| `--color-rose-400` | `#fb7185` | Tailwind rose-400 |
| `--color-teal-400` | `#2dd4bf` | Tailwind teal-400 |
| `--color-orange-400` | `#fb923c` | Tailwind orange-400 |
| `--color-sky-400` | `#38bdf8` | Tailwind sky-400 |
| `--color-lime-400` | `#a3e635` | Tailwind lime-400 |

**Note:** Kai and cyan-400 overlap -- Kai's agent color is the same as the tech-approach doc badge. This is intentional: Kai's role (AI Engineer) is technical in nature, and the overlap is unlikely to cause confusion since agent colors and doc badges never appear in the same UI context.

---

## Typography

No changes to the existing type scale. It is already well-structured and consistent.

### Font Families

| Token | Value |
|-------|-------|
| `--font-family` | `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| `--font-mono` | `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace` |

### Type Scale

| Token | Value | Typical Use |
|-------|-------|-------------|
| `--text-xs` | `0.75rem` (12px) | Badges, metadata, timestamps |
| `--text-sm` | `0.875rem` (14px) | Secondary text, card descriptions |
| `--text-base` | `1rem` (16px) | Body text |
| `--text-lg` | `1.125rem` (18px) | Subheadings |
| `--text-xl` | `1.25rem` (20px) | Section subheadings |
| `--text-2xl` | `1.5rem` (24px) | Card titles |
| `--text-3xl` | `1.875rem` (30px) | Section headings |
| `--text-4xl` | `2.25rem` (36px) | Page headings |
| `--text-5xl` | `3rem` (48px) | Hero heading |

### Line Heights

| Token | Value |
|-------|-------|
| `--leading-tight` | `1.2` |
| `--leading-normal` | `1.5` |
| `--leading-relaxed` | `1.625` |

### Font Weights

| Token | Value |
|-------|-------|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

---

## Spacing

No changes. The existing scale is a clean 4px-based system.

| Token | Value |
|-------|-------|
| `--space-1` | `0.25rem` (4px) |
| `--space-2` | `0.5rem` (8px) |
| `--space-3` | `0.75rem` (12px) |
| `--space-4` | `1rem` (16px) |
| `--space-5` | `1.25rem` (20px) |
| `--space-6` | `1.5rem` (24px) |
| `--space-8` | `2rem` (32px) |
| `--space-10` | `2.5rem` (40px) |
| `--space-12` | `3rem` (48px) |
| `--space-16` | `4rem` (64px) |
| `--space-20` | `5rem` (80px) |
| `--space-24` | `6rem` (96px) |

---

## Border Radius

No changes.

| Token | Value |
|-------|-------|
| `--radius-sm` | `6px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-xl` | `16px` |

---

## Shadows

No changes.

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)` |

---

## Hardcoded Value Replacement Guide

This is the complete mapping of every hardcoded hex value in `css/styles.css` to its token replacement. Alice uses this as a mechanical search-and-replace reference.

### Direct hex-to-token replacements

These values already have tokens defined (or will have after this consolidation):

| Hardcoded Value | Replace With | Context |
|----------------|-------------|---------|
| `#4ade80` (color/text) | `var(--color-green-400)` | Success text, live badges, completed indicators |
| `#f87171` (color/text) | `var(--color-red-400)` | Error text, validation, delete hover |
| `#facc15` (color/text) | `var(--color-yellow-400)` | Warning text, in-progress badges |
| `#ef4444` (background) | `var(--color-red-500)` | Delete button bg |
| `#dc2626` (background) | `var(--color-red-600)` | Delete button hover bg |
| `#059669` (background) | `var(--color-emerald-600)` | Copied button bg |
| `#7c3aed` (background) | `var(--color-violet-600)` | Weekly meeting button hover bg |
| `#22d3ee` (color) | `var(--color-cyan-400)` | Tech approach badge text |
| `#c084fc` (color) | `var(--color-purple-400)` | Design spec badge text |
| `#fbbf24` (color) | `var(--color-amber-400)` | Research badge text |

### rgba() values

These are tint/shade variations used for backgrounds and borders. They should continue using `rgba()` with the raw color values, because CSS custom properties cannot be interpolated inside `rgba()` without `color-mix()` (which adds complexity for no visual benefit).

**Recommendation:** Leave `rgba()` values as-is in Phase 2. They reference the same color values as the tokens. If a future cleanup pass wants to consolidate them, `color-mix()` or defining named tint tokens (e.g., `--color-green-400-10`) would work -- but that's out of scope for this project.

**Exception:** Where `rgba()` uses a color that already has a hex-defined token (e.g., `rgba(74, 222, 128, 0.1)` for green-400 at 10% opacity), add a comment referencing the token name for traceability:

```css
/* green-400 at 10% */
background: rgba(74, 222, 128, 0.1);
```

This makes it easy to find all usages if we later add tint tokens.

---

## Tailwind Mapping Reference

For the OST tool and future Tailwind-based tools, this table documents how CSS custom property tokens map to Tailwind utility classes. The hex values are identical -- both derive from the Tailwind color palette.

| CSS Token | Tailwind Class | Hex |
|-----------|---------------|-----|
| `var(--color-zinc-800)` | `bg-zinc-800`, `border-zinc-800` | `#27272a` |
| `var(--color-zinc-900)` | `bg-zinc-900` | `#18181b` |
| `var(--color-zinc-950)` | `bg-zinc-950` | `#09090b` |
| `var(--color-indigo-500)` | `bg-indigo-500`, `text-indigo-500` | `#6366f1` |
| `var(--color-indigo-400)` | `text-indigo-400`, `hover:bg-indigo-400` | `#818cf8` |
| (full mapping in `docs/design-tokens-reference.md` by Nadia) | | |

---

## Implementation Notes for Alice

1. **Create `css/tokens.css`** with all tokens listed in this spec, organized by category in this order: neutrals (zinc), brand (indigo), secondary accent (violet), status (green, red, yellow), category accents (emerald, cyan, purple, amber, pink), agent identity, legacy (deprecated gray), then semantic aliases, then typography, spacing, radius, shadows.

2. **New raw tokens to add** (not in current `:root`): `--color-red-500`, `--color-red-600`, `--color-emerald-400`, `--color-emerald-600`, `--color-violet-400`, `--color-violet-600`, `--color-cyan-400`, `--color-purple-400`, `--color-amber-400`, `--color-pink-400`, `--color-rose-400`, `--color-teal-400`, `--color-orange-400`, `--color-sky-400`, `--color-lime-400`.

3. **New semantic tokens to add**: `--color-status-success`, `--color-status-error`, `--color-status-warning`, and all 13 `--color-agent-*` tokens.

4. **Replace hardcoded hex values** using the mapping table above. The `rgba()` values stay as-is (with optional comments for traceability).

5. **Update `meetings.js`** to read from `--color-agent-*` tokens via `getComputedStyle` as specified in Andrei's tech approach. Add the 6 missing agents (Priya, Suki, Marco, Nadia, Yuki, Kai) to the AGENTS object.

6. **Visual verification:** After all replacements, every page should look identical. Focus on: status badges (green/yellow/red), delete buttons (red), doc badges (cyan/purple/amber/green), meeting badges (indigo/violet), agent colors in transcript.
