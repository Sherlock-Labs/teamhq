# Custom Meetings — Design Spec

**Author**: Robert (Product Designer)
**Date**: Feb 9, 2026
**Status**: Draft
**Depends on**: docs/custom-meetings-requirements.md, docs/custom-meetings-tech-approach.md

## Overview

Extend the meetings section UI to support creating custom meetings with participant selection and instructions. The design follows existing meeting patterns — same card layout, same detail view, same toolbar location — with a new creation form and participant display on cards.

## Design Principles

- **Fast to create** — the CEO should go from idea to running meeting in under 30 seconds
- **Consistent** — custom meetings look and feel like charter/weekly meetings in the list
- **Scannable** — participant avatars on cards instantly tell you who was in the meeting
- **Minimal new UI** — extend existing patterns, don't invent new ones

## New Components

### 1. "New Meeting" Button

**Location**: In the `.meetings__buttons` group, alongside "Run Charter" and "Run Weekly".

**Style**: Same `.meetings__run-btn` base class. Uses indigo color to differentiate from charter (green) and weekly (violet).

```css
.meetings__run-btn--custom {
  background: var(--color-indigo-500);
}
.meetings__run-btn--custom:hover:not(:disabled) {
  background: var(--color-indigo-600);
}
```

**Label**: "New Meeting"

**Behavior**: Clicking toggles the creation form visibility. Button text changes to "Cancel" when the form is open. Disabled while a meeting is running.

### 2. Creation Form

**Location**: Below the meetings toolbar, above the meetings list. Uses a collapsible panel with the same `grid-template-rows` animation pattern as other expand/collapse elements in the app.

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Select Participants (2-6)                          3 selected  │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ [avatar] │ │ [avatar] │ │ [avatar] │ │ [avatar] │  ...     │
│  │  Thomas  │ │  Andrei  │ │  Robert  │ │  Alice   │          │
│  │   PM     │ │   Arch   │ │ Designer │ │   FE     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ What should they discuss?                                │  │
│  │                                                          │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                          [ Start Meeting ]      │
└─────────────────────────────────────────────────────────────────┘
```

#### Participant Grid

- **Container**: CSS Grid, `grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))`, gap `var(--space-3)`
- **Each cell**: Clickable card with avatar (24x24), name (bold), and short role label
- **Unselected state**: `background: var(--color-bg-secondary)`, `border: 1px solid var(--color-border)`, `color: var(--color-text-secondary)`
- **Selected state**: `border-color: var(--color-accent)`, `background: var(--color-accent-bg)`, `color: var(--color-text-primary)`
- **Hover** (unselected): `border-color: var(--color-border-strong)`
- **Max selection (6 reached)**: Unselected cards get `opacity: 0.4`, `pointer-events: none`
- **Keyboard**: Each card is a `<button>` with `role="checkbox"` and `aria-checked`

#### Count Indicator

- Text in the header row: "X selected" in `var(--color-text-secondary)`
- When < 2 selected: text turns `var(--color-status-warning)` with "(min 2)" hint
- When 6 selected: text turns `var(--color-accent)` with "(max)" hint

#### Instructions Textarea

- Standard textarea styling matching other inputs in the app
- `background: var(--color-bg-secondary)`
- `border: 1px solid var(--color-border)`
- `border-radius: var(--radius-md)`
- `padding: var(--space-3)`
- `font-family: var(--font-family)`, `font-size: var(--text-sm)`
- `min-height: 80px`, `resize: vertical`
- Placeholder: "What should they discuss?"
- **Focus state**: `border-color: var(--color-accent)`, `outline: none`, `box-shadow: 0 0 0 2px rgba(var(--color-green-accent-rgb), 0.15)`

#### Start Meeting Button

- Full-width on mobile, right-aligned on desktop
- Same styling as `.meetings__run-btn--custom` (indigo background, white text)
- **Disabled** when: fewer than 2 participants selected OR instructions empty OR a meeting is running
- **Disabled style**: `opacity: 0.4`, `cursor: not-allowed`

### 3. Custom Meeting Card Badge

Add a new badge variant for the custom type:

```css
.meeting-card__badge--custom {
  color: var(--color-indigo-500);
  background: rgba(var(--color-indigo-400-rgb), 0.08);
}
```

### 4. Participant Avatars on Card

**Location**: Below the badge/meta row on custom meeting cards, above the summary text.

**Layout**: Horizontal row of small (20x20) circular avatar images with a slight overlap (negative margin-left for 2nd+ avatars).

```
[Charter] #1                    │  [Custom] #3
Meeting summary here...         │  👤👤👤 Thomas, Alice, Jonah
                                │  Meeting summary here...
```

**CSS**:
```css
.meeting-card__participants {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.meeting-card__participant-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--color-bg-card);
  margin-left: -6px;
}

.meeting-card__participant-avatar:first-child {
  margin-left: 0;
}

.meeting-card__participant-names {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-left: var(--space-2);
}
```

### 5. Instructions Display in Detail View

When expanding a custom meeting card, show the CEO's instructions at the top of the detail view, before key takeaways:

```css
.meeting-detail__instructions {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-style: italic;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-4);
}

.meeting-detail__instructions-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
  font-style: normal;
}
```

## Responsive Behavior

### Mobile (< 640px)

- Creation form participant grid: 3 columns (`grid-template-columns: repeat(3, 1fr)`)
- Participant cards shrink — avatar hidden, just name and abbreviated role
- Start Meeting button: full-width
- Toolbar stacks vertically (existing behavior), New Meeting button in button group

### Tablet (640-1023px)

- Participant grid: 4-5 columns
- Otherwise same as desktop

### Desktop (1024+)

- Participant grid: 6 columns (fits all 18 agents in 3 rows)
- Start Meeting button right-aligned

## Interaction States

### Form Open/Close Animation

Use the same `grid-template-rows: 0fr` → `1fr` pattern used throughout the app:

```css
.meetings__create-form {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
}

.meetings__create-form[aria-hidden="false"] {
  grid-template-rows: 1fr;
}

.meetings__create-form-inner {
  overflow: hidden;
}
```

### Meeting Running State

When a custom meeting starts:
- The creation form collapses and the toggle button becomes disabled
- A running card appears at the top of the list (same as existing running state)
- The running card shows "Custom" badge and participant avatars
- The "New Meeting" button text changes to "Running..." and becomes disabled

## Accessibility

- Participant cards are `<button role="checkbox" aria-checked="true|false">`
- Form has `aria-hidden` attribute toggled with button
- Count indicator is a `<span role="status" aria-live="polite">` for screen reader updates
- Instructions textarea has a visible `<label>`
- Start Meeting button has `aria-disabled` when validation fails
- Keyboard: Tab through participant cards, Space/Enter to toggle, Tab to textarea, Tab to submit

## No New Tokens

All styling uses existing design tokens. No new CSS custom properties needed. The indigo badge color (`rgba(var(--color-indigo-400-rgb), 0.08)`) already has an RGB token available.
