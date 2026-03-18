# Forge v2 — Command Palette (Cmd+K): Design Spec

**Author:** Robert (Product Designer)
**Date:** March 18, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Work Item:** RT-38b
**Dependencies:** `docs/forge-command-palette-requirements.md` (Thomas), `docs/forge-command-palette-tech-approach.md` (Andrei), `docs/roadmap-tool-v2-themes-design-spec.md` (themes design system)

---

## Overview

This spec defines the visual design, interaction behavior, and accessibility details for the command palette in Forge. The palette is the central hub for keyboard-driven navigation and action execution. It follows a well-established pattern (VS Code, Linear, Notion) so users should feel at home immediately.

The design goal: the palette should feel like it was always there. It uses the same type scale, spacing tokens, color system, and elevation conventions as the rest of Forge. It sits above everything without feeling disconnected from the product.

**Design principles for this feature:**
1. Speed above all -- every element is optimized for scanning and fast decision-making
2. Familiarity -- follow the Cmd+K convention users already know from other tools
3. Restraint -- no decoration, no gradients, no embellishments. Content-only.
4. Theme-aware -- the palette respects the active Forge theme (light, dark, all 6 theme presets)

---

## 1. Palette Modal

### 1.1 Dimensions & Positioning

```
.command-palette__overlay          --> Full-screen backdrop
  .command-palette                 --> The palette container
    .command-palette__input-wrap   --> Search row (icon + input + clear)
    .command-palette__results      --> Scrollable results area
    .command-palette__footer       --> Hint row
```

