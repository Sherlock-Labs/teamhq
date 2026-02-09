# SherlockPDF Design Spec

**Author:** Robert (Product Designer)
**Date:** February 8, 2026
**Status:** Complete
**Inputs:** Thomas's requirements (`monetization-strategy-requirements.md`), Andrei's tech approach (`sherlockpdf-tech-approach.md`), existing PDF tools (`pdf-splitter/`, `pdf-combiner/`), TeamHQ design system (`css/tokens.css`, `css/shared.css`)

---

## Design Philosophy

SherlockPDF must feel like a product people already pay $12/month for elsewhere --- but better. The dark mode + rose accent system we built for TeamHQ gives us a visual identity that immediately separates us from the clinical whites and primary blues of Smallpdf, iLovePDF, and Adobe. Our tools look like they belong in a dev's toolkit, not in an office supply drawer.

**Three design principles for SherlockPDF:**

1. **Speed over ceremony.** Users come to process PDFs, not to admire UI. Every screen should let them start working within 2 seconds. No splash screens, no onboarding wizards, no feature tours.
2. **The paywall is a feature, not a wall.** When a free user hits a limit, the upgrade prompt should feel like a helpful suggestion, not a slap. Show what they get, make it easy, get out of the way.
3. **Pro should feel premium.** The difference between free and Pro should be visible and visceral. Pro users should feel like they got their money's worth every time they open the app.

---

## 1. Visual Identity

### Color System

SherlockPDF uses the TeamHQ design token system (`tokens.css`) with one important distinction: the existing tools use the old indigo accent + zinc neutrals on a near-black background. SherlockPDF adopts the redesigned system --- charcoal surfaces, rose accent, Geist typography.

**Key tokens (from `tokens.css`):**

| Role | Token | Value |
|------|-------|-------|
| Page background | `--color-bg-primary` | `#0c0c0e` |
| Card/surface background | `--color-bg-card` | `#18181b` |
| Elevated surface | `--color-bg-secondary` | `#111113` |
| Frosted nav | `--color-bg-frosted` | `rgba(12, 12, 14, 0.80)` |
| Primary text | `--color-text-primary` | `#ebebeb` |
| Secondary text | `--color-text-secondary` | `#9a9a9a` |
| Tertiary text | `--color-text-tertiary` | `#606068` |
| Accent | `--color-accent` / `--color-rose-500` | `#FB6182` |
| Accent hover | `--color-accent-hover` / `--color-rose-400` | `#fb7e95` |
| Accent active | `--color-accent-active` / `--color-rose-600` | `#e8496a` |
| Accent bg tint | `--color-accent-bg` | `rgba(251,97,130, 0.08)` |
| Border | `--color-border` | `rgba(255,255,255, 0.06)` |
| Border strong | `--color-border-strong` | `rgba(255,255,255, 0.10)` |
| Success | `--color-emerald-500` | `#10b981` |
| Error | `--color-red-400` | `#f87171` |

### Typography

| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Product name / hero | `--font-heading` (Atkinson Hyperlegible Mono) | `--text-3xl` (30px) / `--text-4xl` (36px) desktop | 700 | -0.02em |
| Section headers | `--font-family` (Geist) | `--text-xl` (20px) | 600 | 0 |
| Body / descriptions | `--font-family` (Geist) | `--text-sm` (14px) | 400 | 0 |
| Labels / badges / eyebrows | `--font-mono` (Geist Mono) | `--text-xs` (12px) | 600 | 0.1em |
| Buttons | `--font-family` (Geist) | `--text-sm` (14px) | 600 | 0 |
| Tool names (selector) | `--font-family` (Geist) | `--text-lg` (18px) | 600 | 0 |
| File counter | `--font-mono` (Geist Mono) | `--text-xs` (12px) | 500 | 0 |

### Noise Texture

Same SVG noise overlay as TeamHQ landing page. Applied to the page body via an absolutely positioned SVG with `feTurbulence`. Creates the subtle grain texture that gives surfaces depth.

```html
<svg class="noise-overlay" aria-hidden="true">
  <filter id="noise-filter">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
  </filter>
  <rect width="100%" height="100%" filter="url(#noise-filter)" />
</svg>
```

```css
.noise-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
}
```

---

## 2. Page Layout

### Overall Structure

Single-page app with show/hide sections. No routing. The page contains:

1. **Navigation bar** (sticky top)
2. **Hero section** (product intro + tool selector)
3. **Active tool panel** (only one visible at a time)
4. **Footer**

### Container

```css
.container {
  max-width: 800px;     /* Slightly narrower than TeamHQ's 1120px --- tools need focus, not width */
  margin: 0 auto;
  padding-left: var(--space-5);    /* 20px */
  padding-right: var(--space-5);
}

@media (min-width: 640px) {
  .container {
    padding-left: var(--space-8);  /* 32px */
    padding-right: var(--space-8);
  }
}
```

**Design decision: 800px max-width.** PDF tools are vertically oriented workflows (upload -> process -> download). A wide container wastes horizontal space and makes drag targets feel sparse. 800px keeps everything tight and focused. The existing tools use 720px; we go slightly wider to accommodate the tool selector and Pro badge in the nav.

---

## 3. Navigation Bar

### Structure

```
[SherlockPDF Logo]                      [Pro Badge / Sign In] [Manage]
```

### Specifications

```css
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-bg-frosted);                      /* rgba(12,12,14,0.80) */
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(var(--color-white-rgb), 0.08);
  padding: var(--space-4) 0;                                /* 16px top/bottom */
}
```

### Left Side: Logo

Use the Sherlock Labs logo SVG at 36px height (28px mobile). Append "PDF" as a text label next to it.

