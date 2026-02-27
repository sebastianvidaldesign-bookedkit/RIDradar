import { config } from "../config";
import { logger } from "../lib/logger";
import { classifyHeuristic } from "./heuristic";
import { classifyRidHeuristic } from "./rid-heuristic";
import { classifyLlm } from "./llm";
import type { Classification } from "shared";

export async function classify(
  title: string,
  content: string,
  sourceName: string
): Promise<Classification> {
  // Try LLM classifier first if configured
  if (config.llmEnabled) {
    try {
      const result = await classifyLlm(title, content, sourceName);
      logger.debug(`LLM classified "${title.slice(0, 50)}": score=${result.score}`);
      return result;
    } catch (err) {
      logger.warn("LLM classifier failed, falling back to heuristic:", err);
    }
  }

  // Route heuristic by brand
  if (config.radarBrand === "rid") {
    const result = classifyRidHeuristic(title, content);
    logger.debug(`RID heuristic classified "${title.slice(0, 50)}": score=${result.score}`);
    return result;
  }

  // Default: EPK/BookedKit heuristic
  const result = classifyHeuristic(title, content);
  logger.debug(`Heuristic classified "${title.slice(0, 50)}": score=${result.score}`);
  return result;
}
