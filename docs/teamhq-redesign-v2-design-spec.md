# TeamHQ Redesign v2 -- Design Spec

**Author:** Robert (Designer)
**Date:** 2026-02-09
**Requirements:** `docs/teamhq-redesign-v2-requirements.md`
**Reference:** youngjerks.com -- white bg, thin rules, single vibrant accent, restrained typography

---

## Design Direction

Strip the interface back to essentials. White backgrounds, near-black text, one accent color, thin structural borders, no shadows, no gradients, no noise, no card lift. The page should read like a well-typeset editorial layout -- quiet, confident, and content-first.

The accent is **Royal Jaguar Green** (`#006B3F`) -- a deep, saturated green that reads as luxurious and restrained on white. It replaces rose-500 everywhere.

---

## 1. Token-Level Spec

### 1.1 New RGB Channel Tokens

Add these to support `rgba()` usage with the green accent:

```css
/* Royal Jaguar Green RGB */
--color-green-accent-rgb: 0, 107, 63;
--color-green-accent-hover-rgb: 0, 140, 82;
--color-green-accent-active-rgb: 0, 84, 50;
```

### 1.2 Semantic Tokens -- Backgrounds

| Token | Current Value | New Value |
|-------|---------------|-----------|
| `--color-bg-primary` | `#0c0c0e` | `#ffffff` |
| `--color-bg-secondary` | `#111113` | `#fafafa` |
| `--color-bg-card` | `#18181b` | `#ffffff` |
| `--color-bg-frosted` | `rgba(12, 12, 14, 0.80)` | `rgba(255, 255, 255, 0.92)` |

### 1.3 Semantic Tokens -- Text

| Token | Current Value | New Value |
|-------|---------------|-----------|
| `--color-text-primary` | `#ebebeb` | `#171717` |
| `--color-text-secondary` | `#9a9a9a` | `#666666` |
| `--color-text-tertiary` | `#606068` | `#999999` |

### 1.4 Semantic Tokens -- Accent

| Token | Current Value | New Value |
|-------|---------------|-----------|
| `--color-accent` | `var(--color-rose-500)` | `#006B3F` |
| `--color-accent-hover` | `var(--color-rose-400)` | `#008C52` |
| `--color-accent-active` | `var(--color-rose-600)` | `#005432` |
| `--color-accent-bg` | `rgba(var(--color-rose-500-rgb), 0.08)` | `rgba(0, 107, 63, 0.06)` |
| `--color-accent-light` | `rgba(var(--color-rose-500-rgb), 0.06)` | `rgba(0, 107, 63, 0.04)` |

### 1.5 Semantic Tokens -- Borders

| Token | Current Value | New Value |
|-------|---------------|-----------|
| `--color-border` | `rgba(var(--color-white-rgb), 0.06)` | `#e5e5e5` |
| `--color-border-strong` | `rgba(var(--color-white-rgb), 0.10)` | `#d4d4d4` |

### 1.6 Semantic Tokens -- Shadows

| Token | Current Value | New Value |
|-------|---------------|-----------|
| `--shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.3)` | `none` |
| `--shadow-md` | *(complex dark shadow)* | `none` |
| `--shadow-lg` | *(complex dark shadow)* | `0 4px 12px rgba(0, 0, 0, 0.08)` |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.3), ...` | `none` |
| `--shadow-card-hover` | *(complex hover shadow)* | `none` |
| `--shadow-ring` | `0 0 0 1px rgba(var(--color-white-rgb), 0.06)` | `none` |

Note: `--shadow-lg` retains a subtle shadow for modals/toasts only -- floating elements still need depth cues on a flat white page. All card-level shadows are removed; borders do the structural work.

### 1.7 Typography

| Token | Current Value | New Value |
|-------|---------------|-----------|
| `--font-heading` | `"Atkinson Hyperlegible Mono", ui-monospace, ...` | `"Geist", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |

The heading font becomes the same as `--font-family`. Geist is already loaded and serves as a clean grotesque. Drop Atkinson Hyperlegible Mono from the Google Fonts `<link>` in `index.html`.

Preferred font weights: 400 (regular) and 600 (semibold). The bold weight (700) can remain loaded but should be used sparingly -- section titles and the hero headline only.

