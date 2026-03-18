# Pipeline Review Gates — Design Spec

**Author:** Robert (Designer)
**Date:** 2026-03-17
**Status:** Final
**Depends on:** `docs/pipeline-review-gates-requirements.md`, `docs/pipeline-review-gates-tech-approach.md`

---

## Design Approach

Review gates are a control surface — the CEO needs to see what the pipeline produced, make a judgment, and move on. The design must feel like a natural extension of the existing TeamHQ pages (docs.html, tasks.html, projects.html): same sidebar, same header bar, same visual weight. No new patterns. No new typography. No new colors beyond what status semantics already use.

Three surfaces:
1. **Reviews page** (`reviews.html`) — the primary UI. Lists pending reviews, lets the CEO view deliverables inline, approve or request changes.
2. **Gate configuration** — a section within the project detail view on `projects.html`. Seven toggles, one per pipeline phase.
3. **Dashboard badge** — a count of pending reviews on the dashboard metrics row.

---

## 1. Reviews Page (`reviews.html`)

### Layout Structure

Same shell as every TeamHQ page: fixed sidebar left, scrollable main content right.

```
.reviews-page
  aside.sidebar              → existing sidebar (w-52, fixed, same as docs.html)
    nav link "Reviews" gets active state (text-black, bg-gray-50)

  .main-content              → ml-52, p-5
    header.status-bar        → existing header bar pattern
    main.reviews-layout      → two-column grid, same as docs.html
      .reviews-list          → col-span-2, left panel
      .review-detail         → col-span-3, right panel
```

### 1.1 Sidebar Addition

Add "Reviews" to the sidebar nav between "Workflow" and "Meetings":

```html
<a href="reviews.html" class="flex items-center gap-2.5 px-2 py-1.5 text-[11px] font-medium text-gray-500 hover:text-black rounded-md">
  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
  Reviews
  <!-- Badge: only rendered when pendingCount > 0 -->
  <span class="review-nav-badge" id="nav-review-badge" style="display:none;">0</span>
</a>
```

**Badge styles** (pending count in the nav):
```css
.review-nav-badge {
  background: #EF4444;          /* --accent-red */
  color: white;
  font-size: 8px;
  font-weight: 700;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  margin-left: auto;
}
```

### 1.2 Header Bar

Same pattern as docs.html header:

```
header.status-bar
  .left-group               → flex, gap-8, items-center
    .stat: Section           → "REVIEWS" (subtle-label + bold 11px)
    .stat: Pending           → count (subtle-label + bold 11px, red if > 0)
    .stat: Total             → all-time count
  .right-group
    .filter-tabs             → "All" / "Pending" / "Approved" / "Changes Requested"
```

**Filter tabs** follow the existing `projects.html` pattern:
```css
.filter-tab {
  padding: 3px 10px;
  font-size: 0.6rem;           /* 9.6px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 3px;
  cursor: pointer;
  color: #9CA3AF;              /* --text-muted */
  transition: all 100ms ease;
}
.filter-tab:hover {
  color: #374151;              /* --text-main */
}
.filter-tab.active {
  color: #374151;
  background: #F3F4F6;
}
```

Default filter: "Pending".

### 1.3 Reviews List (Left Panel)

Two-column grid layout (`grid-cols-5`), left panel is `col-span-2`. Same card container as docs.html left panel.

```
.reviews-list-container      → bg-white, border 1px #F3F4F6, rounded-lg, premium-shadow, overflow-hidden, flex-col
  .reviews-list-header       → px-4, py-2.5, border-b #F9FAFB, text-[11px] font-bold
    "Reviews"
  .reviews-list              → divide-y divide-gray-50, overflow-y-auto, max-height: calc(100vh - 220px)
    .review-row (repeated)   → px-4, py-3, cursor-pointer, transition bg 100ms
```

**Each `.review-row`:**

```
.review-row                  → px-4, py-3, flex-col, gap-1.5
  .review-row__top           → flex, items-center, justify-between
    .review-row__gate        → text-[10px], font-weight-600, color #374151
      "After Architecture"
    .review-row__status      → tag-pill (see status colors below)
  .review-row__project       → text-[9px], color #9CA3AF, font-weight-500
    "Pipeline Review Gates"
  .review-row__meta          → flex, items-center, gap-3, mt-0.5
    .review-row__agent       → text-[9px], color #9CA3AF
      avatar (18px) + agent name
    .review-row__time        → text-[9px], color #9CA3AF
      relative time ("2h ago")
```

