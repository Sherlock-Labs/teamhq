# Design Token Consolidation - Requirements (Updated)

**Author:** Thomas (PM)
**Date:** 2026-02-07
**Status:** Scoped - Ready for Tech Approach
**Owner:** Alice (Front-End Developer)
**Target:** One week
**Source:** Weekly Meeting #3

---

## 1. Problem Statement

TeamHQ already has a well-structured `css/tokens.css` file (182 lines) and a `css/shared.css` file (186 lines) that were extracted in a prior pass. The token system is comprehensive: raw color scales, semantic aliases, typography, spacing, radii, and shadows. The HTML already links all three files in the correct order (`tokens.css` -> `shared.css` -> `styles.css`).

**The remaining problem:** Adoption is incomplete. Hardcoded hex values and raw `rgba()` calls still bypass the token system across multiple files. This creates maintenance risk and makes future theme changes expensive.

This sprint completes the consolidation: replace every remaining hardcoded color value with a token reference so `tokens.css` is truly the single source of truth.

## 2. Current State Audit

### 2.1 What's Already Done (Good Foundation)

- `css/tokens.css` exists with 62+ raw color tokens, 13 semantic tokens, 13 agent identity tokens, full typography/spacing/radius/shadow scales
- `css/shared.css` exists with nav, footer, container, and global focus styles -- all using token references (only 1 hardcoded rgba remaining)
- `index.html` correctly links: `tokens.css` -> `shared.css` -> `styles.css`
- ~997 `var(--` references in styles.css demonstrate strong token adoption overall

### 2.2 What Still Needs Work

| File | Hardcoded Hex | Raw rgba() | Total |
|------|:---:|:---:|:---:|
| `css/styles.css` (3,782 lines) | 9 | ~65 | ~74 |
| `css/docs.css` (570 lines) | 5 | ~8 | ~13 |
| `css/shared.css` (186 lines) | 0 | 1 | 1 |
| `js/meetings.js` | 7 | 0 | 7 |
| `ost-tool/client/src/components/TreeView.tsx` | 2 | 0 | 2 |
| `pdf-splitter/index.html` (inline CSS) | ~16 | 0 | ~16 |
| `pdf-combiner/index.html` (inline CSS) | ~19 | 0 | ~19 |
| **Total** | **~58** | **~74** | **~132** |

### 2.3 Detailed Hex Audit

**`css/styles.css` -- 9 hardcoded hex values:**

| Line | Current | Should Be |
|------|---------|-----------|
| 664 | `background: #4ade80` | `var(--color-green-400)` |
| 668 | `background: #facc15` | `var(--color-yellow-400)` |
| 672 | `background: #f87171` | `var(--color-red-400)` |
| 1225 | `background: #ef4444` | `var(--color-red-500)` |
| 1234 | `background: #dc2626` | `var(--color-red-600)` |
| 1253 | `background: #ffffff` | `var(--color-white)` or `var(--color-bg-card)` |
| 1357 | `background: #059669` | `var(--color-emerald-600)` |
| 1361 | `background: #059669` | `var(--color-emerald-600)` |
| 2025 | `background: #ffffff` | `var(--color-white)` or `var(--color-bg-card)` |

**`css/docs.css` -- 5 hardcoded hex values:**

| Line | Current | Should Be | Notes |
|------|---------|-----------|-------|
| 180 | `color: #34d399` | `var(--color-emerald-400)` | |
| 185 | `color: #c084fc` | `var(--color-purple-400)` | |
| 190 | `color: #fbbf24` | `var(--color-amber-400)` | |
| 196 | `color: #fb7185` | Needs new token or closest match | Not in tokens.css -- `--color-rose-400` is `#fb7e95`. Robert to confirm. |
| 201 | `color: #22d3ee` | `var(--color-cyan-400)` | |

**`js/meetings.js` -- 7 hardcoded hex values:**

| Line | Agent | Current | Token Equivalent |
|------|-------|---------|-----------------|
| 16 | Thomas | `#818cf8` | `--color-agent-thomas` / `--color-indigo-400` |
| 17 | Andrei | `#a78bfa` | `--color-agent-andrei` / `--color-violet-400` |
| 18 | Robert | `#c084fc` | `--color-agent-robert` / `--color-purple-400` |
| 19 | Alice | `#f472b6` | `--color-agent-alice` / `--color-pink-400` |
| 20 | Jonah | `#34d399` | `--color-agent-jonah` / `--color-emerald-400` |
| 21 | Enzo | `#fbbf24` | `--color-agent-enzo` / `--color-amber-400` |
| 251 | Default | `#a1a1aa` | `--color-agent-default` / `--color-zinc-400` |

Note: Agent identity tokens already exist in `tokens.css` (lines 112-125). The JS just needs to read them.

**`ost-tool/client/src/components/TreeView.tsx` -- 2 hardcoded hex values:**

