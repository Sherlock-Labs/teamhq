# Roadmap Tool — Product Requirements

**Author:** Thomas (PM)
**Date:** February 10, 2026
**Status:** Complete
**Project ID:** `roadmap-tool`
**Research inputs:** `docs/roadmap-tool-product-research.md` (Suki), `docs/roadmap-tool-tech-research.md` (Marco)

---

## 1. Product Summary

Build a full-featured roadmap visualization and planning tool — a 1:1 replica of Roadmunk (now Tempo Strategic Roadmaps). The core product is three views of the same underlying data: **Timeline** (time-axis Gantt-style), **Swimlane** (grid-based cards), and **Table** (spreadsheet-style). Users create roadmaps, add items with flexible fields, and visualize them in presentation-ready views for different audiences.

**One-sentence pitch:** A beautiful, fast roadmap tool where product teams plan work, visualize timelines, and share boardroom-ready roadmaps — without the sluggishness or price tag of existing tools.

**Target users:** Product managers, directors of product, CTOs, project managers at companies of 10-5,000+ employees.

**Separate repo:** This is its own product, not part of TeamHQ. Per conventions, planning docs live in TeamHQ's `docs/`, but the product code lives in a dedicated repo.

**SaaS stack:** Railway (hosting + Postgres), Clerk (auth + orgs), Stripe (payments), PostHog (analytics), Cloudflare R2 (file storage), Loops (email). See `skills/development/saas-stack.md`.

---

## 2. Phasing Strategy

This is a large product. We phase aggressively to ship a usable core fast, then layer features.

| Phase | Scope | Ship Criteria |
|-------|-------|---------------|
| **v1.0 — Core Roadmapping** | Roadmaps, Items, Fields, Table View, Timeline View, Swimlane View, Views system, Color palettes, Milestones, Real-time collaboration, Sharing, Export (PNG/URL) | A user can create a roadmap, add items with custom fields, visualize them in all 3 views, customize colors, collaborate in real-time, share with teammates, and export for presentations |
| **v1.1 — Dependencies & Polish** | Linked items (dependencies), Drag-and-drop on Timeline, Sub-items, Key dates, Comments/mentions, CSV import/export, Presentation mode, Fiscal year settings | All dependency types working, full item hierarchy, comment threads |
| **v2.0 — Portfolio & Growth** | Portfolio roadmaps, Collections (folders), Buckets (no-date mode), Templates, Feedback/Ideas module, API (GraphQL) | Multi-roadmap roll-up, folder organization, idea-to-roadmap pipeline |

**Excluded from all phases:**
- Jira/Azure DevOps integration (explicit scope exclusion)
- SSO/SAML (enterprise tier, later)
- Private cloud deployment
- Chrome extension for feedback

---

## 3. v1.0 Scope — Core Roadmapping

### 3.1 Authentication & Workspace

**US-1: User signup and login**
As a new user, I can sign up with email or Google OAuth and land in my workspace.

Acceptance criteria:
- [ ] Clerk-powered signup with email/password and Google OAuth
- [ ] After signup, user lands on the Roadmaps Homepage (empty state)
- [ ] Returning users log in and see their roadmaps
- [ ] Clerk Organizations used for team-based multi-tenancy
- [ ] All data scoped by `clerkOrgId` — users only see their team's roadmaps

Interaction states:
- Loading: Clerk handles auth UI states
- Error: Clerk handles error display (wrong password, duplicate email)
- Empty: Roadmaps Homepage shows "Create your first roadmap" CTA

**US-2: Team/workspace management**
As an admin, I can invite teammates and manage roles.

Acceptance criteria:
- [ ] `<OrganizationSwitcher />` for switching between teams
- [ ] `<OrganizationProfile />` for team settings and member management
- [ ] Invite by email — invited users receive email notification
- [ ] Three roles: **Owner** (full control), **Editor** (can edit roadmaps), **Viewer** (read-only + comments)
- [ ] Roles enforced on all API endpoints — viewers cannot modify data

---

### 3.2 Roadmaps

**US-3: Create a roadmap**
As a user, I can create a new roadmap and give it a name.

Acceptance criteria:
- [ ] "New Roadmap" button on Roadmaps Homepage
- [ ] Enter roadmap name (required, max 200 characters)
- [ ] Option to start blank or from a template (v1: blank only — templates deferred to v2)
- [ ] After creation, land on the Table View (Items Table) with an empty state
- [ ] Roadmap is owned by the creating user and scoped to their org

Interaction states:
- Loading: "New Roadmap" button shows spinner during creation
- Error: Display inline error if name is blank or creation fails
- Empty: "Add your first item" helper text in the empty table
- Disabled: Submit disabled while name field is empty

**US-4: Roadmaps Homepage**
As a user, I can see all my roadmaps organized by ownership and recency.

Acceptance criteria:
- [ ] Three sections: **My Roadmaps**, **Shared with Me**, **Recently Viewed**
- [ ] Each roadmap card shows: name, owner, last modified date, view count (number of saved views)
- [ ] Click a roadmap card to open it (lands on last-viewed view, or Table View if first visit)
- [ ] Favorite/unfavorite roadmaps for quick access (favorites pinned to top)
- [ ] Global search across all roadmaps and items by name (debounced, 300ms)
- [ ] Delete roadmap (Owner only, with confirmation dialog)

