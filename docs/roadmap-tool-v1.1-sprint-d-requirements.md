# Roadmap Tool v1.1 Sprint D -- Portfolio & Scale

**Author:** Thomas (PM)
**Date:** February 13, 2026
**Status:** Ready for pipeline
**Project ID:** `roadmap-tool`
**Sprint goal:** Add organizational and strategic features that let teams manage roadmaps at scale -- portfolio roll-ups, folder organization, dateless bucket planning, and quick-start templates. These four features collectively move the product from "a roadmap tool" to "the place teams manage their planning practice."

---

## 1. Sprint Context

### Where we are

Sprint C shipped: comments/activity log (RT-28), CSV import/export (RT-29), and fiscal year display (RT-31). The roadmap tool now has collaborative discussion, data portability, and enterprise-friendly time labeling. What it still lacks is ways to work across multiple roadmaps, organize a growing collection of roadmaps, plan without dates, and get started quickly.

### Why these four features together

RT-32 (Portfolio), RT-33 (Collections), RT-34 (Buckets), and RT-35 (Templates) are the "portfolio & scale" bundle. They share:

- **Multi-roadmap thinking:** Portfolio and Collections both address the problem of "I have 10+ roadmaps and need structure." They're complementary -- Collections organize, Portfolio aggregates.
- **Onboarding and activation:** Templates solve the blank-canvas problem. Buckets solve the "we don't do dates" objection. Together they remove two major adoption blockers.
- **Low cross-dependency:** All four features are largely independent. Portfolio reads from existing roadmaps. Collections are a new organizational layer. Buckets add a per-roadmap mode. Templates seed new roadmaps. They can be built and tested independently.

Shipping them together completes the v1.1 vision and positions the product for public launch.

### Scope philosophy

This sprint is the final push of v1.1. Per product philosophy, each feature ships in its simplest useful form:

- **Portfolio roadmaps are read-only.** You cannot edit items from the portfolio view. Click through to the source roadmap to make changes. This avoids the complexity of cross-roadmap editing, conflict resolution, and permission inheritance.
- **Collections are simple folders.** No smart/filtered collections, no nested folders, no automation rules. Just named buckets that you put roadmaps into manually.
- **Buckets are a per-roadmap toggle.** When enabled, items get assigned to buckets instead of dates. No hybrid mode where some items have dates and others have buckets.
- **Templates are read-only presets.** You pick a template when creating a roadmap, and it seeds initial data. You cannot create custom templates in v1. The 12 built-in templates cover common use cases.

### What's deferred beyond v1.1

| Feature | Why deferred |
|---------|-------------|
| Portfolio editing (edit items from portfolio view) | Cross-roadmap mutation is a major architectural challenge. Read-only rollup ships 80% of the value. |
| Smart/filtered collections | Rule-based grouping needs a filter engine on roadmaps. Manual assignment is sufficient for v1. |
| Nested folders (collections within collections) | One level of folders is enough. Nesting adds UI complexity for marginal value. |
| Custom user-created templates | "Save as template" requires template management UI and storage decisions. 12 built-ins is enough to validate the feature. |
| Bucket + date hybrid mode | Either a roadmap uses dates or it uses buckets. Hybrid adds confusing UX and complex data model questions. Revisit based on feedback. |
| Portfolio permissions model | In v1, portfolio access = you can see it if you can see the account. Fine-grained portfolio sharing is deferred. |
| RT-36: Feedback and ideas module | Different product surface entirely. v2.0+. |

### What's explicitly NOT in Sprint D scope

- **Editing items from portfolio view** -- portfolio is read-only. Clicking an item navigates to the source roadmap.
- **Cross-roadmap dependencies** -- links between items in different roadmaps. Not in v1.
- **Nested collections** -- one level only. A collection cannot contain another collection.
- **Smart/auto collections** -- no filter rules or auto-assignment. Manual only.
- **Custom templates** -- no "save roadmap as template" feature. Only the 12 built-in templates.
- **Bucket customization beyond name** -- no custom colors, icons, or ordering rules for buckets. Just name + sort order.
- **Converting between bucket mode and date mode** -- once a roadmap is in bucket mode, items lose date associations. This is a one-way switch in v1 (with a confirmation warning).
- **Templates with sub-items, links, or key dates** -- templates seed top-level items, fields, field values, milestones, and views only. No relationship data.

---

## 2. Scope

### In scope

1. **RT-32: Portfolio roadmaps** -- Read-only aggregation of 2+ source roadmaps into a single bird's-eye Timeline or Swimlane view. Items from all source roadmaps appear together, color-coded by source. Click-through to source roadmap.
2. **RT-33: Collections / folders** -- Named folders for organizing roadmaps on the homepage. A roadmap can belong to multiple collections. Drag reorder within collections.
3. **RT-34: Buckets (no-date mode)** -- Per-roadmap toggle that replaces date-based planning with fuzzy time buckets (Now / Next / Later). Board-style and table-based visualization.
4. **RT-35: Templates** -- 12 built-in roadmap templates. Template picker during roadmap creation. Templates seed items, fields, field values, views, and milestones.

### Out of scope

See "What's explicitly NOT in Sprint D scope" above.

---

## 3. User Stories

### 3.1 RT-32: Portfolio Roadmaps

**US-32: View a portfolio that rolls up multiple roadmaps into one view**
As a team lead, I can create a portfolio roadmap that aggregates items from multiple source roadmaps into a single Timeline or Swimlane view so I can get a bird's-eye view of everything my team is working on without switching between individual roadmaps.

#### Data model

**Portfolio roadmaps are a new type of roadmap, not a separate entity.** We add a `type` column to the `roadmaps` table to distinguish standard roadmaps from portfolios. This reuses the existing roadmap infrastructure (views, shares, favorites) without duplicating it.

**Roadmaps table change:**
- Add `type` column: TEXT, NOT NULL, DEFAULT `'standard'`. Values: `'standard'` | `'portfolio'`.

