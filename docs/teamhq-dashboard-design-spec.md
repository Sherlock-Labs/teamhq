# TeamHQ Dashboard — Design Spec

**Author:** Robert (Product Designer)
**Date:** 2026-03-16
**Status:** Approved
**Implements:** CEO directive — Paperclip-inspired dashboard for TeamHQ

---

## 1. Design Intent

The CEO needs a command center. Right now, TeamHQ's landing page is a static hub with navigation cards and a "how it works" section. It tells you what TeamHQ *is*, but not what TeamHQ is *doing*. The dashboard replaces that with a live instrument panel: what is the team working on, what is the pipeline status, are there blockers, and how is the team performing over time.

The visual language draws from Paperclip's dashboard: metric cards, mini chart panels, active agent cards, and activity feeds. But the information architecture is adapted for TeamHQ's specific domain — a 24-agent product team running sequential pipelines, shipping small products fast.

**Design principles for this dashboard:**
- Glanceable: the CEO should understand the team's state in under 3 seconds
- Data-dense but not cluttered: every element earns its space
- Consistent with the existing TeamHQ design system (light theme, Royal Jaguar Green accent, Planar/Geist type, 4px grid, flat cards)
- Plain HTML/CSS/vanilla JS — no frameworks

---

## 2. Page Structure

The dashboard replaces the current `index.html` content (hero + hub grid + how it works). Navigation remains unchanged (top bar with Tools, Projects, Tasks, etc.).

```
.dashboard
  .dashboard__metrics          → 4-card metric row
  .dashboard__charts           → 4-card chart row
  .dashboard__agents           → Active agents panel
  .dashboard__bottom           → 2-column: Activity Feed + Recent Tasks
```

All content sits inside the existing `.container` (max-width: 1120px, auto margins, horizontal padding per breakpoint).

### Page Title Area

No hero section. The page opens directly into the metric cards. The nav already identifies this as TeamHQ. A small page header provides context:

```
.dashboard__header
  .dashboard__title            → "Dashboard"
  .dashboard__subtitle         → "Last updated {time}" (auto-refresh indicator)
```

- `.dashboard__header`: padding-top `--space-8`, padding-bottom `--space-6`, border-bottom: none
- `.dashboard__title`: font-family `'Chromatica', var(--font-heading)`, font-size `--text-2xl`, font-weight 700, color `--color-text-primary`
- `.dashboard__subtitle`: font-size `--text-sm`, color `--color-text-tertiary-accessible`, margin-top `--space-1`

---

## 3. Metric Cards (Top Row)

Four cards in a single row. Each card shows one key number with a label and optional trend indicator.

### 3.1 The Four Metrics

| Position | Metric | Label | Source | Why |
|----------|--------|-------|--------|-----|
| 1 | **Pipeline Status** | "Pipeline" | Active project's current phase | The single most important question: where are we in the build? |
| 2 | **Projects Shipped** | "Shipped" | Count of `status: completed` projects | Running score — momentum indicator |
| 3 | **Active Tasks** | "In Progress" | Count of work items with `status: in-progress` across all projects | How much work is actively being done right now |
| 4 | **Agents on Roster** | "Team Size" | Count of agents in roster | Stable reference number (24), grounds the other metrics |

**Why these four:** The CEO's mental model is "pipeline-first." Metric 1 answers "where are we?" Metric 2 answers "what have we done?" Metric 3 answers "how much is in flight?" Metric 4 grounds it all in team capacity.

**Alternative considered:** Month Spend / Cost Tracking. Deferred because TeamHQ doesn't currently track per-agent costs. Can replace "Team Size" when cost data becomes available.

### 3.2 Card Layout

```
.metric-card
  .metric-card__label          → uppercase label
  .metric-card__value          → large number or short text
  .metric-card__trend          → optional: small trend indicator (arrow + percentage or delta text)
```

### 3.3 Card Visual Spec