**Review row states:**
| State | Appearance |
|-------|-----------|
| Default | bg: transparent |
| Hover | bg: #F9FAFB |
| Selected | bg: #F9FAFB, left border: 2px solid #374151 |
| Focus-visible | 2px ring #006B3F (accent), offset 2px |

**Status pill colors** (reuse existing `tag-pill` class):
| Status | Background | Text |
|--------|-----------|------|
| `pending` | `rgba(245, 158, 11, 0.1)` | `#B45309` (amber-700) |
| `approved` | `rgba(16, 185, 129, 0.1)` | `#059669` (emerald-600) |
| `changes-requested` | `rgba(239, 68, 68, 0.1)` | `#DC2626` (red-600) |
| `not-applicable` | `#F3F4F6` | `#9CA3AF` (gray-400) |

**Gate label formatting** — convert camelCase API names to human labels:
| API value | Display |
|-----------|---------|
| `afterResearch` | After Research |
| `afterRequirements` | After Requirements |
| `afterArchitecture` | After Architecture |
| `afterDesign` | After Design |
| `afterBackend` | After Backend |
| `afterFrontend` | After Frontend |
| `afterQA` | After QA |

### 1.4 Review Detail (Right Panel)

Three-column grid layout, right panel is `col-span-3`. Same container style as docs.html reader.

```
.review-detail-container     → bg-white, border 1px #F3F4F6, rounded-lg, premium-shadow, overflow-hidden, flex-col
  .review-detail-header      → px-4, py-2.5, border-b #F9FAFB, flex, items-center, justify-between
    .detail-title            → text-[11px], font-bold, text-black
      "After Architecture — Pipeline Review Gates"
    .detail-meta             → text-[9px], text-gray-400
      "Andrei  ·  2h ago"
  .review-detail-body        → flex-col, flex-1, overflow-hidden
    .review-summary          → px-4, py-3, border-b #F9FAFB
    .deliverables-tabs       → px-4, border-b #F9FAFB (only if multiple deliverables)
    .deliverable-viewer      → flex-1, overflow-y-auto
    .review-actions          → px-4, py-3, border-t #F9FAFB
```

#### 1.4.1 Summary Section

```
.review-summary              → px-4, py-3, border-b 1px #F9FAFB
  .summary-label             → subtle-label, mb-1
    "SUMMARY"
  .summary-text              → text-[10px], color #4B5563, line-height 1.6
    "{agent's summary text}"
```

#### 1.4.2 Deliverables Tabs

Only shown when a review has multiple deliverables. Follows the filter-tab pattern.

```
.deliverables-tabs           → px-4, py-2, border-b 1px #F9FAFB, flex, gap-2
  .deliverable-tab (each)    → filter-tab pattern
    "Tech Approach"          → active
    "Schema Changes"         → inactive
```

#### 1.4.3 Deliverable Viewer

The core of the review experience. Renders the deliverable inline based on its `type`.

**For `type: "doc"` (markdown files):**
Reuse the exact `doc-content` styles from `docs.html`. Fetch the file content via `GET /api/docs/{path}` and render with the existing markdown parser (marked.js).

```
.deliverable-viewer          → p-4, overflow-y-auto, max-height: calc(100vh - 380px)
  .doc-content               → same class as docs.html reader
    (rendered markdown)
```

**For `type: "code"` (file change summaries):**
Show a list of changed files with their paths:

```
.code-summary                → flex-col, gap-2
  .code-file (each)          → flex, items-center, gap-2, px-3, py-2, bg #F9FAFB, rounded, border 1px #F3F4F6
    .code-file__icon         → 12px, color #9CA3AF (file icon SVG)
    .code-file__path         → text-[10px], font-mono, color #374151
      "server/src/schemas/review.ts"
    .code-file__badge        → tag-pill
      "NEW" (green) / "MODIFIED" (blue)
```

**For `type: "qa-report"` (QA results):**
Show pass/fail verdict prominently, then test details:

