# Bug Reporter -- Tech Approach

**Project:** bug-reporter
**Author:** Andrei (Arch)
**Date:** 2026-02-13
**Status:** Ready for implementation

## Overview

A lightweight in-app bug reporter for Forge (the roadmap tool). Users trigger a modal via keyboard shortcut or floating button, paste a screenshot from the OS clipboard, type a description, and submit. Bugs are stored in Postgres with optional screenshots in Cloudflare R2.

This feature is entirely additive -- no existing functionality is modified or restructured. We add a new DB table, a new route file, new client components, and wire them into the existing AppShell/Sidebar/App.tsx with small additions.

---

## 1. Database: `bugs` Table

Add to `server/src/db/schema.ts`, following the existing table definition pattern (uuid PK, accountId FK with cascade, timestamps with timezone, index array in third argument):

```typescript
// --- Bugs ---

export const bugs = pgTable('bugs', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  reportedBy: uuid('reported_by').notNull().references(() => users.id),
  description: text('description').notNull(),
  screenshotR2Key: text('screenshot_r2_key'),
  pageUrl: text('page_url'),
  status: text('status').notNull().default('open'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_bugs_account').on(table.accountId),
  index('idx_bugs_status').on(table.accountId, table.status),
]);
```

This matches the existing schema patterns exactly: uuid PKs with `defaultRandom()`, `references(() => table.id)` for FKs, `defaultNow()` for timestamps, and index array in the third argument.

### Migration: `0004_bug_reporter.sql`

Create `server/src/db/migrations/0004_bug_reporter.sql`:

```sql
-- Bug Reporter: bugs table

CREATE TABLE bugs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reported_by      UUID NOT NULL REFERENCES users(id),
  description      TEXT NOT NULL,
  screenshot_r2_key TEXT,
  page_url         TEXT,
  status           TEXT NOT NULL DEFAULT 'open',
  resolved_by      UUID REFERENCES users(id),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bugs_account ON bugs(account_id);
CREATE INDEX idx_bugs_status ON bugs(account_id, status);
```

Purely additive -- zero risk to existing tables. Run with `npx drizzle-kit push` or `npx drizzle-kit generate` per the existing workflow.

---

## 2. Shared Types and Validation

### `shared/src/types.ts` -- Add Bug types

Append to the end of the file, following the existing section comment pattern:

```typescript
// --- Bugs ---

export type BugStatus = 'open' | 'resolved';

export interface Bug {
  id: string;
  accountId: string;
  reportedBy: string;
  description: string;
  screenshotR2Key: string | null;
  pageUrl: string | null;
  status: BugStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  // Populated via JOIN
  reporter?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface BugListItem extends Bug {
  screenshotUrl: string | null;  // Presigned download URL, generated server-side
}
```

### `shared/src/validation.ts` -- Add bug schemas

Append to the end of the file:

```typescript
// --- Bugs ---

export const bugStatusEnum = z.enum(['open', 'resolved']);

export const createBugSchema = z.object({
  description: z.string().min(1).max(5000),
  screenshotR2Key: z.string().nullable().optional(),
  pageUrl: z.string().max(500).nullable().optional(),
});

export const updateBugStatusSchema = z.object({
  status: bugStatusEnum,
});

export const presignBugScreenshotSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024), // 5 MB
});
```

The bug screenshot presign schema is intentionally separate from the existing `presignUploadSchema` (which allows 10 MB and any mime type). Bug screenshots have tighter constraints: 5 MB max and PNG/JPEG only.

---

## 3. API Routes: `server/src/routes/bugs.ts`

New file. Follows the same patterns as `uploads.ts` and other route files: `Router()`, try/catch with `next(err)`, `req.accountId` scoping, Zod validation with `safeParse`.

### Endpoints

#### `GET /api/v1/bugs/count` -- Open bug count (sidebar badge)

