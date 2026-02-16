/**
 * SiteSnap Express API Server.
 *
 * Entry point. Middleware ordering is important:
 * 1. Health check (unauthenticated, no body parsing)
 * 2. Webhook routes (raw body) BEFORE json body parser
 * 3. CORS
 * 4. JSON body parser
 * 5. Clerk auth middleware
 * 6. API routes (all authenticated)
 */
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import apiRoutes from "./routes/index.js";
import clerkWebhook from "./webhooks/clerk.js";
import { handleAppleWebhook } from "./webhooks/apple.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ──────────────────────────────────────────────
// Validate critical environment variables BEFORE starting the server
// Per Atlas review (m-3): validate before listen, not inside callback
// ──────────────────────────────────────────────
const required = ["DATABASE_URL", "CLERK_SECRET_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: Required env var ${key} is not set.`);
    process.exit(1);
  }
}

// ──────────────────────────────────────────────
// 1. Health check (no auth, no body parsing needed)
// ──────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "sitesnap-api", timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// 2. Webhook routes with RAW body parsing
//    Must come BEFORE express.json() so they get the raw body
//    for signature verification.
//    Per Howard's Section 14: Apple webhook registered before express.json()
// ──────────────────────────────────────────────
app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhook
);

app.post(
  "/api/webhooks/apple",
  express.raw({ type: "application/json" }),
  handleAppleWebhook
);

// ──────────────────────────────────────────────
// 3. CORS
// ──────────────────────────────────────────────
app.use(
  cors({
    origin: true, // Allow all origins (mobile app + dev environments)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ──────────────────────────────────────────────
// 4. JSON body parser (for all non-webhook routes)
// ──────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ──────────────────────────────────────────────
// 5. Clerk authentication middleware
//    Attaches auth info to every request.
//    Individual routes use requireAuth() to enforce.
// ──────────────────────────────────────────────
app.use(clerkMiddleware());

// ──────────────────────────────────────────────
// 6. API routes (all require authentication via requireAuth middleware)
// ──────────────────────────────────────────────
app.use("/api", apiRoutes);

// ──────────────────────────────────────────────
// 7. 404 handler for unmatched routes
// ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ──────────────────────────────────────────────
// 8. Global error handler
// ──────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SiteSnap API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Log optional env var status
  const optional = [
    "CLERK_WEBHOOK_SECRET",
    "APPLE_KEY_ID",
    "APPLE_ISSUER_ID",
    "APPLE_BUNDLE_ID",
    "APPLE_PRIVATE_KEY",
    "APPLE_ENVIRONMENT",
    "APPLE_IAP_PRODUCT_ID",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "GEMINI_API_KEY",
    "GEMINI_MODEL_NAME",
    "LOOPS_API_KEY",
    "POSTHOG_API_KEY",
  ];

  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(`Optional env vars not set: ${missingOptional.join(", ")}`);
  }

  console.log(`Gemini model: ${process.env.GEMINI_MODEL_NAME || "gemini-3.0-flash-preview (default)"}`);
  console.log(`R2 bucket: ${process.env.R2_BUCKET_NAME || "sitesnap-photos (default)"}`);
  console.log(`Apple environment: ${process.env.APPLE_ENVIRONMENT || "Sandbox (default)"}`);
});

export default app;
