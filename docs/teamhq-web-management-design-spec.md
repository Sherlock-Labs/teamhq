# TeamHQ Web Management Interface - Design Spec

## Overview

The current static "Tasks" section becomes an interactive "Projects" section. The CEO can create, view, edit, and delete projects directly from the page. The design preserves the existing dark theme, card-based layout, and visual language while adding management controls that feel native to the page.

The key principle: this should feel like the existing Tasks section grew management features, not like a separate app was bolted on.

---

## 1. Section Header Redesign

### Current State

```
Tasks
A history of what we've shipped.
```

### New State

The section heading and subtitle change. A "New Project" button appears inline with the heading.

```
Projects
Create and manage projects.                    [+ New Project]
```

**Layout**: The heading stays centered. The subtitle and button share a row: subtitle on the left, button on the right. This row is constrained to the same max-width as the card list below it.

**HTML structure**:

```html
<section class="projects" id="projects" aria-labelledby="projects-heading">
  <div class="container">
    <h2 id="projects-heading" class="section-title">Projects</h2>
    <div class="projects__toolbar">
      <p class="projects__subtitle">Create and manage projects.</p>
      <button class="projects__new-btn" type="button">+ New Project</button>
    </div>
    <div id="projects-list">
      <!-- project cards rendered here -->
    </div>
  </div>
</section>
```

**CSS for the toolbar row**:

```css
.projects__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-10);
}
```

**Subtitle** (`.projects__subtitle`):
- Same styles as `.section-subtitle` but with `text-align: left` and no auto margins
- `font-size: var(--text-base)` (desktop: `var(--text-lg)`)
- `color: var(--color-text-secondary)`

**"New Project" button** (`.projects__new-btn`):
- `font-size: var(--text-sm)`
- `font-weight: var(--font-weight-semibold)`
- `color: var(--color-white)`
- `background: var(--color-indigo-500)`
- `padding: var(--space-2) var(--space-4)` (8px 16px)
- `border-radius: var(--radius-md)` (8px)
- `border: none`
- `cursor: pointer`
- `transition: background-color 0.15s ease`
- `white-space: nowrap`
- Hover: `background: var(--color-indigo-600)`
- Focus-visible: standard `outline: 2px solid var(--color-accent)` with `outline-offset: 2px`

**Nav link update**: The nav link changes from `Tasks` to `Projects` and the anchor from `#tasks` to `#projects`.

### Responsive (mobile < 640px)

The toolbar stacks: subtitle on top, button full-width below.

```css
@media (max-width: 639px) {
  .projects__toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-4);
  }

  .projects__subtitle {
    text-align: center;
  }

  .projects__new-btn {
    align-self: center;
  }
}
```

---

## 2. Project Card Redesign

### Current Card (read-only)

The existing `.project-card` has:
- A clickable header button that expands/collapses a details panel
- Summary line: project name, description, status badge, date, task count, chevron
- Details panel: per-agent task breakdown (being removed in Phase 1)

### New Card (manageable)

The card keeps the same visual shell but replaces the expand/collapse behavior with management actions. Since Phase 1 does not expose individual tasks, the expandable details panel is removed. Instead, the card becomes a flat, non-collapsible display with action buttons.

**HTML structure for a single project card**:

```html
<article class="project-card" data-project-id="{id}">
  <div class="project-card__header">
    <div class="project-card__summary">
      <h3 class="project-card__name">{name}</h3>
      <p class="project-card__desc">{description}</p>
    </div>
    <div class="project-card__meta">
      <span class="project-card__badge" data-status="{status}">{Status Label}</span>
      <span class="project-card__date">{formatted date}</span>
    </div>
    <div class="project-card__actions">
      <button class="project-card__action-btn project-card__action-btn--edit"
              type="button" aria-label="Edit project" title="Edit">
        Edit
      </button>
      <button class="project-card__action-btn project-card__action-btn--delete"
              type="button" aria-label="Delete project" title="Delete">
        Delete
      </button>
    </div>
  </div>
</article>
```

**Key changes from the current card**:

1. **No expand/collapse**: The header is a `<div>`, not a `<button>`. No chevron, no details panel, no aria-expanded. The card is a flat display.
2. **No task count**: Task management is Phase 2. Remove the "N tasks" count from the meta area.
3. **Action buttons added**: Edit and Delete buttons appear in a new `.project-card__actions` area.
4. **Date display**: Show `createdAt` for planned/in-progress projects (formatted as "Jan 2025"), `completedAt` for completed projects.

### Card Header Layout

The header is now a non-interactive container (not a button):

```css
.project-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
}
```

