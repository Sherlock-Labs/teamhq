# Design Token Consolidation - Tech Approach (Phase 2: Adoption Completion)

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-07
**Status:** Ready for Implementation
**Depends on:** [design-token-consolidation-requirements.md](design-token-consolidation-requirements.md) (Thomas, updated)
**Supersedes:** Previous tech approach (Phase 1 -- token extraction, now complete)

---

## 1. Summary

Phase 1 (token extraction into `tokens.css` + `shared.css`) is done. This document covers Phase 2: completing adoption by replacing all remaining hardcoded color values (~132 total across CSS, JS, and TSX) with token references. There are five open technical decisions from Thomas's requirements. This doc resolves each one and provides file-by-file implementation guidance for Alice.

---

## 2. Decision 1: rgba() Tokenization Approach

### The Problem

~73 raw `rgba()` calls across `styles.css` and `docs.css` use hardcoded RGB channel values like `rgba(16, 185, 129, 0.15)`. CSS custom properties store opaque strings (`#10b981`), so you can't do `rgba(var(--color-emerald-500), 0.15)`.

### The Three Options

| Approach | Pros | Cons |
|----------|------|------|
| **`color-mix()`** | No new tokens. Modern. Clean syntax. | Percentage-based, not opacity-based. `color-mix(in srgb, var(--x) 15%, transparent)` is not identical to `rgba(r,g,b, 0.15)` -- it mixes in sRGB space, which can produce subtly different results at low opacities over varied backgrounds. |
| **Opacity variant tokens** | Simple references. Easy to read. Exact match to current values. | Token explosion -- need ~25-30 new tokens for all the opacity variants used. |
| **RGB channel tokens** | Allows arbitrary opacity. Few new tokens. Exact rgba() match. | Slightly verbose syntax: `rgba(var(--color-emerald-500-rgb), 0.15)`. Pairs of tokens to maintain (hex + rgb). |

### Decision: RGB Channel Tokens

**I'm choosing the RGB channel tokens approach.** Here's why:

1. **Exact visual match.** The requirement is zero visual regressions. `color-mix()` operates in sRGB space and does not produce identical results to `rgba()` at every opacity level. The difference is subtle but real, and QA would need to pixel-diff everything. RGB channel tokens produce byte-identical CSS output to what we have today.

2. **Minimal token count.** We need ~15 new RGB channel tokens (one per base color used in rgba calls), compared to ~25+ opacity variant tokens.

3. **Developer flexibility.** Any opacity value works with `rgba(var(--rgb-token), 0.15)` without defining a new token. Future developers can use any opacity without asking "is there a token for 0.07?"

4. **Browser support is universal.** `rgba(var(--custom-prop), alpha)` works in every browser that supports CSS custom properties (2017+). `color-mix()` requires 2023+ browsers. While we only target modern browsers, there's no reason to use a newer feature when the older one works identically and more predictably.

5. **Boring is beautiful.** This is the simplest approach that gives us exact visual parity. `color-mix()` is the "modern" choice but it solves a problem we don't have (we don't need perceptual color mixing, we need transparent overlays).

### New RGB Channel Tokens

Add these to `tokens.css` after the "Utility" section, before "Semantic Tokens":

```css
/* --- RGB Channel Equivalents (for rgba() transparency) ---
   These exist so you can write rgba(var(--color-foo-rgb), 0.15).
   CSS custom properties store opaque strings, so you can't decompose
   a hex token into channels. Each -rgb token stores bare R, G, B values.
   Chosen over color-mix() for exact visual parity — see tech approach doc. */

/* Core */
--color-black-rgb: 0, 0, 0;
--color-white-rgb: 255, 255, 255;

/* Accent / Emerald */
--color-emerald-400-rgb: 52, 211, 153;
--color-emerald-500-rgb: 16, 185, 129;

/* Status */
--color-green-400-rgb: 74, 222, 128;
--color-green-600-rgb: 22, 163, 74;
--color-red-600-rgb: 220, 38, 38;
--color-warning-rgb: 202, 138, 4;
--color-violet-500-rgb: 139, 92, 246;

/* Badge / Category colors (for docs.css badge backgrounds) */
--color-indigo-400-rgb: 129, 140, 248;
--color-purple-400-rgb: 192, 132, 252;
--color-amber-400-rgb: 251, 191, 36;
--color-rose-400-rgb: 251, 126, 149;
--color-cyan-400-rgb: 34, 211, 238;
--color-zinc-400-rgb: 161, 161, 170;
```

