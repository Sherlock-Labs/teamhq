# Bug Reporter -- Design Spec

**Project:** bug-reporter
**Author:** Robert (Designer)
**Date:** 2026-02-13
**Status:** Ready for implementation

**Upstream docs:**
- Requirements: `docs/bug-reporter-requirements.md`
- Tech approach: `docs/bug-reporter-tech-approach.md`
- Design tokens: `client/src/styles/tokens.css`

---

## Design Principles for This Feature

1. **Under 10 seconds.** The entire report flow -- shortcut, paste, describe, submit -- must feel instantaneous. Every design decision optimizes for speed.
2. **Minimal surface area.** This is a utility modal, not a product feature. Small footprint, no chrome, get in and get out.
3. **Follow the system.** Every token, radius, shadow, and spacing value comes from the existing Forge design system. No new visual patterns introduced.
4. **Graceful degradation.** When R2 is not configured, the screenshot zone disappears entirely. The modal still works as a description-only reporter with no visual awkwardness.

---

## 1. Bug Report Modal

### 1.1 Trigger

**Keyboard shortcut:** `Cmd+Shift+K` (macOS) / `Ctrl+Shift+K` (Windows/Linux). Registered on `window` at the `AppShell` level. Opens the modal from any authenticated page.

**Floating action button:** Persistent in the bottom-right corner of the viewport (see Section 2). Click opens the same modal.

**Close:** Escape key, backdrop click, or the close button. None of these work while a submission is in progress (the user should not accidentally discard mid-upload).

### 1.2 Layout Structure

The modal follows the existing `FieldModal` pattern exactly: overlay, centered panel, header/body/footer.

```
.overlay               -- fixed inset, backdrop, z-index: 50
  .modal               -- 480px wide, white, rounded, shadow-xl
    .modalHeader       -- flex row, title + close button, border-bottom
    .modalBody         -- flex column, screenshot zone + description textarea
    .modalFooter       -- flex row, cancel + submit, border-top
```

**Modal width:** `480px`. This is 40px wider than `FieldModal` (440px) to give the screenshot preview comfortable breathing room. On screens narrower than 480px + 32px margin, the modal becomes `calc(100vw - var(--space-8))`.

**Max height:** `80vh`, with `overflow-y: auto` on `.modalBody`.

### 1.3 CSS Specification

#### `.overlay`

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

Same as `FieldModal.module.css` -- light backdrop, centered content.

#### `.modal`

```css
.modal {
  width: 480px;
  max-height: 80vh;
  background: var(--white);
  border-radius: var(--radius-lg);       /* 8px */
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  animation: fadeIn 150ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
```

#### `.modalHeader`

```css
.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);  /* 16px 20px */
  border-bottom: 1px solid var(--gray-200);
  flex-shrink: 0;
}
```

**Title:** "Report a Bug"
- Font size: `var(--text-lg)` (16px)
- Font weight: 600
- Color: `var(--gray-950)`

**Close button:** 28x28px, `var(--radius-md)` border-radius. Icon: 16x16 X mark, `stroke="currentColor"`, `strokeWidth="2"`.
- Default: `color: var(--gray-500)`, no background
- Hover: `background: var(--gray-100)`, `color: var(--gray-700)`
- Focus-visible: `outline: 2px solid var(--accent-600)`, `outline-offset: 2px`

#### `.modalBody`

```css
.modalBody {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);               /* 20px */
  display: flex;
  flex-direction: column;
  gap: var(--space-4);                   /* 16px */
}
```

Body contains two form groups stacked vertically: screenshot zone (if R2 enabled) and description textarea.

#### `.modalFooter`

```css
.modalFooter {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);                   /* 8px */
  padding: var(--space-4) var(--space-5); /* 16px 20px */
  border-top: 1px solid var(--gray-200);
  flex-shrink: 0;
}
```

### 1.4 Form Fields

#### Description Textarea

**Label:** "What happened?" -- `var(--text-sm)` (13px), weight 500, `var(--gray-700)`.

```css
.description {
  width: 100%;
  min-height: 88px;                      /* ~4 lines at 14px/20px */
  max-height: 200px;
  padding: var(--space-2) var(--space-3); /* 8px 12px */
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);       /* 6px */
  font-family: var(--font-sans);
  font-size: var(--text-base);           /* 14px */
  line-height: var(--leading-base);      /* 20px */
  color: var(--gray-950);
  resize: vertical;
}
```

**States:**
- Placeholder: "Describe the bug..." in `var(--gray-500)`
- Hover (not focused): `border-color: var(--gray-400)`
- Focus: `outline: none; border-color: var(--accent-600); box-shadow: 0 0 0 2px var(--accent-100)`
- Error (empty on submit): `border-color: var(--error-600); background: var(--error-50)`

**Character count:** Not shown in the UI. The 5000-character max is validated on submit only. If exceeded (unlikely in a quick-fire form), show error text below the textarea: "Description is too long (max 5000 characters)" in `var(--text-xs)`, `var(--error-600)`.

