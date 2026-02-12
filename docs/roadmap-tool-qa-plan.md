# Roadmap Tool (Forge) -- QA Test Plan

**Author:** Enzo (QA)
**Date:** February 11, 2026
**Production URL:** https://forge-app-production.up.railway.app
**Status:** In Progress
**Project ID:** `roadmap-tool`

---

## Overview

Comprehensive end-to-end test plan for the Forge roadmap tool v1.0. Tests cover all three view types (Table, Timeline, Swimlane), CRUD operations, field management, views system, format panel, collaboration infrastructure, navigation, and edge cases. The app is running in DEV_BYPASS_AUTH mode so no authentication testing is required for this pass.

---

## 1. Homepage & Navigation

### 1.1 Homepage Load
- **TC-1.1.1:** Navigate to `/` -- homepage loads with "Roadmaps" title and "New Roadmap" button
- **TC-1.1.2:** Existing roadmaps display as cards in "My Roadmaps" section
- **TC-1.1.3:** Each roadmap card shows name and last modified date
- **TC-1.1.4:** Loading state shows skeleton cards (6 placeholders)

### 1.2 Search
- **TC-1.2.1:** Search input is present with "Search roadmaps..." placeholder
- **TC-1.2.2:** Typing in search filters roadmap cards client-side
- **TC-1.2.3:** Search with no matches shows "No roadmaps matching" message

### 1.3 Create Roadmap
- **TC-1.3.1:** Click "New Roadmap" opens a modal dialog
- **TC-1.3.2:** Modal has name input with "Untitled Roadmap" placeholder, autofocused
- **TC-1.3.3:** Create button is disabled when name is empty
- **TC-1.3.4:** Entering a name and clicking Create navigates to the new roadmap
- **TC-1.3.5:** Pressing Enter in the name input also creates the roadmap
- **TC-1.3.6:** Cancel button closes the modal without creating
- **TC-1.3.7:** Clicking overlay closes the modal

### 1.4 Navigation
- **TC-1.4.1:** Clicking a roadmap card navigates to `/roadmaps/:id`
- **TC-1.4.2:** Sidebar shows "Roadmaps" nav link
- **TC-1.4.3:** Sidebar collapse/expand toggle works
- **TC-1.4.4:** Sidebar collapse state persists visually

### 1.5 Empty State
- **TC-1.5.1:** When no roadmaps exist, empty state shows "No roadmaps yet" with CTA button

---

## 2. Roadmap Page Structure

### 2.1 Page Load
- **TC-2.1.1:** Navigate to `/roadmaps/:id` -- page loads with toolbar and view content
- **TC-2.1.2:** View switcher shows in the toolbar with current view name
- **TC-2.1.3:** Format button is present in toolbar
- **TC-2.1.4:** Filter button is present in toolbar
- **TC-2.1.5:** Presence avatars area is visible in toolbar

### 2.2 TopBar / Breadcrumbs
- **TC-2.2.1:** TopBar renders with app name/logo
- **TC-2.2.2:** Breadcrumbs show current location context

### 2.3 Default View
- **TC-2.3.1:** First visit to a roadmap defaults to Table View
- **TC-2.3.2:** A default Table view is auto-created for new roadmaps

---

## 3. Table View

### 3.1 Basic Rendering
- **TC-3.1.1:** Table renders with header row and data rows
- **TC-3.1.2:** Header row shows field names as column headers
- **TC-3.1.3:** Items display in rows with correct field values
- **TC-3.1.4:** Checkbox column is present as first column
- **TC-3.1.5:** Name column shows item names as clickable text
- **TC-3.1.6:** Footer shows item count

### 3.2 Item Creation
- **TC-3.2.1:** "Add item" row exists at the bottom of the table
- **TC-3.2.2:** Clicking the add row focuses a name input
- **TC-3.2.3:** Typing a name and pressing Enter creates a new item
- **TC-3.2.4:** New item appears in the table immediately (optimistic)
- **TC-3.2.5:** Pressing Escape cancels item creation
- **TC-3.2.6:** Empty name is not accepted (validation)

