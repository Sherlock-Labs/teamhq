# Forge v2 — Command Palette (Cmd+K): Technical Approach

**Author:** Andrei (Technical Architect)
**Date:** March 18, 2026
**Status:** Complete
**Project ID:** `roadmap-tool`
**Work Item:** RT-38a
**Inputs:** `docs/forge-command-palette-requirements.md` (Thomas), Forge codebase at `/home/jeff/forge-app`

---

## 1. Architectural Summary

The command palette is a frontend-only feature built on three primitives: an **action registry** (a plain Map), a **palette component** (modal with search/keyboard nav), and a **shortcut listener** (a single global keydown handler). No backend changes. No new dependencies.

**Core decisions:**

- **Action registry as a Map.** A `Map<string, Action>` in a dedicated module. Components register actions by calling a registration function. The registry is the single source of truth for the palette UI, keyboard shortcuts, and (in the future) context menus.
- **Palette as a standalone component.** A React component mounted at the AppShell level (same level as BugReportModal). It reads from the registry, does its own filtering, manages its own keyboard navigation. It is not coupled to any specific view.
- **Single global keydown handler for shortcuts.** One `useEffect` in AppShell that reads the registry's shortcut map and dispatches. This replaces the pattern of scattered per-component keyboard listeners for global actions. Existing per-component listeners (table arrow keys, drag undo Cmd+Z) remain unchanged -- they handle view-specific interactions, not global commands.
- **Fuzzy search via simple substring matching.** No external library. `label.toLowerCase().includes(query)` for commands; same for item titles. This is fast enough for 500 items + 20 commands and produces predictable, debuggable results.

**Zero new dependencies.** React, existing Zustand stores, existing hooks. That is the whole stack.

---

## 2. Action Registry

### 2.1 Data Structure

The registry lives in a single module: `client/src/lib/actionRegistry.ts`.

```typescript
export interface Action {
  id: string;                         // unique key, e.g. 'view.switch.timeline'
  label: string;                      // display name: "Switch to Timeline view"
  category: 'navigation' | 'actions' | 'settings';
  shortcut?: string;                  // single key: '1', 'N', 'F', etc.
  icon?: React.ReactNode;             // optional SVG icon (14x14)
  handler: () => void;                // what happens when the action fires
  enabled?: () => boolean;            // returns false to hide/disable the action
  keywords?: string[];                // extra terms for search matching
}

// The registry itself
const registry = new Map<string, Action>();

// Public API
export function registerAction(action: Action): () => void {
  registry.set(action.id, action);
  // Return unregister function for cleanup
  return () => registry.delete(action.id);
}

export function unregisterAction(id: string): void {
  registry.delete(id);
}

export function getActions(): Action[] {
  return Array.from(registry.values());
}

export function getEnabledActions(): Action[] {
  return Array.from(registry.values()).filter(
    (a) => !a.enabled || a.enabled()
  );
}

export function getShortcutMap(): Map<string, Action> {
  const map = new Map<string, Action>();
  for (const action of registry.values()) {
    if (action.shortcut && (!action.enabled || action.enabled())) {
      map.set(action.shortcut.toLowerCase(), action);
    }
  }
  return map;
}
```

### 2.2 Why a Module-Level Map, Not Zustand

The registry is not reactive UI state. Components do not need to re-render when actions are added or removed -- they query the registry when the palette opens. A plain Map in a module is simpler, faster, and avoids unnecessary re-renders. The palette reads from it on open; the shortcut handler reads from it on keydown. Neither needs subscription.

If we later need reactive registration (e.g., a badge showing "3 new commands"), we can wrap it in Zustand then. For now, YAGNI.

### 2.3 Registration Pattern

Actions are registered in a `useActions` hook called from the relevant container component. This keeps action definitions co-located with the code that knows how to execute them.

```typescript
// client/src/hooks/useActions.ts

export function useRoadmapActions(roadmapId: string | undefined) {
  const { setActiveView } = useViewStore();
  const navigate = useNavigate();
  const views = useQueryData<View[]>(['views', roadmapId]);

  useEffect(() => {
    if (!roadmapId) return;

    const unregisters = [
      registerAction({
        id: 'view.switch.timeline',
        label: 'Switch to Timeline view',
        category: 'navigation',
        shortcut: '1',
        handler: () => {
          const timeline = views?.find(v => v.type === 'timeline');
          if (timeline) setActiveView(timeline.id);
        },
        enabled: () => !!views?.find(v => v.type === 'timeline'),
      }),
      registerAction({
        id: 'item.create',
        label: 'Create new item',
        category: 'actions',
        shortcut: 'N',
        handler: () => { /* trigger inline creator or modal */ },
      }),
      // ... remaining actions
    ];

    return () => unregisters.forEach(fn => fn());
  }, [roadmapId, views, setActiveView, navigate]);
}
```

