# Roadmap Tool v1.1 Sprint C -- Collaboration & Data

**Author:** Thomas (PM)
**Date:** February 13, 2026
**Status:** Ready for pipeline
**Project ID:** `roadmap-tool`
**Sprint goal:** Add collaboration depth (comments, activity log) and data utility (CSV import/export, fiscal year display). These features transform the roadmap tool from a planning surface into a collaborative workspace with data portability.

---

## 1. Sprint Context

### Where we are

Sprint B shipped: link items / dependencies (RT-24), sub-items (RT-26), and key dates (RT-27). Items are now rich, structured nodes with relationships, hierarchy, and internal milestones. What the tool lacks is communication -- there is no way to discuss an item without leaving the product. There is also no way to get data in or out in bulk, and fiscal year display (a common enterprise need) is stubbed but not wired up.

### Why these three features together

RT-28 (comments), RT-29 (CSV), and RT-31 (fiscal year) are the "collaboration & data" bundle. They share:

- **Low interdependency:** All three are self-contained features that do not depend on each other. They can be built and tested independently.
- **Item Card real estate:** Comments and CSV import both surface in the Item Card or toolbar, filling out remaining blank tabs and empty toolbar slots.
- **Account-level config:** Fiscal year is an account setting that affects timeline rendering. It has zero overlap with comments or CSV but rides along as low-effort scope.

Shipping them together means one pipeline cycle for three features that collectively move the product from "planning tool" to "team workspace."

### What's deferred

| ID | Feature | Phase | Why deferred |
|----|---------|-------|--------------|
| RT-32 | Portfolio roadmaps | Sprint D (v2.0) | Multi-roadmap roll-up. Major scope. |
| RT-33 | Collections / folders | Sprint D (v2.0) | Organizational UI. |
| RT-34 | Buckets (no-date mode) | Sprint D (v2.0) | Fundamental data model change. |
| RT-35 | Templates | Sprint D (v2.0) | Content + UI for onboarding. |

### What's explicitly NOT in Sprint C scope

- **Rich text comments** (bold, links, images) -- plain text only in v1. Revisit in v2.0.
- **File attachments on comments** -- the `attachments` table exists but we are not wiring comment-level attachments. Items already have attachment support.
- **@mention notifications outside the app** (email, push) -- mentions highlight in the comment thread and appear in the activity log. No email/push delivery in v1. This is infrastructure work that belongs in a dedicated notifications sprint.
- **Threaded/nested comment replies** -- flat comment list, newest first. Threading adds significant UI complexity for marginal v1 value.
- **Scheduled CSV exports** -- manual export only. Scheduled exports need a job queue.
- **CSV import of sub-items, links, or key dates** -- import creates flat items with field values only. Relationships are too complex to map from CSV reliably.
- **Fiscal year affecting date pickers or date storage** -- display-only. All dates remain calendar dates in the database. Fiscal year only changes Timeline axis labels.
- **Fiscal year on Swimlane date columns** -- Timeline only. Swimlane date columns use calendar labels.

---

## 2. Scope

### In scope

1. **RT-28: Comments and activity log** -- Plain-text comments on items with @mentions of roadmap collaborators. Unified activity log combining comments and system events. Real-time WebSocket push.
2. **RT-29: CSV import/export** -- Import items from a CSV file with interactive column-to-field mapping. Export all roadmap items to CSV.
3. **RT-31: Fiscal year display** -- Account-level fiscal year start month setting. Timeline time axis labels display fiscal periods (e.g., "FY26 Q1" instead of "Q1 2026").

### Out of scope

See "What's explicitly NOT in Sprint C scope" above.

---

## 3. User Stories

### 3.1 RT-28: Comments and Activity Log

**US-28: Comment on items and view activity history**
As a user, I can add comments to an item and see a unified activity feed so my team can discuss items in context without leaving the roadmap tool.

#### Data model

**Comments table (new):**
- `id` -- UUID primary key
- `item_id` -- FK to items, cascade delete
- `user_id` -- FK to users (the commenter)
- `body` -- TEXT, plain text, max 5000 characters
- `mentions` -- JSONB, array of user IDs mentioned (e.g., `["uuid-1", "uuid-2"]`). Denormalized for fast lookup.
- `created_at` -- TIMESTAMPTZ
- `updated_at` -- TIMESTAMPTZ (supports editing)

