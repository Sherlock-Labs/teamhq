# Code Readability Pass -- Tech Approach

**Author:** Andrei (Technical Architect)
**Date:** Feb 9, 2026
**Status:** Ready for implementation

---

## 1. Audit Summary

I audited every in-scope file against the five readability dimensions defined in the requirements doc: naming clarity, function length & responsibility, consistent patterns, comments & documentation, and file organization. This document contains the findings, a prioritized refactoring order, effort estimates, and a conventions section that codifies the standards going forward.

**Scope reviewed:**
- 28 server TypeScript files (~3,700 lines)
- 6 landing page JS files (~5,000 lines)
- 4 CSS files (~5,950 lines)
- 2 HTML files (~565 lines)
- 3 scripts (~780 lines)

**Codebase health:** Good overall. The code works well, naming is mostly descriptive, and patterns are generally consistent within individual files. The debt is concentrated in a few areas: duplicated utilities across JS files, a handful of oversized functions, and missing comments on complex logic. The CSS is well-organized with section headers already in place.

---

## 2. Cross-Cutting Issues

These issues appear across multiple files and should be addressed systematically rather than file-by-file.

### 2.1 Duplicated Utility Functions (FE -- Alice)

The vanilla JS files share no code because each is an independent IIFE. This is architecturally intentional (no bundler), but has led to identical utility functions copy-pasted across files:

| Function | Files where duplicated |
|----------|----------------------|
| `escapeHTML()` | `projects.js`, `meetings.js`, `portfolio.js`, `docs.js` |
| `escapeAttr()` | `projects.js`, `meetings.js`, `docs.js` |
| `formatDate()` / `formatDateShort()` / `formatDateLong()` | `projects.js`, `meetings.js`, `portfolio.js`, `docs.js` |
| `formatDuration()` | `projects.js`, `meetings.js` |
| `formatStatus()` | `portfolio.js`, `tasks.js` |
| `showToast()` | `projects.js`, `meetings.js` |

**Recommendation:** Since these are vanilla JS IIFEs with no module system, cross-file sharing is out of scope per the requirements (architecture change). Instead, add a brief comment at the top of each duplicate: `// Shared utility -- also in projects.js, meetings.js`. This makes the duplication explicit and intentional rather than accidental. If a future project adds a bundler, these become the first candidates for a shared utils module.

### 2.2 Duplicated Agent Registry Data (FE + BE -- Alice & Jonah)

Agent name/role/avatar data is defined independently in at least four places:

| Location | What it defines |
|----------|----------------|
| `js/projects.js` lines 7-116 `AGENT_REGISTRY` | name, role, avatar for 18 agents |
| `js/meetings.js` lines 5-62 `AGENTS` + `AGENT_ROSTER` | name, avatar, role for 18 agents |
| `server/src/meetings/prompt.ts` lines 7-27 `AGENT_DISPLAY_NAMES` | display names for 18 agents |
| `server/src/meetings/context.ts` lines 6-24 `CORE_AGENTS` | file paths for 18 agent definitions |

**Recommendation:** Same constraint as above -- no cross-file sharing in vanilla JS. Add a comment to each registry noting the other locations: `// Agent data also defined in: meetings.js, server/meetings/prompt.ts`. On the server side, Jonah should consolidate `AGENT_DISPLAY_NAMES` and `CORE_AGENTS` into a single shared constant in a new file (e.g., `server/src/agents.ts`) that both `prompt.ts` and `context.ts` import. This is an internal refactor, not an architecture change.

### 2.3 Duplicated `formatZodError` (BE -- Jonah)

`formatZodError()` is identically defined in both `routes/projects.ts` (line 9) and `routes/meetings.ts` (line 9). Extract to a shared route utility, e.g., `server/src/routes/utils.ts`.

### 2.4 Duplicated Meeting Store Reads (BE -- Jonah)

`store/meetings.ts` has three functions (`listMeetings`, `getLatestMeeting`, `getRecentMeetings`) that each independently read the meetings directory, parse every JSON file, and sort by date. The directory-scan-and-parse logic is identical in all three. Extract a private `readAllMeetings()` helper that all three call.