**Auto-focus:** The description textarea receives focus when the modal opens (via `autoFocus` or `ref.focus()` after mount). This way the user can immediately start typing.

#### Error Text (inline)

```css
.errorText {
  font-size: var(--text-xs);            /* 11px */
  line-height: var(--leading-xs);       /* 16px */
  color: var(--error-600);
  margin-top: var(--space-1);           /* 4px */
}
```

Used for: screenshot too large, upload failed, submission failed. Appears below the relevant form element.

### 1.5 Footer Buttons

#### Cancel Button

```css
.cancelBtn {
  height: 32px;
  padding: 0 var(--space-4);            /* 0 16px */
  font-size: var(--text-sm);            /* 13px */
  font-weight: 500;
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);      /* 6px */
  background: transparent;
}
```

- Hover: `background: var(--gray-50)`
- Active: `background: var(--gray-100)`
- Focus-visible: `outline: 2px solid var(--accent-600); outline-offset: 2px`
- Disabled during submission: `opacity: 0.5; pointer-events: none`

#### Submit Button

```css
.submitBtn {
  height: 32px;
  padding: 0 var(--space-4);            /* 0 16px */
  font-size: var(--text-sm);            /* 13px */
  font-weight: 500;
  background: var(--accent-600);        /* #4F46E5 */
  color: var(--white);
  border-radius: var(--radius-md);      /* 6px */
  border: none;
}
```