**Activity log:** The existing `item_activities` table already tracks `created`, `updated`, `field_changed`, and `deleted` actions. Sprint C expands it:
- Add new action types: `commented`, `comment_edited`, `comment_deleted`, `linked`, `unlinked`, `sub_item_added`, `sub_item_removed`, `key_date_added`, `key_date_removed`.
- The `details` JSONB column carries context (e.g., for `commented`: `{ commentId, preview }` where preview is first 100 chars; for `linked`: `{ targetItemId, targetItemName, linkType }`).
- No schema change needed -- `item_activities.action` is already a TEXT column with no CHECK constraint. We simply insert new action values.

**@mentions scope:** Mentionable users are the roadmap's collaborators: the roadmap owner plus all users in `roadmap_shares` for that roadmap. The mention picker queries this set. In accounts with Clerk orgs, this could eventually expand to all org members, but for v1 we scope to roadmap-level collaborators only.

#### Acceptance criteria

**Commenting:**
- [ ] The Item Card has an "Activity" tab (replaces the existing activity section in getItem response with a dedicated tab).
- [ ] The Activity tab shows a unified feed: comments interleaved with system activity entries, ordered by `created_at` descending (newest first).
- [ ] At the top of the Activity tab is a comment input: a plain-text textarea with a "Comment" submit button.
- [ ] Comments support @mentions: typing `@` in the textarea opens a popover listing roadmap collaborators (owner + shared users). Selecting a user inserts `@Name` into the text. The mention is stored as a user ID in the `mentions` JSONB array.
- [ ] @mentioned user names are rendered as highlighted spans (`--primary-100` background, `--primary-700` text) in the comment body.
- [ ] Comments display: user avatar, user name, relative timestamp ("2 hours ago"), comment body. Each comment has an overflow menu (three-dot icon, visible on hover) with: Edit, Delete. Only the comment author (or roadmap owner) sees Edit and Delete.
- [ ] Editing a comment replaces the body in-place. An "(edited)" label appears next to the timestamp after editing.
- [ ] Deleting a comment shows a confirmation: "Delete this comment?" On confirm, the comment is removed from the feed.
- [ ] Maximum comment length: 5000 characters. The textarea shows a character count when the user has typed 4500+ characters.

**Activity log entries:**
- [ ] System events render as compact, single-line entries with a small icon, user name, action description, and timestamp. Examples:
  - "Alice created this item" (action: `created`)
  - "Bob changed Status from 'Planned' to 'In Progress'" (action: `field_changed`)
  - "Carol linked this item to 'Backend API' (blocks)" (action: `linked`)
  - "Dave added sub-item 'Design mockups'" (action: `sub_item_added`)
  - "Eve added key date 'Launch: Mar 15'" (action: `key_date_added`)
- [ ] System events are visually distinct from comments (smaller text, muted color, no avatar -- just an icon).
- [ ] The Activity tab loads the 50 most recent entries on open. A "Load more" button at the bottom fetches the next 50 (paginated).

**Real-time:**
- [ ] New comments from other users appear in the Activity tab in real time via WebSocket.
- [ ] Comment edits and deletions broadcast in real time.
- [ ] System activity entries (e.g., another user updating a field) also appear in real time if the Item Card is open.

**API:**
- [ ] `POST /api/v1/roadmaps/:roadmapId/items/:itemId/comments` -- Create a comment. Body: `{ body, mentions }`.
- [ ] `GET /api/v1/roadmaps/:roadmapId/items/:itemId/comments` -- List comments for an item. Paginated: `?page=1&perPage=50`. Returns comments with user info (name, avatar).
- [ ] `PATCH /api/v1/comments/:id` -- Edit a comment. Body: `{ body, mentions }`. Only the author or roadmap owner can edit.
- [ ] `DELETE /api/v1/comments/:id` -- Delete a comment. Only the author or roadmap owner can delete.
- [ ] `GET /api/v1/roadmaps/:roadmapId/items/:itemId/activity` -- Unified activity feed (comments + system events). Paginated: `?page=1&perPage=50`. Returns interleaved, sorted by `created_at` desc.
- [ ] `GET /api/v1/roadmaps/:roadmapId/collaborators` -- List mentionable users (owner + shared users). Returns `{ data: User[] }`.

