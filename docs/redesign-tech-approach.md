# TeamHQ Visual Redesign — Technical Approach (Phase 1)

**Author:** Andrei (Technical Architect)
**Date:** 2025-02-07
**Status:** Draft
**Depends on:** `docs/redesign-requirements.md` (Thomas)

---

## 1. Executive Summary

Phase 1 converts TeamHQ's landing page from dark-first (zinc-950) to a premium light-first design with a pink/rose accent (#FB6182), Geist typography, layered shadows, and thin ring borders. The migration is CSS-first: updating tokens.css cascades through shared.css and styles.css. The key risks are hardcoded color values (60+ instances in styles.css alone) and the SVG logo that uses light-on-dark colors.

---

## 2. Decisions & Rationale

### D1: Font Loading — Google Fonts CDN
Geist Sans and Geist Mono are both available on Google Fonts. We will load them from Google Fonts CDN, matching our current approach with Inter.

**Rationale:** No self-hosting overhead, the CDN is already connected (preconnect hints are in place), and Thomas's requirements explicitly defer self-hosting to a later phase.

**Change in `index.html` and `docs.html`:**
```html
<!-- Replace Inter import with Geist -->
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### D2: Token Architecture — Semantic-First, Accent Scale as New Raw Tokens
Replace the indigo raw scale with a rose/pink scale. Add new semantic tokens for surfaces, shadows, and rings. Keep agent identity colors unchanged.

**Rationale:** The current token system (`tokens.css`, 164 lines) is already well-structured with raw and semantic layers. We extend it rather than rewrite it. The new accent color (#FB6182) needs a proper scale for hover, active, light tint, and focus ring states.

### D3: No HTML Structure Changes
Zero HTML changes. The entire Phase 1 migration is CSS-only (plus the font link swap in `<head>`).

**Rationale:** Thomas's requirements are explicit: "No HTML structure changes unless absolutely necessary." The atmospheric gradient in the hero section will be achieved with CSS pseudo-elements (`.hero::before`), not new DOM nodes. All card hover effects (translate-y, shadow elevation) are pure CSS.

### D4: Migration Strategy — Token Swap Then Hardcode Sweep
1. Update `tokens.css` semantic values (dark-to-light swap)
2. Update `tokens.css` raw scales (replace indigo with rose/pink, add slate/neutral scale for light mode)
3. Fix all hardcoded color values in `styles.css` that bypass tokens
4. Fix shared.css nav/footer raw zinc references
5. Verify docs page renders correctly via shared.css cascade

**Rationale:** Token swap first gets ~60% of the page right immediately. The hardcode sweep is the tedious but essential second pass. Doing them in this order means Alice can see progress quickly and catch regressions early.

### D5: Logo — Needs a Light-Mode Variant
The current `img/sherlock-labs-logo.svg` has:
- **Wordmark "Sherlock":** `fill="#f4f4f5"` (zinc-100, nearly white) — invisible on white background
- **Cursor bar:** `fill="#f4f4f5"` with 0.85 opacity — invisible on white background
- **"Labs" text:** `fill="#6366F1"` (indigo) — needs to change to new accent
- **Gradient:** Indigo-to-violet — needs to change to rose/pink

**Approach:** Robert should spec a light-mode variant of the logo. Alice will update the SVG file. Two paths:
- Option A: Single SVG that works on both (dark wordmark fill, rose accent). This is preferred for simplicity since we're light-only in Phase 1.
- Option B: Two SVG files with a CSS `prefers-color-scheme` media query. Overkill for Phase 1 since dark mode is deferred.

**Recommendation:** Option A. Change `fill="#f4f4f5"` to a dark color (~`#1a1a2e`), change the gradient to rose tones. Single file, no conditional logic.

