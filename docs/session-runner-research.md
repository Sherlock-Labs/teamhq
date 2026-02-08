# Session Runner Research: Multi-Turn Architecture

**Researcher:** Marco (Technical Researcher)
**Date:** 2026-02-07
**Status:** Complete

## Executive Summary

Our current session runner uses `claude -p` (single-turn pipe mode), which writes the prompt to stdin, closes stdin, and waits for the process to exit. This is fundamentally incompatible with multi-turn agent teams: the leader spawns teammates, but the session ends before teammates can finish and report back.

Three viable options exist to replace this architecture, ordered by recommendation:

1. **Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)** — the official TypeScript/Python SDK that provides programmatic, multi-turn, streaming access to the Claude Code agent loop. This is the clear winner.
2. **CLI streaming input mode** (`--input-format stream-json`) — a CLI-level protocol for sending multiple JSON messages over stdin. Works but has known issues and is lower-level than the SDK.
3. **Session resume pattern** (`claude -p --resume <id>`) — uses sequential single-turn calls with session persistence. Simple but adds latency per turn and doesn't support real-time teammate message routing.

**Recommendation: Option 1 (Agent SDK)**. It was purpose-built for exactly our use case, provides native multi-turn sessions, streaming events, and handles the agent orchestration loop internally.

---

## Current Architecture Analysis

### What We Have

```
server/src/session/runner.ts  — SessionRunner class
server/src/session/manager.ts — Concurrency control (max 3 sessions)
server/src/session/recovery.ts — Orphaned session cleanup on restart
server/src/routes/sessions.ts — REST + SSE endpoint
server/src/kickoff.ts         — Prompt generation
```

### How It Works Today

1. `POST /api/projects/:id/sessions` creates a session
2. `SessionRunner.start()` spawns `claude -p --verbose --output-format stream-json --include-partial-messages --dangerously-skip-permissions`
3. The kickoff prompt is written to `child.stdin`, then **`child.stdin.end()` is called** — this is the core limitation
4. Claude's NDJSON stdout is parsed line-by-line into `SessionEvent` objects
5. Events are appended to an NDJSON file and emitted via EventEmitter
6. SSE endpoint (`GET /:sessionId/events`) subscribes to the EventEmitter for live streaming and replays from the NDJSON file for reconnection
7. On process exit, metadata is finalized

### Why This Breaks for Multi-Turn

- `stdin.end()` signals EOF — Claude processes the single prompt and exits
- No way to send follow-up messages (teammate reports, user instructions)
- The `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` env var is set, but agent teams require a long-lived session where messages can arrive over time
- The leader spawns teammates, but the session completes before it can receive their responses

---

## Option 1: Claude Agent SDK (Recommended)

### What It Is

The `@anthropic-ai/claude-agent-sdk` npm package (formerly `@anthropic-ai/claude-code`) provides the same agent loop, tools, and context management that power the Claude Code CLI, as a programmable TypeScript library.

**Source:** [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)

### Key API: `query()` with Streaming Input

The SDK's `query()` function accepts either a string prompt (single-turn) or an `AsyncIterable<SDKUserMessage>` (multi-turn streaming). The streaming input mode is the recommended approach:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Multi-turn: pass an async generator that yields messages over time
async function* messageStream() {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Start the project"
    }
  };

  // Wait for external event (teammate message, user input, etc.)
  const nextMessage = await waitForTeammateReport();

  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: nextMessage
    }
  };
}

for await (const message of query({
  prompt: messageStream(),
  options: {
    allowedTools: ["Read", "Edit", "Bash", "Task"],
    permissionMode: "bypassPermissions",
    settingSources: ["project"],
    systemPrompt: { type: "preset", preset: "claude_code" }
  }
})) {
  // Stream events to SSE clients
  emitToSSE(message);
}
```

**Source:** [Streaming Input docs](https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)

### Key API: Sessions (Resume/Fork)

The SDK automatically creates sessions and exposes session IDs. You can resume or fork sessions:

```typescript
let sessionId: string;