**Overlay:**
- `position: fixed; inset: 0`
- `background: rgba(0, 0, 0, 0.25)` (light mode) / `rgba(0, 0, 0, 0.50)` (dark mode)
- `z-index: 60` (above all modals at 50, below toasts at 100 -- per Andrei's z-index scale)
- `display: flex; align-items: flex-start; justify-content: center`
- `padding-top: 20vh` -- palette sits in the upper third of the viewport, not dead center. This is the same vertical position as ConfirmDialog. The upper placement keeps the palette close to the user's visual focus (toolbar area) and leaves room for results to grow downward.

**Palette container:**
- `width: 560px`
- `max-width: calc(100vw - 32px)` -- safe on narrow viewports
- `max-height: 480px` -- prevents the palette from consuming the full viewport
- `background: var(--forge-bg-elevated, var(--white))`
- `border: 1px solid var(--forge-border, var(--gray-200))`
- `border-radius: var(--radius-xl)` (12px) -- slightly rounder than cards to signal "floating element"
- `box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0, 0, 0, 0.03)` -- elevated shadow with a subtle ring for definition
- `overflow: hidden`
- `display: flex; flex-direction: column`

### 1.2 Why 560px

560px is wide enough to show a full command label plus a keyboard shortcut badge without truncation, but narrow enough to feel lightweight. Reference: VS Code uses 600px, Linear uses 560px, Notion uses 480px. 560px is the middle ground that accommodates our longer command labels ("Switch to Timeline view") while preserving the "quick lookup" feel.

---

## 2. Search Input

### 2.1 Input Row Layout

```
.command-palette__input-wrap
  .command-palette__search-icon    --> Lucide Search icon
  .command-palette__input          --> The text input
  .command-palette__clear-btn      --> X button (shown when query is non-empty)
```

**Input wrap:**
- `display: flex; align-items: center`
- `height: 52px` -- generous height for a primary interaction surface
- `padding: 0 var(--space-4)` (0 16px)
- `border-bottom: 1px solid var(--forge-border-subtle, var(--gray-200))`
- `gap: var(--space-3)` (12px)

**Search icon:**
- Lucide `Search` icon, 18px, `color: var(--forge-text-tertiary, var(--gray-400))`
- `flex-shrink: 0`

**Input field:**
- `flex: 1; min-width: 0`
- `height: 100%`
- `border: none; outline: none; background: transparent`
- `font-family: var(--forge-font-family, var(--font-sans))`
- `font-size: var(--text-lg)` (16px) -- larger than body text for readability and to signal "primary input"
- `font-weight: 400`
- `color: var(--forge-text, var(--gray-950))`
- `caret-color: var(--forge-accent, var(--accent-600))`
- Placeholder: `"Type a command or search..."` in `var(--forge-text-tertiary, var(--gray-400))`

**Clear button (conditional -- only when `query.length > 0`):**
- `width: 24px; height: 24px`
- `border-radius: var(--radius-sm)` (4px)
- `display: flex; align-items: center; justify-content: center`
- `background: transparent; border: none; cursor: pointer`
- Lucide `X` icon, 14px, `color: var(--forge-text-tertiary, var(--gray-500))`
- Hover: `background: var(--forge-bg-hover, var(--gray-100))`
- `focus-visible`: `outline: 2px solid var(--forge-accent, var(--accent-600)); outline-offset: 2px`
- On click: clear query, return focus to input

---

## 3. Result Groups

### 3.1 Group Order (Fixed)

Results are grouped by category in this fixed order:

1. **Recent** -- last 5 accessed roadmaps (only when query is empty or matches)
2. **Navigation** -- view switching, go-to commands
3. **Actions** -- create, toggle, export, share
4. **Settings** -- theme, dark mode, accent color
5. **Items** -- roadmap items matching the search query (only when query >= 2 chars)

Groups with zero matching results are omitted entirely -- no empty group headers.

### 3.2 Group Header

```
.command-palette__group-header
```

- `height: 28px` -- compact, not a full row
- `padding: var(--space-1) var(--space-4) var(--space-1)` (4px 16px 4px)
- `display: flex; align-items: center`
- `font-size: var(--text-xs)` (11px)
- `font-weight: 500`
- `color: var(--forge-text-tertiary, var(--gray-500))`
- `text-transform: uppercase`
- `letter-spacing: 0.05em`
- `user-select: none`
- `role="presentation"` -- screen readers skip this, navigating directly between option elements

Group headers are not interactive and are not included in the keyboard navigation index. Arrow keys skip past them.

### 3.3 Spacing Between Groups

- First group has no top spacing (sits directly below the input border)
- Subsequent groups have `margin-top: var(--space-1)` (4px) above their header
- This creates a subtle visual break between categories without heavy dividers

---

## 4. Result Items

### 4.1 Anatomy

```
.command-palette__result
  .command-palette__result-icon       --> Action icon (optional)
  .command-palette__result-label      --> Command name
  .command-palette__result-shortcut   --> Keyboard shortcut badge (optional)
```

**Result row:**
- `height: 40px` -- 8px grid aligned, generous touch target
- `padding: 0 var(--space-4)` (0 16px)
- `display: flex; align-items: center`
- `gap: var(--space-3)` (12px)
- `cursor: pointer`
- `border-radius: var(--radius-md)` (6px) -- rounded corners within the list for the selected/hover state
- `margin: 0 var(--space-2)` (0 8px) -- inset from palette edge so hover/selected state has visual breathing room

**Result icon:**
- 16px Lucide icon
- `color: var(--forge-text-secondary, var(--gray-500))`
- `flex-shrink: 0; width: 16px`
- When no icon: space is collapsed (no empty gap)

**Result label:**
- `flex: 1; min-width: 0`
- `font-size: var(--text-sm)` (13px)
- `font-weight: 400`
- `color: var(--forge-text, var(--gray-950))`
- `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`

**Shortcut badge:**
- `flex-shrink: 0`
- Each key rendered as a separate `<kbd>` element
- `display: inline-flex; align-items: center; justify-content: center`
- `height: 22px; min-width: 22px; padding: 0 var(--space-2)` (0 8px)
- `background: var(--forge-bg-secondary, var(--gray-100))`
- `border: 1px solid var(--forge-border-subtle, var(--gray-200))`
- `border-radius: var(--radius-sm)` (4px)
- `font-family: var(--font-mono)`
- `font-size: 10px` -- intentionally small, these are reference hints not primary content
- `font-weight: 500`
- `color: var(--forge-text-secondary, var(--gray-500))`
- `line-height: 1`

### 4.2 Icon Mapping

Each command category uses a consistent icon from Lucide:

| Command | Icon |
|---------|------|
| Switch to Timeline view | `GanttChart` |
| Switch to Board view | `Columns3` |
| Switch to Table view | `Table2` |
| Go to roadmap settings | `Settings` |
| Go to home | `Home` |
| Create new item | `Plus` |
| Create new milestone | `Diamond` |
| Toggle filter panel | `Filter` |
| Export to PNG | `Download` |
| Share roadmap | `Share2` |
| Toggle presentation mode | `Presentation` |
| Change theme | `Palette` |
| Toggle dark mode | `Moon` / `Sun` (reflects current state) |
| Change accent color | `Paintbrush` |
| Recent roadmaps | `Clock` |
| Items (search results) | `FileText` |

### 4.3 States

| State | Visual |
|-------|--------|
| **Default** | No background. Icon: `--forge-text-secondary`. Label: `--forge-text`. |
| **Hover** | `background: var(--forge-bg-hover, var(--gray-100))`. Transition: `background 100ms ease`. |
| **Selected (keyboard focus)** | `background: var(--forge-accent-subtle, rgba(79, 70, 229, 0.08))`. Label: `var(--forge-text)`. Icon: `var(--forge-accent, var(--accent-600))`. Border-left: none (no accent bar -- keep it clean). |
| **Active (mousedown)** | `background: var(--forge-accent-subtle)` at 1.5x opacity. Brief visual feedback before the palette closes. |

**Mouse interaction:** hovering a result moves the visual selection to that item (`onMouseEnter` updates `selectedIndex`). This keeps mouse and keyboard navigation in sync -- the user always sees one and only one highlighted result.

### 4.4 Results List Container

```
.command-palette__results
```

- `flex: 1; overflow-y: auto`
- `padding: var(--space-2) 0` (8px 0) -- top/bottom breathing room
- `overscroll-behavior: contain` -- prevent scroll chaining to the page behind
- Custom scrollbar styling (webkit):
  - `scrollbar-width: thin`
  - `scrollbar-color: var(--forge-border, var(--gray-300)) transparent`
  - Webkit: 6px wide, `border-radius: 3px`, track transparent, thumb `var(--forge-border)`

---

## 5. Footer Hint Row

### 5.1 Layout

```
.command-palette__footer
  .command-palette__footer-hints    --> flex row of hint groups
```

A thin row at the bottom of the palette showing keyboard navigation hints.

- `height: 36px`
- `padding: 0 var(--space-4)` (0 16px)
- `border-top: 1px solid var(--forge-border-subtle, var(--gray-200))`
- `display: flex; align-items: center; gap: var(--space-4)` (16px)
- `background: var(--forge-bg-secondary, var(--gray-50))`
- `border-radius: 0 0 var(--radius-xl) var(--radius-xl)` -- matches palette container bottom corners

### 5.2 Hint Content

Three hint groups, each showing a key indicator + action label:

1. `[ArrowUp/Down icon]` `Navigate` -- up/down arrow glyphs
2. `[Enter icon]` `Select` -- return/enter glyph
3. `[Esc]` `Close`

**Hint styling:**
- `display: flex; align-items: center; gap: var(--space-1)` (4px)
- Key indicator: same `<kbd>` styling as shortcut badges (section 4.1) but at 18px min-width
- Label: `font-size: var(--text-xs)` (11px), `color: var(--forge-text-tertiary, var(--gray-400))`, weight 400

---

## 6. Keyboard Navigation

### 6.1 Visual Indicators

The currently focused result is highlighted with the **Selected** state from section 4.3. Only one result is highlighted at a time. The highlight follows these rules:

- On open: first result is selected (index 0)
- ArrowDown: moves selection down by one. At the last result, stops (does not wrap).
- ArrowUp: moves selection up by one. At the first result, stops (does not wrap).
- Group headers are skipped in the navigation index -- arrow keys jump from the last item of one group directly to the first item of the next group.

### 6.2 Scroll Behavior

When keyboard navigation moves the selection beyond the visible area of the results list:

- Use `element.scrollIntoView({ block: 'nearest' })` on the selected result element
- This scrolls the minimum distance needed to bring the item into view -- scrolling down when navigating past the bottom edge, scrolling up when navigating past the top edge
- No smooth scrolling -- instant scroll for keyboard navigation. Smooth scrolling adds perceived latency during rapid arrow-key navigation.

### 6.3 Selection Reset

When the query changes (user types or deletes characters), the selection resets to index 0 (first result). This prevents the selection from pointing at a stale position in a different result set.

---

## 7. Empty & No Results States

### 7.1 Default State (Empty Query)

When the palette opens with an empty query, show all enabled commands grouped by category, plus the Recent roadmaps group. This is the "browse all" state.

No special empty-state UI needed here -- the full command list serves as the default view.

### 7.2 No Results

When the query matches zero commands and zero items:

```
.command-palette__no-results
```

- `padding: var(--space-8) var(--space-4)` (32px 16px) -- generous vertical padding
- `text-align: center`
- `display: flex; flex-direction: column; align-items: center; gap: var(--space-2)` (8px)

**Primary text:**
- `No results for "{query}"`
- `font-size: var(--text-sm)` (13px)
- `font-weight: 500`
- `color: var(--forge-text-secondary, var(--gray-500))`

**Secondary text:**
- `Try a different search term`
- `font-size: var(--text-xs)` (11px)
- `font-weight: 400`
- `color: var(--forge-text-tertiary, var(--gray-400))`

No icon in the empty state. Keep it text-only -- the palette is small enough that an illustration would feel oversized.

---

## 8. Shortcut Cheat Sheet (`?` Modal)

### 8.1 Trigger

Pressing `?` when no input is focused and no modal is open opens the shortcut cheat sheet. This is a reference overlay, not a command palette -- it lists all available keyboard shortcuts organized by category.

### 8.2 Modal Layout

```
.cheat-sheet__overlay              --> Same overlay as ConfirmDialog
  .cheat-sheet                     --> The modal container
    .cheat-sheet__header           --> Title + close button
    .cheat-sheet__body             --> Shortcut grid
```

**Overlay:**
- Same pattern as ConfirmDialog: `position: fixed; inset: 0; background: rgba(0, 0, 0, 0.15); z-index: 50`
- `display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh`

**Modal container:**
- `width: 480px`
- `max-width: calc(100vw - 32px)`
- `max-height: 70vh`
- `background: var(--forge-bg-elevated, var(--white))`
- `border-radius: var(--radius-lg)` (8px)
- `box-shadow: var(--shadow-xl)`
- `overflow: hidden; display: flex; flex-direction: column`
- `animation: modalIn 200ms ease-out` -- same keyframe as ConfirmDialog

### 8.3 Header

- `display: flex; align-items: center; justify-content: space-between`
- `padding: var(--space-5) var(--space-5) 0` (20px 20px 0)

**Title:** `"Keyboard Shortcuts"` -- `font-size: var(--text-lg)` (16px), weight 600, `color: var(--forge-text, var(--gray-950))`

**Close button:** Same pattern as ConfirmDialog/BugReportModal close button:
- `width: 28px; height: 28px`
- `border-radius: var(--radius-md)`
- Lucide `X` icon, 16px, `color: var(--forge-text-tertiary, var(--gray-400))`
- Hover: `background: var(--forge-bg-hover, var(--gray-100)); color: var(--forge-text-secondary, var(--gray-700))`
- `focus-visible: outline: 2px solid var(--forge-accent); outline-offset: 2px`

### 8.4 Shortcut Grid

```
.cheat-sheet__body
  .cheat-sheet__section            --> One per category
    .cheat-sheet__section-title    --> Category name
    .cheat-sheet__shortcuts        --> List of shortcut rows
      .cheat-sheet__shortcut       --> One row per shortcut
        .cheat-sheet__shortcut-label
        .cheat-sheet__shortcut-keys
```

**Body:**
- `padding: var(--space-4) var(--space-5) var(--space-5)` (16px 20px 20px)
- `overflow-y: auto`

**Section:**
- `margin-bottom: var(--space-5)` (20px) -- last section has no bottom margin

**Section title:**
- Same style as palette group headers: `font-size: var(--text-xs)` (11px), weight 500, `color: var(--forge-text-tertiary, var(--gray-500))`, uppercase, `letter-spacing: 0.05em`
- `margin-bottom: var(--space-2)` (8px)

**Shortcut row:**
- `display: flex; align-items: center; justify-content: space-between`
- `height: 32px`
- `padding: 0`

**Label:** `font-size: var(--text-sm)` (13px), weight 400, `color: var(--forge-text, var(--gray-950))`

**Keys:** Same `<kbd>` badge styling as the palette shortcut badges (section 4.1). For compound shortcuts like `Cmd+K`, render each key in its own badge with a `+` separator in `var(--forge-text-tertiary)`.

### 8.5 Shortcut Sections & Content

**General:**
| Label | Keys |
|-------|------|
| Open command palette | `Cmd` + `K` (Mac) / `Ctrl` + `K` (Win/Linux) |
| Keyboard shortcuts | `?` |

**Navigation:**
| Label | Keys |
|-------|------|
| Timeline view | `1` |
| Board view | `2` |
| Table view | `3` |
| Roadmap settings | `S` |
| Home | `H` |

**Actions:**
| Label | Keys |
|-------|------|
| New item | `N` |
| New milestone | `M` |
| Toggle filters | `F` |
| Export to PNG | `E` |
| Presentation mode | `P` |

**Settings:**
| Label | Keys |
|-------|------|
| Change theme | `T` |
| Toggle dark mode | `D` |

### 8.6 Dismiss

- `Escape` key closes the cheat sheet
- Clicking the backdrop (overlay) closes the cheat sheet
- Clicking the close button closes the cheat sheet
- On close: focus returns to the previously focused element

---

## 9. Dark Mode

The palette is fully theme-aware. It uses `--forge-*` CSS custom properties throughout, with fallbacks to the base Forge token values. This means the palette automatically adapts to:

- All 6 theme presets (Default, Clean, Bold, Minimal, Corporate, Startup)
- Light and dark modes
- Custom accent colors

### 9.1 Token Mapping

| Palette Element | CSS Variable | Light Fallback | Dark Fallback |
|-----------------|-------------|----------------|---------------|
| Backdrop | Hardcoded | `rgba(0,0,0,0.25)` | `rgba(0,0,0,0.50)` |
| Container bg | `--forge-bg-elevated` | `#FFFFFF` | `#1C1C1E` (Default dark) |
| Container border | `--forge-border` | `#D4D4D8` | `#3F3F46` |
| Input text | `--forge-text` | `#09090B` | `#FAFAFA` |
| Placeholder | `--forge-text-tertiary` | `#71717A` | `#71717A` |
| Group header | `--forge-text-tertiary` | `#71717A` | `#71717A` |
| Result label | `--forge-text` | `#09090B` | `#FAFAFA` |
| Result icon | `--forge-text-secondary` | `#3F3F46` | `#A1A1AA` |
| Result hover bg | `--forge-bg-hover` | `#F4F4F5` | `#27272A` |
| Selected bg | `--forge-accent-subtle` | `rgba(79,70,229,0.08)` | `rgba(129,140,248,0.12)` |
| Selected icon | `--forge-accent` | `#4F46E5` | `#818CF8` |
| Kbd badge bg | `--forge-bg-secondary` | `#FAFAFA` | `#18181B` |
| Kbd badge border | `--forge-border-subtle` | `#E4E4E7` | `#27272A` |
| Kbd badge text | `--forge-text-secondary` | `#3F3F46` | `#A1A1AA` |
| Footer bg | `--forge-bg-secondary` | `#FAFAFA` | `#18181B` |
| Footer border | `--forge-border-subtle` | `#E4E4E7` | `#27272A` |
| Input caret | `--forge-accent` | `#4F46E5` | `#818CF8` |
| Shadow | Hardcoded | `--shadow-xl` | Deeper shadow with higher opacity |
| No results text | `--forge-text-secondary` | `#3F3F46` | `#A1A1AA` |

### 9.2 Dark Mode Backdrop

The backdrop opacity increases in dark mode (`0.50` vs `0.25`) because dark UI backgrounds need a denser overlay to create clear visual separation between the palette and the content behind it. Without this adjustment, the palette appears to float without an anchor.

### 9.3 Dark Mode Shadow

In dark mode, shadows need higher opacity to remain visible against dark backgrounds:

```css
/* Light mode (default) */
box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0, 0, 0, 0.03);

/* Dark mode */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
```

The dark mode shadow uses a faint white border ring (`rgba(255, 255, 255, 0.05)`) instead of a dark one, which creates a subtle edge definition against dark backgrounds.

### 9.4 Implementation Pattern

Use the existing `data-mode` attribute on the roadmap container to conditionally apply dark mode overrides. The palette should read the resolved mode from the theme system, not manage its own dark mode state.

```css
/* Dark mode overrides */
[data-mode="dark"] .command-palette {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4),
              0 8px 10px -6px rgba(0, 0, 0, 0.3),
              0 0 0 1px rgba(255, 255, 255, 0.05);
}
```

Since the palette is mounted at the AppShell level (above the roadmap container), it needs to query the current dark mode state directly. Use the same `useResolvedMode()` hook from the themes implementation and apply a `data-mode` attribute on the palette's overlay element.

---

## 10. Responsive Behavior

### 10.1 Desktop-Only Feature

The command palette is a keyboard-driven power-user feature. On mobile and tablet, it is not rendered. The palette should be guarded by a desktop-only check:

- Render the palette component only when viewport width >= 1024px (`@media (min-width: 1024px)`)
- The `Cmd+K` shortcut naturally does not fire on touch devices (no physical keyboard)
- If a user connects an external keyboard to a tablet, the 1024px guard still prevents rendering on viewports too narrow for the 560px palette to look good

### 10.2 Narrow Desktop (1024px - 1279px)

No changes to palette width or behavior. The `max-width: calc(100vw - 32px)` ensures it fits safely. At 1024px viewport, the palette (560px) occupies about 55% of the width, which is appropriate for a modal overlay.

### 10.3 Shortcut Cheat Sheet

The cheat sheet follows the same desktop-only rule. At 480px width, it fits comfortably at 1024px+ viewports.

---

## 11. Animation

### 11.1 Open Animation

The palette uses the same `modalIn` keyframe as ConfirmDialog and TemplatePicker for consistency:

```css
@keyframes paletteIn {
  from {
    opacity: 0;
    transform: scale(0.98) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.command-palette {
  animation: paletteIn 150ms ease-out;
}
```

**Duration: 150ms.** Slightly faster than the 200ms used for ConfirmDialog. The palette should feel snappy -- it is opened dozens of times per session, so even 50ms of saved animation time matters for perceived speed.

**Easing: ease-out.** Decelerating motion -- arrives quickly, settles gently.

**Transform: scale(0.98) + translateY(-8px).** The slight upward origin makes it feel like the palette "drops into place" from the top, which matches the user's mental model of summoning a tool from above.

### 11.2 Backdrop Fade

```css
.command-palette__overlay {
  animation: backdropIn 150ms ease-out;
}

@keyframes backdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

The backdrop fades in simultaneously with the palette. Same duration and easing.

### 11.3 Close Animation

If using the existing `useClosingAnimation` hook from the codebase:

```css
@keyframes paletteOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.98) translateY(-4px);
  }
}
```

**Duration: 100ms.** Close is faster than open. The user has made a decision and wants the palette gone immediately.

**Easing: ease-in.** Accelerating out.

If `useClosingAnimation` is not available or adds complexity, skip the close animation entirely. The palette can unmount instantly -- there is no jarring visual artifact from an instant close on a 560px floating element. The open animation is the one that matters.

### 11.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .command-palette,
  .command-palette__overlay {
    animation: none;
  }
}
```

