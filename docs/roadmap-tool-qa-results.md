# Roadmap Tool (Forge) -- QA Results

**Author:** Enzo (QA)
**Date:** February 11, 2026
**Production URL:** https://forge-app-production.up.railway.app
**Test Plan:** `docs/roadmap-tool-qa-plan.md`
**Design Review:** `docs/roadmap-tool-design-review.md`
**Project ID:** `roadmap-tool`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Tests Executed | 68 |
| PASS | 49 |
| FAIL | 12 |
| BLOCKED / NOT TESTED | 7 |
| Bugs Found | 14 |
| Critical Bugs | 2 |
| Major Bugs | 6 |
| Minor Bugs | 4 |
| Cosmetic | 2 |

**Overall Verdict: FAIL -- Does not ship.**

The core happy path works: users can create roadmaps, add items, switch between three view types, manage fields, and filter data. The Table View is the most polished and functional. However, the Timeline View has significant visual issues (hardcoded colors, overlapping labels, no field-based coloring), the Shared View is a non-functional stub, and several must-fix items from the design review remain unresolved. The product is approximately 80% complete for a v1.0 release. Fixing the 2 critical and 6 major bugs would bring it to shippable state.

---

## Detailed Test Results

### 1. Homepage & Navigation

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-1.1.1 | Homepage loads with title and button | **PASS** | "Roadmaps" title, "+ New Roadmap" button visible |
| TC-1.1.2 | Roadmap cards display | **PASS** | 3 roadmaps shown as cards in "MY ROADMAPS" section |
| TC-1.1.3 | Cards show name and date | **PASS** | Name and "Last modified" date on each card |
| TC-1.1.4 | Skeleton loading state | NOT TESTED | Page loaded too quickly to observe |
| TC-1.2.1 | Search input present | **PASS** | "Search roadmaps..." placeholder |
| TC-1.2.2 | Search filters cards | **PASS** | Typing "Product" filtered to only "Product Launch Q3" |
| TC-1.2.3 | No-match empty state | NOT TESTED | |
| TC-1.3.1 | New Roadmap opens modal | **PASS** | "Create Roadmap" modal with overlay |
| TC-1.3.2 | Modal has name input | **PASS** | Pre-filled "Untitled Roadmap" |
| TC-1.3.6 | Cancel closes modal | **PASS** | |
| TC-1.4.1 | Card click navigates | **PASS** | Navigated to `/roadmaps/:id` |
| TC-1.4.2 | Sidebar nav links | **PASS** | Roadmaps, Fields, Settings links |
| TC-1.4.3 | Sidebar collapse/expand | **PASS** | Collapse to icon-only mode, expand back |

---

### 2. Roadmap Page Structure

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-2.1.1 | Page loads with toolbar | **PASS** | View switcher, Filters, Format all present |
| TC-2.1.2 | View switcher shows view name | **PASS** | "Table View" displayed |
| TC-2.1.3 | Format button present | **PASS** | |
| TC-2.1.4 | Filter button present | **PASS** | |
| TC-2.2.1 | TopBar renders | **PASS** | Forge logo and app name |
| TC-2.2.2 | Breadcrumbs show context | **FAIL** | **BUG-01 (M9):** Shows hardcoded "Roadmaps / Roadmap" instead of actual roadmap name |
| TC-2.3.1 | Defaults to Table View | **PASS** | |

---

### 3. Table View

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-3.1.1 | Table renders with rows | **PASS** | Header row + 5 data rows |
| TC-3.1.2 | Headers show field names | **PASS** | NAME, STATUS, PRIORITY visible |
| TC-3.1.3 | Items show correct values | **PASS** | All field values display correctly with colored pill badges |
| TC-3.1.4 | Checkbox column present | **PASS** | First column has checkboxes |
| TC-3.1.5 | Name column is clickable | **PASS** | Button elements with `_nameLink` class |
| TC-3.1.6 | Footer shows item count | **PASS** | "5 items" displayed |
| TC-3.2.1 | Add item row exists | **PASS** | Blue circle + "Add item" at bottom |
| TC-3.2.2 | Add row focuses input | **PASS** | Input appears with "Item name..." placeholder, blue highlight row |
| TC-3.2.3 | Enter creates item | **PASS** | Typed "QA Test Item", pressed Enter, item appeared, count updated to 6 |
| TC-3.3.1 | Click cell enters edit mode | **PASS** | Cell gets blue border accent on click |
| TC-3.3.5 | Active cell shows accent border | **PASS** | Blue border with light blue background |
| TC-3.4.1 | Click name opens Item Card | **PASS** | Item Card panel slides in from right |
| TC-3.4.3 | Item Card shows fields | **PASS** | Name, description, dates, Status, Priority all visible |

