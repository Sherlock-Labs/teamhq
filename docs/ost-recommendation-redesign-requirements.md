# OST Recommendation Page Redesign

## Problem Statement

The recommendation/final page of the OST tool (`RecommendationView.tsx`) has two core problems:

1. **Color overload**: There are 11 distinct persona badge colors, 3 score-indicator colors, 3 impact-bar colors, and colored borders on the Risks/First Steps/Deprioritize columns. This creates a chaotic visual experience where nothing stands out because everything is colorful. The user's words: "there's too many colors going on... repeated colors and weird contrasts."

2. **Hidden debater reasoning**: Each solution's persona breakdown shows colored pills with a hover-only `title` attribute. This means the reasoning behind each debater's score is invisible unless you happen to hover over the exact right pill. It's not discoverable and doesn't work at all on touch devices. The user wants a way to "very easily expand and see what they thought."

## Current Implementation

The page has five sections stacked vertically:
1. **Hero** -- recommendation text + confidence badge (indigo)
2. **Impact Ranking** -- horizontal bar chart per solution, each with impact score/10, rationale text, and a row of colored persona pills (11 possible colors) showing individual scores
3. **Rationale** -- markdown block
4. **Risks / First Steps / Deprioritize** -- three-column grid with colored borders (red, emerald, gray)
5. **Start Over** button

### Color inventory (the problem, visually)

| Element | Colors Used |
|---------|------------|
| Persona badge backgrounds | emerald, amber, violet, cyan, orange, pink, yellow, blue, red, fuchsia, rose (11 colors) |
| Persona badge text | same 11 colors at different opacity |
| Score indicators | emerald (>=7), amber (4-6), red (<4) |
| Impact bars | emerald (>=8), indigo (5-7), zinc (<5) |
| Hero border/gradient | indigo |
| Risks column | red border + red text |
| First Steps column | emerald border + emerald text |
| Deprioritize column | gray border + gray text |

That's roughly 15+ distinct hues competing for attention on a single page.

## Requirements

### R1: Reduce the color palette to a restrained system

**Goal**: Establish a clear visual hierarchy using fewer, more intentional colors.

**Acceptance Criteria**:
- The page should use at most 3 accent colors beyond the base zinc/gray palette
- Persona badges should NOT each have a unique color. Use a single, neutral badge style for all personas (e.g., zinc/slate tones)
- Score indicators (the 1-10 numbers) can use a simple 3-tier color scale (good / neutral / poor) -- this is the ONE place color should do heavy lifting
- Impact bars should use a single accent color (e.g., indigo) with opacity/intensity variation for score magnitude, not different hues for different ranges
- The Risks / First Steps / Deprioritize columns should use subtle differentiation (icons or labels) rather than strong colored borders
- The hero section should remain visually distinct but shouldn't fight with the rest of the page

### R2: Replace hover tooltips with expandable debater reasoning

**Goal**: Make each debater's reasoning for each solution easily accessible without hover.

**Acceptance Criteria**:
- Each solution in the Impact Ranking section should display its persona scores in a vertical list (not wrapped pills)
- Each debater entry shows: persona name, score, and a way to see their reasoning
- The reasoning should be revealed via an **expandable/collapsible section** (click to expand, click to collapse) -- similar to a `<details>` element or accordion pattern
- All debater entries should be collapsed by default to keep the page scannable
- Expanded reasoning should show the debater's one-sentence reason for their score on that specific solution
- Consider an "Expand All / Collapse All" toggle for power users who want to compare reasoning across debaters

**Alternative considered**: A modal that appears when you click a persona pill. Rejected because modals break the flow of comparison -- users want to scan multiple debaters' reasoning for the same solution without opening/closing modals repeatedly. Accordion/expandable is better for this use case.

### R3: Improve information hierarchy and scannability

**Goal**: Make it easy to quickly parse the page and find what matters.

**Acceptance Criteria**:
- Solution names and scores should be the most prominent elements in the Impact Ranking section
- Debater persona breakdowns should be visually subordinate to the solution-level information
- The overall page flow should feel like: recommendation (the headline) -> solution ranking (the data) -> supporting rationale and details -> action items
- Adequate whitespace and visual separation between sections
- Consider using rank numbers (1, 2, 3...) next to solutions to reinforce the ordering

## Scope

### In scope
- Visual redesign of `RecommendationView.tsx` (CSS/Tailwind classes + JSX structure)
- Replacing the `PersonaBreakdown` component with an expandable list design
- Updating the `PERSONA_BADGE_COLORS` mapping (or removing it) and `scoreColor` function
- Updating the `ImpactBar` component

### Out of scope
- Backend changes (no schema or API changes needed -- all data is already available)
- Changes to other views (DebateView, TreeView, etc.)
- Adding new data fields or debater perspectives

## Team Assignments

| Role | Person | Responsibility |
|------|--------|---------------|
| Product Designer | Robert | Design spec for the new layout, color system, and expandable interaction pattern |
| Front-End Developer | Alice | Implement the redesigned RecommendationView.tsx |
| QA Engineer | Enzo | Verify the implementation matches the design spec and all acceptance criteria |

**Note**: No architectural changes are needed (this is a pure frontend presentation change), so Andrei (Architect) is not required. No backend changes are needed, so Jonah (Backend) is not required.

## Dependencies

1. Robert (Design) must complete the design spec before Alice (FE) starts implementation
2. Alice (FE) must complete implementation before Enzo (QA) can verify
