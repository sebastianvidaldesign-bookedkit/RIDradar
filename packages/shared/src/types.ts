export type Platform = "reddit" | "rss" | "search" | "x";
export type { RIDClassification } from "./brand";
export type MentionStatus = "new" | "reviewed" | "replied" | "ignored";
export type Intent = "shopping_intent" | "event_announcement" | "outfit_request" | "other";
export type Audience = "bride" | "wedding_guest" | "gala_attendee" | "fashion_show_attendee" | "premiere_attendee" | "award_ceremony_attendee" | "unknown";
export type Urgency = "high" | "medium" | "low";
export type DraftVariant = "concise" | "detailed" | "question_first";
export type SourceType = "subreddit" | "reddit_query" | "rss_feed" | "search_query" | "x_query";

export interface Classification {
  relevant: boolean;
  intent: Intent;
  audience: Audience;
  urgency: Urgency;
  score: number;
  reason: string;
  language?: string;
  // RID Radar extended fields
  ridClassification?: string;
  matchedTerms?: string[];
  whyMatched?: string;
  campaignIdea?: string;
}

export interface RawMention {
  platform: Platform;
  sourceName: string;
  externalId: string;
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt?: Date;
  raw?: Record<string, unknown>;
}

export interface MentionFilters {
  status?: MentionStatus;
  platform?: Platform;
  scoreMin?: number;
  scoreMax?: number;
  intent?: Intent;
  dateFrom?: string;
  dateTo?: string;
  relevant?: boolean;
  limit?: number;
  offset?: number;
}

export interface JobStatus {
  running: boolean;
  lastRun: string | null;
  lastError: string | null;
  itemsFound: number;
}

export interface JobsStatusMap {
  reddit: JobStatus;
  rss: JobStatus;
  search: JobStatus;
  x: JobStatus;
  digest: JobStatus;
}
