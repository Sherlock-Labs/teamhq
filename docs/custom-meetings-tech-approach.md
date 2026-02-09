# Custom Meetings — Technical Approach

**Author**: Andrei (Technical Architect)
**Date**: Feb 9, 2026
**Status**: Draft
**Depends on**: docs/custom-meetings-requirements.md

## Overview

Extend the existing meeting system to support a `custom` meeting type where the CEO picks 2-6 agents and provides discussion instructions. No new dependencies, no new infrastructure patterns — we extend the existing files and functions.

## Architecture Decision

**Extend, don't rebuild.** The existing meeting system (runner, prompt builder, claude-runner, context loader, JSON file store) is well-structured and works. We add the `custom` type alongside `charter` and `weekly` using the same execution path. The only new code is in prompt construction and context loading for arbitrary agents.

## File-by-File Changes

### 1. `server/src/schemas/meeting.ts` — Schema Changes

**MeetingType enum**: Add `"custom"` to the existing `z.enum(["charter", "weekly"])`.

```typescript
export const MeetingType = z.enum(["charter", "weekly", "custom"]);
```

**MeetingSchema**: Add two new optional fields:

```typescript
participants: z.array(z.string()).default([]),    // agent keys
instructions: z.string().nullable().default(null), // CEO instructions
```

These fields are empty/null for charter and weekly meetings. For custom meetings, `participants` has 2-6 agent keys and `instructions` has the CEO's meeting topic.

**RunMeetingSchema**: Extend to accept participants and instructions:

```typescript
export const RunMeetingSchema = z.object({
  type: MeetingType,
  agenda: z.string().optional(),
  participants: z.array(z.string()).min(2).max(6).optional(),
  instructions: z.string().min(1).optional(),
}).refine(
  (data) => {
    if (data.type === "custom") {
      return data.participants && data.participants.length >= 2 && data.instructions;
    }
    return true;
  },
  { message: "Custom meetings require participants (2-6) and instructions" }
);
```

**MeetingOutputJsonSchema**: No changes needed — the JSON schema for Claude's structured output is the same regardless of meeting type. Custom meetings produce the same output shape.

**New constant — VALID_AGENT_KEYS**: Add a set of all 18 valid agent keys for validation:

```typescript
export const VALID_AGENT_KEYS = new Set([
  "product-manager", "technical-architect", "product-designer",
  "frontend-developer", "backend-developer", "qa",
  "product-marketer", "product-researcher", "technical-researcher",
  "technical-writer", "data-analyst", "ai-engineer",
  "mobile-developer-1", "mobile-developer-2",
  "frontend-interactions", "frontend-responsive", "frontend-accessibility",
  "payments-engineer",
]);
```

### 2. `server/src/meetings/context.ts` — Context Loading

**New function `gatherCustomMeetingContext`**: Similar to `gatherMeetingContext` but loads agent personalities only for the specified participants instead of `CORE_AGENTS`.

```typescript
export async function gatherCustomMeetingContext(
  participants: string[]
): Promise<MeetingContext> {
  const [agentPersonalities, projects, previousMeetings, recentDocs] =
    await Promise.all([
      loadAgentPersonalitiesForParticipants(participants),
      loadProjects(),
      loadPreviousMeetings(),
      loadRecentDocs(),
    ]);
  return { agentPersonalities, projects, previousMeetings, recentDocs };
}
```

**New function `loadAgentPersonalitiesForParticipants`**: Same as `loadAgentPersonalities` but takes an array of agent keys instead of using the hardcoded `CORE_AGENTS`.

```typescript
async function loadAgentPersonalitiesForParticipants(
  participants: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const agentName of participants) {
    try {
      const content = await readFile(
        join(AGENTS_DIR, `${agentName}.md`),
        "utf-8"
      );
      result[agentName] = content;
    } catch {
      // Agent file missing — skip
    }
  }
  return result;
}
```

The existing `gatherMeetingContext` and `CORE_AGENTS` are unchanged — they still serve charter/weekly meetings.

### 3. `server/src/meetings/prompt.ts` — Prompt Construction

**Expand `AGENT_DISPLAY_NAMES`**: Add all 18 agents, not just the 6 core ones:

```typescript
const AGENT_DISPLAY_NAMES: Record<string, { name: string; role: string }> = {
  "product-manager": { name: "Thomas", role: "Product Manager" },
  "technical-architect": { name: "Andrei", role: "Technical Architect" },
  "product-designer": { name: "Robert", role: "Product Designer" },
  "frontend-developer": { name: "Alice", role: "Front-End Developer" },
  "backend-developer": { name: "Jonah", role: "Back-End Developer" },
  "qa": { name: "Enzo", role: "QA Engineer" },
  "product-marketer": { name: "Priya", role: "Product Marketer" },
  "product-researcher": { name: "Suki", role: "Product Researcher" },
  "technical-researcher": { name: "Marco", role: "Technical Researcher" },
  "technical-writer": { name: "Nadia", role: "Technical Writer" },
  "data-analyst": { name: "Yuki", role: "Data Analyst" },
  "ai-engineer": { name: "Kai", role: "AI Engineer" },
  "mobile-developer-1": { name: "Zara", role: "Mobile Developer" },
  "mobile-developer-2": { name: "Leo", role: "Mobile Developer" },
  "frontend-interactions": { name: "Nina", role: "Interactions Specialist" },
  "frontend-responsive": { name: "Soren", role: "Responsive Specialist" },
  "frontend-accessibility": { name: "Amara", role: "Accessibility Specialist" },
  "payments-engineer": { name: "Howard", role: "Payments Engineer" },
};
```

**Update `buildMeetingPrompt` signature**: Accept optional `participants` and `instructions` parameters:

```typescript
export function buildMeetingPrompt(
  type: MeetingType,
  context: MeetingContext,
  agenda?: string,
  participants?: string[],
  instructions?: string,
): string
```

Add a new branch in the meeting-specific instructions block:

```typescript
if (type === "custom" && participants && instructions) {
  sections.push(buildCustomInstructions(participants, instructions));
}
```

**New function `buildCustomInstructions`**: Constructs the meeting-type-specific section for custom meetings:

```typescript
function buildCustomInstructions(
  participants: string[],
  instructions: string,
): string {
  const participantNames = participants
    .map((key) => {
      const info = AGENT_DISPLAY_NAMES[key];
      return info ? `${info.name} (${info.role})` : key;
    })
    .join(", ");

  // Determine facilitator
  const hasPM = participants.includes("product-manager");
  const facilitator = hasPM
    ? "Thomas (Product Manager)"
    : AGENT_DISPLAY_NAMES[participants[0]]
      ? `${AGENT_DISPLAY_NAMES[participants[0]].name} (${AGENT_DISPLAY_NAMES[participants[0]].role})`
      : participants[0];

  return `# Meeting Type: CUSTOM MEETING

This is a **custom meeting** called by the CEO with a specific set of participants and topic.

**Participants**: ${participantNames}
**Facilitator**: ${facilitator} — drives the agenda and ensures decisions are reached.

**CEO's Instructions / Topic**:
${instructions}

**Guidelines**:
- ONLY the listed participants speak — no other team members appear in the transcript
- ${facilitator} should open the meeting, state the topic, and facilitate the discussion
- Each participant should contribute meaningfully based on their expertise and role
- The discussion should be focused on the CEO's instructions
- Aim for 15-30 transcript entries — this is a focused meeting, not a full team sync
- End with clear decisions and action items assigned ONLY to the participants
- Action items should be concrete and actionable
- Natural disagreements and back-and-forth are encouraged — this shouldn't feel scripted`;
}
```

**Update `buildSystemInstruction`**: The existing system instruction references "6 agents" — update it to be more generic:

```typescript
function buildSystemInstruction(participantCount?: number): string {
  const teamSize = participantCount || 6;
  return `# Team Meeting Simulation

You are simulating a team meeting for Sherlock Labs, an AI agent product team. The team consists of ${teamSize} agents in this meeting.
...`;
}
```

### 4. `server/src/meetings/runner.ts` — Runner Changes

**Update `runMeeting` signature**: Accept optional participants and instructions:

```typescript
export async function runMeeting(
  type: MeetingType,
  agenda?: string,
  participants?: string[],
  instructions?: string,
): Promise<Meeting>
```

**Context gathering**: Branch on type:

```typescript
const context = type === "custom" && participants
  ? await gatherCustomMeetingContext(participants)
  : await gatherMeetingContext();
