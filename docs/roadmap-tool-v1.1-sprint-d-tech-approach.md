# Roadmap Tool v1.1 Sprint D -- Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** February 13, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Inputs:** `docs/roadmap-tool-v1.1-sprint-d-requirements.md` (Thomas), `docs/roadmap-tool-v1.1-sprint-c-tech-approach.md` (Sprint C)
**Scope:** RT-32 (Portfolio Roadmaps), RT-33 (Collections / Folders), RT-34 (Buckets / No-Date Mode), RT-35 (Templates)

---

## 1. Architectural Summary

Sprint D is the final push of v1.1. Four independent features that collectively move the product from "a roadmap tool" to a planning platform. The good news: despite the scope breadth, the features are architecturally isolated. Each one touches different tables, different endpoints, and different UI surfaces. The one coordination point is the database migration, which alters the `roadmaps` table with two new columns and the `items` table with one.

The strategy:

- **One migration file** (`0003_sprint_d_portfolio_buckets.sql`) handles all schema changes: two ALTER TABLE statements on `roadmaps`, one on `items`, and four new tables (`portfolio_sources`, `collections`, `collection_roadmaps`, `buckets`).
- **Four new route files** and **four new service files**, one per feature. Each follows the established Express Router + Zod validation + service layer pattern.
- **Templates are static JSON** bundled with the server, not a database table. The server reads them from disk at startup and caches in memory. Zero schema overhead.
- **Portfolio aggregation** uses a straightforward multi-roadmap items query -- no materialized views, no caching layer, no fan-out. Query N source roadmaps, merge results, annotate with source metadata.
- **Bucket mode** is a per-roadmap toggle that clears dates and seeds default buckets in a single transaction. The one-way nature keeps the logic simple.
- **Collections** are a lightweight organizational layer on top of the existing roadmaps list. Many-to-many join table, simple CRUD.
- **SwimlaneViewConfig gets one new `columnMode` value** (`'buckets'`). No new view types.

The frontend work is significant but follows established patterns: new pages/panels for portfolio and template picker, extensions to the homepage for collections, and conditional rendering throughout the roadmap page for bucket mode.

---

## 2. Database Schema Changes

### 2.1 Migration File

A single migration handles all Sprint D schema changes. File: `server/src/db/migrations/0003_sprint_d_portfolio_buckets.sql`.

```sql
-- Sprint D: Portfolio, Collections, Buckets (RT-32, RT-33, RT-34)
-- Two ALTER TABLE additions to existing tables, four new tables.
-- Templates (RT-35) are static JSON -- no schema needed.

-- ===== RT-32: Portfolio Roadmaps =====

-- Add type column to distinguish standard roadmaps from portfolios
ALTER TABLE roadmaps ADD COLUMN type TEXT NOT NULL DEFAULT 'standard';

-- Portfolio-to-source-roadmap junction table
CREATE TABLE portfolio_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id      UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  source_roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_portfolio_source UNIQUE(portfolio_id, source_roadmap_id)
);

CREATE INDEX idx_portfolio_sources_portfolio ON portfolio_sources(portfolio_id);
CREATE INDEX idx_portfolio_sources_source ON portfolio_sources(source_roadmap_id);

-- ===== RT-33: Collections =====

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

-- Collection-to-roadmap junction table (many-to-many)
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

-- ===== RT-34: Buckets =====

-- Add bucket_mode flag to roadmaps
ALTER TABLE roadmaps ADD COLUMN bucket_mode BOOLEAN NOT NULL DEFAULT false;

-- Buckets table (per-roadmap)
CREATE TABLE buckets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id  UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buckets_roadmap ON buckets(roadmap_id);

-- Add bucket assignment to items
ALTER TABLE items ADD COLUMN bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL;
CREATE INDEX idx_items_bucket ON items(bucket_id);
```

### 2.2 Drizzle Schema Additions

Add to `server/src/db/schema.ts`:

```typescript
// --- Portfolio Sources (RT-32) ---

export const portfolioSources = pgTable('portfolio_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  sourceRoadmapId: uuid('source_roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_portfolio_sources_portfolio').on(table.portfolioId),
  index('idx_portfolio_sources_source').on(table.sourceRoadmapId),
  unique('uq_portfolio_source').on(table.portfolioId, table.sourceRoadmapId),
]);

// --- Collections (RT-33) ---

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_collections_account').on(table.accountId),
]);

export const collectionRoadmaps = pgTable('collection_roadmaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  roadmapId: uuid('roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_collection_roadmaps_collection').on(table.collectionId),
  index('idx_collection_roadmaps_roadmap').on(table.roadmapId),
  unique('uq_collection_roadmap').on(table.collectionId, table.roadmapId),
]);

// --- Buckets (RT-34) ---

export const buckets = pgTable('buckets', {
  id: uuid('id').primaryKey().defaultRandom(),
  roadmapId: uuid('roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_buckets_roadmap').on(table.roadmapId),
]);
```

Also update the existing `roadmaps` table definition to include the two new columns:

```typescript
export const roadmaps = pgTable('roadmaps', {
  // ... existing columns ...
  type: text('type').notNull().default('standard'),      // 'standard' | 'portfolio'
  bucketMode: boolean('bucket_mode').notNull().default(false),
}, (table) => [
  index('idx_roadmaps_account').on(table.accountId),
]);
```

And update the `items` table definition:

```typescript
export const items = pgTable('items', {
  // ... existing columns ...
  bucketId: uuid('bucket_id').references(() => buckets.id, { onDelete: 'set null' }),
}, (table) => [
  // ... existing indexes ...
  index('idx_items_bucket').on(table.bucketId),
]);
```

### 2.3 Migration Strategy

- **Two ALTER TABLE on `roadmaps`** (`type` and `bucket_mode`), both with safe defaults. Existing rows get `type = 'standard'` and `bucket_mode = false` -- zero behavior change.
- **One ALTER TABLE on `items`** (`bucket_id`), nullable FK. Existing rows get `bucket_id = NULL` -- ignored unless the roadmap is in bucket mode.
- **Four new tables.** No data transformation needed.
- **Rollback plan:** Drop the four new tables, then drop the three new columns. Clean since no existing data is modified.
- **Zero downtime.** Column additions with defaults and new table creation do not lock existing tables in Postgres.
- **Run via:** `npm run db:generate -w server && npm run db:migrate -w server`.

---

## 3. API Design -- RT-32: Portfolio Roadmaps

### 3.1 Route & Service Files

**New route file:** `server/src/routes/portfolios.ts`
**New service file:** `server/src/services/portfolioService.ts`

### 3.2 Endpoints

```
POST   /api/v1/portfolios                          Create portfolio
GET    /api/v1/portfolios/:id/items                Aggregated items from source roadmaps
GET    /api/v1/portfolios/:id/milestones           Aggregated milestones from source roadmaps
PATCH  /api/v1/portfolios/:id                      Update portfolio (name)
GET    /api/v1/portfolios/:id/sources              List sources with order
POST   /api/v1/portfolios/:id/sources              Add source roadmap(s)
DELETE /api/v1/portfolios/:id/sources/:roadmapId   Remove a source roadmap
PATCH  /api/v1/portfolios/:id/sources/reorder      Reorder sources
```

**Mount in `server/src/index.ts`:**

```typescript
import { portfoliosRouter } from './routes/portfolios.js';

app.use('/api/v1/portfolios', portfoliosRouter);
```

### 3.3 Create Portfolio

**`POST /api/v1/portfolios`**

Request:
```typescript
{
  name: string;             // 1-200 characters
  sourceRoadmapIds: string[]; // 2-20 UUIDs, must reference standard roadmaps in the same account
}
```

Validation (Zod, in `shared/src/validation.ts`):
```typescript
export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(200),
  sourceRoadmapIds: z.array(z.string().uuid()).min(2).max(20),
});
```

Response: `201 Created`
```typescript
{
  data: {
    id: string;
    accountId: string;
    ownerId: string;
    name: string;
    type: 'portfolio';
    bucketMode: false;
    createdAt: string;
    updatedAt: string;
    sources: Array<{
      id: string;           // portfolio_sources row id
      sourceRoadmapId: string;
      sourceRoadmapName: string;
      sortOrder: number;
    }>;
  }
}
```

Service logic:
1. Require editor role.
2. Validate all `sourceRoadmapIds` exist in the same account and have `type = 'standard'`. If any fail, return 400 with `"One or more source roadmaps not found or not standard"`.
3. In a single transaction:
   - Insert roadmap row with `type = 'portfolio'`.
   - Insert `portfolio_sources` rows with sequential `sort_order` values.
   - Create a default Timeline view for the portfolio (same pattern as `createRoadmap`).
4. Return the created portfolio with its sources.

### 3.4 Get Portfolio Items (Aggregation Endpoint)

**`GET /api/v1/portfolios/:id/items`**

Response:
```typescript
{
  data: PortfolioItem[];
  sources: Array<{
    id: string;               // source roadmap ID
    name: string;             // source roadmap name
    color: string;            // assigned color from palette
    sortOrder: number;
  }>;
}
```

Where `PortfolioItem` extends the existing `Item` type:
```typescript
// In shared/src/types.ts
export interface PortfolioItem extends Item {
  sourceRoadmapId: string;
  sourceRoadmapName: string;
}
```

**Aggregation query strategy:**

The portfolio does not own any items. It queries items from all source roadmaps. The query is straightforward:

