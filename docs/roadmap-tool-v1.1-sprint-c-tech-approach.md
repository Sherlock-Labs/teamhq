# Roadmap Tool v1.1 Sprint C -- Technical Approach Addendum

**Author:** Andrei (Technical Architect)
**Date:** February 13, 2026
**Status:** Complete
**Project ID:** `roadmap-tool`
**Inputs:** `docs/roadmap-tool-v1.1-sprint-c-requirements.md` (Thomas), `docs/roadmap-tool-v1.1-sprint-b-tech-approach.md` (Sprint B tech approach)
**Scope:** RT-28 (Comments & Activity Log), RT-29 (CSV Import/Export), RT-31 (Fiscal Year Display)

---

## 1. Architectural Summary

Sprint C adds collaboration depth and data utility to the roadmap tool. All three features are independent with zero cross-dependencies, which means backend work can be parallelized and each feature can be tested in isolation.

The strategy:

- **One new table** (`comments`) follows existing patterns -- UUID PK, timestamps, cascade deletes, indexed FKs.
- **No existing tables are altered.** The `item_activities` table already has a flexible `action` TEXT column and `details` JSONB column. We insert new action values (`commented`, `comment_edited`, `comment_deleted`, `linked`, `unlinked`, `sub_item_added`, `sub_item_removed`, `key_date_added`, `key_date_removed`) without schema changes. The `accounts` table already has `fiscal_year_end` -- no migration needed for RT-31.
- **One new route file** (`comments.ts`) and **one new service file** (`commentService.ts`) follow the exact same structure as Sprint B's `itemLinks.ts` and `itemLinkService.ts`.
- **The account endpoint** needs a PATCH handler for `fiscal_year_end`. This is a new route file (`account.ts`) since no account routes exist yet.
- **The collaborators endpoint** queries existing `roadmap_shares` + `roadmaps.owner_id` -- no new tables, just a new query in the sharing service.
- **CSV parsing and export are entirely client-side** using PapaParse. Only the batch import endpoint (`POST /items/import`) touches the server.
- **Four new WebSocket event types** for comment CRUD, plus one account-level broadcast for fiscal year changes.

The frontend work is straightforward: an Activity tab in the Item Card (comment list + input), a multi-step import modal, an export button, a fiscal year dropdown in Account Settings, and label formatting changes in `timeScale.ts`.

---

## 2. Database Schema Changes

### 2.1 Migration File

A single migration handles the comments table. File: `server/src/db/migrations/0002_sprint_c_comments.sql`.

```sql
-- Sprint C: Comments (RT-28)
-- Additive only. No existing columns altered or removed.

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  mentions    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_item ON comments(item_id);
CREATE INDEX idx_comments_item_created ON comments(item_id, created_at DESC);
```

**Key decisions:**

1. **`user_id` has no ON DELETE CASCADE.** If a user is removed from the system, their comments remain (attributed to a deleted user). This matches how `item_activities.user_id` works -- the FK references `users(id)` without cascade. The frontend shows "Deleted User" when the join returns null.

2. **`mentions` is a JSONB array of user UUIDs, not a junction table.** At max 20 mentions per comment, a JSONB array is simpler and faster than a `comment_mentions` junction table. We never need to query "all comments that mention user X" (there is no notification system in v1), so the denormalized approach is the right trade-off. If notifications ship later, a junction table or GIN index can be added then.

3. **Two indexes on `comments`.** The `idx_comments_item` index supports the cascade delete path (Postgres uses it when the parent item is deleted). The `idx_comments_item_created` composite index supports the paginated query `WHERE item_id = ? ORDER BY created_at DESC LIMIT 50` which is the primary access pattern for the Activity tab.

4. **No changes to `item_activities`.** The `action` column is already an unconstrained TEXT field. We insert new action values at the application layer. The `details` JSONB column carries whatever context each action type needs.

### 2.2 Drizzle Schema Addition

Add to `server/src/db/schema.ts`:

```typescript
// --- Comments (RT-28) ---

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  mentions: jsonb('mentions').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_comments_item').on(table.itemId),
  index('idx_comments_item_created').on(table.itemId, table.createdAt),
]);
```

### 2.3 Migration Strategy

- **Additive only.** One new table. No existing columns altered or removed. No data transformation.
- **Rollback plan:** `DROP TABLE comments;` -- clean since no existing data is modified.
- **Zero downtime.** New table creation does not lock existing tables.
- **Run via:** `npm run db:generate -w server && npm run db:migrate -w server` (Drizzle standard flow).

---

## 3. API Design -- RT-28: Comments & Activity Log

All endpoints follow existing patterns: Express Router with `mergeParams`, Zod validation, service layer for business logic, WebSocket broadcast after mutation. The sender socket is excluded from broadcasts using the `x-socket-id` header.

### 3.1 Route & Service Files

**New route file:** `server/src/routes/comments.ts`
**New service file:** `server/src/services/commentService.ts`

### 3.2 Endpoints

```
POST   /api/v1/roadmaps/:roadmapId/items/:itemId/comments     Create comment
GET    /api/v1/roadmaps/:roadmapId/items/:itemId/activity      Unified activity feed
PATCH  /api/v1/comments/:id                                     Edit comment
DELETE /api/v1/comments/:id                                     Delete comment
GET    /api/v1/roadmaps/:roadmapId/collaborators                List mentionable users
```

**Mount in `server/src/index.ts`:**

```typescript
import { commentsRouter, commentActionsRouter } from './routes/comments.js';
import { collaboratorsRouter } from './routes/comments.js';

// Comments nested under items (roadmap context for permission checks)
app.use('/api/v1/roadmaps/:roadmapId/items/:itemId/comments', commentsRouter);
// Comment actions (edit/delete -- ID is globally unique)
app.use('/api/v1/comments', commentActionsRouter);
// Collaborators (nested under roadmap)
app.use('/api/v1/roadmaps/:roadmapId/collaborators', collaboratorsRouter);
```

Note: the activity feed is also served from the `commentsRouter` since it is nested under `/:roadmapId/items/:itemId/` and is conceptually part of the same feature surface. The route handler at `/activity` sits alongside the comment CRUD routes.

### 3.3 Create Comment

**`POST /api/v1/roadmaps/:roadmapId/items/:itemId/comments`**

Request:
```typescript
{
  body: string;      // 1-5000 characters
  mentions: string[]; // 0-20 user UUIDs
}
```

Validation (Zod, in `shared/src/validation.ts`):
```typescript
export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string().uuid()).max(20).default([]),
});
```

