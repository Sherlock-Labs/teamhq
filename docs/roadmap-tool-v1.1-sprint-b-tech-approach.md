# Roadmap Tool v1.1 Sprint B -- Technical Approach Addendum

**Author:** Andrei (Technical Architect)
**Date:** February 12, 2026
**Status:** Complete
**Project ID:** `roadmap-tool`
**Inputs:** `docs/roadmap-tool-v1.1-sprint-b-requirements.md` (Thomas), `docs/roadmap-tool-tech-approach.md` (original tech approach)
**Scope:** RT-24 (Item Links / Dependencies), RT-26 (Sub-Items), RT-27 (Key Dates)

---

## 1. Architectural Summary

Sprint B adds three new data entities to the items data model. All three are additive -- no existing tables are restructured, no existing columns are modified, and no existing API contracts change. The strategy is:

- **Two new tables** (`item_links`, `key_dates`) follow the same patterns as existing tables (UUID PKs, timestamps, cascade deletes, indexed FKs).
- **One new column** on the `items` table (`parent_id`) enables single-level hierarchy.
- **Three new route files** and **three new service files** follow the exact same structure as the existing items/fields/milestones routes and services.
- **The bulk items endpoint expands** to include links, key dates, and parentId in its response -- this is the key change that lets all three views render without extra requests.
- **Six new WebSocket event types** broadcast link, sub-item, and key-date changes using the established REST-then-broadcast pattern.

The frontend work splits into two categories: (1) Item Card tab content (straightforward React forms), and (2) Timeline SVG additions (dependency arrows, summary bars, key date markers). Category 2 is the highest-complexity work in this sprint.

---

## 2. Database Schema Changes

### 2.1 Migration File

A single Drizzle migration handles all three features. File: `server/src/db/migrations/0001_sprint_b_item_depth.sql`.

The generated SQL (from the Drizzle schema changes below) will produce statements equivalent to:

```sql
-- RT-26: Sub-items (column addition to existing items table)
ALTER TABLE items ADD COLUMN parent_id UUID REFERENCES items(id) ON DELETE CASCADE;
CREATE INDEX idx_items_parent ON items(parent_id);

-- RT-24: Item links
CREATE TABLE item_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id      UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  source_item_id  UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  target_item_id  UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  link_type       TEXT NOT NULL,  -- 'blocks', 'moves_with', 'relates_to'
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_item_link UNIQUE(source_item_id, target_item_id, link_type)
);
CREATE INDEX idx_item_links_source ON item_links(source_item_id);
CREATE INDEX idx_item_links_target ON item_links(target_item_id);
CREATE INDEX idx_item_links_roadmap ON item_links(roadmap_id);

-- RT-27: Key dates
CREATE TABLE key_dates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  date            DATE NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_key_dates_item ON key_dates(item_id);
```

**Key decisions:**

1. **`parent_id` uses ON DELETE CASCADE.** Deleting a parent cascades to all sub-items. This matches the requirements ("Delete parent and its N sub-items"). The confirmation dialog is a frontend concern -- the API just performs the cascade.

2. **`item_links` has a composite unique constraint on `(source_item_id, target_item_id, link_type)`.** This prevents duplicate links of the same type between the same pair. It still allows two items to have both a "blocks" and a "relates_to" link simultaneously, which is valid.

3. **`item_links.roadmap_id` is denormalized.** It could be derived from `source_item_id -> items.roadmap_id`, but including it directly avoids a JOIN when querying all links for a roadmap (needed for the bulk items response). It also ensures cascade delete works cleanly when a roadmap is deleted.

4. **`key_dates.sort_order`** is included per Thomas's spec (ordered by date ascending), but the actual ordering is done client-side by date. The `sort_order` column is reserved for future manual reordering.

5. **No CHECK constraint on `link_type`.** We validate the enum in Zod at the API layer, consistent with how we handle `fields.type` and `views.type` in the existing schema (no CHECK in DB, validated in code).

### 2.2 Drizzle Schema Additions

Add to `server/src/db/schema.ts`:

```typescript
// --- Item Links (RT-24) ---

export const itemLinks = pgTable('item_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  roadmapId: uuid('roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  sourceItemId: uuid('source_item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  targetItemId: uuid('target_item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  linkType: text('link_type').notNull(), // 'blocks', 'moves_with', 'relates_to'
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_item_links_source').on(table.sourceItemId),
  index('idx_item_links_target').on(table.targetItemId),
  index('idx_item_links_roadmap').on(table.roadmapId),
  unique('uq_item_link').on(table.sourceItemId, table.targetItemId, table.linkType),
]);

// --- Key Dates (RT-27) ---

export const keyDates = pgTable('key_dates', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  date: date('date').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_key_dates_item').on(table.itemId),
]);
```

And modify the existing `items` table definition:

