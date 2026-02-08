# QA Audit Findings

**Author:** Enzo (QA Engineer)
**Date:** 2026-02-07
**Scope:** All five shipped projects
**Method:** Code-level audit across six QA categories

## Summary

- **Total findings:** 32
- **By severity:** S1: 0, S2: 7, S3: 12, S4: 13
- **By project:**
  - Landing Page: 9
  - PDF Splitter: 5
  - PDF Combiner: 5
  - OST Tool: 7
  - Task History / Project Management: 6
- **By category:**
  - Happy Path: 3
  - Edge Cases: 5
  - Responsive: 4
  - Keyboard Navigation: 6
  - Accessibility: 10
  - Error States: 4

**Overall Verdict: PASS (conditional)**

No S1 (Critical) blockers found. Seven S2 (Major) findings exist that should be addressed in a remediation cycle. The codebase is well-structured with proper HTML escaping throughout, focus trapping in modals, and solid responsive breakpoints. The main areas for improvement are accessibility attributes, keyboard access to drag-and-drop interactions, and a few edge cases in error handling.

---

## Findings by Project

### Landing Page

#### Finding 1: Navigation has no mobile hamburger menu

- **Severity:** S3
- **Category:** Responsive
- **Steps to reproduce:**
  1. View `index.html` at a viewport width under 480px
  2. Observe the nav links
- **Expected:** Navigation links are accessible via a hamburger/toggle menu on small screens
- **Actual:** Nav links use `flex-wrap` and simply wrap to the next line. On very narrow viewports (320px) with five links ("Tools", "Projects", "Meetings", "Team", "How It Works"), links will wrap and may crowd the limited space. There is no mobile menu toggle.
- **Affected viewport(s):** 320px - 479px

#### Finding 2: Meetings AGENTS registry only includes 6 of 12 agents

- **Severity:** S3
- **Category:** Happy Path
- **Steps to reproduce:**
  1. Open `js/meetings.js`
  2. Review the `AGENTS` object (line 15-22)
- **Expected:** All 12 team agents are included for transcript rendering
- **Actual:** Only Thomas, Andrei, Robert, Alice, Jonah, and Enzo are in the `AGENTS` map. If Priya, Suki, Marco, Nadia, Yuki, or Kai speak in a meeting transcript, their avatar/role will fall back to generic styling. The code handles this gracefully via the fallback (`{ role: '', avatar: '', color: '#a1a1aa' }`), so it does not break functionality, but their avatar will show only the first letter initial instead of their pixel art.

#### Finding 3: OST Tool launch link uses hardcoded localhost URL

- **Severity:** S2
- **Category:** Happy Path
- **Steps to reproduce:**
  1. Open `index.html`, line 57
  2. Note the OST Tool card links to `http://localhost:5173`
- **Expected:** The link should work in all environments, or at least use a relative path
- **Actual:** The link is hardcoded to `http://localhost:5173`. If the OST tool is not running locally on that port, the link leads to a connection error. The PDF tools use relative paths (`pdf-splitter/index.html`, `pdf-combiner/index.html`) but the OST tool does not. This is because the OST tool runs its own Vite dev server, so a relative path is not possible without deploying it statically, but it is still a UX issue for any user who clicks "Launch" without the dev server running.

#### Finding 4: `aria-label` missing on nav logo link

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `index.html`, line 19
  2. The logo link `<a href="#" class="nav__logo-link">` has an `<img>` with `alt="Sherlock Labs"`, which provides the accessible name. However, the `href="#"` link scrolls to top without any indication of purpose.
- **Expected:** Logo link should communicate its purpose (e.g., "Home" or "Back to top")
- **Actual:** The link is announced as "Sherlock Labs" from the img alt text, which is acceptable. Minor improvement: the link behavior (scroll to top) is standard and expected. This is a minor improvement opportunity.

#### Finding 5: Step numbers in "How It Works" are `aria-hidden` but rely on visual order

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `index.html`, lines 355-377
  2. The step numbers use `aria-hidden="true"` and the step titles provide semantic meaning