```typescript
export async function getPortfolioItems(
  portfolioId: string,
  accountId: string,
  paletteColors: string[],
): Promise<{ items: PortfolioItem[]; sources: SourceInfo[] } | null> {
  // 1. Verify portfolio exists and belongs to account
  const [portfolio] = await db
    .select({ id: roadmaps.id, type: roadmaps.type })
    .from(roadmaps)
    .where(and(
      eq(roadmaps.id, portfolioId),
      eq(roadmaps.accountId, accountId),
      eq(roadmaps.type, 'portfolio'),
    ))
    .limit(1);

  if (!portfolio) return null;

  // 2. Get all source roadmaps with their names
  const sources = await db
    .select({
      sourceRoadmapId: portfolioSources.sourceRoadmapId,
      sourceRoadmapName: roadmaps.name,
      sortOrder: portfolioSources.sortOrder,
    })
    .from(portfolioSources)
    .innerJoin(roadmaps, eq(portfolioSources.sourceRoadmapId, roadmaps.id))
    .where(eq(portfolioSources.portfolioId, portfolioId))
    .orderBy(portfolioSources.sortOrder);

  if (sources.length === 0) return { items: [], sources: [] };

  const sourceIds = sources.map(s => s.sourceRoadmapId);

  // 3. Query all items from all source roadmaps in a single query
  const allItems = await db
    .select()
    .from(items)
    .where(inArray(items.roadmapId, sourceIds))
    .orderBy(items.sortOrder);

  // 4. Batch-fetch field values for all items (same pattern as itemService.listItems)
  const itemIds = allItems.map(i => i.id);
  // ... fieldValues JOIN, keyDates JOIN (same queries as listItems) ...

  // 5. Build source name map and assign colors from palette
  const sourceMap = new Map(sources.map((s, i) => [
    s.sourceRoadmapId,
    {
      id: s.sourceRoadmapId,
      name: s.sourceRoadmapName,
      color: paletteColors[i % paletteColors.length],
      sortOrder: s.sortOrder,
    },
  ]));

  // 6. Annotate each item with source metadata
  const portfolioItems = allItems.map(item => ({
    ...item,
    sourceRoadmapId: item.roadmapId,
    sourceRoadmapName: sourceMap.get(item.roadmapId)?.name ?? 'Unknown',
    // ... fieldValues, keyDates mapping (same as listItems) ...
  }));

  return {
    items: portfolioItems,
    sources: Array.from(sourceMap.values()),
  };
}
```

**Key decisions:**

1. **Single `IN` query, not N separate queries.** `WHERE roadmap_id IN (source1, source2, ...)` is a single index scan per source roadmap. With the max of 20 sources, this is well within Postgres comfort zone. No need for parallel queries or UNION ALL.

2. **Color assignment uses the active palette.** The client sends the current palette ID as a query parameter (or the server uses the default palette). Colors are assigned to sources in `sort_order` order, cycling through palette colors. This means source colors are deterministic but not persisted -- if the user changes palette, colors change. This matches how field-based coloring works on standard roadmaps.

3. **Field values are fetched in bulk.** The same two-query pattern from `itemService.listItems` (items query + field values JOIN + key dates query) works here -- just with `inArray(items.roadmapId, sourceIds)` instead of `eq(items.roadmapId, roadmapId)`.

4. **No real-time sync in v1.** The portfolio items endpoint returns the current state. If a source roadmap item changes, the portfolio view does not auto-update. The user refreshes to see changes. This avoids WebSocket fan-out complexity (subscribing to N roadmap rooms and forwarding events to portfolio viewers).

**Performance consideration:** With 20 source roadmaps averaging 100 items each, the items query returns ~2000 rows. The field values query may return ~10,000 rows (5 field values per item). This is well within acceptable latency for a single page load (under 200ms on Postgres). If performance becomes an issue at scale, the first optimization would be to add a `LIMIT` and pagination, but that is deferred -- Thomas's spec does not call for pagination on portfolio views.

### 3.5 Get Portfolio Milestones

**`GET /api/v1/portfolios/:id/milestones`**

Response:
```typescript
{
  data: Array<{
    id: string;
    roadmapId: string;
    name: string;
    date: string;
    typeId: string;
    type: MilestoneType;
    sourceRoadmapId: string;
    sourceRoadmapName: string;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

Service logic: Same pattern as items -- query milestones from all source roadmaps using `inArray(milestones.roadmapId, sourceIds)`, annotate with source name.

### 3.6 Update Portfolio

**`PATCH /api/v1/portfolios/:id`**

Request:
```typescript
{
  name?: string;   // 1-200 characters
}
```

Validation:
```typescript
export const updatePortfolioSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});
```

Response: `200 OK` -- returns the updated roadmap record.

Service logic: Verify the roadmap has `type = 'portfolio'`, then update name. Uses the same `updateRoadmap` service pattern but adds the type check.

### 3.7 Source Management

**`GET /api/v1/portfolios/:id/sources`**

Response:
```typescript
{
  data: Array<{
    id: string;               // portfolio_sources row ID
    sourceRoadmapId: string;
    sourceRoadmapName: string;
    itemCount: number;
    sortOrder: number;
  }>;
}
```

**`POST /api/v1/portfolios/:id/sources`**

Request:
```typescript
{
  roadmapIds: string[];   // 1-20 UUIDs
}
```

Validation:
```typescript
export const addPortfolioSourcesSchema = z.object({
  roadmapIds: z.array(z.string().uuid()).min(1).max(20),
});
```

Response: `201 Created` -- returns the updated sources list.

Service logic:
1. Verify portfolio exists and has `type = 'portfolio'`.
2. Verify all roadmap IDs exist, are in the same account, have `type = 'standard'`, and are not already sources.
3. Check total source count after addition does not exceed 20.
4. Insert new `portfolio_sources` rows with `sort_order` continuing from the current max.

**`DELETE /api/v1/portfolios/:id/sources/:roadmapId`**

Response: `204 No Content`.

Service logic:
1. Delete the `portfolio_sources` row.
2. After deletion, check if the portfolio has fewer than 2 sources remaining. If so, return 400: `"A portfolio must have at least 2 source roadmaps."` **However**, Thomas's requirements do not explicitly enforce a minimum after creation. On reflection, the simpler approach is to allow removal down to 0 sources (an empty portfolio shows the empty state). The minimum-2 constraint only applies at creation time. This avoids the awkward UX of "I want to replace all sources but I can't remove the last one first."

**Decision: No post-creation minimum.** A portfolio can have 0 sources after creation. The empty state message handles this: "No items to display. Add source roadmaps in portfolio settings."

**`PATCH /api/v1/portfolios/:id/sources/reorder`**

Request:
```typescript
{
  orderedIds: string[];   // source roadmap IDs in new order
}
```

Validation:
```typescript
export const reorderPortfolioSourcesSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});
```

Response: `200 OK` -- returns the reordered sources list.

Service logic: Update `sort_order` for each `portfolio_sources` row to match the position in the `orderedIds` array.

### 3.8 Read-Only Enforcement

Portfolio roadmaps do not have items of their own. The read-only constraint is enforced at two levels:

1. **API level:** The existing item CRUD routes (`POST/PATCH/DELETE /api/v1/roadmaps/:roadmapId/items/...`) are scoped to `roadmapId`. Since a portfolio has no items in the `items` table (it aggregates from sources), any item CRUD attempt against a portfolio ID will find no items and return 404. However, we should add an explicit check at the beginning of mutation routes to return a clearer error.

   In `server/src/routes/items.ts`, add a middleware or check at the top of `POST`, `PATCH`, `DELETE` handlers:

   ```typescript
   // In the requireEditor middleware or a new requireStandardRoadmap middleware:
   const [rm] = await db
     .select({ type: roadmaps.type })
     .from(roadmaps)
     .where(eq(roadmaps.id, roadmapId))
     .limit(1);

   if (rm?.type === 'portfolio') {
     res.status(403).json({
       error: {
         code: 'PORTFOLIO_READ_ONLY',
         message: 'Items cannot be created or edited on a portfolio roadmap',
       },
     });
     return;
   }
   ```

   The cleanest implementation is a reusable `requireStandardRoadmap` middleware that checks `roadmaps.type !== 'portfolio'` before allowing mutations. Mount it on item, field, and milestone mutation routes.

2. **Frontend level:** The portfolio view simply does not render editing affordances. No "Add Item" button, no inline edit, no drag-to-reschedule. The Item Card does not open -- clicking navigates to the source roadmap via `window.location.href = /roadmaps/${sourceRoadmapId}?item=${itemId}`.

---

## 4. API Design -- RT-33: Collections / Folders

### 4.1 Route & Service Files

**New route file:** `server/src/routes/collections.ts`
**New service file:** `server/src/services/collectionService.ts`

### 4.2 Endpoints

```
POST   /api/v1/collections                                 Create collection
GET    /api/v1/collections                                  List collections with roadmap counts
PATCH  /api/v1/collections/:id                              Update collection (name)
DELETE /api/v1/collections/:id                              Delete collection
POST   /api/v1/collections/:id/roadmaps                    Add roadmaps to collection
DELETE /api/v1/collections/:id/roadmaps/:roadmapId         Remove roadmap from collection
PATCH  /api/v1/collections/reorder                          Reorder collections
PATCH  /api/v1/collections/:id/roadmaps/reorder            Reorder roadmaps within collection
```

**Mount in `server/src/index.ts`:**

```typescript
import { collectionsRouter } from './routes/collections.js';

