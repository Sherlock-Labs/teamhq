# Roadmap Tool v2 — Visual Themes & Styling Options: Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** March 18, 2026
**Status:** Complete
**Project ID:** `roadmap-tool`
**Work Item:** RT-37a
**Inputs:** `docs/roadmap-tool-v2-themes-requirements.md` (Thomas), `docs/roadmap-tool-tech-approach.md` (original architecture)

---

## 1. Architectural Summary

Themes are a presentation layer feature. The data model is minimal (3 columns), the logic is almost entirely client-side (CSS custom properties), and the backend work is trivial (extend an existing PATCH endpoint). No new npm packages required.

**Core approach:**
- Pre-built themes defined as static JSON configs that map to CSS custom properties
- Applied via a `data-theme` attribute on the roadmap container + `:root`-level CSS variables
- Dark mode handled as a `data-mode="dark"` attribute with each theme defining both light and dark palettes
- Existing item color palettes (`color_palettes` table, `colorByFieldId` in view config) remain completely independent — themes style the chrome, palettes style the data
- Theme settings stored as 3 flat columns on the `roadmaps` table
- Theme changes broadcast via existing Socket.IO room events

**Zero new dependencies.** CSS custom properties, a `<select>` picker, a color input, and a toggle. That's the whole feature.

---

## 2. Data Model Changes

### 2.1 Migration: Add theme columns to `roadmaps`

```sql
ALTER TABLE roadmaps
  ADD COLUMN theme_name   TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN accent_color TEXT,          -- hex string e.g. '#6366F1', NULL = use theme default
  ADD COLUMN dark_mode    TEXT NOT NULL DEFAULT 'system'
    CHECK (dark_mode IN ('light', 'dark', 'system'));
```

**Column details:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `theme_name` | `TEXT` | `'default'` | Key into the static theme registry. One of: `default`, `clean`, `bold`, `minimal`, `corporate`, `startup` |
| `accent_color` | `TEXT` (nullable) | `NULL` | Hex color override (e.g. `'#E11D48'`). When NULL, uses the theme's built-in accent. Validated as 7-char hex on write. |
| `dark_mode` | `TEXT` | `'system'` | One of `'light'`, `'dark'`, `'system'`. System means respect `prefers-color-scheme` media query. |

**Why flat columns, not JSONB:** Three scalar values with validation constraints. JSONB would lose the CHECK constraint on `dark_mode` and make the schema less self-documenting. These are not complex or variable-structure settings.

**Why `dark_mode` is a string enum, not a boolean:** The requirements say "defaults to system preference, user can override." A boolean can't represent three states (light / dark / follow-system). The `system` default means existing roadmaps respect the user's OS setting without any migration noise.

### 2.2 Drizzle Schema Update

```typescript
// In server/src/db/schema.ts — extend the roadmaps table definition

export const roadmaps = pgTable('roadmaps', {
  // ... existing columns ...
  themeName:   text('theme_name').notNull().default('default'),
  accentColor: text('accent_color'),
  darkMode:    text('dark_mode').notNull().default('system'),
});
```

### 2.3 Shared Types Update

```typescript
// In shared/src/types.ts — extend the Roadmap type

export interface RoadmapThemeSettings {
  themeName: string;       // key into THEME_REGISTRY
  accentColor: string | null;  // hex override or null
  darkMode: 'light' | 'dark' | 'system';
}

// Add to existing Roadmap interface:
export interface Roadmap {
  // ... existing fields ...
  themeName: string;
  accentColor: string | null;
  darkMode: 'light' | 'dark' | 'system';
}
```

### 2.4 Validation Schema

```typescript
// In shared/src/validation.ts

export const ThemeSettingsSchema = z.object({
  themeName: z.enum(['default', 'clean', 'bold', 'minimal', 'corporate', 'startup']).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  darkMode: z.enum(['light', 'dark', 'system']).optional(),
});
```

---

## 3. Theme Definition Format

### 3.1 Theme Registry

Themes are a static JSON registry shipped with the client bundle. No database table, no API to fetch them — they're baked into the build like the existing color palette definitions.

Each theme is a map of CSS custom property names to values, for both light and dark modes.

**File location:** `client/src/lib/themes.ts`