This pattern gives us automatic cleanup: when the user navigates away from a roadmap page, the `useEffect` cleanup removes all roadmap-specific actions. Global actions (like "Go to home") are registered from AppShell and live for the app's lifetime.

### 2.4 Action Inventory (v1)

Exactly the commands from Thomas's requirements. No additions, no subtractions.

| ID | Label | Category | Shortcut | Enabled Condition |
|----|-------|----------|----------|-------------------|
| `nav.view.timeline` | Switch to Timeline view | navigation | `1` | On roadmap page, timeline view exists |
| `nav.view.board` | Switch to Board view | navigation | `2` | On roadmap page, swimlane view exists |
| `nav.view.table` | Switch to Table view | navigation | `3` | On roadmap page, table view exists |
| `nav.settings` | Go to roadmap settings | navigation | `S` | On roadmap page |
| `nav.home` | Go to home / roadmaps list | navigation | `H` | Always |
| `action.create-item` | Create new item | actions | `N` | On roadmap page |
| `action.create-milestone` | Create new milestone | actions | `M` | On roadmap page, timeline view active |
| `action.toggle-filters` | Toggle filter panel | actions | `F` | On roadmap page |
| `action.export-png` | Export to PNG | actions | `E` | On roadmap page, has items |
| `action.share` | Share roadmap | actions | -- | On roadmap page |
| `action.presentation` | Toggle presentation mode | actions | `P` | On roadmap page, has items, desktop only |
| `settings.change-theme` | Change theme | settings | `T` | On roadmap page (requires themes shipped) |
| `settings.dark-mode` | Toggle dark mode | settings | `D` | On roadmap page (requires themes shipped) |
| `settings.accent-color` | Change accent color | settings | -- | On roadmap page (requires themes shipped) |

**Recent roadmaps** are not registered as actions. They are populated dynamically when the palette opens by reading from the `['roadmaps']` query cache. See section 5.

---

## 3. Command Palette Component

### 3.1 Component Tree

```
CommandPalette (overlay + input + results list)
  CommandPaletteResult (individual result row)
```

Two components total. The palette is not a generic reusable widget -- it is purpose-built for this feature. If we need a second combobox-style picker later, we can extract shared logic then.

**Files:**
- `client/src/components/command-palette/CommandPalette.tsx`
- `client/src/components/command-palette/CommandPalette.module.css`

### 3.2 State Management

The palette's open/close state is managed in `viewStore.ts` (Zustand) alongside the other UI panel states. This is important because the palette, item card, and format panel need mutual-exclusion awareness -- opening the palette should not stack on top of an open modal.

```typescript
// Added to viewStore.ts:
commandPaletteOpen: boolean;
openCommandPalette: () => void;
closeCommandPalette: () => void;
```

The internal palette state (query string, selected index, filtered results) is local React state inside `CommandPalette.tsx`. No reason to put transient search state in the global store.

### 3.3 Rendering Logic

