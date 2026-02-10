import type { Meeting } from "../schemas/meeting.js";
import type { Project } from "../schemas/project.js";

/**
 * Builds the system instruction for the Gemini Live API ephemeral token.
 * This instruction is locked server-side — the client cannot modify it.
 */
export function buildInterviewSystemInstruction(
  topic: string,
  context?: string,
  projectSummaries?: string,
  recentMeetingSummaries?: string,
): string {
  const sections: string[] = [];

  sections.push(`You are an AI interviewer for Sherlock Labs, a software product team led by its CEO. You are conducting a one-on-one audio interview with the CEO.

Your name is "Interviewer" -- do not make up a human name for yourself. You are a professional, thoughtful AI interviewer.

## Interview Topic
${topic}
${context ? `\n## Additional Context\n${context}` : ""}

## Your Role
- Ask thoughtful, open-ended questions about the given topic
- Listen carefully and ask follow-up questions based on what the CEO says
- Cover all key areas related to the topic
- Periodically summarize what you have heard before moving to a new area
- Wrap up by confirming the main takeaways and asking if there is anything else

## Conversation Style
- Be conversational and natural, not robotic or scripted
- Give the CEO time to think -- do not rush to fill silences
- If the CEO goes off-topic, gently guide back but do not cut them off
- Use brief verbal acknowledgments ("I see", "That makes sense") to show you are listening
- Do not be sycophantic -- ask genuine follow-up questions, including challenging ones

## Timing
- Aim for a 10-15 minute conversation unless the CEO wants to go longer
- After about 12 minutes, begin steering toward wrap-up
- End by summarizing the key points you heard and asking if there is anything else to add

## Important Rules
- Never fabricate information about Sherlock Labs or its products
- If you do not know something, ask the CEO rather than guessing
- Focus on capturing the CEO's thinking, not providing your own opinions
- This is an interview, not a debate -- your job is to draw out information`);

  if (projectSummaries) {
    sections.push(`## Current Projects at Sherlock Labs
${projectSummaries}`);
  }

  if (recentMeetingSummaries) {
    sections.push(`## Recent Meeting Context
${recentMeetingSummaries}`);
  }

  return sections.join("\n\n");
}

/**
 * Builds the Claude post-processing prompt for interview transcripts.
 * Uses the same MeetingOutputJsonSchema as other meeting types.
 */
export function buildPostProcessPrompt(
  topic: string,
  context: string | undefined,
  transcriptText: string,
): string {
  return `Analyze this interview transcript between the CEO of Sherlock Labs and an AI interviewer.

## Interview Topic
${topic}
${context ? `\nAdditional context: ${context}` : ""}

## Instructions
Generate a structured summary of this interview. Focus on what the CEO said -- their decisions, priorities, concerns, and action items.

- **summary**: A 2-3 sentence summary of the interview capturing the main thrust of the CEO's thinking.
- **keyTakeaways**: 3-5 key takeaways -- the most important things the CEO communicated.
- **decisions**: Any decisions the CEO articulated during the interview. Include the rationale if stated. Set participants to ["CEO"].
- **actionItems**: Any action items the CEO mentioned or committed to. Assign owner as the person the CEO named (or "CEO" if self-assigned). Assess priority based on the CEO's emphasis.
- **mood**: The overall tone of the interview in 1-3 words (e.g., "Focused and energized", "Reflective", "Urgently strategic").
- **nextMeetingTopics**: Topics the CEO flagged for follow-up or deeper discussion later.
- **transcript**: Return the transcript as-is (do not modify it). Each entry should have speaker, role, and text fields.

## Transcript
${transcriptText}`;
}

/**
 * Formats project data into a summary string for injection into the system instruction.
 */
export function formatProjectSummaries(projects: Project[]): string | undefined {
  if (projects.length === 0) return undefined;

  const lines = projects.map(
    (p) => `- **${p.name}** (${p.status}): ${p.description || "No description"}`
  );
  return lines.join("\n");
}

/**
 * Formats recent meeting data into a summary string for injection into the system instruction.
 */
export function formatMeetingSummaries(meetings: Meeting[]): string | undefined {
  if (meetings.length === 0) return undefined;

  const lines: string[] = [];
  for (const meeting of meetings) {
    lines.push(`### Meeting #${meeting.meetingNumber} (${meeting.type})`);
    if (meeting.summary) {
      lines.push(`Summary: ${meeting.summary}`);
    }
    if (meeting.decisions.length > 0) {
      lines.push("Decisions:");
      for (const d of meeting.decisions) {
        lines.push(`- ${d.description}`);
      }
    }
    if (meeting.actionItems.length > 0) {
      lines.push("Action Items:");
      for (const a of meeting.actionItems) {
        lines.push(`- [${a.priority}] ${a.owner}: ${a.description}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}
