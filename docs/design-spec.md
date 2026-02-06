# TeamHQ Landing Page -- Design Spec

This document provides every visual and layout detail the Front-End Developer needs to implement the landing page. All values are exact; do not approximate.

---

## 1. Design Tokens (CSS Custom Properties)

Define these on `:root`. Every color, font size, and spacing value used in the page should reference one of these tokens.

### Color Palette

```css
:root {
  /* Neutrals */
  --color-white: #FFFFFF;
  --color-gray-50: #F8FAFC;
  --color-gray-100: #F1F5F9;
  --color-gray-200: #E2E8F0;
  --color-gray-400: #94A3B8;
  --color-gray-500: #64748B;
  --color-gray-600: #475569;
  --color-gray-700: #334155;
  --color-gray-800: #1E293B;
  --color-gray-900: #0F172A;

  /* Brand */
  --color-indigo-50: #EEF2FF;
  --color-indigo-100: #E0E7FF;
  --color-indigo-500: #6366F1;
  --color-indigo-600: #4F46E5;
  --color-indigo-700: #4338CA;

  /* Accent (used sparingly for highlights) */
  --color-violet-500: #8B5CF6;

  /* Semantic */
  --color-bg-primary: var(--color-white);
  --color-bg-secondary: var(--color-gray-50);
  --color-bg-card: var(--color-white);
  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);
  --color-text-tertiary: var(--color-gray-500);
  --color-border: var(--color-gray-200);
  --color-accent: var(--color-indigo-600);
  --color-accent-hover: var(--color-indigo-700);
  --color-accent-light: var(--color-indigo-50);
}
```

### Typography

Use the system font stack. No web font needed for v1.

