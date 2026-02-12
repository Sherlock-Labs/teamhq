import { SessionRunner } from "./runner.js";
import type { SessionMetadata } from "../schemas/session.js";

const MAX_CONCURRENT_SESSIONS = 3;

class SessionManager {
  private runningSessions: Map<string, SessionRunner> = new Map();
  private projectToSession: Map<string, string> = new Map();

  get runningCount(): number {
    return this.runningSessions.size;
  }

  canStartSession(projectId: string): { ok: boolean; reason?: string } {
    if (this.projectToSession.has(projectId)) {
      return { ok: false, reason: "A session is already running for this project" };
    }
    if (this.runningSessions.size >= MAX_CONCURRENT_SESSIONS) {
      return { ok: false, reason: `Maximum concurrent sessions (${MAX_CONCURRENT_SESSIONS}) reached` };
    }
    return { ok: true };
  }

  tryStartSession(
    sessionId: string,
    projectId: string,
    runner: SessionRunner
  ): { ok: boolean; reason?: string } {
    const check = this.canStartSession(projectId);
    if (!check.ok) return check;

    this.runningSessions.set(sessionId, runner);
    this.projectToSession.set(projectId, sessionId);

    runner.on("end", () => {
      this.runningSessions.delete(sessionId);
      this.projectToSession.delete(projectId);
    });

    return { ok: true };
  }

  registerSession(sessionId: string, projectId: string, runner: SessionRunner): void {
    const result = this.tryStartSession(sessionId, projectId, runner);
    if (!result.ok) {
      throw new Error(result.reason || "Session start denied");
    }
  }

  getRunner(sessionId: string): SessionRunner | undefined {
    return this.runningSessions.get(sessionId);
  }

  getRunnerByProject(projectId: string): SessionRunner | undefined {
    const sessionId = this.projectToSession.get(projectId);
    return sessionId ? this.runningSessions.get(sessionId) : undefined;
  }

  stopSession(sessionId: string): boolean {
    const runner = this.runningSessions.get(sessionId);
    if (!runner) return false;
    runner.stop();
    return true;
  }

  async stopAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [, runner] of this.runningSessions) {
      promises.push(
        new Promise<void>((resolve) => {
          runner.on("end", () => resolve());
          runner.stop();
        })
      );
    }
    await Promise.allSettled(promises);
  }
}

export const sessionManager = new SessionManager();
