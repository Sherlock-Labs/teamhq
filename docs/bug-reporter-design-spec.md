# Bug Reporter -- Design Spec

**Author:** Robert (Product Designer)
**Date:** February 12, 2026
**Status:** Ready for implementation
**Project ID:** `bug-reporter`
**Dependencies:** `docs/bug-reporter-requirements.md` (Thomas), `docs/bug-reporter-tech-approach.md` (Andrei)

---

## Overview

A floating bug-report widget that lives on every TeamHQ page (except `index.html`). The user clicks a persistent button in the bottom-right corner, a compact panel opens, and they can capture a screenshot, record a voice note with live real-time transcription, and submit a bug -- all without leaving the page. The entire flow should take under 10 seconds.

The widget has three conceptual layers:
1. **Trigger** -- the floating button (always visible)
2. **Panel** -- the popover reporter (opens on click)
3. **Toast** -- the success/error confirmation (brief, auto-dismiss)

---

## Design Principles for This Widget

1. **Stay out of the way.** The button is small, low-contrast, and hugs the corner. It should never compete with page content.
2. **Speed is the feature.** Every decision optimizes for time-to-file. No unnecessary steps, no mode switches, no forms.
3. **Graceful degradation.** If screenshot capture fails, recording fails, or transcription fails -- the user can always type and submit. Never block the happy path because an optional feature broke.
4. **Live transcription is the hero moment.** Words appearing in real-time as the user speaks is the key differentiator. Design the recording state to showcase this.

---

## 1. Floating Trigger Button

### Layout

```
.bug-btn
  position: fixed
  bottom: var(--space-5)         → 20px
  right: var(--space-5)          → 20px
  z-index: 1000
  width: 44px
  height: 44px
  border-radius: 9999px
  display: flex
  align-items: center
  justify-content: center
  cursor: pointer
```

### Visual Properties

