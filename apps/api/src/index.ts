import express from "express";
import cors from "cors";
import { config } from "./config";
import { logger } from "./lib/logger";
import { mentionsRouter } from "./routes/mentions";
import { sourcesRouter } from "./routes/sources";
import { jobsRouter } from "./routes/jobs";
import { startScheduler } from "./jobs/scheduler";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/mentions", mentionsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/jobs", jobsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    llmEnabled: config.llmEnabled,
    searchProvider: config.serpApiKey ? "SerpAPI" : config.bingKey ? "Bing" : "disabled",
    xEnabled: Boolean(config.xBearerToken),
  });
});

app.listen(config.port, async () => {
  logger.info(`RID Radar API running on http://localhost:${config.port}`);
  logger.info(`LLM: ${config.llmEnabled ? `enabled (${config.llmModel})` : "disabled (heuristic mode)"}`);

  // STEP 2: Test database connectivity at startup
  try {
    const { prisma } = await import("./lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection: OK");

    // STEP 5: Log seed data counts
    const sourceCount = await prisma.source.count();
    const settingCount = await prisma.setting.count();
    const mentionCount = await prisma.mention.count();
    logger.info(`Database row counts: sources=${sourceCount}, settings=${settingCount}, mentions=${mentionCount}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : "";
    logger.error(`Database connection FAILED: ${errMsg}`);
    if (errStack) logger.error(`Stack: ${errStack}`);
  }

  startScheduler();
});