### D6: Accent Color Scale — Rose/Pink
The CEO chose #FB6182 as the accent. We need a full scale for the token system:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-rose-50` | `#fff1f3` | Subtle tinted backgrounds, accent-light |
| `--color-rose-100` | `#ffe0e5` | Badge backgrounds, hover tints |
| `--color-rose-200` | `#ffc9d2` | Light borders |
| `--color-rose-300` | `#ffa3b3` | Secondary interactive |
| `--color-rose-400` | `#fb7e95` | Hover state (accent-hover) |
| `--color-rose-500` | `#FB6182` | Primary accent (buttons, links, focus rings) |
| `--color-rose-600` | `#e84d6d` | Active/pressed state |
| `--color-rose-700` | `#c93d5a` | Deep accent |

Robert should finalize these exact values in the design spec. The above are starting points based on the #FB6182 anchor.

### D7: Button Color Strategy — White Text on Accent
Primary buttons (New Project, Submit, Copy, Run Meeting, Start Work) currently use `background: var(--color-indigo-500); color: white`. The new pattern is `background: var(--color-rose-500); color: white`.

**Contrast check:** #FB6182 on white background has a contrast ratio of ~3.5:1 for the button surface itself (but text is white-on-rose, which is ~4.7:1 — passes AA for large text/UI components). Robert should verify the exact contrast and may need to use rose-600 for body-size text links if AA requires 4.5:1.

---

## 3. Token Architecture — Complete Specification

### 3.1 New Raw Color Scales

Add these to `tokens.css` (replace indigo scale, add neutral light scale):

```css
/* Rose/Pink — Brand Accent (replaces Indigo as primary) */
--color-rose-50: #fff1f3;
--color-rose-100: #ffe0e5;
--color-rose-200: #ffc9d2;
--color-rose-300: #ffa3b3;
--color-rose-400: #fb7e95;
--color-rose-500: #FB6182;
--color-rose-600: #e84d6d;
--color-rose-700: #c93d5a;

/* Neutral (light-mode surfaces) */
--color-neutral-50: #fafafa;
--color-neutral-100: #f5f5f5;
--color-neutral-200: #e5e5e5;
--color-neutral-300: #d4d4d4;
--color-neutral-400: #a3a3a3;
--color-neutral-500: #737373;
--color-neutral-600: #525252;
--color-neutral-700: #404040;
--color-neutral-800: #262626;
--color-neutral-900: #171717;
--color-neutral-950: #0a0a0a;
```

### 3.2 Semantic Token Remapping

```css
/* Backgrounds */
--color-bg-primary: #ffffff;
--color-bg-secondary: var(--color-neutral-50);   /* #fafafa */
--color-bg-card: #ffffff;

/* Text */
--color-text-primary: var(--color-neutral-900);   /* #171717 — dark headings */
--color-text-secondary: var(--color-neutral-500);  /* #737373 — body text */
--color-text-tertiary: var(--color-neutral-400);   /* #a3a3a3 — captions, dates */

/* Interactive (Rose replaces Indigo) */
--color-accent: var(--color-rose-500);             /* #FB6182 */
--color-accent-hover: var(--color-rose-400);       /* #fb7e95 */
--color-accent-light: rgba(251, 97, 130, 0.08);   /* Rose tint bg */

/* Borders — thin ring style */
--color-border: rgba(0, 0, 0, 0.06);

/* Status (unchanged values, but verify contrast on white) */
--color-status-success: #16a34a;   /* green-600, darker for light bg */
--color-status-error: #dc2626;     /* red-600, darker for light bg */
--color-status-warning: #ca8a04;   /* yellow-600, darker for light bg */
```

**Key change for status colors:** On a dark background, we used green-400/red-400/yellow-400 because light-toned colors pop on dark. On white, those same colors have poor contrast. We shift to the -600 variants for text, keeping the -400 variants for small indicators (dots) where contrast rules are more lenient.

### 3.3 New Shadow Tokens

The current shadows are fine for light mode but we need card-specific tokens:

```css
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
--shadow-card-hover: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -4px rgba(0, 0, 0, 0.03);
--shadow-ring: 0 0 0 1px rgba(0, 0, 0, 0.06);
```

### 3.4 New Border Token

```css
--color-border-strong: rgba(0, 0, 0, 0.12);  /* heavier border for table headers, dividers */
```

### 3.5 Typography Tokens