All animations are disabled. The palette appears and disappears instantly.

---

## 12. Accessibility

### 12.1 ARIA Roles

The palette follows the [ARIA Combobox with Listbox Popup pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/):

| Element | Role / Attribute | Value |
|---------|-----------------|-------|
| Palette container | `role` | `combobox` |
| Palette container | `aria-expanded` | `true` (always, while mounted) |
| Palette container | `aria-haspopup` | `listbox` |
| Palette container | `aria-owns` | `command-palette-list` |
| Search input | `role` | `searchbox` |
| Search input | `aria-autocomplete` | `list` |
| Search input | `aria-controls` | `command-palette-list` |
| Search input | `aria-activedescendant` | ID of the currently selected result |
| Search input | `aria-label` | `Command palette` |
| Results list | `role` | `listbox` |
| Results list | `id` | `command-palette-list` |
| Results list | `aria-label` | `{n} results` (dynamic) |
| Each result | `role` | `option` |
| Each result | `id` | `cmd-result-{index}` |
| Each result | `aria-selected` | `true` for highlighted item, `false` for others |
| Group headers | `role` | `presentation` |

### 12.2 Screen Reader Announcements

A visually-hidden live region announces result count changes:

```html
<div class="sr-only" aria-live="polite" aria-atomic="true">
  {results.length} results
</div>
```