### 1.8 Border Radius

| Token | Current Value | New Value |
|-------|---------------|-----------|
| `--radius-sm` | `6px` | `4px` |
| `--radius-md` | `8px` | `4px` |
| `--radius-lg` | `12px` | `4px` |
| `--radius-xl` | `16px` | `4px` |

Young Jerks reference uses sharp edges. We go with a minimal uniform 4px across the board -- just enough to avoid harsh pixel corners without looking rounded.

---

## 2. Component-Level Spec

### 2.1 Navigation Bar

**Current:** Frosted glass dark background, backdrop-filter blur, white-rgba bottom border.

**New:**
- Background: white (`--color-bg-frosted` becomes `rgba(255,255,255,0.92)`)
- Border-bottom: `1px solid #e5e5e5` (use `--color-border`)
- Remove `backdrop-filter` and `-webkit-backdrop-filter` entirely
- Nav links: color `--color-text-secondary`, hover color `--color-accent` (green)
- Active link: color `--color-text-primary`
- `.nav__label`: change color to `--color-text-tertiary`

**CSS changes in `shared.css`:**
```css
.nav {
  background: var(--color-bg-frosted);
  /* DELETE: backdrop-filter: blur(16px) saturate(180%); */
  /* DELETE: -webkit-backdrop-filter: blur(16px) saturate(180%); */
  border-bottom: 1px solid var(--color-border);
}

.nav__link:hover {
  color: var(--color-accent);  /* was --color-text-primary */
}
```

### 2.2 Hero Section

**Current:** Centered text, radial gradient glow pseudo-element, "Sherlock Labs" badge pill, accent-colored headline span, 5xl headline on desktop.

**New:**
- Remove `hero::before` radial gradient entirely (delete the rule)
- Remove `.hero__badge` element display: `display: none` (do not show the badge pill)
- Headline: color `--color-text-primary` (dark text), NOT `#ffffff`
- Headline accent span `.hero__headline-accent`: color `--color-accent` (green)
- Headline font: `--font-heading` (now Geist, no longer mono)
- Desktop headline: reduce from `--text-5xl` (3rem) to `--text-4xl` (2.25rem)
- Subhead: color remains `--color-text-secondary`
- Remove `overflow: hidden` on `.hero` (no glow to clip)
- Remove `position: relative` on `.hero` (no pseudo-element to layer against)

**CSS changes in `styles.css`:**
```css
.hero {
  background: var(--color-bg-primary);
  padding-top: var(--space-8);
  padding-bottom: var(--space-8);
  text-align: center;
  /* DELETE: position: relative; */
  /* DELETE: overflow: hidden; */
}

/* DELETE entire hero::before rule */

.hero__badge {
  display: none;
}

.hero__headline {
  font-family: var(--font-heading);
  color: var(--color-text-primary);  /* was #ffffff */
}

/* Desktop */
@media (min-width: 1024px) {
  .hero__headline {
    font-size: var(--text-4xl);  /* was --text-5xl */
  }
}
```

### 2.3 Section Headers & Dividers

**Current:** Centered section titles with `--font-heading` (mono), eyebrow labels via `::before` pseudo-elements, border-top dividers using rgba white.

**New:**
- Section titles: left-aligned (`text-align: left`), use `--font-heading` (now Geist sans)
- Remove all eyebrow `::before` pseudo-elements -- set content to `none` or remove rules
- Section dividers: now naturally `1px solid #e5e5e5` via `--color-border` token change
- Section subtitles: left-aligned (`text-align: left`), remove `margin-left: auto` / `margin-right: auto`

**CSS changes:**
```css
.section-title {
  font-family: var(--font-heading);
  text-align: left;  /* was center */
}

.section-subtitle {
  text-align: left;  /* was center */
  margin-left: 0;   /* was auto */
  margin-right: 0;  /* was auto */
}

/* Remove ALL eyebrow labels */
#tools-heading::before,
#projects-heading::before,
#meetings-heading::before,
#roster-heading::before,
#how-heading::before {
  display: none;
}
```

### 2.4 Tool Cards

