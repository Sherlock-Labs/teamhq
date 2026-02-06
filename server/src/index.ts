import express from "express";
import projectRoutes from "./routes/projects.js";
import { migrateFromTasksJson } from "./migrate.js";

const app = express();
const PORT = 3002;

app.use(express.json());

app.use("/api", projectRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  await migrateFromTasksJson();
  app.listen(PORT, () => {
    console.log(`TeamHQ server running on http://localhost:${PORT}`);
  });
}

start();
