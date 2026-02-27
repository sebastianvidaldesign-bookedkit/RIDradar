import { Router, type IRouter } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { generateDrafts } from "../drafting/index";
import type { Prisma } from "@prisma/client";

export const mentionsRouter: IRouter = Router();

// GET /api/mentions — list with filters
mentionsRouter.get("/", async (req, res) => {
  try {
    const {
      status,
      platform,
      language,
      scoreMin,
      scoreMax,
      intent,
      dateFrom,
      dateTo,
      publishedAfter,
      relevant,
      sort = "score_high",
      limit = "50",
      offset = "0",
    } = req.query;

    const where: Prisma.MentionWhereInput = {};

    if (status && status !== "all") {
      const statuses = (status as string).split(",");
      if (statuses.length > 1) {
        where.status = { in: statuses };
      } else {
        where.status = statuses[0];
      }
    }
    if (platform && platform !== "all") where.platform = platform as string;
    if (language && language !== "all") where.language = language as string;
    if (intent && intent !== "all") where.intent = intent as string;
    if (relevant === "true") where.relevant = true;
    if (relevant === "false") where.relevant = false;

    if (scoreMin || scoreMax) {
      where.score = {};
      if (scoreMin) where.score.gte = parseInt(scoreMin as string, 10);
      if (scoreMax) where.score.lte = parseInt(scoreMax as string, 10);
    }

    if (dateFrom || dateTo) {
      where.fetchedAt = {};
      if (dateFrom) where.fetchedAt.gte = new Date(dateFrom as string);
      if (dateTo) where.fetchedAt.lte = new Date(dateTo as string);
    }

    if (publishedAfter) {
      const cutoff = new Date(publishedAfter as string);
      where.OR = [{ publishedAt: null }, { publishedAt: { gte: cutoff } }];
    }

    const sortMap: Record<string, Prisma.MentionOrderByWithRelationInput> = {
      score_high: { score: "desc" },
      score_low: { score: "asc" },
      newest: { fetchedAt: "desc" },
      oldest: { fetchedAt: "asc" },
    };
    const orderBy = sortMap[sort as string] || sortMap.score_high;

    const [mentions, total] = await Promise.all([
      prisma.mention.findMany({
        where,
        orderBy,
        take: Math.min(parseInt(limit as string, 10), 200),
        skip: parseInt(offset as string, 10),
        include: {
          drafts: {
            select: { id: true, variant: true },
          },
        },
      }),
      prisma.mention.count({ where }),
    ]);

    res.json({ mentions, total, limit: parseInt(limit as string, 10), offset: parseInt(offset as string, 10) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    logger.error(`Error listing mentions: ${msg}`);
    if (stack) logger.error(stack);
    res.status(500).json({ error: msg });
  }
});

// GET /api/mentions/stats — quick summary
mentionsRouter.get("/stats", async (_req, res) => {
  try {
    const [total, newCount, relevant, highScore] = await Promise.all([
      prisma.mention.count(),
      prisma.mention.count({ where: { status: "new" } }),
      prisma.mention.count({ where: { relevant: true } }),
      prisma.mention.count({ where: { score: { gte: 85 } } }),
    ]);

    res.json({ total, new: newCount, relevant, highScore });
  } catch (err) {
    logger.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/mentions/:id — detail with drafts
mentionsRouter.get("/:id", async (req, res) => {
  try {
    const mention = await prisma.mention.findUnique({
      where: { id: req.params.id },
      include: { drafts: { orderBy: { createdAt: "asc" } } },
    });

    if (!mention) {
      return res.status(404).json({ error: "Mention not found" });
    }

    res.json(mention);
  } catch (err) {
    logger.error("Error fetching mention:", err);
    res.status(500).json({ error: "Failed to fetch mention" });
  }
});

// PATCH /api/mentions/:id — update status
mentionsRouter.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["new", "reviewed", "replied", "ignored"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const mention = await prisma.mention.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(mention);
  } catch (err) {
    logger.error("Error updating mention:", err);
    res.status(500).json({ error: "Failed to update mention" });
  }
});

// POST /api/mentions/:id/drafts — generate reply drafts
mentionsRouter.post("/:id/drafts", async (req, res) => {
  try {
    const mention = await prisma.mention.findUnique({
      where: { id: req.params.id },
    });

    if (!mention) {
      return res.status(404).json({ error: "Mention not found" });
    }

    // Delete existing drafts if regenerating
    await prisma.replyDraft.deleteMany({ where: { mentionId: mention.id } });
    await generateDrafts(mention);

    const drafts = await prisma.replyDraft.findMany({
      where: { mentionId: mention.id },
      orderBy: { createdAt: "asc" },
    });

    res.json(drafts);
  } catch (err) {
    logger.error("Error generating drafts:", err);
    res.status(500).json({ error: "Failed to generate drafts" });
  }
});