app.use('/api/v1/collections', collectionsRouter);
```

### 4.3 Create Collection

**`POST /api/v1/collections`**

Request:
```typescript
{
  name: string;   // 1-100 characters
}
```

Validation:
```typescript
export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
});
```

Response: `201 Created`
```typescript
{
  data: {
    id: string;
    accountId: string;
    name: string;
    sortOrder: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    roadmapCount: 0;
  }
}
```

Service logic:
1. Require editor role.
2. Check collection count for the account does not exceed 50. If it does, return 400: `"Maximum 50 collections per account."`.
3. Get the next sort_order: `MAX(sort_order) + 1` for this account's collections.
4. Insert collection row.

### 4.4 List Collections

**`GET /api/v1/collections`**

Response:
```typescript
{
  data: Array<{
    id: string;
    accountId: string;
    name: string;
    sortOrder: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    roadmapCount: number;
    roadmapIds: string[];   // for the client to know which roadmaps are in each collection
  }>;
}
```

Service logic: Query collections for the account, LEFT JOIN `collection_roadmaps` for counts and IDs, ordered by `sort_order`.

### 4.5 Update Collection

**`PATCH /api/v1/collections/:id`**

Request:
```typescript
{
  name?: string;   // 1-100 characters
}
```

Validation:
```typescript
export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});
```

Response: `200 OK` -- returns the updated collection.

### 4.6 Delete Collection

**`DELETE /api/v1/collections/:id`**

Response: `204 No Content`.

Service logic: Delete the collection row. CASCADE deletes `collection_roadmaps` rows. Roadmaps themselves are NOT deleted.

### 4.7 Add Roadmaps to Collection

**`POST /api/v1/collections/:id/roadmaps`**

Request:
```typescript
{
  roadmapIds: string[];   // 1-50 UUIDs
}
```

Validation:
```typescript
export const addCollectionRoadmapsSchema = z.object({
  roadmapIds: z.array(z.string().uuid()).min(1).max(50),
});
```

Response: `201 Created` -- returns the updated collection with its roadmap IDs.

Service logic:
1. Verify collection exists and belongs to the account.
2. Skip any `roadmapIds` that are already in the collection (upsert-like: insert only new ones, ignore duplicates). This makes the endpoint idempotent for the "checkbox toggle" UI.
3. New rows get sequential `sort_order` values continuing from the current max.

### 4.8 Remove Roadmap from Collection

**`DELETE /api/v1/collections/:id/roadmaps/:roadmapId`**

Response: `204 No Content`.

### 4.9 Reorder Collections

**`PATCH /api/v1/collections/reorder`**

Request:
```typescript
{
  orderedIds: string[];   // collection IDs in new order
}
```

Validation:
```typescript
export const reorderCollectionsSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});
```

Response: `200 OK`.

Service logic: Update `sort_order` for each collection to match its position in the array.

### 4.10 Reorder Roadmaps Within Collection

**`PATCH /api/v1/collections/:id/roadmaps/reorder`**

Request:
```typescript
{
  orderedRoadmapIds: string[];   // roadmap IDs in new order within this collection
}
```

Validation:
```typescript
export const reorderCollectionRoadmapsSchema = z.object({
  orderedRoadmapIds: z.array(z.string().uuid()),
});
```

Response: `200 OK`.

Service logic: Update `sort_order` on `collection_roadmaps` rows for this collection.

### 4.11 Roadmap List Extension

The existing `GET /api/v1/roadmaps` endpoint (served by `roadmapService.listRoadmaps`) needs to include collection membership for each roadmap. Extend the response:

```typescript
// In the mapped response from listRoadmaps:
{
  id: string;
  // ... existing fields ...
  type: 'standard' | 'portfolio';   // NEW: from the new type column
  bucketMode: boolean;               // NEW: from the new bucket_mode column
  collectionIds: string[];           // NEW: which collections this roadmap belongs to
}
```

Implementation: After fetching all roadmaps, batch-fetch `collection_roadmaps` for all roadmap IDs and group by roadmap ID. This is one additional query -- not N+1.

```typescript
// In roadmapService.listRoadmaps, after the existing queries:
const roadmapIds = allRoadmaps.map(r => r.id);
const collectionMemberships = await db
  .select({
    roadmapId: collectionRoadmaps.roadmapId,
    collectionId: collectionRoadmaps.collectionId,
  })
  .from(collectionRoadmaps)
  .where(inArray(collectionRoadmaps.roadmapId, roadmapIds));

const collectionsByRoadmap = new Map<string, string[]>();
for (const cm of collectionMemberships) {
  const existing = collectionsByRoadmap.get(cm.roadmapId) ?? [];
  existing.push(cm.collectionId);
  collectionsByRoadmap.set(cm.roadmapId, existing);
}

// Then in the map:
return allRoadmaps.map(r => ({
  // ... existing fields ...
  type: r.type,
  bucketMode: r.bucketMode,
  collectionIds: collectionsByRoadmap.get(r.id) ?? [],
}));
```

---

## 5. API Design -- RT-34: Buckets (No-Date Mode)

### 5.1 Route & Service Files

**New service file:** `server/src/services/bucketService.ts`

Bucket routes are mounted on the existing roadmaps router for the bucket mode toggle and on a new `bucketsRouter` for bucket CRUD. This follows the pattern of nested resources (buckets belong to a roadmap) plus top-level actions (update/delete by bucket ID).

**New route file:** `server/src/routes/buckets.ts`

### 5.2 Endpoints

```
PATCH  /api/v1/roadmaps/:id                             Enable bucket mode (via existing PATCH with { bucketMode: true })
GET    /api/v1/roadmaps/:id/buckets                     List buckets for a roadmap
POST   /api/v1/roadmaps/:id/buckets                     Create a bucket
PATCH  /api/v1/buckets/:id                              Update bucket (name)
DELETE /api/v1/buckets/:id                              Delete bucket (items become unassigned)
PATCH  /api/v1/roadmaps/:id/buckets/reorder             Reorder buckets
```

**Mount in `server/src/index.ts`:**

```typescript
import { bucketsRouter, bucketActionsRouter } from './routes/buckets.js';