Response: `201 Created`
```typescript
{
  data: {
    id: string;
    itemId: string;
    userId: string;
    body: string;
    mentions: string[];
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  }
}
```

Service logic:
1. Verify item exists in roadmap (same access check pattern as `itemService.getItem`).
2. Require editor role (`requireEditor` middleware).
3. Validate mentions: each UUID in the `mentions` array must be a collaborator on this roadmap (owner or in `roadmap_shares`). Silently strip any invalid UUIDs rather than rejecting the request -- this handles the race condition where a user is unshared between the client populating the mention picker and the comment being submitted.
4. Insert comment row.
5. Insert activity log entry: `action: 'commented'`, `details: { commentId, preview }` where `preview` is the first 100 characters of the body.
6. Broadcast `comment-created` WebSocket event to the roadmap room.
7. Return the comment with the author's user info (name, avatar) joined.

### 3.4 Edit Comment

**`PATCH /api/v1/comments/:id`**

Request:
```typescript
{
  body: string;       // 1-5000 characters
  mentions: string[]; // 0-20 user UUIDs
}
```

Validation:
```typescript
export const updateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string().uuid()).max(20).default([]),
});
```

Response: `200 OK`
```typescript
{
  data: {
    id: string;
    itemId: string;
    userId: string;
    body: string;
    mentions: string[];
    createdAt: string;
    updatedAt: string; // updated to NOW()
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  }
}
```

Service logic:
1. Fetch the comment by ID.
2. Authorization check: the requesting user must be the comment author OR the roadmap owner. To determine the roadmap owner, join through `comments.item_id -> items.roadmap_id -> roadmaps.owner_id`. If neither condition is met, return 403.
3. Strip invalid mention UUIDs (same as create).
4. Update `body`, `mentions`, and `updated_at`.
5. Insert activity log entry: `action: 'comment_edited'`, `details: { commentId }`.
6. Broadcast `comment-updated` to the roadmap room.
7. Return the updated comment with user info.

**How the frontend detects "(edited)":** Compare `createdAt` vs `updatedAt`. If they differ, the comment was edited.

### 3.5 Delete Comment

**`DELETE /api/v1/comments/:id`**

Response: `204 No Content`

Service logic:
1. Fetch the comment by ID (need `item_id` for the activity log and roadmap context).
2. Authorization check: same as edit (author or roadmap owner).
3. Delete the comment row.
4. Insert activity log entry: `action: 'comment_deleted'`, `details: { commentId, preview }` where preview is the first 100 characters.
5. Broadcast `comment-deleted` to the roadmap room.

### 3.6 Unified Activity Feed

**`GET /api/v1/roadmaps/:roadmapId/items/:itemId/activity?page=1&perPage=50`**

This is the critical query that powers the Activity tab. It must return comments and system events interleaved by `created_at DESC`.

Response:
```typescript
{
  data: ActivityEntry[];
  meta: {
    total: number;
    page: number;
    perPage: number;
  };
}
```

Where `ActivityEntry` is a union type:

```typescript
// In shared/src/types.ts:
export interface CommentActivityEntry {
  type: 'comment';
  id: string;         // comment ID
  itemId: string;
  userId: string;
  body: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface SystemActivityEntry {
  type: 'system';
  id: string;         // item_activities ID
  itemId: string;
  userId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export type ActivityEntry = CommentActivityEntry | SystemActivityEntry;
```

**Query strategy -- UNION query:**

The service performs a SQL UNION ALL across `comments` and `item_activities`, ordered by `created_at DESC`, with LIMIT/OFFSET for pagination:

```typescript
// In commentService.ts:
export async function getActivityFeed(
  itemId: string,
  page: number,
  perPage: number,
): Promise<{ entries: ActivityEntry[]; total: number }> {
  const offset = (page - 1) * perPage;

  // Use a raw SQL UNION query for efficiency
  // Both tables have item_id, user_id, created_at -- the common sort key
  const result = await db.execute(sql`
    SELECT * FROM (
      SELECT
        c.id,
        'comment' AS type,
        c.item_id,
        c.user_id,
        c.body,
        c.mentions,
        NULL AS action,
        NULL AS details,
        c.created_at,
        c.updated_at,
        u.name AS user_name,
        u.avatar_url AS user_avatar_url
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.item_id = ${itemId}

      UNION ALL

      SELECT
        ia.id,
        'system' AS type,
        ia.item_id,
        ia.user_id,
        NULL AS body,
        NULL AS mentions,
        ia.action,
        ia.details,
        ia.created_at,
        NULL AS updated_at,
        u.name AS user_name,
        u.avatar_url AS user_avatar_url
      FROM item_activities ia
      LEFT JOIN users u ON u.id = ia.user_id
      WHERE ia.item_id = ${itemId}
    ) AS feed
    ORDER BY created_at DESC
    LIMIT ${perPage}
    OFFSET ${offset}
  `);

  // Count query for pagination meta
  const countResult = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM comments WHERE item_id = ${itemId}) +
      (SELECT COUNT(*) FROM item_activities WHERE item_id = ${itemId})
    AS total
  `);

  // Map rows to ActivityEntry union type
  // ... (straightforward row mapping)
}
```

**Why UNION ALL instead of two separate queries:** The Activity tab must interleave comments and system events by time. Two separate queries would require client-side merge-sorting, which is fine but means the client would need to request more rows than necessary from each table to fill a page correctly. A single UNION query with ORDER BY and LIMIT at the database level is simpler and gives exact pagination.

**Performance:** Both `comments` and `item_activities` have indexes on `item_id`. The UNION ALL with LIMIT 50 will be fast for typical item activity volumes (under 500 entries per item). The count query uses two indexed COUNT subqueries. No concern at this scale.

### 3.7 Collaborators Endpoint

**`GET /api/v1/roadmaps/:roadmapId/collaborators`**

Response:
```typescript
{
  data: Collaborator[];
}
```

Where:
```typescript
// In shared/src/types.ts:
export interface Collaborator {
  id: string;          // user ID
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'owner' | 'editor' | 'viewer';
}
```

Service logic (in `commentService.ts` or as a separate query helper):

```typescript
export async function getCollaborators(roadmapId: string): Promise<Collaborator[]> {
  // Get the roadmap owner
  const [roadmap] = await db
    .select({
      ownerId: roadmaps.ownerId,
    })
    .from(roadmaps)
    .where(eq(roadmaps.id, roadmapId))
    .limit(1);

  if (!roadmap) return [];

  // Get shared users with their roles
  const shares = await db
    .select({
      userId: roadmapShares.userId,
      role: roadmapShares.role,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(roadmapShares)
    .innerJoin(users, eq(users.id, roadmapShares.userId))
    .where(eq(roadmapShares.roadmapId, roadmapId));

  // Get the owner's user info
  const [owner] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, roadmap.ownerId))
    .limit(1);

  const collaborators: Collaborator[] = [];

  if (owner) {
    collaborators.push({
      id: owner.id,
      name: owner.name,
      email: owner.email,
      avatarUrl: owner.avatarUrl,
      role: 'owner',
    });
  }

  for (const share of shares) {
    collaborators.push({
      id: share.userId,
      name: share.name,
      email: share.email,
      avatarUrl: share.avatarUrl,
      role: share.role as 'editor' | 'viewer',
    });
  }

  return collaborators;
}
```

This query is not performance-sensitive (collaborator lists are small, typically under 20 users) and is called once when the mention picker opens.

---

## 4. API Design -- RT-29: CSV Import/Export

### 4.1 Client-Side Architecture (No Server Involvement for Parsing/Export)

**CSV parsing** uses PapaParse, a well-established library (30M+ weekly npm downloads, no dependencies, 6KB gzipped). Install as a client dependency:

```bash
npm install papaparse -w client
npm install -D @types/papaparse -w client
```

**CSV export** uses PapaParse's `unparse()` function to generate CSV from the loaded items data. The file is downloaded via a programmatic `<a>` click with a blob URL. No server endpoint needed.

Both parsing and export happen entirely in the browser. The server only receives the final validated items for batch creation.

### 4.2 Batch Import Endpoint

**`POST /api/v1/roadmaps/:roadmapId/items/import`**

This endpoint receives pre-validated items from the client and creates them in a single transaction. The client has already parsed the CSV, mapped columns, resolved field values, and validated dates. The server validates each item using the existing `createItemSchema` and creates them in bulk.

Request:
```typescript
{
  items: Array<{
    name: string;
    description?: string | null;
    startDate?: string | null;    // ISO date YYYY-MM-DD
    endDate?: string | null;      // ISO date YYYY-MM-DD
    fieldValues?: Array<{
      fieldId: string;
      fieldValueId?: string | null;   // for list/multi_select
      textValue?: string | null;      // for text fields
      numericValue?: number | null;   // for numeric fields
      dateValue?: string | null;      // for date fields
      userId?: string | null;         // for team_member fields
    }>;
  }>;
}
```

Validation (Zod):
```typescript
export const importItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  fieldValues: z.array(z.object({
    fieldId: z.string().uuid(),
    fieldValueId: z.string().uuid().nullable().optional(),
    textValue: z.string().nullable().optional(),
    numericValue: z.number().nullable().optional(),
    dateValue: z.string().nullable().optional(),
    userId: z.string().uuid().nullable().optional(),
  })).optional(),
});

export const batchImportSchema = z.object({
  items: z.array(importItemSchema).min(1).max(1000),
});
```

Response: `200 OK`
```typescript
{
  data: {
    created: number;
    failed: number;
    errors: Array<{
      row: number;    // 0-indexed row number in the submitted array
      message: string;
    }>;
  }
}
```

Service logic:
1. Verify roadmap exists and belongs to account.
2. Require editor role.
3. Get the current max `sort_order` for the roadmap.
4. **Process in a single database transaction:**
   - For each item in the array, validate individually.
   - Insert valid items with sequential `sort_order` values starting from `maxOrder + 1`.
   - For each item's `fieldValues`, insert into `item_field_values`.
   - Track failures (row index + error message) without aborting the entire batch.
5. Insert activity log entries for each successfully created item: `action: 'created'`, `details: { name, source: 'csv_import' }`.
6. Broadcast `items-imported` WebSocket event with the count (the client will refetch items after import rather than trying to inject individual `item-created` events for potentially hundreds of items).

**Transaction approach -- partial success:** The transaction wraps each item individually using savepoints. If one row fails validation at the DB level (e.g., FK constraint), that savepoint is rolled back, the error is recorded, and the next item proceeds. This matches Thomas's spec: "Imported X of Y items. Z items failed."

```typescript
// Pseudocode for the transaction:
await db.transaction(async (tx) => {
  for (let i = 0; i < input.items.length; i++) {
    try {
      // Create a savepoint for this row
      const item = input.items[i];
      const [created] = await tx.insert(items).values({
        roadmapId,
        name: item.name,
        description: item.description ?? null,
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        sortOrder: baseOrder + i,
        createdBy: userId,
      }).returning();

      // Insert field values
      if (item.fieldValues?.length) {
        await tx.insert(itemFieldValues).values(
          item.fieldValues.map(fv => ({
            itemId: created.id,
            fieldId: fv.fieldId,
            fieldValueId: fv.fieldValueId ?? null,
            textValue: fv.textValue ?? null,
            numericValue: fv.numericValue ?? null,
            dateValue: fv.dateValue ?? null,
            userId: fv.userId ?? null,
          })),
        );
      }

      // Activity log
      await tx.insert(itemActivities).values({
        itemId: created.id,
        userId,
        action: 'created',
        details: { name: item.name, source: 'csv_import' },
      });

      createdCount++;
    } catch (err) {
      errors.push({ row: i, message: err instanceof Error ? err.message : 'Unknown error' });
      failedCount++;
    }
  }
});
```

**Mount in `server/src/index.ts`:**

The batch import route is mounted on the existing `itemsRouter` as an additional endpoint. This avoids creating a separate router just for one endpoint.

Add to `server/src/routes/items.ts`:

```typescript
// POST /api/v1/roadmaps/:roadmapId/items/import
itemsRouter.post('/import', requireEditor, async (req, res, next) => {
  // ... validation and service call
});
```

### 4.3 Client-Side Column Mapping

The column mapping logic is entirely a frontend concern (no server involvement), but the data structure is important for Alice to implement correctly.

**Auto-map algorithm:**

```typescript
// In a new client utility: client/src/lib/csvMapping.ts

interface ColumnMapping {
  csvColumn: string;       // header name from CSV
  csvIndex: number;        // column index in parsed data
  mappedField: MappedField | null;  // null = "Ignore"
}

type MappedField =
  | { type: 'name' }
  | { type: 'description' }
  | { type: 'startDate' }
  | { type: 'endDate' }
  | { type: 'customField'; fieldId: string; fieldType: FieldType };

