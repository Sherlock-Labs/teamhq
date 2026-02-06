# PDF Page Splitter - Design Spec

## Overview

A single-page, client-side tool for splitting multi-page PDFs into individual page downloads. The interface is a single HTML file (with inline or co-located CSS/JS) that uses TeamHQ's existing dark-theme design tokens. No build step, no frameworks.

The tool has two primary states: **Upload** (initial) and **Results** (after a PDF is loaded). The layout is vertically stacked and centered, optimized for a task-completion flow: upload, review pages, download what you need, optionally start over.

---

## Layout Structure

```
+--------------------------------------------------+
|  Header Bar (tool name + back link)               |
+--------------------------------------------------+
|                                                    |
|  [Upload Zone]   OR   [PDF Info + Actions Bar]     |
|                                                    |
|  [Page Grid - only visible after upload]           |
|                                                    |
+--------------------------------------------------+
|  Footer (attribution)                              |
+--------------------------------------------------+
```

### Container

- Max-width: `720px`, centered with `margin: 0 auto`
- Padding: `0 20px` (mobile), `0 32px` (640px+)
- Background: `#09090b` (zinc-950)

### Header Bar

A simple top bar providing context and navigation.

- Background: `#09090b` (zinc-950)
- Border-bottom: `1px solid #27272a` (zinc-800)
- Padding: `16px 0`
- Content:
  - Left: Tool name **"PDF Splitter"** in `18px / 700 weight / #f4f4f5` (zinc-100)
  - Right: Back link **"TeamHQ"** in `14px / 500 weight / #a1a1aa` (zinc-400), hover `#d4d4d8` (zinc-300). Plain text link, no arrow. Links to `../index.html`
- Layout: flexbox, `align-items: center`, `justify-content: space-between`

### Footer

- Same style as TeamHQ landing page footer
- Text: "A Sherlock Labs tool" in `14px / #52525b` (zinc-600), centered
- Padding: `32px 0`
- Border-top: `1px solid #27272a` (zinc-800)

---

## Upload Zone (Initial State)

The upload zone is the hero element on first load. It should feel inviting and self-explanatory.

### Default State

- Container: `border: 2px dashed #3f3f46` (zinc-700), `border-radius: 12px`, `padding: 64px 32px`
- Background: `#18181b` (zinc-900)
- Centered content (flexbox column, `align-items: center`):
  1. **Icon**: A simple upload/document icon (inline SVG, 48x48, stroke color `#52525b` zinc-600). Use a minimal page-with-arrow-up icon.
  2. **Primary text**: "Drop a PDF here" in `18px / 600 weight / #d4d4d8` (zinc-300)
  3. **Secondary text**: "or" in `14px / #52525b` (zinc-600), `margin: 8px 0`
  4. **Browse button**: "Browse Files" styled as a button: `background: #6366f1` (indigo-500), `color: #fff`, `14px / 600 weight`, `padding: 8px 20px`, `border-radius: 8px`. Hover: `background: #818cf8` (indigo-400).
  5. **File type hint**: "PDF files only" in `12px / #52525b` (zinc-600), `margin-top: 16px`
- The entire zone is clickable (triggers file picker). `cursor: pointer` on the whole zone.
- A hidden `<input type="file" accept=".pdf,application/pdf">` is triggered on click.

### Drag-Over State

When a file is dragged over the zone:

- Border changes to `2px dashed #6366f1` (indigo-500)
- Background changes to `rgba(99, 102, 241, 0.05)` (very subtle indigo tint)
- Primary text changes to "Drop to upload"
- Icon stroke color changes to `#6366f1` (indigo-500)
- Transition: `border-color 0.15s ease, background-color 0.15s ease`

### Processing State

After a file is dropped/selected, while pdf-lib parses it:

- The upload zone content is replaced with a centered spinner + text
- Spinner: a simple CSS spinner (16px circle, 2px border, `border-color: #3f3f46`, `border-top-color: #6366f1`, spinning animation)
- Text: "Processing PDF..." in `14px / #a1a1aa` (zinc-400)
- The zone keeps its dimensions to avoid layout shift

### Error State

When an invalid file is uploaded (non-PDF, corrupted, empty, password-protected):

- Upload zone remains visible with default styling
- An error message appears below the zone (not inside it):
  - Container: `background: rgba(248, 113, 113, 0.06)`, `border: 1px solid rgba(248, 113, 113, 0.2)`, `border-radius: 8px`, `padding: 12px 16px`, `margin-top: 16px`
  - Text: `14px / #f87171` (red-400)
  - Error messages by type:
    - Non-PDF file: "That doesn't look like a PDF. Please upload a .pdf file."
    - Corrupted/unreadable: "This PDF couldn't be read. The file may be corrupted."
    - Empty PDF (0 pages): "This PDF has no pages."
    - Password-protected: "Password-protected PDFs are not supported."
- The error dismisses automatically when the user tries uploading again.

---

## Results View (After Upload)

Once the PDF is successfully parsed, the upload zone is replaced by the results view. This includes the PDF info bar, the actions bar, and the page grid.

### PDF Info Bar

Displays metadata about the uploaded file. Sits at the top of the results area.

- Layout: flexbox row, `align-items: center`, `gap: 12px`, wrapping allowed
- Left side:
  - **Filename**: displayed in `16px / 600 weight / #e4e4e7` (zinc-200), truncated with ellipsis if longer than the container
  - **Metadata**: "24 pages" and "2.1 MB" in `14px / #a1a1aa` (zinc-400), separated by a `middot` character
- The info bar has `padding: 16px 0` and `margin-bottom: 8px`

### Actions Bar

Sits directly below the PDF info bar, above the page grid.

- Layout: flexbox row, `align-items: center`, `justify-content: space-between`
- `padding: 12px 0`, `margin-bottom: 24px`
- `border-bottom: 1px solid #27272a` (zinc-800)

**Left side:**
- **"Download All as ZIP"** button:
  - `background: #6366f1` (indigo-500), `color: #fff`, `14px / 600 weight`
  - `padding: 8px 16px`, `border-radius: 8px`
  - Hover: `background: #4f46e5` (indigo-600)
  - While generating ZIP: button text changes to "Preparing ZIP...", button is disabled (`opacity: 0.5, cursor: not-allowed`)
  - After download: button returns to default state

**Right side:**
- **"Upload Another"** button:
  - Ghost style: `background: transparent`, `border: 1px solid #3f3f46` (zinc-700), `color: #a1a1aa` (zinc-400)
  - `14px / 500 weight`, `padding: 8px 16px`, `border-radius: 8px`
  - Hover: `border-color: #52525b` (zinc-600), `color: #d4d4d8` (zinc-300)
  - Clicking resets to the initial upload state (no confirmation needed)

### Page Grid

Displays all pages from the PDF in a grid of simple cards.

- **Grid layout**: CSS Grid
  - Default (mobile): `grid-template-columns: 1fr` (single column, stacked list)
  - 480px+: `grid-template-columns: repeat(2, 1fr)`
  - 640px+: `grid-template-columns: repeat(3, 1fr)`
  - 900px+: `grid-template-columns: repeat(4, 1fr)`
- Gap: `12px`

#### Page Card

Each card represents one page. Cards are simple and compact since there are no thumbnails in V1.

- Background: `#18181b` (zinc-900)
- Border: `1px solid #27272a` (zinc-800)
- Border-radius: `8px`
- Padding: `16px`
- Hover: `border-color: #3f3f46` (zinc-700)
- Transition: `border-color 0.15s ease`

**Content layout** (flexbox column, `align-items: center`, `text-align: center`):