#### Interaction states

**Loading & Async:**
- [ ] While the Activity tab loads, show a skeleton placeholder (3-4 gray bars mimicking comment shapes).
- [ ] The "Comment" button shows a spinner and is disabled while the comment is being submitted.
- [ ] On success, the new comment appears at the top of the feed and the textarea clears.
- [ ] On success, focus returns to the textarea for quick follow-up comments.

**Error:**
- [ ] If comment submission fails, show inline error below the textarea: "Failed to post comment. Try again."
- [ ] The user's text is preserved in the textarea on error.
- [ ] If editing a comment fails, show inline error: "Failed to save edit. Try again." The original text is restored.
- [ ] If loading the activity feed fails, show: "Could not load activity. Retry." with a retry link.

**Disabled:**
- [ ] The comment textarea and submit button are disabled for viewer-role users (tooltip: "You don't have permission to comment").
- [ ] Edit and Delete menu items are hidden for users who are not the comment author or roadmap owner.

**Empty:**
- [ ] When no activity exists: "No activity yet. Comments and changes will appear here."

**Optimistic updates:**
- [ ] Comment submission is optimistic: the comment appears immediately at the top of the feed with a subtle pending indicator (muted text). On server confirmation, the indicator disappears. On rejection, the comment is removed with a toast: "Failed to post comment."

**Timeout & Connectivity:**
- [ ] If the activity feed request times out, show: "Loading took too long. Retry."

---

### 3.2 RT-29: CSV Import/Export

**US-29: Import and export items via CSV**
As a user, I can import items from a CSV file and export my roadmap's items to CSV so I can move data between tools and share plans with stakeholders who don't use the app.

#### Import flow

The import is a multi-step wizard in a modal dialog:

**Step 1 -- Upload:**
- [ ] A toolbar button "Import CSV" opens the import modal.
- [ ] The modal shows a file drop zone ("Drag a CSV file here or click to browse"). Accepted: `.csv` files, max 5MB.
- [ ] On file selection, the client parses the CSV client-side (using a lightweight CSV parser library -- no server upload for parsing).
- [ ] If parsing fails (malformed CSV), show inline error: "This file could not be parsed as CSV. Check the format and try again."
- [ ] The first row is treated as headers by default. A toggle allows "First row is data" (no headers) -- in that case, columns are named "Column 1", "Column 2", etc.

**Step 2 -- Column mapping:**
- [ ] After parsing, the modal shows a mapping table:
  - Left column: CSV column headers (from the file).
  - Right column: a dropdown to map each CSV column to a roadmap field: Name (required), Description, Start Date, End Date, or any custom field defined on the roadmap.
  - An "Ignore" option in each dropdown to skip that CSV column.
- [ ] The mapper auto-maps columns with matching names (case-insensitive). E.g., a CSV column "Name" auto-maps to the Name field. "Start Date" or "start_date" auto-maps to Start Date.
- [ ] The Name field must be mapped to exactly one CSV column. If not mapped, the "Next" button is disabled with a tooltip: "The Name field must be mapped."
- [ ] Date columns (Start Date, End Date, custom date fields) accept these formats: `YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`, `M/D/YYYY`. The parser attempts auto-detection. If a date value cannot be parsed, it is treated as null for that row.
- [ ] For list/multi_select fields: if the CSV value matches an existing field value name (case-insensitive), it maps to that value. If it does not match, the value is ignored (not auto-created). A warning count shows how many values could not be matched.
- [ ] For numeric fields: values are parsed as numbers. Non-numeric values are treated as null.
- [ ] For text fields: values are used as-is.
- [ ] For team_member fields: CSV values are matched against user email or name in the roadmap's collaborator list. Unmatched values are ignored.

**Step 3 -- Preview:**
- [ ] After mapping, the modal shows a preview table of the first 10 rows as they will be imported.
- [ ] Each row shows the mapped field values. Cells with parsing issues (unparseable dates, unmatched list values) are highlighted in `--warning-100` with a small warning icon.
- [ ] A summary line at the bottom: "Ready to import N items. M warnings (values that could not be mapped)."
- [ ] Warnings do not block import -- the user can proceed. Unmatched values simply become null.

