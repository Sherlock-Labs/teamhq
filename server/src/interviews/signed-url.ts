/**
 * Generates a signed URL for ElevenLabs Conversational AI.
 * The signed URL authenticates the browser's WebSocket connection
 * without exposing the API key to the client.
 */
export async function getSignedUrl(): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  if (!agentId) throw new Error("ELEVENLABS_AGENT_ID is not set");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Signed URL request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.signed_url;
}
