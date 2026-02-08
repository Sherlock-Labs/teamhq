# QA Audit Requirements

**Author:** Thomas (Product Manager)
**Date:** 2026-02-07
**Status:** Active
**Priority:** High
**Source:** Charter Meeting #1

## Overview

Conduct a comprehensive QA audit of all five shipped projects in the TeamHQ portfolio. The goal is to identify bugs, usability issues, accessibility gaps, and edge cases across every project before any further feature work begins. This is a quality baseline exercise.

## Scope

### In Scope

Audit the following five projects:

1. **Landing Page** (`index.html`, `css/styles.css`, `js/projects.js`, `js/meetings.js`)
   - Hero, nav, team roster, "How It Works" sections (static content)
   - Projects section: CRUD operations via modal (create, edit, delete, expand/collapse, kickoff prompt)
   - Meetings section: charter/weekly meeting triggers, transcript display, polling
   - Tools section: tool cards with launch links
   - Responsive layout across all sections

2. **PDF Splitter** (`pdf-splitter/index.html`)
   - Upload zone: drag-and-drop + file browse
   - PDF processing: page count, preview rendering
   - Download: individual pages, "Download All as ZIP"
   - Reset flow
   - Error handling: non-PDF files, corrupted PDFs, encrypted PDFs, zero-page PDFs

3. **PDF Combiner** (`pdf-combiner/index.html`)
   - Upload zone: drag-and-drop + file browse (multi-file, multi-format: PDF, PNG, JPG, WebP, GIF, BMP, TIFF)
   - File list: thumbnails, metadata, reorder via drag (SortableJS), remove individual files
   - Toolbar: "Add more files" (drag-and-drop on toolbar too), "Clear All"
   - Combine & Download: progress state, success flash, output PDF
   - Error handling: unsupported formats, corrupted files, toast notifications

4. **OST Tool** (`ost-tool/`)
   - Vite+React frontend, Express backend
   - Goal input step
   - Tree view: AI-generated opportunity solution tree
   - Debate setup + debate view: solution comparison
   - Recommendation view: AI-generated recommendation
   - Step indicator navigation

5. **Task History / Project Management** (server at `server/`, UI in `js/projects.js`)
   - Express API: project CRUD, session management, meeting management
   - Project cards: expand/collapse, edit, delete, kickoff prompt generation
   - Session management: start/stop sessions, SSE live streaming, event display
   - Meeting management: charter/weekly meeting triggers, transcript polling

### Out of Scope (Deferred)

- Performance benchmarking or load testing
- Automated test suite creation (this audit produces findings; automation is a follow-up)
- Security audit (XSS, injection, etc. -- separate project)
- Backend unit tests
- CI/CD pipeline validation

## QA Categories

Each project must be audited across these six categories:

### 1. Happy Paths
Test the primary user flows work as designed:
- Does the main feature work end-to-end?
- Do all buttons, links, and interactions produce the expected result?
- Does data persist correctly (projects, meetings)?

### 2. Edge Cases
Test boundary conditions and unusual inputs:
- Empty inputs, very long strings, special characters (HTML entities, unicode, quotes)
- Very large files (100+ page PDFs, large images)
- Single-page PDFs in the splitter
- Single file in the combiner
- Rapid-fire actions (double-clicking buttons, submitting forms twice)
- Browser back/forward behavior

### 3. Responsive Behavior
Test across viewport breakpoints:
- Mobile: 320px - 479px
- Small tablet: 480px - 639px
- Tablet: 640px - 899px
- Desktop: 900px+
- Check for: content overflow, truncation, touch target sizes, layout breaks, horizontal scroll

### 4. Keyboard Navigation
Test full keyboard operability:
- Tab order follows logical reading order
- All interactive elements are focusable
- Focus indicators are visible (indigo outline)
- Enter/Space activate buttons and links
- Escape closes modals
- Drag-and-drop zones are keyboard-accessible (upload zone responds to Enter/Space)
- Modal focus trapping

### 5. Accessibility
Test against WCAG 2.1 Level AA:
- Semantic HTML: proper heading hierarchy, landmarks, lists
- ARIA: roles, labels, live regions, hidden attributes
- Color contrast: text meets 4.5:1 ratio, UI elements meet 3:1
- Screen reader: all content is announced meaningfully
- Images: alt text present and descriptive
- Form labels: all inputs have associated labels
- Error messages: connected to inputs, announced by screen readers

### 6. Error States
Test failure modes and recovery:
- Network errors (API down, timeout)
- Invalid file types
- Corrupted files
- Empty states (no projects, no meetings)
- Modal dismiss without saving
- Browser refresh mid-operation
- Server errors (500 responses)

## Severity Rating System

Each finding must be assigned a severity:

| Severity | Label | Definition | Example |
|----------|-------|------------|---------|
| S1 | **Critical** | Feature is broken or unusable. Blocks the primary user flow. | Upload doesn't work, page crashes, data loss |
| S2 | **Major** | Feature works but has significant issues. Workaround exists but degrades UX. | Modal doesn't close on Escape, download produces wrong output, layout completely broken on mobile |
| S3 | **Minor** | Cosmetic or low-impact issue. Doesn't block functionality. | Slight misalignment, missing hover state, focus ring doesn't show on one element |
| S4 | **Improvement** | Not a bug but a clear opportunity to improve quality. | Missing ARIA label, better error message wording, inconsistent spacing |

## Deliverable: Findings Report

Enzo will produce `docs/qa-audit-findings.md` with the following structure:

### Report Format

```markdown
# QA Audit Findings

## Summary
- Total findings: [count]
- By severity: S1: [n], S2: [n], S3: [n], S4: [n]
- By project: [breakdown]
- By category: [breakdown]

## Findings by Project

### [Project Name]

#### Finding [number]: [short title]
- **Severity:** S1/S2/S3/S4
- **Category:** Happy Path / Edge Case / Responsive / Keyboard / Accessibility / Error State
- **Steps to reproduce:** [numbered steps]
- **Expected:** [what should happen]
- **Actual:** [what actually happens]
- **Affected viewport(s):** [if responsive issue]
- **Screenshot/context:** [description if applicable]
```

### Acceptance Criteria for the Report

- [ ] Every project has been tested across all six QA categories
- [ ] Every finding has a severity rating, category, and reproduction steps
- [ ] Summary section includes counts by severity, project, and category
- [ ] Report is written to `docs/qa-audit-findings.md`
- [ ] No S1 (Critical) findings are left unverified -- each S1 must include clear reproduction steps

## Team Involvement

| Agent | Role in this project |
|-------|---------------------|
| **Thomas** (PM) | Scope requirements (this document) |
| **Enzo** (QA) | Conduct the full audit, write findings report |

This is a QA-only project. No architect, designer, or developer involvement is needed at the audit stage. If Enzo's findings warrant fixes, those will be scoped as a separate follow-up project.

## Phases

### Phase 1: Audit (Current)
1. Thomas writes requirements (this document)
2. Enzo conducts the audit across all five projects and six categories
3. Enzo writes the findings report to `docs/qa-audit-findings.md`

### Phase 2: Remediation (Follow-up, not in scope)
- Thomas reviews findings and prioritizes fixes
- Arch/FE/BE address S1 and S2 findings
- Enzo re-validates fixes

## Notes

- The server must be running (`npm run dev` from the repo root) for project management and meeting features to work. OST tool has its own dev server.
- PDF Splitter and PDF Combiner are fully client-side -- no server required.
- Enzo should test in a modern browser (Chrome or Safari). Cross-browser testing is deferred.
- Focus on what users actually experience. Don't audit code quality -- audit behavior.