**Total: 15 new tokens.**

### Migration Pattern

Every raw `rgba()` call follows this transformation:

```css
/* Before */
background: rgba(16, 185, 129, 0.15);
border: 1px solid rgba(0, 0, 0, 0.12);
box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);

/* After */
background: rgba(var(--color-emerald-500-rgb), 0.15);
border: 1px solid rgba(var(--color-black-rgb), 0.12);
box-shadow: 0 0 0 3px rgba(var(--color-red-600-rgb), 0.12);
```

The opacity value after the comma stays exactly as-is. Only the RGB tuple is replaced.

---

## 3. Decision 2: PDF Tools Strategy

### Decision: Keep Self-Contained

**Keep the PDF tools as self-contained single-file HTML documents. Do not link to shared `tokens.css`.**

Rationale:

1. **They are standalone tools.** They're designed to be portable, single-file utilities. Linking to `../../css/tokens.css` creates a fragile relative path dependency and breaks their self-contained nature.

2. **Different variable naming.** They use `--zinc-800` while `tokens.css` uses `--color-zinc-800`. Changing all internal references would be churn with no user-facing benefit.

3. **Different font stack.** They use Inter; the main site uses Geist. Different design context.

4. **Risk vs. reward.** If someone moves or copies a PDF tool, it should still work. Linking to a shared stylesheet breaks that.

5. **The consolidation goal is about the main TeamHQ site.** These tools have their own design system that happens to use the same color palette. That's fine.

This amends the previous tech approach (Phase 1), which recommended linking the PDF tools to shared tokens. After further evaluation, the self-containment benefit outweighs the DRY benefit at this scale.

**Action for Alice:** No CSS changes to `pdf-splitter/index.html` or `pdf-combiner/index.html`. Add a brief comment at the top of each file's `<style>` block:

```css
/* Design tokens are intentionally self-contained in this file.
   See docs/design-token-consolidation-tech-approach.md, Decision 2. */
```

---

## 4. Decision 3: JS Agent Colors in `meetings.js`

### Decision: Read CSS Custom Properties at Runtime via `getComputedStyle()`

The agent identity tokens already exist in `tokens.css` (`--color-agent-thomas`, etc.). Read them at runtime instead of hardcoding hex values.

Rationale:

1. **Single source of truth.** The values are already in `tokens.css`. Reading them ensures the JS always matches the CSS.
2. **No new files.** A shared JS constant file would duplicate the CSS tokens.
3. **Performance is negligible.** `getComputedStyle()` called once at page load, seven property lookups.
4. **Simple implementation.** Vanilla JS, no build step, matches the project's conventions.

### Implementation

```javascript
// Before
var AGENTS = {
  'Thomas': { role: 'Product Manager', avatar: 'img/avatars/thomas.svg', color: '#818cf8' },
  'Andrei': { role: 'Technical Architect', avatar: 'img/avatars/andrei.svg', color: '#a78bfa' },
  // ...
};

// After
var rootStyles = getComputedStyle(document.documentElement);
function agentColor(name) {
  return rootStyles.getPropertyValue('--color-agent-' + name).trim() || '#a1a1aa';
}

var AGENTS = {
  'Thomas': { role: 'Product Manager', avatar: 'img/avatars/thomas.svg', color: agentColor('thomas') },
  'Andrei': { role: 'Technical Architect', avatar: 'img/avatars/andrei.svg', color: agentColor('andrei') },
  'Robert': { role: 'Product Designer', avatar: 'img/avatars/robert.svg', color: agentColor('robert') },
  'Alice': { role: 'Front-End Developer', avatar: 'img/avatars/alice.svg', color: agentColor('alice') },
  'Jonah': { role: 'Back-End Developer', avatar: 'img/avatars/jonah.svg', color: agentColor('jonah') },
  'Enzo': { role: 'QA Engineer', avatar: 'img/avatars/enzo.svg', color: agentColor('enzo') },
};
```

And the fallback on line 251:

```javascript
// Before
var agent = AGENTS[entry.speaker] || { role: entry.role || '', avatar: '', color: '#a1a1aa' };

// After
var agent = AGENTS[entry.speaker] || { role: entry.role || '', avatar: '', color: agentColor('default') };
```

### Gotcha

`getComputedStyle()` must be called after the DOM is ready and `tokens.css` is loaded. Since `meetings.js` is loaded at the end of `<body>` and the whole file is wrapped in an IIFE that runs immediately, this is already guaranteed -- `tokens.css` is a `<link>` in `<head>` and loads synchronously before any scripts execute. Alice should verify the `rootStyles` variable is inside the IIFE (it already is).

