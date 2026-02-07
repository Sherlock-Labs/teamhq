# Vanilla JS Patterns

**Category:** Development
**Used by:** Alice, Jonah
**Last updated:** 2026-02-07

## When to Use

When writing JavaScript for the TeamHQ landing page or any non-React tool. The landing page uses vanilla JS with no build step.

## Core Patterns

### IIFE Wrapper

All page scripts use an Immediately Invoked Function Expression to avoid polluting global scope:

```js
(function () {
  'use strict';
  // all code here
})();
```

### Delegated Event Listeners

Instead of attaching listeners to individual elements, delegate from a parent:

```js
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.project-card__action-btn--delete');
  if (btn) handleDelete(btn);
});
```

### Template Literals for HTML

Build HTML strings with template literals, not DOM manipulation:

```js
function renderCard(project) {
  return `
    <article class="project-card">
      <h3 class="project-card__name">${escapeHtml(project.name)}</h3>
      <p class="project-card__desc">${escapeHtml(project.description)}</p>
    </article>
  `;
}
```

### Fetch-Based Data Loading

API calls use the Fetch API with async/await:

```js
async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to load projects:', err);
    showError('Could not load projects');
  }
}
```

### Progressive Enhancement

The page works without JavaScript (static content is in HTML). JS enhances with:
- Dynamic project loading
- Modal dialogs
- Expandable sections
- Toast notifications

## Conventions

- `'use strict'` at the top of every IIFE
- Always escape user-provided content with `escapeHtml()` before inserting into HTML
- Use `closest()` for event delegation — more robust than checking `e.target` directly
- Prefer `querySelector`/`querySelectorAll` over `getElementById`
- Use `aria-hidden`, `aria-expanded`, `aria-modal` for accessibility
- CSS handles animations via class toggles, not JS animation APIs

## Anti-patterns

- Adding jQuery or other libraries — vanilla JS is sufficient
- Direct DOM manipulation in loops — build HTML string, then set `innerHTML` once
- Inline event handlers (`onclick="..."`) — use `addEventListener`
- Global variables — keep everything inside the IIFE
- Missing error handling on fetch calls
