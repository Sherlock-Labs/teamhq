# TeamHQ Project Kickoff - Design Spec

## Overview

Phase 2 adds depth to the project management UI: richer project context (goals, constraints, brief), an expandable detail view on each card, a "Start Work" flow that generates a kickoff prompt, and inline progress notes. All new elements reuse existing design tokens and interaction patterns from Phase 1.

The key principle: the card expands to reveal depth, rather than opening separate pages or modals. The CEO stays in context on the project board.

---

## 1. Enriched Create/Edit Form

### New Fields

The existing create/edit modal gains three new textarea fields below the Description field and above the Status select. The field order top to bottom is:

1. **Project Name** (input, required) -- unchanged
2. **Description** (textarea) -- unchanged
3. **Goals** (textarea, new) -- "What does success look like?"
4. **Constraints** (textarea, new) -- "Any boundaries or limitations?"
5. **Brief** (textarea, new, larger) -- "Detailed description of what to build and why"
6. **Status** (select) -- unchanged

All new fields are optional.

### HTML for the New Fields

Inserted after the Description field, before the Status field:

```html
<div class="modal__field">
  <label class="modal__label" for="project-goals">Goals</label>
  <textarea class="modal__textarea" id="project-goals" name="goals"
            placeholder="What does success look like?" rows="2"></textarea>
</div>
<div class="modal__field">
  <label class="modal__label" for="project-constraints">Constraints</label>
  <textarea class="modal__textarea" id="project-constraints" name="constraints"
            placeholder="Any boundaries or limitations?" rows="2"></textarea>
</div>
<div class="modal__field">
  <label class="modal__label" for="project-brief">Brief</label>
  <textarea class="modal__textarea modal__textarea--brief" id="project-brief" name="brief"
            placeholder="Detailed description of what to build and why" rows="5"></textarea>
</div>
```

### Brief Textarea Sizing

The Brief field gets a taller minimum height than other textareas to signal that it's the primary content field:

```css
.modal__textarea--brief {
  min-height: 140px;
}
```

All other textarea styles (`.modal__textarea`) apply as-is from Phase 1: `var(--color-zinc-950)` background, `var(--color-zinc-700)` border, `resize: vertical`, indigo focus ring.

### Modal Scrolling

With 6 fields, the modal will be taller than the viewport on mobile. The existing `max-height: 90vh` and `overflow-y: auto` on `.modal` handle this. The form content scrolls within the modal; the header stays pinned visually because it's part of the scroll container (acceptable -- a sticky header is unnecessary complexity for a short form).

### Create vs. Edit

Same modal serves both modes, as in Phase 1:

| | Create | Edit |
|---|--------|------|
| Title | "New Project" | "Edit Project" |
| New fields | Empty | Pre-filled with current values |
| Submit text | "Create Project" | "Save Changes" |

When opening for edit, JS populates all six fields (name, description, goals, constraints, brief, status) with the project's current data from the `GET /api/projects/:id` response.

---

## 2. Project Card: Clickable with Expand/Collapse

### Behavior Change

In Phase 1, project cards were flat and non-interactive (no expand/collapse). Phase 2 brings back the expand/collapse pattern from the original task history cards. Clicking anywhere on the card header (except the action buttons) expands the card to reveal the detail view.

### Updated Card HTML

The card header becomes a `<button>` again (for accessibility), and the chevron returns. The action buttons remain outside the button element to avoid nested interactive elements.

```html
<article class="project-card" data-project-id="{id}">
  <div class="project-card__header-row">
    <button class="project-card__header" type="button" aria-expanded="false">
      <div class="project-card__summary">
        <h3 class="project-card__name">{name}</h3>
        <p class="project-card__desc">{description}</p>
      </div>
      <div class="project-card__meta">
        <span class="project-card__badge" data-status="{status}">{Status Label}</span>
        <span class="project-card__date">{formatted date}</span>
      </div>
      <span class="project-card__chevron" aria-hidden="true"></span>
    </button>
    <div class="project-card__actions">
      <button class="project-card__action-btn project-card__action-btn--edit"
              type="button" aria-label="Edit project" title="Edit">Edit</button>
      <button class="project-card__action-btn project-card__action-btn--delete"
              type="button" aria-label="Delete project" title="Delete">Delete</button>
    </div>
  </div>
  <div class="project-card__details" aria-hidden="true">
    <div class="project-card__details-inner">
      <!-- detail view content loaded on expand -->
    </div>
  </div>
</article>
```