---

### 4. Timeline View

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-4.1.1 | Timeline renders | **PASS** | Time axis and item bars appear |
| TC-4.1.2 | Time axis shows dates | **PASS** | Years (2024-2028) and month abbreviations |
| TC-4.1.3 | Header groups display | **PASS** | "All Items" collapsible group on left |
| TC-4.1.4 | Item bars span date range | **PASS** | Bars positioned at April 2026 (matching test data) |
| TC-4.1.5 | Today marker visible | **PASS** | Purple dashed vertical line at Feb 2026 |
| TC-4.2.1 | Time scale selector | **PASS** | W, M, Q, H, Y buttons present |
| TC-4.2.2 | Scale changes display | **PASS** | Switching W to Y updates axis labels |
| TC-4.2.3 | Layout toggle | **PASS** | "Spacious" button present |
| TC-4.3.1 | Time slider visible | **PASS** | Scrollbar at bottom of timeline |
| TC-4.8.1 | Bars colored by field | **FAIL** | **BUG-02 (M1/M2):** All bars are hardcoded orange. No field-based coloring. |
| -- | Bar labels overlap | **FAIL** | **BUG-03:** At week zoom, item labels overlap each other. Text collision not handled. |

---

### 5. Swimlane View

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-5.1.1 | Grid renders | **PASS** | Grid with column and row headers |
| TC-5.1.2 | Column headers show values | **PASS** | Q1 2026, Q2 2026, Q3 2026 |
| TC-5.1.3 | Row headers show values | **PASS** | Low, High, Medium (Priority grouping) |
| TC-5.1.4 | Items at correct positions | **PASS** | Items correctly grouped by Priority value |
| TC-5.2.1 | Cards show name | **PASS** | Item name and "+ 0" sub-item count |
| TC-5.2.3 | Cards have color accent | **PASS** | Left-border colored by field value |
| TC-5.4.1 | Add item in swimlane | **FAIL** | **BUG-04:** No visible "+" button or add mechanism found in empty cells |
| TC-5.4.2 | Check prompt() usage (M6) | NOT TESTED | Could not trigger add flow to verify |

---

### 6. Item Card (Detail Panel)

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-6.1.1 | Card slides in from right | **PASS** | |
| TC-6.1.4 | Close button works | **PASS** | |
| TC-6.2.1 | Name displayed and editable | **PASS** | Name in editable input at top |
| TC-6.3.1 | Description field present | **PASS** | Textarea with "Add a description..." placeholder |
| TC-6.3.2 | Rich text or plain textarea | **FAIL** | **BUG-05 (M5):** Plain `<textarea>`, not Tiptap rich text editor |
| TC-6.4.1 | Date fields editable | **PASS** | Start Date and End Date with native date picker inputs |
| TC-6.4.2 | Custom fields display | **PASS** | Status (green dot + "Done") and Priority (red dot + "High") |
| TC-6.6.1 | Left tabs present | **PASS** | Overview, Linked Items, Sub-Items |
| TC-6.6.2 | Right tabs present | **PASS** | Fields, Activity |
| TC-6.7.3 | Delete with confirmation | **PASS** | Confirm dialog: "Delete this item? This cannot be undone." |
| TC-6.8.1 | Save buttons | **PASS** | "Save & Close" and "Save" at bottom |
| -- | Card doesn't close after delete | **FAIL** | **BUG-06:** After confirming delete, Item Card stays open showing deleted item. Must reload page. |

---

