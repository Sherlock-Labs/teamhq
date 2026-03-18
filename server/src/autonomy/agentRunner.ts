import { spawn } from "node:child_process";
import { join } from "node:path";
import { logEvent } from "../store/eventLog.js";

const PROJECT_ROOT = join(import.meta.dirname, "../../..");
const AGENTS_DIR = join(PROJECT_ROOT, ".claude/agents");
const AGENT_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes per agent

const AGENT_FILE_MAP: Record<string, string> = {
  thomas: "product-manager.md",
  andrei: "technical-architect.md",
  robert: "product-designer.md",
  alice: "frontend-developer.md",
  jonah: "backend-developer.md",
  sam: "backend-developer-2.md",
  enzo: "qa.md",
  priya: "product-marketer.md",
  suki: "product-researcher.md",
  marco: "technical-researcher.md",
  nadia: "technical-writer.md",
  yuki: "data-analyst.md",
  kai: "ai-engineer.md",
  zara: "mobile-developer-1.md",
  leo: "mobile-developer-2.md",
  howard: "payments-engineer.md",
  ravi: "creative-strategist.md",
  derek: "backend-integrations.md",
  milo: "backend-devops.md",
  morgan: "visual-qa.md",
  atlas: "code-reviewer.md",
};

export interface AgentRunResult {
  agent: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

/**
 * Spawn an agent to do a specific task. The agent gets:
 * - Their persona via --append-system-prompt-file
 * - A task-specific prompt with context
 * - Full Claude Code capabilities (file read/write, bash, etc.)
 * - Working directory set to PROJECT_ROOT
 */
export async function runAgent(
  agentName: string,
  taskPrompt: string,
): Promise<AgentRunResult> {
  const agentFile = AGENT_FILE_MAP[agentName.toLowerCase()];
  if (!agentFile) {
    return {
      agent: agentName,
      success: false,
      output: "",
      error: `Unknown agent: ${agentName}`,
      durationMs: 0,
    };
  }

  const agentPath = join(AGENTS_DIR, agentFile);
  const startTime = Date.now();

  console.log(`[agent-runner] Spawning ${agentName} for task...`);

  await logEvent({
    actor: agentName,
    action: "started working on assigned task",
    entityType: "agent",
    entityId: agentName.toLowerCase(),
    entityName: agentName,
  });

  try {
    const output = await spawnClaude(agentPath, taskPrompt);
    const durationMs = Date.now() - startTime;

    console.log(`[agent-runner] ${agentName} completed in ${(durationMs / 1000).toFixed(1)}s`);

    await logEvent({
      actor: agentName,
      action: `completed task in ${(durationMs / 1000).toFixed(0)}s`,
      entityType: "agent",
      entityId: agentName.toLowerCase(),
      entityName: agentName,
    });

    return {
      agent: agentName,
      success: true,
      output,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    console.error(`[agent-runner] ${agentName} failed after ${(durationMs / 1000).toFixed(1)}s:`, errorMsg);

    await logEvent({
      actor: agentName,
      action: `failed task: ${errorMsg.slice(0, 100)}`,
      entityType: "agent",
      entityId: agentName.toLowerCase(),
      entityName: agentName,
    });

    return {
      agent: agentName,
      success: false,
      output: "",
      error: errorMsg,
      durationMs,
    };
  }
}

function spawnClaude(agentInstructionsPath: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "--print", "-",
      "--output-format", "text",
      "--model", "claude-opus-4-6",
      "--dangerously-skip-permissions",
      "--max-turns", "25",
      "--append-system-prompt-file", agentInstructionsPath,
    ];

    const child = spawn("claude", args, {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    child.stdin.write(prompt);
    child.stdin.end();

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Agent timed out after ${AGENT_TIMEOUT_MS / 1000}s`));
    }, AGENT_TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Agent exited with code ${code}: ${stderr.slice(0, 300)}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn agent: ${err.message}`));
    });
  });
}