### Header Row Layout

The header row wraps the clickable button and the separate action buttons side by side:

```css
.project-card__header-row {
  display: flex;
  align-items: center;
  gap: 0;
}

.project-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex: 1;
  min-width: 0;
  padding: var(--space-5);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}

.project-card__actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
  padding-right: var(--space-5);
}
```

This separates the clickable expansion trigger (the `<button>`) from the edit/delete buttons, avoiding nested interactive elements while keeping them visually on the same row.

### Chevron

Reuse the existing `.project-card__chevron` styles from Phase 1 CSS (they were kept as dormant code). The chevron rotates from 45deg to -135deg when expanded:

```css
/* Already exists in css/styles.css: */
.project-card__chevron { /* ... rotate(45deg) */ }
.project-card__header[aria-expanded="true"] .project-card__chevron { /* rotate(-135deg) */ }
```

### Expand/Collapse Animation

Reuse the existing `.project-card__details` grid-template-rows animation from Phase 1 CSS:

```css
/* Already exists in css/styles.css: */
.project-card__details { grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
.project-card__details[aria-hidden="false"] { grid-template-rows: 1fr; }
.project-card__details-inner { overflow: hidden; padding: 0 var(--space-5); }
.project-card__details[aria-hidden="false"] .project-card__details-inner {
  padding-top: var(--space-4);
  padding-bottom: var(--space-5);
  border-top: 1px solid var(--color-border);
}
```

### Accordion Behavior

Only one card is expanded at a time. Expanding a card collapses any previously expanded card. Same pattern as the original task history.

### Data Fetching on Expand

When a card is expanded for the first time, fetch the full project details from `GET /api/projects/:id`. The list endpoint does not include `notes` or `kickoffPrompt`, so these are only available after fetching the individual project. Show a brief loading state while fetching (see Section 2.1).

Cache the fetched data in the `projects` array so subsequent expand/collapse of the same card doesn't re-fetch (unless the project was edited, in which case clear the cache for that project).

### Responsive (mobile < 640px)

```css
@media (max-width: 639px) {
  .project-card__header-row {
    flex-wrap: wrap;
  }

  .project-card__header {
    flex-basis: 100%;
    flex-wrap: wrap;
  }

  .project-card__summary {
    flex-basis: calc(100% - 32px);
  }

  .project-card__meta {
    flex-basis: 100%;
    padding-top: var(--space-2);
  }

  .project-card__actions {
    flex-basis: 100%;
    padding: 0 var(--space-5) var(--space-3);
    justify-content: flex-end;
  }

  .project-card__chevron {
    position: absolute;
    right: var(--space-5);
    top: var(--space-6);
  }
}
```

---

## 2.1 Detail View Loading State

When the card is expanded and the full project data hasn't been fetched yet, show a loading indicator inside the details panel:

```html
<div class="project-card__details-inner">
  <div class="detail__loading">
    <span class="detail__loading-text">Loading...</span>
  </div>
</div>
```

```css
.detail__loading {
  text-align: center;
  padding: var(--space-6) 0;
}

.detail__loading-text {
  font-size: var(--text-sm);
  color: var(--color-zinc-400);
}
```

Once the fetch completes, replace the loading content with the full detail view.

---

## 3. Project Detail View (Expanded Card Content)

### Layout

The expanded detail view is a vertical stack of labeled sections inside `.project-card__details-inner`. From top to bottom:

```
[Detail Fields: Goals, Constraints, Brief]
[Action Area: "Start Work" button OR Kickoff Prompt display]
[Progress Notes (if in-progress)]
[Card-level Actions: Edit, Delete — already in header, not duplicated here]
```

### HTML Structure

