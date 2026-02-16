# SiteSnap -- Design Review

**Reviewer:** Robert (Product Designer)
**Date:** 2026-02-16
**Status:** Complete
**Reviewed against:** `docs/sitesnap-design-spec.md` (February 2026, Final)
**Implementation by:** Zara (Mobile Developer)

---

## Summary

Zara's implementation is strong. The design tokens are faithfully transcribed, the component structure follows the spec closely, and all critical screens are present with the correct layout hierarchy. The dark-mode palette, typography scale, spacing system, and photo type badge colors are exact matches. Most interaction states (loading, error, empty) are implemented.

There are a handful of deviations -- mostly minor weight/spacing issues and a few missing states. None are severe enough to block QA, but several should be addressed before shipping to maintain the quality bar.

---

## Issues Found

### 1. TypeBadge line height missing

- **Severity:** Note
- **Where:** `sitesnap-app/components/TypeBadge.tsx`, line 59
- **Expected:** The `overline` typography token includes `lineHeight: 13` (from `tokens.ts`). The badge text style should apply it for consistent vertical centering.
- **Actual:** The `badgeText` style sets `fontSize` and `fontWeight` from the overline token but omits `lineHeight`. On most devices the system default will be close enough, but explicit line height prevents cross-device drift.
- **Fix:** Add `lineHeight: typography.overline.lineHeight` to `badgeText`.

### 2. TypeFilterChips -- chip text weight is "500" instead of "600"

- **Severity:** Note
- **Where:** `sitesnap-app/components/TypeFilterChips.tsx`, line 137
- **Expected:** Spec Section 4.4 says filter chip text uses `--text-label` (13px, semibold = fontWeight "600", per the typography tokens).
- **Actual:** `chipText` uses `fontWeight: "500"` (medium). This makes chips look slightly lighter than the spec intends.
- **Fix:** Change `fontWeight: "500"` to `fontWeight: typography.label.fontWeight` (which is "600").

### 3. TypeFilterChips -- touch target height not padded to 44px

- **Severity:** Note
- **Where:** `sitesnap-app/components/TypeFilterChips.tsx`, line 118
- **Expected:** Spec Section 7.2 says filter chips are 32px tall "but wrapped in a 44px touch target area (6px vertical padding)."
- **Actual:** The chip `Pressable` itself is 32px tall with no additional vertical hit area. The `minWidth: 44` is present (good), but the vertical touch target is 32px, below the 44px minimum.
- **Fix:** Add `minHeight: 44` to the chip style (or add `hitSlop={{ top: 6, bottom: 6 }}` on the Pressable) while keeping the visual height at 32px via internal layout.

### 4. CameraFAB -- upload queue badge missing scale-in animation

- **Severity:** Note
- **Where:** `sitesnap-app/components/CameraFAB.tsx`, line 69
- **Expected:** Spec Section 4.3.1 says the badge should "Animate in: scale from 0 to 1, 200ms, ease-out."
- **Actual:** The badge renders conditionally but appears instantly with no animation. Similarly, no scale-out animation when the queue empties.
- **Fix:** Wrap the badge `View` in an `Animated.View` and run a 200ms scale animation when `uploadQueueCount` transitions from 0 to non-zero (and reverse).

### 5. CameraFAB -- missing `accessibilityLiveRegion` on upload badge

- **Severity:** Note
- **Where:** `sitesnap-app/components/CameraFAB.tsx`, line 70
- **Expected:** Spec Section 7.1 says "Upload queue badge announces count changes via `accessibilityLiveRegion: 'polite'`."
- **Actual:** The badge `View` has no `accessibilityLiveRegion` prop. Screen reader users would not be informed of queue count changes.
- **Fix:** Add `accessibilityLiveRegion="polite"` to the badge `View`.

### 6. Home screen -- Profile icon removed from header

- **Severity:** Note
- **Where:** `sitesnap-app/app/(app)/home/index.tsx`, lines 196-213
- **Expected:** Spec Section 4.1 header shows two icons on the right: Search (24px) and Profile (24px) with an 8px gap.
- **Actual:** Only the Search icon is present. The Profile icon is omitted. Since Profile is accessible via the tab bar, this is functionally redundant -- but the spec includes it for quick access on the Home screen.
- **Fix:** Either add the Profile icon per spec, or confirm with Thomas that it is intentionally removed since the tab bar provides the same navigation. This is cosmetic, not functional.

