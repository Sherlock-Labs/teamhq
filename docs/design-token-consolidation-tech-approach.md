# Design Token Consolidation — Tech Approach

**Author:** Andrei (Technical Architect)
**Date:** 2026-02-07
**Depends on:** `docs/design-token-consolidation-requirements.md` (Thomas)

---

## Summary

Extract the `:root` token block from `css/styles.css` into a standalone `css/tokens.css`, create a `css/shared.css` for shared component patterns (nav, footer), eliminate all hardcoded hex values across the codebase, and bridge the token system to the OST tool's Tailwind config. Zero visual changes. Zero new dependencies. Zero build steps for vanilla HTML surfaces.

## Decisions

### 1. File Structure: Two Files — `tokens.css` + `shared.css`

**Decision:** Two separate files, not one combined and not split by category.

- `css/tokens.css` — All design tokens (colors, typography, spacing, radii, shadows) as CSS custom properties in `:root`. This is the single source of truth.
- `css/shared.css` — Shared component patterns (nav bar, footer, back link, container base) as BEM class definitions. Imports `tokens.css` internally.

**Why not a single file?** Tokens and component styles serve different purposes. A tool might want the tokens without the shared nav styles (e.g., if it implements a custom layout). Keeping them separate preserves that option.

**Why not split tokens by category (colors.css, typography.css, spacing.css)?** Over-engineering for our current token count (~60 variables). A single token file is easier to scan, easier to import, and creates one fewer decision ("which file does this token go in?"). If the token count grows past ~200, revisit this.

### 2. HTML Linking Strategy: `<link>` Tags, Not CSS `@import`

**Decision:** Each HTML file links `tokens.css` and `shared.css` via separate `<link>` tags in `<head>`.

```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/shared.css">
<link rel="stylesheet" href="css/styles.css">
```

For tools in subdirectories (pdf-splitter, pdf-combiner):

```html
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/shared.css">
```

**Why not CSS `@import`?** CSS `@import` is render-blocking and sequential — the browser must download and parse the importing file before it discovers the imported file, adding a network round-trip. `<link>` tags allow the browser to discover and fetch all stylesheets in parallel. This eliminates the FOUC risk Thomas flagged.

**Consequence for `css/styles.css`:** The file currently starts with the `:root` block (lines 1-109). After extraction, those lines are removed. `styles.css` no longer defines tokens — it consumes them via `var()` references, which already exist throughout the file. No `@import` inside `styles.css`.

### 3. Naming Convention: Keep `--color-*` Pattern, Systematize

**Decision:** Keep the existing `--color-{scale}-{step}` naming that `styles.css` already uses. Extend it consistently for colors that are currently hardcoded.

**Raw scale tokens** (direct color values):
```
--color-zinc-{100-950}
--color-indigo-{50,100,300,400,500,600,700}
--color-violet-500
--color-red-{400,500}
--color-green-{400,600}
--color-yellow-400
--color-emerald-600
--color-cyan-400
--color-purple-400
--color-amber-400
--color-pink-400
```

**Semantic tokens** (role-based aliases, reference raw tokens):
```
--color-bg-primary, --color-bg-secondary, --color-bg-card
--color-text-primary, --color-text-secondary, --color-text-tertiary
--color-border
--color-accent, --color-accent-hover, --color-accent-light
--color-status-success, --color-status-error, --color-status-warning
```

**Agent identity tokens** (for meetings.js and anywhere agents are color-coded):
```
--color-agent-thomas, --color-agent-andrei, --color-agent-robert, ...
```

**Why keep the existing pattern?** The `--color-{scale}-{step}` convention mirrors Tailwind's naming (zinc-800 = `--color-zinc-800`). This makes the Tailwind mapping self-documenting. There are ~997 `var(--color-*)` references already in `styles.css` — renaming would be churn with zero value.

**New tokens to add:** The 53 hardcoded hex values map to colors not yet in the token set. The full set of additions is:

