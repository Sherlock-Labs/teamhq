# Custom Meetings — Requirements

**Author**: Thomas (PM)
**Date**: Feb 9, 2026
**Status**: Draft

## Problem Statement

The existing meeting system supports two predefined types — charter and weekly — both of which always include the same 6 hardcoded core agents. The CEO wants the ability to create **custom meetings** with a hand-picked subset of team members and specific instructions. This enables targeted discussions (e.g., "Alice and Jonah, align on the API contract for the docs viewer" or "Robert and Nina, review the interaction design for the mobile app") without pulling the entire team into every conversation.

## One-Sentence Summary

Custom meetings let the CEO pick which agents attend and what they discuss, producing a focused transcript with decisions and action items.

## Scope

### In Scope (v1)

1. **New meeting type: `custom`** — joins the existing `charter` and `weekly` types
2. **Participant selection** — CEO picks 2-6 agents from the full 18-agent roster when creating a custom meeting
3. **Meeting instructions** — CEO provides a topic/instructions string that guides the meeting discussion (required for custom meetings)
4. **Same output format** — custom meetings produce the same structured output as existing meetings: summary, key takeaways, transcript, decisions, action items, mood, next meeting topics
5. **Backend: schema + prompt changes** — extend the meeting schema to store `participants` and `instructions`, build a custom meeting prompt that adapts to the selected agents
6. **Backend: API changes** — extend `POST /api/meetings/run` to accept `participants` and `instructions` fields when `type === "custom"`
7. **Frontend: creation flow** — add a "New Meeting" button/flow where the CEO can select participants and enter instructions, then kick off the meeting
8. **Frontend: display** — custom meetings appear in the same meetings list, with participant avatars shown on the card

### Out of Scope (deferred)

- Recurring/scheduled custom meetings
- Meeting templates (pre-saved participant + instruction combos)
- Real-time streaming of the meeting transcript (meetings already run asynchronously and poll)
- Editing a meeting after it completes
- Participant suggestions based on topic
- Custom meeting facilitator selection (Thomas always facilitates — revisit if needed)

## User Stories

### US1: Create a Custom Meeting
**As the CEO**, I want to select specific team members and provide instructions, so I can run a focused meeting on a targeted topic.

**Acceptance Criteria:**
- [ ] A "New Meeting" button is visible in the meetings toolbar
- [ ] Clicking it opens a creation form (inline or modal) with:
  - A multi-select for participants (shows all 18 agents with name, role, and avatar)
  - A text area for meeting instructions/topic
- [ ] At least 2 participants must be selected; max 6
- [ ] Instructions field is required and must be non-empty
- [ ] Submitting the form calls the API and starts the meeting
- [ ] The form validates inputs before submission and shows clear error states
- [ ] After submission, the meeting appears in the list with a "running" indicator (same as existing meetings)

### US2: Custom Meeting Prompt Uses Selected Agents
**As the CEO**, I want the meeting simulation to only include the agents I selected, speaking in character, discussing the topic I specified.

**Acceptance Criteria:**
- [ ] Only the selected agents appear in the transcript — no other agents speak
- [ ] Each agent speaks in character per their agent definition personality
- [ ] The discussion is guided by the CEO's instructions
- [ ] The meeting produces decisions and action items relevant to the instructions
- [ ] Action items are assigned only to agents who participated in the meeting

### US3: View Custom Meeting Results
**As the CEO**, I want to view custom meeting results in the same meeting list with the same detail view.

**Acceptance Criteria:**
- [ ] Custom meetings appear in the meetings list alongside charter/weekly meetings
- [ ] Custom meeting cards show a "Custom" type badge
- [ ] Custom meeting cards show participant avatars (the selected agents)
- [ ] Expanding a custom meeting card shows the same detail sections: key takeaways, decisions, action items, transcript, next meeting topics
- [ ] The "Start as Project" action on action items works the same as existing meetings

## Data Model Changes

### Meeting Schema Additions

```typescript
// Existing MeetingType: "charter" | "weekly"
// New: "charter" | "weekly" | "custom"

// New optional fields on Meeting:
participants?: string[];    // Agent keys (e.g., ["frontend-developer", "backend-developer"])
instructions?: string;      // CEO's meeting instructions/topic
```

