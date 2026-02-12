import { Router, json } from "express";
import { getWorkItems, putWorkItems } from "../store/workItems.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const router = Router();

// Increased JSON limit for base64 screenshot data URLs (~1-2MB typical)
const jsonParser = json({ limit: "5mb" });

const SCREENSHOTS_DIR = join(import.meta.dirname, "../../../data/bug-screenshots");

// --- Validation schemas ---

const BugReportBody = z.object({
  description: z.string().optional(),
  screenshotDataUrl: z.string().optional(),
  pageUrl: z.string().min(1, "pageUrl is required"),
  projectSlug: z.string().min(1, "projectSlug is required"),
  userAgent: z.string().optional(),
}).refine(
  (data) => (data.description && data.description.trim().length > 0) || data.screenshotDataUrl,
  { message: "At least description or screenshotDataUrl must be provided" }
);

// --- Helpers ---

function generateBugTitle(description: string | undefined, pageUrl: string): string {
  if (description && description.trim().length > 0) {
    const trimmed = description.trim();
    if (trimmed.length <= 60) return trimmed;
    // Cut at last word boundary before 60 chars
    const cut = trimmed.substring(0, 60);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 20 ? cut.substring(0, lastSpace) : cut) + "...";
  }
  // Fallback: extract page name from URL
  try {
    const path = new URL(pageUrl).pathname;
    const page = path.split("/").pop()?.replace(".html", "") || "unknown";
    return `Bug on ${page} page`;
  } catch {
    return "Bug report";
  }
}

async function saveScreenshot(dataUrl: string): Promise<string> {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  // Strip data URL prefix: "data:image/png;base64,..."
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const timestamp = Date.now();
  const random = randomBytes(4).toString("hex");
  const filename = `${timestamp}-${random}.png`;

  await writeFile(join(SCREENSHOTS_DIR, filename), buffer);
  return `data/bug-screenshots/${filename}`;
}

function generateWorkItemId(existingItems: Array<{ id: string }>, prefix: string): string {
  // Find highest numeric suffix and increment
  let maxNum = 0;
  for (const item of existingItems) {
    const match = item.id.match(/\d+$/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `${prefix}-${maxNum + 1}`;
}

// --- Routes ---

// GET /api/scribe-token
// Generates a single-use token for ElevenLabs Scribe v2 Realtime WebSocket connection.
// The ELEVENLABS_API_KEY never leaves the server.
router.get("/scribe-token", async (_req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("GET /api/scribe-token: ELEVENLABS_API_KEY not configured");
      return res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      console.error(`GET /api/scribe-token: ElevenLabs API error ${response.status}: ${errorText}`);
      return res.status(500).json({ error: "Failed to generate token" });
    }

    const token = await response.json();
    res.json(token);
  } catch (err) {
    console.error("GET /api/scribe-token: Unexpected error:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// POST /api/bug-reports
// Receives a completed bug report (transcription already done client-side),
// saves the screenshot, and creates a work item with type "bug".
router.post("/bug-reports", jsonParser, async (req, res) => {
  try {
    // 1. Validate request body
    const parseResult = BugReportBody.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((i) => i.message).join("; ");
      return res.status(400).json({ error: errors });
    }

    const { description, screenshotDataUrl, pageUrl, projectSlug, userAgent } = parseResult.data;

    // 2. Save screenshot if provided (non-blocking — log error but continue)
    let screenshotPath: string | undefined;
    if (screenshotDataUrl) {
      try {
        screenshotPath = await saveScreenshot(screenshotDataUrl);
      } catch (err) {
        console.error("POST /api/bug-reports: Failed to save screenshot:", err);
        // Non-blocking — continue without screenshot
      }
    }

    // 3. Generate title from description
    const title = generateBugTitle(description, pageUrl);

    // 4. Build metadata
    const metadata: Record<string, string> = {
      pageUrl,
      timestamp: new Date().toISOString(),
    };
    if (screenshotPath) {
      metadata.screenshotPath = screenshotPath;
    }
    if (userAgent) {
      metadata.userAgent = userAgent;
    }

    // 5. Get existing work items to generate next ID
    const { workItems: existingItems, taskPrefix } = await getWorkItems(projectSlug);
    const prefix = taskPrefix || projectSlug.toUpperCase().slice(0, 3);
    const newId = generateWorkItemId(existingItems, prefix);

    // 6. Create the new work item
    const newWorkItem = {
      id: newId,
      title,
      description: description?.trim() || "",
      status: "planned" as const,
      phase: "v1",
      owner: "",
      priority: "medium" as const,
      createdBy: "Bug Reporter",
      type: "bug" as const,
      metadata,
    };

    // 7. Append to existing work items and save
    const updatedItems = [...existingItems, newWorkItem];
    await putWorkItems(projectSlug, updatedItems);

    // 8. Return the created work item
    res.json({ workItem: newWorkItem });
  } catch (err) {
    console.error("POST /api/bug-reports: Unexpected error:", err);
    res.status(500).json({ error: "Failed to create bug report" });
  }
});

export default router;
