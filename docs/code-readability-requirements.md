# Code Readability Pass — Requirements

**Author:** Thomas (PM)
**Date:** Feb 9, 2026
**Status:** Approved

---

## 1. Executive Summary

A focused code quality pass across the TeamHQ codebase — server, landing page JS/CSS, scripts, and data schemas. The goal is to make every file easier to read, understand, and modify. This is a readability-only effort: no new features, no architecture changes, no behavior changes.

---

## 2. Background & Motivation

TeamHQ has shipped 5+ projects in rapid succession. The codebase works well, but fast iteration has left readability debt: inconsistent naming, long functions that do too many things, missing comments on non-obvious logic, and scattered patterns that could be consolidated. The CEO has prioritized making the code easier to read as the next focus area.

This matters because every future project — and every agent that touches this code — moves faster when the code communicates its intent clearly.

---

## 3. One-Sentence Summary

Make every file in the TeamHQ codebase easier to read through better naming, shorter functions, consistent patterns, and targeted comments.

---

## 4. Scope

### 4.1 What's In Scope

**Server TypeScript** (`server/src/`) — 28 files, ~3,700 lines total:
| Area | Files | Largest | Notes |
|------|-------|---------|-------|
| Session runners | `session/base-runner.ts` (507), `runner.ts`, `streaming-runner.ts`, `resume-runner.ts`, `manager.ts`, `recovery.ts` | `base-runner.ts` (507 lines) | Most complex area — streaming, process management, state machines |
| Routes | `routes/sessions.ts` (270), `routes/docs.ts` (288), `routes/projects.ts` (159), `routes/meetings.ts`, `routes/voice.ts` | `routes/docs.ts` (288 lines) | Express route handlers |
| Meetings | `meetings/prompt.ts` (313), `meetings/runner.ts`, `meetings/context.ts`, `meetings/recovery.ts`, `meetings/claude-runner.ts` | `meetings/prompt.ts` (313 lines) | Prompt building, meeting orchestration |
| Voice | `voice/transcribe.ts` (264), `voice/extract.ts` (136), `voice/prompt.ts`, `voice/health.ts` | `voice/transcribe.ts` (264 lines) | WebSocket handling, audio processing |
| Schemas | `schemas/project.ts`, `schemas/session.ts`, `schemas/meeting.ts` (164) | `schemas/meeting.ts` (164 lines) | Zod schemas and types |
| Stores | `store/projects.ts` (174), `store/sessions.ts`, `store/meetings.ts` (139) | `store/projects.ts` (174 lines) | JSON file read/write |
| Entry points | `index.ts`, `kickoff.ts`, `migrate.ts` | — | Server startup, migration |

**Landing page JavaScript** (`js/`) — 6 files, ~5,000 lines total:
| File | Lines | What it does |
|------|-------|-------------|
| `projects.js` | 2,796 | Project CRUD, expand/collapse, kickoff modal, session log, pipeline progress |
| `meetings.js` | 878 | Meeting cards, run buttons, custom meeting creation |
| `portfolio.js` | 491 | Portfolio/tools section rendering |
| `docs.js` | 335 | Doc list, reading view, markdown rendering |
| `roster.js` | 333 | Team roster grid |
| `tasks.js` | 190 | Task item expand/collapse |

**Landing page CSS** (`css/`) — 4 files, ~5,950 lines total:
| File | Lines | Notes |
|------|-------|-------|
| `styles.css` | 4,889 | Main landing page — largest file in the repo |
| `docs.css` | 569 | Docs page styles |
| `tokens.css` | 269 | Design tokens |
| `shared.css` | 229 | Nav, footer, shared components |

**HTML** — `index.html` (495 lines), `docs.html` (70 lines)

**Scripts** (`scripts/`) — `run-meeting.ts`, `seed-memory.mjs`, `split-tasks.mjs`

### 4.2 What's Out of Scope

