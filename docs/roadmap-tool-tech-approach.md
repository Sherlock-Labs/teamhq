# Roadmap Tool -- Technical Architecture

**Author:** Andrei (Technical Architect)
**Date:** February 10, 2026
**Status:** Complete
**Project ID:** `roadmap-tool`
**Inputs:** `docs/roadmap-tool-requirements.md` (Thomas), `docs/roadmap-tool-product-research.md` (Suki), `docs/roadmap-tool-tech-research.md` (Marco), `skills/development/saas-stack.md`

---

## 1. Architectural Summary

The Roadmap Tool is a full-featured SaaS product for roadmap visualization and planning. It ships as a separate repo (`roadmap-tool`) per team convention, with planning docs in TeamHQ.

**Core architecture:**
- **Frontend:** React 19 + TypeScript + Vite (SPA with client-side routing)
- **Backend:** Express + TypeScript on Railway
- **Database:** PostgreSQL on Railway
- **Auth:** Clerk (Organizations for multi-tenancy)
- **Real-time:** Socket.IO (presence, live updates, edit locking)
- **File storage:** Cloudflare R2 (presigned uploads)
- **Payments:** Stripe (subscriptions, deferred to post-v1 core build)
- **Analytics:** PostHog
- **Email:** Loops

**Repo structure:** npm workspaces monorepo with `client/` and `server/` packages, per ADR-006.

---

## 2. Repository Structure

```
roadmap-tool/
├── package.json                # root workspace config
├── tsconfig.base.json          # shared TS config
├── .env.example
├── .gitignore
├── README.md
│
├── client/                     # Vite + React SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # Router, Clerk provider, global layout
│       ├── routes/             # Page-level route components
│       │   ├── HomePage.tsx
│       │   ├── RoadmapPage.tsx
│       │   └── SharedViewPage.tsx
│       ├── components/
│       │   ├── layout/         # AppShell, Sidebar, TopBar, Breadcrumbs
│       │   ├── roadmap/        # RoadmapCard, RoadmapList
│       │   ├── table/          # TableView, TableRow, InlineEditor
│       │   ├── timeline/       # TimelineView, TimeAxis, SwimLane, ItemBar, Milestone, TodayMarker, TimeSlider
│       │   ├── swimlane/       # SwimlaneView, SwimlaneCard, SwimlaneGrid
│       │   ├── item-card/      # ItemCard, OverviewTab, FieldsTab, ActivityTab
│       │   ├── fields/         # FieldManager, FieldEditor, FieldValuePicker
│       │   ├── format-panel/   # FormatPanel, ColorPalettePicker, HeaderConfig, TimeScaleSelector
│       │   ├── views/          # ViewSwitcher, ViewConfig, FilterBuilder
│       │   ├── sharing/        # ShareDialog, MemberList, ShareLinkGenerator
│       │   ├── export/         # ExportDialog, PngExporter
│       │   └── collab/         # PresenceAvatars, CursorOverlay, EditLockIndicator
│       ├── hooks/              # Custom React hooks
│       │   ├── useRoadmap.ts
│       │   ├── useItems.ts
│       │   ├── useViews.ts
│       │   ├── useFields.ts
│       │   ├── useSocket.ts
│       │   ├── usePresence.ts
│       │   └── useEditLock.ts
│       ├── stores/             # Zustand stores
│       │   ├── roadmapStore.ts
│       │   ├── viewStore.ts
│       │   └── collabStore.ts
│       ├── lib/                # Utilities
│       │   ├── api.ts          # Fetch wrapper with Clerk token
│       │   ├── timeScale.ts    # d3-scale wrappers for date-to-pixel math
│       │   ├── filters.ts      # Client-side filter engine
│       │   ├── colors.ts       # Palette definitions, color assignment logic
│       │   └── export.ts       # PNG export logic
│       └── types/              # Shared TypeScript types
│           └── index.ts
│
├── server/                     # Express API + WebSocket
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Express app + Socket.IO setup
│       ├── middleware/
│       │   ├── auth.ts         # Clerk middleware (verifyToken, requireAuth, requireRole)
│       │   └── rateLimit.ts
│       ├── routes/
│       │   ├── roadmaps.ts     # CRUD + list + search
│       │   ├── items.ts        # CRUD + bulk operations
│       │   ├── fields.ts       # CRUD + promote + archive
│       │   ├── milestones.ts   # CRUD
│       │   ├── views.ts        # CRUD + config updates
│       │   ├── sharing.ts      # Member management + shared links
│       │   ├── uploads.ts      # Presigned URL generation for R2
│       │   ├── export.ts       # Server-side PNG generation
│       │   └── webhooks.ts     # Clerk + Stripe webhooks
│       ├── ws/
│       │   ├── handler.ts      # Socket.IO event handlers
│       │   ├── presence.ts     # Presence tracking (in-memory)
│       │   └── editLock.ts     # Edit lock management (in-memory with TTL)
│       ├── db/
│       │   ├── client.ts       # PostgreSQL connection (pg + Drizzle ORM)
│       │   ├── schema.ts       # Drizzle schema definitions
│       │   └── migrations/     # Drizzle migration files
│       ├── services/           # Business logic layer
│       │   ├── roadmapService.ts
│       │   ├── itemService.ts
│       │   ├── fieldService.ts
│       │   ├── viewService.ts
│       │   ├── sharingService.ts
│       │   └── activityService.ts
│       └── lib/
│           ├── r2.ts           # Cloudflare R2 client
│           └── permissions.ts  # Role-based access helpers
│
└── shared/                     # Shared types + validation (workspace package)
    ├── package.json
    └── src/
        ├── types.ts            # Entity types shared between client and server
        └── validation.ts       # Zod schemas for API request/response validation
```

**Key decisions:**

1. **Three workspace packages** (`client/`, `server/`, `shared/`). The `shared/` package holds TypeScript types and Zod validation schemas used by both frontend and backend. This eliminates type drift between client and server.

2. **Drizzle ORM** over Prisma. Drizzle is TypeScript-native, generates SQL that reads like SQL (easier to debug), has better migration control, and is lighter weight. Prisma's engine binary and query abstraction are unnecessary overhead.

3. **Flat component structure.** Components grouped by feature domain (`timeline/`, `table/`, `swimlane/`) rather than by type (`atoms/`, `molecules/`). Each domain folder contains all the components for that feature, making it easy to find everything related to the Timeline in one place.