- Auth: authenticated (via `resolveAuth`)
- Query: `SELECT count(*) FROM bugs WHERE account_id = $1 AND status = 'open'`
- Response: `{ data: { openCount: number } }`

This endpoint must be defined BEFORE the `/:id` parameter routes to avoid Express treating "count" as an ID.

#### `GET /api/v1/bugs` -- List bugs

- Auth: authenticated (via `resolveAuth`)
- Query `bugs` where `accountId = req.accountId`, ordered by `createdAt DESC`
- LEFT JOIN `users` on `reported_by` to populate reporter name/avatar
- For each bug with a `screenshotR2Key`, generate a presigned download URL using `getPresignedDownloadUrl` from `r2.ts`. If R2 is not configured, set `screenshotUrl: null`.
- Response: `{ data: BugListItem[], meta: { openCount: number, screenshotsEnabled: boolean } }`

The `meta.screenshotsEnabled` flag tells the client whether R2 is available (server calls `isR2Configured()`). The `meta.openCount` is included here too so the bug list page can update the sidebar badge without a separate call.

#### `POST /api/v1/bugs` -- Create bug

- Auth: `requireEditor`
- Validate body with `createBugSchema`
- Insert into `bugs` with `accountId: req.accountId`, `reportedBy: req.userId`
- Response: `{ data: Bug }`

#### `PATCH /api/v1/bugs/:id` -- Resolve/reopen

- Auth: `requireEditor`
- Validate body with `updateBugStatusSchema`
- Account scoping guard: verify the bug's `accountId` matches `req.accountId`
- If status is `resolved`: set `resolvedBy = req.userId`, `resolvedAt = now()`
- If status is `open`: clear `resolvedBy` and `resolvedAt` (set to null)
- Response: `{ data: Bug }`

#### `POST /api/v1/bugs/screenshot/presign` -- Presigned upload URL

- Auth: `requireEditor`
- Check `isR2Configured()` -- return 503 if not (same pattern as `uploads.ts` line 16-18)
- Validate body with `presignBugScreenshotSchema`
- Generate R2 key: `{req.accountId}/bugs/{randomUUID()}-{filename}`
- Call `getPresignedUploadUrl(key, mimeType)` from existing `r2.ts`
- Response: `{ data: { uploadUrl: string, r2Key: string } }`

Unlike the item attachment flow in `uploads.ts`, we do NOT create a DB record at presign time. The R2 key is returned to the client, which passes it back in the `POST /api/v1/bugs` body after upload completes. This is simpler because bug screenshots are 1:1 with bugs, not a separate entity table.

#### `GET /api/v1/bugs/:id/screenshot-url` -- Presigned download URL

- Auth: authenticated
- Account scoping guard: verify the bug's `accountId` matches `req.accountId`
- Verify `screenshotR2Key` is not null (404 otherwise)
- Call `getPresignedDownloadUrl(bug.screenshotR2Key)` from existing `r2.ts`
- Response: `{ data: { url: string } }`

This endpoint exists for the case where a user has the bug list open for over an hour and the inline presigned URLs have expired. The client can re-fetch on demand.

### Route registration in `server/src/index.ts`

Add after the existing route registrations (near line 125, after the templates route):

```typescript
import { bugsRouter } from './routes/bugs.js';

// Bugs
app.use('/api/v1/bugs', bugsRouter);
```

This follows the flat route pattern used by `collections`, `portfolios`, `templates`, and `account` -- top-level routes that are already account-scoped via `resolveAuth` middleware on `/api/v1`.

---

## 4. R2 Integration: Screenshot Upload Flow

### Upload sequence (client-side orchestration)

```
1. User pastes screenshot into modal (clipboard paste event)
2. Client validates: is image? is PNG or JPEG? under 5 MB?
3. User clicks Submit
4. Client calls POST /api/v1/bugs/screenshot/presign
   -> Server returns { uploadUrl, r2Key }
5. Client PUTs the image blob directly to the presigned R2 URL
   -> 15-second timeout (AbortSignal.timeout)
6. Client calls POST /api/v1/bugs with { description, screenshotR2Key: r2Key, pageUrl }
   -> Server creates the bug record
```

