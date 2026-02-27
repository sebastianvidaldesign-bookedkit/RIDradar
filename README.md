# BookedKit Radar v1

Local-first lead discovery tool that monitors Reddit, RSS feeds, and Google-indexed forums for people talking about EPKs (electronic press kits) with buyer intent. Automatically classifies, scores, and drafts replies — you approve and post manually.

## Features

- **Reddit monitoring**: Polls subreddit posts, search results, and comments via public JSON API
- **RSS feeds**: Parses any RSS/Atom feed for EPK-related content
- **Web search**: SerpAPI or Bing Web Search for Google-indexed forum posts
- **NLP classification**: LLM-based (OpenAI-compatible) with heuristic keyword fallback
- **Reply drafting**: 3 tone variants (concise, detailed, question-first) — non-spammy, value-first
- **Daily digest email**: 08:00 your timezone, grouped by priority, with dashboard + source links
- **Dashboard UI**: Filterable inbox, mention detail with drafts, source management, run-now controls

## Prerequisites

- **Node.js** 20+
- **pnpm** 8+ (`npm install -g pnpm`)
- **Docker** (for PostgreSQL)

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Copy environment file
cp .env.example .env
# Edit .env if you want to add LLM/search API keys (optional)

# 3. Install dependencies
pnpm install

# 4. Run database migrations
pnpm db:migrate

# 5. Seed starter sources + settings
pnpm db:seed

# 6. Start development servers
pnpm dev
```

- **API**: http://localhost:3001
- **Web UI**: http://localhost:3000
- **pgAdmin**: http://localhost:5050 (admin@local.dev / admin)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | (see .env.example) | PostgreSQL connection string |
| `LLM_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI-compatible API base |
| `LLM_API_KEY` | No | — | If empty, heuristic classifier is used |
| `LLM_MODEL` | No | `gpt-4o-mini` | Model name |
| `SERPAPI_KEY` | No | — | SerpAPI key for web search |
| `BING_KEY` | No | — | Bing Web Search key |
| `REDDIT_INTERVAL_MINUTES` | No | `60` | Reddit polling interval |
| `RSS_INTERVAL_MINUTES` | No | `60` | RSS polling interval |
| `SEARCH_INTERVAL_HOURS` | No | `6` | Web search interval |
| `SCORE_THRESHOLD` | No | `70` | Min score for drafts + digest |
| `MIN_STORE_SCORE` | No | `40` | Min score to store a mention |
| `MAX_HISTORY_DAYS` | No | `183` | Ignore posts older than this (~6 months) |
| `EMAIL_PROVIDER` | No | `auto` | `auto`, `sendgrid`, `smtp`, `devfile` |
| `DIGEST_TO_EMAIL` | No | — | Your email for daily digest |
| `DIGEST_FROM_EMAIL` | No | `radar@bookedkit.com` | Sender address |
| `DIGEST_TIMEZONE` | No | `America/New_York` | Digest schedule timezone |
| `PUBLIC_WEB_BASE_URL` | No | `http://localhost:3000` | Dashboard base URL for email links |
| `SENDGRID_API_KEY` | No | — | SendGrid API key |
| `SMTP_HOST` | No | — | SMTP server host |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `SMTP_SECURE` | No | `false` | Use TLS |

## Usage

### Dashboard

1. Open http://localhost:3000
2. Click **Run All** to trigger collectors immediately
3. Mentions appear in the inbox — filter by status, source, intent, score
4. Click a mention to see full content, classification, and reply drafts
5. **Copy** a draft, open the source link, and manually paste your reply
6. Mark as replied/reviewed/ignored

### Jobs

Jobs run automatically on a schedule:
- Reddit + RSS: every 60 minutes
- Web search: every 6 hours
- Daily digest: 08:00 America/New_York

Override from the dashboard or CLI:

```bash
# Run all collectors
pnpm --filter api jobs:collect

# Run daily digest
pnpm --filter api jobs:digest
```

### Email Digest

The daily digest email is sent at **08:00 in your configured timezone** (`DIGEST_TIMEZONE`).

**Testing the digest locally:**

1. With no email keys set, the digest writes HTML to `apps/api/digests/`
2. Click "Run Digest" in the UI or run `pnpm --filter api jobs:digest`
3. Open the generated HTML file in your browser
4. Check the API logs for the file path

**Verifying timezone behavior:**

The digest uses `node-cron`'s timezone option. Check the server startup logs for:
```
Scheduler started:
  Daily digest: 08:00 America/New_York
```

### Web Search Setup

Web search is optional and disabled by default. To enable it, get an API key from one of:

1. **SerpAPI** (recommended): Sign up at https://serpapi.com, set `SERPAPI_KEY` in `.env`
2. **Bing Web Search**: Create an Azure Cognitive Services resource, set `BING_KEY` in `.env`

