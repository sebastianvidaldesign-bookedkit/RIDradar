import { runDigest } from "../jobs/digest";
import { logger } from "../lib/logger";

async function main() {
  logger.info("CLI: Running daily digest...");
  try {
    const count = await runDigest();
    logger.info(`CLI: Digest complete, ${count} mentions included`);
    process.exit(0);
  } catch (err) {
    logger.error("CLI: Digest failed:", err);
    process.exit(1);
  }
}

main();