### 3.3 Inline Editing
- **TC-3.3.1:** Clicking a text cell enters edit mode with text input
- **TC-3.3.2:** Clicking a number cell enters edit mode with number input
- **TC-3.3.3:** Changes save on blur or Enter
- **TC-3.3.4:** Escape cancels editing and reverts to previous value
- **TC-3.3.5:** Active cell shows accent-colored border

### 3.4 Item Card Integration
- **TC-3.4.1:** Clicking an item name opens the Item Card panel
- **TC-3.4.2:** Item Card slides in from the right
- **TC-3.4.3:** Item Card shows item name, description, and fields
- **TC-3.4.4:** Closing Item Card returns focus to the table

### 3.5 Keyboard Navigation
- **TC-3.5.1:** Arrow keys move the active cell highlight
- **TC-3.5.2:** Enter starts editing the active cell
- **TC-3.5.3:** Tab moves to the next cell right

### 3.6 Bulk Selection
- **TC-3.6.1:** Checking a row checkbox selects the item
- **TC-3.6.2:** Checking multiple rows shows bulk action bar
- **TC-3.6.3:** Bulk action bar shows "N items selected" and Delete button
- **TC-3.6.4:** Select All checkbox in header selects all items

### 3.7 Bulk Delete
- **TC-3.7.1:** Clicking Delete in bulk action bar shows confirmation dialog
- **TC-3.7.2:** Confirming deletion removes selected items
- **TC-3.7.3:** Cancel in confirmation dialog preserves items

### 3.8 Delete Keyboard Shortcut
- **TC-3.8.1:** Pressing Delete/Backspace with selected items should show confirmation
- **TC-3.8.2:** Verify whether the shortcut bypasses confirmation (known bug from design review M12)

---

## 4. Timeline View

### 4.1 Basic Rendering
- **TC-4.1.1:** Switch to Timeline view -- timeline renders with time axis and item bars
- **TC-4.1.2:** Time axis shows date labels (months/quarters depending on scale)
- **TC-4.1.3:** Header groups display on the left side
- **TC-4.1.4:** Item bars span their date range horizontally
- **TC-4.1.5:** Today marker is visible as a dashed vertical line
- **TC-4.1.6:** Items without dates do not appear on the Timeline

### 4.2 Time Scale
- **TC-4.2.1:** Timeline toolbar shows time scale selector
- **TC-4.2.2:** Changing time scale updates the timeline display
- **TC-4.2.3:** Layout toggle (Compact/Spacious) changes bar height

### 4.3 Time Slider
- **TC-4.3.1:** Time slider is visible at the bottom of the timeline
- **TC-4.3.2:** Dragging the slider pans the visible date range

### 4.4 Item Interaction
- **TC-4.4.1:** Hovering an item bar shows a tooltip with item details
- **TC-4.4.2:** Clicking an item bar opens the Item Card

### 4.5 Header Groups
- **TC-4.5.1:** Items are grouped by the header field
- **TC-4.5.2:** Header groups can be collapsed/expanded

### 4.6 Milestones
- **TC-4.6.1:** Milestones render as shaped markers on the timeline
- **TC-4.6.2:** Milestone shapes correspond to their type (diamond, circle, etc.)
- **TC-4.6.3:** Milestone tooltip shows name and date on hover

### 4.7 Empty State
- **TC-4.7.1:** Timeline with no dated items shows empty state message
- **TC-4.7.2:** Empty state includes "Switch to Table View" link

### 4.8 Color Coding
- **TC-4.8.1:** Item bars are colored by the configured "color-by" field
- **TC-4.8.2:** Colors match the active palette

---

## 5. Swimlane View

### 5.1 Basic Rendering
- **TC-5.1.1:** Switch to Swimlane view -- grid renders with column and row headers
- **TC-5.1.2:** Column headers show field values along the top
- **TC-5.1.3:** Row headers show field values along the left
- **TC-5.1.4:** Items appear as cards at correct row/column intersections

