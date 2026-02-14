# Roadmap Tool v1.1 Sprint C -- Design Spec

**Author:** Robert (Product Designer)
**Date:** February 13, 2026
**Status:** Ready for implementation
**Project ID:** `roadmap-tool`
**Dependencies:** `docs/roadmap-tool-v1.1-sprint-c-requirements.md` (Thomas), `docs/roadmap-tool-v1.1-sprint-c-tech-approach.md` (Andrei)

---

## Overview

Sprint C adds three independent features: Comments and Activity Log (RT-28), CSV Import/Export (RT-29), and Fiscal Year Display (RT-31). All three surface in different parts of the product -- the Item Card right panel, the main toolbar, and Account Settings / Timeline axis respectively. There are no cross-feature design dependencies.

The design approach for all three: follow established patterns exactly. Sprint A and B defined the visual language -- zinc neutrals, indigo accent, 4px spacing grid, compact form inputs at 36px height, ghost buttons at 32px, tabs with underline indicator, dropdowns with `--shadow-md`, muted labels at `--text-xs` uppercase. Sprint C introduces no new design patterns. Every new surface uses components and styles that already exist.

---

## 1. RT-28: Comments and Activity Log

### 1.1 Where It Lives

The Item Card right panel already has two tabs: **Fields** and **Activity**. The Activity tab currently shows placeholder text ("No activity yet." / "Comments coming in v1.1"). Sprint C replaces this placeholder with a full activity feed containing comments interleaved with system events.

No changes to the left panel tabs (Overview, Linked Items, Sub-Items). No changes to the Fields tab. No changes to the Item Card header, footer, or overall layout.

### 1.2 Activity Tab Layout

The Activity tab has two sections, stacked vertically:

```
.activityTab
  .commentInputSection           -> sticky at top, comment compose area
    .commentTextarea              -> plain-text input
    .commentInputFooter           -> character count + submit button, single row
  .activityFeed                   -> scrollable feed of entries, newest first
    .activityEntry (repeated)     -> either a comment or a system event
    ...
  .loadMoreWrapper                -> at bottom of feed, if more pages exist
    .loadMoreBtn                  -> "Load more" button
  .emptyState                     -> shown when feed has zero entries
```

#### Comment Input Section

Located at the top of the Activity tab, above the feed. This is the primary action area -- users write comments here and they appear below.

**Container: `.commentInputSection`**
- `padding: 0 0 var(--space-3) 0`
- `border-bottom: 1px solid var(--gray-200)`
- `margin-bottom: var(--space-3)`

**Textarea: `.commentTextarea`**
- `width: 100%`
- `min-height: 72px` (3 lines visible by default)
- `max-height: 160px` (scrolls beyond ~7 lines)
- `resize: vertical`
- `padding: var(--space-2) var(--space-3)`
- `border: 1px solid var(--gray-300)`
- `border-radius: var(--radius-md)` (6px)
- `font-size: var(--text-sm)` (13px)
- `font-weight: 400`
- `color: var(--gray-950)`
- `line-height: var(--leading-sm)` (18px)
- `font-family: var(--font-sans)`
- Placeholder text: "Add a comment..." in `color: var(--gray-500)`

**Textarea states:**
| State | Change |
|-------|--------|
| Default | As above |
| Focus | `border-color: var(--accent-600)`, `box-shadow: 0 0 0 2px var(--accent-100)`, `outline: none` |
| Disabled (viewer) | `background: var(--gray-50)`, `color: var(--gray-400)`, `cursor: not-allowed`, placeholder: "You don't have permission to comment" |
| Error | `border-color: var(--error-600)`, error message below |

**Footer row: `.commentInputFooter`**
- `display: flex`
- `align-items: center`
- `justify-content: space-between`
- `margin-top: var(--space-2)`
- `min-height: 32px`

**Character count: `.charCount`**
- Visible only when body length >= 4500 characters
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-500)` (normal), `color: var(--error-600)` (when >= 5000)
- Format: "4523 / 5000"

**Submit button: `.commentSubmitBtn`**
- Standard primary button, compact size
- `height: 32px`
- `padding: 0 var(--space-3)` (12px horizontal)
- `background: var(--accent-600)`
- `color: var(--white)`
- `border-radius: var(--radius-md)` (6px)
- `font-size: var(--text-sm)` (13px)
- `font-weight: 500`
- Label: "Comment"

**Submit button states:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `background: var(--accent-500)` |
| Active | `background: var(--accent-600)`, `transform: scale(0.98)` |
| Disabled (empty textarea or viewer) | `background: var(--gray-300)`, `color: var(--gray-500)`, `cursor: not-allowed` |
| Loading (submitting) | Label replaced by 14x14 spinner (same pattern as `LinkedItemsTab` link submit), button disabled |

**Inline error: `.commentError`**
- Shown below the textarea when submission fails
- `font-size: var(--text-xs)` (11px)
- `color: var(--error-600)`
- `margin-top: var(--space-1)` (4px)
- `display: flex`, `align-items: center`, `gap: var(--space-1)`
- Includes a 12x12 warning triangle icon (same SVG pattern as `LinkedItemsTab .popoverError`)
- Text: "Failed to post comment. Try again."
- `animation: fadeIn 150ms ease` (reuse existing `fadeIn` keyframe)

### 1.3 @Mention Picker

When the user types `@` in the comment textarea, a popover appears listing roadmap collaborators. The trigger conditions:
- The `@` is at position 0 (start of text), OR
- The character immediately before `@` is a space or newline

**Popover: `.mentionPicker`**
- Appears anchored below the textarea (or above if near bottom of panel)
- `position: absolute`
- `width: 240px`
- `max-height: 200px`
- `overflow-y: auto`
- `background: var(--white)`
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-lg)` (8px)
- `box-shadow: var(--shadow-md)`
- `padding: var(--space-1)` (4px)
- `z-index: 20`
- `animation: popoverIn 100ms ease` (reuse from `LinkedItemsTab`)