| Line | Current | Token Equivalent |
|------|---------|-----------------|
| 47 | `stroke: "#3f3f46"` | `--color-zinc-700` |
| 223 | `color="#27272a"` | `--color-zinc-800` |

**`pdf-splitter/index.html` and `pdf-combiner/index.html`:**
- Each defines its own `:root` variables (`--zinc-*`, `--indigo-*`, `--red-*`) that duplicate values already in `tokens.css`
- Also have standalone `color: #fff` values outside the variable system
- These are self-contained single-file tools with inline `<style>` blocks

### 2.4 The rgba() Problem (The Bulk of the Work)

The biggest category is **~65 raw `rgba()` calls in `styles.css`** and **~8 in `docs.css`** that use hardcoded RGB channel values instead of token references.

**Most common patterns:**

| Pattern | Color | Count | Opacity Range |
|---------|-------|:---:|------|
| `rgba(16, 185, 129, *)` | emerald-500 / accent | ~16 | 0.03 - 0.50 |
| `rgba(0, 0, 0, *)` | black | ~20 | 0.02 - 0.50 |
| `rgba(220, 38, 38, *)` | red-600 | ~8 | 0.03 - 0.20 |
| `rgba(22, 163, 74, *)` | green-600 / status-success | ~4 | 0.06 - 0.08 |
| `rgba(202, 138, 4, *)` | warning yellow | ~4 | 0.05 - 0.15 |
| `rgba(74, 222, 128, *)` | green-400 | 2 | 0.0 - 0.4 |
| `rgba(255, 255, 255, *)` | white | ~3 | 0.02 - 0.85 |
| `rgba(129, 140, 248, *)` etc. | doc badge colors | ~8 | 0.1 |

**Why this is non-trivial:** CSS custom properties store opaque color strings. You can't do `rgba(var(--color-emerald-500), 0.15)` because the token resolves to `#10b981`, not `16, 185, 129`. There are three approaches:

1. **`color-mix(in srgb, var(--token) X%, transparent)`** -- Modern CSS, clean, no new tokens needed. Supported in all modern browsers since 2023.
2. **Opacity variant tokens** -- Define `--color-accent-15: rgba(16, 185, 129, 0.15)` etc. More tokens but simple references.
3. **RGB channel tokens** -- Define `--color-emerald-500-rgb: 16, 185, 129` alongside the hex token. Allows `rgba(var(--color-emerald-500-rgb), 0.15)`.

**Andrei needs to evaluate and recommend the approach in the tech doc.**

## 3. Scope

### In Scope

1. Replace all 9 hardcoded hex values in `css/styles.css` with token references
2. Replace all 5 hardcoded hex values in `css/docs.css` with token references
3. Replace the 1 remaining raw `rgba()` in `css/shared.css`
4. Replace 7 hardcoded hex values in `js/meetings.js` with a token-based approach
5. Tokenize all ~73 raw `rgba()` calls in `styles.css` and `docs.css` using Andrei's recommended approach
6. Replace 2 hardcoded hex values in `ost-tool/client/src/components/TreeView.tsx`
7. Decide on PDF tools strategy (link to shared tokens vs. keep self-contained)
8. Add any missing tokens to `tokens.css` (e.g., the `#fb7185` question)
9. Zero visual regressions across all pages

### Out of Scope (Deferred)

- Changing any actual color values -- this is a refactor, not a redesign
- Dark/light theme switching infrastructure
- Migrating docs page from dark zinc theme to light neutral theme
- Refactoring the OST tool's Tailwind system beyond the 2 hardcoded values
- Mobile app styles (React Native -- different paradigm)
- Building a design token documentation page (Nadia can do this as a follow-up)
- Lint rules or CI checks to prevent future hardcoded values (good idea, separate project)

## 4. Acceptance Criteria

### P0 -- Must Have (Release Gate)

1. **Zero hardcoded hex values** in `styles.css`, `docs.css`, and `shared.css` -- every color references a `tokens.css` variable
2. **Zero raw rgba() calls** in CSS files that use hardcoded RGB channel values -- all use the tokenization approach Andrei specifies
3. **Agent colors in `meetings.js`** reference CSS custom properties or a token-based JS constant
4. **Zero visual regressions** across all pages:
   - Landing page (`index.html`): hero, tools, projects, meetings, roster, how-it-works, modals, toasts, session log
   - Docs page (`docs.html`): doc list, reading view, all badge types
5. **`tokens.css` remains the single source of truth** -- no new token definitions leak into component CSS files

### P1 -- Should Have

6. OST tool `TreeView.tsx` hardcoded hex values replaced
7. PDF tools either linked to shared tokens or explicitly documented as intentionally self-contained
8. Missing token for `#fb7185` resolved (add to tokens or map to closest match)

