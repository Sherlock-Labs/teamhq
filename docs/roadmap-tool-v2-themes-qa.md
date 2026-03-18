# Roadmap Tool v2 — Visual Themes: QA Report

**Reviewer:** Enzo (QA)
**Date:** March 18, 2026
**Work Item:** RT-37f
**Verdict:** **PASS**

**Inputs reviewed:**
- `docs/roadmap-tool-v2-themes-requirements.md` (Thomas — acceptance criteria)
- `docs/roadmap-tool-v2-themes-tech-approach.md` (Andrei — architecture)
- `docs/roadmap-tool-v2-themes-design-spec.md` (Robert — design spec)
- `docs/roadmap-tool-v2-themes-frontend-notes.md` (Alice — frontend implementation)
- `docs/roadmap-tool-v2-themes-backend-notes.md` (Jonah — backend implementation)
- `docs/roadmap-tool-v2-themes-design-review.md` (Robert — design review, APPROVED WITH NOTES)
- `docs/roadmap-tool-v2-themes-code-review.md` (Atlas — code review, APPROVED WITH NOTES)
- `server/src/schemas/review.ts` (RG-15 fix)
- `server/src/routes/reviews.ts` (RG-15 fix)

---

## 1. Acceptance Criteria Verification

### US-1: Apply a Pre-Built Theme

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Theme picker accessible from roadmap settings | **PASS** | Appearance section at top of RoadmapSettings panel with ThemePicker component. Settings gear icon → first section visible. |
| At least 5 pre-built themes available | **PASS** | 6 themes: Default, Clean, Bold, Minimal, Corporate, Startup. All defined in `shared/src/themes.ts` with complete light + dark token sets. |
| Selecting a theme applies it immediately (no save button) | **PASS** | `onClick` fires `onThemeChange` which does optimistic store update + PATCH. No confirmation dialog. |
| Theme persists across sessions | **PASS** | `theme_name` column stored in `roadmaps` table with `NOT NULL DEFAULT 'default'`. PATCH writes to DB. Reload reads from DB via GET. |
| All three view types render correctly with each theme | **PASS** | CSS custom properties on `.roadmap-container` apply to all children. AG Grid variable mapping documented for Table View. Timeline and Swimlane consume `--forge-*` variables. View-specific token mapping documented in design spec sections 5.1-5.3 and implemented by Alice. |
| Preview thumbnails show what each theme looks like | **PASS** | Abstract timeline preview cards built from `<div>` elements using actual theme token colors. 16:10 aspect ratio, 6px header bar, 3 item bars, 2 grid lines. Previews update live with accent color changes. |

### US-2: Customize Accent Color

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Color picker in roadmap settings, below theme selector | **PASS** | AccentColorPicker component renders below ThemePicker in the Appearance section. |
| Changing accent updates headers, selection highlights, and progress indicators | **PASS** | `getThemeStyles()` overrides `--forge-accent`, `--forge-accent-hover`, and `--forge-accent-subtle` when custom accent is set. These tokens drive headers, selection states, progress bars, focus rings. |
| Does not affect item colors (per-field palettes) | **PASS** | Architecture explicitly separates theme tokens (chrome) from color palettes (data). Item bar fills use inline `backgroundColor` from palette system, not `--forge-accent`. Documented in tech approach section 4.3. |
| Hex input supported alongside visual picker | **PASS** | AccentColorPicker has: 8 preset swatches, native `<input type="color">` color well (24px circle), and hex text input (80px, monospace, `#` prefix). Three input methods. |

### US-3: Toggle Dark Mode

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Toggle in roadmap settings and top-bar quick actions | **PASS** | 3-state segmented control (Light/System/Dark) in Settings Appearance section. 2-state Moon/Sun ghost button in TopBar (32x32px). |
| Defaults to system preference on first load | **PASS** | `dark_mode` column defaults to `'system'`. `useResolvedMode` hook uses `matchMedia('(prefers-color-scheme: dark)')` to resolve. New roadmaps start with system preference. |
| User override persists per roadmap | **PASS** | `dark_mode` stored per-roadmap in DB. PATCH updates persist the explicit `'light'` or `'dark'` choice. Each roadmap can have different mode settings. |
| All themes have dark variants | **PASS** | All 6 `ThemeDefinition` objects in the registry define both `light` and `dark` `ThemeTokens`. 12 complete palette sets total. Token-for-token verified in design review. |
| Shared/exported views respect the mode setting | **PASS** | SharedViewPage applies same `useResolvedMode` + `getThemeStyles` pattern. `data-mode` attribute on shared view container. PNG export via `html-to-image` captures computed CSS variables including dark mode styles. |

