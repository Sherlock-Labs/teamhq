/**
 * Gemini fallback for when Claude API is overloaded.
 * Uses Gemini 2.5 Pro via REST API for agent reasoning.
 *
 * Note: Gemini can't use Claude Code tools (file read/write, bash).
 * It can only reason and output instructions. The heartbeat runner
 * then executes those instructions via the TeamHQ API.
 */

const GEMINI_MODEL = "gemini-2.5-pro-preview-06-05";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string };
}

export async function runGemini(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ success: boolean; output: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, output: "", error: "GEMINI_API_KEY not set" };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    console.log("[gemini] Calling Gemini as fallback...");

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, output: "", error: `Gemini API ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = (await res.json()) as GeminiResponse;

    if (data.error) {
      return { success: false, output: "", error: `Gemini error: ${data.error.message}` };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      return { success: false, output: "", error: "Gemini returned empty response" };
    }

    console.log(`[gemini] Got response: ${text.length} chars`);
    return { success: true, output: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", error: `Gemini fetch failed: ${msg}` };
  }
}