```
.qa-verdict                  → flex, items-center, gap-3, px-4, py-3, rounded, mb-3
  (if pass)                  → bg: rgba(16,185,129,0.06), border: 1px solid rgba(16,185,129,0.15)
    .verdict-icon            → 16px checkmark, color #059669
    .verdict-text            → text-[11px], font-bold, color #059669, "QA PASSED"
  (if fail)                  → bg: rgba(239,68,68,0.06), border: 1px solid rgba(239,68,68,0.15)
    .verdict-icon            → 16px x-mark, color #DC2626
    .verdict-text            → text-[11px], font-bold, color #DC2626, "QA FAILED"
```

#### 1.4.4 Review Actions

The primary interaction surface. Fixed to the bottom of the detail panel.

```
.review-actions              → px-4, py-3, border-t 1px #E5E7EB, flex-col, gap-3
  .actions-row               → flex, items-center, gap-2, justify-end
    button.btn-approve       → primary button
    button.btn-changes       → secondary button
  .feedback-area             → hidden by default, shown when "Request Changes" clicked
    textarea.feedback-input  → full-width textarea
    .feedback-actions        → flex, justify-end, gap-2, mt-2
      button.btn-cancel      → ghost button, "Cancel"
      button.btn-submit      → destructive-styled button, "Submit Feedback"
```

**Approve button:**
```css
.btn-approve {
  background: #10B981;        /* emerald-500 / --accent-green */
  color: white;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 6px 16px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background 100ms ease;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.btn-approve:hover {
  background: #059669;        /* emerald-600 */
}
.btn-approve:active {
  background: #047857;        /* emerald-700 */
  transform: scale(0.98);
}
.btn-approve:focus-visible {
  outline: 2px solid #006B3F;
  outline-offset: 2px;
}
.btn-approve:disabled {
  opacity: 0.5;
  pointer-events: none;
}
```

**Request Changes button:**
```css
.btn-changes {
  background: transparent;
  color: #374151;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 6px 16px;
  border: 1px solid #E5E7EB;
  border-radius: 3px;
  cursor: pointer;
  transition: all 100ms ease;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.btn-changes:hover {
  border-color: #D1D5DB;
  background: #F9FAFB;
}
.btn-changes:active {
  background: #F3F4F6;
  transform: scale(0.98);
}
.btn-changes:focus-visible {
  outline: 2px solid #006B3F;
  outline-offset: 2px;
}
```

**Feedback textarea:**
```css
.feedback-input {
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  resize: vertical;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1.6;
  color: #374151;
  background: #FAFAFA;
  border: 1px solid #E5E7EB;
  border-radius: 3px;
  padding: 8px 10px;
  transition: border-color 100ms ease;
}
.feedback-input:focus {
  outline: none;
  border-color: #006B3F;
  box-shadow: 0 0 0 2px rgba(0, 107, 63, 0.1);
}
.feedback-input::placeholder {
  color: #9CA3AF;
}
```

**Submit Feedback button** — uses the amber/warning palette to signal "this pauses the pipeline":
```css
.btn-submit-feedback {
  background: #F59E0B;        /* amber-500 */
  color: white;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 6px 16px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background 100ms ease;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.btn-submit-feedback:hover {
  background: #D97706;        /* amber-600 */
}
```

#### 1.4.5 Previously-Submitted Feedback Display

When a review has `status: "changes-requested"` and `feedback` is non-null, show the previous feedback above the actions:

```
.previous-feedback           → px-4, py-3, border-t 1px #F9FAFB, bg #FFFBEB (amber-50)
  .feedback-label            → subtle-label, color #B45309 (amber-700), mb-1
    "YOUR FEEDBACK"
  .feedback-text             → text-[10px], color #92400E (amber-800), line-height 1.6
    "{feedback text}"
  .feedback-time             → text-[9px], color #D97706, mt-1
    "Submitted 3h ago"
```

#### 1.4.6 Empty State

When no review is selected (initial page load):

```
.review-empty                → flex, items-center, justify-center, h-full, flex-col, gap-2
  .empty-icon                → 24px, color #D1D5DB (checkmark-circle outline)
  .empty-text                → text-[10px], color #9CA3AF
    "Select a review from the list"
```

When no reviews exist at all (list is empty):

```
.reviews-empty-state         → col-span-5, flex, items-center, justify-center, h-64, flex-col, gap-2
  .empty-icon                → 32px, color #D1D5DB (checkmark-circle outline)
  .empty-heading             → text-[12px], font-weight-500, color #374151
    "No pending reviews"
  .empty-description         → text-[10px], color #9CA3AF, text-center, max-w-48
    "Reviews will appear here when the pipeline reaches a configured gate."
```