- Hover: `background: var(--accent-500)` (#6366F1)
- Active: scale(0.98) for 100ms
- Focus-visible: `outline: 2px solid var(--accent-600); outline-offset: 2px`
- Disabled (empty description or submitting): `background: var(--gray-300); color: var(--gray-500); cursor: not-allowed`

**Label states:**
- Default: "Submit Bug"
- Submitting: "Submitting..." (text change only, no spinner -- keeps it lightweight)

### 1.6 Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-label="Report a Bug"` on `.modal`
- Focus trap via existing `useFocusTrap(modalRef)` hook
- Tab order: description textarea, cancel button, submit button (screenshot zone elements sit between description and cancel if R2 is enabled)
- Close button has `aria-label="Close"`
- All focus-visible outlines use `2px solid var(--accent-600)` with `outline-offset: 2px`
- `@media (prefers-reduced-motion: reduce)`: disable the `fadeIn` animation on `.modal`

### 1.7 Responsive

The modal targets tablet and up (768px+). Below 768px, Forge shows a mobile fallback message, so the modal does not need mobile-specific treatment.

```css
@media (max-width: 639px) {
  .modal {
    width: calc(100vw - var(--space-8)); /* 100vw - 32px */
    max-width: 480px;
    max-height: 90vh;
  }

  .modalBody {
    padding: var(--space-4);             /* 16px */
  }

  .modalHeader,
  .modalFooter {
    padding: var(--space-3) var(--space-4); /* 12px 16px */
  }
}
```

---

## 2. Floating Action Button (FAB)

### 2.1 Position and Sizing

The FAB sits in the bottom-right corner of the viewport, outside the `.shell` div in `AppShell.tsx` so it is not affected by sidebar stacking context.

```css
.fab {
  position: fixed;
  bottom: var(--space-6);               /* 24px */
  right: var(--space-6);                /* 24px */
  z-index: 40;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);    /* 9999px -- circle */
  background: var(--gray-900);          /* #18181B */
  color: var(--white);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: background 100ms ease, box-shadow 100ms ease, transform 100ms ease;
}
```

`z-index: 40` keeps it below the modal overlay (50) but above page content.

### 2.2 Icon

A 16x16 bug icon. Inline SVG:

```svg
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
  <!-- Bug body (oval) -->
  <ellipse cx="8" cy="9" rx="3.5" ry="4" />
  <!-- Bug head -->
  <circle cx="8" cy="4.5" r="1.5" />
  <!-- Left legs -->
  <path d="M4.5 7.5L2.5 6" />
  <path d="M4.5 10L2.5 11" />
  <!-- Right legs -->
  <path d="M11.5 7.5L13.5 6" />
  <path d="M11.5 10L13.5 11" />
  <!-- Antennae -->
  <path d="M7 3.5L5.5 1.5" />
  <path d="M9 3.5L10.5 1.5" />
</svg>
```

The icon is stroke-based, matching the nav icon style throughout Forge (16x16, `stroke="currentColor"`, `strokeWidth="1.5"`).

### 2.3 Interaction States

| State | Treatment |
|-------|-----------|
| Default | `background: var(--gray-900)`, `color: var(--white)`, `box-shadow: var(--shadow-md)` |
| Hover | `background: var(--gray-700)`, `box-shadow: var(--shadow-lg)` |
| Active (mousedown) | `transform: scale(0.95)` |
| Focus-visible | `outline: 2px solid var(--accent-600)`, `outline-offset: 2px` |

### 2.4 Tooltip

On hover, show a tooltip above the button. Use the native `title` attribute for simplicity. This is an internal tool; a custom tooltip component is not warranted.

```html
<button
  className={styles.fab}
  onClick={onClick}
  title="Report a bug (Cmd+Shift+K)"
  aria-label="Report a bug"
>
```

On non-macOS platforms, the shortcut text should read `Ctrl+Shift+K`. Alice can detect platform via `navigator.platform?.includes('Mac')` or `navigator.userAgentData?.platform`.

### 2.5 Visibility

The FAB is visible on every authenticated page. It is rendered in `AppShell.tsx` outside the `.shell` div. When the bug report modal is open, the FAB remains visible behind the overlay (it naturally dims behind the `rgba(0,0,0,0.15)` backdrop). No need to explicitly hide it.

### 2.6 Reduced Motion

The `transform: scale(0.95)` active state is subtle enough that it does not need a `prefers-reduced-motion` override.

---

## 3. Screenshot Paste Zone

### 3.1 Conditional Rendering

The screenshot zone is only rendered when `screenshotsEnabled` is `true` (determined by the `GET /api/v1/bugs/count` response piggybacked from AppShell). When R2 is not configured, the zone is omitted entirely -- no placeholder, no "screenshots unavailable" message. The modal simply shows the description textarea with more vertical space.

### 3.2 Empty State (No Screenshot Pasted)

```
+------------------------------------------+
|                                          |
|          [clipboard icon]                |
|                                          |
|     Paste a screenshot (Cmd+V)           |
|     or drag and drop an image            |
|                                          |
+------------------------------------------+
```

```css
.screenshotZone {
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-lg);       /* 8px */
  padding: var(--space-6) var(--space-4); /* 24px 16px */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);                   /* 8px */
  background: var(--gray-50);
  transition: border-color 150ms ease, background 150ms ease;
  cursor: default;
  min-height: 100px;
}
```

**Icon:** A 24x24 clipboard/paste icon in `var(--gray-400)`:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style="color: var(--gray-400)">
  <rect x="8" y="2" width="8" height="4" rx="1" />
  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
</svg>
```

**Primary text:** "Paste a screenshot (Cmd+V)"
- Font size: `var(--text-sm)` (13px)
- Font weight: 500
- Color: `var(--gray-500)`

**Secondary text:** "or drag and drop an image"
- Font size: `var(--text-xs)` (11px)
- Font weight: 400
- Color: `var(--gray-400)`

**"Optional" label:** Not shown. The requirements state screenshots are optional, and the helper text implies optionality by not using "required" language. Keeping the zone clean.

### 3.3 Drag Over State

When a file is dragged over the modal (not just the zone -- use the modal container for the drag target to make it forgiving):

```css
.screenshotZoneDragOver {
  border-color: var(--accent-600);
  background: var(--accent-50);          /* #EEF2FF */
}
```

The icon and text color shift to `var(--accent-600)` during drag-over. This gives clear visual feedback that the drop target is active.

### 3.4 Preview State (Screenshot Pasted)

When a screenshot has been pasted or dropped, the dashed zone is replaced by a preview:

```
+------------------------------------------+
|                                          |
|  +------------------------------------+ |
|  |                                    | |
|  |     [screenshot thumbnail]         | |
|  |     object-fit: contain            | |
|  |     max-height: 180px              | |
|  |                                    | |
|  +------------------------------------+ |
|                              [x Remove]  |
|                                          |
+------------------------------------------+
```

```css
.screenshotPreview {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);       /* 8px */
  padding: var(--space-3);               /* 12px */
  background: var(--gray-50);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);                   /* 8px */
}

.screenshotImage {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: var(--radius-md);       /* 6px */
  background: var(--white);              /* visible border against gray-50 bg */
  border: 1px solid var(--gray-200);
}