1. **Page icon**: Inline SVG, 32x32, a simple document/page icon in `#52525b` (zinc-600). All cards use the same icon.
2. **Page label**: "Page 1" in `14px / 600 weight / #e4e4e7` (zinc-200), `margin-top: 8px`
3. **Download button**: "Download" in `12px / 500 weight / #6366f1` (indigo-500), `margin-top: 12px`
   - Styled as a text link (no background, no border)
   - Hover: `color: #818cf8` (indigo-400), `text-decoration: underline`
   - Cursor: `pointer`

#### Download Behavior

- Individual page download: triggers a browser download of `{original-filename}-page-{N}.pdf`
- The download button does not change state (it's instant, no loading needed since the PDF is already in memory)

#### Performance for Large PDFs (50+ pages)

- The page grid renders all cards at once. Since cards are lightweight (no thumbnails, no canvas rendering), this should be fine for 50-100+ pages.
- If a PDF has 100+ pages, we simply render 100+ cards. No virtualization or pagination needed for V1 since each card is ~100 bytes of DOM.

---

## Responsive Behavior

### Mobile (< 480px)

- Container: full-width with `20px` side padding
- Upload zone: `padding: 48px 24px` (slightly tighter)
- Page grid: single column
- Actions bar: stacks vertically
  - "Download All as ZIP" button: `width: 100%`
  - "Upload Another" button: `width: 100%`, `margin-top: 8px`
  - Flexbox direction: `column`, `gap: 8px`
- PDF info bar: wraps naturally
- Header: same layout, compresses naturally

### Tablet (480px - 900px)

- Page grid: 2-3 columns
- Actions bar: row layout (horizontal)
- Everything else stays the same

### Desktop (900px+)

- Page grid: 4 columns
- Max container width of `720px` keeps everything readable

---

## Interaction Details

### Drag-and-Drop

- `dragenter` / `dragover` on the upload zone: apply drag-over state, `preventDefault()`
- `dragleave`: revert to default state
- `drop`: `preventDefault()`, read the first file from `e.dataTransfer.files`, validate it's a PDF, begin processing
- Dropping multiple files: only the first file is used, others are silently ignored

### File Picker

- Triggered by clicking the upload zone or the "Browse Files" button
- `<input type="file" accept=".pdf,application/pdf">` — only PDFs shown in the picker
- `change` event: read the selected file, validate, begin processing

### Upload Another

- Resets the entire UI to the initial upload state
- Releases any object URLs or references to the previous PDF
- No confirmation dialog needed (per requirements)

### Downloading

- **Individual page**: Click the "Download" link on a page card. Uses pdf-lib to extract that single page into a new PDF document, creates a blob URL, triggers download via a temporary `<a>` tag with `download` attribute.
- **Download All as ZIP**: Click "Download All as ZIP". Uses pdf-lib to extract each page, JSZip to bundle them, triggers download of the ZIP. Button shows "Preparing ZIP..." while generating.

---

## Typography Summary

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Tool name (header) | 18px | 700 | `#f4f4f5` (zinc-100) |
| Back link (header) | 14px | 500 | `#a1a1aa` (zinc-400) |
| Upload primary text | 18px | 600 | `#d4d4d8` (zinc-300) |
| Upload secondary text | 14px | 400 | `#52525b` (zinc-600) |
| Upload file hint | 12px | 400 | `#52525b` (zinc-600) |
| Browse button | 14px | 600 | `#ffffff` |
| Error message | 14px | 400 | `#f87171` |
| Filename | 16px | 600 | `#e4e4e7` (zinc-200) |
| File metadata | 14px | 400 | `#a1a1aa` (zinc-400) |
| Action buttons | 14px | 600/500 | varies |
| Page label | 14px | 600 | `#e4e4e7` (zinc-200) |
| Page download link | 12px | 500 | `#6366f1` (indigo-500) |
| Footer text | 14px | 400 | `#52525b` (zinc-600) |

---

## Color Reference

All colors come from TeamHQ's existing design tokens:

| Token | Hex | Usage |
|-------|-----|-------|
| zinc-950 | `#09090b` | Page background |
| zinc-900 | `#18181b` | Card/zone backgrounds |
| zinc-800 | `#27272a` | Borders, dividers |
| zinc-700 | `#3f3f46` | Dashed border (upload zone), hover borders |
| zinc-600 | `#52525b` | Tertiary text, icons |
| zinc-400 | `#a1a1aa` | Secondary text |
| zinc-300 | `#d4d4d8` | Primary body text |
| zinc-200 | `#e4e4e7` | Emphasized text (filenames, page labels) |
| zinc-100 | `#f4f4f5` | Headings |
| indigo-500 | `#6366f1` | Primary action buttons, accent |
| indigo-400 | `#818cf8` | Hover states for accent elements |
| indigo-600 | `#4f46e5` | Button hover (darker) |
| red-400 | `#f87171` | Error text and borders |

---

## CSS Approach

Since this is a standalone HTML file with no build step:

- Use a `<style>` block in the `<head>` (all CSS inline in the HTML file)
- Use CSS custom properties matching TeamHQ's tokens (copy the relevant subset from `css/styles.css`)
- Font: load Inter from Google Fonts via `<link>` tag (same as TeamHQ landing page)
- No CSS frameworks, no utility classes — plain semantic CSS

---

## HTML Structure (Reference for Implementation)

```html
<body>
  <!-- Header -->
  <header class="header">
    <div class="container header__inner">
      <span class="header__title">PDF Splitter</span>
      <a href="../index.html" class="header__back">TeamHQ</a>
    </div>
  </header>

  <main class="main">
    <div class="container">

      <!-- Upload Zone (visible when no PDF loaded) -->
      <div class="upload-zone" id="upload-zone">
        <svg class="upload-zone__icon">...</svg>
        <p class="upload-zone__text">Drop a PDF here</p>
        <p class="upload-zone__or">or</p>
        <button class="upload-zone__btn">Browse Files</button>
        <p class="upload-zone__hint">PDF files only</p>
        <input type="file" accept=".pdf,application/pdf" hidden>
      </div>

      <!-- Error (shown below upload zone on invalid file) -->
      <div class="upload-error" id="upload-error" hidden>
        <p class="upload-error__text"></p>
      </div>

      <!-- Results (visible after successful upload) -->
      <div class="results" id="results" hidden>

        <!-- PDF Info -->
        <div class="pdf-info">
          <span class="pdf-info__name">report.pdf</span>
          <span class="pdf-info__meta">24 pages &middot; 2.1 MB</span>
        </div>

        <!-- Actions Bar -->
        <div class="actions-bar">
          <button class="actions-bar__download-all">Download All as ZIP</button>
          <button class="actions-bar__reset">Upload Another</button>
        </div>

        <!-- Page Grid -->
        <div class="page-grid" id="page-grid">
          <!-- Page cards rendered by JS -->
        </div>

      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <p class="footer__text">A Sherlock Labs tool</p>
    </div>
  </footer>
</body>
```

---

## Accessibility

- Upload zone has `role="button"` and `tabindex="0"`, responds to Enter/Space keypress
- All buttons have visible focus rings: `outline: 2px solid #6366f1`, `outline-offset: 2px`
- Error messages use `role="alert"` for screen reader announcement
- Page cards use a semantic list (`<ol>` with `<li>` wrappers) so screen readers announce "Page 1 of 24"
- Download links have descriptive `aria-label`: "Download page 3 as PDF"
- The hidden file input is associated with the upload zone for accessibility
- Color contrast: all text/background combinations meet WCAG AA (zinc-400 on zinc-950 = ~7:1 ratio)

---

## File Naming

- Individual page download: `{original-name}-page-{N}.pdf` (e.g., `quarterly-report-page-3.pdf`)
- ZIP download: `{original-name}-pages.zip` (e.g., `quarterly-report-pages.zip`)
- The original filename has its `.pdf` extension stripped before constructing the download name