```css
--font-family: "Geist", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

### 3.6 Agent Identity Colors — No Changes

The 12 agent identity colors (`--color-agent-thomas` through `--color-agent-kai`) remain unchanged. They are vivid accent colors that work well on both dark and light backgrounds.

### 3.7 Deprecated Tokens — Remove

Remove the deprecated legacy gray scale (`--color-gray-*`) at the bottom of tokens.css. This cleanup is long overdue and prevents accidental usage.

---

## 4. Hardcoded Color Audit

These are every hardcoded color value in `styles.css` that bypasses the token system. Each must be converted to either a token reference or a new semantic rgba value appropriate for the light theme.

### 4.1 Status Dot Colors (inline hex)
| Line | Current | Replacement |
|------|---------|-------------|
| 582 | `background: #4ade80` (completed) | `background: var(--color-status-success)` |
| 586 | `background: #facc15` (in-progress) | `background: var(--color-status-warning)` |
| 590 | `background: #f87171` (blocked) | `background: var(--color-status-error)` |

### 4.2 Error/Destructive Colors
| Line | Current | Replacement |
|------|---------|-------------|
| 775, 942, 1055, 1196, 1599 | `color: #f87171` | `color: var(--color-status-error)` |
| 776, 1186, 2463 | `border-color: rgba(248,113,113,0.3)` | `border-color: rgba(220, 38, 38, 0.2)` (red-600 based) |
| 777, 2464, 3231 | `background: rgba(248,113,113,0.1)` | `background: rgba(220, 38, 38, 0.06)` |
| 1063 | `border-color: #f87171` | `border-color: var(--color-status-error)` |
| 1069 | `box-shadow: rgba(248,113,113,0.15)` | `box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12)` |
| 1142 | `background: #ef4444` (delete btn) | `background: var(--color-red-500)` |
| 1151 | `background: #dc2626` (delete hover) | `background: var(--color-red-600)` |
| 2154 | `background: rgba(248,113,113,0.05)` | `background: rgba(220, 38, 38, 0.04)` |

### 4.3 Warning Colors
| Line | Current | Replacement |
|------|---------|-------------|
| 439, 1415 | `color: #facc15` | `color: var(--color-status-warning)` |
| 1405 | `background: rgba(250,204,21,0.06)` | `background: rgba(202, 138, 4, 0.06)` |
| 1406 | `border: rgba(250,204,21,0.2)` | `border: 1px solid rgba(202, 138, 4, 0.15)` |

### 4.4 Success Colors
| Line | Current | Replacement |
|------|---------|-------------|
| 1273, 1277 | `background: #059669` (copy confirmed) | `background: var(--color-emerald-600)` |

### 4.5 Indigo/Accent Colors (must become rose)
| Line | Current | Replacement |
|------|---------|-------------|
| 964, 1516 | `box-shadow: rgba(99,102,241,0.15)` | `box-shadow: 0 0 0 3px rgba(251, 97, 130, 0.15)` |
| 1998, 2173 | `background: rgba(99,102,241,0.04-0.06)` | `background: rgba(251, 97, 130, 0.04)` |
| 2543 | `box-shadow: rgba(99,102,241,0.25)` | `box-shadow: 0 0 0 3px rgba(251, 97, 130, 0.25)` |
| 3106 | `background: #7c3aed` (weekly btn hover) | `background: var(--color-violet-600)` (keep violet for weekly distinction) |
| 3208, 3434 | `background: rgba(99,102,241,0.1)` | `background: var(--color-accent-light)` |
| 3294, 3501 | `border-color: rgba(99,102,241,0.3)` | `border-color: rgba(251, 97, 130, 0.3)` |
| 3404, 3503 | `background: rgba(99,102,241,0.04-0.08)` | `background: rgba(251, 97, 130, 0.06)` |
| 3511, 3512 | `rgba(129,140,248,0.18-0.5)` | `rgba(251, 97, 130, 0.18-0.5)` |

