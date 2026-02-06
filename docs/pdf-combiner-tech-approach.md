# PDF Combiner - Technical Approach

## Architecture Decision: 100% Client-Side

Confirmed. Like the PDF Splitter, the PDF Combiner runs entirely in the browser. No backend, no file uploads, no server dependency. All file processing happens in JavaScript using well-established libraries loaded via CDN. Jonah (BE) is not needed for this project.

---

## File Structure

```
pdf-combiner/
  index.html      ← Single-file tool (HTML + CSS + JS, same pattern as pdf-splitter/)
```

Follows the PDF Splitter convention exactly: one directory, one `index.html` file containing all markup, styles, and scripts. No build step, no framework, no package.json.

The landing page (`index.html` at repo root) gets a new tool card in the Tools section linking to `pdf-combiner/index.html`.

---

## Libraries (all via CDN)

| Library | Version | CDN | Purpose |
|---------|---------|-----|---------|
| **pdf-lib** | 1.17.1 | unpkg | Create the output PDF, embed images (PNG/JPG), copy pages from input PDFs |
| **pdf.js** | 3.11.174 | cdnjs | Render PDF page thumbnails on canvas (same as PDF Splitter) |
| **SortableJS** | 1.15.6 | cdnjs | Drag-and-drop reordering of the file list |

These are the same versions of pdf-lib and pdf.js already used in the PDF Splitter. SortableJS is the only new dependency.

### Why These Libraries

**pdf-lib** is the right choice for PDF generation. It can:
- Create new PDF documents from scratch
- Embed PNG and JPG images as full pages (`embedPng`, `embedJpg`)
- Copy pages from existing PDFs (`copyPages`) — this is how we include multi-page PDF inputs
- All client-side, no server needed

**pdf.js** is already proven in the PDF Splitter for rendering page previews to canvas. We reuse it here for generating thumbnails of PDF input pages.

**SortableJS** over native HTML5 DnD or other libraries because:
- Lightweight (~40KB minified, ~14KB gzipped)
- Works out of the box with mouse and touch
- Simple API: `new Sortable(el, { animation: 150 })` — that's it
- No dependencies
- Battle-tested (25K+ GitHub stars, actively maintained)
- Native HTML5 Drag and Drop API is notoriously painful — inconsistent cross-browser, no touch support, bad drag image handling. Rolling our own would be more code, more bugs, and worse UX.

### Libraries NOT Needed

- **JSZip**: Not needed. The PDF Splitter uses it because it downloads multiple individual PDFs as a ZIP. The PDF Combiner outputs a single PDF — no ZIP required.
- **jsPDF**: Not needed. pdf-lib handles both PDF creation and PDF reading. jsPDF is creation-only and can't parse existing PDFs.

---

## Image-to-PDF Conversion Strategy

Each image becomes one page in the output PDF. The page is sized to exactly fit the image at its native dimensions.

### Supported Formats and Handling

| Format | pdf-lib Support | Strategy |
|--------|----------------|----------|
| **PNG** | Native (`embedPng`) | Direct embed |
| **JPG/JPEG** | Native (`embedJpg`) | Direct embed |
| **WebP, GIF, BMP, TIFF** | Not native | Convert to PNG via Canvas, then embed |

### Conversion Pipeline for Non-Native Formats

For formats pdf-lib can't embed directly (WebP, GIF, BMP, TIFF):

1. Create an `Image` element, set `src` to a data URL or object URL from the file
2. Wait for `onload`
3. Draw the image onto a `<canvas>` at its natural dimensions
4. Export the canvas as PNG via `canvas.toDataURL('image/png')` or `canvas.toBlob()`
5. Pass the PNG bytes to `pdfLib.embedPng()`

This works because all modern browsers can decode these formats into `Image` elements. The canvas conversion is the standard approach and handles all the listed formats. GIF will use the first frame only (animated GIFs are out of scope).

### Image Page Sizing

Each image page is sized to the image's natural pixel dimensions, treating pixels as points (1px = 1pt). So a 1920x1080 image produces a 1920pt x 1080pt page. This preserves the image's native resolution and aspect ratio without cropping or scaling, matching the requirement.

