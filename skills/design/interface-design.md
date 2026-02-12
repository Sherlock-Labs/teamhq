# Interface Design

**Category:** Design
**Used by:** Robert, Nina, Soren, Amara, Alice
**Last updated:** 2026-02-10

## When to Use

When writing a design spec (`docs/{project}-design-spec.md`) or reviewing an implementation against a design spec. This doc defines the conventions, patterns, and quality bar for interface design across all TeamHQ products.

## Design System Foundation

### TeamHQ Design Tokens (reference: `css/tokens.css`)

All TeamHQ pages use the shared token system. For **standalone SaaS products** (separate repos), define a project-specific design system but follow the same structural conventions.

| Category | Token Pattern | Example |
|----------|--------------|---------|
| Colors | `--color-{semantic}` | `--color-accent: #006B3F`, `--color-text-primary: #171717` |
| Typography | `--text-{size}`, `--font-weight-{name}` | `--text-sm: 0.875rem`, `--font-weight-medium: 500` |
| Spacing | `--space-{n}` (4px base) | `--space-1: 0.25rem` through `--space-24: 6rem` |
| Radius | `--radius-{size}` | `--radius-md: 4px` |
| Shadows | `--shadow-{size}` | `--shadow-lg: 0 4px 12px rgba(0,0,0,0.08)` |

### Color Usage Rules

