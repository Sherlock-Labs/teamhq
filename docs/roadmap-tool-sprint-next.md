# Roadmap Tool -- Sprint: v1.0 Polish + QA Re-test

**Author:** Thomas (PM)
**Date:** February 11, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Sprint goal:** Fix remaining minor/cosmetic QA bugs, run specialist reviews, get a clean QA pass, and declare v1.0 shipped.

---

## 1. Where We Are

Forge is deployed to production at https://forge-app-production.up.railway.app. The major bug fixes (BUG-02 through BUG-08) have all been addressed. The Timeline auto-fits to item data. The product is functional and close to shippable.

### Completed since QA

| Bug | Fix | Status |
|-----|-----|--------|
| BUG-02 | Timeline palette coloring (was all gray/orange) | Fixed |
| BUG-03 | Timeline label overlap (maxLabelWidth computation) | Fixed |
| BUG-04 | Swimlane add button on non-empty cells | Fixed |
| BUG-06 | Item Card delete now closes panel | Fixed |
| BUG-07 | Breadcrumb shows actual roadmap name | Fixed |
| BUG-08 | Settings link removed from sidebar | Fixed |
| -- | Timeline date range auto-fits to item data | Fixed |

### CEO-Deferred to v1.1

| Bug | Reason |
|-----|--------|
| BUG-01 / Shared View page | Sharing deferred to v1.1 -- stub removed or clearly gated |
| BUG-05 / Tiptap rich text | Plain textarea is functional for v1 |
| BUG-09 / Cmd+K search | Power user feature, not core |

### Open QA Bugs (Unfixed)

| Bug | Severity | Description |
|-----|----------|-------------|
| BUG-10 | Minor | Mobile sidebar auto-collapse -- sidebar opens over content at 375px |
| BUG-11 | Minor | Duplicate view names allowed -- no uniqueness validation |
| BUG-12 | Minor | No max length on item names -- 500 chars accepted, layout risk |
| BUG-13 | Cosmetic | Column headers 11px uppercase vs spec's 12px sentence case |
| BUG-14 | Cosmetic | Create Field modal defaults to "All Roadmaps" scope |

### Pipeline Steps Still Pending

1. **Specialist review (Nina/Soren/Amara)** -- never ran
2. **Design review (Robert)** -- needs to re-review post-fix state
3. **QA re-test (Enzo)** -- must verify bug fixes + give final pass

### v1.0 Scope Assessment

The requirements doc (US-1 through US-23) defines v1.0 scope. Here is the honest status:

**Fully Implemented:**
- US-3 through US-5: Roadmap CRUD, Homepage, settings
- US-6, US-7: Items + Item Card
- US-8, US-9: Fields system + field value assignment
- US-10: Table View (inline editing, filtering, column management)
- US-11: Timeline View (all time scales, headers, bars, today marker, time slider, stacking)
- US-12: Milestones (creation, Timeline rendering, types)
- US-13: Swimlane View (dual-axis grid, cards, Group Rows By, cell creation)
- US-14: Multiple views per roadmap
- US-15: Filtering (field-based, AND logic, per-view persistence)
- US-16: Format Panel (view-specific controls, all sections)
- US-17: Color palettes (6 defaults, palette picker, legend)
- US-21: Real-time collaboration (presence, live updates, edit locking, cursor sync)
- US-23: Application shell and navigation

**Partially Implemented (functional but reduced scope):**
- US-1, US-2: Auth -- DEV_BYPASS_AUTH mode works. Clerk integration wired in middleware but not activated with real Clerk keys in production. This is an environment config step, not a code gap.
- US-7: Item Card description is plain textarea (Tiptap deferred to v1.1)
- US-22: Activity feed -- change logging exists server-side, but real-time activity push to the UI is not wired

**Deferred to v1.1 (CEO-approved):**
- US-18: Share roadmap with teammates (backend APIs exist, no frontend UI)
- US-19: Export to PNG (no implementation)
- US-20: Share via URL (stub page, backend route has TODO)

**Assessment:** The product covers 20 of 23 user stories with functional implementations. The 3 deferred stories (sharing/export) are cleanly separated -- they have no impact on the core roadmapping experience. The product is shippable as a v1.0 once the remaining polish is done and QA passes.

---

## 2. Sprint Scope: v1.0 Polish

### Why this sprint

The product is ~95% there. What's left is:
1. **5 minor/cosmetic bugs** that Enzo flagged -- quick fixes, high polish impact
2. **Specialist review** -- Nina/Soren/Amara never reviewed the implementation. For a UI-heavy product, this is important for quality
3. **Design review** -- Robert needs to verify the bug fixes look correct
4. **QA re-test** -- Enzo gave FAIL, bugs were fixed, he needs to re-test and give PASS

This is a tight sprint. No new features. No architecture changes. Just fix, review, ship.

---

## 3. Acceptance Criteria

### 3.1 Bug Fixes (FE -- Alice)

**AC-1: BUG-10 -- Mobile sidebar auto-collapse**
- [ ] At viewport width <= 768px, sidebar starts collapsed (not open)
- [ ] Hamburger button available to toggle sidebar open/closed
- [ ] When sidebar opens at mobile width, it overlays content (existing behavior is fine)
- [ ] On resize from desktop to mobile, sidebar auto-collapses
- [ ] Files: likely `client/src/components/layout/Sidebar.tsx` or similar + CSS

**AC-2: BUG-11 -- Prevent duplicate view names**
- [ ] When creating a view, if the name matches an existing view in the same roadmap, show inline error: "A view with this name already exists"
- [ ] Check is case-insensitive
- [ ] This is a client-side validation (no server change needed -- the UX improvement is sufficient)
- [ ] Files: `client/src/components/views/CreateViewModal.tsx` or similar

