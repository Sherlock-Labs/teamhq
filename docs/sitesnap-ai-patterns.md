# SiteSnap -- AI Integration Patterns

**Author:** Kai (AI Engineer)
**Date:** 2026-02-16
**Status:** Final
**Depends on:** `sitesnap-requirements.md` (Section 9), `sitesnap-tech-approach.md` (Section 6)

---

## 1. Classification Prompt

### 1.1 System Prompt

This is the production prompt for the Gemini multimodal classification call in `server/src/services/gemini.ts`. It runs on **Gemini 2.0 Flash** with JSON structured output mode enabled.

Thomas's starter prompt from the requirements was a solid foundation. The refinements below address three weaknesses: (1) the original prompt lacked guidance on ambiguous photos, (2) it did not handle non-job-site photos (selfies, screenshots, paperwork), and (3) it did not specify scene description length or trade detection rules.

```
You are a photo classifier for a job site documentation app used by contractors. You receive a single photo taken on a residential or commercial job site. Your job is to classify the photo into one of six categories and describe what you see.

CLASSIFICATION TYPES:
- "before": The space is in its original or pre-work condition. Empty rooms, intact surfaces, undamaged areas, spaces before demolition or modification. The defining characteristic is absence of active work or work evidence.
- "after": Work is visibly completed. Freshly painted walls, newly installed fixtures, finished flooring, clean and polished surfaces. The defining characteristic is a finished, professional result.
- "progress": Work is actively underway or partially completed. Exposed framing, mid-demolition debris, partially installed components, tools in use, protective coverings on floors. The defining characteristic is visible incompleteness.
- "issue": A defect, damage, or problem being documented. Cracks, leaks, water stains, mold, rot, corrosion, code violations, broken components. The defining characteristic is something wrong that needs attention.
- "material": Building materials, supplies, or products staged for use. Boxes of tile, stacks of lumber, pipe fittings, product labels, paint cans, hardware on a shelf or truck bed. The defining characteristic is items not yet installed.
- "measurement": A measuring tool is prominently visible and is the subject of the photo. Tape measures extended against a surface, levels on a wall, laser measurements, dimensions written on a surface, ruler against a gap. The defining characteristic is quantification of size or distance.

CONFIDENCE RULES:
- Return 0.85-1.0 when the photo clearly matches one category with strong visual evidence.
- Return 0.6-0.84 when the photo likely matches but has some ambiguity (e.g., a clean room that could be "before" or "after").
- Return 0.3-0.59 when you are uncertain. The app will mark these as unclassified, which is the correct outcome for ambiguous photos.
- Return 0.0-0.29 when the photo does not appear to be a job site photo at all (selfie, screenshot, pet, food, paperwork).

SCENE DESCRIPTION:
Write 5-15 words describing what is physically visible in the photo. Be concrete and specific to what you see, not interpretive. Good: "Kitchen with exposed drywall and removed upper cabinets." Bad: "A room undergoing renovation." Do not mention the classification type in the scene description.

TRADE DETECTION:
Identify the most likely trade based on visible evidence:
- "plumbing": pipes, fittings, water heaters, drains, toilets, sinks, faucets, PEX/copper/PVC
- "electrical": wiring, panels, breakers, outlets, switches, conduit, junction boxes, lighting fixtures
- "hvac": ductwork, furnaces, condensers, thermostats, vents, refrigerant lines, air handlers
- "roofing": shingles, flashing, underlayment, gutters, fascia, skylights, roof decking
- "painting": paint cans, rollers, brushes, tape lines, color swatches, freshly painted surfaces
- "general": anything that does not clearly indicate a specific trade, or photos showing multiple trades
If you cannot determine the trade from the photo, return "general".
```

### 1.2 Design Decisions

**Why no few-shot examples for image classification.** Unlike the VoiceNote Pro prompt (which benefits from few-shot text examples to demonstrate output format), image classification with structured output mode does not benefit from textual descriptions of example images. Gemini cannot reference prior images in a single-turn call. The structured output schema enforces the output format, and the classification rules provide the decision criteria. Adding textual descriptions of hypothetical images ("Example: a photo of a bathroom with new tile would be classified as 'after'") would add tokens without improving accuracy -- the model needs to see the actual pixels, not a description.

