# TeamHQ Full Visual Redesign — Requirements

**Author:** Thomas (PM)
**Date:** 2025-02-07
**Status:** Approved

---

## 1. Executive Summary

Full visual redesign of TeamHQ to match the design aesthetic of **suga.app** and **tavus.io** — premium, light-first, minimal SaaS design language. This touches every page, every CSS file, and every visual component across the product.

---

## 2. Background & Motivation

The CEO wants TeamHQ to look and feel like a premium SaaS product. The current dark-first, zinc-950 design is functional but doesn't convey the polish and sophistication of best-in-class products. The target aesthetic (suga.app, tavus.io) represents a specific design language: generous whitespace, thin borders, layered shadows, atmospheric effects, and modern typography.

---

## 3. Scope

### 3.1 What's In Scope

**Pages (5 total):**
| Page | File | CSS Dependencies |
|------|------|-----------------|
| Landing page (main) | `index.html` | `tokens.css`, `shared.css`, `styles.css` |
| Docs viewer | `docs.html` | `tokens.css`, `shared.css`, `docs.css` |
| PDF Splitter | `pdf-splitter/index.html` | Inline `<style>` (self-contained) |
| PDF Combiner | `pdf-combiner/index.html` | Inline `<style>` (self-contained) |
| OST Tool | `ost-tool/client/` | Tailwind CSS (React/Vite) |

**CSS files (4 shared):**
- `css/tokens.css` — design tokens (colors, typography, spacing, shadows, radii)
- `css/shared.css` — nav, footer, container, global focus styles
- `css/styles.css` — landing page sections (~2000 lines: hero, tools, projects, meetings, roster, how-it-works, modals, toasts, session log, progress notes)
- `css/docs.css` — docs page (list view, reading view, markdown rendering)

**JS files (4, behavior unchanged):**
- `js/projects.js` — project CRUD, expand/collapse, kickoff modal
- `js/meetings.js` — meeting cards, run buttons
- `js/docs.js` — doc list, reading view, markdown rendering
- `js/tasks.js` — task item expand/collapse

**Assets:**
- `img/sherlock-labs-logo.svg` — may need a light-mode variant or color adjustment
- `img/avatars/*.svg` — 14 pixel art avatars (keep as-is, they work on any background)

**OST Tool (React/Tailwind):**
- `ost-tool/client/src/App.tsx` — layout shell, nav, footer (hardcoded dark Tailwind classes)
- `ost-tool/client/src/components/*.tsx` — 6 components with Tailwind dark-theme classes
- `ost-tool/client/src/index.css` — Tailwind imports + theme override

### 3.2 What's Out of Scope

- **Mobile app** (`mobile/`) — React Native, separate design system, not affected
- **Server-side code** (`server/`) — no visual changes needed
- **Agent definitions** (`.claude/agents/`) — not visual
- **Data files** (`data/`) — not visual
- **Functionality/behavior changes** — zero. This is a visual-only redesign. No new features, no removed features, no behavior changes.

### 3.3 What's Deferred

- **Dark mode toggle** — nice-to-have for v2. Phase 1 is light-only. We can add a toggle later without reworking the token architecture (CSS custom properties make this straightforward).
- **Animations beyond hover states** — page transitions, scroll animations, etc. can come later.
- **Font self-hosting** — continue using Google Fonts for now. Can self-host Geist later if needed.

---

## 4. Target Design Language

Based on analysis of suga.app and tavus.io, these are the defining characteristics:

### 4.1 Color System
- **Background:** Light (white or near-white `#fafafa` / `#f8f8f8`), not dark
- **Cards:** White (`#ffffff`) on a slightly off-white background
- **Text:** Dark for headings (`#111` or `#1a1a2e`), medium gray for body (`#555` or `#64748b`), light gray for tertiary (`#999`)
- **Accent:** Vibrant pink/rose **#FB6182** (CEO decision). Bold, warm, reads well on white. Similar to tavus.io's approach.
- **Borders:** Thin rings (`ring-1 ring-black/5` or `border: 1px solid rgba(0,0,0,0.05)`) instead of heavy dark borders
- **Status colors:** Green, yellow, red remain — just ensure they read well on light backgrounds

### 4.2 Typography
- **Font family:** Geist Sans + Geist Mono (suga.app and tavus.io both use Geist family)
- **Headings:** Bold, tight leading, dark color
- **Body text:** Regular weight, relaxed leading, medium gray
- **Labels/eyebrows:** Monospace (Geist Mono), uppercase, small, tracking-wide — used for badges, category labels, technical metadata
- **Sizes:** Keep the current scale (xs through 5xl) — the values are fine, the application changes