```javascript
const page = pdfDoc.addPage([imageWidth, imageHeight]);
page.drawImage(embeddedImage, {
  x: 0,
  y: 0,
  width: imageWidth,
  height: imageHeight,
});
```

---

## PDF Input Handling

For PDF file inputs, all pages are included in order. The strategy:

1. Read the file as `Uint8Array` via `FileReader.readAsArrayBuffer()`
2. Load with `PDFLib.PDFDocument.load(bytes)` to get page count and for later merging
3. Load with `pdfjsLib.getDocument({ data: bytes })` for thumbnail rendering
4. At combine time, use `pdfDoc.copyPages(inputDoc, pageIndices)` to copy all pages into the output

Multi-page PDFs contribute N pages to the output. The file list item shows the page count (e.g., "4 pages") so the user knows the total contribution.

---

## Thumbnail Generation

### For Images
Create a thumbnail by drawing the image onto a small canvas (max dimension ~160px, preserving aspect ratio). This is fast and straightforward — just use `drawImage` with scaled dimensions.

### For PDFs
Use pdf.js to render page 1 of each PDF input onto a canvas, same approach as the PDF Splitter. Scale the viewport so the canvas fits the thumbnail container (max ~160px wide).

### Performance Note
Thumbnails are generated asynchronously after the file is added to the list. The UI shows a placeholder (loading state) immediately and swaps in the rendered thumbnail when ready. This keeps the UI responsive even with many files.

---

## Drag-and-Drop Reordering

SortableJS handles the reordering UI. The implementation:

```javascript
const sortable = new Sortable(fileListElement, {
  animation: 150,
  ghostClass: 'file-item--ghost',    // semi-transparent ghost during drag
  chosenClass: 'file-item--chosen',  // highlight on pickup
  handle: '.file-item__handle',      // drag handle element (grip dots icon)
  onEnd: function (evt) {
    // Reorder the internal files array to match the new DOM order
    const movedItem = files.splice(evt.oldIndex, 1)[0];
    files.splice(evt.newIndex, 0, movedItem);
    updatePageCount();
  }
});
```

The internal `files` array is the source of truth for combine order. SortableJS reorders the DOM; the `onEnd` callback keeps the array in sync.

---

## Internal Data Model

```javascript
// Each entry in the files array
{
  id: crypto.randomUUID(),      // unique ID for keying
  file: File,                    // original File object
  type: 'image' | 'pdf',        // determined by MIME type / extension
  name: string,                  // file.name
  size: number,                  // file.size in bytes
  pageCount: number,             // 1 for images, N for PDFs
  thumbnailCanvas: HTMLCanvasElement | null,  // rendered async
  pdfLibDoc: PDFDocument | null, // pdf-lib document (PDFs only, for merging)
  error: string | null,          // error message if file failed to load
}
```

The `files` array drives everything: rendering the file list, calculating total page count, and the combine operation.

---

## Combine & Download Flow

When the user clicks "Combine & Download":

1. **Disable button**, show progress indicator (spinner + "Combining N files...")
2. **Create a new `PDFDocument`** via `PDFLib.PDFDocument.create()`
3. **Iterate through `files` array** in order:
   - **Image**: Read file bytes, embed into PDF (`embedPng` or `embedJpg` or canvas-convert-then-embed), add page sized to image dimensions
   - **PDF**: Use `copyPages()` to copy all pages from the input PDF into the output
4. **Save** via `pdfDoc.save()` — returns `Uint8Array`
5. **Trigger download** via Blob URL (same `triggerDownload` helper as PDF Splitter)
6. **Re-enable button**, hide progress

Output filename: `combined-{N}-files.pdf` where N is the number of input files.

### Processing Large Files

For large files or many files, the combine loop should yield to the browser between files to prevent UI freezing. Use a simple `await new Promise(r => setTimeout(r, 0))` between iterations to let the browser paint. This is a lightweight approach that keeps the UI responsive without Web Workers.

---

## File Validation

