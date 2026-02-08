import type { Request, Response } from "express";
import WebSocket from "ws";

const VOXTRAL_REALTIME_URL =
  "wss://api.mistral.ai/v1/audio/realtime?model=voxtral-mini-transcribe-realtime-2602";

/**
 * GET /api/voice/health
 *
 * Checks if the MISTRAL_API_KEY env var is set and optionally pings
 * the Voxtral Realtime API to verify connectivity.
 */
export async function voiceHealthHandler(_req: Request, res: Response): Promise<void> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    res.json({
      voxtral: "unreachable",
      message: "MISTRAL_API_KEY environment variable is not set",
      latencyMs: 0,
    });
    return;
  }

  const start = Date.now();

  try {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(VOXTRAL_REALTIME_URL, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Connection timed out"));
      }, 5000);

      ws.on("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const latencyMs = Date.now() - start;
    res.json({ voxtral: "ok", latencyMs });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : "Unknown error";
    res.json({ voxtral: "unreachable", message, latencyMs });
  }
}
