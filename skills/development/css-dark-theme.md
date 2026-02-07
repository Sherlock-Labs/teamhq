# CSS Dark Theme

**Category:** Development
**Used by:** Alice, Robert
**Last updated:** 2026-02-07

## When to Use

When styling any page or component in the TeamHQ codebase. All UI follows this dark theme system.

## Design Tokens

### Background Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | `zinc-950` (#09090b) | Page background |
| `--color-bg-secondary` | `zinc-950` (#09090b) | Alternate section background |
| `--color-bg-card` | `zinc-900` (#18181b) | Card backgrounds |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-primary` | `zinc-300` (#d4d4d8) | Body text |
| `--color-text-secondary` | `zinc-400` (#a1a1aa) | Subtitles, descriptions |
| `--color-text-tertiary` | `zinc-600` (#52525b) | Dates, metadata |
| `zinc-100` (#f4f4f5) | - | Headings, hero text |
| `zinc-200` (#e4e4e7) | - | Card titles, names |

### Accent Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `indigo-500` (#6366F1) | Buttons, links, focus rings |
| `--color-accent-hover` | `indigo-400` (#818cf8) | Hover states, role labels |
| `--color-accent-light` | `rgba(99, 102, 241, 0.1)` | Badges, avatar backgrounds |

### Border & Surface
| Token | Value | Usage |
|-------|-------|-------|
| `--color-border` | `zinc-800` (#27272a) | Card borders, dividers |
| `zinc-700` (#3f3f46) | - | Hover borders, input borders |

## Naming Convention

CSS uses BEM-ish naming: `.block__element--modifier`

```css
.agent-card { }
.agent-card__name { }
.agent-card__role { }
.agent-card--active { }
```

## Typography

- Font family: Inter (with system-ui fallback)
- Monospace: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas`
- Size scale: `text-xs` (0.75rem) through `text-5xl` (3rem)
- Weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

## Spacing

Uses a 4px base: `space-1` (0.25rem) through `space-24` (6rem).

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Small elements, focus rings |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards |
| `radius-xl` | 16px | Modals |

## Conventions

- No light mode — dark theme only
- Cards: `bg-card` background, `border` color border, `radius-lg` corners
- Hover states: lighten the border to `zinc-700`
- Focus visible: 2px `accent` outline with 2px offset
- Transitions: 0.15s-0.2s ease for interactive elements

## Anti-patterns

- Using raw hex colors instead of CSS custom properties
- Adding a light mode toggle (not in scope)
- Using shadows heavily — the dark theme relies on borders, not shadows
- Using opacity for disabled states below 0.5 — keep text readable