// First query captures session ID
for await (const msg of query({ prompt: "Start work", options: {} })) {
  if (msg.type === "system" && msg.subtype === "init") {
    sessionId = msg.session_id;
  }
}

// Resume with full context
for await (const msg of query({
  prompt: "Continue where we left off",
  options: { resume: sessionId }
})) {
  // ...
}
```

**Source:** [Session Management docs](https://platform.claude.com/docs/en/agent-sdk/sessions)

### V2 Interface (Preview)

A simplified V2 API is in preview with explicit `send()`/`stream()` separation:

```typescript
import { unstable_v2_createSession } from "@anthropic-ai/claude-agent-sdk";

const session = unstable_v2_createSession({ model: "claude-opus-4-6" });

await session.send("Start the project");
for await (const msg of session.stream()) {
  // Process responses
}

// Later: send another message to the same session
await session.send("Teammate report: authentication module complete");
for await (const msg of session.stream()) {
  // Process responses
}

session.close();
```

**Source:** [TypeScript V2 Preview](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview)

### Message Types

The SDK emits typed messages via the async iterator:

| Type | Description |
|------|-------------|
| `system` (subtype: `init`) | Session initialized, contains `session_id`, `tools`, `model` |
| `assistant` | Claude's response with `message.content` blocks (text, tool_use) |
| `stream_event` | Partial streaming delta (when `includePartialMessages: true`) |
| `user` | Replayed user message |
| `result` | Final result with `duration_ms`, `total_cost_usd`, `usage`, `result` text |

Each message includes `session_id`, `uuid`, and `parent_tool_use_id` (for subagent tracking).

**Source:** [TypeScript SDK Reference](https://platform.claude.com/docs/en/agent-sdk/typescript)

### Full Options Available

Key options relevant to our use case:

| Option | Type | Purpose |
|--------|------|---------|
| `allowedTools` | `string[]` | Tools Claude can use without permission |
| `agents` | `Record<string, AgentDefinition>` | Define custom subagents programmatically |
| `permissionMode` | `PermissionMode` | `"bypassPermissions"` for automation |
| `cwd` | `string` | Working directory |
| `env` | `Dict<string>` | Environment variables |
| `maxTurns` | `number` | Limit conversation turns |
| `maxBudgetUsd` | `number` | Cost cap |
| `includePartialMessages` | `boolean` | Stream token-by-token |
| `resume` | `string` | Session ID to resume |
| `forkSession` | `boolean` | Branch from a resumed session |
| `hooks` | `Record<HookEvent, ...>` | Lifecycle callbacks |
| `mcpServers` | `Record<string, McpServerConfig>` | MCP server connections |
| `settingSources` | `SettingSource[]` | Load CLAUDE.md, project settings |
| `systemPrompt` | `string \| preset` | Custom or Claude Code system prompt |
| `abortController` | `AbortController` | Cancel operations |

### Subagent Support

The SDK natively supports subagents (which is how agent teams are implemented under the hood). You can define agents programmatically:

```typescript
const result = query({
  prompt: "Build a feature",
  options: {
    allowedTools: ["Read", "Edit", "Bash", "Task"],
    agents: {
      "fe-developer": {
        description: "Frontend developer",
        prompt: "You are a frontend developer...",
        tools: ["Read", "Edit", "Bash"],
        model: "sonnet"
      }
    }
  }
});
```

Messages from subagents include `parent_tool_use_id` for tracking.

### Pros

- **Purpose-built for our use case** — multi-turn, streaming, programmatic agent control
- **No process management** — no spawning/killing child processes, no stdin/stdout parsing
- **Native session management** — resume, fork, session IDs built in
- **Typed messages** — `SDKMessage` union type gives us structured events
- **Subagent tracking** — `parent_tool_use_id` lets us attribute work to specific agents
- **Hooks** — `PostToolUse`, `SessionStart`, `SessionEnd` etc. for lifecycle events
- **AbortController** — clean cancellation without SIGTERM/SIGKILL
- **CLAUDE.md support** — `settingSources: ["project"]` loads project config
- **Cost tracking** — `total_cost_usd` and per-model usage in result messages
- **V2 preview** — even simpler `send()`/`stream()` pattern coming

### Cons

- **Requires `ANTHROPIC_API_KEY`** — the SDK uses API keys, not Claude Code's subscription auth. Users currently running under a Claude subscription would need an API key.
- **Dependency on Anthropic's package** — adds `@anthropic-ai/claude-agent-sdk` as a production dependency
- **V2 is unstable** — the simpler API is still in preview; V1's async generator pattern is more complex
- **New integration** — requires rewriting `SessionRunner` to use the SDK instead of spawning a process

### Risk Assessment

- **Auth model**: The SDK supports Anthropic API keys, Bedrock, Vertex AI, and Azure. If TeamHQ currently relies on Claude Code's subscription-based auth (via `claude` CLI), switching to the SDK requires providing an API key. This is the biggest potential blocker.
- **Breaking changes**: The SDK is actively evolving (V1 → V2 rename). Pin to a specific version.
- **Feature parity**: The SDK provides the same tools as the CLI (`Read`, `Edit`, `Bash`, `Glob`, `Grep`, `WebSearch`, `WebFetch`, `Task`). No feature gap.

---

## Option 2: CLI Streaming Input Mode

### What It Is

The `claude` CLI supports `--input-format stream-json` which keeps stdin open for NDJSON messages instead of closing after one prompt.

```bash
claude -p \
  --input-format stream-json \
  --output-format stream-json \
  --verbose \
  --include-partial-messages \
  --dangerously-skip-permissions