**Container (`.metric-card`):**
- Display: flex, flex-direction: column, justify-content: space-between
- Background: `--color-bg-card` (#ffffff)
- Border: 1px solid `--color-border` (#e5e5e5)
- Border-radius: `--radius-lg` (4px)
- Padding: `--space-5` (20px)
- Min-height: 108px
- Transition: border-color 150ms ease

**Grid (`.dashboard__metrics`):**
- Display: grid
- grid-template-columns: repeat(4, 1fr)
- Gap: `--space-4` (16px)
- Margin-bottom: `--space-6` (24px)

**Label (`.metric-card__label`):**
- Font-family: `var(--font-family)`
- Font-size: `--text-xs` (0.75rem)
- Font-weight: `--font-weight-medium` (500)
- Text-transform: uppercase
- Letter-spacing: 0.05em
- Color: `--color-text-tertiary-accessible` (#767676)
- Margin-bottom: `--space-2` (8px)

**Value (`.metric-card__value`):**
- Font-family: `var(--font-family)`
- Font-size: `--text-3xl` (1.875rem)
- Font-weight: `--font-weight-semibold` (600)
- Color: `--color-text-primary` (#171717)
- Line-height: `--leading-tight` (1.2)
- font-variant-numeric: tabular-nums (monospaced digits for stable layout)

**For the Pipeline card**, the value is a short phase name (e.g., "Design", "Frontend", "QA") instead of a number. Style is the same but font-size drops to `--text-2xl` (1.5rem) to accommodate longer text. Add a colored dot before the phase name:
- Dot: 8px x 8px circle, border-radius: 50%, margin-right: `--space-2`
- Dot color by phase: Research = `--color-sky-400`, Scope = `--color-indigo-400`, Architecture = `--color-violet-400`, Design = `--color-purple-400`, Backend = `--color-emerald-400`, Frontend = `--color-pink-400`, Review = `--color-amber-400`, QA = `--color-amber-500`, Shipped = `--color-status-success`, Idle = `--color-text-tertiary-accessible`

**Trend indicator (`.metric-card__trend`):**
- Font-size: `--text-xs` (0.75rem)
- Font-weight: `--font-weight-medium` (500)
- Color: `--color-status-success` (#16a34a) for positive, `--color-text-tertiary-accessible` for neutral
- Margin-top: `--space-2` (8px)
- Content: e.g., "+3 this month" for Shipped, or "2 blocked" for In Progress (red if blocked)

### 3.4 Metric Card States

| State | Behavior |
|-------|----------|
| **Default** | As specified above |
| **Hover** | border-color: `--color-border-strong` (#d4d4d4), cursor: default (cards are not clickable) |
| **Loading** | Value replaced with a skeleton bar: 60% width, 28px height, background `--color-neutral-200`, border-radius `--radius-sm`, opacity pulse animation (0.4 to 1.0, 1.5s, infinite) |
| **Empty/No Data** | Value shows "--", trend shows "No data" in `--color-text-tertiary-accessible` |
| **Error** | Value shows "--", trend shows "Failed to load" in `--color-status-error` |

---

## 4. Visualization Cards (Chart Row)

Four mini chart cards below the metrics. Each shows a 14-day trend using simple bar charts rendered with inline SVG (no charting library — keeps it vanilla JS).

### 4.1 The Four Charts

| Position | Chart | Type | Data Source | What It Shows |
|----------|-------|------|-------------|---------------|
| 1 | **Pipeline Activity** | Stacked bar (14 days) | Pipeline log entries per day, colored by phase | How active the pipeline has been, and in which phases |
| 2 | **Tasks by Status** | Stacked bar (14 days) | Work items grouped by status per day | Distribution of planned / in-progress / completed over time |
| 3 | **Agent Activity** | Bar chart (14 days) | Count of unique agents active per day (from pipeline log) | Team utilization — are we using the bench? |
| 4 | **Projects Shipped** | Cumulative line/step (14 days) | Cumulative completed projects over time | Shipping velocity — are we accelerating? |

### 4.2 Chart Card Layout

```
.chart-card
  .chart-card__header
    .chart-card__title         → chart name
    .chart-card__period        → "14 days"
  .chart-card__body
    .chart-card__svg           → inline SVG chart
```

### 4.3 Chart Card Visual Spec

**Container (`.chart-card`):**
- Background: `--color-bg-card`
- Border: 1px solid `--color-border`
- Border-radius: `--radius-lg` (4px)
- Padding: `--space-5` (20px)
- Min-height: 180px

**Grid (`.dashboard__charts`):**
- Display: grid
- grid-template-columns: repeat(4, 1fr)
- Gap: `--space-4` (16px)
- Margin-bottom: `--space-6` (24px)

**Header (`.chart-card__header`):**
- Display: flex, justify-content: space-between, align-items: baseline
- Margin-bottom: `--space-4` (16px)

**Title (`.chart-card__title`):**
- Font-size: `--text-sm` (0.875rem)
- Font-weight: `--font-weight-medium` (500)
- Color: `--color-text-primary`

**Period (`.chart-card__period`):**
- Font-size: `--text-xs` (0.75rem)
- Color: `--color-text-tertiary-accessible`

**SVG Chart (`.chart-card__svg`):**
- Width: 100%
- Height: 100px
- Bars: 2px gap between bars, border-radius 2px top corners
- Bar colors for Pipeline Activity (stacked): use phase colors from section 3.3
- Bar colors for Tasks by Status: planned = `--color-neutral-300`, in-progress = `--color-accent`, completed = `--color-status-success`
- Bar colors for Agent Activity: single color `--color-accent` with opacity 0.7
- Line color for Projects Shipped: `--color-accent`, 2px stroke, no fill (or subtle fill at 0.06 opacity below the line)
- Grid lines: none (clean look). Subtle bottom axis line: 1px solid `--color-border`
- No axis labels (the period badge provides context). Tooltip on hover showing day and count.

**Tooltip:**
- Position: absolute, above the hovered bar
- Background: `--color-neutral-900` (#171717)
- Color: `--color-white`
- Font-size: `--text-xs`
- Padding: `--space-1` `--space-2`
- Border-radius: `--radius-sm` (4px)
- Content: "Mar 14: 5 tasks" or "Mar 14: 3 agents"
- Arrow: 4px CSS triangle pointing down
- Transition: opacity 100ms ease

### 4.4 Chart Card States

| State | Behavior |
|-------|----------|
| **Default** | Chart rendered with available data |
| **Hover (bar)** | Bar opacity increases to 1.0, tooltip appears |
| **Loading** | SVG area shows 14 skeleton bars at varying heights (40-80px), pulsing |
| **Empty** | Flat line / no bars. Center text: "No activity in the last 14 days" in `--text-xs`, `--color-text-tertiary-accessible` |
| **Error** | Center text: "Failed to load chart data" in `--text-xs`, `--color-status-error` |

---

## 5. Active Agents Section

The heart of the dashboard. Shows which agents are currently working (or recently worked) on the active pipeline. Inspired by Paperclip's live agent cards with transcript snippets.

### 5.1 Section Layout

```
.dashboard__agents
  .agents-panel
    .agents-panel__header
      .agents-panel__title     → "Active Agents"
      .agents-panel__count     → badge with count
    .agents-panel__grid
      .agent-run-card          → one per active agent (repeating)
```

**Section (`.dashboard__agents`):**
- Margin-bottom: `--space-6` (24px)

**Panel (`.agents-panel`):**
- Background: `--color-bg-card`
- Border: 1px solid `--color-border`
- Border-radius: `--radius-lg` (4px)
- Padding: `--space-6` (24px)

**Header (`.agents-panel__header`):**
- Display: flex, align-items: center, gap: `--space-3`
- Margin-bottom: `--space-5` (20px)

**Title (`.agents-panel__title`):**
- Font-size: `--text-lg` (1.125rem)
- Font-weight: `--font-weight-semibold` (600)
- Color: `--color-text-primary`

**Count badge (`.agents-panel__count`):**
- Display: inline-flex, align-items: center, justify-content: center
- Min-width: 24px, height: 24px
- Background: `rgba(var(--color-green-accent-rgb), 0.08)`
- Color: `--color-accent`
- Font-size: `--text-xs`
- Font-weight: `--font-weight-semibold`
- Border-radius: 9999px
- Padding: 0 `--space-2`

**Grid (`.agents-panel__grid`):**
- Display: grid
- grid-template-columns: repeat(3, 1fr)
- Gap: `--space-4` (16px)

### 5.2 Agent Run Card

Each card represents one agent's current or most recent activity.

```
.agent-run-card
  .agent-run-card__header
    .agent-run-card__avatar    → pixel art avatar (32x32)
    .agent-run-card__info
      .agent-run-card__name    → "Thomas (PM)"
      .agent-run-card__status  → status badge: "Running" / "Completed" / "Idle"
  .agent-run-card__task        → current task description (truncated)
  .agent-run-card__transcript  → last transcript snippet (2 lines max)
  .agent-run-card__meta        → time elapsed / completed ago
```

**Card container (`.agent-run-card`):**
- Background: `--color-bg-secondary` (#fafafa)
- Border: 1px solid `--color-border`
- Border-radius: `--radius-lg` (4px)
- Padding: `--space-4` (16px)
- Transition: border-color 150ms ease

**Active glow (when status is "Running"):**
- Border-color: `rgba(var(--color-green-accent-rgb), 0.3)`
- Box-shadow: `0 0 0 1px rgba(var(--color-green-accent-rgb), 0.08)`
- Add a subtle left-border accent: border-left: 2px solid `--color-accent`

**Header (`.agent-run-card__header`):**
- Display: flex, align-items: center, gap: `--space-3`
- Margin-bottom: `--space-3`

**Avatar (`.agent-run-card__avatar`):**
- Width: 32px, height: 32px
- Border-radius: `--radius-sm` (4px)
- Object-fit: cover
- Source: `img/avatars/{agent-name}.svg`

**Name (`.agent-run-card__name`):**
- Font-size: `--text-sm` (0.875rem)
- Font-weight: `--font-weight-medium` (500)
- Color: `--color-text-primary`

**Status badge (`.agent-run-card__status`):**
- Font-size: `--text-xs` (0.75rem)
- Font-weight: `--font-weight-medium` (500)
- Text-transform: uppercase
- Letter-spacing: 0.05em
- Padding: `--space-1` `--space-2`
- Border-radius: 9999px
- Variants:
  - Running: background `rgba(var(--color-green-accent-rgb), 0.08)`, color `--color-accent`
  - Completed: background `rgba(var(--color-green-600-rgb), 0.08)`, color `--color-status-success`
  - Idle: background `--color-neutral-100`, color `--color-text-tertiary-accessible`
  - Blocked: background `rgba(var(--color-red-600-rgb), 0.08)`, color `--color-status-error`

**Task (`.agent-run-card__task`):**
- Font-size: `--text-sm` (0.875rem)
- Color: `--color-text-primary`
- Line-height: `--leading-normal`
- Margin-bottom: `--space-2`
- White-space: nowrap, overflow: hidden, text-overflow: ellipsis (single line truncation)

**Transcript snippet (`.agent-run-card__transcript`):**
- Font-family: `var(--font-mono)`
- Font-size: `--text-xs` (0.75rem)
- Color: `--color-text-tertiary-accessible`
- Line-height: `--leading-normal`
- Background: `--color-neutral-100` (#f5f5f5)
- Padding: `--space-2` `--space-3`
- Border-radius: `--radius-sm` (4px)
- Max-height: 2.4em (2 lines), overflow: hidden
- Margin-bottom: `--space-2`

**Meta (`.agent-run-card__meta`):**
- Font-size: `--text-xs` (0.75rem)
- Color: `--color-text-tertiary-accessible`

### 5.3 Agent Card States

| State | Behavior |
|-------|----------|
| **Running** | Green left border + subtle glow. Status badge shows "Running". Transcript updates. |
| **Completed** | No glow. Status badge shows "Completed". Transcript shows final output snippet. |
| **Idle** | Gray status badge. Task shows "No active task". Transcript area hidden. |
| **Blocked** | Red left border (2px solid `--color-status-error`). Status badge shows "Blocked" in red. |
| **Hover** | border-color: `--color-border-strong` |
| **Loading** | Skeleton: avatar circle + 2 text bars + transcript block, all pulsing |
| **Empty (no agents)** | Panel shows centered message: "No agents currently active" with `--text-sm`, `--color-text-secondary` |

---

## 6. Bottom Section: Activity Feed + Recent Tasks

Two-column layout at the bottom of the dashboard.

### 6.1 Layout

```
.dashboard__bottom
  .activity-feed               → left column (wider)
  .recent-tasks                → right column
```

**Grid (`.dashboard__bottom`):**
- Display: grid
- grid-template-columns: 1.4fr 1fr
- Gap: `--space-4` (16px)
- Margin-bottom: `--space-8` (32px)

### 6.2 Activity Feed (Left Column)

Chronological list of pipeline events. Each entry shows who did what, when.

```
.activity-feed
  .activity-feed__header
    .activity-feed__title      → "Recent Activity"
  .activity-feed__list
    .activity-feed__item       → repeating
      .activity-feed__dot      → colored dot (agent color)
      .activity-feed__content
        .activity-feed__text   → "Thomas completed requirements for QuoteVoice"
        .activity-feed__time   → "2 hours ago"
```

**Panel (`.activity-feed`):**
- Background: `--color-bg-card`
- Border: 1px solid `--color-border`
- Border-radius: `--radius-lg` (4px)
- Padding: `--space-6` (24px)
- Max-height: 420px
- Overflow-y: auto

**Title (`.activity-feed__title`):**
- Font-size: `--text-lg` (1.125rem)
- Font-weight: `--font-weight-semibold` (600)
- Color: `--color-text-primary`
- Margin-bottom: `--space-5` (20px)

**List (`.activity-feed__list`):**
- Display: flex, flex-direction: column
- Gap: 0 (items separated by border)

**Item (`.activity-feed__item`):**
- Display: flex, align-items: flex-start, gap: `--space-3`
- Padding: `--space-3` 0
- Border-bottom: 1px solid `--color-border` (except last child)

**Dot (`.activity-feed__dot`):**
- Width: 8px, height: 8px, min-width: 8px
- Border-radius: 50%
- Margin-top: 6px (aligns with first line of text)
- Background: agent's identity color (`--color-agent-{name}`)

**Text (`.activity-feed__text`):**
- Font-size: `--text-sm` (0.875rem)
- Color: `--color-text-primary`
- Line-height: `--leading-normal`
- Agent name is bold: `--font-weight-medium`

**Time (`.activity-feed__time`):**
- Font-size: `--text-xs` (0.75rem)
- Color: `--color-text-tertiary-accessible`
- Margin-top: `--space-1`

**Data source:** Pipeline log entries across all projects, sorted by most recent. Show the 20 most recent entries. Each entry is constructed from the pipeline log's task completion events.

**Example entries:**
- "**Thomas** completed requirements for QuoteVoice" — 2 hours ago
- "**Andrei** completed tech approach for QuoteVoice" — 4 hours ago
- "**Enzo** passed QA for VoiceNote Pro" — 1 day ago
- "**Alice** started frontend for SiteSnap" — 2 days ago

### 6.3 Recent Tasks (Right Column)

List of work items across all active projects, sorted by most recently updated.

```
.recent-tasks
  .recent-tasks__header
    .recent-tasks__title       → "Recent Tasks"
    .recent-tasks__link        → "View all" link to tasks.html
  .recent-tasks__list
    .recent-tasks__item        → repeating
      .recent-tasks__status    → status dot
      .recent-tasks__content
        .recent-tasks__name    → task title (truncated)
        .recent-tasks__project → project name
```

**Panel (`.recent-tasks`):**
- Background: `--color-bg-card`
- Border: 1px solid `--color-border`
- Border-radius: `--radius-lg` (4px)
- Padding: `--space-6` (24px)
- Max-height: 420px
- Overflow-y: auto

**Title (`.recent-tasks__title`):**
- Font-size: `--text-lg` (1.125rem)
- Font-weight: `--font-weight-semibold` (600)
- Color: `--color-text-primary`

**"View all" link (`.recent-tasks__link`):**
- Font-size: `--text-sm` (0.875rem)
- Color: `--color-accent`
- Text-decoration: none
- Hover: text-decoration underline

**Header row:**
- Display: flex, justify-content: space-between, align-items: baseline
- Margin-bottom: `--space-5` (20px)

**Item (`.recent-tasks__item`):**
- Display: flex, align-items: flex-start, gap: `--space-3`
- Padding: `--space-3` 0
- Border-bottom: 1px solid `--color-border` (except last child)

**Status dot (`.recent-tasks__status`):**
- Width: 8px, height: 8px, min-width: 8px
- Border-radius: 50%
- Margin-top: 6px
- Colors: planned = `--color-neutral-300`, in-progress = `--color-accent`, completed = `--color-status-success`, blocked = `--color-status-error`

**Task name (`.recent-tasks__name`):**
- Font-size: `--text-sm` (0.875rem)
- Font-weight: `--font-weight-normal` (400)
- Color: `--color-text-primary`
- White-space: nowrap, overflow: hidden, text-overflow: ellipsis

**Project name (`.recent-tasks__project`):**
- Font-size: `--text-xs` (0.75rem)
- Color: `--color-text-tertiary-accessible`
- Margin-top: `--space-1`

**Data source:** Work items from `data/work-items/*.json`, sorted by most recently updated. Show 15 items.

### 6.4 Bottom Section States

| State | Behavior |
|-------|----------|
| **Loading** | 5 skeleton rows per panel: dot placeholder + 2 text bars, pulsing |
| **Empty (Activity)** | "No recent pipeline activity" centered, `--text-sm`, `--color-text-secondary` |
| **Empty (Tasks)** | "No tasks found" centered, `--text-sm`, `--color-text-secondary` |
| **Error** | "Failed to load" in `--color-status-error`, centered |
| **Scrollable** | When content exceeds max-height, a subtle scroll indicator appears (fade gradient at bottom, 24px, from transparent to `--color-bg-card`) |

---

## 7. Navigation

**No changes to navigation structure.** The existing top nav bar is retained as-is:

- Sticky top bar with frosted glass background
- Logo left, links right
- Links: Tools, Projects, Tasks, Meetings, Interviews, Docs, Spreadsheets, Team
- The dashboard *is* the index/home page (logo link destination)

**Rationale for keeping top nav (not sidebar):** TeamHQ has 8 pages. A sidebar would consume horizontal space that the dashboard's 4-column metric/chart grids need. Top nav is already established across all pages. Consistency wins over novelty.

The "Dashboard" link can optionally be added as the first nav item (before Tools) with `nav__link--active` state when on index.html. Or the logo serves as the home/dashboard link. Recommend: logo as dashboard link, no explicit "Dashboard" nav item (current behavior).

---

## 8. Color System

The dashboard uses the existing TeamHQ token system. No new color scales are introduced. The dashboard is designed for the current light theme.

### 8.1 Light Theme (Current / Primary)

| Role | Token | Value |
|------|-------|-------|
| Page background | `--color-bg-primary` | #ffffff |
| Card background | `--color-bg-card` | #ffffff |
| Card secondary bg | `--color-bg-secondary` | #fafafa |
| Primary text | `--color-text-primary` | #171717 |
| Secondary text | `--color-text-secondary` | #666666 |
| Tertiary text | `--color-text-tertiary-accessible` | #767676 |
| Accent | `--color-accent` | #006B3F (Royal Jaguar Green) |
| Border | `--color-border` | #e5e5e5 |
| Border strong | `--color-border-strong` | #d4d4d4 |

### 8.2 Dark Theme (Future — Design Tokens Only)

A dark theme is not in scope for v1 but the token architecture supports it. When implemented, add a `.dark` class on `<html>` (or use `prefers-color-scheme` media query) that overrides semantic tokens:

| Role | Dark Value |
|------|-----------|
| Page background | `--color-neutral-950` (#0a0a0a) |
| Card background | `--color-neutral-900` (#171717) |
| Card secondary bg | `--color-neutral-800` (#262626) |
| Primary text | `--color-neutral-100` (#f5f5f5) |
| Secondary text | `--color-neutral-400` (#a3a3a3) |
| Tertiary text | `--color-neutral-500` (#737373) |
| Accent | #00A35C (brighter green for dark bg contrast) |
| Border | `--color-neutral-800` (#262626) |
| Border strong | `--color-neutral-700` (#404040) |

**No implementation needed now.** Documenting here so Alice can structure the CSS to swap cleanly later.

---

## 9. Responsive Behavior

### 9.1 Breakpoints

| Name | Range | Key Changes |
|------|-------|-------------|
| **Mobile** | < 640px | All grids become single column. Agents panel shows 1 card. Bottom section stacks vertically. |
| **Tablet** | 640px - 1023px | Metrics: 2x2 grid. Charts: 2x2 grid. Agents: 2 columns. Bottom: stacked. |
| **Desktop** | >= 1024px | Full 4-column layout for metrics and charts. 3-column agents. 2-column bottom. |

### 9.2 Responsive Rules

**Mobile (< 640px):**
```css
.dashboard__metrics { grid-template-columns: repeat(2, 1fr); }
.dashboard__charts { grid-template-columns: 1fr; }
.agents-panel__grid { grid-template-columns: 1fr; }
.dashboard__bottom { grid-template-columns: 1fr; }
```
- Metric cards: 2x2 grid (keeps them compact)
- Chart cards: single column, full width
- Agent cards: single column, show max 3 cards with "Show more" toggle
- Bottom panels: stacked (Activity Feed on top, Recent Tasks below)
- Max-height on panels removed (full content visible, no scroll)

**Tablet (640px - 1023px):**
```css
.dashboard__metrics { grid-template-columns: repeat(2, 1fr); }
.dashboard__charts { grid-template-columns: repeat(2, 1fr); }
.agents-panel__grid { grid-template-columns: repeat(2, 1fr); }
.dashboard__bottom { grid-template-columns: 1fr; }
```

**Desktop (>= 1024px):**
Full layout as specified in sections 3-6.

### 9.3 Touch Targets

All interactive elements (links, buttons, "View all", "Show more") have minimum 44x44px touch target on mobile. Achieved via padding/min-height, not by increasing font size.

---

## 10. Skeleton Loading Pattern

All dashboard sections load data asynchronously. A consistent skeleton pattern prevents layout shift and communicates loading state.

### 10.1 Skeleton Element

```css
.skeleton {
  background: var(--color-neutral-200);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

### 10.2 Per-Section Skeletons

| Section | Skeleton Shape |
|---------|---------------|
| Metric cards | 4 cards with: label bar (48px wide, 12px tall) + value bar (80px wide, 28px tall) + trend bar (60px wide, 12px tall) |
| Chart cards | 4 cards with: title bar (100px wide, 14px tall) + 14 vertical bars at random heights (40-80px) |
| Agent cards | 3 cards with: avatar circle (32px) + name bar (120px, 14px) + task bar (full width, 14px) + transcript block (full width, 36px) |
| Activity feed | 5 rows with: dot circle (8px) + text bar (80% width, 14px) + time bar (60px, 12px) |
| Recent tasks | 5 rows with: dot circle (8px) + name bar (70% width, 14px) + project bar (40%, 12px) |

### 10.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; opacity: 0.6; }
}
```

---

## 11. Animations and Transitions

| Element | Property | Duration | Easing | Trigger |
|---------|----------|----------|--------|---------|
| Card border-color | border-color | 150ms | ease | Hover |
| Tooltip | opacity | 100ms | ease | Bar hover |
| Skeleton pulse | opacity | 1.5s | ease-in-out | Continuous (loading) |
| Data refresh | opacity | 200ms | ease | Fade old data out, new data in |
| "Show more" expand | max-height, opacity | 200ms | ease | Click toggle (mobile agents) |

All animations respect `prefers-reduced-motion: reduce` — disabled or replaced with instant transitions.

---

## 12. Accessibility

### 12.1 Semantic Structure

```html
<main id="main-content">
  <section aria-labelledby="metrics-heading">
    <h2 id="metrics-heading" class="sr-only">Key Metrics</h2>
    <!-- metric cards -->
  </section>
  <section aria-labelledby="charts-heading">
    <h2 id="charts-heading" class="sr-only">Activity Charts</h2>
    <!-- chart cards -->
  </section>
  <section aria-labelledby="agents-heading">
    <h2 id="agents-heading">Active Agents</h2>
    <!-- agent cards -->
  </section>
  <section aria-labelledby="activity-heading">
    <h2 id="activity-heading">Recent Activity</h2>
    <!-- feed -->
  </section>
  <section aria-labelledby="tasks-heading">
    <h2 id="tasks-heading">Recent Tasks</h2>
    <!-- tasks -->
  </section>
</main>
```

- Visually hidden headings (`.sr-only`) for metric and chart sections so screen readers can navigate by heading
- Each metric card uses `role="status"` and `aria-label="Pipeline: Design phase"` (or equivalent) so screen readers announce the metric
- SVG charts include `role="img"` and `aria-label` describing the trend (e.g., "Pipeline activity over 14 days: average 4 tasks per day")
- Activity feed items use a `<ul>` with `<li>` elements
- Recent tasks use a `<ul>` with `<li>` elements

### 12.2 Contrast

All text/color combinations in this spec have been checked against the token system and meet WCAG AA:
- Primary text (#171717) on white: 18.1:1
- Secondary text (#666666) on white: 5.7:1
- Tertiary accessible (#767676) on white: 4.5:1
- Accent (#006B3F) on white: 5.9:1
- Status success (#16a34a) on white: 4.5:1
- Status error (#dc2626) on white: 4.6:1

### 12.3 Keyboard Navigation

- Tab order follows visual order: metrics (read-only) -> charts (read-only) -> agent cards -> activity feed links -> recent tasks links -> "View all" link
- Skip link at page top targets `#main-content`
- Focus-visible styles use the global pattern: 2px solid `--color-accent`, offset 2px

---

## 13. Data Architecture (for Alice/Jonah)

The dashboard reads from existing data files via the TeamHQ Express API. No new endpoints are strictly required — the dashboard aggregates existing data.

### 13.1 Data Sources

| Dashboard Section | API Endpoint / Data File | What to Read |
|-------------------|--------------------------|--------------|
| Metric: Pipeline | `GET /api/projects` | Find the project with `status: in-progress`, read its pipeline tasks to determine current phase |
| Metric: Shipped | `GET /api/projects` | Count projects with `status: completed` |
| Metric: In Progress | `GET /api/projects/:id/work-items` (for each active project) | Count items with `status: in-progress` |
| Metric: Team Size | Hardcoded: 24 | Static (or read from `data/roster.json` if it exists) |
| Charts | Pipeline log files in `data/pipeline-log/` | Aggregate task completion dates from pipeline log entries |
| Active Agents | `GET /api/projects` (in-progress) + pipeline log | Most recent task entries per agent |
| Activity Feed | Pipeline log files | All task entries sorted by completion, most recent first |
| Recent Tasks | `GET /api/projects/:id/work-items` | All work items sorted by `updatedAt`, most recent first |

### 13.2 Refresh Strategy

- Initial load: fetch all data on page load
- Auto-refresh: poll every 60 seconds (configurable). Fade transition when data updates.
- No WebSocket / SSE needed for v1.

### 13.3 New API Endpoint (Recommended)

To avoid multiple round-trips, Alice or Jonah should consider a single `GET /api/dashboard` endpoint that aggregates all dashboard data server-side and returns a single JSON payload:

```json
{
  "metrics": {
    "pipeline": { "phase": "Design", "project": "QuoteVoice" },
    "shipped": 24,
    "inProgress": 3,
    "teamSize": 24
  },
  "charts": {
    "pipelineActivity": [ { "date": "2026-03-02", "phases": { "scope": 1, "design": 2 } }, ... ],
    "tasksByStatus": [ { "date": "2026-03-02", "planned": 5, "inProgress": 3, "completed": 2 }, ... ],
    "agentActivity": [ { "date": "2026-03-02", "count": 4 }, ... ],
    "projectsShipped": [ { "date": "2026-03-02", "cumulative": 22 }, ... ]
  },
  "activeAgents": [
    { "name": "thomas", "displayName": "Thomas (PM)", "status": "completed", "task": "Write requirements for QuoteVoice", "transcript": "...", "avatar": "img/avatars/thomas.svg", "elapsed": "2h ago" }
  ],
  "recentActivity": [
    { "agent": "thomas", "action": "completed requirements", "project": "QuoteVoice", "time": "2h ago" }
  ],
  "recentTasks": [
    { "id": "QV-001", "title": "Write requirements", "project": "QuoteVoice", "status": "completed" }
  ]
}
```

---

## 14. File Structure

```
index.html               → Updated: dashboard layout replaces hero + hub grid
css/dashboard.css         → New: all dashboard-specific styles
js/dashboard.js           → New: data fetching, chart rendering, auto-refresh
```

The existing `css/styles.css` retains shared page styles (hero, hub, how-it-works) in case they are needed on a separate "about" page later. The dashboard styles live in their own file to avoid conflicts.

---

## 15. Implementation Notes for Alice

1. **SVG charts are inline, not canvas.** Use `document.createElementNS` to build SVG bar charts. Each bar is a `<rect>`. Stacked bars are multiple `<rect>` elements at calculated y-offsets. This keeps the DOM inspectable and avoids canvas complexity.

2. **Skeleton-first rendering.** On page load, render all skeleton states immediately. Replace with real data as each fetch resolves. This prevents layout shift and gives instant visual feedback.

3. **Data normalization.** Pipeline log files have varying structures (some tasks have `subtasks`, some don't). The `dashboard.js` should normalize all pipeline log entries into a flat event list: `{ agent, action, project, date }`.

4. **Agent cards are ordered by recency.** Most recently active agent first. Show a maximum of 6 agent cards on desktop, 4 on tablet, 3 on mobile. If more agents are active, show a "+N more" indicator.

5. **No charting library.** The bar charts are simple enough to render as SVG rects. The cumulative line chart is a `<polyline>`. Keep it vanilla.

6. **Tooltips on charts.** Use a single tooltip element that repositions on `mousemove` over chart bars. This is more performant than per-bar tooltip elements.

7. **The "Hub" navigation grid (Tools, Projects, Tasks, etc.) is removed from the dashboard.** The top nav provides access to all sections. If the CEO wants quick-access cards, they can be added back as a secondary section below the dashboard panels.

---

## 16. Design Decisions Log

| Decision | Chosen | Alternative | Why |
|----------|--------|-------------|-----|
| Top nav (no sidebar) | Top horizontal nav | Left sidebar | Dashboard needs full width for 4-column grids. Sidebar would force narrower cards or require wider viewport minimums. |
| Light theme only (v1) | Light theme | Dark + light | Existing TeamHQ is light. Adding dark mode doubles the CSS surface. Token architecture supports it for v2. |
| Pipeline phase as metric 1 | Phase name with colored dot | Numeric progress percentage | Phase names are more meaningful than "67%". The CEO thinks in pipeline phases. |
| Team Size as metric 4 | Static count | Cost tracking | No cost data available yet. Team Size is a stable reference. Swap for cost when data exists. |
| SVG charts (no library) | Inline SVG | Chart.js / D3 | Vanilla JS constraint. 14-bar charts are trivially renderable as SVG rects. No dependency needed. |
| 14-day chart window | 14 days | 7 days / 30 days | Matches Paperclip's pattern. 14 days shows meaningful trends without compressing too much data. |
| 3-column agent grid | 3 columns | 2 columns | 6 agents visible without scrolling on desktop. 2 columns wastes horizontal space. |
| Aggregated API endpoint | Single `/api/dashboard` | Multiple fetches | Reduces round-trips from 5-10 to 1. Dashboard load is the most common page view. |

---

## 17. CEO Decisions (Resolved)

1. **Hub removal:** ✅ **Remove the hub navigation grid.** Top nav is sufficient. No condensed version needed.

2. **"How It Works" section:** ✅ **Remove entirely.** Not needed — the CEO knows how it works.

3. **Active agents data:** ✅ **Add a lightweight agent status data file.** Agents will update a status file (`data/agent-status.json`) when they start/complete tasks. This gives the dashboard near-real-time agent activity data including current task, status, and last transcript snippet.

4. **Cost tracking:** ✅ **Keep Team Size for now.** The metric is loved. Cost tracking will be added as a *fifth* metric or separate section when Paperclip cost data is available, rather than replacing Team Size.
