# TeamHQ Landing Page Redesign - Requirements

## Goal

Transform the TeamHQ landing page from a standalone informational page into the central hub for Sherlock Labs' AI product team. The page should link out to all tools the team builds and adopt a dark theme consistent with the OST Tool's aesthetic.

## Why

The current light-themed page works as a team roster, but it doesn't serve as a hub. As the team ships more tools (starting with the OST Tool), TeamHQ needs a navigation structure and a dedicated section to showcase and link to those tools. The dark theme aligns all Sherlock Labs products under a unified visual identity.

---

## What's Changing

### 1. Dark Theme (Global)

Switch from the current light theme (white/gray backgrounds) to a dark theme matching the OST Tool.

**Color palette to adopt:**
- Page background: `#09090b` (zinc-950)
- Card/surface background: `#18181b` (zinc-900)
- Borders: `#27272a` (zinc-800)
- Primary text: `#d4d4d8` (zinc-300)
- Secondary text: `#a1a1aa` (zinc-400)
- Muted text: `#52525b` (zinc-600)
- Primary accent: `#6366f1` (indigo-500)
- Accent hover: `#818cf8` (indigo-400)
- Accent background (subtle): `rgba(99, 102, 241, 0.1)` (indigo-500 at 10% opacity)

**Typography:**
- Font family: `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Keep the existing type scale; just update the font stack to lead with Inter (matching the OST Tool)

**General rules:**
- All backgrounds become dark (zinc-950 for page, zinc-900 for cards/elevated surfaces)
- All text becomes light (zinc-300 for primary, zinc-400 for secondary)
- Borders become zinc-800
- Shadows should be subtle or removed (they don't add much on dark backgrounds)

### 2. "Sherlock Labs" Badge (Readability Fix)

The hero badge currently uses `color-accent` on `color-accent-light` (indigo on light indigo). On the new dark background, update it to:
- Text: indigo-400 (`#818cf8`) for better readability
- Background: indigo-500 at 10% opacity for a subtle glow
- Ensure WCAG AA contrast ratio (4.5:1 minimum) against the dark background

### 3. Navigation Bar (New)

Add a fixed/sticky top navigation bar with:
- **Left:** "TeamHQ" branding text (small, bold, tracking-wide) with a "Sherlock Labs" sub-label (smaller, muted) - matching the OST Tool's header pattern
- **Right:** Navigation links for the page sections:
  - "Team" - scrolls to the team roster section
  - "How It Works" - scrolls to the how-it-works section
  - "Tools" - scrolls to the new tools section
- **Style:** Dark background (zinc-950 or zinc-900) with a bottom border (zinc-800), consistent with the OST Tool header
- **Behavior:** Smooth scroll to sections on click. No JavaScript framework needed - use CSS `scroll-behavior: smooth` on `html` and anchor links

### 4. Tools Section (New)

Add a new section between the Hero and Team Roster called "Tools". This is where the team showcases tools they've built.

**Structure:**
- Section heading: "Tools" with subtitle "What we've built."
- Tool cards in a grid (similar to the agent cards but adapted for tools)
- Each tool card should include:
  - Tool name (e.g., "OST Tool")
  - Short description (e.g., "Generate Opportunity Solution Trees with AI to explore product opportunities, debate solutions, and get recommendations.")
  - Status badge (e.g., "Live", "Coming Soon")
  - A "Launch" link/button that opens the tool URL

**First tool to include:**
- Name: OST Tool
- Description: Generate Opportunity Solution Trees with AI to explore product opportunities, debate solutions, and get recommendations.
- Status: Live
- URL: `http://localhost:5173` (launch in new tab)

**Layout:** Start with a single-column or two-column grid. The card should be wider than agent cards since there will be fewer tools than team members initially. A 1-2 column layout with cards that span more horizontal space works well.

### 5. Team Roster Section (Update)

Keep the existing content (6 agent cards with names, roles, descriptions) but apply the dark theme:
- Card background: zinc-900
- Card border: zinc-800
- Avatar circle: indigo-500 at 10% opacity background, indigo-400 text
- Name text: zinc-100 or zinc-200
- Role text: indigo-400
- Description text: zinc-400
- Hover effect: subtle border color change or glow rather than shadow + translateY (shadows don't work well on dark)

### 6. How It Works Section (Update)

Keep the 4 steps content, apply dark theme:
- Step number circles: keep indigo-500 bg with white text
- Step titles: zinc-200
- Step descriptions: zinc-400
- Connecting line on desktop: zinc-800

### 7. Hero Section (Update)

Apply dark theme to existing content:
- Headline: zinc-100
- Subhead: zinc-400
- Badge: see section 2 above
- Consider whether the headline text should be updated to reflect the "hub" concept (optional, not required)

### 8. Footer (Update)

The footer is already dark (gray-900). Adjust to match the new palette:
- Background: zinc-900 (or keep zinc-950 to blend with page, with a top border of zinc-800 to delineate)
- "TeamHQ" text: zinc-100
- Attribution text: zinc-500

---

## Section Order (Top to Bottom)

1. Navigation bar (sticky)
2. Hero
3. Tools (new)
4. Team Roster
5. How It Works
6. Footer

---

## Acceptance Criteria

1. The page uses a dark theme with zinc-950 page background, zinc-900 card surfaces, zinc-800 borders, and indigo-500 accents
2. The "Sherlock Labs" badge in the hero is legible with sufficient contrast (WCAG AA)
3. A top navigation bar is present with links to Team, How It Works, and Tools sections
4. Navigation links smooth-scroll to their target sections
5. A "Tools" section appears between the Hero and Team Roster
6. The OST Tool card displays with name, description, status badge ("Live"), and a "Launch" link/button
7. The "Launch" link opens `http://localhost:5173` in a new tab
8. All existing content (6 agent cards, 4 workflow steps) is preserved and readable
9. The page remains responsive across mobile, tablet, and desktop breakpoints
10. No JavaScript framework or build step is introduced - plain HTML/CSS only (JS is acceptable only for minimal interactions like scroll behavior if CSS alone doesn't suffice)
11. The visual style is consistent with the OST Tool's aesthetic (Inter font, zinc backgrounds, indigo accents)

---

## Out of Scope

- No changes to the OST Tool itself
- No backend or API work
- No authentication or user accounts
- No dynamic data loading (tool list is hardcoded for now)
- No mobile hamburger menu (nav links can wrap naturally on smaller screens)
- No new pages - this is a single-page update
- No build tooling (Vite, webpack, etc.) - keep it as plain HTML/CSS files