```

You then write JSON messages to stdin as NDJSON lines:

```jsonl
{"type":"user","message":{"role":"user","content":"Start the project"}}
```

And read NDJSON responses from stdout.

**Source:** [CLI Reference](https://code.claude.com/docs/en/cli-reference), [GitHub Issue #3187](https://github.com/anthropics/claude-code/issues/3187)

### How It Would Work

The `SessionRunner` would:
1. Spawn `claude -p --input-format stream-json --output-format stream-json ...`
2. Keep `child.stdin` open (don't call `.end()`)
3. Write initial prompt as NDJSON to stdin
4. Parse NDJSON responses from stdout
5. When a teammate message arrives, write a new user message to stdin
6. Only call `stdin.end()` when the session should terminate

### Pros

- **Minimal code change** — the existing process-spawning architecture stays mostly intact
- **Uses existing auth** — runs under whatever auth the `claude` CLI has (subscription or API key)
- **No new dependency** — just changes to how we use the existing `claude` binary

### Cons

- **Known bugs** — GitHub issue #3187 reports the process hangs on the 2nd message. Issue #5034 reports duplicate entries in session files. These are documented but may not be fully resolved.
- **Undocumented protocol** — the exact JSON format for stdin messages is not well-documented; we'd be reverse-engineering
- **Process management complexity** — still managing child processes, dealing with stdin/stdout buffering, handling crashes
- **No typed messages** — we'd need to define our own types matching the NDJSON output
- **No AbortController** — cleanup requires SIGTERM/SIGKILL with timers (as we do now)
- **Fragile** — changes to Claude CLI's internal streaming protocol could break us silently

### Risk Assessment

- **Stability**: The `--input-format stream-json` feature has open bugs. Production reliability is uncertain.
- **Maintenance**: If Anthropic changes the NDJSON protocol, our parsing breaks. No stability guarantees.
- **Debugging**: Process crashes, stdin buffering issues, and zombied processes are hard to debug.

---

## Option 3: Session Resume Pattern

### What It Is

Use `claude -p --resume <sessionId>` to send sequential single-turn messages to the same session. Each call spawns a new process but loads the session history.

```bash
# Turn 1
SESSION_ID=$(claude -p "Start the project" --output-format json | jq -r '.session_id')