**New table -- `portfolio_sources` (join table):**
- `id` -- UUID primary key
- `portfolio_id` -- FK to roadmaps(id), cascade delete. Must reference a roadmap where `type = 'portfolio'`.
- `source_roadmap_id` -- FK to roadmaps(id), cascade delete. Must reference a roadmap where `type = 'standard'`.
- `sort_order` -- INTEGER, default 0. Controls display order of source roadmaps in the portfolio.
- `created_at` -- TIMESTAMPTZ

Unique constraint: `(portfolio_id, source_roadmap_id)` -- a source roadmap can only be added once to a given portfolio.

**What a portfolio does NOT have:**
- No items table rows of its own. Items are queried from source roadmaps at read time.
- No fields of its own. The portfolio view shows the union of fields from source roadmaps (name-matched where possible, displayed separately when distinct).
- No item_field_values. All field data comes from source roadmap items.

**How items are aggregated:**
- When loading a portfolio view, the server queries all items from all source roadmaps the user has access to.
- Each item carries a `sourceRoadmapId` and `sourceRoadmapName` annotation so the UI can color-code by source and link back.
- Items that belong to source roadmaps the user cannot access are excluded silently (no error, just not shown). This respects existing roadmap-level permissions without a separate portfolio permission model.
- Milestones from all source roadmaps are also aggregated.

**Sync model:** Portfolio views are live queries -- they always reflect the current state of source roadmaps. There is no caching or snapshot. When the user opens a portfolio, the server fetches current items from all sources. WebSocket updates from source roadmaps are NOT forwarded to the portfolio view in v1 (manual refresh to see changes). This avoids fan-out complexity.

#### Supported views

- **Timeline** -- Items from all source roadmaps rendered on a single timeline. The `colorByField` is overridden: items are colored by source roadmap (each source gets a color from the active palette). Stream headers can still be grouped by a field common across sources.
- **Swimlane** -- Items from all source roadmaps in swimlane layout. Column and row fields must exist across the sources. Defaults to swimlane-by-source-roadmap (each source is a column).
- **Table** -- NOT supported in v1 for portfolios. The field union problem (different roadmaps have different fields) makes a coherent table messy. Defer.

#### Acceptance criteria

**Creation:**
- [ ] On the Roadmaps homepage, a "New Portfolio" button sits alongside the existing "New Roadmap" button.
- [ ] Clicking "New Portfolio" opens a creation dialog: name the portfolio, then select 2+ source roadmaps from a list of all standard roadmaps in the account the user can access.
- [ ] Source roadmap picker shows roadmap name, owner name, and item count. Multi-select with checkboxes.
- [ ] The portfolio cannot be created with fewer than 2 source roadmaps. The "Create" button is disabled with a tooltip: "Select at least 2 roadmaps."
- [ ] On creation, the portfolio appears on the homepage with a distinct visual indicator (a "stacked" icon or similar to distinguish it from regular roadmaps).

**Viewing:**
- [ ] Opening a portfolio loads a Timeline view by default. The view shows all items from all source roadmaps.
- [ ] Items are color-coded by source roadmap. A legend in the toolbar shows which color corresponds to which source roadmap.
- [ ] Hovering an item shows a tooltip with: item name, source roadmap name, date range, and status field value (if a "Status" field exists on the source).
- [ ] Clicking an item navigates to that item's detail in the source roadmap (opens the source roadmap with the Item Card open for that item).
- [ ] The toolbar shows a "Sources" dropdown listing all source roadmaps. Each source has a visibility toggle (eye icon) to show/hide items from that source. All sources visible by default.
- [ ] Milestones from all source roadmaps appear on the timeline, labeled with source roadmap name prefix.
- [ ] The portfolio view supports the same time scales as standard Timeline (weeks, months, quarters, halves, years) and respects fiscal year settings.
- [ ] The Swimlane view is available as an alternative view type. Default layout: columns = source roadmaps, rows = a shared field (e.g., Status).

**Settings:**
- [ ] Portfolio settings are accessible via the existing roadmap settings pattern (gear icon).
- [ ] Settings allow: rename portfolio, add/remove source roadmaps, reorder sources (drag).
- [ ] Adding a source roadmap pulls in its items immediately.
- [ ] Removing a source roadmap removes its items from the portfolio view immediately.
- [ ] Deleting a source roadmap from the account automatically removes it from all portfolios (CASCADE on the FK).

**Read-only enforcement:**
- [ ] No "Add Item" button in the portfolio toolbar.
- [ ] No inline editing of item fields in the portfolio view.
- [ ] No drag-to-reschedule on the portfolio timeline.
- [ ] The Item Card does NOT open within the portfolio context -- clicking navigates to the source roadmap.

**API:**
- [ ] `POST /api/v1/portfolios` -- Create a portfolio. Body: `{ name, sourceRoadmapIds: string[] }`. Returns the created roadmap (type: portfolio) with its default view.
- [ ] `GET /api/v1/portfolios/:id/items` -- Aggregated items from all source roadmaps. Returns `{ data: PortfolioItem[], sources: { id, name, color }[] }`. Each PortfolioItem extends Item with `sourceRoadmapId` and `sourceRoadmapName`.
- [ ] `GET /api/v1/portfolios/:id/milestones` -- Aggregated milestones from all source roadmaps.
- [ ] `PATCH /api/v1/portfolios/:id` -- Update portfolio settings (name).
- [ ] `POST /api/v1/portfolios/:id/sources` -- Add source roadmap(s). Body: `{ roadmapIds: string[] }`.
- [ ] `DELETE /api/v1/portfolios/:id/sources/:roadmapId` -- Remove a source roadmap.
- [ ] `GET /api/v1/portfolios/:id/sources` -- List current sources with order.
- [ ] `PATCH /api/v1/portfolios/:id/sources/reorder` -- Reorder sources. Body: `{ orderedIds: string[] }`.

#### Interaction states

**Loading & Async:**
- [ ] While portfolio items are loading, show a skeleton timeline (gray placeholder bars across the time axis) or skeleton swimlane (placeholder cards).
- [ ] If the portfolio has many source roadmaps (5+), loading may take a moment. Show a progress indicator: "Loading items from N roadmaps..."
- [ ] On success, items render with source-color coding and the legend populates.
- [ ] Focus is not managed specially -- standard page load behavior.