**Why the confidence bands are explicit.** LLMs tend toward high confidence by default. Without explicit bands, Gemini 2.0 Flash returns 0.85+ for nearly everything, including ambiguous photos. The four-band system (high / moderate / low / not-a-job-site) gives the model permission to express uncertainty. This is critical because a wrong "before" label on a progress photo is worse for the user than "unclassified."

**Why scene and type are separate.** The scene description should describe what the model sees, not echo the classification. This gives the user useful information in the full-screen photo viewer ("Kitchen with exposed drywall and removed upper cabinets") rather than a redundant restatement of the type badge.

**Why trade defaults to "general".** The user profile already has a `trade` field. We do not send the user's trade to Gemini because it would bias classification. If a plumber's profile says "plumbing" and they photograph a painting issue, the model should still detect "painting". The detected trade is an independent signal from the photo content.

### 1.3 Prompt Token Count

The system prompt above is approximately 420 tokens (measured by character estimation at ~4 chars/token for English text). This is well under the 500-word guideline from the prompt engineering skill.

---

## 2. Structured Output Schema

### 2.1 Gemini Response Schema

Use Gemini's structured output mode (`responseMimeType: "application/json"` with `responseSchema`) to enforce the output shape at the API level. This eliminates JSON parsing failures -- Gemini is constrained to produce valid JSON matching this schema.

```typescript
// server/src/services/gemini.ts
import { SchemaType } from "@google/generative-ai";

export const CLASSIFICATION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      enum: [
        "before",
        "after",
        "progress",
        "issue",
        "material",
        "measurement",
      ],
      description: "The classification category for the photo.",
    },
    confidence: {
      type: SchemaType.NUMBER,
      description:
        "Classification confidence from 0.0 to 1.0. Return lower values when uncertain.",
    },
    scene: {
      type: SchemaType.STRING,
      description:
        "Brief factual description of what is in the photo (5-15 words).",
    },
    trade: {
      type: SchemaType.STRING,
      enum: [
        "plumbing",
        "electrical",
        "hvac",
        "roofing",
        "painting",
        "general",
      ],
      description: "Detected trade category based on visible evidence.",
    },
  },
  required: ["type", "confidence", "scene", "trade"],
};
```

### 2.2 Schema Design Decisions

**Enums for `type` and `trade`.** By constraining these to enum values in the schema, Gemini cannot return unexpected strings. This eliminates the need for post-processing normalization (e.g., "Before" vs "before" vs "BEFORE"). The schema guarantees lowercase enum values.

**`confidence` as a number, not an enum.** A continuous 0.0-1.0 float gives us more signal than buckets. We apply the 0.6 threshold in our code, not in the schema. This lets us adjust the threshold later without changing the Gemini call.

**All fields required.** Every classification produces all four fields. No nullable fields in the schema. If Gemini truly cannot determine a trade, it returns "general". If it cannot determine a type, it returns whichever type it considers most likely with a low confidence -- our 0.6 threshold then converts it to "unclassified" on our side. The schema itself does not include "unclassified" as a type enum value because "unclassified" is our application logic, not a model output.

**No "unclassified" in the enum.** This is intentional. We want Gemini to always make its best guess and express uncertainty through the confidence score. Our application code converts low-confidence results to "unclassified" after the fact. If we put "unclassified" in the enum, the model would use it as an escape hatch rather than providing a useful low-confidence prediction.

### 2.3 TypeScript Types