Only one provider is needed. SerpAPI is checked first, then Bing. If neither key is set, the web search collector runs but returns no results.

### Managing Sources

Go to http://localhost:3000/sources to:
- Add/remove subreddits, Reddit search queries, RSS feeds, web search queries
- Toggle sources on/off
- Adjust score threshold and polling intervals

## Project Structure

```
├── apps/api/          Express API + collectors + classifiers + jobs
│   ├── prisma/        Schema + migrations + seed
│   └── src/
│       ├── collectors/  Reddit, RSS, Web Search
│       ├── classifiers/ Heuristic + LLM
│       ├── drafting/    Heuristic + LLM reply generation
│       ├── email/       SendGrid, SMTP, dev-file providers
│       ├── jobs/        Scheduler, collect pipeline, digest
│       ├── routes/      Express API routes
│       └── cli/         Standalone job scripts
├── apps/web/          Next.js dashboard
│   └── src/
│       ├── app/       Pages (inbox, detail, sources)
│       ├── components/ UI components
│       └── lib/       API client, utilities
└── packages/shared/   Shared TypeScript types
```

## How It Works

1. **Collectors** fetch public data from Reddit JSON API, RSS feeds, and search APIs
2. Each item is **deduplicated** by external ID (Reddit post/comment ID, RSS GUID, URL hash)
3. **Classifier** scores each item 0-100 based on EPK keyword relevance, music context, and intent signals
4. Items scoring above threshold get **reply drafts** auto-generated in 3 tones
5. **Daily digest** emails you a summary of new high-priority mentions
6. You review, copy a draft, and **manually reply** on the original platform

## Score Thresholds

There are two separate score thresholds:

| Setting | Default | Purpose |
|---------|---------|---------|
| `MIN_STORE_SCORE` | 40 | Min score to store a mention in the database |
| `SCORE_THRESHOLD` | 70 | Min score for reply drafts + daily digest inclusion |

This means mentions scoring 40-69 are stored and visible in the dashboard but won't get auto-drafts or appear in the digest email. Mentions below 40 are discarded entirely.

## Recency Filter (MAX_HISTORY_DAYS)

By default, the system ignores posts older than **183 days (~6 months)**. This applies to all collectors:

- **Reddit**: Uses `&t=year` param on search endpoints, then filters locally by `created_utc`
- **RSS**: Skips items with no publish date or dates older than the cutoff
- **Web Search**: Filters locally; items with no date are kept (uses `fetchedAt` as fallback)
- **Digest**: Only includes mentions fetched within the recency window

You can change this via the `MAX_HISTORY_DAYS` env var, the Settings UI, or the `/api/settings` endpoint.

## Troubleshooting

### "0 mentions stored" after running collectors

If the collector finds raw items but stores none, check these in order:

1. **All duplicates**: If you've run the collector before, items with the same external ID are skipped. Check the log line — if `duplicate` equals `raw_count`, all items already exist in the database.

2. **Too old**: If `MAX_HISTORY_DAYS` is set too low, posts may be filtered out before classification. Check for "skipped N items older than X days" in the logs.

3. **Low scores**: The heuristic classifier is strict about EPK keywords. If `irrelevant` + `low_score` are high, your sources may not have EPK-related content. Try adding more specific Reddit search queries like `"need an epk"` or `"press kit" booking`.

4. **No LLM key**: Without `LLM_API_KEY`, the system uses the heuristic classifier which only looks for specific keyword patterns. Consider adding an OpenAI API key for better classification.

5. **RSS feeds disabled**: RSS feeds are disabled by default (except the 3 enabled in seed). Enable them on the Sources page.

### API returns 500 errors

1. Check Docker is running: `docker compose ps`
2. Check database connection: look for `Database connection: OK` in API startup logs
3. Check `.env` is loaded: look for `[config] Loaded .env from` in startup logs

## Ethical Design

- Public web only — no login automation, no scraping behind auth walls
- Human-in-the-loop — all replies require manual approval and posting
- Non-spammy drafts — value-first, no hard-sell, BookedKit mentioned naturally
- Polite rate limiting — respects Reddit rate limits with exponential backoff
- No private data — only publicly available posts, comments, and search results

## Roadmap v2

- **Railway deployment**: Dockerfile, Railway Postgres, Railway Cron for CLI scripts
- **Slack digest**: Post daily digest to a Slack channel
- **More sources**: Twitter/X search, Discord public servers, Hacker News
- **Browser extension**: One-click reply posting from the dashboard
- **Analytics**: Track which mentions led to conversions
- **Webhook notifications**: Real-time alerts for high-score mentions