```html
<div class="project-card__details-inner">
  <!-- Detail fields -->
  <div class="detail__fields">
    <div class="detail__field">
      <span class="detail__label">Goals</span>
      <p class="detail__value">{goals text}</p>
    </div>
    <div class="detail__field">
      <span class="detail__label">Constraints</span>
      <p class="detail__value">{constraints text}</p>
    </div>
    <div class="detail__field">
      <span class="detail__label">Brief</span>
      <p class="detail__value">{brief text}</p>
    </div>
  </div>

  <!-- Action area (conditional) -->
  <div class="detail__action-area">
    <!-- Content depends on project status — see sections 4 and 5 -->
  </div>

  <!-- Progress notes (conditional, in-progress only) -->
  <div class="detail__notes">
    <!-- See section 6 -->
  </div>
</div>
```

### Detail Field Styles

```css
.detail__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.detail__field {
  /* No special styling — just stacking */
}

.detail__label {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.detail__value {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-zinc-300);
  white-space: pre-wrap;
}
```

The `.detail__label` style matches the existing `.task-item__detail-label` pattern from the original task history. Reusing the same visual language for consistency.

`white-space: pre-wrap` on `.detail__value` preserves line breaks the CEO typed in the textarea fields.

### Empty Field Placeholders

When a field (goals, constraints, or brief) is empty, show muted placeholder text instead of blank space:

```html
<p class="detail__value detail__value--empty">No goals set</p>
```

```css
.detail__value--empty {
  color: var(--color-zinc-600);
  font-style: italic;
}
```

Placeholder text per field:
- Goals: "No goals set"
- Constraints: "No constraints set"
- Brief: "No brief written"

### Hiding Empty Fields (Optional Simplification)

If all three new fields are empty (a minimal project with just name + description), show a single prompt instead of three empty placeholders:

```html
<div class="detail__fields-empty">
  <p class="detail__fields-empty-text">No project details yet.</p>
  <button class="detail__fields-empty-action" type="button">Add goals, constraints, and brief</button>
</div>
```

```css
.detail__fields-empty {
  text-align: center;
  padding: var(--space-4) 0;
  margin-bottom: var(--space-6);
}

.detail__fields-empty-text {
  font-size: var(--text-sm);
  color: var(--color-zinc-600);
  margin-bottom: var(--space-2);
}

.detail__fields-empty-action {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.15s ease;
}

.detail__fields-empty-action:hover {
  color: var(--color-accent-hover);
}
```

Clicking "Add goals, constraints, and brief" opens the Edit modal pre-filled with the project's data.

### Detail Dates

Below the fields but above the action area, show the project's timestamps:

```html
<div class="detail__dates">
  <span class="detail__date">Created Jan 2025</span>
  <span class="detail__date">Updated Feb 2025</span>
  <!-- If completed: -->
  <span class="detail__date">Completed Feb 2025</span>
</div>
```

```css
.detail__dates {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.detail__date {
  font-size: var(--text-xs);
  color: var(--color-zinc-600);
}
```

---

## 4. "Start Work" Button and Flow

### Button Placement

The "Start Work" button appears in the detail view's action area, only when the project status is `planned`.

```html
<div class="detail__action-area">
  <button class="detail__start-btn" type="button">Start Work</button>
</div>
```

### Button Styles

The "Start Work" button is the primary action -- visually prominent, using the indigo accent:

```css
.detail__start-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-white);
  background: var(--color-indigo-500);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-5);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.detail__start-btn:hover {
  background: var(--color-indigo-600);
}

.detail__start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Empty Brief Warning

If the CEO clicks "Start Work" and both `goals` and `brief` are empty, show a warning before proceeding. This is an inline warning within the detail view, not a modal:

```html
<div class="detail__start-warning">
  <p class="detail__start-warning-text">
    This project has no goals or brief. The kickoff prompt will have limited context.
  </p>
  <div class="detail__start-warning-actions">
    <button class="detail__start-warning-fill" type="button">Fill in Details</button>
    <button class="detail__start-warning-proceed" type="button">Start Anyway</button>
  </div>
</div>
```

```css
.detail__start-warning {
  background: rgba(250, 204, 21, 0.06);
  border: 1px solid rgba(250, 204, 21, 0.2);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-top: var(--space-3);
}