```

**Prompt building**: Pass participants and instructions through:

```typescript
const prompt = buildMeetingPrompt(type, context, agenda, participants, instructions);
```

**Meeting creation**: Pass participants and instructions to createMeeting:

```typescript
const meeting = await createMeeting(type, participants, instructions);
```

### 5. `server/src/store/meetings.ts` — Store Changes

**Update `createMeeting`**: Accept optional participants and instructions:

```typescript
export async function createMeeting(
  type: MeetingType,
  participants?: string[],
  instructions?: string | null,
): Promise<Meeting> {
  // ... existing code ...
  const meeting: Meeting = {
    // ... existing fields ...
    participants: participants || [],
    instructions: instructions || null,
  };
  // ...
}
```

No other store changes needed — `updateMeeting`, `getMeeting`, `listMeetings` all work generically.

### 6. `server/src/routes/meetings.ts` — API Route Changes

**Update `POST /api/meetings/run`**: Add validation for custom type:

```typescript
// After parsing with RunMeetingSchema
if (parsed.type === "custom") {
  // Validate participant keys
  if (!parsed.participants || parsed.participants.length < 2) {
    res.status(400).json({ error: "Custom meetings require at least 2 participants" });
    return;
  }
  const invalid = parsed.participants.filter((p: string) => !VALID_AGENT_KEYS.has(p));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Invalid participant keys: ${invalid.join(", ")}` });
    return;
  }
  if (!parsed.instructions) {
    res.status(400).json({ error: "Custom meetings require instructions" });
    return;
  }
}

// Pass participants and instructions to runMeeting
runMeeting(parsed.type, parsed.agenda, parsed.participants, parsed.instructions);
```

The charter-first guard should still apply — custom meetings (like weekly) require at least one charter meeting to exist first. This keeps the team established before running custom sessions.

**Wait** — actually, re-reading the requirements, there's no explicit requirement that custom meetings need a charter first. But it makes sense operationally: the meeting context includes previous meetings and project state, which are richer after a charter. I'll leave the charter-first guard for weekly only and allow custom meetings without a charter. Custom meetings are standalone by nature.

### 7. `js/meetings.js` — Frontend Changes

**Expand `AGENTS` map**: Add all 18 agents with their avatar paths and colors:

```javascript
var AGENTS = {
  'Thomas': { role: 'Product Manager', avatar: 'img/avatars/thomas.svg', color: agentColor('thomas') },
  // ... existing 6 ...
  'Priya': { role: 'Product Marketer', avatar: 'img/avatars/priya.svg', color: agentColor('priya') },
  'Suki': { role: 'Product Researcher', avatar: 'img/avatars/suki.svg', color: agentColor('suki') },
  // ... all 18 agents ...
};
```

**Agent key → name mapping**: Add a lookup for rendering the participant selector and mapping keys to display names:

```javascript
var AGENT_ROSTER = [
  { key: 'product-manager', name: 'Thomas', role: 'Product Manager' },
  { key: 'technical-architect', name: 'Andrei', role: 'Technical Architect' },
  // ... all 18 ...
];
```

**New Meeting button**: Add a third button to the toolbar that opens a creation form.

**Creation form**: An inline form (shown/hidden below the toolbar) with:
- A grid of clickable agent cards (18 agents, each with avatar, name, role)
- Selected agents get a visual highlight (border color change)
- A textarea for instructions
- A "Start Meeting" button (disabled until 2+ agents selected and instructions non-empty)
- A count indicator: "X of 2-6 selected"

**Custom meeting card display**: On the meeting card, if `meeting.participants` is populated, render small agent avatars inline on the card header.

**API call update**: The `apiRun` function needs to accept and pass participants and instructions:

```javascript
function apiRun(type, agenda, participants, instructions) {
  var body = { type: type };
  if (agenda) body.agenda = agenda;
  if (participants) body.participants = participants;
  if (instructions) body.instructions = instructions;
  return fetch(API_BASE + '/run', { ... });
}
```

## Execution Order

1. **Backend first** (Jonah): Schema → Store → Context → Prompt → Runner → Routes
2. **Frontend second** (Alice): Creation form → Participant selector → API integration → Card display
3. **No API contract alignment session needed** — the only new request field is `{ type: "custom", participants: string[], instructions: string }` on the existing `POST /api/meetings/run` endpoint. Response shape is unchanged.

## Decisions

1. **Custom meetings don't require a charter first** — they're standalone, unlike weekly meetings which follow up on action items. The charter-first guard only applies to `type === "weekly"`.
2. **No new files** — all changes go into existing files. No new route files, no new schema files.
3. **Same Claude runner** — `claude-runner.ts` is unchanged. The prompt is larger (more agent personality text if 6 diverse agents are selected) but within reasonable bounds.
4. **Personality excerpt truncation** — for custom meetings, keep the same truncation behavior as existing (1500 char fallback). With 6 agents, that's ~9KB of personality text in the worst case — well within prompt limits.
5. **No streaming** — same poll-based approach. Custom meetings are async just like charter/weekly.
6. **Facilitator logic** — Thomas facilitates if he's a participant; otherwise the first listed participant leads. This is handled in the prompt, not in code logic.
