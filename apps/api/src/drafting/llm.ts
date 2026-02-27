import { config } from "../config";
import type { Mention } from "@prisma/client";

interface DraftSet {
  concise: string;
  detailed: string;
  question_first: string;
}

const SYSTEM_PROMPT = `You are a musician who plays in an independent band. You genuinely participate in online music communities — Reddit, forums, social media. You happen to use RID Radar for your band's EPK, but you are NOT a marketer or employee. You're just another musician sharing your experience.

Given a forum post/comment, generate 3 reply drafts in JSON format:
{
  "concise": "...",     // Short & casual (2-3 sentences, like a quick Reddit comment from a fellow musician)
  "detailed": "...",    // Longer personal take (share your own experience, what worked for your band, practical tips)
  "question_first": "..." // Engage first (ask about their situation, show genuine curiosity, no product mention)
}

PERSONA RULES:
- You are a FELLOW MUSICIAN, not an advisor or expert. Write like you're talking to someone at a gig.
- Share from PERSONAL EXPERIENCE: "we did X", "what worked for us was", "I had the same problem"
- NEVER sound like a salesperson. NEVER say "check out", "I recommend", "you should try", "great tool called"
- RID Radar mention should feel like "we ended up using RID Radar for ours" or "my band's EPK is on RID Radar" — like mentioning what guitar you play, not pitching it
- Only mention RID Radar in 1 or 2 of the 3 drafts, NOT all three. The question_first draft should NEVER mention it.
- NO LINKS unless they specifically asked for links
- Be specific to what the person is actually talking about — reference their situation directly
- Match their energy: if they're stressed, be encouraging. If they're casual, be chill. If they're technical, geek out.
- Use first person: "we", "our band", "I found that", "in my experience"
- Keep it real — mention struggles too, like "it took us a while to figure out what to include"

THINGS TO AVOID:
- Generic advice lists (don't just list "bio, photos, links, contact")
- Marketing language ("polished", "professional", "stand out", "game-changer", "worth checking out")
- Sounding like a customer support rep or blog post
- Mentioning RID Radar in every draft

LANGUAGE: If the original post is in Spanish, write ALL 3 drafts in Spanish.
Use Argentine/LATAM Spanish (vos instead of tú, informal tone) when the original content uses it.
Use the same music terminology the poster used (kit de prensa, dossier artístico, etc.).
If in Spanish, the personal tone should be like talking to another musician at a recital or ensayo.

Output ONLY valid JSON, no other text.`;

export async function draftLlm(mention: Mention): Promise<DraftSet> {
  const userMessage = `Platform: ${mention.platform}
Source: ${mention.sourceName}
Author role: ${mention.audience || "unknown"}
Intent: ${mention.intent || "unknown"}
Title: ${mention.title}
Content: ${mention.content.slice(0, 2000)}`;

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
      temperature: 0.7,
      max_tokens: 1500,
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

  const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(jsonStr);

  return {
    concise: String(parsed.concise || ""),
    detailed: String(parsed.detailed || ""),
    question_first: String(parsed.question_first || ""),
  };
}