**Current:** Dark bg card, border, border-radius-lg, box-shadow-card, translateY(-2px) hover with shadow explosion and rose glow.

**New:**
- Background: `--color-bg-card` (white -- invisible on white page, fine)
- Border: `1px solid --color-border` (`#e5e5e5`)
- Border-radius: `--radius-lg` (now 4px)
- Box-shadow: `none` (via `--shadow-card` token)
- Hover: border-color change to `--color-accent` only. No transform, no shadow, no bg change
- Remove transition on `transform` and `box-shadow` -- only keep `border-color 0.15s ease`
- `.tool-card__badge--coming-soon` bg: `rgba(0,0,0,0.04)` (was rgba white)
- Launch link arrow: keep the translateX(4px) on hover -- this is a subtle micro-interaction that works

**CSS changes:**
```css
.tool-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: none;
  transition: border-color 0.15s ease;
}

.tool-card:hover {
  border-color: var(--color-accent);
  /* DELETE: transform, box-shadow, background changes */
}

.tool-card__badge--coming-soon {
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.04);
}
```

### 2.5 Project Cards

**Current:** Same dark card treatment as tool cards, with expand/collapse.

**New:**
- Same flat treatment as tool cards: no shadow, no hover transform, border-color accent on hover
- Expanded state: add `border-left: 3px solid var(--color-accent)` to indicate active/open (structural, not decorative)
- Details inner border: uses `--color-border` (now `#e5e5e5`, handled by token)
- `.project-card__badge[data-status="planned"]` bg: `rgba(0,0,0,0.04)` (was rgba white)
- `.project-card__action-btn` border: `1px solid var(--color-border)` (now `#e5e5e5`)
- `.project-card__action-btn--edit` hover bg: `rgba(0,0,0,0.03)` (was rgba white)
- `.project-card__action-btn--edit` color: `var(--color-text-secondary)` (was neutral-600 -- too light on white)

**CSS changes:**
```css
.project-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: none;
  transition: border-color 0.15s ease;
}

.project-card:hover {
  border-color: var(--color-accent);
  /* DELETE: transform, box-shadow, background, old border-color */
}

.project-card__header[aria-expanded="true"] {
  /* Parent card gets left accent border -- handled at card level */
}

/* Expanded card indicator */
.project-card:has(.project-card__header[aria-expanded="true"]) {
  border-left: 3px solid var(--color-accent);
}

.project-card__badge[data-status="planned"] {
  background: rgba(0, 0, 0, 0.04);
}

.project-card__action-btn {
  border: 1px solid var(--color-border);
}

.project-card__action-btn--edit {
  color: var(--color-text-secondary);
}

.project-card__action-btn--edit:hover {
  background: rgba(0, 0, 0, 0.03);
  border-color: var(--color-border-strong);
}
```

### 2.6 Meeting Cards

**Current:** Same dark card treatment with rose accents on badges and running state.

**New:**
- Same flat card treatment: no shadow, no hover transform, border-color accent on hover
- `.meeting-card__badge--charter`: color `--color-accent` (green), bg `rgba(0, 107, 63, 0.08)`
- `.meeting-card--running` border-color: `rgba(0, 107, 63, 0.3)` (was rose)
- Decision boxes: border `rgba(0, 107, 63, 0.10)`, bg `rgba(0, 107, 63, 0.04)`
- Participant pills: color `--color-accent`, bg `rgba(0, 107, 63, 0.10)`
- Action "Start" button: border `rgba(0, 107, 63, 0.3)`, bg `rgba(0, 107, 63, 0.08)`, hover bg `rgba(0, 107, 63, 0.12)`, hover border `rgba(0, 107, 63, 0.5)`