.detail__start-warning-text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: #facc15;
  margin-bottom: var(--space-3);
}

.detail__start-warning-actions {
  display: flex;
  gap: var(--space-3);
}

.detail__start-warning-fill {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-300);
  background: transparent;
  border: 1px solid var(--color-zinc-700);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.detail__start-warning-fill:hover {
  border-color: var(--color-zinc-600);
}

.detail__start-warning-proceed {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-white);
  background: var(--color-indigo-500);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.detail__start-warning-proceed:hover {
  background: var(--color-indigo-600);
}
```

**Flow:**
1. CEO clicks "Start Work"
2. If goals AND brief are both empty, the warning replaces the Start Work button
3. "Fill in Details" opens the Edit modal pre-filled
4. "Start Anyway" proceeds with the kickoff (calls `POST /api/projects/:id/start`)

### Loading State

While `POST /api/projects/:id/start` is in flight:
- Button text changes to "Starting..."
- Button gets `disabled` attribute
- On success, the project status updates to `in-progress`, the card's badge updates, and the kickoff prompt modal opens (Section 5)
- On failure, show the error toast and restore the button

---

## 5. Kickoff Prompt Modal

### Purpose

After "Start Work" succeeds, a modal displays the generated kickoff prompt. The CEO reads it and copies it to their clipboard to paste into a Claude Code session.

### HTML Structure

A new modal, separate from the create/edit and delete modals:

```html
<div class="modal-overlay" id="kickoff-modal-overlay" aria-hidden="true">
  <div class="modal modal--kickoff" role="dialog" aria-labelledby="kickoff-title" aria-modal="true">
    <div class="modal__header">
      <h3 class="modal__title" id="kickoff-title">Kickoff Prompt</h3>
      <button class="modal__close" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="kickoff__body">
      <div class="kickoff__prompt-area">
        <pre class="kickoff__prompt"><code>{kickoff prompt text}</code></pre>
      </div>
      <div class="kickoff__actions">
        <button class="kickoff__copy-btn" type="button">Copy to Clipboard</button>
      </div>
    </div>
  </div>
</div>
```

### Modal Size

The kickoff prompt is a multi-paragraph document. The modal needs to be wider and taller than the form modal to display it comfortably:

```css
.modal--kickoff {
  max-width: 640px;
}
```

### Prompt Display Area

The prompt is displayed in a monospace font inside a scrollable container with a dark background:

```css
.kickoff__body {
  padding: var(--space-5) var(--space-6);
}

.kickoff__prompt-area {
  background: var(--color-zinc-950);
  border: 1px solid var(--color-zinc-800);
  border-radius: var(--radius-md);
  max-height: 50vh;
  overflow-y: auto;
  margin-bottom: var(--space-5);
}

.kickoff__prompt {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-zinc-300);
  padding: var(--space-4);
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.kickoff__prompt code {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  background: none;
}
```

The `max-height: 50vh` keeps the prompt area scrollable within the modal. The modal itself caps at `90vh` (from the base `.modal` class).

### Scrollbar Styling (Subtle)

For the prompt scroll area, use a subtle custom scrollbar that matches the dark theme:

```css
.kickoff__prompt-area::-webkit-scrollbar {
  width: 6px;
}

.kickoff__prompt-area::-webkit-scrollbar-track {
  background: transparent;
}

.kickoff__prompt-area::-webkit-scrollbar-thumb {
  background: var(--color-zinc-700);
  border-radius: 3px;
}
```

### Copy to Clipboard Button

```css
.kickoff__actions {
  display: flex;
  justify-content: flex-end;
}

.kickoff__copy-btn {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-white);
  background: var(--color-indigo-500);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-5);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.kickoff__copy-btn:hover {
  background: var(--color-indigo-600);
}
```

### Copy Button States

The button has three visual states:

| State | Text | Background | Transition |
|-------|------|------------|------------|
| Idle | "Copy to Clipboard" | `var(--color-indigo-500)` | -- |
| Copied | "Copied!" | `#059669` (emerald-600) | Instant |
| Error | "Copy failed" | `var(--color-indigo-500)` | Instant |

