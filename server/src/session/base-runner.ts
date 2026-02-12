import { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { appendFile, writeFile } from "node:fs/promises";
import type { SessionEvent, SessionMetadata, SessionStatus, RunnerState } from "../schemas/session.js";

export const MAX_EVENTS = 5000;
export const MAX_TOOL_RESULT_LINES = 200;

const TURN_TIMEOUT_MS = 1_800_000;   // 30 minutes per turn
const IDLE_TIMEOUT_MS = 1_800_000;   // 30 minutes idle between turns
const MAX_LIFETIME_MS = 14_400_000;  // 4 hours session max

export interface SessionRunnerOptions {
  sessionId: string;
  projectId: string;
  prompt: string;
  metadataPath: string;
  eventLogPath: string;
  timeoutMs?: number;
  workingDirectory: string;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function truncateOutput(output: string, maxLines: number): { text: string; truncated: boolean } {
  if (typeof output !== "string") return { text: String(output), truncated: false };
  const lines = output.split("\n");
  if (lines.length <= maxLines) return { text: output, truncated: false };
  const truncated = lines.slice(0, maxLines).join("\n");
  return {
    text: truncated + `\n[... truncated, ${lines.length} total lines]`,
    truncated: true,
  };
}

export abstract class BaseSessionRunner extends EventEmitter {
  protected process: ChildProcess | null = null;
  protected metadata: SessionMetadata;
  protected eventCounter: number = 0;
  protected lastToolName: string = "";
  protected streamedTextBlockIds: Set<number> = new Set();
  protected currentContentBlockIndex: number = -1;
  protected killed: boolean = false;
  protected cliSessionId: string | null = null;

  private state: RunnerState = "processing";
  private turnCount: number = 0;
  private turnTimeoutTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private maxLifetimeTimer: NodeJS.Timeout | null = null;
  private killTimer: NodeJS.Timeout | null = null;

  constructor(protected options: SessionRunnerOptions) {
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
      cliSessionId: null,
      turnCount: 1,
      state: "processing",
    };
  }

  // --- Public API ---

  get sessionId(): string {
    return this.options.sessionId;
  }

  /** Return current session metadata (for immediate response after start) */
  getMetadata(): SessionMetadata {
    return { ...this.metadata };
  }

  get pid(): number | null {
    return this.process?.pid ?? null;
  }

  get currentState(): RunnerState {
    return this.state;
  }

  get sessionTurnCount(): number {
    return this.turnCount;
  }

  start(): void {
    this.turnCount = 1;
    this.metadata.turnCount = 1;

    this.emitSessionEvent({ type: "system", data: { message: "Session started" } });
    this.emitSessionEvent({ type: "turn_start", data: { turnNumber: 1 } });

    this.startMaxLifetimeTimer();
    this.writeMetadata();

    this.spawnTurn(this.options.prompt);
  }

  sendMessage(message: string): void {
    if (this.state !== "idle") throw new Error("Session is not idle");
    if (this.killed) throw new Error("Session has been stopped");

    this.clearIdleTimer();
    this.state = "processing";
    this.metadata.state = "processing";
    this.turnCount++;
    this.metadata.turnCount = this.turnCount;

    this.emitSessionEvent({
      type: "user_message",
      data: { message: message.slice(0, 500), turnNumber: this.turnCount },
    });
    this.emitSessionEvent({
      type: "turn_start",
      data: { turnNumber: this.turnCount },
    });

    this.writeMetadata();
    this.deliverMessage(message);
  }

  stop(): void {
    if (this.state === "ended") return;
    this.killed = true;
    this.clearAllTimers();
    this.killProcess();
    this.finalize("stopped");
  }

  // --- Abstract: mode-specific behavior ---

  protected abstract spawnTurn(prompt: string): void;
  protected abstract deliverMessage(message: string): void;

  // --- Process management ---

  protected killProcess(): void {
    if (!this.process) return;

    this.process.kill("SIGTERM");
    this.killTimer = setTimeout(() => {
      if (this.process && !this.process.killed) {
        this.process.kill("SIGKILL");
      }
    }, 10_000);
  }

  // --- Turn lifecycle (called by subclasses) ---

  protected onTurnComplete(exitCode: number | null, durationMs?: number, costUsd?: number): void {
    this.clearTurnTimeout();

    if (this.killTimer) {
      clearTimeout(this.killTimer);
      this.killTimer = null;
    }

    // If session was killed while this turn was running, finalize
    if (this.killed) {
      this.finalize("stopped");
      return;
    }

    // Emit turn_end
    this.emitSessionEvent({
      type: "turn_end",
      data: {
        turnNumber: this.turnCount,
        exitCode,
        ...(durationMs !== undefined && { durationMs }),
        ...(costUsd !== undefined && { costUsd }),
      },
    });

    if (exitCode !== null && exitCode !== 0) {
      this.emitSessionEvent({
        type: "error",
        data: { message: `Turn ${this.turnCount} failed (exit code ${exitCode})` },
      });
    }

    // Transition to idle
    this.state = "idle";
    this.metadata.state = "idle";
    this.metadata.pid = null;

    this.emitSessionEvent({
      type: "waiting_for_input",
      data: { turnNumber: this.turnCount },
    });

    this.resetTurnState();
    this.startIdleTimer();
    this.writeMetadata();
  }

  protected onSpawnError(err: Error): void {
    this.emitSessionEvent({
      type: "error",
      data: { message: `Failed to spawn claude process: ${err.message}` },
    });
  }

  // --- NDJSON Event Parsing ---

  protected parseCliEvent(line: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      return; // Skip non-JSON lines
    }

    const type = parsed.type as string;

    // Capture session ID from system init or result events
    if (type === "system" && typeof parsed.session_id === "string") {
      this.cliSessionId = parsed.session_id;
      this.metadata.cliSessionId = this.cliSessionId;
    }

    switch (type) {
      case "system": {
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
        // Capture session ID from result event
        if (typeof parsed.session_id === "string") {
          this.cliSessionId = parsed.session_id;
          this.metadata.cliSessionId = this.cliSessionId;
        }

        const durationMs = parsed.duration_ms as number | undefined;
        const costUsd = parsed.cost_usd as number | undefined;

        // Emit a system event with turn summary
        const parts: string[] = [`Turn ${this.turnCount} completed`];
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

        // Notify subclass that the CLI considers this turn done
        this.handleResultEvent(parsed);
        break;
      }

      default:
        break;
    }
  }

  /**
   * Called when a `result` event is parsed from CLI output.
   * Subclasses use this to manage turn boundaries.
   * StreamingRunner: transitions to idle (process stays alive).
   * ResumeRunner: no-op (process close handler manages transitions).
   */
  protected handleResultEvent(_parsed: Record<string, unknown>): void {
    // Default: no-op. Overridden by StreamingRunner.
  }

  // --- Event Emission ---

  protected emitSessionEvent(event: { type: string; data: Record<string, unknown> }): void {
    if (this.eventCounter >= MAX_EVENTS) {
      if (this.eventCounter === MAX_EVENTS) {
        const errorEvent: SessionEvent = {
          id: this.eventCounter++,
          timestamp: new Date().toISOString(),
          type: "error",
          data: { message: `Event limit reached (${MAX_EVENTS}). Session terminated.` },
        };
        this.metadata.eventCount = this.eventCounter;
        appendFile(this.options.eventLogPath, JSON.stringify(errorEvent) + "\n").catch(() => {});
        this.emit("event", errorEvent);
        this.stop();
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

    appendFile(this.options.eventLogPath, JSON.stringify(sessionEvent) + "\n").catch((err) => {
      console.error("Failed to append event to log:", err);
    });

    this.emit("event", sessionEvent);
  }

  // --- Session Finalization ---

  protected finalize(status: SessionStatus): void {
    if (this.state === "ended") return;
    this.state = "ended";
    this.metadata.state = "ended";
    this.clearAllTimers();

    this.metadata.status = status;
    this.metadata.endedAt = new Date().toISOString();
    this.metadata.durationMs = Date.now() - new Date(this.metadata.startedAt).getTime();
    this.metadata.pid = null;

    // Emit final lifecycle event
    if (status === "completed") {
      this.emitSessionEvent({
        type: "system",
        data: { message: `Session completed (${formatDuration(this.metadata.durationMs)})` },
      });
    } else if (status === "timed-out") {
      this.emitSessionEvent({
        type: "error",
        data: { message: "Session timed out" },
      });
    } else if (status === "stopped") {
      this.emitSessionEvent({
        type: "system",
        data: { message: "Session stopped by user" },
      });
    } else {
      this.emitSessionEvent({
        type: "error",
        data: { message: `Session failed` },
      });
    }

    this.writeMetadata();
    this.emit("end", this.metadata);
  }

  // --- Per-turn state reset ---

  protected resetTurnState(): void {
    this.lastToolName = "";
    this.streamedTextBlockIds.clear();
    this.currentContentBlockIndex = -1;
  }

  // --- Timers ---

  protected startTurnTimeout(): void {
    this.clearTurnTimeout();
    const ms = this.options.timeoutMs ?? TURN_TIMEOUT_MS;
    this.turnTimeoutTimer = setTimeout(() => {
      this.killed = true;
      this.killProcess();
      this.finalize("timed-out");
    }, ms);
  }

  protected clearTurnTimeout(): void {
    if (this.turnTimeoutTimer) {
      clearTimeout(this.turnTimeoutTimer);
      this.turnTimeoutTimer = null;
    }
  }

  private startIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.emitSessionEvent({
        type: "system",
        data: { message: "Session timed out (idle)" },
      });
      this.killProcess();
      this.finalize("timed-out");
    }, IDLE_TIMEOUT_MS);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private startMaxLifetimeTimer(): void {
    this.maxLifetimeTimer = setTimeout(() => {
      this.emitSessionEvent({
        type: "system",
        data: { message: "Session reached maximum lifetime (4 hours)" },
      });
      this.killed = true;
      this.killProcess();
      this.finalize("timed-out");
    }, MAX_LIFETIME_MS);
  }

  private clearAllTimers(): void {
    this.clearTurnTimeout();
    this.clearIdleTimer();
    if (this.maxLifetimeTimer) {
      clearTimeout(this.maxLifetimeTimer);
      this.maxLifetimeTimer = null;
    }
    if (this.killTimer) {
      clearTimeout(this.killTimer);
      this.killTimer = null;
    }
  }

  // --- Metadata persistence ---

  protected writeMetadata(): void {
    writeFile(this.options.metadataPath, JSON.stringify(this.metadata, null, 2)).catch((err) => {
      console.error("Failed to write session metadata:", err);
    });
  }
}
