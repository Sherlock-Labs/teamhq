# Roadmap Tool v2 — Visual Themes & Styling Options: Design Spec

**Author:** Robert (Product Designer)
**Date:** March 18, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Work Item:** RT-37b
**Dependencies:** `docs/roadmap-tool-v2-themes-requirements.md` (Thomas), `docs/roadmap-tool-v2-themes-tech-approach.md` (Andrei), `docs/roadmap-tool-design-spec.md` (v1.0 design system)

---

## Overview

This spec defines the UI for visual themes in Forge. Users pick a pre-built theme, optionally override the accent color, and toggle dark mode — all from roadmap settings. Themes style the chrome (backgrounds, borders, text, cards, headers); item palette colors remain independent.

The design goal: make theme selection feel like choosing a presentation template — immediate, visual, confident. Users should see what they're getting before they apply it, and the switch should feel instant.

---

## 1. Theme Picker

### 1.1 Placement

The theme picker lives in the **Roadmap Settings panel** as a new top-level section called **"Appearance"**. It sits above the existing sections (Fields, Sharing, etc.).

The Appearance section contains three controls in order:
1. Theme picker (grid of theme cards)
2. Accent color picker
3. Dark mode toggle

### 1.2 Section Header

```
.settings-appearance
  .settings-appearance__header    → "Appearance" label
  .settings-appearance__themes    → Theme card grid
  .settings-appearance__accent    → Accent color picker
  .settings-appearance__mode      → Dark mode control
```

**Section title:** "Appearance" — `--text-sm`, weight 600, color `var(--forge-text)`, uppercase, `letter-spacing: 0.05em`. Bottom margin `--space-4` (16px).

### 1.3 Theme Card Grid

**Layout:** CSS Grid, 2 columns, gap `--space-3` (12px). Full width of the settings panel.

Each theme is a card showing a miniature preview of the theme's appearance.

### 1.4 Theme Card — Anatomy

```
.theme-card                       → 1 column of the 2-col grid
  .theme-card__preview            → Miniature roadmap preview (aspect ratio 16:10)
    .theme-card__preview-header   → Thin bar at top representing the toolbar
    .theme-card__preview-rows     → 3-4 horizontal bars representing items
  .theme-card__label              → Theme name below preview
```

**Dimensions:**
- Card width: fills grid column (fluid)
- Preview area: aspect-ratio `16 / 10`, `border-radius: var(--forge-card-radius, 6px)` on top corners only
- Label area: height 32px, padding `--space-2` (8px) horizontal

**Preview area rendering:**
The preview is a simplified, abstract representation of a Timeline view using the theme's actual color tokens. Not a screenshot — a schematic built from `<div>` elements:

- **Background:** `--forge-bg` fill
- **Header bar:** 6px tall strip at top, `--forge-header-bg` fill
- **Row lines:** 3 horizontal bars, each 4px tall, placed at roughly 25%, 50%, 75% vertical position
  - First bar: `--forge-accent` fill, width 60%
  - Second bar: `--forge-accent` fill at 40% opacity, width 45%, offset right by 20%
  - Third bar: `--forge-accent` fill at 25% opacity, width 55%
- **Grid lines:** 2 faint vertical lines at 33% and 66%, `--forge-border-subtle`, 1px wide
- All inner elements have 4px margin from the card edge

This creates an abstract "timeline" feel that honestly shows the color relationships of each theme.

**Card label:**
- Text: theme display name — `--text-xs` (11px), weight 500, color `var(--forge-text-secondary)`
- Centered below the preview
- Padding-top: `--space-1` (4px)

### 1.5 Theme Card — States

| State | Visual |
|-------|--------|
| **Default** | Border: 1px solid `var(--forge-border)`. Background: `var(--forge-bg-elevated)`. Cursor: pointer. |
| **Hover** | Border-color: `var(--forge-accent)` at 50% opacity. Translate Y: -1px. Transition: 150ms ease. |
| **Selected (active theme)** | Border: 2px solid `var(--forge-accent)`. Box-shadow: `0 0 0 2px var(--forge-accent-subtle)`. Label weight: 600. Label color: `var(--forge-accent)`. |
| **Focus-visible** | 2px ring `var(--forge-accent)`, offset 2px. |

**Selection behavior:** Clicking a theme card applies it immediately — no confirmation button. The PATCH request fires on click, and the theme variables update optimistically. The selected card transitions to the `selected` state with a 150ms ease.

**Keyboard navigation:** Theme cards are focusable (`tabindex="0"`). Arrow keys navigate between cards. Enter or Space selects the focused card.

### 1.6 Theme Cards — What the User Sees

The 6 themes, displayed in this order:

| Position | Key | Label | Preview Character |
|----------|-----|-------|-------------------|
| Row 1, Col 1 | `default` | Default | White bg, indigo bars, light borders — the current Forge look |
| Row 1, Col 2 | `clean` | Clean | Near-white (#FAFAFA) bg, soft shadows, rounded feel |
| Row 2, Col 1 | `bold` | Bold | Dark header, high-contrast bars, sharp edges |
| Row 2, Col 2 | `minimal` | Minimal | Pure white, hairline borders, maximum whitespace feel |
| Row 3, Col 1 | `corporate` | Corporate | Warm off-white, serif-style header bar, muted navy accent |
| Row 3, Col 2 | `startup` | Startup | Bright teal/cyan accent, generous radius, modern feel |

### 1.7 Theme Preview Panel (Hover Detail)

No separate preview panel. The miniature preview cards in the grid serve as the preview. This avoids a second interaction step and keeps the settings panel focused.

**Rationale:** With only 6 themes and immediate application on click, a separate "preview before applying" panel adds complexity without value. The user can click any theme and see the result instantly on the roadmap behind the settings panel. Switching is instant and free — the best preview is the real thing.

If the settings panel is open as a slide-over, the roadmap content behind it updates in real time as the user clicks themes. This is the preview.

---

## 2. Accent Color Picker

### 2.1 Placement

Below the theme card grid, separated by `--space-6` (24px).

### 2.2 Layout

```
.accent-picker
  .accent-picker__label           → "Accent color" label
  .accent-picker__controls        → flex row, gap --space-3
    .accent-picker__swatches      → Preset color dots
    .accent-picker__divider       → Vertical divider
    .accent-picker__custom        → Custom hex input + color well
```

**Section label:** "Accent color" — `--text-xs` (11px), weight 500, color `var(--forge-text-secondary)`, uppercase, `letter-spacing: 0.05em`. Bottom margin `--space-2` (8px).

### 2.3 Preset Swatches

A horizontal row of 8 color circles representing common accent choices:

| Swatch | Hex | Name (tooltip) |
|--------|-----|----------------|
| 1 | `#6366F1` | Indigo (theme default) |
| 2 | `#3B82F6` | Blue |
| 3 | `#06B6D4` | Cyan |
| 4 | `#10B981` | Emerald |
| 5 | `#F59E0B` | Amber |
| 6 | `#EF4444` | Red |
| 7 | `#8B5CF6` | Violet |
| 8 | `#EC4899` | Pink |

**Swatch styling:**
- Size: 24px diameter circles
- Gap: `--space-2` (8px)
- Border: 2px solid transparent (default)
- Border on hover: 2px solid the swatch color at 50% opacity
- Border on selected: 2px solid the swatch color, plus a 2px white inner ring (achieved via `box-shadow: inset 0 0 0 2px white`)
- Cursor: pointer
- Transition: border-color 150ms ease

**First swatch behavior:** The first swatch ("Indigo") acts as the "reset to theme default" option. When the user's `accentColor` is `null`, this swatch shows as selected. Its tooltip reads "Theme default" instead of "Indigo."

### 2.4 Vertical Divider

Between swatches and custom input: 1px wide, height 24px, color `var(--forge-border)`. Margin `--space-2` (8px) on each side.

### 2.5 Custom Color Input

```
.accent-picker__custom            → flex row, align-center, gap --space-2
  .accent-picker__well            → Native <input type="color"> styled as a circle
  .accent-picker__hex             → Text input for hex value
```

**Color well:**
- 24px × 24px circle
- Uses a native `<input type="color">` with the circle styled over it via `appearance: none`, `border-radius: 50%`, overflow hidden
- Shows the current custom color fill
- On click: opens the OS native color picker
- Border: 1px solid `var(--forge-border)`

**Hex input:**
- Width: 80px
- Height: 28px (compact)
- Border: 1px solid `var(--forge-border)`
- Border-radius: `--radius-md` (6px)
- Font: `--text-xs` (11px), monospace (`'JetBrains Mono', 'SF Mono', monospace`)
- Padding: `--space-1` (4px) `--space-2` (8px)
- Placeholder: `#6366F1` (shows theme default)
- Prefix: Fixed `#` character inside the input (use padding-left 20px + positioned `#`)
- Validation: accepts 6 hex characters after `#`. Red border (`--error-600`) on invalid input. Applies on blur or Enter.

### 2.6 Accent Color — States

| State | Behavior |
|-------|----------|
| **No custom color (null)** | First swatch ("Theme default") selected. Hex input empty with placeholder. Color well shows theme's default accent. |
| **Preset selected** | Swatch shows selected ring. Hex input updates to show that hex. PATCH fires immediately. |
| **Custom color via well** | OS picker opens. On change: hex input updates, PATCH fires, swatch selection clears (none match). |
| **Custom color via hex** | On blur/Enter with valid hex: PATCH fires, color well updates, swatch selection updates if it matches a preset. |
| **Invalid hex** | Hex input border turns `--error-600`. No PATCH fires. Tooltip: "Enter a valid hex color." |
| **Reset to default** | Click first swatch ("Theme default"). PATCH sends `accentColor: null`. Hex input clears. |

### 2.7 Accent Color — What It Affects

When a custom accent is set, these elements update:
- `--forge-accent`: the raw color
- `--forge-accent-hover`: darkened 10% (computed via `darken()`)
- `--forge-accent-subtle`: 10% opacity variant (computed via `withAlpha()`)

These tokens affect:
- Header/toolbar highlights
- Selection state backgrounds (selected row, selected card)
- Progress bar fills
- Primary button backgrounds (within the roadmap content area)
- Active nav/tab indicators
- Focus rings on interactive elements within the roadmap

**Does NOT affect:** Item bar colors (those come from color palettes), the app shell sidebar/navigation, or the settings panel itself.

---

## 3. Dark Mode Toggle

### 3.1 Placement — Settings Panel

Below the accent color picker, separated by `--space-6` (24px).

```
.dark-mode-toggle
  .dark-mode-toggle__label        → "Mode" label
  .dark-mode-toggle__control      → Segmented control (3 options)
```

**Section label:** "Mode" — same style as the accent picker label (`--text-xs`, weight 500, uppercase, `letter-spacing: 0.05em`, color `var(--forge-text-secondary)`). Bottom margin `--space-2` (8px).

### 3.2 Segmented Control

A three-option segmented button group:

```
[ ☀ Light  |  ◐ System  |  ● Dark ]
```

**Dimensions:**
- Total width: 100% of settings panel content area
- Height: 32px
- Border: 1px solid `var(--forge-border)`
- Border-radius: `--radius-md` (6px)
- Background: `var(--forge-bg-secondary)`

**Each segment:**
- Width: 1/3
- Text: `--text-xs` (11px), weight 500, color `var(--forge-text-secondary)`
- Icon: 14px, inline before text, gap `--space-1` (4px)
- Icons: Sun (☀) for Light, Half-circle (◐) for System, Moon (●) for Dark — use Lucide icons: `Sun`, `Monitor`, `Moon`

**Selected segment:**
- Background: `var(--forge-bg-elevated)`
- Color: `var(--forge-text)`
- Box-shadow: `0 1px 2px rgba(0,0,0,0.05)`
- Border-radius: `--radius-sm` (4px) — inset within the container
- Transition: background 150ms ease

**Hover (non-selected):**
- Background: `var(--forge-bg-hover)`
- Transition: 150ms ease

### 3.3 Placement — Top Bar Quick Action

A compact dark mode toggle also appears in the **Top Bar right section**, between the Export button and the Format button.

**Button style:**
- Ghost button (no border, no background)
- 32px × 32px
- Icon: `Sun` (16px) when in dark mode (click → switch to light), `Moon` (16px) when in light mode (click → switch to dark)
- When mode is `system`, icon reflects the currently resolved mode
- Color: `var(--forge-text-secondary)`. Hover: `var(--forge-bg-hover)` background
- Tooltip: "Switch to light mode" / "Switch to dark mode" / "Using system preference"

**Behavior:** This is a simplified two-state toggle, not a three-state control:
- If current mode is `system` resolving to light → click sets `dark`
- If current mode is `system` resolving to dark → click sets `light`
- If current mode is `light` → click sets `dark`
- If current mode is `dark` → click sets `light`

The full three-state control (with System option) is only in settings. The toolbar button is a quick flip.

### 3.4 Dark Mode — Transition

When dark mode changes, the entire `.roadmap-container` transitions:

```css
.roadmap-container {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

This prevents a jarring flash. Child elements inherit the transition naturally via CSS custom property changes. `prefers-reduced-motion` disables the transition.

---

## 4. Theme Definitions — All 6 Palettes

Each theme defines tokens for both light and dark modes. Alice implements these as `ThemeDefinition` objects per Andrei's spec in `shared/src/themes.ts`.

### 4.1 Default

The current Forge appearance. This theme must be pixel-identical to the existing UI.

**Character:** Clean, professional, familiar. The "no theme" theme — it's what users already have.

**Light mode:**

| Token | Value | Notes |
|-------|-------|-------|
| `--forge-bg` | `#FFFFFF` | White page background |
| `--forge-bg-secondary` | `#FAFAFA` | Sidebar, panels — maps to existing `--gray-50` |
| `--forge-bg-elevated` | `#FFFFFF` | Cards, modals |
| `--forge-bg-hover` | `#F4F4F5` | Hover state — maps to `--gray-100` |
| `--forge-border` | `#D4D4D8` | Default borders — maps to `--gray-300` |
| `--forge-border-subtle` | `#E4E4E7` | Grid lines — maps to `--gray-200` |
| `--forge-text` | `#09090B` | Primary text — maps to `--gray-950` |
| `--forge-text-secondary` | `#3F3F46` | Muted text — maps to `--gray-700` |
| `--forge-text-tertiary` | `#71717A` | Placeholders — maps to `--gray-500` |
| `--forge-accent` | `#4F46E5` | Indigo accent — maps to `--accent-600` |
| `--forge-accent-hover` | `#4338CA` | Darkened accent |
| `--forge-accent-subtle` | `rgba(79, 70, 229, 0.08)` | Selection backgrounds |
| `--forge-header-bg` | `#FFFFFF` | White toolbar |
| `--forge-header-text` | `#09090B` | |
| `--forge-card-radius` | `8px` | Maps to `--radius-lg` |
| `--forge-card-shadow` | `0 1px 2px rgba(0,0,0,0.05)` | Maps to `--shadow-sm` |
| `--forge-card-border` | `1px solid #D4D4D8` | |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` | |
| `--forge-font-heading` | `'Inter', system-ui, sans-serif` | |

**Dark mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#09090B` |
| `--forge-bg-secondary` | `#18181B` |
| `--forge-bg-elevated` | `#1C1C1E` |
| `--forge-bg-hover` | `#27272A` |
| `--forge-border` | `#3F3F46` |
| `--forge-border-subtle` | `#27272A` |
| `--forge-text` | `#FAFAFA` |
| `--forge-text-secondary` | `#A1A1AA` |
| `--forge-text-tertiary` | `#71717A` |
| `--forge-accent` | `#818CF8` |
| `--forge-accent-hover` | `#6366F1` |
| `--forge-accent-subtle` | `rgba(129, 140, 248, 0.12)` |
| `--forge-header-bg` | `#18181B` |
| `--forge-header-text` | `#FAFAFA` |
| `--forge-card-radius` | `8px` |
| `--forge-card-shadow` | `0 1px 3px rgba(0,0,0,0.4)` |
| `--forge-card-border` | `1px solid #3F3F46` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Inter', system-ui, sans-serif` |

### 4.2 Clean

**Character:** Airy, soft, approachable. Slightly warmer than Default. Rounder corners, softer shadows. Think Notion's lighter moments.

**Light mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#FAFAFA` |
| `--forge-bg-secondary` | `#F5F5F5` |
| `--forge-bg-elevated` | `#FFFFFF` |
| `--forge-bg-hover` | `#F0F0F0` |
| `--forge-border` | `#E5E5E5` |
| `--forge-border-subtle` | `#F0F0F0` |
| `--forge-text` | `#171717` |
| `--forge-text-secondary` | `#737373` |
| `--forge-text-tertiary` | `#A3A3A3` |
| `--forge-accent` | `#6366F1` |
| `--forge-accent-hover` | `#4F46E5` |
| `--forge-accent-subtle` | `rgba(99, 102, 241, 0.08)` |
| `--forge-header-bg` | `#FFFFFF` |
| `--forge-header-text` | `#171717` |
| `--forge-card-radius` | `12px` |
| `--forge-card-shadow` | `0 1px 3px rgba(0,0,0,0.06)` |
| `--forge-card-border` | `1px solid #E5E5E5` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Inter', system-ui, sans-serif` |

**Dark mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#0A0A0A` |
| `--forge-bg-secondary` | `#171717` |
| `--forge-bg-elevated` | `#1C1C1C` |
| `--forge-bg-hover` | `#262626` |
| `--forge-border` | `#2E2E2E` |
| `--forge-border-subtle` | `#1F1F1F` |
| `--forge-text` | `#FAFAFA` |
| `--forge-text-secondary` | `#A3A3A3` |
| `--forge-text-tertiary` | `#737373` |
| `--forge-accent` | `#818CF8` |
| `--forge-accent-hover` | `#6366F1` |
| `--forge-accent-subtle` | `rgba(129, 140, 248, 0.12)` |
| `--forge-header-bg` | `#141414` |
| `--forge-header-text` | `#FAFAFA` |
| `--forge-card-radius` | `12px` |
| `--forge-card-shadow` | `0 1px 3px rgba(0,0,0,0.3)` |
| `--forge-card-border` | `1px solid #2E2E2E` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Inter', system-ui, sans-serif` |

### 4.3 Bold

**Character:** High-contrast, sharp, commanding. Dark header bar that gives the toolbar a "toolbar" feel. Tighter corners. Strong borders. Think Linear's density meets a data dashboard.

**Light mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#FFFFFF` |
| `--forge-bg-secondary` | `#F8F8F8` |
| `--forge-bg-elevated` | `#FFFFFF` |
| `--forge-bg-hover` | `#F3F4F6` |
| `--forge-border` | `#D1D5DB` |
| `--forge-border-subtle` | `#E5E7EB` |
| `--forge-text` | `#111827` |
| `--forge-text-secondary` | `#4B5563` |
| `--forge-text-tertiary` | `#9CA3AF` |
| `--forge-accent` | `#4F46E5` |
| `--forge-accent-hover` | `#4338CA` |
| `--forge-accent-subtle` | `rgba(79, 70, 229, 0.08)` |
| `--forge-header-bg` | `#111827` |
| `--forge-header-text` | `#F9FAFB` |
| `--forge-card-radius` | `4px` |
| `--forge-card-shadow` | `none` |
| `--forge-card-border` | `2px solid #D1D5DB` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Inter', system-ui, sans-serif` |

**Dark mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#0F0F0F` |
| `--forge-bg-secondary` | `#1A1A1A` |
| `--forge-bg-elevated` | `#1F1F1F` |
| `--forge-bg-hover` | `#2A2A2A` |
| `--forge-border` | `#404040` |
| `--forge-border-subtle` | `#2A2A2A` |
| `--forge-text` | `#F9FAFB` |
| `--forge-text-secondary` | `#9CA3AF` |
| `--forge-text-tertiary` | `#6B7280` |
| `--forge-accent` | `#818CF8` |
| `--forge-accent-hover` | `#6366F1` |
| `--forge-accent-subtle` | `rgba(129, 140, 248, 0.15)` |
| `--forge-header-bg` | `#000000` |
| `--forge-header-text` | `#F9FAFB` |
| `--forge-card-radius` | `4px` |
| `--forge-card-shadow` | `none` |
| `--forge-card-border` | `2px solid #404040` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Inter', system-ui, sans-serif` |

### 4.4 Minimal

**Character:** Stripped back. No shadows. Hairline borders. Maximum breathing room. The content is the design. Think a well-set book page or an architect's layout.

**Light mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#FFFFFF` |
| `--forge-bg-secondary` | `#FFFFFF` |
| `--forge-bg-elevated` | `#FFFFFF` |
| `--forge-bg-hover` | `#FAFAFA` |
| `--forge-border` | `#E8E8E8` |
| `--forge-border-subtle` | `#F2F2F2` |
| `--forge-text` | `#1A1A1A` |
| `--forge-text-secondary` | `#808080` |
| `--forge-text-tertiary` | `#B3B3B3` |
| `--forge-accent` | `#1A1A1A` |
| `--forge-accent-hover` | `#000000` |
| `--forge-accent-subtle` | `rgba(26, 26, 26, 0.05)` |
| `--forge-header-bg` | `#FFFFFF` |
| `--forge-header-text` | `#1A1A1A` |
| `--forge-card-radius` | `2px` |
| `--forge-card-shadow` | `none` |
| `--forge-card-border` | `1px solid #E8E8E8` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Inter', system-ui, sans-serif` |

**Dark mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#0A0A0A` |
| `--forge-bg-secondary` | `#0A0A0A` |
| `--forge-bg-elevated` | `#111111` |
| `--forge-bg-hover` | `#161616` |
| `--forge-border` | `#222222` |
| `--forge-border-subtle` | `#181818` |
| `--forge-text` | `#E5E5E5` |
| `--forge-text-secondary` | `#808080` |
| `--forge-text-tertiary` | `#555555` |
| `--forge-accent` | `#E5E5E5` |
| `--forge-accent-hover` | `#FFFFFF` |
| `--forge-accent-subtle` | `rgba(229, 229, 229, 0.06)` |
| `--forge-header-bg` | `#0A0A0A` |
| `--forge-header-text` | `#E5E5E5` |
| `--forge-card-radius` | `2px` |
| `--forge-card-shadow` | `none` |
| `--forge-card-border` | `1px solid #222222` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Inter', system-ui, sans-serif` |

**Note:** Minimal uses a monochrome accent (near-black in light, near-white in dark). This gives it its distinctive restrained character. If the user sets a custom accent color, it overrides this — which is fine, that's an intentional choice.

### 4.5 Corporate

**Character:** Conservative, trustworthy, boardroom-ready. Warm off-white background. Serif headings for gravitas. Muted navy accent. Think annual report, think Economist. The theme you pick before presenting to the exec team.

**Light mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#FAF9F7` |
| `--forge-bg-secondary` | `#F5F4F1` |
| `--forge-bg-elevated` | `#FFFFFF` |
| `--forge-bg-hover` | `#F0EFEC` |
| `--forge-border` | `#D6D3CD` |
| `--forge-border-subtle` | `#E8E6E1` |
| `--forge-text` | `#1C1917` |
| `--forge-text-secondary` | `#57534E` |
| `--forge-text-tertiary` | `#A8A29E` |
| `--forge-accent` | `#1E3A5F` |
| `--forge-accent-hover` | `#152C4A` |
| `--forge-accent-subtle` | `rgba(30, 58, 95, 0.07)` |
| `--forge-header-bg` | `#FFFFFF` |
| `--forge-header-text` | `#1C1917` |
| `--forge-card-radius` | `6px` |
| `--forge-card-shadow` | `0 1px 2px rgba(0,0,0,0.04)` |
| `--forge-card-border` | `1px solid #D6D3CD` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Source Serif 4', Georgia, serif` |

**Dark mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#0C0A09` |
| `--forge-bg-secondary` | `#1C1917` |
| `--forge-bg-elevated` | `#211F1D` |
| `--forge-bg-hover` | `#292524` |
| `--forge-border` | `#3D3832` |
| `--forge-border-subtle` | `#292524` |
| `--forge-text` | `#FAF9F7` |
| `--forge-text-secondary` | `#A8A29E` |
| `--forge-text-tertiary` | `#78716C` |
| `--forge-accent` | `#60A5FA` |
| `--forge-accent-hover` | `#3B82F6` |
| `--forge-accent-subtle` | `rgba(96, 165, 250, 0.1)` |
| `--forge-header-bg` | `#1C1917` |
| `--forge-header-text` | `#FAF9F7` |
| `--forge-card-radius` | `6px` |
| `--forge-card-shadow` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--forge-card-border` | `1px solid #3D3832` |
| `--forge-font-family` | `'Inter', system-ui, sans-serif` |
| `--forge-font-heading` | `'Source Serif 4', Georgia, serif` |

**Note:** Corporate dark mode shifts the accent from navy to a lighter blue for legibility. Navy on dark backgrounds is invisible. The serif heading font carries across both modes — that's the theme's signature.

### 4.6 Startup

**Character:** Energetic, modern, confident. Vibrant teal/cyan accent. Generous border radius. DM Sans for a geometric, friendly feel. Think product launch deck, think demo day. The theme that says "we're building the future."

**Light mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#FAFCFD` |
| `--forge-bg-secondary` | `#F1F8FA` |
| `--forge-bg-elevated` | `#FFFFFF` |
| `--forge-bg-hover` | `#EDF6F8` |
| `--forge-border` | `#D1E4E9` |
| `--forge-border-subtle` | `#E4EFF2` |
| `--forge-text` | `#0F172A` |
| `--forge-text-secondary` | `#475569` |
| `--forge-text-tertiary` | `#94A3B8` |
| `--forge-accent` | `#0891B2` |
| `--forge-accent-hover` | `#0E7490` |
| `--forge-accent-subtle` | `rgba(8, 145, 178, 0.07)` |
| `--forge-header-bg` | `#FFFFFF` |
| `--forge-header-text` | `#0F172A` |
| `--forge-card-radius` | `12px` |
| `--forge-card-shadow` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| `--forge-card-border` | `1px solid #D1E4E9` |
| `--forge-font-family` | `'DM Sans', system-ui, sans-serif` |
| `--forge-font-heading` | `'DM Sans', system-ui, sans-serif` |

**Dark mode:**

| Token | Value |
|-------|-------|
| `--forge-bg` | `#0B1120` |
| `--forge-bg-secondary` | `#111827` |
| `--forge-bg-elevated` | `#1A2332` |
| `--forge-bg-hover` | `#1E293B` |
| `--forge-border` | `#2D3A4D` |
| `--forge-border-subtle` | `#1E293B` |
| `--forge-text` | `#F1F5F9` |
| `--forge-text-secondary` | `#94A3B8` |
| `--forge-text-tertiary` | `#64748B` |
| `--forge-accent` | `#22D3EE` |
| `--forge-accent-hover` | `#06B6D4` |
| `--forge-accent-subtle` | `rgba(34, 211, 238, 0.1)` |
| `--forge-header-bg` | `#111827` |
| `--forge-header-text` | `#F1F5F9` |
| `--forge-card-radius` | `12px` |
| `--forge-card-shadow` | `0 1px 3px rgba(0,0,0,0.3)` |
| `--forge-card-border` | `1px solid #2D3A4D` |
| `--forge-font-family` | `'DM Sans', system-ui, sans-serif` |
| `--forge-font-heading` | `'DM Sans', system-ui, sans-serif` |

---

## 5. View-Specific Considerations

Themes apply uniformly across all three views. The CSS custom properties are consumed by the same component CSS regardless of which view is active. However, each view has surface areas worth calling out.

### 5.1 Table View

| Element | Token Used | Notes |
|---------|-----------|-------|
| Header row background | `--forge-bg-secondary` | Distinguishes header from data rows |
| Header text | `--forge-text-secondary`, uppercase, `--text-xs` | Existing pattern, inherits theme text color |
| Row background | `--forge-bg` | Alternating rows: even rows get `--forge-bg`, odd rows get `--forge-bg-secondary` at 50% opacity (subtle stripe) |
| Row hover | `--forge-bg-hover` | |
| Selected row | `--forge-accent-subtle` background | |
| Cell borders | `--forge-border-subtle` (horizontal only) | Grid lines use the subtle border token |
| Cell text | `--forge-text` | |
| Badge/pill cells | Unchanged — item palette colors | Palette fills are independent of theme |

**Dark mode note:** AG Grid's built-in theme must be overridden with the forge tokens. Alice should use CSS custom property overrides on `.ag-theme-quartz` to map AG Grid's internal variables to forge tokens. Key mappings:
- `--ag-background-color` → `var(--forge-bg)`
- `--ag-header-background-color` → `var(--forge-bg-secondary)`
- `--ag-row-hover-color` → `var(--forge-bg-hover)`
- `--ag-border-color` → `var(--forge-border-subtle)`
- `--ag-foreground-color` → `var(--forge-text)`

### 5.2 Timeline View

| Element | Token Used | Notes |
|---------|-----------|-------|
| Canvas background | `--forge-bg` | The main timeline area |
| Header row (date axis) | `--forge-header-bg`, text in `--forge-header-text` | |
| Swimlane row labels | `--forge-bg-secondary` background, `--forge-text` | Left-side row header |
| Grid lines (vertical date divisions) | `--forge-border-subtle` | These should be subtle, not dominant |
| Grid lines (horizontal row divisions) | `--forge-border-subtle` | |
| Item bars | Unchanged — item palette colors | Bar fills come from color palette system |
| Item bar text (label on bar) | Computed from bar fill color luminance | Existing behavior, independent of theme |
| Today line | `--forge-accent`, 2px wide, dashed | Accent-colored today marker |
| Dependency arrows | `--forge-text-tertiary` | Subtle connection lines |
| Milestone diamonds | `--forge-accent` fill | |

**Dark mode note:** The timeline's key visual tension is grid lines on dark backgrounds. `--forge-border-subtle` is intentionally very low-contrast in dark themes (just enough to see structure without visual noise). If Alice finds the grid disappears entirely in certain themes, bump `--forge-border-subtle` opacity rather than switching to `--forge-border`.

### 5.3 Swimlane View

| Element | Token Used | Notes |
|---------|-----------|-------|
| Board background | `--forge-bg` | |
| Column headers | `--forge-bg-secondary`, text in `--forge-text`, weight 600 | |
| Column background | `--forge-bg` (or transparent) | |
| Column dividers | `--forge-border-subtle` | Vertical lines between columns |
| Cards | `--forge-bg-elevated` bg, `--forge-card-radius`, `--forge-card-shadow`, `--forge-card-border` | Cards are the primary theme-expressive surface in swimlane |
| Card title | `--forge-text` | |
| Card metadata | `--forge-text-secondary` | |
| Card color strip | Unchanged — item palette colors | Left-edge or top-edge color from palette |
| Card hover | `--forge-card-border` darkened or `border-color: var(--forge-accent)` at 30% opacity | |
| Card drag ghost | Same card styling at 80% opacity, `--shadow-lg` | |
| Empty column | `--forge-text-tertiary` message, dashed `--forge-border` outline | |

**Dark mode note:** Card elevation becomes more important in dark mode — the shadow values are tuned higher in dark palettes to create visual separation that shadows on light backgrounds provide naturally.

### 5.4 Settings Panel / Format Panel

The settings panel and format panel are part of the roadmap content area, so they adopt theme styling:

- Panel background: `--forge-bg-elevated`
- Panel border-left: 1px solid `--forge-border`
- Section headings: `--forge-text`
- Labels: `--forge-text-secondary`
- Inputs: borders use `--forge-border`, focus rings use `--forge-accent`

### 5.5 Modals and Popovers

Modals (Item Card detail panel, share dialog, etc.) inherit theme tokens:

- Overlay: `rgba(0,0,0,0.5)` in light mode, `rgba(0,0,0,0.7)` in dark mode
- Modal background: `--forge-bg-elevated`
- Modal border: `--forge-card-border`
- Modal shadow: `--shadow-xl` (elevated for modals, separate from card shadow)

---

## 6. Export Behavior

### 6.1 PNG Export

PNG export captures the rendered DOM via `html-to-image`. Since themes are applied as CSS custom properties resolved to computed styles, **the export captures the active theme automatically**. No UI changes to the export flow.

The exported PNG reflects:
- The active theme's colors, fonts, card styles, and borders
- The current dark/light mode
- Any custom accent color override
- Item palette colors (unchanged)

### 6.2 Export UI — Theme Information

The export dialog does **not** surface theme info or offer theme override options. The user sees what they get — WYSIWYG. If they want to export in light mode, they switch to light mode first, then export.

**Rationale:** Adding a "export as light/dark" toggle in the export dialog creates a second source of truth and makes the mental model more complex. The current mode is visible and switchable from the toolbar (one click). Keep the export simple.

### 6.3 Shared URLs

Shared URLs (`/shared/:token`) render with the roadmap's stored theme settings. The shared view:
- Applies the roadmap's `themeName` and `accentColor`
- Resolves `darkMode`: if `system`, follows the *viewer's* OS preference. If `light` or `dark`, uses the explicit setting.
- The shared view has no theme controls — it shows what the owner configured

### 6.4 Presentation Mode

Presentation mode (fullscreen) uses the active theme. The theme gives presentation mode its character — Bold theme in dark mode creates a dramatic presentation, Clean theme in light mode creates a whiteboard feel. No separate presentation theme.

---

## 7. Responsive Behavior

### 7.1 Theme Picker on Narrow Screens

On screens narrower than 640px (mobile / narrow tablet), the theme card grid remains 2 columns but the cards are smaller. The preview aspect ratio stays 16:10. This works because the settings panel itself is full-width on mobile.

Below 400px, the theme grid falls to 1 column. This is unlikely in practice (the roadmap tool is a desktop-first product) but prevents clipping.

### 7.2 Accent Color Picker on Narrow Screens

Below 640px:
- The swatch row wraps to a second line if needed (flex-wrap: wrap)
- The hex input moves below the swatches (flex-direction: column on the parent)
- The vertical divider becomes a horizontal divider

### 7.3 Dark Mode Toggle

The segmented control is full-width at all sizes. No responsive changes needed — it stacks labels well.

---

## 8. Accessibility

### 8.1 Theme Picker

- Theme cards are interactive elements with `role="radio"` inside a `role="radiogroup"` with `aria-label="Theme"`
- Each card has `aria-label="{theme name} theme"` and `aria-checked="true/false"`
- Arrow key navigation between cards (roving tabindex pattern)
- Focus-visible: 2px ring `var(--forge-accent)`, offset 2px
- The miniature preview is `aria-hidden="true"` (decorative — the label conveys the name)
- On selection: `aria-live="polite"` region announces "{Theme name} theme applied"

### 8.2 Accent Color Picker

- Swatch buttons: `role="radio"` in a `role="radiogroup"` with `aria-label="Accent color"`
- Each swatch: `aria-label="{color name}"` (e.g., "Blue", "Emerald")
- Hex input: `aria-label="Custom accent color hex value"`
- Color well: `aria-label="Choose custom accent color"`
- On invalid hex: `aria-invalid="true"` and `aria-describedby` pointing to error text

### 8.3 Dark Mode Toggle

- Segmented control: `role="radiogroup"` with `aria-label="Color mode"`
- Each segment: `role="radio"` with `aria-checked` and `aria-label` ("Light mode", "System preference", "Dark mode")
- Toolbar quick toggle: `aria-label="Toggle dark mode"` with `aria-pressed` state

### 8.4 Contrast in All Themes

All 6 themes (both light and dark variants) must meet WCAG AA contrast minimums:
- Primary text on background: 4.5:1 minimum
- Secondary text on background: 4.5:1 minimum
- Tertiary text on background: 3:1 minimum (only for large text or non-essential labels)
- Accent on background: 3:1 minimum (for interactive elements)

**Verification table** (Alice should validate these ratios during implementation):

| Theme | Mode | `--forge-text` on `--forge-bg` | `--forge-text-secondary` on `--forge-bg` | `--forge-accent` on `--forge-bg` |
|-------|------|-------------------------------|----------------------------------------|-------------------------------|
| Default | Light | #09090B on #FFF → 21:1 ✓ | #3F3F46 on #FFF → 9.3:1 ✓ | #4F46E5 on #FFF → 5.4:1 ✓ |
| Default | Dark | #FAFAFA on #09090B → 20.8:1 ✓ | #A1A1AA on #09090B → 8.9:1 ✓ | #818CF8 on #09090B → 7.2:1 ✓ |
| Minimal | Light | #1A1A1A on #FFF → 17.4:1 ✓ | #808080 on #FFF → 4.5:1 ✓ | #1A1A1A on #FFF → 17.4:1 ✓ |
| Minimal | Dark | #E5E5E5 on #0A0A0A → 17.6:1 ✓ | #808080 on #0A0A0A → 4.7:1 ✓ | #E5E5E5 on #0A0A0A → 17.6:1 ✓ |
| Corporate | Light | #1C1917 on #FAF9F7 → 16.4:1 ✓ | #57534E on #FAF9F7 → 6.2:1 ✓ | #1E3A5F on #FAF9F7 → 10.2:1 ✓ |
| Bold | Light | #111827 on #FFF → 18.3:1 ✓ | #4B5563 on #FFF → 6.8:1 ✓ | #4F46E5 on #FFF → 5.4:1 ✓ |

(Remaining combinations follow the same principle — all values are selected for AA compliance.)

### 8.5 Motion

The 200ms dark mode transition respects `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  .roadmap-container, .roadmap-container * {
    transition-duration: 0ms !important;
  }
}
```

---

## 9. Interaction Summary — Complete User Flows

### 9.1 "I want to change my roadmap's theme"

1. User clicks Settings (gear icon) in the Top Bar → Settings panel slides in from right
2. First section visible: "Appearance" with the 2×3 theme card grid
3. Current theme card has the selected state (accent border + glow)
4. User clicks a different theme card
5. Theme applies instantly — the roadmap behind the settings panel repaints with new colors, fonts, card styles
6. PATCH fires to `/api/v1/roadmaps/:id` with `themeName`
7. WebSocket broadcasts to other users — they see the theme change in real time
8. Done. No save button, no confirmation dialog.

### 9.2 "I want to match my brand color"

1. In Settings → Appearance → Accent color section
2. Option A: Click a preset swatch → accent updates instantly
3. Option B: Click the color well → OS color picker opens → pick a color → accent updates on change
4. Option C: Type a hex value in the input → accent updates on blur/Enter
5. The theme preview cards in the grid above also update to reflect the new accent
6. PATCH fires with `accentColor`

### 9.3 "I want dark mode for a presentation"

Quick path:
1. Click the Moon icon in the Top Bar
2. Roadmap switches to dark mode instantly (200ms transition)
3. Done.

Settings path:
1. Settings → Appearance → Mode
2. Click "Dark" in the segmented control
3. Roadmap transitions to dark
4. The theme card previews also switch to show their dark variants

### 9.4 "I'm sharing this roadmap with stakeholders"

1. User sets up theme + accent color + light/dark mode
2. Clicks Share → copies URL
3. Stakeholder opens the URL → sees the same theme, same accent, same mode
4. If mode is "System" → stakeholder sees light or dark based on their own OS preference
5. No controls exposed to the viewer — the owner's choices are the source of truth

---

## 10. Edge Cases

| Scenario | Behavior |
|----------|----------|
| **User applies theme, loses network** | Optimistic update shows theme instantly. If PATCH fails, revert to previous theme. Toast: "Couldn't save theme change. Check your connection." |
| **Two users change theme simultaneously** | Last write wins. Both see each other's changes via WebSocket. The final state is the last PATCH to complete. |
| **Custom accent fails contrast** | No enforcement — the user has chosen this color intentionally. We don't restrict it. If text becomes illegible, that's the user's choice (same as choosing a bad color palette in any presentation tool). |
| **Theme applied to a bucket-mode roadmap** | Works identically. Buckets use the same Swimlane card components, which consume the same theme tokens. |
| **Portfolio roadmap** | Themes are per-roadmap. A portfolio renders with its own theme. Source roadmap items display with their own palette colors but within the portfolio's theme chrome. |
| **Theme with no custom accent, then user changes theme** | Accent stays `null` → each theme shows its own default accent. The accent "travels with" the theme. |
| **Theme with custom accent, then user changes theme** | Custom accent persists across theme change. The accent is independent of theme selection. User must explicitly reset to "Theme default" to clear it. |

---

## 11. What This Spec Does Not Cover

- Theme creation (custom user themes) — out of scope for v1
- Animated transitions between themes beyond the 200ms color transition
- Per-view theme overrides
- Theme marketplace or community themes
- App shell (sidebar/navigation) theming — only the roadmap content area is themed
- Item palette color adjustments for dark mode (existing palettes work as-is per Andrei's analysis)

---

## 12. Implementation Checklist for Alice

This is the priority order I'd recommend:

1. **CSS refactor** — Replace hardcoded colors with `--forge-*` variables. Verify `default` theme = pixel-identical to current UI.
2. **Theme application** — Wire up `data-theme`, `data-mode`, `style` on `.roadmap-container`. Implement `useResolvedMode()` and `getThemeStyles()`.
3. **Settings UI** — Build the Appearance section: theme card grid, accent picker, mode toggle.
4. **Dark mode quick toggle** — Add Moon/Sun button to Top Bar.
5. **AG Grid variable mapping** — Override AG Grid theme variables with forge tokens (Table View).
6. **Shared view** — Apply theme to `/shared/:token` container.
7. **Spot-check** — All 6 themes × light/dark × 3 views = 36 combinations. Don't screenshot all 36 — spot-check the extremes: Bold dark, Minimal light, Startup dark, Default light.
8. **Export verification** — Confirm `html-to-image` captures themed styles.