```css
.nav__product-label {
  font-family: var(--font-mono);
  font-size: var(--text-sm);             /* 14px */
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);    /* #9a9a9a */
  margin-left: var(--space-2);           /* 8px */
  letter-spacing: 0.04em;
}
```

This matches the existing `.nav__label` pattern from `shared.css`.

### Right Side: Account State

**Free user (default):**
Nothing visible. Clean nav. The upgrade CTA appears contextually in the tool panels, not in the nav. We don't want to nag --- we want them to use the tools and hit a natural friction point.

**Pro user (after email verification):**

```
[Pro] badge + [Manage] link
```

```css
.nav__pro-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);            /* 12px */
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-rose-500);          /* #FB6182 */
  background: rgba(var(--color-rose-500-rgb), 0.08);
  border: 1px solid rgba(var(--color-rose-500-rgb), 0.15);
  padding: var(--space-1) var(--space-3); /* 4px 12px */
  border-radius: 9999px;
}

.nav__manage-link {
  font-size: var(--text-sm);             /* 14px */
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);    /* #9a9a9a */
  text-decoration: none;
  margin-left: var(--space-4);           /* 16px */
  transition: color 0.15s ease;
}

.nav__manage-link:hover {
  color: var(--color-text-primary);      /* #ebebeb */
}
```

---

## 4. Hero Section

### Purpose

First thing users see. Communicates: what this is, why it's different, and how to start. Then immediately shows tools.

### Layout

```
[rose glow behind]

          SHERLOCK LABS                    <- monospace eyebrow badge
     Work with PDFs.                      <- headline
     Fast, private, free.                 <- headline continued

     Your files never leave your          <- subhead
     browser. No uploads, no servers,
     no accounts required.

     [Merge PDFs]  [Split PDF]            <- tool selector cards
```

### Hero Container

```css
.hero {
  position: relative;
  text-align: center;
  padding: var(--space-16) 0 var(--space-12);  /* 64px top, 48px bottom */
  overflow: hidden;
}
```

### Atmospheric Rose Glow

Same pattern as the TeamHQ landing page hero, adapted for the narrower layout.

```css
.hero::before {
  content: "";
  position: absolute;
  top: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 500px;
  background: radial-gradient(
    ellipse at center,
    rgba(251, 97, 130, 0.12) 0%,
    rgba(251, 97, 130, 0.06) 35%,
    rgba(251, 97, 130, 0.02) 60%,
    transparent 80%
  );
  pointer-events: none;
  z-index: 0;
}
```

Slightly smaller and subtler than TeamHQ's glow (700x500 vs 900x700, lower opacities) because SherlockPDF's hero is more compact.

### Eyebrow Badge

```css
.hero__badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);             /* 12px */
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-rose-500);
  background: rgba(var(--color-rose-500-rgb), 0.08);
  border: 1px solid rgba(var(--color-rose-500-rgb), 0.15);
  padding: var(--space-1) var(--space-4); /* 4px 16px */
  border-radius: 9999px;
  margin-bottom: var(--space-8);         /* 32px */
  position: relative;
  z-index: 1;
}
```

Text content: `SHERLOCK LABS`

### Headline

```css
.hero__headline {
  font-size: var(--text-3xl);            /* 30px */
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-tight);     /* 1.2 */
  color: var(--color-text-primary);      /* #ebebeb */
  letter-spacing: -0.02em;
  max-width: 600px;
  margin: 0 auto var(--space-6);        /* 24px bottom */
  position: relative;
  z-index: 1;
}

@media (min-width: 640px) {
  .hero__headline {
    font-size: var(--text-4xl);          /* 36px */
    letter-spacing: -0.025em;
  }
}
```

Text content: `Work with PDFs. Fast, private, free.`

### Subhead

```css
.hero__subhead {
  font-size: var(--text-base);           /* 16px */
  color: var(--color-text-secondary);    /* #9a9a9a */
  line-height: var(--leading-relaxed);   /* 1.625 */
  max-width: 480px;
  margin: 0 auto var(--space-12);       /* 48px bottom */
  position: relative;
  z-index: 1;
}
```

Text content: `Your files never leave your browser. No uploads, no servers, no accounts required.`

**Design decision:** The privacy message IS the subhead. Not a side note, not a footer disclaimer. This is our single biggest differentiator and it goes front and center. Every competitor uploads files to their servers. We don't. That's the headline-worthy selling point.

---

## 5. Tool Selector

### Purpose

Users pick which tool to use. Two tools in Phase 1 (Merge, Split), expandable to more in Phase 2.

### Layout

Two cards side by side. On mobile, they stack vertically.

```
  +---------------------------+    +---------------------------+
  |  [merge icon]             |    |  [split icon]             |
  |                           |    |                           |
  |  Merge PDFs               |    |  Split PDF                |
  |  Combine multiple files   |    |  Extract individual       |
  |  into one document.       |    |  pages from a PDF.        |
  +---------------------------+    +---------------------------+
```

### Tool Card Specifications

```css
.tool-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);                   /* 16px */
  max-width: 560px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

@media (max-width: 479px) {
  .tool-selector {
    grid-template-columns: 1fr;
  }
}

.tool-selector__card {
  background: var(--color-bg-card);      /* #18181b */
  border: 1px solid var(--color-border); /* rgba(255,255,255,0.06) */
  border-radius: var(--radius-lg);       /* 12px */
  padding: var(--space-6);              /* 24px */
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s ease,
              box-shadow 0.2s ease,
              border-color 0.2s ease,
              background-color 0.2s ease;
  box-shadow: var(--shadow-card);
}

.tool-selector__card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(var(--color-rose-500-rgb), 0.2);
  background: rgba(var(--color-rose-500-rgb), 0.03);
}

.tool-selector__card:active {
  transform: translateY(0);
}

.tool-selector__card--active {
  border-color: var(--color-rose-500);
  background: rgba(var(--color-rose-500-rgb), 0.06);
}
```

