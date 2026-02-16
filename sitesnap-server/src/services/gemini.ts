/**
 * Gemini multimodal photo classification service.
 *
 * Uses Kai's production prompt from docs/sitesnap-ai-patterns.md Section 3.1.
 * Model name is configurable via GEMINI_MODEL_NAME env var for easy migration.
 * Default: gemini-3.0-flash-preview (CEO decision).
 */
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY not set. Photo classification will fail.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

const GEMINI_MODEL = process.env.GEMINI_MODEL_NAME || "gemini-3.0-flash-preview";
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
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CLASSIFICATION_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 256,
    },
  });

  // Use Promise.race for timeout since AbortController signal support
  // may not be available in all versions of @google/generative-ai
  try {
    const result = await Promise.race([
      model.generateContent({
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
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Gemini classification timeout")),
          GEMINI_TIMEOUT_MS
        )
      ),
    ]);

    const text = result.response.text();
    const parsed = JSON.parse(text);

    // Validate and clamp confidence to [0, 1]
    const confidence = Math.max(0, Math.min(1, parsed.confidence));

    // Apply confidence threshold
    const type = confidence < CONFIDENCE_THRESHOLD ? "unclassified" : parsed.type;

    return {
      type,
      confidence,
      scene: parsed.scene || "No description available",
      trade: parsed.trade || "general",
    };
  } catch (error) {
    // Determine error type for logging
    const errorType =
      error instanceof Error && error.message.includes("timeout")
        ? "timeout"
        : error instanceof Error && error.message.includes("429")
          ? "rate_limit"
          : "api_error";

    console.error(`Gemini classification failed [${errorType}]:`, error);

    // Return unclassified on any failure -- photo is never lost
    return {
      type: "unclassified",
      confidence: 0,
      scene: "Classification unavailable",
      trade: "general",
    };
  }
}
