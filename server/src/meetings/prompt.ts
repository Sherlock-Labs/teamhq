import type { MeetingContext } from "./context.js";
import type { MeetingType, Meeting } from "../schemas/meeting.js";

const AGENT_DISPLAY_NAMES: Record<string, { name: string; role: string }> = {
  "product-manager": { name: "Thomas", role: "Product Manager" },
  "technical-architect": { name: "Andrei", role: "Technical Architect" },
  "product-designer": { name: "Robert", role: "Product Designer" },
  "frontend-developer": { name: "Alice", role: "Front-End Developer" },
  "backend-developer": { name: "Jonah", role: "Back-End Developer" },
  "qa": { name: "Enzo", role: "QA Engineer" },
};

/**
 * Builds the full meeting prompt from type and context.
 */
export function buildMeetingPrompt(
  type: MeetingType,
  context: MeetingContext,
  agenda?: string
): string {
  const sections: string[] = [];

  // System instruction
  sections.push(buildSystemInstruction());

  // Agent personalities
  sections.push(buildPersonalitiesSection(context.agentPersonalities));

  // Current project context
  sections.push(buildProjectsSection(context.projects));

  // Previous meeting context
  if (context.previousMeetings.length > 0) {
    sections.push(buildPreviousMeetingsSection(context.previousMeetings));
  }

  // Recent docs context
  if (Object.keys(context.recentDocs).length > 0) {
    sections.push(buildDocsSection(context.recentDocs));
  }

  // Meeting-specific instructions
  if (type === "charter") {
    sections.push(buildCharterInstructions(agenda));
  } else {
    sections.push(buildWeeklyInstructions(context.previousMeetings, agenda));
  }

  return sections.join("\n\n---\n\n");
}

function buildSystemInstruction(): string {
  return `# Team Meeting Simulation

You are simulating a team meeting for Sherlock Labs, an AI agent product team. The team consists of 6 agents who work together to build software products.

**Your job**: Simulate a realistic, natural round-table discussion between all 6 team members. Each agent should speak in character, reflecting their personality, expertise, and communication style as defined below.

**Guidelines for the simulation**:
- Each agent should contribute meaningfully based on their role and expertise
- Include natural disagreements and debates — not everyone agrees on everything
- Show agents building on each other's ideas and responding to concerns
- Thomas (PM) should facilitate and drive toward decisions
- Andrei (Architect) should weigh in on technical feasibility
- Robert (Designer) should advocate for user experience
- Alice (FE) and Jonah (BE) should raise implementation concerns
- Enzo (QA) should flag risks and testing gaps
- The transcript should feel like a real team conversation, not a series of prepared statements
- Aim for 20-40 transcript entries showing real back-and-forth
- End with clear decisions and action items`;
}

function buildPersonalitiesSection(
  personalities: Record<string, string>
): string {
  const parts: string[] = ["# Team Member Personalities\n"];

  for (const [agentKey, content] of Object.entries(personalities)) {
    const info = AGENT_DISPLAY_NAMES[agentKey];
    if (!info) continue;
    parts.push(`## ${info.name} — ${info.role}\n`);
    // Extract just the personality/communication style, not the full agent config
    const lines = content.split("\n");
    const relevantLines: string[] = [];
    let capturing = false;
    for (const line of lines) {
      if (
        line.toLowerCase().includes("personality") ||
        line.toLowerCase().includes("communication") ||
        line.toLowerCase().includes("working style") ||
        line.toLowerCase().includes("how you think") ||
        line.toLowerCase().includes("who you are")
      ) {
        capturing = true;
      }
      if (capturing) {
        relevantLines.push(line);
      }
    }
    // If we couldn't find personality sections, use a truncated version of the full content
    const excerpt =
      relevantLines.length > 5
        ? relevantLines.join("\n")
        : content.slice(0, 1500);
    parts.push(excerpt + "\n");
  }

  return parts.join("\n");
}

