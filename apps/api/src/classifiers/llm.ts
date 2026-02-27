import { config } from "../config";
import { logger } from "../lib/logger";
import type { Classification } from "shared";
import { detectLanguage } from "../lib/language";

const SYSTEM_PROMPT = `You are a classification engine for BookedKit Radar, a tool that finds people talking about EPKs (electronic press kits) in music contexts.

Given a mention (title + content + source), output a JSON object with these exact fields:
{
  "relevant": boolean,       // true if this is about music EPKs/press kits with potential buyer intent
  "intent": string,          // one of: "need_help", "recommendation_request", "comparison", "sharing_resource", "other"
  "audience": string,        // one of: "dj", "producer", "band", "singer", "manager", "venue", "unknown"
  "urgency": string,         // one of: "high", "medium", "low"
  "score": number,           // 0-100, how relevant and actionable this is for a music EPK product
  "reason": string           // brief explanation (1 sentence)
}

Rules:
- REJECT corporate/brand press kits, PR/press releases, product launches, fashion/beauty press kits
- PRIORITIZE music booking context: venue, promoter, booking, gig, show, tour, SoundCloud, Spotify, Bandcamp
- "need_help" = asking how to create/improve an EPK
- "recommendation_request" = asking for tool/service recommendations
- "comparison" = comparing EPK tools or approaches
- "sharing_resource" = sharing their own EPK or a tool they found
- High urgency = explicit deadline, venue/promoter request, or clear immediate need
- Score 80+ = strong buyer intent in music context
- Score 50-79 = moderate relevance
- Score < 50 = weak or non-music context

BILINGUAL: Content may be in English OR Spanish (including Argentine/LATAM Spanish).
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