### 5.2 Card Display
- **TC-5.2.1:** Standard mode cards show name, dates, and description preview
- **TC-5.2.2:** Compact mode cards show reduced information
- **TC-5.2.3:** Cards have a colored left border accent

### 5.3 Card Interaction
- **TC-5.3.1:** Clicking a card opens the Item Card panel
- **TC-5.3.2:** Empty cells show a "+" button on hover

### 5.4 Item Creation from Swimlane
- **TC-5.4.1:** Clicking "+" in an empty cell creates an item
- **TC-5.4.2:** Verify whether it uses prompt() or inline creation (known issue M6)

### 5.5 Axis Configuration
- **TC-5.5.1:** Column and row fields can be changed via Format Panel
- **TC-5.5.2:** Swap button exchanges row and column fields

---

## 6. Item Card (Detail Panel)

### 6.1 Panel Behavior
- **TC-6.1.1:** Item Card slides in from the right as an overlay
- **TC-6.1.2:** Semi-transparent overlay appears behind the panel
- **TC-6.1.3:** Clicking overlay closes the panel
- **TC-6.1.4:** Close button (X) closes the panel

### 6.2 Item Name
- **TC-6.2.1:** Item name is displayed and editable
- **TC-6.2.2:** Editing name and saving updates the item

### 6.3 Description
- **TC-6.3.1:** Description field is present for editing
- **TC-6.3.2:** Check whether rich text editor (Tiptap) or plain textarea (known issue M5)

### 6.4 Fields Tab
- **TC-6.4.1:** Start Date and End Date fields are editable
- **TC-6.4.2:** Custom field values display and are editable
- **TC-6.4.3:** List field values show as colored dropdown

### 6.5 Activity Tab
- **TC-6.5.1:** Activity tab exists and shows change history

### 6.6 Tabs Navigation
- **TC-6.6.1:** Overview, Linked Items, Sub-Items tabs exist in left panel
- **TC-6.6.2:** Fields, Activity tabs exist in right panel

### 6.7 Actions Menu
- **TC-6.7.1:** Three-dot menu shows actions (Copy URL, Duplicate, Delete)
- **TC-6.7.2:** Duplicate creates a copy of the item
- **TC-6.7.3:** Delete removes the item with confirmation

### 6.8 Save Actions
- **TC-6.8.1:** Save button saves changes
- **TC-6.8.2:** Save buttons are disabled when no changes exist

---

## 7. Fields Management

### 7.1 Fields Page Access
- **TC-7.1.1:** Navigate to `/roadmaps/:id/fields` -- fields page loads
- **TC-7.1.2:** Two-column layout: Roadmap Fields (left) and Account Fields (right)
- **TC-7.1.3:** "Add Field" button is visible

### 7.2 Create Field
- **TC-7.2.1:** Click "Add Field" opens field creation modal
- **TC-7.2.2:** Modal has name input, type selector, and (for numeric) format selector
- **TC-7.2.3:** All 6 field types are available: List, Multi-Select, Numeric, Text, Date, Team Member
- **TC-7.2.4:** Creating a List field allows adding values with colors
- **TC-7.2.5:** Creating a field adds it to the Roadmap Fields column

### 7.3 Field Operations
- **TC-7.3.1:** Three-dot menu shows Edit, Archive, Promote, Delete options
- **TC-7.3.2:** Archive field hides it (with archived badge)
- **TC-7.3.3:** Restore archived field makes it active again
- **TC-7.3.4:** Promote to account moves field to Account Fields column
- **TC-7.3.5:** Delete field removes it with confirmation

### 7.4 Field Values (List/Multi-Select)
- **TC-7.4.1:** Editing a List field shows existing values
- **TC-7.4.2:** Can add new values with name and color
- **TC-7.4.3:** Can delete values
- **TC-7.4.4:** Can edit value names