```css
:root {
  --font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  /* Scale (used for specific elements -- see Section Specs below) */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;        /* 48px */

  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### Spacing

8px base unit. All spacing is a multiple of this.

```css
:root {
  --space-1: 0.25rem;   /*  4px */
  --space-2: 0.5rem;    /*  8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
}
```

---

## 2. Responsive Breakpoints

Mobile-first. Base styles target mobile; add complexity at larger breakpoints.

| Name    | Min-width | Usage                                      |
|---------|-----------|---------------------------------------------|
| mobile  | (default) | Single column, stacked layout               |
| tablet  | 640px     | 2-column card grid, wider content area      |
| desktop | 1024px    | 3-column card grid, max-width content area  |

Max content width: **1120px**, centered with `margin: 0 auto`.

Page horizontal padding:
- Mobile: `var(--space-5)` (20px) on each side
- Tablet+: `var(--space-8)` (32px) on each side

---

## 3. Global Styles

```
body {
  font-family: var(--font-family);
  font-size: var(--text-base);       /* 16px */
  line-height: var(--leading-normal); /* 1.5 */
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  -webkit-font-smoothing: antialiased;
}
```

All sections use a shared `.container` wrapper at `max-width: 1120px; margin: 0 auto;` with the horizontal padding noted above.

---

## 4. Section: Hero

**Purpose:** Immediately communicate what TeamHQ is.

**Background:** `var(--color-bg-primary)` (white).

**Layout:** Centered text, single column on all breakpoints.

**Vertical padding:**
- Mobile: `var(--space-16)` top, `var(--space-12)` bottom (64px / 48px)
- Desktop: `var(--space-24)` top, `var(--space-16)` bottom (96px / 64px)

**Content (top to bottom):**

1. **Badge / label** (optional but recommended):
   - Text: "AI-Powered Product Team"
   - Style: `var(--text-sm)`, `var(--font-weight-medium)`, `var(--color-accent)` text color
   - Background: `var(--color-accent-light)` (indigo-50)
   - Padding: `var(--space-1) var(--space-3)` (4px 12px)
   - Border-radius: `9999px` (pill shape)
   - Display: `inline-block`
   - Margin bottom: `var(--space-6)` (24px)

2. **Headline:**
   - Text: "Your AI product team, assembled and ready"
   - Mobile: `var(--text-3xl)` (30px), `var(--font-weight-bold)`, `var(--leading-tight)`
   - Desktop: `var(--text-5xl)` (48px), `var(--font-weight-bold)`, `var(--leading-tight)`
   - Color: `var(--color-text-primary)`
   - Max-width: `720px`, centered
   - Margin bottom: `var(--space-6)` (24px)

3. **Subhead:**
   - Text: "TeamHQ is the central headquarters for a six-agent AI team -- a PM, Designer, Architect, two Developers, and QA Engineer -- working together to build software."
   - Mobile: `var(--text-lg)` (18px)
   - Desktop: `var(--text-xl)` (20px)
   - `var(--leading-relaxed)`, `var(--font-weight-normal)`
   - Color: `var(--color-text-secondary)`
   - Max-width: `640px`, centered
   - Margin bottom: `0`

**Alignment:** Everything `text-align: center` with horizontal auto margins on the max-width elements.

---

## 5. Section: Team Roster

**Purpose:** Introduce each of the 6 agents with enough personality that they feel real.

**Background:** `var(--color-bg-secondary)` (gray-50).

**Vertical padding:** `var(--space-16)` top and bottom (64px) on mobile; `var(--space-20)` (80px) on desktop.

### Section Header

- **Title:** "Meet the Team"
- Style: `var(--text-2xl)` on mobile, `var(--text-3xl)` on desktop; `var(--font-weight-bold)`, `var(--color-text-primary)`
- `text-align: center`
- Margin bottom: `var(--space-4)` (16px)

- **Subtitle:** "Six specialized agents, each with a distinct role and perspective."
- Style: `var(--text-base)` on mobile, `var(--text-lg)` on desktop; `var(--color-text-secondary)`
- `text-align: center`
- Max-width: `560px`, centered
- Margin bottom: `var(--space-10)` on mobile, `var(--space-12)` on desktop

### Card Grid

- **Mobile (< 640px):** 1 column, full width. Gap: `var(--space-5)` (20px).
- **Tablet (640px--1023px):** 2 columns. Gap: `var(--space-6)` (24px).
- **Desktop (1024px+):** 3 columns. Gap: `var(--space-6)` (24px).

Use `display: grid` with `grid-template-columns` adjusting at each breakpoint.

### Agent Card

Each card is a `<div>` (or `<article>`) with the following structure and styles:

**Container:**
- Background: `var(--color-bg-card)` (white)
- Border: `1px solid var(--color-border)`
- Border-radius: `var(--radius-lg)` (12px)
- Padding: `var(--space-6)` (24px)
- Box-shadow: `var(--shadow-sm)`
- Transition: `box-shadow 0.2s ease, transform 0.2s ease`

**Hover state:**
- Box-shadow: `var(--shadow-md)`
- Transform: `translateY(-2px)`

**Card content (top to bottom):**

1. **Agent avatar / icon area:**
   - A `48px x 48px` circle with `var(--color-accent-light)` background
   - Centered inside: the agent abbreviation in `var(--text-lg)`, `var(--font-weight-semibold)`, `var(--color-accent)` color
   - This acts as a monogram/avatar (e.g., "PM", "FE", "BE", "Ar", "QA", "De")
   - Border-radius: `50%`
   - Margin bottom: `var(--space-4)` (16px)

2. **Agent name:**
   - The full agent name (e.g., "PM", "Designer", etc.)
   - Style: `var(--text-lg)`, `var(--font-weight-semibold)`, `var(--color-text-primary)`
   - Margin bottom: `var(--space-1)` (4px)

3. **Role title:**
   - The full role (e.g., "Product Manager", "Front-End Developer", etc.)
   - Style: `var(--text-sm)`, `var(--font-weight-medium)`, `var(--color-accent)`
   - Margin bottom: `var(--space-3)` (12px)

4. **Description:**
   - One sentence describing what this agent does (see Agent Content below)
   - Style: `var(--text-sm)`, `var(--leading-relaxed)`, `var(--color-text-secondary)`

### Agent Content

These descriptions are derived from the agent definitions in `.claude/agents/`. Use these exact values:

| Name       | Role Title          | Monogram | Description |
|------------|---------------------|----------|-------------|
| PM         | Product Manager     | PM       | Translates the CEO's vision into concrete, prioritized work and keeps the team focused on what actually matters. |
| Designer   | Product Designer    | De       | Turns requirements into clear, usable designs -- every decision starts with who is using it and what they need. |
| Arch       | Technical Architect | Ar       | Defines how the pieces fit together, makes tech stack decisions, and guides the team toward simple, proven approaches. |
| FE         | Front-End Developer | FE       | Builds the user interface with a craftsperson's eye for responsiveness, accessibility, and pixel-perfect polish. |
| BE         | Back-End Developer  | BE       | Designs APIs, data models, and server-side logic with a focus on reliability, security, and graceful failure handling. |
| QA         | QA Engineer         | QA       | The team's constructive skeptic -- tests what users actually do, not just the happy path, so the team ships with confidence. |

**Card display order (left to right, top to bottom):** PM, Designer, Arch, FE, BE, QA. This reflects the workflow: product direction, then design, then architecture, then implementation, then validation.

---

## 6. Section: How It Works

**Purpose:** Show the operating model in 4 clear, scannable steps.

**Background:** `var(--color-bg-primary)` (white).

**Vertical padding:** `var(--space-16)` (64px) on mobile; `var(--space-20)` (80px) on desktop.

### Section Header

- **Title:** "How It Works"
- Same styles as the Team Roster section header
- Margin bottom: `var(--space-4)` (16px)

- **Subtitle:** "A structured workflow from direction to delivery."
- Same styles as the Team Roster section subtitle
- Margin bottom: `var(--space-10)` on mobile, `var(--space-12)` on desktop

### Steps Layout

- **Mobile:** 1 column, stacked vertically. Gap: `var(--space-8)` (32px).
- **Tablet (640px+):** 2 columns, 2 rows. Gap: `var(--space-6)` (24px).
- **Desktop (1024px+):** 4 columns, single row. Gap: `var(--space-6)` (24px).

Use `display: grid`.

### Step Item

Each step is a vertical block, centered text:

1. **Step number:**
   - A `40px x 40px` circle
   - Background: `var(--color-accent)` (indigo-600)
   - Color: `var(--color-white)`
   - Font: `var(--text-base)`, `var(--font-weight-bold)`
   - Border-radius: `50%`
   - Display: `flex; align-items: center; justify-content: center`
   - Centered horizontally (`margin: 0 auto`)
   - Margin bottom: `var(--space-4)` (16px)

2. **Step title:**
   - Style: `var(--text-base)`, `var(--font-weight-semibold)`, `var(--color-text-primary)`
   - `text-align: center`
   - Margin bottom: `var(--space-2)` (8px)

3. **Step description:**
   - Style: `var(--text-sm)`, `var(--leading-relaxed)`, `var(--color-text-secondary)`
   - `text-align: center`
   - Max-width: `240px`, centered with `margin: 0 auto`

### Step Content

| # | Title               | Description                                           |
|---|---------------------|-------------------------------------------------------|
| 1 | CEO Sets Direction  | You define the vision and goals. The team takes it from there. |
| 2 | PM Scopes the Work  | Requirements are clarified, prioritized, and broken into shippable pieces. |
| 3 | Team Builds in Parallel | Architect, Designer, and Developers work simultaneously on their domains. |
| 4 | QA Validates        | Every feature is tested against acceptance criteria before it ships. |

### Connecting Line (Desktop Only)

On desktop (1024px+), render a subtle horizontal line connecting the four step circles:

- Position: a `::before` pseudo-element on the steps container
- Top offset: `20px` (center of the 40px step circles)
- Left: center of first circle; Right: center of last circle
- Height: `2px`
- Background: `var(--color-gray-200)`
- Z-index: behind the step circles (step circles need `position: relative; z-index: 1`)

On tablet and mobile, omit this line.

---

## 7. Section: Footer

**Purpose:** Close the page with minimal attribution.

**Background:** `var(--color-gray-900)`.

**Vertical padding:** `var(--space-8)` (32px) top and bottom.

**Layout:** Centered text, single column.

**Content:**

1. **Project name:**
   - Text: "TeamHQ"
   - Style: `var(--text-base)`, `var(--font-weight-semibold)`, `var(--color-white)`
   - Margin bottom: `var(--space-2)` (8px)

2. **Attribution line:**
   - Text: "Built with Claude Code"
   - Style: `var(--text-sm)`, `var(--color-gray-400)`

---

## 8. Accessibility Notes

- All text must meet WCAG 2.1 AA contrast ratios (4.5:1 for body text, 3:1 for large text). The palette above has been chosen to meet this.
  - `var(--color-gray-600)` (#475569) on white = ~7:1 contrast ratio -- passes AA.
  - `var(--color-gray-400)` (#94A3B8) on `var(--color-gray-900)` (#0F172A) = ~5.5:1 -- passes AA.
  - `var(--color-indigo-600)` (#4F46E5) on white = ~5.5:1 -- passes AA.
- Use semantic HTML elements: `<header>`, `<main>`, `<section>`, `<footer>`, `<article>` (for cards).
- Each section should have an appropriate heading hierarchy: the hero `<h1>`, section titles `<h2>`, card names `<h3>`.
- Card hover effects are decorative (no functional change), so no keyboard interaction is required beyond focus-visible styles matching the hover shadow.
- Add `role="list"` to the card grid and `role="listitem"` to each card, or use a `<ul>/<li>` structure with CSS overrides, so screen readers announce the roster as a list of 6 agents.
- The step numbers are decorative; screen readers should still get a logical reading order (the numbered content flows naturally without the visual circles).

---

## 9. Summary of Visual Rhythm

| Section          | Background   | Vertical Padding (mobile) | Vertical Padding (desktop) |
|------------------|-------------|---------------------------|----------------------------|
| Hero             | White        | 64px top / 48px bottom    | 96px top / 64px bottom     |
| Team Roster      | Gray-50      | 64px                      | 80px                       |
| How It Works     | White        | 64px                      | 80px                       |
| Footer           | Gray-900     | 32px                      | 32px                       |

The alternating white/gray/white/dark pattern creates natural visual separation between sections without needing horizontal rules or dividers.

---

## 10. Things Intentionally Left Out

- **No animations on page load.** Keep it static for v1. We can add scroll-triggered fade-ins later if we want.
- **No dark mode.** Out of scope for milestone 1.
- **No custom illustrations or icons.** The monogram circles serve as simple, no-asset avatars. If we want real icons later, that is a future iteration.
- **No CTA buttons.** Per the requirements, this is informational only.
