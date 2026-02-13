# Bug Reporter Requirements

**Project:** bug-reporter
**Status:** In Progress
**Author:** Thomas (PM)
**Date:** 2026-02-13

## Summary

A lightweight in-app bug reporter for Forge (the roadmap tool) that lets users capture and submit bugs with clipboard-pasted screenshots. The core loop: keyboard shortcut, paste screenshot, type description, submit. Zero friction, under 10 seconds.

## Problem

When the CEO encounters a bug in Forge, there's no fast path from "I see a bug" to "it's recorded." Taking a screenshot, switching to another app, writing up the issue -- that context-switching kills momentum and bugs get lost or go unreported.

## Scope

### In Scope (v1)

1. **Bug report modal** -- triggered by keyboard shortcut or a persistent floating button
2. **Clipboard paste for screenshots** -- user takes screenshot with OS tools (Cmd+Shift+4), pastes into the modal via Cmd+V
3. **Description text field** -- free-text bug description (required)
4. **Screenshot upload to Cloudflare R2** -- uses the existing R2 integration already in Forge
5. **Bug persistence in Postgres** -- new `bugs` table, account-scoped, follows existing Drizzle/schema patterns
6. **Bug list page** -- sidebar nav entry, list of reported bugs, resolve/reopen toggle
7. **Auto-captured page context** -- current URL/route captured automatically when modal opens

### Deferred (not v1)

- Bug severity/priority fields
- Assignment to team members
- GitHub Issues sync
- Editing bugs after submission
- Multiple screenshots per bug
- Browser/viewport/user-agent auto-capture
- Bug categories or tags
- Email notifications on new bugs
- Voice recording or AI transcription (evaluated and rejected -- clipboard paste is faster and simpler)
- html2canvas auto-screenshot (evaluated and rejected -- does not render SVGs well, Forge is SVG-heavy)

## User Stories

### US-1: Report a bug via keyboard shortcut

**As** a Forge user, **I want** to hit a keyboard shortcut from anywhere in the app **so that** I can quickly report a bug without leaving my current context.

**Acceptance Criteria:**

- [ ] Keyboard shortcut opens the bug report modal from any page in Forge
- [ ] The modal opens as a centered overlay with a backdrop
- [ ] Pressing Escape closes the modal (if no submission is in progress)
- [ ] Clicking the backdrop closes the modal
- [ ] Focus is trapped inside the modal while open (use the existing `useFocusTrap` hook)
- [ ] The current page route (e.g., `/roadmaps/abc123`) is auto-captured and stored with the bug

**Open question for Andrei:** Cmd+Shift+B conflicts with Chrome's bookmarks bar toggle. Recommend evaluating alternative shortcuts or confirming the override is acceptable.

### US-2: Report a bug via floating button

**As** a Forge user, **I want** a persistent bug report button **so that** I can report bugs without remembering the keyboard shortcut.

**Acceptance Criteria:**

- [ ] A small, fixed-position "Report Bug" button is visible on every page (bottom-right corner, floating action style)
- [ ] Clicking the button opens the same bug report modal as the keyboard shortcut
- [ ] The button is unobtrusive -- small icon with minimal footprint, does not overlap with primary app content
- [ ] The button has a tooltip on hover showing the keyboard shortcut
- [ ] The button is rendered at the AppShell level so it appears on all authenticated pages

### US-3: Paste a screenshot into the bug report

**As** a user reporting a bug, **I want** to paste a screenshot from my clipboard into the modal **so that** I can visually document what I'm seeing without file upload dialogs.

**Acceptance Criteria:**

- [ ] The modal has a screenshot drop zone that says "Paste a screenshot (Cmd+V)" with a dashed border and paste icon
- [ ] When the user pastes (Cmd+V / Ctrl+V) while the modal is open, the clipboard image is captured via the paste event listener
- [ ] The pasted image is displayed as a preview thumbnail in the modal (replaces the drop zone)
- [ ] If the user pastes again, the new image replaces the previous one (single screenshot per bug)
- [ ] If the clipboard contains text (not an image), the paste event does not affect the screenshot area (normal text paste still works in the description field)
- [ ] A "Remove" button on the thumbnail clears the screenshot and re-shows the drop zone
- [ ] The screenshot is optional -- bugs can be submitted without one
- [ ] Maximum file size: 5 MB (show inline error if exceeded)
- [ ] Accepted formats: PNG, JPEG (OS screenshot tools produce PNG by default)

### US-4: Submit a bug report

**As** a user, **I want** to submit the bug with one click **so that** it's filed and I can get back to work.

**Acceptance Criteria:**