**Search filtering:** As the user types after `@`, the list filters by name. E.g., typing `@al` shows only collaborators whose name contains "al". The search text is the substring between `@` and the current cursor position.

**Collaborator row: `.mentionOption`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)
- `width: 100%`
- `height: 36px`
- `padding: 0 var(--space-2)` (8px)
- `border-radius: var(--radius-sm)` (4px)
- `font-size: var(--text-sm)` (13px)
- `color: var(--gray-950)`
- `cursor: pointer`
- `transition: background-color 100ms ease`

**Collaborator row elements:**
- **Avatar:** 24x24 circle. If `avatarUrl` exists, show the image with `border-radius: 50%`, `object-fit: cover`. If null, show initials in a circle: `background: var(--gray-200)`, `color: var(--gray-700)`, `font-size: 10px`, `font-weight: 500`.
- **Name:** `font-size: var(--text-sm)`, `color: var(--gray-950)`, `font-weight: 400`. Truncate with ellipsis.
- **Role badge:** `font-size: var(--text-xs)`, `color: var(--gray-500)`, `margin-left: auto`. Shows "Owner", "Editor", or "Viewer".

**Collaborator row states:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `background: var(--gray-100)` |
| Keyboard-highlighted | `background: var(--accent-50)` |
| Selected (click/Enter) | Inserts `@Name` into textarea, closes picker |

**Keyboard navigation:**
- Arrow Up/Down to navigate the list
- Enter to select the highlighted collaborator
- Escape to close the picker without selecting
- The picker also closes if the user deletes the `@` character

**Empty state (no matches):** "No collaborators found" in `font-size: var(--text-sm)`, `color: var(--gray-500)`, centered, `padding: var(--space-3)`.

### 1.4 Activity Feed

The feed displays comments and system events interleaved, ordered newest first. It occupies the scrollable body of the Activity tab below the comment input section.

**Container: `.activityFeed`**
- `display: flex`
- `flex-direction: column`
- `gap: 0` (entries separated by borders, not gaps)

#### Comment Entry: `.commentEntry`

Each comment is a self-contained block.

```
.commentEntry
  .commentHeader          -> avatar, name, timestamp, (edited), overflow menu
  .commentBody            -> the comment text with highlighted mentions
```

**Container: `.commentEntry`**
- `padding: var(--space-3) 0`
- `border-bottom: 1px solid var(--gray-100)`
- First entry: no top border. Last entry: no bottom border.

**Header: `.commentHeader`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)
- `margin-bottom: var(--space-2)` (8px)

**Header elements:**
- **Avatar:** 28x28 circle. Same pattern as mention picker avatar (image or initials). `flex-shrink: 0`.
- **Author name: `.commentAuthor`** -- `font-size: var(--text-sm)` (13px), `font-weight: 500`, `color: var(--gray-950)`.
- **Timestamp: `.commentTime`** -- `font-size: var(--text-xs)` (11px), `font-weight: 400`, `color: var(--gray-500)`. Relative format: "just now", "2m ago", "1h ago", "3d ago", "Jan 15". Switch to absolute date format after 7 days.
- **Edited label: `.commentEdited`** -- `font-size: var(--text-xs)`, `color: var(--gray-400)`. Text: "(edited)". Visible when `updatedAt !== createdAt`. Appears after the timestamp.
- **Overflow menu button: `.commentMenuBtn`** -- 24x24 button, right-aligned (`margin-left: auto`). Three horizontal dots icon (4px circles at y=7, spaced 4px apart). `color: var(--gray-400)`. `opacity: 0` by default, `opacity: 1` on `.commentEntry:hover`. `border-radius: var(--radius-sm)`. On hover: `background: var(--gray-100)`, `color: var(--gray-700)`.

**Overflow menu dropdown: `.commentMenu`**
- Same pattern as `SubItemsTab .dropdown`
- `position: absolute`, `top: 100%`, `right: 0`
- `width: 140px`
- `background: var(--white)`
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-lg)` (8px)
- `box-shadow: var(--shadow-md)`
- `padding: var(--space-1) 0` (4px)
- `z-index: 20`
- `animation: dropdownIn 100ms ease` (reuse from SubItemsTab)

**Menu items:**
- **Edit:** `.commentMenuItem` -- `height: 36px`, `padding: 0 var(--space-3)`, `font-size: var(--text-sm)`, `color: var(--gray-900)`. Hover: `background: var(--gray-100)`.
- **Delete:** `.commentMenuItemDanger` -- same dimensions, `color: var(--error-600)`. Hover: `background: var(--error-50)`.
- Only visible if the current user is the comment author OR the roadmap owner.

**Comment body: `.commentBody`**
- `font-size: var(--text-sm)` (13px)
- `font-weight: 400`
- `color: var(--gray-900)`
- `line-height: var(--leading-sm)` (18px)
- `white-space: pre-wrap` (preserves line breaks)
- `word-break: break-word`

**@mention highlight within body: `.mentionHighlight`**
- Inline `<span>` wrapping the `@Name` text
- `background: var(--accent-50)` (#EEF2FF)
- `color: var(--accent-600)` (#4F46E5)
- `font-weight: 500`
- `border-radius: 2px`
- `padding: 0 2px`

**Optimistic comment (pending state):**
When a comment is submitted optimistically before server confirmation:
- The entire `.commentEntry` has `opacity: 0.6`
- Once confirmed, animate to `opacity: 1` over 200ms
- If rejected, remove the entry and show a toast: "Failed to post comment."

**Edit mode:**
When "Edit" is clicked from the overflow menu:
- The `.commentBody` is replaced by a textarea (same styling as `.commentTextarea` but with the existing comment text pre-filled)
- Two buttons below: "Save" (primary, compact 28px height) and "Cancel" (ghost)
- "Save" sends the PATCH request. On success, the textarea is replaced with the updated body and "(edited)" appears.
- "Cancel" reverts to the original body text.
- If the save fails, show inline error: "Failed to save edit. Try again." Text is preserved.

**Delete confirmation:**
When "Delete" is clicked from the overflow menu:
- A small inline confirmation replaces the comment body: "Delete this comment?" with two buttons: "Delete" (destructive, `color: var(--error-600)`, `border: 1px solid var(--error-600)`) and "Cancel" (ghost). Both 28px height.
- On confirm, the comment fades out (`opacity: 0`, `height: 0`, `overflow: hidden` transition over 200ms) and is removed from the feed.

#### System Activity Entry: `.systemEntry`

System events are compact, single-line entries that are visually subordinate to comments.

```
.systemEntry
  .systemEntryIcon        -> small icon per action type
  .systemEntryText        -> "Alice changed Status from 'Planned' to 'In Progress'"
  .systemEntryTime        -> relative timestamp