### Tool Card Icon

Each tool gets a 40x40 SVG icon using `stroke: var(--color-rose-500)` on a transparent background.

```css
.tool-selector__icon {
  width: 40px;
  height: 40px;
  stroke: var(--color-rose-500);
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  margin-bottom: var(--space-4);         /* 16px */
}
```

**Merge icon:** Two overlapping rectangles with an arrow pointing inward (reuse the combiner icon from the existing tool, recolored).

**Split icon:** A document with a dividing line and arrow pointing outward (reuse the splitter icon from the existing tool, recolored).

### Tool Card Text

```css
.tool-selector__name {
  font-size: var(--text-lg);            /* 18px */
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);     /* #ebebeb */
  margin-bottom: var(--space-2);        /* 8px */
}

.tool-selector__desc {
  font-size: var(--text-sm);            /* 14px */
  color: var(--color-text-secondary);   /* #9a9a9a */
  line-height: var(--leading-normal);   /* 1.5 */
}
```

---

## 6. Tool Panels

### Shared Pattern

Each tool panel is a `<section>` that is shown/hidden via `hidden` attribute or `display: none`. They share a common structure:

```
[Tool Header]           <- tool name + back button
[Usage Counter]         <- "X of 25 files used today" (free) or "Pro" badge
[Upload Zone]           <- drag & drop + browse button
[Processing State]      <- spinner while working
[Results]               <- output + download
```

### Tool Header

```css
.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);         /* 24px */
  padding-bottom: var(--space-4);        /* 16px */
  border-bottom: 1px solid var(--color-border);
}

.tool-header__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);                   /* 8px */
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-family);
  transition: color 0.15s ease;
}

.tool-header__back:hover {
  color: var(--color-text-primary);
}

.tool-header__title {
  font-size: var(--text-xl);            /* 20px */
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}
```

### Usage Counter (Free Users)

A subtle counter strip below the tool header. Always visible for free users. Hidden for Pro users.

```
  3 of 25 files used today          [====--------] 12%
```

```css
.usage-counter {
  display: flex;
  align-items: center;
  gap: var(--space-3);                   /* 12px */
  padding: var(--space-3) var(--space-4); /* 12px 16px */
  background: var(--color-bg-secondary); /* #111113 */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);       /* 8px */
  margin-bottom: var(--space-6);         /* 24px */
}

.usage-counter__text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);            /* 12px */
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);   /* #9a9a9a */
  white-space: nowrap;
}

.usage-counter__bar {
  flex: 1;
  height: 4px;
  background: rgba(var(--color-white-rgb), 0.06);
  border-radius: 2px;
  overflow: hidden;
  min-width: 60px;
}

.usage-counter__fill {
  height: 100%;
  border-radius: 2px;
  background: var(--color-rose-500);     /* #FB6182 */
  transition: width 0.3s ease;
}
```

**Color states for the fill bar:**
- 0-79%: `var(--color-rose-500)` (rose, normal)
- 80-99%: `var(--color-yellow-400)` (`#facc15`, warning)
- 100%: `var(--color-red-400)` (`#f87171`, at limit)

### Upload Zone

Same drag-and-drop pattern as the existing tools, but restyled with the rose accent system.

```css
.upload-zone {
  border: 2px dashed rgba(var(--color-white-rgb), 0.10);
  border-radius: var(--radius-lg);       /* 12px */
  padding: var(--space-16) var(--space-8); /* 64px 32px */
  background: var(--color-bg-card);      /* #18181b */
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.upload-zone--dragover {
  border-color: var(--color-rose-500);
  background: rgba(var(--color-rose-500-rgb), 0.03);
}

.upload-zone__icon {
  width: 48px;
  height: 48px;
  stroke: var(--color-text-tertiary);    /* #606068 */
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.15s ease;
}

.upload-zone--dragover .upload-zone__icon {
  stroke: var(--color-rose-500);
}

.upload-zone__text {
  font-size: var(--text-lg);            /* 18px */
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);     /* #ebebeb */
  margin-top: var(--space-4);           /* 16px */
}

.upload-zone__or {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);    /* #606068 */
  margin: var(--space-2) 0;
}

.upload-zone__btn {
  background: var(--color-accent);       /* #FB6182 */
  color: #fff;
  font-family: var(--font-family);
  font-size: var(--text-sm);            /* 14px */
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2) var(--space-5); /* 8px 20px */
  border: none;
  border-radius: var(--radius-md);       /* 8px */
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.upload-zone__btn:hover {
  background: var(--color-accent-hover); /* #fb7e95 */
}

.upload-zone__hint {
  font-size: var(--text-xs);            /* 12px */
  color: var(--color-text-tertiary);
  margin-top: var(--space-4);
}
```

**Merge tool hint:** `PDF files only`
**Split tool hint:** `PDF files only`

### Upload Zone (Responsive)

```css
@media (max-width: 479px) {
  .upload-zone {
    padding: var(--space-12) var(--space-5); /* 48px 20px */
  }
}
```

---

## 7. Merge Tool

### File List

After uploading, files appear in a reorderable list (SortableJS). Same pattern as the existing combiner but restyled.