- [ ] Description field is required, max 5000 characters
- [ ] If a screenshot is attached, it is uploaded to R2 before the bug record is created (follow the existing presigned URL upload pattern from `uploads.ts`)
- [ ] The R2 key is stored on the bug record (not the full URL -- presigned download URLs are generated on read)
- [ ] The bug is created with status "open", the current user as reporter, and the auto-captured page URL
- [ ] On success: brief success indicator ("Bug reported!") for ~1.5 seconds, then modal closes
- [ ] The form resets after successful submission

### US-5: View and manage reported bugs

**As** a Forge user, **I want** to see a list of reported bugs **so that** I can review what's been filed and mark bugs as resolved.

**Acceptance Criteria:**

- [ ] A "Bugs" entry appears in the Sidebar navigation
- [ ] The bugs page lists all bugs for the current account, newest first
- [ ] Each bug entry shows: description (truncated to ~120 chars), screenshot thumbnail (if present), status badge (open/resolved), date reported, reporter name
- [ ] Clicking a bug entry expands it inline to show the full description and full-size screenshot (click screenshot to open full-size in new tab)
- [ ] A "Resolve" button marks a bug as resolved; a "Reopen" button reverses it
- [ ] Resolved bugs are visually dimmed but remain in the list
- [ ] The sidebar nav item shows a count badge for open bugs (hidden when count is 0)

#### Interaction States Checklist

**Loading & Async Operations:**
- [ ] Bug list shows skeleton placeholders while loading
- [ ] Resolve/reopen updates the UI optimistically (immediate visual change, reverts on error)
- [ ] Submit button in the modal shows "Submitting..." and is disabled during submission
- [ ] If screenshot upload takes longer than 15 seconds, timeout and show error

**Error States:**
- [ ] If bug list fails to load, show inline error with "Try again" button
- [ ] If resolve/reopen fails, revert the optimistic update and show a brief error toast
- [ ] If screenshot upload fails: "Screenshot upload failed. Submit without screenshot or try again."
- [ ] If bug creation API fails: "Failed to submit bug report. Please try again." -- preserve form inputs
- [ ] If pasted image exceeds 5 MB: "Screenshot too large (max 5 MB). Try a smaller selection."

**Disabled & Unavailable States:**
- [ ] Submit button disabled when description is empty
- [ ] Submit button disabled during submission
- [ ] If R2 is not configured, hide the screenshot paste area entirely (bugs can still be filed with description only)

**Empty & Zero States:**
- [ ] Bug list empty state: "No bugs reported yet. Use [shortcut] to report your first bug."
- [ ] Sidebar badge hidden when open bug count is 0
- [ ] Screenshot area before paste: dashed border with icon and "Paste a screenshot (Cmd+V)" text

**Form State:**
- [ ] Description field validated on submit (not on blur)
- [ ] Form clears after successful submission
- [ ] No unsaved changes warning (this is a quick-fire form, not a long editor)

**Timeout & Connectivity:**
- [ ] Screenshot upload timeout: 15 seconds. On timeout: "Upload timed out. Submit without screenshot or try again."
- [ ] Bug creation timeout: 10 seconds. On timeout: re-enable Submit button so user can retry

## Data Model

### `bugs` table (new, Drizzle + Postgres)

```typescript
export const bugs = pgTable('bugs', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  reportedBy: uuid('reported_by').notNull().references(() => users.id),
  description: text('description').notNull(),
  screenshotR2Key: text('screenshot_r2_key'),    // nullable -- R2 key if screenshot attached
  pageUrl: text('page_url'),                      // nullable -- route where bug was reported
  status: text('status').notNull().default('open'), // 'open' | 'resolved'
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_bugs_account').on(table.accountId),
  index('idx_bugs_status').on(table.accountId, table.status),
]);
```

### API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/bugs | Create a bug report | requireEditor |
| GET | /api/v1/bugs | List bugs for current account (newest first) | authenticated |
| PATCH | /api/v1/bugs/:id | Update bug status (resolve/reopen) | requireEditor |
| POST | /api/v1/bugs/screenshot/presign | Get presigned R2 upload URL for screenshot | requireEditor |
| GET | /api/v1/bugs/:id/screenshot-url | Get presigned R2 download URL for a bug's screenshot | authenticated |

### Validation Schemas (add to `@forge-app/shared` validation.ts)

```typescript
export const createBugSchema = z.object({
  description: z.string().min(1).max(5000),
  screenshotR2Key: z.string().nullable().optional(),
  pageUrl: z.string().max(500).nullable().optional(),
});

export const updateBugSchema = z.object({
  status: z.enum(['open', 'resolved']),
});

export const presignBugScreenshotSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024), // 5 MB
});
```

## Technical Constraints