```

**Container: `.systemEntry`**
- `display: flex`
- `align-items: center`
- `gap: var(--space-2)` (8px)
- `padding: var(--space-2) 0` (8px vertical)
- `border-bottom: 1px solid var(--gray-100)`
- `min-height: 32px`

**Icon: `.systemEntryIcon`**
- `width: 16px`, `height: 16px`
- `color: var(--gray-400)`
- `flex-shrink: 0`
- Icons per action type (all 16x16, stroke-based, strokeWidth 1.5):
  - `created`: Plus icon (circle with +)
  - `updated` / `field_changed`: Pencil icon
  - `deleted`: Trash icon
  - `commented`: Chat bubble icon
  - `comment_edited`: Chat bubble + pencil icon
  - `comment_deleted`: Chat bubble + X icon
  - `linked` / `unlinked`: Link icon (same as LinkedItemsTab)
  - `sub_item_added` / `sub_item_removed`: Nested squares icon
  - `key_date_added` / `key_date_removed`: Diamond icon (same as KeyDatesSection)

**Text: `.systemEntryText`**
- `font-size: var(--text-xs)` (11px)
- `font-weight: 400`
- `color: var(--gray-500)`
- `line-height: var(--leading-xs)` (16px)
- `flex: 1`, `min-width: 0`
- Truncate with ellipsis if too long (single line)
- User name within the text: `font-weight: 500`, `color: var(--gray-700)`
- Field values in quotes: use straight quotes, `font-weight: 400`

**Timestamp: `.systemEntryTime`**
- `font-size: var(--text-xs)` (11px)
- `color: var(--gray-400)`
- `flex-shrink: 0`
- Same relative format as comment timestamps

### 1.5 Feed Pagination

**Load More button: `.loadMoreBtn`**
- Appears at the bottom of the feed when `meta.total > entries shown`
- Standard ghost button
- `display: flex`, `align-items: center`, `justify-content: center`
- `width: 100%`
- `height: 32px`
- `margin-top: var(--space-2)`
- `font-size: var(--text-sm)` (13px)
- `font-weight: 500`
- `color: var(--gray-700)`
- `border-radius: var(--radius-md)`
- Hover: `background: var(--gray-100)`
- Loading state: replace label with spinner, button disabled

### 1.6 Feed States

**Loading (initial):**
- Show skeleton placeholder: 4 rows of varying widths
- Each skeleton row: `height: 48px`, `background: var(--gray-100)`, `border-radius: var(--radius-md)`, `margin-bottom: var(--space-2)`
- Rows at 100%, 80%, 100%, 60% width for visual variety
- `animation: pulse 1.5s ease-in-out infinite` (opacity oscillating between 0.4 and 1)

**Empty:**
- Centered vertically in the feed area
- Icon: 32x32 chat bubble outline, `color: var(--gray-300)`
- Text: "No activity yet. Comments and changes will appear here."
- `font-size: var(--text-sm)`, `color: var(--gray-500)`, `text-align: center`, `max-width: 240px`
- Same pattern as `LinkedItemsTab .emptyState`

**Error:**
- Centered message: "Could not load activity."
- Below: a text link "Retry" in `color: var(--accent-600)`, `font-size: var(--text-sm)`, `cursor: pointer`. Hover: underline.
- Same vertical centering as empty state.

### 1.7 Accessibility

- The comment textarea has `aria-label="Add a comment"`
- The submit button has `aria-label="Post comment"`
- The mention picker has `role="listbox"`, each option has `role="option"` and `aria-selected`
- The overflow menu button has `aria-haspopup="true"` and `aria-expanded`
- The overflow menu has `role="menu"`, each item has `role="menuitem"`
- The feed has `role="log"` and `aria-label="Activity feed"` for screen readers
- New comments announced via `aria-live="polite"` region
- Keyboard: Tab to textarea, type comment, Tab to submit button, Enter to post. Tab into feed entries. Each comment's overflow menu is reachable via Tab.
- Focus-visible: `outline: 2px solid var(--accent-600)`, `outline-offset: 2px` on all interactive elements

### 1.8 Responsive Behavior

On tablet (< 1024px), the Item Card becomes full-width. The right panel stacks below the left panel. The Activity tab renders identically but with more horizontal room.

On mobile (< 640px):
- The comment textarea `min-height: 56px` (shorter to save space)
- The mention picker is `width: 100%` instead of 240px
- Touch targets for overflow menu: 44x44px
- The tab content padding reduces to `var(--space-3)`

### 1.9 Animation

- Comment entry appearance: `animation: fadeSlideIn 150ms ease-out` (same as `linkRowIn` from LinkedItemsTab -- opacity 0 to 1, translateY 4px to 0)
- Comment deletion: `opacity: 1 to 0`, `max-height` collapse, `transition: 200ms ease`
- Mention picker: `animation: popoverIn 100ms ease` (reuse)
- Overflow menu: `animation: dropdownIn 100ms ease` (reuse)
- Skeleton pulse: `@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }` at 1.5s duration
- All animations respect `prefers-reduced-motion: reduce` -- disable non-essential animations

---

## 2. RT-29: CSV Import/Export

### 2.1 Toolbar Button Placement

Two new buttons are added to the main roadmap toolbar (`RoadmapPage .toolbarRight`), positioned to the left of the existing Export (PNG) button.

**Button order in `.toolbarRight` (left to right):**
1. Presence Avatars (existing)
2. **Import CSV** (new)
3. **Export CSV** (new)
4. Export PNG (existing)
5. Present (existing, desktop only)
6. Format (existing)

#### Import CSV Button: `.importCsvBtn`

Follows the exact same styling as the existing `.exportBtn` from `ExportButton.module.css` -- secondary button pattern.

- `display: flex`, `align-items: center`, `gap: 8px`
- `height: 32px`
- `padding: 0 12px`
- `background: var(--white)`
- `color: var(--gray-900)`
- `border: 1px solid var(--gray-300)`
- `border-radius: var(--radius-md)`
- `font-size: var(--text-sm)`, `font-weight: 500`
- `cursor: pointer`, `white-space: nowrap`
- Icon: 16x16 upload icon (arrow pointing up into a tray). Stroke-based, `color: var(--gray-700)`.
- Label: "Import"

**States:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover | `background: var(--gray-50)` |
| Active | `background: var(--gray-100)` |
| Disabled (viewer) | `background: var(--gray-50)`, `color: var(--gray-400)`, `border-color: var(--gray-200)`, `cursor: default` |

#### Export CSV Button: `.exportCsvBtn`

Same secondary button pattern. No dropdown -- clicking triggers an immediate CSV download.

- Same dimensions and styling as Import CSV button
- Icon: 16x16 download icon (arrow pointing down from a tray). Stroke-based, `color: var(--gray-700)`.
- Label: "CSV"

**States:** Same as Import CSV button. Disabled when no items exist (same logic as Export PNG).

### 2.2 Import Wizard Modal

A full-screen modal with a 4-step wizard. The modal handles the entire CSV import flow: upload, map columns, preview data, and confirm import.

#### Modal Shell

**Overlay: `.importOverlay`**
- `position: fixed`, `inset: 0`
- `background: rgba(0, 0, 0, 0.5)`
- `z-index: 50`
- Click outside the modal content to cancel (with confirmation if past Step 1)

**Modal: `.importModal`**
- `position: fixed`
- `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`
- `width: 640px`, `max-width: calc(100vw - var(--space-8))`
- `max-height: calc(100vh - var(--space-12))`
- `background: var(--white)`
- `border-radius: var(--radius-xl)` (12px)
- `box-shadow: var(--shadow-xl)`
- `display: flex`, `flex-direction: column`
- `overflow: hidden`
- `z-index: 51`
- `animation: modalIn 200ms ease-out` -- `opacity: 0 to 1`, `transform: translate(-50%, -50%) scale(0.95) to translate(-50%, -50%) scale(1)`

**Modal header: `.importHeader`**
- `display: flex`, `align-items: center`, `justify-content: space-between`
- `height: 56px`
- `padding: 0 var(--space-6)` (24px)
- `border-bottom: 1px solid var(--gray-200)`
- `flex-shrink: 0`

**Title:** "Import CSV" -- `font-size: var(--text-lg)` (16px), `font-weight: 600`, `color: var(--gray-950)`

**Close button:** Same 32x32 close button pattern as Item Card (X icon, `color: var(--gray-500)`, hover: `background: var(--gray-100)`, `color: var(--gray-700)`)

**Progress indicator: `.stepIndicator`**
- Below the header, inside the modal body
- `display: flex`, `align-items: center`, `justify-content: center`
- `gap: var(--space-2)`
- `padding: var(--space-4) var(--space-6)`
- 4 steps, each rendered as a numbered circle with a label

**Step dot: `.stepDot`**
- `width: 24px`, `height: 24px`
- `border-radius: 50%`
- `display: flex`, `align-items: center`, `justify-content: center`
- `font-size: var(--text-xs)` (11px), `font-weight: 500`
- Inactive: `background: var(--gray-200)`, `color: var(--gray-500)`
- Active: `background: var(--accent-600)`, `color: var(--white)`
- Completed: `background: var(--accent-100)`, `color: var(--accent-600)`, shows a checkmark instead of number

**Step label: `.stepLabel`**
- `font-size: var(--text-xs)` (11px), `font-weight: 500`
- `color: var(--gray-500)` (inactive), `color: var(--gray-950)` (active)
- Labels: "Upload", "Map", "Preview", "Import"

**Step connector:** A 24px horizontal line between each step dot. `height: 1px`, `background: var(--gray-300)` (incomplete), `background: var(--accent-600)` (complete).

**Modal body: `.importBody`**
- `flex: 1`
- `overflow-y: auto`
- `padding: var(--space-6)`

**Modal footer: `.importFooter`**
- `display: flex`, `align-items: center`, `justify-content: flex-end`
- `gap: var(--space-2)`
- `padding: var(--space-3) var(--space-6)`
- `border-top: 1px solid var(--gray-200)`
- `flex-shrink: 0`
- Contains Back, Cancel, and Next/Import buttons

**Footer buttons:**
- **Cancel:** Ghost button. `height: 32px`, `padding: 0 var(--space-3)`, `color: var(--gray-700)`, `font-size: var(--text-sm)`, `font-weight: 500`. Hover: `background: var(--gray-100)`.
- **Back:** Secondary button (same as Cancel styling). Hidden on Step 1.
- **Next / Import:** Primary button. Same styling as `.commentSubmitBtn`. Label changes: "Next" (Steps 1-3), "Import N Items" (Step 4).

#### Step 1: Upload

**Drop zone: `.dropZone`**
- `width: 100%`
- `min-height: 200px`
- `border: 2px dashed var(--gray-300)`
- `border-radius: var(--radius-lg)` (8px)
- `display: flex`, `flex-direction: column`, `align-items: center`, `justify-content: center`
- `gap: var(--space-3)`
- `padding: var(--space-8)`
- `cursor: pointer`
- `transition: border-color 150ms ease, background-color 150ms ease`

**Drop zone states:**
| State | Change |
|-------|--------|
| Default | As above |
| Hover / Drag over | `border-color: var(--accent-600)`, `background: var(--accent-50)` |
| File selected | Border becomes solid: `border: 2px solid var(--accent-600)`, shows file name + size |
| Error | `border-color: var(--error-600)`, error message in red below |

**Drop zone content (default):**
- Icon: 40x40 upload cloud icon, `color: var(--gray-300)`
- Primary text: "Drag a CSV file here or click to browse" -- `font-size: var(--text-sm)`, `color: var(--gray-700)`, `font-weight: 500`
- Secondary text: ".csv files up to 5MB" -- `font-size: var(--text-xs)`, `color: var(--gray-500)`

**Drop zone content (file selected):**
- File icon: 24x24 document icon, `color: var(--accent-600)`
- File name: `font-size: var(--text-sm)`, `color: var(--gray-950)`, `font-weight: 500`
- File size: `font-size: var(--text-xs)`, `color: var(--gray-500)`. Format: "245 KB"
- Remove button: small X icon (16x16), `color: var(--gray-400)`, hover: `color: var(--error-600)`. Removes the file and returns to default state.

**First row toggle: `.firstRowToggle`**
- Below the drop zone, `margin-top: var(--space-3)`
- `display: flex`, `align-items: center`, `gap: var(--space-2)`
- A checkbox (16x16, same `.checkbox` pattern as `ItemCard`) + label: "First row is headers" (checked by default)
- `font-size: var(--text-sm)`, `color: var(--gray-700)`

**Error messages (below drop zone):**
- "This file could not be parsed as CSV. Check the format and try again."
- "File too large. Maximum size is 5MB."
- "This file has no data rows to import."
- Styled: `font-size: var(--text-sm)`, `color: var(--error-600)`, `margin-top: var(--space-2)`, with 12x12 warning icon

**Parsing transition:** When the file is selected and parsing begins, show a brief spinner centered in the drop zone area with text "Parsing file..." in `font-size: var(--text-sm)`, `color: var(--gray-500)`.

#### Step 2: Column Mapping

A two-column mapping table. Left column shows CSV headers, right column shows roadmap field dropdowns.

**Mapping table: `.mappingTable`**
- `width: 100%`
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-lg)` (8px)
- `overflow: hidden`