1. **Semantic tokens over raw scales.** Use `--color-text-primary` not `#171717`. Use `--color-accent` not `#006B3F`.
2. **Status colors are fixed.** Success = green, Error = red, Warning = amber. Don't repurpose.
3. **Contrast minimums.** Body text: 4.5:1 on background. Large text (18px+): 3:1. Interactive elements: 3:1.
4. **Tertiary text.** Use `--color-text-tertiary-accessible` (#767676, 4.5:1) for small informational text — NOT `--color-text-tertiary` (#999, fails WCAG AA).
5. **Agent identity colors.** Each agent has a `-400` display color and `-600` text color (WCAG AA safe). Reference `--color-agent-{name}` tokens.

### Typography Rules

| Context | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Page heading | `--text-2xl` (1.5rem) | `--font-weight-bold` (700) | `--leading-tight` (1.2) |
| Section heading | `--text-lg` (1.125rem) | `--font-weight-semibold` (600) | `--leading-tight` |
| Body / content | `--text-sm` (0.875rem) | `--font-weight-normal` (400) | `--leading-normal` (1.5) |
| Labels / captions | `--text-xs` (0.75rem) | `--font-weight-medium` (500) | `--leading-normal` |
| Code / data | `--font-mono` | `--font-weight-normal` | `--leading-normal` |

- **Font family:** Geist (body + headings), Geist Mono (code). System-UI fallback stack.
- **No font sizes below `--text-xs` (0.75rem / 12px).** Below 12px is unreadable.
- **Uppercase labels** use `letter-spacing: 0.05em` and `--text-xs`.

### Spacing Rules

- **4px base unit.** All spacing uses `--space-{n}` tokens (multiples of 4px).
- **Consistent gaps.** Card padding: `--space-6` (24px). Section gaps: `--space-8` (32px). Inline gaps: `--space-2` (8px) to `--space-3` (12px).
- **Never use arbitrary pixel values.** Map to the nearest token.
- **Generous whitespace > cramped layouts.** When in doubt, add more space.

## Design Spec Writing Conventions

Every design spec must include these sections for each view/component:

### 1. Layout Structure

Describe the spatial hierarchy using BEM-style class names. Spec widths, heights (or auto), flex/grid behavior.

```
.component
  .component__header     → flex row, justify-between, align-center, h: 48px
  .component__body       → flex column, gap: --space-4, padding: --space-6
  .component__footer     → flex row, justify-end, gap: --space-3
```

### 2. Visual Properties

For every element, specify:
- **Background:** color token or transparent
- **Border:** width, style, color token (or none)
- **Border radius:** token
- **Shadow:** token (or none)
- **Typography:** size, weight, color, line-height, letter-spacing

### 3. Interaction States (MANDATORY)

Every interactive element needs ALL applicable states:

| State | When | What Changes |
|-------|------|-------------|
| **Default** | At rest | Base appearance |
| **Hover** | Mouse over | Border color, background, cursor |
| **Focus-visible** | Keyboard focus | 2px ring, offset 2px, accent color |
| **Active** | Mouse down / touch | Darker shade, slight scale(0.98) |
| **Disabled** | Not available | opacity: 0.5, pointer-events: none |
| **Loading** | Async operation | Spinner or skeleton, disabled interaction |
| **Empty** | No data | Illustration or message + primary action |
| **Error** | Validation fail | Red border, error message below |

### 4. Responsive Behavior

Define breakpoints and what changes:
- **Mobile** (< 640px): Stack to single column, full-width elements, larger touch targets (44px min)
- **Tablet** (640px–1024px): 2-column grids, sidebar collapse
- **Desktop** (> 1024px): Full layout, hover states active

### 5. Animation & Transitions

- **Duration:** 150ms for micro-interactions (hover, focus). 200-300ms for layout changes (expand/collapse, modal). 400ms+ only for page transitions.
- **Easing:** `ease` for most. `ease-out` for entrances. `ease-in` for exits.
- **Expand/collapse:** Use `grid-template-rows: 0fr → 1fr` pattern (see component-patterns.md).
- **Never animate layout properties** (width, height, top, left) — use transform and opacity.
- **Respect `prefers-reduced-motion`** — disable non-essential animations.

## Component Design Patterns

### Buttons

| Variant | Background | Text | Border | Use For |
|---------|-----------|------|--------|---------|
| Primary | `--color-accent` | white | none | Main actions (Save, Create) |
| Secondary | transparent | `--color-text-primary` | `--color-border` | Supporting actions (Cancel, Edit) |
| Destructive | transparent | `--color-status-error` | `--color-status-error` | Delete, Remove |
| Ghost | transparent | `--color-text-secondary` | none | Tertiary actions, icon buttons |

- Height: 36px (default), 32px (compact), 40px (large)
- Padding: `--space-3` vertical, `--space-4` horizontal
- Border radius: `--radius-md`
- Font: `--text-sm`, `--font-weight-medium`

### Form Inputs

- Height: 36px
- Border: 1px solid `--color-border`
- Focus: 2px ring `--color-accent`, border-color `--color-accent`
- Error: border-color `--color-status-error`, error message in `--text-xs` `--color-status-error`
- Placeholder: `--color-text-tertiary-accessible`
- Padding: `--space-2` vertical, `--space-3` horizontal

### Tables / Data Grids (AG Grid)

- Theme: `ag-theme-quartz` with TeamHQ overrides (see `css/spreadsheet.css`)
- Header: uppercase, `--text-xs`, `--font-weight-medium`, `letter-spacing: 0.05em`
- Rows: horizontal borders only, no column separators (Notion-style)
- Row height: 44px (comfortable), 32px (compact)
- Hover: subtle background change
- Focus: accent-colored ring on focused cell
- Badge cells: pill-style with status-appropriate colors

### Modals

- Overlay: `rgba(0,0,0,0.5)`, click to close
- Modal: `--color-bg-card`, `--radius-lg`, `--shadow-lg`, max-width 480px (form) / 640px (content)
- Header: flex row, title + close button, border-bottom
- Animation: fade in overlay + scale modal from 0.95 → 1.0

### Badges / Status Pills

- Border-radius: `9999px` (full round)
- Padding: `--space-1` `--space-3`
- Font: `--text-xs`, `--font-weight-medium`, uppercase, `letter-spacing: 0.05em`
- Colors by status: planned (gray), in-progress (blue), completed (green), deferred (amber), error (red)

### Cards

- Background: `--color-bg-card`
- Border: 1px solid `--color-border`
- Radius: `--radius-lg`
- Padding: `--space-6`
- Hover: `border-color: var(--color-border-strong)` (NOT background change)
- No box-shadow by default (flat design)

### Empty States

- Centered layout
- Icon or subtle illustration (optional)
- Heading: `--text-base`, `--font-weight-medium`
- Description: `--text-sm`, `--color-text-secondary`
- Primary action button below

## Accessibility Baseline

Every design spec MUST address:

1. **Color contrast.** All text meets WCAG AA (4.5:1 normal, 3:1 large). All interactive elements meet 3:1 against background.
2. **Keyboard navigation.** Every interactive element reachable via Tab. Logical tab order. Focus-visible styles on all focusable elements.
3. **Screen reader support.** Semantic HTML (headings, landmarks, lists). ARIA labels where visual meaning isn't conveyed by text. `aria-hidden` on decorative elements.
4. **Touch targets.** Minimum 44x44px on mobile. Minimum 32x32px on desktop.
5. **Motion sensitivity.** Respect `prefers-reduced-motion`. No auto-playing animations.
6. **Error identification.** Errors identified by more than color alone (icon + text + border).

## Design Spec Quality Checklist

Before submitting a design spec, verify:

- [ ] Every view has a layout structure with class names and spatial relationships
- [ ] Every element has explicit visual properties (colors, typography, spacing as tokens)
- [ ] Every interactive element has all applicable states (hover, focus, active, disabled, loading, empty, error)
- [ ] Responsive behavior defined for mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
- [ ] Accessibility requirements stated (contrast, keyboard, screen reader, touch targets)
- [ ] Animations specified with duration, easing, and reduced-motion fallback
- [ ] Empty states designed for every data-dependent view
- [ ] Error states designed for every async operation
- [ ] CSS values are specific enough for Alice to implement without guessing
- [ ] Design follows existing patterns before introducing new ones

## Anti-Patterns

- **Inventing new patterns** when an existing one works. Check component-patterns.md first.
- **Hardcoding colors** instead of using semantic tokens.
- **Forgetting empty/error states.** Every view that loads data needs both.
- **Designing for desktop only.** Mobile-first: start narrow, expand up.
- **Over-decorating.** No gradients, no shadows-on-everything, no rounded corners > 4px. Flat, clean, Dutch.
- **Ignoring the existing design system.** Even for standalone SaaS products, follow the same structural conventions (token naming, spacing scale, typography hierarchy).
- **Specifying "it should look good"** instead of concrete CSS values. Alice needs numbers, not vibes.

## Standalone SaaS Product Design Systems

When designing a new product in its own repo (e.g., Roadmap Tool):

1. **Define a fresh color palette** appropriate to the product's identity — don't reuse TeamHQ's Royal Jaguar Green unless it makes sense.
2. **Keep the same structural conventions:** 4px spacing grid, semantic token naming, typography hierarchy (xs through 5xl), same breakpoints.
3. **Document the design system in the spec** — the frontend developer needs a complete token reference to set up the project's `tokens.css`.
4. **Reference best-in-class SaaS UI** for that domain — Linear for project tools, Notion for content tools, Figma for creative tools. Aspire to that polish level.