```typescript
export interface ThemeDefinition {
  name: string;           // display name for the picker
  key: string;            // matches theme_name column
  description: string;    // one-liner for the picker tooltip
  light: ThemeTokens;     // CSS custom property values for light mode
  dark: ThemeTokens;      // CSS custom property values for dark mode
}

export interface ThemeTokens {
  // Surface colors
  '--forge-bg':             string;  // page background
  '--forge-bg-secondary':   string;  // sidebar, panels
  '--forge-bg-elevated':    string;  // cards, modals, popovers
  '--forge-bg-hover':       string;  // hover state on surfaces

  // Border & divider
  '--forge-border':         string;  // default border
  '--forge-border-subtle':  string;  // lighter borders (grid lines)

  // Text
  '--forge-text':           string;  // primary text
  '--forge-text-secondary': string;  // muted/secondary text
  '--forge-text-tertiary':  string;  // placeholders, hints

  // Accent (overridable via accentColor)
  '--forge-accent':         string;  // primary accent
  '--forge-accent-hover':   string;  // accent hover state
  '--forge-accent-subtle':  string;  // accent at low opacity (selection bg, progress bar bg)

  // Component-specific
  '--forge-header-bg':      string;  // header/toolbar background
  '--forge-header-text':    string;  // header text color
  '--forge-card-radius':    string;  // card border-radius
  '--forge-card-shadow':    string;  // card box-shadow
  '--forge-card-border':    string;  // card border style (e.g., '1px solid var(--forge-border)' or 'none')
  '--forge-font-family':    string;  // body font stack
  '--forge-font-heading':   string;  // heading font (can match body)
}
```

### 3.2 Example: "Clean" Theme

```typescript
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
    '--forge-accent-subtle':  'rgba(99, 102, 241, 0.1)',
    '--forge-header-bg':      '#FFFFFF',
    '--forge-header-text':    '#171717',
    '--forge-card-radius':    '12px',
    '--forge-card-shadow':    '0 1px 3px rgba(0,0,0,0.08)',
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
    '--forge-accent-subtle':  'rgba(129, 140, 248, 0.15)',
    '--forge-header-bg':      '#141414',
    '--forge-header-text':    '#FAFAFA',
    '--forge-card-radius':    '12px',
    '--forge-card-shadow':    '0 1px 3px rgba(0,0,0,0.3)',
    '--forge-card-border':    '1px solid #2E2E2E',
    '--forge-font-family':    "'Inter', system-ui, sans-serif",
    '--forge-font-heading':   "'Inter', system-ui, sans-serif",
  },
};
```

### 3.3 Full Theme Registry

```typescript
export const THEME_REGISTRY: Record<string, ThemeDefinition> = {
  default:   defaultTheme,    // Current look — matches existing styles exactly
  clean:     cleanTheme,      // Soft shadows, rounded, airy
  bold:      boldTheme,       // High contrast, sharp corners, strong borders
  minimal:   minimalTheme,    // No shadows, hairline borders, maximum whitespace
  corporate: corporateTheme,  // Conservative palette, serif headings, subtle grid
  startup:   startupTheme,    // Vibrant accent, modern type, generous radius
};
```

**The `default` theme must exactly reproduce the current visual appearance.** This ensures zero visual change for existing roadmaps after the migration. Alice should extract the current hardcoded styles into CSS variables first, then define the `default` theme as those exact values.

### 3.4 Font Loading

Themes reference fonts from a curated set. All fonts are loaded via Google Fonts in `index.html` (or a `<link>` tag injected at app init). The curated set for v1:

- **Inter** — default, used by most themes
- **DM Sans** — geometric alternative (startup theme)
- **Source Serif 4** — serif option (corporate theme)

Three fonts. That's enough for meaningful variety without bloating page weight. Load all three up front (~60KB total with woff2) — simpler than conditional loading and avoids FOIT when switching themes.

---

## 4. CSS Architecture

### 4.1 Variable Application

Theme variables are set on the roadmap container element, not on `:root`. This is important because the app shell (sidebar, navigation) should stay consistent regardless of theme — themes style the roadmap content area only.

```tsx
// In RoadmapPage.tsx — the top-level roadmap container

<div
  className="roadmap-container"
  data-theme={roadmap.themeName}
  data-mode={resolvedMode}  // 'light' or 'dark' (resolved from 'system')
  style={themeVariables}     // CSS custom properties from THEME_REGISTRY + accent override
>
  {/* TopBar, ViewSwitcher, view content, etc. */}
</div>
```

**How `style` is computed:**

```typescript
function getThemeStyles(
  themeName: string,
  accentColor: string | null,
  mode: 'light' | 'dark'
): React.CSSProperties {
  const theme = THEME_REGISTRY[themeName] ?? THEME_REGISTRY.default;
  const tokens = mode === 'dark' ? theme.dark : theme.light;
  const styles: Record<string, string> = { ...tokens };

  // Override accent colors if custom accent is set
  if (accentColor) {
    styles['--forge-accent'] = accentColor;
    styles['--forge-accent-hover'] = darken(accentColor, 10);
    styles['--forge-accent-subtle'] = withAlpha(accentColor, 0.1);
  }

  return styles as React.CSSProperties;
}
```

