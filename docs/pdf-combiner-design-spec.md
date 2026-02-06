# PDF Combiner - Design Spec

## Design Philosophy

The PDF Combiner is the companion tool to the PDF Splitter. While the Splitter takes one file and breaks it apart, the Combiner takes many files and joins them together. The workflow is fundamentally different -- multi-file input with reordering versus single-file input with a page grid output -- but the visual language must feel like the same family.

**Key UX goals:**
- The user should never wonder "what do I do next?" -- every state has a clear primary action
- Drag-and-drop reordering must feel physical and responsive -- grab handles, smooth animations, clear drop indicators
- The transition from "upload" to "organize" to "combine" should feel like a natural progression, not three separate screens
- Errors should be informative but never block the happy path for other files

---

## Layout Structure

The page follows the same single-column centered layout as the PDF Splitter:

```
+--------------------------------------------------+
|  Nav: Logo (left) | Back to TeamHQ (right)        |
+--------------------------------------------------+
|                                                    |
|  [Upload Zone / File List]                         |
|                                                    |
|  max-width: 720px, centered                        |
|                                                    |
+--------------------------------------------------+
|  Footer: Logo + "Built with Claude Code"           |
+--------------------------------------------------+
```

- **Nav**: Identical to PDF Splitter. Sherlock Labs logo left, "Back to TeamHQ" link right.
- **Main content**: `max-width: 720px`, centered with the same `.container` padding.
- **Footer**: Identical to PDF Splitter.

---

## States & Transitions

The tool progresses through these states:

### State 1: Empty (Initial)

This is what the user sees on page load. A single upload zone, no other UI.

```
+----------------------------------------------+
|                                                |
|          [Upload Icon - stacked files]         |
|                                                |
|     Drop images or PDFs here                   |
|                or                               |
|          [ Browse Files ]                      |
|                                                |
|   Supports PDF, PNG, JPG, WebP, GIF, BMP, TIFF |
|                                                |
+----------------------------------------------+
```

**Design details:**
- Upload zone: `border: 2px dashed var(--zinc-700)`, `border-radius: 12px`, `background: var(--zinc-900)`, `padding: 64px 32px`
- Icon: A stacked-files SVG icon (not the single-document icon from the Splitter -- this is a multi-file tool, so the icon should convey "multiple files"). 48x48px, `stroke: var(--zinc-600)`, `stroke-width: 1.5`
- Heading text: "Drop images or PDFs here" -- 18px, weight 600, `color: var(--zinc-300)`
- "or" separator: 14px, `color: var(--zinc-600)`
- Browse button: `background: var(--indigo-500)`, white text, 14px weight 600, `padding: 8px 20px`, `border-radius: 8px`. Hover: `background: var(--indigo-400)`
- Hint text: "Supports PDF, PNG, JPG, WebP, GIF, BMP, TIFF" -- 12px, `color: var(--zinc-600)`
- File input `accept` attribute: `.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,application/pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff`, with `multiple` enabled
- Clicking anywhere on the zone (or the Browse button) opens the file picker with multi-select
- Keyboard: Enter or Space on the focused zone opens the file picker

**Drag-over state:**
- Border changes to `border-color: var(--indigo-500)`
- Background becomes `rgba(99, 102, 241, 0.05)`
- Icon stroke changes to `var(--indigo-500)`
- Smooth 150ms transition on all properties

### State 2: Loaded (Files Added)

After files are uploaded, the upload zone shrinks into a compact "add more" strip and the file list appears. This is the main working state.

```
+----------------------------------------------+
|  [+]  Add more files            Clear All  |
+----------------------------------------------+
|  Total: 12 pages from 4 files                 |
+----------------------------------------------+
|                                                |
|  [File List - see below]                       |
|                                                |
+----------------------------------------------+
|                                                |
|       [ Combine & Download (12 pages) ]        |
|                                                |
+----------------------------------------------+
```

**Toolbar (replaces upload zone):**
- A compact bar at the top: `padding: 12px 16px`, `background: var(--zinc-900)`, `border: 1px solid var(--zinc-800)`, `border-radius: 8px`
- Left side: A clickable "Add more files" area with a `+` icon. This is also a drop target for additional files. `font-size: 14px`, `font-weight: 500`, `color: var(--zinc-400)`. Hover: `color: var(--zinc-300)`, `border-color: var(--zinc-700)`
- Right side: "Clear All" text button. `font-size: 14px`, `font-weight: 500`, `color: var(--zinc-500)`. Hover: `color: var(--red-400)`. No background, no border.
- The entire toolbar also accepts drag-and-drop (the "add more" area highlights on dragover with the same indigo treatment as the original upload zone)

