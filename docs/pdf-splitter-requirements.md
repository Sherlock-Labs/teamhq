# PDF Page Splitter - Requirements

## Goal

Build a lightweight browser-based tool that lets you upload a multi-page PDF and split it into individual single-page PDFs that you can download individually or all at once.

## Why

Splitting PDFs is a common task that usually requires desktop software, paid online tools, or sketchy ad-filled websites. A simple, local-first tool that runs entirely in the browser solves this without any server-side processing, file uploads to third parties, or privacy concerns.

---

## Scope

### In Scope

- Upload a multi-page PDF via drag-and-drop or file picker
- Display a visual list of all pages (thumbnails or page numbers) so the user can see what they're splitting
- Download any individual page as a standalone single-page PDF
- Download all pages at once as separate PDF files (zipped)
- Client-side only — no backend, no file uploads to a server
- Runs as a standalone tool in the TeamHQ repo (like `ost-tool/`)
- Linked from the TeamHQ landing page Tools section

### Out of Scope

- PDF editing (no reordering, rotating, deleting, merging, annotating)
- Page range selection (e.g., "pages 3-7 as one PDF") — deferred to a future version
- PDF rendering/preview of actual page content (thumbnails are nice-to-have, not required; page number + filename is sufficient for V1)
- Password-protected PDFs
- Mobile-optimized layout (should be usable but not a priority)
- Authentication or user accounts

### Deferred (Future Versions)

- Page thumbnails rendered via pdf.js (canvas-based previews of each page)
- Merge multiple PDFs
- Select page ranges to download as a single PDF
- Reorder pages via drag-and-drop

---

## User Stories

### US-1: Upload a PDF

**As a user**, I want to upload a PDF file so I can split it into individual pages.

**Acceptance Criteria:**
1. A drop zone is visible on page load with clear instructions ("Drop a PDF here or click to browse")
2. Clicking the drop zone opens a file picker filtered to `.pdf` files
3. Dragging a PDF file onto the drop zone highlights it and accepts the file on drop
4. After upload, the file name and page count are displayed
5. Non-PDF files are rejected with a clear error message
6. Uploading a new file replaces the previous one

### US-2: See All Pages

**As a user**, I want to see a list of all pages in my PDF so I can identify which ones I need.

**Acceptance Criteria:**
1. After upload, a list/grid of all pages is displayed
2. Each page shows its page number (e.g., "Page 1", "Page 2")
3. Each page has a "Download" button
4. The list handles PDFs with many pages (50+) without performance issues

### US-3: Download Individual Page

**As a user**, I want to download any single page as its own PDF file.

**Acceptance Criteria:**
1. Clicking "Download" on a page downloads a single-page PDF
2. The downloaded file is named `{original-filename}-page-{N}.pdf` (e.g., `report-page-3.pdf`)
3. The download happens instantly (no server round-trip)
4. The downloaded PDF preserves the original page's content, dimensions, and formatting

### US-4: Download All Pages

**As a user**, I want to download all pages at once as separate files.

**Acceptance Criteria:**
1. A "Download All" button is visible when a PDF is loaded
2. Clicking it downloads a ZIP file containing all individual page PDFs
3. The ZIP is named `{original-filename}-pages.zip`
4. Each PDF inside the ZIP follows the same naming convention as US-3

### US-5: Start Over

**As a user**, I want to clear the current PDF and start fresh.

**Acceptance Criteria:**
1. A "Clear" or "Upload Another" action is available after a PDF is loaded
2. Clicking it resets the tool to the initial upload state
3. No confirmation needed (this is a stateless tool)

---

## Technical Approach

This tool is simple enough that it doesn't need a technical architect. The approach is straightforward:

- **pdf-lib** (npm package or CDN) for reading and splitting PDFs entirely in the browser
- **JSZip** (CDN) for creating the ZIP file for "Download All"
- **Single HTML file** with embedded CSS/JS, or a small `pdf-splitter/` directory with separate files
- **No build step** — load libraries via CDN (unpkg or cdnjs)
- **No backend** — everything runs client-side
- **Dark theme** matching TeamHQ landing page (zinc/indigo tokens)

After implementation, add a card to the TeamHQ landing page Tools section linking to this tool.

---

## Team & Phasing

### Phase 1: Design Spec
- **Robert** (Designer) specs the UI layout, interactions, and states (upload, page list, download, error, empty)

### Phase 2: Implementation
- **Alice** (FE) builds the tool based on Robert's spec
- Also updates the TeamHQ landing page to add the PDF Splitter tool card

### Phase 3: QA
- **Enzo** (QA) validates against acceptance criteria

### Who's NOT Needed
- **Andrei** (Arch) — tech decisions are trivial for this tool; no architecture needed
- **Jonah** (BE) — no backend

---

## Acceptance Criteria (Summary)

1. User can upload a PDF via drag-and-drop or file picker
2. All pages are displayed in a list/grid with page numbers
3. Individual pages can be downloaded as single-page PDFs
4. All pages can be downloaded at once as a ZIP of individual PDFs
5. Downloaded PDFs preserve original content and formatting
6. Tool runs entirely client-side with no server dependency
7. Dark theme consistent with TeamHQ landing page
8. Tool is linked from the TeamHQ landing page Tools section
9. Works in modern browsers (Chrome, Firefox, Safari, Edge)
