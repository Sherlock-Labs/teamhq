# Roadmap Tool (Roadmunk Replica) — Product Research

**Researcher:** Suki (Product Researcher)
**Date:** 2026-02-10
**Research target:** **Roadmunk** (roadmunk.com), now branded as "Strategic Roadmaps" by Tempo
**Product name:** Roadmunk (note: NOT "Roadmonk" — the correct spelling is Roadmunk)
**Scope:** Full product teardown — features, UX, information architecture, visual design, pricing, user sentiment
**Excluded:** Jira integration (later phase)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Information Architecture & Entity Model](#2-information-architecture--entity-model)
3. [Core Views & Visualization](#3-core-views--visualization)
4. [Item Management](#4-item-management)
5. [Fields System](#5-fields-system)
6. [Milestones](#6-milestones)
7. [Formatting & Visual Design](#7-formatting--visual-design)
8. [Feedback & Idea Management](#8-feedback--idea-management)
9. [Portfolio Roadmapping](#9-portfolio-roadmapping)
10. [Sharing, Collaboration & Publishing](#10-sharing-collaboration--publishing)
11. [Navigation & Workspace Organization](#11-navigation--workspace-organization)
12. [System Limits & Constraints](#12-system-limits--constraints)
13. [UX Flow Mapping](#13-ux-flow-mapping)
14. [Pricing & Plans](#14-pricing--plans)
15. [User Sentiment Analysis](#15-user-sentiment-analysis)
16. [Competitive Positioning](#16-competitive-positioning)
17. [Recommendations for Our Build](#17-recommendations-for-our-build)

---

## 1. Product Overview

**What it is:** Roadmunk (now "Strategic Roadmaps" after Tempo acquisition) is a cloud-based product roadmap visualization and planning tool. It helps product teams create, collaborate on, and present boardroom-ready roadmaps.

**Tagline:** "Product Roadmap Software & Roadmap Tool"

**Target audience:** Product managers, directors of product, CTOs, VP of Product, project managers at companies of 50-5,000+ employees. Industries: technology, SaaS, product development.

**Notable customers:** Microsoft, Visa, FedEx, Hulu

**Key value propositions:**
- Beautiful, presentation-ready roadmap visualizations (Timeline + Swimlane)
- Multiple views of the same underlying data for different audiences
- Feedback collection and idea prioritization built into the roadmapping flow
- Portfolio-level roll-up across multiple team roadmaps
- Export to URL, PNG, HTML for stakeholder sharing

**Acquisition note:** Roadmunk was acquired by Tempo (tempo.io) and rebranded as "Strategic Roadmaps." Help docs have migrated from support.roadmunk.com to help.tempo.io. The product domain roadmunk.com now redirects many pages to tempo.io.

Sources: [Roadmunk main site](https://roadmunk.com), [Tempo Help Center](https://help.tempo.io/roadmaps/latest/), [Dimmo review](https://www.dimmo.ai/products/Roadmunk)

---

## 2. Information Architecture & Entity Model

This is the core data model that underpins everything in Roadmunk. Understanding these entities and their relationships is critical for our replica.

### Primary Entities

| Entity | Description | Key Properties |
|--------|-------------|----------------|
| **Roadmap** | Top-level container for all planning data | Name, owner, fiscal year setting, sharing settings, collections membership |
| **Item** | The core work unit — initiatives, projects, tasks, releases | Name, description (10K char limit), dates (start/end), bucket, fields, sub-items, linked items, key dates, attachments (10MB/file) |
| **Sub-Item** | Child items nested under parent items | Same properties as items; parent-child relationship; max 25 per parent |
| **Milestone** | Single-day event markers (releases, launches, board meetings) | Name, date, milestone type, custom icon/shape/color; Timeline-only (not in Swimlanes) |
| **Field** | Categories/attributes used to organize, group, filter, and pivot data | Name, type (List, Numeric, etc.), values, description (200 char), level (roadmap or account) |
| **Field Value** | Individual options within a field (e.g., "In Progress" within Status field) | Name, color assignment, ordering, grouping (Value Groups for 10+ values) |
| **View** | A saved visualization configuration of roadmap data | Name, type (Timeline/Swimlane/Table), filters, formatting, headers |
| **Key Date** | Secondary date markers within an item showing phases/stages | Name, date; attached to items or sub-items |
| **Linked Item** | Cross-item or cross-roadmap relationships | Type: Blocking, Moves With, Relates To; auto-enforced date adjustments |
| **Collection** | Organizational folder for grouping roadmaps | Name, roadmap membership; admin-created, visible to all |
| **Idea** | Feedback-driven feature suggestion | Score (RICE/custom), linked feedback, connected roadmap items |
| **Customer** | Feedback source entity | Linked to ideas and feedback |

### Entity Relationships

```
Account
  |-- Collections (folders)
  |-- Account-Level Fields (shared across roadmaps)
  |-- Roadmaps
        |-- Roadmap-Level Fields (scoped to this roadmap)
        |-- Items
        |     |-- Sub-Items (max 25 per parent)
        |     |-- Key Dates
        |     |-- Field Values (assigned)
        |     |-- Linked Items (cross-item, cross-roadmap)
        |     |-- Ideas (connected from feedback)
        |     |-- Attachments
        |     |-- Comments
        |
        |-- Milestones (Timeline-only)
        |     |-- Milestone Type
        |
        |-- Views (multiple per roadmap)
              |-- Filters
              |-- Header configuration
              |-- Color palette
              |-- Formatting settings

Portfolio Roadmap (special type)
  |-- Source Roadmaps (rolled up)
  |-- Aggregated Items (from sources)
```

### Buckets (No-Date Alternative)

Instead of exact dates, items can use **Buckets** — fuzzy time periods like "Soon", "Future", "Never". This is key for agile teams who don't commit to specific dates.

Sources: [Roadmunk Glossary](https://help.tempo.io/roadmaps/latest/glossary), [101 Basics](https://help.tempo.io/roadmaps/latest/strategic-roadmaps-101-roadmapping-basics)

---

## 3. Core Views & Visualization

Roadmunk has three view types. All views operate on the same underlying data — you create multiple views to show different slices to different audiences.

### 3.1 Table View

The spreadsheet-like view of all roadmap data.

- **Purpose:** Data entry, bulk editing, complete data visibility
- **Features:**
  - Inline item creation (hover between rows, click green + icon)
  - Arrow key navigation (spreadsheet-style)
  - Bulk select and edit (up to 100 items per action)
  - Column sorting and filtering
  - Items Table (per-view, filterable) vs. All Data Table (unfiltered source of truth)
  - Milestones Table (separate tab for milestone data)
- **Key interaction:** Click any item row to open the Item Card detail panel

### 3.2 Timeline View

The time-oriented Gantt-like visualization. This is Roadmunk's signature view.

- **Purpose:** Date-based planning, stakeholder presentations, release planning
- **Structure:**
  - **Date Header** (top): Horizontal time axis with configurable scale
  - **Headers** (left side): Theme-based groupings using any field as pivot
  - **Sub-Headers** (optional): Second-level grouping under headers
  - **Streams:** Horizontal lanes within each header
  - **Tracks:** Individual rows where items sit within streams
  - **Time Slider:** Draggable bar for zooming into date ranges

- **Time Scale Options (Time Period Indicators):**
  - Weeks (up to 2 years display)
  - Months (up to 5 years)
  - Quarters (up to 8 years)
  - Halves (up to 15 years)
  - Years

- **Item rendering:**
  - Items displayed as horizontal bars spanning start-to-end date
  - Item name label (configurable: above or inside the bar via Theme Orientation)
  - Label Suffix: optional additional field value appended to item name
  - Color-coded by any list field
  - Sub-items can be shown nested under parents or as standalone items

- **Milestones:** Displayed as shaped/colored icons along the timeline (diamond, circle, etc.)
- **Drag & drop:** Move items vertically to different streams; hold Shift to prevent date changes
- **Max items per view:** 350

- **Date Preferences:**
  - Calendar year or Fiscal year display
  - Fiscal year-end configurable at account level
  - Date range controls for visible period

### 3.3 Swimlane View

The theme-oriented grid visualization. Best for agile/no-dates roadmaps.

- **Purpose:** Agile roadmaps, sprint planning, theme-based organization
- **Structure:**
  - **Column Header** (horizontal pivot): Any field, item dates, parent items, or custom field
  - **Row Header** (vertical pivot): Any roadmap field
  - **Group Rows By** (optional): Additional grouping layer using List, Multi-Select, or Team Member fields
  - Items appear as cards at column/row intersections

- **Card display modes:**
  - **Standard:** Shows name, dates/buckets, description, labels, progress, details, sub-items
  - **Compact:** Limited data (name, dates, description, progress, sub-items)

- **Key difference from Timeline:** No milestones; both axes are customizable (vs. Timeline's fixed time axis)
- **Inversion Arrows:** Swap row and column headers with one click
- **Item details chips:** Small indicators showing linked items count, key dates, comments, attachments

Sources: [Timeline View](https://help.tempo.io/roadmaps/latest/getting-started-in-the-timeline-view), [Swimlane View](https://help.tempo.io/roadmaps/latest/getting-started-in-the-swimlane-view), [103 Tips](https://help.tempo.io/roadmaps/latest/strategic-roadmaps-103-tips-and-tricks)

---

## 4. Item Management

### Item Card (Detail Panel)

Clicking any item opens a two-panel detail card:

**Left: Context Sub-Panel (4 tabs)**
1. **Overview Tab** — Item description (WYSIWYG editor, 10K char limit with markdown: bold, italic, underline, links, images, tables) + file attachments (10MB/file)
2. **Linked Items Tab** — In-Roadmap links, Cross-Roadmap links, Integrated Item Links (from Jira, etc.)
3. **Sub-Items Tab** — Create and manage parent-child item relationships
4. **Ideas Tab** — Connected ideas from the feedback system

**Right: Details Sub-Panel (2 tabs, collapsible)**
1. **Fields Tab** — Assigned dates, buckets, key dates, all field values
2. **Activity Tab** — Complete audit log of all changes + comment thread for collaboration

**Item Card Actions:**
- Copy Item URL
- Duplicate Item
- Delete Item
- Sync Now (trigger integration sync)
- Save options: Save & Close, Save Without Closing, Save & Create Another

### Item Creation Methods

1. **Items Table:** Inline creation (hover between rows, click green +)
2. **Timeline View:** Quick Actions menu to position on timeline
3. **Swimlane View:** Inline triggers, Quick Actions, or empty state helper
4. **CSV Import:** Bulk import from spreadsheet
5. **Integration sync:** From Jira, Azure DevOps, GitHub, etc.

### Linked Items (Dependencies)

Three relationship types:
1. **Blocking** — Item A blocks Item B (auto-enforces dates)
2. **Moves With** — Items move together when either is rescheduled (auto-enforces dates)
3. **Relates To** — Loose association, no date enforcement

Limits: Max 30 items per Blocking/Moves With chain; unlimited for Relates To

### Sub-Items

- Max 25 sub-items per parent item
- Same properties as regular items (dates, fields, key dates, etc.)
- Display options: nested under parent OR standalone (breaks parent-child visual)
- Can have their own linked items, key dates, and milestones

Sources: [Item Card](https://help.tempo.io/roadmaps/latest/exploring-the-item-card), [Creating Items](https://help.tempo.io/roadmaps/latest/creating-and-managing-items-in-roadmunk)

---

## 5. Fields System

Fields are the flexible metadata system that powers Roadmunk's pivoting, filtering, and color-coding.

### Field Levels

| Level | Scope | Use Case |
|-------|-------|----------|
| **Roadmap Field** | Single roadmap only | Team-specific attributes |
| **Account Field** | Shared across all roadmaps | Company-wide categories (Status, Priority, etc.) |

Roadmap fields can be **promoted** to account level (permanent, irreversible). Account fields can be **favorited** for quick access.

### Field Types

- **List** — Single-select dropdown (most common; ONLY type that can be used for color coding)
- **Multi-Select** — Multiple values per item
- **Numeric** — Numbers with sub-formats (Currency, Percentage — interchangeable)
- **Team Members** — User assignment
- **Date** — Start/end dates for items
- **Text** — Free-form text

Field types are static — cannot be converted between types.

### Built-in Fields (System)

Every roadmap starts with these:
- **Name** (item name)
- **Date** (start and end dates)
- **Milestone Type** (for milestones)
- **Source** (which roadmap exported the item — for cross-roadmap work)
- **External ID** / **Internal ID** (for import/export matching)

### Field Operations

- **Merge:** Combine duplicate fields (same type required, can't coexist in non-portfolio roadmaps)
- **Suggested Merges:** System recommends up to 500 potential merges based on similarity
- **Archive:** Dormant but accessible state
- **Restore:** Reactivate archived fields
- **Reorder:** Drag-and-drop in visualization or Field Card
- **Value Groups:** For fields with 10+ values, organize into focused groups

### How Fields Drive Views

Fields are used for:
- **Headers/Sub-Headers** — Grouping items on Timeline and Swimlane views
- **Color coding** — Only List fields (6 default palettes + custom)
- **Filtering** — Show/hide items based on field values
- **Pivoting** — Both axes on Swimlane, vertical axis on Timeline
- **Label Suffix** — Extra info on item labels

Sources: [Managing Fields](https://help.tempo.io/roadmaps/latest/managing-fields), [Glossary](https://help.tempo.io/roadmaps/latest/glossary)

---

## 6. Milestones

### Default Types

Three built-in: **Tradeshow**, **Release**, **Product Launch**. Unlimited custom types can be added.

### Visual Customization

- Each milestone type has a configurable **shape** and **color**
- Shapes: diamond, circle, and others (exact shape catalog unclear from docs)
- Colors: customizable via Format panel's Colors tab
- Toggle to show/hide milestone labels and dates on timeline

### Milestone Table

Default fields: Milestones (name), Date, Milestone Type. Additional custom fields can be added.

### Constraints

- **Timeline-only:** Milestones do NOT appear on Swimlane views
- Affected by view filters (hidden if they don't match the filter set)
- Only Owners/Editors can create; Viewers are read-only

Sources: [Milestones](https://help.tempo.io/roadmaps/latest/milestones)

---

## 7. Formatting & Visual Design

### Format Panel

The central control panel for visual customization. Accessible via Format icon on any view.

**Timeline-specific controls:**
- Header field selection (primary + sub-header)
- Theme Orientation: item name displayed above or inside the duration bar
- Header Orientation: horizontal or vertical stacking
- Hide Empty Headers toggle
- Time scale selection (weeks/months/quarters/halves/years)
- Date range and fiscal year settings
- Compact vs. Original layout themes

**Swimlane-specific controls:**
- Column Header field selection
- Row Header field selection
- Group Rows By option
- Card display mode: Standard vs. Compact
- Header height adjustment
- Inversion arrows (swap row/column headers)

### Color Palettes

**6 default palettes:** Citrus, Groovy, Pastel, Autumn, Neon, Ocean

**Custom palettes:**
- Color picker for manual adjustment
- Hex code entry for brand colors
- Max 12 preset colors per palette + unlimited custom
- Colors assigned to field values (List fields only)
- Drag-and-drop to reassign value-to-color mapping
- Color palette locking (owner can lock to prevent changes)

**Legend:** Auto-generated showing current color assignments; appears with custom/default palettes but not with base palette.

### Emoji Support

Items and fields can use emojis for visual categorization (status indicators, region flags, etc.)

Sources: [Color Palettes](https://support.roadmunk.com/hc/en-us/articles/360043233954), [Format Panel](https://help.tempo.io/roadmaps/latest/formatting-customization), [103 Tips](https://help.tempo.io/roadmaps/latest/strategic-roadmaps-103-tips-and-tricks)

---

## 8. Feedback & Idea Management

This is a distinct module within Roadmunk — not just roadmapping, but a feedback-to-roadmap pipeline.

### Feedback Collection

- **Chrome Extension:** Customer-facing teams (sales, support, success) can submit feedback from email, CRMs, support chats, any browser tool
- **Centralized Feedback Inbox:** All feedback flows into one organized inbox for product managers
- **Customer Tracking:** Feedback linked to customer entities for source tracking

### Idea Management

- Ideas are created from or linked to feedback
- Ideas live in a separate backlog that can be connected to roadmap items
- One-click promotion: "promote" a prioritized idea to the roadmap

### Prioritization Frameworks

Two built-in templates:
1. **R.I.C.E.** — (Reach x Impact x Confidence) / Effort = score
2. **Value vs. Effort** — Simple 2x2 prioritization

Custom prioritization models can also be created with weighted scoring.

### Availability

- Starter plan: No feedback features
- Business plan and up: Feedback portals, idea prioritization included

Sources: [Feedback Management](https://www.tempo.io/products/roadmaps/feedback-and-idea-management), [Idea Scoring](https://support.roadmunk.com/hc/en-us/articles/360042588113), [RICE](https://roadmunk.com/guides/rice-score-prioritization-framework-product-management/)

---

## 9. Portfolio Roadmapping

### How it Works

Portfolio roadmaps aggregate multiple source roadmaps into a single bird's-eye view.

- Roll up 2+ source roadmaps into one Portfolio roadmap
- Available as Timeline or Swimlane visualization
- Uses **Common Fields** (account-level fields present in multiple source roadmaps) for pivoting
- Source roadmap owners retain edit rights for their items even in the portfolio view
- Account Admins have full editing across all portfolio items
- Shared users get view-only access by default

### Portfolio-Specific Features

- Account-level fields can be created directly from within Portfolio roadmaps
- Portfolio formatting options (Format Layout & Colors) are a distinct set from regular roadmaps
- Standalone Sub-Items formatting option available

Sources: [Portfolio Roadmapping](https://support.roadmunk.com/hc/en-us/articles/360043262634)

---

## 10. Sharing, Collaboration & Publishing

### Permission Model

| Role | Can View | Can Edit | Can Share | Notes |
|------|----------|----------|-----------|-------|
| **Owner** | Yes | Yes | Yes | Creator of the roadmap |
| **Editor** | Yes | Yes | No | Must be a Collaborator role user |
| **Viewer** | Yes | No (can comment) | No | Can be Collaborator or Reviewer role |

### Publishing/Export Options

| Format | Description | Features |
|--------|-------------|----------|
| **URL** | Shareable link to hosted image | Password protection available |
| **PNG** | Static image export | Boardroom-ready |
| **HTML** | Interactive export | Clickable elements |
| **CSV** | Data export | Raw data |
| **ICS** | Calendar sync | iCalendar format |

### Presentation Mode

- Full-screen, read-only view of the roadmap
- No accidental edits during presentation
- Accessible from Timeline or Swimlane views via "Present" button
- "Boardroom-ready in seconds"

### Collaboration Features

- **Comments & Mentions:** On items, visible in Activity Tab
- **Team Member Fields:** Auto-notify assigned users on changes
- **Email Notifications:** Alert users when added as viewer (configurable)
- **Activity Feed:** Complete audit trail per item
- **Mobile viewing:** Roadmaps accessible on mobile devices (view-only)

### Branding

- Company logo can be added to roadmaps
- Vision statement text overlay
- Custom color palettes for brand alignment
- Exporting Settings Menu controls what appears in exports (hide fields, show vision statement, etc.)

Sources: [Sharing & Collaboration](https://help.tempo.io/roadmaps/latest/sharing-collaboration-in-roadmaps), [Publishing](https://support.roadmunk.com/hc/en-us/articles/360044355734)

---

## 11. Navigation & Workspace Organization

### Roadmaps Homepage

- Landing page with roadmap lists: My Roadmaps, Shared with Me, Recently Viewed
- Favorite roadmaps for quick access
- Global search across all roadmaps and items

### Collections (Folders)

- Admin-created organizational folders for roadmaps
- Roadmaps can belong to multiple collections
- Bulk adding supported
- Visible to all users once created

### Navigation Structure

- Tempo Navigation Bar (left side)
- Breadcrumbs for location tracking
- View dropdown for switching between Table/Timeline/Swimlane views
- Format panel (right side) for visual customization

### Account-Level Settings

- Fiscal Year-End configuration
- User management (add/manage users, roles, permissions)
- Team creation for permission groups
- SSO/SAML (Okta, Microsoft Entra, OneLogin, PingID)
- Two-factor authentication
- IP allowlisting
- Password strength management

Sources: [Glossary](https://help.tempo.io/roadmaps/latest/glossary), [Collections](https://support.roadmunk.com/hc/en-us/articles/21504050307095)

---

## 12. System Limits & Constraints

These are critical for implementation planning.

| Limit | Value |
|-------|-------|
| Items per Timeline view | 350 |
| Sub-items per parent | 25 |
| Linked Items per chain (Blocking/Moves With) | 30 |
| Linked Items (Relates To) | Unlimited |
| Bulk edit operations | 100 items per action |
| Item description | 10,000 characters (incl. markdown) |
| Field description | 200 characters |
| File attachment size | 10 MB per file |
| Storage per plan | 1 GB (Starter) to 100 GB (Enterprise) |
| Timeline display range | 2yr (weeks), 5yr (months), 8yr (quarters), 15yr (halves) |
| Color palette presets | 12 per palette + unlimited custom |
| Default color palettes | 6 (Citrus, Groovy, Pastel, Autumn, Neon, Ocean) |
| Default milestone types | 3 (Tradeshow, Release, Product Launch) |

Sources: [103 Tips](https://help.tempo.io/roadmaps/latest/strategic-roadmaps-103-tips-and-tricks)

---

## 13. UX Flow Mapping

### Flow 1: Create a New Roadmap from Scratch

1. Click "New Roadmap" on Roadmaps Homepage
2. Enter roadmap name
3. Optionally select a template (35+ available) or start blank
4. Optionally set fiscal year-end
5. Land on Table View (Items Table) — empty state
6. Add items inline (hover between rows, click green +, type name, press Enter)
7. Add fields as columns (system fields pre-populated; add custom)
8. Fill in field values for each item
9. Switch to Timeline or Swimlane view to visualize

### Flow 2: Create a Timeline Visualization

1. From View dropdown, select "Add New View"
2. Name the view
3. Choose "Timeline" visualization type
4. Optionally copy filters from existing view
5. Click Create
6. Configure Format Panel: select header field, sub-header, colors, time scale
7. Adjust time range with time slider
8. Items auto-populate based on their dates and field values
9. Drag items vertically to organize streams
10. Add milestones via Quick Actions or Milestones Table

### Flow 3: Add an Item to a Roadmap

1. **From Table:** Hover between rows, click green +, type name, Enter
2. **From Timeline:** Quick Actions menu > position on timeline (auto-populates date and filter values)
3. **From Swimlane:** Click inline trigger or Quick Actions
4. **From Item Card:** Fill out details — description, dates, fields, sub-items
5. Save & Close, Save Without Closing, or Save & Create Another

### Flow 4: Share a Roadmap with Stakeholders

1. Click "Share" button at top of open roadmap (or "Members" from homepage)
2. Add users by name/email
3. Set permission level (Editor or Viewer)
4. Save — users receive email notification
5. **OR** publish to URL/PNG/HTML via Export Preview button
6. Optionally set password for URL publishing

### Flow 5: Feedback to Roadmap Pipeline

1. Customer-facing team member uses Chrome extension to submit feedback
2. Feedback appears in centralized Feedback Inbox
3. PM reviews feedback, creates/links to Ideas
4. PM scores ideas using RICE or Value vs. Effort
5. Highest-scoring ideas promoted to roadmap items
6. Ideas remain linked to the roadmap item for traceability

### Flow 6: Create a Portfolio Roadmap

1. Create new Portfolio Roadmap
2. Select 2+ source roadmaps to roll up
3. Choose Timeline or Swimlane visualization
4. System aggregates items from all source roadmaps
5. Pivot by Common Fields (account-level fields shared across sources)
6. Source roadmap owners can still edit their own items in the portfolio view

Sources: [101 Basics](https://help.tempo.io/roadmaps/latest/strategic-roadmaps-101-roadmapping-basics), [102 Beyond Basics](https://help.tempo.io/roadmaps/latest/strategic-roadmaps-102-beyond-the-roadmapping-basi)

---

## 14. Pricing & Plans

All prices are per editor per month, billed annually. Data gathered 2026-02-10.

| Feature | Starter ($19) | Business ($49) | Professional ($99) | Enterprise (Custom) |
|---------|--------------|----------------|--------------------|--------------------|
| Unlimited roadmaps | Yes | Yes | Yes | Yes |
| Included reviewers | 3 | 5 | 10 | Custom |
| Additional reviewers | $5/mo each | $5/mo each | $5/mo each | Custom |
| API tokens | 0 | 1 | 5 | Custom |
| File storage | 1 GB | 5 GB | 10 GB | 100 GB |
| One-way integrations | Yes | Yes | Yes | Yes |
| Two-way Jira/Azure sync | No | $9/collaborator add-on | Included | Included |
| Feedback portals | No | Yes | Yes | Yes |
| Idea prioritization | No | Yes | Yes | Yes |
| Portfolio roadmaps | No | Yes | Yes | Yes |
| Dependencies | No | Yes | Yes | Yes |
| SSO/SAML | No | No | Yes | Yes |
| Private cloud | No | No | No | Yes |
| Advanced visualizations | No | No | Yes | Yes |
| Real-time publishing | No | No | Yes | Yes |

**Free trial:** 14 days with Business-tier features (minus API tokens). Includes native Jira integration trial.

Sources: [Pricing page](https://www.tempo.io/pricing/roadmaps), [Dimmo](https://www.dimmo.ai/products/Roadmunk), [CPO Club](https://cpoclub.com/tools/roadmunk-pricing/)

---

## 15. User Sentiment Analysis

### What Users Love (across G2, Capterra, TrustRadius)

| Theme | Evidence |
|-------|----------|
| **Visual quality** | "Boardroom-ready roadmaps"; timeline and swimlane visualizations consistently praised |
| **Multiple views** | Ability to create different views for different audiences from the same data is a top-cited feature |
| **Ease of getting started** | "Very easy to start a new roadmap manually or by CSV import" |
| **Customer support** | "Excellent support team, they get back with answers in almost real time" |
| **Sharing capabilities** | URL publishing with password protection well-received |
| **Portfolio roll-up** | "Master roadmap feature is critical for aggregating component-level roadmaps" |

### What Users Dislike

| Theme | Evidence |
|-------|----------|
| **Performance/speed** | "Sometimes slow"; "taking time to process changes and sometimes canceling an action" |
| **Pricing** | "A little pricey"; "restricting for small businesses or startups"; features gated to higher tiers |
| **Navigation inefficiency** | "8 steps/clicks to copy a single parent/child item from one roadmap to another" |
| **Limited integrations** | "Integration with other systems is rather poor"; users want more two-way syncs |
| **Learning curve** | "Features daunting, leading to a steeper learning curve" for new users |
| **Date picker UX** | Calendar date selection is "time-consuming"; users want type-in option |
| **Customization friction** | "Not easy to customize the look of each view, or the columns/headers" |
| **Ideas module** | "Too hard to get submissions from non-Roadmunk users with clunky integration" |

### Overall Ratings (approximate from review sites)

| Platform | Rating |
|----------|--------|
| Capterra | ~4.3/5 |
| G2 | ~4.0/5 |
| TrustRadius | ~7.5/10 |

Sources: [Capterra Reviews](https://www.capterra.com/p/145895/Roadmunk/reviews/), [TrustRadius Pros/Cons](https://www.trustradius.com/products/roadmunk/reviews?qs=pros-and-cons), [GetApp](https://www.getapp.com/collaboration-software/a/roadmunk/)

---

## 16. Competitive Positioning

### Roadmunk vs. Key Competitors

| Dimension | Roadmunk | Aha! | ProductPlan | Productboard |
|-----------|----------|------|-------------|--------------|
| **Focus** | Visualization + presentation | Full product management suite | Simple roadmap visualization | Customer insight + roadmapping |
| **Starting price** | $19/mo | $59/mo | $39/mo | ~$70K/yr for teams |
| **Visualization quality** | Excellent | Good | Excellent | Good |
| **Feedback/Ideas** | Built-in (Business+) | Built-in | No | Core strength |
| **Portfolio** | Yes (Business+) | Yes | Yes | Limited |
| **Complexity** | Medium | High | Low | Medium |
| **Target** | Mid-market PMs | Enterprise PMs | Startups/SMBs | Customer-driven PMs |
| **Integrations** | Limited | Extensive | Moderate | Moderate |

### Roadmunk's Competitive Moat

1. **Visualization-first approach:** Roadmunk leads on visual quality alongside ProductPlan
2. **Multi-view from single dataset:** Best-in-class audience-specific views
3. **Swimlane flexibility:** Unique no-dates visualization for agile teams
4. **Mid-market pricing sweet spot:** Between ProductPlan (simpler) and Aha! (more expensive)

### Key Differentiators for Our Build

Based on user complaints, these are the gaps we can exploit:
1. **Performance** — Roadmunk is reportedly slow; we can be fast
2. **Simpler navigation** — Reduce clicks for common operations
3. **Better date input** — Type-in dates, not just calendar picker
4. **Smoother onboarding** — Lower the learning curve
5. **Better pricing** — Don't gate core features to expensive tiers

Sources: [Rapidr alternatives](https://rapidr.io/blog/roadmunk-alternatives/), [FeatureBase alternatives](https://www.featurebase.app/blog/roadmunk-alternatives), [StackShare comparison](https://stackshare.io/stackups/aha-vs-productplan-vs-roadmunk)

---

## 17. Recommendations for Our Build

### Must-Have (Core Feature Parity)

These are the features that define Roadmunk and must be in v1:

1. **Timeline View** — Horizontal time axis, field-based vertical grouping (headers/sub-headers), items as duration bars, milestones as icons, time slider for zooming, configurable time scales (weeks/months/quarters/halves/years)
2. **Swimlane View** — Fully customizable row/column pivots using any field, card-based item display, standard + compact card modes
3. **Table View** — Spreadsheet-like data entry with inline creation, keyboard navigation, bulk editing
4. **Items with full property model** — Name, description (rich text), dates OR buckets, fields, sub-items, key dates, linked items (blocking/moves with/relates to), attachments
5. **Flexible Fields System** — List/Numeric/Text/Team Member types, values, used for pivoting/filtering/coloring; roadmap-level and account-level scoping
6. **Milestones** — Custom types with shape/color, timeline-only display, date-based positioning
7. **Multiple views per roadmap** — Different filter/formatting configurations of the same data
8. **Color palettes** — Default presets + custom hex-based palettes, assigned to list field values
9. **Filtering** — Per-view filters that control which items and milestones are visible
10. **Export/Publish** — PNG, URL (with password), presentation mode
11. **Sharing** — Owner/Editor/Viewer permissions, team-based access

### Should-Have (High Value, Can Be Fast-Followed)

12. **Portfolio roadmapping** — Roll-up of multiple roadmaps
13. **Linked items with auto-date enforcement** — Blocking and Moves With constraints
14. **CSV import/export**
15. **Collections** — Folder organization for roadmaps
16. **Drag-and-drop on Timeline** — Reposition items, Shift-drag for vertical only
17. **Presentation mode** — Full-screen, read-only display

### Could-Have (Differentiation Opportunities)

18. **Feedback/Ideas module** — But only if we can do it BETTER than Roadmunk (simpler submission, cleaner integration)
19. **API (GraphQL)** — For power users and integrations
20. **Scenario planning** — Version comparison
21. **Calendar sync (ICS)**

### Exclude from v1

- Jira/Azure DevOps integration (explicit scope exclusion)
- SSO/SAML (enterprise feature)
- Private cloud deployment
- Chrome extension for feedback collection

### Architecture Implications for Andrei

- **Entity model is well-defined** — See section 2 for the complete data model
- **Views are filters + formatting on top of shared data** — Not separate data copies
- **Fields are the pivot mechanism** — Fields drive headers, colors, filters; this is the core abstraction
- **Timeline rendering is the hardest technical challenge** — Items positioned by date on a zoomable time axis with headers, sub-headers, streams, milestones, and drag-and-drop
- **System limits are known** — 350 items/view, 25 sub-items/parent, 100 bulk edit, 10K char descriptions

### Design Implications for Robert

- **Two distinct visualization paradigms** — Timeline (time-based, Gantt-like) vs. Swimlane (grid-based, card-based)
- **Format Panel is the visual control center** — Consolidated right-panel for all view formatting
- **Item Card is a two-panel detail view** — Context (left) + Details (right, collapsible)
- **Color system is field-driven** — Colors tied to list field values, 6 built-in palettes + custom
- **Milestone icons** — Custom shapes and colors per type
- **Presentation mode** — Clean, read-only, full-screen for stakeholder meetings

---

## Appendix: Template Categories

Roadmunk offers 35+ templates across these categories:

| Category | Example Templates |
|----------|-------------------|
| **Product Roadmap** | Feature-based, release-based, OKR-driven |
| **Portfolio Roadmap** | Multi-product, cross-team |
| **Feature Roadmap** | Feature-level detail |
| **Program Roadmap** | Cross-functional program tracking |
| **Agile Roadmap** | Theme, Fuzzy Time, Sprint, Agile-ish |
| **Development** | Engineering-focused |
| **Product Launch** | Go-to-market planning |

---

## Appendix: Integration Ecosystem (Reference Only)

Supported platforms (for awareness; Jira excluded from our v1 scope):
- Jira (one-way or two-way sync with JQL filtering)
- Azure DevOps (one-way or two-way with WIQL filtering)
- GitHub, GitLab, Shortcut, Trello
- monday.com, Pivotal Tracker, Asana
- Structure by Tempo
- GraphQL API for custom integrations

---

*Research gathered 2026-02-10 via WebSearch and WebFetch across roadmunk.com, help.tempo.io, Capterra, TrustRadius, G2, Dimmo, and additional review/comparison sites.*
