import { config } from "../config";
import { logger } from "../lib/logger";
import type { Classification } from "shared";
import { detectLanguage } from "../lib/language";

const SYSTEM_PROMPT = `You are a classification engine for RID Radar, a signal intelligence tool that finds status ecosystem signals for Romance Is Dead NYC — a luxury/dark-fashion brand.

Given a mention (title + content + source), output a JSON object with these exact fields:
{
  "relevant": boolean,       // true if this signal touches luxury, status, high-income identity, or gatekeeper ecosystems
  "intent": string,          // one of: "need_help", "recommendation_request", "comparison", "sharing_resource", "other"
  "audience": string,        // one of: "stylist", "founder", "finance", "art_collector", "creative_director", "private_club", "unknown"
  "urgency": string,         // one of: "high", "medium", "low"
  "score": number,           // 0-100, how actionable this signal is for RID brand strategy
  "reason": string           // brief explanation (1 sentence)
}

Rules:
- REJECT: cheap, dupe, replica, fast fashion, budget, discount, clearance, dropshipping, side hustle, passive income, free webinar, how to get rich
- PRIORITIZE: bespoke, atelier, couture, private members clubs, gala, invite-only, gatekeepers (stylists, PR), VC/founder operator language, editorial/avant-garde fashion
- Score 80+ = direct gatekeeper or exclusive ecosystem signal
- Score 50-79 = adjacent luxury or status signal
- Score < 50 = weak or noisy signal
- NYC context (Manhattan, SoHo, Tribeca, etc.) adds relevance weight

REJECT if content matches spam patterns: courses, webinars, MLM, get-rich schemes.
Recognize these Spanish EPK terms as equivalent to English ones:
- "kit de prensa" / "kit de prensa electrónico" = electronic press kit
- "dossier artístico" = artist dossier / EPK
- "carpeta de prensa" / "material de prensa" = press kit / press materials
- "armar un press kit" = build a press kit (Argentine phrasing)
- "conseguir shows/fechas" = get gigs/bookings
- "promotor" = promoter, "sello" = record label, "recital" = concert, "boliche" = club/venue
Score Spanish-language music EPK content with the same criteria as English content.

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