```typescript
// packages/shared/src/types/classification.ts

/** Raw Gemini API response (before threshold application) */
export interface GeminiClassificationResponse {
  type: "before" | "after" | "progress" | "issue" | "material" | "measurement";
  confidence: number;
  scene: string;
  trade: "plumbing" | "electrical" | "hvac" | "roofing" | "painting" | "general";
}

/** Application-level classification result (after threshold) */
export interface ClassificationResult {
  type:
    | "before"
    | "after"
    | "progress"
    | "issue"
    | "material"
    | "measurement"
    | "unclassified";
  confidence: number;
  scene: string;
  trade: "plumbing" | "electrical" | "hvac" | "roofing" | "painting" | "general";
}

/** Photo type union (includes "pending" for upload-in-progress) */
export type PhotoType =
  | "pending"
  | "before"
  | "after"
  | "progress"
  | "issue"
  | "material"
  | "measurement"
  | "unclassified";
```

---

## 3. Integration Pattern

### 3.1 Full Classification Service

This is the complete implementation for `server/src/services/gemini.ts`. Jonah can use this directly.

```typescript
// server/src/services/gemini.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CONFIDENCE_THRESHOLD = 0.6;
const GEMINI_TIMEOUT_MS = 10_000;

const CLASSIFICATION_PROMPT = `You are a photo classifier for a job site documentation app used by contractors. You receive a single photo taken on a residential or commercial job site. Your job is to classify the photo into one of six categories and describe what you see.

CLASSIFICATION TYPES:
- "before": The space is in its original or pre-work condition. Empty rooms, intact surfaces, undamaged areas, spaces before demolition or modification. The defining characteristic is absence of active work or work evidence.
- "after": Work is visibly completed. Freshly painted walls, newly installed fixtures, finished flooring, clean and polished surfaces. The defining characteristic is a finished, professional result.
- "progress": Work is actively underway or partially completed. Exposed framing, mid-demolition debris, partially installed components, tools in use, protective coverings on floors. The defining characteristic is visible incompleteness.
- "issue": A defect, damage, or problem being documented. Cracks, leaks, water stains, mold, rot, corrosion, code violations, broken components. The defining characteristic is something wrong that needs attention.
- "material": Building materials, supplies, or products staged for use. Boxes of tile, stacks of lumber, pipe fittings, product labels, paint cans, hardware on a shelf or truck bed. The defining characteristic is items not yet installed.
- "measurement": A measuring tool is prominently visible and is the subject of the photo. Tape measures extended against a surface, levels on a wall, laser measurements, dimensions written on a surface, ruler against a gap. The defining characteristic is quantification of size or distance.

CONFIDENCE RULES:
- Return 0.85-1.0 when the photo clearly matches one category with strong visual evidence.
- Return 0.6-0.84 when the photo likely matches but has some ambiguity (e.g., a clean room that could be "before" or "after").
- Return 0.3-0.59 when you are uncertain. The app will mark these as unclassified, which is the correct outcome for ambiguous photos.
- Return 0.0-0.29 when the photo does not appear to be a job site photo at all (selfie, screenshot, pet, food, paperwork).

SCENE DESCRIPTION:
Write 5-15 words describing what is physically visible in the photo. Be concrete and specific to what you see, not interpretive. Good: "Kitchen with exposed drywall and removed upper cabinets." Bad: "A room undergoing renovation." Do not mention the classification type in the scene description.

