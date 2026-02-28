import { PrismaClient } from "@prisma/client";
import {
  QUERY_PACKS,
  NEGATIVE_KEYWORDS,
  SPAM_PATTERNS,
  BUYER_INTENT_TERMS,
  NYC_BOOST_TERMS,
  NYC_SCORE_BOOST,
  CLASSIFICATION_THRESHOLDS,
} from "shared";

const prisma = new PrismaClient();

// ─── REDDIT SUBREDDITS ────────────────────────────────────────────────────────
// High-signal subs only: people transacting in dark/avant-garde fashion
const SUBREDDITS = [
  "avantgardefashion",  // directly aligned — avant-garde and editorial fashion
  "Grailed",            // people buying/selling Rick Owens, Maison Margiela, CDG
  "streetwear",         // dark/avant-garde aesthetic is core
];

// ─── REDDIT SEARCH QUERIES ────────────────────────────────────────────────────
const REDDIT_QUERIES = [
  "romance is dead fashion",
  "dark luxury fashion brand",
  "alternative to rick owens",
  "avant garde clothing brand recommend",
  "dark aesthetic fashion brand",
];

// ─── X / TWITTER QUERIES ──────────────────────────────────────────────────────
// Real-time buyer intent + NYC event discourse
const X_QUERIES = [
  "dark fashion brand recommend -is:retweet lang:en",
  '"looking for brand like rick owens" -is:retweet',
  '"romance is dead nyc" -is:retweet',
  '"alternative to maison margiela" -is:retweet',
  "avant garde fashion brand nyc -is:retweet lang:en",
  "dark aesthetic outfit nyc -is:retweet lang:en",
  "non mainstream luxury brand -is:retweet lang:en",
];

// ─── RSS FEEDS ────────────────────────────────────────────────────────────────
// Editorial publications covering dark fashion → press placement opportunities
const RSS_FEEDS: { url: string; name: string }[] = [
  { url: "https://www.highsnobiety.com/feed/", name: "Highsnobiety" },
  { url: "https://hypebeast.com/feed", name: "Hypebeast" },
  { url: "https://www.dazeddigital.com/rss", name: "Dazed Digital" },
  { url: "https://www.anothermag.com/rss", name: "AnOther Magazine" },
  { url: "https://032c.com/feed", name: "032c" },
  { url: "https://www.thecut.com/rss/feed.xml", name: "The Cut" },
];

// ─── GOOGLE CSE WEB QUERIES ───────────────────────────────────────────────────
// 100 free queries/day. Scoped to Grailed + Reddit for community signals,
// plus open-web queries and job opportunity searches.
const SEARCH_QUERIES = [
  // Brand / buyer intent — Grailed community
  "site:grailed.com rick owens avant garde",
  "site:grailed.com maison margiela dark fashion",
  "site:grailed.com comme des garcons alternative",
  // Brand / buyer intent — Reddit (Google-ranked best posts)
  "site:reddit.com dark luxury fashion brand recommend",
  "site:reddit.com alternative rick owens menswear",
  "site:reddit.com romance is dead nyc",
  "site:reddit.com dark aesthetic clothing brand",
  "site:reddit.com punk luxury fashion",
  // Open web — brand discovery
  "romance is dead nyc fashion brand review",
  "dark luxury menswear brand NYC independent 2025",
  "avant garde fashion brand NYC editorial",
  "dark romance menswear brand recommendation 2025",
  // Job opportunities
  "fashion stylist job NYC 2025",
  "handbag designer job NYC luxury brand",
  "luxury fashion brand director job NYC",
  "dark fashion brand creative director open position",
  "wardrobe stylist job NYC independent brand",
];

async function main() {
  console.log("Seeding RID Radar database...");

  // Track all active source values to disable orphaned ones
  const activeValues = new Set<string>();

  let subredditCount = 0;
  for (const sub of SUBREDDITS) {
    activeValues.add(sub);
    await prisma.source.upsert({
      where: { type_value: { type: "subreddit", value: sub } },
      update: { enabled: true, name: `r/${sub}` },
      create: {
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
    activeValues.add(query);
    await prisma.source.upsert({
      where: { type_value: { type: "reddit_query", value: query } },
      update: { enabled: true, name: `reddit:"${query}"` },
      create: {
        type: "reddit_query",
        value: query,
        name: `reddit:"${query}"`,
        pack: "intent",
        enabled: true,
      },
    });
    redditQueryCount++;
  }

  let xQueryCount = 0;
  for (const query of X_QUERIES) {
    activeValues.add(query);
    await prisma.source.upsert({
      where: { type_value: { type: "x_query", value: query } },
      update: { enabled: true, name: `x:"${query}"` },
      create: {
        type: "x_query",
        value: query,
        name: `x:"${query}"`,
        pack: "social",
        enabled: true,
      },
    });
    xQueryCount++;
  }

  let rssFeedCount = 0;
  for (const feed of RSS_FEEDS) {
    activeValues.add(feed.url);
    await prisma.source.upsert({
      where: { type_value: { type: "rss_feed", value: feed.url } },
      update: { enabled: true, name: feed.name },
      create: {
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
    activeValues.add(query);
    await prisma.source.upsert({
      where: { type_value: { type: "search_query", value: query } },
      update: { enabled: true, name: `web:"${query}"` },
      create: {
        type: "search_query",
        value: query,
        name: `web:"${query}"`,
        pack: "web",
        enabled: true,
      },
    });
    searchQueryCount++;
  }

  // Disable all other sources (old / stale entries)
  const allSources = await prisma.source.findMany({ select: { id: true, value: true, type: true } });
  let disabledCount = 0;
  for (const src of allSources) {
    if (!activeValues.has(src.value)) {
      await prisma.source.update({ where: { id: src.id }, data: { enabled: false } });
      disabledCount++;
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────────────
  const settings: { key: string; value: string }[] = [
    { key: "score_threshold", value: "55" },
    { key: "min_store_score", value: "30" },
    { key: "max_history_days", value: "183" },
    { key: "reddit_interval_minutes", value: "60" },
    { key: "rss_interval_minutes", value: "60" },
    { key: "search_interval_hours", value: "6" },
    { key: "negative_keywords", value: JSON.stringify(NEGATIVE_KEYWORDS) },
    { key: "spam_patterns", value: JSON.stringify(SPAM_PATTERNS) },
    { key: "buyer_intent_terms", value: JSON.stringify(BUYER_INTENT_TERMS) },
    { key: "nyc_boost_terms", value: JSON.stringify(NYC_BOOST_TERMS) },
    { key: "nyc_score_boost", value: String(NYC_SCORE_BOOST) },
    { key: "classification_thresholds", value: JSON.stringify(CLASSIFICATION_THRESHOLDS) },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log("Seed complete!");
  console.log(`  ${subredditCount} subreddits`);
  console.log(`  ${redditQueryCount} reddit_query sources`);
  console.log(`  ${xQueryCount} x_query sources`);
  console.log(`  ${rssFeedCount} rss_feed sources`);
  console.log(`  ${searchQueryCount} search_query (Google CSE) sources`);
  console.log(`  Total active: ${subredditCount + redditQueryCount + xQueryCount + rssFeedCount + searchQueryCount}`);
  console.log(`  ${disabledCount} stale sources disabled`);
  console.log(`  ${settings.length} settings`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