- **New features** — zero. This pass changes no user-visible behavior.
- **Architecture changes** — no restructuring directories, moving files between modules, changing the data layer, or altering API contracts.
- **Behavior changes** — every click, form submission, API call, and WebSocket message must work identically after this pass.
- **Product code in separate repos** — `ost-tool/`, `sherlockpdf/`, `pdf-combiner/`, `pdf-splitter/` are separate products; they're not part of this pass.
- **Mobile app** (`mobile/`) — separate codebase, separate concerns.
- **Agent definitions** (`.claude/agents/`) — these are prompt documents, not application code. Readability standards don't apply the same way.
- **Data files** (`data/`) — JSON data files are generated, not hand-authored code.
- **Skills docs** (`skills/`) — reference documents, not code.
- **`node_modules`** — obviously.
- **CSS refactoring beyond comments/organization** — CSS readability improvements (section headers, grouping, dead code removal) are in scope, but changing class names or restructuring selectors is out of scope because it risks visual regressions.

### 4.3 What's Deferred

- **Automated linting/formatting** (ESLint, Prettier config) — a good follow-up project but a separate scope. This pass is about human-readable clarity, not tool-enforced formatting.
- **TypeScript strict mode** — would surface more issues but is an architecture-level change.
- **Unit tests** — test coverage is a separate initiative. Readability makes testing easier, but adding tests is out of scope here.

---

## 5. Readability Dimensions

The audit and refactoring should evaluate every in-scope file against these five dimensions:

### 5.1 Naming Clarity
- Variables, functions, and parameters have descriptive names that communicate intent
- Abbreviations are avoided unless universally understood (`id`, `url`, `req`, `res`)
- Boolean variables/parameters read as questions (`isRunning`, `hasCompleted`, not `running`, `done`)
- Consistent naming conventions within each file and across similar files

### 5.2 Function Length & Responsibility
- Functions do one thing and their name says what that thing is
- Long functions (>40 lines) are candidates for extraction — especially when they contain distinct logical phases separated by blank lines or comments
- Deeply nested logic (3+ levels of if/for/try) is flattened via early returns, guard clauses, or helper extraction
- No "god functions" that handle multiple unrelated concerns

