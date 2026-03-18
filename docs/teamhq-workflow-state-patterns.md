# TeamHQ Workflow State Patterns

**Evaluator:** Marco (Technical Researcher)
**Date:** 2026-03-18
**Project:** Workflow State Patterns (58f0c169)

---

## The Problem

The heartbeat runner (`server/src/autonomy/heartbeatRunner.ts`) is stateless. Every 5 minutes:

1. `gatherState()` reads projects, work items, and recent events fresh from disk/DB
2. A prompt is built with this snapshot
3. Thomas (PM) is spawned as a full Claude agent session
4. Thomas runs a meeting, makes decisions, spawns sub-agents via `claude --print` in bash
5. Process exits. All in-memory state is gone.

The next heartbeat has no idea that Thomas from 5 minutes ago spawned Alice, Jonah, and Robert in parallel. It infers activity from indirect signals: work item statuses, stale task detection (>24h with no events), and the "active agents" heuristic (recent event log entries in the last 2h). This is archaeology, not coordination.

**Root failure mode:** Thomas spawns 5 agents and the next heartbeat might spawn them again, or worse, think the work is stale and reassign it.

---

## Pattern Evaluations

### 1. JSON State Machine

A single JSON file (e.g., `data/workflow-state.json`) that Thomas reads and writes each heartbeat. It tracks the current phase, in-flight agent invocations, and what each is working on.

**Example shape:**
```json
{
  "updatedAt": "2026-03-18T10:15:00Z",
  "heartbeatId": "abc123",
  "activePipelines": {
    "voicenote-pro": {
      "phase": "frontend",
      "inFlightAgents": [
        { "name": "Alice", "task": "implement dashboard", "startedAt": "2026-03-18T10:10:00Z", "pid": null }
      ]
    }
  },
  "pendingActions": []
}
```

**Complexity:** Low. Read the file at heartbeat start, write it before exit. Thomas already knows how to use bash/curl — a `cat data/workflow-state.json` read and `jq` update is trivial to add to the prompt.

**Handles in-flight agents?** Partially. Thomas can write "I spawned Alice for X" before spawning her. The next heartbeat sees that record and skips re-spawning. But there's no live PID tracking (Claude subagents are fire-and-forget bash processes), so the state relies on Thomas writing "Alice completed" when she's done — which she might not, if Thomas times out.

**Failure handling:** Manual. If a heartbeat dies mid-flight, the JSON is stale. You'd need a "heartbeat TTL" — if `updatedAt` is >15 minutes old, treat in-flight agents as unknown. Workable but not automatic.

**Infrastructure required:** Zero. One JSON file, already have the pattern (see `data/heartbeat-config.json`).

**Philosophy fit:** Good. This is the "boring, ship fast" approach. Works well for 90% of the problem.

**Gotchas:**
- Concurrent heartbeats (already guarded by `isRunning` flag, but worth noting)
- If Thomas writes corrupt JSON mid-update, the next heartbeat breaks — use atomic writes (write to temp file, rename)
- State can drift: what Thomas *thinks* is in-flight vs. what the work item API says

---

### 2. Saga Pattern

A saga is a sequence of steps, each with a compensating action (rollback). Classically used for distributed transactions. The idea: encode a pipeline run as a series of steps, and if step 3 fails, run compensating steps 2→1 to undo.

**Example for TeamHQ:**
```
Step 1: Thomas writes requirements → compensation: delete doc
Step 2: Andrei writes tech approach → compensation: delete doc
Step 3: Alice implements frontend → compensation: revert commits
Step 4: Enzo QA pass → compensation: reopen QA
```

**Complexity:** High for the value delivered. The TeamHQ pipeline doesn't need transactional rollback — if Andrei's tech approach fails, the right response is "try again," not "roll back Thomas's requirements doc." The compensation logic would be theoretical dead code.

**Handles in-flight agents?** No better than JSON state machine. The saga framework still needs to track which step is executing right now.

**Failure handling:** This is where sagas shine — but our failures are usually "Claude API was overloaded" or "Thomas timed out," not partial data corruption that needs rollback. Exponential backoff (already implemented in `cron.ts`) is the right response, not compensation transactions.

**Infrastructure required:** Either a library or significant custom code.

**Philosophy fit:** Poor. Sagas are an enterprise pattern for distributed payment systems. Our "pipeline" is a creative workflow where "undo" rarely makes sense. This is a $50,000 solution to a $200 problem.

**Verdict:** Skip.

---

### 3. FSM Libraries (xstate, robot3, machina)

Formal finite state machines with typed states, transitions, guards, and side effects. XState is the 800-pound gorilla here (v5 is the current major); robot3 is a lightweight alternative (~1KB); machina is older and less maintained.

**xstate v5:**
- Full actor model, spawned child actors, state charts
- Built-in persistence (`state.toJSON()` / `State.create()`)
- Excellent devtools (XState Inspector)
- ~65KB minified, but that's fine for a Node.js server
- TypeScript-first

**robot3:**
- 1KB, simple transitions, no devtools, no persistence built-in
- Good for a single simple machine; too limited for a multi-project pipeline

**machina:**
- Not actively maintained, skip

**Complexity for our use case:** The appeal of xstate is real. You'd define states like `idle → running → waitingForAgents → reviewing → done`, encode the pipeline as a state chart, persist the serialized state to disk between heartbeats. Thomas would resume from exactly where he left off.

**The hidden cost:** xstate's power comes from modeling *everything* as state machines. That means defining all transitions, guards, and side effects upfront. For TeamHQ, where each project is in a different pipeline phase and Thomas improvises decisions (run a meeting, read docs, spawn agents based on what he finds), a rigid FSM fights against Claude's natural "figure it out" approach. You'd spend more time maintaining the state chart than shipping products.