**Error:**
- [ ] If loading portfolio items fails, show: "Could not load portfolio items. Retry." with a retry link.
- [ ] If a specific source roadmap fails to load (e.g., it was deleted between page loads), show items from the remaining sources with a notice: "1 source roadmap could not be loaded."
- [ ] If portfolio creation fails, show inline error in the creation dialog: "Could not create portfolio. Try again."

**Disabled:**
- [ ] The "Create" button is disabled until 2+ source roadmaps are selected.
- [ ] All editing affordances (add item, drag, inline edit) are absent from the portfolio view -- not disabled, just not rendered.
- [ ] Viewer-role users can view portfolios they have access to but cannot modify portfolio settings.

**Empty:**
- [ ] If a portfolio has no items (all source roadmaps are empty), show: "No items to display. Add items to the source roadmaps to see them here."
- [ ] If all source roadmaps are hidden via the Sources toggle, show: "All sources are hidden. Toggle a source on to see items."

**Timeout & Connectivity:**
- [ ] If loading portfolio items takes more than 10 seconds, show: "Still loading... Large portfolios may take a moment." Do not time out -- let the request complete.

---

### 3.2 RT-33: Collections / Folders

**US-33: Organize roadmaps into named collections**
As a user, I can create collections (folders) to organize my roadmaps on the homepage so I can quickly find what I need when the account has many roadmaps.

#### Data model

**New table -- `collections`:**
- `id` -- UUID primary key
- `account_id` -- FK to accounts(id), cascade delete
- `name` -- TEXT, NOT NULL, max 100 characters
- `sort_order` -- INTEGER, default 0
- `created_by` -- FK to users(id)
- `created_at` -- TIMESTAMPTZ
- `updated_at` -- TIMESTAMPTZ

**New table -- `collection_roadmaps` (many-to-many join):**
- `id` -- UUID primary key
- `collection_id` -- FK to collections(id), cascade delete
- `roadmap_id` -- FK to roadmaps(id), cascade delete
- `sort_order` -- INTEGER, default 0. Controls display order of roadmaps within the collection.
- `created_at` -- TIMESTAMPTZ

Unique constraint: `(collection_id, roadmap_id)` -- a roadmap can only appear once in a given collection (but can appear in multiple different collections).

**Key decisions:**
- A roadmap can belong to 0 or many collections (many-to-many).
- Collections are account-scoped -- all users in the account see the same collections.
- Collections contain both standard roadmaps and portfolio roadmaps.
- There are no nested collections (one level only).
- Roadmaps not in any collection still appear on the homepage in an "Uncategorized" group (not a real collection, just a UI grouping).

#### Acceptance criteria

**CRUD:**
- [ ] On the Roadmaps homepage, a "New Collection" button creates a new collection. Clicking opens an inline name input at the top of the page (similar to creating a new folder).
- [ ] Collection names must be between 1-100 characters. Validation on blur/submit.
- [ ] Each collection appears as a collapsible section on the homepage with a header showing: collection name, roadmap count, expand/collapse toggle.
- [ ] Collections are expanded by default. Collapse state persists in localStorage per user.
- [ ] A collection's header has an overflow menu (three-dot icon) with: Rename, Delete.
- [ ] Renaming a collection shows an inline text input replacing the name. Enter to save, Escape to cancel.
- [ ] Deleting a collection shows a confirmation: "Delete this collection? Roadmaps in this collection will not be deleted." On confirm, the collection is removed and its roadmaps move to Uncategorized.