---

## 3. Database Schema

PostgreSQL on Railway. All tables scoped by `org_id` (Clerk Organization ID) for multi-tenant data isolation.

### 3.1 Core Tables

```sql
-- Clerk org mapping (synced via webhook)
CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id  TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  stripe_customer_id TEXT,
  fiscal_year_end INTEGER DEFAULT 12,  -- month number (1-12)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Clerk user mapping (synced via webhook)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roadmaps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roadmaps_account ON roadmaps(account_id);
```

### 3.2 Items

```sql
CREATE TABLE items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id    UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,            -- Rich text (HTML), max 10K chars
  start_date    DATE,
  end_date      DATE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_roadmap ON items(roadmap_id);

-- Activity log for items
CREATE TABLE item_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  action        TEXT NOT NULL,        -- 'created', 'updated', 'field_changed', 'deleted'
  details       JSONB,                -- { field: 'status', oldValue: 'planned', newValue: 'in-progress' }
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_item_activities_item ON item_activities(item_id);

-- File attachments
CREATE TABLE attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  r2_key        TEXT NOT NULL,
  filename      TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  mime_type     TEXT NOT NULL,
  uploaded_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Fields System

```sql
CREATE TABLE fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  roadmap_id    UUID REFERENCES roadmaps(id) ON DELETE CASCADE, -- NULL = account-level
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('list', 'multi_select', 'numeric', 'text', 'date', 'team_member')),
  numeric_format TEXT CHECK (numeric_format IN ('number', 'currency', 'percentage')),
  is_archived   BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fields_account ON fields(account_id);
CREATE INDEX idx_fields_roadmap ON fields(roadmap_id);

-- Values for list and multi_select fields
CREATE TABLE field_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id      UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT,             -- hex color, e.g. '#4A90D9'
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_field_values_field ON field_values(field_id);

-- Junction: item <-> field value assignments
CREATE TABLE item_field_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  field_id      UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  -- Exactly one of these is populated depending on field type:
  field_value_id UUID REFERENCES field_values(id) ON DELETE SET NULL, -- for list/multi_select
  text_value    TEXT,                                                  -- for text
  numeric_value NUMERIC,                                               -- for numeric
  date_value    DATE,                                                  -- for date
  user_id       UUID REFERENCES users(id),                             -- for team_member
  UNIQUE(item_id, field_id, field_value_id)  -- prevent duplicate list assignments
);

CREATE INDEX idx_item_field_values_item ON item_field_values(item_id);
CREATE INDEX idx_item_field_values_field ON item_field_values(field_id);
```

**Design note on field values:** A single junction table with nullable typed columns is simpler than separate tables per type. The `field_value_id` column handles list and multi_select (one row per selected value for multi_select). For single-value types (text, numeric, date, team_member), there is one row per item-field pair. The UNIQUE constraint prevents duplicate list/multi_select assignments but allows multiple rows for multi_select (different `field_value_id` values).

### 3.4 Milestones

```sql
CREATE TABLE milestone_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  roadmap_id    UUID REFERENCES roadmaps(id) ON DELETE CASCADE, -- NULL = account-level
  name          TEXT NOT NULL,
  shape         TEXT NOT NULL DEFAULT 'diamond' CHECK (shape IN ('diamond', 'circle', 'triangle', 'square')),
  color         TEXT NOT NULL DEFAULT '#6366F1',
  is_default    BOOLEAN DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id    UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  date          DATE NOT NULL,
  type_id       UUID NOT NULL REFERENCES milestone_types(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_roadmap ON milestones(roadmap_id);
```

### 3.5 Views System

```sql
CREATE TABLE views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id    UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('timeline', 'swimlane', 'table')),
  is_default    BOOLEAN DEFAULT FALSE,
  config        JSONB NOT NULL DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_views_roadmap ON views(roadmap_id);
```

**View config JSONB structure** (varies by type):

```typescript
// Timeline view config
interface TimelineViewConfig {
  headerFieldId: string;          // field used for primary grouping
  subHeaderFieldId?: string;      // field used for secondary grouping
  colorByFieldId?: string;        // list field for color coding
  paletteId: string;              // 'citrus' | 'groovy' | ... | custom UUID
  timeScale: 'weeks' | 'months' | 'quarters' | 'halves' | 'years';
  dateRange: { start: string; end: string }; // ISO date strings
  themeOrientation: 'above' | 'inside';      // item name position
  headerOrientation: 'horizontal' | 'vertical';
  hideEmptyHeaders: boolean;
  layout: 'compact' | 'spacious';
  labelSuffixFieldId?: string;
  showMilestoneLabels: boolean;
  showMilestoneDates: boolean;
  filters: FilterCondition[];
}

// Swimlane view config
interface SwimlaneViewConfig {
  columnFieldId: string;          // field for column axis
  rowFieldId: string;             // field for row axis
  groupRowsByFieldId?: string;    // additional grouping
  colorByFieldId?: string;
  paletteId: string;
  cardMode: 'standard' | 'compact';
  filters: FilterCondition[];
}

// Table view config
interface TableViewConfig {
  visibleFieldIds: string[];      // ordered list of visible columns
  sortBy?: { fieldId: string; direction: 'asc' | 'desc' };
  filters: FilterCondition[];
}

// Shared filter type
interface FilterCondition {
  fieldId: string;
  operator: 'eq' | 'neq' | 'contains' | 'in' | 'is_empty' | 'is_not_empty' | 'before' | 'after' | 'between';
  value: any;
}
```

**Rationale for JSONB config:** View configurations are complex, nested, and vary by type. A JSONB column avoids 20+ nullable columns or a separate config table with EAV pattern. It also makes it easy to add new config options without migrations. The config is always read/written as a whole -- we never need to query individual config properties.

### 3.6 Sharing & Permissions

```sql
-- Roadmap-level sharing (beyond the org-wide access)
CREATE TABLE roadmap_shares (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id    UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roadmap_id, user_id)
);

-- Public shared links
CREATE TABLE shared_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  view_id       UUID NOT NULL REFERENCES views(id) ON DELETE CASCADE,
  token         TEXT UNIQUE NOT NULL,    -- UUIDv4 for URL
  password_hash TEXT,                     -- bcrypt hash, NULL = no password
  revoked_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_links_token ON shared_links(token);