```css
.file-list {
  list-style: none;
  margin-bottom: var(--space-4);         /* 16px */
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);                   /* 12px */
  padding: var(--space-3);              /* 12px */
  background: var(--color-bg-card);     /* #18181b */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);       /* 8px */
  margin-bottom: var(--space-2);         /* 8px */
  transition: border-color 0.15s ease;
}

.file-item:hover {
  border-color: var(--color-border-strong); /* rgba(255,255,255,0.10) */
}

.file-item--error {
  border-color: rgba(var(--color-red-600-rgb), 0.2);
  background: rgba(var(--color-red-600-rgb), 0.03);
}
```

### Drag Handle

```css
.file-item__handle {
  cursor: grab;
  color: var(--color-text-tertiary);     /* #606068 */
  width: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
}

.file-item__handle:hover {
  color: var(--color-text-secondary);
}

.file-item__handle:active {
  cursor: grabbing;
}
```

Six-dot grip icon (same as existing combiner).

### SortableJS States

```css
.file-item--ghost {
  opacity: 0.5;
  transform: scale(1.02);
  box-shadow: var(--shadow-lg);
}

.file-item--chosen {
  border-color: var(--color-rose-500);
  background: rgba(var(--color-rose-500-rgb), 0.03);
}
```

### Thumbnail

```css
.file-item__thumb {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);       /* 6px */
  overflow: hidden;
  background: rgba(var(--color-white-rgb), 0.04);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-item__thumb canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.file-item__thumb--loading {
  animation: thumb-pulse 1.5s ease-in-out infinite;
}

@keyframes thumb-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### File Info + Badge + Meta

```css
.file-item__info {
  flex: 1;
  min-width: 0;
}

.file-item__name-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 2px;
}

.file-item__name {
  font-size: var(--text-sm);            /* 14px */
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item__badge {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.file-item__badge--pdf {
  color: var(--color-rose-400);
  background: rgba(var(--color-rose-500-rgb), 0.10);
}

.file-item__badge--image {
  color: var(--color-text-secondary);
  background: rgba(var(--color-white-rgb), 0.06);
}

.file-item__meta {
  font-size: var(--text-xs);            /* 12px */
  color: var(--color-text-tertiary);    /* #606068 */
}

.file-item__error-msg {
  font-size: var(--text-xs);
  color: var(--color-red-400);
}
```

### Remove Button

```css
.file-item__remove {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.file-item__remove:hover {
  background: rgba(var(--color-red-600-rgb), 0.10);
  color: var(--color-red-400);
}
```

### Toolbar (Add More / Clear All)

```css
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4); /* 12px 16px */
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.toolbar--dragover {
  border-color: var(--color-rose-500);
  background: rgba(var(--color-rose-500-rgb), 0.03);
}

.toolbar__add {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-family);
  transition: color 0.15s ease;
}

.toolbar__add:hover {
  color: var(--color-text-primary);
}

.toolbar__clear {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-family);
  transition: color 0.15s ease;
}

