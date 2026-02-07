# Prompt Engineering

**Category:** AI
**Used by:** Kai, all agents
**Last updated:** 2026-02-07

## When to Use

When designing prompts for AI-powered features, or when any agent needs to use Claude effectively.

## Core Principles

### 1. Be Specific About Output Format
Tell the model exactly what you want back:

```
Return a JSON object with these fields:
- title (string, max 60 chars)
- description (string, 1-2 sentences)
- priority (enum: "high", "medium", "low")
```

### 2. Use System Prompts for Constraints
System prompts set the rules; user prompts provide the task:

```
System: You are a product analyst. Return only valid JSON. Never include markdown formatting.
User: Analyze this feature request: {input}
```

### 3. Provide Few-Shot Examples
Show the model what good output looks like:

```
Here are two examples of well-written tool descriptions:

Tool: PDF Splitter
Description: Split multi-page PDFs into individual pages. Download pages one at a time or all at once as a ZIP.

Tool: PDF Combiner
Description: Combine multiple images and PDFs into a single document. Drag to reorder, then download.

Now write a description for: {new_tool}
```

### 4. Handle Edge Cases Explicitly
Tell the model what to do when uncertain:

```
If the input is ambiguous, return { "error": "ambiguous_input", "message": "..." } instead of guessing.
```

### 5. Constrain Output Length
Prevent verbose responses:

```
Respond in exactly 3 bullet points, each under 20 words.
```

## Structured Output Pattern

Use JSON schemas to enforce output structure:

```bash
claude -p "Analyze this..." --output-format json --json-schema '{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "score": { "type": "number", "minimum": 0, "maximum": 10 },
    "tags": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["summary", "score", "tags"]
}'
```

## Prompt Testing

Always test prompts against:
1. **Happy path** — typical, well-formed input
2. **Edge cases** — empty input, very long input, special characters
3. **Adversarial input** — input that tries to override instructions
4. **Ambiguous input** — input with multiple valid interpretations

## Conventions

- Keep system prompts under 500 words — long prompts dilute important instructions
- Put the most important constraint first
- Use explicit role assignment: "You are a..."
- Use delimiters for user input: `<input>...</input>` or triple backticks
- Always specify what to do on failure, not just what to do on success

## Anti-patterns

- Vague instructions: "Be helpful" (too abstract)
- Prompt-as-essay: 2000-word system prompts that bury the key constraints
- No error handling: assuming the model always produces valid output
- Testing only happy paths: prompts that work on good input often fail on edge cases
- Over-constraining: so many rules that the model can't produce useful output