---

## 3. File-by-File Audit Findings

Files are organized into three priority tiers based on complexity, size, change frequency, and onboarding impact.

---

### Tier 1: High Priority

These files have the most readability debt and the highest payoff from improvement.

---

#### `js/projects.js` -- 2,796 lines (FE -- Alice) [LARGE effort]

The single largest file in the codebase. It is a well-structured IIFE, but its sheer size makes navigation difficult.

**Function length & responsibility:**
- **Lines 120-161**: 40+ module-level state variables declared in a block. Group them by concern (API state, session state, UI state, timer IDs) with blank lines and brief section comments.
- **Lines 973-1209 `appendSessionEvent()`**: ~120 lines. This function handles event classification, state tracking (pipeline, team activity, file deliverables), streaming text accumulation, turn summary building, and DOM insertion. Extract at least 3-4 helpers: `classifyEvent()`, `updatePipelineState()`, `updateTeamActivity()`, `renderSessionEvent()`.
- **Lines 2434-2663**: The main delegated click handler is ~230 lines with a long `if/else if` chain matching `data-action` attributes. Each branch is a reasonable size individually, but the containing function is hard to scan. Add a comment before each branch labeling the action it handles.
- **Lines 1318-1413 `buildSessionLogHtml()`**: ~95 lines building the session log DOM. Consider extracting the header, input bar, and panels into separate builder functions.
- **Lines 594-689 `renderProjectDetail()`**: ~95 lines. Could split the "detail fields" section from the "session history" section.

**Naming:**
- `appendSessionEvent()` should be `handleSessionEvent()` -- it does far more than appending.
- Variables like `streamText`, `streamEl`, `lastTurnSummary` would benefit from more context: `activeStreamText`, `activeStreamElement`, `latestTurnSummary`.

**Comments:**
- The pipeline-phase detection logic (lines ~1050-1100) parses tool names to infer which pipeline phase is active. This heuristic deserves a comment explaining the mapping.
- The event grouping logic (lines ~1150-1180) that collapses low-signal events needs a comment explaining what qualifies as "low signal."
- The scroll-lock detection (lines ~1210-1240) uses a 50px threshold -- add a named constant and comment explaining why 50px.

**Magic numbers/strings:**
- `500` (MAX_RENDERED_EVENTS) is already a named constant -- good.
- `30 * 60 * 1000` (session timeout) on line ~1290 should be a named constant: `SESSION_TIMEOUT_MS = 30 * 60 * 1000`.
- `50` (scroll threshold) should be `SCROLL_LOCK_THRESHOLD = 50`.
- `5000` (toast duration) should be `TOAST_DURATION_MS = 5000`.

---

#### `server/src/session/base-runner.ts` -- 507 lines (BE -- Jonah) [LARGE effort]

The most complex server-side file. Abstract base class for session runners with CLI process management, NDJSON parsing, and event emission.

**Function length & responsibility:**
- **Lines 190-340 `parseCliEvent()`**: ~150 lines. A large switch statement with complex logic in several cases. The `"result"` case (lines 311-337) builds a turn summary string through multi-step string concatenation with conditional logic -- extract to a `buildTurnSummary()` helper. The `"assistant"` case (lines 215-260) handles streaming text accumulation, content block detection, and Markdown rendering -- extract to `handleAssistantEvent()`.
- **Lines 340-400 `onProcessClose()`**: Has nested try/catch with multiple state transitions. The logic for determining final status (completed vs failed vs timed-out) could be extracted to `determineFinalStatus()`.

**Naming:**
- `stderrBuf` should be `stderrBuffer` (or at minimum add a comment).
- `cliSessionId` could be `claudeSessionId` for clarity on what CLI it refers to.
- `latestAssistantText` is clear but the relationship to `pendingContentBlocks` is not obvious -- add a brief comment.

**Comments:**
- The content block detection logic (lines ~230-250) where `content_block_start`/`content_block_stop` events trigger Markdown rendering is non-obvious. Add a comment: "Content blocks represent complete assistant responses; render Markdown only when a block finishes to avoid partial rendering."
- The error recovery logic in `onProcessClose()` that checks stderr for specific patterns needs a comment explaining what errors are being detected.
- The heartbeat mechanism deserves a one-line comment explaining its purpose (keeping SSE connections alive).