**Page count summary:**
- Below the toolbar, a single line: "Total: 12 pages from 4 files"
- `font-size: 14px`, `color: var(--zinc-400)`, `padding: 8px 0`
- Updates immediately when files are added, removed, or reordered (reordering doesn't change count, but adding/removing does)

**Combine button:**
- Fixed at the bottom of the content area (not the viewport -- it scrolls with content if the list is short, but is always after the file list)
- Full-width: `width: 100%`, `padding: 12px 24px`, `border-radius: 8px`
- `background: var(--indigo-500)`, white text, `font-size: 16px`, `font-weight: 600`
- Hover: `background: var(--indigo-400)`
- Includes the page count in the label: "Combine & Download (12 pages)"
- Disabled state (no files): `opacity: 0.5`, `cursor: not-allowed`

### State 3: Combining (Processing)

When the user clicks "Combine & Download":

- The combine button changes to a processing state:
  - Text becomes: "Combining 4 files..."
  - A spinner appears to the left of the text (same spinner as PDF Splitter: 16px circle, `border: 2px solid var(--zinc-700)`, `border-top-color: white`, spinning)
  - Button becomes disabled: `opacity: 0.8`, `cursor: not-allowed`
- The file list remains visible but non-interactive:
  - Drag handles become hidden
  - Remove buttons become hidden
  - The list has a subtle `opacity: 0.7` to indicate it's locked
- The toolbar's "Add more files" and "Clear All" are also disabled

### State 4: Complete (Download Triggered)

After the PDF is generated and the download triggers:

- The combine button briefly shows a success state:
  - Text changes to "Downloaded!" with a checkmark icon
  - Background changes to `#059669` (green) for 2 seconds
  - Then transitions back to the normal "Combine & Download (N pages)" state
- The file list becomes interactive again (drag handles, remove buttons reappear)
- The user can reorder, add, remove files and combine again

### Error States

**Unsupported file type (on upload):**
- A toast notification appears at the bottom center of the screen
- Toast: `background: var(--zinc-800)`, `border: 1px solid rgba(248, 113, 113, 0.3)`, `border-radius: 8px`, `padding: 12px 20px`
- Text: "{filename} is not a supported format" -- `font-size: 14px`, `color: var(--red-400)`
- Auto-dismisses after 4 seconds
- If multiple unsupported files in one drop, show one toast: "{N} files were not a supported format"
- Valid files from the same drop are still added

**File load error (corrupted file):**
- The file appears in the list but with an error state (see File List Item below)
- It can be removed by the user
- It does not block other files from loading
- It is excluded from the combine operation

**Combine failure:**
- Toast notification: "Something went wrong combining your files. Please try again."
- File list is preserved (not cleared)
- Button returns to its normal state

---

## File List Design

The file list is a vertical stack of file cards. This is the core of the tool -- the user spends most of their time here organizing files before combining.

### File List Item (Normal State)

```
+----------------------------------------------+
| [::] [Thumbnail] filename.jpg      PDF   1.2 MB  [x] |
|  ::              4 pages                            |
+----------------------------------------------+
```

Each file item is a horizontal card:

- **Container**: `padding: 12px`, `background: var(--zinc-900)`, `border: 1px solid var(--zinc-800)`, `border-radius: 8px`, `margin-bottom: 8px`
- **Layout**: `display: flex`, `align-items: center`, `gap: 12px`

**Drag handle (left edge):**
- A vertical grip icon (6 dots in a 2x3 grid pattern), `color: var(--zinc-600)`
- `cursor: grab` (becomes `cursor: grabbing` during drag)
- `width: 16px`, centered vertically
- Hover: `color: var(--zinc-400)`
- This is the SortableJS `handle` element -- only this element initiates drag

**Thumbnail (left of text):**
- Container: `width: 48px`, `height: 48px`, `border-radius: 4px`, `overflow: hidden`, `background: var(--zinc-800)`, `flex-shrink: 0`
- Images: The image file drawn on a canvas, scaled to cover the 48x48 area (object-fit: cover behavior via canvas)
- PDFs: First page rendered via pdf.js at thumbnail scale
- Loading state: A subtle pulse animation on the `var(--zinc-800)` background (no spinner -- too small for a spinner)
- Error state: A small warning icon centered in the thumbnail area, `color: var(--red-400)`

**File info (center, flex: 1):**
- Filename: `font-size: 14px`, `font-weight: 500`, `color: var(--zinc-200)`, truncated with ellipsis if too long (`text-overflow: ellipsis`, `white-space: nowrap`, `overflow: hidden`)
- Second line (metadata): `font-size: 12px`, `color: var(--zinc-500)`
  - For images: file size only (e.g., "1.2 MB") since images always contribute 1 page
  - For PDFs: page count + file size (e.g., "4 pages -- 2.3 MB")

**Type badge (right of filename, inline):**
- A small pill badge showing the file type: "PDF", "PNG", "JPG", "WebP", "GIF", "BMP", "TIFF"
- `font-size: 11px`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.05em`
- `padding: 2px 6px`, `border-radius: 4px`
- PDF badge: `color: var(--indigo-400)`, `background: rgba(99, 102, 241, 0.1)` -- stands out because PDFs are special (multi-page)
- Image badges: `color: var(--zinc-400)`, `background: rgba(161, 161, 170, 0.1)` -- neutral

**Remove button (right edge):**
- An "X" icon button: `width: 28px`, `height: 28px`, `border-radius: 6px`, `border: none`, `background: transparent`
- Icon: `color: var(--zinc-600)`, 14px
- Hover: `background: rgba(248, 113, 113, 0.1)`, `color: var(--red-400)`
- Always visible (no hide-on-hover -- the user should always be able to remove a file)

### File List Item (Error State)

When a file fails to load (corrupted, unreadable):

- Same layout as normal, but:
- Border changes: `border-color: rgba(248, 113, 113, 0.2)`
- Background has a subtle red tint: `background: rgba(248, 113, 113, 0.03)`
- Thumbnail area shows a warning icon instead of a preview
- Filename is still shown (the user needs to know which file failed)
- Below the filename, an error message in red: "Could not read this file" -- `font-size: 12px`, `color: var(--red-400)`
- The remove button is still available
- No drag handle (error files can't be reordered -- they're excluded from output)

### File List Item (Dragging State)

When a file card is being dragged:

**Ghost (the item being dragged, following the cursor):**
- `opacity: 0.5` -- SortableJS `ghostClass`
- Slight scale: `transform: scale(1.02)` -- subtle lift effect
- `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3)` -- elevated shadow

**Drop indicator:**
- A 2px horizontal line in `var(--indigo-500)` appears between items where the drop would land
- The line spans the full width of the file list area
- This is handled by SortableJS via the `animation` option (150ms)

**Chosen (the item that was picked up, in its original position):**
- `border-color: var(--indigo-500)` -- SortableJS `chosenClass`
- Slightly lighter background: `background: rgba(99, 102, 241, 0.05)`

---

## Responsive Behavior

### Desktop (1024px+)

Full layout as described above. File items have plenty of horizontal space for all elements.

### Tablet (640px - 1023px)

Same layout. Slightly tighter padding but all elements remain on one line per file item.

### Mobile (< 640px)

- **Upload zone**: Padding reduces to `48px 24px`
- **Toolbar**: Stacks vertically -- "Add more files" on top, "Clear All" below, both full-width
- **File items**:
  - Thumbnail shrinks to `40px x 40px`
  - Type badge moves to its own line below the filename (if needed for space)
  - Drag handle remains visible and functional (SortableJS supports touch)
- **Combine button**: Already full-width, stays the same
- **Page count summary**: Same, wraps naturally

---

## Typography & Color Reference

All values reference the established design tokens from the PDF Splitter and landing page:

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Upload heading | 18px | 600 | zinc-300 |
| Upload hint | 12px | 400 | zinc-600 |
| Toolbar text | 14px | 500 | zinc-400 |
| Page count summary | 14px | 400 | zinc-400 |
| File name | 14px | 500 | zinc-200 |
| File metadata | 12px | 400 | zinc-500 |
| Type badge | 11px | 600 | zinc-400 or indigo-400 |
| Combine button | 16px | 600 | white |
| Error text | 14px / 12px | 400 | red-400 |
| Toast text | 14px | 400 | red-400 or zinc-300 |

**Key colors:**
- Backgrounds: zinc-950 (body), zinc-900 (cards, upload zone, toolbar), zinc-800 (thumbnail placeholders)
- Borders: zinc-800 (default), zinc-700 (hover), indigo-500 (active/focus/drag)
- Primary action: indigo-500 (button bg), indigo-400 (hover)
- Destructive: red-400 (error text, remove hover)
- Success: #059669 (combine complete flash)

---

## Animation & Transitions

| Interaction | Duration | Easing | Property |
|-------------|----------|--------|----------|
| Upload zone dragover | 150ms | ease | border-color, background-color, stroke |
| Button hover | 150ms | ease | background-color |
| File item hover | 150ms | ease | border-color |
| Drag animation (SortableJS) | 150ms | ease | transform (handled by SortableJS) |
| Toast appear | 250ms | ease | transform (translateY), opacity |
| Toast dismiss | 200ms | ease | transform (translateY), opacity |
| Success flash (combine button) | 2000ms hold, 200ms out | ease | background-color |
| Thumbnail load-in | 200ms | ease | opacity (fade from 0 to 1 when thumbnail renders) |

---

## Accessibility

- Upload zone: `role="button"`, `tabindex="0"`, `aria-label="Upload images or PDFs"`
- File list: `role="list"`, each item `role="listitem"`
- Remove buttons: `aria-label="Remove {filename}"`
- Drag handles: `aria-label="Reorder {filename}"` (note: SortableJS doesn't provide keyboard reordering by default -- this is accepted as a V1 limitation per requirements)
- Combine button: Clear label includes page count, disabled state communicated via `aria-disabled`
- Toast notifications: `role="alert"` for auto-announced content
- Error states: Inline error messages associated with their file items
- Focus management: After file removal, focus moves to the next file item (or the add-more area if the list is now empty)

---

## SVG Icon Specifications

### Upload Icon (Stacked Files)

A custom stacked-files icon to differentiate from the PDF Splitter's single-document icon. Represents multiple overlapping documents:

- Viewbox: `0 0 48 48`
- Two overlapping rectangles (back page offset slightly up-right, front page centered)
- An upward arrow on the front page (indicating upload)
- Stroke-based, not filled: `stroke-width: 1.5`, `stroke-linecap: round`, `stroke-linejoin: round`
- Default color: `stroke: var(--zinc-600)`, changes to `stroke: var(--indigo-500)` on dragover

### Drag Handle Icon

Six dots arranged in a 2x3 grid:
- Each dot: 2px radius circles
- Spacing: 6px horizontal, 5px vertical between centers
- `fill: currentColor` (inherits from parent color)

### Remove Icon (X)

Simple X icon:
- Two crossing lines forming an X
- `stroke: currentColor`, `stroke-width: 2`, `stroke-linecap: round`
- Viewbox: `0 0 14 14`

---

## Implementation Notes for Alice

1. **Single HTML file**: All markup, `<style>`, and `<script>` in `pdf-combiner/index.html`. Follow the PDF Splitter pattern exactly.

2. **CSS custom properties**: Copy the same `:root` variables from the PDF Splitter. They're identical to the landing page tokens. Don't reference `css/styles.css` -- inline everything.

3. **SortableJS integration**: Initialize with `handle: '.file-item__handle'`, `animation: 150`, `ghostClass: 'file-item--ghost'`, `chosenClass: 'file-item--chosen'`. Keep the internal `files` array in sync via the `onEnd` callback.

4. **Thumbnail rendering**: Generate thumbnails asynchronously. Show the zinc-800 placeholder immediately, then fade in the rendered canvas. For images, draw onto a 48x48 canvas. For PDFs, use pdf.js to render page 1 at a scaled viewport.

5. **Toast system**: Create a simple toast element in the markup, show/hide with CSS classes. Auto-dismiss after 4 seconds using `setTimeout`. Only one toast visible at a time (newer replaces older).

6. **The "add more" area in the toolbar is also a drop target**: Attach the same dragenter/dragover/dragleave/drop listeners as the original upload zone. This means the user can drop additional files onto the toolbar at any time.

7. **File list ordering**: The visual order of DOM nodes matches the `files` array order. SortableJS reorders the DOM; the `onEnd` callback splices the array to match. The combine function iterates the array in order.

8. **Page count update**: Recalculate total page count whenever files are added, removed, or reloaded. Update both the summary line and the combine button label. Formula: `files.reduce((sum, f) => sum + f.pageCount, 0)`.

9. **Landing page update**: Add a new tool card in the Tools section of `index.html` (at the repo root) for the PDF Combiner, following the same card pattern as the PDF Splitter card. Badge: "Live". Description: "Combine multiple images and PDFs into a single document. Drag to reorder, then download. Runs entirely in your browser." Link: `pdf-combiner/index.html`.
