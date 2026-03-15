import type { Classification, RIDClassification } from "shared";
import {
  QUERY_PACKS,
  NEGATIVE_KEYWORDS,
  SPAM_PATTERNS,
  EVENT_INTENT_TERMS,
  LUXURY_BRAND_TERMS,
  NYC_BOOST_TERMS,
  NYC_SCORE_BOOST,
  URGENCY_TERMS,
  CLASSIFICATION_THRESHOLDS,
} from "shared";
import { getCampaignIdea } from "../lib/campaignIdeas";
import { detectLanguage } from "../lib/language";

interface PackMatch {
  pack: (typeof QUERY_PACKS)[number];
  matched: string[];
}

export function classifyRidHeuristic(title: string, content: string): Classification {
  const text = `${title} ${content}`.toLowerCase();

  // Hard-drop: spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (text.includes(pattern.toLowerCase())) {
      return {
        relevant: false,
        intent: "other",
        audience: "unknown",
        urgency: "low",
        score: 0,
        reason: `Spam pattern matched: "${pattern}"`,
        language: detectLanguage(title, content),
      };
    }
  }

  // Hard-drop: negative keywords
  for (const kw of NEGATIVE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      return {
        relevant: false,
        intent: "other",
        audience: "unknown",
        urgency: "low",
        score: 0,
        reason: `Negative keyword matched: "${kw}"`,
        language: detectLanguage(title, content),
      };
    }
  }

  // Collect qualifying pack matches
  const qualifyingMatches: PackMatch[] = [];
  for (const pack of QUERY_PACKS) {
    const matched: string[] = [];
    for (const term of pack.terms) {
      if (text.includes(term.toLowerCase())) {
        matched.push(term);
      }
    }
    const required = pack.precision ? 2 : 1;
    if (matched.length >= required) {
      qualifyingMatches.push({ pack, matched });
    }
  }

  // No qualifying pack → irrelevant
  if (qualifyingMatches.length === 0) {
    return {
      relevant: false,
      intent: "other",
      audience: "unknown",
      urgency: "low",
      score: 0,
      reason: "No qualifying pack terms matched",
      language: detectLanguage(title, content),
    };
  }

  // Total matched terms across all qualifying packs
  const totalMatches = qualifyingMatches.reduce((n, pm) => n + pm.matched.length, 0);

  // Event intent bonus (+15): confirms outfit shopping need
  const eventIntentBoost = EVENT_INTENT_TERMS.some((t) => text.includes(t.toLowerCase()))
    ? 15
    : 0;

  // Luxury brand bonus (+10): boosts desirable audience signals
  const luxuryBrandBoost = LUXURY_BRAND_TERMS.some((t) => text.toLowerCase().includes(t.toLowerCase()))
    ? 10
    : 0;

  // NYC bonus (+10)
  const nycBoost = NYC_BOOST_TERMS.some((t) => text.includes(t.toLowerCase()))
    ? NYC_SCORE_BOOST
    : 0;

  // Urgency bonus (+10)
  const urgencyBoost = URGENCY_TERMS.some((t) => text.includes(t.toLowerCase()))
    ? 10
    : 0;

  // Score formula
  const rawScore = Math.min(100, totalMatches * 15 + 20) + eventIntentBoost + luxuryBrandBoost + nycBoost + urgencyBoost;
  const score = Math.min(100, rawScore);

  // Primary classification: qualifying pack with most matches
  const primary = qualifyingMatches.reduce((best, pm) =>
    pm.matched.length > best.matched.length ? pm : best
  );

  const ridClassification = primary.pack.classification as RIDClassification;

  // Per-classification threshold check
  const threshold = CLASSIFICATION_THRESHOLDS[ridClassification];
  if (score < threshold) {
    return {
      relevant: false,
      intent: "other",
      audience: "unknown",
      urgency: "low",
      score,
      reason: `Score ${score} below threshold ${threshold} for ${ridClassification}`,
      language: detectLanguage(title, content),
    };
  }

  // Build human-readable explanation
  const termList = primary.matched.slice(0, 5).join('", "');
  let whyMatched = `Event signal: matched ${primary.matched.length} term${primary.matched.length !== 1 ? "s" : ""} in "${primary.pack.name}": "${termList}"`;
  if (eventIntentBoost > 0) whyMatched += ` Outfit intent detected (+15).`;
  if (luxuryBrandBoost > 0) whyMatched += ` Luxury brand detected (+10).`;
  if (nycBoost > 0) whyMatched += ` NYC context detected (+${NYC_SCORE_BOOST}).`;
  if (urgencyBoost > 0) whyMatched += ` Urgency signal detected (+10).`;

  const matchedTerms = qualifyingMatches.flatMap((pm) => pm.matched);
  const campaignIdea = getCampaignIdea(ridClassification);

  return {
    relevant: true,
    intent: "event_announcement",
    audience: "unknown",
    urgency: score >= 75 ? "high" : score >= 50 ? "medium" : "low",
    score,
    reason: whyMatched,
    language: detectLanguage(title, content),
    ridClassification,
    matchedTerms,
    whyMatched,
    campaignIdea,
  };
}
