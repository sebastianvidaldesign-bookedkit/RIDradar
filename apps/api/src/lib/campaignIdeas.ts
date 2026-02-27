import type { RIDClassification } from "shared";

export const CAMPAIGN_IDEAS: Record<RIDClassification, string> = {
  "Gatekeeper":
    "Reach out with a private lookbook and request a styling session or brand consultation.",
  "Wealth Context":
    "Explore sponsorship, presence, or exclusive gifting at this event or venue.",
  "Luxury Consumption":
    "Use this consumption signal to validate positioning. Add to brand research board.",
  "Platform Discovery":
    "Seek access or waitlist position. Map community for potential partnership.",
  "High-Income Identity":
    "Build a campaign segment around this persona and operator language.",
  "Aesthetic Affinity":
    "Pull this reference into the next creative brief or mood board.",
};

export function getCampaignIdea(classification: RIDClassification): string {
  return CAMPAIGN_IDEAS[classification] ?? "";
}
