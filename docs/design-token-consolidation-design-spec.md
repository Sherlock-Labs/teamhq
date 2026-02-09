# Design Token Consolidation - Design Spec (Phase 2: Adoption Completion)

**Author:** Robert (Product Designer)
**Date:** 2026-02-07
**Status:** Ready for Implementation
**Depends on:** [requirements](design-token-consolidation-requirements.md) (Thomas), [tech approach](design-token-consolidation-tech-approach.md) (Andrei)
**Supersedes:** Previous design spec (Phase 1 -- token extraction, now complete)

---

## 1. Summary

This spec validates Andrei's token mappings, resolves the open design questions, and provides Alice with a confirmed truth table for implementation. The guiding principle: **zero visual change.** This is a refactor, not a redesign. Every token replacement must produce the exact same rendered output as the current hardcoded value, with one small intentional exception documented below.

---

## 2. Design Decisions

### 2.1 The `#fb7185` Question -- Use Our `--color-rose-400` (`#fb7e95`)

**Decision: Map `docs.css` line 196 to `var(--color-rose-400)` (our `#fb7e95`).**

Reasoning:

1. **Our rose scale is already custom.** Our `--color-rose-400` is `#fb7e95`, our `--color-rose-500` is `#FB6182`. Neither matches Tailwind defaults. The `#fb7185` in docs.css was likely pasted from a Tailwind reference without being adjusted to our custom scale. Switching to our token makes the badge *consistent* with the rest of our rose scale, not inconsistent.

2. **Visual impact is negligible.** The difference between `#fb7185` (rgb 251, 113, 133) and `#fb7e95` (rgb 251, 126, 149) is a very slight warmth shift -- approximately 2 degrees of hue, 5% less saturation. On the dark zinc badge background at `font-size: var(--text-xs)` in uppercase, this is not perceptible under normal viewing conditions.

3. **The 10% opacity background tint is even less distinguishable.** The badge background uses `rgba(..., 0.1)` over zinc-950. The tint difference between the two RGB values at 10% opacity is invisible.

4. **One rose-400 value, everywhere.** Token system consistency is the entire point of this project. Adding a second rose-400 variant for one badge defeats the purpose.

**For Alice:** Use `color: var(--color-rose-400)` and `background: rgba(var(--color-rose-400-rgb), 0.1)` on the QA report/findings badges. The `-rgb` token value must be `251, 126, 149` (matching our hex `#fb7e95`).

**For Enzo (QA):** The QA report/findings badge is the one known intentional shift. The color moves from Tailwind standard rose-400 (`#fb7185`) to our custom rose-400 (`#fb7e95`). Do not flag this as a regression.

### 2.2 Frosted-Glass Token -- Approved

**Decision: `--color-bg-frosted` is a good semantic name.** Approved as proposed.

The frosted-glass nav is a deliberate design pattern -- semi-transparent white with backdrop blur. It belongs in the semantic token layer alongside `--color-bg-primary`, `--color-bg-secondary`, and `--color-bg-card`. If we ever adjust the opacity or swap the base color, one token change handles it.

```css
--color-bg-frosted: rgba(var(--color-white-rgb), 0.85);
```

### 2.3 RGB Channel Token Approach -- No Design Concerns

Andrei's choice of RGB channel tokens over `color-mix()` is the right call from a design perspective:

1. **Exact parity.** Every rgba() value renders identically. No risk of sRGB mixing artifacts introducing subtle hue shifts on status indicators or badge legibility.

2. **Opacity values stay as-is.** The carefully chosen opacity levels (0.03, 0.06, 0.08, 0.12, 0.15, 0.2, 0.3, 0.5) are preserved exactly. These are deliberate visual weight choices that control how much a background tint, border, or shadow "reads" against its surface.

3. **No new design vocabulary needed.** Developers continue writing `rgba(var(--token), opacity)` -- the same mental model.

---

## 3. Validated Token Mapping Reference (Truth Table)

I have cross-referenced every mapping in Andrei's tech approach (Sections 9.2-9.5) against the actual values in `tokens.css`. All mappings are confirmed correct.

### 3.1 New RGB Channel Tokens (15 tokens) -- All Verified