# Turn 2 (with full context from turn 1)
claude -p "Here's the teammate report: ..." --resume "$SESSION_ID" --output-format stream-json
```

The CLI equivalent: `claude -c -p "follow up message"` (continues most recent conversation).

**Source:** [Headless mode docs](https://code.claude.com/docs/en/headless), [Session Management](https://platform.claude.com/docs/en/agent-sdk/sessions)

### How It Would Work

1. Initial session spawns `claude -p "kickoff prompt" --output-format stream-json --verbose ...`
2. Capture `session_id` from the `result` JSON
3. When a teammate message arrives, spawn a new process: `claude -p "teammate says: ..." --resume <session_id> --output-format stream-json ...`
4. Each "turn" is a separate process with full context reload

### Pros

- **Simple** — each turn is an independent process; no stdin management
- **Session persistence** — Claude persists sessions to disk automatically
- **Uses existing auth** — runs under CLI auth
- **Proven pattern** — this is how `claude -c` works in interactive mode

### Cons

- **Startup latency** — every turn spawns a new process and reloads the full session. This adds 2-5 seconds per turn for context loading.
- **Not real-time** — can't stream events while waiting for a teammate; each turn is a discrete process
- **Context growth** — session files grow with each turn. At scale (many teammates, many messages), performance degrades.
- **Coordination gap** — between turns, there's no running process to receive messages. Teammate messages must be queued.
- **Multiple processes** — if multiple teammates report simultaneously, we'd spawn overlapping resume processes, which could corrupt session state.
- **No streaming input** — each turn is still single-turn from the process's perspective

### Risk Assessment

- **Latency**: 2-5 second startup per turn is acceptable for occasional follow-ups but not for rapid teammate coordination.
- **Concurrency**: Simultaneous resume calls to the same session could cause conflicts. Need a queue.
- **Scalability**: Fine for 2-3 turns, problematic for 20+ turn agent team sessions.

---

## Option Comparison

| Criteria | Agent SDK | CLI stream-json | Session Resume |
|----------|-----------|-----------------|----------------|
| Multi-turn support | Native | Partial (buggy) | Via sequential processes |
| Streaming events | Yes (async iterator) | Yes (stdout NDJSON) | Yes (per turn) |
| Session management | Built-in | Manual | Built-in |
| Auth model | API key required | CLI auth (subscription OK) | CLI auth (subscription OK) |
| Process management | None (library) | Child process | Multiple child processes |
| Teammate message routing | Async generator yield | stdin write | Queue + new process |
| Latency per turn | None (same process) | None (same process) | 2-5 seconds (new process) |
| Typed messages | Yes (`SDKMessage`) | No (raw JSON) | No (raw JSON) |
| Cancellation | AbortController | SIGTERM | SIGTERM |
| Cost tracking | Built-in (`total_cost_usd`) | Parse from result event | Parse from result event |
| Stability | Stable SDK, active development | Known bugs | Stable but slow |
| Code change required | Major (rewrite runner) | Moderate (keep stdin open) | Minor (add resume logic) |

---

## Recommendation

**Use the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`).**

### Why

1. **It's the official, supported way** to run Claude Code programmatically. The CLI's `-p` mode is described as a convenience; the SDK is the production path.

2. **Multi-turn is native**, not bolted on. The `AsyncIterable<SDKUserMessage>` pattern (V1) or `session.send()`/`session.stream()` pattern (V2) are designed for exactly our use case.

3. **No process management**. We eliminate child process spawning, stdin/stdout parsing, SIGTERM/SIGKILL timers, orphaned process recovery, and all the associated edge cases.

4. **Typed, structured events**. `SDKMessage` gives us a discriminated union with `type` fields. No more parsing raw JSON lines and guessing at the schema.

5. **Subagent tracking**. The `parent_tool_use_id` field on messages lets us attribute work to specific teammates in the UI, which is critical for the session introspection feature we're building.

6. **AbortController for clean cancellation**. Instead of SIGTERM → wait 10s → SIGKILL, we just call `abortController.abort()`.

7. **Cost tracking built in**. The `result` message includes `total_cost_usd` and per-model `ModelUsage`, which we can surface in the UI.