### 4.6 Hover/Surface Colors (dark-theme specific)
| Line | Current | Replacement |
|------|---------|-------------|
| 524, 1557, 2910, 3452 | `rgba(255,255,255,0.02)` | `rgba(0, 0, 0, 0.02)` (dark tint on white) |
| 1883 | `rgba(24,24,27,0.5)` (session log header bg) | `rgba(0, 0, 0, 0.02)` |
| 2107 | `rgba(9,9,11,0.5)` (result output bg) | `var(--color-neutral-50)` |
| 2280, 2607, 2757 | `rgba(63,63,70,0.15-0.4)` | `rgba(0, 0, 0, 0.04)` |
| 3583 | `border: rgba(63,63,70,0.3)` | `border: 1px solid var(--color-border)` |

### 4.7 Badge Background Colors (rgba tints)
| Line | Current | Replacement |
|------|---------|-------------|
| 200, 435 | `rgba(74,222,128,0.1)` (green badge) | `rgba(22, 163, 74, 0.08)` |
| 205, 445, 3478 | `rgba(161,161,170,0.1)` (gray badge) | `rgba(0, 0, 0, 0.04)` |
| 440, 3473 | `rgba(250,204,21,0.1)` | `rgba(202, 138, 4, 0.08)` |
| 3468 | `rgba(248,113,113,0.1)` | `rgba(220, 38, 38, 0.06)` |

### 4.8 Animation Colors
| Line | Current | Replacement |
|------|---------|-------------|
| 1856-1857 | `rgba(74,222,128,0.4/0)` (indicator pulse) | `rgba(22, 163, 74, 0.4/0)` |

### 4.9 Zinc Raw References (should use semantic tokens)
There are approximately **120+ instances** of `var(--color-zinc-*)` in `styles.css` and `shared.css` that reference the raw zinc scale directly instead of semantic tokens. On the dark theme these were fine because zinc was the neutral. On the light theme, these all need to flip.

The most impactful ones:
- `color: var(--color-zinc-100)` / `var(--color-zinc-200)` (headings) -> `var(--color-text-primary)` or `var(--color-neutral-900)`
- `color: var(--color-zinc-300)` (body text) -> `var(--color-text-primary)` or `var(--color-neutral-800)`
- `color: var(--color-zinc-400)` (secondary text) -> `var(--color-text-secondary)`
- `color: var(--color-zinc-600)` (tertiary text) -> `var(--color-text-tertiary)`
- `background: var(--color-zinc-800)` (code blocks, inputs) -> `var(--color-neutral-100)`
- `background: var(--color-zinc-900)` (modal bg) -> `var(--color-bg-card)` (now white)
- `background: var(--color-zinc-950)` (deep bg) -> `var(--color-bg-primary)` or `var(--color-neutral-50)`
- `border-color: var(--color-zinc-700)` (hover borders) -> `rgba(0, 0, 0, 0.1)`
- `border-color: var(--color-zinc-800)` (default borders) -> `var(--color-border)`

**Strategy for Alice:** Don't do a blind search-and-replace of `--color-zinc-*`. Instead, work component by component. Each zinc reference has a semantic intent (heading, body text, border, background, hover state) that maps to a different light-mode token. The mapping table:

| Dark Theme Zinc | Intent | Light Mode Replacement |
|----------------|--------|----------------------|
| `zinc-100` / `zinc-200` | Headings, strong text | `--color-neutral-900` / `--color-text-primary` |
| `zinc-300` | Body text, readable text | `--color-neutral-800` |
| `zinc-400` | Secondary text, labels | `--color-text-secondary` / `--color-neutral-500` |
| `zinc-500` | De-emphasized text | `--color-neutral-500` |
| `zinc-600` | Tertiary, captions | `--color-text-tertiary` / `--color-neutral-400` |
| `zinc-700` | Hover borders, dividers | `rgba(0, 0, 0, 0.1)` or `--color-border-strong` |
| `zinc-800` | Default borders, code bg | `var(--color-border)` / `var(--color-neutral-100)` |
| `zinc-900` | Card backgrounds, modal bg | `var(--color-bg-card)` (white) |
| `zinc-950` | Deep backgrounds | `var(--color-bg-primary)` (white) / `var(--color-neutral-50)` |