### 7.5 Edge Cases
- **TC-7.5.1:** Empty field name is rejected
- **TC-7.5.2:** Field type cannot be changed after creation (immutable)
- **TC-7.5.3:** Max field name length (100 chars) is enforced

---

## 8. Views System

### 8.1 View Switcher
- **TC-8.1.1:** View switcher dropdown lists all views
- **TC-8.1.2:** Each view shows type icon and name
- **TC-8.1.3:** Clicking a view switches to it
- **TC-8.1.4:** "Add New View" option is at the bottom

### 8.2 Create View
- **TC-8.2.1:** Create View modal opens with name input and type selector
- **TC-8.2.2:** All three types available: Table, Timeline, Swimlane
- **TC-8.2.3:** Creating a view adds it to the switcher and activates it
- **TC-8.2.4:** New view starts with default/empty config

### 8.3 View Operations
- **TC-8.3.1:** Views can be renamed
- **TC-8.3.2:** Views can be deleted (except the last one)
- **TC-8.3.3:** Deleting the last view is prevented

### 8.4 View Persistence
- **TC-8.4.1:** View configuration changes persist across page reloads
- **TC-8.4.2:** Filters persist per view
- **TC-8.4.3:** Format panel settings persist per view

---

## 9. Filtering

### 9.1 Filter Builder
- **TC-9.1.1:** Filter button opens filter builder panel
- **TC-9.1.2:** Filter builder shows field dropdown, operator dropdown, value input
- **TC-9.1.3:** "Add Filter" adds a new filter condition
- **TC-9.1.4:** Removing a filter condition (X button) works

### 9.2 Filter Application
- **TC-9.2.1:** Adding a filter hides non-matching items
- **TC-9.2.2:** Multiple filters combine with AND logic
- **TC-9.2.3:** "Clear All" removes all filters
- **TC-9.2.4:** Filtered items are hidden, not deleted (appear in other views)

### 9.3 Filter Operators
- **TC-9.3.1:** "equals" operator works for list fields
- **TC-9.3.2:** "is_empty" / "is_not_empty" operators work
- **TC-9.3.3:** "contains" operator works for text fields

---

## 10. Format Panel

### 10.1 Panel Behavior
- **TC-10.1.1:** Format button toggles the panel open/closed
- **TC-10.1.2:** Panel slides in from the right
- **TC-10.1.3:** Panel has a close button (X)
- **TC-10.1.4:** Format Panel and Item Card cannot be open simultaneously

### 10.2 Timeline Format
- **TC-10.2.1:** Header Field dropdown allows selecting grouping field
- **TC-10.2.2:** Time Scale selector shows W/M/Q/H/Y options
- **TC-10.2.3:** Layout toggle between Compact and Spacious
- **TC-10.2.4:** Color By dropdown selects the color-coding field
- **TC-10.2.5:** Palette picker shows 6 default palettes
- **TC-10.2.6:** Selecting a palette changes item bar colors

### 10.3 Swimlane Format
- **TC-10.3.1:** Column Field and Row Field dropdowns present
- **TC-10.3.2:** Card display mode toggle (Standard/Compact)
- **TC-10.3.3:** Color settings match Timeline pattern

### 10.4 Table Format
- **TC-10.4.1:** Column visibility toggles present
- **TC-10.4.2:** Hiding a column removes it from the table
- **TC-10.4.3:** Showing a column adds it back

---

## 11. Color Palettes

### 11.1 Default Palettes
- **TC-11.1.1:** Six default palettes are available: Citrus, Groovy, Pastel, Autumn, Neon, Ocean
- **TC-11.1.2:** Each palette has distinct color sets
- **TC-11.1.3:** Palette selection applies colors to items in views

### 11.2 Color Assignment
- **TC-11.2.1:** Colors auto-assign to field values in order
- **TC-11.2.2:** Color legend shows current assignments

---

## 12. Real-Time Collaboration Infrastructure

### 12.1 WebSocket Connection
- **TC-12.1.1:** Connection status indicator appears on load
- **TC-12.1.2:** "Connected" state shows no persistent banner