- Update on every query change (debounced by the same render cycle -- no extra debounce needed since filtering is synchronous)
- When zero results: announces "No results"
- When palette opens: announces initial count, e.g., "15 results"

**`.sr-only` class** (same as used in PresentationMode):
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 12.3 Focus Management

**On open:**
1. Store `document.activeElement` as the restore target
2. Move focus to the search input (`autoFocus` on the `<input>`)
3. The palette is a focus trap -- Tab should cycle between the input and the close button (if one exists), not escape to content behind the backdrop

**On close (Escape, backdrop click, or command execution):**
1. Unmount the palette
2. Restore focus to the element stored in step 1

This follows the same pattern as the existing `useFocusTrap` hook in the codebase.

### 12.4 Keyboard Interaction Summary

| Key | Action |
|-----|--------|
| `Cmd+K` / `Ctrl+K` | Open palette (when no modal is stacked) |
| `Escape` | Close palette, restore focus |
| `ArrowDown` | Move selection to next result (skip group headers) |
| `ArrowUp` | Move selection to previous result (skip group headers) |
| `Enter` | Execute selected command, close palette |
| `Backspace` / typing | Filter results, reset selection to index 0 |

### 12.5 Contrast Verification

All text in the palette meets WCAG AA contrast minimums against the palette background:

| Element | Color | Background | Ratio | Pass |
|---------|-------|-----------|-------|------|
| Input text (light) | `#09090B` | `#FFFFFF` | 21:1 | AA |
| Input text (dark) | `#FAFAFA` | `#1C1C1E` | 15.4:1 | AA |
| Result label (light) | `#09090B` | `#FFFFFF` | 21:1 | AA |
| Result label (dark) | `#FAFAFA` | `#1C1C1E` | 15.4:1 | AA |
| Group header (light) | `#71717A` | `#FFFFFF` | 5.0:1 | AA |
| Group header (dark) | `#71717A` | `#1C1C1E` | 3.8:1 | AA (large/non-essential) |
| Placeholder (light) | `#71717A` | `#FFFFFF` | 5.0:1 | AA |
| Kbd badge text (light) | `#3F3F46` | `#FAFAFA` | 9.1:1 | AA |
| Kbd badge text (dark) | `#A1A1AA` | `#18181B` | 5.3:1 | AA |

Group headers in dark mode at 3.8:1 are acceptable because they are non-essential decorative labels (screen readers skip them via `role="presentation"`). The actual command labels all exceed 4.5:1.

---

## 13. Complete CSS Reference

For Alice's implementation reference, here are the complete styles in CSS Module format. This covers all states and responsive behavior described above.