**Step 4 -- Confirm and import:**
- [ ] A "Import N Items" button triggers the import.
- [ ] Import creates items via the existing bulk create API (or a new batch endpoint).
- [ ] All imported items are created as top-level items (no parent). Sort order is assigned sequentially.
- [ ] On success, the modal closes and a toast shows: "Imported N items successfully."
- [ ] On partial failure (some rows fail validation), a summary shows: "Imported X of Y items. Z items failed due to validation errors."

#### Export flow

- [ ] A toolbar button "Export CSV" triggers an immediate download.
- [ ] The export includes all items in the current roadmap (respecting any active filters on the current view).
- [ ] CSV columns: Name, Description, Start Date, End Date, Parent (parent item name or empty), and one column per custom field on the roadmap.
- [ ] Date values export as `YYYY-MM-DD`.
- [ ] List/multi_select field values export as the value name(s). Multi-select values are semicolon-separated (e.g., "Value A; Value B").
- [ ] Numeric fields export as plain numbers.
- [ ] Team member fields export as the user's name.
- [ ] The file is named `{roadmap-name}-{YYYY-MM-DD}.csv`.
- [ ] Export is generated entirely client-side from the already-loaded items data. No server endpoint needed.

#### Acceptance criteria

**Import:**
- [ ] Upload accepts CSV files up to 5MB.
- [ ] Column mapping UI correctly auto-maps common field names.
- [ ] Preview shows first 10 rows with warning highlights.
- [ ] Import creates items with correct field values.
- [ ] Date formats are auto-detected and parsed.
- [ ] Unmatched list values, unparseable dates, and non-numeric values gracefully degrade to null.

**Export:**
- [ ] Export downloads a valid CSV file with all items and field values.
- [ ] Export respects active view filters.
- [ ] Multi-select values are semicolon-separated.
- [ ] File name follows the `{roadmap-name}-{YYYY-MM-DD}.csv` convention.

**API:**
- [ ] `POST /api/v1/roadmaps/:roadmapId/items/import` -- Batch create items. Body: `{ items: CreateItemInput[] }`. Each item can include `fieldValues` to be set. Returns `{ created: number, failed: number, errors: { row: number, message: string }[] }`.
- [ ] The batch endpoint enforces the existing per-roadmap item limit (if any) and validates each item individually.

#### Interaction states

**Loading & Async:**
- [ ] During CSV parsing (Step 1 to Step 2 transition), show a brief spinner: "Parsing file..."
- [ ] During import (Step 4), show a progress bar with percentage based on batch progress. The "Import" button is disabled.
- [ ] On success, the modal closes and a success toast appears.
- [ ] Focus returns to the toolbar after the modal closes.

**Error:**
- [ ] If the file is not a valid CSV, show: "This file could not be parsed as CSV. Check the format and try again."
- [ ] If the file exceeds 5MB, show: "File too large. Maximum size is 5MB."
- [ ] If the import API fails, show: "Import failed. Please try again." The user's mapping is preserved so they can retry.
- [ ] If individual rows fail validation, show the count and allow the user to dismiss: "X items could not be imported due to validation errors."

**Disabled:**
- [ ] The "Import CSV" button is disabled for viewer-role users.
- [ ] The "Next" button in Step 2 is disabled until the Name field is mapped.

**Empty:**
- [ ] If the CSV file has no data rows (only headers), show: "This file has no data rows to import."

**Optimistic updates:**
- [ ] N/A -- import waits for server confirmation before reflecting in the item list.

---

### 3.3 RT-31: Fiscal Year Display

**US-31: Configure fiscal year to see timeline in fiscal periods**
As a user, I can set my account's fiscal year start month so the Timeline displays fiscal period labels (e.g., "FY26 Q1") instead of calendar quarters.

#### Setting location

