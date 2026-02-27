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
  fetchedAt: string;
  drafts: { id: string; variant: string }[];
}

interface MentionsResponse {
  mentions: MentionSummary[];
  total: number;
}

const scoreColor = (s: number) => {
  if (s >= 85) return "text-emerald-600 font-bold";
  if (s >= 70) return "text-amber-600 font-semibold";
  if (s >= 40) return "text-gray-600";
  return "text-gray-400";
};

export default function ArchivedPage() {
  const [sort, setSort] = useState("newest");
  const [status, setStatus] = useState("all_archived");
  const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(0);
  const limit = 30;

  const params = new URLSearchParams();
  params.set("sort", sort);
  // "all_archived" = reviewed + replied + ignored
  if (status === "all_archived") {
    params.set("status", "reviewed,replied,ignored");
  } else {
    params.set("status", status);
  }
  if (platform !== "all") params.set("platform", platform);
  params.set("limit", String(limit));
  params.set("offset", String(page * limit));

  const { data, isLoading, mutate } = useSWR<MentionsResponse>(
    `/api/mentions?${params}`,
    (url: string) => fetcher<MentionsResponse>(url),
    { refreshInterval: 60000 }
  );

  const unarchive = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await apiFetch(`/api/mentions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "new" }),
    });
    mutate();
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Archived</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} archived mentions` : "Loading..."}
        </p>
      </div>

      {/* Sort & Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(0); }}
          className="w-44"
        >
          <option value="newest">Newest First</option>
          <option value="score_high">Best Score First</option>
          <option value="oldest">Oldest First</option>
          <option value="score_low">Lowest Score First</option>
        </Select>

        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="w-36"
        >
          <option value="all_archived">All Archived</option>
          <option value="reviewed">Reviewed</option>
          <option value="replied">Replied</option>
          <option value="ignored">Ignored</option>
        </Select>

        <Select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setPage(0); }}
          className="w-36"
        >
          <option value="all">All Sources</option>
          <option value="reddit">Reddit</option>
          <option value="rss">RSS</option>
          <option value="search">Search</option>
          <option value="x">X</option>
        </Select>

        <Button variant="ghost" size="sm" onClick={() => mutate()}>
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      )}

      {data && data.mentions.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-muted-foreground">No archived mentions yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Archive items from your Inbox when you&apos;re done reviewing them.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {data?.mentions.map((m) => (
          <Link key={m.id} href={`/mentions/${m.id}`}>
            <Card className="p-4 transition-colors hover:bg-accent/50 cursor-pointer">
              <div className="flex items-start gap-4">
                <div className={`min-w-[3rem] text-center text-2xl ${scoreColor(m.score)}`}>
                  {m.score}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <PlatformIcon platform={m.platform} showLabel />
                    <span className="text-xs text-muted-foreground">{m.sourceName}</span>
                    <Badge variant={
                      m.status === "replied" ? "success" : m.status === "ignored" ? "secondary" : "warning"
                    }>
                      {m.status}
                    </Badge>
                    {m.drafts.length > 0 && (
                      <Badge variant="success">{m.drafts.length} drafts</Badge>
                    )}
                  </div>

                  <h3 className="font-medium leading-snug line-clamp-1">
                    {m.title || "(no title)"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {m.content.slice(0, 200)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => unarchive(e, m.id)}
                  >
                    Unarchive
                  </Button>
                  <span>{new Date(m.fetchedAt).toLocaleDateString()}</span>
                  {m.author && <span>by {m.author}</span>}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

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