When files are added (via drop or file picker):

| Check | Action |
|-------|--------|
| Supported MIME type or extension | Accept: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/bmp`, `image/tiff` |
| Unsupported type | Reject with error: "{filename} is not a supported format. Supported: PDF, PNG, JPG, WebP, GIF, BMP, TIFF" |
| File can be read | Try to load. If loading fails, mark the file with error state but don't block other files |
| Empty/corrupt PDF | Show error on that file item but keep it in the list (removable) |

The file picker `accept` attribute should be set to the supported MIME types and extensions so the OS-level file dialog pre-filters.

---

## State Machine

The tool has these states:

```
EMPTY → LOADED → COMBINING → LOADED
  ↑                              |
  └── Clear All ←────────────────┘
```

- **EMPTY**: Upload zone visible, no files. "Combine" button hidden.
- **LOADED**: Files in the list. Upload zone becomes an "Add More" area or stays accessible. "Combine" button enabled. "Clear All" visible.
- **COMBINING**: Processing in progress. "Combine" button disabled with spinner. File list visible but not modifiable.
- After combine completes, returns to **LOADED** (file list preserved for re-downloading or modification).

---

## CSS / Design Tokens

Reuse the same design token system as the PDF Splitter:

- Same CSS custom properties (zinc scale, indigo accents)
- Same font stack (Inter via Google Fonts)
- Same nav, footer, upload zone patterns
- Same dark theme (zinc-950 body background)
- Inline `<style>` in the HTML file (no external CSS, matching PDF Splitter pattern)

New CSS needed for the file list items, drag states, and the additional UI elements (page count badge, file type badge, remove button, drag handle).

---

## Edge Cases and Decisions

| Scenario | Decision |
|----------|----------|
| **Single file uploaded** | Allow combining (outputs a single-file PDF). Not much use, but no reason to block it. |
| **Very large files (50MB+)** | Process normally. The browser handles memory. Show progress. No artificial limits. |
| **Many files (50+)** | Process normally. Thumbnail rendering may be slow — that's acceptable. Combine with yield-per-file to keep UI responsive. |
| **Animated GIF** | First frame only. This is what the browser's `Image` element gives us via canvas. |
| **TIFF files** | Most modern browsers support TIFF in `Image` elements. If a browser doesn't, it will fail gracefully — the file gets an error state, other files still work. |
| **CMYK JPEGs** | pdf-lib handles CMYK JPEGs natively. No special handling needed. |
| **PDFs with 0 pages** | Mark as error, show message, allow removal. Don't block other files. |
| **Duplicate filenames** | Allow. Files are keyed by UUID, not filename. |
| **File order = page order** | The combine output follows the file list order top-to-bottom. Multi-page PDFs insert all their pages at that position. |
| **Max file size** | No artificial limit. Browser will handle what it can. |

---

## Browser Compatibility

Same targets as PDF Splitter: Chrome, Firefox, Safari, Edge (all modern/evergreen). All APIs used (`FileReader`, `Canvas`, `Blob`, `URL.createObjectURL`, `crypto.randomUUID`) are supported across these browsers. pdf-lib and pdf.js handle their own compatibility. SortableJS supports all modern browsers plus touch.

One note: `crypto.randomUUID()` requires HTTPS or localhost in some browsers. For local file:// usage, fall back to a simple `Date.now() + Math.random()` ID generator.

---

## Summary of Technical Decisions

1. **100% client-side** — no backend needed. Jonah can be released.
2. **Single `index.html` file** in `pdf-combiner/` — matches PDF Splitter pattern exactly.
3. **pdf-lib** for PDF creation + image embedding + page copying (already in use).
4. **pdf.js** for PDF thumbnail rendering (already in use).
5. **SortableJS** for drag-and-drop reordering (new dependency, lightweight, touch-compatible).
6. **Canvas conversion** for non-native image formats (WebP, GIF, BMP, TIFF → PNG → embed).
7. **No build step, no framework** — vanilla HTML/CSS/JS with CDN libraries.
8. **Yield between files** during combine to keep UI responsive with large/many files.