TRADE DETECTION:
Identify the most likely trade based on visible evidence:
- "plumbing": pipes, fittings, water heaters, drains, toilets, sinks, faucets, PEX/copper/PVC
- "electrical": wiring, panels, breakers, outlets, switches, conduit, junction boxes, lighting fixtures
- "hvac": ductwork, furnaces, condensers, thermostats, vents, refrigerant lines, air handlers
- "roofing": shingles, flashing, underlayment, gutters, fascia, skylights, roof decking
- "painting": paint cans, rollers, brushes, tape lines, color swatches, freshly painted surfaces
- "general": anything that does not clearly indicate a specific trade, or photos showing multiple trades
If you cannot determine the trade from the photo, return "general".`;

const CLASSIFICATION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      enum: [
        "before",
        "after",
        "progress",
        "issue",
        "material",
        "measurement",
      ],
    },
    confidence: {
      type: SchemaType.NUMBER,
    },
    scene: {
      type: SchemaType.STRING,
    },
    trade: {
      type: SchemaType.STRING,
      enum: [
        "plumbing",
        "electrical",
        "hvac",
        "roofing",
        "painting",
        "general",
      ],
    },
  },
  required: ["type", "confidence", "scene", "trade"],
};

export interface ClassificationResult {
  type:
    | "before"
    | "after"
    | "progress"
    | "issue"
    | "material"
    | "measurement"
    | "unclassified";
  confidence: number;
  scene: string;
  trade: string;
}

export async function classifyPhoto(
  imageBuffer: Buffer
): Promise<ClassificationResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CLASSIFICATION_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 256,
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GEMINI_TIMEOUT_MS
  );

  try {
    const result = await model.generateContent(
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: CLASSIFICATION_PROMPT },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const text = result.response.text();
    const parsed = JSON.parse(text);

    // Validate and clamp confidence to [0, 1]
    const confidence = Math.max(0, Math.min(1, parsed.confidence));

    // Apply confidence threshold
    const type = confidence < CONFIDENCE_THRESHOLD
      ? "unclassified"
      : parsed.type;

    return {
      type,
      confidence,
      scene: parsed.scene || "No description available",
      trade: parsed.trade || "general",
    };
  } catch (error) {
    clearTimeout(timeout);

    // Log for monitoring, but never lose the photo
    const errorType =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : error instanceof Error && error.message.includes("429")
        ? "rate_limit"
        : "api_error";

    console.error(`Gemini classification failed [${errorType}]:`, error);

    // Return unclassified on any failure
    return {
      type: "unclassified",
      confidence: 0,
      scene: "Classification unavailable",
      trade: "general",
    };
  }
}
```

### 3.2 Key Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `temperature` | 0.2 | Low temperature for consistent classification. Slightly higher than VoiceNote Pro's 0.1 because visual classification has more inherent ambiguity than text extraction, and we want the model to use its confidence range rather than always returning the same high-confidence answer. |
| `maxOutputTokens` | 256 | The output is a small JSON object (~50-80 tokens). 256 is generous but prevents runaway responses. |
| `responseMimeType` | `"application/json"` | Enforces JSON output at the API level. |
| `responseSchema` | See Section 2.1 | Schema validation on Gemini's side. Guarantees enum values and required fields. |
| Timeout | 10 seconds | If Gemini has not responded in 10s, abort and save as `unclassified`. The 2-second target from Thomas's requirements is the typical case; 10s is the failure cutoff. |
| Confidence threshold | 0.6 | Andrei's decision (ADR in tech approach). Conservative -- better to show "unclassified" than a wrong label. Tunable via PostHog `photo_reclassified` event data. |

### 3.3 End-to-End Flow

```
Client captures photo
  |
  v
Client compresses to 2048px JPEG 80% (~300KB)
  |
  v
Client requests presigned upload URL from server
  |
  v
Client uploads JPEG directly to R2 via presigned URL
  |
  v
Client confirms upload: POST /api/jobs/:jobId/photos
  |  { r2Key, photoId, takenAt, width, height, sizeBytes }
  |
  v
Server inserts photo record (type: "pending")
  |
  v
Server returns { photo } immediately to client (< 500ms)
  |
  v
Client shows photo in timeline with shimmer/loading state
  |
  v
Server background task (fire-and-forget):
  |
  +-- 1. Download original from R2 (~200ms)
  |
  +-- 2. Generate 400px thumbnail via Sharp (~50ms)
  |
  +-- 3. Upload thumbnail to R2 (~200ms)
  |
  +-- 4. Send image buffer to classifyPhoto() (~1-3s)
  |      - Gemini returns { type, confidence, scene, trade }
  |      - If confidence < 0.6 -> type = "unclassified"
  |      - If Gemini fails/timeout -> type = "unclassified"
  |
  +-- 5. Update photo record in Postgres with classification
  |
  +-- 6. Update job.lastPhotoAt and job.photoCount
  |
  v
Client polls GET /api/jobs/:jobId/photos every 2s for 10s
  |
  v
Photo type changes from "pending" to classified type
  |
  v
Client updates UI: shimmer -> type badge fade-in
```