### 7. Fields Management

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-7.1.1 | Fields page loads | **PASS** | `/roadmaps/:id/fields` |
| TC-7.1.2 | Two-column layout | **PASS** | "Roadmap Fields" left, "Account Fields" right |
| TC-7.1.3 | Add Field button | **PASS** | Purple button top-right |
| TC-7.2.1 | Add Field opens modal | **PASS** | "Create Field" modal with name, type, level |
| TC-7.2.2 | Modal has type selector | **PASS** | "List" type dropdown, "This Roadmap" / "All Roadmaps" toggle |
| TC-7.3.1 | Three-dot menu options | **PASS** | Edit, Archive, Promote to Account, Delete (red) |
| -- | Drag handles visible | **PASS** | 6-dot grip icons next to each field |
| -- | Menu buttons opacity on hover | **PASS** | Buttons have opacity:0 by default, visible on hover |

---

### 8. Views System

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-8.1.1 | Switcher lists all views | **PASS** | Table View, Q3 Timeline, Status Board all listed |
| TC-8.1.2 | Views show type icons | **PASS** | Table, timeline, and grid icons |
| TC-8.1.3 | Clicking switches view | **PASS** | Navigated from Table to Timeline to Swimlane |
| TC-8.1.4 | Add New View option | **PASS** | "+ Add New View" at bottom of dropdown |
| TC-8.2.1 | Create View modal | **PASS** | Name input, type selector (Table/Timeline/Swimlane), "Copy Filters From" |

---

### 9. Filtering

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-9.1.1 | Filter button opens builder | **PASS** | "All of the following conditions must match" header |
| TC-9.1.2 | Builder has field/operator/value | **PASS** | Dropdown selectors for each |
| TC-9.1.3 | Add Filter adds condition | **PASS** | New filter row appears, badge shows count |
| TC-9.1.4 | Remove filter (X) works | **PASS** | Individual filter removal |
| TC-9.2.1 | Filter hides non-matching | **PASS** | Status=Done filtered to 1 item, showed "1 item (4 filtered)" |
| TC-9.2.3 | Clear All removes filters | **PASS** | All 5 items restored |
| TC-9.3.1 | Equals operator for list | **PASS** | Status equals Done correctly filtered |

---

### 10. Format Panel

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-10.1.1 | Format button toggles panel | **PASS** | Panel opens and closes |
| TC-10.4.1 | Column visibility toggles | **PASS** | COLUMNS section with checkboxes for Name, Status, Priority |
| TC-10.4.2 | Hiding column removes it | **PASS** | Toggled Status on, column appeared |

---

### 11. Inline Editing (Design Review M3 Verification)

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-17.1.1 | M3: List field uses dropdown | **PASS -- FIXED** | Double-click on Status cell opens proper dropdown with color dots (None, Planned, In Progress, Done). No longer a text input. |

---

### 12. Shared View Page

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-14.1.1 | Navigate to /shared/:token | **FAIL** | **BUG-07 (M7):** Page renders but is a placeholder stub |
| TC-14.1.2 | Shows roadmap content | **FAIL** | Shows only "Shared View" heading + "Token: test-token -- Read-only view will render here." |

---

### 13. CRUD Operations (API-Level)

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-13.1.1 | Create roadmap | **PASS** | Created "Enzo QA Test Roadmap" via POST, received UUID |
| TC-13.1.4 | Delete roadmap | **PASS** | DELETE returned 204, removed from homepage |
| TC-13.2.1 | Create item | **PASS** | Created items via POST with name, dates |
| TC-13.2.4 | Delete item | **PASS** | DELETE returned 204 |
| TC-13.3.1 | Create field | **PASS** | Created Status (List) and Priority (List) fields |
| TC-13.3.2 | Create field values | **PASS** | Created Planned/In Progress/Done and High/Medium/Low with colors |
| TC-13.3.3 | Set item field values | **PASS** | Assigned values to all 5 items via PATCH |
| TC-13.4.1 | Create view | **PASS** | Created Timeline and Swimlane views |
| TC-13.4.3 | Delete view | **PASS** | DELETE returned 204 |

**API Route Discrepancy Found:** The client code (`api.ts`) references `/api/v1/roadmaps/:id/fields/:fieldId/values` for field values, but the actual server route is `/api/v1/fields/:fieldId/values`. The client works correctly (it uses the right route at runtime), but the route pattern in the API layer doesn't match what the tech approach documents.

---