**Table header row: `.mappingHeaderRow`**
- `display: flex`
- `height: 36px`
- `background: var(--gray-50)`
- `border-bottom: 1px solid var(--gray-200)`

**Header cells:**
- Left: "CSV Column" -- `flex: 1`, `padding: 0 var(--space-3)`, `font-size: var(--text-xs)`, `font-weight: 500`, `color: var(--gray-500)`, `text-transform: uppercase`, `letter-spacing: 0.05em`, aligned center vertically
- Right: "Map to Field" -- same styling, `flex: 1`

**Mapping row: `.mappingRow`**
- `display: flex`
- `min-height: 44px`
- `align-items: center`
- `border-bottom: 1px solid var(--gray-100)`
- Last row: no bottom border

**Mapping row cells:**
- **CSV column name (left):** `flex: 1`, `padding: 0 var(--space-3)`, `font-size: var(--text-sm)`, `color: var(--gray-950)`, `font-weight: 400`. Truncate with ellipsis.
- **Field dropdown (right):** `flex: 1`, `padding: 0 var(--space-2)`. Standard select element: `height: 32px`, `width: 100%`, `border: 1px solid var(--gray-300)`, `border-radius: var(--radius-md)`, `font-size: var(--text-sm)`, `color: var(--gray-950)`, `background: var(--white)`, `padding: 0 var(--space-2)`. Focus: `border-color: var(--accent-600)`, `box-shadow: 0 0 0 2px var(--accent-100)`.