### 4.3 Surfaces & Depth
- **Cards:** White background, thin ring border (`rgba(0,0,0,0.05)`), rounded corners (12-16px), layered shadow on hover (translate-y + shadow elevation)
- **Shadows:** Subtle, layered — `shadow-sm` at rest, `shadow-lg` on hover. Think "card lifts off the page" on hover.
- **No heavy borders** — use `ring-1` or `box-shadow: 0 0 0 1px rgba(0,0,0,0.05)` instead of `border: 1px solid #27272a`
- **Atmospheric touches:** Subtle gradient blurs in hero area, soft radial gradients behind key sections

### 4.4 Motion & Interaction
- **Hover states:** Cards translate-y by -2px to -4px and gain shadow elevation. Smooth transition (0.2-0.3s).
- **Links/buttons:** Color transition on hover, no underline by default (underline on hover for text links)
- **Scale on hover:** Subtle (1.01-1.02) for cards, more pronounced for CTAs if appropriate
- **Transition timing:** `ease` or `ease-out`, 200-300ms for most, 150ms for color-only

### 4.5 Spacing & Layout
- **Generous whitespace** — increase section padding. Current `space-12` (3rem) sections should become `space-16` to `space-20` (4-5rem).
- **Max-width:** Keep 1120px container. This is fine for the premium feel.
- **Card grid gaps:** Increase slightly — current `space-6` (1.5rem) to `space-8` (2rem)
- **Bento-style layout** — the current grid layout works, but cards need more breathing room

---

## 5. Component-by-Component Changes

### 5.1 Design Tokens (`tokens.css`)

This is the highest-leverage change. Update the semantic tokens and the raw color palette.