function autoMapColumns(
  csvHeaders: string[],
  roadmapFields: Field[],
): ColumnMapping[] {
  const mappings: ColumnMapping[] = csvHeaders.map((header, index) => ({
    csvColumn: header,
    csvIndex: index,
    mappedField: null,
  }));

  // Built-in field matching (case-insensitive, underscore/space normalized)
  const normalize = (s: string) => s.toLowerCase().replace(/[_\s-]/g, '');

  const builtInMatches: Record<string, MappedField> = {
    'name': { type: 'name' },
    'title': { type: 'name' },
    'itemname': { type: 'name' },
    'description': { type: 'description' },
    'startdate': { type: 'startDate' },
    'start': { type: 'startDate' },
    'enddate': { type: 'endDate' },
    'end': { type: 'endDate' },
    'duedate': { type: 'endDate' },
    'due': { type: 'endDate' },
  };

  for (const mapping of mappings) {
    const normalized = normalize(mapping.csvColumn);

    // Try built-in fields first
    if (builtInMatches[normalized]) {
      mapping.mappedField = builtInMatches[normalized];
      continue;
    }

    // Try custom fields (exact normalized name match)
    const matchedField = roadmapFields.find(
      f => normalize(f.name) === normalized && !f.isArchived,
    );
    if (matchedField) {
      mapping.mappedField = {
        type: 'customField',
        fieldId: matchedField.id,
        fieldType: matchedField.type,
      };
    }
  }

  return mappings;
}
```

**Date parsing utility:**

```typescript
// client/src/lib/csvDateParser.ts

const DATE_FORMATS = [
  { regex: /^\d{4}-\d{2}-\d{2}$/, parse: (s: string) => s },  // YYYY-MM-DD (pass through)
  { regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/, parse: parseSlashDate }, // MM/DD/YYYY or DD/MM/YYYY
];

/**
 * Auto-detect date format for a column by sampling the first 10 non-empty values.
 * Returns a parser function, or null if no format matches consistently.
 */
function detectDateFormat(values: string[]): ((s: string) => string | null) | null {
  // ... implementation samples values and picks the best-matching format
}
```

The date parser uses column-level format detection: it samples up to 10 non-empty values from the column and picks the format that parses the most values successfully. This avoids the ambiguity of per-cell detection (where `01/02/2026` could be Jan 2 or Feb 1). If no format matches at least 80% of sampled values, the parser returns null for unparseable cells.

**Field value resolution for list/multi_select fields:**

```typescript
function resolveFieldValue(
  csvValue: string,
  field: Field,
  fieldValues: FieldValue[],
): string | null {
  // Case-insensitive match against existing field value names
  const normalized = csvValue.trim().toLowerCase();
  const match = fieldValues.find(fv => fv.name.toLowerCase() === normalized);
  return match?.id ?? null;  // null = unmatched (will be ignored)
}
```

For `multi_select` fields, the CSV cell may contain multiple values separated by semicolons. Each value is resolved independently.

### 4.4 Client-Side Export

Export is generated entirely from the loaded items data -- no server endpoint. The export function lives in `client/src/lib/csvExport.ts`:

```typescript
import Papa from 'papaparse';

interface ExportOptions {
  roadmapName: string;
  items: Item[];
  fields: Field[];
  fieldValues: FieldValue[];   // all field values for resolution
  collaborators: Collaborator[]; // for team_member field name resolution
}

function exportItemsToCsv(options: ExportOptions): void {
  const { roadmapName, items, fields, fieldValues, collaborators } = options;

  // Build header row
  const headers = ['Name', 'Description', 'Start Date', 'End Date', 'Parent'];
  const customFields = fields.filter(f => !f.isArchived);
  for (const field of customFields) {
    headers.push(field.name);
  }

  // Build data rows
  const rows = items.map(item => {
    const row: Record<string, string> = {
      'Name': item.name,
      'Description': item.description ?? '',
      'Start Date': item.startDate ?? '',
      'End Date': item.endDate ?? '',
      'Parent': item.parentId
        ? items.find(i => i.id === item.parentId)?.name ?? ''
        : '',
    };

    for (const field of customFields) {
      row[field.name] = resolveExportValue(item, field, fieldValues, collaborators);
    }

    return row;
  });

  const csv = Papa.unparse(rows, { header: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const filename = `${roadmapName}-${today}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

The `resolveExportValue` helper converts field values to display strings:
- **list**: field value name
- **multi_select**: semicolon-separated field value names
- **numeric**: plain number string
- **text**: raw text
- **date**: ISO date string (YYYY-MM-DD)
- **team_member**: user name from the collaborators list

---

## 5. API Design -- RT-31: Fiscal Year Display

### 5.1 Account Endpoint

There is currently no account route file. Sprint C needs one for the fiscal year setting. This is minimal -- a GET and PATCH.

**New route file:** `server/src/routes/account.ts`
**New service file:** `server/src/services/accountService.ts`

```
GET   /api/v1/account                Get account details
PATCH /api/v1/account                Update account settings
```

**Mount in `server/src/index.ts`:**

```typescript
import { accountRouter } from './routes/account.js';

app.use('/api/v1/account', accountRouter);
```

### 5.2 Get Account

**`GET /api/v1/account`**

Response:
```typescript
{
  data: {
    id: string;
    name: string;
    fiscalYearEnd: number;   // 1-12
    createdAt: string;
    updatedAt: string;
  }
}
```

Service logic: Query `accounts` by `req.accountId`. Return the account record.

### 5.3 Update Account

**`PATCH /api/v1/account`**

Request:
```typescript
{
  name?: string;
  fiscalYearEnd?: number;  // 1-12
}
```

Validation:
```typescript
export const updateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  fiscalYearEnd: z.number().int().min(1).max(12).optional(),
});
```

Response: `200 OK`
```typescript
{
  data: {
    id: string;
    name: string;
    fiscalYearEnd: number;
    createdAt: string;
    updatedAt: string;
  }
}
```

Service logic:
1. Require admin role (`requireAdmin` middleware). Only account admins can change fiscal year.
2. Update the account row.
3. Broadcast `account-updated` WebSocket event to all connected sockets for this account. This requires a slight extension to the room structure -- see section 7.

### 5.4 Fiscal Year Label Computation

The fiscal year setting affects **label generation only** in `client/src/lib/timeScale.ts`. Tick positions (the x-coordinates where grid lines are drawn) do not change -- quarters still start at January, April, July, October in calendar terms. What changes is the text label rendered at each tick.

**Key insight:** The functions `getMajorTicks` and `getMinorTicks` currently compute both positions AND labels. The fiscal year logic modifies only the label string. The cleanest approach is to add an optional `fiscalYearStartMonth` parameter (1-12, defaults to 1) and adjust the label formatting functions.

**Conversion from stored value to start month (frontend):**

```typescript
// The DB stores fiscal_year_end. Convert to start month for display/computation.
function fiscalYearEndToStartMonth(fiscalYearEnd: number): number {
  return fiscalYearEnd === 12 ? 1 : fiscalYearEnd + 1;
}
```

**Modified `getMajorTicks` signature:**

```typescript
export function getMajorTicks(
  xScale: D3TimeScale,
  scale: TimeScale,
  fiscalYearStartMonth?: number,  // NEW: 1 = January (default/calendar), 2-12 = non-calendar fiscal year
): { date: Date; label: string; x: number }[] {
  // ... existing tick date calculation (unchanged) ...
  return dates.map((date) => ({
    date,
    label: formatMajorLabel(date, scale, fiscalYearStartMonth),
    x: xScale(date),
  }));
}
```

**Modified `getMinorTicks` signature:**

```typescript
export function getMinorTicks(
  xScale: D3TimeScale,
  scale: TimeScale,
  fiscalYearStartMonth?: number,  // NEW
): { date: Date; label: string; x: number; width: number }[] {
  // Only quarters, halves, and years are affected
  // Weeks and months labels are unchanged
}
```

**Fiscal year label formatting functions:**

```typescript
/**
 * Given a calendar date and fiscal year start month, compute the fiscal year number
 * and fiscal period (quarter or half).
 */
function getFiscalYear(date: Date, startMonth: number): number {
  // The fiscal year label uses the year in which the fiscal year STARTS.
  // If fiscal year starts in April: Apr 2026 - Mar 2027 = FY2026.
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= startMonth) {
    return date.getFullYear();
  } else {
    return date.getFullYear() - 1;
  }
}