### 3.4 Error Handling Matrix

| Failure Mode | Detection | Response | User Impact |
|-------------|-----------|----------|-------------|
| Gemini timeout (>10s) | AbortController signal | Save as `unclassified` | Photo visible, no type badge. User can manually classify. |
| Gemini rate limit (429) | HTTP status in error message | Save as `unclassified` | Same as timeout. |
| Gemini server error (500) | Try/catch in classifyPhoto | Save as `unclassified` | Same as timeout. |
| Invalid JSON from Gemini | JSON.parse throws | Save as `unclassified` | Same as timeout. Should not happen with `responseSchema` enforcement, but defended against. |
| Confidence below 0.6 | Threshold check in code | Return with type `unclassified`, preserve actual confidence and scene | Photo visible with "Tap to classify" hint. Scene description still available. |
| R2 download failure (for classification) | Try/catch around R2 GET | Skip classification, save as `unclassified` | Photo already in R2. Thumbnail generation may also fail. |
| GEMINI_API_KEY not set | Startup check | Fail fast on server startup with clear error | Server does not start. Operator must set env var. |

**Critical invariant:** The photo is ALWAYS saved to R2 and the database before classification is attempted. Classification is enhancement, not a requirement. Every error path in classifyPhoto returns a valid ClassificationResult with `type: "unclassified"`. There is no code path where a classification failure causes data loss.

---

## 4. Cost Analysis

### 4.1 Token Breakdown per Photo

Thomas estimated ~1,290 input tokens for the image. Based on current Gemini 2.0 Flash image tokenization rules, the actual count depends on the photo dimensions.

**Gemini 2.0 Flash image tokenization:**
- Images with both dimensions <= 384px: 258 tokens
- Larger images: tiled into 768x768px tiles, each tile = 258 tokens
- Tiling formula: `cropUnit = floor(min(width, height) / 1.5)`, then divide each dimension by the crop unit

For a typical SiteSnap photo (compressed to max 2048px on the longest edge):
- **Landscape 2048x1536:** ~4-6 tiles = ~1,032-1,548 tokens
- **Portrait 1536x2048:** ~4-6 tiles = ~1,032-1,548 tokens
- **Square 2048x2048:** ~4 tiles = ~1,032 tokens

