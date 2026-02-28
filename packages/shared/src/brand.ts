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
    name: "Private Club + Event Attire",
    classification: "Wealth Context",
    precision: false,
    terms: [
      // High-signal identifiers
      "private members club", "art advisory", "vip table", "black tie",
      "club membership",
      // Compound intent queries — dress code / event attire
      "private members club dress code", "soho house dress code mens",
      "core club nyc dress code", "casa cipriani dress code", "aman club dress code",
      "black tie private club outfit", "charity gala menswear designer",
      "vip dinner outfit luxury", "art collectors dinner attire",
      // Event-driven purchase moments
      "art basel outfit men", "museum gala attire men", "opera night outfit luxury",
      "fundraiser gala menswear", "fashion week after party outfit",
      "high society event attire",
    ],
  },
  {
    id: "finance",
    name: "Finance / Founder Style Friction",
    classification: "High-Income Identity",
    precision: true,
    terms: [
      // High-signal finance identifiers
      "closing dinner", "investment committee", "cap table", "term sheet",
      "vc backed", "deal flow",
      // Compound intent queries — finance × fashion
      "venture capital gala outfit", "series a founder wardrobe",
      "closing dinner finance outfit", "private equity event attire",
      "family office gala outfit", "tech founder fashion brands",
      "best luxury menswear for founders", "discreet luxury menswear",
      "quiet luxury alternative brands",
    ],
  },
  {
    id: "luxury-apparel",
    name: "Luxury Purchase Intent",
    classification: "Luxury Consumption",
    precision: false,
    terms: [
      // High-signal apparel identifiers
      "bespoke", "made to measure", "atelier", "haute couture",
      "investment piece", "trunk show", "heritage brand",
      // Purchase language queries
      "where to buy bespoke blazer", "custom luxury menswear nyc",
      "made to measure designer alternative", "private tailoring appointment nyc",
      "trunk show nyc menswear", "exclusive menswear brand nyc",
      "designer black blazer investment piece", "independent luxury brand menswear",
    ],
  },
  {
    id: "dark-luxury",
    name: "Dark Luxury Buyer Intent",
    classification: "Aesthetic Affinity",
    precision: false,
    terms: [
      // Specific designer signals
      "maison margiela", "rick owens", "comme des garcons", "yohji yamamoto",
      "romance is dead", "cult brand",
      // Buyer intent alternatives
      "rick owens alternative brand", "maison margiela alternative designer",
      "avant garde menswear brands to buy", "punk luxury fashion brand",
      "dark luxury menswear brand", "designer tuxedo alternative",
      "non traditional black tie outfit", "editorial menswear brands to buy",
      // Dissatisfaction / switching signals
      "tired of gucci what next", "alternative to balenciaga menswear",
      "luxury without logos brand", "anti logo luxury menswear",
      "unique luxury fashion brand", "statement menswear designer",
    ],
  },
  {
    id: "platform-discovery",
    name: "Platform + Community Discovery",
    classification: "Platform Discovery",
    precision: true,
    terms: [
      "invite only", "waitlist", "exclusive membership",
      "founding member access", "vetted community", "inner circle",
    ],
  },
  {
    id: "gatekeepers",
    name: "Gatekeepers (Stylists, PR, Wardrobe Consultants)",
    classification: "Gatekeeper",
    precision: false,
    terms: [
      "personal stylist", "wardrobe consultant", "celebrity stylist",
      "fashion editor", "publicist", "brand strategist", "luxury consultant",
      "image consultant", "private shopper", "fashion director", "styling house",
      "editorial stylist", "costume designer", "brand ambassador",
    ],
  },
];

/** Terms that signal active purchase intent — trigger +20 score boost */
export const BUYER_INTENT_TERMS: string[] = [
  "recommend", "looking for", "where to buy", "what should i wear",
  "any suggestions", "worth it", "best brand", "price range",
  "investment piece", "custom made", "tailoring", "fit", "quality",
];

export const NEGATIVE_KEYWORDS: string[] = [
  "cheap", "dupe", "replica", "shein", "aliexpress", "temu", "affordable",
  "fast fashion", "budget", "discount", "clearance", "knockoff", "counterfeit",
  "fake designer", "dhgate", "forever 21", "fashion nova", "zaful", "romwe", "primark",
];

export const SPAM_PATTERNS: string[] = [
  "how to become rich", "how to get rich", "make money online", "online course",
  "free webinar", "mentorship program", "dropshipping", "side hustle", "make $",
  "passive income", "financial freedom", "secret method", "dm me for",
  "link in bio course", "affiliate link", "discount code",
];

/** Specific NYC neighborhoods — score boost only, not a filter */
export const NYC_BOOST_TERMS: string[] = [
  "soho", "tribeca", "upper east side", "nomad", "west village",
  "chelsea", "hudson yards", "meatpacking", "brooklyn heights", "dumbo",
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
