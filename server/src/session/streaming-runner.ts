import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { BaseSessionRunner } from "./base-runner.js";

/**
 * Mode A: Streaming Input Runner
 *
 * Uses `claude -p --input-format stream-json --output-format stream-json`.
 * Single long-lived process. Keeps stdin open for follow-up messages.
 * Turn boundaries detected by `result` events in the output stream.
 */
export class StreamingRunner extends BaseSessionRunner {
  private stderrBuf: string = "";

  protected spawnTurn(prompt: string): void {
    const child = spawn(
      "claude",
      [
        "-p",
        "--input-format", "stream-json",
        "--output-format", "stream-json",
        "--verbose",
        "--include-partial-messages",
        "--dangerously-skip-permissions",
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: this.options.workingDirectory,
        env: { ...process.env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
      }
    );

    this.process = child;
    this.metadata.pid = child.pid ?? null;
    this.writeMetadata();

    // Write initial message as NDJSON (do NOT close stdin)
    const ndjsonMessage = JSON.stringify({
      type: "user",
      message: { role: "user", content: prompt },
    });
    child.stdin.write(ndjsonMessage + "\n");

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

    // Handle process close — this is session end, not turn end
    child.on("close", (code) => {
      this.process = null;

      if (this.currentState === "ended") return; // Already finalized

      if (this.killed) {
        this.finalize("stopped");
        return;
      }

      // Unexpected process exit — the streaming process should only exit
      // when we close stdin or kill it. If it exits on its own, treat as failure.
      if (code === 0) {
        this.finalize("completed");
      } else {
        if (this.stderrBuf.trim()) {
          this.metadata.error = this.stderrBuf.trim().slice(0, 1000);
        }
        this.metadata.exitCode = code;
        this.finalize("failed");
      }
    });

    // Handle spawn errors
    child.on("error", (err) => {
      this.onSpawnError(err);
    });
  }

  protected deliverMessage(message: string): void {
    if (!this.process || !this.process.stdin || !this.process.stdin.writable) {
      throw new Error("Process stdin not available");
    }

    const ndjsonMessage = JSON.stringify({
      type: "user",
      message: { role: "user", content: message },
    });
    this.process.stdin.write(ndjsonMessage + "\n");
    this.startTurnTimeout();
  }

  protected override killProcess(): void {
    if (!this.process) return;

    // Close stdin first (graceful), then SIGTERM, then SIGKILL
    try {
      if (this.process.stdin) this.process.stdin.end();
    } catch {
      // stdin may already be closed
    }

    super.killProcess();
  }

  /**
   * In streaming mode, the `result` event marks the end of a turn,
   * but the process stays alive waiting for more input on stdin.
   */
  protected override handleResultEvent(parsed: Record<string, unknown>): void {
    const durationMs = parsed.duration_ms as number | undefined;
    const costUsd = parsed.cost_usd as number | undefined;
    this.onTurnComplete(0, durationMs, costUsd);
  }
}
