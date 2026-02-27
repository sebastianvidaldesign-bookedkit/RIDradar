import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { isTooOld } from "../lib/recency";
import { config } from "../config";
import type { RawMention } from "shared";

const USER_AGENT = "BookedKitRadar/1.0 (lead-discovery; contact@bookedkit.com)";
const BASE_DELAY = 2000;

async function fetchJson(url: string, retries = 3): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (res.status === 429) {
        const wait = BASE_DELAY * Math.pow(2, attempt);
        logger.warn(`Reddit 429 rate limited, waiting ${wait}ms (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        logger.warn(`Reddit HTTP ${res.status} for ${url}`);
        return null;
      }

      return (await res.json()) as Record<string, unknown>;
    } catch (err) {
      logger.error(`Reddit fetch error for ${url}:`, err);
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
      }
    }
  }
  return null;
}

function parsePost(child: Record<string, unknown>, sourceName: string): RawMention | null {
  const data = child.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const id = data.name as string; // e.g. t3_abc123
  const title = (data.title as string) || "";
  const selftext = (data.selftext as string) || "";
  const permalink = data.permalink as string;
  const author = data.author as string;
  const createdUtc = data.created_utc as number;

  return {
    platform: "reddit",
    sourceName,
    externalId: id,
    title,
    content: selftext,
    url: `https://www.reddit.com${permalink}`,
    author: author === "[deleted]" ? undefined : author,
    publishedAt: createdUtc ? new Date(createdUtc * 1000) : undefined,
    raw: data as Record<string, unknown>,
  };
}

function parseComment(child: Record<string, unknown>, sourceName: string): RawMention | null {
  const data = child.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const id = data.name as string; // e.g. t1_abc123
  const body = (data.body as string) || "";
  const linkTitle = (data.link_title as string) || "";
  const permalink = data.permalink as string;
  const author = data.author as string;
  const createdUtc = data.created_utc as number;
  const subreddit = data.subreddit as string;

  return {
    platform: "reddit",
    sourceName: `${sourceName} (comment in r/${subreddit})`,
    externalId: id,
    title: linkTitle,
    content: body,
    url: `https://www.reddit.com${permalink}`,
    author: author === "[deleted]" ? undefined : author,
    publishedAt: createdUtc ? new Date(createdUtc * 1000) : undefined,
    raw: data as Record<string, unknown>,
  };
}

export async function collectSubredditPosts(subreddit: string): Promise<RawMention[]> {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=50`;
  logger.info(`Fetching r/${subreddit} new posts`);

  const json = await fetchJson(url);
  if (!json) return [];

  const listing = json.data as Record<string, unknown> | undefined;
  if (!listing) return [];

  const children = (listing.children as Record<string, unknown>[]) || [];
  const mentions: RawMention[] = [];
  let skippedOld = 0;

  for (const child of children) {
    const mention = parsePost(child, `r/${subreddit}`);
    if (!mention) continue;
    if (isTooOld(mention.publishedAt, config.maxHistoryDays)) {
      skippedOld++;
      continue;
    }
    mentions.push(mention);
  }

  if (skippedOld > 0) logger.info(`r/${subreddit}: skipped ${skippedOld} items older than ${config.maxHistoryDays} days`);

  // Polite delay between requests
  await new Promise((r) => setTimeout(r, 1000));
  return mentions;
}

export async function collectSearchPosts(query: string): Promise<RawMention[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://www.reddit.com/search.json?q=${encoded}&sort=new&t=year&limit=50`;
  logger.info(`Searching Reddit posts: "${query}"`);

  const json = await fetchJson(url);
  if (!json) return [];

  const listing = json.data as Record<string, unknown> | undefined;
  if (!listing) return [];

  const children = (listing.children as Record<string, unknown>[]) || [];
  const mentions: RawMention[] = [];
  let skippedOld = 0;

  for (const child of children) {
    const mention = parsePost(child, `search:"${query}"`);
    if (!mention) continue;
    if (isTooOld(mention.publishedAt, config.maxHistoryDays)) {
      skippedOld++;
      continue;
    }
    mentions.push(mention);
  }

  if (skippedOld > 0) logger.info(`search:"${query}" posts: skipped ${skippedOld} items older than ${config.maxHistoryDays} days`);

  await new Promise((r) => setTimeout(r, 1000));
  return mentions;
}

export async function collectSearchComments(query: string): Promise<RawMention[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://www.reddit.com/search.json?q=${encoded}&sort=new&t=year&type=comment&limit=50`;
  logger.info(`Searching Reddit comments: "${query}"`);

  const json = await fetchJson(url);
  if (!json) return [];

  const listing = json.data as Record<string, unknown> | undefined;
  if (!listing) return [];

  const children = (listing.children as Record<string, unknown>[]) || [];
  const mentions: RawMention[] = [];
  let skippedOld = 0;

  for (const child of children) {
    const mention = parseComment(child, `search:"${query}"`);
    if (!mention) continue;
    if (isTooOld(mention.publishedAt, config.maxHistoryDays)) {
      skippedOld++;
      continue;
    }
    mentions.push(mention);
  }

  if (skippedOld > 0) logger.info(`search:"${query}" comments: skipped ${skippedOld} items older than ${config.maxHistoryDays} days`);

  await new Promise((r) => setTimeout(r, 1000));
  return mentions;
}

export async function collectAllReddit(): Promise<RawMention[]> {
  const sources = await prisma.source.findMany({
    where: { enabled: true, type: { in: ["subreddit", "reddit_query"] } },
  });

  const allMentions: RawMention[] = [];

  for (const source of sources) {
    try {
      if (source.type === "subreddit") {
        const posts = await collectSubredditPosts(source.value);
        allMentions.push(...posts);
      } else if (source.type === "reddit_query") {
        const posts = await collectSearchPosts(source.value);
        allMentions.push(...posts);
        const comments = await collectSearchComments(source.value);
        allMentions.push(...comments);
      }
    } catch (err) {
      logger.error(`Error collecting from ${source.type}:${source.value}:`, err);
    }
  }

  logger.info(`Reddit collector found ${allMentions.length} raw items`);
  return allMentions;
}
