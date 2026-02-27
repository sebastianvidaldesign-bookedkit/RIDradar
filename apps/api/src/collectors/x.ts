import { prisma } from "../lib/prisma";
import { config } from "../config";
import { logger } from "../lib/logger";
import { isTooOld } from "../lib/recency";
import type { RawMention } from "shared";

const BASE_DELAY = 2000;

interface TweetData {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

interface SearchResponse {
  data?: TweetData[];
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count?: number;
    next_token?: string;
  };
  errors?: Array<{ message: string; type: string }>;
}

async function searchRecent(
  query: string,
  bearerToken: string,
  retries = 3
): Promise<TweetData[]> {
  const params = new URLSearchParams({
    query,
    max_results: "100",
    "tweet.fields": "id,text,author_id,created_at,public_metrics",
  });

  const url = `https://api.x.com/2/tweets/search/recent?${params}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });

      // Rate limit (429) — back off
      if (res.status === 429) {
        const resetHeader = res.headers.get("x-rate-limit-reset");
        const resetMs = resetHeader
          ? (parseInt(resetHeader, 10) * 1000 - Date.now() + 1000)
          : BASE_DELAY * Math.pow(2, attempt);
        const waitMs = Math.min(Math.max(resetMs, BASE_DELAY), 60_000);
        logger.warn(`X API 429 rate limited, waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        logger.warn(`X API HTTP ${res.status}: ${body.slice(0, 300)}`);
        return [];
      }

      const json = (await res.json()) as SearchResponse;

      if (json.errors) {
        for (const e of json.errors) {
          logger.warn(`X API error: ${e.type} — ${e.message}`);
        }
      }

      return json.data || [];
    } catch (err) {
      logger.error(`X API fetch error (attempt ${attempt + 1}):`, err);
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
      }
    }
  }

  return [];
}

function tweetToMention(tweet: TweetData, sourceName: string): RawMention {
  return {
    platform: "x",
    sourceName,
    externalId: `x-${tweet.id}`,
    title: "", // tweets have no title
    content: tweet.text,
    url: `https://x.com/i/status/${tweet.id}`,
    author: tweet.author_id,
    publishedAt: tweet.created_at ? new Date(tweet.created_at) : undefined,
    raw: {
      id: tweet.id,
      text: tweet.text,
      author_id: tweet.author_id,
      created_at: tweet.created_at,
      public_metrics: tweet.public_metrics,
    },
  };
}

export async function collectXSearch(query: string): Promise<RawMention[]> {
  logger.info(`Searching X (recent): "${query}"`);

  const tweets = await searchRecent(query, config.xBearerToken);
  const mentions: RawMention[] = [];
  let skippedOld = 0;

  for (const tweet of tweets) {
    const mention = tweetToMention(tweet, `x:"${query}"`);
    if (isTooOld(mention.publishedAt, config.maxHistoryDays)) {
      skippedOld++;
      continue;
    }
    mentions.push(mention);
  }

  if (skippedOld > 0) {
    logger.info(`X search "${query}": skipped ${skippedOld} tweets older than ${config.maxHistoryDays} days`);
  }
  logger.info(`X search "${query}": found ${mentions.length} tweets`);

  // Polite delay between requests
  await new Promise((r) => setTimeout(r, 1500));
  return mentions;
}

export async function collectAllX(): Promise<RawMention[]> {
  if (!config.xBearerToken) {
    logger.info("X collector disabled: no X_BEARER_TOKEN configured");
    return [];
  }

  const sources = await prisma.source.findMany({
    where: { enabled: true, type: "x_query" },
  });

  if (sources.length === 0) {
    logger.info("X collector: no enabled x_query sources");
    return [];
  }

  const allMentions: RawMention[] = [];

  for (const source of sources) {
    try {
      const mentions = await collectXSearch(source.value);
      allMentions.push(...mentions);
    } catch (err) {
      logger.error(`Error collecting X query "${source.value}":`, err);
    }
  }

  logger.info(`X collector found ${allMentions.length} raw tweets total`);
  return allMentions;
}