- [ ] Fiscal year is an **account-level** setting (not per-roadmap). It affects all roadmaps in the account.
- [ ] The setting lives in the Account Settings page (existing page, new section).
- [ ] The setting UI: a labeled dropdown "Fiscal year starts in" with 12 month options (January through December). Default: January (which means fiscal year = calendar year).
- [ ] The setting is stored in the existing `accounts.fiscal_year_end` column. **However**, the current column stores the fiscal year _end_ month (defaulting to 12 = December). The PM decision: we keep the existing column but relabel the UI to "Fiscal year starts in" and convert: if the user selects "February" (start month = 2), we store `fiscal_year_end = 1` (January). If they select "January" (start month = 1), we store `fiscal_year_end = 12` (December). This avoids a schema change.
  - Conversion formula: `fiscal_year_end = (start_month - 2 + 12) % 12 + 1` (i.e., the month before the start month, wrapping December to 12).
  - Or more simply: `fiscal_year_end = start_month === 1 ? 12 : start_month - 1`.
- [ ] On save, the setting applies immediately to all open Timeline views for all users in the account (broadcast via WebSocket to account room).

#### Timeline rendering changes

**When fiscal year start is NOT January (i.e., fiscal year differs from calendar year):**

- [ ] **Quarters time scale:** Column headers change from "Q1 2026" to "FY26 Q1". Quarters are renumbered relative to the fiscal year start. If fiscal year starts in April: Apr-Jun = FY Q1, Jul-Sep = FY Q2, Oct-Dec = FY Q3, Jan-Mar = FY Q4.
- [ ] **Halves time scale:** Column headers change from "H1 2026" to "FY26 H1". Halves renumber similarly: first 6 months from fiscal start = H1, next 6 = H2.
- [ ] **Years time scale:** Column headers change from "2026" to "FY2026". The fiscal year label applies to the year in which the fiscal year _starts_. If fiscal year starts in April 2026, the period Apr 2026 - Mar 2027 is "FY2026."
- [ ] **Months time scale:** No change. Months are always calendar months ("Jan", "Feb", etc.). No fiscal relabeling at the month level.
- [ ] **Weeks time scale:** No change. Weeks are always calendar weeks.

**When fiscal year start IS January:** All labels display as calendar (current behavior). No "FY" prefix.

**Important: display-only.** Fiscal year settings do not change:
- How dates are stored (always calendar dates in the database).
- How date pickers work (always show calendar dates).
- How date columns appear in Table View (always calendar dates).
- How CSV export formats dates (always `YYYY-MM-DD`).
- How filtering on dates works (always calendar dates).

The fiscal year setting ONLY affects the Timeline time axis (the top-level column headers for quarters, halves, and years scales).

#### API

- [ ] `PATCH /api/v1/account` -- Update account settings. Body can include `{ fiscalYearEnd: number }`. This endpoint likely already exists for account name updates; it needs to accept `fiscalYearEnd` if it doesn't already.
- [ ] `GET /api/v1/account` -- Returns account details including `fiscalYearEnd`. The client converts this to a start month for display.
- [ ] The `fiscalYearEnd` value is included in the client's account context (loaded at app init). Timeline views read from this context to determine label formatting.

#### Acceptance criteria

- [ ] Account settings page shows fiscal year dropdown with 12 month options.
- [ ] Selecting a month and saving updates the `fiscal_year_end` column.
- [ ] Timeline Quarters scale shows "FY26 Q1" labels when fiscal year differs from calendar year.
- [ ] Timeline Halves scale shows "FY26 H1" labels when fiscal year differs from calendar year.
- [ ] Timeline Years scale shows "FY2026" labels when fiscal year differs from calendar year.
- [ ] Timeline Months and Weeks scales are unaffected by fiscal year setting.
- [ ] When fiscal year starts in January, no "FY" prefix appears (behaves as current).
- [ ] Date pickers, Table View dates, CSV dates, and filters are unaffected.
- [ ] Setting change broadcasts via WebSocket and updates open Timeline views for all account users.

#### Interaction states

**Loading & Async:**
- [ ] When saving the fiscal year setting, the save button shows a spinner until the server confirms.
- [ ] On success, a brief toast: "Fiscal year updated."
- [ ] N/A for focus management -- standard settings page pattern.

**Error:**
- [ ] If saving fails, show inline error in the settings form: "Failed to save fiscal year setting. Try again."

**Disabled:**
- [ ] Only account admins can change the fiscal year setting. Non-admin users see the current value as read-only text (no dropdown).

