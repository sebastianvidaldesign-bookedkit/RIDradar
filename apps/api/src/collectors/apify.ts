import { config } from "../config";
import { logger } from "../lib/logger";
import type { RawMention } from "shared";
import crypto from "crypto";

function hashId(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

// Event-attendance hashtags to search — keep list short to control cost
const INSTAGRAM_HASHTAGS = [
  "weddingguest",
  "galaoutfit",
  "fashionweek",
  "moviepremiere",
  "awardsseason",
];

const TIKTOK_HASHTAGS = [
  "weddingguest",
  "galaoutfit",
  "fashionweek",
  "moviepremiere",
  "awardsseason",
];

// Max results per hashtag — 5 hashtags × 4 = 20 results per platform max
const MAX_PER_HASHTAG = 4;

async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 120
): Promise<unknown[]> {
  const url =
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items` +
    `?token=${config.apifyToken}&timeout=${timeoutSecs}&memory=256`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.warn(`Apify actor ${actorId} returned ${res.status}: ${body.slice(0, 200)}`);
    return [];
  }

  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data : [];
}

async function scrapeInstagram(): Promise<RawMention[]> {
  const mentions: RawMention[] = [];

  for (const hashtag of INSTAGRAM_HASHTAGS) {
    logger.info(`Apify Instagram scraping: #${hashtag}`);
    try {
      const items = await runActor("apify/instagram-scraper", {
        hashtags: [hashtag],
        resultsType: "posts",
        resultsLimit: MAX_PER_HASHTAG,
        addParentData: false,
      });

      for (const item of items as Array<Record<string, unknown>>) {
        const url = (item.url as string) || (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : "");
        if (!url) continue;
        mentions.push({
          platform: "search",
          sourceName: `Instagram #${hashtag}`,
          externalId: `ig-${hashId(url)}`,
          title: (item.caption as string)?.slice(0, 120) || `#${hashtag} post`,
          content: (item.caption as string) || "",
          url,
          author: (item.ownerUsername as string) || undefined,
          publishedAt: item.timestamp ? new Date(item.timestamp as string) : undefined,
          raw: item,
        });
      }
    } catch (err) {
      logger.error(`Apify Instagram error for #${hashtag}:`, err);
    }
  }

  return mentions;
}

async function scrapeTikTok(): Promise<RawMention[]> {
  const mentions: RawMention[] = [];

  for (const hashtag of TIKTOK_HASHTAGS) {
    logger.info(`Apify TikTok scraping: #${hashtag}`);
    try {
      const items = await runActor("clockworks/tiktok-scraper", {
        hashtags: [hashtag],
        resultsPerPage: MAX_PER_HASHTAG,
      });

      for (const item of items as Array<Record<string, unknown>>) {
        const authorName = ((item.authorMeta as Record<string, unknown> | undefined)?.["name"] as string) || "";
        const url = (item.webVideoUrl as string) || (item.id ? `https://www.tiktok.com/@${authorName}/video/${item.id}` : "");
        if (!url) continue;
        mentions.push({
          platform: "search",
          sourceName: `TikTok #${hashtag}`,
          externalId: `tt-${hashId(url)}`,
          title: (item.text as string)?.slice(0, 120) || `#${hashtag} video`,
          content: (item.text as string) || "",
          url,
          author: ((item.authorMeta as Record<string, unknown> | undefined)?.["name"] as string) || undefined,
          publishedAt: item.createTime ? new Date((item.createTime as number) * 1000) : undefined,
          raw: item,
        });
      }
    } catch (err) {
      logger.error(`Apify TikTok error for #${hashtag}:`, err);
    }
  }

  return mentions;
}

export async function collectAllApify(): Promise<RawMention[]> {
  if (!config.apifyToken) {
    logger.info("Apify disabled: APIFY_TOKEN not set");
    return [];
  }

  const [instagram, tiktok] = await Promise.all([
    scrapeInstagram(),
    scrapeTikTok(),
  ]);

  const all = [...instagram, ...tiktok];
  logger.info(`Apify collector found ${all.length} raw items (${instagram.length} Instagram, ${tiktok.length} TikTok)`);
  return all;
}
