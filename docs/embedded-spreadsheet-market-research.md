# Embedded Spreadsheet / Table Viewer — Market Research

**Researcher:** Suki (Product Researcher)
**Date:** 2026-02-09
**Scope:** How modern tools present embedded tabular data, and what patterns make a table feel polished vs. basic.

---

## Product Analysis

### 1. Notion — Database Views & Table Blocks

**How it feels:** Clean and document-native. Tables are first-class content blocks, not foreign objects dropped into a page. The June 2025 UI overhaul pushed further toward minimalism — streamlined database chrome, reduced visual noise, and a cleaner sense of hierarchy.

**Key interactions:**
- Inline editing by clicking any cell. No "edit mode" toggle — the table is always live.
- Column resize via drag handle that appears on hover at column edges.
- Frozen/sticky first column option ("Freeze up to column") keeps context while scrolling wide tables.
- Header row shading toggle for visual distinction.
- Sorting, filtering, and grouping accessible from the header row — no separate toolbar required.
- Multiple views of the same data (table, board, calendar, gallery) with per-view filters/sorts.
- Wrap text toggle per column.

**Data types:** Rich. Native handling for text, numbers, dates, selects (colored tags), people, checkboxes, URLs, formulas, and relations. Each type gets its own cell renderer (e.g., colored pills for selects, date pickers for dates).

**Mobile:** Full read/edit capability in the Notion app. Tables become horizontally scrollable with a sticky first column. Smaller viewport triggers tighter row heights.

**Styling:** Minimal borders — horizontal rules only (no vertical cell borders). Light header shading. No zebra striping by default. Generous cell padding. Clean sans-serif typography.

**Standout detail:** The column type system. Each column declares its type, and every interaction (sorting, filtering, cell editing) adapts to that type. Currency columns sort numerically and format with symbols. Date columns open a date picker. This is what elevates it above a basic HTML table.

---

### 2. Airtable — Grid Views

**How it feels:** Spreadsheet-dense but database-smart. More data-forward than Notion — the grid is the primary view, not an inline content block. Feels like "Excel that understands data types."

**Key interactions:**
- Row height toggle (short / medium / tall / extra tall) — density control for different use cases.
- Column reorder via drag on the header.
- Field visibility panel — toggle columns on/off without deleting them.
- Column resize by dragging separator.
- Inline cell editing with type-aware input controls.
- Search bar filters rows in real-time.
- View switching (grid, kanban, gallery, calendar, timeline, Gantt) with smooth, near-instant transitions.
- Unlimited views per table, each with independent filters, sorts, grouping, and visible fields.

**Data types:** The most sophisticated of any product analyzed. 25+ field types including currency, percent, barcode, rating (star display), duration, and auto-number. Each type has a purpose-built cell renderer.

**Mobile:** Grid view available on mobile but with limited columns visible. The interface designer allows building mobile-specific simplified views. Horizontal scroll with sticky primary column. Mobile editing is functional but clearly secondary to desktop.

**Styling:** Traditional grid lines (both horizontal and vertical borders). Colored field type icons in the header. Row numbering. Primary field column is visually distinct (slightly wider, bolder font). More "spreadsheet" than "document" in its visual language.

**Standout detail:** The "Interface Designer" layer. You can build a clean, minimal dashboard on top of your raw grid — showing the right fields to the right people. The grid is the power tool; interfaces are the polished presentation layer.

---

### 3. Linear — Issue Tables/Views

**How it feels:** The most visually refined of the group. Razor-sharp, minimal, fast. The table isn't trying to be a spreadsheet — it's an opinionated list view with just enough columnar data.

**Key interactions:**
- Keyboard-first navigation (j/k to move, Enter to open).
- Inline status updates (click-to-cycle through workflow states).
- Swimlane grouping — sub-group by team, assignee, priority, cycle, etc.
- Column sort from header click.
- Minimal filtering UI that stays out of the way.
- View toggle between list and board layouts.
- Instant, snappy transitions when sorting or filtering — no visible re-render.

**Data types:** Purpose-built for issues: status (colored workflow states), priority (icon-based P0-P4), assignee (avatar), labels (colored pills), dates, and cycles. No generic "number" or "currency" column — every column is semantic.

**Mobile:** Mobile app mirrors the list view. Compact rows, no horizontal scroll — columns are selectively shown. Tap to expand into full issue view.

**Styling:** This is where Linear sets the bar. Borderless rows — no cell borders, no grid lines. Extremely subtle row hover (barely-there background shift). Monochrome palette with color used only for status/priority indicators. Tight 8px spacing scale. Bold sans-serif header text with lighter body text. The design language says "this is a tool, not a toy."