### RunMeeting Input Changes

```typescript
// Extend RunMeetingSchema:
{
  type: "charter" | "weekly" | "custom",
  agenda?: string,              // existing — used for charter/weekly
  participants?: string[],      // new — required when type === "custom"
  instructions?: string,        // new — required when type === "custom"
}
```

## API Changes

### `POST /api/meetings/run`

**Existing behavior** (unchanged for charter/weekly):
- Body: `{ type: "charter" | "weekly", agenda?: string }`
- Returns 202

**New behavior for custom**:
- Body: `{ type: "custom", participants: string[], instructions: string }`
- Validation: `participants` must have 2-6 entries, all must be valid agent keys; `instructions` must be non-empty
- Returns 202
- Same async execution pattern — meeting runs in background, client polls for completion

### `GET /api/meetings` and `GET /api/meetings/:id`

No endpoint changes. Custom meetings return the same shape, with the new `participants` and `instructions` fields populated.

## Prompt Design

The custom meeting prompt should:

1. **Include only selected agents** — load personality/agent definitions only for the participants
2. **Use the CEO's instructions as the meeting's agenda** — not a generic weekly or charter structure
3. **Adapt facilitation** — if Thomas (PM) is a participant, he facilitates; otherwise, the first listed participant leads
4. **Include project context** — same as existing meetings, load current projects and recent docs for context
5. **Include previous meeting context** — same as existing, load last 3 meetings for continuity
6. **Target 15-30 transcript entries** — slightly smaller than the 20-40 for full-team meetings, since fewer people are talking

## Frontend Design Direction

The creation flow should be simple and fast — the CEO shouldn't have to navigate a complex form to start a meeting:

1. **"New Meeting" button** in the meetings toolbar alongside the existing Charter/Weekly buttons
2. **Inline form or lightweight modal** that appears below/over the toolbar:
   - **Participant grid** — clickable agent cards/chips showing avatar, name, and role; click to toggle selection; selected agents get a visual highlight
   - **Instructions textarea** — labeled "What should they discuss?" or similar
   - **Submit button** — "Start Meeting" / disabled until validation passes
   - **Cancel** to dismiss without starting
3. **Participant count indicator** — show "2-6 participants required" and current selection count
4. Custom meeting cards in the list should show **small participant avatars** to distinguish them from full-team charter/weekly meetings

## Technical Constraints

- **No new npm dependencies** — use existing stack (Express, Zod, uuid, vanilla JS frontend)
- **Same Claude CLI integration** — use the existing `runClaude` function with structured JSON output
- **Same JSON file storage** — meetings stored as individual JSON files in `data/meetings/`
- **Same polling pattern** — no need for SSE on custom meetings (existing poll-based approach is fine)
- **10-minute timeout** — same as existing meetings
- **One meeting at a time** — existing concurrency guard stays (only one meeting can run at once, regardless of type)

## Implementation Notes

- The `CORE_AGENTS` array in `context.ts` should not change — it's used for charter/weekly meetings. Custom meetings need a separate path that loads agent definitions for the selected participants.
- The `AGENT_DISPLAY_NAMES` map in `prompt.ts` needs to expand to include all 18 agents, not just the 6 core ones.
- The `buildMeetingPrompt` function needs a new branch for `type === "custom"` that uses instructions instead of a predefined agenda structure.
- The frontend `AGENTS` map in `meetings.js` needs to expand to include all 18 agents for rendering custom meeting participants and transcripts.

## Risks

1. **Prompt quality** — custom meeting prompts with arbitrary agent combinations may produce lower-quality simulations than the well-tested charter/weekly prompts. Mitigation: test with several common combinations during QA.
2. **Agent personality loading** — some agent definition files may not have clearly extractable personality sections. Mitigation: fall back to truncated full content (existing behavior in `prompt.ts`).
3. **Large participant count** — 6 agents with full personality excerpts plus project context plus previous meetings could produce a very large prompt. Mitigation: truncate personality excerpts more aggressively for custom meetings; cap at 6 participants.
