import type { Classification, Intent, Audience, Urgency } from "shared";
import { detectLanguage } from "../lib/language";

const EPK_KEYWORDS = [
  "epk",
  "electronic press kit",
  "press kit",
  "music press kit",
  "artist press kit",
  // Spanish / LATAM
  "kit de prensa",
  "dossier artístico",
  "carpeta de prensa",
  "material de prensa",
  "press kit electrónico",
  "kit de prensa electronico",
  "armar un epk",
  "hacer un epk",
  "crear un epk",
  "armo mi epk",
  "hago mi epk",
];

const MUSIC_CONTEXT = [
  "musician", "band", "artist", "dj", "producer", "singer", "rapper", "vocalist",
  "mc", "emcee", "beatmaker", "songwriter", "performer",
  "booking", "gig", "venue", "promoter", "show", "tour", "set", "festival",
  "soundcloud", "spotify", "bandcamp", "apple music", "tidal",
  "music", "album", "track", "mixtape", "demo", "record label", "a&r",
  "live performance", "open mic", "talent buyer", "booker",
  // Spanish / LATAM / Argentine
  "músico", "banda", "cantante", "rapero", "artista independiente",
  "productor musical", "sello discográfico", "sello",
  "recital", "recitales", "fecha", "fechas", "boliche", "tocar en vivo",
  "tocar", "conseguir shows", "conseguir fechas",
  "reggaeton", "cumbia", "trap latino", "latin music", "música urbana",
  "intérprete", "interprete", "solista", "cantora",
  "difusión", "representante", "agente musical",
];

const INTENT_PHRASES = [
  "how do i", "how to", "how can i", "how should i",
  "need", "looking for", "recommend", "best way",
  "anyone know", "what should", "help with", "advice",
  "suggestions", "tips", "where can i", "is there a",
  "what do you use", "what tools",
  // Spanish / LATAM
  "cómo hago", "cómo puedo", "cómo armo", "cómo creo", "cómo hago mi",
  "necesito", "alguien sabe", "alguien conoce", "alguien tiene",
  "qué me recomiendan", "me pueden recomendar", "consejos para",
  "ayuda con", "dónde puedo", "qué debería", "busco",
];

const CORPORATE_CONTEXT = [
  "product launch", "press release", "media kit", "brand kit", "company",
  "startup", "enterprise", "corporate", "investor", "quarterly", "earnings",
  "fashion press kit", "beauty press kit", "tech press kit", "pr agency",
  "public relations firm", "marketing agency press",
  // Spanish corporate
  "nota de prensa", "lanzamiento de producto", "kit de marca",
];

const URGENT_PHRASES = [
  "urgently", "asap", "deadline", "tomorrow", "this week",
  "venue asked", "promoter wants", "need it by", "last minute",
  // Spanish
  "urgente", "para mañana", "esta semana", "el promotor pide", "me pidieron",
  "cuanto antes", "para este mes", "ya mismo",
];

export function classifyHeuristic(title: string, content: string): Classification {
  const text = `${title} ${content}`.toLowerCase();

  // Score EPK keyword presence
  let epkScore = 0;
  for (const kw of EPK_KEYWORDS) {
    if (text.includes(kw)) epkScore += 20;
  }

  // No EPK keywords at all → irrelevant
  if (epkScore === 0) {
    return {
      relevant: false,
      intent: "other",
      audience: "unknown",
      urgency: "low",
      score: 0,
      reason: "No EPK/press kit keywords found",
      language: detectLanguage(title, content),
    };
  }

  // Cap EPK score contribution
  epkScore = Math.min(epkScore, 30);

  // Music context scoring
  let musicScore = 0;
  const matchedMusic: string[] = [];
  for (const kw of MUSIC_CONTEXT) {
    if (text.includes(kw)) {
      musicScore += 5;
      matchedMusic.push(kw);
    }
  }
  musicScore = Math.min(musicScore, 30);

  // Intent scoring
  let intentScore = 0;
  for (const phrase of INTENT_PHRASES) {
    if (text.includes(phrase)) intentScore += 10;
  }
  intentScore = Math.min(intentScore, 25);

  // Corporate penalty
  let corpPenalty = 0;
  for (const kw of CORPORATE_CONTEXT) {
    if (text.includes(kw)) corpPenalty += 15;
  }
  corpPenalty = Math.min(corpPenalty, 40);

  // Urgency bonus
  let urgencyBonus = 0;
  for (const phrase of URGENT_PHRASES) {
    if (text.includes(phrase)) urgencyBonus += 5;
  }
  urgencyBonus = Math.min(urgencyBonus, 15);

  // Final score
  const rawScore = epkScore + musicScore + intentScore + urgencyBonus - corpPenalty;
  const score = Math.max(0, Math.min(100, rawScore));

  // Determine intent
  let intent: Intent = "other";
  if (intentScore > 0) intent = "shopping_intent";

  // Determine audience
  const audience: Audience = "unknown";

  // Determine urgency
  let urgency: Urgency = "low";
  if (urgencyBonus >= 10 || (intentScore >= 20 && musicScore >= 15)) urgency = "high";
  else if (intentScore >= 10 || musicScore >= 10) urgency = "medium";

  const relevant = score >= 40;

  return {
    relevant,
    intent,
    audience,
    urgency,
    score,
    reason: `EPK:${epkScore} music:${musicScore}(${matchedMusic.slice(0, 3).join(",")}) intent:${intentScore} urgency:${urgencyBonus} corp:-${corpPenalty}`,
    language: detectLanguage(title, content),
  };
}