app.use('/api/v1/roadmaps/:roadmapId/buckets', bucketsRouter);
app.use('/api/v1/buckets', bucketActionsRouter);
```

### 5.3 Enable Bucket Mode (Roadmap PATCH Extension)

The existing `PATCH /api/v1/roadmaps/:id` endpoint is extended to accept `bucketMode`. This requires updating the `updateRoadmapSchema`:

```typescript
// Updated in shared/src/validation.ts:
export const updateRoadmapSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  bucketMode: z.boolean().optional(),
});
```

When `bucketMode: true` is received, the service performs the bucket mode transition. This is the most complex server-side operation in Sprint D.

**Bucket mode transition (in `roadmapService.updateRoadmap` or a dedicated function):**

```typescript
export async function enableBucketMode(
  roadmapId: string,
  accountId: string,
): Promise<{ success: true } | { error: { code: string; message: string } }> {
  return await db.transaction(async (tx) => {
    // 1. Verify roadmap exists, belongs to account, is standard type, not already bucket mode
    const [roadmap] = await tx
      .select({ id: roadmaps.id, type: roadmaps.type, bucketMode: roadmaps.bucketMode })
      .from(roadmaps)
      .where(and(eq(roadmaps.id, roadmapId), eq(roadmaps.accountId, accountId)))
      .limit(1);

    if (!roadmap) return { error: { code: 'NOT_FOUND', message: 'Roadmap not found' } };
    if (roadmap.type === 'portfolio') return { error: { code: 'VALIDATION', message: 'Portfolio roadmaps cannot use bucket mode' } };
    if (roadmap.bucketMode) return { error: { code: 'VALIDATION', message: 'Roadmap is already in bucket mode' } };

    // 2. Set bucket_mode = true
    await tx
      .update(roadmaps)
      .set({ bucketMode: true, updatedAt: new Date() })
      .where(eq(roadmaps.id, roadmapId));

    // 3. Clear all items' startDate and endDate
    await tx
      .update(items)
      .set({ startDate: null, endDate: null, updatedAt: new Date() })
      .where(eq(items.roadmapId, roadmapId));

    // 4. Create 3 default buckets: Now, Next, Later
    const defaultBuckets = ['Now', 'Next', 'Later'];
    for (let i = 0; i < defaultBuckets.length; i++) {
      await tx.insert(buckets).values({
        roadmapId,
        name: defaultBuckets[i],
        sortOrder: i,
      });
    }

    // 5. Delete Timeline views (timeline requires dates)
    await tx
      .delete(views)
      .where(and(eq(views.roadmapId, roadmapId), eq(views.type, 'timeline')));

    // 6. If the deleted view was the default, set the first remaining view as default
    const remainingViews = await tx
      .select()
      .from(views)
      .where(eq(views.roadmapId, roadmapId))
      .orderBy(views.sortOrder);

    if (remainingViews.length > 0) {
      const hasDefault = remainingViews.some(v => v.isDefault);
      if (!hasDefault) {
        await tx
          .update(views)
          .set({ isDefault: true })
          .where(eq(views.id, remainingViews[0].id));
      }
    }

    return { success: true };
  });
}
```

**Key decisions:**

1. **One-way switch.** The `updateRoadmap` handler rejects `bucketMode: false` if the roadmap is already in bucket mode. This is intentional -- Thomas's spec says this is irreversible in v1.

2. **Timeline views are deleted, not hidden.** Hiding would require a "hidden" flag and conditional logic everywhere views are queried. Deleting is cleaner -- if the user ever converts back (v2), they create new Timeline views. The deletion happens in the same transaction as the mode switch, so it is atomic.

3. **Dates are NULLed, not stored elsewhere.** Thomas's spec is clear: "Existing date values will be removed." We do not create a backup. Simplicity wins -- if a user wants to preserve dates, they export to CSV first.

4. **Portfolio roadmaps cannot use bucket mode.** Portfolios aggregate items from source roadmaps. If one source uses dates and another uses buckets, the portfolio view becomes incoherent. Reject the combination.

### 5.4 List Buckets

**`GET /api/v1/roadmaps/:id/buckets`**

Response:
```typescript
{
  data: Array<{
    id: string;
    roadmapId: string;
    name: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

Service logic: Query buckets for the roadmap, ordered by `sort_order`.

### 5.5 Create Bucket

**`POST /api/v1/roadmaps/:id/buckets`**

Request:
```typescript
{
  name: string;   // 1-50 characters
}
```

Validation:
```typescript
export const createBucketSchema = z.object({
  name: z.string().min(1).max(50),
});
```

Response: `201 Created` -- returns the created bucket.

Service logic:
1. Verify roadmap is in bucket mode. If not, return 400: `"Roadmap is not in bucket mode."`.
2. Check bucket count does not exceed 10. If it does, return 400: `"Maximum 10 buckets per roadmap."`.
3. Check for duplicate name within this roadmap's buckets (case-insensitive). If duplicate, return 400: `"A bucket with this name already exists."`.
4. Insert with `sort_order = MAX(sort_order) + 1`.

### 5.6 Update Bucket

**`PATCH /api/v1/buckets/:id`**

Request:
```typescript
{
  name?: string;   // 1-50 characters
}
```

Validation:
```typescript
export const updateBucketSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});
```

Response: `200 OK` -- returns the updated bucket.

Service logic: Check for duplicate name within the same roadmap's buckets (excluding self).

### 5.7 Delete Bucket

**`DELETE /api/v1/buckets/:id`**

Response: `204 No Content`.

Service logic: Delete the bucket row. The FK `ON DELETE SET NULL` automatically unassigns items from the deleted bucket.

### 5.8 Reorder Buckets

**`PATCH /api/v1/roadmaps/:id/buckets/reorder`**

Request:
```typescript
{
  orderedIds: string[];   // bucket IDs in new order
}
```

Validation:
```typescript
export const reorderBucketsSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});
```

Response: `200 OK`.

### 5.9 Item Bucket Assignment

The existing `PATCH /api/v1/roadmaps/:roadmapId/items/:id` endpoint already handles arbitrary item updates. Extend the `updateItemSchema` to accept `bucketId`:

```typescript
// Updated in shared/src/validation.ts:
export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().nullable().optional(),
  bucketId: z.string().uuid().nullable().optional(),   // NEW: bucket assignment
});
```

In `itemService.updateItem`, when `bucketId` is provided:
- Verify the roadmap is in bucket mode. If not, ignore the `bucketId` field (silently, not an error -- this handles race conditions where the client sends a stale request).
- Verify the bucket exists and belongs to the same roadmap. If not, return 400.
- `bucketId: null` means "unassign from bucket."

### 5.10 View Configuration Changes

**SwimlaneViewConfig extension:**

Add a new `columnMode` value: `'buckets'`. The existing values are `'field'` and `'dates'`.

```typescript
// In shared/src/types.ts -- update SwimlaneViewConfig:
export interface SwimlaneViewConfig {
  columnMode: 'field' | 'dates' | 'buckets';   // NEW: 'buckets' added
  // ... rest unchanged ...
}
```

When `columnMode === 'buckets'`:
- Columns are the roadmap's buckets in `sort_order` order, plus an "Unassigned" column at the end.
- Items are placed in their assigned bucket column. Items with `bucket_id = NULL` go to "Unassigned."
- Dragging a card between columns updates `bucket_id` via the existing item PATCH endpoint.
- Column headers show bucket name and item count.

**TableViewConfig:** No schema change needed. The "Bucket" column is added as a pseudo-field column when the roadmap is in bucket mode. The client handles this as a special case when rendering (similar to how "Parent" is handled in CSV export).

**Timeline view restriction:** When creating a view, the `POST /api/v1/roadmaps/:roadmapId/views` handler should check: if the roadmap is in bucket mode and the requested view type is `timeline`, return 400: `"Timeline views cannot be created for bucket-mode roadmaps."`.

---

## 6. API Design -- RT-35: Templates

### 6.1 Template Storage Strategy

Templates are **static JSON files bundled with the server application.** They are NOT stored in the database. This is the right choice for v1 because:

- No migration needed.
- No CRUD endpoints to build or secure.
- Templates are immutable and versioned with the code.
- Adding a new template is a PR, not a database operation.
- The template list endpoint is a trivial file read cached in memory.

**File location:** `server/src/templates/`

Each template is a separate JSON file: `product-launch.json`, `feature-development.json`, etc. The server reads all templates from this directory at startup and caches them in a module-level `Map`.

```typescript
// server/src/services/templateService.ts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../templates');

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  itemCount: number;
  data: {
    fields: Array<{
      name: string;
      type: 'list' | 'multi_select' | 'numeric' | 'text' | 'date';
      numericFormat?: 'number' | 'currency' | 'percentage';
      values?: string[];
    }>;
    items: Array<{
      name: string;
      startOffset: number;     // days from creation date
      durationDays: number;
      fieldValues?: Record<string, string>;  // fieldName -> valueName
    }>;
    milestoneTypes?: Array<{
      name: string;
      shape: 'diamond' | 'circle' | 'triangle' | 'square';
      color: string;
    }>;
    milestones?: Array<{
      name: string;
      dayOffset: number;       // days from creation date
      typeName: string;        // matches milestoneTypes[].name
    }>;
    views?: Array<{
      name: string;
      type: 'timeline' | 'swimlane' | 'table';
      isDefault?: boolean;
      config: Record<string, unknown>;
    }>;
  };
}

// Cache templates in memory at startup
let templateCache: Map<string, Template> | null = null;

function loadTemplates(): Map<string, Template> {
  if (templateCache) return templateCache;

  templateCache = new Map();
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8');
      const template = JSON.parse(raw) as Template;
      template.itemCount = template.data.items.length;
      templateCache.set(template.id, template);
    } catch (err) {
      console.error(`Failed to load template ${file}:`, err);
    }
  }

  return templateCache;
}

export function listTemplates(): Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  itemCount: number;
}> {
  const templates = loadTemplates();
  return Array.from(templates.values()).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    itemCount: t.itemCount,
  }));
}

export function getTemplate(id: string): Template | null {
  const templates = loadTemplates();
  return templates.get(id) ?? null;
}
```

### 6.2 Endpoints

```
GET    /api/v1/templates           List template summaries
GET    /api/v1/templates/:id       Get full template detail (optional, for preview)
POST   /api/v1/roadmaps            Existing endpoint, extended with optional templateId
```

**New route file:** `server/src/routes/templates.ts`

**Mount in `server/src/index.ts`:**

```typescript
import { templatesRouter } from './routes/templates.js';

app.use('/api/v1/templates', templatesRouter);
```

### 6.3 List Templates

**`GET /api/v1/templates`**

Response:
```typescript
{
  data: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    itemCount: number;
  }>;
}
```

No auth required beyond the standard Clerk auth. Templates are global -- not account-specific.

### 6.4 Get Template Detail

**`GET /api/v1/templates/:id`**

Response:
```typescript
{
  data: Template;   // Full template including data.fields, data.items, etc.
}
```

This endpoint is optional for v1 (the template picker card shows only summary info). Include it for future preview functionality.

### 6.5 Roadmap Creation with Template

Extend the existing `POST /api/v1/roadmaps` endpoint. Update the `createRoadmapSchema`:

```typescript
// Updated in shared/src/validation.ts:
export const createRoadmapSchema = z.object({
  name: z.string().min(1).max(200),
  templateId: z.string().optional(),   // NEW: if provided, seed from template
});
```

When `templateId` is provided, the service performs template seeding after creating the roadmap. This happens in a single transaction.

**Template seeding logic (in `roadmapService.ts`):**

```typescript
export async function createRoadmapFromTemplate(
  accountId: string,
  ownerId: string,
  name: string,
  templateId: string,
) {
  const template = getTemplate(templateId);
  if (!template) {
    // Fallback: create empty roadmap, log warning
    console.warn(`Template ${templateId} not found, creating empty roadmap`);
    return createRoadmap(accountId, ownerId, name);
  }

  return await db.transaction(async (tx) => {
    const creationDate = new Date();

    // 1. Create the roadmap
    const [roadmap] = await tx
      .insert(roadmaps)
      .values({ accountId, ownerId, name })
      .returning();

    // 2. Create fields and collect field ID/value ID mappings
    const fieldMap = new Map<string, string>();        // fieldName -> fieldId
    const fieldValueMap = new Map<string, string>();   // "fieldName:valueName" -> fieldValueId

    for (let i = 0; i < template.data.fields.length; i++) {
      const fieldDef = template.data.fields[i];
      const [field] = await tx.insert(fields).values({
        accountId,
        roadmapId: roadmap.id,
        name: fieldDef.name,
        type: fieldDef.type,
        numericFormat: fieldDef.numericFormat ?? null,
        sortOrder: i,
      }).returning();

      fieldMap.set(fieldDef.name, field.id);

      // Create field values for list/multi_select fields
      if (fieldDef.values && (fieldDef.type === 'list' || fieldDef.type === 'multi_select')) {
        for (let j = 0; j < fieldDef.values.length; j++) {
          const valueName = fieldDef.values[j];
          const [fv] = await tx.insert(fieldValues).values({
            fieldId: field.id,
            name: valueName,
            sortOrder: j,
          }).returning();

          fieldValueMap.set(`${fieldDef.name}:${valueName}`, fv.id);
        }
      }
    }

    // 3. Create items with computed dates
    for (let i = 0; i < template.data.items.length; i++) {
      const itemDef = template.data.items[i];
      const startDate = new Date(creationDate);
      startDate.setDate(startDate.getDate() + itemDef.startOffset);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + itemDef.durationDays);

      const [item] = await tx.insert(items).values({
        roadmapId: roadmap.id,
        name: itemDef.name,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        sortOrder: i,
        createdBy: ownerId,
      }).returning();

      // Set field values on the item
      if (itemDef.fieldValues) {
        for (const [fieldName, valueName] of Object.entries(itemDef.fieldValues)) {
          const fieldId = fieldMap.get(fieldName);
          const fieldValueId = fieldValueMap.get(`${fieldName}:${valueName}`);
          if (fieldId && fieldValueId) {
            await tx.insert(itemFieldValues).values({
              itemId: item.id,
              fieldId,
              fieldValueId,
            });
          }
        }
      }
    }

    // 4. Create milestone types
    const milestoneTypeMap = new Map<string, string>(); // typeName -> typeId
    if (template.data.milestoneTypes) {
      for (let i = 0; i < template.data.milestoneTypes.length; i++) {
        const mtDef = template.data.milestoneTypes[i];
        const [mt] = await tx.insert(milestoneTypes).values({
          accountId,
          roadmapId: roadmap.id,
          name: mtDef.name,
          shape: mtDef.shape,
          color: mtDef.color,
          sortOrder: i,
        }).returning();
        milestoneTypeMap.set(mtDef.name, mt.id);
      }
    }

    // 5. Create milestones with computed dates
    if (template.data.milestones) {
      for (const msDef of template.data.milestones) {
        const msDate = new Date(creationDate);
        msDate.setDate(msDate.getDate() + msDef.dayOffset);
        const typeId = milestoneTypeMap.get(msDef.typeName);
        if (typeId) {
          await tx.insert(milestones).values({
            roadmapId: roadmap.id,
            name: msDef.name,
            date: msDate.toISOString().slice(0, 10),
            typeId,
          });
        }
      }
    }

    // 6. Create views (or default Table view if no views defined)
    if (template.data.views && template.data.views.length > 0) {
      for (let i = 0; i < template.data.views.length; i++) {
        const viewDef = template.data.views[i];
        // Resolve field IDs in the view config
        const resolvedConfig = resolveViewConfig(viewDef.config, fieldMap);
        await tx.insert(views).values({
          roadmapId: roadmap.id,
          name: viewDef.name,
          type: viewDef.type,
          isDefault: viewDef.isDefault ?? (i === 0),
          config: resolvedConfig,
          sortOrder: i,
        });
      }
    } else {
      await tx.insert(views).values({
        roadmapId: roadmap.id,
        name: 'Table View',
        type: 'table',
        isDefault: true,
        config: { visibleFieldIds: [], filters: [] },
      });
    }

    return roadmap;
  });
}
```

**`resolveViewConfig` helper:** Template view configs reference fields by name (since field IDs do not exist until the template is applied). The resolver replaces field name references with the actual field IDs created in the transaction. This is a simple string-based replacement on known config keys (`headerFieldId`, `colorByFieldId`, `columnFieldId`, `rowFieldId`, `visibleFieldIds`).

```typescript
function resolveViewConfig(
  config: Record<string, unknown>,
  fieldMap: Map<string, string>,
): Record<string, unknown> {
  const resolved = { ...config };

  // Replace known field name references with IDs
  const fieldRefKeys = [
    'headerFieldId', 'subHeaderFieldId', 'colorByFieldId',
    'columnFieldId', 'rowFieldId', 'groupRowsByFieldId',
    'labelSuffixFieldId',
  ];

  for (const key of fieldRefKeys) {
    if (typeof resolved[key] === 'string') {
      const fieldId = fieldMap.get(resolved[key] as string);
      if (fieldId) resolved[key] = fieldId;
    }
  }

  // Handle array refs (visibleFieldIds)
  if (Array.isArray(resolved.visibleFieldIds)) {
    resolved.visibleFieldIds = (resolved.visibleFieldIds as string[])
      .map(name => fieldMap.get(name) ?? name)
      .filter(Boolean);
  }

  return resolved;
}
```

**Error handling:** If template seeding fails at any point, the entire transaction rolls back. The roadmap is not created. The client receives a 500, and should fall back to creating an empty roadmap (client-side retry logic).

### 6.6 Template JSON Format Example

`server/src/templates/product-launch.json`:

```json
{
  "id": "product-launch",
  "name": "Product Launch",
  "description": "Plan a product launch from concept to release. Includes phases, workstreams, and key milestones.",
  "category": "product",
  "data": {
    "fields": [
      {
        "name": "Status",
        "type": "list",
        "values": ["Planned", "In Progress", "Complete", "Blocked"]
      },
      {
        "name": "Team",
        "type": "list",
        "values": ["Engineering", "Design", "Marketing", "QA", "Sales"]
      },
      {
        "name": "Priority",
        "type": "list",
        "values": ["High", "Medium", "Low"]
      }
    ],
    "items": [
      { "name": "Discovery & Research", "startOffset": 0, "durationDays": 14, "fieldValues": { "Status": "Planned", "Team": "Design", "Priority": "High" } },
      { "name": "Requirements Definition", "startOffset": 7, "durationDays": 10, "fieldValues": { "Status": "Planned", "Team": "Engineering", "Priority": "High" } },
      { "name": "UX Design", "startOffset": 14, "durationDays": 14, "fieldValues": { "Status": "Planned", "Team": "Design", "Priority": "High" } },
      { "name": "Architecture Planning", "startOffset": 14, "durationDays": 7, "fieldValues": { "Status": "Planned", "Team": "Engineering", "Priority": "Medium" } },
      { "name": "Core Development", "startOffset": 28, "durationDays": 28, "fieldValues": { "Status": "Planned", "Team": "Engineering", "Priority": "High" } },
      { "name": "Integration Testing", "startOffset": 42, "durationDays": 14, "fieldValues": { "Status": "Planned", "Team": "QA", "Priority": "High" } },
      { "name": "Marketing Website", "startOffset": 28, "durationDays": 21, "fieldValues": { "Status": "Planned", "Team": "Marketing", "Priority": "Medium" } },
      { "name": "Sales Enablement", "startOffset": 42, "durationDays": 14, "fieldValues": { "Status": "Planned", "Team": "Sales", "Priority": "Medium" } },
      { "name": "Beta Program", "startOffset": 56, "durationDays": 14, "fieldValues": { "Status": "Planned", "Team": "Engineering", "Priority": "High" } },
      { "name": "Bug Fixes & Polish", "startOffset": 63, "durationDays": 14, "fieldValues": { "Status": "Planned", "Team": "Engineering", "Priority": "High" } },
      { "name": "Documentation", "startOffset": 56, "durationDays": 21, "fieldValues": { "Status": "Planned", "Team": "Engineering", "Priority": "Medium" } },
      { "name": "Launch Prep", "startOffset": 70, "durationDays": 7, "fieldValues": { "Status": "Planned", "Team": "Marketing", "Priority": "High" } },
      { "name": "Go-to-Market", "startOffset": 77, "durationDays": 7, "fieldValues": { "Status": "Planned", "Team": "Marketing", "Priority": "High" } },
      { "name": "Post-Launch Monitoring", "startOffset": 84, "durationDays": 14, "fieldValues": { "Status": "Planned", "Team": "Engineering", "Priority": "Medium" } },
      { "name": "Retrospective", "startOffset": 91, "durationDays": 7, "fieldValues": { "Status": "Planned", "Team": "Engineering", "Priority": "Low" } }
    ],
    "milestoneTypes": [
      { "name": "Launch", "shape": "diamond", "color": "#EF4444" },
      { "name": "Checkpoint", "shape": "circle", "color": "#6366F1" }
    ],
    "milestones": [
      { "name": "Beta Release", "dayOffset": 56, "typeName": "Launch" },
      { "name": "GA Launch", "dayOffset": 84, "typeName": "Launch" },
      { "name": "Design Review", "dayOffset": 28, "typeName": "Checkpoint" }
    ],
    "views": [
      {
        "name": "Timeline",
        "type": "timeline",
        "isDefault": true,
        "config": {
          "headerFieldId": "Team",
          "colorByFieldId": "Status",
          "paletteId": "default",
          "timeScale": "months",
          "themeOrientation": "above",
          "headerOrientation": "horizontal",
          "hideEmptyHeaders": false,
          "layout": "compact",
          "showMilestoneLabels": true,
          "showMilestoneDates": true,
          "filters": []
        }
      },
      {
        "name": "Board",
        "type": "swimlane",
        "config": {
          "columnMode": "field",
          "columnFieldId": "Status",
          "rowFieldId": "Team",
          "paletteId": "default",
          "cardMode": "standard",
          "filters": []
        }
      }
    ]
  }
}
```

Note: View config field references use field **names** (e.g., `"headerFieldId": "Team"`). The `resolveViewConfig` function replaces these with the actual UUID field IDs created during seeding.

### 6.7 Template Catalog (12 Templates)

Sam creates all 12 template JSON files. Here is the complete catalog with key details:

| # | ID | Name | Category | Items | Fields | Milestones | Views |
|---|-----|------|----------|-------|--------|------------|-------|
| 1 | `product-launch` | Product Launch | product | 15 | Status, Team, Priority | Beta Release, GA Launch, Design Review | Timeline, Board |
| 2 | `feature-development` | Feature Development | product | 12 | Status, Owner, Complexity | MVP Complete, Ship | Timeline, Board |
| 3 | `sprint-planning` | Sprint Planning | agile | 10 | Status, Type, Story Points | Sprint Start, Sprint End | Board, Table |
| 4 | `quarterly-okrs` | Quarterly OKRs | strategy | 12 | Status, Owner, Confidence | Quarter Start, Quarter End | Timeline, Table |
| 5 | `marketing-campaign` | Marketing Campaign | marketing | 10 | Status, Channel, Budget | Campaign Launch | Timeline, Board |
| 6 | `design-system` | Design System | design | 12 | Status, Category, Complexity | V1 Release | Timeline, Board |
| 7 | `engineering-roadmap` | Engineering Roadmap | engineering | 15 | Status, Team, Quarter | Q1 Milestone, Q2 Milestone | Timeline, Table |
| 8 | `sales-pipeline` | Sales Pipeline | sales | 8 | Stage, Owner, Deal Size | Quarter Close | Board, Table |
| 9 | `onboarding-program` | Onboarding Program | hr | 10 | Status, Owner, Week | Day 1, Day 30, Day 90 | Timeline, Table |
| 10 | `release-cycle` | Release Cycle | engineering | 12 | Status, Team, Risk | Code Freeze, Release | Timeline, Board |
| 11 | `customer-feedback` | Customer Feedback | product | 8 | Status, Source, Impact | Triage Complete | Board, Table |
| 12 | `event-planning` | Event Planning | operations | 10 | Status, Owner, Budget | Event Day | Timeline, Table |

Each template follows the same JSON format as the Product Launch example above. The `data.items` array uses `startOffset` and `durationDays` for date computation. Fields reference field value names. Views reference field names.

---

## 7. Shared Types

Add to `shared/src/types.ts`:

```typescript
// --- RT-32: Portfolio ---

export type RoadmapType = 'standard' | 'portfolio';

export interface PortfolioItem extends Item {
  sourceRoadmapId: string;
  sourceRoadmapName: string;
}

export interface PortfolioSource {
  id: string;
  sourceRoadmapId: string;
  sourceRoadmapName: string;
  sortOrder: number;
  itemCount?: number;
}

// --- RT-33: Collections ---

export interface Collection {
  id: string;
  accountId: string;
  name: string;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  roadmapCount: number;
  roadmapIds: string[];
}

// --- RT-34: Buckets ---

export interface Bucket {
  id: string;
  roadmapId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// --- RT-35: Templates ---

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  itemCount: number;
}
```

Update the existing `Roadmap` interface:

```typescript
export interface Roadmap {
  id: string;
  accountId: string;
  ownerId: string;
  name: string;
  type: RoadmapType;           // NEW
  bucketMode: boolean;          // NEW
  createdAt: string;
  updatedAt: string;
  owner?: User;
  viewCount?: number;
  isFavorite?: boolean;
  collectionIds?: string[];     // NEW: populated in list responses
}
```

Update the existing `Item` interface:

```typescript
export interface Item {
  // ... existing fields ...
  bucketId: string | null;      // NEW
}
```

Update the `SwimlaneViewConfig` interface:

```typescript
export interface SwimlaneViewConfig {
  columnMode: 'field' | 'dates' | 'buckets';   // UPDATED: added 'buckets'
  // ... rest unchanged ...
}
```

Add validation schemas to `shared/src/validation.ts`:

```typescript
// --- RT-32: Portfolio ---

export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(200),
  sourceRoadmapIds: z.array(z.string().uuid()).min(2).max(20),
});

export const updatePortfolioSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const addPortfolioSourcesSchema = z.object({
  roadmapIds: z.array(z.string().uuid()).min(1).max(20),
});

export const reorderPortfolioSourcesSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

// --- RT-33: Collections ---

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const addCollectionRoadmapsSchema = z.object({
  roadmapIds: z.array(z.string().uuid()).min(1).max(50),
});

export const reorderCollectionsSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

export const reorderCollectionRoadmapsSchema = z.object({
  orderedRoadmapIds: z.array(z.string().uuid()),
});

// --- RT-34: Buckets ---

export const createBucketSchema = z.object({
  name: z.string().min(1).max(50),
});

export const updateBucketSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

export const reorderBucketsSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});
```

Update existing schemas:

```typescript
// Updated createRoadmapSchema:
export const createRoadmapSchema = z.object({
  name: z.string().min(1).max(200),
  templateId: z.string().optional(),
});

// Updated updateRoadmapSchema:
export const updateRoadmapSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  bucketMode: z.boolean().optional(),
});

// Updated updateItemSchema:
export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().nullable().optional(),
  bucketId: z.string().uuid().nullable().optional(),
});
```

---

## 8. WebSocket Events

### 8.1 Collection Events

Collections affect the homepage, which is not currently wired to WebSocket rooms. Since collections are account-scoped, we broadcast to the `account:{accountId}` room (introduced in Sprint C for fiscal year changes).

```typescript
// Server -> Client
socket.emit('collection-created', { collection: Collection });
socket.emit('collection-updated', { collectionId: string, changes: Partial<Collection> });
socket.emit('collection-deleted', { collectionId: string });
socket.emit('collection-roadmaps-changed', { collectionId: string });
```

Client handler pattern: invalidate the `['collections']` query. Collections are low-frequency mutations -- full invalidation is fine.

```typescript
socket.on('collection-created', () => {
  queryClient.invalidateQueries({ queryKey: ['collections'] });
  queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
});

// Same pattern for updated, deleted, roadmaps-changed
```

### 8.2 Bucket Events

Bucket mutations are roadmap-scoped. Broadcast to the `roadmap:{roadmapId}` room.

```typescript
// Server -> Client
socket.emit('bucket-mode-enabled', { roadmapId: string });
socket.emit('bucket-created', { bucket: Bucket });
socket.emit('bucket-updated', { bucketId: string, changes: Partial<Bucket> });
socket.emit('bucket-deleted', { bucketId: string });
socket.emit('buckets-reordered', { roadmapId: string });
```

Client handler pattern:

```typescript
socket.on('bucket-mode-enabled', ({ roadmapId }) => {
  // Full refetch -- this is a major state change (dates cleared, views deleted, buckets created)
  queryClient.invalidateQueries({ queryKey: ['roadmap', roadmapId] });
  queryClient.invalidateQueries({ queryKey: ['items', roadmapId] });
  queryClient.invalidateQueries({ queryKey: ['views', roadmapId] });
  queryClient.invalidateQueries({ queryKey: ['buckets', roadmapId] });
});

socket.on('bucket-created', ({ bucket }) => {
  queryClient.setQueryData(['buckets', bucket.roadmapId], (old: Bucket[] | undefined) =>
    old ? [...old, bucket] : [bucket]
  );
});

socket.on('bucket-updated', ({ bucketId, changes }) => {
  const rmId = roadmapIdRef.current;
  queryClient.setQueryData(['buckets', rmId], (old: Bucket[] | undefined) =>
    old?.map(b => b.id === bucketId ? { ...b, ...changes } : b)
  );
});

socket.on('bucket-deleted', ({ bucketId }) => {
  const rmId = roadmapIdRef.current;
  queryClient.setQueryData(['buckets', rmId], (old: Bucket[] | undefined) =>
    old?.filter(b => b.id !== bucketId)
  );
  // Also invalidate items since some may have become unassigned
  queryClient.invalidateQueries({ queryKey: ['items', rmId] });
});

socket.on('buckets-reordered', ({ roadmapId }) => {
  queryClient.invalidateQueries({ queryKey: ['buckets', roadmapId] });
});
```

### 8.3 Portfolio Events

Portfolio source changes are portfolio-scoped. Since the portfolio is a roadmap, use the existing `roadmap:{portfolioId}` room.

```typescript
socket.emit('portfolio-sources-changed', { portfolioId: string });
```

Client handler: invalidate portfolio items and sources queries.

```typescript
socket.on('portfolio-sources-changed', ({ portfolioId }) => {
  queryClient.invalidateQueries({ queryKey: ['portfolio-items', portfolioId] });
  queryClient.invalidateQueries({ queryKey: ['portfolio-sources', portfolioId] });
});
```

### 8.4 Template Events

None needed. Templates are static and read-only.

---

## 9. Client API Extensions

Add to `client/src/lib/api.ts`:

```typescript
export const api = {
  // ... existing methods ...

  // Portfolios (RT-32)
  createPortfolio: (data: { name: string; sourceRoadmapIds: string[] }) =>
    request<any>('/portfolios', { method: 'POST', body: JSON.stringify(data) }),
  getPortfolioItems: (portfolioId: string) =>
    requestFull<{ data: any[]; sources: any[] }>(`/portfolios/${portfolioId}/items`),
  getPortfolioMilestones: (portfolioId: string) =>
    request<any[]>(`/portfolios/${portfolioId}/milestones`),
  updatePortfolio: (portfolioId: string, data: { name?: string }) =>
    request<any>(`/portfolios/${portfolioId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getPortfolioSources: (portfolioId: string) =>
    request<any[]>(`/portfolios/${portfolioId}/sources`),
  addPortfolioSources: (portfolioId: string, roadmapIds: string[]) =>
    request<any>(`/portfolios/${portfolioId}/sources`, {
      method: 'POST', body: JSON.stringify({ roadmapIds }),
    }),
  removePortfolioSource: (portfolioId: string, roadmapId: string) =>
    request<void>(`/portfolios/${portfolioId}/sources/${roadmapId}`, { method: 'DELETE' }),
  reorderPortfolioSources: (portfolioId: string, orderedIds: string[]) =>
    request<any>(`/portfolios/${portfolioId}/sources/reorder`, {
      method: 'PATCH', body: JSON.stringify({ orderedIds }),
    }),

  // Collections (RT-33)
  getCollections: () => request<any[]>('/collections'),
  createCollection: (data: { name: string }) =>
    request<any>('/collections', { method: 'POST', body: JSON.stringify(data) }),
  updateCollection: (id: string, data: { name?: string }) =>
    request<any>(`/collections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCollection: (id: string) =>
    request<void>(`/collections/${id}`, { method: 'DELETE' }),
  addCollectionRoadmaps: (collectionId: string, roadmapIds: string[]) =>
    request<any>(`/collections/${collectionId}/roadmaps`, {
      method: 'POST', body: JSON.stringify({ roadmapIds }),
    }),
  removeCollectionRoadmap: (collectionId: string, roadmapId: string) =>
    request<void>(`/collections/${collectionId}/roadmaps/${roadmapId}`, { method: 'DELETE' }),
  reorderCollections: (orderedIds: string[]) =>
    request<any>('/collections/reorder', {
      method: 'PATCH', body: JSON.stringify({ orderedIds }),
    }),
  reorderCollectionRoadmaps: (collectionId: string, orderedRoadmapIds: string[]) =>
    request<any>(`/collections/${collectionId}/roadmaps/reorder`, {
      method: 'PATCH', body: JSON.stringify({ orderedRoadmapIds }),
    }),

  // Buckets (RT-34)
  getBuckets: (roadmapId: string) =>
    request<any[]>(`/roadmaps/${roadmapId}/buckets`),
  createBucket: (roadmapId: string, data: { name: string }) =>
    request<any>(`/roadmaps/${roadmapId}/buckets`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  updateBucket: (bucketId: string, data: { name?: string }) =>
    request<any>(`/buckets/${bucketId}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  deleteBucket: (bucketId: string) =>
    request<void>(`/buckets/${bucketId}`, { method: 'DELETE' }),
  reorderBuckets: (roadmapId: string, orderedIds: string[]) =>
    request<any>(`/roadmaps/${roadmapId}/buckets/reorder`, {
      method: 'PATCH', body: JSON.stringify({ orderedIds }),
    }),

  // Templates (RT-35)
  getTemplates: () => request<any[]>('/templates'),
  getTemplate: (id: string) => request<any>(`/templates/${id}`),
};
```

---

## 10. Build Order for Backend

### Jonah: RT-32 (Portfolio) + RT-34 (Buckets) + Shared Migration

Jonah owns the migration file since both RT-32 and RT-34 alter the `roadmaps` table. Build order:

1. **Schema migration** (0003_sprint_d_portfolio_buckets.sql) -- Add all new columns and tables. Update Drizzle schema. Run `db:generate` and `db:migrate`. Coordinate with Sam: Sam needs the migration to exist before he can add his schema definitions, but since it is a single file, Jonah writes the SQL and Sam adds his Drizzle schema definitions after.

2. **Shared types + validation** -- Add new types to `shared/src/types.ts` and schemas to `shared/src/validation.ts`. Update existing `Roadmap`, `Item`, and `SwimlaneViewConfig` types. Update existing `createRoadmapSchema`, `updateRoadmapSchema`, `updateItemSchema`.

3. **Portfolio service + routes** (RT-32) -- `portfolioService.ts` and `portfolios.ts`. The aggregation query is the most complex piece. Start with create/get/update portfolio, then source management, then the items aggregation endpoint.

4. **Read-only middleware** -- `requireStandardRoadmap` middleware to block mutations on portfolio roadmaps. Wire into item, field, and milestone mutation routes.

5. **Bucket service + routes** (RT-34) -- `bucketService.ts` and `buckets.ts`. Start with the bucket mode transition logic (the most complex part), then bucket CRUD, then reorder.

6. **Extend roadmap service** -- Update `listRoadmaps` to include `type`, `bucketMode`, `collectionIds`. Update `updateRoadmap` to handle `bucketMode: true` by calling `enableBucketMode`. Update `createRoadmap` to handle `templateId` (or delegate to Sam since templates are his scope -- coordinate on this).

7. **WebSocket events** -- Add portfolio and bucket events to the WS handler. Follow Sprint C patterns.

### Sam: RT-33 (Collections) + RT-35 (Templates)

Sam's work is fully independent of Jonah's after the shared migration and types are committed.

1. **Drizzle schema additions** -- Add `collections`, `collectionRoadmaps` table definitions to `schema.ts` (the SQL migration is already written by Jonah).

2. **Collection service + routes** (RT-33) -- `collectionService.ts` and `collections.ts`. Standard CRUD + reorder. Mount in `index.ts`.

3. **Template JSON files** (RT-35) -- Write all 12 template JSON files in `server/src/templates/`. Follow the format from section 6.6.

4. **Template service + routes** (RT-35) -- `templateService.ts` (file loading + caching) and `templates.ts` (list + get detail). Mount in `index.ts`.

5. **Template seeding logic** -- Integrate into `roadmapService.createRoadmap` or as a separate `createRoadmapFromTemplate` function. The seeding transaction is the most complex piece.

6. **WebSocket events** -- Add collection events to the WS handler.

### Coordination Points

| Point | Who leads | When |
|-------|-----------|------|
| Migration SQL file | Jonah writes, Sam reviews | First |
| Shared types + validation schemas | Jonah writes all (both RT-32/33/34/35 types), Sam reviews | Second |
| `createRoadmap` + `templateId` handling | Sam implements, Jonah reviews | After Sam finishes template service |
| `listRoadmaps` + `collectionIds` | Jonah implements, references Sam's collection schema | After Sam's schema is committed |

---

## 11. Build Guidance for Frontend

### 11.1 RT-32: Portfolio View

**New components:**

- `client/src/routes/PortfolioPage.tsx` -- Portfolio-specific version of `RoadmapPage`. Reuses `TimelineView` and `SwimlaneView` but passes a `readOnly` prop and injects source color mapping.
- `client/src/components/portfolio/PortfolioCreateModal.tsx` -- Dialog: name input + multi-select roadmap picker with checkboxes. Minimum 2 selection enforcement.
- `client/src/components/portfolio/SourceLegend.tsx` -- Horizontal bar showing source roadmap names with their assigned colors. Visibility toggles (eye icon per source).
- `client/src/components/portfolio/PortfolioSettings.tsx` -- Panel for renaming portfolio, managing sources (add/remove/reorder).

**Routing decision:** The portfolio is a roadmap with `type = 'portfolio'`. When the user navigates to `/roadmaps/:id`, the client checks the roadmap's `type` field from the `GET /api/v1/roadmaps/:id` response. If `type === 'portfolio'`, render `PortfolioPage` instead of `RoadmapPage`. This keeps the URL scheme clean (no `/portfolios/:id` client route needed -- the server handles the `/api/v1/portfolios/` prefix for API calls only).

```typescript
// In the route handler or RoadmapPage:
if (roadmap.type === 'portfolio') {
  return <PortfolioPage roadmap={roadmap} />;
}
```

**Click-through navigation:** When the user clicks an item in the portfolio view, navigate to the source roadmap and open the Item Card:

```typescript
navigate(`/roadmaps/${item.sourceRoadmapId}?item=${item.id}`);
```

The `RoadmapPage` should check for the `?item=` query param on mount and open the Item Card if present.

**Color-coding:** The portfolio items endpoint returns `sources` with assigned colors. Pass these to `TimelineView` and `SwimlaneView` as an override for the `colorByFieldId` config. The views need to support a `colorBySource` mode where each item's color is determined by `sourceRoadmapId` instead of a field value.

### 11.2 RT-33: Collections on Homepage

**New components:**

- `client/src/components/homepage/CollectionSection.tsx` -- Collapsible section: header (name, count, expand/collapse, overflow menu) + roadmap cards list.
- `client/src/components/homepage/CollectionCreateInput.tsx` -- Inline name input for creating a new collection.
- `client/src/components/homepage/CollectionPopover.tsx` -- Popover with checkboxes for assigning a roadmap to collections. Triggered from roadmap card overflow menu.

**Homepage refactor:** The existing roadmaps list page needs to be restructured to group roadmaps by collection. The rendering logic:

1. Fetch collections (`GET /api/v1/collections`) alongside roadmaps.
2. Group roadmaps by collection (a roadmap can appear in multiple collections).
3. Render each collection as a `CollectionSection` with its roadmaps.
4. Render an "Uncategorized" section at the bottom for roadmaps not in any collection.
5. If no collections exist, render the flat list (backward compatible).

**Collapse persistence:** Store collapse state in `localStorage` as `collection-collapse-{collectionId}: boolean`.

**Drag-and-drop:** Use the same drag library the project already uses (if any) or add `@dnd-kit/core` for collection reorder (drag headers) and roadmap-within-collection reorder (drag cards). `@dnd-kit` is the established pattern for React drag-and-drop -- sortable lists with drop zones.

### 11.3 RT-34: Bucket Mode Throughout

**Conditional rendering in RoadmapPage:**

The `RoadmapPage` component already loads the roadmap and checks its properties. When `roadmap.bucketMode === true`:

- Hide the "Add Item" date pickers (or replace with bucket dropdown).
- Load buckets: `useQuery(['buckets', roadmapId], () => api.getBuckets(roadmapId))`.
- Pass `bucketMode` and `buckets` to child view components.

**Swimlane in bucket mode:**

The `SwimlaneView` component needs to handle `columnMode: 'buckets'`:
- Columns are buckets (by `sort_order`) plus "Unassigned."
- Items are placed by `bucketId` match.
- Drag between columns updates `bucketId` via `api.updateItem`.

**Table in bucket mode:**

The `TableView` component needs to:
- Hide "Start Date" and "End Date" columns.
- Add a "Bucket" column with a dropdown cell renderer.
- Support sorting and filtering by bucket.

**Item Card in bucket mode:**

The `ItemCard` component needs to:
- Hide date pickers when `roadmap.bucketMode === true`.
- Show a "Bucket" dropdown field instead.

**Roadmap settings:**

Add a "Planning Mode" section to the roadmap settings panel. Two radio options: "Dates" and "Buckets." The "Buckets" option triggers a confirmation dialog.

**Bucket management panel:** A section in settings (visible when bucket mode is on) listing buckets with rename/delete/add/reorder controls.

### 11.4 RT-35: Template Picker

**New components:**

- `client/src/components/templates/TemplatePickerModal.tsx` -- Full-screen modal (or large dialog) with two paths: "Start from Scratch" and template grid.
- `client/src/components/templates/TemplateCard.tsx` -- Card showing template name, category tag, description, item count.
- `client/src/components/templates/CategoryFilter.tsx` -- Tab bar or filter row: All, Product, Agile, Strategy, etc.

**Integration point:** Replace the current "New Roadmap" button behavior. Instead of directly opening a name input, open the `TemplatePickerModal`. The modal handles both the template selection and the name input steps.

**Template thumbnails:** Thomas's spec mentions `thumbnail` SVGs. For v1, use simple colored icons or abstract shapes per category (a generic product icon for "product" category, etc.). These can be inline SVGs in the `TemplateCard` component -- no need for separate SVG files. The `thumbnail` field in the template JSON is optional for v1.

---

## 12. File Classification (Change Impact)

### Backend Files

| File | Classification | Notes |
|------|---------------|-------|
| `server/src/db/schema.ts` | **Modify** | Add 4 new table definitions (portfolioSources, collections, collectionRoadmaps, buckets). Update roadmaps table definition (add type, bucketMode columns). Update items table definition (add bucketId column). Existing table definitions unchanged. |
| `server/src/db/migrations/0003_sprint_d_portfolio_buckets.sql` | **New** | Single migration for all Sprint D schema changes. |
| `server/src/services/portfolioService.ts` | **New** | Portfolio creation, source management, items aggregation query. |
| `server/src/services/collectionService.ts` | **New** | Collection CRUD, roadmap assignment, reorder. |
| `server/src/services/bucketService.ts` | **New** | Bucket CRUD, reorder. |
| `server/src/services/templateService.ts` | **New** | Template file loading, caching, seeding logic. |
| `server/src/routes/portfolios.ts` | **New** | Express router for all portfolio endpoints. |
| `server/src/routes/collections.ts` | **New** | Express router for all collection endpoints. |
| `server/src/routes/buckets.ts` | **New** | Express router for bucket endpoints (nested + top-level). |
| `server/src/routes/templates.ts` | **New** | Express router for template list/detail. |
| `server/src/templates/*.json` | **New** | 12 template JSON files. |
| `server/src/services/roadmapService.ts` | **Modify** | Update `listRoadmaps` to include type, bucketMode, collectionIds. Update `createRoadmap` to handle templateId. Add `enableBucketMode` function. |
| `server/src/services/itemService.ts` | **Extend** | Update `updateItem` to handle `bucketId` field. Existing logic unchanged. |
| `server/src/routes/roadmaps.ts` | **Modify** | Update PATCH handler to call `enableBucketMode` when bucketMode is requested. Update POST handler to call `createRoadmapFromTemplate` when templateId is provided. |
| `server/src/routes/items.ts` | **Extend** | Add `requireStandardRoadmap` check at the top of mutation routes (POST, PATCH, DELETE) to block portfolio writes. |
| `server/src/index.ts` | **Extend** | Mount portfolio, collection, bucket, and template routers. Four new import + use lines. |
| `server/src/ws/handler.ts` | **Extend** | Add handlers for portfolio, collection, and bucket WebSocket events. Existing events unchanged. |
| `shared/src/types.ts` | **Modify** | Add PortfolioItem, PortfolioSource, Collection, Bucket, TemplateSummary, RoadmapType. Update Roadmap (add type, bucketMode, collectionIds), Item (add bucketId), SwimlaneViewConfig (add 'buckets' to columnMode). |
| `shared/src/validation.ts` | **Modify** | Add 10 new Zod schemas. Update createRoadmapSchema, updateRoadmapSchema, updateItemSchema. |

### Frontend Files

| File | Classification | Notes |
|------|---------------|-------|
| `client/src/routes/RoadmapPage.tsx` | **Modify** | Add portfolio detection (render PortfolioPage when type=portfolio). Add bucket mode conditional logic (bucket queries, bucket-aware props to views). Add ?item= query param handling for click-through. |
| `client/src/routes/PortfolioPage.tsx` | **New** | Portfolio-specific page: aggregated Timeline/Swimlane with source legend, read-only enforcement, click-through. |
| `client/src/components/portfolio/PortfolioCreateModal.tsx` | **New** | Portfolio creation dialog with roadmap picker. |
| `client/src/components/portfolio/SourceLegend.tsx` | **New** | Color legend showing source roadmaps with visibility toggles. |
| `client/src/components/portfolio/PortfolioSettings.tsx` | **New** | Portfolio settings panel (rename, manage sources). |
| `client/src/components/homepage/CollectionSection.tsx` | **New** | Collapsible collection section on homepage. |
| `client/src/components/homepage/CollectionCreateInput.tsx` | **New** | Inline name input for new collections. |
| `client/src/components/homepage/CollectionPopover.tsx` | **New** | Checkbox popover for collection assignment. |
| `client/src/components/templates/TemplatePickerModal.tsx` | **New** | Template selection dialog with grid and category filter. |
| `client/src/components/templates/TemplateCard.tsx` | **New** | Individual template card display. |
| `client/src/components/templates/CategoryFilter.tsx` | **New** | Category tab filter for template grid. |
| `client/src/components/swimlane/SwimlaneView.tsx` | **Modify** | Add `columnMode: 'buckets'` handling -- render bucket columns instead of field or date columns. |
| `client/src/components/table/TableView.tsx` | **Modify** | Add bucket column when roadmap is in bucket mode. Hide date columns in bucket mode. |
| `client/src/components/item-card/ItemCard.tsx` | **Modify** | Conditionally hide date pickers and show bucket dropdown when roadmap is in bucket mode. |
| `client/src/components/timeline/TimelineView.tsx` | **Extend** | Accept readOnly prop to disable drag-to-reschedule and editing for portfolio use. |
| `client/src/hooks/useSocket.ts` | **Extend** | Add handlers for collection, bucket, and portfolio WebSocket events. |
| `client/src/lib/api.ts` | **Extend** | Add portfolio, collection, bucket, and template API methods. |
| Homepage component (existing) | **Modify** | Restructure to group roadmaps by collection. Add "New Portfolio" and "New Collection" buttons. |

### QA Impact Notes

**`server/src/services/roadmapService.ts` [Modify]** -- Changes to `listRoadmaps` add new fields to the response. Regression test: verify existing homepage still renders correctly with the new fields. The `updateRoadmap` function now handles `bucketMode` -- verify that normal name updates still work. The `createRoadmap` function now handles `templateId` -- verify that creating a roadmap without a template (the existing flow) still works identically.

**`server/src/routes/roadmaps.ts` [Modify]** -- PATCH handler now has conditional bucket mode logic. Regression test: verify standard roadmap PATCH (rename) still works. POST handler now checks for templateId. Regression test: verify standard roadmap creation without templateId still works.

**`shared/src/types.ts` [Modify]** -- Adding new fields to existing interfaces (Roadmap, Item, SwimlaneViewConfig). All new fields have default values or are optional. Regression test: verify existing UI components that consume these types still render correctly with the new fields present.

**`shared/src/validation.ts` [Modify]** -- Updating existing schemas with new optional fields. Regression test: verify existing API calls that use these schemas still validate correctly (new fields are all optional with no new required fields on existing schemas).

**`client/src/routes/RoadmapPage.tsx` [Modify]** -- Adding portfolio type detection and bucket mode conditionals. Regression test: verify standard roadmaps (type=standard, bucketMode=false) render exactly as before -- no visual or behavioral changes.

**`client/src/components/swimlane/SwimlaneView.tsx` [Modify]** -- Adding bucket column mode. Regression test: verify `columnMode: 'field'` and `columnMode: 'dates'` still work identically. Test card drag-and-drop in both old and new column modes.

**`client/src/components/table/TableView.tsx` [Modify]** -- Conditional bucket column and hidden date columns. Regression test: verify Table view for standard roadmaps still shows date columns and no bucket column.

**`client/src/components/item-card/ItemCard.tsx` [Modify]** -- Conditional field visibility based on bucket mode. Regression test: verify the Item Card for standard roadmaps still shows date pickers and no bucket dropdown.

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Portfolio items query is slow with 20 source roadmaps | Low | Medium | Max 20 sources, max ~2000 items. The IN query is well-indexed. First optimization if needed: paginate. Monitor query time in the first week. |
| Bucket mode transition loses data users want to keep | Medium | High | Confirmation dialog with explicit warning. Users can export to CSV before switching. The one-way nature is documented. |
| Template seeding transaction is slow with 15 items + fields + milestones + views | Low | Low | Each template creates ~30-40 rows total. A Postgres transaction with 40 inserts completes in under 100ms. Tested with the product-launch template format. |
| Collection drag reorder is janky with many collections | Low | Low | Max 50 collections. Standard DnD kit handles 50 sortable items without performance issues. |
| Portfolio color assignment conflicts with field-based coloring | Medium | Low | Portfolio views override `colorByFieldId` with source-based coloring. The legend clearly shows source-to-color mapping. No ambiguity. |
| Template view configs reference field names that might change | Low | Low | Templates are immutable static files. Field name references are resolved to IDs at seeding time. Once seeded, the roadmap is independent of the template. |
| Existing clients break when Roadmap type has new fields | Low | Low | New fields have safe defaults: `type = 'standard'`, `bucketMode = false`, `collectionIds = []`. Old clients that do not read these fields see no change. |
| Concurrent bucket mode enable | Low | Low | The transaction checks `bucketMode = false` before proceeding. If two requests race, the second sees `bucketMode = true` and returns the "already in bucket mode" validation error. |

---

## 14. Decisions Summary

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| Single IN query for portfolio items, not N separate queries | One query with `WHERE roadmap_id IN (...)` is simpler and faster than N parallel queries. Postgres handles IN clauses with index scans efficiently. | N separate queries per source (rejected: more connections, harder to merge), materialized view (rejected: premature optimization) |
| Color assignment at read time, not stored | Source colors depend on the active palette. Storing colors would require re-computation whenever the palette changes. Read-time assignment is deterministic and palette-aware. | Stored color per source (rejected: stale when palette changes), user-chosen color per source (rejected: scope creep) |
| No post-creation minimum for portfolio sources | Enforcing minimum 2 sources after creation creates awkward UX when replacing all sources. The empty state handles 0 sources gracefully. | Minimum 2 enforced always (rejected: blocks legitimate "remove all, re-add" workflows) |
| Bucket mode is one-way switch | Reversibility requires re-entering dates for all items -- a UX nightmare. One-way keeps the code simple and the user expectation clear. | Reversible with date backup (rejected: complexity for v1, where to store backup), reversible with dates zeroed (rejected: confusing -- what does reverting even mean if dates are gone) |
| Timeline views deleted on bucket mode enable | Hiding views requires a "hidden" flag and conditional logic in all view queries. Deleting is clean and the user can create new views later. | Hide with flag (rejected: new column, conditional logic everywhere), disable but show (rejected: confusing UX) |
| Templates as static JSON, not database table | No CRUD needed. Templates are immutable in v1. Code-versioned. Adding a template is a PR. | Database table with admin UI (rejected: scope creep, CRUD endpoints not needed), Git submodule (rejected: over-engineering) |
| Template view configs reference field names, resolved at seeding | Field IDs do not exist until the template is applied. Name-based references in JSON, resolved to IDs during the seeding transaction, is the simplest approach. | Placeholder IDs (rejected: error-prone), two-pass seeding (rejected: unnecessary complexity when names work) |
| Collections are account-scoped, not user-scoped | Thomas's spec says "all users in the account see the same collections." Account-scoping is simpler and matches the shared workspace model. | Per-user collections (rejected: requirement says shared), both (rejected: scope creep) |
| Reorder endpoints use `orderedIds` array, not `{ id, sortOrder }` pairs | The `orderedIds` pattern is cleaner for the client (just send the array in order) and simpler on the server (loop with index as sort_order). Established pattern from field value reorder. | Individual sort_order updates (rejected: N PATCH calls), { id, sortOrder } pairs (rejected: redundant -- position in array IS the order) |

---

*Tech approach written by Andrei (Technical Architect). Jonah: read sections 2-5, 8, and 10 for your build plan (RT-32 + RT-34 + migration + shared types). Sam: read sections 2, 4, 6-7, and 10 for your build plan (RT-33 + RT-35 + template files). Alice: read sections 9, 11, and the shared types in section 7 for frontend implementation. Robert: read section 11 for UI component structure. Nina/Soren: read 11.2 (collection drag), 11.3 (bucket swimlane drag), and 11.4 (template card interactions). Enzo: read section 12 for QA impact notes and section 13 for risk areas.*