```typescript
// Add to items table columns:
parentId: uuid('parent_id').references(() => items.id, { onDelete: 'cascade' }),

// Add to items table indexes (in the function callback):
index('idx_items_parent').on(table.parentId),
```

### 2.3 Migration Strategy

- **Additive only.** No existing columns are altered or removed. No data transformation.
- **Rollback plan:** Drop the two new tables and the `parent_id` column. Since no existing data is modified, rollback is clean: `DROP TABLE item_links; DROP TABLE key_dates; ALTER TABLE items DROP COLUMN parent_id;`
- **Zero downtime.** The migration adds nullable column + new tables. Existing queries continue to work without changes. The new `parent_id` column defaults to NULL (standalone item).
- **Run via:** `npm run db:generate -w server && npm run db:migrate -w server` (Drizzle standard flow).

---

## 3. API Design

All new endpoints follow the existing patterns: Express Router with `mergeParams`, Zod validation, service layer for business logic, WebSocket broadcast after mutation. The sender socket is excluded from broadcasts using the `x-socket-id` header.

### 3.1 Item Links API (RT-24)

**New route file:** `server/src/routes/itemLinks.ts`
**New service file:** `server/src/services/itemLinkService.ts`

```
POST   /api/v1/roadmaps/:roadmapId/items/:itemId/links      Create a link
GET    /api/v1/roadmaps/:roadmapId/items/:itemId/links       List links for an item
DELETE /api/v1/item-links/:id                                 Remove a link
```

**Mount in `server/src/index.ts`:**
```typescript
// Nested under items (roadmap context)
app.use('/api/v1/roadmaps/:roadmapId/items/:itemId/links', itemLinksRouter);
// Top-level for delete (no roadmap context needed -- ID is unique)
app.use('/api/v1/item-links', itemLinkActionsRouter);
```

**Create link -- `POST /api/v1/roadmaps/:roadmapId/items/:itemId/links`**

Request body:
```typescript
{
  targetItemId: string;   // UUID of the other item
  linkType: 'blocks' | 'moves_with' | 'relates_to';
}
```

Validation (Zod):
```typescript
export const createItemLinkSchema = z.object({
  targetItemId: z.string().uuid(),
  linkType: z.enum(['blocks', 'moves_with', 'relates_to']),
});
```

Service logic:
1. Verify source item (`itemId`) exists in this roadmap.
2. Verify target item (`targetItemId`) exists in the same roadmap. Return 404 if not found ("Item not found. It may have been deleted.").
3. Verify source !== target. Return 400 if same ("An item cannot link to itself.").
4. Check for duplicate link (same source, target, type). Return 409 if exists ("These items are already linked.").
5. Check link count on source item does not exceed 50. Return 400 if exceeded.
6. Insert the link with `sourceItemId = itemId` (the URL param item), `targetItemId` from the body.
7. For bidirectional types (`moves_with`, `relates_to`), store only ONE row. The source is always the item from the URL. The service layer handles presenting both directions when querying.
8. For `blocks`, store as directional: source blocks target. "Blocked by" is a display concern -- when querying target's links, show the same link row but label it "blocked by."

Response: `{ data: ItemLink }` (the created link row with IDs and timestamps).

**Important design decision: Single row for bidirectional links.** We store one row per link, not two mirrored rows. This avoids consistency issues (orphaned mirror rows) and simplifies deletion. The query layer resolves both directions:

```typescript
// In itemLinkService.listLinksForItem(itemId):
// Fetch all links where itemId is source OR target
const links = await db
  .select()
  .from(itemLinks)
  .where(
    or(
      eq(itemLinks.sourceItemId, itemId),
      eq(itemLinks.targetItemId, itemId),
    ),
  );

// For each link, determine the "direction" relative to the queried item:
// - If sourceItemId === itemId: this item is the source (e.g., "blocks [target]")
// - If targetItemId === itemId: this item is the target (e.g., "blocked by [source]")
```

**List links -- `GET /api/v1/roadmaps/:roadmapId/items/:itemId/links`**

Response: `{ data: EnrichedItemLink[] }` where each link includes the other item's `id` and `name` for display in the Item Card.

```typescript
interface EnrichedItemLink {
  id: string;
  linkType: 'blocks' | 'moves_with' | 'relates_to';
  direction: 'outgoing' | 'incoming';  // 'outgoing' = this item is source
  linkedItem: {
    id: string;
    name: string;
  };
  createdAt: string;
}
```

**Delete link -- `DELETE /api/v1/item-links/:id`**

Deletes the single link row. Since we store one row (not mirrored), this removes the link from both sides. Requires editor role. Returns 204.

### 3.2 Sub-Items API (RT-26)

No new route file needed. Sub-items are regular items with a `parentId`. The existing items API is extended.

**Changes to existing item schemas:**

```typescript
// In shared/src/validation.ts:
export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().nullable().optional(),  // NEW
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().nullable().optional(),  // NEW
});
```