**Standout detail:** Data density without visual noise. Linear packs significant information per row (title, status, priority, assignee, labels, project) without feeling cluttered, because it uses whitespace and typography hierarchy instead of borders to separate data.

---

### 4. Coda — Embedded Tables in Docs

**How it feels:** Similar to Notion but more "spreadsheet in a document." Tables are full database objects embedded inline — they can span the page or sit alongside text. The line between "doc content" and "structured data" is intentionally blurred.

**Key interactions:**
- Inline cell editing (click to type).
- Multiple views of the same table — each view can have different filters, sorts, and formatting.
- Card, kanban, calendar, timeline, chart, and form views from the same underlying data.
- Column formulas that reference other tables and external data.
- Conditional formatting — cells change color based on their value.

**Data types:** Similar richness to Notion. Text, numbers, dates, selects, people, sliders, buttons, images, and formulas. The formula language is more powerful than Notion's (closer to spreadsheet functions).

**Mobile:** Responsive layout. Tables scroll horizontally on small screens. Coda's mobile app renders tables in a card-like stacked layout for narrow viewports.

**Styling:** Clean grid lines (lighter than Airtable). Colored conditional formatting adds visual meaning. Header row with background color. More "structured" feeling than Notion's minimal approach.

**Standout detail:** Conditional formatting is native and powerful. A revenue column can automatically turn green for positive values and red for negative. A status column can highlight overdue items. This turns the table from a display into a dashboard.

---

### 5. GitHub — Markdown Tables & CSV Preview

**How it feels:** Utilitarian. GitHub's table rendering is the baseline "basic HTML table" that the other products are designed to surpass. But the CSV preview feature is surprisingly good for what it is.

**Key interactions (CSV preview):**
- Automatic rendering of .csv/.tsv files as interactive tables.
- Header row auto-detection (first row becomes header).
- Search/filter bar above the table — rows filter as you type.
- Click row numbers to link to specific rows.
- Shift-click for multi-row selection.

**Data types:** None — everything is a string. No formatting, no type-aware rendering. A number looks the same as text.

**Styling (Markdown tables):** Simple alternating row shading (light gray / white). Thin horizontal borders. Left-aligned text by default with optional alignment via colons in the markdown syntax. Monospace font for code cells. The styling is readable but unmistakably "developer docs."

**Standout detail:** The CSV search filter is instant and genuinely useful. For a read-only table viewer (which is what TeamHQ likely needs for embedded data), this "search to filter" pattern is high-value, low-complexity.

---

## The 5 Design Patterns That Make a Table Feel Modern

These are the actionable patterns for Robert. Each one separates a polished table from a basic HTML `<table>`.

### Pattern 1: Borders Down, Whitespace Up

**What it is:** Replace grid lines with generous whitespace and subtle horizontal rules. No vertical cell borders. No box around every cell.

**Who does it best:** Linear (zero visible borders, pure whitespace separation), Notion (horizontal rules only).

**Why it works:** Grid lines are visual noise. When every cell has a border, nothing has emphasis. Removing vertical borders and relying on column padding (minimum 16px per side) and consistent alignment lets the data breathe. The table reads more like a well-typeset list than a spreadsheet cage.

**For Robert:** Use only horizontal row separators (1px, `--color-border` from our tokens). No vertical lines. Increase cell padding to `--space-3` or `--space-4` on sides. Header row gets a bottom border in `--color-border-strong`.

---

### Pattern 2: Type-Aware Cell Rendering

**What it is:** Cells look different based on the data type they contain. Currency is right-aligned with a symbol. Dates use a consistent format. Status values become colored pills. Numbers use tabular (monospaced) figures.

**Who does it best:** Airtable (25+ field types, each with its own renderer), Notion (colored select tags, date pickers).

**Why it works:** When every cell is just left-aligned text in the same font, the table is a wall of sameness. Type-aware rendering creates visual rhythm — your eye can scan a column and immediately understand its meaning. Right-aligned numbers make magnitudes scannable. Colored status pills pop against neutral text.

**For Robert:** Define renderers for at least: plain text (left-aligned), numbers (right-aligned, tabular figures via `--font-mono`), currency (right-aligned, symbol prefix, tabular figures), dates (formatted consistently, secondary color), and status/category (colored pill using our existing badge pattern and `--color-emerald-*` / `--color-red-*` tokens).

---

### Pattern 3: Sticky Header + Row Hover

**What it is:** The header row stays pinned at the top during vertical scroll. Rows get a subtle background change on hover.

**Who does it best:** All five products do sticky headers. Linear's hover is the gold standard — barely perceptible, just enough to confirm "this is the row your cursor is on."