.toolbar__clear:hover {
  color: var(--color-red-400);
}
```

### Page Count Summary

```css
.page-summary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  padding: var(--space-2) 0;
  margin-bottom: var(--space-1);
}
```

### Merge Button (Primary Action)

```css
.action-btn {
  width: 100%;
  padding: var(--space-3) var(--space-6); /* 12px 24px */
  border-radius: var(--radius-md);       /* 8px */
  background: var(--color-accent);       /* #FB6182 */
  color: #fff;
  font-family: var(--font-family);
  font-size: var(--text-base);          /* 16px */
  font-weight: var(--font-weight-semibold);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.action-btn:hover {
  background: var(--color-accent-hover); /* #fb7e95 */
}

.action-btn:active {
  background: var(--color-accent-active); /* #e8496a */
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:disabled:hover {
  background: var(--color-accent);
}

.action-btn--success {
  background: var(--color-emerald-500);  /* #10b981 */
}

.action-btn--success:hover {
  background: var(--color-emerald-500);
}
```

### Spinner (Processing)

```css
.action-btn__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 8. Split Tool

### After Upload: Page Grid

Same pattern as the existing PDF splitter. Grid of page cards with previews and individual download buttons.

```css
.pdf-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: var(--space-4) 0;
  margin-bottom: var(--space-2);
}

.pdf-info__name {
  font-size: var(--text-base);          /* 16px */
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.pdf-info__meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
```

### Actions Bar

```css
.actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) 0;
  margin-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.actions-bar__download-all {
  background: var(--color-accent);
  color: #fff;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.actions-bar__download-all:hover {
  background: var(--color-accent-hover);
}

.actions-bar__download-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.actions-bar__reset {
  background: transparent;
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-secondary);
  font-family: var(--font-family);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.actions-bar__reset:hover {
  border-color: rgba(var(--color-white-rgb), 0.15);
  color: var(--color-text-primary);
}
```

### Page Grid

```css
.page-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);                   /* 12px */
  list-style: none;
}

@media (min-width: 480px) {
  .page-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 640px) {
  .page-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 900px) {
  .page-grid { grid-template-columns: repeat(4, 1fr); }
}
```

### Page Card

```css
.page-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);              /* 16px */
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: border-color 0.15s ease;
}

.page-card:hover {
  border-color: var(--color-border-strong);
}

.page-card__preview {
  width: 100%;
  aspect-ratio: 8.5 / 11;
  background: rgba(var(--color-white-rgb), 0.04);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-card__preview canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.page-card__label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.page-card__download {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-rose-500);
  background: none;
  border: none;
  cursor: pointer;
  margin-top: var(--space-2);
  font-family: var(--font-family);
  transition: color 0.15s ease;
}

.page-card__download:hover {
  color: var(--color-rose-400);
  text-decoration: underline;
}
```

---

## 9. Paywall & Upgrade Flows

### 9a. Daily Limit Reached

When a free user hits 25 files/day, the upload zone is replaced with an upgrade prompt.

```
  +---------------------------------------------------+
  |                                                     |
  |            [lock icon]                             |
  |                                                     |
  |    Daily limit reached                              |
  |    You've processed 25 files today.                |
  |    Upgrade to Pro for unlimited access.            |
  |                                                     |
  |    [Upgrade to Pro --- $9/month]                   |
  |                                                     |
  |    Your files never leave your browser.            |
  |    Cancel anytime.                                 |
  |                                                     |
  +---------------------------------------------------+
```

```css
.upgrade-prompt {
  border: 1px solid rgba(var(--color-rose-500-rgb), 0.15);
  border-radius: var(--radius-lg);
  padding: var(--space-12) var(--space-8); /* 48px 32px */
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.upgrade-prompt__icon {
  width: 48px;
  height: 48px;
  stroke: var(--color-rose-500);
  fill: none;
  stroke-width: 1.5;
  margin-bottom: var(--space-4);
}

.upgrade-prompt__title {
  font-size: var(--text-xl);            /* 20px */
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.upgrade-prompt__text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-6);
  max-width: 320px;
  line-height: var(--leading-normal);
}

.upgrade-prompt__cta {
  background: var(--color-accent);
  color: #fff;
  font-family: var(--font-family);
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-3) var(--space-8); /* 12px 32px */
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: var(--space-4);
}

.upgrade-prompt__cta:hover {
  background: var(--color-accent-hover);
}

.upgrade-prompt__fine-print {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--leading-normal);
}
```

### 9b. File Size Limit

When a free user tries to upload a file > 50MB, show an inline error with upgrade option instead of the generic error state.

```css
.size-limit-error {
  background: rgba(var(--color-rose-500-rgb), 0.04);
  border: 1px solid rgba(var(--color-rose-500-rgb), 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  margin-top: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.size-limit-error__text {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.size-limit-error__text strong {
  color: var(--color-rose-400);
}

.size-limit-error__upgrade {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-rose-500);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-family);
  transition: color 0.15s ease;
}

.size-limit-error__upgrade:hover {
  color: var(--color-rose-400);
  text-decoration: underline;
}
```

Text: `This file is **X MB** --- free tier is limited to 50 MB.` [Upgrade to Pro]

**Design decision:** This is NOT a blocking modal. The file is simply not accepted, and the user can still work with other files. The upgrade link is right there but not forced.

### 9c. Output Branding

Free tier PDFs get a small text stamp: `Powered by SherlockPDF` at the bottom of each page.

**Added via `pdf-lib` during processing.** Not a design component --- it's a PDF text drawing operation:
- Font: Helvetica (built into pdf-lib, no embedding needed)
- Size: 8pt
- Color: `rgb(0.6, 0.6, 0.6)` (gray, unobtrusive)
- Position: centered, 10pt from bottom edge
- Pro users: this step is skipped entirely.

---

## 10. Stripe Checkout Flow

### Pre-Checkout: Pricing Display

When a user clicks "Upgrade to Pro" (from any context), they see a pricing section before redirect.

```
  +---------------------------------------------------+
  |                                                     |
  |  Upgrade to SherlockPDF Pro                        |
  |                                                     |
  |  +---------------------+  +---------------------+  |
  |  |  Monthly            |  |  Annual     SAVE 22% |  |
  |  |  $9/month           |  |  $7/month            |  |
  |  |  Billed monthly     |  |  $84 billed yearly   |  |
  |  |  [Choose Monthly]   |  |  [Choose Annual]     |  |
  |  +---------------------+  +---------------------+  |
  |                                                     |
  |  +--- What you get ---------------------------+    |
  |  |  [check] Unlimited files (no daily limit)  |    |
  |  |  [check] Files up to 200 MB               |    |
  |  |  [check] Batch processing                  |    |
  |  |  [check] No branding on output             |    |
  |  +--------------------------------------------+    |
  |                                                     |
  +---------------------------------------------------+
```

```css
.pricing-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
}

.pricing-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.pricing-modal__content {
  position: relative;
  background: var(--color-bg-secondary);  /* #111113 */
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xl);       /* 16px */
  padding: var(--space-8);              /* 32px */
  max-width: 520px;
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.pricing-modal__close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease, background-color 0.15s ease;
}

.pricing-modal__close:hover {
  color: var(--color-text-primary);
  background: rgba(var(--color-white-rgb), 0.06);
}

.pricing-modal__title {
  font-size: var(--text-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  text-align: center;
  margin-bottom: var(--space-6);
}
```

### Pricing Cards (Monthly vs Annual)

```css
.pricing-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

@media (max-width: 479px) {
  .pricing-options {
    grid-template-columns: 1fr;
  }
}

.pricing-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);              /* 20px */
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.pricing-card:hover {
  border-color: rgba(var(--color-rose-500-rgb), 0.2);
}

.pricing-card--selected {
  border-color: var(--color-rose-500);
  background: rgba(var(--color-rose-500-rgb), 0.04);
}

.pricing-card__label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.pricing-card__price {
  font-size: var(--text-2xl);           /* 24px */
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.pricing-card__price-suffix {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-secondary);
}

.pricing-card__billing {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.pricing-card__save-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-emerald-400);
  background: rgba(var(--color-emerald-400-rgb), 0.10);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: var(--space-2);
}
```

### Feature List

```css
.pricing-features {
  list-style: none;
  margin-bottom: var(--space-6);
}

.pricing-features__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.pricing-features__check {
  width: 16px;
  height: 16px;
  color: var(--color-emerald-400);       /* #34d399 */
  flex-shrink: 0;
}
```

### Checkout Button

```css
.pricing-checkout-btn {
  width: 100%;
  padding: var(--space-3) var(--space-6);
  background: var(--color-accent);
  color: #fff;
  font-family: var(--font-family);
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.pricing-checkout-btn:hover {
  background: var(--color-accent-hover);
}
```

Button text: `Continue to checkout` (redirects to Stripe hosted Checkout).

---

## 11. Pro Unlock Flow (Returning Users)

### Email Input

Pro users who return see a minimal email input to re-verify their subscription status.

```
  +---------------------------------------------------+
  |                                                     |
  |  Welcome back                                      |
  |  Enter your email to unlock Pro features.          |
  |                                                     |
  |  [email@example.com          ] [Unlock]            |
  |                                                     |
  |  Don't have Pro? Upgrade for $9/month              |
  |                                                     |
  +---------------------------------------------------+
```

This is NOT shown by default. It appears when a user clicks a "Sign in" link in the nav, OR when a returning user's localStorage Pro status has expired and needs re-verification.

```css
.pro-unlock {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  text-align: center;
  max-width: 420px;
  margin: 0 auto var(--space-8);
}

.pro-unlock__title {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.pro-unlock__text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-5);
}

.pro-unlock__form {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.pro-unlock__input {
  flex: 1;
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-family);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color 0.15s ease;
}

.pro-unlock__input::placeholder {
  color: var(--color-text-tertiary);
}

.pro-unlock__input:focus {
  border-color: var(--color-rose-500);
}

.pro-unlock__submit {
  padding: var(--space-2) var(--space-5);
  background: var(--color-accent);
  color: #fff;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s ease;
  white-space: nowrap;
}

.pro-unlock__submit:hover {
  background: var(--color-accent-hover);
}

.pro-unlock__upgrade-link {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.pro-unlock__upgrade-link a {
  color: var(--color-rose-500);
  text-decoration: none;
  transition: color 0.15s ease;
}

.pro-unlock__upgrade-link a:hover {
  color: var(--color-rose-400);
  text-decoration: underline;
}
```

### Verification States

**Loading:** Replace "Unlock" button text with a spinner.

**Success:** Flash green, then redirect to the tools with Pro unlocked.
```css
.pro-unlock__input--success {
  border-color: var(--color-emerald-400);
}
```

**Not found:** Shake animation + error message.
```css
.pro-unlock__input--error {
  border-color: var(--color-red-400);
}

.pro-unlock__error-text {
  font-size: var(--text-xs);
  color: var(--color-red-400);
  margin-top: var(--space-2);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.pro-unlock__form--shake {
  animation: shake 0.3s ease;
}
```

---

## 12. Pro User Experience

When a user is identified as Pro, the following changes apply globally:

### Nav Bar

- Pro badge appears (see Section 3, `.nav__pro-badge`)
- "Manage" link appears (opens Stripe Customer Portal)

### Usage Counter

- Hidden entirely. Pro users don't have limits, so don't show a counter.

### Upload Zone

- File size hint changes from `PDF files only` to `PDF files only (up to 200 MB)`
- No other visible changes. Pro users just... use the tool. No ceremony.

### Processing

- Output branding step is skipped (no "Powered by SherlockPDF" on output PDFs)
- Batch processing is available in the Merge tool (upload many files at once)

### Visual Indicator

A subtle rose glow around the tool panel border to reinforce the "premium" feeling:

```css
.tool-panel--pro {
  border: 1px solid rgba(var(--color-rose-500-rgb), 0.10);
  box-shadow: 0 0 20px rgba(var(--color-rose-500-rgb), 0.04);
}
```

This is extremely subtle --- just enough to make the Pro experience feel slightly different without being garish.

---

## 13. Toast Notifications

For non-blocking feedback (errors, success confirmations, file rejections).

```css
.toast {
  position: fixed;
  bottom: var(--space-6);               /* 24px */
  left: 50%;
  transform: translateX(-50%) translateY(100%);
  z-index: 300;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  opacity: 0;
  transition: transform 0.25s ease, opacity 0.25s ease;
  pointer-events: none;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
}

.toast--visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
  pointer-events: auto;
}

.toast--error {
  border-color: rgba(var(--color-red-600-rgb), 0.3);
}

.toast--success {
  border-color: rgba(var(--color-emerald-400-rgb), 0.3);
}

.toast__text {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.toast--error .toast__text {
  color: var(--color-red-400);
}

.toast--success .toast__text {
  color: var(--color-emerald-400);
}

@media (max-width: 639px) {
  .toast__text {
    white-space: normal;
  }
}
```

---

## 14. Processing State

When a PDF is being processed (splitting or merging), the upload zone is replaced with a processing indicator.

```css
.processing {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-16) var(--space-8); /* 64px 32px */
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.processing-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(var(--color-white-rgb), 0.10);
  border-top-color: var(--color-rose-500);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.processing-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-4);
}
```

---

## 15. Error States

### Generic Upload Error

```css
.upload-error {
  background: rgba(var(--color-red-600-rgb), 0.04);
  border: 1px solid rgba(var(--color-red-600-rgb), 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-4);
}

.upload-error__text {
  font-size: var(--text-sm);
  color: var(--color-red-400);
}
```

### Network/Stripe Error

When the Stripe API call fails (checkout session creation, status check, portal session):

```css
.api-error {
  background: rgba(var(--color-red-600-rgb), 0.04);
  border: 1px solid rgba(var(--color-red-600-rgb), 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  margin-top: var(--space-4);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.api-error__icon {
  width: 20px;
  height: 20px;
  color: var(--color-red-400);
  flex-shrink: 0;
  margin-top: 1px;
}

.api-error__content {
  flex: 1;
}

.api-error__title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.api-error__text {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

.api-error__retry {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-rose-500);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-family);
  margin-top: var(--space-2);
  transition: color 0.15s ease;
}

.api-error__retry:hover {
  color: var(--color-rose-400);
  text-decoration: underline;
}
```

---

## 16. Footer

```css
.footer {
  background: #0a0a0c;
  border-top: 1px solid var(--color-border);
  padding: var(--space-8) 0;            /* 32px */
  text-align: center;
}

.footer__logo {
  height: 28px;
  width: auto;
  display: block;
  margin: 0 auto var(--space-3);
}

.footer__attribution {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-4);
}

.footer__links {
  display: flex;
  justify-content: center;
  gap: var(--space-6);
}

.footer__link {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.footer__link:hover {
  color: var(--color-text-secondary);
}
```

Footer links: `Privacy` | `Terms` | `Sherlock Labs`

---

## 17. Responsive Breakpoints

| Breakpoint | Container padding | Tool selector | Page grid | Notes |
|------------|-------------------|---------------|-----------|-------|
| < 480px | 20px | 1 column | 1 column | Upload zone padding reduced. Actions bar stacks. |
| 480-639px | 20px | 2 columns | 2 columns | |
| 640-899px | 32px | 2 columns | 3 columns | |
| 900px+ | 32px | 2 columns | 4 columns | Max-width container kicks in |

### Mobile-Specific Adjustments

```css
@media (max-width: 479px) {
  .hero {
    padding: var(--space-10) 0 var(--space-8); /* 40px top, 32px bottom */
  }

  .hero__headline {
    font-size: var(--text-2xl);          /* 24px */
  }

  .hero__subhead {
    font-size: var(--text-sm);
  }

  .upload-zone {
    padding: var(--space-12) var(--space-5);
  }

  .actions-bar {
    flex-direction: column;
    gap: var(--space-2);
  }

  .actions-bar__download-all,
  .actions-bar__reset {
    width: 100%;
    text-align: center;
  }

  .toolbar {
    flex-direction: column;
    gap: var(--space-2);
    align-items: stretch;
  }

  .toolbar__add {
    justify-content: center;
  }

  .toolbar__clear {
    text-align: center;
  }

  .file-item__thumb {
    width: 40px;
    height: 40px;
  }

  .pricing-modal__content {
    padding: var(--space-5);
    border-radius: var(--radius-lg);
  }
}
```

---

## 18. Accessibility

### Keyboard Navigation

- **Upload zone:** `tabindex="0"`, activates file picker on Enter/Space
- **Tool selector cards:** `tabindex="0"` + `role="button"`, activates on Enter/Space
- **File list:** `role="list"`, items have `role="listitem"`
- **Drag handle:** `aria-label="Reorder [filename]"`
- **Remove button:** `aria-label="Remove [filename]"`
- **Download buttons:** `aria-label="Download page [N] as PDF"`
- **Error messages:** `role="alert"` for screen reader announcement
- **Toast:** `role="alert"` for screen reader announcement
- **Pricing modal:** Focus trap when open. Escape key closes. Focus returns to trigger element on close.

### Focus Styles

All interactive elements use the shared focus pattern from `shared.css`:

```css
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

### Color Contrast

All text meets WCAG AA minimums:
- Primary text (`#ebebeb`) on bg-primary (`#0c0c0e`): ratio ~17:1
- Secondary text (`#9a9a9a`) on bg-primary (`#0c0c0e`): ratio ~7.5:1
- Tertiary text (`#606068`) on bg-primary (`#0c0c0e`): ratio ~3.7:1 (used only for hints/fine print, not critical content)
- Rose accent (`#FB6182`) on bg-card (`#18181b`): ratio ~4.7:1 (passes AA for normal text)

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .tool-selector__card,
  .page-card,
  .file-item,
  .toast,
  .processing-spinner,
  .action-btn__spinner,
  .thumb-pulse {
    transition: none;
    animation: none;
  }

  .tool-selector__card:hover {
    transform: none;
  }
}
```

---

## 19. State Machine

### View States

The app has these discrete view states (only one active at a time):

| State | What's Visible | Trigger |
|-------|---------------|---------|
| `LANDING` | Hero + tool selector | Initial load, "Back to tools" click |
| `TOOL_MERGE` | Tool header + upload zone (merge) | Click "Merge PDFs" card |
| `TOOL_MERGE_LOADED` | Tool header + toolbar + file list + merge button | Files uploaded in merge tool |
| `TOOL_MERGE_PROCESSING` | Tool header + file list (dimmed) + processing button | Merge button clicked |
| `TOOL_SPLIT` | Tool header + upload zone (split) | Click "Split PDF" card |
| `TOOL_SPLIT_LOADED` | Tool header + page grid + actions bar | PDF uploaded in split tool |
| `TOOL_SPLIT_PROCESSING` | Tool header + processing spinner | Processing PDF |
| `UPGRADE` | Pricing modal overlay | "Upgrade to Pro" click from any context |
| `PRO_UNLOCK` | Email input form | "Sign in" click or expired Pro session |

### Transitions

```
LANDING
  -> click "Merge PDFs" -> TOOL_MERGE
  -> click "Split PDF" -> TOOL_SPLIT
  -> click "Sign in" (nav) -> PRO_UNLOCK

TOOL_MERGE
  -> upload files -> TOOL_MERGE_LOADED
  -> click "Back" -> LANDING
  -> daily limit hit -> UPGRADE (inline, replaces upload zone)

TOOL_MERGE_LOADED
  -> click "Merge & Download" -> TOOL_MERGE_PROCESSING
  -> click "Clear All" -> TOOL_MERGE
  -> click "Back" -> LANDING

TOOL_MERGE_PROCESSING
  -> processing complete -> flash success on button -> TOOL_MERGE_LOADED
  -> processing error -> toast error -> TOOL_MERGE_LOADED

TOOL_SPLIT
  -> upload file -> TOOL_SPLIT_LOADED (via TOOL_SPLIT_PROCESSING)
  -> click "Back" -> LANDING
  -> daily limit hit -> UPGRADE (inline)

TOOL_SPLIT_LOADED
  -> click "Upload Another" -> TOOL_SPLIT
  -> click "Back" -> LANDING

UPGRADE (modal)
  -> select plan + click "Continue to checkout" -> redirect to Stripe
  -> click backdrop/X/Escape -> return to previous state
  -> Stripe redirect back with session_id -> PRO_UNLOCK (auto-verify)

PRO_UNLOCK
  -> enter email + submit -> verify -> unlock Pro -> return to previous tool state
  -> click "Back" -> LANDING
```

---

## 20. Stripe Redirect Return

After a user completes Stripe Checkout, they are redirected back to `pdf.sherlocklabs.ai/?session_id=cs_xxx`.

**On page load with `session_id` param:**

1. Show a brief verification screen:
   ```
   [spinner]
   Confirming your subscription...
   ```

2. Call `GET /api/status?session_id=cs_xxx` (server retrieves the session, gets the customer email, checks subscription).

3. **Success:** Store email + Pro status in localStorage. Show success toast: "Welcome to Pro! Your subscription is active." Remove `session_id` from URL (via `history.replaceState`). Show the tools with Pro unlocked.

4. **Failure:** Show error: "We couldn't confirm your subscription. Try signing in with your email, or contact support." Show the email input form as fallback.

```css
.verify-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-20) 0;           /* 80px */
  text-align: center;
}