---

## 5. Shared CSS Impact Analysis

### 5.1 shared.css — Navigation

The `.nav` component has **8 raw zinc references** that must change:

| Property | Current | New |
|----------|---------|-----|
| `.nav` background | `var(--color-zinc-950)` | `rgba(255, 255, 255, 0.85)` |
| `.nav` border-bottom | `var(--color-zinc-800)` | `var(--color-border)` |
| `.nav` backdrop-filter | (none) | `backdrop-filter: blur(12px)` |
| `.nav__title` color | `var(--color-zinc-100)` | `var(--color-neutral-900)` |
| `.nav__label` color | `var(--color-zinc-400)` | `var(--color-text-secondary)` |
| `.nav__link` color | `var(--color-zinc-400)` | `var(--color-neutral-500)` |
| `.nav__link:hover` | `var(--color-zinc-300)` | `var(--color-neutral-900)` |
| `.nav__link--active` | `var(--color-zinc-200)` | `var(--color-neutral-900)` |
| `.nav__back` color | `var(--color-zinc-400)` | `var(--color-neutral-500)` |
| `.nav__back:hover` | `var(--color-zinc-200)` | `var(--color-neutral-900)` |

The backdrop-blur glass effect is a new property that needs to be added. This is the only CSS-level "new feature" — no HTML changes.

### 5.2 shared.css — Footer

| Property | Current | New |
|----------|---------|-----|
| `.footer` background | `var(--color-zinc-900)` | `var(--color-neutral-50)` |
| `.footer` border-top | `var(--color-zinc-800)` | `var(--color-border)` |
| `.footer__name` color | `var(--color-zinc-100)` | `var(--color-neutral-900)` |
| `.footer__attribution` | `var(--color-zinc-600)` | `var(--color-text-tertiary)` |

### 5.3 Cascade Effect on docs.html

Since `docs.html` imports `tokens.css` + `shared.css` + `docs.css`, updating tokens.css and shared.css will automatically propagate the light nav, footer, and base styles to the docs page. The docs.css file is Phase 2 scope, but the shared components will already look correct.

**Risk:** docs.css has its own zinc references for card bodies, text, code blocks, badges, and table styling. With Phase 1 token changes, the docs page will have a light nav/footer but a partially-broken content area (dark-theme zinc colors on light backgrounds). This is acceptable for Phase 1 since docs is Phase 2 scope. If it looks too broken, we can do a quick pass on the most jarring issues.

---

## 6. JavaScript Hardcoded Colors

`js/meetings.js` has **7 hardcoded agent color hex values** (lines 16-21, 251) used for transcript speaker names and avatar borders. These are agent identity colors applied inline via `style=` attributes:

```js
'Thomas': { color: '#818cf8' },  // indigo-400
'Andrei': { color: '#a78bfa' },  // violet-400
// etc.
```

These colors are applied at render time via inline styles. They work on both light and dark backgrounds since they're vivid accent colors. **No changes needed for Phase 1.** These are the same agent identity colors defined in tokens.css.

`js/projects.js` does **not** contain hardcoded colors — verified by grep.

---

## 7. Card Interaction Pattern

All cards (tool, project, meeting, agent) will follow this unified pattern:

```css
.card {
  background: var(--color-bg-card);       /* white */
  border: 1px solid var(--color-border);  /* rgba(0,0,0,0.06) */
  border-radius: var(--radius-lg);        /* 12px */
  box-shadow: var(--shadow-card);         /* subtle resting shadow */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);   /* elevated shadow */
}
```

This replaces the current pattern of `border-color: var(--color-zinc-700)` on hover.

**Performance note:** `transform` is GPU-accelerated. No `will-change` needed unless we see jank. Shadow transitions are composited by the browser. Should be smooth.

---

## 8. Focus Ring Strategy

The current focus ring is `outline: 2px solid var(--color-accent)`. Since `--color-accent` changes from indigo to rose, this automatically updates. No additional work needed.