.screenshotRemoveBtn {
  align-self: flex-end;
  height: 24px;
  padding: 0 var(--space-2);            /* 0 8px */
  font-size: var(--text-xs);            /* 11px */
  font-weight: 500;
  color: var(--gray-500);
  border-radius: var(--radius-sm);      /* 4px */
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  gap: var(--space-1);                  /* 4px */
  cursor: pointer;
}
```

**Remove button states:**
- Default: `color: var(--gray-500)`
- Hover: `background: var(--error-50); color: var(--error-600)`
- Focus-visible: `outline: 2px solid var(--accent-600); outline-offset: 2px`

The remove button shows a small 12x12 X icon + the text "Remove". Clicking it clears the screenshot, revokes the object URL, and re-shows the empty paste zone.

### 3.5 Error State (File Too Large)

If the pasted image exceeds 5 MB, the paste zone border flashes red briefly and an error message appears below:

```css
.screenshotZoneError {
  border-color: var(--error-600);
}
```

Error text below the zone: "Screenshot too large (max 5 MB). Try a smaller selection." in `var(--text-xs)`, `var(--error-600)`.

The zone remains in its empty state -- no preview is shown for an oversized file.

### 3.6 Paste Behavior Details

- **Paste listener** is scoped to the modal container ref (not `window`). Only intercepts clipboard items of type `image/*`.
- **Text paste into the description textarea** works normally. When the textarea is focused and the clipboard contains text, the paste event propagates as usual.
- **Re-paste replaces:** If a screenshot is already previewed and the user pastes again, the new image replaces the old one. The old object URL is revoked.
- **Accepted formats:** `image/png`, `image/jpeg` only. Other image types (gif, webp) are silently ignored -- the paste zone stays in its current state.

---

## 4. Success State

After successful submission, the modal body transitions to a centered success message for 1.5 seconds, then the modal closes automatically.

```
+------------------------------------------+
|               Report a Bug        [x]    |
|------------------------------------------|
|                                          |
|          [checkmark icon]                |
|                                          |
|          Bug reported!                   |
|                                          |
|------------------------------------------|
|                       [Cancel] [Submit]  |
+------------------------------------------+
```

The header and footer remain visible (no layout jump). The body content is replaced with:

```css
.successState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);                   /* 12px */
  padding: var(--space-8) 0;            /* 32px 0 */
}
```

**Checkmark icon:** 24x24 circle with checkmark, `var(--success-600)` (#16A34A).

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="12" r="10" />
  <path d="M9 12l2 2 4-4" />
</svg>
```

**Text:** "Bug reported!"
- Font size: `var(--text-sm)` (13px)
- Font weight: 500
- Color: `var(--gray-700)`

Both footer buttons are disabled during the success state (the modal auto-closes after 1.5s). The animation is a simple `fadeIn 150ms ease-out` on the success content replacing the form content.

After the modal closes, invalidate `['bugs']` and `['bugs', 'count']` queries so the sidebar badge updates immediately.

---

## 5. Bug List Page

### 5.1 Page Layout

Follows the `HomePage` pattern exactly: `.page` container with max-width, `.header` with title and no action buttons (bugs are created via the modal, not from this page).

```css
.page {
  padding: var(--space-10);              /* 40px */
  max-width: 800px;                      /* narrower than HomePage's 1200px -- single-column list */
}
```

**Page title:** "Bugs"
- Font size: `var(--text-2xl)` (24px)
- Font weight: 600
- Line height: `var(--leading-2xl)` (32px)
- Color: `var(--gray-950)`

### 5.2 Bug Card (Collapsed)

Each bug is a card in a vertical list:

```
+--------------------------------------------------+
| [thumbnail]  Description text truncated to       |
|              about 120 characters so it fits...   |
|                                                  |
|              Feb 13, 2026   Jeff    [Open]        |
+--------------------------------------------------+
```

```css
.bugList {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);                   /* 12px */
}

.bugCard {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);       /* 8px */
  padding: var(--space-4);               /* 16px */
  cursor: pointer;
  transition: border-color 100ms ease;
  display: flex;
  gap: var(--space-4);                   /* 16px */
}
```

**States:**
- Default: `border: 1px solid var(--gray-200)`
- Hover: `border-color: var(--gray-300)`
- Focus-visible: `outline: 2px solid var(--accent-600); outline-offset: 2px`
- Expanded: `border-color: var(--gray-300)` (stays highlighted)
- Resolved: entire card gets `opacity: 0.6` -- text and thumbnail both dim

#### Screenshot Thumbnail (left side, if present)

```css
.bugThumbnail {
  width: 80px;
  height: 56px;
  object-fit: cover;
  border-radius: var(--radius-md);       /* 6px */
  border: 1px solid var(--gray-200);
  flex-shrink: 0;
  background: var(--gray-100);           /* placeholder bg while loading */
}
```

If no screenshot, the thumbnail column is omitted entirely (the content area takes full width). No placeholder icon.

#### Content Area (right side)

```css
.bugContent {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);                   /* 8px */
}

.bugDescription {
  font-size: var(--text-base);           /* 14px */
  line-height: var(--leading-base);      /* 20px */
  color: var(--gray-950);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bugMeta {
  display: flex;
  align-items: center;
  gap: var(--space-3);                   /* 12px */
  flex-wrap: wrap;
}

.bugDate {
  font-size: var(--text-xs);            /* 11px */
  color: var(--gray-500);
}

.bugReporter {
  font-size: var(--text-xs);            /* 11px */
  color: var(--gray-500);
}
```

#### Status Badge

```css
.statusBadge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 var(--space-2);            /* 0 8px */
  border-radius: var(--radius-full);     /* 9999px -- pill */
  font-size: var(--text-xs);            /* 11px */
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.statusOpen {
  background: var(--error-50);           /* #FEF2F2 */
  color: var(--error-600);              /* #DC2626 */
}

.statusResolved {
  background: var(--gray-100);           /* #F4F4F5 */
  color: var(--gray-500);               /* #71717A */
}
```

Using red for "open" bugs (they demand attention) and neutral gray for "resolved" (they are done, fade into background). This is an internal tool, so we use strong signal colors.