**Auto-mapped indicator:**
- When a column is auto-mapped, the mapping row has a subtle highlight: `background: var(--accent-50)` on the entire row. This fades after 2 seconds (`transition: background-color 2s ease`).

**Dropdown options:**
- "-- Ignore --" (default for unmapped columns)
- "Name" (with asterisk: "Name *")
- "Description"
- "Start Date"
- "End Date"
- One entry per custom field: field name
- Already-mapped fields are disabled in other dropdowns (can only map each field once, except "Ignore")

**Validation message:**
- If Name is not mapped: a message below the table: "The Name field must be mapped to continue." in `font-size: var(--text-sm)`, `color: var(--error-600)`, `margin-top: var(--space-2)`.
- The "Next" button is disabled until Name is mapped.

#### Step 3: Preview

A preview table showing the first 10 rows of the CSV data as they will be imported.

**Preview summary: `.previewSummary`**
- Above the table
- `font-size: var(--text-sm)`, `color: var(--gray-700)`, `margin-bottom: var(--space-3)`
- Text: "Ready to import N items." or "Ready to import N items. M warnings (values that could not be mapped)."
- Warning count in `color: var(--warning-500)` if M > 0

**Row count notice (if > 1000 rows):**
- `font-size: var(--text-sm)`, `color: var(--error-600)`
- "This file contains N rows. Only the first 1,000 will be imported."

**Preview table: `.previewTable`**
- Standard HTML table with fixed layout
- `width: 100%`
- `border: 1px solid var(--gray-200)`
- `border-radius: var(--radius-lg)` (8px, via overflow hidden on wrapper)
- `border-collapse: separate`
- `border-spacing: 0`
- Horizontal scroll if columns exceed container width (wrap in a div with `overflow-x: auto`)

