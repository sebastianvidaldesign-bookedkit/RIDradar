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

async function main() {
  console.log("Seeding RID Radar database...");

  // Build the full set of active terms
  const activePairs = new Set<string>();
  for (const pack of QUERY_PACKS) {
    for (const term of pack.terms) {
      activePairs.add(term);
    }
  }

  // Upsert active sources
  let sourceCount = 0;
  for (const pack of QUERY_PACKS) {
    for (const term of pack.terms) {
      await prisma.source.upsert({
        where: { type_value: { type: "search_query", value: term } },
        update: { pack: pack.id, enabled: true },
        create: {
          type: "search_query",
          value: term,
          name: `[${pack.id}] ${term}`,
          pack: pack.id,
          enabled: true,
        },
      });
      sourceCount++;
    }
  }

  // Disable any search_query sources no longer in an active pack
  const allSearchSources = await prisma.source.findMany({
    where: { type: "search_query" },
    select: { id: true, value: true },
  });
  let disabledCount = 0;
  for (const src of allSearchSources) {
    if (!activePairs.has(src.value)) {
      await prisma.source.update({
        where: { id: src.id },
        data: { enabled: false },
      });
      disabledCount++;
    }
  }

  // --- Default settings ---
  const settings: { key: string; value: string }[] = [
    { key: "score_threshold", value: "55" },
    { key: "min_store_score", value: "35" },
    { key: "max_history_days", value: "183" },
    { key: "reddit_interval_minutes", value: "60" },
    { key: "rss_interval_minutes", value: "60" },
    { key: "search_interval_hours", value: "6" },
    // RID-specific brand data stored as Settings so API can read without importing brand.ts
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
  console.log(`  ${sourceCount} active search_query sources (across ${QUERY_PACKS.length} packs)`);
  console.log(`  ${disabledCount} stale sources disabled`);
  console.log(`  ${QUERY_PACKS.map((p) => `${p.id}(${p.terms.length})`).join(", ")}`);
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
