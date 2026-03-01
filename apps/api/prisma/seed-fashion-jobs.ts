import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── RSS FEEDS ────────────────────────────────────────────────────────────────
const RSS_FEEDS: { url: string; name: string }[] = [
  { url: "https://fashionunited.com/rss/jobs", name: "FashionUnited Jobs" },
  { url: "https://www.businessoffashion.com/rss/", name: "Business of Fashion" },
  { url: "https://fashionista.com/.rss/excerpt/", name: "Fashionista" },
  { url: "https://wwd.com/feed/", name: "WWD" },
];

// ─── SEARCH QUERIES ───────────────────────────────────────────────────────────
const SEARCH_QUERIES = [
  '"fashion design director" job -site:linkedin.com',
  '"handbag design director" OR "leather goods director" job -site:linkedin.com',
  '"creative director handbags" OR "creative director leather goods" job -site:linkedin.com',
  '"VP of leather goods" OR "VP leathergoods" OR "VP of handbags" job -site:linkedin.com',
  '"senior handbag designer" OR "senior leather goods designer" job -site:linkedin.com',
  '"leather goods designer" OR "leathergoods designer" job NYC -site:linkedin.com',
  '"fashion stylist" director position -site:linkedin.com',
  '"creative director" fashion luxury job -site:linkedin.com',
  '"fashion design director" NYC job -site:linkedin.com',
  'site:fashionunited.com "design director" OR "creative director" OR "leather goods"',
  'site:wwd.com "design director" OR "leather goods" job 2025',
];

// ─── REDDIT SUBREDDITS ────────────────────────────────────────────────────────
const SUBREDDITS = [
  "fashiondesign",
  "fashion",
];

// ─── REDDIT QUERIES ───────────────────────────────────────────────────────────
const REDDIT_QUERIES = [
  '"design director" fashion job hiring',
  '"fashion stylist" job NYC',
  '"handbag designer" OR "leather goods designer" position',
  '"creative director" leather goods OR handbags job',
  '"VP" leather goods OR handbags fashion hiring',
];

// ─── X / TWITTER QUERIES ──────────────────────────────────────────────────────
const X_QUERIES = [
  '"design director" fashion hiring -is:retweet lang:en',
  '"creative director" fashion job opening -is:retweet lang:en',
  '"handbag designer" OR "leather goods designer" job -is:retweet lang:en',
  '"creative director handbags" OR "creative director leather goods" -is:retweet lang:en',
  '"VP of leather goods" OR "VP leathergoods" OR "VP handbags" hiring -is:retweet lang:en',
  '"senior leather goods designer" OR "senior handbag designer" job -is:retweet lang:en',
  '"fashion stylist" job NYC hiring -is:retweet lang:en',
  '"fashion executive" OR "chief creative officer" fashion hiring -is:retweet lang:en',
];

async function main() {
  console.log("Seeding Fashion Job Radar database...");

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
        pack: "jobs",
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
        pack: "jobs",
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
        pack: "jobs",
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
