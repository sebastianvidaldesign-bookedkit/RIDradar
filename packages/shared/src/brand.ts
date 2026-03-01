export type RIDClassification =
  | "Design & Creative Direction"
  | "Accessories & Leather Goods"
  | "Styling"
  | "Senior Design"
  | "Fashion Executive";

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
    id: "design-creative-direction",
    name: "Design & Creative Direction",
    classification: "Design & Creative Direction",
    precision: false,
    terms: [
      "fashion design director", "design director", "head of design",
      "creative director", "artistic director", "VP of design", "chief designer",
    ],
  },
  {
    id: "accessories-leather-goods",
    name: "Accessories & Leather Goods",
    classification: "Accessories & Leather Goods",
    precision: false,
    terms: [
      // Director / VP level
      "handbag design director", "leather goods director", "accessories director",
      "VP of leather goods", "VP leathergoods", "VP of accessories",
      "creative director handbags", "creative director leather goods",
      "creative director handbags and leather goods",
      "head of leather goods", "head of handbags", "head of accessories",
      // Designer level
      "leather goods designer", "leathergoods designer", "accessories designer",
      "handbag designer", "bag designer", "small leather goods designer",
      "senior designer handbags", "senior handbag designer",
      "senior leather goods designer", "senior leathergoods designer",
      "senior accessories designer",
      // Broader category
      "footwear designer", "shoes designer", "VP accessories",
      "accessories design", "leather goods design", "handbag design",
    ],
  },
  {
    id: "styling",
    name: "Styling",
    classification: "Styling",
    precision: false,
    terms: [
      "fashion stylist", "wardrobe stylist", "editorial stylist", "styling director",
      "head stylist", "celebrity stylist", "personal stylist", "costume designer",
    ],
  },
  {
    id: "senior-design",
    name: "Senior Design",
    classification: "Senior Design",
    precision: false,
    terms: [
      "senior fashion designer", "lead designer", "senior designer",
      "principal designer", "design lead",
      "senior handbag designer", "senior leather goods designer",
      "senior leathergoods designer", "senior accessories designer",
      "lead accessories designer", "lead leather goods designer",
    ],
  },
  {
    id: "fashion-executive",
    name: "Fashion Executive",
    classification: "Fashion Executive",
    precision: false,
    terms: [
      "chief creative officer", "VP fashion", "vice president design",
      "fashion VP", "CCO", "fashion c-suite",
      "VP of leather goods", "VP leathergoods", "vice president leather goods",
      "vice president accessories", "VP of handbags",
    ],
  },
];

/** Terms that confirm this is an actual job posting — trigger +15 score boost */
export const JOB_CONFIRMATION_TERMS: string[] = [
  "hiring", "apply now", "open role", "we are looking for",
  "job opening", "position available", "join our team", "now hiring",
];

/** Luxury/premium brands — trigger +15 score boost */
export const LUXURY_BRAND_TERMS: string[] = [
  "LVMH", "Kering", "Hermès", "Chanel", "Dior", "Louis Vuitton",
  "Gucci", "Saint Laurent", "Balenciaga", "Coach", "Tory Burch",
  "Michael Kors", "Ralph Lauren", "Prada", "Bottega Veneta",
  "Burberry", "Valentino", "Versace", "Fendi", "Givenchy",
];

export const NEGATIVE_KEYWORDS: string[] = [
  "intern", "unpaid", "volunteer", "entry level",
];

export const SPAM_PATTERNS: string[] = [
  "make money online", "dropshipping", "side hustle", "passive income", "dm me for",
];

/** NYC terms — score boost only, not a filter */
export const NYC_BOOST_TERMS: string[] = [
  "new york", "nyc", "manhattan", "brooklyn", "new york city",
];

export const NYC_SCORE_BOOST = 10;

/** Per-classification minimum score thresholds */
export const CLASSIFICATION_THRESHOLDS: Record<RIDClassification, number> = {
  "Design & Creative Direction": 20,
  "Accessories & Leather Goods": 20,
  "Styling": 20,
  "Senior Design": 25,
  "Fashion Executive": 20,
};