**Magic numbers:**
- `15_000` (heartbeat interval) -- name it: `HEARTBEAT_INTERVAL_MS = 15_000`.
- `30 * 60 * 1000` (session timeout) -- name it: `SESSION_TIMEOUT_MS = 30 * 60 * 1000`.
- `5000` (event limit) -- name it: `MAX_EVENTS = 5000`.

---

#### `css/styles.css` -- 4,889 lines (FE -- Alice) [MEDIUM effort]

The largest file in the entire repo. However, it is already well-organized with clear `/* === Section === */` headers throughout. The readability improvements here are lighter than for JS files.

**File organization:**
- The file has ~35 section headers which is a solid organizational foundation.
- Responsive media queries for each section are placed immediately after that section's rules, which is the right pattern.
- The `prefers-reduced-motion` section at the end (lines 4847-4889) is a good practice.

**Recommendations:**
- Add a table of contents comment at the top listing all major sections with approximate line numbers. At 4,889 lines, a TOC is essential for navigation.
- Some sections are very large (Session Log: lines 2101-2800, ~700 lines; Meetings: lines 3493-4388, ~900 lines). Add sub-section comments within these, e.g., `/* --- Session Events: tool_use --- */` is already done for some, but not all event types.
- A few bare hex/rgba values appear outside of tokens: `#f9f9f9` (line 2106, 2158), `#f0f0f0` (line 1867), `#e5e5e5` (lines 2037, 2982), `#ffffff` (lines 986, 1542, 2747). These should reference tokens or at minimum get a comment explaining why they're not tokenized (if intentional).
- The `!important` on line 1872 (`.activity-grid__cell--pad`) should get a brief comment explaining why it's needed.

---

#### `server/src/meetings/prompt.ts` -- 313 lines (BE -- Jonah) [MEDIUM effort]

Meeting prompt builder. Well-structured with focused helper functions, but a few areas need attention.

**Function length & responsibility:**
- **Lines 98-114 `buildPersonalitiesSection()`**: Contains a line-scanning loop that extracts personality text from agent definition files by looking for a `## Personality` header and collecting lines until the next `##` header. This parsing logic needs a comment explaining the format it expects.
- **Lines 180-250 `buildMeetingPrompt()`**: ~70 lines. Acceptable length but the string template assembly could benefit from named subsections.

**Naming:**
- `AGENT_DISPLAY_NAMES` is clear but should note it's duplicated in `context.ts` (see cross-cutting issue 2.2).

**Comments:**
- The JSON schema constraint in the prompt (lines ~260-310) is a complex object structure. Add a one-line comment: "This schema ensures Claude returns structured meeting output that can be parsed and stored."
- The `CONVERSATION_RULES` constant (lines ~130-170) embeds behavioral constraints. A brief header comment would help: "Rules injected into the system prompt to keep meeting conversations focused and productive."

---

#### `server/src/voice/transcribe.ts` -- 264 lines (BE -- Jonah) [MEDIUM effort]

WebSocket handler for voice transcription with the Voxtral/Mistral API.

**Function length & responsibility:**
- **Lines 30-264 `handleVoiceConnection()`**: This is a ~235-line function containing the entire WebSocket lifecycle. It declares multiple inner functions (`sendToVoxtral`, `handleVoxtralMessage`, `reconnectVoxtral`, etc.) and manages complex state across them via closure variables. This is the largest single function in the server codebase.
- **Recommendation:** Extract the Voxtral connection management (connect, reconnect, message handling) into a separate class or module, e.g., `VoxtralConnection`. The main handler would create the connection object and wire up WebSocket events. This keeps the closure-based state but gives it a named container.

**Naming:**
- `ws` for both the client WebSocket and (implicitly) the Voxtral WebSocket is ambiguous. Use `clientWs` and `voxtralWs`.
- `audioBuffer` is clear.
- `pendingAudio` could be `queuedAudioChunks` for more precision.

