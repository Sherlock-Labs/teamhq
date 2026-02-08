/**
 * Session Runner — factory and re-exports.
 *
 * Supports two CLI modes:
 * - "streaming": single long-lived process with --input-format stream-json (default)
 * - "resume": process-per-turn with --resume <session_id>
 *
 * Both modes expose the same public API via BaseSessionRunner.
 * Switch modes with SESSION_RUNNER_MODE env var.
 */

export { BaseSessionRunner as SessionRunner } from "./base-runner.js";
export type { SessionRunnerOptions } from "./base-runner.js";

import { BaseSessionRunner, type SessionRunnerOptions } from "./base-runner.js";
import { StreamingRunner } from "./streaming-runner.js";
import { ResumeRunner } from "./resume-runner.js";

export type RunnerMode = "streaming" | "resume";

const DEFAULT_MODE: RunnerMode = "streaming";

export function getRunnerMode(): RunnerMode {
  const mode = process.env.SESSION_RUNNER_MODE;
  if (mode === "resume") return "resume";
  return DEFAULT_MODE;
}

export function createRunner(options: SessionRunnerOptions): BaseSessionRunner {
  const mode = getRunnerMode();
  if (mode === "resume") {
    return new ResumeRunner(options);
  }
  return new StreamingRunner(options);
}
