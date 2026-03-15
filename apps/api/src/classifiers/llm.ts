import { config } from "../config";
import { logger } from "../lib/logger";
import type { Classification } from "shared";
import { detectLanguage } from "../lib/language";

const SYSTEM_PROMPT = `You are a social media post classifier for a fashion lead radar.

Given a post (title + content + source), output JSON with:
{
  "relevant": boolean,    // true if person is publicly announcing attendance at an upcoming event needing fashion/jewelry
  "intent": string,       // one of: "shopping_intent", "event_announcement", "outfit_request", "other"
  "audience": string,     // one of: "bride", "wedding_guest", "gala_attendee", "fashion_show_attendee", "premiere_attendee", "award_ceremony_attendee", "unknown"
  "urgency": string,      // one of: "high", "medium", "low"
  "score": number,        // 0-100
  "reason": string        // 1-sentence explanation
}

HIGH (70-100): Person explicitly says they ARE going to an upcoming wedding/gala/fashion show/premiere/award ceremony AND expresses need for an outfit/dress/jewelry.
MEDIUM (40-69): Person announces they are going to an event but no explicit outfit need stated.
LOW (0-39): Past event recap, commentary, "best dressed" articles, watching from home, selling clothes.
REJECT (score 0, relevant false): Spam, ads, dropshipping, "make money", past events.

Output ONLY valid JSON.`;

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