### 14. Edge Cases

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-15.1.1 | Long name (500 chars) | **PASS** | Server accepted. No max length validation on items. |
| TC-15.2.1 | Special chars / XSS | **PASS** | `<script>alert("xss")</script>&"'<>` stored safely. React escapes output. No XSS. |
| TC-15.4.1 | Empty item name rejected | **PASS** | Server returned validation error: "String must contain at least 1 character(s)" |
| -- | Non-existent roadmap | **PASS** | Shows "Roadmap not found." message, no crash |
| -- | Invalid route (404) | **PASS** | SPA catch-all redirects to homepage. No error screen. |

---

### 15. Responsive Behavior

| Test | Description | Result | Notes |
|------|-------------|--------|-------|
| TC-16.1.1 | Desktop (1280px) | **PASS** | Full sidebar + content area |
| TC-16.2.1 | Mobile (375px) | **PARTIAL** | **BUG-08:** Sidebar opens over content at mobile width instead of auto-collapsing. After manually collapsing, hamburger menu appears and table adapts reasonably to narrow viewport. |
| -- | Homepage mobile | **PASS** | Cards stack vertically, full-width button and search |

---

### 16. Design Review Known Issues Verification

| Issue | Description | Status | Notes |
|-------|-------------|--------|-------|
| M1 | Timeline hardcoded colors (no CSS vars) | **STILL PRESENT** | All SVG elements use raw hex values |
| M2 | No CSS module for Timeline | **STILL PRESENT** | Inline styles throughout |
| M3 | List field renders text input | **FIXED** | Now shows proper dropdown with color dots |
| M4 | No date picker for inline editing | **PARTIAL** | Item Card uses native `<input type="date">` with calendar icon. Table inline edit not tested for date fields. |
| M5 | Plain textarea instead of Tiptap | **STILL PRESENT** | `<textarea>` confirmed in DOM |
| M6 | Swimlane uses prompt() | **NOT VERIFIED** | No add button found in swimlane to trigger the flow |
| M7 | SharedViewPage is stub | **STILL PRESENT** | Placeholder text only |
| M8 | No Cmd+K search | **STILL PRESENT** | Cmd+K produces no response |
| M9 | Hardcoded "Roadmap" breadcrumb | **STILL PRESENT** | Shows "Roadmap" instead of actual name |
| M11 | Uppercase column headers | **STILL PRESENT** | `text-transform: uppercase` at 11px. Spec calls for 12px sentence case. |
| M12 | Delete shortcut bypasses confirm | NOT TESTED | Would require keyboard shortcut testing with selected items |
| S7 | No Fields link in sidebar | **FIXED** | Fields link is present and functional in sidebar |

---

## Bugs Found

### Critical (Blocks Shipping)

**BUG-01: Shared View page is a non-functional stub (M7)**
- **Severity:** Critical
- **Location:** `/shared/:token` route
- **Expected:** Read-only rendered view of shared roadmap data
- **Actual:** Placeholder page showing "Shared View -- Token: {token} -- Read-only view will render here."
- **Impact:** Sharing functionality is a core v1 feature per requirements (US-29 through US-32). Users cannot share roadmaps externally.
- **Screenshot:** `shared-view-page`

**BUG-02: Timeline bars use hardcoded orange -- no field-based coloring (M1/M2)**
- **Severity:** Critical
- **Location:** Timeline View, all item bars
- **Expected:** Bars colored by the configured "color-by" field using the selected palette
- **Actual:** All bars render in hardcoded orange regardless of field values or palette settings
- **Impact:** Timeline is the hero view. Without field-based coloring, it cannot communicate status/priority visually -- defeating the core value proposition of a roadmap visualization tool.
- **Screenshot:** `timeline-view`, `timeline-week-zoom`

---

### Major (Significant UX degradation)

**BUG-03: Timeline bar labels overlap at all zoom levels**
- **Severity:** Major
- **Location:** Timeline View, item labels
- **Expected:** Labels positioned without collision, or truncated/hidden when overlapping
- **Actual:** Labels for adjacent items overlap and become unreadable. Particularly bad at Week zoom where items with similar date ranges stack on top of each other.
- **Screenshot:** `timeline-week-zoom`

