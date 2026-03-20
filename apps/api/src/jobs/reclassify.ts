import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { config } from "../config";
import { classify } from "../classifiers/index";

const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY_MS = 1200; // Anthropic Tier 1 rate limit

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runReclassify(): Promise<number> {
  logger.info("Starting reclassify job — fetching all 'new' mentions...");

  // Read minStoreScore from settings or fall back to config
  let minStoreScore = config.minStoreScore;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "min_store_score" } });
    if (setting) minStoreScore = parseInt(setting.value, 10);
  } catch {}

  // Count total "new" mentions
  const total = await prisma.mention.count({ where: { status: "new" } });
  logger.info(`Reclassify: ${total} mentions with status "new" to process`);

  let processed = 0;
  let markedIgnored = 0;
  let offset = 0;

  while (offset < total) {
    const batch = await prisma.mention.findMany({
      where: { status: "new" },
      select: {
        id: true,
        title: true,
        content: true,
        sourceName: true,
      },
      orderBy: { fetchedAt: "desc" },
      take: BATCH_SIZE,
      skip: offset,
    });

    if (batch.length === 0) break;

    for (const mention of batch) {
      try {
        const classification = await classify(mention.title, mention.content, mention.sourceName);

        const shouldIgnore = !classification.relevant || classification.score < minStoreScore;

        await prisma.mention.update({
          where: { id: mention.id },
          data: {
            score: classification.score,
            relevant: classification.relevant,
            intent: classification.intent,
            audience: classification.audience,
            urgency: classification.urgency,
            reason: classification.reason,
            classification: classification.ridClassification ?? undefined,
            whyMatched: classification.whyMatched ?? undefined,
            campaignIdea: classification.campaignIdea ?? undefined,
            status: shouldIgnore ? "ignored" : "new",
          },
        });

        if (shouldIgnore) markedIgnored++;
        processed++;

        logger.debug(
          `Reclassified ${mention.id}: score=${classification.score}, relevant=${classification.relevant}${shouldIgnore ? " → ignored" : ""}`
        );

        // Respect Anthropic Tier 1 rate limit between LLM calls
        await sleep(RATE_LIMIT_DELAY_MS);
      } catch (err) {
        logger.error(`Failed to reclassify mention ${mention.id}:`, err);
      }
    }

    offset += BATCH_SIZE;
  }

  logger.info(
    `Reclassify complete: processed=${processed}, markedIgnored=${markedIgnored}`
  );
  return processed;
}