For input focus states, the `box-shadow` ring approach (`0 0 0 3px rgba(accent, 0.15)`) also automatically updates since we're replacing the hardcoded indigo rgba values with rose equivalents (see section 4.5).

---

## 9. Migration Order for Alice

This is the recommended implementation sequence:

### Step 1: Font swap
- Update `<link>` in `index.html` and `docs.html` to load Geist from Google Fonts
- Update `--font-family` and `--font-mono` tokens

### Step 2: Token overhaul (`tokens.css`)
- Add rose/pink raw scale
- Add neutral raw scale
- Remap all semantic tokens (bg, text, accent, border, status, shadows)
- Remove deprecated gray scale
- Keep indigo raw tokens (still used by meeting badges, pipeline indicators)
- Keep violet raw tokens (weekly meeting distinction)

### Step 3: Shared components (`shared.css`)
- Nav: light bg, backdrop-blur, dark text, updated border
- Footer: light bg, updated text colors

### Step 4: Landing page components (`styles.css`)
- Work section by section, top to bottom
- Hero -> Tools -> Projects -> Modals -> Toasts -> Kickoff -> Meetings -> Roster -> How It Works -> Sessions
- Replace raw zinc refs with semantic tokens or light-appropriate values
- Replace all hardcoded hex/rgba values (use section 4 audit)

### Step 5: Logo
- Update `img/sherlock-labs-logo.svg` fills for light background

### Step 6: Visual smoke test
- Check every section on the landing page
- Check nav/footer on docs.html
- Check all interactive states (hover, focus, active)
- Check modals, toasts, session log
- Verify badge/status color contrast on white

---

## 10. Phase 1 vs Phase 2 Boundary

### Phase 1 (this scope):
- `css/tokens.css` — full overhaul
- `css/shared.css` — nav and footer light-mode conversion
- `css/styles.css` — full landing page light-mode conversion
- `index.html` — font link swap only
- `docs.html` — font link swap only (page gets light nav/footer automatically)
- `img/sherlock-labs-logo.svg` — light-mode variant

### Phase 2 (deferred):
- `css/docs.css` — doc content styling for light mode
- `pdf-splitter/index.html` — inline style update
- `pdf-combiner/index.html` — inline style update
- `ost-tool/client/` — Tailwind class migration (all 6 components + App.tsx + index.css)
- Dark mode toggle (CSS custom properties make this straightforward when we're ready)

---

## 11. Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Hardcoded colors missed | Medium | Section 4 audit is comprehensive. Alice should also do a grep for `#[0-9a-f]` and `rgba(` after implementation to catch any stragglers. |
| Status badge contrast failure | Medium | Status colors shift from -400 to -600 for text. Small indicator dots (8px) can stay -400. Robert to verify exact values in design spec. |
| Logo illegible on white | Certain | Already identified — requires SVG fill changes (see D5). |
| Docs page looks broken | Low-Medium | Nav/footer will update correctly. Content area will have mixed dark-on-light issues until Phase 2. Acceptable since docs is explicitly Phase 2. |
| Geist font not loading | Low | Google Fonts CDN is highly reliable. Fallback stack (system-ui, -apple-system) is solid. |
| Performance regression from shadows | Low | Shadows are paint-only, no layout cost. `transform: translateY(-2px)` is composited. No JS involvement. |

---

## 12. What Robert (Designer) Needs from This Doc

For the design spec, Robert should define:
1. **Exact rose/pink scale values** — I've proposed a scale in D6, but Robert should finalize based on visual judgment
2. **Status color values for light mode** — confirm green-600/red-600/yellow-600 or specify alternates
3. **Shadow exact values** — I've proposed card shadows, Robert should tune to match the suga.app/tavus.io aesthetic
4. **Hero atmospheric gradient** — CSS gradient direction, colors, blur radius
5. **Logo colors** — exact fill values for the light-mode SVG variant
6. **Card hover elevation** — confirm translateY(-2px) and shadow values
7. **Badge styling** — pill shape, exact tint colors for each badge type on white

---

## 13. Files Changed

| File | Change Type |
|------|-------------|
| `docs/redesign-tech-approach.md` | Created (this document) |