**CSS changes:**
```css
.meeting-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: none;
  transition: border-color 0.15s ease;
}

.meeting-card:hover {
  border-color: var(--color-accent);
  /* DELETE: transform, box-shadow, background, old border-color */
}

.meeting-card__badge--charter {
  color: var(--color-accent);
  background: rgba(var(--color-green-accent-rgb), 0.08);
}

.meeting-card--running {
  border-color: rgba(var(--color-green-accent-rgb), 0.3);
}

.meeting-detail__decision {
  background: rgba(var(--color-green-accent-rgb), 0.04);
  border: 1px solid rgba(var(--color-green-accent-rgb), 0.10);
}

.meeting-detail__participant {
  color: var(--color-accent);
  background: rgba(var(--color-green-accent-rgb), 0.10);
}

.meeting-detail__action-start {
  border: 1px solid rgba(var(--color-green-accent-rgb), 0.3);
  background: rgba(var(--color-green-accent-rgb), 0.08);
  color: var(--color-accent);
}

.meeting-detail__action-start:hover {
  background: rgba(var(--color-green-accent-rgb), 0.12);
  border-color: rgba(var(--color-green-accent-rgb), 0.5);
}
```

### 2.7 Agent Cards (Roster)

**Current:** Dark card treatment, avatar circle with accent-light bg, role text in accent color, rose glow on hover, expanded state border.

**New:**
- Same flat card treatment as all cards
- Roster section background: `--color-bg-secondary` (now `#fafafa`) -- this creates a subtle band distinction from white sections, which still works on light
- Agent avatar: keep current sizing, bg changes to `--color-accent-light` (now `rgba(0,107,63,0.04)`) -- very subtle green tint
- Role text: stays `--color-accent` (now green)
- Hover: border-color `--color-accent` only, no transform/shadow/bg
- Expanded state `.agent-card[aria-expanded="true"]`: border-color `rgba(0, 107, 63, 0.25)`, bg `#ffffff` (white, not dark)

**CSS changes:**
```css
.agent-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: none;
  transition: border-color 0.15s ease;
}

.agent-card:hover {
  border-color: var(--color-accent);
  /* DELETE: transform, box-shadow, background, old border-color */
}

.agent-card[aria-expanded="true"] {
  border-color: rgba(var(--color-green-accent-rgb), 0.25);
  background: var(--color-bg-card);  /* white, was #1e1e22 */
}
```

### 2.8 Agent Profile Panels

**Current:** Dark card bg, mono font section titles, dark activity grid cells.

**New:**
- Panel bg: `--color-bg-card` (white) with `1px solid --color-border`
- Section titles `.agent-profile__section-title`: keep mono, color `--color-text-tertiary` (now `#999999`)
- Project role text `.agent-profile__project-role`: color `--color-accent` (green)
- Recent output cards: same flat card treatment

### 2.9 Activity Grid

**Current:** Cells use `rgba(var(--color-agent-NAME-rgb), OPACITY)` with empty cells being transparent (invisible on dark bg).

**New:**
- Empty cells: `background: #f0f0f0` (a light gray fill that reads as "no activity" on white). Add this rule:
```css
.activity-grid__cell {
  background: #f0f0f0;
  border-radius: 2px;
}
```
- Agent-colored cells: The existing inline-style approach (`rgba(R,G,B, 0.2/0.4/0.6/1.0)`) continues to work. The opacity levels produce lighter tints on a white background, which is the correct visual behavior.
- Pad cells remain transparent: `.activity-grid__cell--pad { background: transparent !important; }`

### 2.10 How It Works Steps

**Current:** Accent-colored number circles with rose glow/shadow, connecting line in rgba white.

**New:**
- Step number circles: bg `--color-accent` (green), color white -- keep this
- Remove glow: box-shadow `none` (was rose glow)
- Connecting line: `background: #e5e5e5` (was `rgba(var(--color-white-rgb), 0.08)`)
- Step titles and descriptions: colors handled by token changes

**CSS changes:**
```css
.step__number {
  background: var(--color-accent);
  color: var(--color-white);
  box-shadow: none;  /* was rose glow */
}

/* Desktop connecting line */
@media (min-width: 1024px) {
  .steps::before {
    background: #e5e5e5;  /* was rgba white */
  }
}
```

### 2.11 Modals

**Current:** Dark bg card, dark input backgrounds, rose focus rings, dark overlay.

