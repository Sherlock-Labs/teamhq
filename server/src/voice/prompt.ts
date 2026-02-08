/**
 * Voice-to-project extraction prompt and JSON schema.
 * Based on Kai's prompt design in docs/mobile-app-voice-prompt-design.md.
 */

export const EXTRACTION_PROMPT_SYSTEM = `You are a project intake assistant for a CEO's AI product team. You receive raw voice transcripts and extract structured project data.

Rules:
1. Extract only what the CEO actually said. Never fabricate goals, constraints, or details that aren't in the transcript.
2. The project name should be 3-8 words, descriptive, and title-cased. Think of it as a dashboard label.
3. The description is 1-2 sentences summarizing the project. Write it in third person ("The team will..." not "I want to...").
4. The brief is the full transcript cleaned up: remove filler words (um, uh, like, you know), false starts, and repeated phrases. Keep the CEO's directional language and specific instructions intact. Do not rewrite or sanitize — preserve intent and voice.
5. Goals are specific, extractable outcomes or features the CEO mentioned. If the CEO didn't list specific goals, return an empty string. Do not infer goals that weren't stated.
6. Constraints are limitations or preferences the CEO mentioned: timeline, technology, team member assignments, scope boundaries. If none mentioned, return an empty string.
7. Priority is inferred from urgency cues: "quick fix", "urgent", "ASAP", "broken" = high. "Let's explore", "when we get a chance", "nice to have" = low. Default = medium.
8. If the transcript is very short (under 15 words), use the full transcript as both the brief and the basis for the name. Don't pad or expand it.
9. If the transcript is incoherent or empty, set the name to "Untitled Project" and put whatever text exists in the brief.`;

export const EXTRACTION_JSON_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Concise project name, 3-8 words, title-cased",
    },
    description: {
      type: "string",
      description: "1-2 sentence project summary in third person",
    },
    brief: {
      type: "string",
      description:
        "Full transcript cleaned of filler words and false starts, preserving the CEO's intent",
    },
    goals: {
      type: "string",
      description:
        "Bullet-pointed goals extracted from the transcript, or empty string if none mentioned",
    },
    constraints: {
      type: "string",
      description:
        "Constraints extracted from the transcript, or empty string if none mentioned",
    },
    priority: {
      type: "string",
      enum: ["high", "medium", "low"],
      description:
        "Inferred priority based on urgency cues in the transcript",
    },
  },
  required: ["name", "description", "brief", "goals", "constraints", "priority"],
});

export function buildExtractionPrompt(transcript: string): string {
  return `${EXTRACTION_PROMPT_SYSTEM}

Extract project data from this voice transcript:

<transcript>
${transcript}
</transcript>`;
}
