"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { fetcher, apiFetch } from "@/lib/api";

interface Source {
  id: string;
  type: string;
  value: string;
  name: string | null;
  enabled: boolean;
}

type Settings = Record<string, string>;

const sourceTypeLabels: Record<string, string> = {
  subreddit: "Subreddits",
  reddit_query: "Reddit Search Queries",
  rss_feed: "RSS Feeds",
  search_query: "Web Search Queries",
  x_query: "X (Twitter) Queries",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function SourcesPage() {
  const { data: sources, mutate: mutateSources } = useSWR<Source[]>("/api/sources", (url: string) => fetcher<Source[]>(url));
  const { data: settings, mutate: mutateSettings } = useSWR<Settings>("/api/sources/settings", (url: string) => fetcher<Settings>(url));

  const [newType, setNewType] = useState("subreddit");
  const [newValue, setNewValue] = useState("");
  const [newName, setNewName] = useState("");
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState<string | null>(null);

  const addSource = async () => {
    if (!newValue.trim()) return;
    await apiFetch("/api/sources", {
      method: "POST",
      body: JSON.stringify({ type: newType, value: newValue.trim(), name: newName.trim() || null }),
    });
    setNewValue("");
    setNewName("");
    mutateSources();
  };

  const toggleSource = async (id: string, enabled: boolean) => {
    await apiFetch(`/api/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !enabled }),
    });
    mutateSources();
  };

  const deleteSource = async (id: string) => {
    await apiFetch(`/api/sources/${id}`, { method: "DELETE" });
    mutateSources();
  };

  const updateSetting = async (key: string, value: string) => {
    await apiFetch("/api/sources/settings", {
      method: "PUT",
      body: JSON.stringify({ [key]: value }),
    });
    mutateSettings();
  };

  const runJob = async (type: string) => {
    setRunningJob(type);
    setJobMessage(null);
    const label = type === "all" ? "All collectors" : type.charAt(0).toUpperCase() + type.slice(1);
    try {
      await fetch(`${API}/api/jobs/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      setJobMessage(`${label} triggered — running in background`);
      setTimeout(() => setJobMessage(null), 15000);
    } catch {
      setJobMessage(`Failed to trigger ${label}`);
    } finally {
      setRunningJob(null);
    }
  };

  const grouped = (sources || []).reduce<Record<string, Source[]>>((acc, s) => {
    if (!acc[s.type]) acc[s.type] = [];
    acc[s.type].push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Sources & Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your monitoring sources and configure settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sources */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add new source */}
          <Card>
            <CardHeader>
              <CardTitle>Add Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-44"
                >
                  <option value="subreddit">Subreddit</option>
                  <option value="reddit_query">Reddit Query</option>
                  <option value="rss_feed">RSS Feed</option>
                  <option value="search_query">Search Query</option>
                  <option value="x_query">X Query</option>
                </Select>
                <Input
                  placeholder={
                    newType === "subreddit"
                      ? "e.g. WeAreTheMusicMakers"
                      : newType === "rss_feed"
                        ? "e.g. https://example.com/feed"
                        : 'e.g. "electronic press kit"'
                  }
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="flex-1 min-w-[200px]"
                  onKeyDown={(e) => e.key === "Enter" && addSource()}
                />
                <Input
                  placeholder="Display name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-44"
                />
                <Button onClick={addSource}>Add</Button>
              </div>
            </CardContent>
          </Card>

          {/* Source lists by type */}
          {(["subreddit", "reddit_query", "rss_feed", "search_query", "x_query"] as const).map(
            (type) => (
              <Card key={type}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{sourceTypeLabels[type]}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {(grouped[type] || []).filter((s) => s.enabled).length}/
                    {(grouped[type] || []).length} active
                  </span>
                </CardHeader>
                <CardContent>
                  {!grouped[type] || grouped[type].length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No {sourceTypeLabels[type].toLowerCase()} configured.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {grouped[type].map((source) => (
                        <div
                          key={source.id}
                          className={`flex items-center justify-between rounded-lg border p-3 ${
                            source.enabled ? "" : "opacity-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {source.name || source.value}
                              </span>
                              {source.name && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {source.value}
                                </span>
                              )}
                              <Badge variant={source.enabled ? "success" : "secondary"}>
                                {source.enabled ? "on" : "off"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleSource(source.id, source.enabled)}
                            >
                              {source.enabled ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteSource(source.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Settings sidebar */}
        <div className="space-y-6">
          {/* Run Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Run Jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {jobMessage && (
                <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  {jobMessage}
                </div>
              )}
              <Button className="w-full" variant="outline" disabled={!!runningJob} onClick={() => runJob("reddit")}>
                {runningJob === "reddit" ? "Running..." : "Run Reddit Now"}
              </Button>
              <Button className="w-full" variant="outline" disabled={!!runningJob} onClick={() => runJob("rss")}>
                {runningJob === "rss" ? "Running..." : "Run RSS Now"}
              </Button>
              <Button className="w-full" variant="outline" disabled={!!runningJob} onClick={() => runJob("search")}>
                {runningJob === "search" ? "Running..." : "Run Search Now"}
              </Button>
              <Button className="w-full" variant="outline" disabled={!!runningJob} onClick={() => runJob("x")}>
                {runningJob === "x" ? "Running..." : "Run X Now"}
              </Button>
              <Button className="w-full" variant="outline" disabled={!!runningJob} onClick={() => runJob("digest")}>
                {runningJob === "digest" ? "Running..." : "Run Digest Now"}
              </Button>
              <Button className="w-full" disabled={!!runningJob} onClick={() => runJob("all")}>
                {runningJob === "all" ? "Running..." : "Run All Collectors"}
              </Button>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Digest Threshold</label>
                <p className="text-xs text-muted-foreground mb-1">
                  Min score for auto-generating drafts & digest inclusion
                </p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings?.score_threshold ?? "70"}
                  onChange={(e) => updateSetting("score_threshold", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Min Store Score</label>
                <p className="text-xs text-muted-foreground mb-1">
                  Min score to save a mention (lower = capture more leads)
                </p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings?.min_store_score ?? "40"}
                  onChange={(e) => updateSetting("min_store_score", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max History (days)</label>
                <p className="text-xs text-muted-foreground mb-1">
                  Ignore posts older than this (default 183 = ~6 months)
                </p>
                <Input
                  type="number"
                  min={1}
                  max={730}
                  value={settings?.max_history_days ?? "183"}
                  onChange={(e) => updateSetting("max_history_days", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reddit Interval (min)</label>
                <Input
                  type="number"
                  min={5}
                  value={settings?.reddit_interval_minutes ?? "60"}
                  onChange={(e) => updateSetting("reddit_interval_minutes", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">RSS Interval (min)</label>
                <Input
                  type="number"
                  min={5}
                  value={settings?.rss_interval_minutes ?? "60"}
                  onChange={(e) => updateSetting("rss_interval_minutes", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Search Interval (hours)</label>
                <Input
                  type="number"
                  min={1}
                  value={settings?.search_interval_hours ?? "6"}
                  onChange={(e) => updateSetting("search_interval_hours", e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Note: interval changes take effect on next server restart.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