**Table header: `.previewTh`**
- `height: 36px`
- `padding: 0 var(--space-3)`
- `background: var(--gray-50)`
- `font-size: var(--text-xs)` (11px), `font-weight: 500`, `color: var(--gray-500)`
- `text-transform: uppercase`, `letter-spacing: 0.05em`
- `text-align: left`
- `border-bottom: 1px solid var(--gray-200)`
- `white-space: nowrap`

**Table cell: `.previewTd`**
- `height: 36px`
- `padding: 0 var(--space-3)`
- `font-size: var(--text-sm)` (13px), `color: var(--gray-950)`
- `border-bottom: 1px solid var(--gray-100)`
- `max-width: 200px`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`

**Warning cell: `.previewTdWarning`**
- Same as `.previewTd` but with `background: #FEF9C3` (amber-50, a warm light yellow for warnings)
- Includes a small warning triangle icon (12x12) inline before the cell text, `color: var(--warning-500)`
- Tooltip on hover explains the issue (e.g., "Date format could not be parsed", "Value not found in field options")

**Table row numbers:**
- First column: row number (1-10), `width: 40px`, `color: var(--gray-400)`, `font-size: var(--text-xs)`, `text-align: center`

#### Step 4: Confirm and Import

**Confirmation content:**
- Centered in the modal body
- Summary icon: 48x48 document + checkmark icon, `color: var(--accent-600)`
- Primary text: "Import N items into {roadmap name}" -- `font-size: var(--text-lg)` (16px), `font-weight: 500`, `color: var(--gray-950)`, `text-align: center`, `margin-top: var(--space-4)`
- Warning text (if warnings exist): "M values could not be mapped and will be left empty." -- `font-size: var(--text-sm)`, `color: var(--gray-500)`, `text-align: center`, `margin-top: var(--space-2)`

**During import -- progress bar: `.importProgress`**
- Replaces the confirmation content while importing
- `width: 100%`, `max-width: 400px`, `margin: 0 auto`
- **Track:** `height: 4px`, `background: var(--gray-200)`, `border-radius: 2px`
- **Fill:** `height: 4px`, `background: var(--accent-600)`, `border-radius: 2px`, `transition: width 200ms ease`
- **Percentage text:** Below the bar, `font-size: var(--text-sm)`, `color: var(--gray-700)`, `text-align: center`, `margin-top: var(--space-2)`
- The "Import" button in the footer is disabled and shows a spinner

**Success:**
- Modal closes
- Toast (reuse existing `showToast` from ExportButton): "Imported N items successfully."
- Focus returns to the Import CSV toolbar button

**Partial failure:**
- Modal stays open
- Show summary: "Imported X of Y items. Z items failed due to validation errors."
- `font-size: var(--text-sm)`, `color: var(--gray-950)`
- Error count in `color: var(--error-600)`
- A "Done" button (primary) closes the modal

**Full failure:**
- Modal stays open
- "Import failed. Please try again." in `color: var(--error-600)`
- Mapping is preserved -- user can go back to Step 2/3 and retry
- A "Retry" button (primary) re-attempts the import

### 2.3 Modal Accessibility

- Modal has `role="dialog"`, `aria-modal="true"`, `aria-label="Import CSV"`
- Focus is trapped inside the modal while open (reuse `useFocusTrap`)
- On open, focus moves to the drop zone (Step 1)
- On close (Cancel or success), focus returns to the Import CSV toolbar button
- Step indicator dots have `aria-current="step"` on the active step
- The drop zone has `role="button"`, `aria-label="Upload CSV file"`, and responds to Enter/Space keypress
- Escape closes the modal (with confirmation if past Step 1)
- The preview table has proper `<th scope="col">` for headers
- All form controls (dropdowns, checkboxes, buttons) have visible labels or `aria-label`

### 2.4 Responsive Behavior

On tablet (< 1024px):
- Modal width: `max-width: calc(100vw - var(--space-8))`
- Step labels hidden, only step dots visible (saves horizontal space)
- Preview table: horizontal scroll enabled

On mobile (< 640px):
- Modal becomes full-screen: `width: 100%`, `height: 100%`, `border-radius: 0`, `max-height: 100vh`
- Step indicator simplified to "Step 2 of 4" text format
- Mapping table stacks: CSV column name above the dropdown, each row is `flex-direction: column`, `gap: var(--space-1)`
- Touch targets: all buttons 44px minimum height
- Drop zone: 160px min-height

### 2.5 Animation

- Modal entrance: `opacity: 0 to 1`, `scale(0.95) to scale(1)`, 200ms ease-out
- Modal exit: `opacity: 1 to 0`, `scale(1) to scale(0.95)`, 150ms ease-in
- Step transitions: crossfade between step content, 150ms
- Progress bar fill: `transition: width 200ms ease`
- Drop zone drag-over: `transition: border-color 150ms ease, background-color 150ms ease`
- All animations respect `prefers-reduced-motion: reduce`

---

## 3. RT-31: Fiscal Year Display

### 3.1 Account Settings Section

RT-31 adds a fiscal year setting to the Account Settings page. If no Account Settings page exists yet, it will need to be created as a simple settings panel accessible from the sidebar or user menu.

**Settings section: `.fiscalYearSection`**
- Standard form section within the settings page
- `padding: var(--space-6) 0`
- `border-bottom: 1px solid var(--gray-200)` (separator between settings sections)

**Section heading: `.settingsSectionTitle`**
- `font-size: var(--text-lg)` (16px)
- `font-weight: 600`
- `color: var(--gray-950)`
- `margin-bottom: var(--space-1)`

**Section description: `.settingsSectionDesc`**
- `font-size: var(--text-sm)` (13px)
- `color: var(--gray-500)`
- `margin-bottom: var(--space-4)`
- Text: "Set the first month of your fiscal year. This changes how quarters, halves, and years are labeled on the Timeline. Dates and date pickers are not affected."