**New:**
- Modal bg: `--color-bg-card` (white)
- Modal border: `--color-border` (`#e5e5e5`)
- Modal shadow: `--shadow-lg` (subtle shadow for floating elements)
- Input backgrounds: `#ffffff` (was `#111113`)
- Input borders: `1px solid var(--color-border)` (was rgba white)
- Input focus: border-color `--color-accent`, box-shadow `0 0 0 3px rgba(0, 107, 63, 0.15)` (was rose)
- Modal close button hover bg: `rgba(0, 0, 0, 0.05)` (was rgba white)
- Cancel button border: `1px solid var(--color-border)` (was rgba white)
- Cancel button hover: border-color `var(--color-border-strong)`
- Overlay bg stays `rgba(0,0,0,0.5)` -- works on both themes
- Kickoff prompt area bg: `rgba(0, 0, 0, 0.03)` (was rgba white)

**CSS changes:**
```css
.modal__input,
.modal__textarea,
.modal__select {
  background: #ffffff;
  border: 1px solid var(--color-border);
}

.modal__input:focus,
.modal__textarea:focus,
.modal__select:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15);
}

.modal__close:hover {
  color: var(--color-text-primary);
  background: rgba(0, 0, 0, 0.05);
}

.modal__cancel {
  border: 1px solid var(--color-border);
}

.modal__cancel:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}

.detail__notes-input {
  background: #ffffff;
  border: 1px solid var(--color-border);
}

.detail__notes-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.15);
}

.kickoff__prompt-area {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--color-border);
}
```

### 2.12 Toast Notifications

**New:**
- Background: `--color-bg-card` (white)
- Border: `--color-border-strong` (now `#d4d4d4`)
- Shadow: `--shadow-lg` (retained for floating elements)

### 2.13 Footer

**Current:** Near-black background (`#0a0a0c`), white text.

**New:**
- Background: `#f5f5f5` (light gray, subtle distinction from white body)
- Border-top: `1px solid var(--color-border)` (`#e5e5e5`)
- Text colors handled by token changes

**CSS changes in `shared.css`:**
```css
.footer {
  background: #f5f5f5;
  border-top: 1px solid var(--color-border);
}
```

### 2.14 Session Log

**Current:** Dark background `#111113`, dark scrollbar thumb, dark code areas.

**New:**
- Session log background: `#f9f9f9` (very light gray, distinguishes from card white)
- Session log header bg: `rgba(0, 0, 0, 0.02)`
- Session log scrollbar thumb: `rgba(0, 0, 0, 0.12)` (was rgba white)
- Jump-to-latest gradient: `linear-gradient(transparent, #f9f9f9 60%)` (was `#111113`)
- Tool-use event bg: `rgba(0, 107, 63, 0.04)` (was rose rgba)
- Agent spawn event bg: `rgba(0, 107, 63, 0.04)` (was rose rgba)
- Agent spawn border-left: `3px solid var(--color-accent)` (handled by token)
- Result output bg: `rgba(0, 0, 0, 0.03)` (was rgba white)
- Group event bg: `rgba(0, 0, 0, 0.02)` (was rgba white)

### 2.15 Pipeline Indicator

**Current:** Dots with rose glow, connectors with rgba white bg.

**New:**
- Pipeline dot border: `2px solid var(--color-border)` (was rgba white)
- Current step dot box-shadow: `0 0 0 3px rgba(0, 107, 63, 0.25)` (was rose)
- Connector bg: `#e5e5e5` (was rgba white)

**CSS changes:**
```css
.pipeline-indicator__dot {
  border: 2px solid var(--color-border);
}

.pipeline-indicator__step--current .pipeline-indicator__dot {
  box-shadow: 0 0 0 3px rgba(var(--color-green-accent-rgb), 0.25);
}

.pipeline-indicator__connector {
  background: #e5e5e5;
}
```

### 2.16 Noise Overlay

**Remove entirely.** In `index.html`, the SVG element with `class="noise-overlay"` should be removed from the DOM. The `.noise-overlay` CSS rule in `styles.css` can also be removed.

---

## 3. Hover & Interaction States

### 3.1 Cards (All Types: Tool, Project, Meeting, Agent)

| State | Treatment |
|-------|-----------|
| Default | `border: 1px solid #e5e5e5` |
| Hover | `border-color: #006B3F` (accent) |
| Focus-visible | `outline: 2px solid #006B3F; outline-offset: 2px` |
| Active/Expanded | `border-left: 3px solid #006B3F` (project cards); `border-color: rgba(0,107,63,0.25)` (agent cards) |