### R2 not configured (graceful degradation)

The client detects R2 availability via the `meta.screenshotsEnabled` flag returned by `GET /api/v1/bugs`. This flag is cached by TanStack Query and available immediately when the modal opens (if the user has visited the bugs page) or fetched on first modal open.

To avoid a blocking network call on modal open, Alice should pre-fetch the bugs query at the AppShell level with a long `staleTime`:

```typescript
// In AppShell.tsx or a shared hook
const { data: bugsMeta } = useQuery({
  queryKey: ['bugs', 'count'],
  queryFn: () => api.getBugCount(),
  staleTime: 60_000,
});
```

The `screenshotsEnabled` flag can be added to the count endpoint response as well: `{ data: { openCount: number, screenshotsEnabled: boolean } }`. This way the AppShell always knows whether screenshots are available without loading the full bug list.

When `screenshotsEnabled` is false:
- The screenshot paste area is hidden entirely
- The modal works as a description-only bug reporter
- No error messaging needed -- the feature is simply not visible

### R2 key format

```
{accountId}/bugs/{uuid}-{sanitized-filename}
```

Follows the same `{accountId}/...` prefix pattern used by the existing attachment uploads in `uploads.ts` (line 28) for account-scoped storage isolation.

---

## 5. Client Architecture

### 5.1 Keyboard Shortcut Decision

**Thomas's question:** Cmd+Shift+B conflicts with Chrome's bookmarks bar toggle. Evaluate alternatives.

**Evaluation:**

| Shortcut | Conflict | Verdict |
|----------|----------|---------|
| Cmd+Shift+B | Chrome bookmarks bar toggle | **Unusable.** Chrome intercepts the keydown event before it reaches the page JS. This is a hard blocker, not a preference. |
| Cmd+Shift+K | No browser binding in Chrome, Safari, or Firefox | **Selected.** Available, no conflicts. |
| Cmd+B | Bold in text editors, textarea formatting | Conflicts with description textarea. Rejected. |
| Cmd+Shift+F | Some browsers use for fullscreen or find | Risky. Rejected. |
| Cmd+J | Chrome downloads panel | Intercepted by Chrome. Rejected. |
| Cmd+. | macOS system cancel | Unreliable cross-platform. Rejected. |

**Decision: Cmd+Shift+K** (Ctrl+Shift+K on Windows/Linux).

Rationale: Cmd+Shift+B is a dead end -- Chrome swallows the event entirely and it will never reach our JavaScript. Cmd+Shift+K has no default browser binding in any major browser. The mnemonic is weak (K does not stand for "bug"), but discoverability comes from the floating button's tooltip, not the shortcut itself. The shortcut is a power-user convenience, not the primary entry point.

**Implementation:** A single `useEffect` in `AppShell.tsx` that listens for `keydown` on `window`:

```typescript
const [bugModalOpen, setBugModalOpen] = useState(false);

useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      setBugModalOpen(true);
    }
  }
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, []);
```

This follows the exact same pattern already used in `AppShell.tsx` for the Escape-to-close-mobile-menu handler (lines 38-44).

### 5.2 BugReportModal Component

**File:** `client/src/components/bugs/BugReportModal.tsx`
**Styles:** `client/src/components/bugs/BugReportModal.module.css`

Structure follows the existing `FieldModal` pattern exactly:

```
<div className={styles.overlay} onClick={onClose}>        -- backdrop (fixed inset 0)
  <div className={styles.modal} ref={modalRef} ...>       -- modal panel (stopPropagation)
    <div className={styles.modalHeader}>                   -- title + close button
    <div className={styles.modalBody}>                     -- form content
      <div className={styles.screenshotZone}>              -- paste area or preview
      <textarea className={styles.description}>            -- description input
    <div className={styles.modalFooter}>                   -- submit + cancel buttons
  </div>
</div>
```