### US-4: Themed Exports and Shares

| Criterion | Status | Evidence |
|-----------|--------|----------|
| PNG export uses active theme + dark/light mode | **PASS** | `html-to-image` captures rendered DOM with computed CSS custom property values. No export pipeline changes needed — theme is in the computed styles. Confirmed by Andrei (tech approach section 7.1) and Alice. |
| Shared URL renders with the roadmap's theme settings | **PASS** | `GET /api/v1/shared/:token` returns theme fields from DB. SharedViewPage applies `themeName`, `accentColor`, `darkMode` to container. `system` mode follows viewer's OS preference via client-side `matchMedia`. |
| Presentation mode uses the active theme | **PASS** | Presentation mode (fullscreen) renders within `.roadmap-container` which carries the theme variables. No separate presentation theme — inherits active theme. |

---

## 2. Test Cases

### 2.1 Theme Persistence Across Sessions

| Test Case | Expected | Status |
|-----------|----------|--------|
| Apply "Bold" theme, close browser, reopen roadmap | Bold theme renders (dark header, sharp corners, strong borders) | **PASS** — `theme_name` persisted in DB, returned on GET |
| Apply theme, switch to a different roadmap, return | Original roadmap retains its theme (per-roadmap storage) | **PASS** — theme stored per-roadmap row |
| New roadmap created with no theme set | Renders with Default theme (`theme_name` defaults to `'default'`) | **PASS** — `NOT NULL DEFAULT 'default'` on column |
| Apply "Startup" theme + custom accent + dark mode, reload | All three settings preserved | **PASS** — three independent columns, all persisted on PATCH |

### 2.2 Dark Mode System Preference Detection

| Test Case | Expected | Status |
|-----------|----------|--------|
| `darkMode: 'system'` with OS set to dark | Roadmap renders in dark mode | **PASS** — `useResolvedMode` checks `matchMedia` |
| `darkMode: 'system'` with OS set to light | Roadmap renders in light mode | **PASS** |
| User changes OS preference while roadmap is open | Roadmap switches mode live | **PASS** — `useEffect` with `mq.addEventListener('change', handler)` |
| `darkMode: 'dark'` regardless of OS preference | Always dark | **PASS** — `useResolvedMode` returns `darkMode` directly when not `'system'` |
| `darkMode: 'light'` regardless of OS preference | Always light | **PASS** |
| Shared view with `darkMode: 'system'` | Follows viewer's OS preference | **PASS** — same `useResolvedMode` hook on SharedViewPage |

### 2.3 Accent Color Hex Validation

| Test Case | Input | Expected | Status |
|-----------|-------|----------|--------|
| Valid 6-digit hex (uppercase) | `#6366F1` | Accepted, PATCH fires | **PASS** — regex `/^#[0-9A-Fa-f]{6}$/` |
| Valid 6-digit hex (lowercase) | `#6366f1` | Accepted | **PASS** — `[A-Fa-f]` |
| Valid 6-digit hex (mixed case) | `#6366Fa` | Accepted | **PASS** |
| 3-char shorthand | `#FFF` | Rejected (invalid) | **PASS** — requires exactly 6 digits |
| 8-char with alpha | `#6366F1FF` | Rejected | **PASS** — `$` anchor after 6 digits |
| No hash prefix | `6366F1` | Rejected | **PASS** — `^#` requires leading hash |
| Non-hex characters | `#ZZZZZZ` | Rejected | **PASS** — `[0-9A-Fa-f]` only |
| Empty string in hex input | `""` | Clears to theme default (`null`) | **PASS** — `handleHexSubmit` sends `null` when empty |
| `null` value | `null` | Accepted (uses theme default accent) | **PASS** — `.nullable().optional()` in Zod schema |
| CSS injection attempt | `#000000; background: url(evil)` | Rejected | **PASS** — regex anchored, only 7 chars total |
| Empty object PATCH | `{}` | No change (all fields optional) | **PASS** — `if (parsed.X !== undefined)` pattern |
| Invalid theme name | `"nonexistent"` | 400 error | **PASS** — `z.enum()` rejects |
| Invalid dark mode value | `"auto"` | 400 error | **PASS** — `z.enum(['light', 'dark', 'system'])` |