- **Expected:** Screen readers get meaningful step content
- **Actual:** This is actually well-handled. The `aria-hidden="true"` on the number circles is correct since the heading text provides the meaningful content. No action needed. *(Removing this finding on reflection -- replaced with Finding 5a below.)*

#### Finding 5a: Toast notifications use `white-space: nowrap` which can overflow on mobile

- **Severity:** S3
- **Category:** Responsive
- **Steps to reproduce:**
  1. Review `css/styles.css`, line 1403: `.toast__message { white-space: nowrap; }`
  2. If a long toast message is triggered (e.g., "Failed to create project. Please try again."), it will not wrap
- **Expected:** Toast messages wrap on narrow viewports
- **Actual:** Toast messages are `white-space: nowrap`. There is no mobile media query override for this in the main CSS (unlike the PDF Combiner which adds `white-space: normal` at `max-width: 639px`). Long error messages could overflow the viewport on mobile.
- **Affected viewport(s):** 320px - 479px

#### Finding 6: Focus trap in modals does not account for dynamically hidden elements

- **Severity:** S3
- **Category:** Keyboard Navigation
- **Steps to reproduce:**
  1. Open `js/projects.js`, lines 1494-1517 (trapFocus function)
  2. The focus trap queries all focusable elements once when the modal opens
  3. In the create/edit modal, the "Advanced options" section starts hidden (`aria-hidden="true"`) and contains additional inputs
- **Expected:** Focus trap updates when advanced fields are toggled visible
- **Actual:** The `focusable` NodeList is queried once when the modal opens. When the user opens "Advanced options" (which reveals 4 additional fields), the focus trap's `first` and `last` references are stale. If advanced fields are the last focusable elements, Tab from the last advanced field will not cycle back to the first element. In practice, this is partially mitigated because the Cancel and Submit buttons are always last in DOM order, but the issue exists conceptually.

#### Finding 7: Escape key handling checks modals in sequence, not by z-order

- **Severity:** S4
- **Category:** Keyboard Navigation
- **Steps to reproduce:**
  1. Open `js/projects.js`, lines 2158-2170
  2. If somehow multiple overlays were open (not currently possible in the UI), pressing Escape would close the first one found
- **Expected:** Escape closes the topmost modal
- **Actual:** The current code checks `projectOverlay`, then `deleteOverlay`, then `kickoffOverlay`. Since the UI flow prevents multiple overlays from being open simultaneously, this is not a real issue. However, if the UI were extended to allow stacked modals, this would need to be addressed. Noting as improvement.

#### Finding 8: `role="listitem"` on `<li>` elements is redundant

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `index.html`, lines 233-341
  2. Each `<li>` in the roster grid has `role="listitem"`
- **Expected:** The `<li>` element already has an implicit `listitem` role when inside a `<ul>` with `role="list"`
- **Actual:** The explicit `role="listitem"` is technically redundant since `<li>` elements inside a `<ul>` already carry the `listitem` role. This is not harmful but adds unnecessary noise to the markup.

#### Finding 9: Heading hierarchy skips from h2 to h3 within sections

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. The page uses h1 (hero), h2 (section titles), h3 (card names within sections)
- **Expected:** Heading hierarchy should not skip levels
- **Actual:** The hierarchy is actually correct: h1 -> h2 (section) -> h3 (card). This follows a logical outline. No issue here. *(Replacing with an actual finding.)*

#### Finding 9a: No `aria-label` on the nav element distinguishing it from tool-page navs

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `index.html`, line 16: `<nav class="nav" aria-label="Main navigation">`
- **Expected:** Good practice
- **Actual:** The `aria-label` is present and correct. This is fine. *(Replacing with actual finding below.)*

#### Finding 9b: Meeting buttons lack descriptive labels for screen readers

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `index.html`, lines 214-215
  2. The "Run Charter" and "Run Weekly" buttons have text content but no `aria-label` explaining what these do