function getFiscalQuarter(date: Date, startMonth: number): number {
  const month = date.getMonth() + 1; // 1-indexed
  const monthsFromStart = ((month - startMonth) + 12) % 12;
  return Math.floor(monthsFromStart / 3) + 1;
}

function getFiscalHalf(date: Date, startMonth: number): number {
  const month = date.getMonth() + 1;
  const monthsFromStart = ((month - startMonth) + 12) % 12;
  return monthsFromStart < 6 ? 1 : 2;
}
```

**Label formatting by time scale:**

| Scale | Calendar label (startMonth=1) | Fiscal label (startMonth!=1) |
|-------|-------------------------------|------------------------------|
| Quarters (minor) | `Q1`, `Q2`, `Q3`, `Q4` | `FY26 Q1`, `FY26 Q2`, ... |
| Quarters (major) | `2026` | `FY2026` |
| Halves (minor) | `H1`, `H2` | `FY26 H1`, `FY26 H2` |
| Halves (major) | `2026` | `FY2026` |
| Years (minor) | `2026` | `FY2026` |
| Years (major) | `2026` | `FY2026` |
| Months (minor) | `Jan`, `Feb`, ... | `Jan`, `Feb`, ... (unchanged) |
| Months (major) | `Jan 2026` | `Jan 2026` (unchanged) |
| Weeks (minor) | `W1`, `W2`, ... | `W1`, `W2`, ... (unchanged) |
| Weeks (major) | `Jan 2026` | `Jan 2026` (unchanged) |

**Implementation changes in `getMinorTicks`:**

For the `quarters` case, the current code uses `d.getMonth() % 3 === 0` to find quarter starts and `Math.floor(date.getMonth() / 3) + 1` for the label. With fiscal year support:

```typescript
case 'quarters': {
  const months = timeMonth.range(timeMonth.floor(start), end);
  const quarterStarts = months.filter((d) => d.getMonth() % 3 === 0);
  quarterStarts.forEach((date, i) => {
    const nextDate = quarterStarts[i + 1] || end;
    const isFiscal = fiscalYearStartMonth && fiscalYearStartMonth !== 1;
    let label: string;
    if (isFiscal) {
      const fy = getFiscalYear(date, fiscalYearStartMonth!);
      const fq = getFiscalQuarter(date, fiscalYearStartMonth!);
      label = `FY${String(fy).slice(2)} Q${fq}`;
    } else {
      label = `Q${Math.floor(date.getMonth() / 3) + 1}`;
    }
    ticks.push({ date, label, x: xScale(date), width: xScale(nextDate) - xScale(date) });
  });
  break;
}
```

Similar adjustments for `halves` and `years` cases. The `weeks` and `months` cases remain unchanged.

The `formatMajorLabel` function is similarly updated: when fiscal year is active and the scale is quarters/halves/years, the major label becomes `FY2026` instead of `2026`.

### 5.5 Account Context Propagation

The fiscal year setting needs to reach the `TimeAxis` component. The value is loaded once at app initialization and cached. The propagation path:

1. **React Query:** `useQuery(['account'], api.getAccount)` fetches the account at app init.
2. **Account context:** A React context (`AccountContext`) provides the account data to the component tree. The context is already conceptually needed for the account name in the nav bar. If no account context exists yet, create a lightweight one.
3. **TimeAxis reads from context:** `const { fiscalYearEnd } = useAccountContext();` and converts to `startMonth` before passing to `getMajorTicks` / `getMinorTicks`.

This keeps the fiscal year value out of every component's props chain. The `TimeAxis` component is the only consumer in Sprint C.

**WebSocket update flow:** When an admin changes the fiscal year setting, the server broadcasts `account-updated` to all sockets in the account. The client's WebSocket handler invalidates the `['account']` query, causing React Query to refetch. The `TimeAxis` re-renders with the new labels.

---

## 6. Shared Types

Add to `shared/src/types.ts`:

```typescript
// --- RT-28: Comments & Activity ---