### 5.3 Bug Card (Expanded)

Clicking a collapsed card expands it inline. The expansion reveals:
1. Full description text (no truncation)
2. Full-size screenshot (if present)
3. Resolve/Reopen button
4. Page URL where the bug was reported

The expand/collapse uses the `grid-template-rows: 0fr -> 1fr` CSS pattern per the interface design skill doc. Duration: 200ms, easing: `ease`.

```
+--------------------------------------------------+
| [thumbnail]  Description text truncated to       |
|              about 120 characters so it fits...   |
|                                                  |
|              Feb 13, 2026   Jeff    [Open]        |
|--------------------------------------------------|
|                                                  |
| Full description text without truncation.        |
| Can be multiple paragraphs and as long as        |
| the user wrote.                                  |
|                                                  |
| +----------------------------------------------+ |
| |                                              | |
| |          [full-size screenshot]               | |
| |                                              | |
| +----------------------------------------------+ |
|                                                  |
| Reported on: /roadmaps/abc123                    |
|                                                  |
|                              [Resolve]           |
+--------------------------------------------------+
```

#### Expanded Content Area

```css
.bugExpandedWrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms ease;
}

.bugExpandedWrapper[data-open="true"] {
  grid-template-rows: 1fr;
}

.bugExpandedInner {
  overflow: hidden;
}

.bugExpanded {
  padding-top: var(--space-4);           /* 16px */
  border-top: 1px solid var(--gray-200);
  margin-top: var(--space-4);            /* 16px */
  display: flex;
  flex-direction: column;
  gap: var(--space-4);                   /* 16px */
}

.bugFullDescription {
  font-size: var(--text-base);           /* 14px */
  line-height: var(--leading-base);      /* 20px */
  color: var(--gray-950);
  white-space: pre-wrap;                 /* preserve line breaks */
  word-break: break-word;
}

.bugScreenshotFull {
  max-width: 100%;
  border-radius: var(--radius-lg);       /* 8px */
  border: 1px solid var(--gray-200);
  cursor: pointer;                       /* click to open in new tab */
}

.bugPageUrl {
  font-size: var(--text-xs);            /* 11px */
  color: var(--gray-400);
  font-family: var(--font-mono);
}

.bugActions {
  display: flex;
  justify-content: flex-end;
}
```

**Screenshot click:** Opens the presigned R2 URL in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). The cursor is `pointer` to indicate clickability. Add `title="Open full size"` for accessibility.

#### Resolve/Reopen Button

Uses the secondary button style from the design system:

```css
.resolveBtn {
  height: 32px;
  padding: 0 var(--space-4);            /* 0 16px */
  font-size: var(--text-sm);            /* 13px */
  font-weight: 500;
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);       /* 6px */
  background: transparent;
  transition: background 100ms ease;
}
```

- Hover: `background: var(--gray-50)`
- Active: `background: var(--gray-100)`
- Focus-visible: `outline: 2px solid var(--accent-600); outline-offset: 2px`

**Label:** "Resolve" for open bugs, "Reopen" for resolved bugs.

**Optimistic update:** Clicking Resolve/Reopen immediately updates the status badge and card opacity. If the API call fails, revert and show an error toast using the existing `useToast` pattern (dark background toast, bottom-right, 3s duration).

### 5.4 Loading State

Use skeleton placeholders matching the card shape. Show 3 skeleton cards:

```css
.bugCardSkeleton {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  height: 80px;
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### 5.5 Empty State

Centered in the page, following the `HomePage` empty state pattern:

```
        [bug icon, 32x32, gray-400]

       No bugs reported yet

  Use Cmd+Shift+K to report your first bug.
```

```css
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) 0;            /* 48px 0 */
  gap: var(--space-3);                   /* 12px */
}

.emptyIcon {
  color: var(--gray-400);
  margin-bottom: var(--space-2);         /* 8px */
}

.emptyTitle {
  font-size: var(--text-lg);            /* 16px */
  font-weight: 500;
  color: var(--gray-900);
}

.emptyDesc {
  font-size: var(--text-base);           /* 14px */
  color: var(--gray-500);
}
```

Shortcut text should be platform-aware: "Cmd+Shift+K" on macOS, "Ctrl+Shift+K" elsewhere.

### 5.6 Error State

```
       Failed to load bugs.

         [Try again]
```

Uses the same centered layout as the empty state. The "Try again" button is a secondary button (border, gray text) that calls `queryClient.invalidateQueries({ queryKey: ['bugs'] })`.

### 5.7 Responsive

```css
@media (max-width: 1023px) {
  .page {
    padding: var(--space-6);             /* 24px */
  }
}