| Hex | Token Name | Usage |
|-----|-----------|-------|
| `#ef4444` | `--color-red-500` | Destructive/danger states |
| `#dc2626` | `--color-red-600` | Danger hover state |
| `#059669` | `--color-emerald-600` | Success backgrounds |
| `#7c3aed` | `--color-violet-600` | Phase badge accent |
| `#22d3ee` | `--color-cyan-400` | Skill category accent |
| `#c084fc` | `--color-purple-400` | Skill category accent |
| `#fbbf24` | `--color-amber-400` | Skill category accent |
| `#f472b6` | `--color-pink-400` | Agent identity (Alice) |
| `#34d399` | `--color-emerald-400` | Agent identity (Jonah) |
| `#a78bfa` | `--color-violet-400` | Agent identity (Andrei) |

Robert decides whether violet keeps its current "accent" role or is deprecated. The token file includes it either way — the semantic alias `--color-accent` already points to `--color-indigo-500`, which is correct.

### 4. Agent Identity Colors: CSS Custom Properties in `tokens.css`

**Decision:** Define agent colors as `--color-agent-{name}` tokens in `tokens.css`. Reference them from `meetings.js` via `getComputedStyle`.

```css
/* tokens.css */
--color-agent-thomas: var(--color-indigo-400);   /* #818cf8 */
--color-agent-andrei: var(--color-violet-400);    /* #a78bfa */
--color-agent-robert: var(--color-purple-400);    /* #c084fc */
--color-agent-alice: var(--color-pink-400);       /* #f472b6 */
--color-agent-jonah: var(--color-emerald-400);    /* #34d399 */
--color-agent-enzo: var(--color-amber-400);       /* #fbbf24 */
--color-agent-default: var(--color-zinc-400);     /* #a1a1aa */
```

In `meetings.js`, replace the hardcoded hex values:

```javascript
function getAgentColor(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-agent-${name.toLowerCase()}`)
    .trim() || getComputedStyle(document.documentElement)
    .getPropertyValue('--color-agent-default')
    .trim();
}
```

**Why not a separate JS constants file?** CSS custom properties are the canonical source. A JS constants file would create a second source of truth that can drift. Reading from CSS keeps one master.

**Why not just use `var()` in JS?** The `meetings.js` code sets `style.color` and `style.borderColor` properties on elements dynamically. These need resolved color values, not `var()` strings. `getComputedStyle` resolves the chain.

### 5. OST Tool Integration: Extend `@theme` to Reference Shared Tokens

**Decision:** Import `tokens.css` into the OST tool's `index.css` and map CSS custom properties to Tailwind theme values via `@theme`.

```css
/* ost-tool/client/src/index.css */
@import "tailwindcss";
@import "../../../../css/tokens.css";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --color-zinc-100: var(--color-zinc-100);
  --color-zinc-200: var(--color-zinc-200);
  /* ... full zinc + indigo + status scales ... */
}
```

Wait — Tailwind CSS v4 handles this differently. In v4, `@theme` values must be static at build time because Tailwind generates utility classes from them. CSS `var()` references inside `@theme` would not resolve correctly during Tailwind's CSS generation step.

**Revised approach:** Instead of importing tokens.css into Tailwind's `@theme`, we do two things:

1. **Import `tokens.css` as a CSS layer** so the custom properties are available at runtime for any component that needs them directly (like TreeView.tsx's hardcoded hex values).
2. **Keep Tailwind's utility classes using Tailwind's built-in color values** (which are identical to our token values, since both come from the Tailwind palette).
3. **Document the mapping** in the token reference doc so maintainers know that `bg-zinc-800` in OST = `var(--color-zinc-800)` in the landing page = `#27272a`.

For the 2 hardcoded hex values in `TreeView.tsx`, replace them with CSS custom property references:

```tsx
// Before
style: { stroke: "#3f3f46" }
// After
style: { stroke: "var(--color-zinc-700)" }
```

```tsx
// Before
<Background color="#27272a" gap={20} />
// After
<Background color="var(--color-zinc-800)" gap={20} />
```

This works because these are inline style values rendered in the browser, where the CSS custom properties will be resolved at runtime. It does NOT require Tailwind to understand the variables.

**Updated `index.css`:**

