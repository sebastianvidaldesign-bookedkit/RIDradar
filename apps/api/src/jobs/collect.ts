import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { config } from "../config";
import { classify } from "../classifiers/index";
import { generateDrafts } from "../drafting/index";
import { collectAllReddit } from "../collectors/reddit";
import { collectAllRss } from "../collectors/rss";
import { collectAllSearch } from "../collectors/search";
import { collectAllX } from "../collectors/x";
import { collectAllApify } from "../collectors/apify";
import type { RawMention } from "shared";

interface ProcessResult {
  raw_count: number;
  inserted_count: number;
  skipped_duplicate: number;
  skipped_low_score: number;
  skipped_irrelevant: number;
  drafted_count: number;
}

async function processMentions(rawMentions: RawMention[], bypassFilters = false): Promise<ProcessResult> {
  const result: ProcessResult = {
    raw_count: rawMentions.length,
    inserted_count: 0,
    skipped_duplicate: 0,
    skipped_low_score: 0,
    skipped_irrelevant: 0,
    drafted_count: 0,
  };

  // Read thresholds from settings or fall back to config
  let digestThreshold = config.scoreThreshold;
  let minStoreScore = config.minStoreScore;
  try {
    const [threshSetting, minStoreSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "score_threshold" } }),
      prisma.setting.findUnique({ where: { key: "min_store_score" } }),
    ]);
    if (threshSetting) digestThreshold = parseInt(threshSetting.value, 10);
    if (minStoreSetting) minStoreScore = parseInt(minStoreSetting.value, 10);
  } catch {}

  for (const raw of rawMentions) {
    try {
      // Dedupe check
      const existing = await prisma.mention.findUnique({
        where: { externalId: raw.externalId },
      });
      if (existing) {
        result.skipped_duplicate++;
        continue;
      }

      // Classify
      const classification = await classify(raw.title, raw.content, raw.sourceName);

      // Skip if not relevant (bypass for Apify — store all raw results)
      if (!bypassFilters && !classification.relevant) {
        result.skipped_irrelevant++;
        continue;
      }

      // Skip if below MIN_STORE_SCORE (bypass for Apify)
      if (!bypassFilters && classification.score < minStoreScore) {
        result.skipped_low_score++;
        continue;
      }

      // Store mention
      const mention = await prisma.mention.create({
        data: {
          platform: raw.platform,
          sourceName: raw.sourceName,
          externalId: raw.externalId,
          title: raw.title,
          content: raw.content,
          url: raw.url,
          author: raw.author,
          publishedAt: raw.publishedAt,
          raw: (raw.raw as any) || undefined,
          score: bypassFilters ? Math.max(classification.score, 50) : classification.score,
          relevant: bypassFilters ? true : classification.relevant,
          intent: classification.intent,
          audience: classification.audience,
          urgency: classification.urgency,
          reason: classification.reason,
          language: classification.language ?? "en",
          // RID Radar intelligence fields
          classification: classification.ridClassification ?? null,
          matchedTerms: classification.matchedTerms ?? undefined,
          whyMatched: classification.whyMatched ?? null,
          campaignIdea: classification.campaignIdea ?? null,
        },
      });

      result.inserted_count++;

      // Auto-generate drafts if above digest threshold
      if (classification.score >= digestThreshold) {
        try {
          await generateDrafts(mention);
          result.drafted_count++;
        } catch (draftErr) {
          logger.warn(`Failed to generate drafts for mention ${mention.id}:`, draftErr);
        }
      }
    } catch (err) {
      logger.error(`Error processing mention ${raw.externalId}:`, err);
    }
  }

  return result;
}

function logResult(label: string, r: ProcessResult) {
  logger.info(
    `${label} complete: raw=${r.raw_count}, inserted=${r.inserted_count}, ` +
    `duplicate=${r.skipped_duplicate}, irrelevant=${r.skipped_irrelevant}, ` +
    `low_score=${r.skipped_low_score}, drafted=${r.drafted_count}`
  );
}

/** Read MAX_HISTORY_DAYS from DB settings so UI changes take effect without restart. */
async function syncMaxHistoryDays() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "max_history_days" } });
    if (setting) (config as any).maxHistoryDays = parseInt(setting.value, 10);
  } catch {}
}

export async function runRedditCollect(): Promise<number> {
  logger.info("Starting Reddit collection...");
  await syncMaxHistoryDays();
  const rawMentions = await collectAllReddit();
  const result = await processMentions(rawMentions);
  logResult("Reddit collection", result);
  return result.inserted_count;
}

export async function runRssCollect(): Promise<number> {
  logger.info("Starting RSS collection...");
  await syncMaxHistoryDays();
  const rawMentions = await collectAllRss();
  const result = await processMentions(rawMentions);
  logResult("RSS collection", result);
  return result.inserted_count;
}

export async function runSearchCollect(): Promise<number> {
  logger.info("Starting web search collection...");
  await syncMaxHistoryDays();
  const rawMentions = await collectAllSearch();
  const result = await processMentions(rawMentions);
  logResult("Web search collection", result);
  return result.inserted_count;
}

export async function runXCollect(): Promise<number> {
  logger.info("Starting X collection...");
  await syncMaxHistoryDays();
  const rawMentions = await collectAllX();
  const result = await processMentions(rawMentions);
  logResult("X collection", result);
  return result.inserted_count;
}

export async function runApifyCollect(): Promise<number> {
  logger.info("Starting Apify collection...");
  await syncMaxHistoryDays();
  const rawMentions = await collectAllApify();
  const result = await processMentions(rawMentions, true); // bypass filters — store all raw results
  logResult("Apify collection", result);
  return result.inserted_count;
}

export async function runAllCollect(): Promise<{ reddit: number; rss: number; search: number; x: number }> {
  await syncMaxHistoryDays();
  const reddit = await runRedditCollect();
  const rss = await runRssCollect();
  const search = await runSearchCollect();
  const x = await runXCollect();
  return { reddit, rss, search, x };
}