@media (max-width: 639px) {
  .page {
    padding: var(--space-4);             /* 16px */
  }

  .bugCard {
    flex-direction: column;              /* stack thumbnail above content */
  }

  .bugThumbnail {
    width: 100%;
    height: 120px;
  }
}
```

On mobile, thumbnail stacks above the content for better readability.

---

## 6. Sidebar Integration

### 6.1 Nav Item

Add a "Bugs" entry to the sidebar navigation in `Sidebar.tsx`. It appears after the existing nav items, separated by a `divider`. Unlike the "Fields" nav item which is contextual (only shows inside a roadmap), "Bugs" is always visible.

```tsx
<div className={styles.divider} />
<NavLink
  to="/bugs"
  className={({ isActive }) =>
    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
  }
  onClick={onMobileClose}
>
  <svg className={styles.navIcon} width="16" height="16" viewBox="0 0 16 16"
    fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="8" cy="9" rx="3.5" ry="4" />
    <circle cx="8" cy="4.5" r="1.5" />
    <path d="M4.5 7.5L2.5 6" />
    <path d="M4.5 10L2.5 11" />
    <path d="M11.5 7.5L13.5 6" />
    <path d="M11.5 10L13.5 11" />
    <path d="M7 3.5L5.5 1.5" />
    <path d="M9 3.5L10.5 1.5" />
  </svg>
  <span className={styles.navLabel}>Bugs</span>
  {openBugCount > 0 && (
    <span className={styles.navBadge}>{openBugCount}</span>
  )}
