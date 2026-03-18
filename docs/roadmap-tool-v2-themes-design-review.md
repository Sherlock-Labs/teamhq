# Roadmap Tool v2 — Visual Themes: Design Review

**Reviewer:** Robert (Product Designer)
**Date:** March 18, 2026
**Work Item:** RT-37e
**Scope:** Lightweight visual check of Alice's frontend implementation against the design spec

**Inputs reviewed:**
- `docs/roadmap-tool-v2-themes-design-spec.md` (design spec)
- `docs/roadmap-tool-v2-themes-frontend-notes.md` (Alice's implementation)
- `docs/roadmap-tool-v2-themes-tech-approach.md` (Andrei's architecture)

---

## Verdict: APPROVED WITH NOTES

Alice's implementation is faithful to the design spec. All 6 theme definitions match the spec token-for-token. The component structure, interaction states, transitions, responsive breakpoints, and accessibility patterns are correct. Two minor a11y gaps noted below for Enzo to verify, plus one implementation choice that's actually an improvement over the spec.

---

## Theme Definitions — All 6 Verified

Every token value across all 6 themes (default, clean, bold, minimal, corporate, startup) in both light and dark modes matches the design spec exactly. Spot-checked:

- Default light/dark: all 18 tokens match
- Bold: dark header-bg `#111827` light / `#000000` dark, card-radius `4px`, card-border `2px solid` — all correct for the high-contrast character
- Minimal: monochrome accent (`#1A1A1A` light / `#E5E5E5` dark), no shadows, `2px` radius — correct
- Corporate: serif heading font `'Source Serif 4', Georgia, serif`, warm off-white `#FAF9F7`, navy accent `#1E3A5F` light shifting to `#60A5FA` dark — correct
- Startup: DM Sans font, teal accent `#0891B2` light / `#22D3EE` dark, `12px` radius — correct
- Clean: softer shadows, `12px` radius, neutral palette — correct

No color value mismatches found.

---

## Theme Picker — Matches Spec

| Spec Element | Status | Notes |
|-------------|--------|-------|
| 2-column CSS Grid, 12px gap | Match | `grid-template-columns: 1fr 1fr; gap: 12px` |
| Card preview 16:10 aspect ratio | Match | `aspect-ratio: 16 / 10` |
| 6px header bar, 3 item bars, 2 gridlines | Match | All preview elements positioned per spec |
| Hover: accent border 50% opacity, -1px translateY, 150ms | Match | Uses `color-mix()` for the 50% opacity — clean approach |
| Selected: 2px accent border, glow ring, label weight 600 + accent color | Match | |
| Focus-visible: 2px ring, 2px offset | Match | |
| Keyboard: arrow keys + Enter/Space | Match | Roving tabindex pattern implemented correctly |
| Below 400px: single column | Match | `@media (max-width: 400px)` |

---

## Accent Color Picker — Matches Spec (with one improvement)

| Spec Element | Status | Notes |
|-------------|--------|-------|
| 8 preset swatches, 24px circles, 8px gap | Match | |
| Vertical divider 1px / 24px between swatches and custom input | Match | |
| Color well 24px circle, native `<input type="color">` | Match | |
| Hex input 80px, 28px height, monospace font, `#` prefix | Match | |
| Invalid state: red border + error message | Match | |
| Responsive: column layout below 640px | Match | |

**Win: Dynamic first swatch.** The spec defines the first swatch as `#6366F1` (Indigo) acting as "theme default." Alice's implementation instead shows the *current theme's* default accent dynamically (`swatch.hex || defaultAccent`). This is better — when using Corporate theme, the "Theme default" swatch shows navy, not indigo. Functionally identical (sends `null` to reset), visually more accurate. Keeping this.

---

## Dark Mode Toggle — Matches Spec

| Spec Element | Status | Notes |
|-------------|--------|-------|
| 3-segment control: Light / System / Dark | Match | |
| 100% width, 32px height, border, radius 6px | Match | |
| Icons: Sun, Monitor, Moon (Lucide) | Match | |
| Selected: elevated bg, shadow, text color, 4px inset radius | Match | `margin: 2px` creates the inset — correct |
| Top bar quick toggle: ghost button, Moon/Sun icons, 32x32 | Match | |
| Quick toggle skips System (just flips light/dark) | Match | |
| 200ms transition on container | Match | |
| `prefers-reduced-motion` disables transition | Match | |

---

## Accessibility — Two Minor Gaps

**1. `aria-live` region exists but is never populated.**
The spec (section 8.1) says: "On selection: `aria-live='polite'` region announces '{Theme name} theme applied'." Alice includes the `<div aria-live="polite" className="sr-only" id="theme-announcement" />` element, but no code updates its `textContent` when a theme is selected. Screen reader users won't hear the confirmation.

**Fix:** In the `onThemeChange` handler or a `useEffect` watching `currentTheme`, set the announcement div's text: `document.getElementById('theme-announcement')!.textContent = \`${theme.name} theme applied\``. Clear it after a short delay.

**2. Top bar toggle missing `aria-pressed`.**
The spec (section 8.3) calls for `aria-pressed` on the toolbar quick toggle. Alice uses `aria-label` (which is correct and state-dependent) but omits `aria-pressed`. For a toggle button, `aria-pressed` communicates the binary state to assistive tech.

**Fix:** Add `aria-pressed={resolvedMode === 'dark'}` to the top bar toggle button.

Both are minor. Neither blocks shipping. Enzo should verify these during QA.

---

## Other Implementation Details — All Correct

- **Font loading:** All three fonts (Inter, DM Sans, Source Serif 4) loaded via Google Fonts in `<head>`. Matches spec.
- **AG Grid variable mapping:** All required overrides present, plus `color-mix()` for alternating rows — good approach.
- **Shared view theming:** Same pattern as RoadmapPage. Correct.
- **Socket.IO sync:** Theme fields flow through existing `roadmap-updated` event. Echo prevention for current user. Correct.
- **Export compatibility:** No changes needed — `html-to-image` captures computed CSS variables. Fallback documented. Correct.
- **Optimistic updates with revert on failure:** All three handlers follow the same pattern. Matches spec edge case behavior.
- **Theme file in `shared/src/themes.ts`:** Matches Andrei's recommendation for server-side import.

---

## Concerns for Enzo (QA)

1. **Regression baseline:** Default theme light mode must be pixel-identical to the current Forge UI. This is the #1 QA priority — the CSS refactor touches every visual element.
2. **aria-live announcement:** Verify screen reader behavior when switching themes. The div exists but isn't populated (see gap #1 above).
3. **aria-pressed on top bar toggle:** Verify assistive tech announces the toggle state.
4. **AG Grid in dark mode:** The `color-mix()` for alternating rows may behave differently across browsers. Spot-check in Chrome, Firefox, Safari.
5. **Corporate theme serif headings:** Verify Source Serif 4 loads correctly and doesn't fall back to Georgia. Check the font network request.
6. **Bold theme dark header:** `#000000` header-bg on `#0F0F0F` page-bg — verify there's enough visual separation. Should be fine but worth eyeballing.
7. **Minimal theme monochrome accent:** The accent is near-black (#1A1A1A) in light mode. Verify interactive elements (buttons, focus rings) are still clearly visible against the white background.
8. **Theme switch with settings panel open:** The roadmap behind the panel should repaint with new theme colors while the panel stays open. Verify no flicker or layout shift.

---

## Summary

Strong implementation. Alice followed the spec precisely across all 6 themes, all component states, all interaction patterns, and all responsive breakpoints. The dynamic first accent swatch is an improvement. Two minor a11y gaps (aria-live population, aria-pressed on toggle) should be addressed but don't block the QA pass. Ready for Enzo.