**Adding/removing roadmaps:**
- [ ] Each roadmap card on the homepage has an overflow menu item "Move to Collection..." that opens a popover listing all collections with checkboxes. Checking/unchecking adds/removes the roadmap from that collection.
- [ ] A roadmap can be in multiple collections simultaneously (checkboxes, not radio buttons).
- [ ] When a roadmap is added to a collection, it appears in that collection section. If the roadmap was previously uncategorized, it no longer appears in the Uncategorized group (unless it's in zero collections).
- [ ] Alternatively, roadmaps can be drag-dropped between collection sections on the homepage.

**Ordering:**
- [ ] Collections can be reordered by dragging the collection header on the homepage. Drag handle visible on hover.
- [ ] Roadmaps within a collection can be reordered by dragging the roadmap card. Order is per-collection (the same roadmap in two collections can have different positions).

**Homepage layout:**
- [ ] The homepage groups roadmaps by collection: each collection is a section with its roadmaps listed inside.
- [ ] At the bottom, an "Uncategorized" section shows roadmaps that are not in any collection. This section does not appear if all roadmaps are categorized.
- [ ] If no collections exist, the homepage looks the same as today (flat list, no collection headers). Collections are additive -- they don't change the default experience.
- [ ] The existing Favorites section remains at the top, independent of collections. A favorited roadmap still appears in its collection(s) AND in the Favorites section.

**API:**
- [ ] `POST /api/v1/collections` -- Create a collection. Body: `{ name }`.
- [ ] `GET /api/v1/collections` -- List all collections in the account with their roadmap counts. Returns `{ data: Collection[] }`.
- [ ] `PATCH /api/v1/collections/:id` -- Update collection (name).
- [ ] `DELETE /api/v1/collections/:id` -- Delete collection. Roadmaps are not deleted.
- [ ] `POST /api/v1/collections/:id/roadmaps` -- Add roadmap(s) to collection. Body: `{ roadmapIds: string[] }`.
- [ ] `DELETE /api/v1/collections/:id/roadmaps/:roadmapId` -- Remove a roadmap from collection.
- [ ] `PATCH /api/v1/collections/reorder` -- Reorder collections. Body: `{ orderedIds: string[] }`.
- [ ] `PATCH /api/v1/collections/:id/roadmaps/reorder` -- Reorder roadmaps within collection. Body: `{ orderedRoadmapIds: string[] }`.
- [ ] The existing `GET /api/v1/roadmaps` endpoint should include `collectionIds: string[]` on each roadmap for the client to group by collection.

#### Interaction states

**Loading & Async:**
- [ ] When creating a collection, the name input shows a subtle spinner on submit until the server confirms. On success, the new collection section appears on the homepage.
- [ ] When adding a roadmap to a collection, the checkbox marks immediately (optimistic) and reverts on failure.
- [ ] Drag reorder saves on drop. A brief disabled state on the dragged element while saving.

**Error:**
- [ ] If collection creation fails, show inline error below the name input: "Could not create collection. Try again."
- [ ] If renaming fails, the name reverts to the previous value with a toast: "Rename failed."
- [ ] If adding a roadmap to a collection fails, the checkbox reverts with a toast: "Could not add roadmap to collection."

**Disabled:**
- [ ] Viewer-role users at the account level cannot create, rename, or delete collections. They can view the collection organization.
- [ ] The "New Collection" button is hidden for viewers. The overflow menu on collections does not show Rename/Delete for viewers.

**Empty:**
- [ ] If a collection has no roadmaps, show inside the section: "No roadmaps in this collection. Drag a roadmap here or use the roadmap menu to add one."
- [ ] If no collections and no roadmaps exist at all, the existing "Create your first roadmap" empty state shows (unchanged).

**Optimistic updates:**
- [ ] Adding/removing a roadmap from a collection is optimistic. The roadmap visually moves to/from the collection immediately.
- [ ] If the server rejects, the roadmap snaps back to its previous location with a toast error.

**Timeout & Connectivity:**
- [ ] If a reorder request times out, show toast: "Reorder could not be saved." The visual order reverts to the server-confirmed state.

---

### 3.3 RT-34: Buckets (No-Date Mode)

**US-34: Plan with buckets instead of dates**
As a product manager on an agile team, I can switch a roadmap to bucket mode where items are organized into fuzzy time horizons (Now / Next / Later) instead of exact dates so I can share a strategic roadmap without committing to specific dates.

#### Data model

**Roadmaps table change:**
- Add `bucket_mode` column: BOOLEAN, NOT NULL, DEFAULT `false`. When true, the roadmap operates in bucket mode.

**New table -- `buckets`:**
- `id` -- UUID primary key
- `roadmap_id` -- FK to roadmaps(id), cascade delete
- `name` -- TEXT, NOT NULL, max 50 characters
- `sort_order` -- INTEGER, NOT NULL, default 0
- `created_at` -- TIMESTAMPTZ
- `updated_at` -- TIMESTAMPTZ

**Items table change:**
- Add `bucket_id` column: UUID, nullable, FK to buckets(id) ON DELETE SET NULL. Only populated when the roadmap is in bucket mode.

**Key decisions:**
- Bucket mode is a **per-roadmap toggle**, not per-view. It's a fundamental property of the roadmap -- either your roadmap uses dates or it uses buckets.
- When bucket mode is enabled, items' `startDate` and `endDate` are **cleared and ignored.** Items are positioned by their `bucket_id` assignment instead. This is a one-way switch in v1 (date data is lost). A confirmation dialog warns the user before enabling.
- When bucket mode is disabled (standard mode), the `bucket_id` column is ignored. Buckets may still exist in the database but have no effect.
- Default buckets on enable: "Now", "Next", "Later" (3 buckets, sort_order 0, 1, 2). Users can customize names, add more, remove, and reorder.
- Items without a bucket assignment appear in an "Unassigned" area.
- Maximum 10 buckets per roadmap.

**What bucket mode changes:**
- Timeline view is **disabled** for bucket-mode roadmaps (timeline requires date ranges). Attempting to create a Timeline view shows a notice: "Timeline view requires dates. Switch to standard mode to use Timeline."
- Swimlane view becomes the **primary view**: columns = buckets, rows = a field (e.g., Status or Team). Items appear as cards in their bucket column.
- Table view works normally but the Start Date and End Date columns are hidden (replaced by a "Bucket" column).
- Item Card: the date pickers are hidden. A "Bucket" dropdown replaces them, letting the user assign the item to a bucket.
- CSV import: date columns are ignored. A "Bucket" column can map to bucket names (case-insensitive match, unmatched = Unassigned).
- CSV export: includes a "Bucket" column instead of Start Date / End Date.

#### Acceptance criteria

**Enabling bucket mode:**
- [ ] Roadmap settings include a "Planning Mode" section with two options: "Dates" (default) and "Buckets."
- [ ] Switching to Buckets shows a confirmation dialog: "Switch to bucket mode? Items will be organized by buckets instead of dates. Existing date values will be removed. This cannot be undone." Two buttons: "Switch to Buckets" (primary), "Cancel."
- [ ] On confirm, the roadmap's `bucket_mode` is set to true, all items' `startDate` and `endDate` are set to NULL, and three default buckets are created: "Now", "Next", "Later."
- [ ] The roadmap reloads in bucket mode. Any active Timeline views are automatically switched to Swimlane (with a toast: "Timeline view is not available in bucket mode. Switched to Swimlane.").
- [ ] Switching back from Buckets to Dates is NOT supported in v1. The "Dates" option is disabled with a note: "Cannot switch back to date mode. Create a new roadmap to use dates." This is a one-way door. (Reversibility is deferred -- it requires re-entering dates for all items, which is a UX challenge.)

**Managing buckets:**
- [ ] In roadmap settings (when bucket mode is on), a "Manage Buckets" section lists all buckets in order.
- [ ] Each bucket shows its name and an overflow menu with: Rename, Delete.
- [ ] Renaming a bucket shows an inline text input. Enter to save, Escape to cancel.
- [ ] Deleting a bucket shows confirmation: "Delete this bucket? Items in this bucket will become unassigned." On confirm, items in the deleted bucket have their `bucket_id` set to NULL.
- [ ] An "Add Bucket" button appends a new bucket with an inline name input. Default name: "Bucket N" (where N is the count + 1).
- [ ] Buckets can be reordered by drag. Sort order updates on drop.
- [ ] Maximum 10 buckets per roadmap. The "Add Bucket" button is disabled at 10 with a tooltip: "Maximum 10 buckets."
- [ ] Bucket names must be 1-50 characters. No duplicate names within the same roadmap.

**Swimlane view in bucket mode:**
- [ ] When bucket mode is active, the default Swimlane view uses `columnMode: 'buckets'` (a new option). Columns are the roadmap's buckets in sort order, plus an "Unassigned" column at the end.
- [ ] Items appear as cards in their assigned bucket column. Unassigned items appear in the Unassigned column.
- [ ] Rows can still be grouped by any field (Status, Team, etc.) -- same as standard Swimlane.
- [ ] Dragging a card between bucket columns reassigns the item to the new bucket.
- [ ] The column header shows the bucket name and item count.

**Table view in bucket mode:**
- [ ] Start Date and End Date columns are hidden.
- [ ] A "Bucket" column is added, showing the bucket name for each item. The cell is a dropdown to reassign.
- [ ] Sorting by Bucket sorts by bucket sort_order.
- [ ] Filtering by Bucket is supported (select one or more buckets + Unassigned).

**Item Card in bucket mode:**
- [ ] Date pickers (Start Date, End Date) are hidden.
- [ ] A "Bucket" field appears in the Fields section: a dropdown listing all buckets. Selecting a bucket assigns the item. "Unassigned" is an option.
- [ ] Key dates are hidden in bucket mode (key dates are date-specific, which conflicts with the bucket philosophy). Existing key dates are not deleted but are hidden from the UI.

**API:**
- [ ] `PATCH /api/v1/roadmaps/:id` -- Update roadmap. Accepts `{ bucketMode: true }`. When transitioning to bucket mode, the server: (1) clears all items' startDate and endDate, (2) creates 3 default buckets, (3) deletes any Timeline views. Returns the updated roadmap.
- [ ] `GET /api/v1/roadmaps/:id/buckets` -- List buckets for a roadmap, ordered by sort_order.
- [ ] `POST /api/v1/roadmaps/:id/buckets` -- Create a bucket. Body: `{ name }`.
- [ ] `PATCH /api/v1/buckets/:id` -- Update bucket (name).
- [ ] `DELETE /api/v1/buckets/:id` -- Delete bucket. Items are unassigned.
- [ ] `PATCH /api/v1/roadmaps/:id/buckets/reorder` -- Reorder buckets. Body: `{ orderedIds: string[] }`.
- [ ] `PATCH /api/v1/roadmaps/:roadmapId/items/:itemId` -- The existing item update endpoint accepts `{ bucketId }` to assign an item to a bucket.

#### Interaction states

**Loading & Async:**
- [ ] When switching to bucket mode, the confirmation dialog shows a spinner on the "Switch to Buckets" button during the transition (dates are being cleared, buckets created, views converted). The button text changes to "Switching..."
- [ ] On success, the page reloads in bucket mode.
- [ ] When dragging a card between bucket columns in Swimlane, the card snaps to the new column optimistically.

**Error:**
- [ ] If the bucket mode switch fails, show: "Could not switch to bucket mode. Your dates have not been changed. Try again." The roadmap stays in date mode.
- [ ] If bucket creation fails, show inline error: "Could not create bucket. Try again."
- [ ] If a drag-reassignment fails, the card snaps back to the original column with a toast: "Could not reassign item."

**Disabled:**
- [ ] Viewer-role users cannot switch planning mode, manage buckets, or reassign items. They can view bucket-mode roadmaps.
- [ ] The "Add Bucket" button is disabled at 10 buckets.
- [ ] The "Dates" radio button is disabled after switching to bucket mode.
- [ ] Timeline view creation is disabled for bucket-mode roadmaps with a notice.

**Empty:**
- [ ] If all items are unassigned (no items in any bucket), the Swimlane shows empty columns with: "Drag items here."
- [ ] If no items exist at all (empty roadmap in bucket mode): "No items yet. Add an item to get started."
- [ ] The "Unassigned" column shows: "Items without a bucket appear here" when empty.

**Optimistic updates:**
- [ ] Dragging items between buckets is optimistic -- card moves immediately. Server rejection reverts with toast error.
- [ ] Bucket rename is optimistic -- name updates immediately. Failure reverts.

**Timeout & Connectivity:**
- [ ] If the bucket mode switch times out, treat as failure. Show: "The operation timed out. Your dates have not been changed. Try again."

---

### 3.4 RT-35: Templates

**US-35: Start a new roadmap from a template**
As a user creating a new roadmap, I can pick from built-in templates so I can start with useful structure instead of a blank canvas, saving setup time and giving me ideas for how to organize my roadmap.

#### Data model

**Templates are server-side JSON definitions, NOT a database table.** Templates are bundled with the application as static JSON files (one per template) that the server reads at startup. This avoids database storage, migration, and the complexity of template CRUD. Templates are immutable -- users cannot edit or create templates in v1.

**Template file structure (per template):**
```json
{
  "id": "product-launch",
  "name": "Product Launch",
  "description": "Plan a product launch from concept to release. Includes phases, workstreams, and key milestones.",
  "category": "product",
  "thumbnail": "product-launch.svg",
  "data": {
    "fields": [
      { "name": "Status", "type": "list", "values": ["Planned", "In Progress", "Complete"] },
      { "name": "Team", "type": "list", "values": ["Engineering", "Design", "Marketing", "QA"] },
      { "name": "Priority", "type": "list", "values": ["High", "Medium", "Low"] },
      { "name": "Effort", "type": "numeric", "numericFormat": "number" }
    ],
    "items": [
      { "name": "Discovery & Research", "startOffset": 0, "durationDays": 14, "fieldValues": { "Status": "Planned", "Team": "Design" } },
      ...
    ],
    "milestoneTypes": [
      { "name": "Launch", "shape": "diamond", "color": "#EF4444" }
    ],
    "milestones": [
      { "name": "Beta Release", "dayOffset": 30, "typeName": "Launch" },
      ...
    ],
    "views": [
      { "name": "Timeline", "type": "timeline", "config": { ... } },
      { "name": "Board", "type": "swimlane", "config": { ... } }
    ]
  }
}
```

**Date computation:** Template items use `startOffset` (days from roadmap creation date) and `durationDays` instead of absolute dates. When the template is applied, the server computes actual dates from the creation date. This makes templates evergreen.

**Field value seeding:** Template fields and field values are created as real fields on the new roadmap. Field values on items are matched by name to the created field values.

#### Template catalog (12 templates)

| # | Name | Category | Items | Description |
|---|------|----------|-------|-------------|
| 1 | Product Launch | Product | ~15 | Plan a product launch from concept to release |
| 2 | Feature Development | Product | ~12 | Track a feature from discovery through delivery |
| 3 | Sprint Planning | Agile | ~10 | Organize a 2-week sprint with standard phases |
| 4 | Quarterly OKRs | Strategy | ~12 | Map quarterly objectives and key results |
| 5 | Marketing Campaign | Marketing | ~10 | Plan and execute a marketing campaign |
| 6 | Design System | Design | ~12 | Build out a component library step by step |
| 7 | Engineering Roadmap | Engineering | ~15 | Track technical initiatives across quarters |
| 8 | Sales Pipeline | Sales | ~8 | Map the sales process from lead to close |
| 9 | Onboarding Program | HR | ~10 | New hire onboarding timeline |
| 10 | Release Cycle | Engineering | ~12 | Manage a software release from planning to deploy |
| 11 | Customer Feedback | Product | ~8 | Triage and prioritize customer requests |
| 12 | Event Planning | Operations | ~10 | Plan an event from logistics to follow-up |

Each template includes 2-3 fields, 8-15 seed items with relative dates, 1-2 milestone types, 2-3 milestones, and 2 views (Timeline + Swimlane or Table).

#### Template picker UI

The template picker is integrated into the existing "New Roadmap" creation flow.

**Flow change:**
1. User clicks "New Roadmap" on the homepage.
2. Instead of going directly to a name input, a template picker dialog opens.
3. The dialog has two paths:
   - "Start from scratch" (the existing blank roadmap flow -- name input, create empty roadmap)
   - "Use a template" (grid of template cards)
4. Template cards show: thumbnail illustration, name, category tag, brief description.
5. Clicking a template card selects it (highlighted border). A "Use Template" button at the bottom confirms.
6. After selecting a template, the user enters the roadmap name (pre-filled with the template name, editable) and clicks "Create."
7. The server creates the roadmap and seeds it with template data. The user is navigated to the new roadmap with all the seed data loaded.

**Category filter:** The template picker has category tabs or a filter dropdown: All, Product, Agile, Strategy, Marketing, Design, Engineering, Sales, HR, Operations.

#### Acceptance criteria

**Template picker:**
- [ ] The "New Roadmap" button opens a template picker dialog instead of immediately creating a blank roadmap.
- [ ] The dialog shows "Start from scratch" as the first option (top-left card or prominent button), visually distinct from templates.
- [ ] Template cards display in a responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile).
- [ ] Each card shows: thumbnail SVG, template name, category tag, one-line description.
- [ ] Clicking a card selects it (blue highlight border). Only one can be selected at a time.
- [ ] Category filter tabs along the top: All (default), then one tab per category that has templates.
- [ ] A "Use Template" button is enabled when a template is selected. "Start from Scratch" is always available.
- [ ] After choosing a template or "Start from Scratch," a name input step appears. Name is pre-filled with the template name (or "Untitled Roadmap" for scratch). User can edit.
- [ ] "Create" button triggers roadmap creation and template seeding.