function buildProjectsSection(
  projects: Array<{
    name: string;
    description: string;
    status: string;
  }>
): string {
  if (projects.length === 0) {
    return "# Current Projects\n\nNo projects yet. The team is starting fresh.";
  }

  const lines = ["# Current Projects\n"];
  for (const p of projects) {
    lines.push(`- **${p.name}** (${p.status}): ${p.description || "No description"}`);
  }
  return lines.join("\n");
}

function buildPreviousMeetingsSection(meetings: Meeting[]): string {
  const lines = [
    "# Previous Meeting Notes\n",
    "Reference these for continuity — follow up on action items and decisions.\n",
  ];

  for (const meeting of meetings) {
    lines.push(`## Meeting #${meeting.meetingNumber} (${meeting.type}) — ${formatDate(meeting.startedAt)}\n`);

    if (meeting.summary) {
      lines.push(`**Summary**: ${meeting.summary}\n`);
    }

    if (meeting.decisions.length > 0) {
      lines.push("**Decisions**:");
      for (const d of meeting.decisions) {
        lines.push(`- ${d.description} (${d.rationale})`);
      }
      lines.push("");
    }

    if (meeting.actionItems.length > 0) {
      lines.push("**Action Items**:");
      for (const a of meeting.actionItems) {
        lines.push(`- [${a.priority}] ${a.owner}: ${a.description}`);
      }
      lines.push("");
    }

    if (meeting.nextMeetingTopics.length > 0) {
      lines.push("**Topics to revisit**:");
      for (const t of meeting.nextMeetingTopics) {
        lines.push(`- ${t}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildDocsSection(docs: Record<string, string>): string {
  const lines = ["# Recent Project Documents\n"];
  for (const [filename, content] of Object.entries(docs)) {
    lines.push(`## ${filename}\n`);
    lines.push(content);
    lines.push("");
  }
  return lines.join("\n");
}

function buildCharterInstructions(agenda?: string): string {
  let instructions = `# Meeting Type: CHARTER MEETING

This is the team's **inaugural charter meeting**. The team is establishing its identity, mission, and strategic direction.

**Agenda**:
1. **Team Mission** — What is this team's purpose? What makes Sherlock Labs unique?
2. **Product Vision** — What are we building? Who are we building for?
3. **Strategic Priorities** — What should we focus on first? What's the 30/60/90 day plan?
4. **Ways of Working** — How will the team collaborate? What processes matter?
5. **Open Discussion** — What else should the team align on?

The discussion should be substantive and opinionated. Each team member should bring their perspective:
- Thomas should drive the agenda and push for concrete priorities
- Andrei should advocate for technical foundations and pragmatic decisions
- Robert should ensure the user is at the center of every decision
- Alice and Jonah should raise practical implementation considerations
- Enzo should push for quality standards and testing culture from day one`;

  if (agenda) {
    instructions += `\n\n**Additional context from the CEO**: ${agenda}`;
  }

  return instructions;
}

function buildWeeklyInstructions(
  previousMeetings: Meeting[],
  agenda?: string
): string {
  const hasActionItems = previousMeetings.some(
    (m) => m.actionItems.length > 0
  );

  let instructions = `# Meeting Type: WEEKLY STATUS MEETING

This is a recurring team sync. The team reviews progress, discusses blockers, and plans next steps.

**Agenda**:`;

  if (hasActionItems) {
    instructions += `
1. **Action Item Review** — Review action items from the previous meeting. What got done? What's still in progress?`;
  }

  instructions += `
${hasActionItems ? "2" : "1"}. **Project Updates** — Status of current projects. What shipped? What's blocked?
${hasActionItems ? "3" : "2"}. **New Ideas & Priorities** — Any new opportunities or directions to consider?
${hasActionItems ? "4" : "3"}. **Blockers & Risks** — What's slowing us down? What risks should the team be aware of?
${hasActionItems ? "5" : "4"}. **Decisions Needed** — Any decisions that need to be made as a team?
${hasActionItems ? "6" : "5"}. **Next Steps** — What are we each focused on until the next meeting?

The discussion should be candid and efficient. This is a working meeting, not a ceremony.`;

  if (agenda) {
    instructions += `\n\n**Additional agenda items from the CEO**: ${agenda}`;
  }

  return instructions;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
