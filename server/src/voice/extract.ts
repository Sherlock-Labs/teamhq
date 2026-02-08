import { spawn } from "child_process";
import type { Request, Response } from "express";
import { z } from "zod";
import { buildExtractionPrompt, EXTRACTION_JSON_SCHEMA } from "./prompt.js";

const ExtractRequestSchema = z.object({
  transcript: z.string().min(1).max(50_000),
});

const ExtractResponseSchema = z.object({
  name: z.string(),
  description: z.string(),
  brief: z.string(),
  goals: z.string(),
  constraints: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;

function fallbackResponse(transcript: string): ExtractResponse {
  return {
    name: "Untitled Project",
    description: "",
    brief: transcript,
    goals: "",
    constraints: "",
    priority: "medium",
  };
}

/**
 * Spawns `claude -p` with structured JSON output to extract project data
 * from a voice transcript. Follows the same pattern as the OST tool's runClaude().
 */
function runClaude(prompt: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("claude", [
      "-p",
      "--output-format", "json",
      "--json-schema", EXTRACTION_JSON_SCHEMA,
    ], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("claude -p timed out"));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`claude exited with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

/**
 * POST /api/voice/extract
 *
 * Accepts { transcript: string }, runs claude -p with Kai's prompt template
 * and JSON schema to extract structured project data.
 * Returns { name, description, brief, goals, constraints, priority }.
 * Falls back to raw transcript if extraction fails.
 */
export async function voiceExtractHandler(req: Request, res: Response): Promise<void> {
  const parsed = ExtractRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request",
      details: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  const { transcript } = parsed.data;
  const prompt = buildExtractionPrompt(transcript);

  try {
    const raw = await runClaude(prompt, 10_000);

    // Parse the JSON output — claude may return the result directly
    // or wrapped in a result object
    let jsonOutput: unknown;
    try {
      jsonOutput = JSON.parse(raw);
    } catch {
      console.error("Failed to parse claude JSON output:", raw);
      res.json(fallbackResponse(transcript));
      return;
    }

    // If claude wraps in { result: ... }, unwrap it
    const data = typeof jsonOutput === "object" && jsonOutput !== null && "result" in jsonOutput
      ? (jsonOutput as Record<string, unknown>).result
      : jsonOutput;

    const validated = ExtractResponseSchema.safeParse(data);
    if (!validated.success) {
      console.error("Claude output failed validation:", validated.error);
      res.json(fallbackResponse(transcript));
      return;
    }

    res.json(validated.data);
  } catch (err) {
    console.error("Voice extraction failed:", err);
    res.json(fallbackResponse(transcript));
  }
}
