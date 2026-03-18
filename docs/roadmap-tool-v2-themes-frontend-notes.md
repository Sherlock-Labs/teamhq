# Roadmap Tool v2 — Visual Themes: Frontend Implementation Notes

**Author:** Alice (FE)
**Date:** March 18, 2026
**Status:** Ready to apply (Forge repo not available locally)
**Work Item:** RT-37d
**Inputs:**
- `docs/roadmap-tool-v2-themes-requirements.md` (Thomas)
- `docs/roadmap-tool-v2-themes-tech-approach.md` (Andrei)
- `docs/roadmap-tool-v2-themes-design-spec.md` (Robert)
- `docs/roadmap-tool-v2-themes-backend-notes.md` (Jonah)

---

## Summary

This doc contains the complete frontend implementation for visual themes in Forge. It covers: the theme registry, CSS custom properties system, theme application logic, the Settings panel Appearance section (theme picker, accent color picker, dark mode toggle), the top bar dark mode quick toggle, AG Grid variable mapping, shared view theming, real-time sync, export compatibility, responsive behavior, and accessibility.

The Forge repo was not available locally during implementation. This doc contains all code to apply — organized by file, with complete implementations ready to paste.

---

## Implementation Order

Per Robert's recommendation and Andrei's guidance, implement in this order:

1. **Theme registry** (`shared/src/themes.ts`) — types + all 6 theme definitions
2. **Color utilities** (`client/src/lib/colorUtils.ts`) — `darken()`, `withAlpha()`, `hexToRgb()`
3. **useResolvedMode hook** (`client/src/hooks/useResolvedMode.ts`)
4. **Theme application on RoadmapPage** — `data-theme`, `data-mode`, `style` attributes
5. **CSS refactor** — replace hardcoded colors with `var(--forge-*)` references
6. **AG Grid variable mapping** — override AG Grid theme vars
7. **Settings UI** — ThemePicker, AccentColorPicker, DarkModeToggle components
8. **Top bar dark mode toggle** — Moon/Sun button
9. **Shared view theming** — apply to `/shared/:token`
10. **Socket.IO handler** — react to `roadmap-updated` theme changes
11. **Export verification** — confirm html-to-image captures themed styles

---

## 1. Theme Registry — `shared/src/themes.ts`

This file lives in `shared/` so both client and server can import it. It contains the type definitions and all 6 theme definitions with light and dark variants.