**Comments:**
- The reconnection logic (how many retries, backoff strategy, what happens to buffered audio during reconnect) is complex and deserves a brief comment block.
- The audio chunking strategy (why audio is buffered and sent in specific ways) should be documented.

**Magic numbers:**
- Reconnect delay, buffer sizes, and timeout values should be named constants.

---

#### `js/meetings.js` -- 878 lines (FE -- Alice) [MEDIUM effort]

Meeting UI rendering and interaction.

**Function length & responsibility:**
- **Lines 310-470 `renderMeetingDetail()`**: ~160 lines building the expanded meeting view. Could split into `renderTranscript()`, `renderDecisions()`, `renderActionItems()`.
- **Lines 180-310 `renderMeetingCard()`**: ~130 lines. Reasonable, but the running-state branch adds complexity. Consider extracting `renderRunningMeetingCard()` vs `renderCompletedMeetingCard()`.

**Naming:**
- `AGENTS` and `AGENT_ROSTER` define the same data in two formats (object and array). Consolidate into one structure and derive the other, or rename to clarify: `AGENT_DETAILS` (the object) and `PARTICIPANT_LIST` (the array used for custom meeting grid).

**Comments:**
- The polling logic for running meetings (interval, how completion is detected) should have a comment.
- The custom meeting form validation (participant count, instructions requirement) could use a brief comment block.

---

### Tier 2: Medium Priority

These files have moderate readability issues that are worth addressing.

---

#### `server/src/routes/sessions.ts` -- 270 lines (BE -- Jonah) [MEDIUM effort]

**Function length:**
- **POST "/" handler (lines ~40-120)**: ~80 lines with 10 numbered comment steps. The numbered comments are excellent for readability. However, the function could be split after step 5 (validation complete, session created) into a `startSession()` helper that handles steps 6-10 (spawning the runner, emitting events, sending the response).

**Comments:**
- Already has good step-by-step comments. Add a one-liner at the function level: "Creates a new session for a project, spawns a CLI runner, and begins streaming events."

**Consistent patterns:**
- Error handling follows a consistent try/catch pattern across all route handlers -- good.

---

#### `server/src/routes/docs.ts` -- 288 lines (BE -- Jonah) [SMALL effort]

**Function length:**
- **GET "/docs" handler (lines ~30-150)**: ~120 lines that list files, read frontmatter, and build a response. Well-commented with clear variable names. Could extract `parseFrontmatter()` and `buildDocEntry()` helpers but the current inline approach is readable.

**Comments:**
- Good existing comments. No major gaps.

---

#### `server/src/meetings/context.ts` -- 129 lines (BE -- Jonah) [SMALL effort]

**Consistent patterns:**
- `loadAgentPersonalities()` (lines 61-80) and `loadAgentPersonalitiesForParticipants()` (lines 82-93) are nearly identical. The second is a filtered version of the first. Refactor: make `loadAgentPersonalities()` accept an optional `filterKeys` parameter, or have the participant version call the general version and filter the result.

**Magic numbers:**
- `2000` on line ~110 (truncation limit for recent docs) should be a named constant: `DOC_EXCERPT_MAX_CHARS = 2000`.

---

#### `server/src/meetings/claude-runner.ts` -- 112 lines (BE -- Jonah) [SMALL effort]

**Comments:**
- The JSON envelope unwrapping logic (lines ~60-90) where the function strips outer JSON structure to get the meeting content deserves a comment explaining the expected response format from Claude CLI.
- Two `child.on("close")` handlers are registered (lines 51 and 106). If this is intentional, add a comment. If the first is for cleanup and the second for resolution, clarify that.

---

#### `server/src/voice/extract.ts` -- 136 lines (BE -- Jonah) [SMALL effort]

**Consistent patterns:**
- Has its own `runClaude()` function that duplicates the pattern from `meetings/claude-runner.ts`. These are similar enough to note the relationship but different enough (different output parsing) that merging may not improve clarity. Add a comment: "Similar CLI invocation pattern as meetings/claude-runner.ts; kept separate because output parsing differs."

---

#### `server/src/store/projects.ts` -- 174 lines (BE -- Jonah) [SMALL effort]