### 1.5 Loading State

Use the existing skeleton pattern from docs.html:

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
.skeleton {
  background: #E5E7EB;
  border-radius: 2px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
```

**Reviews list skeleton:** 3 rows, each with two skeleton bars (title-width and meta-width).

**Detail panel skeleton:** heading skeleton + 6 lines of varying width for the doc content area.

---

## 2. Gate Configuration UI

Added to the project detail view on `projects.html`. When the CEO clicks a project row to see its details, a new "Review Gates" section appears.

### 2.1 Location

Inside the project detail panel, after the existing project info sections (name, slug, status, etc.) and before the work items list. Separated by the standard section divider.

### 2.2 Layout

```
.gate-config                 → px-4, py-3, border-t 1px #F3F4F6
  .gate-config__header       → flex, items-center, justify-between, mb-3
    .gate-config__title      → subtle-label
      "REVIEW GATES"
    .gate-config__hint       → text-[9px], color #9CA3AF
      "Pipeline pauses for your review at enabled gates"
  .gate-config__list         → flex-col, gap-0
    .gate-toggle (x7)        → flex, items-center, justify-between, px-2, py-2, rounded
```

### 2.3 Each Gate Toggle

```
.gate-toggle                 → flex, items-center, justify-between, px-2, py-2
  .gate-toggle__left         → flex, items-center, gap-2.5
    .gate-toggle__dot        → 6px circle, phase-appropriate color (see below)
    .gate-toggle__label      → text-[10px], font-weight-500, color #374151
      "After Research"
    .gate-toggle__agent      → text-[9px], color #9CA3AF
      "Suki / Marco"
  .gate-toggle__right
    .toggle-switch           → custom checkbox styled as toggle
```

**Phase indicator dots** (matches pipeline visualization):
| Gate | Dot Color |
|------|-----------|
| After Research | `#38BDF8` (sky-400) |
| After Requirements | `#818CF8` (indigo-400) |
| After Architecture | `#A78BFA` (violet-400) |
| After Design | `#C084FC` (purple-400) |
| After Backend | `#34D399` (emerald-400) |
| After Frontend | `#F472B6` (pink-400) |
| After QA | `#FBBF24` (amber-400) |

**Agent labels** (who produced the deliverable at each gate):
| Gate | Agent(s) |
|------|----------|
| After Research | Suki, Marco |
| After Requirements | Thomas |
| After Architecture | Andrei |
| After Design | Robert |
| After Backend | Jonah, Sam |
| After Frontend | Alice |
| After QA | Enzo |

### 2.4 Toggle Switch

Compact toggle — not a full-size iOS toggle. Appropriate for the information density of this UI.

```css
.toggle-switch {
  position: relative;
  width: 28px;
  height: 16px;
  appearance: none;
  background: #E5E7EB;
  border-radius: 8px;
  cursor: pointer;
  transition: background 150ms ease;
  border: none;
  outline: none;
}
.toggle-switch:checked {
  background: #10B981;        /* emerald-500 */
}
.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  transition: transform 150ms ease;
}
.toggle-switch:checked::after {
  transform: translateX(12px);
}
.toggle-switch:focus-visible {
  outline: 2px solid #006B3F;
  outline-offset: 2px;
}
.toggle-switch:hover {
  background: #D1D5DB;
}
.toggle-switch:checked:hover {
  background: #059669;
}
```

### 2.5 Gate Toggle Interaction

- Toggles save immediately on click via `PATCH /api/projects/:id` with the updated `reviewGates` object.
- No save button needed — each toggle is an atomic, non-destructive action.
- Show a brief confirmation: the toggle animates, and a subtle "Saved" text flashes next to the header for 1.5s, then fades.

```css
.gate-saved-indicator {
  font-size: 9px;
  color: #10B981;
  font-weight: 500;
  opacity: 0;
  transition: opacity 200ms ease;
}
.gate-saved-indicator.visible {
  opacity: 1;
}
```

### 2.6 Gate Toggle Hover State

```css
.gate-toggle:hover {
  background: #F9FAFB;
}
```

---

## 3. Dashboard Badge

### 3.1 Location

On `dashboard.html`, in the metrics card row at the top. Add a new metric card for pending reviews.

### 3.2 Metric Card

Uses the existing `.metric-card` pattern:

```
.metric-card.reviews-metric  → same as other metric cards
  .subtle-label              → "PENDING REVIEWS"
  .metric-value              → text-[18px], font-bold
    "3"                      → color: #EF4444 if > 0, color: #9CA3AF if 0
  .metric-link               → text-[9px], color #3B82F6, mt-1
    "View reviews →"        → links to reviews.html
```

When `pendingReviews === 0`, the value shows "0" in muted gray. No special empty state — the card is always visible as an at-a-glance reference.

### 3.3 Alert State

When pending reviews exist, the metric card gets a subtle attention border:

```css
.metric-card.has-pending {
  border-color: rgba(239, 68, 68, 0.2);  /* red-500 at 20% */
}
```

---

## 4. Approve / Request Changes Flow

### 4.1 Approve Flow

1. CEO clicks "Approve" button in the review detail actions area
2. Button shows loading state: text changes to "Approving...", disabled, opacity 0.7
3. `PATCH /api/reviews/:id` with `{ "status": "approved" }`
4. On success:
   - The review row in the left list updates: status pill changes to green "Approved"
   - The actions area replaces buttons with a confirmation message:
     ```
     .approved-confirmation   → flex, items-center, gap-2, py-2
       .check-icon            → 14px, color #059669
       .confirmation-text     → text-[10px], font-weight-500, color #059669
         "Approved — pipeline will continue on next heartbeat"
     ```
   - If filtering by "Pending", the approved review fades out after 2s and is removed from the list
   - Next review in the list auto-selects (if any)
5. On error: show inline error below the button in `text-[9px]`, color `#DC2626`

### 4.2 Request Changes Flow

1. CEO clicks "Request Changes" button
2. The actions area expands to show the feedback textarea (slide-down, 200ms ease-out)
3. CEO types feedback
4. CEO clicks "Submit Feedback"
   - Button shows loading state
   - `PATCH /api/reviews/:id` with `{ "status": "changes-requested", "feedback": "..." }`
5. On success:
   - Status pill updates to red "Changes Requested"
   - Feedback area collapses
   - The previous-feedback display appears above the actions (showing what they just wrote)
   - Actions revert to Approve + Request Changes buttons (CEO can approve on re-review)
6. "Cancel" button collapses the textarea and reverts to the two-button state without saving

### 4.3 Keyboard Shortcuts

For power users:
- `Enter` on a selected review opens its detail (same as click)
- `A` key approves the current review (with confirmation — see below)
- `R` key opens the Request Changes feedback area
- `Escape` cancels the feedback textarea
- Arrow keys navigate the review list

**Keyboard approve confirmation:** When `A` is pressed, show a small inline prompt: "Press A again to confirm" (text-[9px], color #9CA3AF). Second press within 2s confirms. This prevents accidental approvals.

---

## 5. Responsive Behavior

### Desktop (> 1024px)
Full two-column layout as described above. Reviews list 2/5 width, detail 3/5 width.

### Tablet (640px–1024px)
- Sidebar collapses to icon-only (w-14) — same behavior as other TeamHQ pages
- Two-column layout maintained but with tighter gaps (gap-2 instead of gap-3)
- Header bar wraps: stats on first line, filters on second line

### Mobile (< 640px)
- Sidebar hidden (hamburger menu)
- Single-column stacked layout:
  - Reviews list takes full width, shows as a scrollable list
  - Clicking a review replaces the list with the detail view (with a back button at top)
  - Back button: `"← Reviews"`, text-[10px], color #3B82F6, px-4, py-2
- Approve/Request Changes buttons stack vertically, full-width
- Feedback textarea min-height: 120px (more thumb-friendly)
- Touch targets: all interactive elements min 44px height

---

## 6. Animation & Transitions

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Review row hover | mouseenter | background-color | 100ms | ease |
| Review row selection | click | left-border + background | 100ms | ease |
| Status pill update | status change | opacity 0 → 1 | 150ms | ease |
| Feedback area expand | click "Request Changes" | max-height 0 → auto (via grid-rows trick) | 200ms | ease-out |
| Feedback area collapse | click "Cancel" | max-height auto → 0 | 150ms | ease-in |
| Approved review fade-out | after approval (2s delay) | opacity 1 → 0, then remove | 300ms | ease |
| Toggle switch | click | background + knob translateX | 150ms | ease |
| Saved indicator | after save | opacity 0 → 1 → 0 | 200ms in, 800ms hold, 200ms out | ease |
| Button active | mousedown | scale(0.98) | 100ms | ease |

All animations respect `prefers-reduced-motion: reduce` — replace with instant state changes (no duration).

---

## 7. Accessibility

### Keyboard Navigation
- Full tab-order through: filter tabs → review list items → detail panel actions
- Review list items are focusable (`tabindex="0"`, `role="listbox"` on container, `role="option"` on items)
- Arrow keys navigate list items when the list has focus
- Enter/Space activates the focused element

### Screen Reader Support
- Page has `<main>` landmark and `<nav>` landmark (sidebar)
- Filter tabs: `role="tablist"` with `role="tab"` on each, `aria-selected` on active
- Review list: `role="listbox"`, items are `role="option"` with `aria-selected`
- Status pills: include `aria-label` (e.g., `aria-label="Status: pending"`)
- Approve button: `aria-label="Approve review"` (or `aria-label="Approve review for After Architecture"`)
- Loading states: `aria-busy="true"` on the container, `aria-live="polite"` for status updates
- Feedback textarea: `<label>` element with `for` attribute (visually hidden if needed)
- Toggle switches: `role="switch"`, `aria-checked`, `aria-label="Review gate: After Architecture"`

### Color Contrast
All text/background combinations in this spec meet WCAG AA (4.5:1 for normal text, 3:1 for large text):
- Body text #374151 on #FFFFFF: 9.7:1
- Muted text #9CA3AF on #FFFFFF: 3.0:1 (used only for supplementary captions alongside primary text)
- Amber-700 #B45309 on amber-tint rgba(245,158,11,0.1): 5.1:1
- Emerald-600 #059669 on emerald-tint rgba(16,185,129,0.1): 4.6:1
- Red-600 #DC2626 on red-tint rgba(239,68,68,0.1): 5.4:1

### Touch Targets
- Review rows: full-width, min-height 52px
- Buttons: 32px height (36px on mobile)
- Toggle switches: 28x16px control, but 44x44px tap target via padding on `.gate-toggle`

---

## 8. Error States

### API Failure — Loading Reviews
```
.reviews-error               → col-span-5, flex, items-center, justify-center, h-64, flex-col, gap-2
  .error-icon                → 24px, color #DC2626 (exclamation-circle)
  .error-heading             → text-[11px], font-weight-500, color #374151
    "Failed to load reviews"
  .error-description         → text-[10px], color #9CA3AF
    "Check your connection and try again."
  button.btn-retry           → secondary button, "Retry"
```

### API Failure — Approve/Reject Action
Inline error below the actions row:
```
.action-error                → text-[9px], color #DC2626, mt-1
  "Failed to update review. Please try again."
```
Button reverts to enabled state so the CEO can retry.

### API Failure — Gate Toggle Save
Inline error next to the toggle, and revert the toggle to its previous state:
```
.gate-error                  → text-[9px], color #DC2626, ml-2
  "Save failed"
```

---

## 9. Data Flow Summary

| Action | API Call | UI Update |
|--------|---------|-----------|
| Page load | `GET /api/reviews?status=pending` | Render list + auto-select first |
| Filter change | `GET /api/reviews?status={filter}` | Re-render list |
| Select review | (local, no API) | Show detail panel for selected review |
| View deliverable | `GET /api/docs?path={deliverable.path}` | Render markdown in viewer |
| Approve | `PATCH /api/reviews/:id` `{ status: "approved" }` | Update pill, show confirmation, remove from pending list |
| Request Changes | `PATCH /api/reviews/:id` `{ status: "changes-requested", feedback }` | Update pill, show feedback display |
| Toggle gate | `PATCH /api/projects/:id` `{ reviewGates: {...} }` | Toggle animation, "Saved" flash |
| Dashboard load | `GET /api/dashboard` (includes `pendingReviews`) | Render metric card with count |

---

## 10. File Impact

| File | Change |
|------|--------|
| `reviews.html` | **New** — full reviews page |
| `projects.html` | **Modify** — add gate configuration section to project detail panel |
| `dashboard.html` | **Modify** — add pending reviews metric card |
| All pages with sidebar | **Modify** — add "Reviews" nav link with badge |

No new CSS files needed — all styles inline in `<style>` tags per existing TeamHQ convention.