```typescript
// shared/src/themes.ts

export interface ThemeTokens {
  // Surface colors
  '--forge-bg': string;
  '--forge-bg-secondary': string;
  '--forge-bg-elevated': string;
  '--forge-bg-hover': string;

  // Border & divider
  '--forge-border': string;
  '--forge-border-subtle': string;

  // Text
  '--forge-text': string;
  '--forge-text-secondary': string;
  '--forge-text-tertiary': string;

  // Accent (overridable via accentColor)
  '--forge-accent': string;
  '--forge-accent-hover': string;
  '--forge-accent-subtle': string;

  // Component-specific
  '--forge-header-bg': string;
  '--forge-header-text': string;
  '--forge-card-radius': string;
  '--forge-card-shadow': string;
  '--forge-card-border': string;
  '--forge-font-family': string;
  '--forge-font-heading': string;
}

export interface ThemeDefinition {
  name: string;
  key: string;
  description: string;
  light: ThemeTokens;
  dark: ThemeTokens;
}

export const THEME_KEYS = ['default', 'clean', 'bold', 'minimal', 'corporate', 'startup'] as const;
export type ThemeKey = typeof THEME_KEYS[number];

// ─── Default Theme ───────────────────────────────────────────────────────────
// Must be pixel-identical to the current Forge appearance.

const defaultTheme: ThemeDefinition = {
  name: 'Default',
  key: 'default',
  description: 'The standard Forge look — clean and professional',
  light: {
    '--forge-bg':             '#FFFFFF',
    '--forge-bg-secondary':   '#FAFAFA',
    '--forge-bg-elevated':    '#FFFFFF',
    '--forge-bg-hover':       '#F4F4F5',
    '--forge-border':         '#D4D4D8',
    '--forge-border-subtle':  '#E4E4E7',
    '--forge-text':           '#09090B',
    '--forge-text-secondary': '#3F3F46',
    '--forge-text-tertiary':  '#71717A',
    '--forge-accent':         '#4F46E5',
    '--forge-accent-hover':   '#4338CA',
    '--forge-accent-subtle':  'rgba(79, 70, 229, 0.08)',
    '--forge-header-bg':      '#FFFFFF',
    '--forge-header-text':    '#09090B',
    '--forge-card-radius':    '8px',
    '--forge-card-shadow':    '0 1px 2px rgba(0,0,0,0.05)',
    '--forge-card-border':    '1px solid #D4D4D8',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
  dark: {
    '--forge-bg':             '#09090B',
    '--forge-bg-secondary':   '#18181B',
    '--forge-bg-elevated':    '#1C1C1E',
    '--forge-bg-hover':       '#27272A',
    '--forge-border':         '#3F3F46',
    '--forge-border-subtle':  '#27272A',
    '--forge-text':           '#FAFAFA',
    '--forge-text-secondary': '#A1A1AA',
    '--forge-text-tertiary':  '#71717A',
    '--forge-accent':         '#818CF8',
    '--forge-accent-hover':   '#6366F1',
    '--forge-accent-subtle':  'rgba(129, 140, 248, 0.12)',
    '--forge-header-bg':      '#18181B',
    '--forge-header-text':    '#FAFAFA',
    '--forge-card-radius':    '8px',
    '--forge-card-shadow':    '0 1px 3px rgba(0,0,0,0.4)',
    '--forge-card-border':    '1px solid #3F3F46',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
};

// ─── Clean Theme ─────────────────────────────────────────────────────────────

const cleanTheme: ThemeDefinition = {
  name: 'Clean',
  key: 'clean',
  description: 'Light, airy design with soft shadows and rounded cards',
  light: {
    '--forge-bg':             '#FAFAFA',
    '--forge-bg-secondary':   '#F5F5F5',
    '--forge-bg-elevated':    '#FFFFFF',
    '--forge-bg-hover':       '#F0F0F0',
    '--forge-border':         '#E5E5E5',
    '--forge-border-subtle':  '#F0F0F0',
    '--forge-text':           '#171717',
    '--forge-text-secondary': '#737373',
    '--forge-text-tertiary':  '#A3A3A3',
    '--forge-accent':         '#6366F1',
    '--forge-accent-hover':   '#4F46E5',
    '--forge-accent-subtle':  'rgba(99, 102, 241, 0.08)',
    '--forge-header-bg':      '#FFFFFF',
    '--forge-header-text':    '#171717',
    '--forge-card-radius':    '12px',
    '--forge-card-shadow':    '0 1px 3px rgba(0,0,0,0.06)',
    '--forge-card-border':    '1px solid #E5E5E5',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
  dark: {
    '--forge-bg':             '#0A0A0A',
    '--forge-bg-secondary':   '#171717',
    '--forge-bg-elevated':    '#1C1C1C',
    '--forge-bg-hover':       '#262626',
    '--forge-border':         '#2E2E2E',
    '--forge-border-subtle':  '#1F1F1F',
    '--forge-text':           '#FAFAFA',
    '--forge-text-secondary': '#A3A3A3',
    '--forge-text-tertiary':  '#737373',
    '--forge-accent':         '#818CF8',
    '--forge-accent-hover':   '#6366F1',
    '--forge-accent-subtle':  'rgba(129, 140, 248, 0.12)',
    '--forge-header-bg':      '#141414',
    '--forge-header-text':    '#FAFAFA',
    '--forge-card-radius':    '12px',
    '--forge-card-shadow':    '0 1px 3px rgba(0,0,0,0.3)',
    '--forge-card-border':    '1px solid #2E2E2E',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
};

// ─── Bold Theme ──────────────────────────────────────────────────────────────

const boldTheme: ThemeDefinition = {
  name: 'Bold',
  key: 'bold',
  description: 'High contrast with sharp edges and strong borders',
  light: {
    '--forge-bg':             '#FFFFFF',
    '--forge-bg-secondary':   '#F8F8F8',
    '--forge-bg-elevated':    '#FFFFFF',
    '--forge-bg-hover':       '#F3F4F6',
    '--forge-border':         '#D1D5DB',
    '--forge-border-subtle':  '#E5E7EB',
    '--forge-text':           '#111827',
    '--forge-text-secondary': '#4B5563',
    '--forge-text-tertiary':  '#9CA3AF',
    '--forge-accent':         '#4F46E5',
    '--forge-accent-hover':   '#4338CA',
    '--forge-accent-subtle':  'rgba(79, 70, 229, 0.08)',
    '--forge-header-bg':      '#111827',
    '--forge-header-text':    '#F9FAFB',
    '--forge-card-radius':    '4px',
    '--forge-card-shadow':    'none',
    '--forge-card-border':    '2px solid #D1D5DB',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
  dark: {
    '--forge-bg':             '#0F0F0F',
    '--forge-bg-secondary':   '#1A1A1A',
    '--forge-bg-elevated':    '#1F1F1F',
    '--forge-bg-hover':       '#2A2A2A',
    '--forge-border':         '#404040',
    '--forge-border-subtle':  '#2A2A2A',
    '--forge-text':           '#F9FAFB',
    '--forge-text-secondary': '#9CA3AF',
    '--forge-text-tertiary':  '#6B7280',
    '--forge-accent':         '#818CF8',
    '--forge-accent-hover':   '#6366F1',
    '--forge-accent-subtle':  'rgba(129, 140, 248, 0.15)',
    '--forge-header-bg':      '#000000',
    '--forge-header-text':    '#F9FAFB',
    '--forge-card-radius':    '4px',
    '--forge-card-shadow':    'none',
    '--forge-card-border':    '2px solid #404040',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
};

// ─── Minimal Theme ───────────────────────────────────────────────────────────

const minimalTheme: ThemeDefinition = {
  name: 'Minimal',
  key: 'minimal',
  description: 'No shadows, hairline borders, maximum whitespace',
  light: {
    '--forge-bg':             '#FFFFFF',
    '--forge-bg-secondary':   '#FFFFFF',
    '--forge-bg-elevated':    '#FFFFFF',
    '--forge-bg-hover':       '#FAFAFA',
    '--forge-border':         '#E8E8E8',
    '--forge-border-subtle':  '#F2F2F2',
    '--forge-text':           '#1A1A1A',
    '--forge-text-secondary': '#808080',
    '--forge-text-tertiary':  '#B3B3B3',
    '--forge-accent':         '#1A1A1A',
    '--forge-accent-hover':   '#000000',
    '--forge-accent-subtle':  'rgba(26, 26, 26, 0.05)',
    '--forge-header-bg':      '#FFFFFF',
    '--forge-header-text':    '#1A1A1A',
    '--forge-card-radius':    '2px',
    '--forge-card-shadow':    'none',
    '--forge-card-border':    '1px solid #E8E8E8',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
  dark: {
    '--forge-bg':             '#0A0A0A',
    '--forge-bg-secondary':   '#0A0A0A',
    '--forge-bg-elevated':    '#111111',
    '--forge-bg-hover':       '#161616',
    '--forge-border':         '#222222',
    '--forge-border-subtle':  '#181818',
    '--forge-text':           '#E5E5E5',
    '--forge-text-secondary': '#808080',
    '--forge-text-tertiary':  '#555555',
    '--forge-accent':         '#E5E5E5',
    '--forge-accent-hover':   '#FFFFFF',
    '--forge-accent-subtle':  'rgba(229, 229, 229, 0.06)',
    '--forge-header-bg':      '#0A0A0A',
    '--forge-header-text':    '#E5E5E5',
    '--forge-card-radius':    '2px',
    '--forge-card-shadow':    'none',
    '--forge-card-border':    '1px solid #222222',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
};

// ─── Corporate Theme ─────────────────────────────────────────────────────────

const corporateTheme: ThemeDefinition = {
  name: 'Corporate',
  key: 'corporate',
  description: 'Conservative palette with serif headings — boardroom-ready',
  light: {
    '--forge-bg':             '#FAF9F7',
    '--forge-bg-secondary':   '#F5F4F1',
    '--forge-bg-elevated':    '#FFFFFF',
    '--forge-bg-hover':       '#F0EFEC',
    '--forge-border':         '#D6D3CD',
    '--forge-border-subtle':  '#E8E6E1',
    '--forge-text':           '#1C1917',
    '--forge-text-secondary': '#57534E',
    '--forge-text-tertiary':  '#A8A29E',
    '--forge-accent':         '#1E3A5F',
    '--forge-accent-hover':   '#152C4A',
    '--forge-accent-subtle':  'rgba(30, 58, 95, 0.07)',
    '--forge-header-bg':      '#FFFFFF',
    '--forge-header-text':    '#1C1917',
    '--forge-card-radius':    '6px',
    '--forge-card-shadow':    '0 1px 2px rgba(0,0,0,0.04)',
    '--forge-card-border':    '1px solid #D6D3CD',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Source Serif 4', Georgia, serif",
  },
  dark: {
    '--forge-bg':             '#0C0A09',
    '--forge-bg-secondary':   '#1C1917',
    '--forge-bg-elevated':    '#211F1D',
    '--forge-bg-hover':       '#292524',
    '--forge-border':         '#3D3832',
    '--forge-border-subtle':  '#292524',
    '--forge-text':           '#FAF9F7',
    '--forge-text-secondary': '#A8A29E',
    '--forge-text-tertiary':  '#78716C',
    '--forge-accent':         '#60A5FA',
    '--forge-accent-hover':   '#3B82F6',
    '--forge-accent-subtle':  'rgba(96, 165, 250, 0.1)',
    '--forge-header-bg':      '#1C1917',
    '--forge-header-text':    '#FAF9F7',
    '--forge-card-radius':    '6px',
    '--forge-card-shadow':    '0 1px 2px rgba(0,0,0,0.3)',
    '--forge-card-border':    '1px solid #3D3832',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Source Serif 4', Georgia, serif",
  },
};

// ─── Startup Theme ───────────────────────────────────────────────────────────

const startupTheme: ThemeDefinition = {
  name: 'Startup',
  key: 'startup',
  description: 'Vibrant teal accent with modern type — demo day ready',
  light: {
    '--forge-bg':             '#FAFCFD',
    '--forge-bg-secondary':   '#F1F8FA',
    '--forge-bg-elevated':    '#FFFFFF',
    '--forge-bg-hover':       '#EDF6F8',
    '--forge-border':         '#D1E4E9',
    '--forge-border-subtle':  '#E4EFF2',
    '--forge-text':           '#0F172A',
    '--forge-text-secondary': '#475569',
    '--forge-text-tertiary':  '#94A3B8',
    '--forge-accent':         '#0891B2',
    '--forge-accent-hover':   '#0E7490',
    '--forge-accent-subtle':  'rgba(8, 145, 178, 0.07)',
    '--forge-header-bg':      '#FFFFFF',
    '--forge-header-text':    '#0F172A',
    '--forge-card-radius':    '12px',
    '--forge-card-shadow':    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '--forge-card-border':    '1px solid #D1E4E9',
    '--forge-font-family':    "'DM Sans', system-ui, sans-serif",
    '--forge-font-heading':   "'DM Sans', system-ui, sans-serif",
  },
  dark: {
    '--forge-bg':             '#0B1120',
    '--forge-bg-secondary':   '#111827',
    '--forge-bg-elevated':    '#1A2332',
    '--forge-bg-hover':       '#1E293B',
    '--forge-border':         '#2D3A4D',
    '--forge-border-subtle':  '#1E293B',
    '--forge-text':           '#F1F5F9',
    '--forge-text-secondary': '#94A3B8',
    '--forge-text-tertiary':  '#64748B',
    '--forge-accent':         '#22D3EE',
    '--forge-accent-hover':   '#06B6D4',
    '--forge-accent-subtle':  'rgba(34, 211, 238, 0.1)',
    '--forge-header-bg':      '#111827',
    '--forge-header-text':    '#F1F5F9',
    '--forge-card-radius':    '12px',
    '--forge-card-shadow':    '0 1px 3px rgba(0,0,0,0.3)',
    '--forge-card-border':    '1px solid #2D3A4D',
    '--forge-font-family':    "'DM Sans', system-ui, sans-serif",
    '--forge-font-heading':   "'DM Sans', system-ui, sans-serif",
  },
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const THEME_REGISTRY: Record<ThemeKey, ThemeDefinition> = {
  default: defaultTheme,
  clean: cleanTheme,
  bold: boldTheme,
  minimal: minimalTheme,
  corporate: corporateTheme,
  startup: startupTheme,
};

/** Ordered array for UI display (theme picker grid) */
export const THEME_ORDER: ThemeKey[] = ['default', 'clean', 'bold', 'minimal', 'corporate', 'startup'];
```

