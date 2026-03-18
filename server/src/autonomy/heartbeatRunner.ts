import { spawn } from "node:child_process";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import {
  createHeartbeat,
  updateHeartbeat,
  listHeartbeats,
} from "../store/heartbeats.js";
import type { HeartbeatRun } from "../store/heartbeats.js";
import { gatherState } from "./stateGatherer.js";
import { logEvent } from "../store/eventLog.js";
import { runGemini } from "./geminiRunner.js";

const PROJECT_ROOT = join(import.meta.dirname, "../../..");
const HEARTBEAT_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

let isRunning = false;

/**
 * EventEmitter for live heartbeat output streaming.
 * Events:
 *   "output" — { heartbeatId: string, chunk: string } — incremental text
 *   "status" — { heartbeatId: string, status: string } — status changes
 */
export const heartbeatEvents = new EventEmitter();
heartbeatEvents.setMaxListeners(50);

/**
 * Build the prompt Thomas gets. Just state + CEO inbox + "go be Thomas."
 */
function buildPrompt(
  stateMarkdown: string,
  ceoInboxMarkdown: string,
  lastHeartbeat: HeartbeatRun | null
): string {
  const now = new Date().toISOString();
  let lastInfo = "No previous heartbeat.";
  if (lastHeartbeat) {
    const lastTime = lastHeartbeat.completedAt ?? lastHeartbeat.startedAt;
    const agoMs = Date.now() - new Date(lastTime).getTime();
    const mins = Math.round(agoMs / 60000);
    const agoStr = mins < 60 ? `${mins}m ago` : `${(mins / 60).toFixed(1)}h ago`;
    lastInfo = `${lastTime} (${agoStr})`;
    // Don't feed back old assessments — they can create stale thinking loops
  }

  return `This is your autonomous heartbeat. Current time: ${now}. Last heartbeat: ${lastInfo}

IMPORTANT OVERRIDES:
- Parallel pipelines ARE allowed. You can work on multiple projects simultaneously. There is NO "one pipeline at a time" rule.
- You MUST hold a team meeting every heartbeat. This is not optional.
- You MUST create reviews for the CEO when you make decisions or produce deliverables.
- If there's no CEO directive and no active work, PROACTIVELY identify and start valuable work. A good PM never says "nothing to do."
- **CURRENT PRIORITY: Focus on TeamHQ.** When deciding what to work on, bias strongly toward improving TeamHQ itself — its UI, features, agent workflows, and internal tooling. Do not spin up new standalone product projects unless the CEO has explicitly directed it. If you're looking for proactive work, ask: "What would make TeamHQ better?"

## Team State
${stateMarkdown}

## CEO Inbox
${ceoInboxMarkdown}

## Existing Docs on Disk
Check docs/ for existing deliverables before spawning agents. If a doc already exists, the task may be done — mark it completed and advance.

## Your Autonomous Operating Procedure

You are Thomas, the PM. Every heartbeat you do THREE things: (1) run a team meeting, (2) decide what to work on, (3) execute. All via Bash with curl and the claude CLI.

### STEP 1: Run a Team Meeting (MANDATORY — do this FIRST)

Start a custom meeting via the API. This is a simulated round-table discussion.

\`\`\`bash
curl -s -X POST http://localhost:3002/api/meetings/start -H "Content-Type: application/json" -d '{
  "type": "custom",
  "participants": ["product-manager", "technical-architect", "product-designer", "frontend-developer", "backend-developer", "qa"],
  "instructions": "Hourly standup. Agenda: (1) What shipped since last meeting? (2) What is in progress or blocked? (3) Review our shipped products — what improvements would users want? (4) What should we work on next? Each person gives their perspective. Produce concrete decisions and action items."
}'
\`\`\`

Wait for the meeting to complete (poll GET /api/meetings until status is "completed"), then read the output:

\`\`\`bash
curl -s http://localhost:3002/api/meetings/{meetingId}
\`\`\`

The meeting output will have decisions, action items, and improvement ideas from the team.

### STEP 2: Act on Meeting Decisions

Based on what the team decided:

**To create a new project:**
\`\`\`bash
curl -s -X POST http://localhost:3002/api/projects -H "Content-Type: application/json" -d '{
  "name": "Project Name", "description": "...", "status": "in-progress",
  "goals": "", "constraints": "", "brief": "...",
  "reviewGates": {"afterDesign": true, "afterFrontend": true, "afterQA": true}
}'
\`\`\`

**To create work items:**
\`\`\`bash
curl -s -X PUT http://localhost:3002/api/projects/{id}/work-items -H "Content-Type: application/json" -d '{
  "workItems": [
    {"id": "XX-1", "title": "...", "status": "in-progress", "owner": "Thomas", "priority": "high"},
    {"id": "XX-2", "title": "...", "status": "planned", "owner": "Andrei", "priority": "high"}
  ]
}'
\`\`\`

**To write a requirements doc:**
Write it directly to docs/{project-slug}-requirements.md using the Write tool.

**To spawn an agent to do work:**
\`\`\`bash
echo "You are working on project X. Task: ... Read docs/{slug}-requirements.md first. Write your output to docs/{slug}-tech-approach.md" | claude --print - --model claude-sonnet-4-6 --dangerously-skip-permissions --max-turns 20 --append-system-prompt-file .claude/agents/technical-architect.md
\`\`\`

Replace the agent file and prompt for each role:
- Andrei: .claude/agents/technical-architect.md
- Robert: .claude/agents/product-designer.md
- Alice: .claude/agents/frontend-developer.md
- Jonah: .claude/agents/backend-developer.md
- Enzo: .claude/agents/qa.md

### STEP 3: Create Reviews for the CEO

After making decisions or producing deliverables, create reviews so the CEO can see what's happening.

**IMPORTANT: Use the correct projectId.** Before creating a review, run: curl -s http://localhost:3002/api/projects — then match the review content to the actual project it belongs to. Team meeting decisions about TeamHQ go under the TeamHQ project, not Forge or any other project. Never guess or reuse a projectId from memory.

\`\`\`bash
curl -s -X POST http://localhost:3002/api/reviews -H "Content-Type: application/json" -d '{
  "projectId": "...", "projectSlug": "...", "projectName": "...",
  "gate": "proactive", "agent": "Thomas",
  "summary": "What you decided and why",
  "deliverables": [{"type": "doc", "path": "docs/...", "title": "..."}]
}'
\`\`\`

Create reviews LIBERALLY. The CEO wants to see:
- New project proposals before big builds start
- Strategic decisions from team meetings
- Completed deliverables that change product direction
- Anything you'd want your boss to know about

### STEP 4: Advance Existing Pipelines

Check each in-progress project and move tasks forward:
\`\`\`bash
curl -s http://localhost:3002/api/projects/{id}/work-items
\`\`\`
- If a task is "in-progress" and its deliverable exists in docs/ → mark completed
- If no tasks are in-progress → start the next planned task
- If a task needs an agent → spawn one via the claude CLI as shown above

### API Quick Reference
- GET http://localhost:3002/api/projects — list projects
- GET/PATCH http://localhost:3002/api/projects/:id — get/update project
- GET/PUT http://localhost:3002/api/projects/:id/work-items — get/update work items
- POST http://localhost:3002/api/meetings/start — start a meeting
- GET http://localhost:3002/api/meetings/:id — get meeting result
- GET http://localhost:3002/api/meetings — list all meetings
- POST http://localhost:3002/api/reviews — create a review
- GET http://localhost:3002/api/reviews?status=pending — list pending reviews

### Pipeline Phase Order
Requirements (Thomas) → Architecture (Andrei) → Design + Backend (PARALLEL: Robert, Jonah) → Frontend (Alice) → Review (Robert + Atlas) → QA + Docs (Enzo + Nadia)

KEY RULES:
- A good PM never says "nothing to do." Find valuable work. Improve the product. Propose ideas.
- ALWAYS run the team meeting first. The meeting drives the decisions.
- ALWAYS create reviews for the CEO. Keep them in the loop.
- Use \`claude --print\` via Bash to spawn agents. Use \`curl\` to call APIs. These are your tools.
- Parallel pipelines are allowed. Work on multiple projects at once.`;
}