**Naming:**
- `STATUS_ORDER` is a map from status string to sort priority number. The name is fine but add a comment: "Lower number = higher priority in the project list."
- `resolveCompletedAt()` is a well-named, focused helper -- good example to follow.

---

#### `server/src/store/meetings.ts` -- 139 lines (BE -- Jonah) [SMALL effort]

See cross-cutting issue 2.4. The three read functions should share a `readAllMeetings()` helper.

---

#### `server/src/session/recovery.ts` -- 65 lines (BE -- Jonah) [SMALL effort]

**Comments:**
- The function's purpose (recover orphaned sessions after server restart) is important context. Add a file-level comment.
- The nested for loop with try/catch could use a comment explaining what "orphaned" means in this context.

---

#### `js/portfolio.js` -- 491 lines (FE -- Alice) [SMALL effort]

Well-structured. Minor issues:
- Duplicated utilities (see cross-cutting 2.1).
- **Lines 200-320 `renderPortfolioDetail()`**: ~120 lines. Could split metrics rendering from task list rendering.
- `renderTaskItem()` and `renderTaskDetails()` are also duplicated in `tasks.js` (see below).

---

#### `js/docs.js` -- 335 lines (FE -- Alice) [SMALL effort]

Clean and well-organized. Minor issues:
- Duplicated utilities (see cross-cutting 2.1).
- The `marked` library configuration (lines ~20-40) could use a comment explaining the custom renderer overrides.

---

#### `js/roster.js` -- 333 lines (FE -- Alice) [SMALL effort]

Clean structure with good use of data-driven rendering. Minor issues:
- The activity grid date calculation logic (lines ~100-150) is complex. Add a comment block explaining the grid layout: "52 weeks x 7 days, most recent week on the right, with padding cells for partial weeks."
- `INTENSITY_LEVELS` array should have a comment explaining what the levels represent and the color scale.

---

#### `js/tasks.js` -- 190 lines (FE -- Alice) [SMALL effort]

**Consistent patterns:**
- `renderTaskItem()`, `renderTaskDetails()`, `hasDetails()`, and `formatStatus()` are duplicated from `portfolio.js`. Since both files are independent IIFEs, cross-file sharing is out of scope. Add comments noting the duplication.

**Comments:**
- A few places insert user-supplied data without HTML escaping (lines 78, 123, 138-139, 148-149). While this data comes from the server (not direct user input), adding `escapeHTML()` would be a defensive practice. Flag this for Alice's judgment -- it's borderline between readability and behavior change.

---

### Tier 3: Low Priority

These files are already clean or small enough that improvements are minimal.

---

#### `server/src/index.ts` -- 55 lines (BE -- Jonah) [TRIVIAL]

Clean entry point. One minor issue: duplicate SIGTERM/SIGINT handlers (identical logic). Could extract to a shared `gracefulShutdown()` function, but this is a single file with 55 lines so the duplication is negligible.

---

#### `server/src/kickoff.ts` -- 39 lines (BE -- Jonah) [TRIVIAL]

Clean. No issues.

---

#### `server/src/migrate.ts` -- 78 lines (BE -- Jonah) [TRIVIAL]

Clean migration script. Add a file-level comment: "One-time migration from legacy data format. Safe to run multiple times (idempotent)."

---

#### `server/src/session/manager.ts` -- 64 lines (BE -- Jonah) [TRIVIAL]

Clean singleton. No issues.

---

#### `server/src/session/runner.ts` -- 35 lines (BE -- Jonah) [TRIVIAL]

Factory and re-exports. Clean.

---

#### `server/src/session/streaming-runner.ts` -- 124 lines (BE -- Jonah) [TRIVIAL]

Clean. The spawn configuration is similar to `resume-runner.ts` but the shared logic is already in the base class. No action needed.

---

#### `server/src/session/resume-runner.ts` -- 88 lines (BE -- Jonah) [TRIVIAL]

Clean. Same note as streaming-runner.

---

#### `server/src/routes/projects.ts` -- 159 lines (BE -- Jonah) [TRIVIAL]

Clean route handlers. The `formatZodError` extraction (cross-cutting 2.3) is the only action item.