---

## 5. Decision 4: `#fb7185` in docs.css

### The Problem

`docs.css` line 196 uses `color: #fb7185` for QA report/findings badges. Our `--color-rose-400` token is `#fb7e95`. These are different:
- `#fb7185` = rgb(251, 113, 133) -- standard Tailwind rose-400
- `#fb7e95` = rgb(251, 126, 149) -- our custom rose-400

### Decision: Use Our Existing `--color-rose-400` Token, Flag to Robert

**Map to `var(--color-rose-400)` (our `#fb7e95`).** The visual difference is minimal -- a very slight shift in pink tone. This keeps the token system clean with one rose-400 value.

**This is Robert's call to confirm during design review.** If he wants the exact `#fb7185` preserved, two options:
1. Change our `--color-rose-400` to `#fb7185` (aligns with standard Tailwind)
2. Add a `--color-rose-500: #fb7185` token for this specific use

For the rgba background on the same badge: set `--color-rose-400-rgb: 251, 126, 149` to match our current `--color-rose-400: #fb7e95`. If Robert changes the hex token, update the RGB token to match.

**Key constraint:** The hex token and RGB token must always represent the same color.

---

## 6. Decision 5: `shared.css` Frosted-Glass rgba

### The Problem

`shared.css` line 49 uses `rgba(255, 255, 255, 0.85)` for the sticky nav background with `backdrop-filter: blur(12px)`.

### Decision: Create a Semantic Token

**Add `--color-bg-frosted: rgba(var(--color-white-rgb), 0.85)` to the semantic "Backgrounds" section of `tokens.css`.**

Rationale:

1. It's a deliberate design decision (frosted glass nav), not a one-off hack.
2. If the team ever adjusts the frosted-glass opacity, having it as a token means one change in one place.
3. It fits naturally alongside `--color-bg-primary`, `--color-bg-secondary`, and `--color-bg-card`.
4. The `--color-white-rgb` token is already being added, so this is free.

```css
/* In tokens.css, Semantic Tokens > Backgrounds */
--color-bg-frosted: rgba(var(--color-white-rgb), 0.85);

/* In shared.css */
background: var(--color-bg-frosted);
```

---

## 7. OST Tool TreeView.tsx (2 Values)

Two hardcoded hex values in React/JSX:

| Location | Current | Replacement |
|----------|---------|-------------|
| Line 47 | `stroke: "#3f3f46"` | `stroke: "var(--color-zinc-700)"` |
| Line 223 | `color="#27272a"` | See below |

**Line 47 (edge stroke):** This is a React Flow edge style object. `var()` works in inline SVG styles:

```tsx
style: { stroke: "var(--color-zinc-700)" },
```

**Line 223 (Background component):** React Flow's `<Background>` component accepts a `color` prop. It may or may not support CSS variable strings -- depends on whether it passes the value directly to SVG attributes or processes it internally.

**Try `var()` first:**
```tsx
<Background color="var(--color-zinc-800)" gap={20} />
```

**If that doesn't work**, use `getComputedStyle()`:
```tsx
const bgColor = useMemo(
  () => getComputedStyle(document.documentElement).getPropertyValue('--color-zinc-800').trim(),
  []
);
<Background color={bgColor} gap={20} />
```

Alice should test both approaches. The edge stroke will definitely work.

---

## 8. Complete Token Changes to `tokens.css`

### 8.1 New Tokens (add after line 82, before "Semantic Tokens")

15 RGB channel tokens (listed in Section 2 above).

### 8.2 New Semantic Token (add after `--color-bg-card` on line 89)

```css
--color-bg-frosted: rgba(var(--color-white-rgb), 0.85);
```

### 8.3 Updated Semantic Tokens (modify existing)

```css
/* Before */
--color-accent-light: rgba(16, 185, 129, 0.06);
--color-border: rgba(0, 0, 0, 0.06);
--color-border-strong: rgba(0, 0, 0, 0.12);

/* After */
--color-accent-light: rgba(var(--color-emerald-500-rgb), 0.06);
--color-border: rgba(var(--color-black-rgb), 0.06);
--color-border-strong: rgba(var(--color-black-rgb), 0.12);
```

### 8.4 Updated Shadow Tokens (modify existing)