/**
 * Run Thomas as a full Claude Code agent session.
 * Tries Opus first, falls back to Sonnet if Opus is overloaded.
 */
function spawnThomas(prompt: string, outputRef?: { value: string }, model = "claude-opus-4-6"): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[heartbeat] Trying model: ${model}`);
    const child = spawn("claude", [
      "--print", "-",
      "--output-format", "stream-json",
      "--verbose",
      "--model", model,
      "--dangerously-skip-permissions",
      "--max-turns", "50",
      "--append-system-prompt-file", join(PROJECT_ROOT, ".claude/agents/product-manager.md"),
    ], {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let textContent = ""; // extracted readable text from stream-json

    child.stdout.on("data", (d: Buffer) => {
      const chunk = d.toString();
      stdout += chunk;
      // Parse each line of stream-json to extract text for live display
      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const evt = JSON.parse(trimmed);
          // assistant message with text content
          if (evt.type === "assistant" && evt.message?.content) {
            for (const block of evt.message.content) {
              if (block.type === "text" && block.text) {
                textContent += block.text + "\n";
              }
              if (block.type === "tool_use") {
                textContent += `[tool: ${block.name}]\n`;
              }
              if (block.type === "tool_result") {
                const resultText = typeof block.content === "string" ? block.content : JSON.stringify(block.content);
                textContent += `[result: ${resultText.slice(0, 100)}]\n`;
              }
            }
          }
          // final result
          if (evt.type === "result" && evt.result) {
            textContent += "\n" + evt.result + "\n";
          }
        } catch {
          // not json
        }
      }
      if (outputRef) outputRef.value = textContent;
    });

    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    child.stdin.write(prompt);
    child.stdin.end();

    // Early bail: if no output after 60s, the model is likely overloaded — fail fast
    const earlyBail = setTimeout(() => {
      if (textContent.length === 0) {
        child.kill("SIGTERM");
        reject(new Error(`No output after 60s — model likely overloaded`));
      }
    }, 60000);

    // Hard timeout
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Thomas timed out after ${HEARTBEAT_TIMEOUT_MS / 60000}m`));
    }, HEARTBEAT_TIMEOUT_MS);

    // Note: early bail is NOT cleared on first data — it fires at 60s and checks textContent.
    // Stream-json metadata events arrive immediately but don't populate textContent.
    // Only actual assistant text clears the overloaded-model signal.

    child.on("close", (code) => {
      clearTimeout(timer);
      clearTimeout(earlyBail);
      if (stderr.includes("overloaded") || stderr.includes("529")) {
        reject(new Error(`Claude overloaded: ${stderr.slice(0, 300)}`));
      } else if (code === 0) {
        resolve(textContent || stdout);
      } else {
        reject(new Error(`Thomas exited with code ${code}: ${stderr.slice(0, 500)}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn Thomas: ${err.message}`));
    });
  });
}

