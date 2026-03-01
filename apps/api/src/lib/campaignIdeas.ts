import type { RIDClassification } from "shared";

export const CAMPAIGN_IDEAS: Record<RIDClassification, string> = {
  "Design & Creative Direction":
    "Prepare portfolio + tailored cover letter. Research the brand's recent collections before applying.",
  "Accessories & Leather Goods":
    "Highlight leather goods / accessories portfolio. Note relevant brand DNA (heritage, materials, craft).",
  "Styling":
    "Send lookbook or styling reel. Reach out to the casting/creative team directly if contact is findable.",
  "Senior Design":
    "Review JD for tech pack / PLM requirements. Tailor portfolio to the aesthetic.",
  "Fashion Executive":
    "Research leadership team on brand site. Identify mutual connections for a warm intro.",
};

export function getCampaignIdea(classification: RIDClassification): string {
  return CAMPAIGN_IDEAS[classification] ?? "";
}
