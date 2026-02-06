# OST Recommendation Page — Design Spec

## Overview

This spec defines the visual redesign of `RecommendationView.tsx`. The goals are: (1) reduce the color palette from 15+ hues to 3 accent colors, (2) replace hover-only persona tooltips with expandable accordion sections, and (3) sharpen the information hierarchy so the page scans cleanly from recommendation to ranking to details.

No backend or schema changes are required. This is a pure presentation change within the existing React + Tailwind setup.

---

## 1. Color System

### 1.1 Allowed Palette

The page uses **three accent colors** on top of the zinc neutral scale. These align with the landing page's existing token system.

| Role | Color | Tailwind Token | Hex | Usage |
|------|-------|----------------|-----|-------|
| **Primary accent** | Indigo | `indigo-500` / `indigo-400` | #6366F1 / #818CF8 | Hero border/gradient, impact bars, confidence badge, interactive elements |
| **Positive signal** | Emerald | `emerald-400` / `emerald-500` | #34D399 / #10B981 | High scores (7-10), "First Steps" icon |
| **Negative signal** | Red | `red-400` | #F87171 | Low scores (1-3), "Risks" icon |
| **Neutral / mid** | Zinc | `zinc-400` / `zinc-500` | #A1A1AA / #71717A | Mid scores (4-6), all persona badges, body text, "Deprioritize" icon |
| **Backgrounds** | Zinc | `zinc-800`, `zinc-900`, `zinc-950` | — | Cards, bars, page background |

### 1.2 What Gets Removed

- **All 11 persona badge colors** (`PERSONA_BADGE_COLORS` map) — replaced with a single neutral badge style.
- **The amber score color** — the 3-tier score scale becomes emerald / zinc / red (high / mid / low), dropping amber entirely.
- **Multi-hue impact bars** — bars are now always indigo with opacity variation, not emerald/indigo/zinc.
- **Colored borders on the Risks/First Steps/Deprioritize columns** — replaced with a subtle icon + text label, using the neutral card border (`border-zinc-800`).

---

## 2. Component Specifications

### 2.1 Hero Section (Recommendation)

Retains the current hero pattern with minor refinements. This is the most prominent element on the page — the "headline."

```
Container: rounded-xl, border border-indigo-500/30, bg-gradient-to-br from-indigo-500/8 to-zinc-900, p-8, mb-10
Title row:  flex items-center gap-3 mb-4
  "Recommendation" — text-xl font-bold text-zinc-100
  Confidence badge — rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-0.5 text-xs font-semibold text-indigo-400
Body:       text-lg text-zinc-200 leading-relaxed font-medium
```

**Changes from current**: Slight reduction in gradient intensity (`/10` to `/8`), increased bottom margin (mb-8 to mb-10) for breathing room, title color bumped to zinc-100 for stronger hierarchy.

### 2.2 Impact Ranking Section

This is the core section that changes the most. Each solution gets a card-like row with a rank number, prominent score, impact bar, rationale, and an expandable debater breakdown underneath.

#### 2.2.1 Section Header

```
Container: rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-10
Header row: flex items-center justify-between mb-6
  Left:  h3 — text-sm font-bold text-zinc-300 uppercase tracking-wider
         "Estimated Impact by Solution"
  Right: Expand All / Collapse All toggle (see 2.2.4)
```

#### 2.2.2 Solution Row (ImpactBar replacement)

Each solution is a distinct visual block within the section, separated by `border-b border-zinc-800` (last child has no border).

```
Solution row container: py-5 border-b border-zinc-800 last:border-b-0

Top line (flex items-center justify-between):
  Left group (flex items-center gap-3):
    Rank number — w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold
                  flex items-center justify-center shrink-0
    Solution name — text-base text-zinc-100 font-semibold
  Right group (flex items-center gap-2):
    Score — text-lg font-bold {scoreColor(score)}
    "/10" label — text-xs text-zinc-500 font-medium

Impact bar (mt-3):
  Track: h-1.5 rounded-full bg-zinc-800 overflow-hidden
  Fill:  h-full rounded-full bg-indigo-500 transition-all duration-300
         opacity varies by score:
           score >= 8 → opacity-100
           score >= 5 → opacity-70
           score <  5 → opacity-40
         width: (score / 10) * 100%

Rationale (mt-2):
  p — text-xs text-zinc-500 leading-relaxed

Debater breakdown (mt-3):
  See 2.2.3 below
```