```css
/* All shadows: replace rgba(0, 0, 0, X) with rgba(var(--color-black-rgb), X) */
--shadow-sm: 0 1px 2px 0 rgba(var(--color-black-rgb), 0.05);
--shadow-md: 0 4px 6px -1px rgba(var(--color-black-rgb), 0.07), 0 2px 4px -2px rgba(var(--color-black-rgb), 0.05);
--shadow-lg: 0 10px 15px -3px rgba(var(--color-black-rgb), 0.08), 0 4px 6px -4px rgba(var(--color-black-rgb), 0.04);
--shadow-card: 0 1px 3px rgba(var(--color-black-rgb), 0.06), 0 1px 2px rgba(var(--color-black-rgb), 0.04);
--shadow-card-hover: 0 10px 25px -5px rgba(var(--color-black-rgb), 0.08), 0 4px 10px -4px rgba(var(--color-black-rgb), 0.03);
--shadow-ring: 0 0 0 1px rgba(var(--color-black-rgb), 0.06);
```

**Totals: 16 new tokens, 9 modified tokens.**

---

## 9. File-by-File Implementation Guide

### 9.1 `css/tokens.css`

1. Add RGB channel tokens section after line 82 (`--color-white: #ffffff;`)
2. Add `--color-bg-frosted` after `--color-bg-card` (line 89)
3. Update `--color-accent-light`, `--color-border`, `--color-border-strong` to use RGB tokens
4. Update all six `--shadow-*` tokens to use `--color-black-rgb`
5. **Verify the page renders identically** -- additions are additive, semantic/shadow updates should be transparent

### 9.2 `css/styles.css` -- Hex Replacements (9 values)

| Line | Before | After |
|------|--------|-------|
| 664 | `background: #4ade80` | `background: var(--color-green-400)` |
| 668 | `background: #facc15` | `background: var(--color-yellow-400)` |
| 672 | `background: #f87171` | `background: var(--color-red-400)` |
| 1225 | `background: #ef4444` | `background: var(--color-red-500)` |
| 1234 | `background: #dc2626` | `background: var(--color-red-600)` |
| 1253 | `background: #ffffff` | `background: var(--color-white)` |
| 1357 | `background: #059669` | `background: var(--color-emerald-600)` |
| 1361 | `background: #059669` | `background: var(--color-emerald-600)` |
| 2025 | `background: #ffffff` | `background: var(--color-white)` |

### 9.3 `css/styles.css` -- rgba() Replacements (~65 values)

Bulk find-and-replace by RGB tuple. Each tuple uniquely identifies the color:

| Find | Replace With |
|------|-------------|
| `rgba(16, 185, 129,` | `rgba(var(--color-emerald-500-rgb),` |
| `rgba(0, 0, 0,` | `rgba(var(--color-black-rgb),` |
| `rgba(220, 38, 38,` | `rgba(var(--color-red-600-rgb),` |
| `rgba(22, 163, 74,` | `rgba(var(--color-green-600-rgb),` |
| `rgba(202, 138, 4,` | `rgba(var(--color-warning-rgb),` |
| `rgba(74, 222, 128,` | `rgba(var(--color-green-400-rgb),` |
| `rgba(255, 255, 255,` | `rgba(var(--color-white-rgb),` |
| `rgba(139, 92, 246,` | `rgba(var(--color-violet-500-rgb),` |

The opacity values after the comma stay exactly as they are.

### 9.4 `css/docs.css` -- Hex Replacements (5 values)

| Line | Before | After |
|------|--------|-------|
| 180 | `color: #34d399` | `color: var(--color-emerald-400)` |
| 185 | `color: #c084fc` | `color: var(--color-purple-400)` |
| 190 | `color: #fbbf24` | `color: var(--color-amber-400)` |
| 196 | `color: #fb7185` | `color: var(--color-rose-400)` (flag to Robert -- see Decision 4) |
| 201 | `color: #22d3ee` | `color: var(--color-cyan-400)` |

### 9.5 `css/docs.css` -- rgba() Replacements (8 values)