Interaction states:
- Loading: Skeleton cards while roadmap list loads
- Empty: "No roadmaps yet" with prominent "New Roadmap" CTA
- Error: "Failed to load roadmaps. Retry." with retry button

**US-5: Roadmap settings**
As a roadmap owner, I can configure roadmap-level settings.

Acceptance criteria:
- [ ] Rename roadmap
- [ ] Delete roadmap (confirmation required, irreversible)
- [ ] Settings accessible from a gear icon within the roadmap view

---

### 3.3 Items (Core Work Units)

**US-6: Create and manage items**
As a user, I can create items that represent work on my roadmap.

Acceptance criteria:
- [ ] Create item from Table View: hover between rows, click "+" icon, type name, press Enter
- [ ] Create item from Timeline View: Quick Actions menu to place at a specific date/stream
- [ ] Create item from Swimlane View: click "+" in an empty cell or use Quick Actions
- [ ] Each item has: **Name** (required, max 500 chars), **Description** (rich text, max 10,000 chars), **Start Date**, **End Date**, **Fields** (custom)
- [ ] Items without dates are valid (appear in Table and Swimlane but not Timeline)
- [ ] Duplicate item (creates a copy with "(Copy)" appended to name)
- [ ] Delete item (with confirmation)
- [ ] Max 350 items visible per Timeline view (enforced by filter, not hard cap on data)

Interaction states:
- Loading: Inline item creation is instant (optimistic); server sync happens in background
- Error: If server rejects, revert the optimistic add and show inline error
- Form: Item Card detail panel (see US-7)
- Unsaved changes: Warn if navigating away from Item Card with unsaved edits

**US-7: Item Card (detail panel)**
As a user, I can click any item to open a detail panel and edit all its properties.

Acceptance criteria:
- [ ] Click item in any view to open Item Card as a slide-out panel (not a modal — content behind remains visible)
- [ ] **Left panel — Context:**
  - Overview tab: Rich text description editor (bold, italic, underline, links, bullet lists), file attachments (max 10MB per file, stored in R2)
  - Linked Items tab: Shows items linked to this one (v1: display only — linking deferred to v1.1)
  - Sub-Items tab: Shows child items (v1: display placeholder — sub-item creation deferred to v1.1)
- [ ] **Right panel — Details (collapsible):**
  - Fields tab: All assigned field values with inline editing, date pickers for start/end dates
  - Activity tab: Chronological log of all changes (created, edited, field changed) — display only in v1, comments deferred to v1.1
- [ ] **Save actions:** Save & Close, Save Without Closing, Save & Create Another
- [ ] **Item actions menu:** Copy Item URL, Duplicate Item, Delete Item
- [ ] Date picker supports both calendar selection AND direct text input (addressing Roadmunk user complaint about calendar-only)

Interaction states:
- Loading: Item Card data loads with skeleton placeholders
- Error: Inline error on save failure, input preserved
- Disabled: Save button disabled when no changes have been made
- Form: Validation on name (required), dates (end >= start if both set)
- Unsaved changes: Confirm dialog on close if unsaved edits exist

---

### 3.4 Fields System

**US-8: Manage fields**
As a user, I can create and manage custom fields to categorize my roadmap items.

Acceptance criteria:
- [ ] **Field types:** List (single-select), Multi-Select, Numeric (with Currency and Percentage sub-formats), Text, Date, Team Members
- [ ] **Field levels:** Roadmap-level (scoped to one roadmap) and Account-level (shared across all roadmaps in the org)
- [ ] Create field: name (required, max 100 chars), type (required, immutable after creation), level
- [ ] **List field values:** Add, reorder (drag-and-drop), edit, delete individual values. Each value has a name and optional color assignment
- [ ] Promote roadmap field to account field (irreversible, with confirmation)
- [ ] Archive field (hides from UI but preserves data), Restore archived field
- [ ] Delete field (removes from all items, with confirmation)
- [ ] Default system fields (always present): Name, Date (Start/End)
- [ ] Only **List** fields can be used for color coding in views
- [ ] Fields accessible from a "Fields" management page within the roadmap

Interaction states:
- Loading: Field list loads with skeleton rows
- Empty: "No custom fields yet. Add one to organize your items."
- Error: Inline error if field name is duplicate or empty
- Disabled: Type selector disabled after field creation (immutable)

**US-9: Assign field values to items**
As a user, I can set field values on items to categorize and organize them.

Acceptance criteria:
- [ ] In Table View: click a cell to edit the field value inline (dropdown for List/Multi-Select, text input for Text, number input for Numeric)
- [ ] In Item Card: edit field values in the Fields tab of the right panel
- [ ] Multi-Select fields allow multiple values per item
- [ ] Team Member fields show org members in a dropdown
- [ ] Numeric fields validate number input and display with sub-format (e.g., "$1,200" for Currency, "45%" for Percentage)
- [ ] Changes save immediately (auto-save with debounce, 500ms)