**Fiscal year dropdown row:**
- `display: flex`, `align-items: center`, `gap: var(--space-3)`

**Label: `.fiscalYearLabel`**
- `font-size: var(--text-sm)` (13px), `font-weight: 500`, `color: var(--gray-700)`
- Text: "Fiscal year starts in"

**Dropdown: `.fiscalYearSelect`**
- Standard select element
- `height: 36px`
- `width: 160px`
- `padding: 0 var(--space-3)`
- `border: 1px solid var(--gray-300)`
- `border-radius: var(--radius-md)` (6px)
- `font-size: var(--text-sm)` (13px)
- `color: var(--gray-950)`
- `background: var(--white)`
- 12 options: January through December
- Default selection: January (meaning fiscal year = calendar year)

**Dropdown states:**
| State | Change |
|-------|--------|
| Default | As above |
| Focus | `border-color: var(--accent-600)`, `box-shadow: 0 0 0 2px var(--accent-100)`, `outline: none` |
| Disabled (non-admin) | Not rendered as a dropdown. Instead, show the current value as read-only text: `font-size: var(--text-sm)`, `color: var(--gray-950)`, `font-weight: 400`. Below, a note: "Only account admins can change this setting." in `font-size: var(--text-xs)`, `color: var(--gray-500)`. |

**Save button: `.fiscalYearSaveBtn`**
- Only appears when the dropdown value differs from the saved value
- Standard primary button, compact
- `height: 32px`, `padding: 0 var(--space-3)`
- `background: var(--accent-600)`, `color: var(--white)`
- `border-radius: var(--radius-md)`, `font-size: var(--text-sm)`, `font-weight: 500`
- Label: "Save"
- Loading state: spinner replacing label, button disabled
- On success: button disappears, toast: "Fiscal year updated."
- On error: inline error below the row: "Failed to save fiscal year setting. Try again." in `font-size: var(--text-xs)`, `color: var(--error-600)`

### 3.2 Timeline Axis Label Changes

The fiscal year setting changes only the text labels rendered by `getMajorTicks` and `getMinorTicks` in `timeScale.ts`. Tick positions (the x-coordinates where grid lines are drawn) do not change. This is a rendering-only change.

**Label format by time scale when fiscal year differs from calendar year:**

| Scale | Minor tick label | Major tick label | Example (FY starts April) |
|-------|-----------------|-----------------|--------------------------|
| Weeks | Unchanged (`W1`, `W2`, ...) | Unchanged (`Jan 2026`, `Feb 2026`, ...) | No change |
| Months | Unchanged (`Jan`, `Feb`, ...) | Unchanged (`2026`) | No change |
| Quarters | `FY26 Q1` (instead of `Q1`) | `FY2026` (instead of `2026`) | Apr-Jun = FY26 Q1, Jul-Sep = FY26 Q2, Oct-Dec = FY26 Q3, Jan-Mar = FY27 Q4 |
| Halves | `FY26 H1` (instead of `H1`) | `FY2026` (instead of `2026`) | Apr-Sep = FY26 H1, Oct-Mar = FY26 H2 |
| Years | `FY2026` (instead of `2026`) | `FY2026` (instead of `2026`) | Apr 2026-Mar 2027 = FY2026 |

**When fiscal year starts in January:** All labels display as they do today. No "FY" prefix. This is the default state and the zero-change baseline.

**Typography for fiscal year labels:**
The labels use the same font properties as current labels. The `FY` prefix is part of the label string -- no separate styling needed. The labels are rendered in the SVG `<text>` elements that already exist in `TimeAxis.tsx`.

If a fiscal-year-aware label is wider than the current calendar label (e.g., "FY26 Q1" vs "Q1"), the existing `textAnchor="middle"` centering within each minor tick cell handles this gracefully. The minor tick cells have variable width based on the time range, and the fiscal labels will fit comfortably at the current `fontSize={13}`.

### 3.3 Visual Examples

**Quarters with April fiscal year start:**
```
Major row:  | FY2025                    | FY2026                    | FY2027
Minor row:  | FY25 Q4 | FY26 Q1 | FY26 Q2 | FY26 Q3 | FY26 Q4 | FY27 Q1 |
Calendar:   | Jan-Mar  | Apr-Jun  | Jul-Sep  | Oct-Dec  | Jan-Mar  | Apr-Jun  |
```

**Halves with July fiscal year start:**
```
Major row:  | FY2025          | FY2026
Minor row:  | FY25 H2         | FY26 H1         | FY26 H2
Calendar:   | Jan-Jun          | Jul-Dec          | Jan-Jun
```

**Quarters with January fiscal year start (no change):**
```
Major row:  | 2025                      | 2026
Minor row:  | Q1      | Q2      | Q3      | Q4      | Q1      | Q2
Calendar:   | Jan-Mar  | Apr-Jun  | Jul-Sep  | Oct-Dec  | Jan-Mar  | Apr-Jun
```

### 3.4 Accessibility

- The fiscal year dropdown has `<label>` element associated via `htmlFor`/`id`
- The read-only state for non-admins uses regular text, not a disabled dropdown (disabled dropdowns are not keyboard-focusable)
- Timeline axis labels are rendered in SVG `<text>` elements which are accessible to screen readers by default
- No new keyboard navigation requirements -- standard select element behavior

### 3.5 Responsive Behavior

The Account Settings page is a standard form layout. On mobile (< 640px):
- The fiscal year dropdown takes full width: `width: 100%`
- The label stacks above the dropdown: `flex-direction: column`, `align-items: flex-start`
- The save button takes full width below

The Timeline axis labels are unaffected by responsive breakpoints -- the Timeline View already has its own zoom/scale mechanisms.

---

## 4. New Tokens Required

No new design tokens are needed. All three features use existing tokens from `tokens.css`. The only color value not currently in tokens is the warning cell background for the CSV preview table:

| Usage | Value | Notes |
|-------|-------|-------|
| Warning cell background | `#FEF9C3` (amber-50) | Used only in preview table warning cells. Consider adding `--warning-50: #FEF9C3` to tokens if it will be reused. Otherwise, use as a one-off value in the CSS module. |

---

## 5. Component Inventory

### New Components (RT-28)

| Component | File | Purpose |
|-----------|------|---------|
| `ActivityTab` | `item-card/ActivityTab.tsx` | Container: comment input + paginated activity feed |
| `CommentInput` | `item-card/CommentInput.tsx` | Textarea with @mention trigger, char count, submit button |
| `MentionPicker` | `item-card/MentionPicker.tsx` | Popover listing collaborators, filtered by typed text |
| `CommentEntry` | `item-card/CommentEntry.tsx` | Single comment: avatar, name, timestamp, body, overflow menu |
| `SystemActivityEntry` | `item-card/SystemActivityEntry.tsx` | Single system event: icon, description, timestamp |

### New Components (RT-29)

| Component | File | Purpose |
|-----------|------|---------|
| `ImportModal` | `import/ImportModal.tsx` | Multi-step wizard container, manages step state |
| `FileUploadStep` | `import/FileUploadStep.tsx` | Drag-and-drop zone, file validation, parsing trigger |
| `ColumnMappingStep` | `import/ColumnMappingStep.tsx` | Mapping table with auto-map, field dropdowns |
| `PreviewStep` | `import/PreviewStep.tsx` | Preview table with warning highlights |
| `ImportConfirmStep` | `import/ImportConfirmStep.tsx` | Confirmation summary, progress bar during import |

### Modified Components

| Component | File | Change |
|-----------|------|--------|
| `ItemCard` | `item-card/ItemCard.tsx` | Replace Activity tab placeholder with `<ActivityTab>` component |
| `RoadmapPage` | `routes/RoadmapPage.tsx` | Add Import CSV and Export CSV buttons to toolbar |
| `TimeAxis` | `timeline/TimeAxis.tsx` | Pass `fiscalYearStartMonth` to tick functions |
| `timeScale.ts` | `lib/timeScale.ts` | Add fiscal year parameter to `getMajorTicks`, `getMinorTicks`, `formatMajorLabel` |

### New CSS Modules

| File | Purpose |
|------|---------|
| `item-card/ActivityTab.module.css` | Styles for comment input, feed entries, mention picker, skeleton, empty/error states |
| `import/ImportModal.module.css` | Styles for modal shell, step indicator, all 4 step contents, progress bar |

---

## 6. Design Decisions and Trade-offs

### RT-28: Comment input at the top vs. bottom

**Decision: Input at the top.** In a newest-first feed, the most recent content is at the top. Placing the input there means the user types near where their comment will appear. This follows the pattern of tools like Linear and Notion. The alternative (input at the bottom, chat-style) makes more sense for oldest-first feeds like Slack.

### RT-28: Flat comments vs. threading

**Decision: Flat, newest-first.** Thomas explicitly deferred threading. A flat list is simpler to implement, simpler to paginate, and simpler to scan. If threading is added later, the flat list can be upgraded without losing the existing comment layout.

### RT-29: Wizard modal vs. single-page import

**Decision: 4-step wizard.** A wizard breaks a complex flow (upload, map, preview, confirm) into manageable steps. Each step has a clear purpose and clear validation. The alternative (all-in-one page with sections) would work but creates a very tall, scrollable page that is harder to navigate, especially on mobile.

### RT-29: Import and Export as separate buttons vs. unified dropdown

**Decision: Separate buttons.** The existing Export PNG button already uses a dropdown pattern. Adding CSV options to that dropdown would conflate two different export formats (image vs. data). Import and Export CSV are also conceptually different actions. Separate buttons make each action discoverable at a glance. The toolbar has room for two more 32px buttons without feeling crowded.

### RT-31: "FY26 Q1" format vs. "Q1 FY26"

**Decision: "FY26 Q1" (year first).** This follows the convention used by most enterprise tools (SAP, Oracle, Salesforce). Year-first ordering groups fiscal periods by year visually, which is how users scan timeline headers -- they orient by year, then drill into the period.

### RT-31: Two-digit vs. four-digit fiscal year in minor ticks

**Decision: Two-digit ("FY26") for minor ticks, four-digit ("FY2026") for major ticks.** Minor tick cells are narrower. "FY26 Q1" is 7 characters, "FY2026 Q1" is 9. Two-digit year in minor ticks saves space while the major tick above provides the full year context. This mirrors how the current calendar display uses short labels for minor ticks ("Q1") and full labels for major ticks ("2026").

---

## 7. Self-Review Checklist

- [x] All interaction states specified (hover, active, disabled, loading, empty, error) for every interactive element
- [x] CSS values specific enough for Alice to implement without guessing -- token references, pixel values, font sizes, colors
- [x] Responsive behavior defined for mobile (< 640px), tablet (640-1023px), desktop (1024px+)
- [x] Accessibility addressed: ARIA roles, keyboard navigation, focus management, contrast, screen reader support
- [x] Animations specified with duration, easing, and reduced-motion handling
- [x] Empty states designed for Activity tab and CSV import steps
- [x] Error states designed for comment submission, comment editing, activity feed loading, CSV parsing, CSV import, fiscal year save
- [x] Design follows existing Sprint A/B patterns -- no new design patterns introduced
- [x] Component inventory with file paths for Alice
- [x] Design spec written to `docs/roadmap-tool-v1.1-sprint-c-design-spec.md`

---

*Design spec written by Robert (Product Designer). Alice: use this as your implementation guide for all three features. The Activity tab (RT-28) is the most complex surface -- start there. The import modal (RT-29) is the most components but each step is straightforward. The fiscal year labels (RT-31) are the smallest change -- a few lines in timeScale.ts and a settings section. All patterns reuse existing Sprint A/B conventions. No new design tokens, no new interaction paradigms.*