### 7. Home screen header -- horizontal padding uses space8 (32px) instead of matching subHeader

- **Severity:** Note
- **Where:** `sitesnap-app/app/(app)/home/index.tsx`, line 368
- **Expected:** Spec says header height 56px with standard padding. The header uses `paddingHorizontal: spacing.space8` (32px), while the subHeader and content use `spacing.space4` (16px). This is acceptable -- the header has wider padding to give the title breathing room, which looks intentional.
- **Actual:** No issue. Noting this as a conscious layout choice, not a deviation.

### 8. Home screen -- JobCard missing swipe-to-archive gesture

- **Severity:** Note
- **Where:** `sitesnap-app/components/JobCard.tsx`
- **Expected:** Spec Section 4.1 says "Swipe left: reveals 'Archive' action (amber background, white text, 80px wide)."
- **Actual:** JobCard uses a simple `Pressable` with no swipe gesture handler. Archive is only available via the Job Detail overflow menu. Since archive functionality exists and is accessible, this is a nice-to-have UX improvement, not a blocker.
- **Fix:** Implement swipe-to-archive using `react-native-gesture-handler` Swipeable component in a future pass. Log as a post-QA enhancement.

### 9. Job Detail -- header title centered instead of left-aligned

- **Severity:** Note
- **Where:** `sitesnap-app/app/(app)/jobs/[id].tsx`, line 558-563
- **Expected:** Spec Section 4.4 header shows the job name after the back arrow, implying left-alignment (standard iOS push navigation pattern). The spec layout diagram shows the name next to the back arrow, not centered.
- **Actual:** `headerTitle` uses `textAlign: "center"`. This is actually a reasonable iOS convention (centered titles between leading and trailing buttons). Both approaches work. Not a blocker.

### 10. UpgradeSheet -- "Maybe Later" spacing is space4 (16px) instead of spec's 16px below Subscribe

- **Severity:** Note
- **Where:** `sitesnap-app/components/UpgradeSheet.tsx`, line 249
- **Expected:** Spec says "16px below Subscribe button."
- **Actual:** `maybeLaterButton` has `marginTop: spacing.space4` (16px). This matches. However, the additional `padding: spacing.space2` (8px) on the button means the visual gap from the Subscribe button's bottom edge to the "Maybe Later" text is 24px, not 16px.
- **Fix:** Minor -- can adjust padding or keep as-is. The extra padding increases the touch target, which is good.

### 11. UpgradeSheet -- tip text uses marginTop space6 (24px) instead of spec's 24px below "Maybe Later"

- **Severity:** Note
- **Where:** `sitesnap-app/components/UpgradeSheet.tsx`, line 264
- **Expected:** Spec says tip text is "24px below 'Maybe Later'."
- **Actual:** `marginTop: spacing.space6` (24px) -- but this is 24px below the "Maybe Later" Pressable, which has its own internal padding. The visual gap is slightly larger than 24px. Minor.

### 12. Search screen -- date range picker not implemented

- **Severity:** Note
- **Where:** `sitesnap-app/app/(app)/search.tsx`
- **Expected:** Spec Section 4.6 includes a date range picker below the type filter chips with start/end date inputs.
- **Actual:** The date range picker is absent. Search works via text query and type filters only. This reduces search power for users with many photos, but the core search function works.
- **Fix:** Add date range picker in a follow-up. The API supports date range parameters per Jonah's search endpoint. Log as a post-QA enhancement.

### 13. Search screen -- section label uses `letterSpacing: 0.5` instead of 1

- **Severity:** Note
- **Where:** `sitesnap-app/app/(app)/search.tsx`, line 348-349
- **Expected:** Spec uses `--text-overline` for job name headers in search results, which has `letterSpacing: 1px`.
- **Actual:** Both `sectionLabel` and `groupJobName` use `letterSpacing: 0.5`. This is a deliberate choice by Zara -- the spec says overline uses 1px, but the search results use `--text-label` (13px) for job name headers, which the spec describes with `letterSpacing: 0.5px`. Looking closer at Section 4.6, the spec says "Job name header: `--text-label` (13px), semibold, `--color-text-secondary`, uppercase, `letter-spacing: 0.5px`." So this is actually correct per spec.

