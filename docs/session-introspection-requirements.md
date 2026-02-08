# Session Introspection Requirements

## Problem

Two problems, layered:

**Problem 1 (UI — solved in Phase 1):** The session log UI showed raw Claude CLI events. Users couldn't tell which agent was active, what phase the project was in, or what was happening. Phase 1 (agent banners, event grouping, styled message cards) shipped and addressed this.

**Problem 2 (Architecture — this phase):** The session runner uses `claude -p` (pipe mode), which is **single-turn**. The runner writes the prompt to stdin, immediately closes stdin (`child.stdin.end()`), and Claude processes one turn then exits. This means:

- The leader agent spawns a teammate (e.g., Thomas via `Task` tool call)
- The teammate starts working as a subprocess of the Claude process
- But the leader's single turn completes and the process exits — often before teammates finish
- Real session data proves this: in the logo project session, the process completed at 39s (event #17) while Thomas was still working. The runner then restarted a new process that tried to clean up, but the work was lost.

The team orchestration that the Phase 1 UI now visualizes **can't actually happen** under the current architecture. The runner needs to support multi-turn conversations where the leader can spawn teammates, wait for them, receive their output, spawn more teammates, and so on — all within a single continuous session.

## Goals

1. **Multi-turn session runner** — keep the Claude process alive across multiple turns so the leader can orchestrate a full team pipeline (spawn PM, wait, spawn Arch, wait, spawn FE+BE, wait, spawn QA, done)
2. **Message delivery** — when a teammate completes work and sends a message back, the leader receives it and can act on it in the next turn
3. **Graceful lifecycle** — sessions start, run through multiple agent turns, and end cleanly when the leader determines work is complete
4. **Preserve existing UI** — Phase 1 UI work (agent banners, event grouping, etc.) continues to work. The event stream format stays compatible.
5. **Research-driven approach** — investigate existing tools, CLIs, and patterns before building. Don't reinvent what already exists.

## Non-Goals

- Building a custom agent framework (we use Claude Code's built-in team features)
- Changing the Claude CLI itself
- Real-time user chat with agents during a session (future project)
- Multi-session orchestration (running multiple projects simultaneously is a separate concern)

---

## The Core Technical Challenge

The `claude` CLI has two relevant modes:

1. **`claude -p` (pipe mode):** Read prompt from stdin, process one turn, output to stdout, exit. This is what we use today. Single-turn by design.

2. **`claude` (interactive mode):** Multi-turn REPL. Keeps the process alive, accepts follow-up messages. But it's designed for terminal interaction, not programmatic control.

The question is: **How do we get multi-turn behavior with programmatic (non-interactive) control?**

Possible approaches (for Marco and Andrei to evaluate):

### Approach A: Keep stdin open, send follow-up messages

Instead of `child.stdin.end()` after the initial prompt, keep stdin open. When a teammate completes and the leader needs a follow-up turn, write the next message to stdin. This requires understanding whether `claude -p` supports this — does it read multiple messages from stdin if we don't close it? Or does it wait for EOF?

### Approach B: Use `claude` in interactive/conversational mode with stream-json

The CLI may support `--output-format stream-json` in interactive mode, giving us NDJSON events while also accepting follow-up input. We'd need to:
- Parse the NDJSON output stream (already done)
- Detect when Claude is waiting for input (end of a turn)
- Write the next message to stdin
- Handle the conversation lifecycle programmatically

### Approach C: Use the Claude Code SDK/API directly

Instead of spawning the CLI as a subprocess, use whatever SDK or API Claude Code exposes for programmatic multi-turn conversations. This might be more reliable than parsing CLI behavior but is a bigger architectural change.

### Approach D: Chained single-turn sessions with conversation resume

Keep using `claude -p` but chain sessions together. After each turn completes:
- Capture the conversation state / session ID
- Start a new `claude -p` process with `--resume` or conversation context
- Feed in the teammate's output as the next prompt
- Repeat until the leader signals completion

This is the least invasive change but may lose context between turns.

### Approach E: Use the MCP (Model Context Protocol) server pattern

Run Claude as an MCP client that connects to our server as an MCP server. We control the conversation loop from the server side. This inverts the control flow — instead of us spawning Claude, Claude connects to us.

---

## Research Questions for Marco

Marco should investigate these specific questions and produce `docs/session-runner-research.md`:

1. **Claude CLI multi-turn capabilities:** Does `claude -p` support receiving multiple messages on stdin without closing it? What happens if you write a second message after the first turn completes? Is there a `--conversation` or `--session` flag that enables multi-turn pipe mode?

2. **Claude CLI `--resume` flag:** Can you resume a previous conversation? How does session state persist? Can we chain single-turn calls with `--resume` to simulate multi-turn?

3. **Stream-JSON in interactive mode:** Does `--output-format stream-json` work in interactive (non-pipe) mode? If so, what does the input/output protocol look like? How do we detect "waiting for input" in the stream?

4. **Claude Code SDK:** Is there a Node.js SDK or programmatic API for Claude Code (not just the Anthropic API — specifically Claude Code with tool use, agent teams, etc.)? What does its interface look like?

5. **Agent team lifecycle with `claude -p`:** When teams are created (`TeamCreate`) and agents spawned (`Task`), do those agents run as subprocesses? What happens to them when the parent `claude -p` process exits? Can they outlive the parent?

6. **Open source patterns:** Are there existing open-source tools or wrappers that solve the "programmatic multi-turn Claude CLI" problem? Look at GitHub repos, npm packages, or community solutions.

7. **MCP server pattern:** Could we run our Express server as an MCP server that Claude connects to? What would that architecture look like? Is there prior art?

## Architecture Questions for Andrei

After Marco's research, Andrei designs the approach and writes `docs/session-runner-tech-approach.md`:

1. **Which approach (A-E or other) is best** given Marco's findings? Evaluate on: reliability, complexity, compatibility with existing code, future extensibility.

2. **Turn detection:** How do we know when Claude has finished a turn and is ready for input? What's the signal in the stream?

3. **Message routing:** When a teammate sends a message back (via `SendMessage`), how does it reach the leader in the next turn? Who writes it to stdin?

4. **Session lifecycle:** What are the states? (starting -> running -> waiting_for_input -> processing -> waiting_for_input -> ... -> completed). How do we handle timeouts per-turn vs per-session?

5. **Event stream compatibility:** The SSE event stream to the frontend must remain compatible. Agent banners, event grouping, message cards all depend on the current event format. Any changes must be additive.

6. **Error handling:** What happens if a teammate crashes? If the leader hangs? If a turn times out? How do we recover or report gracefully?

7. **Runner refactor scope:** How much of `SessionRunner` needs to change? Can we extend it, or does it need a rewrite? What about `SessionManager`?

## Implementation Validation for Jonah

After Andrei's tech approach, Jonah reviews from a backend implementation perspective and either validates or raises concerns:

1. **Feasibility check:** Can the chosen approach actually be implemented with Node.js child_process? Are there gotchas with stdin/stdout buffering, readline parsing, or process lifecycle?

2. **Backpressure and buffering:** If we keep stdin open and write messages, what happens if Claude is still processing? Do we need a queue?

3. **Process management:** SIGTERM/SIGKILL handling, zombie processes, orphaned teammate subprocesses. How do we ensure clean shutdown?

4. **Testing strategy:** How do we test a multi-turn runner? Mock the Claude process? Use actual CLI in a test environment?

---

## Acceptance Criteria (Phase 2: Multi-Turn Session Runner)

- [ ] A session can run multiple turns — leader spawns agents, waits for their output, acts on it, spawns more agents
- [ ] Teammate messages are delivered back to the leader and trigger follow-up turns
- [ ] The full pipeline (PM -> Arch -> Designer -> FE/BE -> QA) can execute within a single session
- [ ] Session events stream to the frontend via SSE throughout the entire multi-turn conversation
- [ ] Phase 1 UI features (agent banners, event grouping, message cards) continue to work
- [ ] Sessions time out gracefully (per-turn and per-session timeouts)
- [ ] Sessions can be stopped by the user at any point
- [ ] Failed teammate processes don't crash the entire session
- [ ] Session event logs capture the full multi-turn conversation

---

## Team Plan

| Order | Agent | Task | Blocked By |
|-------|-------|------|------------|
| 1 | Thomas (PM) | Requirements (this doc) | -- |
| 2 | Marco (Tech Researcher) | Research Claude CLI multi-turn patterns | Thomas |
| 3 | Andrei (Arch) | Design session runner architecture | Thomas, Marco |
| 4 | Jonah (BE) | Validate and implement | Thomas, Marco, Andrei |
| 5 | Enzo (QA) | Validate multi-turn sessions work end-to-end | Jonah |

Note: Alice (FE) is not needed for this phase — the event stream format stays compatible, so the frontend doesn't change. Robert (Designer) is not needed — no new UI components.

---

## What's In Scope

- Researching Claude CLI multi-turn capabilities and open-source patterns
- Designing and implementing a multi-turn session runner
- Turn detection and message routing
- Session lifecycle management (start, multi-turn, timeout, stop, complete)
- Maintaining SSE event stream compatibility

## What's Deferred

- Phase 2 UI features (phase progression, team dashboard) — depends on multi-turn working first
- Phase 3 deliverables sidebar
- User-to-agent messaging during sessions
- Multi-project concurrent sessions
- Conversation history/context management across sessions

---

## History

- **Phase 1 (completed):** Agent awareness + smart event grouping in the session log UI. Agent banners with avatars, SendMessage styled cards, Read/Glob/Grep grouping. Frontend-only changes.
- **Phase 2 (this phase):** Multi-turn session runner re-architecture. Research-driven approach with Marco, Andrei, and Jonah.