### 5.3 Consistent Patterns
- Similar operations across files use the same approach (e.g., error handling in route handlers, file I/O in stores, event emission in runners)
- Magic numbers and strings are named constants
- Repeated code blocks are candidates for shared helpers (but only if extraction genuinely improves clarity — don't over-abstract)

### 5.4 Comments & Documentation
- Non-obvious logic gets a brief comment explaining *why*, not *what*
- Public functions/exports have a one-line description of purpose
- Complex algorithms, regex patterns, or business rules are annotated
- Stale or misleading comments are removed
- File-level comments explaining the module's responsibility where it isn't obvious from the filename
- No comment noise — don't add comments that restate the code (`// increment counter` above `counter++`)

### 5.5 File Organization
- Imports are grouped logically (stdlib, external, internal)
- Constants and types are defined before the functions that use them
- Related functions are grouped together
- Exports are easy to find (bottom of file, or clearly marked)
- CSS files have clear section headers for logical groups

---

## 6. Prioritization Criteria

Not all files need the same level of attention. Andrei's audit should prioritize by:

1. **Complexity** — files with the most complex logic get the most benefit from readability improvements. The session runners and meeting prompt builder are likely the highest-complexity areas.
2. **Size** — larger files have more surface area for confusion. `projects.js` (2,796 lines), `styles.css` (4,889 lines), and `base-runner.ts` (507 lines) are the largest.
3. **Frequency of change** — files that get modified often by multiple agents benefit most from being easy to read. Route handlers and store files are touched on nearly every project.
4. **Onboarding impact** — files that a new team member (agent) would read first to understand the system. `index.ts`, schemas, and store files are the system's "table of contents."

---

## 7. Constraints

1. **Zero behavior changes.** Every API endpoint, every UI interaction, every WebSocket message, every file I/O operation must produce identical results. If a refactoring is risky to behavior, skip it.
2. **No renames of exported symbols.** Renaming internal variables is fine. Renaming exported functions, types, or route paths would break consumers and is out of scope.
3. **No file moves or directory restructuring.** Files stay where they are. Internal organization within a file is fair game.
4. **No new dependencies.** This is a code-only pass.
5. **Preserve git blame utility.** Where possible, make changes in focused commits so that `git blame` remains useful. One commit per file or per logical group, not one giant commit.
6. **CSS changes are comments/organization only.** Adding section headers, grouping related rules, and removing dead selectors is fine. Changing class names, reordering properties, or restructuring selectors risks visual regressions and is out of scope.
7. **Vanilla JS stays vanilla.** The landing page JS is intentionally framework-free. Don't introduce modules, bundlers, or transpilation. Readability improvements must work within the IIFE/vanilla pattern.

---

## 8. Deliverables

### 8.1 Readability Audit (Andrei)
- `docs/code-readability-tech-approach.md` containing:
  - File-by-file audit findings organized by priority tier
  - Specific issues with line references
  - Recommended changes for each file
  - Estimated effort per file (small/medium/large)
  - A prioritized refactoring order

### 8.2 Style & Conventions Doc (Andrei, as part of tech approach)
- A "Conventions" section in the tech approach that codifies:
  - Naming conventions for the codebase
  - Function size guidelines
  - Comment standards
  - File organization patterns
  - These become the reference for all future work

### 8.3 Refactoring (Alice FE, Jonah BE)
- Alice refactors the landing page files (`js/`, `css/`, HTML) per audit findings
- Jonah refactors the server files (`server/src/`) per audit findings
- Each file refactored in its own commit with a clear message

---

## 9. Pipeline

1. **Andrei (Arch)** — reads this doc, audits the codebase, writes `docs/code-readability-tech-approach.md` with findings and the conventions section
2. **Alice (FE)** — refactors landing page files per Andrei's prioritized list (blocked by step 1)
3. **Jonah (BE)** — refactors server files per Andrei's prioritized list (blocked by step 1)
4. **Robert (Designer)** — lightweight visual check that CSS comment/organization changes didn't break anything visible (blocked by step 2)
5. **Enzo (QA)** — verifies zero behavior regression: all pages load, all API endpoints respond, all interactions work (blocked by steps 2-3)

Alice and Jonah can work in parallel once Andrei's audit is done.

---

## 10. Acceptance Criteria

### Audit Phase (Andrei)
- [ ] Every in-scope file has been reviewed against the 5 readability dimensions
- [ ] Findings are documented with specific line references and concrete recommendations
- [ ] Files are prioritized into tiers (high/medium/low impact)
- [ ] A conventions section codifies naming, function size, comment, and organization standards
- [ ] Tech approach doc is written to `docs/code-readability-tech-approach.md`

### Refactoring Phase — Server (Jonah)
- [ ] All high-priority server files are refactored per audit recommendations
- [ ] Long functions are broken into focused helpers where identified
- [ ] Non-obvious logic has explanatory comments
- [ ] Magic numbers/strings are named constants
- [ ] Naming inconsistencies are resolved
- [ ] All existing TypeScript compilation passes (`tsc --noEmit`)
- [ ] Server starts and all API endpoints respond correctly

### Refactoring Phase — Frontend (Alice)
- [ ] All high-priority JS files are refactored per audit recommendations
- [ ] Long functions are broken into focused helpers where identified
- [ ] Non-obvious logic has explanatory comments
- [ ] Magic numbers/strings are named constants
- [ ] CSS files have clear section headers and logical grouping
- [ ] Dead CSS selectors are removed (if any identified)
- [ ] All pages load correctly with no console errors

### QA (Enzo)
- [ ] Landing page: all sections render, all interactions work (expand/collapse, modals, forms, kickoff, session log)
- [ ] Docs page: list view, reading view, markdown rendering all work
- [ ] Meetings: charter, weekly, and custom meetings can be started and display results
- [ ] Projects: CRUD operations, status changes, session management all work
- [ ] API: all endpoints return expected responses (spot-check, not exhaustive)
- [ ] No visual regressions on any page
- [ ] Zero new console errors or warnings

---

## 11. Risks

1. **Behavior regressions from function extraction.** Extracting helper functions can introduce subtle bugs if variable scope or `this` binding changes. Mitigation: Jonah and Alice test each file after refactoring; Enzo does a full pass at the end.
2. **CSS dead code removal breaks something.** A selector that looks unused might be dynamically added by JS. Mitigation: only remove selectors that grep confirms are not referenced anywhere in JS or HTML.
3. **Large diff obscures future git blame.** Mitigation: one commit per file or logical group, with descriptive commit messages.
4. **Scope creep into "while I'm here" improvements.** Mitigation: strict adherence to readability-only changes. If someone finds a bug or wants to add a feature, file it separately — don't mix it into this pass.
5. **Vanilla JS refactoring limitations.** Without modules or a bundler, some patterns (like extracting shared utilities across JS files) aren't available. Mitigation: keep helpers file-local within each IIFE. Cross-file sharing is an architecture change and out of scope.