Conservative estimate: **~1,300 input image tokens** (Thomas's original estimate holds as a reasonable average).

**Full token breakdown per classification call:**

| Component | Tokens | Cost at $0.10/1M input |
|-----------|--------|----------------------|
| System prompt | ~420 | $0.000042 |
| Image | ~1,300 | $0.000130 |
| **Total input** | **~1,720** | **$0.000172** |
| Output (~50-80 tokens) | ~65 | $0.000026 (at $0.40/1M output) |
| **Total per photo** | | **~$0.0002** |

Thomas's estimate of $0.0002 per photo is confirmed. It is accurate.

### 4.2 Monthly Cost Projections

| Scenario | Photos/day | Photos/month | Monthly cost | % of $5 revenue |
|----------|-----------|-------------|-------------|-----------------|
| Light user (small repairs) | 5 | 150 | $0.03 | 0.6% |
| Average user (2-3 jobs/day) | 20 | 600 | $0.12 | 2.4% |
| Heavy user (remodels + repairs) | 50 | 1,500 | $0.30 | 6.0% |
| Rate limit max (100/day) | 100 | 3,000 | $0.60 | 12.0% |

### 4.3 Fleet Cost Projections

| Users | Avg photos/user/day | Monthly Gemini cost | Monthly revenue | AI as % of revenue |
|-------|--------------------|--------------------|-----------------|-------------------|
| 100 | 20 | $12.00 | $500 (100% paid) | 2.4% |
| 500 | 20 | $60.00 | $2,500 | 2.4% |
| 1,000 | 20 | $120.00 | $5,000 | 2.4% |

AI cost is a fixed 2.4% of revenue at average use. Even at heavy use (50 photos/day), it is 6% -- well within acceptable margins. No cost risk here.

### 4.4 Model Retirement Notice

Gemini 2.0 Flash (`gemini-2.0-flash`) is scheduled for retirement on **March 31, 2026**. Before that date, we need to migrate to a successor model. Options:

1. **gemini-2.5-flash-lite** -- Direct replacement recommended by Google. Check pricing and structured output support before migration.
2. **gemini-2.5-flash** -- If lite variant does not support image input or structured output, use the full 2.5 Flash.

**Action required:** Before March 31, 2026, update the model string in `server/src/services/gemini.ts` and verify classification quality has not regressed. This is a one-line change (`model: "gemini-2.5-flash-lite"`) followed by a round of the test cases in Section 5. No prompt changes should be necessary unless the model behaves significantly differently.

**Recommendation for Jonah:** Extract the model name to a constant or environment variable (`GEMINI_MODEL_NAME`) so the migration is a config change, not a code change.

```typescript
const GEMINI_MODEL = process.env.GEMINI_MODEL_NAME || "gemini-2.0-flash";
```

---

## 5. Prompt Testing Strategy

### 5.1 Test Matrix

Classification accuracy should be validated against a matrix of photo types crossed with trades. Each cell represents a test case that should produce the expected type with confidence >= 0.6.

| Photo Content | Expected Type | Expected Trade | Min Confidence |
|---------------|-------------|----------------|----------------|
| Empty bathroom before remodel | before | plumbing | 0.70 |
| Freshly painted bedroom, clean and finished | after | painting | 0.85 |
| Partially demolished kitchen, tools on floor | progress | general | 0.75 |
| Water stain on ceiling, visible damage | issue | plumbing | 0.80 |
| Stack of lumber and boxes of tile on ground | material | general | 0.80 |
| Tape measure extended along a wall opening | measurement | general | 0.75 |
| Completed electrical panel, new breakers | after | electrical | 0.80 |
| HVAC condenser unit, outdoor, working condition | before | hvac | 0.60 |
| Ripped-up shingles on a roof, tarp visible | progress | roofing | 0.80 |
| Crack in foundation wall, close-up | issue | general | 0.85 |
| PEX fittings and copper pipe laid out on floor | material | plumbing | 0.85 |
| Laser level projecting line on a wall | measurement | general | 0.75 |

### 5.2 Edge Cases (Must Handle Gracefully)

These should return confidence < 0.6 (resulting in "unclassified") or at minimum should not produce a confident wrong answer.

| Photo Content | Expected Behavior | Why It Is Hard |
|---------------|-------------------|----------------|
| Photo of an invoice or permit document | confidence < 0.4, trade "general" | Paper, not a scene -- the model may try to classify it as "material" |
| Selfie of contractor (not a job site) | confidence < 0.3 | Not a job site photo at all |
| Dark or severely blurry photo | confidence < 0.5 | Insufficient visual information |
| Accidental pocket photo (dark, partial body) | confidence < 0.3 | Not interpretable |
| Clean, empty room (ambiguous before vs. after) | confidence 0.5-0.7 | Genuinely ambiguous -- the model cannot know if work has happened |
| Photo of a truck loaded with materials | confidence >= 0.6, type "material" | Correct but some models might classify as "before" since it is a pre-work state |
| Screenshot of a text conversation | confidence < 0.3 | Not a job site photo |
| Food photo (lunch break) | confidence < 0.3 | Not a job site photo |
| Closeup of a product label (UPC, specs) | confidence >= 0.6, type "material" | This is a valid "material" photo -- documenting what product is being used |
| Photo with a person in it doing work | confidence >= 0.6, type "progress" | Correct classification despite a person being present |

### 5.3 How to Run Tests

For v1, testing is manual. Assemble 20-30 representative photos and run each through the prompt via a test script.

```typescript
// test/classify-test.ts
// Run with: npx tsx test/classify-test.ts
import { classifyPhoto } from "../server/src/services/gemini";
import { readFileSync } from "fs";
import { resolve } from "path";

const TEST_CASES = [
  { file: "empty-bathroom.jpg", expectedType: "before", minConfidence: 0.7 },
  { file: "painted-bedroom.jpg", expectedType: "after", minConfidence: 0.85 },
  { file: "kitchen-demo.jpg", expectedType: "progress", minConfidence: 0.75 },
  { file: "water-stain.jpg", expectedType: "issue", minConfidence: 0.80 },
  { file: "lumber-stack.jpg", expectedType: "material", minConfidence: 0.80 },
  { file: "tape-measure.jpg", expectedType: "measurement", minConfidence: 0.75 },
  // Edge cases (expect unclassified)
  { file: "selfie.jpg", expectedType: "unclassified", maxConfidence: 0.4 },
  { file: "invoice.jpg", expectedType: "unclassified", maxConfidence: 0.5 },
  { file: "dark-blurry.jpg", expectedType: "unclassified", maxConfidence: 0.5 },
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const buffer = readFileSync(resolve(__dirname, "fixtures", tc.file));
    const result = await classifyPhoto(buffer);

    const typeOk = result.type === tc.expectedType;
    const confOk = tc.minConfidence
      ? result.confidence >= tc.minConfidence
      : result.confidence <= (tc.maxConfidence ?? 1.0);

    if (typeOk && confOk) {
      console.log(`PASS: ${tc.file} -> ${result.type} (${result.confidence})`);
      passed++;
    } else {
      console.log(
        `FAIL: ${tc.file} -> expected ${tc.expectedType}, got ${result.type} ` +
        `(confidence: ${result.confidence}, scene: "${result.scene}")`
      );
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${TEST_CASES.length}`);
}