| Line | Find | Replace With |
|------|------|-------------|
| 158 | `rgba(255, 255, 255, 0.02)` | `rgba(var(--color-white-rgb), 0.02)` |
| 176 | `rgba(129, 140, 248, 0.1)` | `rgba(var(--color-indigo-400-rgb), 0.1)` |
| 181 | `rgba(52, 211, 153, 0.1)` | `rgba(var(--color-emerald-400-rgb), 0.1)` |
| 186 | `rgba(192, 132, 252, 0.1)` | `rgba(var(--color-purple-400-rgb), 0.1)` |
| 191 | `rgba(251, 191, 36, 0.1)` | `rgba(var(--color-amber-400-rgb), 0.1)` |
| 197 | `rgba(251, 113, 133, 0.1)` | `rgba(var(--color-rose-400-rgb), 0.1)` |
| 202 | `rgba(34, 211, 238, 0.1)` | `rgba(var(--color-cyan-400-rgb), 0.1)` |
| 208 | `rgba(161, 161, 170, 0.1)` | `rgba(var(--color-zinc-400-rgb), 0.1)` |

**Note on line 197:** The original `rgba(251, 113, 133, 0.1)` uses `#fb7185` RGB values, but our `--color-rose-400-rgb` will be `251, 126, 149` (matching our `--color-rose-400: #fb7e95`). This will produce a very slightly different background tint. Flag to Robert -- see Decision 4.

### 9.6 `css/shared.css` -- 1 rgba() Replacement

| Line | Before | After |
|------|--------|-------|
| 49 | `background: rgba(255, 255, 255, 0.85)` | `background: var(--color-bg-frosted)` |

### 9.7 `js/meetings.js` -- 7 Hex Values

See Decision 3 (Section 4) for the full implementation pattern.

### 9.8 `ost-tool/client/src/components/TreeView.tsx` -- 2 Hex Values

See Section 7 for the implementation with fallback approach.

### 9.9 PDF Tools -- No CSS Changes

Add self-containment comment only. See Decision 2 (Section 3).

---

## 10. Order of Operations

Alice should implement in this order:

### Phase 1: Token Foundation (do first -- everything depends on this)
1. Add all new RGB channel tokens to `tokens.css`
2. Add `--color-bg-frosted` semantic token
3. Update existing semantic tokens (`--color-accent-light`, `--color-border`, `--color-border-strong`) to use RGB tokens
4. Update shadow tokens to use `--color-black-rgb`
5. **Verify** -- page should render identically (these changes are value-preserving)

### Phase 2: Straightforward Hex Replacements
6. `styles.css` -- 9 hex values
7. `docs.css` -- 5 hex values
8. `shared.css` -- 1 frosted-glass replacement
9. **Verify** -- both pages should render identically

### Phase 3: rgba() Bulk Replacement (highest risk)
10. `styles.css` -- ~65 rgba values (bulk find-and-replace by RGB tuple)
11. `docs.css` -- 8 rgba values
12. **Verify** -- this is the highest-risk phase; check all pages carefully

### Phase 4: JS and Peripheral
13. `meetings.js` -- implement `getComputedStyle()` approach
14. `TreeView.tsx` -- try `var()`, fall back to `getComputedStyle()`
15. PDF tools -- add comments only

### Phase 5: Final Audit
16. Grep for remaining hardcoded hex/rgba in CSS and JS (excluding `tokens.css` definitions and PDF tools)
17. Visual review of all pages: landing page (all sections), docs page (list + reading view), meetings page, OST tool

---

## 11. Gotchas

1. **`rgba(var(...), alpha)` requires bare numbers.** The `-rgb` tokens must resolve to `R, G, B` (no `#`, no `rgb()`). This is why we need separate tokens.

2. **Shadow tokens in `tokens.css` itself** use `rgba(0, 0, 0, ...)`. Update these too -- `tokens.css` should practice what it preaches.

3. **Docs page = dark theme (zinc), landing page = light theme (neutral).** Both scales are in `tokens.css`. Don't swap them.

4. **`color-mix()` is NOT a drop-in replacement.** If someone later tries to "modernize" by switching to `color-mix()`, they'll get different visual results. The comment block on the RGB tokens section explains this.

5. **The `#fb7185` → `--color-rose-400` mapping** may produce a subtle color shift on the QA badge. Robert confirms during design review.

6. **Test meetings transcript rendering** after the `getComputedStyle()` change. Colors are applied as inline `style` on avatar borders and speaker names.

---

## 12. What I Am NOT Recommending

- **No CSS preprocessor.** Plain CSS custom properties. No build step for the landing page.
- **No `@property` registration.** Adds complexity, doesn't solve the rgba decomposition problem.
- **No JavaScript color utilities.** Over-engineering for a CSS-only problem.
- **No Tailwind for the landing page.** The OST tool uses Tailwind; the landing page doesn't and shouldn't.
- **No `color-mix()`.** See Decision 1 rationale.