---

### 3.5 Table View

**US-10: Table View**
As a user, I can see all my roadmap data in a spreadsheet-like table for data entry and bulk management.

Acceptance criteria:
- [ ] **Items Table:** Rows are items, columns are fields. Sortable by any column (click header)
- [ ] **Column management:** Show/hide columns, reorder columns by drag-and-drop
- [ ] **Inline editing:** Click any cell to edit the value in-place. Dropdown for List fields, text input for Text, date picker for Date, number input for Numeric
- [ ] **Inline creation:** Hover between rows shows a "+" button. Click to add a new item row. Type name and press Enter to create
- [ ] **Arrow key navigation:** Up/Down/Left/Right to move between cells (spreadsheet-style). Enter to start editing, Escape to cancel
- [ ] **Bulk select:** Checkbox column on the left. Select individual items or "Select All." Bulk actions: delete (up to 100 items per action)
- [ ] **Row click:** Click item name to open Item Card detail panel
- [ ] **Filtering:** Apply filters (see US-14) to show/hide items. Filtered items are hidden, not deleted
- [ ] **Items count:** Show total items and filtered items count in the table footer

Interaction states:
- Loading: Table shows skeleton rows while data loads
- Empty: "No items yet" with inline creation prompt
- Error: Inline cell edit failure shows tooltip error, preserves input
- Optimistic: Inline edits update the cell immediately; revert on server failure

---

### 3.6 Timeline View

**US-11: Timeline View**
As a user, I can visualize my roadmap items as horizontal bars on a time axis, grouped into themed swimlanes.

Acceptance criteria:
- [ ] **Date Header (top):** Horizontal time axis showing time period labels
- [ ] **Time scale options:** Weeks (up to 2yr display), Months (up to 5yr), Quarters (up to 8yr), Halves (up to 15yr), Years. Selectable from Format Panel
- [ ] **Headers (left side):** Items grouped by any List field. Header label shows the field value. Collapsible header groups
- [ ] **Sub-Headers (optional):** Second-level grouping under headers using another field
- [ ] **Streams:** Horizontal lanes within each header group. Items auto-stack into multiple tracks to avoid overlap
- [ ] **Item rendering:** Horizontal bars spanning start-to-end date. Bar color determined by the active color-by field. Item name displayed as label (configurable: above bar or inside bar via Theme Orientation)
- [ ] **Label Suffix:** Optional additional field value appended to item name on the bar
- [ ] **Today marker:** Vertical line at the current date
- [ ] **Time slider:** Draggable bar at the bottom or top for zooming/panning the visible date range
- [ ] **Date range:** Configurable visible start and end dates
- [ ] **Hide empty headers:** Toggle to hide header groups with no items in the visible date range
- [ ] **Compact vs. Spacious layout:** Toggle between dense and airy item spacing
- [ ] **Click item bar:** Opens Item Card detail panel
- [ ] Items without dates do not appear on the Timeline (they exist in Table/Swimlane only)
- [ ] Max 350 items rendered per Timeline view

Interaction states:
- Loading: Timeline shows header structure with skeleton bars
- Empty: "No items with dates yet" with prompt to add items or switch to Table View
- Error: If data load fails, show retry prompt

**US-12: Milestones**
As a user, I can add milestone markers to my Timeline to highlight key dates.

