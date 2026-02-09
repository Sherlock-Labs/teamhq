# TeamHQ Redesign v2 - Requirements

## Goal

Transform the TeamHQ landing page from its current dark-themed, card-heavy, rose-accented aesthetic into a clean minimalist design inspired by youngjerks.com. The new design should feel restrained, intentional, and content-focused — with a "royal jaguar green" accent replacing rose-500 throughout.

## Why

The current design is visually complex: dark zinc backgrounds, rose-500 accent, noise texture overlay, heavy card shadows, radial gradient hero glow, and `translateY` hover effects across every card. It reads as a developer dashboard, not a premium product studio. The CEO wants something that feels like a high-end design agency: clean, confident, quiet.

## Reference

**Young Jerks (youngjerks.com):**
- White background, black text, single vibrant blue accent (`#005af9`)
- Neue Haas Grotesk font (clean grotesque sans-serif)
- Generous whitespace, thin horizontal rules as dividers
- Minimal hover states — no card lift, no shadow explosions
- High contrast, restrained typography hierarchy
- Grid layout with consistent gutters, ~95% content width

---

## Accent Color: Royal Jaguar Green

The CEO requested "royal jaguar green" — a rich, deep, luxurious green.

**Recommended value:** `#006B3F`

Rationale: This sits between classic British Racing Green (`#004225`) and a more saturated emerald. It's dark enough to feel luxurious and restrained, but has enough saturation to work as a visible accent on a white background. It also passes WCAG AA contrast against white (7.2:1 ratio), making it suitable for link text and small UI elements.

**Supporting shades:**
- Hover/lighter: `#008C52` (slightly brighter for hover states)
- Active/darker: `#005432` (pressed state)
- Background tint: `rgba(0, 107, 63, 0.06)` (subtle highlights)
- Background tint strong: `rgba(0, 107, 63, 0.12)` (badges, selected states)

---

## What's Changing

### 1. Theme Direction: Light

Switch from dark theme to light theme. This is the single biggest change.

- **Page background:** White (`#ffffff`) or near-white (`#fafafa`)
- **Text primary:** Near-black (`#111111` or `#171717`)
- **Text secondary:** Medium gray (`#666666`)
- **Text tertiary:** Light gray (`#999999`)
- **Card backgrounds:** White with subtle border (no fill differentiation needed on a white page)
- **Borders:** Light gray (`#e5e5e5`) — thin, structural, not decorative
- **Shadows:** Remove or reduce to bare minimum. On a light background, borders do the structural work.

### 2. Accent Color Swap

Replace all rose-500 (`#FB6182`) references with royal jaguar green (`#006B3F`) throughout the token system.

**Affected semantic tokens:**
- `--color-accent` -> `#006B3F`
- `--color-accent-hover` -> `#008C52`
- `--color-accent-active` -> `#005432`
- `--color-accent-bg` -> `rgba(0, 107, 63, 0.06)`
- `--color-accent-light` -> `rgba(0, 107, 63, 0.04)`
- All `--color-rose-*-rgb` references in hover glows, border tints, etc.

**What survives:**
- Agent identity colors remain unchanged (indigo, violet, purple, pink, emerald, amber, etc.)
- Status colors remain (green for success, red for error, yellow for warning)
- The rose color scale can stay in tokens.css for agent identity use (Priya uses rose-400), but it's no longer the brand accent

### 3. Typography

**Change heading font from Atkinson Hyperlegible Mono to a clean grotesque sans-serif.**

The Young Jerks reference uses Neue Haas Grotesk. For a free/accessible alternative:
- **Option A:** Use `"Inter"` for headings and body (already used in OST Tool, proven in the codebase)
- **Option B:** Use `"Geist"` for everything (already loaded, current body font)
- **Recommendation:** Use Geist for everything. It's already loaded, it's a clean grotesque, and it avoids adding another font load. Drop the Atkinson Hyperlegible Mono import from the Google Fonts link.

**Typography tokens to update:**
- `--font-heading` -> same as `--font-family` (Geist)
- Keep `--font-mono` (Geist Mono) for code/technical UI elements
- Reduce the number of font weights in use: favor 400 (regular) and 600 (semibold) only

**Type hierarchy:**
- Section titles: smaller than current, no monospace eyebrow labels above them
- Headline: confident but not shouting — current 5xl on desktop can come down to 4xl
- Body text: 1rem, comfortable line-height
- Labels/badges: xs, uppercase, letter-spaced (keep this — it works)

### 4. Layout & Spacing

**Increase whitespace. Reduce visual density.**