-- Favorites
CREATE TABLE roadmap_favorites (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_id    UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, roadmap_id)
);
```

### 3.7 Color Palettes

```sql
CREATE TABLE color_palettes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID REFERENCES accounts(id) ON DELETE CASCADE, -- NULL = system default
  name          TEXT NOT NULL,
  colors        JSONB NOT NULL,     -- ['#FF6B6B', '#4ECDC4', '#45B7D1', ...]
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

The 6 default palettes (Citrus, Groovy, Pastel, Autumn, Neon, Ocean) are seeded as system defaults (`account_id = NULL`). Custom palettes are scoped to the account.

### 3.8 Real-Time Entities (In-Memory, Not Persisted)

Presence and edit locks are managed in-memory on the Socket.IO server. They are ephemeral -- lost on server restart (which is acceptable since they auto-rebuild from client reconnections).

```typescript
// In-memory presence map
interface PresenceState {
  [roadmapId: string]: {
    [socketId: string]: {
      userId: string;
      userName: string;
      avatarUrl: string;
      viewId: string;
      cursorState?: { row: number; col: number }; // Table View only
      lastSeen: number;
    }
  }
}

// In-memory edit locks
interface EditLockState {
  [itemId: string]: {
    userId: string;
    userName: string;
    acquiredAt: number;
    expiresAt: number;  // acquiredAt + 5 minutes
  }
}
```

**Why in-memory, not Redis:** At v1 scale (single Railway instance), in-memory is simpler and faster. No additional infrastructure. If we scale to multiple server instances, we add Redis then. This is a deliberate "scale when needed" decision per my principles.

---

## 4. API Design

### 4.1 REST API

REST over tRPC or GraphQL. Rationale:

- **REST is boring and proven.** Express + REST is the pattern our team has shipped with repeatedly. No new paradigm to learn.
- **tRPC** is excellent for end-to-end type safety, but it couples the client to the server. We need the API to also serve the public shared link renderer, and potentially a v2 GraphQL API. REST keeps the API framework-agnostic.
- **GraphQL** is overkill for v1. The data fetching patterns here are straightforward (load a roadmap, load its items, load its views). We don't have the deep-nested query patterns that make GraphQL worthwhile. Deferred to v2.

### 4.2 API Routes

All routes prefixed with `/api/v1/`. Authentication via Clerk JWT in `Authorization: Bearer <token>` header. Org scoping enforced in middleware.

**Roadmaps**
```
GET    /api/v1/roadmaps                    # List roadmaps (my + shared + recent)
POST   /api/v1/roadmaps                    # Create roadmap
GET    /api/v1/roadmaps/:id                # Get roadmap (with views list)
PATCH  /api/v1/roadmaps/:id                # Update roadmap (rename)
DELETE /api/v1/roadmaps/:id                # Delete roadmap (owner only)
POST   /api/v1/roadmaps/:id/favorite       # Toggle favorite
GET    /api/v1/roadmaps/search?q=          # Global search across roadmaps + items
```

**Items**
```
GET    /api/v1/roadmaps/:roadmapId/items               # List all items (with field values)
POST   /api/v1/roadmaps/:roadmapId/items               # Create item
GET    /api/v1/roadmaps/:roadmapId/items/:id            # Get item (with field values, activity)
PATCH  /api/v1/roadmaps/:roadmapId/items/:id            # Update item
DELETE /api/v1/roadmaps/:roadmapId/items/:id            # Delete item
POST   /api/v1/roadmaps/:roadmapId/items/:id/duplicate  # Duplicate item
POST   /api/v1/roadmaps/:roadmapId/items/bulk-delete    # Bulk delete (max 100)
```

**Fields**
```
GET    /api/v1/roadmaps/:roadmapId/fields               # List fields (roadmap + account level)
POST   /api/v1/roadmaps/:roadmapId/fields               # Create field
PATCH  /api/v1/fields/:id                                # Update field
DELETE /api/v1/fields/:id                                # Delete field
POST   /api/v1/fields/:id/promote                        # Promote to account level
POST   /api/v1/fields/:id/archive                        # Archive field
POST   /api/v1/fields/:id/restore                        # Restore archived field

POST   /api/v1/fields/:id/values                         # Add field value
PATCH  /api/v1/field-values/:id                          # Update field value
DELETE /api/v1/field-values/:id                           # Delete field value
PATCH  /api/v1/fields/:id/values/reorder                 # Reorder field values

PUT    /api/v1/items/:itemId/fields/:fieldId             # Set field value on item
DELETE /api/v1/items/:itemId/fields/:fieldId             # Remove field value from item
```

**Views**
```
GET    /api/v1/roadmaps/:roadmapId/views                # List views
POST   /api/v1/roadmaps/:roadmapId/views                # Create view
PATCH  /api/v1/views/:id                                 # Update view (name, config)
DELETE /api/v1/views/:id                                 # Delete view
```

**Milestones**
```
GET    /api/v1/roadmaps/:roadmapId/milestones            # List milestones
POST   /api/v1/roadmaps/:roadmapId/milestones            # Create milestone
PATCH  /api/v1/milestones/:id                             # Update milestone
DELETE /api/v1/milestones/:id                             # Delete milestone

GET    /api/v1/milestone-types                            # List types (account + roadmap)
POST   /api/v1/milestone-types                            # Create type
PATCH  /api/v1/milestone-types/:id                        # Update type
DELETE /api/v1/milestone-types/:id                        # Delete type
```

**Sharing**
```
GET    /api/v1/roadmaps/:roadmapId/shares                # List shared users
POST   /api/v1/roadmaps/:roadmapId/shares                # Share with user
PATCH  /api/v1/roadmap-shares/:id                         # Update role
DELETE /api/v1/roadmap-shares/:id                         # Remove share

POST   /api/v1/views/:viewId/shared-link                 # Generate shared link
DELETE /api/v1/shared-links/:id                           # Revoke shared link
GET    /api/v1/shared/:token                              # Get shared view (public, no auth)
POST   /api/v1/shared/:token/verify-password              # Verify password for protected link
```

**File Uploads**
```
POST   /api/v1/items/:itemId/attachments/presign          # Get presigned upload URL
GET    /api/v1/items/:itemId/attachments                   # List attachments
DELETE /api/v1/attachments/:id                             # Delete attachment
GET    /api/v1/attachments/:id/url                         # Get presigned download URL
```

**Export**
```
POST   /api/v1/views/:viewId/export/png                   # Generate PNG export
```