**Template seeding:**
- [ ] On creation with a template, the server creates: the roadmap, all fields + field values from the template, all items with computed dates and field value assignments, milestone types, milestones with computed dates, and views with config.
- [ ] Dates are computed from the creation date: `startDate = creationDate + startOffset`, `endDate = startDate + durationDays`.
- [ ] The created roadmap is a normal roadmap in every way -- the user can edit, add, remove items. There is no link back to the template.
- [ ] If a template references a field type or view config that is invalid, the seeding fails gracefully (creates the roadmap without the invalid parts, logs an error).

**"Start from scratch" path:**
- [ ] Behaves exactly as the current "New Roadmap" flow: creates an empty roadmap with no fields, items, or views. The default Timeline view is created automatically.

**API:**
- [ ] `GET /api/v1/templates` -- List all available templates. Returns `{ data: TemplateSummary[] }` where TemplateSummary includes: id, name, description, category, thumbnail, itemCount.
- [ ] `GET /api/v1/templates/:id` -- Get full template detail (preview purposes, optional in v1).
- [ ] `POST /api/v1/roadmaps` -- The existing roadmap creation endpoint accepts an optional `templateId` field. If provided, the server loads the template and seeds data after creating the roadmap.

#### Interaction states

**Loading & Async:**
- [ ] The template picker loads the template list on open. Show skeleton cards (3-6 gray placeholder cards) while loading.
- [ ] After selecting a template and clicking "Create," show a spinner on the Create button with text "Creating roadmap..." Template seeding may take 1-2 seconds.
- [ ] On success, navigate to the new roadmap. A toast: "Roadmap created from template."
- [ ] If creating from scratch, the existing instant-create behavior is preserved (no extra delay).