**Empty:**
- [ ] N/A -- fiscal year always has a value (defaults to January = calendar year).

**Optimistic updates:**
- [ ] N/A -- wait for server confirmation before updating Timeline labels.

---

## 4. Technical Constraints

| Constraint | Value | Notes |
|-----------|-------|-------|
| Max comment length | 5000 chars | Enforced in API validation. |
| Max comments per item | Unlimited | Paginated (50 per page), no artificial cap. |
| Activity feed page size | 50 entries | Paginated. "Load more" fetches next page. |
| Mentions per comment | 20 max | Prevent spam. Enforced in API. |
| CSV file size limit | 5MB | Client-side check before parsing. |
| CSV max rows | 1000 items | Prevent massive imports that choke the API. Enforced in the preview step. |
| CSV parsing | Client-side | Use a library like PapaParse. No server-side parsing. |
| CSV export | Client-side | Generated from loaded items data. No server endpoint. |
| Date format detection | 4 formats | `YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`, `M/D/YYYY`. Auto-detect per column. |
| Fiscal year storage | Existing column | `accounts.fiscal_year_end` (integer 1-12). No schema change. |
| Fiscal year scope | Timeline axis only | Does not affect date storage, date pickers, Table View, CSV, or filters. |
| Schema migration | Additive only | New `comments` table. No changes to existing tables. |
| Batch import endpoint | Max 1000 items per request | Matches CSV max rows constraint. |

---

## 5. Database Schema Changes

One new table for comments. No changes to existing tables.

```sql
-- RT-28: Comments
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
CREATE INDEX idx_comments_created ON comments(item_id, created_at DESC);
```

The `item_activities` table requires no schema changes -- it already has a flexible `action` TEXT column and `details` JSONB column. We simply insert new action values.

The `accounts` table already has the `fiscal_year_end` column (integer, defaults to 12). No schema change needed.

---

## 6. Dependencies Between Stories

```
RT-28 (Comments) -- fully independent. New table, new API, new UI tab.
RT-29 (CSV import/export) -- fully independent. Client-side parsing + new batch endpoint.
RT-31 (Fiscal year) -- fully independent. Existing column + Timeline rendering change.

No cross-dependencies between the three features.
```

All three features touch different parts of the codebase:
- RT-28 touches: Item Card (new Activity tab), backend (comments CRUD + activity log expansion), WebSocket (new events)
- RT-29 touches: Toolbar (import/export buttons), a new modal (import wizard), client-side CSV logic, backend (batch import endpoint)
- RT-31 touches: Account Settings page (fiscal year dropdown), Timeline time axis rendering (label formatting), account API

Because they are independent, backend work for all three can happen in parallel if needed.

---

## 7. Pipeline Recommendation

This is a **full-stack sprint**. One new table, three new UI surfaces, timeline rendering changes.

**Recommended pipeline:**

1. **Andrei (Arch)** -- Needed. Comments table design, batch import API design, fiscal year rendering strategy (how the Timeline label computation changes), WebSocket event design for comments and account settings broadcasts. Write a Sprint C tech approach addendum.

2. After Andrei, run in parallel:
   - **Robert (Designer)** -- Design addendum for:
     - Item Card Activity tab (comment list, comment input with @mention picker, system event entries, load more)
     - CSV import modal (4-step wizard: upload, map, preview, confirm)
     - CSV export button placement
     - Account Settings fiscal year dropdown section
     - Timeline axis labels with "FY" prefix
   - **Jonah (BE)** -- Backend implementation:
     - Comments CRUD API + expanded activity logging
     - Batch import endpoint
     - Account settings endpoint (fiscal year)
     - WebSocket events for comments and account setting changes
     - Collaborators list endpoint
   - **Priya (Marketer)** -- Not needed this sprint (internal feature depth)

3. **Alice (FE)** -- Frontend implementation after Robert's design spec AND Jonah's API are ready:
   - Item Card: Activity tab with comments and activity feed
   - @mention picker component
   - CSV import wizard modal
   - CSV export (client-side generation)
   - Account Settings: fiscal year dropdown
   - Timeline: fiscal year-aware label formatting

4. **Robert (Designer)** -- Lightweight design review.

5. **Enzo (QA)** -- Release gate. Focus areas in section 9.