export interface Comment {
  id: string;
  itemId: string;
  userId: string;
  body: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface CommentActivityEntry {
  type: 'comment';
  id: string;
  itemId: string;
  userId: string;
  body: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export interface SystemActivityEntry {
  type: 'system';
  id: string;
  itemId: string;
  userId: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export type ActivityEntry = CommentActivityEntry | SystemActivityEntry;

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'owner' | 'editor' | 'viewer';
}

// --- RT-29: CSV Import ---

export interface ImportResult {
  created: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}
```

Update the existing `ItemActivity` interface to expand the action union:

```typescript
export interface ItemActivity {
  id: string;
  itemId: string;
  userId: string | null;
  action: 'created' | 'updated' | 'field_changed' | 'deleted'
    | 'commented' | 'comment_edited' | 'comment_deleted'
    | 'linked' | 'unlinked'
    | 'sub_item_added' | 'sub_item_removed'
    | 'key_date_added' | 'key_date_removed';
  details: Record<string, unknown> | null;
  createdAt: string;
  user?: User;
}
```

Update the `Account` interface (already exists, just verify `fiscalYearEnd` is present -- it is):

```typescript
export interface Account {
  id: string;
  clerkOrgId: string;
  name: string;
  stripeCustomerId: string | null;
  fiscalYearEnd: number;     // already present
  createdAt: string;
  updatedAt: string;
}
```

Add validation schemas to `shared/src/validation.ts`:

```typescript
// --- Comments (RT-28) ---

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string().uuid()).max(20).default([]),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string().uuid()).max(20).default([]),
});

// --- CSV Import (RT-29) ---

export const importItemFieldValueSchema = z.object({
  fieldId: z.string().uuid(),
  fieldValueId: z.string().uuid().nullable().optional(),
  textValue: z.string().nullable().optional(),
  numericValue: z.number().nullable().optional(),
  dateValue: z.string().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
});

export const importItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  fieldValues: z.array(importItemFieldValueSchema).optional(),
});

export const batchImportSchema = z.object({
  items: z.array(importItemSchema).min(1).max(1000),
});

// --- Account (RT-31) ---

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  fiscalYearEnd: z.number().int().min(1).max(12).optional(),
});
```

---

## 7. WebSocket Events

### 7.1 Comment Events (RT-28)

Four new event types, following the established pattern (REST mutates, then server broadcasts to roadmap room, excluding the sender via `x-socket-id`).

```typescript
// Server -> Client (broadcast to roadmap room)
socket.emit('comment-created', {
  comment: Comment  // includes user info
});

socket.emit('comment-updated', {
  comment: Comment  // updated body, mentions, updatedAt
});

socket.emit('comment-deleted', {
  commentId: string,
  itemId: string    // so the client knows which item's Activity tab to update
});

socket.emit('activity-created', {
  itemId: string,
  activity: SystemActivityEntry  // for real-time system events
});
```

**Client cache update pattern (in `useSocket` hook):**

```typescript
// Comment events invalidate the activity feed query for the affected item
socket.on('comment-created', ({ comment }) => {
  // Invalidate the activity feed query -- the Activity tab will refetch
  queryClient.invalidateQueries({ queryKey: ['activity', comment.itemId] });
});

socket.on('comment-updated', ({ comment }) => {
  queryClient.invalidateQueries({ queryKey: ['activity', comment.itemId] });
});

socket.on('comment-deleted', ({ commentId, itemId }) => {
  queryClient.invalidateQueries({ queryKey: ['activity', itemId] });
});

