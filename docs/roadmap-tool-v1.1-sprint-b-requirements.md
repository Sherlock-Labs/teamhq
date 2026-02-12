# Roadmap Tool v1.1 Sprint B -- Item Depth

**Author:** Thomas (PM)
**Date:** February 12, 2026
**Status:** Ready for pipeline
**Project ID:** `roadmap-tool`
**Sprint goal:** Deepen the item model with dependencies, sub-items, and key dates. These three features transform items from flat entries into rich, structured nodes -- the foundation for real project planning.

---

## 1. Sprint Context

### Where we are

Sprint A shipped: PNG export (RT-19), timeline drag-and-drop (RT-25), and presentation mode (RT-30). The roadmap tool is now a daily-driver for viewing and adjusting plans. What it lacks is depth -- items exist in isolation. You cannot express "this depends on that," break an initiative into sub-tasks, or mark internal milestones within a single item.

### Why these three features together

RT-24 (dependencies), RT-26 (sub-items), and RT-27 (key dates) are the "item depth" bundle. They share:

- **Schema changes:** All three add new tables or columns to the items data model.
- **Cross-view rendering:** All three need visual representation in Timeline, Swimlane, and Table views.
- **API surface:** All three extend the items API with new endpoints for links, children, and key dates.
- **Backend ownership overlap:** Jonah builds all three sets of endpoints, minimizing context switching.

Shipping them together means one round of schema migrations, one Andrei architecture pass, one Robert design pass, and one Enzo QA cycle for the full "item depth" story.

### What's deferred

| ID | Feature | Phase | Why deferred |
|----|---------|-------|--------------|
| RT-28 | Comments and activity log | Sprint C | Standalone real-time feature. No dependency on item depth. |
| RT-29 | CSV import/export | Sprint C | Data portability. Useful but not blocking planning workflows. |
| RT-31 | Fiscal year settings | Sprint C | Low-priority account config. |
| RT-32 | Portfolio roadmaps | Sprint D (v2.0) | Multi-roadmap roll-up. Major scope. |
| RT-33 | Collections / folders | Sprint D (v2.0) | Organizational UI. |
| RT-34 | Buckets (no-date mode) | Sprint D (v2.0) | Fundamental data model change. |
| RT-35 | Templates | Sprint D (v2.0) | Content + UI for onboarding. |

---

## 2. Scope

### In scope

1. **RT-24: Link items (dependencies)** -- Create typed links between items. Visualize dependency arrows on Timeline.
2. **RT-26: Sub-items** -- Nest items under parent items. Show hierarchy in all three views.
3. **RT-27: Key dates** -- Named date markers within items ("Design Complete: Mar 15"). Show on Timeline bars.

### Out of scope

- Auto-scheduling / critical-path calculation based on dependencies (defer to v2.0 -- this is a massive algorithmic feature)
- Drag dependency arrows between items on the Timeline (this sprint: manage links in the Item Card; arrows are read-only on Timeline)
- Sub-item progress rollup (e.g., "3 of 5 sub-items complete" auto-updating a percentage field) -- defer to v2.0
- Key dates on sub-items (key dates attach to top-level items only in this sprint)
- Dependency conflict detection (e.g., warning when a blocked item starts before its blocker ends) -- defer to Sprint C or v2.0
- Multi-level nesting (sub-sub-items) -- one level only: parent -> children

---

## 3. User Stories

### 3.1 RT-24: Link Items (Dependencies)

**US-24: Link items to express dependencies and relationships**
As a user, I can create typed links between items so I can see which items block each other, move together, or relate to each other.

#### Acceptance criteria

**Link types:**
- [ ] Three link types are available:
  - **Blocks / Blocked by** -- Item A blocks Item B (directional). Displayed as "A blocks B" on Item A and "Blocked by A" on Item B.
  - **Moves with** -- Item A and Item B are coupled (bidirectional). If one moves, the user gets a notification (no auto-move in this sprint).
  - **Relates to** -- Informational link (bidirectional). No special behavior, just a reference.

