# PDF Combiner - Requirements

## Goal

Build a browser-based tool that lets users combine multiple images (PNG, JPG, etc.) and/or PDF files into a single multi-page PDF. Users can drag-and-drop to reorder files before combining. This is the companion tool to the existing PDF Splitter.

## Why

Combining images and documents into a single PDF is a common need — scanning receipts, assembling portfolios, merging multi-part documents, consolidating photos for printing. Like the PDF Splitter, this should run entirely in the browser with no server-side processing, no file uploads to third parties, and no privacy concerns.

---

## Scope

### In Scope

- Upload multiple files via drag-and-drop onto the upload zone or file picker (multi-select)
- Supported input formats: PDF, PNG, JPG/JPEG, WebP, GIF, BMP, TIFF
- Add more files after the initial upload (incremental adds)
- Visual list of all uploaded files showing thumbnails/previews and file names
- Drag-and-drop reordering of files in the list
- Remove individual files from the list before combining
- Combine all files into a single multi-page PDF and download it
- For image inputs: each image becomes one page in the output PDF, sized to fit the image
- For PDF inputs: all pages from the input PDF are included in order (multi-page PDFs contribute multiple pages)
- Client-side only — no backend, no file uploads to a server
- Runs as a standalone tool in the TeamHQ repo at `pdf-combiner/`
- Linked from the TeamHQ landing page Tools section
- Dark theme consistent with TeamHQ landing page (zinc/indigo tokens)

### Out of Scope

- Image editing (no cropping, rotating, resizing, filters)
- PDF page-level manipulation (no selecting individual pages from a multi-page PDF — the whole PDF is included)
- Page size configuration (e.g., forcing all pages to A4/Letter) — images are embedded at their native aspect ratio
- Password-protected PDF inputs
- Custom output filename (use a sensible default)
- OCR or text extraction
- Compression or quality settings
- Mobile-optimized layout (should be usable but not a priority)
- Authentication or user accounts

### Deferred (Future Versions)

- Per-page controls: select/deselect individual pages from multi-page PDF inputs
- Page rotation (90/180/270 degrees per page)
- Page size options (fit all to A4, Letter, etc.)
- Image compression/quality slider
- Page number overlay on output PDF

---

## User Stories

### US-1: Upload Files

**As a user**, I want to upload one or more files so I can combine them into a PDF.

**Acceptance Criteria:**
1. A drop zone is visible on page load with clear instructions ("Drop images or PDFs here")
2. Clicking the drop zone opens a file picker with multi-select enabled, filtered to supported formats
3. Dragging files onto the drop zone highlights it and accepts them on drop
4. Multiple files can be uploaded at once (batch upload)
5. After initial upload, users can add more files (the upload zone remains accessible or an "Add More" button is provided)
6. Unsupported file formats are rejected with a clear error message identifying which files were skipped
7. Files that fail to load (corrupted, etc.) show an error state but don't block other files

### US-2: See and Manage File List

**As a user**, I want to see all my uploaded files in a list so I can review and organize them before combining.

**Acceptance Criteria:**
1. After uploading, a visual list/grid of all files is displayed
2. Each item shows: thumbnail preview, file name, file type badge (PDF/PNG/JPG/etc.), and file size
3. For multi-page PDFs, the item indicates page count (e.g., "4 pages") so the user knows how many pages it will contribute
4. The total page count for the combined output is displayed somewhere visible
5. Each item has a remove button (X) to delete it from the list
6. Removing a file updates the total page count immediately

### US-3: Reorder Files

**As a user**, I want to reorder files by dragging them so I can control the page order in the final PDF.

**Acceptance Criteria:**
1. Files can be reordered via drag-and-drop within the file list
2. A visual indicator shows where the dragged item will be placed (e.g., a drop line or ghost preview)
3. The drag handle or entire card is draggable
4. Reordering works on both desktop (mouse) and touch devices (basic support)
5. Keyboard reordering is nice-to-have but not required for V1

### US-4: Combine and Download

**As a user**, I want to combine all files into a single PDF and download it.

**Acceptance Criteria:**
1. A prominent "Combine & Download" button is visible when files are loaded
2. The button is disabled when no files are in the list
3. Clicking it processes all files in the current order and generates a single PDF
4. Images are embedded as full pages at their native resolution and aspect ratio (no cropping, no stretching)
5. PDF inputs contribute all their pages in order
6. The output file is named `combined.pdf` (or `combined-{N}-files.pdf`)
7. A progress indicator is shown during processing (spinner or progress bar)
8. The download triggers automatically when processing completes
9. After download, the file list remains intact so the user can adjust and re-download if needed

