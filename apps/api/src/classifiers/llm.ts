import { config } from "../config";
import { logger } from "../lib/logger";
import type { Classification } from "shared";
import { detectLanguage } from "../lib/language";

const SYSTEM_PROMPT = `You are a social media post classifier for RID Radar, a luxury fashion intelligence tool.

RID (Rihanna-inspired Design) connects high-end fashion designers and stylists with people who need luxury styling for prestigious events — galas, award ceremonies, fashion shows, film premieres, charity balls, and exclusive social events.

Given a post (title + content + source), output JSON with:
{
  "relevant": boolean,         // true if the post signals luxury fashion need, event dressing, or wealth-status context
  "intent": string,            // one of: "shopping_intent", "event_announcement", "outfit_request", "other"
  "audience": string,          // one of: "gala_attendee", "fashion_show_attendee", "premiere_attendee", "award_ceremony_attendee", "bride", "wedding_guest", "unknown"
  "urgency": string,           // one of: "high", "medium", "low"
  "score": number,             // 0-100
  "reason": string,            // 1-sentence explanation
  "ridClassification": string, // one of: "Wealth Context", "High-Income Identity", "Luxury Consumption", "Aesthetic Affinity", "Platform Discovery", "Gatekeeper"
  "whyMatched": string,        // 1-sentence why this is a luxury/RID-relevant signal
  "campaignIdea": string       // brief outreach angle for RID (e.g. "Offer styling consultation for Met Gala look")
}

HIGH (70-100): Person explicitly attending an upcoming luxury event AND needs outfit/styling/jewelry. Clear buyer intent.
MEDIUM (40-69): Luxury event attendance announced or strong wealth/status signal without explicit styling need.
LOW (0-39): Past event recaps, general fashion commentary, streetwear, fast fashion, non-luxury context.
REJECT (score 0, relevant false): Spam, ads, dropshipping, "make money", non-fashion content.

ridClassification guide:
- "Wealth Context": displays wealth markers (private jets, Hamptons, luxury travel, designer drops)
- "High-Income Identity": identifies as high earner or status professional in luxury circles
- "Luxury Consumption": purchasing luxury goods, custom pieces, couture
- "Aesthetic Affinity": follows luxury aesthetics, tags luxury brands, mood boards
- "Platform Discovery": influencer/tastemaker who can amplify RID reach
- "Gatekeeper": stylist, event planner, publicist, or buyer who controls access to clients

Output ONLY valid JSON.`;

async function classifyAnthropic(title: string, content: string, source: string): Promise<Classification> {
  const userMessage = `Source: ${source}\nTitle: ${title}\nContent: ${content.slice(0, 2000)}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const raw = json.content?.[0]?.text?.trim();
  if (!raw) throw new Error("Empty Anthropic response");

  return parseClassificationResponse(raw, title, content);
}

async function classifyOpenAI(title: string, content: string, source: string): Promise<Classification> {
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
      max_tokens: 500,
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

  return parseClassificationResponse(raw, title, content);
}

function parseClassificationResponse(raw: string, title: string, content: string): Classification {
  try {
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
      ridClassification: parsed.ridClassification || undefined,
      whyMatched: parsed.whyMatched || undefined,
      campaignIdea: parsed.campaignIdea || undefined,
    };
  } catch (parseErr) {
    logger.error("Failed to parse LLM classification response:", raw);
    throw new Error("Invalid LLM JSON response");
  }
}

export async function classifyLlm(title: string, content: string, source: string): Promise<Classification> {
  // Prefer Anthropic if key is configured
  if (config.anthropicApiKey) {
    return classifyAnthropic(title, content, source);
  }
  return classifyOpenAI(title, content, source);
}