The three areas flow left to right:
- **Summary** (flex: 1, min-width: 0) — name + description
- **Meta** (flex-shrink: 0) — status badge + date
- **Actions** (flex-shrink: 0) — edit + delete buttons

### Action Buttons

**Container** (`.project-card__actions`):

```css
.project-card__actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
```

**Individual action buttons** (`.project-card__action-btn`):

```css
.project-card__action-btn {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-zinc-700);
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}
```

**Edit button** (`.project-card__action-btn--edit`):
- `color: var(--color-zinc-300)`
- Hover: `background: var(--color-zinc-800)`, `border-color: var(--color-zinc-600)`

**Delete button** (`.project-card__action-btn--delete`):
- `color: var(--color-zinc-400)`
- Hover: `color: #f87171` (red-400), `border-color: rgba(248, 113, 113, 0.3)`, `background: rgba(248, 113, 113, 0.1)`

Both buttons get the standard focus-visible outline.

### Status Badge

Reuse the existing `.project-card__badge` styles exactly. The three statuses map to:

| Status | Badge text | Color | Background |
|--------|-----------|-------|------------|
| `completed` | Completed | `#4ade80` | `rgba(74, 222, 128, 0.1)` |
| `in-progress` | In Progress | `#facc15` | `rgba(250, 204, 21, 0.1)` |
| `planned` | Planned | `var(--color-zinc-400)` | `rgba(161, 161, 170, 0.1)` |

These already exist in CSS as `data-status` attribute selectors. No changes needed.

### Project Ordering

Cards are ordered per the requirements: in-progress first, then planned, then completed. Within each group, most recently updated first. This is handled by the API response; the frontend renders in the order received.

### Responsive (mobile < 640px)

On mobile, the card stacks into a more compact layout:

```css
@media (max-width: 639px) {
  .project-card__header {
    flex-wrap: wrap;
  }

  .project-card__summary {
    flex-basis: 100%;
    margin-bottom: var(--space-2);
  }

  .project-card__meta {
    flex: 1;
  }

  .project-card__actions {
    flex-shrink: 0;
  }
}
```

On mobile, the layout becomes:
- Row 1: Name + description (full width)
- Row 2: Status badge + date (left), action buttons (right)

---

## 3. Create/Edit Modal

### Why a Modal

The tech approach specifies a modal overlay for create/edit. This is the right call because:
- The form is short (3 fields) and doesn't warrant a full page
- A modal keeps the project list visible in the background, providing context
- It works for both create and edit (same form, different pre-fill)
- It's a well-understood pattern for CRUD operations

### Modal Overlay

**HTML structure**:

```html
<div class="modal-overlay" aria-hidden="true">
  <div class="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
    <div class="modal__header">
      <h3 class="modal__title" id="modal-title">New Project</h3>
      <button class="modal__close" type="button" aria-label="Close">&times;</button>
    </div>
    <form class="modal__form" novalidate>
      <div class="modal__field">
        <label class="modal__label" for="project-name">Project Name <span class="modal__required">*</span></label>
        <input class="modal__input" type="text" id="project-name" name="name"
               placeholder="e.g. User Authentication" required autocomplete="off">
        <p class="modal__error" aria-live="polite"></p>
      </div>
      <div class="modal__field">
        <label class="modal__label" for="project-description">Description</label>
        <textarea class="modal__textarea" id="project-description" name="description"
                  placeholder="Brief description of the project" rows="3"></textarea>
      </div>
      <div class="modal__field">
        <label class="modal__label" for="project-status">Status</label>
        <select class="modal__select" id="project-status" name="status">
          <option value="planned">Planned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div class="modal__actions">
        <button class="modal__cancel" type="button">Cancel</button>
        <button class="modal__submit" type="submit">Create Project</button>
      </div>
    </form>
  </div>
</div>
```

### Modal Overlay Styles

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.modal-overlay[aria-hidden="false"] {
  opacity: 1;
  visibility: visible;
}
```

### Modal Dialog

```css
.modal {
  background: var(--color-zinc-900);
  border: 1px solid var(--color-zinc-700);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  transform: translateY(8px);
  transition: transform 0.2s ease;
}

.modal-overlay[aria-hidden="false"] .modal {
  transform: translateY(0);
}
```

### Modal Header

```css
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-zinc-800);
}

.modal__title {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-zinc-200);
}

.modal__close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  color: var(--color-zinc-400);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.modal__close:hover {
  color: var(--color-zinc-200);
  background: var(--color-zinc-800);
}
```

### Form Styles

```css
.modal__form {
  padding: var(--space-6);
}

