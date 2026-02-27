import { config } from "../config";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { draftHeuristic } from "./heuristic";
import { draftLlm } from "./llm";
import type { Mention } from "@prisma/client";

export async function generateDrafts(mention: Mention): Promise<void> {
  // Don't regenerate if drafts already exist
  const existing = await prisma.replyDraft.count({ where: { mentionId: mention.id } });
  if (existing > 0) {
    logger.debug(`Drafts already exist for mention ${mention.id}, skipping`);
    return;
  }

  let drafts: { concise: string; detailed: string; question_first: string };

  if (config.llmEnabled) {
    try {
      drafts = await draftLlm(mention);
      logger.debug(`LLM drafted replies for "${mention.title.slice(0, 40)}"`);
    } catch (err) {
      logger.warn("LLM drafting failed, falling back to heuristic:", err);
      drafts = draftHeuristic(mention);
    }
  } else {
    drafts = draftHeuristic(mention);
  }

  await prisma.replyDraft.createMany({
    data: [
      { mentionId: mention.id, variant: "concise", text: drafts.concise },
      { mentionId: mention.id, variant: "detailed", text: drafts.detailed },
      { mentionId: mention.id, variant: "question_first", text: drafts.question_first },
    ],
  });
}