```css
.kickoff__copy-btn--copied {
  background: #059669;
}

.kickoff__copy-btn--copied:hover {
  background: #059669;
}
```

**Behavior:**
1. CEO clicks "Copy to Clipboard"
2. JS calls `navigator.clipboard.writeText(promptText)`
3. On success: button text changes to "Copied!", class `kickoff__copy-btn--copied` is added
4. After 2 seconds: revert to "Copy to Clipboard", remove the class
5. On failure: change text to "Copy failed" for 2 seconds, then revert. Fall back to selecting all text in the prompt area so the CEO can Ctrl+C manually.

### Kickoff Prompt in Detail View (After Dismissing Modal)

After the modal is closed, the kickoff prompt is also accessible from the expanded detail view. In the action area (where "Start Work" used to be), show a collapsed prompt reference:

```html
<div class="detail__kickoff-ref">
  <div class="detail__kickoff-ref-header">
    <span class="detail__label">Kickoff Prompt</span>
    <button class="detail__kickoff-view-btn" type="button">View Prompt</button>
  </div>
</div>
```

```css
.detail__kickoff-ref {
  margin-bottom: var(--space-6);
}

.detail__kickoff-ref-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail__kickoff-view-btn {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.detail__kickoff-view-btn:hover {
  color: var(--color-accent-hover);
}
```

Clicking "View Prompt" reopens the kickoff modal with the stored prompt.

### Status Visibility Rules

The action area content changes based on project status:

| Status | Action Area Content |
|--------|-------------------|
| `planned` | "Start Work" button |
| `in-progress` | Kickoff prompt reference ("View Prompt" link) |
| `completed` | Kickoff prompt reference (if one exists), otherwise nothing |

---

## 6. Progress Notes

### Placement

Progress notes appear at the bottom of the expanded detail view, below the action area. They are visible only for projects with status `in-progress`.

### HTML Structure

```html
<div class="detail__notes">
  <div class="detail__notes-header">
    <span class="detail__label">Progress Notes</span>
  </div>

  <!-- Add note form -->
  <div class="detail__notes-form">
    <input class="detail__notes-input" type="text"
           placeholder="Add a progress note..." autocomplete="off">
    <button class="detail__notes-add-btn" type="button">Add</button>
  </div>

  <!-- Notes list -->
  <div class="detail__notes-list">
    <div class="detail__note" data-note-id="{noteId}">
      <div class="detail__note-content">
        <p class="detail__note-text">{note content}</p>
        <span class="detail__note-time">{relative or formatted time}</span>
      </div>
      <button class="detail__note-delete" type="button" aria-label="Delete note">&times;</button>
    </div>
    <!-- more notes... -->
  </div>

  <!-- Empty state -->
  <p class="detail__notes-empty">No progress notes yet.</p>
</div>
```

### Add Note Form

The input and button sit side by side:

```css
.detail__notes {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-5);
}

.detail__notes-header {
  margin-bottom: var(--space-3);
}

.detail__notes-form {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.detail__notes-input {
  flex: 1;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  color: var(--color-zinc-200);
  background: var(--color-zinc-950);
  border: 1px solid var(--color-zinc-700);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  transition: border-color 0.15s ease;
}

.detail__notes-input:focus {
  outline: none;
  border-color: var(--color-indigo-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.detail__notes-input::placeholder {
  color: var(--color-zinc-600);
}

.detail__notes-add-btn {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-300);
  background: transparent;
  border: 1px solid var(--color-zinc-700);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.detail__notes-add-btn:hover {
  color: var(--color-zinc-200);
  border-color: var(--color-zinc-600);
}
```

**Add behavior:**
1. CEO types in the input and clicks "Add" (or presses Enter)
2. If input is empty, do nothing (no validation error -- just ignore)
3. Call `POST /api/projects/:id/notes` with the content
4. Optimistic: prepend the note to the list immediately
5. Clear the input
6. If API fails, remove the optimistic note and show error toast

### Notes List

