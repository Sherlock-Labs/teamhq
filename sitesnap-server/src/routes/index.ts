/**
 * Route mounting.
 *
 * All routes except webhooks require Clerk authentication.
 * Webhooks use raw body parsing for signature verification.
 */
import { Router } from "express";
import userRoutes from "./user.js";
import jobRoutes from "./jobs.js";
import photoRoutes from "./photos.js";
import searchRoutes from "./search.js";
import compareRoutes from "./compare.js";
import billingRoutes from "./billing.js";

const router = Router();

// Authenticated API routes
router.use("/me", userRoutes);
router.use("/jobs", jobRoutes);
router.use("/", photoRoutes); // Handles /jobs/:id/photos/* and /photos/:id/*
router.use("/photos/search", searchRoutes);
router.use("/photos/compare", compareRoutes);
router.use("/billing", billingRoutes);

export default router;