| Token | Current | New |
|-------|---------|-----|
| `--color-bg-primary` | `zinc-950` (#09090b) | White or near-white (#ffffff / #fafafa) |
| `--color-bg-secondary` | `zinc-950` | Slightly off-white (#f5f5f7) |
| `--color-bg-card` | `zinc-900` (#18181b) | White (#ffffff) |
| `--color-text-primary` | `zinc-300` (#d4d4d8) | Dark (#1a1a2e or #111827) |
| `--color-text-secondary` | `zinc-400` (#a1a1aa) | Medium gray (#64748b) |
| `--color-text-tertiary` | `zinc-600` (#52525b) | Light gray (#94a3b8) |
| `--color-accent` | `indigo-500` (#6366f1) | Vibrant pink/rose (#FB6182) |
| `--color-border` | `zinc-800` (#27272a) | Thin ring (rgba(0,0,0,0.06)) |
| `--font-family` | Inter | Geist Sans (with Inter fallback) |
| `--font-mono` | system monospace | Geist Mono (with system fallback) |
| Shadows | Minimal dark shadows | Layered light shadows for depth |

**Agent identity colors** stay the same — they're vivid accent colors that work on both light and dark backgrounds.

### 5.2 Navigation (`shared.css` — `.nav`)
- Background: white/near-white (not zinc-950)
- Border-bottom: thin ring (`rgba(0,0,0,0.06)`) instead of `zinc-800`
- Logo: verify SVG reads well on light background; may need a dark variant
- Link colors: medium gray default, dark on hover/active
- Sticky behavior: add subtle backdrop-blur for the premium glass effect (`backdrop-filter: blur(12px); background: rgba(255,255,255,0.8)`)

### 5.3 Footer (`shared.css` — `.footer`)
- Background: slightly darker than page bg (e.g., `#f0f0f2`)
- Border-top: thin ring
- Text: medium gray
- Logo: same light-mode treatment as nav

### 5.4 Hero Section (`styles.css` — `.hero`)
- Background: light with optional atmospheric gradient blur (soft radial gradient behind headline)
- Badge: accent color with light accent background
- Headline: dark, bold, tight leading
- Subhead: medium gray, relaxed leading

### 5.5 Tools Section — Tool Cards
- White card on off-white background
- Thin ring border + subtle shadow at rest
- Hover: translate-y(-2px) + shadow elevation
- Badge: styled as pill, accent-tinted
- Launch link: accent color with arrow animation (keep current)

### 5.6 Projects Section — Project Cards
- Same card treatment as tools (white, ring, shadow, hover elevation)
- Status badges: keep color-coding, adjust background tints for light theme
- Modal: white background, ring border, shadow (currently dark zinc-900)
- Form inputs: white background, thin border, focus ring in accent color

### 5.7 Meetings Section
- Card treatment consistent with projects
- Run buttons: accent-colored primary, outlined secondary

### 5.8 Team Roster — Agent Cards
- White cards with ring border
- Avatar circle: keep pixel art, ensure background circle color works on white (currently `accent-light`)
- Name: dark, bold
- Role: accent color (monospace label style per target aesthetic)
- Description: medium gray body text

### 5.9 How It Works — Steps
- Step numbers: accent-colored circles (keep, works on both themes)
- Connecting line: light gray instead of zinc-800
- Text: dark titles, medium gray descriptions

### 5.10 Docs Page (`docs.css`)
- Page background: light
- Doc group cards: white with ring + shadow
- Doc item rows: subtle hover background
- Badges: keep color-coding, adjust for light background legibility
- Reading view: light background, dark text, code blocks with light gray bg
- Markdown rendering: all color values need light-mode treatment

### 5.11 PDF Tools (Splitter & Combiner)
- Both have inline `<style>` blocks that duplicate the dark theme tokens
- Update inline tokens to match the new light theme
- Same card/button/input treatment as main site
- **Note:** These are self-contained files — changes here are isolated

### 5.12 OST Tool (React/Tailwind)
- Currently uses hardcoded Tailwind dark classes (`bg-zinc-950`, `border-zinc-800`, `text-zinc-300`, etc.)
- Need to update all component classes to light-mode equivalents
- Nav and footer in `App.tsx` need same treatment as main site
- `index.css` Tailwind theme may need Geist font override

### 5.13 Modals
- Background: white (currently zinc-900)
- Overlay: keep dark overlay (`rgba(0,0,0,0.5)`)
- Border: thin ring (not zinc-700)
- Inputs: white bg, thin border, accent focus ring
- Buttons: accent primary, outlined secondary, red destructive

### 5.14 Toast Notifications
- Light background with ring and shadow
- Error toast: red-tinted border
- Text: dark on light

### 5.15 Session Log
- Light background for the log container
- Monospace text: dark on light
- Streaming cursor: accent color
- Scrollbar: light gray thumb

---

## 6. Technical Constraints

- **Zero behavior changes.** Every click, expand/collapse, modal, form submission, and API call must work exactly as before.
- **No HTML structure changes** unless absolutely necessary for a visual effect (e.g., adding a wrapper div for a gradient blur). Minimize these.
- **CSS custom properties are the primary mechanism.** Changing tokens.css semantic values should cascade through most of the site. The main work is (a) updating tokens, (b) fixing hardcoded color values that bypass tokens, and (c) updating the OST tool's Tailwind classes.
- **Browser support:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge). `backdrop-filter` has good support now.
- **Performance:** No heavy JS animations. CSS transitions only. Shadows should be hardware-accelerated (`will-change: transform` on hover targets if needed).
- **Accessibility:** Maintain all existing ARIA attributes, focus states, and keyboard navigation. Ensure contrast ratios meet WCAG 2.1 AA on the new light background (4.5:1 for body text, 3:1 for large text).
- **Logo:** The Sherlock Labs SVG logo currently uses colors that work on dark backgrounds. Robert should check if it needs a variant or if it's already dual-mode.

---

## 7. Risk Areas

1. **Hardcoded color values.** The CSS uses tokens for most things, but there are scattered hardcoded hex values (e.g., `#f87171` for errors, `#facc15` for warnings, `rgba(255,255,255,0.02)` for hover states). Each must be audited and updated for light mode.

2. **PDF tools' inline styles.** These duplicate the token system inline rather than importing shared CSS. They need manual updating and must be kept in sync.

3. **OST tool Tailwind classes.** Every `bg-zinc-950`, `text-zinc-300`, `border-zinc-800` in the React components needs to be updated. This is a search-and-replace but must be done carefully component by component.

4. **SVG logo legibility.** The Sherlock Labs logo and pixel art avatars need to be verified on light backgrounds.

5. **Status badge contrast.** Green, yellow, and red badges that currently use `rgba(color, 0.1)` backgrounds on dark may need different opacity/tint on light.

6. **Code blocks in docs reader.** Currently light text on dark bg (`zinc-800` bg). Need to invert — dark text on light gray bg — while maintaining readability.

7. **Modal overlay.** Currently `rgba(0,0,0,0.6)`. This might be fine on light, but worth testing for visual balance.

---

## 8. Phasing Strategy

This is a large visual change. I recommend **two phases** to reduce risk and ship incrementally:

### Phase 1: Core Design System + Landing Page (Ship First)
**Scope:** `tokens.css`, `shared.css`, `styles.css`, `index.html`, logo verification
**Who:** Andrei (tech approach), Robert (design spec), Alice (implementation), Robert (design review), Enzo (QA)
**Outcome:** The main landing page — hero, tools, projects, meetings, roster, how-it-works, modals, toasts — is fully redesigned. The shared nav and footer are updated, which automatically flows to docs.html as well.

### Phase 2: Docs, PDF Tools, OST Tool
**Scope:** `docs.css`, `pdf-splitter/index.html`, `pdf-combiner/index.html`, `ost-tool/client/`
**Who:** Alice (implementation — docs + PDF tools), Alice or dedicated dev (OST Tailwind migration), Robert (design review), Enzo (QA)
**Outcome:** All remaining pages match the new design language.

**Rationale:** Phase 1 covers ~80% of the user-visible surface area. The shared nav/footer propagate to docs automatically. Phase 2 handles the long tail (docs content styling, self-contained PDF tools, React/Tailwind OST tool).

---

## 9. CEO Decisions (Resolved)

1. **Accent color:** Vibrant pink/rose — **#FB6182** range (tavus.io-inspired). Replaces indigo across all accent tokens.
2. **Dark mode toggle:** Deferred to v2. Phase 1 is light-only. Confirmed.
3. **Font:** Geist Sans + Geist Mono. Confirmed.

---

## 10. Acceptance Criteria

### Global
- [ ] All pages render with a light-first design (white/near-white backgrounds)
- [ ] Typography uses Geist Sans for body and Geist Mono for technical labels
- [ ] Cards use thin ring borders + layered shadows, with hover elevation effect
- [ ] Navigation has backdrop-blur glass effect
- [ ] All existing functionality works identically (zero behavior regression)
- [ ] All interactive states (hover, focus, active) are polished and consistent
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 body, 3:1 large text)

### Landing Page (Phase 1)
- [ ] Hero section: light background, atmospheric gradient, dark headline
- [ ] Tool cards: white cards with shadow, hover elevation
- [ ] Project cards: same treatment, modals updated to light theme
- [ ] Meeting section: consistent card styling
- [ ] Team roster: white agent cards, avatar circles work on light bg
- [ ] How-it-works: steps with accent circles, light connecting line
- [ ] Modals: white background, thin ring, accent buttons
- [ ] Toasts: light background with shadow
- [ ] Session log: light theme with readable monospace

### Docs Page (Phase 2)
- [ ] Doc groups: white cards with ring + shadow
- [ ] Reading view: light background, dark text, light code blocks
- [ ] All badge colors readable on light background

### PDF Tools (Phase 2)
- [ ] Both tools match new design language
- [ ] Inline styles updated consistently

### OST Tool (Phase 2)
- [ ] All Tailwind classes updated to light theme
- [ ] Nav and footer match main site
- [ ] All 6 components visually consistent with new design

---

## 11. Team & Pipeline

### Phase 1
1. **Andrei** — tech approach (token architecture, font loading strategy, any structural changes needed)
2. **Robert** — design spec (exact colors, spacing, shadow values, component mockups/specs)
3. **Alice** — implementation
4. **Robert** — design review (lightweight visual check)
5. **Enzo** — QA (visual regression, contrast audit, functionality verification)

### Phase 2
1. **Robert** — design spec addendum for docs/tools-specific components (if needed)
2. **Alice** — implementation (docs, PDF tools, OST tool)
3. **Robert** — design review
4. **Enzo** — QA

---

## 12. Files Inventory (Complete)

### CSS (shared, imported by multiple pages)
- `css/tokens.css` — 164 lines
- `css/shared.css` — 184 lines
- `css/styles.css` — ~2000+ lines
- `css/docs.css` — 570 lines

### HTML pages
- `index.html` — 416 lines
- `docs.html` — 70 lines

### Self-contained tools (inline CSS)
- `pdf-splitter/index.html` — self-contained, inline `<style>`
- `pdf-combiner/index.html` — self-contained, inline `<style>`

### OST Tool (React/Tailwind)
- `ost-tool/client/src/App.tsx`
- `ost-tool/client/src/index.css`
- `ost-tool/client/src/components/GoalInput.tsx`
- `ost-tool/client/src/components/StepIndicator.tsx`
- `ost-tool/client/src/components/DebateSetup.tsx`
- `ost-tool/client/src/components/TreeView.tsx`
- `ost-tool/client/src/components/DebateView.tsx`
- `ost-tool/client/src/components/RecommendationView.tsx`

### JS (behavior unchanged, but may reference style classes)
- `js/projects.js`
- `js/meetings.js`
- `js/docs.js`
- `js/tasks.js`

### Assets to verify on light background
- `img/sherlock-labs-logo.svg`
- `img/avatars/*.svg` (14 files)
