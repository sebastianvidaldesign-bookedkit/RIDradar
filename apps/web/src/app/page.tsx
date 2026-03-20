"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { fetcher, apiFetch } from "@/lib/api";

interface MentionSummary {
  id: string;
  platform: string;
  sourceName: string;
  title: string;
  content: string;
  url: string;
  author: string | null;
  status: string;
  score: number;
  relevant: boolean;
  intent: string | null;
  audience: string | null;
  urgency: string | null;
  language: string;
  fetchedAt: string;
  drafts: { id: string; variant: string }[];
  // RID fields
  classification: string | null;
  whyMatched: string | null;
  campaignIdea: string | null;
}

interface MentionsResponse {
  mentions: MentionSummary[];
  total: number;
}

// Computed once at module load — stable reference, no re-render loop
const SIX_MONTHS_AGO = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
})();

const urgencyColor = (u: string | null) => {
  if (u === "high") return "destructive" as const;
  if (u === "medium") return "warning" as const;
  return "secondary" as const;
};

const scoreColor = (s: number) => {
  if (s >= 85) return "text-emerald-600";
  if (s >= 70) return "text-amber-600";
  return "text-gray-400";
};

export default function InboxPage() {
  const [sort, setSort] = useState("score_high");
  const [intent, setIntent] = useState("all");
  const [classification, setClassification] = useState("all");
  const [page, setPage] = useState(0);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  const limit = 30;

  const archiveMention = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // don't navigate to detail page
    e.stopPropagation();
    await apiFetch(`/api/mentions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "reviewed" }),
    });
    mutate();
  };

  const params = new URLSearchParams();
  params.set("sort", sort);
  params.set("status", "new");
  params.set("publishedAfter", SIX_MONTHS_AGO);
  if (intent !== "all") params.set("intent", intent);
  if (classification !== "all") params.set("classification", classification);
  params.set("limit", String(limit));
  params.set("offset", String(page * limit));

  const { data, error, isLoading, mutate } = useSWR<MentionsResponse>(
    `/api/mentions?${params}`,
    (url: string) => fetcher<MentionsResponse>(url),
    { refreshInterval: 30000 }
  );

  const runJob = async (type: string) => {
    setRunningJob(type);
    setJobMessage(null);
    const label = type === "all" ? "All collectors" : type.charAt(0).toUpperCase() + type.slice(1);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/jobs/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        }
      );
      setJobMessage(`${label} triggered — collecting in background...`);
      // Poll for results
      setTimeout(() => mutate(), 5000);
      setTimeout(() => mutate(), 15000);
      setTimeout(() => { mutate(); setJobMessage(null); }, 30000);
    } catch {
      setJobMessage(`Failed to trigger ${label}. Is the API running?`);
    } finally {
      setRunningJob(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} mentions` : "Loading..."}
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" disabled={!!runningJob} onClick={() => runJob("apify")}>
            {runningJob === "apify" ? "Running..." : "Run Now"}
          </Button>
          <Button size="sm" variant="outline" disabled={!!runningJob} onClick={() => runJob("reclassify")}>
            {runningJob === "reclassify" ? "Reclassifying..." : "Reclassify DB"}
          </Button>
        </div>
      </div>

      {/* Job feedback banner */}
      {jobMessage && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">{jobMessage}</p>
          <button
            className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4"
            onClick={() => setJobMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sort & Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(0); }}
          className="w-52"
        >
          <option value="score_high">Best Score First</option>
          <option value="score_low">Lowest Score First</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </Select>

        <Select
          value={intent}
          onChange={(e) => { setIntent(e.target.value); setPage(0); }}
          className="w-48"
        >
          <option value="all">All Intents</option>
          <option value="need_help">Need Help</option>
          <option value="recommendation_request">Recommendation</option>
          <option value="comparison">Comparison</option>
          <option value="sharing_resource">Sharing Resource</option>
          <option value="other">Other</option>
        </Select>

        <Select
          value={classification}
          onChange={(e) => { setClassification(e.target.value); setPage(0); }}
          className="w-52"
        >
          <option value="all">All Classifications</option>
          <option value="Design & Creative Direction">Design &amp; Creative Direction</option>
          <option value="Accessories & Leather Goods">Accessories &amp; Leather Goods</option>
          <option value="Styling">Styling</option>
          <option value="Senior Design">Senior Design</option>
          <option value="Fashion Executive">Fashion Executive</option>
        </Select>

        <Button variant="ghost" size="sm" onClick={() => mutate()}>
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="mb-4 border-destructive bg-red-50 p-4">
          <p className="text-sm text-destructive">
            Failed to load mentions. Is the API running on localhost:3001?
          </p>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-muted-foreground">Loading mentions...</div>
      )}

      {/* Empty state */}
      {data && data.mentions.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-muted-foreground">No mentions found.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try clicking &quot;Run All&quot; to collect new mentions.
          </p>
        </Card>
      )}

      {/* Mention list */}
      <div className="space-y-2">
        {data?.mentions.map((m) => (
          <Link key={m.id} href={`/mentions/${m.id}`}>
            <Card className="p-4 transition-colors hover:bg-accent/50 cursor-pointer">
              <div className="flex items-start gap-4">
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <PlatformIcon platform={m.platform} showLabel />
                    <span className="text-xs text-muted-foreground">{m.sourceName}</span>
                    {m.classification && (
                      <Badge variant="outline">{m.classification}</Badge>
                    )}
                    {m.urgency && m.urgency !== "low" && (
                      <Badge variant={urgencyColor(m.urgency)}>{m.urgency}</Badge>
                    )}
                    {m.drafts.length > 0 && (
                      <Badge variant="success">{m.drafts.length} drafts</Badge>
                    )}
                  </div>

                  <h3 className="font-medium leading-snug line-clamp-1">
                    {m.title || "(no title)"}
                  </h3>
                  {m.whyMatched ? (
                    <p className="mt-1 text-xs italic text-muted-foreground line-clamp-1">
                      {m.whyMatched}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {m.content.slice(0, 200)}
                    </p>
                  )}
                  {m.campaignIdea && (
                    <div className="mt-2 rounded border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground line-clamp-1">
                      {m.campaignIdea}
                    </div>
                  )}
                </div>

                {/* Score + Date + Archive */}
                <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => archiveMention(e, m.id)}
                  >
                    Archive
                  </Button>
                  <span className={`font-bold text-sm ${scoreColor(m.score)}`}>{m.score}/100</span>
                  <span>{new Date(m.fetchedAt).toLocaleDateString()}</span>
                  {m.author && <span>by {m.author}</span>}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