**Service logic changes in `itemService.ts`:**

1. **`createItem`**: Accept `parentId`. If provided, verify:
   - Parent exists in the same roadmap.
   - Parent is NOT itself a sub-item (parent's `parentId` must be null). Return 400: "Sub-items cannot have their own sub-items."
   - Parent has fewer than 50 sub-items. Return 400 if exceeded.
2. **`updateItem`**: Accept `parentId` changes. Same validation as create. Setting `parentId = null` converts back to standalone.
3. **`listItems`**: Always include `parentId` in the response (it is a column on the items table, so it comes for free). No separate `?include=children` parameter needed -- the client can group items by `parentId` client-side from the flat list.
4. **`deleteItem`**: The CASCADE on `parent_id` handles child deletion automatically. The route handler should include all deleted child IDs in the WebSocket broadcasts.

**Why no `?include=children` parameter:** The bulk items endpoint already returns ALL items for a roadmap in a flat array. Adding `parentId` to each item gives the client everything it needs to build the tree client-side. This avoids a new query pattern and keeps the API simple. The client groups by `parentId` after fetching.

### 3.3 Key Dates API (RT-27)

**New route file:** `server/src/routes/keyDates.ts`
**New service file:** `server/src/services/keyDateService.ts`

```
GET    /api/v1/roadmaps/:roadmapId/items/:itemId/key-dates   List key dates for an item
POST   /api/v1/roadmaps/:roadmapId/items/:itemId/key-dates   Create key date
PATCH  /api/v1/key-dates/:id                                  Update key date
DELETE /api/v1/key-dates/:id                                  Delete key date
```

**Mount in `server/src/index.ts`:**
```typescript
app.use('/api/v1/roadmaps/:roadmapId/items/:itemId/key-dates', keyDatesRouter);
app.use('/api/v1/key-dates', keyDateActionsRouter);
```

**Create key date -- `POST /api/v1/roadmaps/:roadmapId/items/:itemId/key-dates`**

Request body:
```typescript
{
  name: string;  // max 100 chars
  date: string;  // ISO date string
}
```

Validation:
```typescript
export const createKeyDateSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string(), // ISO date
});

export const updateKeyDateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  date: z.string().optional(),
});
```

Service logic:
1. Verify item exists in roadmap.
2. Check key date count does not exceed 10 per item. Return 400 if exceeded.
3. Insert and return.

**Update key date -- `PATCH /api/v1/key-dates/:id`**

Supports partial updates (name, date, or both). Returns the updated key date.

### 3.4 Expanded Items Response

The bulk items endpoint (`GET /api/v1/roadmaps/:roadmapId/items`) is the data load that all three views depend on. It must include links, key dates, and parentId without extra roundtrips.

**Current response per item:**
```typescript
{
  id, roadmapId, name, description, startDate, endDate, sortOrder,
  createdBy, createdAt, updatedAt,
  fieldValues: [...]
}
```

**Sprint B response per item (additions in bold):**
```typescript
{
  id, roadmapId, name, description, startDate, endDate, sortOrder,
  createdBy, createdAt, updatedAt,
  parentId: string | null,        // RT-26
  fieldValues: [...],
  keyDates: [                     // RT-27
    { id, name, date, sortOrder, createdAt, updatedAt }
  ],
}
```

**Links are returned as a top-level sibling array, not nested per item.** This is a deliberate design choice:

```typescript
// Response from GET /api/v1/roadmaps/:roadmapId/items
{
  data: Item[],           // flat list of all items (with parentId, keyDates)
  links: ItemLink[],      // all links for the entire roadmap
}
```

**Rationale for top-level links array:** Links are relationships between two items. Nesting them inside each item would mean every link appears twice (once per item), creating redundancy and making it harder to update the cache on a single link deletion. A top-level array gives the client a single source of truth for links. The client can build a `Map<itemId, Link[]>` index for O(1) lookup.

**Implementation in `itemService.listItems`:**

After fetching items and field values (existing logic), add two more batch queries:

```typescript
// Fetch all key dates for all items in this roadmap
const allKeyDates = await db
  .select()
  .from(keyDates)
  .where(inArray(keyDates.itemId, itemIds))
  .orderBy(keyDates.date);

// Group by item ID
const keyDatesByItem = new Map<string, typeof allKeyDates>();
for (const kd of allKeyDates) {
  const existing = keyDatesByItem.get(kd.itemId) ?? [];
  existing.push(kd);
  keyDatesByItem.set(kd.itemId, existing);
}

// Fetch all links for this roadmap (single query, not N+1)
const allLinks = await db
  .select({
    id: itemLinks.id,
    sourceItemId: itemLinks.sourceItemId,
    targetItemId: itemLinks.targetItemId,
    linkType: itemLinks.linkType,
    createdBy: itemLinks.createdBy,
    createdAt: itemLinks.createdAt,
  })
  .from(itemLinks)
  .where(eq(itemLinks.roadmapId, roadmapId));
```

The items response mapper adds `parentId` (from the items query, now that the column exists) and `keyDates` (from the grouped map). The links array is returned alongside the items array.

**Performance note:** This adds 2 queries to the roadmap load (key dates + links). Both are indexed (by `item_id` and `roadmap_id` respectively) and will be fast for typical roadmap sizes (50-200 items, 0-200 links, 0-100 key dates). No concern at this scale.

---

## 4. Shared Types

Add to `shared/src/types.ts`:

```typescript
// RT-24: Item links
export type LinkType = 'blocks' | 'moves_with' | 'relates_to';

export interface ItemLink {
  id: string;
  roadmapId: string;
  sourceItemId: string;
  targetItemId: string;
  linkType: LinkType;
  createdBy: string | null;
  createdAt: string;
}

export interface EnrichedItemLink {
  id: string;
  linkType: LinkType;
  direction: 'outgoing' | 'incoming';
  linkedItem: {
    id: string;
    name: string;
  };
  createdAt: string;
}

// RT-27: Key dates
export interface KeyDate {
  id: string;
  itemId: string;
  name: string;
  date: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

Update the `Item` interface:

```typescript
export interface Item {
  id: string;
  roadmapId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  parentId: string | null;         // NEW
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  fieldValues?: ItemFieldValue[];
  keyDates?: KeyDate[];            // NEW
}

// New: bulk items response includes links at the top level
export interface ItemsResponse {
  data: Item[];
  links: ItemLink[];
}
```

---

## 5. WebSocket Events

Six new event types, following the established pattern (REST mutates, then server broadcasts to room, excluding the sender via `x-socket-id`).

### 5.1 Item Links

```typescript
// Server -> Client (broadcast to roadmap room)
socket.emit('link-created', { link: ItemLink });
socket.emit('link-deleted', { linkId: string });
```

**Client cache update pattern:**

```typescript
// In useSocket hook:
socket.on('link-created', ({ link }) => {
  queryClient.setQueryData(['items', roadmapId], (old: ItemsResponse) => ({
    ...old,
    links: [...old.links, link],
  }));
});

socket.on('link-deleted', ({ linkId }) => {
  queryClient.setQueryData(['items', roadmapId], (old: ItemsResponse) => ({
    ...old,
    links: old.links.filter(l => l.id !== linkId),
  }));
});
```

### 5.2 Sub-Items

Sub-items use the existing `item-created`, `item-updated`, and `item-deleted` events. No new event types needed -- a sub-item IS an item (just with `parentId` set). The existing handlers already add/update/remove items from the cache.

**One addition:** When deleting a parent item (which cascades to children), the server must broadcast `item-deleted` for each child ID in addition to the parent. The route handler queries for children before deleting:

```typescript
// In items route DELETE handler, before deletion:
const childIds = await db
  .select({ id: items.id })
  .from(items)
  .where(eq(items.parentId, id));

// After deletion:
const io = getIO();
for (const child of childIds) {
  io.to(`roadmap:${roadmapId}`).except(socketId).emit('item-deleted', { itemId: child.id });
}
io.to(`roadmap:${roadmapId}`).except(socketId).emit('item-deleted', { itemId: id });
```

### 5.3 Key Dates

```typescript
socket.emit('key-date-created', { keyDate: KeyDate });
socket.emit('key-date-updated', { keyDate: KeyDate });
socket.emit('key-date-deleted', { keyDateId: string, itemId: string });
```

**Client cache update:** Update the `keyDates` array on the relevant item within the items query cache.

```typescript
socket.on('key-date-created', ({ keyDate }) => {
  queryClient.setQueryData(['items', roadmapId], (old: ItemsResponse) => ({
    ...old,
    data: old.data.map(item =>
      item.id === keyDate.itemId
        ? { ...item, keyDates: [...(item.keyDates ?? []), keyDate] }
        : item
    ),
  }));
});
```

---

## 6. Dependency Arrow SVG Routing (RT-24)

This is the highest-complexity frontend work in Sprint B. The goal: render SVG `<path>` elements between linked items on the Timeline, using right-angle routing.

### 6.1 Architecture

**New component:** `client/src/components/timeline/DependencyLayer.tsx`

This component renders an SVG `<g>` element containing all dependency arrows. It sits in the TimelineCanvas render order ABOVE grid lines but BELOW item bars (so arrows route behind bars, not on top).

```
TimelineCanvas render order:
  1. GridLines
  2. DependencyLayer  <-- NEW
  3. HeaderGroups
  4. ItemBars
  5. TodayMarker
  6. MilestoneLayer
  7. DragLayer
  8. TimeAxis
```

**Props:**
```typescript
interface DependencyLayerProps {
  links: ItemLink[];
  itemPositions: Map<string, { x: number; y: number; width: number; height: number }>;
  selectedItemId: string | null;
  hoveredItemId: string | null;
}
```

The `itemPositions` map is computed once per layout pass from the existing `trackedItemMap` in TimelineCanvas. It maps item IDs to their SVG bounding boxes (x, y, width, height).

### 6.2 Arrow Path Calculation

Each "blocks" link produces a path from the **right edge** of the source (blocker) to the **left edge** of the target (blocked).

Each "moves_with" link produces a dashed line between the **centers** of both items.

"Relates_to" links are NOT rendered on the timeline (per requirements).

**Right-angle routing algorithm for "blocks" arrows:**

```typescript
function computeBlocksPath(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
): string {
  const startX = source.x + source.width;      // right edge of blocker
  const startY = source.y + source.height / 2;  // vertical center
  const endX = target.x;                         // left edge of blocked
  const endY = target.y + target.height / 2;

  const GAP = 12; // minimum clearance from bar edges

  // Case 1: Target is to the right of source (normal flow)
  if (endX > startX + GAP * 2) {
    const midX = startX + (endX - startX) / 2;
    // Right-angle: go right to midpoint, then vertical, then right to target
    return `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
  }

  // Case 2: Target is left of or overlapping with source (wrap-around)
  // Route: right from source, down/up to clear both bars, left to target
  const clearanceY = Math.max(source.y + source.height, target.y + target.height) + GAP;
  const exitX = startX + GAP;
  const entryX = endX - GAP;
  return `M ${startX} ${startY} H ${exitX} V ${clearanceY} H ${entryX} V ${endY} H ${endX}`;
}
```

**"Moves with" path:** A simpler straight dashed line between item centers:

```typescript
function computeMovesWithPath(
  source: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
): string {
  const startX = source.x + source.width / 2;
  const startY = source.y + source.height / 2;
  const endX = target.x + target.width / 2;
  const endY = target.y + target.height / 2;
  return `M ${startX} ${startY} L ${endX} ${endY}`;
}
```

### 6.3 Arrow Styling

| Link type | Stroke | Width | Dash | Arrowhead |
|-----------|--------|-------|------|-----------|
| Blocks (normal) | `var(--gray-400)` | 1.5px | solid | 6px triangle at end |
| Blocks (conflict) | `var(--error-600)` | 1.5px | solid | 6px triangle at end |
| Moves with | `var(--gray-300)` | 1.5px | 2px dash, 2px gap | none |

**Conflict detection:** A "blocks" arrow renders in error color when the blocker's end date is after the blocked item's start date. This is a simple date comparison done at render time.

```typescript
const isConflict = source.endDate && target.startDate &&
  new Date(source.endDate) > new Date(target.startDate);
```

**Arrowhead:** Defined as an SVG `<marker>` element in the DependencyLayer:

```svg
<defs>
  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
    <polygon points="0 0, 6 3, 0 6" fill="var(--gray-400)" />
  </marker>
  <marker id="arrowhead-error" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
    <polygon points="0 0, 6 3, 0 6" fill="var(--error-600)" />
  </marker>
</defs>
```

### 6.4 Performance: 200-Arrow Cap

When more than 200 arrows would be visible, show only arrows connected to the selected or hovered item. All other arrows are hidden.

```typescript
const MAX_VISIBLE_ARROWS = 200;

function getVisibleLinks(
  allLinks: ItemLink[],
  visibleItemIds: Set<string>,
  selectedItemId: string | null,
  hoveredItemId: string | null,
): ItemLink[] {
  // Filter to links where both endpoints are visible on the timeline
  const visibleLinks = allLinks.filter(
    l => visibleItemIds.has(l.sourceItemId) && visibleItemIds.has(l.targetItemId),
  );

  if (visibleLinks.length <= MAX_VISIBLE_ARROWS) {
    return visibleLinks;
  }

  // Over cap: show only links touching the selected or hovered item
  const focusIds = new Set<string>();
  if (selectedItemId) focusIds.add(selectedItemId);
  if (hoveredItemId) focusIds.add(hoveredItemId);

  if (focusIds.size === 0) return []; // No focus, hide all

  return visibleLinks.filter(
    l => focusIds.has(l.sourceItemId) || focusIds.has(l.targetItemId),
  );
}
```

This is evaluated on every render but is O(n) over the links array, which is cheap even at 200+ links.

### 6.5 Interaction

- **Hover:** When a user hovers over an item bar, its dependency arrows highlight (opacity goes from 0.6 to 1.0, stroke width increases slightly). Other arrows dim.
- **Click:** Clicking an arrow is NOT supported in this sprint (arrows are passive). Interaction with links is done through the Item Card.
- **Drag:** During item drag (RT-25), dependency arrows update in real time to follow the dragged item's position. The `DependencyLayer` receives the drag state and uses the phantom position for the dragged item.

---

## 7. Summary Bars (RT-26 Timeline Rendering)

Parent items with sub-items render differently on the Timeline.

### 7.1 Layout Changes

The existing `computeLayout` function in `client/src/lib/timelineLayout.ts` needs modification to support hierarchical items.

**Strategy:** Extend `prepareTimelineItems` and `computeLayout` to handle the parent/child relationship:

1. **Separate parents from children.** When building the timeline layout, identify items that have children (items where other items reference them as `parentId`).
2. **Summary bar computation.** For each parent with children:
   - If parent has its own dates: summary bar spans the parent's dates.
   - If parent has no dates but children have dates: summary bar spans from `min(child.startDate)` to `max(child.endDate)`.
   - If neither parent nor children have dates: parent is not shown on timeline (same as any undated item).
3. **Track assignment.** Parent summary bar occupies its own track row. Children are stacked in tracks immediately below the parent, indented.

**New type:**

```typescript
export interface SummaryBarItem {
  item: Item;
  startDate: Date;
  endDate: Date;
  color: string;
  label: string;
  childCount: number;
  isAutoSpan: boolean; // true if dates derived from children, not own dates
}
```

### 7.2 Summary Bar Rendering

**New component:** `client/src/components/timeline/SummaryBar.tsx`

The summary bar is a thin rect:
- Height: 8px (spacious), 6px (compact) -- smaller than normal item bars.
- Fill: Parent's assigned palette color at 40% opacity.
- Bracket marks: Two small downward-pointing ticks (3px) at each end of the bar.

```typescript
interface SummaryBarProps {
  x: number;
  y: number;
  width: number;
  color: string;
  label: string;
  layout: LayoutMode;
  collapsed: boolean;
  onToggleCollapse: () => void;
}
```

### 7.3 Expand/Collapse

Parent items have a collapse chevron in the header area (left side, next to the label). When collapsed:
- Sub-item bars are hidden.
- Only the summary bar is visible.
- The group's height shrinks to just the summary bar track.

The collapse state is stored in the view config JSONB as `collapsedParents: string[]` (array of parent item IDs). This persists across page reloads.

**View config type update:**

```typescript
export interface TimelineViewConfig {
  // ... existing fields ...
  collapsedParents?: string[];  // NEW -- persisted expand/collapse state
}
```

---

## 8. Key Date Markers (RT-27 Timeline Rendering)

**New component:** `client/src/components/timeline/KeyDateMarkers.tsx`

Renders diamond markers on item bars for each key date.

### 8.1 Marker Positioning

Each key date marker is positioned at the x-coordinate corresponding to its date on the time scale:

```typescript
const markerX = xScale(new Date(keyDate.date));
```

The marker is a rotated square (diamond shape), centered on the item bar's vertical center:

```svg
<rect
  x={markerX - 4}
  y={barCenterY - 4}
  width={8}
  height={8}
  transform={`rotate(45 ${markerX} ${barCenterY})`}
  fill="var(--gray-600)"
  stroke={isOutsideRange ? "var(--gray-600)" : "none"}
  strokeDasharray={isOutsideRange ? "2 1" : "none"}
  fillOpacity={isOutsideRange ? 0 : 1}
/>
```

### 8.2 Outside-Range Markers

If a key date falls outside the item's `[startDate, endDate]` range, the diamond renders with a dashed outline and no fill (per requirements).

```typescript
const isOutsideRange = keyDate.date < item.startDate || keyDate.date > item.endDate;
```

### 8.3 Tooltip

Hover over a key date marker shows a tooltip with the name and formatted date: "Design Complete: Mar 15, 2026". Uses the same `ItemBarTooltip` component pattern with a slight offset to avoid overlapping the bar tooltip.

---

## 9. Table View Changes (RT-26 + RT-27)

### 9.1 Sub-Item Indentation (RT-26)

The Table View already renders items as rows. Sprint B adds:

1. **Indentation:** Sub-items are indented 24px from the left in the name column.
2. **Expand/collapse chevron:** Parent items show a chevron icon to the left of their name. The collapse state is persisted in the table view config as `collapsedParents: string[]`.
3. **Row ordering:** Parents and their children are rendered contiguously. The sort order within a parent group respects the sub-items' `sortOrder`.

**Implementation:** The existing `useItems` data is sorted client-side. After fetching the flat items array, build a display order:

```typescript
function buildTableDisplayOrder(items: Item[]): Item[] {
  const parents = items.filter(i => !i.parentId);
  const childrenByParent = new Map<string, Item[]>();
  for (const item of items) {
    if (item.parentId) {
      const siblings = childrenByParent.get(item.parentId) ?? [];
      siblings.push(item);
      childrenByParent.set(item.parentId, siblings);
    }
  }

  const result: Item[] = [];
  for (const parent of parents) {
    result.push(parent);
    const children = childrenByParent.get(parent.id) ?? [];
    children.sort((a, b) => a.sortOrder - b.sortOrder);
    result.push(...children);
  }
  return result;
}
```

### 9.2 Links Column (RT-24)

A new optional column "Links" displays a count badge (e.g., "3 links"). Clicking the badge opens the item's Item Card on the Linked Items tab.

### 9.3 Key Dates Column (RT-27)

A new optional column "Key Dates" displays the next upcoming key date (or most recent past one). If multiple key dates exist, a "+N more" badge is appended. Clicking opens the Item Card.

### 9.4 View Config Update

```typescript
export interface TableViewConfig {
  visibleFieldIds: string[];
  sortBy?: { fieldId: string; direction: 'asc' | 'desc' };
  filters: FilterCondition[];
  collapsedParents?: string[];  // NEW
}
```

The "Links" and "Key Dates" columns use reserved field IDs (`__links__` and `__key_dates__`) in the `visibleFieldIds` array. They are not backed by actual field records -- the frontend handles rendering them as special columns.

---

## 10. Swimlane View Changes (RT-26)

Minimal changes. Parent items show a sub-item count badge in the bottom-right corner of the card: a small pill with "3 sub-items" text. Sub-items are NOT shown as separate cards in the Swimlane (per requirements -- they are contained within their parent).

**Implementation:** In the `SwimlaneCard` component, check if the item has children (from the items array where `parentId === item.id`). If so, render a badge. Clicking the badge opens the Item Card's Sub-Items tab.

Sub-items (items with `parentId !== null`) are filtered OUT of the Swimlane item list entirely. They only appear inside their parent's Item Card.

---

## 11. Build Order for Backend

Jonah should implement in this order to unblock Alice as early as possible:

1. **Schema migration** -- Run `db:generate` and `db:migrate`. This is the foundation.
2. **Item service expansion** -- Add `parentId` to item create/update, add key dates and links to the bulk items response. This unblocks all three frontend features immediately since the data is available.
3. **Key dates CRUD** -- Simple service, follows the milestones pattern almost exactly.
4. **Item links CRUD** -- Slightly more complex due to bidirectional query logic.
5. **WebSocket events** -- Add the six new event types to the broadcast logic.
6. **Delete cascade handling** -- Ensure parent item deletion broadcasts child deletions.

Items 1-2 are critical path (they change the data contract Alice depends on). Items 3-6 can be built in parallel with Alice's frontend work since the data shape is already defined.

---

## 12. File Classification (Change Impact)

### Backend Files

| File | Classification | Notes |
|------|---------------|-------|
| `server/src/db/schema.ts` | **Modify** | Add `parentId` to items, add `itemLinks` and `keyDates` table definitions. Existing table definitions unchanged. |
| `server/src/db/migrations/0001_*.sql` | **New** | Generated by Drizzle from schema changes. |
| `server/src/services/itemService.ts` | **Modify** | Expand `listItems` to include parentId, keyDates, and links. Add parentId validation to create/update. Add child deletion broadcast logic. |
| `server/src/services/itemLinkService.ts` | **New** | CRUD + bidirectional query logic for links. |
| `server/src/services/keyDateService.ts` | **New** | CRUD for key dates. Straightforward, follows milestones pattern. |
| `server/src/routes/itemLinks.ts` | **New** | Express router for link endpoints. Follows items.ts pattern. |
| `server/src/routes/keyDates.ts` | **New** | Express router for key date endpoints. Follows milestones.ts pattern. |
| `server/src/routes/items.ts` | **Modify** | Add child deletion broadcast to delete handler. |
| `server/src/ws/handler.ts` | **Extend** | No changes needed -- broadcasts are initiated from route handlers via `getIO()`, not from the WS handler file. |
| `server/src/index.ts` | **Extend** | Mount two new routers. Four lines added. |
| `shared/src/types.ts` | **Extend** | Add ItemLink, KeyDate, EnrichedItemLink types. Update Item interface. Add ItemsResponse. |
| `shared/src/validation.ts` | **Modify** | Add `parentId` to create/update item schemas. Add createItemLinkSchema, createKeyDateSchema, updateKeyDateSchema. |

### Frontend Files

| File | Classification | Notes |
|------|---------------|-------|
| `client/src/components/timeline/DependencyLayer.tsx` | **New** | SVG arrow rendering, path calculation, 200-cap logic. Highest complexity new file. |
| `client/src/components/timeline/SummaryBar.tsx` | **New** | Summary bar rendering for parent items. |
| `client/src/components/timeline/KeyDateMarkers.tsx` | **New** | Diamond markers on item bars. |
| `client/src/components/timeline/TimelineCanvas.tsx` | **Modify** | Add DependencyLayer, SummaryBar, and KeyDateMarkers to render tree. Pass item positions map to DependencyLayer. Add collapsedParents state. |
| `client/src/lib/timelineLayout.ts` | **Modify** | Handle parent/child hierarchy in `prepareTimelineItems` and `computeLayout`. Add summary bar track computation. |
| `client/src/components/item-card/LinkedItemsTab.tsx` | **New** | Link list, add link popover, link type selector. |
| `client/src/components/item-card/SubItemsTab.tsx` | **New** | Sub-items compact table, add/reorder/remove. |
| `client/src/components/item-card/FieldsTab.tsx` | **Modify** | Add Key Dates section below standard fields. |
| `client/src/components/table/TableView.tsx` | **Modify** | Add indentation logic, expand/collapse chevrons, sub-item display order, links and key dates columns. |
| `client/src/components/swimlane/SwimlaneCard.tsx` | **Extend** | Add sub-item count badge. Filter out sub-items from swimlane grid. |
| `client/src/hooks/useItems.ts` | **Modify** | Update query response type to `ItemsResponse` (items + links). Add cache update handlers for new WS events. |
| `client/src/stores/viewStore.ts` | **Extend** | Add `hoveredItemId` for dependency arrow highlighting. |
| `client/src/types/index.ts` (if client-specific types needed) | **Extend** | Import and re-export new shared types. |

### QA Impact Notes

**`client/src/components/timeline/TimelineCanvas.tsx` [Modify]** -- Adds three new SVG layers to the render tree. Regression test: verify existing item bar rendering, drag-and-drop (RT-25), milestone markers, today marker, and horizontal scroll are unaffected.

**`client/src/lib/timelineLayout.ts` [Modify]** -- Changes to layout computation affect every item's Y position. Regression test: verify items stack correctly, header groups size correctly, and no items overlap or disappear. Test with roadmaps that have no sub-items to ensure backward compatibility.

**`server/src/services/itemService.ts` [Modify]** -- Expanded response format. Regression test: verify existing item CRUD, field value loading, and duplicate functionality still work. Verify items without parentId/keyDates still return correctly (null/empty defaults).

**`client/src/components/table/TableView.tsx` [Modify]** -- Adds indentation and new columns. Regression test: verify existing table rendering, inline editing, column visibility, sorting, and filtering are unaffected.

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Arrow routing overlaps item bars | Medium | Low | Start with simple right-angle paths. If they overlap bars, the spec permits falling back to straight diagonal lines. Visual refinement can happen post-QA. |
| Summary bar + sub-item layout breaks existing stacking | Medium | Medium | Test `computeLayout` with both flat (no sub-items) and hierarchical data before integrating into the view. Ensure backward compatibility for roadmaps that never use sub-items. |
| Bulk items response size increases significantly | Low | Low | Links and key dates add minimal payload. Typical: 200 items + 100 links + 50 key dates = maybe 20KB additional JSON. Negligible. |
| Parent deletion cascade broadcasts multiple events | Low | Low | Collect child IDs before delete, broadcast all in one tick. Test with 50 sub-items to verify no event ordering issues. |
| 200-arrow cap UX is jarring | Low | Medium | The transition between "show all" and "show only focused" should be smooth (opacity transition, not sudden disappear). Alice should add a subtle visual indicator ("Showing arrows for selected item only"). |

---

## 14. Decisions Summary

| Decision | Rationale | Alternatives rejected |
|----------|-----------|----------------------|
| Single row per link (not mirrored) | Simpler, no consistency issues, easier deletion | Two mirrored rows (rejected: orphan risk, double storage) |
| Links as top-level array in items response | Single source of truth, no duplication, cleaner cache updates | Nested per item (rejected: every link duplicated, cache update complexity) |
| parentId on items table (not a separate junction table) | Single-level nesting only; column is simpler than a table for 1:N parent-child | `item_hierarchy` junction table (rejected: overkill for 1-level, adds JOINs) |
| collapsedParents in view config JSONB | Persists across reloads, per-view state | localStorage (rejected: not per-view, not shared), separate DB table (rejected: over-engineering) |
| Reserved field IDs for Links/Key Dates columns | Avoids creating phantom field records, clean separation | Actual field records (rejected: they are not user-configurable fields) |
| No sub-item filtering server-side | Client already has all items in memory; client-side grouping is simpler | Server-side tree query (rejected: adds complexity, no performance benefit at this scale) |
| Diamond markers via rotated `<rect>` | Simple SVG, no custom path needed | `<polygon>` or `<use>` with symbol (rejected: more code for same result) |

---

*Tech approach addendum written by Andrei (Technical Architect). Jonah: read sections 2-5 and 11 for the backend build plan. Alice: read sections 6-10 for the frontend implementation guide. Robert: read sections 6-10 for visual rendering constraints. Enzo: read section 12 for QA impact and regression scope.*
