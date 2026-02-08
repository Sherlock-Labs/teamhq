import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { BaseSessionRunner } from "./base-runner.js";

/**
 * Mode B: Session Resume Runner
 *
 * Uses `claude -p --resume <session_id>` for follow-up turns.
 * Each turn is a separate process. Session context persisted by CLI.
 * No process running between turns.
 */
export class ResumeRunner extends BaseSessionRunner {
  private stderrBuf: string = "";

  protected spawnTurn(prompt: string): void {
    const args = [
      "-p",
      "--output-format", "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--dangerously-skip-permissions",
    ];

    // Resume from previous turn if we have a CLI session ID
    if (this.cliSessionId) {
      args.push("--resume", this.cliSessionId);
    }

    const child = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: this.options.workingDirectory,
      env: { ...process.env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
    });

    this.process = child;
    this.metadata.pid = child.pid ?? null;
    this.stderrBuf = "";
    this.writeMetadata();

    // Write prompt to stdin and close (single-turn per process)
    child.stdin.write(prompt);
    child.stdin.end();

    this.startTurnTimeout();

    // Parse stdout as NDJSON lines
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (line.trim()) {
        this.parseCliEvent(line);
      }
    });

    // Capture stderr
    child.stderr.on("data", (data: Buffer) => {
      this.stderrBuf += data.toString();
    });

    // Handle process close — this is turn end (not session end)
    child.on("close", (code) => {
      this.process = null;

      if (this.currentState === "ended") return; // Already finalized

      if (this.killed) {
        this.finalize("stopped");
        return;
      }

      if (code !== 0 && this.stderrBuf.trim()) {
        this.metadata.error = this.stderrBuf.trim().slice(0, 1000);
      }

      // Turn complete — transition to idle, not ended
      this.onTurnComplete(code);
    });

    // Handle spawn errors
    child.on("error", (err) => {
      this.onSpawnError(err);
    });
  }

  protected deliverMessage(message: string): void {
    // In resume mode, delivering a message means spawning a new process
    this.spawnTurn(message);
  }
}