```css
.detail__notes-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.detail__note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  transition: background-color 0.15s ease;
}

.detail__note:hover {
  background: rgba(255, 255, 255, 0.02);
}

.detail__note-content {
  flex: 1;
  min-width: 0;
}

.detail__note-text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-zinc-300);
  margin-bottom: var(--space-1);
}

.detail__note-time {
  font-size: var(--text-xs);
  color: var(--color-zinc-600);
}

.detail__note-delete {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-base);
  color: var(--color-zinc-600);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
}

.detail__note:hover .detail__note-delete {
  opacity: 1;
}

.detail__note-delete:hover {
  color: #f87171;
}

.detail__note-delete:focus-visible {
  opacity: 1;
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

**Key interaction: delete button visibility.**
The delete button (x) is invisible by default (`opacity: 0`) and appears on hover of the note row. This keeps the notes list clean. On focus-visible it also appears (for keyboard accessibility).

**Delete behavior:**
1. CEO clicks the x button
2. No confirmation needed -- notes are lightweight
3. Call `DELETE /api/projects/:id/notes/:noteId`
4. Optimistic: remove the note from the list immediately
5. If API fails, re-insert the note and show error toast

### Timestamp Formatting

Show relative time for recent notes, formatted date for older ones:

- Less than 1 minute: "Just now"
- Less than 1 hour: "12 min ago"
- Less than 24 hours: "3 hours ago"
- Less than 7 days: "2 days ago"
- Older: "Jan 15, 2025"

This is computed in JS from the `createdAt` ISO timestamp.

### Notes Empty State

When there are no notes:

```css
.detail__notes-empty {
  font-size: var(--text-sm);
  color: var(--color-zinc-600);
  text-align: center;
  padding: var(--space-4) 0;
}
```

The empty state text is hidden when there are notes. It shows below the add form when the list is empty.

### Notes Section Visibility

| Status | Notes Section |
|--------|--------------|
| `planned` | Hidden |
| `in-progress` | Visible with add form and list |
| `completed` | Visible (read-only -- show list but hide the add form and delete buttons) |

For completed projects, notes are a historical record:

```css
.detail__notes--readonly .detail__notes-form {
  display: none;
}

