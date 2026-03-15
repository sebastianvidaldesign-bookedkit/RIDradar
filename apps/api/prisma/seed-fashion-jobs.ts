import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── RSS FEEDS ────────────────────────────────────────────────────────────────
const RSS_FEEDS: { url: string; name: string }[] = [];

// ─── SEARCH QUERIES ───────────────────────────────────────────────────────────
const SEARCH_QUERIES = [
  // Instagram (10 queries)
  '"what to wear" "wedding" site:instagram.com',
  '"going to a wedding" "outfit" site:instagram.com',
  '"attending a gala" site:instagram.com',
  '"gala outfit" "need" site:instagram.com',
  '"fashion show" "invited" site:instagram.com',
  '"fashion week" "going to" site:instagram.com',
  '"movie premiere" "what to wear" site:instagram.com',
  '"red carpet" "outfit" "going to" site:instagram.com',
  '"award show" "need dress" site:instagram.com',
  '"wedding guest" "what to wear" site:instagram.com',
  // Threads (5 queries)
  '"going to a wedding" "what to wear" site:threads.net',
  '"gala" "outfit" "need" site:threads.net',
  '"fashion show" "attending" site:threads.net',
  '"premiere" "outfit" "going to" site:threads.net',
  '"wedding guest" "outfit ideas" site:threads.net',
  // TikTok (5 queries)
  '"wedding guest outfit" site:tiktok.com',
  '"what to wear to a gala" site:tiktok.com',
  '"fashion show outfit" site:tiktok.com',
  '"movie premiere outfit" site:tiktok.com',
  '"what to wear to award show" site:tiktok.com',
];

// ─── REDDIT SUBREDDITS ────────────────────────────────────────────────────────
const SUBREDDITS: string[] = [];

// ─── REDDIT QUERIES ───────────────────────────────────────────────────────────
const REDDIT_QUERIES: string[] = [];

// ─── X / TWITTER QUERIES ──────────────────────────────────────────────────────
const X_QUERIES: string[] = [];

async function main() {
  console.log("Seeding Event Fashion Radar database...");

  // ─── Truncate existing data (FK order: Mention/ReplyDraft before Source) ───
  console.log("Truncating existing data...");
  await prisma.replyDraft.deleteMany();
  await prisma.mention.deleteMany();
  await prisma.source.deleteMany();
  console.log("  All Mention, ReplyDraft, and Source rows deleted.");

  // ─── Seed sources ─────────────────────────────────────────────────────────
  let rssFeedCount = 0;
  for (const feed of RSS_FEEDS) {
    await prisma.source.create({
      data: {
        type: "rss_feed",
        value: feed.url,
        name: feed.name,
        pack: "editorial",
        enabled: true,
      },
    });
    rssFeedCount++;
  }

  let searchQueryCount = 0;
  for (const query of SEARCH_QUERIES) {
    await prisma.source.create({
      data: {
        type: "search_query",
        value: query,
        name: `web:"${query}"`,
        pack: "events",
        enabled: true,
      },
    });
    searchQueryCount++;
  }

  let subredditCount = 0;
  for (const sub of SUBREDDITS) {
    await prisma.source.create({
      data: {
        type: "subreddit",
        value: sub,
        name: `r/${sub}`,
        pack: "community",
        enabled: true,
      },
    });
    subredditCount++;
  }

  let redditQueryCount = 0;
  for (const query of REDDIT_QUERIES) {
    await prisma.source.create({
      data: {
        type: "reddit_query",
        value: query,
        name: `reddit:"${query}"`,
        pack: "events",
        enabled: true,
      },
    });
    redditQueryCount++;
  }

  let xQueryCount = 0;
  for (const query of X_QUERIES) {
    await prisma.source.create({
      data: {
        type: "x_query",
        value: query,
        name: `x:"${query}"`,
        pack: "events",
        enabled: true,
      },
    });
    xQueryCount++;
  }

  const total = rssFeedCount + searchQueryCount + subredditCount + redditQueryCount + xQueryCount;

  console.log("Seed complete!");
  console.log(`  ${rssFeedCount} RSS feeds`);
  console.log(`  ${searchQueryCount} search queries`);
  console.log(`  ${subredditCount} subreddits`);
  console.log(`  ${redditQueryCount} Reddit queries`);
  console.log(`  ${xQueryCount} X/Twitter queries`);
  console.log(`  Total: ${total} sources`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