| Token | RGB Value | Source Hex Token | Verified |
|-------|-----------|-----------------|:---:|
| `--color-black-rgb` | `0, 0, 0` | `#000000` (implicit) | Yes |
| `--color-white-rgb` | `255, 255, 255` | `--color-white: #ffffff` | Yes |
| `--color-emerald-400-rgb` | `52, 211, 153` | `--color-emerald-400: #34d399` | Yes |
| `--color-emerald-500-rgb` | `16, 185, 129` | `--color-emerald-500: #10b981` | Yes |
| `--color-green-400-rgb` | `74, 222, 128` | `--color-green-400: #4ade80` | Yes |
| `--color-green-600-rgb` | `22, 163, 74` | `--color-status-success: #16a34a` | Yes |
| `--color-red-600-rgb` | `220, 38, 38` | `--color-red-600: #dc2626` | Yes |
| `--color-warning-rgb` | `202, 138, 4` | `--color-status-warning: #ca8a04` | Yes |
| `--color-violet-500-rgb` | `139, 92, 246` | `--color-violet-500: #8b5cf6` | Yes |
| `--color-indigo-400-rgb` | `129, 140, 248` | `--color-indigo-400: #818cf8` | Yes |
| `--color-purple-400-rgb` | `192, 132, 252` | `--color-purple-400: #c084fc` | Yes |
| `--color-amber-400-rgb` | `251, 191, 36` | `--color-amber-400: #fbbf24` | Yes |
| `--color-rose-400-rgb` | `251, 126, 149` | `--color-rose-400: #fb7e95` | Yes |
| `--color-cyan-400-rgb` | `34, 211, 238` | `--color-cyan-400: #22d3ee` | Yes |
| `--color-zinc-400-rgb` | `161, 161, 170` | `--color-zinc-400: #a1a1aa` | Yes |

**Completeness check:** I grepped every unique `rgba(R, G, B, ...)` tuple in `styles.css` (7 unique colors, ~58 instances) and `docs.css` (8 unique colors, 8 instances). All are covered by these 15 tokens. No missing colors.

### 3.2 New Semantic Token (1 token) -- Verified

| Token | Value | Replaces |
|-------|-------|----------|
| `--color-bg-frosted` | `rgba(var(--color-white-rgb), 0.85)` | `shared.css` line 49: `rgba(255, 255, 255, 0.85)` |

### 3.3 Updated Semantic Tokens (3 tokens) -- Verified

| Token | Before | After | Visual Change |
|-------|--------|-------|:---:|
| `--color-accent-light` | `rgba(16, 185, 129, 0.06)` | `rgba(var(--color-emerald-500-rgb), 0.06)` | None |
| `--color-border` | `rgba(0, 0, 0, 0.06)` | `rgba(var(--color-black-rgb), 0.06)` | None |
| `--color-border-strong` | `rgba(0, 0, 0, 0.12)` | `rgba(var(--color-black-rgb), 0.12)` | None |

### 3.4 Updated Shadow Tokens (6 tokens) -- Verified

All replace `rgba(0, 0, 0, X)` with `rgba(var(--color-black-rgb), X)`. Opacity values unchanged. No visual change.

| Token | Verified |
|-------|:---:|
| `--shadow-sm` | Yes |
| `--shadow-md` | Yes |
| `--shadow-lg` | Yes |
| `--shadow-card` | Yes |
| `--shadow-card-hover` | Yes |
| `--shadow-ring` | Yes |

### 3.5 `styles.css` Hex Replacements (9 values) -- All Confirmed Exact Match

| Line | Current | Replacement | Match |
|------|---------|-------------|:---:|
| 664 | `#4ade80` | `var(--color-green-400)` | Exact |
| 668 | `#facc15` | `var(--color-yellow-400)` | Exact |
| 672 | `#f87171` | `var(--color-red-400)` | Exact |
| 1225 | `#ef4444` | `var(--color-red-500)` | Exact |
| 1234 | `#dc2626` | `var(--color-red-600)` | Exact |
| 1253 | `#ffffff` | `var(--color-white)` | Exact |
| 1357 | `#059669` | `var(--color-emerald-600)` | Exact |
| 1361 | `#059669` | `var(--color-emerald-600)` | Exact |
| 2025 | `#ffffff` | `var(--color-white)` | Exact |

### 3.6 `docs.css` Hex Replacements (5 values) -- All Confirmed

| Line | Current | Replacement | Match |
|------|---------|-------------|:---:|
| 180 | `#34d399` | `var(--color-emerald-400)` | Exact |
| 185 | `#c084fc` | `var(--color-purple-400)` | Exact |
| 190 | `#fbbf24` | `var(--color-amber-400)` | Exact |
| 196 | `#fb7185` | `var(--color-rose-400)` | **Intentional shift** (see Section 2.1) |
| 201 | `#22d3ee` | `var(--color-cyan-400)` | Exact |

### 3.7 `docs.css` rgba() Replacements (8 values) -- All Confirmed