.detail__notes--readonly .detail__note-delete {
  display: none;
}
```

---

## 7. Responsive Summary

| Element | Desktop (1024+) | Tablet (640-1023) | Mobile (<640) |
|---------|-----------------|-------------------|---------------|
| Card header row | Single row: button + actions | Single row: button + actions | Wrapped: header button full-width, actions below right-aligned |
| Detail fields | Stacked, full width | Stacked, full width | Stacked, full width |
| Start Work button | Inline, auto-width | Inline, auto-width | Full width |
| Warning banner | Inline, buttons side by side | Inline, buttons side by side | Buttons stack vertically |
| Kickoff modal | 640px max-width, centered | 640px max-width, centered | Nearly full-width |
| Prompt area | `max-height: 50vh`, scrollable | `max-height: 50vh`, scrollable | `max-height: 40vh`, scrollable |
| Notes input + Add | Row: input + button | Row: input + button | Row: input + button (button shrinks) |
| Note item | Row: content + delete x | Row: content + delete x | Row: content + delete x |

Mobile-specific overrides:

```css
@media (max-width: 639px) {
  .detail__start-btn {
    width: 100%;
    justify-content: center;
  }

  .detail__start-warning-actions {
    flex-direction: column;
  }

  .detail__start-warning-actions button {
    width: 100%;
    text-align: center;
  }

  .kickoff__prompt-area {
    max-height: 40vh;
  }
}
```

---

## 8. Accessibility

- **Card expand/collapse**: The `<button>` element with `aria-expanded` and associated `aria-hidden` on the details panel. Same pattern as Phase 1 task history, fully keyboard accessible.
- **Kickoff modal**: Same focus trap, escape-to-close, and focus-return behavior as existing modals. `role="dialog"`, `aria-modal="true"`.
- **Notes input**: Enter key submits the note (in addition to the Add button).
- **Note delete**: `aria-label="Delete note"` on each delete button. Visible on focus-visible for keyboard users even when not hovered.
- **Warning banner**: Uses yellow color for the border/text. The text content itself communicates the warning (not color alone).
- **Copy button feedback**: "Copied!" text provides non-visual feedback in addition to the color change.

---

## 9. CSS Class Inventory

### New Classes to Add

**Card header restructure:**
- `.project-card__header-row`

**Detail view:**
- `.detail__loading`, `.detail__loading-text`
- `.detail__fields`
- `.detail__field`
- `.detail__label`
- `.detail__value`, `.detail__value--empty`
- `.detail__fields-empty`, `.detail__fields-empty-text`, `.detail__fields-empty-action`
- `.detail__dates`, `.detail__date`

**Action area:**
- `.detail__action-area`
- `.detail__start-btn`
- `.detail__start-warning`, `.detail__start-warning-text`, `.detail__start-warning-actions`, `.detail__start-warning-fill`, `.detail__start-warning-proceed`
- `.detail__kickoff-ref`, `.detail__kickoff-ref-header`, `.detail__kickoff-view-btn`

**Kickoff modal:**
- `.modal--kickoff`
- `.kickoff__body`
- `.kickoff__prompt-area`, `.kickoff__prompt`
- `.kickoff__actions`
- `.kickoff__copy-btn`, `.kickoff__copy-btn--copied`

**Progress notes:**
- `.detail__notes`, `.detail__notes--readonly`
- `.detail__notes-header`
- `.detail__notes-form`
- `.detail__notes-input`
- `.detail__notes-add-btn`
- `.detail__notes-list`
- `.detail__note`
- `.detail__note-content`
- `.detail__note-text`
- `.detail__note-time`
- `.detail__note-delete`
- `.detail__notes-empty`

**Form addition:**
- `.modal__textarea--brief`

### Reactivated from Phase 1 (dormant code now in use)
- `.project-card__chevron` and its `aria-expanded` rotation
- `.project-card__details`, `.project-card__details-inner` and the grid-template-rows animation

### Existing Classes Reused As-Is
- All modal overlay/dialog/form styles from Phase 1
- `.project-card`, `.project-card__summary`, `__name`, `__desc`, `__meta`, `__badge`, `__date`
- `.project-card__actions`, `__action-btn`, `__action-btn--edit`, `__action-btn--delete`
- `.toast`, `.toast--visible`, `.toast--error`, `.toast__message`

---

## 10. Implementation Notes for Alice

1. **Card restructure**: The card header changes from a `<div>` to a `<button>` wrapped in a new `.project-card__header-row` alongside the actions. This is the biggest structural change from Phase 1. The existing card rendering in `renderCard()` needs to be updated.

2. **Expand/collapse handler**: Add a delegated click handler for `.project-card__header` (the button). On click, toggle `aria-expanded` and `aria-hidden`. Fetch full project data on first expand via `GET /api/projects/:id`. Use accordion behavior (collapse other expanded cards).

3. **Detail view rendering**: Create a `renderDetailView(project)` function that builds the detail HTML from the full project data. Call it after the fetch completes and insert into `.project-card__details-inner`.

4. **New modal**: Add the kickoff modal HTML to `index.html` alongside the existing project and delete modals. Wire up the close/escape/overlay-click handlers using the existing `setupModalClose()` pattern.

5. **Form fields**: Add the three new textarea fields to the existing project form modal HTML. Update `openCreateModal()` and `openEditModal()` to handle the new fields. Update the form submit handler to include `goals`, `constraints`, `brief` in the API payload.

6. **Start Work flow**: In the detail view, add a click handler for `.detail__start-btn`. Check if goals and brief are empty. If so, show the warning. Otherwise (or on "Start Anyway"), call `POST /api/projects/:id/start`, update the project in the local array, re-render the card and detail view, and open the kickoff modal.

7. **Copy to clipboard**: Use `navigator.clipboard.writeText()`. Handle the success/error states on the button. Use `setTimeout` to revert the button text after 2 seconds.

8. **Notes**: Add handlers for the add-note input (Enter key + Add button click) and the delete button. Both use optimistic updates with rollback on failure.

9. **Cache invalidation**: When a project is edited via the modal, clear any cached full-project data so the next expand re-fetches fresh data.

10. **No new files**: All frontend changes go in `js/projects.js` (extend the existing IIFE), `css/styles.css` (append new styles), and `index.html` (add kickoff modal markup).
