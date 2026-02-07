# Competitive Analysis

**Category:** Research
**Used by:** Suki, Thomas
**Last updated:** 2026-02-07

## When to Use

When the team needs to understand how competitors approach a problem before scoping a new feature or product.

## Procedure

1. **Define the question** — what specific aspect of the competitive landscape are we investigating? (e.g., "How do competitors handle PDF splitting?" not "Research the market")
2. **Identify competitors** — list 3-5 direct competitors and 2-3 adjacent products
3. **Gather data** — for each competitor, collect:
   - Product name and URL
   - Core features relevant to the question
   - Pricing model (free, freemium, paid)
   - Target audience
   - Key differentiators
   - Limitations or gaps
4. **Build a comparison matrix** — structured table with competitors as rows and features/criteria as columns
5. **Analyze patterns** — what do most competitors do? Where do they differ? What's missing?
6. **Write recommendations** — based on the analysis, what should we do differently or similarly?
7. **Document in** `docs/{project}-research.md`

## Examples

From past projects: when building the OST Tool, researched existing opportunity solution tree tools, Miro's tree features, and dedicated product discovery tools.

## Conventions

- Always use WebSearch and WebFetch for data gathering
- Date every finding — competitive intelligence goes stale fast
- Include screenshots or quotes when possible
- Present comparison tables first, narrative analysis second
- Always end with a "Recommendations" section

## Anti-patterns

- Researching too broadly ("research everything about PDFs") — always scope to a specific question
- Relying on a single source or outdated blog post
- Presenting data without analysis — a table of features without a "so what?" is not useful
- Cherry-picking data to support a predetermined conclusion