**Creating links:**
- [ ] Links are created from the Item Card, in the "Linked Items" tab (currently shows the v1.1 placeholder).
- [ ] The tab shows a list of existing links grouped by type: "Blocks", "Blocked by", "Moves with", "Relates to".
- [ ] An "Add Link" button opens a popover with:
  - A search input to find items by name (searches within the current roadmap).
  - A link type selector: dropdown with the three types.
  - A "Link" button to confirm.
- [ ] When linking with "Blocks", the user selects which direction: "This item blocks [selected item]" or "[Selected item] blocks this item."
- [ ] Duplicate links are prevented (cannot link the same two items with the same type twice).
- [ ] An item cannot link to itself.

**Viewing links:**
- [ ] Each linked item shows: link type icon, item name (clickable -- opens that item's Item Card), and a remove button (X icon, on hover).
- [ ] The link count badge on the Linked Items tab updates as links are added/removed.
- [ ] In the Table View, a "Links" column can be shown. It displays a count badge (e.g., "3 links"). Clicking the badge opens the item's Linked Items tab.

**Timeline dependency lines:**
- [ ] On the Timeline, items with "Blocks" relationships render an arrow from the blocker to the blocked item.
- [ ] Arrow style: 1.5px stroke, `--gray-400` color, solid line. Arrow flows from the right edge of the blocker to the left edge of the blocked item.
- [ ] Arrow has a small arrowhead (6px) at the end pointing to the blocked item.
- [ ] If the blocker ends after the blocked item starts (potential conflict), the arrow renders in `--error-600` to visually flag the overlap.
- [ ] "Moves with" links render as a dashed line (2px dash, 2px gap) in `--gray-300` between the two items. No arrowhead.
- [ ] "Relates to" links are NOT rendered on the Timeline (too noisy). They are visible only in the Item Card.
- [ ] Dependency lines route around other items if possible (simple right-angle routing: exit right, go down/up, enter left). If routing is too complex, a straight diagonal line is acceptable for v1.1.

**Deleting links:**
- [ ] Clicking the remove button (X) on a linked item removes the link immediately.
- [ ] Removing a link from one side removes it from both sides (if it is "Blocks A", removing from A also removes from B).

**Real-time:**
- [ ] Link creation and removal broadcast via WebSocket to other connected users. The dependency arrows update in real time on other users' Timelines.

**API:**
- [ ] `POST /api/v1/roadmaps/:roadmapId/items/:itemId/links` -- Create a link. Body: `{ targetItemId, linkType }`.
- [ ] `GET /api/v1/roadmaps/:roadmapId/items/:itemId/links` -- List links for an item.
- [ ] `DELETE /api/v1/item-links/:id` -- Remove a link.
- [ ] Links are included in the bulk items response (`GET /api/v1/roadmaps/:roadmapId/items`) so Timeline can render arrows without extra requests.

#### Interaction states

**Loading & Async:**
- [ ] When creating a link, the "Link" button shows a spinner and is disabled until the server confirms.
- [ ] On success, the new link appears in the list and the badge count increments.
- [ ] On success, focus returns to the "Add Link" button.

**Error:**
- [ ] If the link creation fails, show an inline error below the popover: "Failed to create link. Try again."
- [ ] If the target item no longer exists (deleted by another user), show: "Item not found. It may have been deleted."
- [ ] If a duplicate link is attempted, show: "These items are already linked."

**Disabled:**
- [ ] The "Add Link" button is disabled for viewer-role users (tooltip: "You don't have permission to edit this item").
- [ ] The remove button (X) is hidden for viewer-role users.

**Empty:**
- [ ] When no links exist, show: "No linked items yet. Add links to show dependencies between items."

**Optimistic updates:**
- [ ] N/A -- link creation waits for server confirmation before displaying (links are structural, not worth optimistic risk).

---

### 3.2 RT-26: Sub-Items

**US-26: Create sub-items to break work into smaller pieces**
As a user, I can nest items under a parent item so I can break large initiatives into manageable pieces while keeping the parent visible on the roadmap.

#### Acceptance criteria

**Data model:**
- [ ] Items can have a `parentId` referencing another item in the same roadmap.
- [ ] Only one level of nesting is supported (a sub-item cannot have its own sub-items).
- [ ] Sub-items inherit the parent's roadmap but have their own independent field values, dates, and descriptions.

**Creating sub-items:**
- [ ] In the Item Card, the "Sub-Items" tab (currently shows the v1.1 placeholder) lists child items.
- [ ] An "Add Sub-Item" button creates a new item with the current item as its parent. The new sub-item's name field is immediately focused for typing.
- [ ] In the Table View, hovering over a parent item's row reveals a small indent-right icon (next to the row's + button). Clicking it creates a sub-item under that parent.
- [ ] Existing items can be converted to sub-items by dragging them under a parent in the Table View, or by setting the parentId via the Item Card's "Parent" field.