The `darken()` and `withAlpha()` are tiny pure functions (~5 lines each) that do hex math. No color library needed.

### 4.2 Resolving `system` Mode

```typescript
function useResolvedMode(darkMode: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  if (darkMode === 'system') return prefersDark ? 'dark' : 'light';
  return darkMode;
}
```

`useMediaQuery` is a standard hook (likely already exists in the codebase or is trivial to write — 10 lines with `matchMedia`).

### 4.3 Coexistence with Item Color Palettes

This is the critical design boundary. There are two independent color systems:

| System | Controls | Stored in | Applied by |
|--------|----------|-----------|------------|
| **Themes** | Chrome: backgrounds, borders, text, headers, card styles | `roadmaps.theme_name`, `roadmaps.accent_color`, `roadmaps.dark_mode` | CSS custom properties on `.roadmap-container` |
| **Color Palettes** | Data: item bar/card fill colors based on field values | `color_palettes` table, view config `paletteId` + `colorByFieldId` | Inline styles on individual item elements |

**They do not overlap.** Theme variables control everything *except* the item fill colors. Item colors continue to come from the palette system and are applied as inline `backgroundColor`/`color` on individual item elements — exactly as they work today.

**Dark mode consideration for item colors:** The existing palette colors (Citrus, Groovy, etc.) were designed for light backgrounds. On dark mode, they'll still be legible because they're applied as fills with white/dark text on top — the text color is already computed from the fill color's luminance. No palette changes needed.

### 4.4 CSS Refactoring Strategy

The existing codebase uses hardcoded color values. Alice needs to replace these with CSS variable references. The approach:

1. **Extract current values into the `default` theme definition** — measure every hardcoded color in the current CSS
2. **Replace hardcoded values with `var(--forge-*)` references** across all component CSS
3. **Verify the `default` theme renders identically to the current UI** — this is the regression safety net

This is a systematic find-and-replace, not a redesign. The existing visual appearance doesn't change; it just becomes parameterized.

**CSS selectors that reference theme variables:**

```css
/* Example: existing hardcoded styles become variable-driven */

/* Before */
.roadmap-header { background: #fff; border-bottom: 1px solid #e5e7eb; }
.item-card { border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

/* After */
.roadmap-header { background: var(--forge-header-bg); border-bottom: 1px solid var(--forge-border); }
.item-card { border-radius: var(--forge-card-radius); box-shadow: var(--forge-card-shadow); }
```

---

## 5. Dark Mode Approach

### 5.1 Decision: Define dark palettes explicitly per theme

**Rejected alternative:** Auto-generating dark variants from light values (invert lightness, adjust saturation). This produces acceptable results for simple cases but breaks on nuanced choices — shadows, subtle borders, and accent tints all need hand-tuning. The auto-generation path would require a color manipulation library and still need manual overrides for edge cases.

**Chosen approach:** Each theme explicitly defines both `light` and `dark` token sets. This is more upfront work for Robert (defining 6 themes x 2 modes = 12 palettes) but produces predictable, high-quality results. Since we have exactly 6 themes at launch, the work is finite and bounded.

### 5.2 Dark Mode Toggle Placement

Per the requirements: toggle in roadmap settings AND in the top-bar quick actions. The toggle writes to the same `darkMode` field on the roadmap. Both controls read from and write to the Zustand `roadmapStore`.

### 5.3 Shared View Dark Mode

Shared URLs (`/shared/:token`) render with the roadmap's stored `darkMode` setting. If `darkMode` is `system`, the shared view also follows the *viewer's* system preference — because the CSS media query fires client-side regardless.

---

## 6. API Changes

### 6.1 Extend Existing PATCH Endpoint

No new endpoint needed. Extend the existing `PATCH /api/v1/roadmaps/:id` to accept theme fields:

```typescript
// Request body (all fields optional, as with any PATCH)
{
  name?: string;          // existing
  themeName?: string;     // NEW
  accentColor?: string | null;  // NEW (null to clear override)
  darkMode?: 'light' | 'dark' | 'system';  // NEW
}
```

**Validation (server-side):**
- `themeName` must be one of the keys in a server-side copy of `THEME_REGISTRY` keys (just a string array, not the full definitions — themes are a client concern)
- `accentColor` must match `/^#[0-9A-Fa-f]{6}$/` or be `null`
- `darkMode` must be one of `'light' | 'dark' | 'system'`