No `transform`, no `box-shadow` changes, no `background-color` changes on hover.

### 3.2 Links & Buttons

| Element | Default | Hover | Active |
|---------|---------|-------|--------|
| Nav links | `color: #666666` | `color: #006B3F` | -- |
| Accent links (launch, view) | `color: #006B3F` | `color: #008C52` | -- |
| Primary buttons (submit, new, start) | `bg: #006B3F; color: #fff` | `bg: #005432` | -- |
| Ghost buttons (cancel, edit, notes-add) | `border: 1px solid #e5e5e5; color: #666666` | `border-color: #d4d4d4; color: #171717` | -- |
| Delete button | `bg: #ef4444; color: #fff` | `bg: #dc2626` | -- |
| Stop/delete ghost | `color: #999999` | `color: #dc2626; border-color: rgba(220,38,38,0.2)` | -- |

### 3.3 Form Inputs

| State | Treatment |
|-------|-----------|
| Default | `bg: #fff; border: 1px solid #e5e5e5` |
| Focus | `border-color: #006B3F; box-shadow: 0 0 0 3px rgba(0,107,63,0.15)` |
| Invalid | `border-color: #dc2626` |
| Invalid + Focus | `border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.12)` |
| Placeholder | `color: #a3a3a3` (neutral-400) |

### 3.4 Chevrons & Expand/Collapse

Chevron border colors: change all `var(--color-neutral-400)` references for chevrons -- these will still work since neutral-400 is `#a3a3a3`, which has adequate contrast on white (3.5:1). Keep as-is.

### 3.5 Hover Backgrounds (Expandable Items)

Replace all `rgba(var(--color-white-rgb), 0.03)` hover backgrounds with `rgba(0, 0, 0, 0.02)`. This applies to:
- `.task-item--expandable .task-item__header:hover`
- `.detail__note:hover`
- `.session-history__item:hover`
- `.meeting-detail__action`

---

## 4. Logo Check

**Current logo (`img/sherlock-labs-logo.svg`):**
- Magnifying glass stroke: `linearGradient` from `#FB6182` to `#e8496a` (rose)
- Terminal prompt `>` inside lens: `#4ADE80` (green-400)
- Cursor bar: `#171717` with 0.85 opacity
- Dollar sign `$`: `#4ADE80`
- "Sherlock" text: `#171717` (dark)
- "Labs" text: `#FB6182` (rose)

**Issues on white background:**
1. The "Sherlock" text at `#171717` works fine on white.
2. The cursor bar at `#171717` works fine.
3. The rose gradient on the magnifying glass and "Labs" text need to change to the green accent.

