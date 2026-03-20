import cron from "node-cron";
import { config } from "../config";
import { logger } from "../lib/logger";
import { runRedditCollect, runRssCollect, runSearchCollect, runXCollect, runApifyCollect } from "./collect";
import { runDigest } from "./digest";
import { runReclassify } from "./reclassify";
import type { JobsStatusMap } from "shared";

// In-memory job status tracking
export const jobStatus: JobsStatusMap = {
  reddit: { running: false, lastRun: null, lastError: null, itemsFound: 0 },
  rss: { running: false, lastRun: null, lastError: null, itemsFound: 0 },
  search: { running: false, lastRun: null, lastError: null, itemsFound: 0 },
  x: { running: false, lastRun: null, lastError: null, itemsFound: 0 },
  digest: { running: false, lastRun: null, lastError: null, itemsFound: 0 },
  apify: { running: false, lastRun: null, lastError: null, itemsFound: 0 },
  reclassify: { running: false, lastRun: null, lastError: null, itemsFound: 0 },
};

async function safeRun(
  jobName: keyof JobsStatusMap,
  fn: () => Promise<number>
): Promise<number> {
  if (jobStatus[jobName].running) {
    logger.warn(`${jobName} job already running, skipping`);
    return 0;
  }

  jobStatus[jobName].running = true;
  try {
    const count = await fn();
    jobStatus[jobName].lastRun = new Date().toISOString();
    jobStatus[jobName].lastError = null;
    jobStatus[jobName].itemsFound = count;
    return count;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    jobStatus[jobName].lastError = errMsg;
    logger.error(`${jobName} job failed:`, err);
    return 0;
  } finally {
    jobStatus[jobName].running = false;
  }
}

export function triggerJob(jobName: string): void {
  switch (jobName) {
    case "reddit":
      safeRun("reddit", runRedditCollect);
      break;
    case "rss":
      safeRun("rss", runRssCollect);
      break;
    case "search":
      safeRun("search", runSearchCollect);
      break;
    case "x":
      safeRun("x", runXCollect);
      break;
    case "digest":
      safeRun("digest", runDigest);
      break;
    case "apify":
      safeRun("apify", runApifyCollect);
      break;
    case "reclassify":
      safeRun("reclassify", runReclassify);
      break;
    case "all":
      safeRun("reddit", runRedditCollect);
      safeRun("rss", runRssCollect);
      safeRun("search", runSearchCollect);
      safeRun("x", runXCollect);
      break;
    default:
      logger.warn(`Unknown job: ${jobName}`);
  }
}

export function startScheduler(): void {
  if (process.env.DISABLE_SCHEDULER === "true") {
    logger.info("Scheduler disabled (DISABLE_SCHEDULER=true) — use manual Run buttons");
    return;
  }

  // Reddit + RSS: configurable interval (default every 60 min)
  const redditCron = `*/${config.redditIntervalMinutes} * * * *`;
  cron.schedule(redditCron, () => {
    logger.info("Cron: Reddit collection triggered");
    safeRun("reddit", runRedditCollect);
  });

  const rssCron = `*/${config.rssIntervalMinutes} * * * *`;
  cron.schedule(rssCron, () => {
    logger.info("Cron: RSS collection triggered");
    safeRun("rss", runRssCollect);
  });

  // Web search: every N hours
  const searchCron = `0 */${config.searchIntervalHours} * * *`;
  cron.schedule(searchCron, () => {
    logger.info("Cron: Web search collection triggered");
    safeRun("search", runSearchCollect);
  });

  // X (Twitter): same interval as web search
  cron.schedule(searchCron, () => {
    logger.info("Cron: X collection triggered");
    safeRun("x", runXCollect);
  });

  // Daily Apify collection at 07:00 ET — Instagram + TikTok hashtag scrape
  cron.schedule(
    "0 7 * * *",
    () => {
      logger.info("Cron: Daily Apify collection triggered (07:00 ET)");
      safeRun("apify", runApifyCollect);
    },
    { timezone: "America/New_York" }
  );

  // Daily digest — disabled until email is configured
  // cron.schedule(
  //   "0 8 * * *",
  //   () => {
  //     logger.info(`Cron: Daily digest triggered (timezone: ${config.digestTimezone})`);
  //     safeRun("digest", runDigest);
  //   },
  //   { timezone: config.digestTimezone }
  // );

  logger.info(`Scheduler started:`);
  logger.info(`  Reddit + RSS: every ${config.redditIntervalMinutes} min`);
  logger.info(`  Web search: every ${config.searchIntervalHours} hours`);
  logger.info(`  X (Twitter): every ${config.searchIntervalHours} hours`);
  logger.info(`  Apify (Instagram + TikTok): daily at 07:00 ET`);
  logger.info(`  Daily digest: disabled`);
}