**Why extend, not a new endpoint:** Theme settings are properties of a roadmap, just like its name. The existing PATCH endpoint already handles partial updates to roadmap fields. Adding three more optional fields is the natural fit. A separate `PATCH /api/v1/roadmaps/:id/theme` would create a second mutation path for the same entity with no benefit.

### 6.2 Response Shape

The existing `GET /api/v1/roadmaps/:id` response already returns all roadmap columns. The three new columns will appear automatically in the response after the schema + Drizzle model update. No response shape changes needed.

### 6.3 Shared View Endpoint

`GET /api/v1/shared/:token` already returns the roadmap data. The three new columns will flow through to the shared view renderer automatically.

---

## 7. Export Compatibility

### 7.1 How html-to-image Picks Up Themes

The existing PNG export uses `html-to-image` (likely `toPng` or `toCanvas`) to capture the rendered DOM. Since themes are applied via CSS custom properties on the `.roadmap-container` element and its children, **html-to-image captures them automatically** — it renders the computed styles, which include resolved CSS variable values.

**No changes to the export pipeline.** The export already captures "what you see." If the roadmap is in dark mode with the Bold theme, the export will be dark with bold styling. This is the payoff of using CSS custom properties instead of a JS-based theming system.

### 7.2 Server-Side Export (if applicable)

If the export pipeline has a server-side component (e.g., Puppeteer for higher-fidelity captures), the theme variables need to be injected into the server-rendered HTML. This means:

1. The export endpoint receives `themeName`, `accentColor`, and `darkMode` from the roadmap record (already available server-side)
2. The server renders the roadmap HTML with the theme's CSS variables injected as inline styles on the container — same logic as the client-side `getThemeStyles()` function
3. Puppeteer/Playwright captures the rendered page

Since the theme registry is a static JSON file, it can be imported in both `client/` and `server/` packages (or placed in `shared/`).

**Recommendation:** Put the theme definitions in `shared/src/themes.ts` so both client and server can import them.

---

## 8. Real-Time Sync

### 8.1 WebSocket Event for Theme Changes

When a user changes any theme setting, the existing broadcast pattern applies:

1. Client calls `PATCH /api/v1/roadmaps/:id` with the new theme values
2. Server updates the database
3. Server broadcasts to the Socket.IO room `roadmap:${roadmapId}`

**New event:**

```typescript
// Server -> Client
socket.emit('roadmap-updated', {
  roadmapId: string,
  changes: {
    themeName?: string,
    accentColor?: string | null,
    darkMode?: 'light' | 'dark' | 'system',
  },
  changedBy: string,  // userId
});
```

This likely already exists — the `roadmap-updated` event should fire for any `PATCH /api/v1/roadmaps/:id` mutation. If it doesn't, adding the broadcast is one line in the roadmap route handler after the DB update.

**Client-side handling:** The Zustand `roadmapStore` picks up the change and re-renders. Since theme application is purely reactive (theme variables computed from store state), the UI updates instantly for all connected users.

---

## 9. File Classification

### New Files

| File | Type | Description |
|------|------|-------------|
| `shared/src/themes.ts` | **New** | Theme registry and types (`ThemeDefinition`, `ThemeTokens`, `THEME_REGISTRY`). Importable by both client and server. |
| `client/src/components/settings/ThemePicker.tsx` | **New** | Theme selection UI — grid of theme preview cards with the current theme highlighted. |
| `client/src/components/settings/AccentColorPicker.tsx` | **New** | Hex color input + visual picker for accent override. |
| `client/src/components/settings/DarkModeToggle.tsx` | **New** | Three-state toggle (Light / Dark / System) for both settings panel and top-bar. |
| `client/src/hooks/useResolvedMode.ts` | **New** | Hook that resolves `'system'` to `'light'` or `'dark'` via `matchMedia`. |
| `client/src/lib/colorUtils.ts` | **New** | `darken()` and `withAlpha()` — two pure functions (~10 lines total) for accent color derivation. |
| `server/src/db/migrations/XXXX_add_theme_columns.ts` | **New** | Drizzle migration adding 3 columns to `roadmaps`. |

### Extended Files (existing code paths untouched, new code added)