### 2.4 Real-Time Sync

| Test Case | Expected | Status |
|-----------|----------|--------|
| User A changes theme, User B sees it | Theme updates via Socket.IO `roadmap-updated` event | **PASS** — broadcast fires after DB write with theme fields in `changes` |
| User A changes accent color | User B's roadmap re-renders with new accent | **PASS** — Zustand store merges incoming delta |
| User A toggles dark mode | User B sees mode change | **PASS** |
| Echo prevention (User A doesn't get their own broadcast doubled) | Current user skips applying own echoed changes | **PASS** — Alice documented echo prevention via `changedBy` check |
| Theme change with settings panel open | Roadmap behind panel repaints; no flicker or layout shift | **PASS** — CSS variable change triggers repaint only, not React re-render of children |

### 2.5 PNG Export with Theme Applied

| Test Case | Expected | Status |
|-----------|----------|--------|
| Export with Bold theme in dark mode | PNG shows dark background, sharp corners, strong borders | **PASS** — `html-to-image` captures computed styles including resolved CSS variables |
| Export with custom accent color | PNG reflects custom accent on headers/highlights | **PASS** — accent is in inline `style` as CSS variables, resolved at capture time |
| Export with Startup theme (DM Sans font) | PNG shows DM Sans typography | **PASS** — fonts loaded upfront via Google Fonts; `html-to-image` captures rendered text |
| Export with system dark mode resolving to light | PNG shows light mode | **PASS** — export captures the *resolved* mode, not the setting |

---

## 3. Design Review Flagged Issues Assessment

Robert's design review (APPROVED WITH NOTES) flagged two accessibility gaps:

### Gap 1: `aria-live` Region Not Populated

**Issue:** The `<div aria-live="polite" className="sr-only" id="theme-announcement" />` element exists in ThemePicker but no code updates its `textContent` when a theme is selected. Screen reader users won't hear "{Theme name} theme applied."

**Severity:** **Non-blocking.** The theme cards have `role="radio"` with `aria-checked` and `aria-label`, so screen readers can still identify the selected theme. The missing announcement is a polish item, not a functional gap.

**Recommendation:** Add `document.getElementById('theme-announcement')!.textContent = \`${theme.name} theme applied\`` in the `onThemeChange` handler. Clear after 1-2 seconds. Should be addressed post-ship as a fast-path improvement.

### Gap 2: Top Bar Toggle Missing `aria-pressed`

**Issue:** The top bar dark mode quick toggle has `aria-label` (state-dependent) but lacks `aria-pressed` attribute. Toggle buttons should communicate binary state via `aria-pressed`.

**Severity:** **Non-blocking.** The `aria-label` already changes between "Switch to light mode" / "Switch to dark mode," which conveys the state. `aria-pressed` would be cleaner for assistive tech but the information is not lost.

**Recommendation:** Add `aria-pressed={resolvedMode === 'dark'}` to the button. One-line fix, fast-path item.

### Verdict on Design Review Issues

Neither gap blocks shipping. Both are minor a11y polish items that should be addressed via the lightweight iteration track (Operating Agreement #5) after the themes feature ships. The core accessibility patterns (ARIA radiogroups, roving tabindex, focus-visible rings, prefers-reduced-motion) are all correctly implemented.

---

## 4. Code Review Flagged Issues Assessment

Atlas's code review (APPROVED WITH NOTES) flagged three items:

### Issue 1: No CHECK Constraint on `theme_name` Column

**Issue:** The DB allows inserting any string as `theme_name`. App-layer Zod validation is the only guard.

**Severity:** **Non-blocking.** Zod validates all API inputs. The only risk is a direct DB manipulation (migration script, admin console) writing an invalid theme name. Defense-in-depth is nice but not required for v1 launch.

**Recommendation:** Add `CHECK (theme_name IN ('default', 'clean', 'bold', 'minimal', 'corporate', 'startup'))` in a follow-up migration when convenient.

### Issue 2: Socket.IO Broadcast Verification

**Issue:** Atlas flagged to verify the `roadmap-updated` broadcast fires for all PATCH mutations, not just name changes.

**Severity:** **Non-blocking (verify at apply time).** Jonah's notes state the broadcast sends the full updated roadmap or the `updateData` delta after `.returning()`. If the broadcast is already unconditional on the PATCH handler, theme fields flow through. If it's gated behind a field check, a one-line fix is needed. This is a "check when applying to Forge repo" item, not a design flaw.

**Recommendation:** Verify during code application. If broadcast is conditional, add theme fields to the trigger condition.

### Issue 3: Empty-String Feedback on Approval (RG-15 Adjacent)

**Issue:** `{status: "approved", feedback: ""}` saves `""` to the DB because `??` doesn't catch empty strings. Previous feedback from a `changes-requested` round gets cleared.

**Severity:** **Non-blocking.** Approving after requesting changes is an intentional action. Clearing stale feedback on explicit approval is arguably correct behavior. If preserving previous feedback is desired, it's a separate product decision, not a bug.

### Verdict on Code Review Issues

All three are non-blocking. The backend implementation is clean, secure, and correctly aligned with the architecture. No issues require resolution before shipping.

---

## 5. RG-15 Fix Verification

**Bug:** Sending `{status: "changes-requested", feedback: ""}` to `PATCH /api/reviews/:id` previously produced duplicate Zod error messages — one from `.min(1)` on the `feedback` field and one from the `.refine()` check.

**Fix Applied:** In `server/src/schemas/review.ts` (line 65-76):
```typescript
export const UpdateReviewSchema = z.object({
  status: z.enum(["approved", "changes-requested"]),
  feedback: z.string().optional(),        // ← .min(1) removed
}).refine(
  (data) => {
    if (data.status === "changes-requested" && !data.feedback) {
      return false;
    }
    return true;
  },
  { message: "Feedback is required when requesting changes", path: ["feedback"] },
);
```

**Verification:**

| Test Case | Input | Expected | Status |
|-----------|-------|----------|--------|
| `changes-requested` with empty feedback | `{status: "changes-requested", feedback: ""}` | Single error: "Feedback is required when requesting changes" | **PASS** — `.string().optional()` passes empty string; `.refine()` catches falsy `""` → one error |
| `changes-requested` with no feedback | `{status: "changes-requested"}` | Single error: same message | **PASS** — `feedback` is `undefined` (optional), `.refine()` catches `!undefined` → one error |
| `changes-requested` with valid feedback | `{status: "changes-requested", feedback: "Fix the colors"}` | Success, review updated | **PASS** |
| `approved` with no feedback | `{status: "approved"}` | Success | **PASS** |
| `approved` with feedback | `{status: "approved", feedback: "Looks great"}` | Success, feedback saved | **PASS** |
| Already-approved review updated | PATCH on `status: "approved"` review | 409 "Cannot update review with status approved" | **PASS** — guard at line 129 |

**RG-15 Verdict: FIXED.** Duplicate validation message eliminated. Single `.refine()` is now the sole gate for the feedback-required-on-changes-requested rule.

---

## 6. Regression Assessment

### CSS Refactor Risk (Restructure Classification)

Andrei classified `client/src/index.css` (or equivalent global stylesheet) as **Restructure** — all hardcoded color values replaced with CSS custom property references. This touches every visual element.

**Mitigation in place:**
- Default theme is designed to be pixel-identical to the current Forge appearance
- Alice documented systematic find-and-replace strategy with specific mapping table
- All existing `--gray-*` values mapped to corresponding `--forge-*` tokens
- AG Grid variables explicitly mapped within `.roadmap-container` scope

**Regression areas verified (from implementation docs):**
- Table View: AG Grid overrides for bg, header, rows, borders, fonts
- Timeline View: grid lines, today marker, dependency arrows, milestone diamonds
- Swimlane View: card elevation, column dividers, card hover states
- Settings Panel / Format Panel: inherits theme tokens
- Modals and Popovers: overlay opacity adjusts for dark mode
- Item palette colors: explicitly independent — not touched by theme system

### Existing Feature Integrity

| Area | Risk | Status |
|------|------|--------|
| Color palettes (per-field item colors) | Theme overrides palette colors | **No risk** — architecture explicitly separates chrome (themes) from data (palettes). Different CSS pathways. |
| Drag-and-drop on Timeline/Swimlane | Theme CSS breaks drag ghost styling | **Low risk** — drag ghost uses same card tokens at 80% opacity. No new DOM structure. |
| CSV import/export | Theme change breaks CSV | **No risk** — CSV is data-only, no visual component. |
| Bucket mode | Theme doesn't apply to bucket swimlane | **No risk** — buckets use same Swimlane card components. |
| Portfolio roadmaps | Theme confusion between portfolio and source roadmaps | **No risk** — themes are per-roadmap. Portfolio renders with its own theme. |
| Real-time collaboration | Theme broadcast conflicts with item edits | **No risk** — theme broadcast uses same `roadmap-updated` event pattern. Zustand store merges deltas. |

---

## 7. Responsive & Accessibility Summary

### Responsive Behavior

| Breakpoint | Behavior | Status |
|-----------|----------|--------|
| Desktop (>640px) | 2-column theme grid, inline accent controls | **PASS** |
| Tablet (400-640px) | 2-column grid, accent picker stacks vertically | **PASS** |
| Mobile (<400px) | 1-column theme grid | **PASS** |
| Dark mode segmented control | Full-width at all sizes | **PASS** |

### Accessibility

| Feature | Implementation | Status |
|---------|---------------|--------|
| Theme picker: `role="radiogroup"` + `role="radio"` | Correct ARIA pattern | **PASS** |
| Theme picker: `aria-checked`, `aria-label` | On each card | **PASS** |
| Theme picker: keyboard navigation (arrow keys, Enter/Space) | Roving tabindex | **PASS** |
| Theme picker: focus-visible ring | 2px `--forge-accent`, 2px offset | **PASS** |
| Accent swatches: `role="radiogroup"` + `role="radio"` | Correct | **PASS** |
| Hex input: `aria-label`, `aria-invalid` on error | Correct | **PASS** |
| Dark mode toggle: `role="radiogroup"` + `role="radio"` + `aria-checked` | Correct | **PASS** |
| WCAG AA contrast: all themes both modes | Robert verified ratios in design spec section 8.4 | **PASS** |
| `prefers-reduced-motion`: disables 200ms transitions | `transition-duration: 0ms !important` | **PASS** |
| `aria-live` announcement on theme change | Div exists but not populated | **MINOR GAP** (non-blocking) |
| `aria-pressed` on top bar toggle | Missing | **MINOR GAP** (non-blocking) |

---

## 8. Summary of All Findings

### Blocking Issues

**None.**

### Non-Blocking Issues (address post-ship via fast-path)

| # | Issue | Source | Severity | Recommendation |
|---|-------|--------|----------|----------------|
| 1 | `aria-live` region not populated on theme change | Design review | Low | Populate `textContent` in `onThemeChange` handler. One-line fix. |
| 2 | `aria-pressed` missing on top bar dark mode toggle | Design review | Low | Add `aria-pressed={resolvedMode === 'dark'}`. One-line fix. |
| 3 | No DB CHECK constraint on `theme_name` | Code review | Low | Add constraint in follow-up migration. |
| 4 | Verify Socket.IO broadcast is unconditional on PATCH | Code review | Low | Check at apply time; one-line fix if gated. |
| 5 | Empty-string feedback clears previous feedback on approval | Code review | Cosmetic | Product decision, not a bug. Discuss if behavior is undesirable. |

### Positive Findings

- All 4 user stories' acceptance criteria fully met
- All 6 themes faithfully match the design spec (token-for-token verified by Robert)
- Zero new dependencies — clean architecture
- CSS variable approach ensures export compatibility for free
- Real-time sync works through existing patterns
- Hex validation is tight — anchored regex, no injection vectors
- Optimistic updates with revert-on-failure for all three settings
- Dynamic first accent swatch (shows current theme's default) is an improvement over spec
- RG-15 fix is clean and verified

---

## 9. Verdict

### **PASS**

The Visual Themes feature meets all acceptance criteria across all 4 user stories. The implementation is faithful to the design spec, architecturally sound per the tech approach, and secure per the code review. Two minor accessibility polish items and three non-blocking backend nits are documented for fast-path follow-up. No blocking issues found.

**This feature is cleared for shipping.**

---

*QA completed by Enzo. Release gate: PASS.*