**Table View rendering:**
- [ ] Sub-items appear directly below their parent, indented 24px from the left.
- [ ] Parent items have an expand/collapse chevron to the left of their name. Clicking it toggles visibility of sub-items.
- [ ] The expand/collapse state persists in the view config (so it survives page reload).
- [ ] The item count in the footer includes both parents and sub-items (e.g., "23 items (5 sub-items)").

**Timeline View rendering:**
- [ ] Parent items that have sub-items render as a "summary bar" -- a thinner bar (height: 8px in spacious, 6px in compact) that spans from the earliest sub-item start date to the latest sub-item end date.
- [ ] The summary bar uses the same color as the parent's assigned palette color but at 40% opacity, with small downward-pointing "bracket" marks at each end.
- [ ] Sub-item bars render below the summary bar, at normal height, indented under their parent's header group.
- [ ] If the parent item has its own dates AND sub-items, the parent's own dates define the summary bar span (not auto-calculated from children).
- [ ] If the parent item has NO dates but has sub-items with dates, the summary bar auto-spans from earliest to latest child dates.
- [ ] Collapse behavior: clicking the parent's expand chevron (in the header area) collapses sub-items. When collapsed, only the summary bar is visible.

**Swimlane View rendering:**
- [ ] Parent items show a sub-item count badge in the bottom-right corner of the card: a small pill with "3 sub-items" text in `--text-xs`.
- [ ] Clicking the badge opens the parent's Item Card, scrolled to the Sub-Items tab.
- [ ] Sub-items do NOT appear as separate cards in the Swimlane grid (they are contained within their parent). This keeps the Swimlane from getting cluttered.