### US-5: Start Over

**As a user**, I want to clear everything and start fresh.

**Acceptance Criteria:**
1. A "Clear All" or "Start Over" action is available when files are loaded
2. Clicking it resets the tool to the initial upload state
3. No confirmation dialog needed (this is a stateless tool)

### US-6: Error Handling

**As a user**, I want clear feedback when something goes wrong.

**Acceptance Criteria:**
1. Unsupported file types show a clear error with the file name ("photo.heic is not a supported format")
2. Corrupted or unreadable files show an error but don't prevent other files from loading
3. If all files fail to load, the tool returns to the upload state with an error message
4. If PDF generation fails, an error message is shown and the file list is preserved (not cleared)

---

## Technical Notes

These are guidance for the technical architect — not prescriptive decisions.

- **pdf-lib** is already used in the PDF Splitter and handles both PDF reading and creation in the browser. It can embed images (PNG, JPG) into PDF pages and copy pages from existing PDFs.
- **pdf.js** is already used in the PDF Splitter for rendering page previews and can be reused here for PDF thumbnail generation.
- **Drag-and-drop reordering** will need either a lightweight library or a vanilla JS implementation using the HTML5 Drag and Drop API.
- **No build step** — follow the same pattern as PDF Splitter: single directory with HTML/CSS/JS, libraries via CDN.
- **No backend** — everything runs client-side.
- The tool should handle large files gracefully (progress indicator during processing, don't freeze the UI).

---

## Team & Phasing

### Phase 1: Technical Approach
- **Andrei** (Arch) defines the tech approach — library choices, file structure, how to handle drag-and-drop reordering, image-to-PDF conversion strategy, and any edge cases around multi-page PDF inputs.
- Writes to `docs/pdf-combiner-tech-approach.md`

### Phase 2: Design Spec
- **Robert** (Designer) specs the UI — upload zone, file list with thumbnails and reorder handles, combine button, states (empty, loading, ready, processing, error, success).
- Should reference the PDF Splitter design for visual consistency but adapt the layout for the different workflow (multi-file input with reordering vs. single-file input with page grid output).
- Writes to `docs/pdf-combiner-design-spec.md`

### Phase 3: Implementation
- **Alice** (FE) builds the tool based on Andrei's tech approach and Robert's design spec.
- **Jonah** (BE) is included as a resource in case there are tricky edge cases with PDF/image processing, but this is expected to be a client-side-only tool. If Andrei determines no backend is needed (likely), Jonah can assist Alice or be released.
- Alice also updates the TeamHQ landing page to add the PDF Combiner tool card in the Tools section.

### Phase 4: QA
- **Enzo** (QA) validates against all acceptance criteria with thorough testing:
  - Upload various file types (PNG, JPG, PDF, WebP, GIF, mixed)
  - Multi-page PDF inputs (verify all pages are included)
  - Drag-and-drop reordering (verify output page order matches visual order)
  - Large files and many files (performance)
  - Error cases (unsupported formats, corrupted files, empty PDFs)
  - Cross-browser testing (Chrome, Firefox, Safari, Edge)
  - Download works correctly and output PDF is valid
- **Enzo MUST do thorough QA** — no bugs allowed on this one per CEO directive.

---

## Acceptance Criteria (Summary)

1. User can upload multiple images and/or PDFs via drag-and-drop or file picker
2. All uploaded files are displayed in a visual list with thumbnails, names, and types
3. Files can be reordered via drag-and-drop
4. Files can be removed individually from the list
5. More files can be added after the initial upload
6. Multi-page PDF inputs contribute all their pages to the output
7. Total output page count is displayed
8. A "Combine & Download" button generates a single multi-page PDF
9. Images are embedded at their native resolution and aspect ratio
10. The output PDF page order matches the visual file order
11. Progress feedback is shown during PDF generation
12. The tool runs entirely client-side with no server dependency
13. Dark theme consistent with TeamHQ landing page
14. Tool is linked from the TeamHQ landing page Tools section
15. Works in modern browsers (Chrome, Firefox, Safari, Edge)
16. Clear error handling for unsupported formats, corrupted files, and processing failures