**Score color function** (replaces current `scoreColor`):
```
score >= 7 → text-emerald-400
score >= 4 → text-zinc-400
score <  4 → text-red-400
```

#### 2.2.3 Expandable Debater Breakdown (PersonaBreakdown replacement)

This replaces the colored pill layout with a vertical accordion list. Each debater entry is a row that can expand to reveal their reasoning.

**Collapsed state** (default for all entries):

```
Debater row container: flex items-center gap-3 py-2
  Clickable hit area covers the full row (cursor-pointer)

  Chevron — w-3.5 h-3.5 text-zinc-600 shrink-0 transition-transform duration-200
            Pointing right when collapsed, pointing down when expanded
            Use an inline SVG chevron (same pattern as landing page project-card__chevron
            but rendered as SVG for React)

  Persona badge — inline-flex items-center gap-2
    Name: text-xs font-medium text-zinc-400
    Score: text-xs font-bold {scoreColor(score)}

  (Row has no background; on hover: bg-zinc-800/50 rounded transition-colors)
```

**Expanded state** (user clicks to toggle):

```
Debater row container: same as collapsed

Reasoning panel (below the row, within the same parent):
  Container: pl-7 pb-2 (indented to align with text, not the chevron)
  Text: text-xs text-zinc-500 leading-relaxed
  Content: the debater's `reason` string for this specific solution
  Transition: animate height with a CSS grid trick —
    wrapper has display: grid; grid-template-rows: 0fr (collapsed) / 1fr (expanded);
    transition: grid-template-rows 200ms ease;
    inner div has overflow: hidden;
```

The expand/collapse is per-debater-per-solution. State is managed in React with a `Set<string>` of keys like `"${solutionId}-${perspective}"`.

**Separator between debaters**: None needed — the py-2 on each row plus the visual chevron/indent pattern provides enough separation. A subtle `border-b border-zinc-800/50` can be added between rows if Alice finds the list looks too dense during implementation, but start without it.

#### 2.2.4 Expand All / Collapse All Toggle

A text button in the section header that toggles all debater sections across all solutions.

```
Button: text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer
        bg-transparent border-none
Label:  "Expand all" when any are collapsed, "Collapse all" when all are expanded
```

This controls a global boolean. When true, all debater sections are open. When false, all are closed. Individual toggles override the global state (i.e., if you click "Expand all" and then collapse one, that one stays collapsed).

Implementation: maintain both a `Set<string>` for individually toggled items and a `boolean` for the "all" state. The effective expanded state for a row is: `allExpanded XOR individuallyToggled.has(key)`. This way "Expand all" opens everything, and individual clicks act as overrides.

### 2.3 Rationale Section

Minimal changes — just tightening spacing.

```
Container: rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-10
Header:    text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4
Body:      prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed
```

**Change**: Bottom margin increased to mb-10 (from mb-8). Body text color softened to zinc-400 (from zinc-300) to reduce visual weight relative to the Impact Ranking section above it.

### 2.4 Risks / First Steps / Deprioritize Columns

Remove the colored borders. All three cards use the same neutral border. Differentiation comes from a small text icon/prefix and the section label.

```
Grid: grid grid-cols-1 md:grid-cols-3 gap-4 mb-10

Each card:
  Container: rounded-xl border border-zinc-800 bg-zinc-900 p-5

  Header (flex items-center gap-2 mb-3):
    Icon prefix — text-sm
      Risks:        "!" character in text-red-400 font-bold (or a small warning SVG)
      First Steps:  index numbers (already present) — text-emerald-400/60
      Deprioritize: "--" in text-zinc-600
    Label — text-sm font-bold uppercase tracking-wider
      Risks:        text-zinc-300  (NOT red — the icon carries the signal)
      First Steps:  text-zinc-300  (NOT emerald)
      Deprioritize: text-zinc-500

  List items: same as current but with unified colors:
    Risks:        text-sm text-zinc-400, prefix "--" in text-red-400/40
    First Steps:  text-sm text-zinc-400, prefix "{i+1}." in text-zinc-500
    Deprioritize: text-sm text-zinc-500, prefix "--" in text-zinc-700
```

**Key change**: The red and emerald borders are gone. The cards all look the same structurally; only the icon prefix and text weight hint at the content type. This dramatically reduces the color noise in this section.