---

#### `server/src/routes/meetings.ts` -- 112 lines (BE -- Jonah) [SMALL]

The POST handler's validation chain (lines 42-72) is a sequence of guard clauses that's reasonably clear. Could extract custom meeting validation to a `validateCustomMeeting()` helper for the same reason the requirements doc cites: each function does one thing. Also extract `formatZodError` per cross-cutting 2.3.

---

#### `server/src/routes/voice.ts` -- 13 lines (BE -- Jonah) [TRIVIAL]

Thin routing file. No issues.

---

#### `server/src/voice/prompt.ts` -- 63 lines (BE -- Jonah) [TRIVIAL]

Clean prompt template. No issues.

---

#### `server/src/voice/health.ts` -- 59 lines (BE -- Jonah) [TRIVIAL]

Clean health check. No issues.

---

#### `server/src/schemas/project.ts` -- 54 lines (BE -- Jonah) [TRIVIAL]

Clean Zod schemas. No issues.

---

#### `server/src/schemas/session.ts` -- 56 lines (BE -- Jonah) [TRIVIAL]

Clean Zod schemas. No issues.

---

#### `server/src/schemas/meeting.ts` -- 164 lines (BE -- Jonah) [TRIVIAL]

Clean. The large `MeetingOutputJsonSchema` object is a data structure, not logic. Add a one-line comment: "JSON Schema passed to Claude CLI's --json-schema flag to enforce structured meeting output."

---

#### `server/src/store/sessions.ts` -- 98 lines (BE -- Jonah) [TRIVIAL]

Clean. No issues.

---

#### `server/src/meetings/runner.ts` -- 106 lines (BE -- Jonah) [SMALL]

The inline type assertion (lines 54-70) is a large block. Add a comment: "Type assertion bridges the Zod-validated meeting output with the storage format."

---

#### `server/src/meetings/recovery.ts` -- 31 lines (BE -- Jonah) [TRIVIAL]

Clean. No issues.

---

#### `css/tokens.css` -- 269 lines (FE -- Alice) [TRIVIAL]

Excellent organization with section headers and comments explaining RGB channel tokens. No changes needed.

---

#### `css/shared.css` -- 229 lines (FE -- Alice) [TRIVIAL]

Clean with section headers. No changes needed.

---

#### `css/docs.css` -- 569 lines (FE -- Alice) [TRIVIAL]

Well-organized with section headers. No changes needed.

---

#### `index.html` -- 495 lines (FE -- Alice) [TRIVIAL]

Clean, semantic HTML. Good use of ARIA attributes, landmark elements, and labeling. No changes needed.

---

#### `docs.html` -- 70 lines (FE -- Alice) [TRIVIAL]

Clean. No issues.

---

#### `scripts/run-meeting.ts` -- 91 lines (BE -- Jonah) [TRIVIAL]

Clean. Good file-level doc comment with usage examples. The magic number `180` (poll iterations) and `5000` (poll interval) could be named constants, but the inline comments already explain them.

---

#### `scripts/seed-memory.mjs` -- 672 lines (N/A -- skip) [SKIP]

This is a data-seeding script with large literal data arrays. Not a readability candidate -- the "code" is the data.

---

#### `scripts/split-tasks.mjs` -- 22 lines (N/A -- skip) [SKIP]

Tiny one-time migration script. No changes needed.

---

## 4. Prioritized Refactoring Order

The order below maximizes impact and respects dependencies. Alice and Jonah can work in parallel once they've both read this document.

### Jonah (BE) -- Server Files

