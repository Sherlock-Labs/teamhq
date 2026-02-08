import { spawn } from "node:child_process";

export interface ClaudeRunnerOptions {
  model?: string;
  jsonSchema?: object;
  timeoutMs?: number;
}

/**
 * Shells out to the `claude` CLI with a prompt (via stdin) and returns parsed JSON/structured output.
 *
 * When --json-schema is used, claude puts the result in `structured_output` (not `result`).
 * When no schema, the text response goes in `result`.
 */
export async function runClaude(
  prompt: string,
  options: ClaudeRunnerOptions = {}
): Promise<unknown> {
  const { model, jsonSchema, timeoutMs = 300_000 } = options;

  const args: string[] = ["-p", "--output-format", "json"];

  if (model) {
    args.push("--model", model);
  }

  if (jsonSchema) {
    args.push("--json-schema", JSON.stringify(jsonSchema));
  }

  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      reject(new Error(`claude-runner spawn failed: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `claude-runner exited with code ${code}${stderr ? `\nstderr: ${stderr}` : ""}`
          )
        );
        return;
      }

      try {
        const envelope = JSON.parse(stdout);

        // When --json-schema is used, structured output lives in `structured_output`
        if (
          typeof envelope === "object" &&
          envelope !== null &&
          "structured_output" in envelope &&
          envelope.structured_output != null
        ) {
          resolve(envelope.structured_output);
          return;
        }

        // Otherwise, the text result is in `result`
        const result =
          typeof envelope === "object" && envelope !== null && "result" in envelope
            ? envelope.result
            : envelope;

        // The result may be a JSON string that needs parsing
        if (typeof result === "string") {
          try {
            resolve(JSON.parse(result));
          } catch {
            resolve(result);
          }
          return;
        }

        resolve(result);
      } catch {
        reject(
          new Error(
            `Failed to parse claude output as JSON: ${stdout.slice(0, 500)}`
          )
        );
      }
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`claude-runner timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", () => clearTimeout(timeout));

    // Write prompt to stdin and close it
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
