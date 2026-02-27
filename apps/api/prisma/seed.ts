import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Subreddits ---
  const subreddits = [
    { value: "WeAreTheMusicMakers", name: "r/WeAreTheMusicMakers" },
    { value: "musicmarketing", name: "r/musicmarketing" },
    { value: "DJs", name: "r/DJs" },
    { value: "musicproduction", name: "r/musicproduction" },
    { value: "Beatmatch", name: "r/Beatmatch" },
    { value: "independentmusic", name: "r/independentmusic" },
    { value: "bandmembers", name: "r/bandmembers" },
    { value: "singing", name: "r/singing" },
    { value: "makinghiphop", name: "r/makinghiphop" },
    { value: "edmproduction", name: "r/edmproduction" },
    { value: "musicbusiness", name: "r/musicbusiness" },
    { value: "artistlounge", name: "r/artistlounge" },
    { value: "hiphopheads", name: "r/hiphopheads" },
    { value: "indieheads", name: "r/indieheads" },
    { value: "spotify", name: "r/spotify" },
    { value: "bandcamp", name: "r/bandcamp" },
    { value: "marketing", name: "r/marketing" },
    { value: "EntrepreneurRideAlong", name: "r/EntrepreneurRideAlong" },
    { value: "ableton", name: "r/ableton" },
    { value: "FL_Studio", name: "r/FL_Studio" },
    { value: "Logic_Studio", name: "r/Logic_Studio" },
    { value: "audioengineering", name: "r/audioengineering" },
    { value: "reggaeton", name: "r/reggaeton" },
    { value: "LatinMusic", name: "r/LatinMusic" },
  ];

  for (const sub of subreddits) {
    await prisma.source.upsert({
      where: { type_value: { type: "subreddit", value: sub.value } },
      update: {},
      create: { type: "subreddit", value: sub.value, name: sub.name, enabled: true },
    });
  }

  // --- Reddit search queries ---
  const redditQueries = [
    { value: "epk", name: "EPK" },
    { value: '"electronic press kit"', name: "Electronic Press Kit" },
    { value: '"press kit" booking', name: "Press kit + booking" },
    { value: '"music press kit"', name: "Music press kit" },
    { value: '"artist press kit"', name: "Artist press kit" },
    { value: '"how do I make" epk', name: "How to make EPK" },
    { value: '"need an epk"', name: "Need an EPK" },
    { value: '"venue asked" "press kit"', name: "Venue asked for press kit" },
    { value: 'booking "press kit"', name: "Booking + press kit" },
    { value: '"how to get booked" musician', name: "How to get booked" },
    { value: '"booking agent" musician tips', name: "Booking agent tips" },
    { value: '"press kit" template music', name: "Press kit template" },
    { value: '"one sheet" musician booking', name: "One-sheet for booking" },
    { value: '"promoter wants" press kit', name: "Promoter wants press kit" },
    { value: '"send your epk"', name: "Send your EPK" },
    { value: '"looking for artists" booking', name: "Looking for artists" },
    { value: '"music bio" booking', name: "Music bio for booking" },
    { value: '"dj press kit"', name: "DJ press kit" },
    { value: '"band press kit" help', name: "Band press kit help" },
    { value: '"submit to venues" musician', name: "Submit to venues" },
    { value: '"how to approach venues"', name: "How to approach venues" },
    { value: '"epk website" musician', name: "EPK website" },
    // Broader English intent
    { value: '"create an epk" OR "build an epk"', name: "Create/build an EPK" },
    { value: '"epk tips" musician', name: "EPK tips" },
    { value: '"what to include" epk', name: "What to include in EPK" },
    { value: '"epk for booking"', name: "EPK for booking" },
    { value: '"get more gigs" press kit', name: "Get more gigs" },
    // Spanish / LATAM / Argentine
    { value: '"kit de prensa" música', name: "Kit de prensa (ES)" },
    { value: '"kit de prensa electrónico"', name: "Kit de prensa electrónico (ES)" },
    { value: '"dossier artístico"', name: "Dossier artístico (ES)" },
    { value: '"carpeta de prensa" artista', name: "Carpeta de prensa (ES-AR)" },
    { value: '"cómo hacer un epk"', name: "Cómo hacer un EPK (ES)" },
    { value: '"cómo armar un press kit"', name: "Cómo armar press kit (ES-AR)" },
    { value: '"necesito un epk"', name: "Necesito un EPK (ES)" },
    { value: '"press kit" banda', name: "Press kit + banda (ES)" },
    { value: '"conseguir shows" músico', name: "Conseguir shows (ES)" },
    { value: '"material de prensa" músico', name: "Material de prensa (ES)" },
    { value: 'epk artista independiente', name: "EPK artista independiente (ES)" },
    { value: '"conseguir fechas" músico', name: "Conseguir fechas (ES-AR)" },
    { value: '"armar un epk"', name: "Armar un EPK (ES-AR)" },
    { value: '"hacer un epk"', name: "Hacer un EPK (ES)" },
  ];

  for (const q of redditQueries) {
    await prisma.source.upsert({
      where: { type_value: { type: "reddit_query", value: q.value } },
      update: {},
      create: { type: "reddit_query", value: q.value, name: q.name, enabled: true },
    });
  }

  // --- RSS feeds ---
  const rssFeeds = [
    {
      value: "https://www.musicradar.com/feeds/all",
      name: "MusicRadar",
      enabled: false,
    },
    {
      value: "https://www.digitalmusicnews.com/feed/",
      name: "Digital Music News",
      enabled: true,
    },
    {
      value: "https://djtechtools.com/feed/",
      name: "DJ TechTools",
      enabled: true,
    },
    {
      value: "https://www.hypebot.com/latest/rss/",
      name: "Hypebot",
      enabled: true,
    },
  ];

  for (const feed of rssFeeds) {
    await prisma.source.upsert({
      where: { type_value: { type: "rss_feed", value: feed.value } },
      update: { enabled: feed.enabled },
      create: { type: "rss_feed", value: feed.value, name: feed.name, enabled: feed.enabled },
    });
  }

  // --- Web search queries ---
  const searchQueries = [
    { value: '"electronic press kit" site:reddit.com OR site:gearspace.com', name: "EPK on forums" },
    { value: '"music press kit" how to create', name: "How to create music press kit" },
    { value: '"epk" musician booking', name: "EPK musician booking" },
    { value: '"artist press kit" template help', name: "Artist press kit help" },
    { value: '"press kit" DJ promoter', name: "Press kit DJ promoter" },
    // Spanish / LATAM
    { value: '"kit de prensa electrónico" músico', name: "Kit de prensa electrónico (ES)" },
    { value: '"cómo armar un epk" artista', name: "Cómo armar EPK (ES)" },
    { value: '"press kit" músico independiente', name: "Press kit independiente (ES)" },
    // TikTok via Google (EN)
    { value: 'site:tiktok.com "press kit" musician', name: "TikTok: press kit musician" },
    { value: 'site:tiktok.com "epk" music', name: "TikTok: EPK music" },
    { value: 'site:tiktok.com "electronic press kit"', name: "TikTok: electronic press kit" },
    { value: 'site:tiktok.com "how to get booked" musician', name: "TikTok: how to get booked" },
    { value: 'site:tiktok.com "booking" artist "press kit"', name: "TikTok: booking + press kit" },
    // TikTok via Google (ES)
    { value: 'site:tiktok.com "kit de prensa" música', name: "TikTok: kit de prensa (ES)" },
    { value: 'site:tiktok.com "epk" músico', name: "TikTok: EPK músico (ES)" },
    { value: 'site:tiktok.com "dossier artístico"', name: "TikTok: dossier artístico (ES)" },
  ];

  for (const q of searchQueries) {
    await prisma.source.upsert({
      where: { type_value: { type: "search_query", value: q.value } },
      update: {},
      create: { type: "search_query", value: q.value, name: q.name, enabled: true },
    });
  }

  // --- X (Twitter) search queries ---
  const xQueries = [
    { value: '"electronic press kit"', name: "EPK" },
    { value: '"press kit" musician', name: "Press kit musician" },
    { value: '"need an epk"', name: "Need an EPK" },
    { value: '"epk" booking', name: "EPK booking" },
    { value: '"artist press kit"', name: "Artist press kit" },
    // Spanish / LATAM
    { value: '"kit de prensa" música', name: "Kit de prensa (ES)" },
    { value: '"cómo hacer" epk', name: "Cómo hacer EPK (ES)" },
    { value: '"press kit" artista independiente', name: "Press kit independiente (ES)" },
    { value: 'epk músico', name: "EPK músico (ES)" },
    { value: '"dossier artístico"', name: "Dossier artístico (ES)" },
    { value: '"necesito un epk"', name: "Necesito un EPK (ES)" },
    { value: '"armar un epk"', name: "Armar un EPK (ES-AR)" },
  ];

  for (const q of xQueries) {
    await prisma.source.upsert({
      where: { type_value: { type: "x_query", value: q.value } },
      update: {},
      create: { type: "x_query", value: q.value, name: q.name, enabled: true },
    });
  }

  // --- Default settings ---
  const settings = [
    { key: "score_threshold", value: "70" },
    { key: "min_store_score", value: "40" },
    { key: "max_history_days", value: "183" },
    { key: "reddit_interval_minutes", value: "60" },
    { key: "rss_interval_minutes", value: "60" },
    { key: "search_interval_hours", value: "6" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log("Seed complete!");
  console.log(`  ${subreddits.length} subreddits`);
  console.log(`  ${redditQueries.length} Reddit search queries`);
  console.log(`  ${rssFeeds.length} RSS feeds (${rssFeeds.filter(f => f.enabled).length} enabled)`);
  console.log(`  ${searchQueries.length} web search queries`);
  console.log(`  ${xQueries.length} X (Twitter) queries`);
  console.log(`  ${settings.length} default settings`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