**Agents NOT needed:**
- Sam (BE-2) -- Jonah can handle this scope solo. Three focused sets of endpoints.
- Nina/Soren/Amara -- No complex animations, responsive patterns, or a11y patterns beyond existing components.
- Derek/Milo/Howard -- No integrations, infra, or payment changes.
- Nadia -- Defer docs; batch with post-Sprint C documentation.
- Priya -- No external-facing messaging needed.
- Zara/Leo -- No mobile changes.

**Early QA notification:** No files are classified as Restructure. All changes are additive (new table, new routes, new UI components, label formatting change). However, Enzo should be aware that the Timeline label rendering change (RT-31) needs regression testing across all time scales to verify existing calendar labels still work correctly when fiscal year is January.

---

## 8. Acceptance Test Summary

| Feature | Happy path test | Key edge cases |
|---------|----------------|----------------|
| **Comments -- create** | Add a comment -> appears in Activity tab | Empty body (rejected), 5001+ chars (rejected), @mention with valid user, @mention with deleted user |
| **Comments -- edit** | Edit own comment -> text updates, "(edited)" label appears | Edit by non-author (rejected unless roadmap owner), edit while another user is viewing |
| **Comments -- delete** | Delete own comment -> removed from feed | Delete by non-author (rejected unless roadmap owner), delete comment that was @mentioned in another context |
| **Comments -- real-time** | User A comments -> appears on User B's open Activity tab | WebSocket disconnect during comment (shows on reconnect), rapid comments from multiple users |
| **Activity log** | Create item, change field, add comment -> all three appear in order | Pagination (51+ entries trigger "Load more"), activity for deleted linked items, sub-item activity on parent's log |
| **CSV import -- upload** | Upload valid CSV -> parser shows column mapping | Malformed CSV (error), file too large (error), empty file (error), file with no data rows |
| **CSV import -- mapping** | Map "Name" column -> auto-maps, proceed | Missing Name mapping (blocked), date format detection (MM/DD/YYYY), unmatched list values (warning) |
| **CSV import -- preview** | Preview shows 10 rows with correct values | Rows with parsing warnings (yellow highlight), CSV with 1001+ rows (truncate warning) |
| **CSV import -- confirm** | Import 50 items -> toast confirms, items appear in Table | Partial failure (some rows invalid), import with custom field values, duplicate names (allowed) |
| **CSV export** | Export -> downloads CSV with all items and fields | Export with filters active (only filtered items), multi-select values (semicolon-separated), items with no dates (empty cells) |
| **Fiscal year -- setting** | Set fiscal year start to April -> Timeline shows "FY26 Q1" for Apr-Jun | January start (no FY prefix, calendar behavior), December start (FY Q1 is December only? No -- Q1 is Dec-Feb), setting change broadcasts to other users |
| **Fiscal year -- Timeline** | Quarters scale with April start -> Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar | Halves with July start -> H1=Jul-Dec, H2=Jan-Jun. Years with October start -> FY2026=Oct 2026-Sep 2027. Month scale (unchanged). Week scale (unchanged). |
| **Permissions** | Viewer cannot comment, import, or change fiscal year | Editor can comment and import but not change fiscal year (admin only) |

---

## 9. Sprint Sequencing (Full v1.1 Roadmap)

| Sprint | Items | Theme | Status |
|--------|-------|-------|--------|
| **Sprint A** | RT-19, RT-25, RT-30 | Stakeholder & daily use | Shipped |
| **Sprint B** | RT-24, RT-26, RT-27 | Item depth (dependencies, sub-items, key dates) | Shipped |
| **Sprint C (this sprint)** | RT-28, RT-29, RT-31 | Collaboration & data (comments, CSV, fiscal year) | Ready for pipeline |
| **Sprint D (v2.0)** | RT-32, RT-33, RT-34, RT-35 | Portfolio & scale | Planned |

---

*Requirements written by Thomas (PM). Andrei: read this for the Sprint C tech approach addendum -- focus on comments table, batch import API, fiscal year rendering approach, and WebSocket events. Robert: read this + Andrei's addendum for the design pass. Jonah: read this + Andrei's addendum for the backend build. Alice: read all three for implementation. Enzo: use section 8 as your test plan starting point.*