- Section padding: increase from current `space-8`/`space-12` to more generous values (`space-16`/`space-20` or equivalent)
- Container max-width: keep 1120px (it's close to 95% on standard screens)
- Section dividers: thin 1px horizontal rules in `#e5e5e5`, full-width within the container. Remove the eyebrow labels above section headings (the `::before` pseudo-elements with "Toolkit", "Projects", etc.)
- Remove centered text alignment for section headings — left-align everything for a more editorial feel
- Reduce grid density: agent cards can stay as grid but with more breathing room

### 5. Card Treatment

**Strip back card decoration. Let content breathe.**

Current cards have: background fill, border, border-radius, box-shadow, hover transform, hover shadow explosion, hover background change, hover border color change. That's 8 visual properties working on every card.

New treatment:
- **No background fill** (or white on white — invisible)
- **Thin border** (`1px solid #e5e5e5`)
- **No box-shadow** (or bare minimum: `0 1px 2px rgba(0,0,0,0.04)`)
- **No border-radius** (or very small: 4px max) — the Young Jerks reference uses sharp edges
- **Hover:** subtle border-color change to green accent, no transform, no shadow change
- **Active/expanded state:** green left border or green top border (structural indicator, not decorative)

### 6. Navigation

Keep the sticky nav structure but update treatment:
- **Background:** White with bottom border (`1px solid #e5e5e5`)
- **No backdrop-filter/frosted glass** — clean white
- **Links:** Dark text, green on hover, no transition effects needed beyond color
- **Logo:** Keep Sherlock Labs logo (ensure it works on white background — may need a dark version)

### 7. Hero Section

**Simplify dramatically.**

- Remove radial gradient glow (`hero::before` pseudo-element)
- Remove the "Sherlock Labs" badge pill
- Headline: clean dark text on white, no accent-colored spans
- Subhead: gray secondary text
- Consider whether the hero even needs special treatment vs. just being the first content block with generous top padding

### 8. Noise Texture Overlay

**Remove entirely.** The SVG noise overlay is a dark-theme texture trick. It has no place in a clean light design.

### 9. How It Works Section

- Step numbers: green accent circles (white text on green background)
- Remove the step number glow/shadow effect
- Connecting line: light gray (`#e5e5e5`), not the current dark transparent
- Keep left-to-right step layout on desktop

### 10. Modals

Update to light theme:
- White background
- Light borders
- Green accent buttons instead of rose
- Input fields: white background with light gray border
- Focus rings: green instead of rose

### 11. Meetings Section

Update to light theme treatment matching the rest. No structural changes.

### 12. Footer

- Light gray background (`#f5f5f5`) or white with top border
- Dark text
- Keep minimal content (logo + attribution)

---

## What's NOT Changing

- **HTML structure:** No new sections, no removed sections, no reordering
- **JavaScript functionality:** Projects CRUD, meetings, roster expand/collapse all stay
- **Agent identity colors:** Each agent keeps their unique color for avatars and activity grids
- **Activity profiles feature:** The recently-added agent profile panels (activity grid, project contributions) stay. Just update to light theme treatment
- **Content/copy:** No text changes
- **Section order:** Tools, Projects, Meetings, Roster, How It Works stays
- **Responsive breakpoints:** Keep the existing mobile/tablet/desktop breakpoints
- **docs.html:** Out of scope for this pass (separate page, can be updated later)

---

## Files to Modify

1. **`css/tokens.css`** — Update semantic tokens (backgrounds, text colors, accent, borders, shadows, heading font)
2. **`css/shared.css`** — Update nav, footer, container, focus styles for light theme
3. **`css/styles.css`** — Update all section styles, card treatments, hero, modals, meetings, roster, steps
4. **`index.html`** — Remove noise overlay SVG, remove Atkinson Hyperlegible Mono from font imports (if dropping that font), update logo if needed for light background

Estimated files: 4. This is a CSS-layer redesign, not a structural rebuild.

---

## Acceptance Criteria

1. Page uses a light (white/near-white) background throughout
2. All text is dark on light — WCAG AA contrast ratios met for all text
3. Rose-500 accent is fully replaced by royal jaguar green (`#006B3F`) everywhere it appears
4. Noise texture overlay is removed
5. Hero radial gradient glow is removed
6. Card hover effects are simplified — no translateY, no shadow explosion
7. Section dividers are thin horizontal rules, not border-top on dark sections
8. Eyebrow labels above section headings are removed
9. Heading font is Geist (no Atkinson Hyperlegible Mono for headings)
10. Navigation bar uses white/light background (no frosted glass)
11. All modals, form inputs, and interactive elements work in light theme
12. Agent identity colors still function correctly (avatars, activity grids, role labels)
13. Agent profile expand/collapse panels work correctly in light theme
14. Page is responsive across mobile, tablet, and desktop breakpoints (no regressions)
15. No JavaScript changes required — all visual only

---

## Out of Scope

- **docs.html** redesign (separate page, separate pass)
- **Logo redesign** (may need a dark-version SVG — flag to Robert if the current logo doesn't work on white)
- **Font changes beyond Geist** (no new font additions — Neue Haas Grotesk is a paid font)
- **Layout restructuring** (sections stay in current order, grids stay as grids)
- **Feature changes** (no new sections, no removed functionality)
- **Mobile hamburger menu** (nav links still wrap naturally)
- **OST Tool or other subproject styling** (those have their own design systems)

---

## Risks & Flags

1. **Logo on white:** The current Sherlock Labs logo SVG may be designed for dark backgrounds. Robert should check if it needs a dark variant.
2. **Agent identity colors on white:** Colors like lime-400 and yellow-400 may have poor contrast on white backgrounds. The activity grid and avatar treatments may need darker variants for the light theme.
3. **Shadow removal:** Cards currently rely on shadows for depth hierarchy. On a flat white design, we need to ensure cards still feel like distinct elements via borders alone.
4. **Scope creep toward docs.html:** The docs page shares `tokens.css` and `shared.css`. Changes to those files will affect docs.html. The designer/developer should verify docs.html doesn't break, but full docs.html redesign is deferred.

---

## Pipeline

1. **Thomas (PM)** - Requirements (this doc)
2. **Robert (Designer)** - Design spec with exact token values, component-level mockup notes
3. **Alice (FE)** - Implementation (CSS-only, ~4 files)
4. **Robert (Designer)** - Design review (visual check against spec)
5. **Enzo (QA)** - Pass/fail verdict against acceptance criteria

No architecture step needed (Andrei) — this is a pure CSS/visual refresh, no structural or technical decisions to make.
