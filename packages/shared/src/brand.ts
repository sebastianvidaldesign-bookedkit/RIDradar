export type RIDClassification =
  | "Gala"
  | "Fashion Show"
  | "Movie / Theater Premiere"
  | "Award Ceremony";

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
    id: "gala",
    name: "Gala",
    classification: "Gala",
    precision: false,
    terms: [
      "going to a gala", "attending a gala", "gala outfit",
      "charity gala", "met gala", "black tie gala", "fundraiser gala",
    ],
  },
  {
    id: "fashion-show",
    name: "Fashion Show",
    classification: "Fashion Show",
    precision: false,
    terms: [
      "fashion show", "front row", "fashion week", "NYFW", "PFW",
      "invited to show", "attending fashion week", "runway show",
    ],
  },
  {
    id: "movie-theater-premiere",
    name: "Movie / Theater Premiere",
    classification: "Movie / Theater Premiere",
    precision: false,
    terms: [
      "movie premiere", "film premiere", "theater premiere", "premiere night",
      "going to a premiere", "red carpet event", "attending the premiere",
    ],
  },
  {
    id: "award-ceremony",
    name: "Award Ceremony",
    classification: "Award Ceremony",
    precision: false,
    terms: [
      "award show", "award ceremony", "Oscars", "Emmys", "Grammys",
      "AMAs", "nominated", "attending award", "going to the Oscars",
    ],
  },
];

/** Terms that signal event outfit shopping intent — trigger +15 score boost */
export const EVENT_INTENT_TERMS: string[] = [
  "what to wear", "need a dress", "need an outfit", "outfit ideas",
  "looking for something to wear", "shopping for", "need to find",
  "help me find", "what should I wear", "outfit inspo", "styling help",
];

/** Luxury/premium brands — trigger +10 score boost */
export const LUXURY_BRAND_TERMS: string[] = [
  "Chanel", "Dior", "Valentino", "Cartier", "Tiffany", "Van Cleef",
  "Bulgari", "Gucci", "Prada", "Saint Laurent", "Hermès", "Versace",
  "Jimmy Choo", "Manolo Blahnik",
];

export const NEGATIVE_KEYWORDS: string[] = [
  "watching at home", "watched on tv", "red carpet recap",
  "best dressed list", "selling my dress", "throwback", "last year",
  "already wore", "tbt",
];

export const SPAM_PATTERNS: string[] = [
  "make money online", "dropshipping", "side hustle", "passive income", "dm me for",
];

/** NYC terms — score boost only, not a filter */
export const NYC_BOOST_TERMS: string[] = [
  "new york", "nyc", "manhattan", "brooklyn", "lincoln center",
  "the met", "cipriani", "the plaza",
];

/** Urgency terms — trigger +10 score boost */
export const URGENCY_TERMS: string[] = [
  "next week", "this weekend", "next month", "in two weeks",
  "upcoming", "this saturday", "this friday",
];

export const NYC_SCORE_BOOST = 10;

/** Per-classification minimum score thresholds */
export const CLASSIFICATION_THRESHOLDS: Record<RIDClassification, number> = {
  "Gala": 20,
  "Fashion Show": 20,
  "Movie / Theater Premiere": 20,
  "Award Ceremony": 20,
};
