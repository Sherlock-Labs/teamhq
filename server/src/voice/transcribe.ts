import WebSocket from "ws";
import type { IncomingMessage } from "http";

const VOXTRAL_REALTIME_URL =
  "wss://api.mistral.ai/v1/audio/realtime?model=voxtral-mini-transcribe-realtime-2602";

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_TIMEOUT_MS = 5000;

interface ClientMessage {
  type: "audio" | "stop";
  data?: string; // base64-encoded PCM for "audio" type
}

/**
 * Opens a WebSocket connection to the Voxtral Realtime API.
 * Returns the WebSocket instance.
 */
function connectToVoxtral(apiKey: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(VOXTRAL_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Voxtral connection timed out"));
    }, 10_000);

    ws.on("open", () => {
      clearTimeout(timeout);
      resolve(ws);
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Sends the initial configuration message to Voxtral after connection.
 */
function sendVoxtralConfig(voxtral: WebSocket): void {
  voxtral.send(JSON.stringify({
    type: "config",
    audio_format: {
      encoding: "pcm_s16le",
      sample_rate: 16000,
    },
    transcription_delay_ms: 480,
    language: "en",
  }));
}

/**
 * Handles a single WebSocket connection for voice transcription.
 *
 * Protocol (phone <-> server):
 *   Client sends: { type: "audio", data: "<base64>" } or { type: "stop" }
 *   Server sends: { type: "ready" }, { type: "transcript", text, final },
 *                 { type: "done", text }, { type: "error", message }
 *
 * Server <-> Voxtral:
 *   Server sends: config message, then raw PCM bytes
 *   Voxtral sends: JSON events (TranscriptionStreamTextDelta, TranscriptionStreamDone, etc.)
 */
export function handleVoiceConnection(clientWs: WebSocket, _req: IncomingMessage): void {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    clientWs.send(JSON.stringify({
      type: "error",
      message: "MISTRAL_API_KEY is not configured on the server",
    }));
    clientWs.close();
    return;
  }

  let voxtralWs: WebSocket | null = null;
  let accumulatedText = "";
  let isStopping = false;
  let isClientClosed = false;

  function sendToClient(data: Record<string, unknown>): void {
    if (!isClientClosed && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(data));
    }
  }

  function cleanup(): void {
    if (voxtralWs && voxtralWs.readyState !== WebSocket.CLOSED) {
      voxtralWs.close();
    }
    voxtralWs = null;
  }

  /**
   * Sets up event listeners on the Voxtral WebSocket.
   */
  function wireVoxtralEvents(ws: WebSocket): void {
    ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Handle session_created — Voxtral is ready
        if (msg.type === "session_created" || msg.type === "session.created") {
          sendToClient({ type: "ready" });
          return;
        }

        // Handle text delta — partial transcript
        if (
          msg.type === "transcription.text_delta" ||
          msg.type === "TranscriptionStreamTextDelta"
        ) {
          const text = msg.text || msg.data?.text || "";
          if (text) {
            accumulatedText += text;
            sendToClient({ type: "transcript", text: accumulatedText, final: false });
          }
          return;
        }

        // Handle transcription done — final result
        if (
          msg.type === "transcription.done" ||
          msg.type === "TranscriptionStreamDone"
        ) {
          const finalText = msg.text || accumulatedText;
          sendToClient({ type: "done", text: finalText });
          cleanup();
          return;
        }

        // Handle errors from Voxtral
        if (
          msg.type === "error" ||
          msg.type === "RealtimeTranscriptionError"
        ) {
          const message = msg.message || msg.error?.message || "Voxtral error";
          console.error("Voxtral error:", message);
          sendToClient({ type: "error", message });
          return;
        }
      } catch (err) {
        console.error("Failed to parse Voxtral message:", err);
      }
    });

    ws.on("close", () => {
      if (!isStopping && !isClientClosed) {
        // Unexpected close — try reconnecting
        handleVoxtralDisconnect();
      }
    });

    ws.on("error", (err) => {
      console.error("Voxtral WebSocket error:", err.message);
      if (!isStopping && !isClientClosed) {
        handleVoxtralDisconnect();
      }
    });
  }

  /**
   * Attempts to reconnect to Voxtral after an unexpected disconnection.
   */
  async function handleVoxtralDisconnect(): Promise<void> {
    sendToClient({ type: "error", message: "Transcription interrupted, reconnecting..." });

    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      try {
        const ws = await connectToVoxtral(apiKey!);
        sendVoxtralConfig(ws);
        wireVoxtralEvents(ws);
        voxtralWs = ws;
        sendToClient({ type: "ready" });
        return;
      } catch (err) {
        console.error(`Voxtral reconnect attempt ${attempt} failed:`, err);
        if (attempt < MAX_RECONNECT_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RECONNECT_TIMEOUT_MS / MAX_RECONNECT_ATTEMPTS));
        }
      }
    }

    sendToClient({ type: "error", message: "Transcription unavailable" });
  }

  /**
   * Initial Voxtral connection setup.
   */
  async function initVoxtral(): Promise<void> {
    try {
      const ws = await connectToVoxtral(apiKey!);
      sendVoxtralConfig(ws);
      wireVoxtralEvents(ws);
      voxtralWs = ws;
      // "ready" will be sent when Voxtral sends session_created
      // If Voxtral doesn't send session_created, send ready after config
      // as a fallback (some WebSocket APIs are ready immediately)
      setTimeout(() => {
        if (voxtralWs === ws && clientWs.readyState === WebSocket.OPEN) {
          sendToClient({ type: "ready" });
        }
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect to Voxtral";
      console.error("Voxtral initial connection failed:", message);
      sendToClient({ type: "error", message: `Transcription service unavailable: ${message}` });
      clientWs.close();
    }
  }

  // Handle messages from the mobile client
  clientWs.on("message", (data: WebSocket.Data) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      if (msg.type === "audio" && msg.data) {
        // Decode base64 to raw bytes and forward to Voxtral
        if (voxtralWs && voxtralWs.readyState === WebSocket.OPEN) {
          const pcmBytes = Buffer.from(msg.data, "base64");
          voxtralWs.send(pcmBytes);
        }
        return;
      }

      if (msg.type === "stop") {
        isStopping = true;
        // Signal end of audio to Voxtral by closing the connection gracefully
        if (voxtralWs && voxtralWs.readyState === WebSocket.OPEN) {
          // Send a close frame — Voxtral should respond with final transcript
          voxtralWs.close();
        } else {
          // Voxtral not connected, send done with what we have
          sendToClient({ type: "done", text: accumulatedText });
        }
        return;
      }
    } catch (err) {
      console.error("Failed to parse client message:", err);
      sendToClient({ type: "error", message: "Invalid message format" });
    }
  });

  clientWs.on("close", () => {
    isClientClosed = true;
    cleanup();
  });

  clientWs.on("error", (err) => {
    console.error("Client WebSocket error:", err.message);
    isClientClosed = true;
    cleanup();
  });

  // Start the Voxtral connection
  initVoxtral();
}