### P2 -- Nice to Have (Defer if tight on time)

9. Systematic opacity variant tokens or `color-mix()` utility patterns documented for future use
10. Nadia writes a design token reference doc

## 5. Technical Constraints

- **No build step for landing page.** Plain HTML/CSS -- no preprocessors, no bundling.
- **OST tool uses Tailwind + React.** Token integration must work within that stack.
- **Browser support:** Modern browsers only. `color-mix()` supported since 2023.
- **Performance:** CSS custom property lookups are effectively free. No measurable impact.
- **File size:** Token consolidation should reduce or maintain CSS file sizes.

## 6. Phased Delivery

### Phase 1: Straightforward Hex Replacements (Days 1-2)
- Replace all 9 hardcoded hex values in `styles.css`
- Replace all 5 hardcoded hex values in `docs.css`
- Replace 1 hardcoded rgba in `shared.css`
- Replace 7 hardcoded hex values in `js/meetings.js`
- Resolve `#fb7185` token question with Robert

### Phase 2: rgba() Tokenization (Days 2-4)
- Implement Andrei's recommended approach for the ~73 raw `rgba()` calls
- Apply across `styles.css` (~65 instances) and `docs.css` (~8 instances)
- This is the bulk of the work and the most technically nuanced phase

### Phase 3: Peripheral Files & Cleanup (Day 4-5)
- OST tool `TreeView.tsx` (2 values)
- PDF tools decision and implementation
- Final audit pass to confirm zero hardcoded values remain
- Add any missing tokens to `tokens.css`

### Phase 4: QA & Ship (Day 5)
- Robert's design review (visual diff against current state)
- Enzo's QA pass (all pages, all components, responsive breakpoints)
- Fix any regressions found in QA

## 7. Team Assignments

| Order | Agent | Task | Blocked By |
|:---:|-------|------|:---:|
| 1 | **Thomas** (PM) | Write requirements (this doc) | -- |
| 2 | **Andrei** (Arch) | Write tech approach -- especially the `rgba()` tokenization strategy, PDF tools decision, JS agent colors approach | Thomas |
| 3 | **Robert** (Designer) | Confirm token inventory completeness (especially `#fb7185`), validate the exact token-to-value mappings, lightweight design spec | Thomas, Andrei |
| 4 | **Alice** (FE) | Implement all phases -- she owns the CSS architecture | Thomas, Andrei, Robert |
| 5 | **Robert** (Designer) | Design review -- visual diff of implementation vs. current state | Alice |
| 6 | **Enzo** (QA) | Full QA pass -- all pages, all components, responsive breakpoints, zero regressions | Robert (review) |

### Who Is NOT Needed

- **Jonah** (BE) -- No backend work
- **Kai** (AI) -- No AI integration
- **Priya** (Marketer) -- No external messaging
- **Suki/Marco** (Researchers) -- No research needed
- **Yuki** (Analyst) -- No data analysis needed
- **Nadia** (Writer) -- Could write token reference doc as follow-up, but not blocking
- **Soren** (Responsive) -- On standby if Alice finds responsive breakpoint issues
- **Nina** (Interactions) -- No animation/transition changes
- **Amara** (A11y) -- No accessibility changes

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|------------|
| `rgba()` tokenization is non-trivial | High | Medium | Andrei evaluates approaches in tech doc before Alice starts Phase 2 |
| `#fb7185` in docs.css doesn't match any existing token exactly | Low | Low | Robert confirms correct color; add to tokens or use closest match |
| PDF tools break if linked to shared tokens | Low | Medium | Test carefully or keep self-contained |
| docs.css uses zinc (dark) while landing page uses neutral (light) -- mixing contexts | Medium | Low | Both scales are in tokens.css already; document intent |
| Visual regression from rgba tokenization | Medium | High | QA release gate; Enzo does pixel-level comparison |

## 9. Open Questions

1. **`rgba()` approach:** `color-mix()` vs. opacity variant tokens vs. RGB channel tokens. Andrei to decide.
2. **`#fb7185` in docs.css:** Not in tokens.css. `--color-rose-400` is `#fb7e95`. Robert to confirm.
3. **PDF tools strategy:** Link to shared `tokens.css` or keep self-contained? Andrei to recommend.
4. **JS agent colors:** Read CSS custom properties at runtime via `getComputedStyle()`, or define a shared JS constant? Andrei to recommend.
5. **Should `shared.css` nav background `rgba(255, 255, 255, 0.85)` become a token?** It's a frosted-glass effect -- might be better as a one-off.

## 10. Success Metrics

- Zero hardcoded hex values in CSS files (excluding `tokens.css` definitions)
- Zero hardcoded hex values in JS files
- All `rgba()` patterns use token-based approach
- Zero visual regressions confirmed by QA
- `tokens.css` is the provable single source of truth for all color values
