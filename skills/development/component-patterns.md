# Component Patterns

**Category:** Development
**Used by:** Alice, Robert
**Last updated:** 2026-02-07

## When to Use

When building UI components for the TeamHQ landing page or standalone tools.

## Card Pattern

Used for: agent cards, tool cards, project cards.

```html
<article class="card-name">
  <div class="card-name__header">...</div>
  <h3 class="card-name__title">...</h3>
  <p class="card-name__desc">...</p>
</article>
```

CSS structure:
- `background: var(--color-bg-card)`
- `border: 1px solid var(--color-border)`
- `border-radius: var(--radius-lg)`
- `padding: var(--space-6)`
- Hover: `border-color: var(--color-zinc-700)`

## Expand/Collapse Pattern

Used for: project details, task details, result outputs.

```html
<button aria-expanded="false" class="trigger">...</button>
<div class="details" aria-hidden="true">
  <div class="details__inner">
    <!-- content -->
  </div>
</div>
```

CSS animation via `grid-template-rows`:
```css
.details {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}
.details[aria-hidden="false"] {
  grid-template-rows: 1fr;
}
.details__inner {
  overflow: hidden;
}
```

## Modal Pattern

Used for: create/edit project, delete confirmation, kickoff prompt.

```html
<div class="modal-overlay" aria-hidden="true">
  <div class="modal" role="dialog" aria-labelledby="title" aria-modal="true">
    <div class="modal__header">
      <h3 class="modal__title" id="title">...</h3>
      <button class="modal__close" aria-label="Close">&times;</button>
    </div>
    <!-- body/form -->
  </div>
</div>
```

## Grid Layout Pattern

Used for: tool cards, agent roster, workflow steps.

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

## Badge Pattern

Used for: status indicators, labels.

```html
<span class="badge badge--live">Live</span>
```

```css
.badge {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

## Conventions

- Every interactive element has a focus-visible style
- Transitions are 0.15s-0.3s with `ease` timing
- Cards use `:hover` border lightening, not background changes
- Modals use overlay with `opacity`/`visibility` transitions
- Grids are mobile-first: 1 column default, 2 at 640px, 3+ at 1024px

## Anti-patterns

- Using `display: none` for show/hide — use `grid-template-rows: 0fr` for animated collapse
- Forgetting `aria-hidden`, `aria-expanded` for accessibility
- Hardcoding colors instead of using CSS custom properties
- Using fixed heights — let content determine size