Acceptance criteria:
- [ ] Milestones are single-date events (no duration) displayed as shaped icons on the Timeline
- [ ] **Milestone types:** 3 defaults (Release, Product Launch, Tradeshow) + unlimited custom types
- [ ] Each type has a configurable **shape** (diamond, circle, triangle, square) and **color**
- [ ] Create milestone: name (required), date (required), type (required)
- [ ] Milestones are affected by view filters (hidden if they don't match)
- [ ] Toggle milestone labels and dates on/off in the Timeline
- [ ] **Milestones Table:** Separate tab in Table View for managing milestone data (name, date, type, custom fields)
- [ ] Milestones appear on Timeline view ONLY (not Swimlane)
- [ ] Edit/delete milestones from the Milestones Table or by clicking on the Timeline

Interaction states:
- Loading: N/A (milestones load with the Timeline)
- Empty: No special empty state — milestones are optional
- Error: Inline error if name or date is missing on creation

---

### 3.7 Swimlane View

**US-13: Swimlane View**
As a user, I can visualize my roadmap items in a customizable grid layout with cards at row/column intersections.

Acceptance criteria:
- [ ] **Column Header (horizontal axis):** Pivot by any field, item dates, or parent items
- [ ] **Row Header (vertical axis):** Pivot by any List field
- [ ] **Group Rows By (optional):** Additional grouping layer using List, Multi-Select, or Team Member fields
- [ ] **Items as cards:** Items appear as cards in the cell where their column and row field values intersect
- [ ] **Card display modes:**
  - Standard: name, dates/buckets, description preview, field labels, sub-item count
  - Compact: name, dates, sub-item count only
- [ ] **Inversion Arrows:** One-click swap of row and column headers
- [ ] **Detail chips on cards:** Small indicators showing linked items count, key dates count, attachment count
- [ ] **Click card:** Opens Item Card detail panel
- [ ] **Create from Swimlane:** Click "+" in any empty cell to create an item pre-populated with that cell's row/column field values
- [ ] Both axes are fully customizable (unlike Timeline where one axis is always time)

Interaction states:
- Loading: Grid skeleton while data loads
- Empty (cell): Empty cells show a subtle "+" icon on hover
- Empty (entire view): "No items match the current filters" or "Add items to see them here"
- Error: Retry prompt on data load failure

---

### 3.8 Views System

**US-14: Multiple views per roadmap**
As a user, I can create multiple saved views of the same roadmap data with different visualizations and filters.

Acceptance criteria:
- [ ] **View types:** Timeline, Swimlane, Table
- [ ] **Create view:** "Add New View" from the view switcher dropdown. Enter name, choose type. Optionally copy filters from an existing view
- [ ] **View switcher:** Dropdown at the top of the roadmap showing all views. Click to switch
- [ ] **Rename view** (inline edit in the dropdown)
- [ ] **Delete view** (with confirmation, cannot delete the last view)
- [ ] **Default view:** First view created is the default. Configurable
- [ ] All views share the same underlying item data — creating an item in one view makes it available in all views
- [ ] Each view has its own independent: filter set, formatting configuration, color palette, header/sub-header selection (Timeline), column/row selection (Swimlane)

**US-15: Filtering**
As a user, I can filter items within a view to show only relevant data.

Acceptance criteria:
- [ ] Add one or more filter conditions per view
- [ ] Filter by any field: equals, not equals, contains (text), is in (multi-value), is empty, is not empty
- [ ] Filter by date range: before, after, between
- [ ] Combine filters with AND logic (all conditions must match)
- [ ] Filter indicator shows active filter count on the view tab
- [ ] Filters persist per view (saved to the view configuration)
- [ ] Filtered-out items are hidden, not deleted — they still appear in unfiltered views
- [ ] "Clear all filters" button to reset
- [ ] Milestones are also affected by filters (Timeline)

Interaction states:
- Loading: N/A (filters apply client-side on loaded data)
- Empty (no results): "No items match the current filters. Try adjusting your filter criteria."

---

### 3.9 Formatting & Color Palettes

**US-16: Format Panel**
As a user, I can customize the visual appearance of each view through a centralized Format Panel.

Acceptance criteria:
- [ ] Format Panel opens as a right-side panel (toggleable via Format icon)
- [ ] **Timeline formatting:**
  - Header field selection (primary + optional sub-header)
  - Theme Orientation: name above bar vs. inside bar
  - Header Orientation: horizontal vs. vertical stacking
  - Hide empty headers toggle
  - Time scale selection (weeks/months/quarters/halves/years)
  - Date range controls (start date, end date)
  - Compact vs. Spacious layout
- [ ] **Swimlane formatting:**
  - Column header field selection
  - Row header field selection
  - Group Rows By selection
  - Card display mode: Standard vs. Compact
  - Inversion arrows (swap axes)
- [ ] **Table formatting:**
  - Show/hide columns
  - Column order
- [ ] Format settings persist per view

**US-17: Color palettes**
As a user, I can color-code my roadmap items using palettes assigned to field values.

Acceptance criteria:
- [ ] **Color-by field:** Select which List field drives the color coding (Format Panel > Colors tab)
- [ ] **6 default palettes:** Citrus, Groovy, Pastel, Autumn, Neon, Ocean (each with 6-12 preset colors)
- [ ] **Custom palette:** Create a custom palette with hex color picker
- [ ] Colors auto-assign to field values in order. Manual reassignment via drag-and-drop (value-to-color mapping)
- [ ] **Legend:** Auto-generated color legend showing current assignments. Toggleable
- [ ] Color palette persists per view
- [ ] Colors apply to: Timeline bars, Swimlane card accents, Table row highlights (subtle)

Interaction states:
- Loading: N/A (palettes are local config)
- Empty: If no List fields exist, show "Add a List field to enable color coding"

---

### 3.10 Sharing & Export

**US-18: Share roadmap with teammates**
As a roadmap owner, I can share my roadmap with other users in my org.

Acceptance criteria:
- [ ] "Share" button at the top of the roadmap
- [ ] Add users by name or email (from org member list)
- [ ] Set permission: **Editor** (can edit) or **Viewer** (read-only)
- [ ] Shared users appear in a members list with their role
- [ ] Remove sharing access (owner only)
- [ ] Shared roadmaps appear in the user's "Shared with Me" section on the Homepage
- [ ] Permission enforcement: Viewers cannot create, edit, or delete items/views/fields. They can only view and add comments (v1.1)

Interaction states:
- Loading: Member list loads with skeleton rows
- Error: "User not found" if email doesn't match an org member
- Empty: "No one else has access. Share with your team."

**US-19: Export to PNG**
As a user, I can export any view as a high-resolution PNG image.

Acceptance criteria:
- [ ] "Export" button in the toolbar
- [ ] Export the current view (Timeline, Swimlane, or Table) as a PNG
- [ ] Full roadmap rendered (not just the visible viewport — include scrolled content)
- [ ] High-DPI export (2x resolution for crisp display on retina screens)
- [ ] File downloaded to user's device with name: `{roadmap-name}-{view-name}.png`

Interaction states:
- Loading: "Generating export..." progress indicator
- Error: "Export failed. Try again."
- Timeout: If export takes >15 seconds, show progress message

**US-20: Share via URL**
As a user, I can generate a shareable URL for a read-only view of my roadmap.

Acceptance criteria:
- [ ] "Share Link" option in the export menu
- [ ] Generates a unique URL that shows the current view in read-only mode
- [ ] Optional password protection for the URL
- [ ] Shared URL renders the roadmap without any editing UI
- [ ] URL can be revoked by the owner
- [ ] No authentication required to view (anyone with the link + optional password can access)

Interaction states:
- Loading: "Generating link..." while URL is created
- Error: Inline error if URL generation fails
- Form: Password field (optional) with show/hide toggle

---

### 3.11 Real-Time Collaboration

**US-21: Real-time collaborative editing**
As a user, I can see other team members editing the same roadmap simultaneously, with live presence and conflict-free updates.

Acceptance criteria:
- [ ] **Live presence indicators:** When multiple users have the same roadmap open, each user sees avatar badges showing who else is viewing. Avatars appear in the top bar next to the Share button
- [ ] **Presence per view:** Users viewing different views of the same roadmap see each other's presence, but the view name is shown next to each avatar so you know which view they're on
- [ ] **Live cursors (Table View):** In Table View, see other users' cell selections highlighted with their assigned color and name label
- [ ] **Live item updates:** When another user creates, edits, or deletes an item, the change appears in real-time across all connected clients without page refresh
- [ ] **Live field changes:** Field value changes by one user are reflected immediately for all viewers
- [ ] **Live view config changes:** If an Editor changes the Format Panel settings or filters on a shared view, other users on that same view see the change live (with a "View updated by [name]" toast notification)
- [ ] **Conflict resolution:** Last-write-wins for field-level edits. If two users edit the same field on the same item simultaneously, the last save wins and the other user sees the updated value with a subtle flash indicating it was changed externally
- [ ] **Item Card locking:** When a user has an Item Card open and is actively editing, other users see a "Being edited by [name]" indicator on that item. They can still open the card in read-only mode but cannot edit until the first user closes or after a 5-minute inactivity timeout
- [ ] **Disconnection handling:** If a user's connection drops, their presence indicator disappears after 10 seconds. When they reconnect, the client syncs any changes that occurred during the disconnect
- [ ] **Optimistic local updates:** The editing user sees their changes instantly. Other users see changes within 200ms (WebSocket propagation target)

Interaction states:
- Loading: Presence indicators appear once the WebSocket connection is established (within 1-2s of page load). A subtle "Connecting..." indicator shows during initial connection
- Error: If WebSocket connection fails, fall back to polling (5s interval) and show a subtle "Live sync unavailable" indicator. All editing still works — just not real-time for other users
- Reconnection: Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s). On reconnect, full state sync from server
- Timeout: Item Card edit lock expires after 5 minutes of inactivity (no keystrokes or clicks in the card)