### 12.2 Presence
- **TC-12.2.1:** Presence avatars area is rendered in toolbar

---

## 13. CRUD Operations (API-Level)

### 13.1 Roadmap CRUD
- **TC-13.1.1:** Create roadmap via API returns new roadmap with ID
- **TC-13.1.2:** Get roadmap returns correct data
- **TC-13.1.3:** Update roadmap (rename) persists
- **TC-13.1.4:** Delete roadmap removes it from homepage

### 13.2 Item CRUD
- **TC-13.2.1:** Create item via API returns new item
- **TC-13.2.2:** Get items returns all items for a roadmap
- **TC-13.2.3:** Update item (name, dates, description) persists
- **TC-13.2.4:** Delete item removes it from all views
- **TC-13.2.5:** Duplicate item creates a copy

### 13.3 Field CRUD
- **TC-13.3.1:** Create field returns new field with type
- **TC-13.3.2:** Create field values for list fields
- **TC-13.3.3:** Set item field values via API
- **TC-13.3.4:** Delete field removes it

### 13.4 View CRUD
- **TC-13.4.1:** Create view returns new view
- **TC-13.4.2:** Update view config persists
- **TC-13.4.3:** Delete view removes it

### 13.5 Milestone CRUD
- **TC-13.5.1:** Get milestones returns milestone list

---

## 14. Shared View Page

### 14.1 Route
- **TC-14.1.1:** Navigate to `/shared/:token` -- check if it renders or is a stub
- **TC-14.1.2:** Verify shared view page shows roadmap content or placeholder

---

## 15. Edge Cases

### 15.1 Long Names
- **TC-15.1.1:** Create item with very long name (500 chars) -- renders with truncation
- **TC-15.1.2:** Create roadmap with name at max length (200 chars)

### 15.2 Special Characters
- **TC-15.2.1:** Create item with special characters: `<script>`, `"quotes"`, emojis
- **TC-15.2.2:** Create field with special characters in name

### 15.3 Empty States
- **TC-15.3.1:** Roadmap with no items shows empty table state
- **TC-15.3.2:** Timeline with no dated items shows empty state
- **TC-15.3.3:** Fields page with no fields shows empty state

### 15.4 Validation
- **TC-15.4.1:** Attempt to create item with empty name -- rejected
- **TC-15.4.2:** Attempt to create field with empty name -- rejected
- **TC-15.4.3:** Item description max length (10,000 chars) enforced
- **TC-15.4.4:** Roadmap name max length (200 chars) enforced

---

## 16. Responsive Behavior

### 16.1 Desktop
- **TC-16.1.1:** Full layout renders at 1280px+ width
- **TC-16.1.2:** Sidebar is expanded by default on desktop

### 16.2 Mobile Message
- **TC-16.2.1:** On small viewport, a mobile message or responsive adaptation appears

---

## 17. Design Review Known Issues Verification

### 17.1 Must-Fix Items
- **TC-17.1.1:** M3 -- List field inline editing uses text input instead of dropdown
- **TC-17.1.2:** M4 -- Date field inline editing has no date picker
- **TC-17.1.3:** M5 -- Item Card description is plain textarea, not rich text
- **TC-17.1.4:** M6 -- Swimlane uses prompt() for item creation
- **TC-17.1.5:** M7 -- SharedViewPage is a stub
- **TC-17.1.6:** M9 -- Breadcrumbs show hardcoded "Roadmap" text
- **TC-17.1.7:** M12 -- Delete/Backspace shortcut bypasses confirmation

---

## Test Data Requirements

The production database has one roadmap ("Product Launch Q3") with 5 items. Testing will require creating:
1. At least 2 additional roadmaps (for CRUD testing)
2. Multiple custom fields (List, Numeric, Text, Date types)
3. Field values for list fields
4. Field value assignments on items
5. Multiple views (Table, Timeline, Swimlane)
6. Items with and without dates
7. Items with special characters and long names

---

*Test plan written by Enzo (QA). Execution follows immediately.*
