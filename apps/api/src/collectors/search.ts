import { prisma } from "../lib/prisma";
import { config } from "../config";
import { logger } from "../lib/logger";
import { isTooOld } from "../lib/recency";
import type { RawMention } from "shared";
import crypto from "crypto";

function hashId(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

interface SearchProvider {
  name: string;
  search(query: string): Promise<RawMention[]>;
}

// --- SerpAPI Provider ---
const serpApiProvider: SearchProvider = {
  name: "SerpAPI",
  async search(query: string): Promise<RawMention[]> {
    const params = new URLSearchParams({
      q: query,
      api_key: config.serpApiKey,
      engine: "google",
      num: "20",
    });

    const url = `https://serpapi.com/search.json?${params}`;
    logger.info(`SerpAPI searching: "${query}"`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn(`SerpAPI returned ${res.status}`);
        return [];
      }

      const json = (await res.json()) as Record<string, unknown>;
      const results = (json.organic_results as Array<Record<string, unknown>>) || [];

      return results.map((r) => ({
        platform: "search" as const,
        sourceName: "SerpAPI",
        externalId: `serp-${hashId((r.link as string) || "")}`,
        title: (r.title as string) || "",
        content: (r.snippet as string) || "",
        url: (r.link as string) || "",
        author: undefined,
        publishedAt: r.date ? new Date(r.date as string) : undefined,
        raw: r,
      }));
    } catch (err) {
      logger.error("SerpAPI error:", err);
      return [];
    }
  },
};

// --- Bing Web Search Provider ---
const bingProvider: SearchProvider = {
  name: "Bing",
  async search(query: string): Promise<RawMention[]> {
    const params = new URLSearchParams({
      q: query,
      count: "20",
      responseFilter: "Webpages",
      freshness: "Week",
    });

    const url = `https://api.bing.microsoft.com/v7.0/search?${params}`;
    logger.info(`Bing searching: "${query}"`);

    try {
      const res = await fetch(url, {
        headers: { "Ocp-Apim-Subscription-Key": config.bingKey },
      });
      if (!res.ok) {
        logger.warn(`Bing returned ${res.status}`);
        return [];
      }

      const json = (await res.json()) as Record<string, unknown>;
      const webPages = json.webPages as Record<string, unknown> | undefined;
      const results = (webPages?.value as Array<Record<string, unknown>>) || [];

      return results.map((r) => ({
        platform: "search" as const,
        sourceName: "Bing",
        externalId: `bing-${hashId((r.url as string) || "")}`,
        title: (r.name as string) || "",
        content: (r.snippet as string) || "",
        url: (r.url as string) || "",
        author: undefined,
        publishedAt: r.dateLastCrawled ? new Date(r.dateLastCrawled as string) : undefined,
        raw: r,
      }));
    } catch (err) {
      logger.error("Bing search error:", err);
      return [];
    }
  },
};

// --- Google Custom Search Engine Provider ---
const googleCseProvider: SearchProvider = {
  name: "Google CSE",
  async search(query: string): Promise<RawMention[]> {
    const params = new URLSearchParams({
      key: config.googleCseKey,
      cx: config.googleCseCx,
      q: query,
      num: "10",
    });

    const url = `https://www.googleapis.com/customsearch/v1?${params}`;
    logger.info(`Google CSE searching: "${query}"`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
        logger.warn(`Google CSE returned ${res.status}: ${body.slice(0, 200)}`);
        return [];
      }

      const json = (await res.json()) as Record<string, unknown>;
      const items = (json.items as Array<Record<string, unknown>>) || [];

      return items.map((item) => {
        const link = (item.link as string) || "";
        // Try to extract a date from pagemap metatags
        const pagemap = item.pagemap as Record<string, unknown> | undefined;
        const metatags = (pagemap?.metatags as Array<Record<string, unknown>>)?.[0];
        const dateStr =
          (metatags?.["article:published_time"] as string) ||
          (metatags?.["og:updated_time"] as string) ||
          (item.snippet as string | undefined)?.match(/\b\d{4}\b/)?.[0] || "";

        return {
          platform: "search" as const,
          sourceName: "Google CSE",
          externalId: `gcs-${hashId(link)}`,
          title: (item.title as string) || "",
          content: (item.snippet as string) || "",
          url: link,
          author: undefined,
          publishedAt: dateStr ? new Date(dateStr) : undefined,
          raw: item,
        };
      });
    } catch (err) {
      logger.error("Google CSE error:", err);
      return [];
    }
  },
};

function getActiveProvider(): SearchProvider | null {
  if (config.serpApiKey) return serpApiProvider;
  if (config.bingKey) return bingProvider;
  if (config.googleCseKey && config.googleCseCx) return googleCseProvider;
  return null;
}

export async function collectAllSearch(): Promise<RawMention[]> {
  const provider = getActiveProvider();
  if (!provider) {
    logger.info("Web search disabled: no SERPAPI_KEY or BING_KEY configured");
    return [];
  }

  const sources = await prisma.source.findMany({
    where: { enabled: true, type: "search_query" },
  });

  const allMentions: RawMention[] = [];

  let totalSkippedOld = 0;

  let totalSkippedTiktok = 0;

  for (const source of sources) {
    try {
      const results = await provider.search(source.value);
      for (const r of results) {
        // Skip TikTok non-video pages (discover, tag, search) — only keep /@user/video/id URLs
        if (r.url.includes("tiktok.com") && !r.url.match(/tiktok\.com\/@[^/]+\/video\/\d+/)) {
          totalSkippedTiktok++;
          continue;
        }
        // Allow items with missing dates (use fetchedAt fallback); filter only if date exists and is too old
        if (r.publishedAt && isTooOld(r.publishedAt, config.maxHistoryDays)) {
          totalSkippedOld++;
          continue;
        }
        allMentions.push(r);
      }
      // Be polite between requests
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      logger.error(`Search error for query "${source.value}":`, err);
    }
  }

  if (totalSkippedOld > 0) logger.info(`Search: skipped ${totalSkippedOld} items older than ${config.maxHistoryDays} days`);
  if (totalSkippedTiktok > 0) logger.info(`Search: skipped ${totalSkippedTiktok} TikTok non-video pages (discover/tag/search)`);
  logger.info(`Search collector (${provider.name}) found ${allMentions.length} raw items (after recency filter)`);
  return allMentions;
}