### 13.1 `CommandPalette.module.css`

```css
/* Overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
  z-index: 60;
  animation: backdropIn 150ms ease-out;
}

[data-mode="dark"] .overlay {
  background: rgba(0, 0, 0, 0.50);
}

/* Palette container */
.palette {
  width: 560px;
  max-width: calc(100vw - 32px);
  max-height: 480px;
  background: var(--forge-bg-elevated, var(--white));
  border: 1px solid var(--forge-border, var(--gray-200));
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: paletteIn 150ms ease-out;
}

/* Input area */
.inputWrap {
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--forge-border-subtle, var(--gray-200));
  gap: var(--space-3);
  flex-shrink: 0;
}

.searchIcon {
  color: var(--forge-text-tertiary, var(--gray-400));
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--forge-font-family, var(--font-sans));
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--forge-text, var(--gray-950));
  caret-color: var(--forge-accent, var(--accent-600));
}

.input::placeholder {
  color: var(--forge-text-tertiary, var(--gray-400));
}

.clearBtn {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--forge-text-tertiary, var(--gray-500));
  flex-shrink: 0;
}

.clearBtn:hover {
  background: var(--forge-bg-hover, var(--gray-100));
}

.clearBtn:focus-visible {
  outline: 2px solid var(--forge-accent, var(--accent-600));
  outline-offset: 2px;
}

/* Results */
.results {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--forge-border, var(--gray-300)) transparent;
}

.results::-webkit-scrollbar {
  width: 6px;
}

.results::-webkit-scrollbar-track {
  background: transparent;
}

.results::-webkit-scrollbar-thumb {
  background: var(--forge-border, var(--gray-300));
  border-radius: 3px;
}

/* Group header */
.groupHeader {
  height: 28px;
  padding: var(--space-1) var(--space-4) var(--space-1);
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--forge-text-tertiary, var(--gray-500));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  user-select: none;
}

.groupHeader + .groupHeader {
  margin-top: var(--space-1);
}

/* Result item */
.result {
  height: 40px;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  margin: 0 var(--space-2);
  transition: background 100ms ease;
}

.result:hover {
  background: var(--forge-bg-hover, var(--gray-100));
}

.resultSelected {
  background: var(--forge-accent-subtle, rgba(79, 70, 229, 0.08));
}

.resultSelected .resultIcon {
  color: var(--forge-accent, var(--accent-600));
}

.result:active {
  background: var(--forge-accent-subtle, rgba(79, 70, 229, 0.12));
}

.resultIcon {
  color: var(--forge-text-secondary, var(--gray-500));
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.resultLabel {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--forge-text, var(--gray-950));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resultShortcut {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-width: 22px;
  padding: 0 var(--space-2);
  background: var(--forge-bg-secondary, var(--gray-100));
  border: 1px solid var(--forge-border-subtle, var(--gray-200));
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--forge-text-secondary, var(--gray-500));
  line-height: 1;
}

/* Footer */
.footer {
  height: 36px;
  padding: 0 var(--space-4);
  border-top: 1px solid var(--forge-border-subtle, var(--gray-200));
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--forge-bg-secondary, var(--gray-50));
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  flex-shrink: 0;
}

.footerHint {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.footerHintLabel {
  font-size: var(--text-xs);
  color: var(--forge-text-tertiary, var(--gray-400));
  font-weight: 400;
}

/* No results */
.noResults {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.noResultsPrimary {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--forge-text-secondary, var(--gray-500));
}

.noResultsSecondary {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--forge-text-tertiary, var(--gray-400));
}

/* Screen reader only */
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Animations */
@keyframes paletteIn {
  from {
    opacity: 0;
    transform: scale(0.98) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes backdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes paletteOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.98) translateY(-4px);
  }
}

.paletteClosing {
  animation: paletteOut 100ms ease-in forwards;
}

.overlayClosing {
  animation: backdropOut 100ms ease-in forwards;
}

@keyframes backdropOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .palette,
  .overlay,
  .paletteClosing,
  .overlayClosing {
    animation: none;
  }

  .result {
    transition: none;
  }
}

/* Desktop only — palette is not rendered below 1024px */
@media (max-width: 1023px) {
  .overlay {
    display: none;
  }
}
```