**Philosophy fit:** Mixed. Great if you want to formalize the pipeline permanently. Premature if you just want heartbeats to not double-spawn agents.

**Verdict:** Appealing but over-engineered for v1. Consider for a future "proper orchestration layer" if the team grows substantially.

---

### 4. Custom Cursor Pattern

A lightweight "execution cursor" — a small JSON file that tracks *where Thomas is in the current plan*, not the full pipeline state machine. Thomas writes the cursor before doing significant work; the next heartbeat reads it to pick up where things left off.

**Example shape:**
```json
{
  "version": 1,
  "heartbeatId": "hb-2026-03-18-1015",
  "updatedAt": "2026-03-18T10:15:30Z",
  "expiresAt": "2026-03-18T10:45:00Z",
  "currentPlan": "Advance voicenote-pro through QA phase",
  "completedSteps": [
    "Ran team meeting (meeting-id: mtg-abc123)",
    "Spawned Enzo for QA on voicenote-pro"
  ],
  "pendingSteps": [
    "Wait for Enzo to complete",
    "Create review gate for CEO"
  ],
  "inFlightAgents": [
    {
      "name": "Enzo",
      "project": "voicenote-pro",
      "task": "QA pass",
      "spawnedAt": "2026-03-18T10:14:00Z",
      "expectedOutput": "docs/voicenote-pro-qa-report.md"
    }
  ]
}
```

**How it works:**
1. Thomas reads the cursor at heartbeat start
2. If the cursor is fresh (within TTL) and has `inFlightAgents`, he checks whether their expected output files exist — if they do, they're done; if not, he waits or continues with other work
3. Thomas writes the cursor before spawning agents and after completing steps
4. If the cursor is expired or absent, Thomas starts fresh (current behavior)

**Complexity:** Low-medium. It's a JSON file with a TTL. Thomas writes to it via a simple `Write` tool call or `echo '...' > data/cursor.json`. The prompt instructs him to read and write it. No libraries, no schema changes, no migrations.

**Handles in-flight agents?** Yes — this is the pattern's primary purpose. "Enzo is working, expected output is X, check if X exists." Simple, file-based, auditable.

**Failure handling:** TTL-based. If Thomas dies mid-heartbeat, the cursor goes stale after 30 minutes (the heartbeat timeout). Next heartbeat sees an expired cursor and starts fresh. For partially-completed work, the work item statuses and existing docs serve as the ground truth — Thomas can recover from those without the cursor.

**Infrastructure required:** Zero. One JSON file. Could add a thin `GET /api/cursor` endpoint to surface it in the UI, but not required.

**Philosophy fit:** Excellent. It's the minimal-viable fix for the statelessness problem. Doesn't fight Claude's improvisational nature — Thomas still decides what to do, he just leaves notes for the next Thomas.

**Gotchas:**
- Thomas must actually write the cursor — you're trusting an LLM to follow instructions. Mitigation: make cursor writing a mandatory step in the heartbeat prompt, like the team meeting is today.
- The cursor's `inFlightAgents` list relies on Thomas knowing when agents are done. Since agents are fire-and-forget bash processes, "done" means "their output file exists." This works well for the doc-centric pipeline.
- Concurrent heartbeat guard (`isRunning = true`) already prevents the worst race conditions.

---

## Comparison Table

| Criterion | JSON State Machine | Saga | FSM Library (xstate) | Custom Cursor |
|---|---|---|---|---|
| Implementation complexity | Low | High | Medium-High | Low |
| Handles in-flight agents | Partial | No | Yes (if modeled) | Yes |
| Failure/timeout handling | Manual TTL | Automatic rollback | Built-in | TTL-based |
| New infrastructure required | No | No (or small lib) | npm package | No |
| Philosophy fit | Good | Poor | Mixed | Excellent |
| Reversibility (if it doesn't work) | Easy | Hard | Medium | Easy |
| Fits Claude's improvisational style | Yes | No | No | Yes |

---

## Recommendation

**Implement the Custom Cursor pattern.**

It solves the immediate problem (Thomas double-spawning agents, no visibility into what's in-flight) with one JSON file and a few lines added to the heartbeat prompt. It requires no libraries, no schema migrations, no new infrastructure. And because it's just a file, it's trivially debuggable: `cat data/workflow-cursor.json` tells you exactly where the system thinks it is.

**Implementation sketch:**

1. Add `data/workflow-cursor.json` (gitignored — it's runtime state)
2. Add cursor read instructions to the heartbeat prompt: "Before running your meeting, read `data/workflow-cursor.json`. If it exists and is not expired (check `expiresAt`), check each `inFlightAgents` entry — does their `expectedOutput` file exist? If yes, mark them done. If the cursor is missing or expired, proceed as normal."
3. Add cursor write instructions: "Before spawning any agent, write your current plan, completed steps, and in-flight agents to `data/workflow-cursor.json` with an `expiresAt` 30 minutes from now."
4. That's it for v1.

**If v1 works well and the team grows:** revisit xstate for a proper orchestration layer — but only once the cursor pattern has proven itself and you have clear requirements for what the state machine should model. Don't pre-optimize.

**What this doesn't solve:** multi-agent races where two parallel agents write conflicting work item statuses. That's a separate problem (optimistic locking on work items, or a queue-based approach). The cursor pattern improves heartbeat-to-heartbeat continuity; it doesn't fix intra-heartbeat concurrency.
