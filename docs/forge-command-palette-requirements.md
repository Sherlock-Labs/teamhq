# Forge v2 — Command Palette (Cmd+K)

**Author:** Thomas (PM)
**Date:** March 18, 2026
**Status:** Ready for pipeline
**Project ID:** `roadmap-tool`
**Work Item:** RT-38

---

## 1. Context

Forge has a growing feature set across three views, themes, filters, sharing, and collaboration. Power users need a faster way to navigate and act than clicking through menus. The team agreed (standup 2026-03-18) that a command palette is the highest-leverage v2 feature because:

1. Keyboard shortcuts become free once you have a command registry
2. It provides discoverability — users learn features by searching for them
3. The underlying action registry serves as backbone for future context menus and AI actions

## 2. Problem Statement

As Forge's feature set grows, users rely entirely on the UI to discover and access features. There's no fast keyboard-driven way to switch views, create items, apply filters, change themes, or navigate between roadmaps. Power users (PMs, product leads) who live in the tool daily want speed; new users want discoverability.

## 3. Scope

### In Scope (v1)

**Command palette UI:**
- `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) opens a centered overlay modal
- Search input with real-time fuzzy filtering
- Results grouped by category (Navigation, Actions, Settings, Recent)
- Keyboard navigation: arrow keys to move, Enter to execute, Escape to close
- Selected command shows keyboard shortcut hint (if one exists) on the right side

**Core commands (15-20 for v1):**

| Category | Command | Shortcut |
|----------|---------|----------|
| Navigation | Switch to Timeline view | `1` |
| Navigation | Switch to Board view | `2` |
| Navigation | Switch to Table view | `3` |
| Navigation | Go to roadmap settings | `S` |
| Navigation | Go to home / roadmaps list | `H` |
| Actions | Create new item | `N` |
| Actions | Create new milestone | `M` |
| Actions | Toggle filter panel | `F` |
| Actions | Export to PNG | `E` |
| Actions | Share roadmap | — |
| Actions | Toggle presentation mode | `P` |
| Settings | Change theme | `T` |
| Settings | Toggle dark mode | `D` |
| Settings | Change accent color | — |
| Recent | (last 5 accessed roadmaps) | — |
| Search | Search items by title | — |

**Action registry pattern:**
- Centralized registry: Map of action IDs → handler functions with metadata (label, shortcut, icon, category, enabled condition)
- Each action is a plain object: `{ id, label, category, shortcut?, icon?, handler(), enabled?() }`
- Registry is the single source of truth — palette UI, keyboard shortcuts, and future context menus all read from it
- Actions can be conditionally enabled (e.g., "Export to PNG" only available when a roadmap is open)

**Keyboard shortcuts layer:**
- Global shortcuts registered from the action registry — no separate shortcut system
- Shortcuts active when palette is closed, suppressed when it's open (palette has its own nav keys)
- `?` opens a shortcut cheat sheet modal (lists all registered shortcuts by category)

### Out of Scope (deferred)

- AI/natural language commands ("create an item called X due next Friday")
- Multi-step command flows (e.g., "move item to → [pick roadmap]")
- Custom/user-defined shortcuts
- Plugin or extension commands
- Command history or favorites

## 4. User Stories

### US-1: Open command palette
**As a** Forge user, **I want to** press Cmd+K to open a command palette **so that** I can quickly find and execute any action without leaving the keyboard.

**Acceptance criteria:**
- Cmd+K / Ctrl+K opens the palette overlay
- Palette appears centered with a search input auto-focused
- Typing immediately filters available commands (fuzzy match on label and category)
- Escape or clicking outside closes the palette
- Palette is not available when a modal is already open (avoids stacking)

### US-2: Execute a command
**As a** user with the palette open, **I want to** select and run a command **so that** I can perform actions quickly.

**Acceptance criteria:**
- Arrow keys navigate the filtered results list
- Enter executes the highlighted command and closes the palette
- Mouse click on a command also executes it
- After execution, focus returns to the previous context
- If a command has a keyboard shortcut, it's shown as a hint badge on the right

### US-3: Use keyboard shortcuts directly
**As a** power user, **I want to** press shortcut keys directly (e.g., `N` for new item) **so that** I can act without even opening the palette.

**Acceptance criteria:**
- Shortcuts from the action registry work globally when no modal/palette is open
- Shortcuts are suppressed when the user is typing in an input field or textarea
- `?` opens a shortcut reference sheet listing all available shortcuts by category
- Shortcuts match the table in Section 3

### US-4: Search items by title
**As a** user, **I want to** search for roadmap items by name from the palette **so that** I can jump to any item quickly.

**Acceptance criteria:**
- Typing in the palette searches both commands AND item titles
- Item results appear in a separate "Items" category below commands
- Selecting an item opens its detail card
- Search is limited to the current roadmap's items (not cross-roadmap)

## 5. Technical Constraints

- **No external dependencies.** The action registry and palette UI should be built with React only — no command palette libraries.
- **Performance.** Filtering must feel instant (<16ms) for up to 500 items + 20 commands. Use simple substring/fuzzy match, not full-text search.
- **Shortcut conflicts.** Must not conflict with browser defaults (Cmd+T, Cmd+W, etc.). Only use single-key shortcuts when no input is focused.
- **Accessibility.** Palette must be navigable by screen reader (proper ARIA roles: `combobox`, `listbox`, `option`). Announce result count changes.

## 6. Non-Functional Requirements

- Palette open → first result visible in <100ms
- Fuzzy search updates on every keystroke with no perceptible lag
- Works correctly on Mac, Windows, Linux (modifier key detection)
- Palette z-index above all other UI elements including the theme picker

## 7. Dependencies

- **Blocked by:** Visual themes must ship first (RT-37d, RT-37e, RT-37f) — themes add the "Change theme" and "Toggle dark mode" commands
- **No backend work required** — all commands execute client-side actions. Item search uses existing client-side data.

## 8. Pipeline Recommendation

This is a frontend-heavy feature with minimal backend involvement:
1. **Andrei** — lightweight tech approach for the action registry pattern
2. **Robert** — design spec for palette UI, shortcut cheat sheet, result grouping
3. **Alice** — implementation (this is almost entirely her work)
4. **Robert** — design review
5. **Enzo** — QA pass

Skip: backend, marketing, docs (internal feature, self-discoverable). Nadia can add a section to the user guide post-ship if needed.
