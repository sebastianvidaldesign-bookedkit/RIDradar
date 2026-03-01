import { config } from "../config";
import { logger } from "../lib/logger";
import type { Classification } from "shared";
import { detectLanguage } from "../lib/language";

const SYSTEM_PROMPT = `You are a fashion industry job posting classifier.

Given a mention (title + content + source), output a JSON object with these exact fields:
{
  "relevant": boolean,       // true if this is a fashion job opportunity
  "intent": string,          // one of: "need_help", "recommendation_request", "comparison", "sharing_resource", "other"
  "audience": string,        // one of: "designer", "stylist", "creative_director", "executive", "unknown"
  "urgency": string,         // one of: "high", "medium", "low"
  "score": number,           // 0-100, how relevant this is as a fashion job opportunity
  "reason": string           // brief explanation (1 sentence)
}

Scoring rules:
- HIGH (70-100): actual job posting for design director, creative director, handbag/accessories designer, fashion stylist, VP/executive fashion role — especially at luxury brands (LVMH, Kering, Hermès, Chanel, Dior, Gucci, etc.) or NYC-based
- MEDIUM (40-69): job posting for related fashion roles (fashion editor, PR, brand manager, junior designer)
- LOW (0-39): not a job posting, general fashion news, trend articles, or irrelevant content

REJECT (score 0, relevant false): spam, MLM, "make money" content, unpaid internships, dropshipping schemes.

Output ONLY valid JSON, no other text.`;

export async function classifyLlm(title: string, content: string, source: string): Promise<Classification> {
  const userMessage = `Source: ${source}\nTitle: ${title}\nContent: ${content.slice(0, 2000)}`;

  const response = await fetch(`${config.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llmApiKey}`,
    },
    body: JSON.stringify({
      model: config.llmModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = json.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty LLM response");

  try {
    // Extract JSON from potential markdown code blocks
    const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr);

    return {
      relevant: Boolean(parsed.relevant),
      intent: parsed.intent || "other",
      audience: parsed.audience || "unknown",
      urgency: parsed.urgency || "low",
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      reason: String(parsed.reason || "LLM classification"),
      language: detectLanguage(title, content),
    };
  } catch (parseErr) {
    logger.error("Failed to parse LLM classification response:", raw);
    throw new Error("Invalid LLM JSON response");
  }
}