- **Expected:** Button text "Run Charter" is reasonably clear in context
- **Actual:** The button labels are adequate but could benefit from more descriptive `aria-label` attributes like "Run a charter team meeting" for first-time users using screen readers who lack the surrounding visual context.

---

### PDF Splitter

#### Finding 10: No error shown to user on ZIP download failure

- **Severity:** S2
- **Category:** Error States
- **Steps to reproduce:**
  1. Open `pdf-splitter/index.html`, lines 771-796 (`handleDownloadAll` function)
  2. If `zip.generateAsync()` or `extractPage()` throws, the catch block is empty
- **Expected:** User sees an error message if ZIP generation fails
- **Actual:** The catch block at line 790-792 is empty: `catch (err) { // Restore button on failure }`. The button is restored to its original state (lines 794-795 run in both success and failure cases since they're outside the try/catch), but no error message is displayed. If a PDF page extraction fails during ZIP generation, the user sees the button re-enable but has no idea what happened.

#### Finding 11: Upload zone lacks `aria-label` for the file type restriction

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Line 483: `<div class="upload-zone" id="upload-zone" role="button" tabindex="0" aria-label="Upload a PDF file">`
- **Expected:** The `aria-label` communicates the allowed file types
- **Actual:** The `aria-label` says "Upload a PDF file" which is clear. The visual hint "PDF files only" is also present. This is handled well. *(Noting as acceptable.)*

#### Finding 11a: Single-page PDF shows "Download All as ZIP" button for just one page

- **Severity:** S3
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Upload a single-page PDF to the splitter
  2. The results view renders with "Download All as ZIP" and a single page card
- **Expected:** For a single-page PDF, "Download All as ZIP" is redundant since there is only one page to download
- **Actual:** The ZIP button appears regardless of page count. The individual page download does the same thing. Not broken, but slightly confusing UX for single-page PDFs.

#### Finding 12: Page grid uses `<ol>` with `role="list"` but items are `<li>` without meaningful order context

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Line 695: `<ol class="page-grid" id="page-grid" role="list"></ol>`
  2. Page cards are `<li>` elements with class `page-card`
- **Expected:** Ordered list semantics are appropriate since pages have a natural order
- **Actual:** The use of `<ol>` with `role="list"` is fine. Each `<li>` has a page label ("Page 1", "Page 2") and a download button with `aria-label="Download page N as PDF"`. This is well-handled.

#### Finding 12a: No loading state indicator when downloading a single page

- **Severity:** S3
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Upload a large PDF
  2. Click "Download" on an individual page
  3. There is no visual feedback during the extraction process
- **Expected:** The download button should show a loading state during extraction
- **Actual:** The `downloadSinglePage` function (line 765) is async and calls `extractPage()` which can take time for large PDFs. The button has no disabled or loading state during this operation. Users might click multiple times.

#### Finding 13: Password-protected PDF detection relies on error message string matching

- **Severity:** S3
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Review `pdf-splitter/index.html`, lines 621-628
  2. The code catches errors from `PDFLib.PDFDocument.load()` and checks `err.message.toLowerCase().includes('encrypt')`
- **Expected:** Reliable detection of encrypted PDFs
- **Actual:** The code uses `ignoreEncryption: true` (line 620) which tells pdf-lib to try to open the PDF even if encrypted. The error message string matching for the "encrypt" keyword is fragile -- if the library changes its error wording, the detection breaks. However, the fallback ("This PDF couldn't be read. The file may be corrupted.") is reasonable.

#### Finding 14: `fileInput.value` is not cleared after successful upload

- **Severity:** S2
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Upload a PDF via the Browse button
  2. Click "Upload Another" (reset)
  3. Try to upload the same PDF again via Browse
- **Expected:** The same file can be re-uploaded after reset
- **Actual:** When using the Browse button, `fileInput.value` is only cleared in `handleReset()` via `showUploadZone()` (line 676: `fileInput.value = ''`). However, if the user uploads successfully and then clicks "Upload Another", the `handleReset` function correctly resets the file input. Wait -- actually reviewing the code, `handleReset` (line 798) calls `showUploadZone` (line 672) which does set `fileInput.value = ''`. So this actually works. Let me verify... Yes, `showUploadZone` on line 676 sets `fileInput.value = ''`. The reset flow works correctly. *(Retracting this finding.)*

#### Finding 14a: No maximum file size check

- **Severity:** S2
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Upload a very large PDF (100+ MB) to the splitter
  2. The entire file is read into memory as an ArrayBuffer
- **Expected:** Some file size limit or warning for very large files
- **Actual:** There is no file size validation. The `FileReader.readAsArrayBuffer()` call at line 607 will read the entire file into browser memory. For very large PDFs (100+ MB), this could cause the browser tab to become unresponsive or crash. No size warning or limit is implemented.

---

### PDF Combiner

#### Finding 15: Drag handle is not keyboard-accessible

- **Severity:** S2
- **Category:** Keyboard Navigation
- **Steps to reproduce:**
  1. Open `pdf-combiner/index.html`
  2. Add multiple files
  3. Attempt to reorder files using keyboard only
- **Expected:** Files can be reordered via keyboard (e.g., arrow keys with modifier)
- **Actual:** The drag handle (`.file-item__handle`) is a `<div>` with no `tabindex`, `role`, or keyboard event handlers. SortableJS provides drag-and-drop reordering via mouse/touch but no keyboard equivalent. Keyboard-only users cannot reorder files. The handle has `aria-label="Reorder [filename]"` but is not focusable.

#### Finding 16: Toast only shows error styling (red border)

- **Severity:** S3
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Review `pdf-combiner/index.html`, lines 520-546
  2. The toast has a fixed red border: `border: 1px solid rgba(248, 113, 113, 0.3)`
  3. Toast text is also hardcoded to red: `color: var(--red-400)`
- **Expected:** Toast could be used for success messages too
- **Actual:** The toast component is hardcoded to error styling. The "Downloaded!" success feedback is shown on the combine button itself (green flash), not via a toast. This works fine for the current use case, but the success path at line 1306 (`combineBtn.innerHTML = '\u2713 Downloaded!'`) only lasts 2 seconds and could be missed.

#### Finding 17: `escapeAttr` used for handle `aria-label` but not for `data-id`

- **Severity:** S4
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Line 1050: `handle.setAttribute('aria-label', 'Reorder ' + escapeAttr(entry.name))`
  2. Line 1044: `li.setAttribute('data-id', entry.id)`
- **Expected:** Data attributes should use escaped values
- **Actual:** The `data-id` attribute uses `entry.id` which is generated by `generateId()` (a UUID or timestamp-based string), so it is safe. The file name in `aria-label` is correctly escaped. No real issue, just noting that the `entry.name` is also set via `nameSpan.textContent = entry.name` (line 1089) which is safe. The code handles escaping correctly.

#### Finding 18: File list has no visual indicator of drag capability on mobile

- **Severity:** S3
- **Category:** Responsive
- **Steps to reproduce:**
  1. View the combiner at mobile viewport widths
  2. The drag handle (6-dot grip icon) is visible but small
- **Expected:** Touch users understand they can reorder by dragging
- **Actual:** The drag handle is 16px wide, which is below the recommended 44px touch target size. On mobile, the handle may be difficult to grab. The file items themselves are not draggable (only the handle is), which limits discoverability.
- **Affected viewport(s):** 320px - 639px

#### Finding 19: No confirmation before "Clear All"

- **Severity:** S2
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Add multiple files to the combiner
  2. Click "Clear All"
- **Expected:** A confirmation dialog or undo option before clearing all files
- **Actual:** The "Clear All" button (`clearAllBtn`, line 805) immediately clears all files with `files = []; renderAll()`. There is no confirmation dialog. If a user accidentally clicks "Clear All" after adding and reordering many files, their work is lost with no way to undo.

---

### OST Tool

#### Finding 20: No loading error recovery -- user stuck on loading screen

- **Severity:** S2
- **Category:** Error States
- **Steps to reproduce:**
  1. Open the OST tool
  2. Enter a goal and submit
  3. If the AI API call fails or times out during the loading state (GoalInput loading screen, lines 32-49), the error is caught and shown
  4. However, review `GoalInput.tsx` lines 22-29: the `catch` block does `setLoading(false)` which returns to the form, and `setError(msg)` which shows the error
- **Expected:** Error recovery works
- **Actual:** Error recovery in GoalInput is actually well-handled: on error, loading is set to false and the error message is displayed. However, in `DebateSetup.tsx` (line 68-69) and `DebateView.tsx` (line 146-148), the same pattern is followed. The issue is that there is no timeout on the API calls themselves -- if the server hangs without responding or erroring, the loading spinner will spin indefinitely with no way to cancel or go back.

#### Finding 21: No "Back" button in the multi-step flow

- **Severity:** S2
- **Category:** Happy Path
- **Steps to reproduce:**
  1. Navigate through Goal -> Tree View -> Debate Setup
  2. Attempt to go back to a previous step
- **Expected:** Users can navigate backward through steps
- **Actual:** The step flow is forward-only. There is no back button on any step. In `App.tsx`, the step state is managed via `setStep(n)` but only forward transitions are wired (e.g., `handleGoalComplete` sets step 1, `handleTreeComplete` sets step 2). If a user wants to change their goal or select different solutions, they must click "Start Over" at the very end (RecommendationView, line 311) which resets everything.

#### Finding 22: TreeView has fixed height that may clip on short viewports

- **Severity:** S3
- **Category:** Responsive
- **Steps to reproduce:**
  1. Open `TreeView.tsx`, line 201: `<div className="flex flex-col h-[calc(100vh-160px)]">`
  2. The tree view container has a fixed calculated height
- **Expected:** The tree view adapts to different viewport heights
- **Actual:** The `calc(100vh - 160px)` assumes the nav + step indicator + bottom button total 160px. On mobile with browser chrome (URL bar, bottom toolbar), the effective viewport height is smaller. The ReactFlow canvas could end up very short (under 300px) on mobile portrait, making the tree difficult to navigate.
- **Affected viewport(s):** Mobile portrait

#### Finding 23: StepIndicator step connectors have fixed widths

- **Severity:** S3
- **Category:** Responsive
- **Steps to reproduce:**
  1. Open `StepIndicator.tsx`, line 13: `<div className="h-px w-10 sm:w-16 ...">`
  2. At very narrow viewports, four step circles with three 40px connectors may overflow
- **Expected:** Step indicator scales down on narrow viewports
- **Actual:** With four 32px circles and three 40px connectors, the minimum width is 248px at the smallest breakpoint. This fits within 320px with margin. Minor issue: the labels ("Goal", "Explore & Select", "Debate", "Recommend") use `text-xs` and should fit, but "Explore & Select" is relatively long and may wrap awkwardly on the narrowest viewports.
- **Affected viewport(s):** 320px

#### Finding 24: OST tool has no `aria-label` or landmark roles on main content

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `App.tsx`, line 42: `<div className="min-h-screen bg-zinc-950 flex flex-col">`
  2. The main content area is a generic `<div>`, not a `<main>` element
- **Expected:** Main content should use `<main>` landmark for screen reader navigation
- **Actual:** The page structure uses `<div>` for the main content area and `<footer>` for the footer. The nav uses `<nav>`. The main content area should be a `<main>` element for proper landmark navigation. Screen reader users rely on landmarks to navigate between sections.

#### Finding 25: Form inputs in OST tool lack `id` attributes for explicit label association

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `GoalInput.tsx`, lines 60-68
  2. The `<label>` and `<textarea>` are siblings but not explicitly associated via `htmlFor`/`id`
- **Expected:** Labels use `htmlFor` to reference input `id` for programmatic association
- **Actual:** The `<label>` wrapping approach is not used here -- the label and textarea are siblings. Without `htmlFor`/`id` pairing, the association depends on implicit proximity. Screen readers should still announce the label due to visual proximity heuristics, but explicit association is more reliable.

#### Finding 26: Debate perspective cards use `<button>` but don't announce selected state

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `DebateSetup.tsx`, lines 111-138
  2. The perspective cards are `<button>` elements with visual checkmark indicators
- **Expected:** The selected state is announced to screen readers via `aria-pressed` or `aria-checked`
- **Actual:** The buttons have no `aria-pressed` or `aria-checked` attribute. The selected state is communicated only via visual styling (border color, background color, and a checkmark SVG). Screen reader users cannot determine which perspectives are currently selected.

---

### Task History / Project Management

#### Finding 27: API does not validate project ID format (path traversal potential)

- **Severity:** S4
- **Category:** Error States
- **Steps to reproduce:**
  1. Review `server/src/routes/projects.ts`, line 57: `req.params.id` is used directly
  2. Review `server/src/store/projects.ts` to check if the ID is sanitized before file path construction
- **Expected:** Project IDs are validated to prevent path traversal
- **Actual:** This is noted as out-of-scope per the requirements (security audit is deferred), but worth flagging. The project ID from `req.params.id` is used with `encodeURIComponent` in the frontend but on the backend, the store likely constructs a file path using the ID. If the store does `path.join(dataDir, id + '.json')`, a crafted ID like `../../../etc/passwd` could potentially read arbitrary files. However, Express URL-decodes params, so `/` would need to be encoded. This is a security concern noted for the future security audit.

#### Finding 28: Session start can transition "planned" projects to "in-progress" bypassing normal start flow

- **Severity:** S3
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Review `server/src/routes/sessions.ts`, lines 33-37
  2. If a project is "planned" and a session is started via `POST /api/projects/:id/sessions`, the route automatically transitions the project status to "in-progress"
- **Expected:** The "Start Work" flow in the UI handles this transition
- **Actual:** The session creation endpoint is defensive and handles the planned->in-progress transition server-side. This is actually good -- it prevents a race condition where the UI might fail to update the status. Not a bug, but noting that the project status can change as a side effect of starting a session.

#### Finding 29: SSE connection does not re-render session controls when session ends while card is collapsed

- **Severity:** S3
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Open `js/projects.js`, lines 1369-1383 (`collapseCard` function)
  2. When a card is collapsed, `disconnectSession()` is called which closes the SSE connection
  3. If the session ends while the card is collapsed, the `handleSessionDone` callback never fires because the SSE was already disconnected
- **Expected:** The project card updates to show the session has ended
- **Actual:** The running indicator (green dot) on the project card header will persist until the card is expanded again. When the card is expanded, it calls `initSessionsForProject` which checks `project.activeSessionId` -- but since the server cleared `activeSessionId` when the session ended, the card will correctly show the stopped state. However, the collapsed card header may show a stale running indicator until the user expands and collapses it. The `renderList()` call in `handleSessionDone` would fix this, but `handleSessionDone` is not called because the SSE was disconnected.

#### Finding 30: Notes input has no character limit

- **Severity:** S4
- **Category:** Edge Cases
- **Steps to reproduce:**
  1. Open `js/projects.js`, lines 1781-1821 (`handleAddNote` function)
  2. The note content is `input.value.trim()` with no length check
  3. The API `CreateNoteSchema` in the server may have a length limit, but the client does not enforce one
- **Expected:** Client-side character limit or the API rejects very long notes
- **Actual:** A user could paste an extremely long string into the progress notes input. The client has no `maxlength` attribute on the input. If the server schema also lacks a length limit, very long notes would be stored and rendered in full.

#### Finding 31: Delete modal focus goes to Cancel button, not the destructive action

- **Severity:** S4
- **Category:** Keyboard Navigation
- **Steps to reproduce:**
  1. Open `js/projects.js`, line 1476: `deleteOverlay.querySelector('.modal__cancel').focus()`
- **Expected:** Focus goes to the safe action (Cancel) in a destructive dialog
- **Actual:** This is actually correct behavior. In destructive confirmation dialogs, focus should go to the non-destructive option (Cancel) to prevent accidental deletion via keyboard. This follows best practices. *(Keeping as finding to note it's correctly implemented.)*

#### Finding 31a: Session log `aria-live="polite"` on the log body may cause excessive announcements

- **Severity:** S4
- **Category:** Accessibility
- **Steps to reproduce:**
  1. Open `js/projects.js`, line 450: `<div class="session-log__body" role="log" aria-live="polite">`
  2. Every new event appended to the session log will be announced by screen readers
- **Expected:** Session log updates are announced selectively
- **Actual:** With `aria-live="polite"`, every DOM insertion into the session log body will queue a screen reader announcement. During an active session with rapid events (tool uses, text deltas, etc.), this could generate dozens of announcements per minute, overwhelming screen reader users. The `role="log"` implies `aria-live="polite"` already, so the explicit `aria-live` is redundant. A more targeted approach would be to announce only significant events (session start/stop, errors).

#### Finding 32: EventSource `onerror` handler does not show user-facing feedback

- **Severity:** S3
- **Category:** Error States
- **Steps to reproduce:**
  1. Open `js/projects.js`, lines 811-818
  2. The `onerror` handler only closes the connection for non-live sessions
  3. For live sessions, `EventSource` will auto-reconnect
- **Expected:** User sees feedback when connection is lost
- **Actual:** If the SSE connection fails during a live session (e.g., server crashes), the `EventSource` API will silently attempt to reconnect. There is no visual indicator to the user that the connection was lost and is reconnecting. The timer continues ticking based on `Date.now()`, which could create a disconnect between displayed elapsed time and actual session progress.

---

## Retracted/False-Positive Findings

The following were initially identified but determined to not be real issues upon closer inspection:

- **Finding 5** (Step number aria-hidden): Correctly implemented -- step numbers are decorative, headings provide meaning.
- **Finding 9** (Heading hierarchy): Correctly follows h1 -> h2 -> h3 pattern.
- **Finding 9a** (Nav aria-label): Present and correct.
- **Finding 11** (Upload zone aria-label): Clear and descriptive.
- **Finding 12** (Page grid semantics): Well-structured ordered list.
- **Finding 14** (fileInput reset): Actually works correctly.
- **Finding 17** (data-id escaping): Uses safe generated IDs.
- **Finding 31** (Delete modal focus): Correctly focuses Cancel button.

---

## Cross-Project Observations

### Positive Patterns (Consistently Well-Done)

1. **HTML escaping** -- All five projects use proper `escapeHTML()` / `escapeAttr()` functions for user-generated content rendered via `innerHTML`. No XSS vectors found in the HTML rendering paths.
2. **Focus-visible styling** -- All projects define `:focus-visible` outlines using the indigo accent color, providing keyboard navigation visibility.
3. **Responsive breakpoints** -- All projects use consistent breakpoints (480px, 640px, 900px/1024px) for layout changes.
4. **Error handling in API calls** -- The landing page projects.js and meetings.js both handle API errors with user-facing toast messages and optimistic UI rollback.
5. **Semantic HTML** -- Good use of `<nav>`, `<main>`, `<footer>`, `<article>`, `<section>`, `aria-labelledby`, and heading hierarchy across the landing page and PDF tools.
6. **Modal accessibility** -- Focus trapping, `aria-modal="true"`, `role="dialog"`/`role="alertdialog"`, and Escape key handling are all implemented.

### Patterns Needing Improvement

1. **Keyboard access to drag-and-drop** -- Both the PDF Combiner (file reordering) and OST Tool (tree interaction) rely on mouse/touch for key interactions without keyboard alternatives.
2. **Loading timeout/cancel** -- Multiple components show loading spinners without timeout or cancel options (GoalInput, DebateSetup, DebateView).
3. **Large file handling** -- Neither PDF tool has file size limits, which could cause memory issues.
4. **ARIA state management** -- Several interactive components (DebateSetup perspective cards, OST tree node selection) lack `aria-pressed`/`aria-checked` attributes.
