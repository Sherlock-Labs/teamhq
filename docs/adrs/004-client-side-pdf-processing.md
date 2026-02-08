# ADR-004: Client-Side PDF Processing

**Status:** Accepted
**Date:** 2025-02
**Decision maker:** Andrei (Technical Architect)

## Context

TeamHQ needed PDF tools (a splitter and a combiner) for the Tools section. The tools need to read, split, merge, and create PDFs. We needed to decide whether processing happens on the server or in the browser.

## Decision

100% client-side processing using pdf-lib (PDF manipulation) and pdf.js (page rendering/thumbnails) loaded via CDN. No server, no file uploads, no backend dependency. The PDF Combiner also uses SortableJS for drag-and-drop reordering. All libraries loaded from unpkg/cdnjs.

## Alternatives Considered

- **Server-side processing with a Node library** -- Rejected. Would require file uploads to a server, adding latency, privacy concerns (files leave the browser), and backend complexity. The client-side libraries are mature enough to handle all our use cases.
- **WebAssembly-based tools (e.g., pdfium compiled to WASM)** -- Rejected. Higher complexity, larger bundle, and the JavaScript libraries (pdf-lib, pdf.js) already handle our needs. WASM would only be justified for heavy PDF rendering or editing, which is out of scope.
- **Desktop application (Electron/Tauri)** -- Rejected. We want tools accessible from the browser without installation. A web-based approach is simpler to distribute and maintain.

## Consequences

- **Positive:** Privacy by default. No files ever leave the user's browser. No server to secure.
- **Positive:** Works offline once the page and CDN libraries are loaded. No server round-trips for processing.
- **Positive:** Zero backend cost. No server to run, no file storage to manage, no cleanup jobs.
- **Trade-off:** Limited by browser memory for very large PDFs. Acceptable for typical use cases.
- **Trade-off:** CDN dependency for libraries. If unpkg/cdnjs is down, the tools don't load. Could self-host if this becomes an issue.
