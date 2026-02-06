# Task History Feature - Technical Approach

## Overview

This is the first JavaScript addition to a currently pure HTML/CSS page. The approach prioritizes minimal footprint, progressive enhancement, and conventions that scale cleanly if more JS features are added later.

---

## File Organization

```
teamhq/
  index.html          # Add <script> tag + Tasks nav link + section placeholder
  css/styles.css      # Add task card styles (collapsed, expanded, animations)
  js/tasks.js         # All JS for this feature: fetch, render, expand/collapse
  data/tasks.json     # Project history data (static, hand-edited)
```

No new directories beyond `js/` and `data/`. One JS file, one data file.

---

## Script Loading Strategy

Add a single `<script>` tag at the bottom of `<body>`, after the footer:

```html
<script src="js/tasks.js" defer></script>
```

Use `defer` so the script loads in parallel with HTML parsing but executes after the DOM is ready. This means no need for `DOMContentLoaded` listeners inside the script -- the DOM is guaranteed to be available when the script runs.

**Do not use ES modules (`type="module"`)** for this feature. There is only one file, so module scoping adds no value and introduces unnecessary complexity. A classic script with an IIFE wrapper is simpler.

---

## Script Structure

Wrap everything in an IIFE to avoid polluting the global scope:

```js
(function () {
  'use strict';

  // 1. Fetch data/tasks.json
  // 2. Render project cards into #tasks-list
  // 3. Attach click handlers for expand/collapse
})();
```

Conventions for any future JS files on this page:
- Always use an IIFE wrapper
- Always `'use strict'`
- No global variables
- No third-party dependencies

---

## JSON Data Loading

Use `fetch()` to load `data/tasks.json`:

```js
fetch('data/tasks.json')
  .then(response => {
    if (!response.ok) throw new Error('Failed to load tasks');
    return response.json();
  })
  .then(projects => render(projects))
  .catch(() => showError());
```

Error handling: if fetch fails or JSON is malformed, display a short inline message in the tasks section (e.g., "Unable to load task history."). Do not throw to console or leave the section blank.

Note: `fetch` from a relative path requires serving via HTTP (not `file://`). This is already the case since the page is served from a dev server or static host, but worth noting.

---

## HTML Placeholder

Add a `<section>` for Tasks between Tools and Team Roster (designer will confirm exact placement, but between those two sections is the natural reading order: "what we built" -> "how we built it" -> "who built it"):

```html
<!-- Tasks -->
<section class="tasks" id="tasks" aria-labelledby="tasks-heading">
  <div class="container">
    <h2 id="tasks-heading" class="section-title">Tasks</h2>
    <p class="section-subtitle">A history of what we've shipped.</p>
    <div id="tasks-list">
      <noscript>
        <p class="tasks__noscript">Enable JavaScript to view task history.</p>
      </noscript>
    </div>
  </div>
</section>
```

The `<noscript>` tag handles the no-JS fallback. JS replaces the contents of `#tasks-list` with rendered cards.

---

## Rendering Strategy

Use template literals to build HTML strings, then set `innerHTML` on the `#tasks-list` container in a single operation. This is simpler and faster than DOM API calls for this use case (rendering a static list of cards from data).

```js
function renderCard(project) {
  const taskCount = project.tasks.length;
  const tasksHTML = project.tasks.map(task => `
    <div class="task-item">
      <div class="task-item__avatar" aria-hidden="true">${task.agent.charAt(0)}</div>
      <div class="task-item__content">
        <span class="task-item__agent">${task.agent}</span>
        <span class="task-item__role">${task.role}</span>
        <p class="task-item__title">${task.title}</p>
      </div>
      <span class="task-item__status" data-status="${task.status}"></span>
    </div>
  `).join('');

  return `
    <article class="project-card" data-project="${project.id}">
      <button class="project-card__header" aria-expanded="false">
        <div class="project-card__summary">
          <h3 class="project-card__name">${project.name}</h3>
          <p class="project-card__desc">${project.description}</p>
        </div>
        <div class="project-card__meta">
          <span class="project-card__badge" data-status="${project.status}">${project.status}</span>
          <span class="project-card__date">${project.completedDate}</span>
          <span class="project-card__count">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
        </div>
        <span class="project-card__chevron" aria-hidden="true"></span>
      </button>
      <div class="project-card__details" hidden>
        ${tasksHTML}
      </div>
    </article>
  `;
}
```

Note: All data values in `tasks.json` are hand-curated by the team, not user-supplied, so `innerHTML` with template literals is safe here. No sanitization needed.

---

## Expand/Collapse Pattern

Use a `<button>` for the card header (accessible, keyboard-navigable out of the box) with a `hidden` attribute on the details panel. JS toggles `hidden` and updates `aria-expanded`.

For smooth animation, use CSS `grid-template-rows` transition on a wrapper:

```css
.project-card__details {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.project-card__details[aria-hidden="false"] {
  grid-template-rows: 1fr;
}

.project-card__details-inner {
  overflow: hidden;
}
```

**Updated approach**: Instead of the `hidden` attribute (which doesn't animate), use a wrapper with `grid-template-rows: 0fr` -> `1fr` for smooth height animation. JS toggles a class or `aria-hidden` attribute, and CSS handles the transition. This avoids needing to measure heights or use `requestAnimationFrame`.

The card header `<button>` gets `aria-expanded="true"/"false"` toggled by JS. The chevron rotates via CSS `transform: rotate()` tied to the expanded state.

---

## Event Handling

Use a single delegated event listener on `#tasks-list` rather than one listener per card:

```js
document.getElementById('tasks-list').addEventListener('click', function (e) {
  const header = e.target.closest('.project-card__header');
  if (!header) return;

  const card = header.closest('.project-card');
  const details = card.querySelector('.project-card__details');
  const isExpanded = header.getAttribute('aria-expanded') === 'true';

  header.setAttribute('aria-expanded', !isExpanded);
  details.setAttribute('aria-hidden', isExpanded);
});
```

This scales to any number of cards without additional bindings.

---

## CSS Approach

Add all new styles to the existing `css/styles.css`, grouped under a clear section header:

```css
/* ===========================
   Tasks Section
   =========================== */
```

Follow the existing conventions:
- BEM-style class naming (`project-card__header`, `task-item__avatar`)
- Use existing CSS custom properties for colors, spacing, typography, radii
- Match existing card patterns (background `var(--color-bg-card)`, border `var(--color-border)`, radius `var(--radius-lg)`)
- Match the status badge style from tool cards (`tool-card__badge--live`)
- Agent avatars reuse the same visual pattern as `.agent-card__avatar` (indigo circle, first letter)

---

## Navigation Integration

Add "Tasks" link to the nav bar, between "Tools" and "Team":

```html
<a href="#tasks" class="nav__link">Tasks</a>
```

No JS needed -- the existing `scroll-behavior: smooth` and `scroll-padding-top: 64px` in CSS handle smooth scrolling to the anchor.

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Script type | Classic script with IIFE, `defer` | One file, no module system needed |
| Rendering | `innerHTML` + template literals | Simple, fast, data is trusted |
| Expand/collapse | `<button>` + `aria-expanded` + CSS grid-row transition | Accessible, smooth animation, no height measurement |
| Event handling | Single delegated listener on `#tasks-list` | Scales, one binding |
| Animation | `grid-template-rows: 0fr` -> `1fr` | Pure CSS transition, no JS animation logic |
| No-JS fallback | `<noscript>` message | Progressive enhancement |
| Data loading | `fetch()` with error fallback | Standard, no dependencies |
| File structure | `js/tasks.js` + `data/tasks.json` | Clean separation, matches requirements |
