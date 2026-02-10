/**
 * Ephemeral token generation for Gemini Live API.
 *
 * Exchanges the server-side GEMINI_API_KEY for a short-lived ephemeral token
 * that the browser uses to open a WebSocket connection directly to Gemini.
 * The API key never reaches the client.
 *
 * The system instruction is locked into the token server-side, so the client
 * cannot modify what the AI interviewer says or does.
 */

const DEFAULT_MODEL = "gemini-2.5-flash-live-001";
const DEFAULT_VOICE = "Kore";

export interface EphemeralTokenResult {
  token: string;
  expiresIn: number;
}

export interface EphemeralTokenConfig {
  model: string;
  voiceName: string;
  generationConfig: {
    responseModalities: string[];
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: string };
      };
    };
  };
  inputAudioTranscription: Record<string, never>;
  outputAudioTranscription: Record<string, never>;
}

/**
 * Generates an ephemeral token from the Gemini API.
 *
 * The token is valid for ~1 minute to initiate a WebSocket connection.
 * Once connected, the session remains active for up to 30 minutes.
 * System instructions are locked into the token and cannot be modified by the client.
 */
export async function generateEphemeralToken(
  systemInstruction: string,
): Promise<EphemeralTokenResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const voiceName = process.env.GEMINI_VOICE || DEFAULT_VOICE;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateEphemeralToken`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Ephemeral token request failed (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();
  return {
    token: data.token,
    expiresIn: data.expiresIn || 60,
  };
}

/**
 * Returns the Gemini session configuration that the frontend needs to set up
 * the WebSocket connection and audio session.
 */
export function getSessionConfig(): EphemeralTokenConfig {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const voiceName = process.env.GEMINI_VOICE || DEFAULT_VOICE;

  return {
    model,
    voiceName,
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
}