**Why it works:** Sticky headers solve the most common table usability failure: scrolling down and losing context on what each column means. Row hover provides spatial orientation in wide, data-dense tables — it draws a visual "ruler" across the row the user is reading.

**For Robert:** Sticky header with `position: sticky; top: 0` and `z-index` plus `--color-bg-primary` background to occlude scrolled content. Row hover using `--color-accent-light` (which is `rgba(0, 107, 63, 0.04)` from our tokens) — extremely subtle, on-brand. No delay on hover-in, 150ms transition on hover-out for smooth feel.

---

### Pattern 4: Typography Hierarchy Within the Table

**What it is:** The header row, the data rows, and secondary metadata all use different font weights, sizes, and colors — not just one uniform style.

**Who does it best:** Linear (bold header, regular body, muted metadata), Notion (medium-weight header, lighter body).

**Why it works:** Typography hierarchy is what makes the difference between "data dumped into a grid" and "information presented with intent." Headers in `--font-weight-semibold` at `--text-sm` with `--color-text-primary` vs. body cells in `--font-weight-normal` at `--text-sm` with `--color-text-secondary` creates a clear visual distinction without any additional design elements.

**For Robert:** Headers: `--font-weight-semibold`, `--text-xs` (uppercase optional, or `--text-sm` sentence case), `--color-text-secondary`. Body: `--font-weight-normal`, `--text-sm`, `--color-text-primary`. Secondary data (dates, IDs): `--text-xs`, `--color-text-tertiary`. All using our `--font-family` (Geist). Numerical columns in `--font-mono` (Geist Mono).

---

### Pattern 5: Density Controls + Responsive Collapse

**What it is:** On desktop, users can toggle between compact/comfortable/spacious row heights. On mobile, the table collapses into a card-based layout or allows horizontal scroll with a frozen first column.

**Who does it best:** Airtable (4-level row height toggle), Linear (compact by default, opens to full view on click). For mobile: Coda (card layout on narrow viewports), Notion (horizontal scroll with sticky first column).

**Why it works:** No single row height is right for all use cases. Compact is great for scanning many rows. Spacious is better for detailed review. On mobile, forcing a wide table into a narrow viewport creates a terrible experience. The card-collapse pattern (each row becomes a stacked card showing key-value pairs) maintains readability without horizontal scrolling.

**For Robert:** Desktop: default to "comfortable" row height (`--space-10` height, `--space-3` vertical padding). Optional toggle for "compact" (`--space-8`, `--space-2`). Mobile (below 768px): primary option is horizontal scroll with `overflow-x: auto` and frozen first column. Alternative for smaller data sets: collapse rows into cards where each column becomes a labeled field.

---

## Quick Reference: Competitive Comparison

| Capability | Notion | Airtable | Linear | Coda | GitHub |
|---|---|---|---|---|---|
| Inline editing | Yes | Yes | Partial | Yes | No |
| Column resize | Yes | Yes | No | Yes | No |
| Sticky header | Yes | Yes | Yes | Yes | No |
| Column types | 15+ | 25+ | Purpose-built | 15+ | None |
| Conditional formatting | No | Limited | Status only | Yes | No |
| Row hover | Subtle | Yes | Very subtle | Yes | No |
| Mobile card view | No (scroll) | Via interfaces | Compact list | Yes | No |
| Search/filter | Yes | Yes | Yes | Yes | Yes (CSV) |
| Multiple views | Yes | Yes | Yes | Yes | No |
| Density toggle | No | Yes (4 levels) | No | No | No |

---

## Recommendation for TeamHQ

Given that TeamHQ needs a **read-only embedded viewer** (not a full CRUD spreadsheet), the implementation should be closer to **Linear's philosophy** (clean, minimal, purposeful) than Airtable's (dense, feature-rich).

**Priority patterns for v1:**
1. Borderless design with horizontal rules and generous whitespace (Pattern 1)
2. Type-aware cell rendering for numbers, currency, dates, and status (Pattern 2)
3. Sticky header and subtle row hover (Pattern 3)
4. Typography hierarchy (Pattern 4)
5. Horizontal scroll with sticky first column on mobile (Pattern 5, simplified)

**Skip for v1:**
- Inline editing (read-only viewer)
- Column resize (fixed, well-proportioned columns)
- Multiple view types (table only for now)
- Conditional formatting (nice-to-have, not core)
- Density toggle (ship one good density, iterate later)

**Add for v1 (low effort, high value):**
- Column sort on header click (interaction borrowed from GitHub CSV preview pattern)
- Search/filter bar above the table (GitHub's instant-filter pattern is high-value and straightforward)

All patterns map cleanly to our existing design tokens (Geist font stack, spacing scale, color tokens, border tokens). No new design system work required — this is composition of what we have.