### 14. PhotoThumbnail shimmer -- static opacity instead of animated gradient

- **Severity:** Note
- **Where:** `sitesnap-app/components/PhotoThumbnail.tsx`, line 158-163
- **Expected:** Spec Section 4.4.1 and 6.4 describe a shimmer animation with a linear gradient sweep left-to-right.
- **Actual:** The uploading photo placeholder shows a static semi-transparent `bgHover` overlay at `opacity: 0.5`. No animated shimmer. The `SkeletonLoader` component does have animated shimmer (correctly implemented), but the inline `PhotoThumbnail` uploading state does not use it.
- **Fix:** Reuse the `SkeletonThumbnail` component from `SkeletonLoader.tsx` for the uploading state, or add an animated shimmer to the placeholder in `PhotoThumbnail`.

### 15. Comparison preview -- image padding uses space4 (16px) instead of spec's 16px

- **Severity:** Note
- **Where:** `sitesnap-app/components/ComparisonPreview.tsx`, line 20
- **Expected:** Spec Section 4.5.2 says "Width: screen width minus 32px (16px margin each side)."
- **Actual:** `IMAGE_SIZE = SCREEN_WIDTH - spacing.space4 * 2` which is `SCREEN_WIDTH - 32` -- this matches. No issue.

### 16. Profile screen -- section label horizontal padding uses space4 (16px)

- **Severity:** Note
- **Where:** `sitesnap-app/app/(app)/profile.tsx`, line 306-307
- **Expected:** Spec says section labels have `--space-4` (16px) horizontal padding. Implementation uses `spacing.space4`. Matches.

---

## What Matches Well

These areas are implemented faithfully and deserve recognition:

1. **Design tokens** -- All color values, typography sizes/weights, spacing values, radii, and shadow definitions in `tokens.ts` are exact matches to the spec. Every hex code, every rgba value, every pixel measurement is correct.

2. **Photo type badge colors** -- All 8 type badge color pairs (background + text) match the spec exactly, including the colorblind-friendly palette.

3. **Tab bar layout** -- 2 tabs (Jobs/Me) + Camera FAB overlay, tab bar height 84px, correct active/inactive colors, Camera FAB at 64px with correct shadow and haptic feedback.

4. **Component structure** -- All 13 components match the spec's component inventory. Props match the specified interfaces.

5. **Empty states** -- Home (no jobs), Job Detail (no photos), Job Detail (filter empty), Search (no results) all implemented with correct copy and icons.

6. **Loading states** -- Skeleton job cards (4 items), skeleton photo grid (6 items), shimmer animation with correct 1.5s duration.

7. **Error states** -- Job list error, photo list error, comparison error with retry, job creation error (server + network variants) all present.

8. **Toast notifications** -- Correct dimensions (44px height, 80% max width), correct colors per type, slide + fade animation, 2.5s auto-dismiss.

9. **Job creation modal** -- Bottom sheet with drag handle, correct field labels (overline style), 52px inputs, character count at 80+, validation, keyboard avoiding.

10. **Comparison selection mode** -- Instruction banner, numbered overlays on selected photos, disabled/enabled generate button states.

11. **Upgrade prompt** -- Full screen, Unlock icon, value prop card, price, subscribe button, "Maybe Later" link, archive tip text.

12. **Accessibility** -- `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` are present on all interactive elements. Labels are descriptive.

---

## Verdict

**Pass with notes.** The implementation is faithful to the design spec. No issues found that would block QA. The deviations are minor (font weight, touch target padding, missing swipe gesture, absent date range picker) and can be addressed in a polish pass after QA.

**Priority fixes for the polish pass (ordered by user impact):**
1. Filter chip font weight -- visual consistency (Issue 2)
2. Filter chip touch target -- accessibility compliance (Issue 3)
3. Upload badge live region -- accessibility compliance (Issue 5)
4. Photo shimmer animation -- loading state polish (Issue 14)
5. Badge scale animation -- micro-interaction polish (Issue 4)
6. Swipe-to-archive gesture -- UX improvement (Issue 8)
7. Date range picker -- search power (Issue 12)

Handing off to Enzo for QA.

---

*Design review conducted by Robert (Product Designer) for Sherlock Labs. February 2026.*