---

## 2. Color Utilities — `client/src/lib/colorUtils.ts`

Two tiny pure functions for accent color derivation. No dependencies.

```typescript
// client/src/lib/colorUtils.ts

/**
 * Parse hex color to RGB components.
 * Accepts '#RRGGBB' format.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Darken a hex color by a percentage (0-100).
 * Returns a hex string.
 */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - amount / 100;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

/**
 * Return a hex color as an rgba() string at the given alpha.
 */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

---

## 3. useResolvedMode Hook — `client/src/hooks/useResolvedMode.ts`

Resolves the `'system'` dark mode setting to `'light'` or `'dark'` using `matchMedia`.

```typescript
// client/src/hooks/useResolvedMode.ts

import { useState, useEffect } from 'react';

type DarkModeSetting = 'light' | 'dark' | 'system';
type ResolvedMode = 'light' | 'dark';

/**
 * Resolves a dark mode setting to a concrete 'light' or 'dark' value.
 * When darkMode is 'system', listens to prefers-color-scheme media query.
 */
export function useResolvedMode(darkMode: DarkModeSetting): ResolvedMode {
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (darkMode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return darkMode;
}
```

---

## 4. Theme Application Logic — `client/src/lib/themeUtils.ts`

Computes the CSS custom property object to set as inline `style` on the roadmap container.

```typescript
// client/src/lib/themeUtils.ts

import { THEME_REGISTRY, type ThemeKey, type ThemeTokens } from '@forge/shared/themes';
import { darken, withAlpha } from './colorUtils';

/**
 * Build a CSS custom properties object for the given theme settings.
 * Applied as inline `style` on .roadmap-container.
 */
export function getThemeStyles(
  themeName: string,
  accentColor: string | null,
  mode: 'light' | 'dark'
): React.CSSProperties {
  const theme = THEME_REGISTRY[themeName as ThemeKey] ?? THEME_REGISTRY.default;
  const tokens = mode === 'dark' ? theme.dark : theme.light;
  const styles: Record<string, string> = { ...tokens };

  // Override accent colors if custom accent is set
  if (accentColor) {
    styles['--forge-accent'] = accentColor;
    styles['--forge-accent-hover'] = darken(accentColor, 10);
    styles['--forge-accent-subtle'] = withAlpha(accentColor, mode === 'dark' ? 0.12 : 0.08);
  }

  return styles as React.CSSProperties;
}
```

---

## 5. RoadmapPage Integration

### 5.1 Wire Up Theme on Container

In `client/src/routes/RoadmapPage.tsx`, apply theme variables on the `.roadmap-container` element:

```tsx
// In RoadmapPage.tsx — add these imports
import { useResolvedMode } from '../hooks/useResolvedMode';
import { getThemeStyles } from '../lib/themeUtils';

// Inside the RoadmapPage component, after loading the roadmap:
const { themeName, accentColor, darkMode } = roadmap;
const resolvedMode = useResolvedMode(darkMode);
const themeStyles = getThemeStyles(themeName, accentColor, resolvedMode);

// On the container element:
<div
  className="roadmap-container"
  data-theme={themeName}
  data-mode={resolvedMode}
  style={themeStyles}
>
  {/* TopBar, ViewSwitcher, view content, etc. */}
</div>
```

### 5.2 SharedViewPage — Same Treatment

In `client/src/routes/SharedViewPage.tsx`, apply the same pattern:

```tsx
// Same imports as above

const { themeName, accentColor, darkMode } = roadmapData;
const resolvedMode = useResolvedMode(darkMode);
const themeStyles = getThemeStyles(themeName, accentColor, resolvedMode);

<div
  className="shared-view-container"
  data-theme={themeName}
  data-mode={resolvedMode}
  style={themeStyles}
>
  {/* Shared view content */}
</div>
```

---

## 6. CSS Refactor — Replace Hardcoded Colors with Variables

This is the highest-risk step. It touches the most files. Do it first before building any UI.

### 6.1 Strategy

1. Search the existing CSS/SCSS for all hardcoded color values (hex, rgb, rgba)
2. Map each one to the appropriate `--forge-*` variable
3. Replace with `var(--forge-*)` references
4. Verify the `default` theme renders identically to the current UI

### 6.2 Common Replacements

Search for these patterns and replace with the variable equivalent:

| Hardcoded Pattern | Replace With |
|-------------------|-------------|
| `background: #fff` / `background: white` / `background-color: #ffffff` | `background: var(--forge-bg)` |
| `background: #fafafa` / `--gray-50` references | `background: var(--forge-bg-secondary)` |
| `background: #f4f4f5` / hover backgrounds | `background: var(--forge-bg-hover)` |
| Card/modal/popover backgrounds | `background: var(--forge-bg-elevated)` |
| `border-color: #d4d4d8` / `--gray-300` | `border-color: var(--forge-border)` |
| `border-color: #e4e4e7` / `--gray-200` / grid lines | `border-color: var(--forge-border-subtle)` |
| `color: #09090b` / `--gray-950` / primary text | `color: var(--forge-text)` |
| `color: #3f3f46` / `--gray-700` / secondary text | `color: var(--forge-text-secondary)` |
| `color: #71717a` / `--gray-500` / placeholders | `color: var(--forge-text-tertiary)` |
| `#4f46e5` / accent/indigo references | `var(--forge-accent)` |
| Selection backgrounds with accent | `var(--forge-accent-subtle)` |
| Header/toolbar backgrounds | `var(--forge-header-bg)` |
| Header text colors | `var(--forge-header-text)` |
| Card `border-radius` values | `var(--forge-card-radius)` |
| Card `box-shadow` values | `var(--forge-card-shadow)` |
| Card borders | `var(--forge-card-border)` |
| `font-family` declarations | `var(--forge-font-family)` |
| Heading `font-family` | `var(--forge-font-heading)` |

### 6.3 Transition CSS on the Container

Add to the global stylesheet or a theme-specific CSS file:

```css
/* Theme transition — smooth color changes when switching themes/modes */
.roadmap-container {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .roadmap-container,
  .roadmap-container * {
    transition-duration: 0ms !important;
  }
}
```

### 6.4 Modal Overlay Dark Mode Adjustment

```css
/* Light mode overlay */
.roadmap-container[data-mode="light"] .modal-overlay {
  background: rgba(0, 0, 0, 0.5);
}

/* Dark mode overlay — heavier to create depth */
.roadmap-container[data-mode="dark"] .modal-overlay {
  background: rgba(0, 0, 0, 0.7);
}
```

---

## 7. AG Grid Variable Mapping

AG Grid uses its own CSS custom properties. Override them within the `.roadmap-container` scope to pick up theme tokens. This makes the Table View theme-aware.

```css
/* In the global stylesheet or a dedicated themes.css file */

.roadmap-container .ag-theme-quartz {
  --ag-background-color: var(--forge-bg);
  --ag-header-background-color: var(--forge-bg-secondary);
  --ag-row-hover-color: var(--forge-bg-hover);
  --ag-selected-row-background-color: var(--forge-accent-subtle);
  --ag-border-color: var(--forge-border-subtle);
  --ag-foreground-color: var(--forge-text);
  --ag-secondary-foreground-color: var(--forge-text-secondary);
  --ag-header-foreground-color: var(--forge-text-secondary);
  --ag-odd-row-background-color: transparent;
  --ag-row-border-color: var(--forge-border-subtle);
  --ag-header-cell-hover-background-color: var(--forge-bg-hover);
  --ag-range-selection-background-color: var(--forge-accent-subtle);
  --ag-input-focus-border-color: var(--forge-accent);
  --ag-font-family: var(--forge-font-family);
  --ag-font-size: 13px;
}

/* Alternating row stripe — subtle */
.roadmap-container .ag-theme-quartz .ag-row-odd {
  background-color: color-mix(in srgb, var(--forge-bg-secondary) 50%, transparent);
}
```

---

## 8. Font Loading

Add Google Fonts link in `index.html` (or inject at app init). Three fonts total:

```html
<!-- In index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
```

**Weight:** ~60KB total with woff2. All three loaded upfront to avoid FOIT when switching themes.

---

## 9. Settings Panel — Appearance Section

### 9.1 Section Placement

Add an "Appearance" section at the top of `RoadmapSettings.tsx`, above existing sections (Fields, Sharing, etc.).

```tsx
// In RoadmapSettings.tsx, add to the panel content:

<div className="settings-appearance">
  <h3 className="settings-section-title">Appearance</h3>
  <ThemePicker
    currentTheme={roadmap.themeName}
    accentColor={roadmap.accentColor}
    mode={resolvedMode}
    onThemeChange={handleThemeChange}
  />
  <AccentColorPicker
    accentColor={roadmap.accentColor}
    themeName={roadmap.themeName}
    onAccentChange={handleAccentChange}
  />
  <DarkModeToggle
    darkMode={roadmap.darkMode}
    onModeChange={handleModeChange}
  />
</div>
```

### 9.2 Handler Functions

All three handlers call the same PATCH endpoint. Use optimistic updates.

```typescript
// In RoadmapSettings.tsx or a parent component

const handleThemeChange = async (themeName: string) => {
  // Optimistic update — apply immediately to store
  updateRoadmapInStore({ themeName });

  try {
    await patchRoadmap(roadmap.id, { themeName });
  } catch (err) {
    // Revert on failure
    updateRoadmapInStore({ themeName: previousThemeName });
    toast.error("Couldn't save theme change. Check your connection.");
  }
};

const handleAccentChange = async (accentColor: string | null) => {
  updateRoadmapInStore({ accentColor });

  try {
    await patchRoadmap(roadmap.id, { accentColor });
  } catch (err) {
    updateRoadmapInStore({ accentColor: previousAccentColor });
    toast.error("Couldn't save accent color. Check your connection.");
  }
};

const handleModeChange = async (darkMode: 'light' | 'dark' | 'system') => {
  updateRoadmapInStore({ darkMode });

  try {
    await patchRoadmap(roadmap.id, { darkMode });
  } catch (err) {
    updateRoadmapInStore({ darkMode: previousDarkMode });
    toast.error("Couldn't save mode change. Check your connection.");
  }
};
```

---

## 10. ThemePicker Component — `client/src/components/settings/ThemePicker.tsx`

```tsx
// client/src/components/settings/ThemePicker.tsx

import { useRef, useCallback } from 'react';
import { THEME_REGISTRY, THEME_ORDER, type ThemeKey } from '@forge/shared/themes';
import './ThemePicker.css';

interface ThemePickerProps {
  currentTheme: string;
  accentColor: string | null;
  mode: 'light' | 'dark';
  onThemeChange: (themeName: string) => void;
}

export function ThemePicker({ currentTheme, accentColor, mode, onThemeChange }: ThemePickerProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Roving tabindex — arrow key navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 2,   // 2 columns
      ArrowUp: -2,
    };

    const delta = keys[e.key];
    if (delta !== undefined) {
      e.preventDefault();
      const nextIndex = Math.max(0, Math.min(THEME_ORDER.length - 1, index + delta));
      const cards = gridRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      cards?.[nextIndex]?.focus();
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onThemeChange(THEME_ORDER[index]);
    }
  }, [onThemeChange]);

  return (
    <div className="theme-picker">
      <div
        ref={gridRef}
        className="theme-picker__grid"
        role="radiogroup"
        aria-label="Theme"
      >
        {THEME_ORDER.map((key, index) => {
          const theme = THEME_REGISTRY[key];
          const isSelected = currentTheme === key;
          const tokens = mode === 'dark' ? theme.dark : theme.light;
          // If custom accent is set, use it for preview bars
          const previewAccent = accentColor || tokens['--forge-accent'];

          return (
            <button
              key={key}
              className={`theme-card ${isSelected ? 'theme-card--selected' : ''}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${theme.name} theme`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onThemeChange(key)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {/* Miniature preview — decorative */}
              <div className="theme-card__preview" aria-hidden="true">
                <div
                  className="theme-card__preview-bg"
                  style={{ backgroundColor: tokens['--forge-bg'] }}
                >
                  {/* Header bar */}
                  <div
                    className="theme-card__preview-header"
                    style={{ backgroundColor: tokens['--forge-header-bg'] }}
                  />

                  {/* Grid lines */}
                  <div
                    className="theme-card__preview-gridline"
                    style={{
                      left: '33%',
                      backgroundColor: tokens['--forge-border-subtle'],
                    }}
                  />
                  <div
                    className="theme-card__preview-gridline"
                    style={{
                      left: '66%',
                      backgroundColor: tokens['--forge-border-subtle'],
                    }}
                  />

                  {/* Item bars */}
                  <div
                    className="theme-card__preview-bar"
                    style={{
                      top: '25%',
                      width: '60%',
                      left: '4px',
                      backgroundColor: previewAccent,
                      opacity: 1,
                    }}
                  />
                  <div
                    className="theme-card__preview-bar"
                    style={{
                      top: '50%',
                      width: '45%',
                      left: '20%',
                      backgroundColor: previewAccent,
                      opacity: 0.4,
                    }}
                  />
                  <div
                    className="theme-card__preview-bar"
                    style={{
                      top: '75%',
                      width: '55%',
                      left: '4px',
                      backgroundColor: previewAccent,
                      opacity: 0.25,
                    }}
                  />
                </div>
              </div>

              {/* Label */}
              <span className="theme-card__label">{theme.name}</span>
            </button>
          );
        })}
      </div>

      {/* Announcement region for screen readers */}
      <div aria-live="polite" className="sr-only" id="theme-announcement" />
    </div>
  );
}
```

### 10.1 ThemePicker CSS — `client/src/components/settings/ThemePicker.css`

```css
/* client/src/components/settings/ThemePicker.css */

.theme-picker {
  margin-bottom: 24px; /* --space-6 */
}

.theme-picker__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px; /* --space-3 */
}

/* ─── Theme Card ──────────────────────────────────────────────────────────── */

.theme-card {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--forge-border);
  border-radius: var(--forge-card-radius, 6px);
  background: var(--forge-bg-elevated);
  overflow: hidden;
  transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}

.theme-card:hover {
  border-color: color-mix(in srgb, var(--forge-accent) 50%, transparent);
  transform: translateY(-1px);
}

.theme-card--selected {
  border: 2px solid var(--forge-accent);
  box-shadow: 0 0 0 2px var(--forge-accent-subtle);
}

.theme-card:focus-visible {
  outline: 2px solid var(--forge-accent);
  outline-offset: 2px;
}

/* ─── Preview ─────────────────────────────────────────────────────────────── */

.theme-card__preview {
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: var(--forge-card-radius, 6px) var(--forge-card-radius, 6px) 0 0;
}

.theme-card__preview-bg {
  position: relative;
  width: 100%;
  height: 100%;
}

.theme-card__preview-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
}

.theme-card__preview-gridline {
  position: absolute;
  top: 6px; /* below header */
  bottom: 0;
  width: 1px;
}

.theme-card__preview-bar {
  position: absolute;
  height: 4px;
  border-radius: 2px;
  transform: translateY(-50%);
}

/* ─── Label ───────────────────────────────────────────────────────────────── */

.theme-card__label {
  display: block;
  text-align: center;
  font-size: 11px; /* --text-xs */
  font-weight: 500;
  color: var(--forge-text-secondary);
  padding: 4px 8px; /* --space-1 --space-2 */
  line-height: 24px;
}

.theme-card--selected .theme-card__label {
  font-weight: 600;
  color: var(--forge-accent);
}

/* ─── Responsive ──────────────────────────────────────────────────────────── */

@media (max-width: 400px) {
  .theme-picker__grid {
    grid-template-columns: 1fr;
  }
}

/* ─── Screen reader only ──────────────────────────────────────────────────── */

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 11. AccentColorPicker Component — `client/src/components/settings/AccentColorPicker.tsx`

```tsx
// client/src/components/settings/AccentColorPicker.tsx

import { useState, useRef, useCallback } from 'react';
import { THEME_REGISTRY, type ThemeKey } from '@forge/shared/themes';
import './AccentColorPicker.css';

const PRESET_SWATCHES = [
  { hex: null, name: 'Theme default', tooltip: 'Theme default' },
  { hex: '#3B82F6', name: 'Blue', tooltip: 'Blue' },
  { hex: '#06B6D4', name: 'Cyan', tooltip: 'Cyan' },
  { hex: '#10B981', name: 'Emerald', tooltip: 'Emerald' },
  { hex: '#F59E0B', name: 'Amber', tooltip: 'Amber' },
  { hex: '#EF4444', name: 'Red', tooltip: 'Red' },
  { hex: '#8B5CF6', name: 'Violet', tooltip: 'Violet' },
  { hex: '#EC4899', name: 'Pink', tooltip: 'Pink' },
] as const;

interface AccentColorPickerProps {
  accentColor: string | null;
  themeName: string;
  onAccentChange: (color: string | null) => void;
}

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function AccentColorPicker({ accentColor, themeName, onAccentChange }: AccentColorPickerProps) {
  const [hexInput, setHexInput] = useState(accentColor?.replace('#', '') ?? '');
  const [isInvalid, setIsInvalid] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Get the theme's default accent for display
  const theme = THEME_REGISTRY[themeName as ThemeKey] ?? THEME_REGISTRY.default;
  const defaultAccent = theme.light['--forge-accent'];
  const displayColor = accentColor || defaultAccent;

  const handleSwatchClick = useCallback((hex: string | null) => {
    setIsInvalid(false);
    setHexInput(hex?.replace('#', '') ?? '');
    onAccentChange(hex);
  }, [onAccentChange]);

  const handleHexSubmit = useCallback(() => {
    const fullHex = `#${hexInput}`;
    if (hexInput === '') {
      // Clear to theme default
      setIsInvalid(false);
      onAccentChange(null);
      return;
    }
    if (HEX_REGEX.test(fullHex)) {
      setIsInvalid(false);
      onAccentChange(fullHex);
    } else {
      setIsInvalid(true);
    }
  }, [hexInput, onAccentChange]);

  const handleColorWellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexInput(hex.replace('#', ''));
    setIsInvalid(false);
    onAccentChange(hex);
  }, [onAccentChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
    };
    const delta = keys[e.key];
    if (delta !== undefined) {
      e.preventDefault();
      const nextIndex = Math.max(0, Math.min(PRESET_SWATCHES.length - 1, index + delta));
      const swatches = (e.currentTarget as HTMLElement)
        .closest('[role="radiogroup"]')
        ?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      swatches?.[nextIndex]?.focus();
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSwatchClick(PRESET_SWATCHES[index].hex);
    }
  }, [handleSwatchClick]);

  // Determine which swatch is selected
  const selectedSwatchIndex = accentColor === null
    ? 0 // "Theme default"
    : PRESET_SWATCHES.findIndex((s) => s.hex === accentColor);

  return (
    <div className="accent-picker">
      <label className="accent-picker__label">Accent color</label>

      <div className="accent-picker__controls">
        {/* Preset swatches */}
        <div
          className="accent-picker__swatches"
          role="radiogroup"
          aria-label="Accent color"
        >
          {PRESET_SWATCHES.map((swatch, index) => {
            const isSelected = index === selectedSwatchIndex;
            const swatchColor = swatch.hex || defaultAccent;

            return (
              <button
                key={swatch.name}
                className={`accent-swatch ${isSelected ? 'accent-swatch--selected' : ''}`}
                role="radio"
                aria-checked={isSelected}
                aria-label={swatch.tooltip}
                title={swatch.tooltip}
                tabIndex={isSelected ? 0 : -1}
                style={{
                  backgroundColor: swatchColor,
                  borderColor: isSelected ? swatchColor : 'transparent',
                }}
                onClick={() => handleSwatchClick(swatch.hex)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
            );
          })}
        </div>

        {/* Divider */}
        <div className="accent-picker__divider" />

        {/* Custom color input */}
        <div className="accent-picker__custom">
          {/* Native color well */}
          <label className="accent-picker__well-wrapper">
            <input
              ref={colorInputRef}
              type="color"
              className="accent-picker__well"
              value={displayColor}
              onChange={handleColorWellChange}
              aria-label="Choose custom accent color"
            />
          </label>

          {/* Hex text input */}
          <div className={`accent-picker__hex-wrapper ${isInvalid ? 'accent-picker__hex-wrapper--invalid' : ''}`}>
            <span className="accent-picker__hex-prefix">#</span>
            <input
              type="text"
              className="accent-picker__hex"
              value={hexInput}
              onChange={(e) => {
                setHexInput(e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6));
                setIsInvalid(false);
              }}
              onBlur={handleHexSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleHexSubmit();
              }}
              placeholder={defaultAccent.replace('#', '')}
              maxLength={6}
              aria-label="Custom accent color hex value"
              aria-invalid={isInvalid}
              aria-describedby={isInvalid ? 'accent-error' : undefined}
            />
          </div>
          {isInvalid && (
            <span id="accent-error" className="accent-picker__error" role="alert">
              Enter a valid hex color
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 11.1 AccentColorPicker CSS — `client/src/components/settings/AccentColorPicker.css`

```css
/* client/src/components/settings/AccentColorPicker.css */

.accent-picker {
  margin-bottom: 24px; /* --space-6 */
}

.accent-picker__label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--forge-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.accent-picker__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ─── Swatches ────────────────────────────────────────────────────────────── */

.accent-picker__swatches {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.accent-swatch {
  all: unset;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 150ms ease;
  box-sizing: border-box;
}

.accent-swatch:hover {
  border-color: color-mix(in srgb, currentColor 50%, transparent);
}

.accent-swatch--selected {
  box-shadow: inset 0 0 0 2px white;
}

.accent-swatch:focus-visible {
  outline: 2px solid var(--forge-accent);
  outline-offset: 2px;
}

/* ─── Divider ─────────────────────────────────────────────────────────────── */

.accent-picker__divider {
  width: 1px;
  height: 24px;
  background: var(--forge-border);
  margin: 0 8px;
  flex-shrink: 0;
}

/* ─── Custom Input ────────────────────────────────────────────────────────── */

.accent-picker__custom {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Color well — styled native input */
.accent-picker__well-wrapper {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--forge-border);
  cursor: pointer;
  flex-shrink: 0;
}

.accent-picker__well {
  appearance: none;
  -webkit-appearance: none;
  width: 32px;
  height: 32px;
  border: none;
  cursor: pointer;
  margin: -4px;
  padding: 0;
}

.accent-picker__well::-webkit-color-swatch-wrapper {
  padding: 0;
}

.accent-picker__well::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}

.accent-picker__well::-moz-color-swatch {
  border: none;
  border-radius: 50%;
}

/* Hex input wrapper */
.accent-picker__hex-wrapper {
  display: flex;
  align-items: center;
  width: 80px;
  height: 28px;
  border: 1px solid var(--forge-border);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 150ms ease;
}

.accent-picker__hex-wrapper:focus-within {
  border-color: var(--forge-accent);
  box-shadow: 0 0 0 1px var(--forge-accent-subtle);
}

.accent-picker__hex-wrapper--invalid {
  border-color: #DC2626; /* --error-600 */
}

.accent-picker__hex-prefix {
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  color: var(--forge-text-tertiary);
  padding-left: 8px;
  user-select: none;
}

.accent-picker__hex {
  all: unset;
  width: 100%;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  color: var(--forge-text);
  padding: 4px 8px 4px 2px;
}

.accent-picker__error {
  font-size: 11px;
  color: #DC2626;
}

/* ─── Responsive ──────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  .accent-picker__controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .accent-picker__divider {
    width: 100%;
    height: 1px;
    margin: 4px 0;
  }
}
```

---

## 12. DarkModeToggle Component — `client/src/components/settings/DarkModeToggle.tsx`

```tsx
// client/src/components/settings/DarkModeToggle.tsx

import { Sun, Monitor, Moon } from 'lucide-react';
import './DarkModeToggle.css';

type DarkModeSetting = 'light' | 'dark' | 'system';

interface DarkModeToggleProps {
  darkMode: DarkModeSetting;
  onModeChange: (mode: DarkModeSetting) => void;
}

const SEGMENTS: { value: DarkModeSetting; label: string; Icon: typeof Sun; ariaLabel: string }[] = [
  { value: 'light', label: 'Light', Icon: Sun, ariaLabel: 'Light mode' },
  { value: 'system', label: 'System', Icon: Monitor, ariaLabel: 'System preference' },
  { value: 'dark', label: 'Dark', Icon: Moon, ariaLabel: 'Dark mode' },
];

export function DarkModeToggle({ darkMode, onModeChange }: DarkModeToggleProps) {
  return (
    <div className="dark-mode-toggle">
      <label className="dark-mode-toggle__label">Mode</label>

      <div
        className="dark-mode-toggle__control"
        role="radiogroup"
        aria-label="Color mode"
      >
        {SEGMENTS.map((segment) => {
          const isSelected = darkMode === segment.value;
          return (
            <button
              key={segment.value}
              className={`dark-mode-segment ${isSelected ? 'dark-mode-segment--selected' : ''}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={segment.ariaLabel}
              onClick={() => onModeChange(segment.value)}
            >
              <segment.Icon size={14} />
              <span>{segment.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### 12.1 DarkModeToggle CSS — `client/src/components/settings/DarkModeToggle.css`

```css
/* client/src/components/settings/DarkModeToggle.css */

.dark-mode-toggle__label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--forge-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.dark-mode-toggle__control {
  display: flex;
  width: 100%;
  height: 32px;
  border: 1px solid var(--forge-border);
  border-radius: 6px;
  background: var(--forge-bg-secondary);
  overflow: hidden;
}

/* ─── Segment ─────────────────────────────────────────────────────────────── */

.dark-mode-segment {
  all: unset;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--forge-text-secondary);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
  border-radius: 4px;
  margin: 2px;
}

.dark-mode-segment:hover:not(.dark-mode-segment--selected) {
  background: var(--forge-bg-hover);
}

.dark-mode-segment--selected {
  background: var(--forge-bg-elevated);
  color: var(--forge-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dark-mode-segment:focus-visible {
  outline: 2px solid var(--forge-accent);
  outline-offset: -2px;
}
```

---

## 13. Top Bar Dark Mode Quick Toggle

Add a Moon/Sun ghost button to `TopBar.tsx`, between Export and Format buttons.

```tsx
// In TopBar.tsx — add to the right-side actions

import { Sun, Moon } from 'lucide-react';
import { useResolvedMode } from '../../hooks/useResolvedMode';

// Inside the TopBar component:
const resolvedMode = useResolvedMode(roadmap.darkMode);

const handleQuickToggle = () => {
  // Quick toggle: always flips between light and dark (skips system)
  const nextMode = resolvedMode === 'light' ? 'dark' : 'light';
  handleModeChange(nextMode); // reuse the same PATCH handler
};

const tooltipText = resolvedMode === 'light'
  ? 'Switch to dark mode'
  : 'Switch to light mode';

// In the JSX, add between Export and Format buttons:
<button
  className="topbar-icon-btn"
  onClick={handleQuickToggle}
  aria-label={tooltipText}
  title={tooltipText}
>
  {resolvedMode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
</button>
```

**Button styling** — use the existing ghost icon button pattern (`topbar-icon-btn` or equivalent):

```css
/* Should already exist, but for reference: */
.topbar-icon-btn {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--forge-text-secondary);
  cursor: pointer;
  transition: background 150ms ease;
}

.topbar-icon-btn:hover {
  background: var(--forge-bg-hover);
}

.topbar-icon-btn:focus-visible {
  outline: 2px solid var(--forge-accent);
  outline-offset: 2px;
}
```

---

## 14. Socket.IO — Real-Time Theme Sync

The roadmap store should already listen for `roadmap-updated` events. Theme fields flow through automatically if the handler applies all changes from the event payload.

### 14.1 Verify Existing Handler

In the Socket.IO event handler (likely in `roadmapStore.ts` or a `useRoadmapSocket` hook):

```typescript
// This should already exist — verify it handles arbitrary field updates:
socket.on('roadmap-updated', (data: {
  roadmapId: string;
  changes: Partial<Roadmap>;
  changedBy: string;
}) => {
  if (data.roadmapId === currentRoadmap?.id) {
    // Apply all changes from the event — theme fields flow through
    updateRoadmapInStore(data.changes);
  }
});
```

If the handler only applies specific known fields (e.g., `name`), add the theme fields:

```typescript
// Add to the handler:
if (data.changes.themeName !== undefined) updateRoadmapInStore({ themeName: data.changes.themeName });
if (data.changes.accentColor !== undefined) updateRoadmapInStore({ accentColor: data.changes.accentColor });
if (data.changes.darkMode !== undefined) updateRoadmapInStore({ darkMode: data.changes.darkMode });
```

### 14.2 Avoid Echo

When the current user changes a theme setting, the WebSocket broadcast will echo back. The handler should skip updates from the current user to avoid a redundant re-render:

```typescript
socket.on('roadmap-updated', (data) => {
  if (data.changedBy === currentUserId) return; // skip own echo
  // ...apply changes
});
```

---

## 15. Export Compatibility

### 15.1 html-to-image

Since themes are applied as CSS custom properties that resolve to computed values, `html-to-image` captures them automatically. **No changes to the export pipeline needed.**

### 15.2 Verification

After implementing, export a PNG with:
1. A non-default theme (e.g., Bold dark mode)
2. A custom accent color
3. Verify the exported image matches the on-screen appearance

If `html-to-image` for some reason doesn't capture CSS variables (unlikely), the fallback is to call `getThemeStyles()` and inject the resolved values as inline styles on the export target element before capture:

```typescript
// Fallback — only if needed
const exportTarget = document.querySelector('.roadmap-container') as HTMLElement;
const themeStyles = getThemeStyles(themeName, accentColor, resolvedMode);
Object.entries(themeStyles).forEach(([key, value]) => {
  exportTarget.style.setProperty(key, value as string);
});
// Then proceed with html-to-image capture
```

---

## 16. Zustand Store Updates

If the roadmap store (`roadmapStore.ts`) uses Zustand:

```typescript
// In the store definition, the Roadmap type from shared/types.ts already includes
// themeName, accentColor, darkMode after Jonah's backend changes.
// No store schema changes needed — the fields flow through from the API response.

// The updateRoadmap action should already support partial updates:
updateRoadmap: (changes: Partial<Roadmap>) => {
  set((state) => ({
    roadmap: state.roadmap ? { ...state.roadmap, ...changes } : null,
  }));
},
```

---

## 17. Settings Panel Section Styling

The "Appearance" section header follows the existing settings section pattern:

```css
/* Settings section title — shared across all sections */
.settings-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--forge-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px; /* --space-4 */
}

/* Appearance section specific */
.settings-appearance {
  padding-bottom: 24px; /* --space-6 */
  border-bottom: 1px solid var(--forge-border);
  margin-bottom: 24px; /* --space-6 */
}
```

---

## 18. Accessibility Checklist

| Requirement | Implementation |
|-------------|---------------|
| Theme picker: `role="radiogroup"` with `aria-label="Theme"` | On `.theme-picker__grid` container |
| Theme cards: `role="radio"` with `aria-checked` and `aria-label` | Each theme card button |
| Arrow key navigation (roving tabindex) | `handleKeyDown` with ArrowRight/Left/Up/Down |
| Enter/Space to select | In `handleKeyDown` |
| Focus-visible ring | 2px solid `var(--forge-accent)`, offset 2px |
| Preview is decorative | `aria-hidden="true"` on preview divs |
| Theme change announced | `aria-live="polite"` region with "{theme} theme applied" |
| Accent swatches: `role="radiogroup"` | On `.accent-picker__swatches` |
| Each swatch: `role="radio"` with `aria-label` | Color name as label |
| Hex input: `aria-label` and `aria-invalid` | On the text input |
| Color well: `aria-label` | "Choose custom accent color" |
| Mode toggle: `role="radiogroup"` with segments as `role="radio"` | On segmented control |
| Top bar toggle: `aria-label` with state-dependent text | "Switch to light/dark mode" |
| Contrast: all themes meet WCAG AA | Verified in Robert's design spec section 8.4 |
| `prefers-reduced-motion` | Disables 200ms transition |

---

## 19. View-Specific Notes

### 19.1 Table View (AG Grid)

- Override AG Grid CSS variables within `.roadmap-container` scope (section 7)
- Alternating row stripe: use `color-mix()` for subtle bg-secondary on odd rows
- Selected row: `var(--forge-accent-subtle)` background

### 19.2 Timeline View

- Canvas background: `var(--forge-bg)`
- Date axis header: `var(--forge-header-bg)` + `var(--forge-header-text)`
- Grid lines: `var(--forge-border-subtle)` — intentionally low-contrast
- Today line: `var(--forge-accent)`, 2px dashed
- Dependency arrows: `var(--forge-text-tertiary)`
- Milestone diamonds: `var(--forge-accent)` fill
- Item bars: **unchanged** — still from color palette system

### 19.3 Swimlane View

- Board background: `var(--forge-bg)`
- Column headers: `var(--forge-bg-secondary)` bg, `var(--forge-text)` text, weight 600
- Cards: `var(--forge-bg-elevated)`, `var(--forge-card-radius)`, `var(--forge-card-shadow)`, `var(--forge-card-border)`
- Card hover: `border-color` darkened or accent at 30% opacity
- Drag ghost: same card styling at 80% opacity with elevated shadow
- Empty column: `var(--forge-text-tertiary)` message, dashed `var(--forge-border)`
- Card color strip: **unchanged** — from palette system

### 19.4 Settings/Format Panels

- Panel background: `var(--forge-bg-elevated)`
- Panel border-left: `1px solid var(--forge-border)`
- Headings: `var(--forge-text)`
- Labels: `var(--forge-text-secondary)`
- Input borders: `var(--forge-border)`, focus rings: `var(--forge-accent)`

### 19.5 Modals and Popovers

- Background: `var(--forge-bg-elevated)`
- Border: `var(--forge-card-border)`
- Overlay: `rgba(0,0,0,0.5)` light / `rgba(0,0,0,0.7)` dark

---

## 20. Files Created / Modified

### New Files

| File | Description |
|------|-------------|
| `shared/src/themes.ts` | Theme registry — types + all 6 definitions |
| `client/src/lib/colorUtils.ts` | `darken()`, `withAlpha()`, `hexToRgb()` |
| `client/src/lib/themeUtils.ts` | `getThemeStyles()` |
| `client/src/hooks/useResolvedMode.ts` | Resolves 'system' to 'light'/'dark' |
| `client/src/components/settings/ThemePicker.tsx` | Theme card grid picker |
| `client/src/components/settings/ThemePicker.css` | Theme card styles |
| `client/src/components/settings/AccentColorPicker.tsx` | Accent color picker with swatches + hex |
| `client/src/components/settings/AccentColorPicker.css` | Accent picker styles |
| `client/src/components/settings/DarkModeToggle.tsx` | 3-state segmented mode control |
| `client/src/components/settings/DarkModeToggle.css` | Mode toggle styles |

### Modified Files

| File | Changes |
|------|---------|
| `index.html` | Add Google Fonts `<link>` for Inter, DM Sans, Source Serif 4 |
| `client/src/routes/RoadmapPage.tsx` | Add `data-theme`, `data-mode`, `style` on container; import `useResolvedMode` + `getThemeStyles` |
| `client/src/routes/SharedViewPage.tsx` | Same theme application as RoadmapPage |
| `client/src/components/layout/TopBar.tsx` | Add dark mode quick-toggle button (Moon/Sun icon) |
| `client/src/components/roadmap/RoadmapSettings.tsx` | Add Appearance section with ThemePicker, AccentColorPicker, DarkModeToggle |
| `client/src/index.css` (or global stylesheet) | **Restructure:** Replace all hardcoded color values with `var(--forge-*)` references. Add AG Grid overrides. Add theme transition CSS + reduced-motion rule. |
| `client/src/stores/roadmapStore.ts` | Verify theme fields flow through from API; verify Socket.IO handler applies them |

---

## 21. Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| Theme preview cards are pure CSS, not screenshots | Faster rendering, smaller bundle, updates live when accent color changes |
| Optimistic updates for all theme changes | Theme switches feel instant; revert on failure with toast |
| Skip `system` in top bar toggle — only light/dark | Toolbar is a quick flip; full 3-state control is in settings |
| `color-mix()` for AG Grid alternating rows | Avoids hardcoding a separate bg color per theme for odd rows |
| Hex input filters non-hex characters on keystroke | Prevents invalid intermediate states; validation on blur/Enter |
| No debounce on accent color well change | The `<input type="color">` fires on each drag — PATCH fires on change event (release). If the browser fires too often, add a 200ms debounce. |
| Single `aria-live` region for theme announcements | One region per component, not per card — avoids announcement spam |

---

## 22. Testing Checklist

Before marking complete, spot-check these combinations:

- [ ] Default light — should be pixel-identical to current UI (regression baseline)
- [ ] Bold dark — high contrast, dark header, sharp corners
- [ ] Minimal light — no shadows, hairline borders, monochrome accent
- [ ] Startup dark — vibrant teal, DM Sans font, generous radius
- [ ] Corporate light — serif headings, warm off-white, navy accent
- [ ] Clean light — soft shadows, rounded cards
- [ ] Custom accent color on each theme
- [ ] Dark mode toggle from top bar
- [ ] Dark mode toggle from settings
- [ ] System mode resolves correctly
- [ ] Theme change syncs to another tab/user via WebSocket
- [ ] PNG export captures active theme
- [ ] Shared URL renders with correct theme
- [ ] Keyboard navigation through theme picker
- [ ] Screen reader announces theme selection
- [ ] Settings panel responsive at 640px and 400px breakpoints
- [ ] `prefers-reduced-motion` disables transitions
