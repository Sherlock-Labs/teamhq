import express from "express";
import cors from "cors";
import sessionRoutes from "./routes/sessions.js";

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api", sessionRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`OST Tool server running on http://localhost:${PORT}`);
});