### 13.2 `ShortcutCheatSheet.module.css`

```css
/* Overlay — same pattern as ConfirmDialog */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 50;
}

[data-mode="dark"] .overlay {
  background: rgba(0, 0, 0, 0.40);
}

.modal {
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: 70vh;
  background: var(--forge-bg-elevated, var(--white));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modalIn 200ms ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-5) 0;
}

.title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--forge-text, var(--gray-950));
}

.closeBtn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--forge-text-tertiary, var(--gray-400));
  background: transparent;
  border: none;
  cursor: pointer;
}

.closeBtn:hover {
  background: var(--forge-bg-hover, var(--gray-100));
  color: var(--forge-text-secondary, var(--gray-700));
}

.closeBtn:focus-visible {
  outline: 2px solid var(--forge-accent, var(--accent-600));
  outline-offset: 2px;
}

.body {
  padding: var(--space-4) var(--space-5) var(--space-5);
  overflow-y: auto;
}

.section {
  margin-bottom: var(--space-5);
}

.section:last-child {
  margin-bottom: 0;
}

.sectionTitle {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--forge-text-tertiary, var(--gray-500));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.shortcut {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
}

.shortcutLabel {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--forge-text, var(--gray-950));
}

.shortcutKeys {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-width: 22px;
  padding: 0 var(--space-2);
  background: var(--forge-bg-secondary, var(--gray-100));
  border: 1px solid var(--forge-border-subtle, var(--gray-200));
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--forge-text-secondary, var(--gray-500));
  line-height: 1;
}

.kbdSeparator {
  font-size: var(--text-xs);
  color: var(--forge-text-tertiary, var(--gray-400));
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .modal {
    animation: none;
  }
}

/* Desktop only */
@media (max-width: 1023px) {
  .overlay {
    display: none;
  }
}
```