| Order | File | Key Changes | Effort |
|-------|------|-------------|--------|
| 1 | Cross-cutting: `routes/utils.ts` | Create shared `formatZodError()`, import in `routes/projects.ts` and `routes/meetings.ts` | Small |
| 2 | `store/meetings.ts` | Extract `readAllMeetings()` private helper | Small |
| 3 | `session/base-runner.ts` | Extract `buildTurnSummary()`, `handleAssistantEvent()`, `determineFinalStatus()`. Name magic numbers. Add comments. | Large |
| 4 | `meetings/prompt.ts` | Add comments on personality parsing, JSON schema, conversation rules. Note agent data duplication. | Medium |
| 5 | `meetings/context.ts` | Merge duplicate `loadAgentPersonalities` functions. Name `DOC_EXCERPT_MAX_CHARS`. | Small |
| 6 | `voice/transcribe.ts` | Add comments on reconnection logic, clarify WebSocket variable names, name magic numbers. Consider extracting Voxtral connection management. | Medium |
| 7 | `routes/sessions.ts` | Add function-level comment on POST handler. Optionally extract `startSession()`. | Small |
| 8 | `meetings/claude-runner.ts` | Add comments on JSON envelope unwrapping and dual close handlers. | Small |
| 9 | `voice/extract.ts` | Add comment noting relationship to `claude-runner.ts` pattern. | Small |
| 10 | Remaining tier 2-3 files | File-level comments on `recovery.ts`, `migrate.ts`. Named constants where noted. | Small |

### Alice (FE) -- Landing Page Files

| Order | File | Key Changes | Effort |
|-------|------|-------------|--------|
| 1 | `projects.js` | Extract helpers from `appendSessionEvent()` and the click handler. Name magic numbers. Add comments on pipeline detection and event grouping. Rename ambiguous variables. | Large |
| 2 | `meetings.js` | Extract `renderTranscript()`, `renderDecisions()`, `renderActionItems()` from detail renderer. Consolidate `AGENTS`/`AGENT_ROSTER`. Add comments on polling. | Medium |
| 3 | `styles.css` | Add TOC comment at top. Add sub-section headers in Session Log and Meetings sections. Comment bare hex values. Comment `!important` usage. | Medium |
| 4 | `portfolio.js` | Add duplication comments on shared utilities. Consider extracting detail subsection renderers. | Small |
| 5 | `roster.js` | Add comment block on activity grid date logic. Comment `INTENSITY_LEVELS`. | Small |
| 6 | `docs.js` | Add duplication comments. Comment `marked` configuration. | Small |
| 7 | `tasks.js` | Add duplication comments. Evaluate missing HTML escaping. | Small |

---

## 5. Conventions

These conventions codify what "readable" means for this codebase. They should be the reference for all future work.

### 5.1 Naming

- **Variables and functions**: camelCase, descriptive. Prefer `sessionTimeout` over `timeout`, `projectCount` over `count`.
- **Constants**: UPPER_SNAKE_CASE for true constants (timeouts, limits, configuration). camelCase for computed-once values that feel like variables.
- **Booleans**: Prefix with `is`, `has`, `should`, `can` -- e.g., `isRunning`, `hasCompleted`, `shouldReconnect`. Avoid bare adjectives (`running`, `done`).
- **Event handlers**: Prefix with `handle` or `on` -- e.g., `handleClick`, `onProcessClose`.
- **Builder functions**: Prefix with `build` or `render` -- e.g., `buildPrompt`, `renderProjectCard`.
- **Abbreviations**: Only universally understood ones: `id`, `url`, `req`, `res`, `err`, `el` (DOM element), `ws` (WebSocket, but qualify if ambiguous: `clientWs`, `voxtralWs`).
- **No Hungarian notation**: Don't prefix types (`strName`, `arrItems`). TypeScript and JSDoc handle types.

### 5.2 Function Size

- **Target**: Functions should be under 40 lines. This is a guideline, not a hard rule.
- **When to extract**: If a function has distinct logical phases separated by blank lines or section comments, those phases are extraction candidates.
- **Deeply nested logic**: 3+ levels of `if`/`for`/`try` is a signal to use early returns, guard clauses, or helper extraction.
- **Exception**: Template-literal rendering functions in vanilla JS may exceed 40 lines because the template itself is long. That is acceptable if the function does only one thing (render a component).

### 5.3 Comments

