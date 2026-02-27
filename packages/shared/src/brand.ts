export type RIDClassification =
  | "Wealth Context"
  | "High-Income Identity"
  | "Luxury Consumption"
  | "Aesthetic Affinity"
  | "Platform Discovery"
  | "Gatekeeper";

export interface QueryPack {
  id: string;
  name: string;
  classification: RIDClassification;
  /** precision=true: require 2+ term matches; false: 1+ match sufficient */
  precision: boolean;
  terms: string[];
}

export const QUERY_PACKS: QueryPack[] = [
  {
    id: "private-members",
    name: "NYC Private Members + Gala Ecosystem",
    classification: "Wealth Context",
    precision: false,
    terms: [
      "private members club", "members only", "invitation only", "gala",
      "charity auction", "benefit dinner", "table at", "exclusive event",
      "soirée", "private dining", "patron", "founding member", "board member",
      "endowment", "private preview", "collectors circle", "art advisory",
      "invite only event", "closed door", "curated guest list", "vip table",
      "black tie", "white glove", "penthouse", "private view", "cotillion",
      "club membership", "waitlisted", "by referral only", "legacy member",
    ],
  },
  {
    id: "finance",
    name: "Finance / VC / Founder Ecosystem",
    classification: "High-Income Identity",
    precision: true,
    terms: [
      "lp meeting", "capital call", "fund admin", "gp lp", "deal memo",
      "investment committee", "roll-up", "secondary sale", "carry",
      "vesting schedule", "cap table", "safe note", "pro rata rights",
      "follow-on", "board observer", "data room", "wire transfer",
      "closing dinner", "portfolio review", "limited partner", "general partner",
      "management fee", "carried interest", "co-invest", "deal flow",
      "term sheet", "series a", "series b", "series c", "vc backed",
      "venture capital", "angel round",
    ],
  },
  {
    id: "luxury-apparel",
    name: "Luxury Apparel / Bespoke / Limited Edition",
    classification: "Luxury Consumption",
    precision: false,
    terms: [
      "bespoke", "made to measure", "atelier", "couture", "haute couture",
      "runway", "limited edition", "numbered edition", "hand finished",
      "hand stitched", "artisanal", "capsule collection", "collaboration drop",
      "release drop", "sold out instantly", "exclusive colorway", "archive piece",
      "deadstock", "resale value", "double retail", "investment piece",
      "heritage brand", "maison", "trunk show", "private sale", "stylist pull",
      "editorial pull", "lookbook", "creative brief", "collection launch",
      "press preview", "fashion week", "after party", "front row",
    ],
  },
  {
    id: "dark-luxury",
    name: "Dark Luxury / Punk Couture / Editorial",
    classification: "Aesthetic Affinity",
    precision: false,
    terms: [
      "avant-garde", "conceptual fashion", "deconstructed", "anti-fashion",
      "editorial", "cult brand", "underground designer", "niche fragrance",
      "art school", "central saint martins", "parsons", "raf simons",
      "maison margiela", "rick owens", "comme des garcons", "yohji yamamoto",
      "issey miyake", "craig green", "simone rocha", "romance is dead",
      "archive fashion", "vintage maison", "subculture fashion",
      "transgressive luxury", "conceptual luxury",
    ],
  },
  {
    id: "platform-discovery",
    name: "Platform Discovery (Invite-Only Communities)",
    classification: "Platform Discovery",
    precision: true,
    terms: [
      "invite only", "closed beta", "private community", "waitlist",
      "exclusive membership", "members only platform", "application required",
      "vetted community", "curated network", "private slack", "private discord",
      "by application only", "referral required", "founding member access",
      "early access program", "closed group", "inner circle", "mastermind group",
    ],
  },
  {
    id: "gatekeepers",
    name: "Gatekeepers (Stylists, PR, Wardrobe Consultants)",
    classification: "Gatekeeper",
    precision: false,
    terms: [
      "personal stylist", "wardrobe consultant", "celebrity stylist",
      "fashion editor", "art director", "creative director", "publicist",
      "pr firm", "talent agent", "brand strategist", "luxury consultant",
      "image consultant", "private shopper", "fashion director", "styling house",
      "editorial stylist", "costume designer", "casting director",
      "brand ambassador", "influencer manager", "talent management",
      "agency roster", "signed to",
    ],
  },
];

export const NEGATIVE_KEYWORDS: string[] = [
  "cheap", "dupe", "replica", "shein", "aliexpress", "temu", "affordable",
  "fast fashion", "budget", "discount", "clearance", "knockoff", "counterfeit",
  "fake designer", "dhgate", "forever 21", "fashion nova", "zaful", "romwe", "primark",
];

export const SPAM_PATTERNS: string[] = [
  "how to become rich", "how to get rich", "online course", "free webinar",
  "mentorship program", "dropshipping", "side hustle", "make $", "passive income",
  "financial freedom", "secret method", "dm me for", "link in bio course",
];

export const NYC_BOOST_TERMS: string[] = [
  "nyc", "manhattan", "brooklyn", "soho", "tribeca", "west village",
  "upper east side", "nomad", "chelsea", "dumbo", "lower east side",
];

export const NYC_SCORE_BOOST = 10;

/** Per-classification minimum store score overrides */
export const CLASSIFICATION_THRESHOLDS: Record<RIDClassification, number> = {
  "Gatekeeper": 25,          // High value — store more aggressively
  "Platform Discovery": 50,  // Spam-prone — higher bar
  "Wealth Context": 35,
  "High-Income Identity": 35,
  "Luxury Consumption": 35,
  "Aesthetic Affinity": 35,
};