---

## 14. Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Palette opens with no roadmap loaded (homepage)** | Only global commands shown: "Go to home" (already there, but shown for consistency), recent roadmaps. Navigation commands that require a roadmap are hidden via `enabled()` returning false. |
| **All commands disabled** | Show the "No results" state with message "No commands available". This should not happen in practice (at minimum, "Go to home" is always enabled). |
| **Very long item name in search results** | Truncated with `text-overflow: ellipsis`. The 560px width minus icon and padding leaves approximately 460px for the label -- enough for 60+ characters at `--text-sm`. |
| **Rapid typing** | Filtering runs synchronously on every keystroke (< 1ms per Andrei's analysis). No debounce needed. Selection resets to index 0 on each filter pass. |
| **User clicks a disabled/hidden command** | Disabled commands are filtered out before rendering. The user never sees them. |
| **Palette already open, user presses Cmd+K** | Close the palette. Cmd+K is a toggle. |
| **User is typing in a text input, presses Cmd+K** | Palette opens. `Cmd+K` is a modified key combination, so it works even during text input. Other single-key shortcuts are suppressed during text input. |
| **Theme changes while palette is open** | Palette updates immediately via CSS custom property resolution. No re-render needed -- the CSS variables cascade automatically. |
| **Accent color changes** | Same as theme -- CSS variables update, palette reflects the new accent instantly for selected state, caret, and focus rings. |

---

## 15. What This Spec Does Not Cover

- Multi-step command flows (selecting "Change theme" then picking from a sub-list) -- out of scope per requirements
- Command history, favorites, or frecency ranking -- out of scope
- AI/natural language commands -- out of scope
- Custom user-defined shortcuts -- out of scope
- The action registry data structure or handler logic -- that is in Andrei's tech approach
- Server-side search -- all search is client-side per tech approach

---

## 16. Implementation Checklist for Alice

Build order recommendation:

1. **`CommandPalette.module.css`** -- copy the CSS from section 13.1. Verify tokens resolve correctly by mounting an empty palette.
2. **Palette shell** -- overlay + container + input + empty results area. Get the modal rendering, opening, and closing working first.
3. **Result rendering** -- group headers + result rows. Use hardcoded test data initially.
4. **Keyboard navigation** -- arrow keys, enter, escape. Verify scroll-into-view works.
5. **Search filtering** -- wire up the action registry. Verify filtering updates on every keystroke.
6. **Item search** -- add the React Query cache lookup for roadmap items (query >= 2 chars).
7. **Footer hints** -- add the keyboard hint row.
8. **Shortcut cheat sheet** -- separate component, triggered by `?`.
9. **Dark mode** -- verify the palette looks correct in all 6 themes x light/dark. The CSS variables should handle most of it. Check the backdrop opacity and shadow overrides.
10. **Animation** -- add open/close keyframes. Verify `prefers-reduced-motion` disables them.
11. **ARIA** -- add all roles, labels, and the live region. Test with VoiceOver or NVDA.
12. **Focus management** -- verify focus trap on open and focus restoration on close.