**US-22: Real-time activity feed**
As a user, I can see live updates in the Activity tab when teammates make changes.

Acceptance criteria:
- [ ] Activity tab on Item Card shows new entries in real-time (no refresh needed)
- [ ] New activity entries slide in with a subtle animation
- [ ] Activity entries include: who made the change, what changed, timestamp
- [ ] If the Activity tab is not visible, a badge count shows unread activity since last view

---

### 3.12 Navigation & Layout

**US-23: Application shell and navigation**
As a user, I have a consistent navigation structure across the app.

Acceptance criteria:
- [ ] **Left sidebar navigation:** Roadmaps (home), Account Settings
- [ ] **Top bar within roadmap:** Roadmap name (editable), View switcher, Share button, Export button, Format icon
- [ ] **Breadcrumbs:** Home > Roadmap Name > View Name
- [ ] Responsive layout: sidebar collapses on smaller screens
- [ ] Keyboard shortcut: `Cmd/Ctrl + K` for global search (roadmaps + items)

---

## 4. v1.1 Scope — Collaboration & Polish

These features are deferred from v1.0 but are high-priority fast-follows.

### 4.1 Linked Items (Dependencies)

**US-24: Link items together**
As a user, I can create relationships between items.

Acceptance criteria:
- [ ] Three link types: **Blocking** (A blocks B), **Moves With** (A and B move together), **Relates To** (loose association)
- [ ] Create links from the Linked Items tab in the Item Card
- [ ] Cross-roadmap linking supported (items in different roadmaps within the same org)
- [ ] **Blocking:** If A blocks B, B's start date cannot be before A's end date. Moving A auto-adjusts B
- [ ] **Moves With:** Moving either item adjusts the other by the same delta
- [ ] **Relates To:** No date enforcement, informational only
- [ ] Dependency lines visible on Timeline view (SVG paths connecting linked bars)
- [ ] Max 30 items per Blocking/Moves With chain; unlimited Relates To
- [ ] Remove link (with confirmation for Blocking/Moves With due to date implications)