**Recommendation:** Create a new logo variant or update the existing SVG:
- Replace the `linearGradient` stops from rose to green: `#006B3F` to `#005432`
- Change "Labs" `tspan` fill from `#FB6182` to `#006B3F`
- The green terminal prompt `#4ADE80` works on white (it's decorative, inside the lens)
- The `$` symbol at `#4ADE80` has poor contrast on white (2.5:1 ratio) -- darken to `#16a34a` (green-600) for the `$` sign

**FLAG:** Alice should update the SVG inline or create `img/sherlock-labs-logo-v2.svg` with these color swaps. This is a blocking visual change -- the current logo has rose brand colors that clash with the green redesign.

---

## 5. Agent Identity Colors on Light Background

The agent identity colors are used in two places:
1. **Activity grid cells** -- opacity-based fills via `rgba(R,G,B, 0.2/0.4/0.6/1.0)`
2. **Role label text** -- `.agent-card__role`, `.task-item__role`, `.agent-profile__project-role`

### Contrast Audit (against white #ffffff)

| Color | Name | Hex | Contrast Ratio | Verdict |
|-------|------|-----|---------------|---------|
| indigo-400 (Thomas) | `#818cf8` | 3.9:1 | PASS AA large, FAIL AA normal |
| violet-400 (Andrei) | `#a78bfa` | 3.3:1 | FAIL AA normal |
| purple-400 (Robert) | `#c084fc` | 2.7:1 | FAIL |
| pink-400 (Alice) | `#f472b6` | 3.0:1 | FAIL |
| emerald-400 (Jonah) | `#34d399` | 2.5:1 | FAIL |
| amber-400 (Enzo) | `#fbbf24` | 1.7:1 | FAIL |
| rose-400 (Priya) | `#fb7e95` | 2.9:1 | FAIL |
| teal-400 (Suki) | `#2dd4bf` | 2.3:1 | FAIL |
| orange-400 (Marco) | `#fb923c` | 2.4:1 | FAIL |
| sky-400 (Nadia) | `#38bdf8` | 2.6:1 | FAIL |
| lime-400 (Yuki, Zara) | `#a3e635` | 1.7:1 | FAIL |
| cyan-400 (Kai) | `#22d3ee` | 2.2:1 | FAIL |

**None pass WCAG AA (4.5:1) for normal text on white.** These colors were chosen for dark backgrounds.

### Solution: Dual-Purpose Color System

For **text use** (role labels, accent text), use darker -600 or -700 variants. For **background/decorative use** (activity grid fills, avatar backgrounds), keep the -400 values since they render as tinted fills via opacity.

**New agent text color tokens** (add to tokens.css):

```css
/* Agent Identity — Text Colors (for light background) */
--color-agent-thomas-text: #4f46e5;   /* indigo-600 — 6.3:1 */
--color-agent-andrei-text: #7c3aed;   /* violet-600 — 6.1:1 */
--color-agent-robert-text: #9333ea;   /* purple-600 — 5.2:1 */
--color-agent-alice-text: #db2777;    /* pink-600 — 4.6:1 */
--color-agent-jonah-text: #059669;    /* emerald-600 — 4.6:1 */
--color-agent-enzo-text: #d97706;     /* amber-600 — 4.5:1 */
--color-agent-priya-text: #e11d48;    /* rose-600 — 5.0:1 */
--color-agent-suki-text: #0d9488;     /* teal-600 — 4.5:1 */
--color-agent-marco-text: #ea580c;    /* orange-600 — 4.6:1 */
--color-agent-nadia-text: #0284c7;    /* sky-600 — 4.8:1 */
--color-agent-yuki-text: #65a30d;     /* lime-600 — 3.8:1 closest passing */
--color-agent-kai-text: #0891b2;      /* cyan-600 — 4.5:1 */
--color-agent-zara-text: #65a30d;     /* lime-600 */
--color-agent-leo-text: #ea580c;      /* orange-600 */
--color-agent-nina-text: #db2777;     /* pink-600 */
--color-agent-soren-text: #0284c7;    /* sky-600 */
--color-agent-amara-text: #0d9488;    /* teal-600 */
--color-agent-howard-text: #7c3aed;   /* violet-600 */
--color-agent-default-text: #525252;  /* neutral-600 */
```

**Application:** The JavaScript rendering for agent role labels should use the `-text` variant. These tokens should be applied as inline styles by JS (the existing pattern) or via CSS custom properties on the card. The activity grid continues to use the `-rgb` tokens with opacity -- no change needed there.

**Note for Alice:** The existing JS assigns agent colors as inline styles. Alice should map agent names to their `-text` token for role labels. The grid cells continue to use the `-400` RGB values at various opacities and will look correct as lighter tints on white.

---

## 6. Responsive Notes

Minimal responsive-specific changes. The existing breakpoints (639px, 640px, 1024px, 1280px) are unchanged. The token changes propagate to all breakpoints automatically.

One responsive-specific detail:
- Mobile nav: The nav wraps links naturally. On white background, the horizontal wrapping works fine. No change needed.
- Mobile cards: Already stack to single column. The removal of shadows and transforms makes mobile rendering simpler.

---

## 7. Hardcoded Values to Replace

Beyond semantic tokens, these hardcoded color values in `styles.css` must be replaced:

| Location | Current | New |
|----------|---------|-----|
| `.hero__headline` color | `#ffffff` | `var(--color-text-primary)` |
| `.tool-card:hover` bg | `#1e1e22` | (remove rule) |
| `.project-card:hover` bg | `#1e1e22` | (remove rule) |
| `.agent-card:hover` bg | `#1e1e22` | (remove rule) |
| `.agent-card[aria-expanded="true"]` bg | `#1e1e22` | `var(--color-bg-card)` |
| `.meeting-card:hover` bg | `#1e1e22` | (remove rule) |
| `.modal__input` bg | `#111113` | `#ffffff` |
| `.detail__notes-input` bg | `#111113` | `#ffffff` |
| `.session-log` bg | `#111113` | `#f9f9f9` |
| `.session-log__header` bg | `rgba(var(--color-white-rgb), 0.03)` | `rgba(0, 0, 0, 0.02)` |
| `.session-log__jump` gradient | `#111113` | `#f9f9f9` |
| `.footer` bg in `shared.css` | `#0a0a0c` | `#f5f5f5` |

All `rgba(var(--color-white-rgb), N)` patterns for subtle backgrounds/borders need to flip to `rgba(var(--color-black-rgb), N)`:
- `0.03` white -> `0.02` black (hover bg tints)
- `0.04` white -> `0.03` black (code blocks, kickoff area)
- `0.06` white -> `0.04` black (badge backgrounds, count pills)
- `0.08` white -> `0.06` black (agent spawn, team activity pills)
- `0.10` white -> `0.08` black (input borders -- but prefer `--color-border` token)
- `0.12` white -> `0.10` black (scrollbar thumbs)
- `0.15` white -> `0.12` black (hover border emphasis)

All `rgba(var(--color-rose-500-rgb), N)` patterns need to change to `rgba(var(--color-green-accent-rgb), N)`:
- Card hover border tints
- Meeting badge backgrounds
- Decision card backgrounds
- Pipeline dot glow
- Agent spawn event bg
- Session tool-use event bg

---

## 8. HTML Changes (`index.html`)

1. **Remove noise overlay SVG** (lines 17-23 approximately)
2. **Update Google Fonts link** -- remove `Atkinson+Hyperlegible+Mono:wght@400;700&` from the URL
3. **Logo update** -- either update `img/sherlock-labs-logo.svg` colors or swap `src` to a new file

---

## 9. docs.html Impact

The docs page shares `tokens.css` and `shared.css`. Token changes (backgrounds, text colors, borders, accent) will propagate there. The nav and footer will update automatically.

**Expected behavior:** docs.html will get the light background, dark text, green accent, and updated nav/footer for free. The docs-specific styles in `css/docs.css` (if it exists) may have hardcoded dark values that need a separate pass. This is flagged as out-of-scope per requirements but Alice should verify docs.html doesn't visually break.

---

## 10. Summary of Files to Modify

| File | Changes |
|------|---------|
| `css/tokens.css` | All semantic tokens (bg, text, accent, border, shadow, radius, font-heading), new green RGB tokens, new agent text color tokens |
| `css/shared.css` | Nav (remove backdrop-filter, update hover), footer bg |
| `css/styles.css` | Hero (remove glow, badge, adjust headline), remove eyebrows, all card hover treatments, all hardcoded dark colors, all rgba white->black flips, all rose->green rgba, modals, inputs, session log, steps, pipeline |
| `index.html` | Remove noise overlay SVG, update font import URL, update logo |
| `img/sherlock-labs-logo.svg` | Replace rose gradient with green, darken `$` symbol |

---

## 11. Design Review Checklist (for Robert's post-implementation review)

- [ ] Page background is white, no dark remnants
- [ ] All text passes WCAG AA contrast on white
- [ ] No rose/pink accent visible anywhere (replaced by green)
- [ ] No card shadows visible (flat, bordered cards)
- [ ] No card translateY hover effects
- [ ] Section headings are left-aligned, no eyebrow labels
- [ ] Hero is clean -- no glow, no badge, no accent-colored headline
- [ ] Noise overlay is gone
- [ ] Modals have white bg, green focus rings
- [ ] Activity grid empty cells are light gray, not invisible
- [ ] Agent role labels are readable (adequate contrast)
- [ ] Logo reads correctly on white background
- [ ] Footer has light gray background
- [ ] Nav is white with bottom border, no frosted glass
- [ ] Step number circles are green, no glow
- [ ] docs.html loads without visual breakage
