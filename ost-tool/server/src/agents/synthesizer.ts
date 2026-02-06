import { runClaude } from "./claude-runner.js";
import {
  RecommendationSchema,
  recommendationJsonSchema,
} from "../schemas/ost.js";
import type {
  OSTTree,
  DebateResult,
  Recommendation,
} from "../schemas/ost.js";

interface SynthesizerInput {
  ost: OSTTree;
  solutionIds: string[];
  debate: DebateResult[];
  goal: string;
  context: string;
}

export async function synthesize(
  input: SynthesizerInput
): Promise<Recommendation> {
  const solutionDetails = input.solutionIds
    .map((id) => {
      const node = input.ost.nodes.find((n) => n.id === id);
      return node ? `- **${node.label}** (${id}): ${node.description}` : `- ${id}: (not found)`;
    })
    .join("\n");

  const debateSummary = input.debate
    .map(
      (d) =>
        `### ${d.perspective} (Score: ${d.score}/10)\n**Key Insight:** ${d.keyInsight}\n\n${d.assessment}\n\n**Risks:**\n${d.risks.map((r) => `- ${r}`).join("\n")}`
    )
    .join("\n\n---\n\n");

  const allSolutions = input.ost.nodes.filter((n) => n.type === "solution");
  const notSelectedSolutions = allSolutions
    .filter((n) => !input.solutionIds.includes(n.id))
    .map((n) => `- ${n.label} (${n.id}): ${n.description}`)
    .join("\n");

  const prompt = `You are a senior product strategist synthesizing a multi-perspective debate into a clear, actionable recommendation.

## Context

**Product Goal:** ${input.goal}

**Additional Context:** ${input.context}

## Solutions Under Consideration
${solutionDetails}

## Other Solutions NOT Selected
${notSelectedSolutions || "(All solutions were selected)"}

## Debate Results

Four expert perspectives have weighed in on the selected solutions:

${debateSummary}

## Your Task

Synthesize all four perspectives into a single, clear recommendation. You are the tiebreaker and the decision-maker. Your job is NOT to average opinions — it's to weigh the evidence and make a call.

Produce:

1. **recommendation**: A clear, direct "Build X" or "Pursue X" statement. Be specific about what to build first and how to approach it. This should be 1-2 sentences max.

2. **rationale**: 2-3 paragraphs explaining your reasoning. Reference specific points from the debate. Explain why you weighted certain perspectives more heavily than others. Address the key tensions and how you resolved them.

3. **risks**: The top risks that remain even with your recommended approach. Be specific — these should be risks the team needs to actively monitor and mitigate, not generic disclaimers.

4. **firstSteps**: 4-6 concrete next actions the team should take in the first 1-2 weeks. Be specific enough that someone could start executing these immediately. Think: "Run 5 user interviews focused on X" not "Do user research."

5. **deprioritize**: Things the team should explicitly NOT do right now, even if they seem appealing. Explain briefly why each should wait.

6. **confidence**: Your overall confidence score (1-10) that this recommendation will lead to a successful outcome if executed well.

7. **solutionImpacts**: For EACH of the selected solutions, provide an impact assessment:
   - **solutionId**: The solution's ID (e.g., "sol-1-1")
   - **solutionLabel**: The solution's name
   - **impactScore**: Estimated impact score 1-10 (10 = highest expected impact on the goal)
   - **impactRationale**: One sentence explaining why this solution has this level of impact

   Rank them honestly — not all solutions are equal. Some will drive 80% of the impact. Make that clear.

Be decisive. Teams need clarity, not hedging.`;

  const raw = await runClaude(prompt, {
    jsonSchema: recommendationJsonSchema,
  });
  const parsed = RecommendationSchema.parse(raw);
  return parsed;
}