- **R2 dependency:** Screenshot upload requires R2 to be configured. If R2 is not configured, the screenshot paste area should be hidden. Use the existing `isR2Configured()` check -- expose via a new GET /api/v1/config endpoint or simply have the client try and handle 503. Andrei decides the approach.
- **Presigned upload pattern:** Follow the existing pattern in `server/src/routes/uploads.ts` and `server/src/lib/r2.ts` -- generate presigned PUT URL server-side, client uploads directly to R2, then submits the bug with the R2 key.
- **Clipboard paste API:** Use the `paste` event on the modal container. Extract `clipboardData.items` of type `image/*`. Convert to File/Blob for upload. This works in all modern browsers.
- **Account scoping:** All bug queries MUST be scoped to `req.accountId` per the existing data isolation pattern.
- **DB migration:** New migration file required (0005 or similar). The `bugs` table is additive -- no changes to existing tables.
- **No new npm dependencies** required. Uses existing: `@aws-sdk/client-s3`, `drizzle-orm`, `zod`, `@tanstack/react-query`.
- **Performance:** Modal should open in <100ms. No lazy-loaded heavy dependencies. The bug reporter components are small and can be part of the main bundle.
- **Responsive:** Modal should work on tablet (768px+). Below 768px, Forge already shows a mobile fallback message, so mobile modal is out of scope.

## File Classification (for Andrei)

| File | Classification | Notes |
|------|---------------|-------|
| `server/src/db/schema.ts` | **Modify** | Add `bugs` table definition |
| `server/src/db/migrations/0005_*.sql` | **New** | Migration for bugs table |
| `server/src/routes/bugs.ts` | **New** | CRUD + presign endpoints for bugs |
| `server/src/index.ts` | **Modify** | Register bugs router |
| `shared/src/validation.ts` | **Modify** | Add bug validation schemas |
| `shared/src/types.ts` | **Modify** | Add Bug type export |
| `client/src/lib/api.ts` | **Modify** | Add bug API methods |
| `client/src/components/bugs/BugReportModal.tsx` | **New** | Modal with screenshot paste + description form |
| `client/src/components/bugs/BugReportModal.module.css` | **New** | Modal styles |
| `client/src/components/bugs/BugReportButton.tsx` | **New** | Floating action button |
| `client/src/routes/BugsPage.tsx` | **New** | Bug list page |
| `client/src/routes/BugsPage.module.css` | **New** | Bug list styles |
| `client/src/components/layout/AppShell.tsx` | **Modify** | Add BugReportButton + global keyboard shortcut |
| `client/src/components/layout/Sidebar.tsx` | **Modify** | Add Bugs nav entry with count badge |
| `client/src/App.tsx` | **Modify** | Add /bugs route |

**No Restructure-classified files.** All modifications are additive (new table, new route registration, new nav entry). No existing functionality is removed or significantly restructured.

## Pipeline Recommendation

1. **Andrei (Arch)** -- tech approach: keyboard shortcut choice, R2 config detection strategy, clipboard paste implementation details, migration approach. Read existing `uploads.ts` and `r2.ts` patterns.
2. **Robert (Designer)** -- design spec: modal layout, floating button, screenshot drop zone, bug list page, sidebar badge. Relatively small design surface.
3. **Alice (FE) + Jonah (BE)** -- parallel implementation after API contract alignment:
   - **Jonah:** bugs table, migration, routes, validation schemas
   - **Alice:** BugReportModal, BugReportButton, BugsPage, AppShell integration, sidebar badge
4. **Robert** -- lightweight design review of implementation
5. **Enzo (QA)** -- release gate

**Skip:** Suki (no market research), Marco (no tech research -- we know the stack), Kai (no AI integration), Nina/Soren/Amara (the modal is straightforward -- standard form + paste, no complex animations or responsive challenges), Derek (no third-party integrations), Milo (no infra changes), Howard (no payments), Zara/Leo (no mobile), Sam (Jonah handles BE alone -- it's one CRUD resource), Priya (internal tool), Nadia (internal tool, self-explanatory UI).

## Risks

1. **Keyboard shortcut conflict** with Chrome bookmarks bar toggle (Cmd+Shift+B). Andrei should evaluate and recommend.
2. **R2 not configured in dev** -- the screenshot feature is only available when R2 env vars are set. The modal should degrade gracefully (description-only mode).
3. **Large screenshots** from high-DPI displays -- a Retina full-screen screenshot can exceed 5 MB. The 5 MB cap may need adjustment, or we could add client-side image compression. Andrei decides.

## Success Metric

A bug can be reported in under 10 seconds: ~2s to take screenshot (Cmd+Shift+4), ~1s to trigger modal (keyboard shortcut), ~1s to paste, ~3s to type description, ~1s to submit.