**Error:**
- [ ] If loading templates fails, show: "Could not load templates. Start from scratch or try again." The "Start from Scratch" option remains available.
- [ ] If template seeding fails, create the roadmap empty and show a toast: "Template could not be applied. Your roadmap was created empty." The user can still use the roadmap.
- [ ] If roadmap creation itself fails, show inline error: "Could not create roadmap. Try again."

**Disabled:**
- [ ] The "Create" button is disabled until a name is entered (minimum 1 character).
- [ ] The "Use Template" button is disabled until a template card is selected.
- [ ] During creation (spinner active), the "Create" button is disabled.

**Empty:**
- [ ] N/A -- there are always 12 templates available. If template loading fails, the "Start from Scratch" fallback is shown.

**Optimistic updates:**
- [ ] N/A -- creation waits for server confirmation before navigating.

**Timeout & Connectivity:**
- [ ] If template list loading times out, show: "Templates took too long to load. Start from scratch or retry."
- [ ] If roadmap creation times out, show: "Creation is taking longer than expected. Please wait..." Do not navigate away.

---

## 4. Technical Constraints

| Constraint | Value | Notes |
|-----------|-------|-------|
| Max source roadmaps per portfolio | 20 | Prevents unbounded aggregation queries. Enforced at API level. |
| Portfolio items: no editing | Read-only v1 | Click-through to source for mutations. |
| Portfolio real-time sync | Manual refresh | No WebSocket forwarding from sources to portfolio in v1. |
| Max collections per account | 50 | Prevents UI clutter. Enforced at API level. |
| Collection name length | 100 chars max | |
| Max buckets per roadmap | 10 | |
| Bucket name length | 50 chars max | |
| Bucket mode switch | One-way in v1 | Dates cleared on enable. Cannot revert. |
| Templates | 12 built-in, static JSON | No user-created templates. No database table. |
| Template date computation | Relative offsets from creation date | Items use startOffset + durationDays. |
| Template items | 8-15 per template | Keeps seeding fast. |
| Schema migrations | Additive + 2 column additions | New: portfolio_sources, collections, collection_roadmaps, buckets. Altered: roadmaps (add type, bucket_mode), items (add bucket_id). |
| Portfolio Table view | Not supported in v1 | Field union complexity deferred. |
| Key dates in bucket mode | Hidden, not deleted | Preserved in DB but not shown in UI. |