.verify-screen__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(var(--color-white-rgb), 0.10);
  border-top-color: var(--color-rose-500);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-bottom: var(--space-4);
}

.verify-screen__text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
```

---

## 21. LocalStorage Schema

```javascript
// Free user usage tracking
localStorage.setItem('sherlockpdf_usage_2026-02-08', '3');  // files processed today

// Pro user state
localStorage.setItem('sherlockpdf_pro_email', 'user@example.com');
localStorage.setItem('sherlockpdf_pro_verified', '1707350400000');  // timestamp of last verification
```

**Pro status expiry:** Re-verify against Stripe every 24 hours. If `Date.now() - sherlockpdf_pro_verified > 86400000`, show a brief "Verifying..." state and re-check `/api/status`.

---

## 22. Font Loading

SherlockPDF uses the same fonts as the TeamHQ landing page:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;700&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 23. CDN Libraries

Same libraries as the existing tools, loaded via CDN `<script>` tags:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
<script src="https://unpkg.com/jszip@3.10.1/dist/jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.6/Sortable.min.js"></script>
```

---

## Summary: What Makes SherlockPDF Feel Premium

1. **Dark mode.** Nobody else in the PDF tool space does dark mode well. Smallpdf, iLovePDF, Adobe --- all clinical white. We look different immediately.