.modal__field {
  margin-bottom: var(--space-5);
}

.modal__label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-300);
  margin-bottom: var(--space-2);
}

.modal__required {
  color: #f87171;
}
```

### Input / Textarea / Select

All three share the same base style:

```css
.modal__input,
.modal__textarea,
.modal__select {
  width: 100%;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  color: var(--color-zinc-200);
  background: var(--color-zinc-950);
  border: 1px solid var(--color-zinc-700);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  transition: border-color 0.15s ease;
}

.modal__input:focus,
.modal__textarea:focus,
.modal__select:focus {
  outline: none;
  border-color: var(--color-indigo-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.modal__input::placeholder,
.modal__textarea::placeholder {
  color: var(--color-zinc-600);
}

.modal__textarea {
  resize: vertical;
  min-height: 80px;
}

.modal__select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23a1a1aa' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: var(--space-8);
  cursor: pointer;
}
```

### Validation Error State

```css
.modal__error {
  font-size: var(--text-xs);
  color: #f87171;
  margin-top: var(--space-1);
  min-height: var(--text-xs);
}

.modal__input--invalid,
.modal__textarea--invalid,
.modal__select--invalid {
  border-color: #f87171;
}

.modal__input--invalid:focus,
.modal__textarea--invalid:focus,
.modal__select--invalid:focus {
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
}
```

When validation fails:
- Add `modal__input--invalid` class to the input
- Set the `.modal__error` text to the error message (e.g., "Project name is required")
- The error message uses `aria-live="polite"` so screen readers announce it

### Form Actions

```css
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-zinc-800);
  margin-top: var(--space-6);
}

.modal__cancel {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-400);
  background: transparent;
  border: 1px solid var(--color-zinc-700);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.modal__cancel:hover {
  color: var(--color-zinc-300);
  border-color: var(--color-zinc-600);
}