---

## 5. Database Schema Changes

Two new columns on existing tables, four new tables.

```sql
-- RT-32: Portfolio type on roadmaps
ALTER TABLE roadmaps ADD COLUMN type TEXT NOT NULL DEFAULT 'standard';
-- Values: 'standard', 'portfolio'

-- RT-32: Portfolio sources
CREATE TABLE portfolio_sources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id        UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  source_roadmap_id   UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_portfolio_source UNIQUE(portfolio_id, source_roadmap_id)
);

CREATE INDEX idx_portfolio_sources_portfolio ON portfolio_sources(portfolio_id);
CREATE INDEX idx_portfolio_sources_source ON portfolio_sources(source_roadmap_id);

-- RT-33: Collections
CREATE TABLE collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collections_account ON collections(account_id);

-- RT-33: Collection-Roadmap join
CREATE TABLE collection_roadmaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  roadmap_id      UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_collection_roadmap UNIQUE(collection_id, roadmap_id)
);

CREATE INDEX idx_collection_roadmaps_collection ON collection_roadmaps(collection_id);
CREATE INDEX idx_collection_roadmaps_roadmap ON collection_roadmaps(roadmap_id);

-- RT-34: Bucket mode on roadmaps
ALTER TABLE roadmaps ADD COLUMN bucket_mode BOOLEAN NOT NULL DEFAULT false;

-- RT-34: Buckets
CREATE TABLE buckets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id  UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buckets_roadmap ON buckets(roadmap_id);

-- RT-34: Bucket assignment on items
ALTER TABLE items ADD COLUMN bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL;
CREATE INDEX idx_items_bucket ON items(bucket_id);
```

**No changes to:** accounts, users, views, fields, field_values, item_field_values, milestones, milestone_types, item_activities, item_links, key_dates, comments, attachments, roadmap_shares, shared_links, roadmap_favorites, color_palettes.

---

## 6. Dependencies Between Stories

```
RT-32 (Portfolio) and RT-33 (Collections) have a MINOR interaction:
  - Collections should be able to contain portfolio roadmaps (the type column addition
    from RT-32). This means the collections UI should handle both standard and portfolio
    roadmaps. However, they can be built independently if the collections UI simply
    lists all roadmaps regardless of type.

RT-34 (Buckets) is fully independent.

RT-35 (Templates) is fully independent (templates create standard-mode roadmaps only;
  no bucket-mode or portfolio templates in v1).

Suggested build order for backend:
  1. RT-32 (type column on roadmaps) and RT-34 (bucket_mode column on roadmaps) --
     these alter the same table, so coordinate the migration.
  2. RT-33 (collections) and RT-35 (templates) -- fully independent of each other
     and can be built in parallel.
```

All four features touch different parts of the codebase:
- RT-32: Roadmap type column, new portfolio_sources table, portfolio aggregation queries, portfolio API routes, portfolio Timeline/Swimlane rendering
- RT-33: New collections + collection_roadmaps tables, collections API, homepage layout refactor
- RT-34: Bucket mode column on roadmaps, new buckets table, bucket_id on items, Swimlane bucket-column mode, Table bucket column, Item Card bucket field, bucket-mode transition logic
- RT-35: Static JSON template files, template list API, template seeding on roadmap creation, template picker UI

Backend work for all four can happen in parallel with one coordination point: the migration that alters the `roadmaps` table (type + bucket_mode columns should be in the same migration to avoid conflicts).

---

## 7. Pipeline Recommendation

This is a **full-stack sprint with significant new UI surfaces.** Four new tables, two column additions, new page sections, and a new creation flow.

**Recommended pipeline:**

1. **Andrei (Arch)** -- Needed. Key decisions:
   - Portfolio aggregation query design (how to efficiently join items from N source roadmaps)
   - Bucket mode transition logic (clearing dates, creating default buckets, converting views)
   - Template file format and loading strategy (bundled JSON, read at startup vs. lazy load)
   - Migration coordination (two ALTER TABLE on roadmaps in one migration)
   - Whether portfolio views reuse the existing view infrastructure or need modification
   - WebSocket event design for collections, bucket changes, portfolio source changes

2. After Andrei, run in parallel:
   - **Robert (Designer)** -- Design spec for:
     - Portfolio creation dialog, portfolio view (Timeline + Swimlane with source legend, click-through)
     - Collections on the homepage (collapsible sections, drag reorder, add/remove popover)
     - Bucket mode: settings toggle, bucket management, Swimlane bucket columns, Table bucket column, Item Card bucket field
     - Template picker dialog (card grid, category filter, name step)
     - Template card design (thumbnail, name, category, description)
   - **Jonah + Sam (BE)** -- Backend implementation. Coordinate so migrations don't conflict:
     - Jonah: RT-32 (portfolio) + RT-34 (buckets) -- these share the roadmaps table migration
     - Sam: RT-33 (collections) + RT-35 (templates) -- independent tables and APIs
   - **Priya (Marketer)** -- Needed this sprint. Template descriptions and names are user-facing copy. Portfolio and Buckets are differentiated features worth messaging.

