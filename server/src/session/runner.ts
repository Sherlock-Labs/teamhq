import { spawn, ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";
import { appendFile, writeFile } from "node:fs/promises";
import type { SessionEvent, SessionMetadata, SessionStatus } from "../schemas/session.js";

const MAX_EVENTS = 5000;
const MAX_TOOL_RESULT_LINES = 200;

interface SessionRunnerOptions {
  sessionId: string;
  projectId: string;
  prompt: string;
  metadataPath: string;
  eventLogPath: string;
  timeoutMs: number;
  workingDirectory: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function truncateOutput(output: string, maxLines: number): { text: string; truncated: boolean } {
  if (typeof output !== "string") return { text: String(output), truncated: false };
  const lines = output.split("\n");
  if (lines.length <= maxLines) return { text: output, truncated: false };
  const truncated = lines.slice(0, maxLines).join("\n");
  return {
    text: truncated + `\n[... truncated, ${lines.length} total lines]`,
    truncated: true,
  };
}

export class SessionRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private killTimer: NodeJS.Timeout | null = null;
  private metadata: SessionMetadata;
  private eventCounter: number = 0;
  private lastToolName: string = "";
  private streamedTextBlockIds: Set<number> = new Set();
  private currentContentBlockIndex: number = -1;
  private killed: boolean = false;
  private targetStatus: SessionStatus | null = null;

  constructor(private options: SessionRunnerOptions) {
    super();
    this.metadata = {
      id: options.sessionId,
      projectId: options.projectId,
      status: "running",
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationMs: null,
      eventCount: 0,
      exitCode: null,
      error: null,
      pid: null,
    };
  }

  get sessionId(): string {
    return this.options.sessionId;
  }

  get pid(): number | null {
    return this.process?.pid ?? null;
  }

  start(): void {
    const child = spawn(
      "claude",
      [
        "-p",
        "--verbose",
        "--output-format", "stream-json",
        "--include-partial-messages",
        "--dangerously-skip-permissions",
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: this.options.workingDirectory,
      }
    );

    this.process = child;
    this.metadata.pid = child.pid ?? null;

    // Write initial metadata with PID
    writeFile(this.options.metadataPath, JSON.stringify(this.metadata, null, 2)).catch((err) => {
      console.error("Failed to write initial session metadata:", err);
    });

    // Write prompt to stdin
    child.stdin.write(this.options.prompt);
    child.stdin.end();

    // Set timeout
    this.timeoutTimer = setTimeout(() => {
      this.kill("timed-out");
    }, this.options.timeoutMs);

    // Emit session started event
    this.emitSessionEvent({ type: "system", data: { message: "Session started" } });

    // Parse stdout as NDJSON lines
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (line.trim()) {
        this.parseCliEvent(line);
      }
    });

    // Capture stderr
    let stderrBuf = "";
    child.stderr.on("data", (data: Buffer) => {
      stderrBuf += data.toString();
    });

    // Handle process close
    child.on("close", (code, _signal) => {
      if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
      if (this.killTimer) clearTimeout(this.killTimer);

      let status: SessionStatus;
      if (this.killed && this.targetStatus) {
        status = this.targetStatus;
      } else if (code === 0) {
        status = "completed";
      } else {
        status = "failed";
      }

      const endedAt = new Date().toISOString();
      this.metadata.status = status;
      this.metadata.endedAt = endedAt;
      this.metadata.durationMs = Date.now() - new Date(this.metadata.startedAt).getTime();
      this.metadata.exitCode = code;
      this.metadata.pid = null;

      if (status === "failed" && stderrBuf.trim()) {
        this.metadata.error = stderrBuf.trim().slice(0, 1000);
      }

      // Emit final lifecycle event
      if (status === "completed") {
        this.emitSessionEvent({
          type: "system",
          data: { message: `Session completed (${formatDuration(this.metadata.durationMs)})` },
        });
      } else if (status === "timed-out") {
        this.emitSessionEvent({
          type: "error",
          data: { message: "Session timed out after 30 minutes" },
        });
      } else if (status === "stopped") {
        this.emitSessionEvent({
          type: "system",
          data: { message: "Session stopped by user" },
        });
      } else {
        this.emitSessionEvent({
          type: "error",
          data: { message: `Session failed (exit code ${code})`, code },
        });
      }

      // Write final metadata
      writeFile(this.options.metadataPath, JSON.stringify(this.metadata, null, 2)).catch((err) => {
        console.error("Failed to write final session metadata:", err);
      });

      this.emit("end", this.metadata);
    });

    // Handle spawn errors
    child.on("error", (err) => {
      this.emitSessionEvent({
        type: "error",
        data: { message: `Failed to spawn claude process: ${err.message}` },
      });
    });
  }

  stop(): void {
    this.kill("stopped");
  }

  private kill(reason: SessionStatus): void {
    if (this.killed) return;
    this.killed = true;
    this.targetStatus = reason;

    if (this.process) {
      this.process.kill("SIGTERM");
      this.killTimer = setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill("SIGKILL");
        }
      }, 10_000);
    }
  }

  private parseCliEvent(line: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      return; // Skip non-JSON lines
    }

    const type = parsed.type as string;

    switch (type) {
      case "system": {
        // Session init event
        this.emitSessionEvent({
          type: "system",
          data: { message: "Agent initialized" },
        });
        break;
      }

      case "content_block_start": {
        const contentBlock = parsed.content_block as Record<string, unknown> | undefined;
        const index = parsed.index as number | undefined;
        if (contentBlock?.type === "text" && index !== undefined) {
          this.currentContentBlockIndex = index;
          this.streamedTextBlockIds.add(index);
        }
        break;
      }

      case "content_block_delta": {
        const delta = parsed.delta as Record<string, unknown> | undefined;
        if (delta?.type === "text_delta" && typeof delta.text === "string") {
          this.emitSessionEvent({
            type: "assistant_text",
            data: { text: delta.text, delta: true },
          });
        }
        break;
      }

      case "content_block_stop": {
        this.currentContentBlockIndex = -1;
        break;
      }

      case "assistant": {
        const message = parsed.message as Record<string, unknown> | undefined;
        const content = message?.content as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(content)) break;

        for (let i = 0; i < content.length; i++) {
          const block = content[i];
          if (block.type === "text" && typeof block.text === "string") {
            // Only emit if we haven't already streamed this block via deltas
            if (!this.streamedTextBlockIds.has(i)) {
              this.emitSessionEvent({
                type: "assistant_text",
                data: { text: block.text },
              });
            }
          } else if (block.type === "tool_use") {
            this.lastToolName = (block.name as string) || "unknown";
            this.emitSessionEvent({
              type: "tool_use",
              data: {
                tool: this.lastToolName,
                input: (block.input as Record<string, unknown>) || {},
              },
            });
          }
        }
        // Clear streamed block tracking for next turn
        this.streamedTextBlockIds.clear();
        break;
      }

      case "tool_result": {
        const rawContent = parsed.content as string | undefined;
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");
        const { text, truncated } = truncateOutput(content, MAX_TOOL_RESULT_LINES);
        this.emitSessionEvent({
          type: "tool_result",
          data: {
            tool: this.lastToolName,
            output: text,
            truncated,
          },
        });
        break;
      }

      case "result": {
        const durationMs = parsed.duration_ms as number | undefined;
        const costUsd = parsed.cost_usd as number | undefined;
        const parts: string[] = ["Session completed"];
        if (durationMs) parts[0] += ` (${formatDuration(durationMs)}`;
        if (costUsd !== undefined) {
          parts[0] += durationMs ? `, cost: $${costUsd.toFixed(2)})` : ` (cost: $${costUsd.toFixed(2)})`;
        } else if (durationMs) {
          parts[0] += ")";
        }
        this.emitSessionEvent({
          type: "system",
          data: { message: parts[0] },
        });
        break;
      }

      default:
        // Unknown event types are silently ignored
        break;
    }
  }

  private emitSessionEvent(event: { type: string; data: Record<string, unknown> }): void {
    if (this.eventCounter >= MAX_EVENTS) {
      if (this.eventCounter === MAX_EVENTS) {
        // Emit one final error event and kill
        const errorEvent: SessionEvent = {
          id: this.eventCounter++,
          timestamp: new Date().toISOString(),
          type: "error",
          data: { message: `Event limit reached (${MAX_EVENTS}). Session terminated.` },
        };
        this.metadata.eventCount = this.eventCounter;
        appendFile(this.options.eventLogPath, JSON.stringify(errorEvent) + "\n").catch(() => {});
        this.emit("event", errorEvent);
        this.kill("failed");
      }
      return;
    }

    const sessionEvent: SessionEvent = {
      id: this.eventCounter++,
      timestamp: new Date().toISOString(),
      type: event.type as SessionEvent["type"],
      data: event.data,
    };

    this.metadata.eventCount = this.eventCounter;

    // Fire-and-forget append to NDJSON log
    appendFile(this.options.eventLogPath, JSON.stringify(sessionEvent) + "\n").catch((err) => {
      console.error("Failed to append event to log:", err);
    });

    this.emit("event", sessionEvent);
  }
}