| Line | Find | Replace With | Notes |
|------|------|-------------|-------|
| 158 | `rgba(255, 255, 255, 0.02)` | `rgba(var(--color-white-rgb), 0.02)` | Exact |
| 176 | `rgba(129, 140, 248, 0.1)` | `rgba(var(--color-indigo-400-rgb), 0.1)` | Exact |
| 181 | `rgba(52, 211, 153, 0.1)` | `rgba(var(--color-emerald-400-rgb), 0.1)` | Exact |
| 186 | `rgba(192, 132, 252, 0.1)` | `rgba(var(--color-purple-400-rgb), 0.1)` | Exact |
| 191 | `rgba(251, 191, 36, 0.1)` | `rgba(var(--color-amber-400-rgb), 0.1)` | Exact |
| 197 | `rgba(251, 113, 133, 0.1)` | `rgba(var(--color-rose-400-rgb), 0.1)` | **Intentional shift** -- RGB changes from `251,113,133` to `251,126,149` |
| 202 | `rgba(34, 211, 238, 0.1)` | `rgba(var(--color-cyan-400-rgb), 0.1)` | Exact |
| 208 | `rgba(161, 161, 170, 0.1)` | `rgba(var(--color-zinc-400-rgb), 0.1)` | Exact |

### 3.8 `styles.css` rgba() Bulk Replacements (~65 values) -- All Confirmed

| Find | Replace With | Approx Count | Verified |
|------|-------------|:---:|:---:|
| `rgba(16, 185, 129,` | `rgba(var(--color-emerald-500-rgb),` | ~16 | Yes |
| `rgba(0, 0, 0,` | `rgba(var(--color-black-rgb),` | ~20 | Yes |
| `rgba(220, 38, 38,` | `rgba(var(--color-red-600-rgb),` | ~8 | Yes |
| `rgba(22, 163, 74,` | `rgba(var(--color-green-600-rgb),` | ~4 | Yes |
| `rgba(202, 138, 4,` | `rgba(var(--color-warning-rgb),` | ~4 | Yes |
| `rgba(74, 222, 128,` | `rgba(var(--color-green-400-rgb),` | 2 | Yes |
| `rgba(255, 255, 255,` | `rgba(var(--color-white-rgb),` | ~3 | Yes |
| `rgba(139, 92, 246,` | `rgba(var(--color-violet-500-rgb),` | ~1 | Yes |

---

## 4. Visual Areas Requiring Extra Attention

### 4.1 High Sensitivity -- Check Carefully

| Area | File | Why | What to Verify |
|------|------|-----|----------------|
| **Status indicator dots** | styles.css lines 663-672 | Small colored dots where green/yellow/red must remain clearly distinct | Completed = green, In-progress = yellow, Blocked = red |
| **Doc type badges** | docs.css lines 174-209 | Color-coded badges on dark zinc; each must remain visually distinct from neighbors | All 7 badge types: requirements, tech-approach, design-spec, research, qa-report, backend-analysis, adr |
| **QA report/findings badge** | docs.css lines 194-198 | The one intentional color shift | Text and background tint both shift slightly warmer; must still read as "rose/pink" and stay distinct from purple |
| **Delete/destructive buttons** | styles.css lines 1225, 1234 | Red-500 and red-600 backgrounds must maintain "danger" visual weight | Delete confirm button default and hover states |
| **Emerald accent** | ~16 places in styles.css | Primary accent color in focus rings, hover states, selected cards, success states | Active nav items, selected cards, form focus rings |

### 4.2 Medium Sensitivity -- Spot Check

| Area | File | Notes |
|------|------|-------|
| Modal backdrop | styles.css line 936 | `rgba(0,0,0,0.5)` -- 50% black overlay |
| Warning banner | styles.css lines 1489-1490 | Amber background and border |
| Shadow tokens | tokens.css lines 176-181 | All six updated; verify card hover depth |
| Frosted nav | shared.css line 49 | New `--color-bg-frosted` token; verify translucent white + blur |
| Meeting transcript colors | meetings.js | Agent avatar borders and speaker names via `getComputedStyle()` |

### 4.3 Low Sensitivity -- Regression Test Sufficient

| Area | Notes |
|------|-------|
| Subtle background tints (`rgba(..., 0.02-0.04)`) | Nearly invisible on surfaces; token replacement won't produce visible change |
| White hex replacements (lines 1253, 2025) | `#ffffff` to `var(--color-white)` -- identical value |
| PDF tools | Comment-only changes; no visual impact |

---

## 5. Sensitive Color Areas Reference

### 5.1 Agent Identity Colors