**Webhooks**
```
POST   /api/v1/webhooks/clerk                              # Clerk webhook handler
POST   /api/v1/webhooks/stripe                             # Stripe webhook handler
```

### 4.3 Response Format

All responses follow a consistent envelope:

```typescript
// Success
{ data: T }

// Error
{ error: { code: string; message: string; details?: any } }

// Paginated (for lists)
{ data: T[]; meta: { total: number; page: number; perPage: number } }
```

### 4.4 Data Loading Strategy

The primary data load for a roadmap fetches everything needed to render any view:

```
GET /api/v1/roadmaps/:id  -->  { roadmap, views, fields, fieldValues }
GET /api/v1/roadmaps/:id/items  -->  { items (with all field values inlined) }
GET /api/v1/roadmaps/:id/milestones  -->  { milestones }
```

This is 3 requests on roadmap open. Items include their field values inlined (a JOIN, not N+1 queries). All filtering, sorting, and grouping happens client-side on this loaded data set. This avoids server round-trips on every filter change and keeps the UI snappy.

**Why load all items at once:** Thomas's requirements cap Timeline views at 350 items visible, and the typical roadmap has 50-200 items. Loading all items for a roadmap into client memory is fine at this scale. The benefit is instant client-side filtering, sorting, and view switching without API calls.

---

## 5. WebSocket Architecture (Real-Time Collaboration)

### 5.1 Technology: Socket.IO

**Socket.IO** over native WebSocket or Liveblocks/Supabase Realtime.

**Why Socket.IO:**
- **Rooms.** Socket.IO has built-in room management. Each roadmap is a room. Users join the room when they open a roadmap, leave when they navigate away. Broadcasting to a room is one line: `io.to(roadmapId).emit(...)`.
- **Auto-reconnection.** Socket.IO handles reconnection with exponential backoff out of the box. The requirements specify auto-reconnect (1s, 2s, 4s, max 30s) -- Socket.IO does this natively.
- **Fallback transport.** If WebSocket fails (corporate proxies, firewalls), Socket.IO falls back to HTTP long-polling transparently. This satisfies the "fall back to polling" requirement.
- **Namespace support.** We can use namespaces to separate roadmap collaboration from other real-time features (notifications, etc.) in the future.
- **Battle-tested.** Socket.IO is the most widely deployed WebSocket library in Node.js. Huge community, excellent docs.

