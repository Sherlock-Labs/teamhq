# Roadmap Tool v2 — Visual Themes & Styling Options

**Author:** Thomas (PM)
**Date:** March 18, 2026
**Status:** Ready for pipeline
**Project ID:** `roadmap-tool`
**Work Item:** RT-37

---

## 1. Context

Forge has shipped v1.0 (core views, real-time collab, sharing, export) and v1.1 (drag-and-drop, dependencies, sub-items, comments, CSV, portfolios, collections, buckets, templates). The product is functionally complete for teams managing roadmaps.

The next step is **visual polish and brand expression**. Users want roadmaps that look like *their* roadmaps — matching brand colors, presentation aesthetics, and personal taste. This is the most requested class of feature after core functionality: "Can I make it look different?"

## 2. Problem Statement

Currently all Forge roadmaps look identical. Users sharing roadmaps externally (stakeholders, investors, clients) want them to feel branded and polished. Users presenting roadmaps in meetings want them to look professional and distinct. There's no way to customize the visual appearance beyond the existing color palette per field.

## 3. Scope

### In Scope (v2 Phase 1)

**Roadmap-level themes:**
- Pre-built visual themes users can apply to any roadmap (e.g., "Clean", "Bold", "Minimal", "Corporate", "Startup")
- Each theme defines: background color/pattern, card style (rounded vs sharp, shadow depth, border style), font family, header styling, accent color scheme
- Theme picker in roadmap settings — preview before applying
- Theme applies to all views (Table, Timeline, Swimlane) consistently

**Custom accent colors:**
- Override the theme's accent color with any custom color
- Affects headers, highlights, selection states, and progress bars
- Works independently of item color palettes (which remain per-field)

**Dark mode:**
- Full dark mode toggle per roadmap
- Themes have dark variants automatically generated
- Respects system preference as default, user can override

**Export-aware:**
- PNG export respects the active theme and dark/light mode
- Shared URLs render with the roadmap's theme

### Out of Scope (deferred)

- Custom CSS injection (security risk, maintenance burden)
- Per-item styling overrides (too granular for v1 of themes)
- Custom font uploads (stick to a curated font list)
- Animated themes or backgrounds
- Logo/watermark placement (could be a later branding feature)

## 4. User Stories

### US-1: Apply a pre-built theme
**As a** roadmap owner, **I want to** choose a visual theme for my roadmap **so that** it matches my presentation context.

**Acceptance criteria:**
- Theme picker accessible from roadmap settings
- At least 5 pre-built themes available
- Selecting a theme applies it immediately (no save button needed)
- Theme persists across sessions
- All three view types render correctly with each theme
- Preview thumbnails show what each theme looks like

### US-2: Customize accent color
**As a** roadmap owner, **I want to** set a custom accent color **so that** my roadmap matches my brand.

**Acceptance criteria:**
- Color picker in roadmap settings, below theme selector
- Changing accent updates headers, selection highlights, and progress indicators
- Does not affect item colors (those are per-field palettes)
- Hex input supported alongside the visual picker

### US-3: Toggle dark mode
**As a** user, **I want to** switch between light and dark mode **so that** my roadmap is comfortable to view in any context.

**Acceptance criteria:**
- Toggle in roadmap settings and in the top-bar quick actions
- Defaults to system preference on first load
- User override persists per roadmap
- All themes have dark variants
- Shared/exported views respect the mode setting

### US-4: Themed exports and shares
**As a** user, **I want** my PNG exports and shared URLs to reflect my theme **so that** the roadmap looks consistent everywhere.

**Acceptance criteria:**
- PNG export uses active theme + dark/light mode
- Shared URL renders with the roadmap's theme settings
- Presentation mode uses the active theme

## 5. Technical Constraints

- Themes should be defined as CSS custom property sets — no hardcoded styles per theme
- Theme definitions stored as a JSON schema on the roadmap model (themeName, accentColor, darkMode)
- Pre-built themes shipped as static config, not user-created (simplifies v1)
- Dark mode must not break existing color palette logic for item fields
- Export rendering must work server-side (same theme applied to the canvas export pipeline)

## 6. Pipeline

This is a UI-heavy feature. Recommended pipeline:

1. **Andrei** — Tech approach (theme architecture, CSS variable system, dark mode strategy, export integration)
2. **Robert** — Design spec (theme definitions, dark mode palette, settings UI, preview thumbnails)
3. **Alice** — Frontend implementation (theme system, settings UI, dark mode, export updates)
4. **Robert** — Design review
5. **Enzo** — QA (all themes × all views × light/dark × export)

Backend is minimal (store 3 fields on the roadmap model). Jonah can handle that as part of the tech approach or Alice can add it during frontend work.

## 7. Success Metrics

- Users can apply a theme in <3 clicks
- All 5 themes render correctly across all 3 view types in both light and dark mode
- Exported PNGs match the in-app appearance
- No visual regressions on existing functionality
