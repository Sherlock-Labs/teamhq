# SherlockPDF Drag-and-Drop Upload — Lightweight Fast-Track Scope

**Track:** Lightweight Iteration (Operating Agreement #5)
**Date:** 2026-03-18
**Owner:** Thomas (PM)

## Problem

SherlockPDF users currently click a file input to upload PDFs. This is the most common interaction in the app, but it feels dated. Drag-and-drop is table-stakes UX for file upload tools — every competitor (iLovePDF, Smallpdf, Adobe Acrobat online) supports it. SherlockPDF has the most organic traffic and real SEO traction of our products, so this improvement has the highest user reach.

## Scope

Add a drag-and-drop zone to the SherlockPDF upload area. Users can drag PDF files from their desktop onto the upload area (or click to browse, preserving existing behavior).

## Acceptance Criteria

1. **Drop zone visible** — Dashed border area with icon and "Drag & drop your PDF here" text, plus "or click to browse" secondary label
2. **Drag hover state** — When a file is dragged over the zone, border changes to accent color, background highlights
3. **File type validation** — Only accepts `.pdf` files. Shows inline error for wrong file types ("Only PDF files are accepted")
4. **File size validation** — Rejects files over the existing size limit with clear error message showing the limit
5. **Progress indicator** — Shows upload progress bar while file transfers
6. **Multiple files** — If the tool supports batch operations, accept multiple PDFs; otherwise accept one at a time
7. **Existing click-to-upload still works** — Clicking the zone opens the native file picker as before
8. **Mobile** — On mobile/touch, the drop zone degrades to a tap-to-upload button (drag-and-drop not applicable on mobile)

## Out of Scope

- Folder upload
- URL upload (paste a link)
- Any changes to PDF processing logic

## Pipeline

1. Thomas scopes (this doc)
2. Jonah — backend: ensure upload endpoint handles multipart form data cleanly, add file size validation error responses
3. Alice — frontend: build drop zone component with states (idle, hover, uploading, error, success)
4. Andrei — quick code review
5. Robert — visual eyeball
6. Enzo — spot-check QA (file types, oversized, drag-cancel, error states)

## Notes

- SherlockPDF repo (`Sherlock-Labs/sherlockpdf`) needs to be cloned locally before implementation begins
- This follows the lightweight iteration track — no full architecture or design spec needed