### 4.2 Drag-and-Drop on Timeline

**US-25: Drag items on Timeline**
As a user, I can drag items on the Timeline to change dates and stream assignments.

Acceptance criteria:
- [ ] **Horizontal drag:** Move an item left/right to change its start and end dates (maintaining duration)
- [ ] **Vertical drag:** Move an item to a different stream/header group
- [ ] **Shift+drag:** Restrict to vertical movement only (no date change)
- [ ] **Resize:** Drag left or right edge of the bar to change start or end date independently
- [ ] **Snap-to-grid:** Dates snap to the nearest unit based on zoom level (day/week/month)
- [ ] **Ghost preview:** Semi-transparent preview shows where the item will land during drag
- [ ] **Undo:** Cmd/Ctrl + Z to undo the last drag operation
- [ ] Drag updates save automatically on drop

### 4.3 Sub-Items

**US-26: Create and manage sub-items**
As a user, I can nest items under parent items.

Acceptance criteria:
- [ ] Create sub-items from the Sub-Items tab in the parent's Item Card
- [ ] Max 25 sub-items per parent
- [ ] Sub-items have all the same properties as regular items (dates, fields, etc.)
- [ ] Display options: nested under parent (indented) OR standalone (flat, breaking the visual hierarchy)
- [ ] In Timeline: sub-items render as smaller bars nested within the parent's stream
- [ ] In Table: sub-items indented under parent row with expand/collapse
- [ ] In Swimlane: sub-item count shown as a badge on the parent card

### 4.4 Key Dates

**US-27: Add key dates to items**
As a user, I can add secondary date markers within items to show phases or stages.

Acceptance criteria:
- [ ] Key dates are named date markers attached to an item (e.g., "Design Complete: Mar 15")
- [ ] Shown as small markers within the item bar on Timeline
- [ ] Listed in the Fields tab of the Item Card
- [ ] Can be added to items and sub-items

### 4.5 Comments & Activity

**US-28: Comments and activity log**
As a user, I can comment on items and see a full activity history.

Acceptance criteria:
- [ ] Comment thread on each item (Activity tab in Item Card)
- [ ] @mention teammates (auto-complete from org members)
- [ ] Activity log shows: creation, field changes, date changes, comments — with timestamp and author
- [ ] Notifications when mentioned in a comment (in-app indicator)

### 4.6 Additional v1.1 Features

**US-29: CSV import/export**
- Import items from CSV (map columns to fields)
- Export all items to CSV

**US-30: Presentation mode**
- Full-screen, read-only view (no editing UI)
- "Present" button in toolbar
- Escape to exit

**US-31: Fiscal year settings**
- Account-level fiscal year-end configuration
- Timeline date headers adjust to show fiscal periods (e.g., Q1 = Apr-Jun for Apr fiscal year-end)

---

## 5. v2.0 Scope — Portfolio & Growth

Outlined for planning awareness. Full requirements deferred.

**Portfolio Roadmaps (US-32):** Roll up 2+ source roadmaps into a single bird's-eye view. Timeline or Swimlane visualization. Pivot by account-level fields shared across source roadmaps.

**Collections / Folders (US-33):** Admin-created folders for organizing roadmaps. A roadmap can belong to multiple collections.

**Buckets — No-Date Mode (US-34):** Items can use fuzzy time buckets ("Now", "Next", "Later") instead of exact dates. Critical for agile teams who don't commit to dates.

**Templates (US-35):** 10+ roadmap templates (Product Roadmap, Feature Roadmap, Agile Roadmap, Launch Plan, etc.) to accelerate creation.

**Feedback & Ideas Module (US-36):** Only if we can do it better than Roadmunk. Simplified idea submission (no Chrome extension requirement), RICE scoring, idea-to-roadmap promotion.

**GraphQL API (US-37):** Public API for power users and integrations.

---

## 6. Data Model (Entity Summary)

Based on Suki's entity model (research section 2) and Marco's schema (research section 6). This is a guide for Andrei — the final schema design is his call.

| Entity | Key Properties | Notes |
|--------|---------------|-------|
| **Account** (Org) | clerkOrgId, name, stripeCustomerId, fiscalYearEnd | Maps 1:1 to Clerk Organization |
| **User** | clerkUserId, name, email, role | Maps to Clerk User via org membership |
| **Roadmap** | name, ownerId, accountId, createdAt, updatedAt | Top-level container |
| **Item** | name, description (rich text), startDate, endDate, roadmapId, parentId (for sub-items), order, fieldValues (JSONB or relational) | Core work unit |
| **Field** | name, type (list/numeric/text/multi-select/date/team-member), level (roadmap/account), roadmapId?, accountId | Flexible metadata |
| **FieldValue** | fieldId, name, color, order | For List and Multi-Select fields |
| **ItemFieldAssignment** | itemId, fieldId, value | Junction table for field values on items |
| **Milestone** | name, date, typeId, roadmapId | Single-date events |
| **MilestoneType** | name, shape, color, roadmapId? | Custom milestone styles |
| **View** | name, type (timeline/swimlane/table), roadmapId, config (JSONB) | Saved visualization config |
| **LinkedItem** | sourceItemId, targetItemId, type (blocking/moves-with/relates-to) | v1.1 |
| **KeyDate** | name, date, itemId | v1.1 |
| **Comment** | itemId, userId, text, createdAt | v1.1 |
| **SharedLink** | viewId, token, passwordHash?, revokedAt? | Public URL sharing |
| **Attachment** | itemId, r2Key, filename, size, mimeType | File attachments |
| **Presence** | userId, roadmapId, viewId, lastSeen, cursorState? | In-memory (Redis/in-process), not persisted to Postgres |
| **EditLock** | itemId, userId, acquiredAt, expiresAt | Lightweight lock for Item Card editing, 5-min TTL |