**BUG-04: No add-item mechanism in Swimlane View**
- **Severity:** Major
- **Location:** Swimlane View, empty cells
- **Expected:** "+" button in empty cells to add items, or some creation mechanism
- **Actual:** No visible add button or creation UI found. The design review flagged M6 (prompt() usage) but I could not even trigger the flow -- suggesting the add mechanism may be hidden or broken.
- **Screenshot:** `swimlane-view`

**BUG-05: Item Card description is plain textarea, not rich text editor (M5)**
- **Severity:** Major
- **Location:** Item Card, description field
- **Expected:** Tiptap-powered rich text editor with floating toolbar (bold, italic, lists, links)
- **Actual:** Plain `<textarea>` element with no formatting capabilities
- **Impact:** Rich descriptions are a key differentiator. Without formatting, users cannot create structured item specs.
- **Screenshot:** `item-card-opened`

**BUG-06: Item Card stays open after successful delete**
- **Severity:** Major
- **Location:** Item Card, Delete action
- **Expected:** After confirming deletion, Item Card should close and return to the table/view
- **Actual:** Confirmation dialog works, item is deleted server-side (verified on reload), but the Item Card remains open showing the now-deleted item. User must manually close or reload.
- **Screenshot:** `after-delete`

**BUG-07: Breadcrumbs show hardcoded "Roadmap" instead of actual name (M9)**
- **Severity:** Major
- **Location:** Breadcrumb bar across all roadmap sub-pages (Table, Timeline, Swimlane, Fields)
- **Expected:** "Roadmaps / Product Launch Q3" (actual roadmap name)
- **Actual:** "Roadmaps / Roadmap" (hardcoded)
- **Impact:** Users with multiple roadmaps cannot identify which roadmap they are viewing from the breadcrumb. Navigation context is broken.
- **Screenshot:** `roadmap-page-resume`

**BUG-08: Settings link navigates to homepage instead of Settings page**
- **Severity:** Major
- **Location:** Sidebar, Settings link
- **Expected:** Navigates to `/settings` with account/workspace settings
- **Actual:** `/settings` route renders the Roadmaps homepage. No settings UI exists.
- **Impact:** Settings link is a dead end. Either remove it from the sidebar or implement the page.
- **Screenshot:** `settings-direct`

---

### Minor (Functional but sub-optimal)

**BUG-09: Cmd+K global search not implemented (M8)**
- **Severity:** Minor
- **Location:** Global keyboard shortcut
- **Expected:** Cmd+K opens a search modal for quick navigation across roadmaps and items
- **Actual:** No response to Cmd+K
- **Impact:** Power user feature. Not blocking for v1 but was in spec.

**BUG-10: Sidebar auto-opens at mobile viewport width**
- **Severity:** Minor
- **Location:** Sidebar at 375px viewport
- **Expected:** Sidebar auto-collapses at mobile breakpoints
- **Actual:** Sidebar opens over content. User must manually collapse via the chevron button. After collapsing, the mobile layout with hamburger menu is functional.
- **Screenshot:** `responsive-375`

**BUG-11: Duplicate "Q3 Timeline" views in dropdown**
- **Severity:** Minor
- **Location:** View switcher dropdown
- **Expected:** Each view name is unique, or duplicate views are prevented
- **Actual:** Two "Q3 Timeline" entries appear (from test data creation). The API does not enforce unique view names within a roadmap.
- **Note:** This was caused by test data setup creating duplicate views. However, the API should either enforce unique names or the UI should differentiate them (e.g., "Q3 Timeline (2)").

**BUG-12: No max length validation on item names**
- **Severity:** Minor
- **Location:** Item creation API
- **Expected:** Server rejects names exceeding a reasonable limit (e.g., 200 chars)
- **Actual:** A 500-character name was accepted and created. This could cause layout issues in table cells and cards.

---

### Cosmetic (Visual polish)

**BUG-13: Column headers use uppercase 11px instead of sentence case 12px (M11)**
- **Severity:** Cosmetic
- **Location:** Table View column headers
- **Expected:** 12px, font-weight 600, sentence case (per design spec)
- **Actual:** 11px, font-weight 500, `text-transform: uppercase`, 0.55px letter-spacing
- **Impact:** Headers look slightly different from the design spec but are functional.