Already fully tokenized in `tokens.css` (lines 112-125). The `meetings.js` migration reads these at runtime via `getComputedStyle()`. No color values change -- only the source moves from hardcoded JS hex to CSS tokens.

| Agent Token | Raw Token | Hex | Used In |
|-------------|-----------|-----|---------|
| `--color-agent-thomas` | `--color-indigo-400` | `#818cf8` | meetings.js, roster |
| `--color-agent-andrei` | `--color-violet-400` | `#a78bfa` | meetings.js, roster |
| `--color-agent-robert` | `--color-purple-400` | `#c084fc` | meetings.js, roster |
| `--color-agent-alice` | `--color-pink-400` | `#f472b6` | meetings.js, roster |
| `--color-agent-jonah` | `--color-emerald-400` | `#34d399` | meetings.js, roster |
| `--color-agent-enzo` | `--color-amber-400` | `#fbbf24` | meetings.js, roster |
| `--color-agent-default` | `--color-neutral-400` | `#a3a3a3` | meetings.js fallback |

### 5.2 Status Indicators

Status colors appear as both solid fills and tinted backgrounds. Both must remain visually consistent after migration:

| Status | Solid Token | Tinted Range |
|--------|------------|--------------|
| Success | `--color-green-400`, `--color-emerald-600` | `rgba(emerald-500-rgb, 0.03-0.12)`, `rgba(green-600-rgb, 0.06-0.08)` |
| Error | `--color-red-400`, `--color-red-500`, `--color-red-600` | `rgba(red-600-rgb, 0.03-0.2)` |
| Warning | `--color-yellow-400` | `rgba(warning-rgb, 0.05-0.15)` |

### 5.3 Doc Badge Colors (Dark Theme Context)

The docs page runs on zinc-950 dark theme. Each badge must remain visually distinct from neighbors:

| Badge | Text Token | BG Pattern | Adjacent Distinction |
|-------|-----------|------------|---------------------|
| Requirements | `--color-indigo-400` | `rgba(indigo-400-rgb, 0.1)` | Cool blue vs warm purple |
| Tech Approach | `--color-emerald-400` | `rgba(emerald-400-rgb, 0.1)` | Only green |
| Design Spec | `--color-purple-400` | `rgba(purple-400-rgb, 0.1)` | Warmer purple vs cool indigo |
| Research | `--color-amber-400` | `rgba(amber-400-rgb, 0.1)` | Only warm yellow |
| QA Report/Findings | `--color-rose-400` | `rgba(rose-400-rgb, 0.1)` | Pink vs purple (must stay distinct) |
| Backend Analysis | `--color-cyan-400` | `rgba(cyan-400-rgb, 0.1)` | Only cool blue-green |
| ADR/Other | `--color-zinc-400` | `rgba(zinc-400-rgb, 0.1)` | Neutral gray -- intentionally muted |

---

## 6. Implementation Notes for Alice

1. **Order matters.** Follow Andrei's Phase 1-5 order. Add RGB channel tokens to `tokens.css` first -- everything depends on them.

2. **The rose-400 shift is intentional.** When replacing `#fb7185` and `rgba(251, 113, 133, 0.1)` in docs.css, use our `--color-rose-400` and `--color-rose-400-rgb` tokens. Do not create a separate token for `#fb7185`.

3. **Verify after each phase.** Open both the landing page and docs page after each phase. Token additions (Phase 1) and hex replacements (Phase 2) are zero-risk. The rgba bulk replacement (Phase 3) is highest risk -- check all pages carefully.

4. **Shadow token updates are inside `tokens.css` itself.** Lines 176-181 use raw `rgba(0, 0, 0, ...)`. These must also be updated to use `--color-black-rgb`. Don't miss these.

5. **The frosted-glass token goes in the Backgrounds section.** Place `--color-bg-frosted` after `--color-bg-card` (line 89).

---

## 7. QA Guidance for Enzo

1. **One known intentional change:** QA report/findings badge color shifts from `#fb7185` to `#fb7e95` (our `--color-rose-400`). This is approved by design. Do not flag as regression.

2. **Everything else must be pixel-identical.** All other replacements are exact value matches.

3. **Priority test areas:**
   - Landing page: hero gradient, project cards, status dots, active nav, modals, toast notifications, session log panel
   - Docs page: all 7 doc badge types, doc reading view, hover states
   - Meetings page: agent avatar borders, speaker name colors, transcript rendering

4. **Responsive:** Token changes are value-preserving, so responsive behavior should be unaffected. Quick check at mobile/tablet/desktop widths is sufficient.

5. **Shadows:** All six shadow tokens updated. Verify card hover states show same depth.