/**
 * The heartbeat: gather state, spawn Thomas, log what happened.
 */
export async function runHeartbeat(trigger: "cron" | "manual"): Promise<HeartbeatRun> {
  if (isRunning) throw new Error("A heartbeat is already running");

  isRunning = true;
  const startTime = Date.now();
  let heartbeat: HeartbeatRun | null = null;

  try {
    const { stateMarkdown, ceoInboxMarkdown, snapshot } = await gatherState();

    // Every heartbeat runs — Thomas holds a team meeting and decides what to work on

    heartbeat = await createHeartbeat(trigger);
    heartbeat = await updateHeartbeat(heartbeat.id, {
      stateSnapshot: snapshot,
      actionsLog: ["State gathered, spawning Thomas as full agent session"],
    });

    const allRuns = await listHeartbeats(2);
    const lastHeartbeat = allRuns.find(r => r.id !== heartbeat!.id) ?? null;

    const prompt = buildPrompt(stateMarkdown, ceoInboxMarkdown, lastHeartbeat);

    console.log("[heartbeat] Spawning Thomas as full Claude Code agent...");
    heartbeatEvents.emit("status", { heartbeatId: heartbeat.id, status: "running" });

    // Stream Thomas's output and update heartbeat record periodically
    const rawOutputRef = { value: "" };
    let lastEmittedLen = 0;
    const updateInterval = setInterval(async () => {
      console.log(`[heartbeat] Live update tick — output so far: ${rawOutputRef.value.length} chars`);
      // Emit new chunks via SSE
      if (rawOutputRef.value.length > lastEmittedLen && heartbeat) {
        const newChunk = rawOutputRef.value.slice(lastEmittedLen);
        lastEmittedLen = rawOutputRef.value.length;
        heartbeatEvents.emit("output", { heartbeatId: heartbeat.id, chunk: newChunk });
      }
      if (rawOutputRef.value.length > 0 && heartbeat) {
        try {
          const lines = rawOutputRef.value.split("\n").filter(l => l.trim());
          const lastLines = lines.slice(-10).map(l => l.slice(0, 120));
          await updateHeartbeat(heartbeat.id, {
            actionsLog: [
              "State gathered, spawning Thomas as full agent session",
              `Thomas working... (${rawOutputRef.value.length} chars output so far)`,
              ...lastLines,
            ],
          });
        } catch {}
      }
    }, 5000); // update every 5 seconds (was 10)

    let rawOutput = "";
    let usedModel = "claude-opus-4-6";

    try {
      rawOutput = await spawnThomas(prompt, rawOutputRef);
    } catch (opusErr) {
      const errMsg = opusErr instanceof Error ? opusErr.message : String(opusErr);
      console.log("[heartbeat] Opus failed, trying Sonnet...");

      await updateHeartbeat(heartbeat.id, {
        actionsLog: [
          "State gathered, spawning Thomas as full agent session",
          `Opus failed: ${errMsg.slice(0, 80)}`,
          "Retrying with Claude Sonnet 4.6...",
        ],
      });

      // Reset output ref for retry
      rawOutputRef.value = "";
      lastEmittedLen = 0;

      try {
        rawOutput = await spawnThomas(prompt, rawOutputRef, "claude-sonnet-4-6");
        usedModel = "claude-sonnet-4-6";
      } catch (sonnetErr) {
        const sonnetMsg = sonnetErr instanceof Error ? sonnetErr.message : String(sonnetErr);
        clearInterval(updateInterval);
        throw new Error(`Both Opus and Sonnet failed. Opus: ${errMsg.slice(0, 100)}. Sonnet: ${sonnetMsg.slice(0, 100)}`);
      }
    } finally {
      clearInterval(updateInterval);
    }

    const durationMs = Date.now() - startTime;
    const assessmentSource = rawOutputRef.value || rawOutput;
    const assessment = assessmentSource.slice(0, 500).replace(/\n/g, " ").trim();
    const engine = usedModel;

    await logEvent({
      actor: "Thomas",
      action: `autonomous heartbeat completed in ${(durationMs / 1000).toFixed(0)}s (${engine})`,
      entityType: "agent",
      entityId: heartbeat.id,
      entityName: "heartbeat",
    });

    heartbeat = await updateHeartbeat(heartbeat.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      assessment,
      rawOutput,
      durationMs,
      actionsLog: [
        "State gathered, spawning Thomas as full agent session",
        `Running on ${engine}`,
        `Thomas completed in ${(durationMs / 1000).toFixed(0)}s`,
        `Output: ${rawOutput.length} chars`,
      ],
    });

    console.log(`[heartbeat] Completed in ${(durationMs / 1000).toFixed(0)}s (${engine})`);
    heartbeatEvents.emit("status", { heartbeatId: heartbeat.id, status: "completed" });
    return heartbeat;

  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[heartbeat] Failed:`, errorMsg);
    heartbeatEvents.emit("status", { heartbeatId: heartbeat?.id ?? "unknown", status: "failed" });

    if (heartbeat) {
      return updateHeartbeat(heartbeat.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: errorMsg,
        durationMs,
      });
    }

    const failedRun = await createHeartbeat(trigger);
    return updateHeartbeat(failedRun.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: errorMsg,
      durationMs,
    });
  } finally {
    isRunning = false;
  }
}