```css
/* ost-tool/client/src/index.css */
@import "tailwindcss";
@import "../../../../css/tokens.css" layer(tokens);

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
}

.react-flow__attribution {
  display: none;
}
```

The `layer(tokens)` import makes all CSS custom properties available without conflicting with Tailwind's utility layer. Tailwind classes continue to work as before. Any new component that needs a non-Tailwind-utility color can use `var(--color-*)` directly.

**Why not force Tailwind to use our custom properties?** Tailwind v4's `@theme` directive generates static CSS at build time. Injecting runtime `var()` references would break class generation. The Tailwind team's recommended approach for shared design tokens is exactly what we're doing: use a shared CSS file for custom properties alongside Tailwind's built-in system, not instead of it.

### 6. PDF Tool Integration: Link External Token File

**Decision:** Replace the inline `<style>` token blocks in `pdf-splitter/index.html` and `pdf-combiner/index.html` with a `<link>` to the shared `tokens.css`.

The PDF tools currently duplicate ~20 token definitions inline. After this change:

```html
<!-- Before: ~20 lines of inline :root tokens -->
<!-- After: -->
<link rel="stylesheet" href="../css/tokens.css">
```

The inline `<style>` block retains only the tool-specific component styles (upload zone, preview cards, etc.). Token references switch from the non-prefixed names (`var(--zinc-800)`) to the canonical prefixed names (`var(--color-zinc-800)`).

**Note:** This partially amends ADR-007 (Single-File Tools Pattern). The tools are no longer fully self-contained — they depend on `../css/tokens.css`. This is the right trade-off: the cost of token drift across 3+ surfaces now exceeds the convenience of full self-containment. The tool-specific styles and markup remain in the single HTML file; only the shared tokens are externalized.

**Action:** Create ADR-008 documenting this amendment.

### 7. Shared Component Styles: What Goes in `shared.css`

**Decision:** Extract these component patterns into `css/shared.css`:

1. **Nav bar** — `.nav`, `.nav__inner`, `.nav__brand`, `.nav__logo-link`, `.nav__logo`, `.nav__back`, `.nav__back-arrow`
2. **Footer** — `.footer`, `.footer__logo`, `.footer__attribution`
3. **Container** — `.container` (max-width, horizontal padding, responsive breakpoints)
4. **Focus styles** — `a:focus-visible`, `button:focus-visible` (global accessibility pattern)

**What stays in `styles.css`:** Everything that's landing-page-specific — hero, roster cards, projects section, meetings section, docs section, tools grid, session viewer, etc.

**What stays inline in PDF tools:** Tool-specific styles (upload zone, preview grid, action buttons). The nav/footer component styles come from `shared.css`; the PDF tools remove their duplicated nav/footer CSS blocks.

`shared.css` internally depends on tokens from `tokens.css`. Since both are loaded via `<link>` tags and `tokens.css` is listed first, the cascade order is correct.

### 8. Legacy Gray Scale: Deprecate In Place

**Decision:** Move the legacy gray tokens (`--color-gray-*`) to the bottom of `tokens.css` with a deprecation comment. Do not remove them yet.

```css
/* DEPRECATED: Legacy gray scale. Use zinc equivalents instead.
   These will be removed in a future cleanup pass. */
--color-gray-50: #F8FAFC;
/* ... */
```

**Why not remove now?** The requirement says "formally deprecated (or removed)." Deprecation is safer — it avoids a search for any hidden references we might miss. A follow-up pass can grep for `--color-gray` usage and remove once confirmed zero references.

### 9. No Build Step

**Decision confirmed:** No PostCSS, no Sass, no Style Dictionary, no CSS preprocessor. Plain CSS custom properties loaded via `<link>` tags. The only build step in the entire repo remains Vite for the OST tool (which already exists).

## File Changes Summary

