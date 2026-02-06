import { runClaude } from "./claude-runner.js";
import { OSTTreeSchema, ostTreeJsonSchema } from "../schemas/ost.js";
import type { OSTTree } from "../schemas/ost.js";

export async function generateOST(
  goal: string,
  context: string
): Promise<OSTTree> {
  const prompt = `You are an expert product strategist specializing in Opportunity Solution Trees (OSTs), a framework developed by Teresa Torres for continuous product discovery.

Your task: Given a product goal and context, generate a structured Opportunity Solution Tree.

## What is an Opportunity Solution Tree?

An OST maps from a desired **outcome** (business/product goal) down through **opportunities** (user needs, pain points, or desires that drive the outcome), to **solutions** (product ideas addressing each opportunity), and finally to **experiments** (the fastest way to test each solution).

## Rules for a Good OST

1. **Outcome (1):** Restate the goal as a clear, measurable desired outcome. It should be specific enough to evaluate progress against.

2. **Opportunities (2-4):** These are NOT features or solutions. They are user needs, pain points, behaviors, or desires discovered through research. Frame each as a user-centric problem or need. Ask: "What user behavior or need, if addressed, would drive this outcome?"

3. **Solutions (2-3 per opportunity):** Concrete product ideas or features that address the parent opportunity. Each should be distinct and represent a different approach. They should be specific enough to build but not overly detailed.

4. **Experiments (1-2 per solution):** The fastest, cheapest way to test whether the solution actually addresses the opportunity. Think: prototype tests, fake door tests, concierge tests, surveys, A/B tests, data analysis. NOT "build it and see."

## ID Convention
- Outcome: "outcome-1"
- Opportunities: "opp-1", "opp-2", etc.
- Solutions: "sol-1-1" (first solution under first opportunity), "sol-2-1", etc.
- Experiments: "exp-1-1-1" (first experiment under sol-1-1), etc.

## Input

**Goal:** ${goal}

**Context:** ${context}

Generate the OST now. Produce a complete tree with well-thought-out, specific nodes. Every label should be concise (under 10 words). Every description should be 1-2 sentences explaining the node clearly. Make the opportunities genuinely user-centric and the experiments genuinely lightweight and testable.`;

  const raw = await runClaude(prompt, { jsonSchema: ostTreeJsonSchema });
  const parsed = OSTTreeSchema.parse(raw);
  return parsed;
}
