# Claude CLI Patterns

**Category:** AI
**Used by:** Kai, Jonah
**Last updated:** 2026-02-07

## When to Use

When building features that invoke Claude via the CLI (`claude` command), or when agents need to use `claude -p` for programmatic AI tasks.

## Basic Usage

### One-Shot Prompt
```bash
claude -p "Summarize this text: $(cat input.txt)"
```

### With System Prompt
```bash
claude -p "Analyze this code" --system "You are a code reviewer. Focus on security issues."
```

### Structured Output (JSON)
```bash
claude -p "Extract key data" \
  --output-format json \
  --json-schema '{
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "items": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["title", "items"]
  }'
```

### Streaming Output
```bash
claude -p "Write a long analysis" --stream
```

## Patterns Used in TeamHQ

### OST Tool AI Integration
The OST tool uses `claude -p` with JSON schemas to generate structured recommendations:

```javascript
const { execSync } = require('child_process');

function generateRecommendation(input) {
  const schema = JSON.stringify({
    type: 'object',
    properties: {
      recommendation: { type: 'string' },
      confidence: { type: 'number' },
      reasoning: { type: 'string' }
    },
    required: ['recommendation', 'confidence', 'reasoning']
  });

  const result = execSync(
    `claude -p "${escapeShell(input)}" --output-format json --json-schema '${schema}'`,
    { encoding: 'utf-8', timeout: 30000 }
  );

  return JSON.parse(result);
}
```

### Error Handling
Always handle CLI failures:
```javascript
try {
  const result = execSync(command, { encoding: 'utf-8', timeout: 30000 });
  return JSON.parse(result);
} catch (err) {
  if (err.killed) {
    // Timeout
    return { error: 'timeout' };
  }
  // Parse error or CLI error
  console.error('Claude CLI error:', err.message);
  return { error: 'cli_error', message: err.message };
}
```

## Model Selection

```bash
claude -p "Quick task" --model haiku     # Fast, cheap
claude -p "Complex analysis" --model sonnet  # Balanced
claude -p "Critical decision" --model opus   # Most capable
```

Use the simplest model that produces acceptable output. Start with haiku, upgrade if quality is insufficient.

## Conventions

- Always set a timeout on `execSync` (30s default, increase for complex tasks)
- Use `--output-format json --json-schema` for any output that will be parsed
- Escape shell inputs to prevent injection
- Log errors but don't expose raw CLI output to users
- Test with adversarial inputs before shipping

## Anti-patterns

- Not setting a timeout — `execSync` will hang indefinitely
- Not escaping shell input — security vulnerability
- Using opus for simple tasks — wastes tokens and time
- Parsing free-text output with regex — use JSON schemas instead
- Not handling the case where Claude returns invalid JSON despite schema