socket.on('activity-created', ({ itemId }) => {
  queryClient.invalidateQueries({ queryKey: ['activity', itemId] });
});
```

**Why invalidate instead of cache-set:** The activity feed is a paginated, interleaved UNION of two tables. Manually inserting a new entry at the correct position in the paginated cache is error-prone (what if the user is on page 2?). A simple invalidation triggers a refetch of the current page, which is fast (one query, 50 rows) and always correct.

### 7.2 Account Settings Broadcast (RT-31)

The fiscal year change needs to reach all connected users in the account, not just users viewing a specific roadmap. This requires an account-level room.

**New room:** `account:{accountId}`

When a socket connects and authenticates, it should also join the `account:{accountId}` room. This is a small extension to the WebSocket handler.

In `server/src/ws/handler.ts`, add to the connection handler:

```typescript
socket.on('join-roadmap', ({ roadmapId, viewId }) => {
  socket.join(`roadmap:${roadmapId}`);
  // Also join account room if we have the org context
  if (socket.data.accountId) {
    socket.join(`account:${socket.data.accountId}`);
  }
  // ... existing presence logic
});
```

To populate `socket.data.accountId`, the WS auth middleware needs to resolve the account ID. In dev bypass mode, this is the dev account ID. In production, it comes from the Clerk org ID -> accounts table lookup. This is a small addition to the existing WS auth middleware (resolve the account the same way `resolveAuth` does for HTTP).

**Broadcast on fiscal year change:**

```typescript
// In account route handler, after successful PATCH:
const io = getIO();
io.to(`account:${req.accountId}`).except(req.headers['x-socket-id'] as string ?? '').emit('account-updated', {
  fiscalYearEnd: updatedAccount.fiscalYearEnd,
});
```

**Client handler:**

```typescript
socket.on('account-updated', ({ fiscalYearEnd }) => {
  queryClient.setQueryData(['account'], (old: Account | undefined) =>
    old ? { ...old, fiscalYearEnd } : old
  );
});
```

### 7.3 Import Broadcast (RT-29)

After a batch import, broadcast a lightweight event so other connected users refetch items:

```typescript
socket.emit('items-imported', {
  roadmapId: string,
  count: number,
});
```

Client handler:

```typescript
socket.on('items-imported', ({ roadmapId, count }) => {
  // Full refetch of items -- don't try to merge 100+ items into cache
  queryClient.invalidateQueries({ queryKey: ['items', roadmapId] });
});
```

---

## 8. Build Order for Backend

Jonah should implement in this order. Items 1-4 are on the critical path for Alice.

1. **Schema migration** -- Add comments table to Drizzle schema, run `db:generate` and `db:migrate`. Quick.

2. **Account endpoint** (RT-31) -- New `account.ts` route + `accountService.ts`. GET returns account with `fiscalYearEnd`. PATCH accepts `fiscalYearEnd` with `requireAdmin`. This is self-contained and small -- start here to get a quick win.

3. **Collaborators endpoint** -- `GET /api/v1/roadmaps/:roadmapId/collaborators`. Query `roadmap_shares` + owner. Used by the @mention picker on the frontend.

4. **Comment CRUD + activity feed** (RT-28) -- `commentService.ts` and `comments.ts` route. The activity feed UNION query is the most complex piece. Create, edit, delete follow standard patterns.

5. **Batch import endpoint** (RT-29) -- Add `POST /items/import` to the existing items router. Transaction with savepoints for partial success.

6. **WebSocket events** -- Add comment events, account-updated broadcast, items-imported event. Extend WS handler to join account room.

7. **Expanded activity logging** -- Add new action types (`linked`, `unlinked`, `sub_item_added`, `sub_item_removed`, `key_date_added`, `key_date_removed`) to the existing link, sub-item, and key-date service functions. This is a small addition to Sprint B code that enriches the Activity tab.

Items 1-3 can likely be done in the first sitting. Items 4-5 are the bulk of the work. Items 6-7 are wiring.

---

## 9. Build Guidance for Frontend

### 9.1 RT-28: Activity Tab

**New components:**

- `client/src/components/item-card/ActivityTab.tsx` -- Container for the Activity tab. Fetches the activity feed, renders the comment input and the interleaved feed.
- `client/src/components/item-card/CommentInput.tsx` -- Textarea with @mention trigger, character count, submit button.
- `client/src/components/item-card/MentionPicker.tsx` -- Popover listing collaborators, filtered by typed text after `@`. Uses the collaborators endpoint.
- `client/src/components/item-card/CommentEntry.tsx` -- Single comment rendering: avatar, name, time, body with highlighted mentions, overflow menu.
- `client/src/components/item-card/SystemActivityEntry.tsx` -- Single system event rendering: icon, description, time.

**@mention detection in the textarea:**

The `@` trigger opens the mention picker when:
1. The character before the cursor is `@` (or the `@` is at position 0).
2. The character before the `@` is a space, newline, or start of input.

When the user selects a collaborator from the picker, insert `@Name` into the text and add the user ID to a local `mentions` array. The `mentions` array is sent with the comment body.

**Rendering @mentions in display:** When rendering a comment's body, scan for user IDs in the `mentions` array. For each mention, find the corresponding text in the body (the `@Name` pattern) and wrap it in a `<span>` with the highlight styling (`--primary-100` background, `--primary-700` text).

A simpler approach: the backend provides the `mentions` array of user IDs. The frontend fetches the collaborators list (already cached for the mention picker). For each mention user ID, the frontend finds the user's name and does a string replacement of `@Name` in the body text. This is straightforward and avoids needing to store mention positions.

### 9.2 RT-29: Import Modal

**New components:**

- `client/src/components/import/ImportModal.tsx` -- Multi-step modal (wizard). Manages step state (upload, map, preview, confirm).
- `client/src/components/import/FileUploadStep.tsx` -- Drag-and-drop zone + file picker. Parses CSV with PapaParse on selection. Validates file size (5MB) and parseability.
- `client/src/components/import/ColumnMappingStep.tsx` -- Table of CSV columns with dropdowns for field mapping. Auto-maps on mount. Enforces "Name is required" constraint.
- `client/src/components/import/PreviewStep.tsx` -- Table of first 10 rows with resolved values. Warning highlights for unparseable cells.
- `client/src/components/import/ImportConfirmStep.tsx` -- Summary + "Import N Items" button. Shows progress during import.

**New utility modules:**

- `client/src/lib/csvMapping.ts` -- Auto-map algorithm, field value resolution, date parsing.
- `client/src/lib/csvExport.ts` -- Export function (PapaParse unparse + blob download).

### 9.3 RT-31: Fiscal Year in TimeAxis

- Modify `client/src/lib/timeScale.ts` -- Add `fiscalYearStartMonth` parameter to `getMajorTicks`, `getMinorTicks`, and `formatMajorLabel`. Add helper functions `getFiscalYear`, `getFiscalQuarter`, `getFiscalHalf`.
- Modify `client/src/components/timeline/TimeAxis.tsx` -- Read `fiscalYearEnd` from account context, convert to start month, pass to tick functions.
- New: Account settings section with fiscal year dropdown (if the Account Settings page exists, extend it; if not, create a lightweight settings panel).

---

## 10. File Classification (Change Impact)

### Backend Files

| File | Classification | Notes |
|------|---------------|-------|
| `server/src/db/schema.ts` | **Extend** | Add `comments` table definition. Existing tables untouched. |
| `server/src/db/migrations/0002_sprint_c_comments.sql` | **New** | Generated by Drizzle from schema changes. |
| `server/src/services/commentService.ts` | **New** | Comment CRUD, activity feed UNION query, collaborators query. |
| `server/src/services/accountService.ts` | **New** | Account GET/PATCH. Minimal -- two functions. |
| `server/src/routes/comments.ts` | **New** | Express routers for comment endpoints, activity feed, and collaborators. |
| `server/src/routes/account.ts` | **New** | Express router for account GET/PATCH. |
| `server/src/routes/items.ts` | **Extend** | Add `POST /import` handler. Existing routes unchanged. |
| `server/src/ws/handler.ts` | **Modify** | Add account room join, populate `socket.data.accountId` in auth middleware. Existing room/event handling unchanged. |
| `server/src/index.ts` | **Extend** | Mount comment, collaborators, and account routers. Four lines added. |
| `server/src/services/itemLinkService.ts` | **Extend** | Add activity log inserts for `linked`/`unlinked` actions. Existing logic unchanged. |
| `server/src/services/keyDateService.ts` | **Extend** | Add activity log inserts for `key_date_added`/`key_date_removed` actions. Existing logic unchanged. (If sub-item activity is not already logged, also extend itemService.) |
| `shared/src/types.ts` | **Extend** | Add Comment, ActivityEntry, Collaborator, ImportResult types. Update ItemActivity action union. |
| `shared/src/validation.ts` | **Extend** | Add comment schemas, batch import schema, account update schema. |

### Frontend Files

| File | Classification | Notes |
|------|---------------|-------|
| `client/src/components/item-card/ActivityTab.tsx` | **New** | Activity feed container: comment input, paginated feed, load more. |
| `client/src/components/item-card/CommentInput.tsx` | **New** | Textarea with @mention trigger and character counter. |
| `client/src/components/item-card/MentionPicker.tsx` | **New** | Collaborator list popover for @mentions. |
| `client/src/components/item-card/CommentEntry.tsx` | **New** | Single comment display with edit/delete menu. |
| `client/src/components/item-card/SystemActivityEntry.tsx` | **New** | Single system event display. |
| `client/src/components/import/ImportModal.tsx` | **New** | Multi-step wizard container. |
| `client/src/components/import/FileUploadStep.tsx` | **New** | Drag-and-drop file upload zone. |
| `client/src/components/import/ColumnMappingStep.tsx` | **New** | CSV-to-field mapping table with dropdowns. |
| `client/src/components/import/PreviewStep.tsx` | **New** | Preview table with warning highlights. |
| `client/src/components/import/ImportConfirmStep.tsx` | **New** | Summary and progress bar. |
| `client/src/lib/csvMapping.ts` | **New** | Auto-map algorithm, date parser, field value resolver. |
| `client/src/lib/csvExport.ts` | **New** | PapaParse unparse + blob download. |
| `client/src/lib/timeScale.ts` | **Modify** | Add `fiscalYearStartMonth` parameter to `getMajorTicks`, `getMinorTicks`, `formatMajorLabel`. Add fiscal year helper functions. Existing tick position logic unchanged. |
| `client/src/components/timeline/TimeAxis.tsx` | **Modify** | Read fiscal year from account context. Pass to tick functions. Existing rendering structure unchanged. |
| `client/src/hooks/useSocket.ts` | **Extend** | Add handlers for `comment-created`, `comment-updated`, `comment-deleted`, `activity-created`, `account-updated`, `items-imported`. |
| `client/src/lib/api.ts` | **Extend** | Add `createComment`, `updateComment`, `deleteComment`, `getActivity`, `getCollaborators`, `importItems`, `getAccount`, `updateAccount` functions. |

### QA Impact Notes

**`client/src/lib/timeScale.ts` [Modify]** -- Changes label generation for quarters, halves, and years time scales. Regression test: verify all five time scales still render correct labels when `fiscalYearStartMonth` is 1 (default/calendar). Verify tick positions (x-coordinates) are unchanged -- only labels should differ.

**`client/src/components/timeline/TimeAxis.tsx` [Modify]** -- Reads a new context value and passes it to tick functions. Regression test: verify the TimeAxis renders correctly when no account context is available (should fall back to calendar labels). Verify all time scales display correctly with both calendar and fiscal year settings.

**`server/src/ws/handler.ts` [Modify]** -- Adds account room join and `accountId` resolution in WS auth. Regression test: verify existing presence, cursor, and lock events still work. Verify room membership does not break when joining multiple roadmap rooms within the same account.

**`server/src/routes/items.ts` [Extend]** -- Adds one new POST handler at `/import`. Existing routes unchanged. Low regression risk -- verify existing item CRUD endpoints still function.

---

## 11. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Activity feed UNION query is slow for items with many activities | Low | Low | Both tables are indexed on `item_id`. The UNION with LIMIT 50 should be fast up to thousands of entries. If needed, add a composite index on `(item_id, created_at DESC)` to `item_activities` (comments already has it). |
| PapaParse edge cases (BOM markers, Windows line endings, quoted fields with commas) | Medium | Low | PapaParse handles all of these out of the box. It is one of the most battle-tested CSV parsers available. Test with a few real-world CSV exports from Google Sheets, Excel, and Jira. |
| Date format ambiguity in CSV import (01/02/2026 could be Jan 2 or Feb 1) | Medium | Medium | Use column-level format detection (sample multiple values per column to determine the format), not per-cell detection. Document the 4 supported formats. If a column has mixed formats, treat unparseable values as null. |
| Fiscal year label changes break Timeline visual tests | Low | Low | The fiscal year setting defaults to January (calendar year), which produces the same labels as before. Only when the setting is changed to a non-January month do FY labels appear. Existing tests with default settings should pass unchanged. |
| Batch import with 1000 items is slow | Low | Medium | The transaction with individual inserts will be slower than a single bulk INSERT. If performance is a concern, batch the INSERTs in groups of 50 rows using Drizzle's multi-row insert. Test with 1000 items to verify acceptable latency (should be under 5 seconds). |
| @mention picker UX edge cases (user types @, deletes it, types again) | Low | Low | Track the mention trigger state carefully. When the `@` is deleted, close the picker. When a user is selected, insert the name and advance the cursor past it. Standard textarea mention libraries handle this, but since we are building from scratch, unit test the trigger logic. |
| Account room WebSocket requires accountId in WS auth | Low | Low | The WS auth middleware already resolves the user. Adding account resolution follows the same pattern. In dev bypass mode, use the hardcoded dev account ID. |

---

## 12. Decisions Summary

| Decision | Rationale | Alternatives rejected |
|----------|-----------|----------------------|
| UNION ALL query for activity feed | Single paginated query gives correct interleaving. Simpler than client-side merge. | Two separate queries + client merge (rejected: pagination is incorrect without server-side merge) |
| JSONB array for mentions, not junction table | Max 20 mentions/comment, no need to query "comments mentioning user X" in v1. Simpler schema. | `comment_mentions` junction table (rejected: over-engineering for v1 where mentions are display-only) |
| PapaParse for CSV parsing | 30M+ weekly downloads, 6KB gzipped, handles edge cases. Industry standard. | Built-in CSV parsing (rejected: edge cases with quoted fields, BOM markers), SheetJS (rejected: overkill for CSV-only) |
| Client-side export, no server endpoint | Items are already loaded in memory. Generating CSV from JS is trivial. No reason to round-trip to server. | Server-side export endpoint (rejected: unnecessary network hop, server has no data the client doesn't) |
| Column-level date format detection | Avoids per-cell ambiguity (01/02 problem). Sample multiple values to pick the best format. | Per-cell detection (rejected: ambiguous), require user to specify format (rejected: poor UX) |
| Fiscal year as label-only change | Keeps date storage, date pickers, and all other date logic unchanged. Minimal surface area. | Fiscal year affecting date storage (rejected: massive complexity for no user benefit) |
| Account room for WS broadcasts | Fiscal year affects all roadmaps in an account. Broadcasting to per-roadmap rooms would miss users viewing the account settings page. | Broadcast to all roadmap rooms (rejected: fragile, misses users not currently in a roadmap) |
| Invalidate queries on WS events for comments | Paginated UNION cache is hard to update incrementally. Invalidation is fast (50-row refetch) and always correct. | Cache-set for individual comment events (rejected: error-prone with pagination, not worth the complexity) |
| Savepoints for partial batch import | Allows "X of Y imported" result without all-or-nothing behavior. Matches user expectations from other tools. | All-or-nothing transaction (rejected: one bad row kills 999 good ones) |

---

*Tech approach addendum written by Andrei (Technical Architect). Jonah: read sections 2-4, 5.1-5.3, 7, and 8 for the backend build plan. Alice: read sections 4.3-4.4, 5.4-5.5, 9, and the shared types in section 6 for the frontend implementation guide. Robert: read sections 9.1-9.3 for UI component structure. Enzo: read section 10 for QA impact notes and section 11 for risk areas to test.*