**Why not Liveblocks/Supabase Realtime:**
- Third-party dependency with per-connection pricing. At v1 we control our own infrastructure.
- Our collaboration model is simpler than what Liveblocks is designed for (we don't need CRDTs or Yjs conflict resolution -- Thomas scoped this to last-write-wins field-level edits).

**Why not native WebSocket:**
- No built-in rooms, reconnection, or transport fallback. We'd be reimplementing what Socket.IO provides.

### 5.2 Connection Flow

```
1. User opens a roadmap
2. Client establishes Socket.IO connection with Clerk JWT
3. Server verifies JWT, extracts userId and orgId
4. Server joins the socket to room `roadmap:${roadmapId}`
5. Server broadcasts presence update to the room
6. Client receives current presence state (who else is here)
```

### 5.3 Event Protocol

**Client -> Server:**
```typescript
// Join/leave roadmap room
socket.emit('join-roadmap', { roadmapId, viewId })
socket.emit('leave-roadmap', { roadmapId })

// Presence updates
socket.emit('cursor-move', { roadmapId, viewId, row, col })  // Table View only
socket.emit('view-change', { roadmapId, viewId })

// Edit lock
socket.emit('acquire-lock', { itemId })
socket.emit('release-lock', { itemId })
socket.emit('heartbeat-lock', { itemId })  // Reset 5-min TTL on keystroke/click

// Data mutations (these go through REST API first, then broadcast via WS)
// The client calls the REST API, the server broadcasts the change via Socket.IO
```

**Server -> Client:**
```typescript
// Presence
socket.emit('presence-update', { users: PresenceUser[] })
socket.emit('user-joined', { user: PresenceUser })
socket.emit('user-left', { userId })

// Cursor (Table View)
socket.emit('cursor-update', { userId, viewId, row, col })

// Data changes (broadcast to room after REST API mutation succeeds)
socket.emit('item-created', { item })
socket.emit('item-updated', { itemId, changes })
socket.emit('item-deleted', { itemId })
socket.emit('field-value-changed', { itemId, fieldId, value })
socket.emit('view-config-changed', { viewId, config, changedBy })
socket.emit('milestone-created', { milestone })
socket.emit('milestone-updated', { milestoneId, changes })
socket.emit('milestone-deleted', { milestoneId })

// Edit lock
socket.emit('lock-acquired', { itemId, userId, userName })
socket.emit('lock-released', { itemId })
socket.emit('lock-expired', { itemId })  // Server TTL expired

// Activity
socket.emit('activity-added', { itemId, activity })
```

### 5.4 Broadcast Pattern

Data mutations flow through REST -> broadcast:

```
1. Client makes REST API call (e.g., PATCH /api/v1/items/:id)
2. Server updates database
3. Server broadcasts change to Socket.IO room (excluding the sender)
4. Sender gets the REST response; everyone else gets the WS event
5. All clients update their local state
```

This keeps the mutation path through REST (simple, authenticated, validated) while using WebSocket only for broadcasting. The sender uses the REST response for optimistic update confirmation; other users get real-time updates via WS.

### 5.5 Edit Lock Implementation

```typescript
// In-memory lock store (server/src/ws/editLock.ts)
const locks = new Map<string, EditLock>();

function acquireLock(itemId: string, userId: string, userName: string): boolean {
  const existing = locks.get(itemId);
  if (existing && existing.expiresAt > Date.now() && existing.userId !== userId) {
    return false; // Lock held by someone else
  }
  locks.set(itemId, {
    userId,
    userName,
    acquiredAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5-minute TTL
  });
  return true;
}

function heartbeatLock(itemId: string, userId: string): boolean {
  const lock = locks.get(itemId);
  if (lock && lock.userId === userId) {
    lock.expiresAt = Date.now() + 5 * 60 * 1000; // Reset TTL
    return true;
  }
  return false;
}

// TTL cleanup: run every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [itemId, lock] of locks) {
    if (lock.expiresAt <= now) {
      locks.delete(itemId);
      io.to(`roadmap:${lock.roadmapId}`).emit('lock-expired', { itemId });
    }
  }
}, 30_000);
```

### 5.6 Disconnection Handling

- Socket.IO's `disconnect` event fires when a user loses connection
- Server removes user from presence after the disconnect (10-second grace period handled by Socket.IO's `pingTimeout`)
- On reconnect, client re-joins the roadmap room and receives full presence state
- Client performs a full data refresh on reconnect to sync any changes that occurred during disconnect

---

## 6. SVG Timeline Component Architecture

This is the most technically complex piece of the product. Marco's recommendation (custom React + SVG) is correct.

### 6.1 Component Tree

```
TimelineView
├── TimelineToolbar
│   ├── TimeScaleSelector (weeks/months/quarters/halves/years)
│   ├── DateRangeControls
│   └── LayoutToggle (compact/spacious)
│
├── TimelineCanvas (SVG root, handles pan/zoom)
│   ├── TimeAxis
│   │   ├── MajorTicks (month labels, quarter labels, etc.)
│   │   └── MinorTicks (grid lines)
│   │
│   ├── TodayMarker (vertical line)
│   │
│   ├── HeaderGroup (one per primary field value)
│   │   ├── HeaderLabel (left-side label, collapsible)
│   │   ├── SubHeaderGroup (one per sub-header value, optional)
│   │   │   ├── SubHeaderLabel
│   │   │   └── Stream
│   │   │       └── Track (auto-stacked to avoid overlap)
│   │   │           └── ItemBar (the colored bar)
│   │   │               ├── BarBody (<rect> with rounded corners)
│   │   │               ├── BarLabel (<text> — name + optional suffix)
│   │   │               └── BarTooltip (on hover)
│   │   └── Stream (if no sub-headers)
│   │       └── Track → ItemBar
│   │
│   └── MilestoneLayer
│       └── MilestoneMarker (shaped icon + optional label)
│
└── TimeSlider (horizontal scrollbar/zoom control at bottom)
```

### 6.2 Coordinate System

The timeline uses `d3-scale` for all coordinate math:

```typescript
import { scaleTime } from 'd3-scale';
import { timeMonth, timeWeek, timeQuarter } from 'd3-time';

// Main time scale: maps dates to pixel X positions
const xScale = scaleTime()
  .domain([viewStartDate, viewEndDate])  // e.g., [Jan 1 2026, Dec 31 2026]
  .range([LEFT_MARGIN, svgWidth]);        // pixel range

// Convert a date to an X position
const itemX = xScale(item.startDate);
const itemWidth = xScale(item.endDate) - xScale(item.startDate);

// Convert a pixel position back to a date (for drag)
const dateAtPixel = xScale.invert(mouseX);
```

**Y-axis layout is computed, not scaled.** Each header group has a calculated height based on the number of tracks (stacked items) it contains. The layout algorithm:

1. Group items by their header field value
2. Within each group, optionally sub-group by sub-header field
3. Within each (sub-)group, stack items into tracks to avoid horizontal overlap
4. Calculate Y offset for each group based on cumulative height of preceding groups

### 6.3 Stacking Algorithm

Items within a stream must not overlap horizontally. The stacking algorithm assigns each item to a track:

```typescript
function stackItems(items: TimelineItem[], xScale: ScaleTime): TrackedItem[] {
  // Sort by start date
  const sorted = [...items].sort((a, b) => a.startDate - b.startDate);
  const tracks: { endX: number }[] = [];

  return sorted.map(item => {
    const startX = xScale(item.startDate);
    const endX = xScale(item.endDate);

    // Find the first track where this item fits (no overlap)
    let trackIndex = tracks.findIndex(t => t.endX <= startX);
    if (trackIndex === -1) {
      trackIndex = tracks.length;
      tracks.push({ endX: 0 });
    }
    tracks[trackIndex].endX = endX + ITEM_GAP;

    return { ...item, trackIndex };
  });
}
```

### 6.4 Zooming and Panning

**Panning:** Horizontal scroll via mouse wheel (shift+scroll or trackpad horizontal gesture) or by dragging the TimeSlider. Updates the `domain` of the xScale.

**Zooming:** Time scale selector (weeks/months/quarters/halves/years) changes the interval density. The zoom does not change the SVG viewBox -- instead, it changes the date range displayed (the xScale domain) and the tick interval. This keeps text crisp at all zoom levels (unlike viewBox scaling which would shrink text).

```typescript
// Zoom level determines the visible date range
const ZOOM_RANGES = {
  weeks:    { maxYears: 2 },
  months:   { maxYears: 5 },
  quarters: { maxYears: 8 },
  halves:   { maxYears: 15 },
  years:    { maxYears: 30 },
};
```

### 6.5 Performance Notes

At 350 items (the requirements cap), the SVG will have roughly:
- 350 `<rect>` elements (bars)
- 350 `<text>` elements (labels)
- ~20 milestone markers
- ~50 header/grid elements
- Total: ~800 SVG elements

This is well within SVG performance limits. Modern browsers handle 10,000+ SVG elements without issue. No virtualization needed for v1.

**If performance becomes an issue later:** Implement viewport-based rendering -- only mount React components for items visible in the current scroll position. This is the same pattern as windowed lists (react-window/react-virtuoso) applied to SVG.

---

## 7. State Management

### 7.1 Architecture: React Query + Zustand

**React Query (TanStack Query)** for server state. **Zustand** for client-only state.

**Why this combination:**
- **React Query** handles all data fetching, caching, background refetching, and optimistic updates. It eliminates the need to manage loading/error/stale states manually. It also handles cache invalidation when mutations succeed.
- **Zustand** handles ephemeral UI state that doesn't come from the server: which panel is open, zoom level, drag state, selected items.
- This avoids Redux entirely. Redux is overkill for this app -- we don't need middleware, time-travel debugging, or the boilerplate.

### 7.2 React Query Usage

```typescript
// Fetch roadmap data
const { data: roadmap } = useQuery({
  queryKey: ['roadmap', roadmapId],
  queryFn: () => api.getRoadmap(roadmapId),
});

// Fetch items (inlined field values)
const { data: items } = useQuery({
  queryKey: ['items', roadmapId],
  queryFn: () => api.getItems(roadmapId),
});

// Optimistic update on item edit
const updateItem = useMutation({
  mutationFn: (data) => api.updateItem(itemId, data),
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['items', roadmapId]);
    const previous = queryClient.getQueryData(['items', roadmapId]);
    queryClient.setQueryData(['items', roadmapId], (old) =>
      old.map(item => item.id === itemId ? { ...item, ...newData } : item)
    );
    return { previous };
  },
  onError: (err, data, context) => {
    queryClient.setQueryData(['items', roadmapId], context.previous);
    // Show error toast
  },
  onSettled: () => {
    queryClient.invalidateQueries(['items', roadmapId]);
  },
});
```

### 7.3 Zustand Stores

```typescript
// View UI state (not persisted to server -- ephemeral)
interface ViewUIStore {
  activeViewId: string | null;
  formatPanelOpen: boolean;
  itemCardOpen: string | null;  // itemId or null
  selectedItems: Set<string>;
  dragState: DragState | null;

  setActiveView: (viewId: string) => void;
  toggleFormatPanel: () => void;
  openItemCard: (itemId: string) => void;
  closeItemCard: () => void;
  // ...
}

// Collaboration state
interface CollabStore {
  connected: boolean;
  presence: PresenceUser[];
  cursors: Map<string, CursorState>;
  locks: Map<string, EditLock>;

  setPresence: (users: PresenceUser[]) => void;
  setCursor: (userId: string, cursor: CursorState) => void;
  setLock: (itemId: string, lock: EditLock | null) => void;
}
```

### 7.4 WebSocket -> Cache Integration

When a WebSocket event arrives (e.g., another user updated an item), we update the React Query cache directly:

```typescript
// In useSocket hook
socket.on('item-updated', ({ itemId, changes }) => {
  queryClient.setQueryData(['items', roadmapId], (old: Item[]) =>
    old.map(item => item.id === itemId ? { ...item, ...changes } : item)
  );
});

socket.on('item-created', ({ item }) => {
  queryClient.setQueryData(['items', roadmapId], (old: Item[]) => [...old, item]);
});

socket.on('item-deleted', ({ itemId }) => {
  queryClient.setQueryData(['items', roadmapId], (old: Item[]) =>
    old.filter(item => item.id !== itemId)
  );
});
```

This gives us instant UI updates from other users without refetching from the server. The 200ms propagation target is easily achievable since it's just a WebSocket message + cache update + React re-render.

---

## 8. Authentication & Authorization

### 8.1 Clerk Integration

**Frontend:**
- `<ClerkProvider>` wraps the app
- `<SignIn>` and `<SignUp>` for auth UI (Clerk hosted or embedded components)
- `<OrganizationSwitcher>` for team switching
- `<OrganizationProfile>` for team settings
- `useAuth()` hook for getting the JWT token
- `useOrganization()` for current org context

**Backend:**
- Clerk Express middleware (`@clerk/express`) verifies JWTs on every request
- Custom middleware extracts `userId`, `orgId`, and `orgRole` from the verified token
- All database queries scoped by `orgId`

### 8.2 Permission Model

Three layers of authorization:

1. **Org-level (Clerk):** Owner / Admin / Member. Controls who can manage the org.
2. **Roadmap-level:** Owner / Editor / Viewer. The roadmap creator is the owner. Others get access via sharing.
3. **Combined enforcement:** Viewers cannot create, edit, or delete. Editors can do everything except delete the roadmap or manage shares.

```typescript
// server/src/lib/permissions.ts
function canEditRoadmap(orgRole: string, roadmapRole: string | null): boolean {
  if (orgRole === 'org:admin') return true;
  return roadmapRole === 'editor' || roadmapRole === 'owner';
}

function canDeleteRoadmap(orgRole: string, roadmapRole: string | null): boolean {
  if (orgRole === 'org:admin') return true;
  return roadmapRole === 'owner';
}

function canViewRoadmap(orgRole: string, roadmapRole: string | null): boolean {
  // All org members can view all roadmaps in their org
  // External viewers need explicit share
  return orgRole !== null || roadmapRole !== null;
}
```

### 8.3 Shared Link Auth

Public shared links bypass Clerk auth. The token in the URL is looked up directly:

```typescript
// No auth middleware on this route
app.get('/api/v1/shared/:token', async (req, res) => {
  const link = await db.query.sharedLinks.findFirst({
    where: and(
      eq(sharedLinks.token, req.params.token),
      isNull(sharedLinks.revokedAt)
    ),
  });
  if (!link) return res.status(404).json({ error: 'Link not found' });
  if (link.passwordHash) return res.json({ data: { requiresPassword: true } });
  // Load and return view data...
});
```

---

## 9. Client-Side Filtering

Filters are evaluated client-side on the loaded item dataset. This keeps filter interactions instant (no server round-trip).

```typescript
// client/src/lib/filters.ts
function applyFilters(items: Item[], filters: FilterCondition[], fields: Field[]): Item[] {
  return items.filter(item => {
    return filters.every(filter => {
      const value = getItemFieldValue(item, filter.fieldId, fields);
      switch (filter.operator) {
        case 'eq': return value === filter.value;
        case 'neq': return value !== filter.value;
        case 'contains': return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
        case 'is_empty': return value == null || value === '';
        case 'is_not_empty': return value != null && value !== '';
        case 'before': return value && new Date(value) < new Date(filter.value);
        case 'after': return value && new Date(value) > new Date(filter.value);
        case 'between': return value && new Date(value) >= new Date(filter.value[0]) && new Date(value) <= new Date(filter.value[1]);
        default: return true;
      }
    });
  });
}
```

---

## 10. Export Implementation

### 10.1 PNG Export

Two approaches, used in sequence:

**Primary: Client-side via html-to-image**

```typescript
import { toPng } from 'html-to-image';

async function exportViewToPng(viewElement: HTMLElement, filename: string) {
  const dataUrl = await toPng(viewElement, {
    pixelRatio: 2,  // 2x for retina
    backgroundColor: '#ffffff',
    // Expand to full content size (not just viewport)
    width: viewElement.scrollWidth,
    height: viewElement.scrollHeight,
  });
  // Trigger download
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
```

**Fallback: Server-side via Puppeteer** (if client-side fails for complex SVGs)

The server endpoint renders the view in headless Chromium and returns the screenshot. This is expensive (spins up a browser process) so it's a fallback, not the default.

### 10.2 Shared Link Rendering

Shared links render the roadmap in a read-only mode. The frontend checks for a `token` query parameter and renders without auth UI:

```typescript
// SharedViewPage.tsx
function SharedViewPage() {
  const { token } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['shared', token],
    queryFn: () => api.getSharedView(token),
  });

  if (data?.requiresPassword) return <PasswordPrompt token={token} />;
  // Render the view in read-only mode (no editing UI, no auth required)
  return <ReadOnlyViewRenderer view={data.view} items={data.items} />;
}
```

---

## 11. Build Tooling

### 11.1 Frontend

| Tool | Purpose |
|------|---------|
| **Vite** | Build tool + dev server |
| **React 19** | UI framework |
| **TypeScript 5.x** | Type safety |
| **React Router 7** | Client-side routing |
| **TanStack Query 5** | Server state management |
| **Zustand 5** | Client state management |
| **d3-scale + d3-time** | Date-to-pixel math for Timeline |
| **date-fns** | Date manipulation |
| **Tiptap** | Rich text editor (for item descriptions) |
| **socket.io-client** | WebSocket client |
| **html-to-image** | PNG export |
| **zod** | Runtime validation (shared with server) |

### 11.2 Backend

| Tool | Purpose |
|------|---------|
| **Express** | HTTP server |
| **TypeScript 5.x** | Type safety |
| **Drizzle ORM** | Database queries + migrations |
| **pg** | PostgreSQL driver |
| **@clerk/express** | Auth middleware |
| **socket.io** | WebSocket server |
| **@aws-sdk/client-s3** | Cloudflare R2 (S3-compatible) |
| **bcrypt** | Password hashing for shared links |
| **zod** | Request validation |
| **tsx** | TypeScript execution (dev) |
| **concurrently** | Run client + server in dev |

### 11.3 Dev Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev -w client\" \"npm run dev -w server\"",
    "build": "npm run build -w shared && npm run build -w client && npm run build -w server",
    "db:generate": "npm run db:generate -w server",
    "db:migrate": "npm run db:migrate -w server",
    "db:seed": "npm run db:seed -w server"
  }
}
```

Vite dev server proxies `/api` and `/socket.io` to the Express server:

```typescript
// client/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