Key patterns copied from `FieldModal.tsx`:
- `useFocusTrap(modalRef)` for accessibility (existing hook at `client/src/lib/useFocusTrap.ts`)
- `onClick={onClose}` on overlay, `e.stopPropagation()` on modal panel
- `role="dialog"`, `aria-modal="true"`, `aria-label="Report a Bug"`
- Same CSS animation: `fadeIn 150ms ease-out` with `scale(0.98)` to `scale(1)` (FieldModal.module.css lines 23-26)
- Close on Escape: add a keydown handler in the modal that calls `onClose()` when `e.key === 'Escape'` and submission is not in progress

**Modal width:** 480px (slightly wider than FieldModal's 440px to accommodate the screenshot preview comfortably).

**Props interface:**
```typescript
interface BugReportModalProps {
  onClose: () => void;
  screenshotsEnabled: boolean;
}
```

### 5.3 Clipboard Paste Handling

The paste listener is scoped to the modal's container ref, not `window`. This avoids intercepting paste events when the modal is closed and preserves normal text paste in the description textarea.

```typescript
useEffect(() => {
  const container = modalRef.current;
  if (!container) return;

  function onPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        // Validate size
        if (file.size > 5 * 1024 * 1024) {
          setError('Screenshot too large (max 5 MB). Try a smaller selection.');
          return;
        }

        // Validate type
        if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
          setError('Only PNG and JPEG screenshots are supported.');
          return;
        }

        setScreenshotFile(file);
        setScreenshotPreview(URL.createObjectURL(file));
        setError(null);
        return; // Take only the first image item
      }
    }
    // If no image items found, let the event propagate normally
    // (text paste into the description textarea works as expected)
  }

  container.addEventListener('paste', onPaste);
  return () => container.removeEventListener('paste', onPaste);
}, []);
```

**Why scope to modal container, not window?** Two reasons:
1. When the description textarea is focused and the user pastes text, we want default browser behavior (text into textarea). The handler only intercepts clipboard items of type `image/*` and calls `preventDefault()` only for those.
2. When the modal is closed, no paste interception should happen.

**Preview cleanup:** Call `URL.revokeObjectURL(screenshotPreview)` in the effect cleanup and when removing/replacing a screenshot to avoid memory leaks.

### 5.4 Screenshot Upload and Submit Flow

The submit handler orchestrates the two-step process with imperative async/await:

```typescript
async function handleSubmit() {
  if (!description.trim()) return;
  setSubmitting(true);
  setError(null);
  let r2Key: string | null = null;

  try {
    // Step 1: Upload screenshot if present
    if (screenshotFile && screenshotsEnabled) {
      const ext = screenshotFile.type === 'image/png' ? 'png' : 'jpg';
      const presign = await api.presignBugScreenshot({
        filename: `screenshot-${Date.now()}.${ext}`,
        mimeType: screenshotFile.type as 'image/png' | 'image/jpeg',
        sizeBytes: screenshotFile.size,
      });

      // Direct upload to R2 (raw PUT, not JSON)
      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: screenshotFile,
        headers: { 'Content-Type': screenshotFile.type },
        signal: AbortSignal.timeout(15_000), // 15s timeout per requirements
      });

      if (!uploadRes.ok) throw new Error('Screenshot upload failed');
      r2Key = presign.r2Key;
    }

    // Step 2: Create bug record
    await api.createBug({
      description: description.trim(),
      screenshotR2Key: r2Key,
      pageUrl: window.location.pathname,
    });

    // Success indicator
    setSubmitSuccess(true);
    setTimeout(() => onClose(), 1500);

  } catch (err) {
    if (screenshotFile && !r2Key) {
      setError('Screenshot upload failed. Submit without screenshot or try again.');
    } else {
      setError('Failed to submit bug report. Please try again.');
    }
    setSubmitting(false);
  }
}
```

**Why not use TanStack Query mutations?** The bug report modal is fire-and-forget. There is no query cache to invalidate on the current page (the user may not be on the bugs page). The submit flow is sequential (presign -> upload -> create) and benefits from simple imperative async/await. TanStack Query mutations add ceremony without benefit here.

However, after successful submission, the modal should invalidate the `['bugs', 'count']` query so the sidebar badge updates:

```typescript
// After setSubmitSuccess(true):
queryClient.invalidateQueries({ queryKey: ['bugs'] });
```

### 5.5 BugReportButton (Floating Action Button)

**File:** `client/src/components/bugs/BugReportButton.tsx`

A small component rendered in `AppShell.tsx`, outside the `.shell` div so it floats above all content:

```typescript
interface BugReportButtonProps {
  onClick: () => void;
}

export function BugReportButton({ onClick }: BugReportButtonProps) {
  return (
    <button
      className={styles.fab}
      onClick={onClick}
      title="Report a bug (Cmd+Shift+K)"
      aria-label="Report a bug"
    >
      {/* Bug icon SVG */}
    </button>
  );
}
```

CSS (in BugReportModal.module.css -- shared file, no separate CSS module needed for this tiny component):
```css
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 40;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  /* ... */
}
```

`z-index: 40` keeps the button below the modal overlay (`z-index: 50`).

### 5.6 AppShell Integration

In `AppShell.tsx`, add the modal state, keyboard listener, and render the button + modal:

```typescript
export function AppShell({ children }: AppShellProps) {
  // ... existing state ...
  const [bugModalOpen, setBugModalOpen] = useState(false);

  // Keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setBugModalOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div className={styles.shell} data-sidebar-collapsed={sidebarCollapsed}>
        {/* ... existing skip link, overlay, sidebar, main ... */}
      </div>
      <BugReportButton onClick={() => setBugModalOpen(true)} />
      {bugModalOpen && (
        <BugReportModal
          onClose={() => setBugModalOpen(false)}
          screenshotsEnabled={/* from count query */}
        />
      )}
    </>
  );
}
```

The button and modal render outside the `.shell` div to avoid z-index stacking context issues with the sidebar.

### 5.7 BugsPage (Bug List)

**File:** `client/src/routes/BugsPage.tsx`
**Styles:** `client/src/routes/BugsPage.module.css`

Uses `useQuery` to fetch bugs from `GET /api/v1/bugs`.

**Layout:**
- Page header: "Bugs" title
- Bug cards in a vertical list, newest first
- Each card shows: description (truncated to ~120 chars), screenshot thumbnail (if present), status badge (open/resolved), date, reporter name
- Click a card to expand inline (toggle state, not navigation)
- Expanded: full description, full-size screenshot, resolve/reopen button
- Click screenshot to open in new tab

**Resolve/reopen with optimistic update:**

```typescript
const updateBug = useMutation({
  mutationFn: ({ id, status }: { id: string; status: 'open' | 'resolved' }) =>
    api.updateBug(id, { status }),
  onMutate: async ({ id, status }) => {
    await queryClient.cancelQueries({ queryKey: ['bugs'] });
    const previous = queryClient.getQueryData(['bugs']);
    queryClient.setQueryData(['bugs'], (old: any) => ({
      ...old,
      data: old.data.map((b: Bug) => b.id === id ? { ...b, status } : b),
      meta: {
        ...old.meta,
        openCount: status === 'resolved' ? old.meta.openCount - 1 : old.meta.openCount + 1,
      },
    }));
    return { previous };
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['bugs'], context?.previous);
    // Show brief error toast
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['bugs'] });
  },
});
```

**Screenshot thumbnails:** The `GET /api/v1/bugs` response includes pre-generated presigned download URLs as `screenshotUrl` on each `BugListItem`. The server generates these at query time using `getPresignedDownloadUrl` from `r2.ts` -- presigned URL generation is a local HMAC computation, not a network call to R2, so generating 50 URLs adds negligible latency. This eliminates N+1 API calls from the client.

**Empty state:** "No bugs reported yet. Use Cmd+Shift+K to report your first bug."

### 5.8 Sidebar Badge

Add a "Bugs" nav entry to `Sidebar.tsx` following the existing `NavLink` pattern (same structure as Roadmaps and Fields nav items).

The badge count comes from a lightweight count query:

```typescript
const { data: bugCount } = useQuery({
  queryKey: ['bugs', 'count'],
  queryFn: () => api.getBugCount(),
  staleTime: 30_000, // refresh at most every 30s
});
```

The badge is hidden when `openCount` is 0 (per requirements). The nav item appears unconditionally (not gated by a roadmap being selected, unlike the Fields nav item which only shows inside a roadmap context).

### 5.9 Route Registration in App.tsx

```typescript
import { BugsPage } from './routes/BugsPage';

// Inside AuthenticatedApp <Routes>:
<Route path="/bugs" element={<BugsPage />} />
```

### 5.10 Client API Methods

Add to `client/src/lib/api.ts`, inside the `api` object:

```typescript
// Bugs
getBugs: () =>
  requestFull<{ data: BugListItem[]; meta: { openCount: number; screenshotsEnabled: boolean } }>('/bugs'),
getBugCount: () =>
  request<{ openCount: number; screenshotsEnabled: boolean }>('/bugs/count'),
createBug: (data: { description: string; screenshotR2Key?: string | null; pageUrl?: string | null }) =>
  request<Bug>('/bugs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
updateBug: (id: string, data: { status: 'open' | 'resolved' }) =>
  request<Bug>(`/bugs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
presignBugScreenshot: (data: { filename: string; mimeType: 'image/png' | 'image/jpeg'; sizeBytes: number }) =>
  request<{ uploadUrl: string; r2Key: string }>('/bugs/screenshot/presign', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
getBugScreenshotUrl: (id: string) =>
  request<{ url: string }>(`/bugs/${id}/screenshot-url`),
```

---

## 6. Key Technical Decisions

### 6.1 Screenshot Format: Accept as-is, no conversion

**Decision:** Accept PNG and JPEG without client-side conversion or compression.

**Rationale:**
- OS screenshot tools produce PNGs by default. Converting to WebP would require a canvas-based conversion step, adding complexity and processing delay.
- WebP saves roughly 25-35% over PNG, but region-select screenshots (Cmd+Shift+4) are typically 200KB-1.5MB -- well within the 5 MB limit.
- Full-screen Retina screenshots can exceed 5 MB, but users reporting bugs will almost always drag-select a region. The 5 MB limit naturally encourages region selection, which produces better bug reports.
- If this becomes a problem, client-side canvas compression can be added in v2 without changing the architecture (just transform the blob before upload).

### 6.2 Max File Size: 5 MB

Validated in two places:
- **Client-side:** Check `file.size` immediately on paste. Show error before any network request.
- **Server-side:** The `presignBugScreenshotSchema` validates `sizeBytes <= 5 * 1024 * 1024`. Even if the client check is bypassed, the presigned URL includes content-length conditions that R2 enforces.

### 6.3 No Orphan Cleanup for R2 Screenshots

If a user gets a presigned URL, uploads a screenshot, but then the bug creation fails or the user closes the modal, the screenshot blob sits in R2 with no database record.

**Decision:** Accept orphans. Rationale:
- Bug screenshots are small (under 5 MB each)
- Volume is low (internal tool, small user base)
- A cleanup cron is disproportionate complexity for v1
- If needed later, a script can scan R2 for `*/bugs/*` keys not referenced in the `bugs` table

### 6.4 Screenshot URLs Inlined in Bug List Response

**Decision:** Server generates presigned download URLs at query time and includes them in the `GET /api/v1/bugs` response, rather than requiring per-bug client-side fetches.

Presigned URL generation is a local HMAC computation (not a network call to R2). For 50 bugs, generating 50 URLs adds negligible server-side latency. This eliminates N+1 API calls and keeps the client simple.

### 6.5 Separate Count Endpoint for Sidebar Badge

**Decision:** `GET /api/v1/bugs/count` returns `{ openCount, screenshotsEnabled }`.

The sidebar renders on every page. Loading all bugs into TanStack Query cache just for a badge count is wasteful. The count endpoint runs `SELECT count(*) FROM bugs WHERE account_id = $1 AND status = 'open'` -- fast, lightweight, cacheable with a 30-second stale time.

The `screenshotsEnabled` boolean is piggybacked onto this response so the AppShell always knows whether to show the screenshot paste area in the modal, without a separate config endpoint.

### 6.6 No New Dependencies

Zero new npm packages. Everything uses what is already installed:
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` -- existing in server, used by `r2.ts`
- `drizzle-orm` -- existing, used by all route files
- `zod` -- existing in `@forge-app/shared`
- `@tanstack/react-query` -- existing in client
- CSS Modules -- existing client styling pattern
- Clipboard API (`paste` event, `clipboardData.items`) -- browser built-in

---

## 7. File Classification and Change Impact

| File | Classification | Notes |
|------|---------------|-------|
| `server/src/db/schema.ts` | **Extend** | Append `bugs` table definition at the end. No existing code touched. |
| `server/src/db/migrations/0004_bug_reporter.sql` | **New** | New migration file. |
| `server/src/routes/bugs.ts` | **New** | New route file with 6 endpoints. |
| `server/src/index.ts` | **Extend** | Add import + `app.use` line. Two lines total. |
| `shared/src/validation.ts` | **Extend** | Append 3 new schemas. No existing schemas changed. |
| `shared/src/types.ts` | **Extend** | Append `BugStatus`, `Bug`, `BugListItem` types. No existing types changed. |
| `client/src/lib/api.ts` | **Extend** | Add 6 new methods to the `api` object. No existing methods changed. |
| `client/src/components/bugs/BugReportModal.tsx` | **New** | Modal component with clipboard paste handling. |
| `client/src/components/bugs/BugReportModal.module.css` | **New** | Modal styles + floating button styles. |
| `client/src/components/bugs/BugReportButton.tsx` | **New** | Floating action button. |
| `client/src/routes/BugsPage.tsx` | **New** | Bug list page with expand/collapse, resolve/reopen. |
| `client/src/routes/BugsPage.module.css` | **New** | Bug list styles. |
| `client/src/components/layout/AppShell.tsx` | **Modify** | Add keyboard shortcut listener, bug modal state, render BugReportButton + BugReportModal. Adds ~20 lines to the existing 76-line file. Existing code paths (sidebar collapse, mobile menu) are completely untouched. |
| `client/src/components/layout/Sidebar.tsx` | **Modify** | Add "Bugs" NavLink with count badge query. Adds ~25 lines. Existing nav items untouched. |
| `client/src/App.tsx` | **Extend** | Add one `<Route>` element and one import. Two lines. |

**No Restructure-classified files.** All changes are additive or small modifications that do not alter existing code paths. No early QA notification needed.

---

## 8. API Contract (Alice + Jonah align on this)

```
POST /api/v1/bugs
  Request:  { description: string; screenshotR2Key?: string | null; pageUrl?: string | null }
  Response: { data: Bug }

GET /api/v1/bugs
  Response: { data: BugListItem[]; meta: { openCount: number; screenshotsEnabled: boolean } }

GET /api/v1/bugs/count
  Response: { data: { openCount: number; screenshotsEnabled: boolean } }

PATCH /api/v1/bugs/:id
  Request:  { status: 'open' | 'resolved' }
  Response: { data: Bug }

POST /api/v1/bugs/screenshot/presign
  Request:  { filename: string; mimeType: 'image/png' | 'image/jpeg'; sizeBytes: number }
  Response: { data: { uploadUrl: string; r2Key: string } }

GET /api/v1/bugs/:id/screenshot-url
  Response: { data: { url: string } }
```

---

## 9. Implementation Notes

### For Jonah (BE)

1. Create `server/src/routes/bugs.ts` following the structure of `uploads.ts` -- same Router pattern, try/catch/next error handling, Zod safeParse validation.
2. The `GET /api/v1/bugs` endpoint needs a LEFT JOIN on `users` (for reporter info). Use the same join pattern as other routes. Generate presigned download URLs for each bug's `screenshotR2Key` using `getPresignedDownloadUrl` from `r2.ts`. If R2 is not configured (`!isR2Configured()`), set all `screenshotUrl` to null and `meta.screenshotsEnabled` to false.
3. Define `GET /api/v1/bugs/count` BEFORE any `/:id` routes in the router to prevent Express from matching "count" as a UUID parameter.
4. For the presign endpoint, the R2 key format is `{req.accountId}/bugs/{randomUUID()}-{filename}`. Return both the upload URL and the key in the response.
5. Add the `bugs` export to `schema.ts` and schemas to `validation.ts` in the shared package.
6. Account scoping: every query must filter by `req.accountId`. The PATCH endpoint must verify the bug belongs to the requesting account before updating.

### For Alice (FE)

1. Copy the `FieldModal` overlay/modal/header/body structure for `BugReportModal`. Same CSS patterns, same `useFocusTrap` hook, same accessibility attributes.
2. Clipboard paste listener: attach to `modalRef.current`, not `window`. Only intercept `image/*` items. Let text pastes pass through to the description textarea naturally.
3. The floating button uses `z-index: 40`; the modal overlay uses `z-index: 50`.
4. In `AppShell.tsx`, the keyboard listener and state sit alongside the existing mobile menu state. The modal and button render outside the `.shell` div in a fragment wrapper.
5. Create a `useBugCount` hook that wraps the `useQuery(['bugs', 'count'])` call. This keeps Sidebar clean and makes the query reusable by AppShell.
6. Screenshot preview: use `object-fit: contain` with a `max-height` of ~200px so it does not dominate the modal.
7. Success state: after submission, replace the form content with "Bug reported!" and a checkmark for 1.5 seconds, then call `onClose()`.
8. Invalidate `['bugs']` and `['bugs', 'count']` queries after successful submission so the sidebar badge and bug list update.

---

## 10. Testing Notes for Enzo

- **Happy path:** Keyboard shortcut (Cmd+Shift+K) opens modal, paste screenshot, type description, submit. Verify bug appears in bug list with screenshot thumbnail.
- **Description only:** Submit without pasting a screenshot. Verify it works cleanly.
- **R2 not configured:** Remove R2 env vars. Verify screenshot paste area is hidden. Verify description-only submission works.
- **Oversize screenshot:** Paste a >5 MB image. Verify inline error appears and no upload attempt is made.
- **Resolve/reopen:** Toggle a bug's status. Verify optimistic update (immediate visual change). Refresh page and verify the server state matches.
- **Sidebar badge:** File a new bug -- badge count should increment. Resolve it -- badge should decrement. When count is 0, badge should be hidden.
- **Escape to close:** Verify modal closes on Escape. Verify it does NOT close during an active submission.
- **Backdrop click:** Verify modal closes when clicking the backdrop overlay.
- **Text paste in description:** With modal open and description textarea focused, paste text. Verify it goes into the textarea as normal text (no screenshot capture).
- **Floating button:** Visible on all pages. Tooltip shows shortcut. Click opens the modal.
- **Account scoping:** Verify bugs from one account are not visible to another (if multi-account testing is available).
- **Upload timeout:** Simulate slow network. Verify 15-second timeout triggers error message.
- **Page URL capture:** Report a bug from different pages (homepage, roadmap detail, fields). Verify the `pageUrl` field captures the correct route.