**AC-3: BUG-12 -- Item name max length**
- [ ] Item name input (Table inline creation, Item Card name field) enforces max 200 characters
- [ ] Show character count or truncation indicator when approaching limit
- [ ] Server-side: add maxLength validation to the item creation/update Zod schema (200 chars)
- [ ] Files: Item creation components + `server/src/routes/items.ts` or validation schema

**AC-4: BUG-13 -- Column header styling**
- [ ] Table View column headers: 12px, font-weight 600, sentence case (remove text-transform: uppercase)
- [ ] This reverses the earlier CSS-only fix (M11) that used uppercase -- the design spec actually calls for sentence case at 12px
- [ ] Files: `client/src/components/table/TableHeader.module.css`

**AC-5: BUG-14 -- Create Field modal default scope**
- [ ] When opening "Create Field" from within a roadmap's Fields page, default the scope toggle to "This Roadmap" (not "All Roadmaps")
- [ ] When opening from account-level context (if applicable), default to "All Roadmaps"
- [ ] Files: Create Field modal component

---

## 4. Explicitly Deferred (NOT in this sprint)

- **Sharing UI (US-18, US-20)** -- v1.1
- **PNG Export (US-19)** -- v1.1
- **Tiptap rich text editor (BUG-05)** -- v1.1
- **Cmd+K search (BUG-09)** -- v1.1
- **Real-time activity feed push to UI (US-22)** -- v1.1
- **Clerk auth activation in production** -- separate deployment task, not a code sprint
- **Any v1.1 features** (dependencies, drag-and-drop, sub-items, etc.)

---

## 5. Pipeline

This sprint has three phases: **fix**, **review**, **verify**.

### Phase 1: Bug Fixes

**Alice (FE)** fixes AC-1 through AC-5. These are all small, isolated changes. Estimated effort: 30-60 minutes total.

**Jonah (BE)** adds item name maxLength validation to the server-side Zod schema (AC-3 server-side portion). Estimated effort: 5 minutes.

Alice and Jonah can work in parallel since the changes are in different packages.

### Phase 2: Specialist Review + Design Review

Run sequentially after fixes are deployed:

1. **Nina (Interactions)** -- Reviews animations, transitions, hover states, micro-interactions across all 3 views, Item Card, Format Panel, and the real-time collab UI (presence avatars, cursor overlay, edit lock indicators). Produces a findings list. Focus on: does it feel crisp and purposeful?

2. **Soren (Responsive)** -- Reviews all breakpoints (desktop, large tablet, tablet, mobile) across Homepage, Table View, Timeline View, Swimlane View, Item Card, Format Panel. Produces a findings list. Focus on: does it feel native at every screen size? Verify BUG-10 fix.

3. **Amara (Accessibility)** -- Reviews keyboard navigation, screen reader compatibility, ARIA labels (especially on SVG timeline elements), focus management (Item Card open/close, Format Panel), color contrast. Produces a findings list. Focus on: can someone use this without a mouse?

4. **Robert (Designer)** -- Lightweight visual review of the current production state. Verify the 6 bug fixes look correct. Check overall visual quality against design spec. This is a quick pass, not a full re-audit.

**Important:** If the specialist/design reviews produce findings, Alice fixes them before QA. If findings are minor enough, they can be documented and addressed post-v1.0. Thomas (me) will triage.

### Phase 3: QA Re-test

5. **Enzo (QA)** -- Re-test pass focused on:
   - Verify all 6 previously-fixed bugs (BUG-02, 03, 04, 06, 07, 08) are still resolved
   - Verify the 5 new bug fixes from this sprint (BUG-10, 11, 12, 13, 14)
   - Verify any specialist/design review fixes
   - Quick smoke test of core happy path (create roadmap, add items, switch views, open Item Card)
   - **Release gate:** PASS/FAIL verdict

---

## 6. Technical Notes

**For Alice -- bug fix guidance:**

- **BUG-10 (sidebar):** Check if there is a `useMediaQuery` hook already in use. The sidebar likely has an `isCollapsed` state -- initialize it based on viewport width. Add a `useEffect` that watches for resize and auto-collapses below 768px.

- **BUG-11 (duplicate views):** The CreateViewModal probably has access to the existing views list (from the views query or passed as a prop). Add a check against existing names before allowing creation.

- **BUG-12 (item name length):** For the frontend, add `maxLength={200}` to the input element. For the server, find the Zod schema for item creation/update and add `.max(200)`.

- **BUG-13 (header styling):** In `TableHeader.module.css`, remove `text-transform: uppercase` and `letter-spacing: 0.55px`. Change font-size to 12px and font-weight to 600.

- **BUG-14 (field scope default):** In the Create Field modal, find the initial state for the scope toggle and change the default from "All Roadmaps" (account) to "This Roadmap" (roadmap-level).

**For Jonah -- server validation:**

- Find the item creation/update Zod schema (likely in `shared/src/validation.ts` or `server/src/routes/items.ts`) and change the name field from `.min(1)` to `.min(1).max(200)`.

---

## 7. Success Criteria

This sprint is done when:
1. All 5 minor/cosmetic bugs are fixed and deployed
2. Nina, Soren, and Amara have reviewed and any critical findings are addressed
3. Robert confirms the visual quality is acceptable
4. Enzo gives a QA PASS verdict
5. v1.0 is declared shipped

After this sprint, we move to v1.1 backlog (sharing, export, Tiptap, dependencies, drag-and-drop).

---

*Sprint scoped by Thomas (PM). This is a polish sprint -- small, focused, fast. Ship it.*