### Auth Consideration

The main trade-off is that the SDK requires an `ANTHROPIC_API_KEY` (or Bedrock/Vertex/Azure credentials) rather than using the CLI's subscription auth. This needs to be validated:

- If the TeamHQ server already has access to an API key (or the CEO is willing to configure one), this is a non-issue.
- If we must use subscription auth, Option 2 (CLI stream-json) is the fallback, but comes with stability risks.

### Implementation Strategy

**Phase 1: SDK Integration (V1 API)**
1. `npm install @anthropic-ai/claude-agent-sdk`
2. Rewrite `SessionRunner` to use `query()` with `AsyncIterable<SDKUserMessage>` instead of spawning a child process
3. Map `SDKMessage` types to our existing `SessionEvent` schema
4. Keep the SSE endpoint unchanged — just change the event source

**Phase 2: Multi-Turn Support**
1. Add a "send message" endpoint (`POST /:sessionId/messages`)
2. The async generator in the runner yields new user messages when they arrive (via a queue/promise pattern)
3. Teammate messages route through this endpoint

**Phase 3: V2 Migration (When Stable)**
1. Migrate from `query()` + async generator to `createSession()` + `send()`/`stream()`
2. Simplifies the message injection pattern significantly

### Fallback: CLI Stream-JSON

If the API key requirement is a blocker, implement Option 2 with these mitigations:
- Pin to a specific Claude CLI version
- Implement retry logic for the known hanging bug
- Add integration tests that verify the stdin protocol still works after CLI updates
- Accept the higher maintenance burden

---

## Open Source Landscape

### Claude Flow (`claude-flow` on npm)

- **What:** Third-party multi-agent orchestration platform for Claude. 500K+ downloads.
- **How:** Uses MCP protocol to coordinate Claude Code instances. Supports "swarms" of 54+ specialized agents.
- **Relevance:** Overkill for our use case. We need a session runner, not a full orchestration platform. However, its approach (MCP-based coordination) is interesting as an alternative architecture.
- **Source:** [GitHub: ruvnet/claude-flow](https://github.com/ruvnet/claude-flow)

### Agent Teams (Built-in)

- **What:** First-party feature enabled by `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Shipped with Opus 4.6 on Feb 5, 2026.
- **How:** TeammateTool with 13 operations. Team lead creates teammates, shared task list, peer-to-peer messaging via mailbox system. Config stored at `~/.claude/teams/{name}/config.json`.
- **Architecture:** Lead session + N teammate sessions, each with independent context windows. Shared task list with file-locking for claim coordination.
- **Limitations:** No session resumption for in-process teammates. No nested teams. One team per session. Task status can lag. Shutdown can be slow.
- **Relevance:** This is what our sessions are trying to orchestrate programmatically. The Agent SDK is the programmatic interface to the same capabilities.
- **Source:** [Agent Teams docs](https://code.claude.com/docs/en/agent-teams)

---

## References

1. [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) — Official SDK documentation
2. [TypeScript SDK Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) — Full API reference with types
3. [TypeScript V2 Preview](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview) — Simplified session-based API
4. [Session Management](https://platform.claude.com/docs/en/agent-sdk/sessions) — Resume, fork, session IDs
5. [Streaming Input vs Single Mode](https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode) — Multi-turn streaming input
6. [CLI Reference](https://code.claude.com/docs/en/cli-reference) — All CLI flags and options
7. [Run Claude Code Programmatically](https://code.claude.com/docs/en/headless) — Headless/print mode docs
8. [Agent Teams](https://code.claude.com/docs/en/agent-teams) — Multi-agent orchestration
9. [GitHub Issue #3187](https://github.com/anthropics/claude-code/issues/3187) — stream-json input hanging bug
10. [GitHub Issue #5034](https://github.com/anthropics/claude-code/issues/5034) — Duplicate entries with stream-json
11. [@anthropic-ai/claude-agent-sdk on npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) — Package page
12. [claude-flow](https://github.com/ruvnet/claude-flow) — Third-party orchestration platform