---

## 7. Technical Constraints

These feed into Andrei's tech approach decisions.

| Constraint | Value | Source |
|-----------|-------|--------|
| Max items per Timeline view | 350 | Roadmunk parity |
| Max sub-items per parent | 25 | Roadmunk parity |
| Max items per bulk action | 100 | Roadmunk parity |
| Item description max length | 10,000 chars (including markup) | Roadmunk parity |
| Field description max length | 200 chars | Roadmunk parity |
| Attachment max file size | 10 MB | Roadmunk parity |
| Timeline rendering | Custom React + SVG (per Marco's recommendation) | Tech research |
| Date math library | d3-scale + d3-time for coordinate math, date-fns for manipulation | Tech research |
| No Canvas rendering in v1 | SVG sufficient for roadmap scale (50-350 items) | Tech research |
| Frontend framework | React + TypeScript + Vite | SaaS stack standard |
| Backend | Express (or Next.js API routes) + Postgres on Railway | SaaS stack |
| Auth | Clerk (organizations for multi-tenancy) | SaaS stack |
| File storage | Cloudflare R2 (attachments via presigned URLs) | SaaS stack |
| Hosting | Railway | SaaS stack |
| Real-time collaboration | WebSocket-based (e.g., Socket.IO or native WS). Presence + live updates + edit locking | CEO decision: bake in from v1 |
| Real-time propagation target | Changes visible to other users within 200ms | Competitive differentiator |
| Target performance | Timeline view renders in <1s for 200 items; drag/resize at 60fps | Competitive differentiator |

---

## 8. Pricing Strategy

Based on Suki's research, we aim for a simpler, less restrictive tier structure than Roadmunk.

| Tier | Price Target | Key Differentiator |
|------|-------------|-------------------|
| **Free** | $0, up to 3 roadmaps, 2 users | Generous free tier to drive adoption |
| **Pro** | ~$12/editor/mo | Full features: unlimited roadmaps, all views, all exports, color palettes, sharing. This should match Roadmunk's Business tier but at a lower price |
| **Team** | ~$29/editor/mo | Portfolio roadmaps, priority support, advanced analytics. Match Roadmunk's Professional tier features |

**Key pricing principles:**
- Don't gate core visualization features (all 3 views available on Free)
- Don't gate dependencies or sub-items by tier
- Gate by scale (number of roadmaps, users) not by features
- Viewers are always free (Roadmunk charges $5/reviewer — we beat that)

Howard should finalize Stripe product/price configuration. Defer actual implementation to when the core product is built.

---

## 9. Competitive Differentiators to Protect

From Suki's user sentiment analysis, these are the gaps in Roadmunk we should exploit:

1. **Performance:** Roadmunk is reportedly slow. Our Timeline MUST render in <1s and drag/resize MUST feel 60fps smooth. This is our #1 UX differentiator.
2. **Date input:** Roadmunk only has calendar picker. We support both calendar AND typed date input everywhere.
3. **Navigation efficiency:** Roadmunk takes "8 clicks to copy an item across roadmaps." We should minimize click depth for common operations.
4. **Pricing clarity:** Don't gate core features to expensive tiers. All 3 views on all tiers.
5. **Onboarding:** Keep the learning curve low. Progressive disclosure — simple by default, powerful when you dig in.

---

## 10. Non-Functional Requirements

**Browser support:** Latest 2 versions of Chrome, Firefox, Safari, Edge. No IE11.

**Responsiveness:** Desktop-first (roadmap visualization is inherently a large-screen activity). Tablet: read-only view should work. Mobile: Roadmaps Homepage and Item Card should be usable; Timeline/Swimlane views show a "best on desktop" message.

**Accessibility (v1 baseline):**
- All interactive elements keyboard-navigable
- Color coding supplemented by shape/pattern/label (not color-only information)
- ARIA labels on SVG timeline elements (items, milestones)
- Focus management on Item Card open/close
- Minimum 4.5:1 contrast ratio on all text

**Performance targets:**
- Roadmaps Homepage: <500ms initial load
- Timeline View (200 items): <1s render
- Swimlane View (200 items): <500ms render
- Table View (500 items): <500ms render
- Drag/resize: 60fps, <16ms per frame
- Item Card open: <200ms

**Security:**
- All API endpoints authenticated via Clerk middleware
- Data isolated by orgId — no cross-org data leakage
- Shared URLs use cryptographic tokens (UUIDv4 or similar)
- Password-protected shares use bcrypt-hashed passwords
- File upload validation: size, MIME type allowlisting
- Rate limiting on auth endpoints and export generation

---

## 11. Pipeline Recommendation

This is a big build. Recommended pipeline:

1. **Andrei (Arch)** — Tech approach: repo scaffolding, database schema, API design, SVG architecture decisions, build vs. reuse decisions. Read this doc + both research docs.
2. **Robert (Designer)** — Design spec: application shell, all 3 view types, Item Card, Format Panel, color system, empty/loading states. Read this doc + product research (especially sections 3, 7, 13).
3. **Alice (FE) + Jonah (BE)** — Align on API contracts, then implement in parallel.
   - **Alice:** Application shell, Table View, Timeline View (SVG), Swimlane View, Item Card, Format Panel, Views system, Export, real-time presence UI + live update handling
   - **Jonah:** Auth integration, CRUD APIs (roadmaps, items, fields, milestones, views), sharing, export endpoint, file uploads, WebSocket server for real-time collaboration (presence, live updates, edit locking)
4. **Nina/Soren/Amara review** — This is a UI-heavy product. All three specialists should review before Robert's design review.
5. **Robert (Designer)** — Design review of implementation
6. **Enzo (QA)** — Full test pass. Release gate.

**Phasing the build within v1:**
Given the scope, I recommend Alice and Jonah build in this order within v1.0:
1. **Sprint 1:** Auth + Roadmaps CRUD + Table View + Items + Fields + WebSocket infrastructure (the data backbone + real-time foundation)
2. **Sprint 2:** Timeline View (the hero feature) + Milestones + Format Panel + Real-time presence UI
3. **Sprint 3:** Swimlane View + Views system + Color palettes + Live update propagation across views
4. **Sprint 4:** Sharing + Export + Edit locking + Polish + Bug fixes

This lets us have a working product after Sprint 1 and iteratively layer the visualization features.

---

## 12. CEO Decisions (Resolved)

1. **Product name:** "Roadmap Tool" for now. May rebrand later.
2. **Template priority:** Deferred to v2, confirmed.
3. **Real-time collab:** **INCLUDED in v1.0.** CEO wants collaboration baked in from the start — it would be a big lift to add later. See US-21 and US-22 in section 3.11.
4. **Build priority:** Ship as a complete v1.0 package, not early access.

---

## Appendix A: User Story Index

| ID | Title | Phase | View |
|----|-------|-------|------|
| US-1 | User signup and login | v1.0 | Auth |
| US-2 | Team/workspace management | v1.0 | Auth |
| US-3 | Create a roadmap | v1.0 | Roadmaps |
| US-4 | Roadmaps Homepage | v1.0 | Roadmaps |
| US-5 | Roadmap settings | v1.0 | Roadmaps |
| US-6 | Create and manage items | v1.0 | Items |
| US-7 | Item Card (detail panel) | v1.0 | Items |
| US-8 | Manage fields | v1.0 | Fields |
| US-9 | Assign field values to items | v1.0 | Fields |
| US-10 | Table View | v1.0 | Table |
| US-11 | Timeline View | v1.0 | Timeline |
| US-12 | Milestones | v1.0 | Timeline |
| US-13 | Swimlane View | v1.0 | Swimlane |
| US-14 | Multiple views per roadmap | v1.0 | Views |
| US-15 | Filtering | v1.0 | Views |
| US-16 | Format Panel | v1.0 | Format |
| US-17 | Color palettes | v1.0 | Format |
| US-18 | Share roadmap with teammates | v1.0 | Sharing |
| US-19 | Export to PNG | v1.0 | Export |
| US-20 | Share via URL | v1.0 | Export |
| US-21 | Real-time collaborative editing | v1.0 | Collab |
| US-22 | Real-time activity feed | v1.0 | Collab |
| US-23 | Application shell and navigation | v1.0 | Nav |
| US-24 | Link items (dependencies) | v1.1 | Dependencies |
| US-25 | Drag items on Timeline | v1.1 | Timeline |
| US-26 | Sub-items | v1.1 | Items |
| US-27 | Key dates | v1.1 | Items |
| US-28 | Comments and activity log | v1.1 | Collab |
| US-29 | CSV import/export | v1.1 | Data |
| US-30 | Presentation mode | v1.1 | Views |
| US-31 | Fiscal year settings | v1.1 | Settings |
| US-32 | Portfolio roadmaps | v2.0 | Portfolio |
| US-33 | Collections / folders | v2.0 | Org |
| US-34 | Buckets (no-date mode) | v2.0 | Items |
| US-35 | Templates | v2.0 | Roadmaps |
| US-36 | Feedback & ideas module | v2.0 | Feedback |
| US-37 | GraphQL API | v2.0 | API |

---

*Requirements written by Thomas (PM). Downstream agents: read this doc in full before starting your work.*