| File | Action |
|------|--------|
| `css/tokens.css` | **Create.** All `:root` tokens extracted from `styles.css`, plus new tokens for currently-hardcoded colors, plus agent identity tokens. |
| `css/shared.css` | **Create.** Nav, footer, container, and focus-visible component styles extracted from `styles.css`. |
| `css/styles.css` | **Modify.** Remove `:root` block (lines 1-109). Remove nav/footer/container styles (moved to `shared.css`). Replace all 53 hardcoded hex values with `var()` references. |
| `index.html` | **Modify.** Add `<link>` tags for `tokens.css` and `shared.css` before `styles.css`. |
| `js/meetings.js` | **Modify.** Replace 7 hardcoded hex colors with `getComputedStyle` reads from CSS custom properties. |
| `pdf-splitter/index.html` | **Modify.** Replace inline `:root` token block with `<link>` to `../css/tokens.css` and `../css/shared.css`. Remove duplicated nav/footer CSS. Update `var()` names to use `--color-` prefix. |
| `pdf-combiner/index.html` | **Modify.** Same as pdf-splitter. |
| `ost-tool/client/src/index.css` | **Modify.** Add `@import` for shared `tokens.css`. |
| `ost-tool/client/src/components/TreeView.tsx` | **Modify.** Replace 2 hardcoded hex values with `var()` references. |
| `docs/design-tokens-reference.md` | **Create** (by Nadia in Phase 4). Full token reference with Tailwind class mapping. |
| `docs/adrs/008-shared-tokens-file.md` | **Create.** ADR documenting the decision to externalize tokens from single-file tools. |

## Migration Strategy

### Phase 2: Landing Page (Alice)

1. Create `css/tokens.css` — copy the `:root` block from `styles.css`, add the missing color tokens from the table above, add agent identity tokens, add deprecation comment on legacy grays.
2. Create `css/shared.css` — move nav, footer, container, and focus-visible styles from `styles.css`. Verify BEM class names match.
3. Update `index.html` — add `<link>` tags for `tokens.css` and `shared.css` before the `styles.css` link.
4. Update `css/styles.css` — remove the extracted `:root` block and shared component styles. Replace all 53 hardcoded hex values with `var()` token references.
5. Update `js/meetings.js` — replace hardcoded colors with CSS custom property reads.
6. **Verification:** Open `index.html` in browser. Every page section should render identically. Check: nav, hero, tools grid, projects, meetings, docs, roster cards, how-it-works, footer. Check dynamic content (project list, meeting list) for correct agent colors.

### Phase 3: OST Tool + PDF Tools (Alice or Andrei)

7. Update `ost-tool/client/src/index.css` — add `@import` for tokens.css.
8. Update `TreeView.tsx` — replace 2 hardcoded hex values with `var()`.
9. Update `pdf-splitter/index.html` — link `tokens.css` and `shared.css`, remove inline tokens and duplicated nav/footer CSS, update `var()` names.
10. Update `pdf-combiner/index.html` — same treatment.
11. **Verification:** Launch OST tool (`npm run dev` from `ost-tool/`). Verify tree view renders correctly. Open PDF tools in browser. Verify nav, footer, and all interactive states work.

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Cascade order issue — `tokens.css` loaded after `shared.css` | Always list `tokens.css` first in HTML `<link>` order. `shared.css` depends on tokens; loading order matters. |
| PDF tools break from var name change (`--zinc-800` to `--color-zinc-800`) | Search-and-replace is mechanical. QA catches any misses. |
| `getComputedStyle` returns empty string if token not loaded | The fallback chain in the helper function returns `--color-agent-default`. Also, tokens load synchronously via `<link>` before JS executes (scripts are at end of body or deferred). |
| OST tool `@import` path is fragile (`../../../../css/tokens.css`) | Vite resolves relative imports at build time. The path is correct for the file's location in the source tree. If the directory structure changes, it breaks loudly (build error), which is the right failure mode. |

## Non-Decisions

- **Component library:** Not building one. Shared styles are just CSS classes, not framework components.
- **Theming / light mode:** Not adding. The semantic token layer (`--color-bg-primary`, etc.) already abstracts the raw values, so adding a light theme later is a `tokens.css` change, not a codebase-wide refactor.
- **Motion tokens:** Not enough usage to warrant tokenizing.
- **Automated token pipeline (Style Dictionary, etc.):** Not warranted at ~60 tokens. Revisit if token count exceeds 200 or if we add a third tech stack.