2. **Rose accent system.** The warm rose accent on a cool charcoal background creates visual sophistication. It reads as "designed," not "default."

3. **Noise texture.** The subtle grain overlay adds depth to every surface. It's the same trick that makes expensive websites feel expensive.

4. **Monospace details.** The Geist Mono font for eyebrows, badges, and counters adds a technical precision feel. This is a tool for people who care about quality.

5. **Privacy-first messaging.** "Your files never leave your browser" isn't just a feature --- it's a trust signal that justifies the premium positioning.

6. **Paywall as value, not friction.** The upgrade prompt shows what you get, not what you're blocked from. The daily counter is informational, not threatening. The pricing modal is clean and confident.

7. **Frosted glass nav.** The backdrop-blur nav that came from the TeamHQ redesign gives a modern, polished feel that competitors lack.

8. **No clutter.** Two tools, one page, zero onboarding. The product respects the user's time. This is the premium experience --- not bells and whistles, but ruthless simplicity.

---

## Implementation Notes for Alice

1. **Start with the HTML structure.** Single `index.html` file. All sections present in HTML, visibility controlled by JS (show/hide, not routing).

2. **CSS approach:** Create `sherlockpdf/css/styles.css`. Import `tokens.css` from the parent (or copy the tokens inline --- Andrei's decision, but I recommend copying since SherlockPDF deploys independently).

3. **Tool selector pattern:** The hero section contains the tool cards. When a card is clicked, the hero collapses and the tool panel becomes visible. "Back to tools" returns to the hero + selector.

4. **All accent colors are rose**, not indigo. The existing tools use `--indigo-500` for buttons and highlights. SherlockPDF uses `--color-rose-500` / `--color-accent` throughout.

5. **Pro vs Free visual differences are minimal by design.** Don't build two completely different UIs. Same layout, same flow. Pro just removes the counter, removes branding, and shows the Pro badge.

6. **The pricing modal is a real modal** (fixed overlay with backdrop). Not a page navigation. This keeps the user in context --- they can see the tool they were using behind the blur.

7. **Test the atmospheric rose glow** on the hero. It should be visible but not overwhelming. Adjust the opacity values if needed --- the spec gives starting values but visual tuning is expected.

8. **File input `accept` attribute:** `.pdf,application/pdf` for the split tool. `.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,application/pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff` for the merge tool (same as existing combiner).
