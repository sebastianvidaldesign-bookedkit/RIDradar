import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { jobStatus, triggerJob } from "../jobs/scheduler";

export const jobsRouter: IRouter = Router();

// POST /api/jobs/run — trigger a job
jobsRouter.post("/run", async (req, res) => {
  try {
    const { type } = req.body;
    const validTypes = ["reddit", "rss", "search", "x", "digest", "apify", "all"];

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid job type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    triggerJob(type);
    res.json({ ok: true, message: `Job "${type}" triggered`, status: jobStatus });
  } catch (err) {
    logger.error("Error triggering job:", err);
    res.status(500).json({ error: "Failed to trigger job" });
  }
});

// GET /api/jobs/status — get job statuses
jobsRouter.get("/status", async (_req, res) => {
  res.json(jobStatus);
});
