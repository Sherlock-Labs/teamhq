import { Router } from "express";
import {
  createSession,
  getSession,
  updateSession,
  listSessions,
} from "../session-store.js";
import { generateOST } from "../agents/ost-generator.js";
import { runAllDebaters, ALL_PERSPECTIVES } from "../agents/debaters.js";
import { synthesize } from "../agents/synthesizer.js";

const router = Router();

// List available perspectives
router.get("/perspectives", (_req, res) => {
  res.json(
    ALL_PERSPECTIVES.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
    }))
  );
});

// Create a new session
router.post("/sessions", async (req, res) => {
  try {
    const { goal, context } = req.body;
    if (!goal || !context) {
      res.status(400).json({ error: "goal and context are required" });
      return;
    }
    const session = await createSession(goal, context);
    res.status(201).json(session);
  } catch (err) {
    console.error("Error creating session:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// List all sessions
router.get("/sessions", async (_req, res) => {
  try {
    const sessions = await listSessions();
    res.json(sessions);
  } catch (err) {
    console.error("Error listing sessions:", err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

// Get a session by ID
router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    res.json(session);
  } catch (err) {
    console.error("Error getting session:", err);
    res.status(404).json({ error: "Session not found" });
  }
});

// Generate OST for a session
router.post("/sessions/:id/generate-ost", async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    console.log(`Generating OST for session ${session.id}...`);
    const ost = await generateOST(session.goal, session.context);
    const updated = await updateSession(session.id, { ost });
    console.log(`OST generated: ${ost.nodes.length} nodes`);
    res.json(updated);
  } catch (err) {
    console.error("Error generating OST:", err);
    res.status(500).json({ error: "Failed to generate OST" });
  }
});

// Run debate on selected solutions
router.post("/sessions/:id/debate", async (req, res) => {
  try {
    const { solutionIds, perspectiveIds } = req.body;
    if (!solutionIds || !Array.isArray(solutionIds) || solutionIds.length === 0) {
      res.status(400).json({ error: "solutionIds array is required" });
      return;
    }
    if (!perspectiveIds || !Array.isArray(perspectiveIds) || perspectiveIds.length === 0) {
      res.status(400).json({ error: "perspectiveIds array is required" });
      return;
    }
    const session = await getSession(req.params.id);
    if (!session.ost) {
      res.status(400).json({ error: "OST must be generated first" });
      return;
    }
    console.log(
      `Running debate for session ${session.id} with ${perspectiveIds.length} perspectives on ${solutionIds.length} solutions...`
    );
    const debate = await runAllDebaters({
      ost: session.ost,
      solutionIds,
      perspectiveNames: perspectiveIds,
      goal: session.goal,
      context: session.context,
    });
    const updated = await updateSession(session.id, {
      selectedSolutions: solutionIds,
      debate,
    });
    console.log(`Debate complete: ${debate.length} perspectives`);
    res.json(updated);
  } catch (err) {
    console.error("Error running debate:", err);
    res.status(500).json({ error: "Failed to run debate" });
  }
});

// Generate recommendation
router.post("/sessions/:id/recommend", async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session.ost || !session.debate || !session.selectedSolutions) {
      res
        .status(400)
        .json({ error: "OST and debate must be completed first" });
      return;
    }
    console.log(`Generating recommendation for session ${session.id}...`);
    const recommendation = await synthesize({
      ost: session.ost,
      solutionIds: session.selectedSolutions,
      debate: session.debate,
      goal: session.goal,
      context: session.context,
    });
    const updated = await updateSession(session.id, { recommendation });
    console.log(
      `Recommendation generated (confidence: ${recommendation.confidence}/10)`
    );
    res.json(updated);
  } catch (err) {
    console.error("Error generating recommendation:", err);
    res.status(500).json({ error: "Failed to generate recommendation" });
  }
});

export default router;