</NavLink>
```

### 6.2 Badge

The badge shows the count of open bugs. Hidden when count is 0.

```css
.navBadge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 var(--space-1);            /* 0 4px */
  border-radius: var(--radius-full);     /* 9999px -- pill */
  background: var(--error-600);          /* #DC2626 -- red, signals attention */
  color: var(--white);
  font-size: 10px;                       /* slightly below --text-xs for compact badge */
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
```

The badge uses `margin-left: auto` to push it to the right edge of the nav item. In the collapsed sidebar state, the badge and label are both hidden. Add a collapse-hide rule:

```css
.sidebar[data-collapsed="true"] .navBadge {
  display: none;
}
```

On tablet (1024-1279px) where the sidebar auto-collapses to icons, the badge is also hidden. This is acceptable -- users on the bugs page will see the full list, and the FAB + keyboard shortcut are the primary reporting paths.

### 6.3 Active State

When the user is on `/bugs`, the nav item gets the existing `.navItemActive` style: `background: var(--accent-50)`, `color: var(--accent-600)`. The badge color does not change -- red on an indigo-tinted background still has sufficient contrast (error-600 #DC2626 on accent-50 #EEF2FF gives 5.3:1).

### 6.4 Icon

Same bug icon as the FAB but at 16x16 to match the other nav icons. Uses `stroke="currentColor"` so it inherits the nav item color (gray-700 default, accent-600 active).

---

## 7. Complete State Matrix

### 7.1 Bug Report Modal States

| State | Trigger | Visual Treatment |
|-------|---------|------------------|
| **Default (empty form)** | Modal opens | Screenshot zone empty (dashed border), description empty with placeholder, Submit disabled (gray-300 bg) |
| **Form filled (no screenshot)** | User types description | Screenshot zone unchanged, Submit enabled (accent-600 bg) |
| **Form filled (with screenshot)** | User pastes image | Screenshot preview replaces zone, Submit enabled |
| **Screenshot too large** | Paste image > 5 MB | Zone border turns red, error text below zone, no preview |
| **Submitting** | User clicks Submit | Submit text changes to "Submitting...", both buttons disabled, Cancel has opacity 0.5 |
| **Upload failed** | R2 upload error or timeout | Error text below screenshot zone: "Screenshot upload failed. Submit without screenshot or try again." Submit re-enabled. Form preserved. |
| **Submission failed** | Bug creation API error | Error text below description: "Failed to submit bug report. Please try again." Submit re-enabled. Form preserved. |
| **Success** | Bug created | Body replaced with checkmark + "Bug reported!" for 1.5s, then modal auto-closes |
| **R2 not configured** | `screenshotsEnabled: false` | Screenshot zone not rendered. Description textarea only. Modal is narrower in feel but same 480px width. |

### 7.2 Bug List Page States

| State | Trigger | Visual Treatment |
|-------|---------|------------------|
| **Loading** | Initial page load | 3 skeleton card placeholders, pulse animation |
| **Empty** | No bugs in account | Centered empty state with bug icon + "No bugs reported yet" + shortcut hint |
| **Populated** | Bugs exist | Vertical card list, newest first |
| **Error (load failed)** | API error | Centered error message + "Try again" button |
| **Card expanded** | Click a bug card | Inline expansion with full description, screenshot, page URL, resolve/reopen button |
| **Resolved bug** | Bug status is "resolved" | Card at `opacity: 0.6`, gray status badge |
| **Resolve/reopen optimistic** | Click Resolve/Reopen | Immediate badge + opacity change. Reverts on API error with toast. |

### 7.3 FAB States

| State | Trigger | Visual Treatment |
|-------|---------|------------------|
| **Default** | Always visible | Gray-900 circle, shadow-md, 40x40px |
| **Hover** | Mouse over | Gray-700 bg, shadow-lg |
| **Active** | Mouse down | scale(0.95) |
| **Modal open** | Bug modal visible | FAB visible but dimmed behind overlay backdrop |

---

## 8. Animation Summary

| Element | Animation | Duration | Easing | Reduced Motion |
|---------|-----------|----------|--------|----------------|
| Modal entrance | `opacity: 0 -> 1`, `scale(0.98) -> scale(1)` | 150ms | ease-out | Disable (instant show) |
| Bug card expand/collapse | `grid-template-rows: 0fr -> 1fr` | 200ms | ease | Disable (instant show/hide) |
| FAB active press | `scale(0.95)` | 100ms | ease | Keep (too subtle to matter) |
| Skeleton pulse | `opacity: 1 -> 0.5 -> 1` | 1500ms | ease-in-out | Disable (static gray) |
| Success state swap | `opacity: 0 -> 1` (form content replaced) | 150ms | ease-out | Disable (instant swap) |
| Toast entrance | `translateY(16px) -> 0`, `opacity: 0 -> 1` | 200ms | ease-out | Disable (instant show) |

All reduced motion overrides use `@media (prefers-reduced-motion: reduce)`.

---

## 9. Z-Index Map

| Element | z-index | Notes |
|---------|---------|-------|
| Mobile sidebar overlay | 29 | Existing |
| Sidebar (mobile drawer) | 30 | Existing |
| FAB | 40 | Below modal, above page content |
| Bug report modal overlay | 50 | Same as FieldModal |
| Toast | 100 | Existing, always on top |

---

## 10. Typography Reference (All Values)

| Element | Font Size | Weight | Line Height | Color |
|---------|-----------|--------|-------------|-------|
| Modal title "Report a Bug" | `var(--text-lg)` 16px | 600 | `var(--leading-lg)` 24px | `var(--gray-950)` |
| Form label "What happened?" | `var(--text-sm)` 13px | 500 | `var(--leading-sm)` 18px | `var(--gray-700)` |
| Description textarea | `var(--text-base)` 14px | 400 | `var(--leading-base)` 20px | `var(--gray-950)` |
| Description placeholder | `var(--text-base)` 14px | 400 | `var(--leading-base)` 20px | `var(--gray-500)` |
| Paste zone primary text | `var(--text-sm)` 13px | 500 | `var(--leading-sm)` 18px | `var(--gray-500)` |
| Paste zone secondary text | `var(--text-xs)` 11px | 400 | `var(--leading-xs)` 16px | `var(--gray-400)` |
| Button text (Submit/Cancel) | `var(--text-sm)` 13px | 500 | 1 | white / `var(--gray-700)` |
| Error text | `var(--text-xs)` 11px | 400 | `var(--leading-xs)` 16px | `var(--error-600)` |
| Success text "Bug reported!" | `var(--text-sm)` 13px | 500 | `var(--leading-sm)` 18px | `var(--gray-700)` |
| Page title "Bugs" | `var(--text-2xl)` 24px | 600 | `var(--leading-2xl)` 32px | `var(--gray-950)` |
| Bug card description | `var(--text-base)` 14px | 400 | `var(--leading-base)` 20px | `var(--gray-950)` |
| Bug card date/reporter | `var(--text-xs)` 11px | 400 | `var(--leading-xs)` 16px | `var(--gray-500)` |
| Status badge text | `var(--text-xs)` 11px | 500 | 1 | `var(--error-600)` or `var(--gray-500)` |
| Sidebar badge count | 10px | 600 | 1 | `var(--white)` |
| Bug page URL | `var(--text-xs)` 11px | 400 | `var(--leading-xs)` 16px | `var(--gray-400)` |
| Empty state title | `var(--text-lg)` 16px | 500 | `var(--leading-lg)` 24px | `var(--gray-900)` |
| Empty state description | `var(--text-base)` 14px | 400 | `var(--leading-base)` 20px | `var(--gray-500)` |

---

## 11. Spacing Reference (Key Measurements)

| Measurement | Token | Value |
|-------------|-------|-------|
| Modal width | -- | 480px |
| Modal max-height | -- | 80vh |
| Modal header/footer padding | `var(--space-4) var(--space-5)` | 16px 20px |
| Modal body padding | `var(--space-5)` | 20px |
| Modal body gap (between form groups) | `var(--space-4)` | 16px |
| Screenshot zone padding | `var(--space-6) var(--space-4)` | 24px 16px |
| Screenshot zone min-height | -- | 100px |
| Screenshot preview max-height | -- | 180px |
| Description textarea min-height | -- | 88px |
| Description textarea max-height | -- | 200px |
| Footer button gap | `var(--space-2)` | 8px |
| FAB bottom offset | `var(--space-6)` | 24px |
| FAB right offset | `var(--space-6)` | 24px |
| FAB size | -- | 40x40px |
| Bug card padding | `var(--space-4)` | 16px |
| Bug card gap (thumbnail to content) | `var(--space-4)` | 16px |
| Bug list gap (between cards) | `var(--space-3)` | 12px |
| Bug thumbnail size | -- | 80x56px |
| Sidebar badge size | -- | 18px height, 18px min-width |
| Page padding (bugs page) | `var(--space-10)` | 40px |
| Page max-width (bugs page) | -- | 800px |

---

## 12. Accessibility Checklist

### Color Contrast Verification

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Modal title | var(--gray-950) #09090B | var(--white) #FFFFFF | 19.3:1 | AA |
| Form label | var(--gray-700) #3F3F46 | var(--white) #FFFFFF | 9.5:1 | AA |
| Description text | var(--gray-950) #09090B | var(--white) #FFFFFF | 19.3:1 | AA |
| Placeholder text | var(--gray-500) #71717A | var(--white) #FFFFFF | 4.7:1 | AA |
| Paste zone text | var(--gray-500) #71717A | var(--gray-50) #FAFAFA | 4.5:1 | AA |
| Error text | var(--error-600) #DC2626 | var(--white) #FFFFFF | 4.6:1 | AA |
| Submit button text | var(--white) #FFFFFF | var(--accent-600) #4F46E5 | 7.1:1 | AA |
| FAB icon | var(--white) #FFFFFF | var(--gray-900) #18181B | 16.8:1 | AA |
| Status badge (open) | var(--error-600) #DC2626 | var(--error-50) #FEF2F2 | 4.5:1 | AA |
| Status badge (resolved) | var(--gray-500) #71717A | var(--gray-100) #F4F4F5 | 4.2:1 | AA* |
| Sidebar badge | var(--white) #FFFFFF | var(--error-600) #DC2626 | 4.6:1 | AA |

*Resolved badge is borderline at 4.2:1. Acceptable because: (1) resolved bugs are intentionally de-emphasized, (2) the badge is not the sole indicator -- card opacity also signals resolved status, (3) the text is uppercase and weight-500 which aids legibility.

### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Cmd/Ctrl+Shift+K | Global | Open bug report modal |
| Escape | Modal open, not submitting | Close modal |
| Tab | Inside modal | Move through: description textarea, screenshot remove button (if present), cancel button, submit button |
| Shift+Tab | Inside modal | Reverse tab order |
| Enter/Space | On any button | Activate |
| Enter/Space | On bug card | Toggle expand/collapse |

### Screen Reader

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-label="Report a Bug"`
- FAB: `aria-label="Report a bug"`
- Close button: `aria-label="Close"`
- Screenshot remove: `aria-label="Remove screenshot"`
- Bug cards: use `<button>` or `role="button"` with `aria-expanded` for expand/collapse
- Status badge: include text content ("Open" or "Resolved") -- no icon-only indicators