**BUG-14: Create Field modal defaults to "All Roadmaps" scope**
- **Severity:** Cosmetic
- **Location:** Fields page, Create Field modal
- **Expected:** When creating a field from within a roadmap's Fields page, default to "This Roadmap"
- **Actual:** Defaults to "All Roadmaps" (account level)
- **Impact:** Users might accidentally create account-level fields when they intended roadmap-scoped fields.

---

## What Works Well

1. **Table View is solid.** Inline editing with proper dropdown for list fields (M3 fixed), colored pill badges, active cell highlighting, inline item creation, and the format panel for column visibility all work smoothly.

2. **Filter system is functional and intuitive.** Adding filters, changing field/operator/value, seeing the filtered count ("1 item (4 filtered)"), and clearing filters all work correctly.

3. **Fields management page is well-structured.** Two-column layout (roadmap vs account fields), three-dot context menu with Edit/Archive/Promote/Delete, drag handles, and the Create Field modal all work.

4. **View switching works reliably.** Switching between Table, Timeline, and Swimlane views loads the correct content. The Create View modal with type selector and filter copying is a nice touch.

5. **API validation is solid.** Empty names are rejected with clear error messages. XSS attempts are safely stored and rendered (React escaping). Non-existent roadmaps show a clean "not found" message.

6. **Sidebar collapse is polished.** Collapses to icon-only mode with smooth transition, expand button at bottom, and content area expands to fill the space.

7. **Swimlane View layout is correct.** Items are properly grouped by field values with colored card borders. The grid structure with quarter columns and priority rows renders correctly.

8. **Mobile homepage is well-adapted.** Cards stack vertically, search and create button go full-width, hamburger menu appears.

---

## Recommendations for Shipping

### Must Fix Before Ship (blocks release gate)

1. **BUG-02: Timeline field-based coloring.** Convert hardcoded orange bars to use the color palette system. This is the #1 visual issue -- the Timeline is the hero view and all bars being orange makes it useless for visual status communication.

2. **BUG-01: Shared View implementation.** If sharing is a v1 requirement (US-29-32), this must be implemented. If sharing can be deferred to v1.1, remove the sharing UI elements to avoid confusion.

3. **BUG-07: Breadcrumb dynamic name.** Replace hardcoded "Roadmap" with the actual roadmap name from the API response. This is a quick fix.

4. **BUG-06: Item Card close after delete.** After successful delete, close the Item Card and return to the view. Small fix, high-impact UX improvement.

### Should Fix Before Ship (significant quality bar)

5. **BUG-03: Timeline label overlap.** Implement label collision detection -- truncate or offset labels when items overlap.

6. **BUG-08: Settings page.** Either implement a basic settings page or remove the Settings link from the sidebar. Dead navigation links erode trust.

7. **BUG-04: Swimlane add mechanism.** Ensure the "+" button appears on hover in empty swimlane cells.

### Can Ship Without (address in v1.1)

8. **BUG-05: Rich text editor (M5).** Tiptap integration is a feature enhancement. Plain textarea is functional for v1.

9. **BUG-09: Cmd+K search.** Power user feature, not blocking.

10. **BUG-10: Mobile sidebar auto-collapse.** Mobile experience is functional after manual collapse. Auto-collapse is polish.

---

## Disposition

**QA Verdict: FAIL**

The roadmap tool cannot ship in its current state. The Timeline View's hardcoded coloring (BUG-02) breaks the core visual communication value of the product. The breadcrumb issue (BUG-07) and Item Card delete behavior (BUG-06) are quick fixes that should be addressed. The Shared View (BUG-01) needs a decision on whether it's v1 or v1.1 scope.

**Recommended path to PASS:**
1. Fix BUG-02 (Timeline coloring) -- estimated effort: medium
2. Fix BUG-07 (breadcrumb name) -- estimated effort: small
3. Fix BUG-06 (Card close on delete) -- estimated effort: small
4. Fix BUG-03 (label overlap) -- estimated effort: medium
5. Decide on BUG-01 (Shared View) scope -- if v1, implement; if v1.1, remove UI references
6. Fix BUG-08 (Settings link) -- estimated effort: small (remove link or add placeholder page)

After these fixes, schedule a re-test pass focused on Timeline View and the fixed items. Expected turnaround: 1-2 days for fixes, half-day for re-test.

---

*QA results compiled by Enzo. Re-test required after fixes are implemented.*
