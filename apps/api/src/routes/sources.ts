import { Router, type IRouter } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

export const sourcesRouter: IRouter = Router();

// GET /api/sources — list all sources
sourcesRouter.get("/", async (_req, res) => {
  try {
    const sources = await prisma.source.findMany({
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    });
    res.json(sources);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    logger.error(`Error listing sources: ${msg}`);
    if (stack) logger.error(stack);
    res.status(500).json({ error: msg });
  }
});

// POST /api/sources — create a source
sourcesRouter.post("/", async (req, res) => {
  try {
    const { type, value, name, enabled = true } = req.body;

    const validTypes = ["subreddit", "reddit_query", "rss_feed", "search_query", "x_query"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    }
    if (!value || typeof value !== "string") {
      return res.status(400).json({ error: "value is required" });
    }

    const source = await prisma.source.create({
      data: { type, value: value.trim(), name: name || null, enabled },
    });
    res.status(201).json(source);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return res.status(409).json({ error: "Source already exists" });
    }
    logger.error("Error creating source:", err);
    res.status(500).json({ error: "Failed to create source" });
  }
});

// PATCH /api/sources/:id — update a source
sourcesRouter.patch("/:id", async (req, res) => {
  try {
    const { name, enabled, value } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (enabled !== undefined) data.enabled = Boolean(enabled);
    if (value !== undefined) data.value = String(value).trim();

    const source = await prisma.source.update({
      where: { id: req.params.id },
      data,
    });
    res.json(source);
  } catch (err) {
    logger.error("Error updating source:", err);
    res.status(500).json({ error: "Failed to update source" });
  }
});

// DELETE /api/sources/:id — delete a source
sourcesRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.source.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Error deleting source:", err);
    res.status(500).json({ error: "Failed to delete source" });
  }
});

// GET /api/settings — get all settings
sourcesRouter.get("/settings", async (_req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    res.json(map);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    logger.error(`Error fetching settings: ${msg}`);
    if (stack) logger.error(stack);
    res.status(500).json({ error: msg });
  }
});

// PUT /api/settings — update settings
sourcesRouter.put("/settings", async (req, res) => {
  try {
    const entries = Object.entries(req.body) as [string, string][];

    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    res.json(map);
  } catch (err) {
    logger.error("Error updating settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});
