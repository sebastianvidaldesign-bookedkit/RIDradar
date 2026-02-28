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
// No API key needed. Fetches /new.json (last 50 posts) per subreddit.
// These communities surface real purchase intent: "where can I find X", recommendations, outfit help.
const SUBREDDITS = [
  "malefashionadvice",     // largest men's fashion advice community, tons of "looking for X" posts
  "streetwear",            // streetwear community, dark/avant-garde aesthetic is core
  "avantgardefashion",     // directly aligned — avant-garde and editorial fashion
  "femalefashionadvice",   // women looking for brand recommendations
  "findfashion",           // people asking "where can I find this look?"
  "fashionadvice",         // general fashion advice seekers
  "NYCfashion",            // NYC fashion community, geo-aligned
  "alternativefashion",    // alternative aesthetic buyers
];

// ─── REDDIT SEARCH QUERIES ────────────────────────────────────────────────────
// Searches Reddit posts + comments for specific buyer conversations.
// Finds threads like "I'm tired of Gucci, what's next?" or "recommend dark luxury brand"
const REDDIT_QUERIES = [
  "romance is dead fashion",
  "dark luxury fashion brand",
  "alternative to rick owens",
  "avant garde clothing brand recommend",
  "dark aesthetic fashion brand",
  "punk luxury fashion brand",
  "unique luxury brand NYC",
  "underground fashion brand NYC",
  "non mainstream designer menswear",
  "maison margiela alternative brand",
];

// ─── GOOGLE CSE WEB QUERIES ───────────────────────────────────────────────────
// 100 free queries/day. Scoped to reddit.com for forum conversations.
// These supplement Reddit's own search with Google's better relevance ranking.
const SEARCH_QUERIES = [
  "site:reddit.com dark luxury fashion brand recommend",
  "site:reddit.com alternative rick owens menswear",
  "site:reddit.com avant garde clothing brand buy",
  "site:reddit.com romance is dead nyc",
  "site:reddit.com dark aesthetic clothing brand",
  "site:reddit.com punk luxury fashion",
  "site:reddit.com non traditional black tie outfit brand",
  "site:reddit.com tired of gucci what brand",
  "site:reddit.com anti logo luxury fashion",
  "site:reddit.com dark menswear brand recommendation",
  "romance is dead nyc fashion brand review",
  "dark luxury menswear brand independent NYC",
  "avant garde fashion brand underground NYC",
  "punk couture NYC brand 2025 2026",
  "best dark aesthetic clothing brand",
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

  // Disable all other sources (the old 90 search_query single-term sources)
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
    { key: "min_store_score", value: "30" },     // lower threshold — Reddit content is noisier but richer
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
  console.log(`  ${searchQueryCount} search_query (Google CSE) sources`);
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