### 2.5 Start Over Button

No changes.

```
Button: w-full rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3
        text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800
```

---

## 3. Spacing and Layout

### 3.1 Page-Level Spacing

```
Page container: mx-auto max-w-4xl px-6 py-10 (py-8 bumped to py-10)
Section gaps:   mb-10 between all major sections (hero, impact, rationale, columns)
                This is up from the current inconsistent mb-8
```

### 3.2 Within Impact Ranking

```
Between solutions: py-5 with border-b border-zinc-800
Between solution info and debater list: mt-3
Between debater rows: py-2 (no border by default)
```

### 3.3 Responsive Behavior

- The expandable accordion pattern works on all screen sizes — no hover dependency.
- The three-column grid (Risks / First Steps / Deprioritize) already collapses to single column on mobile via `grid-cols-1 md:grid-cols-3`.
- Debater reasoning text at `text-xs` with `leading-relaxed` remains legible on mobile.
- The Expand All / Collapse All toggle is useful on mobile where screen real estate is limited.
- Minimum touch target for debater rows: the full row is clickable with `py-2` padding, giving at least 32px of height. This meets the 44px recommendation when combined with the gap between rows. If needed, Alice can increase to `py-2.5` for better mobile tap targets.

---

## 4. Interaction States

### 4.1 Debater Row States

| State | Visual |
|-------|--------|
| **Default (collapsed)** | Chevron pointing right. Name + score visible. No background. |
| **Hover** | `bg-zinc-800/50` on the row. Chevron color stays. |
| **Expanded** | Chevron rotated 90deg pointing down. Reasoning panel slides open below. |
| **Expanded + Hover** | Same `bg-zinc-800/50` background. |
| **Focus-visible** | `outline-2 outline-indigo-500 outline-offset-2 rounded` (keyboard navigation) |

### 4.2 Expand All Button States

| State | Visual |
|-------|--------|
| **Default** | `text-zinc-500` |
| **Hover** | `text-zinc-300` |
| **Active** | Brief `text-zinc-200` flash |

### 4.3 Transition Timings

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Chevron rotation | transform | 200ms | ease |
| Reasoning panel height | grid-template-rows | 200ms | ease |
| Row hover background | background-color | 150ms | ease |
| Impact bar width | width | 300ms | ease (on mount) |

---

## 5. Removed Elements

| Element | Current | New |
|---------|---------|-----|
| `PERSONA_BADGE_COLORS` map | 11-color lookup table | Delete entirely |
| Per-persona colored badges | Unique bg/text/border per persona | Single neutral style: `text-zinc-400` text, no background, no border |
| `title` attribute on persona pills | Hover-only tooltip with reasoning | Expandable accordion row |
| Amber score color | `text-amber-400` for scores 4-6 | `text-zinc-400` |
| Multi-hue impact bars | emerald/indigo/zinc based on score range | Always indigo-500 with opacity variation |
| Colored column borders | red/emerald/zinc borders on Risks/Steps/Deprioritize | Uniform `border-zinc-800` |

---

## 6. Implementation Notes for Alice

1. **State management**: Use `useState` with a `Set<string>` for expanded debater rows. Keys should be `"${solutionId}-${perspective}"`. Add a separate `boolean` state for the "expand all" toggle.

2. **Chevron SVG**: Use a simple inline SVG arrow (4x8 or similar). Apply `rotate-90` via Tailwind when expanded. Do not use an icon library for this — keep it lightweight.

3. **Grid height animation**: The `grid-template-rows: 0fr / 1fr` trick with `overflow: hidden` on the inner div is the cleanest CSS-only height animation. The landing page already uses this pattern (see `project-card__details` in `css/styles.css` for reference).

4. **Impact bar opacity**: Use Tailwind's opacity utilities (`opacity-100`, `opacity-70`, `opacity-40`) on the bar fill div, applied via a helper function similar to the existing `scoreColor`.

5. **No new dependencies**: Everything here is achievable with Tailwind classes and React state. No need for animation libraries, headless UI, or additional packages.

6. **Accessibility**: Each debater row should be a `<button>` element (or wrapped in one) with `aria-expanded="true|false"`. The reasoning panel should have `role="region"` and `aria-labelledby` pointing to the button. The "Expand all / Collapse all" toggle should be a `<button>` with a descriptive `aria-label`.