```typescript
function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get filtered results (commands + items)
  const results = useFilteredResults(query);

  // Reset selection when results change
  useEffect(() => setSelectedIndex(0), [results]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].execute();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.palette}
        onClick={e => e.stopPropagation()}
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
        aria-owns="command-palette-list"
      >
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Type a command or search..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          role="searchbox"
          aria-autocomplete="list"
          aria-controls="command-palette-list"
          aria-activedescendant={`cmd-result-${selectedIndex}`}
        />
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className={styles.resultsList}
          aria-label={`${results.length} results`}
        >
          {results.map((result, i) => (
            <div
              key={result.id}
              id={`cmd-result-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={`${styles.result} ${i === selectedIndex ? styles.resultSelected : ''}`}
              onClick={() => { result.execute(); onClose(); }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {result.icon && <span className={styles.resultIcon}>{result.icon}</span>}
              <span className={styles.resultLabel}>{result.label}</span>
              {result.category && (
                <span className={styles.resultCategory}>{result.category}</span>
              )}
              {result.shortcut && (
                <kbd className={styles.resultShortcut}>{result.shortcut}</kbd>
              )}
            </div>
          ))}
          {results.length === 0 && query && (
            <div className={styles.noResults}>No results for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3.4 Result Grouping

Results are displayed in category groups with thin section headers. The grouping is computed from the flat results array:

```typescript
type ResultGroup = {
  label: string;
  results: PaletteResult[];
};
```

Group order is fixed: **Navigation** > **Actions** > **Settings** > **Recent** > **Items**. Groups with zero matching results are omitted. The group header is a non-interactive `div` with `role="presentation"` -- screen readers skip it and navigate directly between `option` elements.

### 3.5 Mounting Point

The palette is rendered in `AppShell.tsx`, at the same level as the existing `BugReportModal`. This keeps it above all other content in the component tree and avoids z-index wars with view-specific overlays.

```tsx
// In AppShell.tsx, alongside BugReportModal:
{commandPaletteOpen && (
  <CommandPalette onClose={closeCommandPalette} />
)}
```

### 3.6 Z-Index

The existing z-index scale in the codebase:

| Layer | z-index |
|-------|---------|
| Toast | 100 |
| Modals / overlays (ConfirmDialog, BugReport, Presentation) | 50 |
| Bug FAB | 40 |
| Format panel | 39-40 |
| Bulk action bar | 30 |
| Dropdowns | 20 |
| Table header | 10 |

The command palette overlay should use **z-index: 60**. This places it above all existing modals (50) and the format panel (40), but below the Toast (100) so toast notifications remain visible when the palette is open.

### 3.7 Modal Stacking Prevention

Per US-1: "Palette is not available when a modal is already open." The shortcut handler (Cmd+K) checks `viewStore` state before opening. If `itemCardOpen`, `isPresentationMode`, or any known modal boolean is truthy, the shortcut is suppressed. Conversely, opening the palette closes the format panel.

---

## 4. Keyboard Shortcuts Layer

### 4.1 Single Global Handler

A single `useEffect` in `AppShell.tsx` handles all global keyboard shortcuts. This replaces the need for each action to register its own listener.

```typescript
// client/src/hooks/useGlobalShortcuts.ts

export function useGlobalShortcuts() {
  const {
    commandPaletteOpen,
    openCommandPalette,
    itemCardOpen,
    isPresentationMode,
  } = useViewStore();
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+K: open palette (works everywhere except inside modals)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Don't open if another modal is stacked
        if (!isPresentationMode) {
          openCommandPalette();
        }
        return;
      }

      // All other shortcuts suppressed when:
      // 1. Palette is open (it handles its own keys)
      // 2. Any modal is open
      // 3. User is typing in an input/textarea/contenteditable
      if (commandPaletteOpen || itemCardOpen || isPresentationMode) return;

      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      if (isTyping) return;

      // Don't intercept modified keys (Cmd+S, Ctrl+C, etc.)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? opens cheat sheet
      if (e.key === '?') {
        e.preventDefault();
        setCheatSheetOpen(true);
        return;
      }

      // Look up shortcut in registry
      const shortcuts = getShortcutMap();
      const action = shortcuts.get(e.key.toLowerCase());
      if (action) {
        e.preventDefault();
        action.handler();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, openCommandPalette, itemCardOpen, isPresentationMode]);

  return { cheatSheetOpen, setCheatSheetOpen };
}
```

### 4.2 Suppression Rules

Shortcuts are suppressed in these contexts:

1. **Palette is open.** The palette handles its own keyboard navigation (ArrowUp/Down, Enter, Escape). Single-key shortcuts must not fire underneath it.
2. **User is typing.** If `document.activeElement` is an `<input>`, `<textarea>`, `<select>`, or `[contenteditable]`, single-key shortcuts are suppressed. This prevents pressing `N` (new item) while typing a name from triggering the shortcut.
3. **Modal is open.** When `itemCardOpen`, `isPresentationMode`, or another modal flag is truthy, shortcuts are suppressed.
4. **Modifier keys.** If `metaKey`, `ctrlKey`, or `altKey` is true, the shortcut handler ignores the event. This avoids conflicts with browser shortcuts. The only exception is `Cmd/Ctrl+K` for the palette itself.

### 4.3 Conflict with Existing Handlers

The codebase has several existing `keydown` listeners:

- **AppShell:** Escape (close mobile menu), Cmd+Shift+K (bug report)
- **TableView:** Arrow keys, Tab, Enter, Escape, Delete/Backspace (cell navigation)
- **TimelineView:** Cmd+Z (undo drag)
- **PresentationMode:** Escape (exit), Arrow keys (view switching)
- **Various modals:** Escape (close)

**None of these conflict with the new shortcuts.** The new global shortcuts are all single unmodified letter/number keys (`1`, `2`, `3`, `N`, `M`, `F`, `E`, `P`, `T`, `D`, `S`, `H`). The existing listeners use either modifier combinations (Cmd+Z, Cmd+Shift+K) or special keys (Escape, Arrow, Tab, Enter, Delete). They coexist without interference because:

- The new handler skips events with modifier keys (`metaKey || ctrlKey || altKey`)
- The new handler skips events when the user is typing in an input (which is when TableView cell navigation is active)
- The new handler skips events when modals/presentation are open (which is when those components' listeners are active)

No existing handlers need modification.

### 4.4 Shortcut Cheat Sheet

`?` opens a lightweight modal listing all registered shortcuts by category. This is a small, self-contained component:

**File:** `client/src/components/command-palette/ShortcutCheatSheet.tsx`

It reads all actions from `getActions()`, groups them by category, and renders a simple grid of `<kbd>` badges next to labels. Dismiss with Escape or clicking outside. Same overlay pattern as ConfirmDialog (z-index 50, centered, backdrop click to close).

---

## 5. Item Search Integration

### 5.1 Data Source

The palette searches roadmap items by title. The items are already loaded into the React Query cache via the `['items', roadmapId]` query on the RoadmapPage. The palette reads from this cache directly -- no new API call.

```typescript
import { useQueryClient } from '@tanstack/react-query';

function useItemResults(query: string, roadmapId: string | undefined): PaletteResult[] {
  const queryClient = useQueryClient();

  if (!query || !roadmapId || query.length < 2) return [];

  const items = queryClient.getQueryData<Item[]>(['items', roadmapId]);
  if (!items) return [];

  const lower = query.toLowerCase();
  return items
    .filter(item => item.name.toLowerCase().includes(lower))
    .slice(0, 10)  // Cap at 10 item results
    .map(item => ({
      id: `item:${item.id}`,
      label: item.name,
      category: 'Items',
      icon: null,
      shortcut: undefined,
      execute: () => openItemCard(item.id),
    }));
}
```

### 5.2 Why Not Search on the Server

The requirements say "Search is limited to the current roadmap's items." The items for the current roadmap are already fully loaded client-side (the existing `getItems` query fetches all items for the roadmap). A server round-trip would add latency for zero benefit. If Forge later supports cross-roadmap search, that is when we add a server endpoint.

### 5.3 Minimum Query Length

Item search only runs when the query is 2+ characters. Single-character queries return only command matches. This keeps the results focused and avoids flooding the list with hundreds of items when the user types one letter.

### 5.4 Result Ordering

When the palette has both command matches and item matches:

1. **Commands first.** Always above items. They are the primary use case.
2. **Items second.** Capped at 10 results, in their original sort order.

Within commands, the order follows the fixed category sequence: Navigation > Actions > Settings > Recent. This is a stable, predictable order that does not change based on typing.

### 5.5 Recent Roadmaps

The "Recent" category shows the last 5 accessed roadmaps. These are populated from the `['roadmaps']` query cache (already loaded by HomePage). The "last accessed" ordering comes from the `updatedAt` field on each roadmap, sorted descending. These appear as palette results with category "Recent" and execute a `navigate(`/roadmaps/${id}`)`.

Recent roadmaps only appear when the query is empty or matches the roadmap name. They are not registered as actions in the registry because they are dynamic data, not static commands.

---

## 6. Performance

### 6.1 Filtering Budget

The requirement is <16ms for 500 items + 20 commands. Let us verify this is trivially achievable.

**Command filtering:** 20 actions, each checked with `label.toLowerCase().includes(query)` + optional `keywords` array check. At ~20 iterations, this takes <0.01ms. Not a concern.

**Item filtering:** 500 items, each checked with `name.toLowerCase().includes(query)`. At ~500 iterations of a single string `includes()` call, this takes <0.5ms on any modern browser. We pre-compute `name.toLowerCase()` during the filter pass, not on every keystroke separately.

**Total: well under 1ms.** We are two orders of magnitude below the 16ms budget. No memoization, debouncing, or virtualization needed.

### 6.2 What We Are Not Doing

- **No fuzzy matching library.** Substring `includes()` is good enough and produces zero surprising results. Users type "time" and see "Switch to Timeline view." If we later want fuzzy ranking (matching "stv" to "Switch to Timeline view"), we can add a 20-line scoring function. But substring is the right starting point.
- **No virtualized list.** Even with 500 items + 20 commands = 520 results (which will never all display at once because the search narrows results quickly), rendering 50 visible DOM nodes is trivial. The list is capped at ~25 visible results max after filtering.
- **No debounced input.** Filtering runs on every keystroke synchronously. At <1ms per filter pass, debouncing would add perceived latency for no benefit.
- **No Web Worker.** The computation is too fast to justify the overhead of worker message passing.

### 6.3 Palette Open Performance

The palette should be visible within 100ms of pressing Cmd+K (per NFR). The component mounts, auto-focuses the input, reads the registry (synchronous Map read), and renders the default results (all enabled commands + recent roadmaps). No data fetching, no async work, no lazy loading. This will mount in a single React render cycle (~5-10ms).

---

## 7. Accessibility

### 7.1 ARIA Pattern

The palette follows the [ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) with a listbox popup:

- Outer container: `role="combobox"`, `aria-expanded="true"`, `aria-haspopup="listbox"`
- Search input: `role="searchbox"`, `aria-autocomplete="list"`, `aria-controls="command-palette-list"`, `aria-activedescendant` pointing to the selected result's ID
- Results list: `role="listbox"`, `aria-label` with result count
- Each result: `role="option"`, `aria-selected` for the highlighted item
- Category headers: `role="presentation"` (decorative grouping, not navigable)

### 7.2 Screen Reader Announcements

When the result count changes (user types and results filter), update a visually-hidden `aria-live="polite"` region with the count: "5 results" or "No results." This is a small `<div>` positioned off-screen, updated on each filter pass.

### 7.3 Focus Management

- On open: focus moves to the search input (auto-focus)
- On close: focus returns to the previously focused element (use `useFocusTrap` hook that already exists in the codebase, or store `document.activeElement` on open and restore on unmount -- following the same pattern as `useFocusTrap.ts` lines 15, 55)
- Keyboard: full navigation without mouse (ArrowUp/Down to move, Enter to execute, Escape to close)

---

## 8. File Classification

### New Files

| File | Type | Description |
|------|------|-------------|
| `client/src/lib/actionRegistry.ts` | **New** | Action registry: `Action` type, `Map<string, Action>`, register/unregister/query functions. ~60 lines. |
| `client/src/hooks/useActions.ts` | **New** | Hook that registers all v1 actions (roadmap-scoped + global). Called from RoadmapPage and AppShell. ~120 lines. |
| `client/src/hooks/useGlobalShortcuts.ts` | **New** | Single global keydown handler. Reads shortcut map from registry, handles Cmd+K, handles `?`. ~60 lines. |
| `client/src/components/command-palette/CommandPalette.tsx` | **New** | Palette overlay component: search input, filtered results, keyboard navigation, ARIA. ~150 lines. |
| `client/src/components/command-palette/CommandPalette.module.css` | **New** | Styles for palette overlay, input, results list, category headers, shortcut badges. ~120 lines. |
| `client/src/components/command-palette/ShortcutCheatSheet.tsx` | **New** | `?` shortcut reference modal. Reads registry, groups by category, renders shortcut grid. ~80 lines. |
| `client/src/components/command-palette/ShortcutCheatSheet.module.css` | **New** | Styles for cheat sheet modal. ~60 lines. |

### Extended Files (existing code paths untouched, new code added)

| File | Type | Description |
|------|------|-------------|
| `client/src/stores/viewStore.ts` | **Extend** | Add `commandPaletteOpen`, `openCommandPalette()`, `closeCommandPalette()` to the store. ~10 lines added. Existing state and actions untouched. |
| `client/src/components/layout/AppShell.tsx` | **Extend** | Mount `<CommandPalette>` and `<ShortcutCheatSheet>` alongside existing `<BugReportModal>`. Call `useGlobalShortcuts()` and `useGlobalActions()` hooks. ~15 lines added. Existing logic untouched. |
| `client/src/routes/RoadmapPage.tsx` | **Extend** | Call `useRoadmapActions(roadmapId)` hook to register roadmap-scoped actions. One line added to the component body. Existing rendering logic untouched. |

### Modified Files

None. No existing code paths need to change. The new shortcut system runs alongside existing per-component keydown handlers without conflict (see section 4.3).

### Restructured Files

None. This is purely additive functionality. No existing files need to be rewritten or reorganized.

---

## 9. Implementation Notes for Alice

This is entirely Alice's feature. Suggested build order:

1. **Action registry module first** (`actionRegistry.ts`). This is the foundation. It has no dependencies and can be unit tested in isolation.

2. **Hook for registering actions** (`useActions.ts`). Start with 3-4 actions (view switching, create item, go home) to verify the pattern works. Add the remaining actions once the wiring is proven.

3. **Palette component** (`CommandPalette.tsx` + CSS). Build the overlay, search input, and result rendering. Wire up keyboard navigation. Test with the actions from step 2.

4. **Item search integration.** Add the `useItemResults` logic that reads from the React Query cache. Merge item results into the palette's filtered results below commands.

5. **Global shortcut handler** (`useGlobalShortcuts.ts`). Add the single keydown listener. Test suppression in inputs, modals, and when the palette is open.

6. **Cheat sheet modal** (`ShortcutCheatSheet.tsx`). Small standalone component. `?` opens it.

7. **Wire up in AppShell.** Mount palette and cheat sheet. Call the hooks. Verify Cmd+K opens/closes.

8. **Polish.** Closing animation (use existing `useClosingAnimation` hook), focus restoration, ARIA live region for result count.

### CSS Patterns to Follow

Use the existing project patterns:

- **CSS Modules** (`.module.css`), not inline styles. Every new component gets a co-located CSS module.
- **Design tokens** from `tokens.css` for colors, spacing, shadows, radii, fonts.
- **Overlay pattern** from `ConfirmDialog.module.css`: fixed position, inset 0, centered content, backdrop click, `@keyframes modalIn` animation.
- **`prefers-reduced-motion`** media query to disable animations.
- **`focus-visible`** outlines for keyboard navigation.

### What NOT to Build

- No multi-step flows (e.g., "move item to" > pick destination). Out of scope.
- No command history or favorites. Out of scope.
- No AI/natural language processing. Out of scope.
- No custom user-defined shortcuts. Out of scope.

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Single-key shortcuts fire when user is typing in an unexpected context (e.g., a contenteditable div we missed) | Low | Medium | The `isTyping` check covers `INPUT`, `TEXTAREA`, `SELECT`, and `contentEditable`. If a new editable element type is added later, it needs to be added to this list. Keep the check in one place (`useGlobalShortcuts`) so it is easy to update. |
| Palette z-index conflicts with a future component | Very Low | Low | The z-index scale is documented above. The palette sits at 60, between modals (50) and toasts (100). Adding the palette to this scale is straightforward. |
| Items query cache is empty when palette opens (user opened palette before items loaded) | Low | Low | `useItemResults` handles this gracefully -- if `getQueryData` returns `undefined`, item results are empty. Commands still work. No crash, no error. |
| Cmd+K conflicts with browser search (Firefox) or other browser shortcuts | Very Low | Low | Cmd+K is widely used for command palettes (VS Code, Linear, Notion, Slack). Browsers that use it for address bar focus do not prevent `preventDefault()` from overriding it. The Forge pattern matches industry convention. |

---

## 11. What This Approach Does NOT Cover

- **Server-side search.** All search is client-side against already-loaded data. Cross-roadmap search would need a server endpoint.
- **Scoring/ranking of fuzzy results.** We use substring matching. If users want smarter ranking, we add a scoring function later.
- **Plugin/extension commands.** The registry is internal. No public API for third-party action registration.
- **Animated transitions on palette open/close.** The open animation reuses the existing `modalIn` keyframe. Close animation can use `useClosingAnimation`. Both are optional polish -- the feature works without them.
- **Mobile experience.** The palette is a power-user keyboard feature. On mobile, it is not rendered (guarded by `isDesktop` or simply not triggerable without a physical keyboard). Mobile users use the existing UI.
