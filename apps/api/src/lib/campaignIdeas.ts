import type { RIDClassification } from "shared";

export const CAMPAIGN_IDEAS: Record<RIDClassification, string> = {
  "Wedding": "Person is attending a wedding — reach out with wedding guest dress/jewelry options.",
  "Gala": "Person is attending a gala — pitch formal gowns, statement jewelry, or evening bags.",
  "Fashion Show": "Person is attending a fashion show — suggest runway-inspired pieces or show-worthy looks.",
  "Movie / Theater Premiere": "Person is attending a premiere — pitch red carpet-ready dresses and fine jewelry.",
  "Award Ceremony": "Person is attending an award ceremony — offer formal styling packages or luxury accessories.",
};

export function getCampaignIdea(classification: RIDClassification): string {
  return CAMPAIGN_IDEAS[classification] ?? "";
}
