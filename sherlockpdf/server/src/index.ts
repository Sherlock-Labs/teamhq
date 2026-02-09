import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import checkoutRoutes from "./routes/checkout.js";
import statusRoutes from "./routes/status.js";
import portalRoutes from "./routes/portal.js";
import webhookRoutes from "./routes/webhook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3003", 10);
const CLIENT_URL = process.env.CLIENT_URL || "https://pdf.sherlocklabs.ai";

// CORS — allow requests from the SherlockPDF frontend
app.use(
  cors({
    origin: [CLIENT_URL, "http://localhost:5173", "http://localhost:5174", "http://localhost:8080"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// Webhook route MUST use raw body for Stripe signature verification.
// Register it BEFORE the JSON body parser.
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use("/api", webhookRoutes);

// JSON body parser for all other routes
app.use(express.json());

// API routes
app.use("/api", checkoutRoutes);
app.use("/api", statusRoutes);
app.use("/api", portalRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve static frontend (parent directory: sherlockpdf/)
const staticRoot = path.resolve(__dirname, "../../");
app.use(express.static(staticRoot));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"));
});

app.listen(PORT, () => {
  console.log(`SherlockPDF running on http://localhost:${PORT}`);
});