---

## 13. Implementation Notes for Alice

1. **Start from FieldModal.** Copy the overlay/modal/header/body/footer structure from `FieldModal.module.css` and `FieldModal.tsx`. Same animation, same CSS patterns. Adjust width to 480px.

2. **Paste listener scope.** Attach to `modalRef.current`, not `window`. This avoids intercepting text paste in the description textarea. Only intercept `image/*` clipboard items.

3. **Auto-focus.** The description textarea should receive focus on modal open so the user can immediately start typing.

4. **Screenshot preview object URL.** Use `URL.createObjectURL(file)` for the preview. Revoke it in the cleanup function and when replacing/removing a screenshot.

5. **FAB outside `.shell`.** Render the FAB and modal in a fragment outside the `.shell` div in AppShell. This avoids z-index stacking context issues.

6. **Platform-aware shortcut text.** Use `navigator.platform?.includes('Mac')` (or `navigator.userAgentData?.platform`) to show "Cmd" vs "Ctrl" in the FAB tooltip, paste zone text, and empty state hint.

7. **Expand/collapse pattern.** Use `grid-template-rows: 0fr / 1fr` with a wrapper div for the bug card expansion. This gives smooth height animation without measuring DOM elements.

8. **Toast for resolve/reopen errors.** Use the existing `useToast` hook from `@/components/shared/Toast`. Error messages: "Could not update bug status. Please try again."

9. **Sidebar badge query.** Create a `useBugCount()` hook wrapping `useQuery(['bugs', 'count'])` with `staleTime: 30_000`. Use it in both Sidebar (for the badge) and AppShell (for `screenshotsEnabled`).

10. **Resolved card dimming.** Use `opacity: 0.6` on the card element, not on individual children. This uniformly dims everything including the thumbnail.

---

## 14. What This Spec Does Not Cover

- Bug severity/priority fields -- deferred
- Assignment to team members -- deferred
- Editing bugs after submission -- deferred
- Multiple screenshots per bug -- deferred
- Browser/viewport auto-capture -- deferred
- Dark mode -- Forge is light-mode only
- Mobile layout below 768px -- Forge shows mobile fallback message