---

## 12. Deployment

### 12.1 Railway Setup

Two Railway services in one project:

1. **API Server** -- Express + Socket.IO. Runs `npm run build && node server/dist/index.js`. WebSocket support requires the Railway HTTP proxy to pass Upgrade headers (Socket.IO handles this with its polling fallback if needed).

2. **PostgreSQL** -- Railway managed Postgres. Connected to the API server via internal networking (`DATABASE_URL` auto-injected).

**Build pipeline:**
- GitHub repo connection for auto-deploy on push to `main`
- Preview environments for PR branches

### 12.2 Static Frontend

The Vite build outputs to `client/dist/`. Two options:

**Option A (simpler for v1):** Serve the static build from Express. The Express server serves `client/dist/` as static files for any route that doesn't match `/api` or `/socket.io`. Single Railway service.

**Option B (better for scale):** Deploy the frontend to Cloudflare Pages or Vercel. Separate from the API. Better CDN, faster static asset delivery.

**Recommendation: Option A for v1.** One service to manage. Switch to Option B when we need CDN-level performance or if the single service hits resource limits.

### 12.3 Environment Variables

```
# Clerk
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe (deferred but reserve the vars)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database (Railway auto-injects)
DATABASE_URL=postgresql://...

# Cloudflare R2
R2_ENDPOINT=https://...r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=roadmap-tool-uploads

# PostHog
POSTHOG_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com

# App
PORT=3001
NODE_ENV=production
CLIENT_URL=https://roadmap.sherlocklabs.ai
```

