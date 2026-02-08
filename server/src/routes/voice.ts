import { Router } from "express";
import { voiceExtractHandler } from "../voice/extract.js";
import { voiceHealthHandler } from "../voice/health.js";

const router = Router();

// POST /api/voice/extract — Extract structured project data from a voice transcript
router.post("/voice/extract", voiceExtractHandler);

// GET /api/voice/health — Check Voxtral API reachability
router.get("/voice/health", voiceHealthHandler);

export default router;