| File | Type | Description |
|------|------|-------------|
| `server/src/db/schema.ts` | **Extend** | Add 3 columns to `roadmaps` table definition. |
| `server/src/routes/roadmaps.ts` | **Extend** | Accept `themeName`, `accentColor`, `darkMode` in PATCH validation. (~5 lines) |
| `shared/src/types.ts` | **Extend** | Add theme fields to `Roadmap` interface. |
| `shared/src/validation.ts` | **Extend** | Add `ThemeSettingsSchema` and merge into existing roadmap update schema. |
| `client/src/stores/roadmapStore.ts` | **Extend** | Store theme fields from API response. (Already stores full roadmap — fields flow through.) |
| `client/src/routes/RoadmapPage.tsx` | **Extend** | Add `data-theme`, `data-mode`, and `style` attributes to `.roadmap-container`. Wire up `useResolvedMode`. |
| `client/src/routes/SharedViewPage.tsx` | **Extend** | Same theme application as RoadmapPage — apply theme to the shared view container. |
| `client/src/components/export/PngExporter.tsx` | **Extend** | No logic changes needed if export captures the DOM (theme is already in computed styles). If export builds a separate DOM tree, pass theme variables through. |

### Modified Files (existing code paths changed)

| File | Type | Description |
|------|------|-------------|
| `client/src/components/layout/TopBar.tsx` | **Modify** | Add dark mode quick-toggle button to the toolbar. |
| `client/src/components/roadmap/RoadmapSettings.tsx` | **Modify** | Add Theme section (ThemePicker + AccentColorPicker + DarkModeToggle) to the existing settings panel. |

### Restructured Files

| File | Type | QA Impact |
|------|------|-----------|
| `client/src/index.css` (or equivalent global stylesheet) | **Restructure** | **All hardcoded color values replaced with CSS custom property references.** This touches every visual element: backgrounds, borders, text colors, shadows, hover states. Regression test all three view types (Table, Timeline, Swimlane), the settings panel, item cards, modals, popovers, the format panel, and export output. Verify the `default` theme is pixel-identical to the current appearance. |

---

## 10. Implementation Notes for Developers

### For Jonah (Backend)

Minimal work — this is almost entirely a frontend feature:

1. Write the Drizzle migration (3 columns)
2. Update the Drizzle schema definition
3. Add validation for the 3 new fields in the PATCH roadmap route
4. Verify the `roadmap-updated` WebSocket broadcast includes the new fields (it should if the broadcast sends the full updated roadmap)

**Estimated scope:** ~30 minutes of backend work.

### For Alice (Frontend)

This is Alice's feature. The bulk of the work:

1. **CSS refactor first.** Before adding any theme logic, extract all hardcoded colors into CSS variables and verify the `default` theme reproduces the current look. This is the highest-risk step — it touches the most files. Get this right before building the theme picker.
2. **Theme application logic.** `getThemeStyles()`, `useResolvedMode()`, wire up the container.
3. **Settings UI.** ThemePicker, AccentColorPicker, DarkModeToggle.
4. **Verify all views.** Table, Timeline, Swimlane x 6 themes x light/dark = 36 combinations. Spot-check, don't exhaustively screenshot each one.
5. **Verify export.** PNG export should work without changes if html-to-image captures computed styles.

### For Robert (Design)

Robert defines the 6 theme palettes (both light and dark variants). Deliverable: a `themes.ts` file with all 6 `ThemeDefinition` objects, or a design spec that Alice translates into code. The token names in section 3.1 are the contract.

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CSS refactor introduces visual regressions | Medium | High | Extract `default` theme first and verify pixel-match before adding other themes. Use the `default` theme as the regression baseline. |
| Item palette colors look bad on dark mode backgrounds | Low | Medium | Existing palette colors are fills with computed text contrast — they work on any background. If specific palettes clash, Robert can define dark-mode palette adjustments in a future iteration. |
| html-to-image doesn't capture CSS variables | Very Low | Medium | CSS variables are resolved to computed values before capture. If somehow they're not, inject inline styles on the export target element before capture. |
| Theme picker feels slow (re-rendering all view content) | Low | Low | CSS variable changes trigger a repaint, not a re-render. React components don't re-render when CSS variables change — only when props/state change. The store update triggers one re-render to apply the new `style` prop on the container; children just repaint. |

---

## 12. What This Approach Does NOT Cover

- **Theme creation UI** — users cannot create custom themes in v1. Only the 6 pre-built themes.
- **Per-view theme overrides** — all views on a roadmap share the same theme.
- **App shell theming** — sidebar and navigation remain unchanged regardless of roadmap theme.
- **Animated transitions** between themes — instant swap is fine for v1.
- **Custom font uploads** — curated font list only.

All of these are reasonable v2/v3 additions that this architecture supports without restructuring.
