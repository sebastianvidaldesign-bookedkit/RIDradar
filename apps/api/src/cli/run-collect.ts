import { runAllCollect } from "../jobs/collect";
import { logger } from "../lib/logger";

async function main() {
  logger.info("CLI: Running all collectors...");
  try {
    const results = await runAllCollect();
    logger.info("CLI: Collection complete", results);
    process.exit(0);
  } catch (err) {
    logger.error("CLI: Collection failed:", err);
    process.exit(1);
  }
}

main();
