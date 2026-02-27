"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { fetcher, apiFetch } from "@/lib/api";

interface ReplyDraft {
  id: string;
  variant: string;
  text: string;
  createdAt: string;
}

interface MentionDetail {
  id: string;
  platform: string;
  sourceName: string;
  externalId: string;
  title: string;
  content: string;
  url: string;
  author: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  status: string;
  score: number;
  relevant: boolean;
  intent: string | null;
  audience: string | null;
  urgency: string | null;
  reason: string | null;
  digestedAt: string | null;
  drafts: ReplyDraft[];
}

const variantLabel: Record<string, string> = {
  concise: "Helpful + Concise",
  detailed: "Friendly + Detailed",
  question_first: "Question-First",
};

export default function MentionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const { data: mention, error, mutate } = useSWR<MentionDetail>(
    `/api/mentions/${id}`,
    (url: string) => fetcher<MentionDetail>(url)
  );

  const updateStatus = async (status: string) => {
    await apiFetch(`/api/mentions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    mutate();
  };

  const generateDrafts = async () => {
    await apiFetch(`/api/mentions/${id}/drafts`, { method: "POST" });
    mutate();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Failed to load mention.</p>
        <Link href="/" className="mt-2 text-sm text-primary hover:underline">
          Back to Inbox
        </Link>
      </div>
    );
  }

  if (!mention) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Inbox
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <PlatformIcon platform={mention.platform} size="md" showLabel />
          <span className="text-sm text-muted-foreground">{mention.sourceName}</span>
          <Badge
            variant={
              mention.status === "new"
                ? "default"
                : mention.status === "replied"
                  ? "success"
                  : mention.status === "ignored"
                    ? "secondary"
                    : "warning"
            }
          >
            {mention.status}
          </Badge>
          {mention.digestedAt && <Badge variant="info">Digested</Badge>}
        </div>
        <h1 className="text-xl font-bold">{mention.title || "(no title)"}</h1>
        <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
          {mention.author && <span>by {mention.author}</span>}
          <span>Fetched {new Date(mention.fetchedAt).toLocaleString()}</span>
          {mention.publishedAt && (
            <span>Published {new Date(mention.publishedAt).toLocaleString()}</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content card */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {mention.content || "(no content)"}
              </div>
              <div className="mt-4">
                <a
                  href={mention.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open source link &rarr;
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Drafts card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reply Drafts</CardTitle>
              <Button size="sm" variant="outline" onClick={generateDrafts}>
                {mention.drafts.length > 0 ? "Regenerate" : "Generate"} Drafts
              </Button>
            </CardHeader>
            <CardContent>
              {mention.drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No drafts yet. Click Generate to create reply suggestions.
                </p>
              ) : (
                <div className="space-y-4">
                  {mention.drafts.map((draft) => (
                    <div key={draft.id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant="secondary">
                          {variantLabel[draft.variant] || draft.variant}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(draft.text)}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {draft.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mention.status === "new" ? (
                <>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      await updateStatus("reviewed");
                      router.push("/");
                    }}
                  >
                    Archive & Next
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={async () => {
                      await updateStatus("replied");
                      router.push("/");
                    }}
                  >
                    Mark Replied & Next
                  </Button>
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={async () => {
                      await updateStatus("ignored");
                      router.push("/");
                    }}
                  >
                    Ignore & Next
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="warning" className="mb-2">
                    {mention.status}
                  </Badge>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => updateStatus("new")}
                  >
                    Move Back to Inbox
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Score</dt>
                  <dd className={`font-bold ${mention.score >= 85 ? "text-emerald-600" : mention.score >= 70 ? "text-amber-600" : "text-gray-500"}`}>
                    {mention.score}/100
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Relevant</dt>
                  <dd>{mention.relevant ? "Yes" : "No"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Intent</dt>
                  <dd>{mention.intent?.replace(/_/g, " ") || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Audience</dt>
                  <dd>{mention.audience || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Urgency</dt>
                  <dd className={mention.urgency === "high" ? "text-red-600 font-semibold" : ""}>
                    {mention.urgency || "—"}
                  </dd>
                </div>
                {mention.reason && (
                  <div>
                    <dt className="text-muted-foreground mb-1">Reason</dt>
                    <dd className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {mention.reason}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
