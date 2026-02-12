# Tasks Multi-Select Bulk Action Bar Design Spec

**Status:** Draft
**Owner:** Robert (Designer)
**Date:** 2024-05-23

## 1. Overview
This specification covers the visual design and interaction for the **Bulk Action Bar**, a floating control panel that appears when users select one or more tasks in the main grid. It provides high-contrast, efficient access to batch operations (Status, Priority, Owner, Delete).

## 2. Layout & Positioning

### Container
- **Position:** Fixed at the bottom of the viewport.
- **Offset:** `bottom: 24px` (Floating effect) or `bottom: 0` (Full width).
  - *Decision:* **Floating Pill** style for better aesthetics and less visual weight.
- **Width:** `min(90vw, 800px)` — centered horizontally.
- **Z-Index:** `40` (Above grid content, below `task-detail` panel [160] and `toast` [300]).
- **Padding:** `--space-3` (vertical) `--space-4` (horizontal).
- **Border Radius:** `--radius-lg` (or `9999px` / pill shape).
- **Flex Layout:** `flex-row`, `align-center`, `gap: --space-4`.

### Visual Style (Dark Theme)
- **Background:** `--color-neutral-900` (#171717) — High contrast against white page.
- **Border:** `1px solid --color-neutral-700` (#404040).
- **Shadow:** `--shadow-lg` + additional drop shadow for lift: `0 8px 24px rgba(0,0,0,0.2)`.

## 3. Component Details

### 3.1 Selection Counter
- **Text:** "X selected"
- **Typography:** `--text-sm`, `--font-weight-medium`.
- **Color:** `--color-white`.
- **Separator:** Vertical divider after counter.
  - Height: `20px`
  - Width: `1px`
  - Color: `--color-neutral-700`

### 3.2 Action Controls

All controls must work on the dark background.

#### Dropdowns (Status, Priority)
- **Appearance:** Native select or custom trigger styled to match dark theme.
- **Background:** `--color-neutral-800` (slightly lighter than bar).
- **Text:** `--color-white`, `--text-sm`.
- **Border:** `1px solid --color-neutral-700`.
- **Radius:** `--radius-sm`.
- **Height:** `32px`.
- **Hover:** Border `--color-neutral-500`.
- **Focus:** Ring `--color-accent` (Green).

#### Owner Input Group
- **Input:**
  - Background: `--color-neutral-800`.
  - Text: `--color-white` (Placeholder: `--color-neutral-500`).
  - Border: `1px solid --color-neutral-700`.
  - Height: `32px`.
  - Width: `140px` (transition to `180px` on focus if space permits).
- **Apply Button:**
  - Style: Ghost or Secondary (Dark context).
  - Text: "Apply" (or icon).
  - Color: `--color-accent-400` (Light green/emerald) for visibility on dark.
  - *Refinement:* Let's use a solid button if space permits, or an inline "Arrow" icon button inside the input.
  - *Decision:* **Secondary Button** next to input.
  - Bg: `transparent`. Border: `1px solid --color-neutral-600`. Text: `--color-white`.

#### Delete Action
- **Style:** Icon-only button (Trash can) or Text "Delete".
- **Position:** Far right (margin-left: auto).
- **Color:** `--color-red-400` (lighter red for dark bg).
- **Hover:** Bg `rgba(248, 113, 113, 0.1)` (Red-400 at 10%).

## 4. Interaction States

| Element | State | Visual Change |
|---------|-------|---------------|
| **Bar** | **Entrance** | Slide up from bottom (`translateY(100%)` -> `0`), fade in opacity. Duration: `200ms ease-out`. |
| **Bar** | **Exit** | Slide down (`translateY(100%)`), fade out. Duration: `150ms ease-in`. |
| **Button/Select** | **Hover** | `border-color: --color-neutral-500`, `bg: --color-neutral-800`. |
| **Button/Select** | **Focus** | `outline: 2px solid --color-accent`, `outline-offset: 2px`. |
| **Apply Btn** | **Disabled** | `opacity: 0.5`, `cursor: not-allowed` (when input is empty). |
| **Delete** | **Hover** | Text/Icon becomes brighter, background tint appears. |

## 5. Mobile Responsiveness

**Breakpoint:** `< 640px`

- **Layout:** Change from **Floating Pill** to **Fixed Bottom Sheet**.
  - Width: `100%`.
  - Bottom: `0`.
  - Border-radius: `var(--radius-lg) var(--radius-lg) 0 0`.
  - Padding: `--space-4`.
- **Controls:**
  - Stack controls if necessary, or use horizontal scroll.
  - *Recommendation:* Hide "Owner" input behind a "More..." button or simplify to just Status/Delete if space is tight.
  - *Decision for v1:* Wrap flex items.
    - Row 1: "X selected" | Delete (Right aligned)
    - Row 2: Status | Priority | Owner (Full width)
    - Gap: `--space-3`.

## 6. Implementation CSS Specs

```css
/* Container */
.bulk-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(120%); /* Start hidden */
  width: min(90vw, 800px);
  background: var(--color-neutral-900);
  border: 1px solid var(--color-neutral-700);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  z-index: 40;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); /* Apple-ish ease */
}

.bulk-action-bar.visible {
  transform: translateX(-50%) translateY(0);
}

/* Items */
.bulk-action-bar__count {
  color: var(--color-white);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  padding-right: var(--space-4);
  border-right: 1px solid var(--color-neutral-700);
}

/* Controls Wrapper */
.bulk-action-bar__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
}

/* Dark Theme Selects */
.bulk-action-bar select {
  background-color: var(--color-neutral-800);
  color: var(--color-white);
  border: 1px solid var(--color-neutral-700);
  border-radius: var(--radius-sm);
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}

/* Dark Theme Inputs */
.bulk-action-bar input[type="text"] {
  background-color: var(--color-neutral-800);
  color: var(--color-white);
  border: 1px solid var(--color-neutral-700);
  border-radius: var(--radius-sm);
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
  width: 140px;
}

.bulk-action-bar input::placeholder {
  color: var(--color-neutral-500);
}

/* Apply Button */
.bulk-action-bar button:not(.bulk-action-bar__delete) {
  background: transparent;
  color: var(--color-emerald-400); /* Green text */
  border: 1px solid var(--color-neutral-700);
  border-radius: var(--radius-sm);
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.bulk-action-bar button:not(.bulk-action-bar__delete):hover {
  border-color: var(--color-emerald-400);
  background: rgba(var(--color-emerald-400-rgb), 0.1);
}

/* Delete Button */
.bulk-action-bar__delete {
  margin-left: auto; /* Push to right */
  background: transparent;
  color: var(--color-red-400);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bulk-action-bar__delete:hover {
  background: rgba(248, 113, 113, 0.15);
}

/* Mobile Overrides */
@media (max-width: 640px) {
  .bulk-action-bar {
    width: 100%;
    bottom: 0;
    left: 0;
    transform: translateY(100%);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    flex-wrap: wrap;
    padding: var(--space-4);
    gap: var(--space-3);
  }
  
  .bulk-action-bar.visible {
    transform: translateY(0);
  }

  .bulk-action-bar__count {
    border-right: none;
    flex: 1;
  }

  .bulk-action-bar__controls {
    width: 100%;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  
  .bulk-action-bar select,
  .bulk-action-bar .input-group {
    flex: 1;
    min-width: 120px;
  }
}
```

## 7. Accessibility
- **Contrast:** Ensure white text on `neutral-900` meets 4.5:1 (it does, roughly 16:1).
- **Keyboard:** All inputs/buttons must be focusable. Focus ring must be visible against dark bg (`--color-accent` works well).
- **Screen Readers:**
  - Bar should have `role="region"` or `aria-live="polite"` so users know it appeared.
  - "X selected" should be announced.

## 8. Assets
- **Icons:** Use SVG for Delete (Trash) if available, otherwise text "Delete".