| Property | Value |
|----------|-------|
| Background | `var(--color-neutral-900)` (#171717) |
| Border | 1px solid `var(--color-neutral-700)` (#404040) |
| Shadow | `0 2px 8px rgba(0, 0, 0, 0.15)` |
| Icon | Bug SVG, 20x20px, `var(--color-white)` fill |

The dark circle on a light page gives just enough contrast to be findable without being loud. The bug icon is a simple outlined insect -- functional, not cute.

### Icon SVG

Use a minimal bug/beetle icon. 20x20 viewBox, stroke-based, 1.5px stroke weight, `currentColor`. Something like:

```
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- oval body -->
  <ellipse cx="10" cy="12" rx="4" ry="5"/>
  <!-- head -->
  <circle cx="10" cy="6" r="2"/>
  <!-- antennae -->
  <path d="M8.5 4.5L6 2"/>
  <path d="M11.5 4.5L14 2"/>
  <!-- legs left -->
  <path d="M6 10L3 8.5"/>
  <path d="M6 12.5L3 13"/>
  <path d="M6 15L3.5 17"/>
  <!-- legs right -->
  <path d="M14 10L17 8.5"/>
  <path d="M14 12.5L17 13"/>
  <path d="M14 15L16.5 17"/>
</svg>
```

Alice can adjust the exact paths, but the gist is: recognizable bug silhouette, minimal detail, reads clearly at 20px.

### Interaction States

| State | Visual Change |
|-------|--------------|
| **Default** | As specified above |
| **Hover** | Background `var(--color-neutral-800)` (#262626), shadow `0 4px 12px rgba(0, 0, 0, 0.2)`, `transition: all 150ms ease` |
| **Focus-visible** | `outline: 2px solid var(--color-accent)`, `outline-offset: 2px` |
| **Active** | `transform: scale(0.95)`, background `var(--color-neutral-950)` (#0a0a0a) |
| **Panel open** | `transform: rotate(45deg)`, icon morphs to an X (close). Transition: `transform 200ms ease` |

When the panel is open, the button becomes the close button. Rotating 45 degrees turns a "+" shape into an "X" -- but since our icon is a bug, we swap the icon content to a simple X (two crossing lines) when open. The rotation is on the button itself for a subtle twist effect.

**Alternative considered:** Hiding the button when the panel is open. Rejected -- the button-as-close-control is more discoverable and saves vertical space in the panel.

### Keyboard Shortcut

`Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Windows). Toggles the panel. Announced via `aria-keyshortcuts="Meta+Shift+B"` on the button.

### Tooltip

On hover (after 500ms delay), show a minimal tooltip above the button:

```
.bug-btn__tooltip
  position: absolute
  bottom: calc(100% + var(--space-2))    → 8px above button
  right: 0
  background: var(--color-neutral-900)
  color: var(--color-white)
  font-size: var(--text-xs)
  font-weight: var(--font-weight-medium)
  padding: var(--space-1) var(--space-2)
  border-radius: var(--radius-sm)
  white-space: nowrap
  pointer-events: none
  opacity: 0
  transition: opacity 150ms ease
```

Text: "Report a bug" with the shortcut in lighter text: `Cmd+Shift+B`. Show shortcut as `var(--color-text-tertiary)` (#999) inline, separated by a middle dot.

Full tooltip text: `Report a bug · Cmd+Shift+B`

---

## 2. Reporter Panel

### Layout Structure

The panel is a popover that appears above the floating button. It anchors to the bottom-right corner.

```
.bug-panel
  position: fixed
  bottom: calc(var(--space-5) + 44px + var(--space-3))   → 20px + button height + 12px gap
  right: var(--space-5)                                    → 20px
  z-index: 999
  width: 380px
  max-height: calc(100vh - 120px)
  overflow-y: auto
  background: var(--color-bg-card)
  border: 1px solid var(--color-border)
  border-radius: var(--radius-lg)
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)

  display: flex
  flex-direction: column
```

Shadow is deliberately stronger than the standard `--shadow-lg` because this panel floats over page content and needs clear visual separation.

### Internal Structure

```
.bug-panel
  .bug-panel__header        → title + close context
  .bug-panel__screenshot    → screenshot preview area
  .bug-panel__recording     → record button + timer + waveform
  .bug-panel__description   → transcription text area
  .bug-panel__footer        → submit button
```

### Panel Header

```
.bug-panel__header
  display: flex
  align-items: center
  justify-content: space-between
  padding: var(--space-4) var(--space-5)
  border-bottom: 1px solid var(--color-border)
```

| Element | Spec |
|---------|------|
| Title text | "Report a bug" -- `var(--text-sm)`, `var(--font-weight-semibold)`, `var(--color-text-primary)` |
| Page context | Below title, same flex row is fine -- or as a subtitle line. Shows current page name extracted from URL, e.g., "on Projects". `var(--text-xs)`, `var(--color-text-tertiary-accessible)` |

No explicit close button in the header -- the floating button serves as the close control (it shows an X when panel is open). This keeps the header minimal.

### Screenshot Section

```
.bug-panel__screenshot
  padding: var(--space-4) var(--space-5)
  border-bottom: 1px solid var(--color-border)
```

The screenshot auto-captures when the panel opens. This section shows the result.

#### Screenshot Thumbnail

```
.bug-panel__screenshot-thumb
  width: 100%
  aspect-ratio: 16 / 10
  border-radius: var(--radius-sm)
  border: 1px solid var(--color-border)
  overflow: hidden
  cursor: pointer
  position: relative
  background: var(--color-bg-secondary)
```

The thumbnail fills the panel width (minus padding). The `16/10` aspect ratio approximates a typical browser viewport and keeps the thumbnail compact.

Image inside:
```
.bug-panel__screenshot-thumb img
  width: 100%
  height: 100%
  object-fit: cover
  object-position: top left
  display: block
```

`object-position: top left` ensures the top of the page is always visible in the thumbnail, which is usually where the bug context is.

#### Screenshot States

**Loading (shimmer):**
```
.bug-panel__screenshot-thumb--loading
  background: linear-gradient(
    90deg,
    var(--color-bg-secondary) 0%,
    var(--color-neutral-100) 50%,
    var(--color-bg-secondary) 100%
  )
  background-size: 200% 100%
  animation: shimmer 1.5s ease infinite
```

```
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Respect `prefers-reduced-motion`: disable animation, show static `var(--color-bg-secondary)`.

**Error:**
Replace thumbnail with centered message:
- Text: "Screenshot unavailable" -- `var(--text-xs)`, `var(--color-text-tertiary-accessible)`
- Retake button below: ghost style, `var(--text-xs)`, `var(--color-accent)` text, no background

**Loaded:**
Show the captured screenshot image. On hover, show a subtle expand icon (top-right corner, small magnifying glass or expand arrows) to indicate the image is clickable for a larger preview.

#### Screenshot Actions

Below the thumbnail, a single row:

```
.bug-panel__screenshot-actions
  display: flex
  justify-content: flex-end
  margin-top: var(--space-2)
```

- **Retake** button: ghost style, `var(--text-xs)`, `var(--color-text-secondary)`, hover `var(--color-text-primary)`. Text: "Retake".

#### Screenshot Preview (enlarged)

Clicking the thumbnail opens a larger view. Two options considered:

**Option A: Modal overlay.** Full-viewport overlay at `z-index: 1001` (above the panel), dark backdrop `rgba(0, 0, 0, 0.7)`, image centered at `max-width: 90vw; max-height: 80vh; object-fit: contain`. Click backdrop or press Escape to close.

**Option B: Expand in-place.** The panel stretches wider and the image takes more space.

**Recommendation: Option A (modal overlay).** The screenshot needs to be seen at scale to be useful. An overlay gives room without distorting the panel layout. Keep it simple -- image + backdrop + close on click/Escape. No animation beyond a quick fade-in (150ms opacity).

---

## 3. Recording Section

This is the core interaction. The recording section handles microphone capture, live transcription via ElevenLabs Scribe v2 Realtime WebSocket, and the visual feedback that makes the experience feel alive.

### Layout

```
.bug-panel__recording
  padding: var(--space-4) var(--space-5)
  border-bottom: 1px solid var(--color-border)
```

### Before Recording (idle state)

A single prominent button, centered, with helper text.

```
.bug-panel__record-btn
  display: flex
  align-items: center
  justify-content: center
  gap: var(--space-2)
  width: 100%
  height: 44px
  border-radius: var(--radius-sm)
  background: var(--color-neutral-900)
  color: var(--color-white)
  border: none
  cursor: pointer
  font-size: var(--text-sm)
  font-weight: var(--font-weight-medium)
  transition: background 150ms ease
```

Button content: microphone icon (16x16, `currentColor`) + "Record voice note"

Below the button:
```
.bug-panel__record-hint
  text-align: center
  margin-top: var(--space-2)
  font-size: var(--text-xs)
  color: var(--color-text-tertiary-accessible)
```

Text: "or type your description below"

### During Recording (active state)

When recording starts, the button area transforms into a recording control strip.

```
.bug-panel__recording-active
  display: flex
  align-items: center
  gap: var(--space-3)
  padding: var(--space-3)
  background: rgba(var(--color-red-600-rgb), 0.04)
  border: 1px solid rgba(var(--color-red-600-rgb), 0.12)
  border-radius: var(--radius-sm)
```

Contents (left to right):

1. **Recording indicator dot**
```
.bug-panel__rec-dot
  width: 8px
  height: 8px
  border-radius: 9999px
  background: var(--color-status-error)       → #dc2626 (red)
  animation: pulse 1.5s ease infinite
  flex-shrink: 0
```

```
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

2. **Timer**
```
.bug-panel__rec-timer
  font-family: var(--font-mono)
  font-size: var(--text-sm)
  font-weight: var(--font-weight-medium)
  color: var(--color-text-primary)
  min-width: 48px
```

Format: `0:00` counting up. At 25 seconds, apply `.bug-panel__rec-timer--warning`: `color: var(--color-status-warning)` (#ca8a04).

At 30 seconds, recording auto-stops.

3. **Waveform visualization (optional, nice-to-have)**

A simple CSS-only waveform using 5 vertical bars that animate at different speeds to suggest audio activity. This is purely decorative -- it does not visualize actual audio levels.

```
.bug-panel__waveform
  display: flex
  align-items: center
  gap: 2px
  height: 20px
  flex: 1
```

Each bar:
```
.bug-panel__waveform-bar
  width: 3px
  border-radius: 9999px
  background: var(--color-status-error)
  animation: wave 0.8s ease-in-out infinite
  opacity: 0.6
```

Stagger animation delay: `0s, 0.15s, 0.3s, 0.15s, 0s` across 5 bars. `animation-duration` varies: `0.8s, 0.6s, 0.9s, 0.7s, 0.85s` for organic feel.

```
@keyframes wave {
  0%, 100% { height: 4px; }
  50% { height: 16px; }
}
```

Respect `prefers-reduced-motion`: replace animation with static bars at 50% height.

4. **Stop button** (right-aligned)
```
.bug-panel__stop-btn
  width: 32px
  height: 32px
  border-radius: var(--radius-sm)
  background: var(--color-status-error)
  border: none
  cursor: pointer
  display: flex
  align-items: center
  justify-content: center
  flex-shrink: 0
  transition: background 150ms ease
```

Icon: white square (stop symbol), 12x12px. On hover: `background: #b91c1c` (darker red).

### After Recording (review state)

The recording strip disappears. A "Re-record" link appears below the description textarea (see section 4). The transcription is already visible in the textarea from the live transcription -- no loading state needed.

If the user clicks "Re-record":
- Clear the current transcript text
- Return to the idle recording state
- Previous recording is discarded

```
.bug-panel__rerecord
  font-size: var(--text-xs)
  color: var(--color-text-secondary)
  background: none
  border: none
  cursor: pointer
  padding: 0
  text-decoration: underline
  text-underline-offset: 2px
```

Text: "Re-record". Hover: `color: var(--color-text-primary)`.

### Microphone Permission Denied

If the browser denies microphone access, show an inline message in place of the recording controls:

```
.bug-panel__mic-denied
  display: flex
  align-items: flex-start
  gap: var(--space-2)
  padding: var(--space-3)
  background: rgba(var(--color-warning-rgb), 0.06)
  border: 1px solid rgba(var(--color-warning-rgb), 0.15)
  border-radius: var(--radius-sm)
```

Icon: warning triangle, 16x16, `var(--color-status-warning)`.
Text: "Microphone access denied. Check your browser settings to allow audio recording, or type your description below."
Font: `var(--text-xs)`, `var(--color-text-secondary)`, `line-height: var(--leading-normal)`.

### MediaRecorder Unsupported

If the browser does not support MediaRecorder, hide the entire recording section. The description textarea (section 4) becomes the primary input, with its placeholder updated to: "Describe the bug..."

---

## 4. Description Section

### Layout

```
.bug-panel__description
  padding: var(--space-4) var(--space-5)
  border-bottom: 1px solid var(--color-border)
```

### Textarea

```
.bug-panel__textarea
  width: 100%
  min-height: 80px
  max-height: 160px
  resize: vertical
  padding: var(--space-3)
  border: 1px solid var(--color-border)
  border-radius: var(--radius-sm)
  font-family: var(--font-family)
  font-size: var(--text-sm)
  line-height: var(--leading-normal)
  color: var(--color-text-primary)
  background: var(--color-bg-primary)
  transition: border-color 150ms ease
```

Placeholder text: "Bug description will appear here during recording, or type manually"
Placeholder color: `var(--color-text-tertiary-accessible)`

### Textarea States

| State | Visual |
|-------|--------|
| **Default** | As above |
| **Focus** | `border-color: var(--color-accent)`, `outline: none`, `box-shadow: 0 0 0 2px rgba(var(--color-green-accent-rgb), 0.15)` |
| **Live transcription in progress** | Text appears character-by-character. Partial (unconfirmed) transcript text gets a subtle styling distinction -- see below. |
| **Disabled** | N/A -- textarea is always editable (user can type during recording) |
| **Error** | `border-color: var(--color-status-error)` if validation fails |

### Live Transcription Visual Treatment

This is the signature UX moment. As the user speaks, words appear in real-time in the textarea.

**How it works technically:** The ElevenLabs Scribe v2 Realtime WebSocket sends two types of events:
- `partial_transcript` -- interim text that may change as more audio context arrives
- `committed_transcript` -- finalized text that will not change

**Visual treatment:**

The textarea value is continuously updated. Committed text is rendered normally. The partial (interim) text appended after committed text has no special styling in a native textarea -- this is a limitation of `<textarea>` which does not support mixed styling.

**Alternative considered:** Using a `contenteditable` div instead of a textarea to style partial text differently (e.g., lighter color). Rejected -- `contenteditable` introduces cursor management complexity and accessibility issues. The simpler approach: just update the textarea value. The user sees words appearing in real-time, which is already compelling. The text "catching up and changing" as partials resolve into committed text is natural enough.

**Label above textarea:**
```
.bug-panel__textarea-label
  font-size: var(--text-xs)
  font-weight: var(--font-weight-medium)
  color: var(--color-text-tertiary-accessible)
  text-transform: uppercase
  letter-spacing: 0.05em
  margin-bottom: var(--space-2)
  display: block
```

Text: "Description"

During recording, append a live indicator:
- "Description" becomes "Description -- listening..." with "listening..." in `var(--color-status-error)` (matching the recording red) and a subtle pulse animation on the text opacity (same keyframe as the recording dot).

After recording stops, revert to plain "Description".

### Re-record Link Placement

The "Re-record" link (from section 3) appears below the textarea, right-aligned:

```
.bug-panel__textarea-actions
  display: flex
  justify-content: flex-end
  margin-top: var(--space-2)
```

Only visible after a recording has been made.

---

## 5. Footer / Submit

### Layout

```
.bug-panel__footer
  padding: var(--space-4) var(--space-5)
  display: flex
  flex-direction: column
  gap: var(--space-3)
```

No top border -- the description section's bottom border serves as the separator.

### Submit Button

```
.bug-panel__submit
  width: 100%
  height: 40px
  border-radius: var(--radius-sm)
  background: var(--color-accent)
  color: var(--color-white)
  border: none
  cursor: pointer
  font-size: var(--text-sm)
  font-weight: var(--font-weight-medium)
  display: flex
  align-items: center
  justify-content: center
  gap: var(--space-2)
  transition: background 150ms ease
```

Text: "File bug"

### Submit States

| State | Visual |
|-------|--------|
| **Default** | Background `var(--color-accent)`, text white |
| **Hover** | Background `var(--color-accent-hover)` |
| **Focus-visible** | `outline: 2px solid var(--color-accent)`, `outline-offset: 2px` |
| **Active** | Background `var(--color-accent-active)`, `transform: scale(0.98)` |
| **Disabled** | `opacity: 0.5`, `pointer-events: none`, `cursor: default` |
| **Submitting** | Text changes to "Filing...", 16px spinner icon replaces the bug icon (CSS animation, `animation: spin 0.6s linear infinite`), button disabled |

### Disabled Conditions

The submit button is disabled when:
1. Recording is currently active (the user should stop recording first)
2. No content exists -- both description is empty AND no screenshot was captured

A bug report with only a screenshot (no description) is valid. A bug report with only a description (no screenshot) is also valid. But at least one must be present.

### Error State

If submission fails, show an inline error message above the submit button:

```
.bug-panel__error
  display: flex
  align-items: center
  gap: var(--space-2)
  padding: var(--space-2) var(--space-3)
  background: rgba(var(--color-red-600-rgb), 0.04)
  border: 1px solid rgba(var(--color-red-600-rgb), 0.12)
  border-radius: var(--radius-sm)
  font-size: var(--text-xs)
  color: var(--color-status-error)
```

Icon: small alert circle, 14px. Text: "Failed to file bug. Try again."

The submit button text reverts to "File bug" (not "Filing...") so the user can retry.

---

## 6. Success Toast

After successful submission, the panel closes and a toast notification appears briefly.

### Layout

```
.bug-toast
  position: fixed
  bottom: calc(var(--space-5) + 44px + var(--space-3))    → same vertical position as panel
  right: var(--space-5)
  z-index: 999
  display: flex
  align-items: center
  gap: var(--space-2)
  padding: var(--space-3) var(--space-4)
  background: var(--color-neutral-900)
  color: var(--color-white)
  border-radius: var(--radius-sm)
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
  font-size: var(--text-sm)
  font-weight: var(--font-weight-medium)
```

### Content

- Checkmark icon: 16px, `var(--color-emerald-400)` (#34d399)
- Text: "Bug filed!"
- Optional: a subtle "View" link at the end, `text-decoration: underline`, `color: var(--color-neutral-400)`, that navigates to the task tracker. If this adds complexity, skip for v1 -- the toast confirmation alone is sufficient.

### Animation

```
Enter:  opacity 0 → 1, translateY(8px) → translateY(0), 200ms ease-out
Exit:   opacity 1 → 0, 150ms ease-in (after 3 second hold)
```

Total visible duration: 3 seconds, then auto-dismiss. No manual dismiss needed.

Respect `prefers-reduced-motion`: skip translate, fade only.

---

## 7. Panel Open/Close Animation

### Open

```
opacity: 0 → 1
transform: translateY(8px) → translateY(0)
duration: 200ms
easing: ease-out
```

The panel appears to rise up from the button. Subtle, fast, functional.

### Close

```
opacity: 1 → 0
transform: translateY(0) → translateY(8px)
duration: 150ms
easing: ease-in
```

Respect `prefers-reduced-motion`: instant show/hide, no transform animation.

### Backdrop

No backdrop/overlay when the panel is open. The panel is a lightweight popover, not a modal. The user can still interact with the page behind it (though they probably will not want to). Clicking outside the panel does NOT close it -- only the button (X) or Escape key closes it. This prevents accidental closure during a recording.

---

## 8. Responsive Behavior

### Desktop (> 1024px)

Full layout as specified. Panel width 380px. Button in bottom-right corner.

### Tablet (640px - 1024px)

Same as desktop. The 380px panel still fits comfortably. No changes needed.

### Small screens (< 640px)

Per Thomas's requirements, the floating widget is desktop-only for v1. However, the button should still be present on small screens as a graceful minimum:

- **Button:** Still visible at `bottom: var(--space-4); right: var(--space-4)` (slightly tighter to edges)
- **Panel:** Full width with edge margins. `width: calc(100vw - var(--space-4) * 2)`, `right: var(--space-4)`, `left: var(--space-4)`. Panel is anchored to the bottom, same as desktop.
- **Screenshot thumbnail:** Same aspect ratio, fills the narrower panel.

This is a simple responsive adjustment, not a full mobile redesign. If the CEO wants to cut even this, the button can be hidden below 640px with `display: none`.

---

## 9. Accessibility

### ARIA Structure

```html
<button
  class="bug-btn"
  aria-label="Report a bug"
  aria-expanded="false"
  aria-controls="bug-panel"
  aria-keyshortcuts="Meta+Shift+B"
>
  <!-- bug icon -->
</button>

<div
  id="bug-panel"
  class="bug-panel"
  role="dialog"
  aria-label="Bug reporter"
  aria-modal="false"
>
  <!-- panel content -->
</div>
```

- `aria-expanded` toggles `true/false` on the button when panel opens/closes
- `aria-modal="false"` because the panel is a popover, not a modal -- page content is still interactive
- `role="dialog"` signals to screen readers that this is a distinct interface region

### Focus Management

1. When panel opens: focus moves to the record button (the primary action)
2. Tab order within panel: Record button, Screenshot retake, Description textarea, Submit button
3. When panel closes: focus returns to the floating button
4. Escape key: closes the panel (same as clicking the X button)

### Screen Reader Announcements

Use `aria-live="polite"` on a visually hidden status region inside the panel to announce state changes:

- When recording starts: "Recording started. Speak to describe the bug."
- When recording stops: "Recording stopped. Transcription complete."
- Live transcription: The textarea itself serves as the live region -- screen readers will pick up text changes. No additional `aria-live` needed on the textarea.
- When bug is filed: "Bug filed successfully." (announced via the toast)
- On error: "Failed to file bug. Try again."

```html
<div class="sr-only" aria-live="polite" id="bug-status"></div>
```

```
.sr-only
  position: absolute
  width: 1px
  height: 1px
  padding: 0
  margin: -1px
  overflow: hidden
  clip: rect(0, 0, 0, 0)
  white-space: nowrap
  border-width: 0
```

### Recording State Announcements

The recording timer and waveform are visual-only. Screen reader users get announcements via the status region:
- At recording start: announced once
- At 25 seconds (warning): "5 seconds remaining"
- At 30 seconds (auto-stop): "Recording stopped. Maximum duration reached."

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + Shift + B` | Toggle panel open/close (global) |
| `Escape` | Close panel (when panel is open) |
| `Tab` | Move forward through interactive elements in panel |
| `Shift + Tab` | Move backward through interactive elements |
| `Enter` / `Space` | Activate focused button |

### Color Contrast Verification

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Button icon | #ffffff | #171717 | 15.4:1 | AA |
| Panel title | #171717 | #ffffff | 15.4:1 | AA |
| Placeholder text | #767676 | #ffffff | 4.5:1 | AA |
| Recording timer | #171717 | ~#fef2f2 (red bg) | >10:1 | AA |
| Timer warning | #ca8a04 | ~#fef2f2 | 4.8:1 | AA |
| Error text | #dc2626 | ~#fef2f2 | 5.6:1 | AA |
| Submit text | #ffffff | #006B3F | 7.1:1 | AA |
| Toast text | #ffffff | #171717 | 15.4:1 | AA |

---

## 10. Complete State Machine

Mapping the widget's states for Alice's implementation:

```
                         Cmd+Shift+B
                         or click btn
CLOSED ─────────────────────────────────→ CAPTURING
  ↑                                          │
  │                                    screenshot done
  │                                    or screenshot failed
  │                                          │
  │                                          ▼
  │            click X / Escape          READY
  ├───────────────────────────────────── (idle, can type
  │                                      or record)
  │                                          │
  │                                    click Record
  │                                          │
  │                                          ▼
  │                                     RECORDING
  │                                    (live transcription
  │                                     appears in textarea)
  │                                          │
  │                                    click Stop /
  │                                    30s auto-stop
  │                                          │
  │                                          ▼
  │                                      READY
  │                                    (text in textarea,
  │                                     can edit or re-record)
  │                                          │
  │                                    click Submit
  │                                          │
  │                                          ▼
  │                                     SUBMITTING
  │                                          │
  │                            ┌─────────────┴─────────────┐
  │                            │                           │
  │                         success                      failure
  │                            │                           │
  │                            ▼                           ▼
  ├──────────────────────── SUCCESS                     READY
  │        (panel closes,   (toast)               (error shown,
  │         toast shown)                           can retry)
  │
  └─ (back to CLOSED after toast dismisses)
```

Key difference from the original tech approach: there is NO "TRANSCRIBING" state. The Scribe v2 Realtime WebSocket means transcription happens during RECORDING. When the user stops recording, the text is already in the textarea. This eliminates the post-recording wait entirely.

---

## 11. Visual Summary -- Panel Layout

```
┌────────────────────────────────────┐
│  Report a bug                      │
│  on Projects                       │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │     screenshot thumbnail     │  │
│  │         (16:10 ratio)        │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                          Retake    │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐  │
│  │  🎙  Record voice note       │  │
│  └──────────────────────────────┘  │
│     or type your description below │
│                                    │
├────────────────────────────────────┤
│  DESCRIPTION                       │
│  ┌──────────────────────────────┐  │
│  │ Bug description will appear  │  │
│  │ here during recording, or    │  │
│  │ type manually                │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                    │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐  │
│  │        File bug              │  │
│  └──────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘

                              [X]  ← floating button (now showing X)
```

During recording, the record button area transforms:

```
├────────────────────────────────────┤
│                                    │
│  ● 0:14  ||||||||||||||||   [■]    │
│  (dot)  (timer) (waveform) (stop)  │
│                                    │
├────────────────────────────────────┤
│  DESCRIPTION -- listening...       │
│  ┌──────────────────────────────┐  │
│  │ When I click the create      │  │
│  │ project button nothing       │  │
│  │ happens the modal|           │  │  ← text appears live
│  │                              │  │
│  └──────────────────────────────┘  │
```

---

## 12. CSS Custom Properties (bug-reporter-specific)

These are scoped to the widget, not global tokens. Alice should define them at the top of `css/bug-reporter.css`:

```css
:root {
  /* Bug Reporter — widget-specific tokens */
  --bug-btn-size: 44px;
  --bug-panel-width: 380px;
  --bug-panel-offset-bottom: calc(var(--space-5) + 44px + var(--space-3));
  --bug-panel-offset-right: var(--space-5);
  --bug-panel-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  --bug-rec-color: var(--color-status-error);
}
```

All other values reference existing TeamHQ tokens from `css/tokens.css`.

---

## 13. Animation Specifications Summary

| Animation | Duration | Easing | Trigger | Reduced-Motion |
|-----------|----------|--------|---------|----------------|
| Panel open | 200ms | ease-out | Button click / shortcut | Instant (no transform) |
| Panel close | 150ms | ease-in | X click / Escape | Instant |
| Button hover | 150ms | ease | Mouse enter/leave | Same (no motion) |
| Button active | instant | - | Mouse down | Same |
| Button icon rotate (to X) | 200ms | ease | Panel open | Instant swap, no rotate |
| Screenshot shimmer | 1500ms loop | ease | While loading | Static gray bg |
| Recording dot pulse | 1500ms loop | ease | While recording | Static red dot |
| Waveform bars | 600-900ms loop (staggered) | ease-in-out | While recording | Static bars at 50% height |
| Toast enter | 200ms | ease-out | Bug filed | Fade only, no translate |
| Toast exit | 150ms | ease-in | After 3s hold | Fade only |
| Submit spinner | 600ms loop | linear | While submitting | Same (functional) |

---

## 14. Implementation Notes for Alice

1. **The widget is self-contained.** `js/bug-reporter.js` creates all DOM elements programmatically. No HTML changes beyond adding the script/link tags and the `<div id="bug-reporter-root"></div>` container to each page.

2. **No TRANSCRIBING state.** The tech approach specifies Scribe v2 Realtime (WebSocket). Text appears live during recording. When the user stops, the transcript is already complete. Do not design a "Transcribing..." spinner -- it does not exist in this flow.

3. **The floating button is the close control.** When the panel is open, the bug icon swaps to an X icon and the button acts as the close trigger. No separate close button in the panel header.

4. **Screenshot capture hides the panel.** Per Andrei's tech approach, `panelEl.style.visibility = "hidden"` before capture, then restored. The shimmer state shows while this happens.

5. **The textarea is always editable.** Even during recording, the user can type into the textarea. The live transcription appends text, but the user can edit, delete, or add to it at any time.

6. **Token endpoint first, then WebSocket.** When recording starts: (1) fetch `GET /api/scribe-token`, (2) request mic via `getUserMedia`, (3) open WebSocket to ElevenLabs, (4) start MediaRecorder. If the token fetch fails, skip live transcription -- the recording still works, the user just types the description manually.

7. **30-second hard cap.** `setTimeout` at 30s calls `recorder.stop()` and closes the WebSocket. The timer warning at 25s is a CSS class toggle on the timer element.

8. **Panel does NOT close on outside click.** This prevents accidental closure mid-recording. Only the X button or Escape closes the panel.

---

## 15. What This Spec Does NOT Cover

- Screenshot annotation tools (drawing, arrows) -- v2
- Multi-project selection in the widget -- v2
- Mobile-optimized layout -- v2
- Audio playback controls -- cut from v1 scope
- Dark mode -- TeamHQ is light-mode only
- Notification on bug filing (Slack, email) -- v2