3. **Alice (FE)** -- Frontend implementation after Robert's design spec AND backend APIs are ready:
   - Portfolio view rendering (aggregated Timeline/Swimlane, source legend, click-through)
   - Portfolio creation dialog
   - Collections on homepage (sections, drag reorder, popover)
   - Bucket mode toggle, bucket management UI, Swimlane bucket columns, Table bucket column
   - Template picker dialog and creation flow integration
   - **Nina** (Interactions) -- Recommended for: drag-drop between collections, drag between bucket columns, template card hover/select states
   - **Soren** (Responsive) -- Recommended for: template picker grid responsiveness, collection sections on mobile

4. **Robert (Designer)** -- Lightweight design review.

5. **Enzo (QA)** -- Release gate. Key focus areas in section 8.

**Agents NOT needed:**
- Amara (A11y) -- Standard controls (dropdowns, grids, dialogs) with existing patterns. No custom a11y challenges.
- Derek/Milo/Howard -- No integrations, infra changes, or payment work.
- Nadia -- Docs can batch with post-v1.1 documentation push.
- Zara/Leo -- No mobile changes.

**Early QA notification:** The `roadmaps` table is being altered with two new columns (`type`, `bucket_mode`). While both are additive with safe defaults, the bucket mode transition logic (clearing dates, converting views) is a **Restructure-adjacent concern**. Recommend notifying Enzo early so he can plan regression test cases for:
- Existing roadmaps are unaffected by the new columns (default values preserve current behavior)
- Bucket mode transition correctly clears dates and converts views
- Portfolio queries do not interfere with standard roadmap loading
- Homepage rendering with 0 collections (backward compatible)

---

## 8. Acceptance Test Summary

| Feature | Happy path test | Key edge cases |
|---------|----------------|----------------|
| **Portfolio -- create** | Create portfolio with 3 source roadmaps -> shows aggregated Timeline | Create with 1 source (rejected), create with 20 sources (allowed), create with 21 (rejected) |
| **Portfolio -- view** | Open portfolio -> items from all sources visible, color-coded | Source with 0 items (empty column in legend), source roadmap deleted (items disappear, no error), user lacks access to one source (its items excluded silently) |
| **Portfolio -- settings** | Add/remove source roadmap -> items update | Remove last source below 2 (should be prevented or warn), reorder sources -> legend order changes |
| **Portfolio -- read-only** | Click item -> navigates to source roadmap | Verify: no Add Item button, no drag, no inline edit in portfolio |
| **Collections -- create** | Create collection "Q1 Plans" -> appears on homepage | Empty name (rejected), 101-char name (rejected), 51st collection (rejected) |
| **Collections -- add roadmap** | Add roadmap to collection via menu -> appears in section | Add same roadmap twice (no-op), add to multiple collections (appears in both), remove from all (goes to Uncategorized) |
| **Collections -- reorder** | Drag collection header -> order changes | Drag roadmap between collections -> moves correctly |
| **Collections -- delete** | Delete collection -> roadmaps move to Uncategorized | Delete collection with 0 roadmaps (clean delete) |
| **Buckets -- enable** | Switch to bucket mode -> dates cleared, 3 default buckets created | Roadmap with 100 items (all dates cleared), roadmap with Timeline views (converted to Swimlane) |
| **Buckets -- manage** | Add bucket, rename, reorder, delete | Add 11th bucket (rejected), delete bucket with items (items become unassigned), empty name (rejected) |
| **Buckets -- Swimlane** | View bucket-mode Swimlane -> columns are buckets | Drag item between buckets, filter by bucket, empty bucket (shows placeholder) |
| **Buckets -- Table** | View bucket-mode Table -> Bucket column visible, no date columns | Sort by bucket, filter by bucket, change bucket via dropdown |
| **Buckets -- Item Card** | Open item -> Bucket dropdown instead of date pickers | Assign bucket, change bucket, set to Unassigned |
| **Buckets -- irreversibility** | Try to switch back to Dates -> option is disabled | |
| **Templates -- picker** | New Roadmap -> template picker shows 12 cards | Category filter (shows subset), "Start from Scratch" (creates blank roadmap) |
| **Templates -- create from template** | Select "Product Launch" -> create -> roadmap has seeded items, fields, views | Template with bad data (graceful fallback to empty roadmap), all 12 templates work |
| **Templates -- seeded data** | Open template-created roadmap -> items have computed dates, fields have values, views are configured | Verify dates are offset from creation date, milestone dates are correct |
| **Permissions** | Viewer cannot: create portfolio, create collection, switch bucket mode, create roadmap | Editor can: create roadmap from template, view portfolio, view collections. Admin can: all. |

---

## 9. Sprint Sequencing (Full v1.1 Roadmap)

| Sprint | Items | Theme | Status |
|--------|-------|-------|--------|
| **Sprint A** | RT-19, RT-25, RT-30 | Stakeholder & daily use | Shipped |
| **Sprint B** | RT-24, RT-26, RT-27 | Item depth (dependencies, sub-items, key dates) | Shipped |
| **Sprint C** | RT-28, RT-29, RT-31 | Collaboration & data (comments, CSV, fiscal year) | Shipped |
| **Sprint D (this sprint)** | RT-32, RT-33, RT-34, RT-35 | Portfolio & scale (portfolio, collections, buckets, templates) | Ready for pipeline |

---

*Requirements written by Thomas (PM). Andrei: read this for the Sprint D tech approach -- focus on portfolio aggregation queries, bucket mode transition logic, template loading strategy, and the shared roadmaps table migration. Robert: read this + Andrei's tech approach for the design pass -- four new UI surfaces (portfolio view, collections on homepage, bucket mode throughout, template picker). Jonah + Sam: read this + Andrei's tech approach, split as recommended (Jonah: RT-32 + RT-34, Sam: RT-33 + RT-35). Alice: read all three for implementation. Nina/Soren: review template picker and collection drag interactions. Enzo: use section 8 as your test plan starting point, and plan regression cases for the roadmaps table changes.*