- **Why, not what**: `// Retry with exponential backoff to handle transient Voxtral failures` is good. `// Set retries to 3` is noise.
- **File-level**: Every file should have a brief comment (1-2 lines) explaining the module's responsibility, unless the filename makes it completely obvious.
- **Non-obvious logic**: If you'd need to read 5+ lines of code to understand what a block does, it needs a comment.
- **Duplication markers**: When identical code exists in multiple files (especially across JS IIFEs), add a comment: `// Shared utility -- also in {file1}, {file2}`.
- **No stale comments**: If you change logic, update or remove the comment above it.
- **Public exports**: Exported functions and types should have a one-line JSDoc or comment describing their purpose.

### 5.4 Magic Numbers & Strings

- **Named constants for**:
  - Timeouts: `SESSION_TIMEOUT_MS`, `HEARTBEAT_INTERVAL_MS`, `TOAST_DURATION_MS`
  - Limits: `MAX_EVENTS`, `MAX_RENDERED_EVENTS`, `DOC_EXCERPT_MAX_CHARS`
  - Thresholds: `SCROLL_LOCK_THRESHOLD`, `MIN_PARTICIPANTS`, `MAX_PARTICIPANTS`
- **Acceptable inline**: `0`, `1`, `-1` in obvious contexts (array indexing, boolean-like). Small CSS-related values in JS (`8`, `50px`). HTTP status codes (`200`, `404`, `500`).
- **Placement**: File-level constants at the top of the file/IIFE, after imports.

### 5.5 File Organization

**TypeScript files:**
1. Imports (stdlib, external, internal -- with blank lines between groups)
2. Constants and types
3. Helper functions (private/unexported)
4. Main exported functions/classes
5. Default export (if applicable)

**Vanilla JS files (IIFEs):**
1. `'use strict';`
2. Constants (named config values, registries)
3. State variables (grouped by concern with section comments)
4. Utility functions (escapeHTML, formatDate, etc.)
5. Rendering functions
6. Event handlers and interaction logic
7. Initialization / `DOMContentLoaded` setup

**CSS files:**
1. File-level comment explaining what this stylesheet covers
2. Table of contents (for files over 500 lines)
3. Sections separated by `/* === Section Name === */` headers
4. Within each section: base styles, then modifiers/variants, then responsive breakpoints
5. `prefers-reduced-motion` at the end

### 5.6 Error Handling (Server)

- Route handlers: try/catch at the top level. `ZodError` gets a 400 with `formatZodError()`. Unknown errors get a 500 with a generic message. Always `console.error` the original error.
- Store functions: Let errors propagate (don't catch and re-throw). The route handler catches them.
- Background processes (meetings, sessions): catch at the top level with `console.error`. Don't crash the server.

### 5.7 CSS Conventions

- Use design tokens (`var(--color-*)`, `var(--space-*)`, `var(--text-*)`) for all values. Bare hex/rgba only with a comment explaining why.
- BEM-like naming: `block__element--modifier`. Double underscores for elements, double dashes for modifiers.
- No `!important` without a comment explaining why it's needed.
- Section headers: `/* === Section Name === */` for major sections, `/* --- Sub-section --- */` for subsections within.
- Responsive breakpoints: immediately after the section they modify, not in a separate "responsive" section at the bottom.

---

## 6. Constraints Reminder

1. **Zero behavior changes.** Every refactoring must produce identical results.
2. **No renames of exported symbols.** Internal variables and helpers are fair game.
3. **No file moves or directory restructuring.** Exception: creating `server/src/routes/utils.ts` to house extracted shared utilities is acceptable because it's a new file, not a move.
4. **No new dependencies.**
5. **CSS changes are comments/organization only.** No class name changes, no selector restructuring.
6. **Vanilla JS stays vanilla.** No modules, no bundlers.
7. **One commit per file or logical group.** Descriptive commit messages.

---

## 7. Effort Summary

| Assignee | Tier 1 (Large) | Tier 1 (Medium) | Tier 2 | Tier 3 | Total files |
|----------|---------------|-----------------|--------|--------|-------------|
| Jonah (BE) | `base-runner.ts` | `prompt.ts`, `transcribe.ts` | 7 files | 14 files | 24 files |
| Alice (FE) | `projects.js` | `meetings.js`, `styles.css` | 4 files | 5 files | 12 files |

Estimated total: Jonah ~4-6 hours, Alice ~4-6 hours working in parallel.
