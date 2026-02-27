import dotenv from "dotenv";
import path from "path";

// dotenv loads from cwd, which is apps/api/ when run via pnpm --filter api.
// The .env file lives at the monorepo root. Try apps/api/.env first, then repo root.
const localEnv = dotenv.config(); // try apps/api/.env
if (localEnv.error) {
  const rootEnv = dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
  if (rootEnv.error) {
    console.warn("[config] No .env file found in apps/api/ or repo root. Using process.env only.");
  } else {
    console.log("[config] Loaded .env from repo root (../../.env)");
  }
} else {
  console.log("[config] Loaded .env from apps/api/.env");
}

// STEP 1 diagnostics: log resolved DATABASE_URL (mask password)
const rawDbUrl = process.env.DATABASE_URL;
if (rawDbUrl) {
  const masked = rawDbUrl.replace(/:([^@]+)@/, ":****@");
  console.log(`[config] DATABASE_URL resolved: ${masked}`);
} else {
  console.error("[config] WARNING: DATABASE_URL is NOT defined in environment!");
}

export const config = {
  port: parseInt(process.env.PORT || process.env.API_PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://radar:radar_dev@localhost:5432/bookedkit_radar",

  // LLM
  llmBaseUrl: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
  llmApiKey: process.env.LLM_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "gpt-4o-mini",
  get llmEnabled() {
    return Boolean(this.llmApiKey);
  },

  // Search APIs
  serpApiKey: process.env.SERPAPI_KEY || "",
  bingKey: process.env.BING_KEY || "",
  googleCseKey: process.env.GOOGLE_CSE_KEY || "",
  googleCseCx: process.env.GOOGLE_CSE_CX || "",

  // X (Twitter) — token from dev console may be URL-encoded (%3D → =)
  xBearerToken: decodeURIComponent(process.env.X_BEARER_TOKEN || ""),

  // Intervals
  redditIntervalMinutes: parseInt(process.env.REDDIT_INTERVAL_MINUTES || "60", 10),
  rssIntervalMinutes: parseInt(process.env.RSS_INTERVAL_MINUTES || "60", 10),
  searchIntervalHours: parseInt(process.env.SEARCH_INTERVAL_HOURS || "6", 10),

  // Score thresholds
  scoreThreshold: parseInt(process.env.SCORE_THRESHOLD || "70", 10),
  minStoreScore: parseInt(process.env.MIN_STORE_SCORE || "40", 10),

  // Recency
  maxHistoryDays: parseInt(process.env.MAX_HISTORY_DAYS || "183", 10),

  // Email
  emailProvider: process.env.EMAIL_PROVIDER || "auto",
  digestToEmail: process.env.DIGEST_TO_EMAIL || "",
  digestFromEmail: process.env.DIGEST_FROM_EMAIL || "radar@bookedkit.com",
  digestTimezone: process.env.DIGEST_TIMEZONE || "America/New_York",
  publicWebBaseUrl: process.env.PUBLIC_WEB_BASE_URL || "http://localhost:3000",

  // SendGrid
  sendgridApiKey: process.env.SENDGRID_API_KEY || "",

  // SMTP
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpSecure: process.env.SMTP_SECURE === "true",
};