**Item Card Sub-Items tab:**
- [ ] Lists all sub-items in a compact table: checkbox + name (clickable -- opens that sub-item's Item Card) + key field values (e.g., status, dates).
- [ ] Drag handle on each sub-item row for reordering (updates `sort_order`).
- [ ] "Add Sub-Item" button at the bottom.
- [ ] Each sub-item row has a three-dot menu: Open, Remove from parent (converts back to standalone item), Delete.

**Removing parent-child relationship:**
- [ ] "Remove from parent" converts the sub-item to a standalone item (sets `parentId = null`). The item keeps all its data.
- [ ] Deleting a parent item shows a confirmation: "Delete [item name] and its N sub-items?" Deleting the parent cascades to delete all sub-items.

**API:**
- [ ] Item creation accepts optional `parentId` in the body.
- [ ] Item update accepts `parentId` (to convert an existing item to a sub-item or remove parent relationship).
- [ ] `GET /api/v1/roadmaps/:roadmapId/items` includes `parentId` in the response for each item, and optionally a `children` array when `?include=children` is passed.
- [ ] Sub-items respect the same permissions as their parent's roadmap.

**Real-time:**
- [ ] Sub-item creation, deletion, and parent changes broadcast via WebSocket.

#### Interaction states

**Loading & Async:**
- [ ] When creating a sub-item, the new row appears immediately with the name field focused. Save happens on blur/Enter.
- [ ] On success, the sub-item is confirmed in the list.
- [ ] On failure, the row is removed and a toast shows: "Failed to create sub-item. Try again."

**Error:**
- [ ] If attempting to nest a sub-item under another sub-item, show inline error: "Sub-items cannot have their own sub-items."
- [ ] If the parent item is deleted while viewing its sub-items, redirect to the roadmap view with a toast: "Parent item was deleted."

**Disabled:**
- [ ] "Add Sub-Item" button disabled for viewer-role users.
- [ ] Drag reorder handles hidden for viewer-role users.

**Empty:**
- [ ] When a parent has no sub-items: "No sub-items yet. Break this item into smaller pieces."

**Optimistic updates:**
- [ ] Sub-item creation is optimistic: the row appears immediately, name field is focused.
- [ ] On server rejection, the row is removed with a brief fade-out animation.

---

### 3.3 RT-27: Key Dates

**US-27: Add named date markers to items**
As a user, I can add key dates to an item (e.g., "Design Complete: Mar 15", "Review Deadline: Apr 1") so I can track important internal milestones within an item's timeline.

#### Acceptance criteria

**Data model:**
- [ ] Each item can have 0 to 10 key dates.
- [ ] Each key date has: a `name` (string, max 100 chars) and a `date` (DATE).
- [ ] Key dates are ordered by date ascending.

**Managing key dates:**
- [ ] Key dates are managed in the Item Card's Fields tab, in a dedicated "Key Dates" section below the standard fields.
- [ ] The section shows a list of existing key dates: name + date (formatted "MMM DD, YYYY") + delete button (X, on hover).
- [ ] An "Add Key Date" button adds a new row with two inline inputs: name (text) and date (date input).
- [ ] Key date names can be edited inline (click to edit).
- [ ] Key date dates can be changed inline (click the date to edit).
- [ ] Changes auto-save with 500ms debounce.

**Timeline View rendering:**
- [ ] Key dates appear as small diamond markers (8px) on the item's bar, positioned at the key date's x-axis position.
- [ ] Marker color: `--gray-600` (distinct from the bar's fill color).
- [ ] Hover over a key date marker shows a tooltip: "Design Complete: Mar 15, 2026".
- [ ] If the key date falls outside the item's date range, the marker still renders at the correct x-position but with a dashed outline instead of a filled diamond, indicating it is outside the item's span.

**Table View rendering:**
- [ ] A "Key Dates" column can be shown in the Table View.
- [ ] The column displays the next upcoming key date (or the most recent past one if all are past): "Design Complete: Mar 15" in `--text-xs`.
- [ ] If the item has multiple key dates, a "+N more" badge is appended. Clicking it opens the Item Card.

**Swimlane View rendering:**
- [ ] Key dates are not shown on Swimlane cards (too detailed for card view). They are accessible via the Item Card.

**API:**
- [ ] `GET /api/v1/roadmaps/:roadmapId/items/:itemId/key-dates` -- List key dates.
- [ ] `POST /api/v1/roadmaps/:roadmapId/items/:itemId/key-dates` -- Create key date. Body: `{ name, date }`.
- [ ] `PATCH /api/v1/key-dates/:id` -- Update key date.
- [ ] `DELETE /api/v1/key-dates/:id` -- Delete key date.
- [ ] Key dates are included in the bulk items response so the Timeline can render markers without extra requests.

**Real-time:**
- [ ] Key date creation, update, and deletion broadcast via WebSocket.

#### Interaction states

**Loading & Async:**
- [ ] When adding a key date, the row appears immediately with both fields empty and the name field focused.
- [ ] Save triggers on blur or Enter when both fields are filled. If only one field is filled on blur, the row persists as a draft (client-side only) until the other field is filled.
- [ ] On success, no visible change (auto-save).
- [ ] On save failure, show a brief red outline on the row and a tooltip: "Failed to save key date."

**Error:**
- [ ] If the user tries to add more than 10 key dates, the "Add Key Date" button is disabled with tooltip: "Maximum of 10 key dates per item."
- [ ] If the key date name is empty on save, show validation error: "Name is required."

**Disabled:**
- [ ] "Add Key Date" button disabled for viewer-role users.
- [ ] Delete (X) hidden for viewer-role users.
- [ ] Name and date inputs are read-only for viewer-role users.

**Empty:**
- [ ] When no key dates exist: "No key dates. Track important milestones within this item."

**Optimistic updates:**
- [ ] N/A -- key date changes use auto-save with debounce. The UI reflects the local state immediately; server sync is in the background.

---

## 4. Technical Constraints

| Constraint | Value | Notes |
|-----------|-------|-------|
| Max links per item | 50 | Prevent abuse. Soft limit enforced in API. |
| Max sub-items per parent | 50 | Prevent deeply nested performance issues. |
| Max key dates per item | 10 | UI becomes unwieldy beyond this. |
| Nesting depth | 1 level | Parent -> children only. No sub-sub-items. |
| Dependency line rendering | SVG paths | Use `<path>` elements with right-angle routing. Lines render in a dedicated SVG layer above item bars. |
| Dependency line performance | Max 200 visible arrows | Beyond 200, show only arrows for selected/hovered items. |
| Summary bar calculation | Client-side | The parent summary bar span is calculated from child dates on the client, not stored server-side. |
| Schema migration | Additive only | New tables (`item_links`, `key_dates`) and one new column (`items.parent_id`). No destructive changes to existing tables. |

---

## 5. Database Schema Changes

These are the new tables and columns required. Andrei should review and finalize in the tech approach.

```sql
-- RT-24: Item links
CREATE TABLE item_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id    UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  source_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  link_type     TEXT NOT NULL CHECK (link_type IN ('blocks', 'moves_with', 'relates_to')),
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_item_id, target_item_id, link_type)
);

CREATE INDEX idx_item_links_source ON item_links(source_item_id);
CREATE INDEX idx_item_links_target ON item_links(target_item_id);
CREATE INDEX idx_item_links_roadmap ON item_links(roadmap_id);

-- RT-26: Sub-items (column addition to existing items table)
ALTER TABLE items ADD COLUMN parent_id UUID REFERENCES items(id) ON DELETE CASCADE;
CREATE INDEX idx_items_parent ON items(parent_id);

-- RT-27: Key dates
CREATE TABLE key_dates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  date          DATE NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_key_dates_item ON key_dates(item_id);
```

---

## 6. Dependencies Between Stories

```
RT-26 (Sub-items) -- no internal dependencies, can be built independently
RT-27 (Key dates) -- no internal dependencies, can be built independently
RT-24 (Dependencies) -- no internal dependencies, can be built independently

However: all three share the items API response shape. Backend should define the
expanded response format (with links, parentId, children, keyDates) holistically
rather than three separate API refactors.
```

All three are independent in terms of feature logic, but the backend API response for items should be designed as a cohesive expansion. Jonah should plan the items response shape once to accommodate all three features rather than three sequential refactors.

On the frontend, the three features touch different parts of the views:
- RT-24 (links) primarily touches the Item Card (Linked Items tab) and Timeline (SVG dependency arrows)
- RT-26 (sub-items) touches all three views and the Item Card (Sub-Items tab)
- RT-27 (key dates) primarily touches the Item Card (Fields tab), Timeline (markers), and Table (column)

---

## 7. Pipeline Recommendation

This is a **full-stack sprint**. Schema changes, new API endpoints, and rendering changes across all views.

**Recommended pipeline:**

1. **Andrei (Arch)** -- Needed. Schema changes, new tables, expanded API response design, dependency line SVG routing approach, summary bar rendering strategy. Write a Sprint B tech approach addendum.

2. After Andrei, run in parallel:
   - **Robert (Designer)** -- Design addendum for:
     - Item Card Linked Items tab (link list, add link popover, link type selector)
     - Item Card Sub-Items tab (compact table, add/reorder/remove)
     - Key Dates section in Fields tab
     - Timeline dependency arrows (routing, colors, conflict highlighting)
     - Timeline summary bars for parent items
     - Timeline key date markers
     - Table View indentation and expand/collapse for sub-items
     - Swimlane sub-item count badge
   - **Jonah (BE)** -- Backend implementation:
     - Schema migration (3 new tables/columns)
     - Item links CRUD API
     - Key dates CRUD API
     - Expanded items response (parentId, children, links, keyDates)
     - WebSocket broadcast for new entity types
   - **Priya (Marketer)** -- Not needed this sprint (internal feature depth, not a user-facing launch moment)

3. **Alice (FE)** -- Frontend implementation after Robert's design spec AND Jonah's API are ready:
   - Item Card: Linked Items tab, Sub-Items tab, Key Dates section
   - Timeline: dependency arrows (SVG paths), summary bars, key date markers
   - Table: sub-item indentation, expand/collapse, links column, key dates column
   - Swimlane: sub-item count badge

4. **Nina (Interactions)** -- Review dependency arrow rendering, summary bar collapse/expand animation, sub-item drag reorder feel.

5. **Robert (Designer)** -- Lightweight design review.

6. **Enzo (QA)** -- Release gate. Focus areas in section 8.

**Agents NOT needed:**
- Sam (BE-2) -- Jonah can handle the API scope solo; it is three focused CRUD endpoints plus one migration
- Soren/Amara -- No new responsive patterns or a11y patterns beyond what exists
- Derek/Milo/Howard -- No integrations, infra, or payment changes
- Nadia -- Defer docs until Sprint C (batch docs for B and C together)
- Priya -- No external-facing messaging needed

**Early QA notification:** The `items` table schema is being modified (adding `parent_id` column). This is additive and non-destructive, but Enzo should be aware that all existing item-related tests need regression testing against the schema change.

---

## 8. Acceptance Test Summary

| Feature | Happy path test | Key edge cases |
|---------|----------------|----------------|
| **Links -- create** | Link Item A "blocks" Item B -> both items show the link in their Linked Items tab | Link to self (rejected), duplicate link (rejected), link with "moves with" (bidirectional) |
| **Links -- Timeline arrows** | Two items with "blocks" link -> arrow renders from A to B | Blocker ends after blocked starts (red arrow), many arrows (>200, performance), items in different header groups (arrow routes between groups) |
| **Links -- delete** | Remove link from Item A -> disappears from both A and B, arrow removed from Timeline | Delete an item that has links (cascade), real-time sync to other users |
| **Sub-items -- create** | Add sub-item to parent -> appears in Sub-Items tab and indented in Table | Max nesting (cannot nest under sub-item), create via Table View indent button, create via drag |
| **Sub-items -- Timeline** | Parent with 3 sub-items -> summary bar spans earliest to latest child dates | Parent has its own dates (summary uses parent dates), collapse sub-items (only summary visible), parent with no dates but children with dates |
| **Sub-items -- delete parent** | Delete parent -> confirmation shows N sub-items will be deleted | Remove from parent (converts to standalone), delete single sub-item |
| **Key dates -- create** | Add "Design Complete: Mar 15" -> marker appears on Timeline bar | 10 key date limit, date outside item range (dashed marker), key date with empty name (validation) |
| **Key dates -- Table** | Key dates column shows next upcoming date | Multiple key dates ("+N more" badge), all past key dates (shows most recent) |
| **Permissions** | Viewer cannot add links, sub-items, or key dates | Editor can manage all three, edit-locked items prevent changes |

---

## 9. Sprint Sequencing (Full v1.1 Roadmap)

| Sprint | Items | Theme | Status |
|--------|-------|-------|--------|
| **Sprint A** | RT-19, RT-25, RT-30 | Stakeholder & daily use | Shipped |
| **Sprint B (this sprint)** | RT-24, RT-26, RT-27 | Item depth (dependencies, sub-items, key dates) | Ready for pipeline |
| **Sprint C** | RT-28, RT-29, RT-31 | Collaboration & data (comments, CSV, fiscal year) | Planned |
| **Sprint D (v2.0)** | RT-32, RT-33, RT-34, RT-35 | Portfolio & scale | Planned |

---

*Requirements written by Thomas (PM). Andrei: read this for the Sprint B tech approach addendum -- focus on schema changes, expanded API response, and dependency line SVG architecture. Robert: read this + Andrei's addendum for the design pass. Jonah: read this + Andrei's addendum for the backend build. Alice: read all three for implementation. Enzo: use section 8 as your test plan starting point.*