.modal__submit {
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

.modal__submit:hover {
  background: var(--color-indigo-600);
}

.modal__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Create vs. Edit Mode

The same modal serves both create and edit:

| | Create | Edit |
|---|--------|------|
| Title | "New Project" | "Edit Project" |
| Fields | Empty (status defaults to "Planned") | Pre-filled with current values |
| Submit button text | "Create Project" | "Save Changes" |
| Submit action | `POST /api/projects` | `PATCH /api/projects/:id` |

When opening for edit, the JS populates the form fields with the project's current data and changes the title and button text.

### Modal Behavior

- **Open**: Triggered by "New Project" button or card Edit button. Set `aria-hidden="false"` on the overlay. Focus the first input field.
- **Close**: Triggered by Cancel button, close (x) button, clicking the overlay background, or pressing Escape. Set `aria-hidden="true"` on the overlay. Return focus to the button that opened the modal.
- **Submit**: Validate, call API, close modal on success, show error inline on failure.
- **Focus trap**: Tab cycles through the modal's interactive elements while open. This prevents focus from escaping to the page behind the modal.
- **Body scroll lock**: Add `overflow: hidden` to `<body>` while the modal is open to prevent background scrolling.

---

## 4. Delete Confirmation

### Approach

Delete uses a simpler confirmation dialog, not the full form modal. It appears as a smaller, focused dialog.

**HTML structure** (reuses the modal overlay):

```html
<div class="modal-overlay" aria-hidden="true">
  <div class="modal modal--confirm" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc" aria-modal="true">
    <div class="modal__header">
      <h3 class="modal__title" id="confirm-title">Delete Project</h3>
      <button class="modal__close" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="modal__body">
      <p class="modal__confirm-text" id="confirm-desc">
        Are you sure you want to delete <strong>{project name}</strong>? This action cannot be undone.
      </p>
    </div>
    <div class="modal__actions">
      <button class="modal__cancel" type="button">Cancel</button>
      <button class="modal__delete" type="button">Delete</button>
    </div>
  </div>
</div>
```

### Confirm Dialog Styles

```css
.modal--confirm {
  max-width: 400px;
}

.modal__body {
  padding: var(--space-5) var(--space-6);
}

.modal__confirm-text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-zinc-300);
}

.modal__confirm-text strong {
  color: var(--color-zinc-200);
  font-weight: var(--font-weight-semibold);
}

.modal__delete {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-white);
  background: #ef4444;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.modal__delete:hover {
  background: #dc2626;
}
```

Note: The `.modal__actions` in the confirm dialog also gets bottom padding inside the modal. Apply the same padding as the body:

```css
.modal--confirm .modal__actions {
  padding: 0 var(--space-6) var(--space-5);
  border-top: none;
  margin-top: 0;
}
```

### Delete Behavior

1. CEO clicks Delete on a project card
2. Confirm dialog appears with the project name
3. Cancel returns to the board (closes dialog)
4. Confirm calls `DELETE /api/projects/:id`, removes the card from the DOM with a fade-out, closes the dialog
5. If the API fails, the card stays and an error toast appears (see Section 7)

---

## 5. Empty State

When there are no projects (fresh start or all deleted), the projects list area shows an empty state.

**HTML**:

```html
<div class="projects__empty">
  <p class="projects__empty-text">No projects yet.</p>
  <p class="projects__empty-hint">Click "New Project" to get started.</p>
</div>
```

**CSS**:

```css
.projects__empty {
  text-align: center;
  padding: var(--space-16) 0;
}

.projects__empty-text {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-zinc-400);
  margin-bottom: var(--space-2);
}

.projects__empty-hint {
  font-size: var(--text-sm);
  color: var(--color-zinc-600);
}
```

The empty state is vertically centered within the section with generous padding (`var(--space-16)` = 64px top and bottom) so the section doesn't collapse to nothing.

---

## 6. Status Management

### How It Works

Status is managed through the Edit modal. There is no inline status toggle on the card itself.

Rationale: The three-status model (planned, in-progress, completed) is a select dropdown, not a binary toggle. Inline dropdowns on cards add visual noise and interaction complexity. Since the CEO edits projects infrequently, the extra click to open the edit modal is acceptable.

**Flow**: CEO clicks Edit on a card, changes the status dropdown, clicks Save. The card updates its badge color and re-sorts in the list.

The status `<select>` in the edit modal pre-selects the project's current status. When the status changes to "completed", the API automatically sets `completedAt`. When it changes away from "completed", the API clears `completedAt`. This is backend logic, not frontend.

---

## 7. Error Handling and Feedback

### API Errors

When an API call fails (create, edit, or delete), the UI needs to communicate the failure.

**Toast notification**: A small, temporary notification appears at the bottom-center of the viewport.

**HTML** (appended to `<body>`):

```html
<div class="toast" role="alert" aria-live="assertive">
  <p class="toast__message">Failed to create project. Please try again.</p>
</div>
```

**CSS**:

```css
.toast {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%) translateY(100%);
  z-index: 300;
  background: var(--color-zinc-800);
  border: 1px solid var(--color-zinc-700);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  opacity: 0;
  transition: transform 0.25s ease, opacity 0.25s ease;
  pointer-events: none;
}

.toast--visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
  pointer-events: auto;
}

.toast--error {
  border-color: rgba(248, 113, 113, 0.3);
}

.toast__message {
  font-size: var(--text-sm);
  color: var(--color-zinc-300);
  white-space: nowrap;
}

.toast--error .toast__message {
  color: #f87171;
}
```

The toast slides up from below, stays visible for 4 seconds, then fades out. JS controls the `toast--visible` class.

### Optimistic Updates

Per the tech approach, use optimistic updates:
- **Create**: Add the card to the DOM immediately. If the API fails, remove it and show error toast.
- **Edit**: Update the card in the DOM immediately. If the API fails, revert to previous values and show error toast.
- **Delete**: Remove the card from the DOM immediately. If the API fails, re-insert it and show error toast.

### Loading State on Submit

While the API call is in flight, the submit button shows a loading state:
- Text changes to "Creating..." or "Saving..."
- Button gets `disabled` attribute (opacity: 0.5, cursor: not-allowed)
- This prevents double-submission

---

## 8. Card Animations

### Card Appearance (Create)

When a new project card is added to the list, it fades in:

```css
.project-card--entering {
  animation: card-enter 0.3s ease forwards;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Card Removal (Delete)

When a project card is removed, it fades out:

```css
.project-card--leaving {
  animation: card-leave 0.2s ease forwards;
}

@keyframes card-leave {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

After the animation completes (200ms), the DOM element is removed.

---

## 9. Full Layout Summary

From top to bottom, the new Projects section contains:

```
[Section Title: "Projects" — centered]
[Toolbar: subtitle left, "New Project" button right]
[Project Card — in-progress projects first]
[Project Card]
[Project Card — planned projects next]
[Project Card — completed projects last]
```

Or, if empty:

```
[Section Title: "Projects" — centered]
[Toolbar: subtitle left, "New Project" button right]
[Empty state: "No projects yet. Click 'New Project' to get started."]
```

---

## 10. Responsive Summary

| Element | Desktop (1024+) | Tablet (640-1023) | Mobile (<640) |
|---------|-----------------|-------------------|---------------|
| Section title | `var(--text-3xl)` | `var(--text-3xl)` | `var(--text-2xl)` |
| Toolbar | Row: subtitle + button | Row: subtitle + button | Stacked: subtitle, then button centered |
| Project card | Row: summary, meta, actions | Row: summary, meta, actions | Stacked: summary (full), then meta + actions row |
| Modal | Centered, max-width 480px | Centered, max-width 480px | Nearly full-width with `var(--space-5)` padding |
| Toast | Bottom-center, auto-width | Bottom-center, auto-width | Bottom-center, auto-width |

---

## 11. Accessibility

- **Modal focus trap**: Tab cycles only within the modal when open
- **Escape to close**: Pressing Escape closes any open modal
- **aria-modal="true"**: On the modal dialog element
- **aria-hidden**: On the modal overlay (toggled by JS)
- **aria-live="polite"**: On form validation error messages
- **aria-live="assertive"**: On toast notifications
- **role="dialog"**: On the create/edit modal
- **role="alertdialog"**: On the delete confirmation (more urgent)
- **Labels**: All form inputs have associated `<label>` elements
- **Focus return**: When a modal closes, focus returns to the element that triggered it
- **Button labels**: Action buttons have `aria-label` attributes for screen readers
- **Color contrast**: All text meets WCAG AA contrast ratios against the dark backgrounds (zinc-300 on zinc-950 = 11.7:1, zinc-400 on zinc-950 = 7.4:1)

---

## 12. CSS Class Inventory

New classes to add to `css/styles.css` (appended after existing Tasks section styles):

### Section & Toolbar
- `.projects` (replaces `.tasks` section styles, same padding)
- `.projects__toolbar`
- `.projects__subtitle`
- `.projects__new-btn`

### Card Additions
- `.project-card__actions`
- `.project-card__action-btn`
- `.project-card__action-btn--edit`
- `.project-card__action-btn--delete`
- `.project-card--entering`
- `.project-card--leaving`

### Modal
- `.modal-overlay`
- `.modal`
- `.modal--confirm`
- `.modal__header`
- `.modal__title`
- `.modal__close`
- `.modal__form`
- `.modal__field`
- `.modal__label`
- `.modal__required`
- `.modal__input`
- `.modal__textarea`
- `.modal__select`
- `.modal__input--invalid` / `__textarea--invalid` / `__select--invalid`
- `.modal__error`
- `.modal__actions`
- `.modal__cancel`
- `.modal__submit`
- `.modal__body`
- `.modal__confirm-text`
- `.modal__delete`

### Empty State
- `.projects__empty`
- `.projects__empty-text`
- `.projects__empty-hint`

### Toast
- `.toast`
- `.toast--visible`
- `.toast--error`
- `.toast__message`

### Existing classes reused as-is (no changes)
- `.project-card` (background, border, radius, hover)
- `.project-card__header` (layout — but changes from `<button>` to `<div>`)
- `.project-card__summary`, `__name`, `__desc` (all unchanged)
- `.project-card__meta` (unchanged)
- `.project-card__badge` with `data-status` variants (unchanged)
- `.project-card__date` (unchanged)
- `.section-title` (unchanged, reused for heading)

### Classes no longer needed (can be removed or left for Phase 2)
- `.project-card__chevron` (no expand/collapse)
- `.project-card__details`, `__details-inner` (no expandable panel)
- `.project-card__count` (no task count in Phase 1)
- All `.task-item*` classes (task rendering removed in Phase 1)

These can be left in the CSS for now — they're harmless dead code and may be useful in Phase 2 when task management is added back.

---

## 13. Implementation Notes for Alice

1. **New file**: Create `js/projects.js` to replace `js/tasks.js`. Follow the same IIFE + strict mode + delegated event listener pattern.

2. **Data source**: Fetch from `/api/projects` instead of `data/tasks.json`. The response shape is `{ projects: [...] }`.

3. **Modal management**: A single modal overlay element in the DOM, reused for create, edit, and delete. JS swaps the inner content (form vs. confirm) and updates the title/button text.

4. **Script tag swap**: In `index.html`, replace `<script src="js/tasks.js" defer></script>` with `<script src="js/projects.js" defer></script>`.

5. **Section rename**: Update the Tasks section in `index.html`: change `id="tasks"` to `id="projects"`, update the heading text and subtitle, add the toolbar with the "New Project" button.

6. **Nav link**: Change the nav link from `#tasks` / "Tasks" to `#projects` / "Projects".

7. **No frameworks, no libraries**: All DOM manipulation is vanilla JS. The modal, toast, and card rendering are all hand-rolled.
