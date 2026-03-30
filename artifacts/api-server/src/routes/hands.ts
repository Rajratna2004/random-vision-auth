import { Router } from "express";

const router = Router();
const FLASK_URL = "http://localhost:5000";

router.post("/detect", async (req, res) => {
  try {
    const response = await fetch(`${FLASK_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.json({
      gesture: "idle",
      landmarks: null,
      handDetected: false,
      error: err.name === "TimeoutError" ? "timeout" : "service_unavailable",
    });
  }
});

router.get("/health", async (_req, res) => {
  try {
    const response = await fetch(`${FLASK_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    res.json(data);
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

export default router;