---

## 13. Database Seeding

On first deploy, seed the following:

1. **Default color palettes** (6): Citrus, Groovy, Pastel, Autumn, Neon, Ocean -- each with 6-12 preset colors.
2. **Default milestone types** (3): Release (diamond, blue), Product Launch (circle, green), Tradeshow (triangle, orange).

These are account-agnostic (system-level) so they're available to all orgs.

```typescript
// server/src/db/seed.ts
const DEFAULT_PALETTES = [
  { name: 'Citrus',  colors: ['#FF6B35', '#F7C948', '#7BC950', '#3BCEAC', '#0EAD69', '#EE6C4D'] },
  { name: 'Groovy',  colors: ['#A855F7', '#EC4899', '#F97316', '#EAB308', '#22C55E', '#06B6D4'] },
  { name: 'Pastel',  colors: ['#FDA4AF', '#FDBA74', '#FDE68A', '#BBF7D0', '#A5F3FC', '#C4B5FD'] },
  { name: 'Autumn',  colors: ['#B91C1C', '#C2410C', '#A16207', '#4D7C0F', '#0F766E', '#1E40AF'] },
  { name: 'Neon',    colors: ['#FF0080', '#FF00FF', '#8B00FF', '#00BFFF', '#00FF7F', '#FFFF00'] },
  { name: 'Ocean',   colors: ['#1E3A5F', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'] },
];
```

---

## 14. Sprint Build Order

Aligning with Thomas's recommended sprint sequence. Each sprint builds on the previous.

### Sprint 1: Data Backbone
Build the foundation that everything else depends on.

**Backend:**
- Express app scaffold + Clerk middleware
- Database schema + Drizzle setup + migrations
- Roadmap CRUD API
- Item CRUD API (with field values)
- Field CRUD API (with field values)
- Seed script (palettes, milestone types)
- Socket.IO infrastructure (connection, rooms, presence tracking)

**Frontend:**
- Vite + React scaffold + React Router + Clerk provider
- Application shell (sidebar, top bar)
- Roadmaps Homepage (list, create, search)
- Table View (items table with inline editing, field columns, arrow key nav)
- Item Card (detail panel -- Overview tab, Fields tab, Activity tab)
- Field Manager (create/edit/archive/promote fields, manage values)
- Socket.IO client connection + presence avatars

### Sprint 2: Hero Feature
The Timeline View is the product's signature.

**Backend:**
- Milestone CRUD API
- Milestone type CRUD API
- View CRUD API (create, config updates)

**Frontend:**
- Timeline View (SVG rendering -- time axis, header groups, item bars, stacking)
- Milestone markers on Timeline
- Format Panel (Timeline config: time scale, headers, colors, layout)
- Color palette picker + legend
- View switcher (create view, switch between views)
- Real-time presence UI (avatars in top bar, view name per user)

### Sprint 3: Full Feature Set
Complete the three-view system.