runTests().catch(console.error);
```

**Test photo sources:** Use royalty-free stock photos from Unsplash/Pexels (search: "construction site", "bathroom remodel", "broken pipe", etc.) or take photos with a phone camera of realistic scenarios. The fixtures directory is gitignored (large binary files).

### 5.4 Ongoing Accuracy Monitoring

After launch, track accuracy via PostHog events:

| Event | What It Tells Us |
|-------|-----------------|
| `photo_classified` | Total volume and distribution across types and trades |
| `photo_reclassified` | User corrected the AI. Properties include `fromType` and `toType` -- this tells us exactly which classifications are wrong. |

**Key metric: reclassification rate.** If >15% of classified photos (not counting "unclassified") get manually reclassified, the prompt needs improvement. Slice by type to find which category is weakest.

**Expected patterns:**
- "before" vs. "after" confusion will be the most common reclassification (clean rooms are ambiguous without temporal context)
- "progress" will have the best accuracy (visible work-in-progress is unambiguous)
- "measurement" may be under-triggered (tape measures in the background of a "progress" photo may not register)

**Tuning the threshold:** If the reclassification rate is low but the "unclassified" rate is high (>30%), consider lowering the threshold from 0.6 to 0.5. If the reclassification rate is high, raise it. Start conservative at 0.6 and adjust based on 2-4 weeks of data.

---

## 6. Future Considerations: Camera Product Portfolio

SiteSnap's classification system is the simplest AI integration in the camera product lineup. Here is how the pattern extends, kept brief for now.

### CrackReport (Product #5)

- **AI task:** Crack detection + severity grading (not classification). Requires bounding box output, not just a label.
- **Model:** Roboflow custom-trained object detection model for crack detection. Gemini is used separately for report narrative generation (text, not vision).
- **Prompt reuse:** The Gemini prompt structure (system prompt + schema) transfers, but the content changes entirely. The structured output pattern (JSON mode, enum types, confidence scoring) is directly reusable.
- **Infrastructure reuse:** The entire `classifyPhoto` call pattern (download from R2 -> send to AI -> update record -> handle failure) is the same shape. Extract the error handling and timeout patterns into a shared utility.

### WeldGrade (Product #6)

- **AI task:** Weld quality assessment from close-up photos. Pass/fail + defect classification (porosity, undercut, spatter, etc.).
- **Model:** Roboflow for defect detection. Gemini for narrative description of findings.
- **Prompt reuse:** Same structured output pattern. Different schema (weld-specific defect types instead of job site photo types).

### HardHatCheck (Product #7)

- **AI task:** PPE compliance detection in job site photos. Detect presence/absence of hard hat, safety vest, safety glasses.
- **Model:** Roboflow for object detection (people + PPE items). Gemini for compliance summary narrative.
- **Prompt reuse:** Same structured output pattern with a different schema (compliance boolean fields instead of classification types).

### Shared Infrastructure Extraction

When CrackReport ships, extract these from SiteSnap into shared packages:

1. **AI call wrapper:** Timeout, retry, error handling, structured output parsing. These are identical across all camera products.
2. **Confidence threshold logic:** The "threshold -> unclassified" pattern is universal.
3. **PostHog accuracy tracking:** The "user corrects AI" feedback loop (reclassification events) applies to all products.
4. **Model name configuration:** `GEMINI_MODEL_NAME` env var pattern for easy model migration across all products.

---

## 7. Recommendations for Andrei and Jonah

### For Andrei (Architecture Impact)

1. **Gemini model name should be an env var.** The model is retiring March 31, 2026. Making it configurable avoids a code deploy for migration. See Section 4.4.

2. **The classification service has a clean interface.** `classifyPhoto(Buffer) -> ClassificationResult` -- one function, one input, one output, all failures handled internally. No architecture changes needed from the tech approach. Andrei's async-classification pattern (Section 6 of tech approach) is exactly right.

3. **No Gemini batch API needed.** Each photo is classified independently on upload. There is no bulk-classify use case in v1. If we add retroactive bulk import in v2, Gemini's Batch API ($0.05/1M input tokens -- half price) would be appropriate then.

### For Jonah (Implementation Notes)

1. **Copy the `classifyPhoto` function from Section 3.1 directly.** It is production-ready. The prompt, schema, error handling, and timeout are all included.

2. **Extract `GEMINI_MODEL_NAME` as an env var** (see Section 4.4). Default to `"gemini-2.0-flash"`.

3. **Log classification results to PostHog server-side.** Fire `photo_classified` with `{ type, confidence, trade, jobId }` after each successful classification. Fire `photo_classify_failed` with `{ errorType }` on failures. This enables the monitoring described in Section 5.4.

4. **Do NOT send the user's trade to Gemini.** The prompt detects trade from visual evidence only. Sending the user's profile trade would bias the model (a plumber photographing an electrical issue should get `trade: "electrical"`, not `trade: "plumbing"`).

5. **The `signal` option for AbortController** in `generateContent` -- verify this is supported in the version of `@google/generative-ai` you install. If not, wrap the call in `Promise.race` with a timeout reject:
   ```typescript
   const result = await Promise.race([
     model.generateContent(request),
     new Promise((_, reject) =>
       setTimeout(() => reject(new Error("Gemini timeout")), GEMINI_TIMEOUT_MS)
     ),
   ]);
   ```

6. **Confidence clamping is defensive.** Gemini should always return 0.0-1.0, but clamping with `Math.max(0, Math.min(1, ...))` prevents a malformed response from breaking downstream logic (e.g., negative confidence stored in the database).

---

## 8. SDK Migration Note

The VoiceNote Pro AI patterns doc uses `@google/generative-ai` (the older SDK). Google's newer SDK is `@google/genai` with a different API surface. Both work. For SiteSnap, use whichever is already installed. The code in Section 3.1 uses the `@google/generative-ai` API surface because it matches the VoiceNote Pro pattern and Andrei's tech approach.

If the team decides to standardize on `@google/genai` (the newer SDK), the main change is the import and initialization:

```typescript
// New SDK pattern (for reference only -- not used in SiteSnap v1)
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: "gemini-2.0-flash",
  contents: [/* ... */],
  config: {
    responseMimeType: "application/json",
    responseSchema: CLASSIFICATION_SCHEMA,
  },
});
```

The prompt, schema, and error handling logic are identical across both SDKs. This is a packaging difference, not a behavior difference. Standardize when convenient, not urgently.

---

*AI integration patterns written by Kai (AI Engineer) for SiteSnap. Ready for Jonah to implement. February 2026.*
