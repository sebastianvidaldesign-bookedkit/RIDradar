import RssParser from "rss-parser";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { isTooOld } from "../lib/recency";
import { config } from "../config";
import type { RawMention } from "shared";
import crypto from "crypto";

const parser = new RssParser({
  timeout: 15000,
  headers: { "User-Agent": "RIDRadar/1.0" },
});

function hashId(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

export async function collectFeed(feedUrl: string, feedName: string): Promise<RawMention[]> {
  logger.info(`Fetching RSS feed: ${feedName} (${feedUrl})`);

  try {
    const feed = await parser.parseURL(feedUrl);
    const mentions: RawMention[] = [];
    let skippedOld = 0;
    let skippedNoDate = 0;

    for (const item of feed.items) {
      const pubDate = item.isoDate ? new Date(item.isoDate) : undefined;

      // Skip items with no publish date — can't verify recency
      if (!pubDate) {
        skippedNoDate++;
        continue;
      }

      // Skip items older than MAX_HISTORY_DAYS
      if (isTooOld(pubDate, config.maxHistoryDays)) {
        skippedOld++;
        continue;
      }

      const link = item.link || item.guid || "";
      const externalId = item.guid || `rss-${hashId(link || item.title || "")}`;

      mentions.push({
        platform: "rss",
        sourceName: feedName || feed.title || feedUrl,
        externalId,
        title: item.title || "",
        content: item.contentSnippet || item.content || item.summary || "",
        url: link,
        author: item.creator || item.author || undefined,
        publishedAt: pubDate,
        raw: item as unknown as Record<string, unknown>,
      });
    }

    if (skippedNoDate > 0) logger.info(`RSS ${feedName}: skipped ${skippedNoDate} items with no date`);
    if (skippedOld > 0) logger.info(`RSS ${feedName}: skipped ${skippedOld} items older than ${config.maxHistoryDays} days`);
    logger.info(`RSS feed ${feedName}: found ${mentions.length} items (after recency filter)`);
    return mentions;
  } catch (err) {
    logger.error(`Failed to fetch RSS feed ${feedName} (${feedUrl}):`, err);
    return [];
  }
}

export async function collectAllRss(): Promise<RawMention[]> {
  const sources = await prisma.source.findMany({
    where: { enabled: true, type: "rss_feed" },
  });

  const allMentions: RawMention[] = [];

  for (const source of sources) {
    const items = await collectFeed(source.value, source.name || source.value);
    allMentions.push(...items);
  }

  logger.info(`RSS collector found ${allMentions.length} raw items total`);
  return allMentions;
}