**Backend:**
- Filter logic validation (for saved view configs)

**Frontend:**
- Swimlane View (grid layout, cards, row/column pivots)
- Format Panel (Swimlane config: axes, card mode, grouping)
- Filter builder UI (per-view filters, AND logic)
- Table View column management (show/hide, reorder)
- Live cursor overlay (Table View -- other users' cell selections)
- Live data update handling (WS events -> cache updates)
- View config sync (live view config changes broadcast to room)

### Sprint 4: Sharing, Export, Polish
Ship-readiness features.

**Backend:**
- Sharing API (member management, role enforcement)
- Shared link generation + password protection
- Shared view public endpoint (no auth)
- File upload presigned URLs
- PNG export endpoint (Puppeteer fallback)
- Edit lock enforcement on item update API

**Frontend:**
- Share dialog (add users, set roles)
- Share link generator (URL, optional password)
- Shared view page (read-only renderer)
- PNG export (client-side html-to-image)
- File attachment upload (presigned URL flow)
- Edit lock UI (lock indicators, read-only mode when locked)
- Bulk select and delete in Table View
- Empty states, loading skeletons, error handling
- Keyboard shortcuts (Cmd+K search, arrow nav in Table)
- Toast notifications (view updated by X, connection status)

---

## 15. Key Architectural Decisions

### ADR: Custom React + SVG for Timeline (confirmed)

Marco recommended custom React + SVG over any existing Gantt library. Confirmed. The roadmap visualization pattern is fundamentally different from a Gantt chart -- horizontal bars grouped into themed swimlanes, presentation-focused, clean and colorful. No existing library matches this. SVG gives us full CSS/design-token integration, DOM event handling, accessibility, and clean export. Performance is not a concern at 50-350 item scale.

### ADR: Drizzle over Prisma

Drizzle ORM for database access. Drizzle generates SQL that looks like SQL (debuggable), has a smaller runtime footprint (no engine binary), provides better TypeScript inference for complex queries, and gives us full control over migrations. Prisma's abstraction layer adds indirection we don't need.

### ADR: React Query + Zustand over Redux

No Redux. React Query handles server state (fetching, caching, optimistic updates, cache invalidation). Zustand handles client-only UI state (panel open/close, selections, drag state). This is simpler, less boilerplate, and better separation of concerns than a Redux monolith.

### ADR: Socket.IO over native WebSocket

Socket.IO provides rooms (one per roadmap), auto-reconnection with backoff, transport fallback (polling if WS blocked), and binary support. These are all requirements features. Implementing them on raw WebSocket would mean writing Socket.IO ourselves.

### ADR: JSONB for view config

View configurations are complex, nested, and vary by type. JSONB avoids schema explosion (20+ nullable columns). We never need to query individual config properties -- the config is always read and written as a whole. TypeScript interfaces on the client provide type safety.

### ADR: In-memory presence + edit locks

Presence and edit locks are ephemeral. Lost on server restart, rebuilt from client reconnections. No Redis needed at v1 scale (single server). If we add a second server instance, we add Redis then.

### ADR: Load-all-items client-side filtering

With a 350-item cap per view and typical roadmaps having 50-200 items, loading all items into client memory is practical. This makes filtering, sorting, and view switching instant. Server-side filtering would add latency to every filter change.

### ADR: Express serving static frontend (v1)

One Railway service serves both the API and the static frontend build. Simpler deployment, one service to monitor. Trade-off: no CDN for static assets. Acceptable for v1; upgrade to separate static hosting (Cloudflare Pages) when needed.

---

## 16. File Classification (Change Impact)

All files are **New** -- this is a greenfield project in a new repository. There are no existing files to Extend, Modify, or Restructure.

| File/Module | Classification | Notes |
|-------------|---------------|-------|
| `client/src/components/timeline/*` | New | Custom SVG timeline rendering -- highest complexity |
| `client/src/components/table/*` | New | Spreadsheet-like view with inline editing |
| `client/src/components/swimlane/*` | New | Grid-based card layout |
| `client/src/components/item-card/*` | New | Two-panel detail view |
| `client/src/components/format-panel/*` | New | View configuration controls |
| `client/src/components/collab/*` | New | Presence, cursors, lock indicators |
| `client/src/stores/*` | New | Zustand stores for UI state |
| `client/src/hooks/*` | New | Custom hooks for data + real-time |
| `client/src/lib/timeScale.ts` | New | d3-scale wrappers -- critical for Timeline |
| `server/src/routes/*` | New | All REST API endpoints |
| `server/src/ws/*` | New | Socket.IO handlers, presence, edit locks |
| `server/src/db/schema.ts` | New | Drizzle schema -- 14 tables |
| `server/src/services/*` | New | Business logic layer |
| `server/src/middleware/auth.ts` | New | Clerk JWT verification |
| `shared/src/types.ts` | New | Shared entity types |
| `shared/src/validation.ts` | New | Zod schemas for API validation |

**QA notes for Enzo:** This is a full greenfield build. No regression risk against existing code. Focus testing on:
1. Multi-tenant data isolation (org A cannot see org B's data)
2. Permission enforcement (viewers cannot edit)
3. Real-time sync correctness (changes propagate to all connected clients)
4. Timeline rendering accuracy (items positioned correctly on time axis)
5. Optimistic update rollback (when server rejects, UI reverts cleanly)

---

## 17. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Timeline SVG rendering complexity | Medium | High | Build the stacking algorithm and time-axis math first in isolation. Test with 350 items before integrating into views. |
| Socket.IO on Railway (WS proxy) | Low | Medium | Railway supports WebSocket. Socket.IO falls back to polling if WS handshake fails. Test early. |
| Clerk + Express integration pain | Low | Low | Well-documented. Our SaaS stack doc has the exact pattern. |
| Rich text editor (Tiptap) bundle size | Low | Low | Tiptap is modular -- import only the extensions we use. Lazy-load the Item Card component. |
| Drag-and-drop in v1.1 requires Timeline refactoring | Medium | Medium | Design the Timeline component with drag handlers as an extension point from the start. Don't couple the bar rendering to a fixed layout. |
| Multi-tenant data leakage | Low | Critical | Every database query includes `account_id` filter. Add integration tests that verify org isolation. |

---

*Tech approach written by Andrei (Technical Architect). Downstream agents: Robert, read this for technical constraints. Alice and Jonah, read this + the requirements for the full build context.*
