"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Minus, MessageSquare, Search, Users, LayoutDashboard } from "lucide-react";

interface ByProvider {
  openai?: number;
  gemini?: number;
  perplexity?: number;
  [key: string]: number | undefined;
}

interface LatestSnapshot {
  snapshot_date: string;
  visibility_score: number | null;
  total_queries_run: number | null;
  queries_with_mention: number | null;
  avg_position: number | null;
  share_of_voice: number | null;
  by_provider: ByProvider | null;
}

interface OverviewData {
  store: { id: string; brand_name: string | null; store_url: string };
  latest: LatestSnapshot | null;
  scoreDelta: number | null;
  mentionCount: number;
  activeQueryCount: number;
  competitorCount: number;
}

interface Store {
  id: string;
  brand_name: string | null;
  store_url: string;
  platform: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const color =
    clamped >= 60 ? "text-green-600" : clamped >= 35 ? "text-yellow-600" : "text-red-500";

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className={`text-6xl font-bold tabular-nums ${color}`}>
        {clamped.toFixed(0)}
      </div>
      <div className="text-xs text-muted-foreground mt-1">/ 100 visibility score</div>
      <div className="mt-3 w-48 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            clamped >= 60 ? "bg-green-500" : clamped >= 35 ? "bg-yellow-500" : "bg-red-400"
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-muted-foreground">—</span>;
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-600">
        <TrendingUp className="h-3 w-3" />+{abs} vs last week
      </span>
    );
  if (delta < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-500">
        <TrendingDown className="h-3 w-3" />-{abs} vs last week
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />No change
    </span>
  );
}

export function OverviewClient({ stores, initialStoreId }: { stores: Store[]; initialStoreId?: string }) {
  const [storeId, setStoreId] = useState(initialStoreId ?? stores[0]?.id ?? "");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOverview = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/overview?store_id=${sid}`);
      if (!res.ok) return;
      const json = await res.json() as OverviewData;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useState(() => { if (storeId) fetchOverview(storeId); });

  function handleStoreChange(sid: string) {
    setStoreId(sid);
    fetchOverview(sid);
  }

  const score = data?.latest?.visibility_score != null ? Number(data.latest.visibility_score) : null;
  const byProvider = data?.latest?.by_provider;

  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
        <LayoutDashboard className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-muted-foreground">No stores connected yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
          Connect your store to start tracking AI visibility.
        </p>
        <Link
          href="/stores"
          className="inline-flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Connect a store
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {stores.length > 1 && (
          <Select value={storeId} onValueChange={handleStoreChange}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.brand_name ?? s.store_url}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOverview(storeId)}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* No data yet */}
      {!loading && !data?.latest && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
          <LayoutDashboard className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-muted-foreground">No monitoring data yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
            Run monitoring from the Stores page to see your visibility score.
          </p>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Stores
          </Link>
        </div>
      )}

      {/* Stat cards + score */}
      {data?.latest && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Visibility Score */}
            <div className="sm:col-span-2 lg:col-span-1 rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Visibility Score</p>
              {score != null ? (
                <>
                  <p className="text-2xl font-bold">{score.toFixed(1)}</p>
                  <div className="mt-1">
                    <DeltaBadge delta={data.scoreDelta} />
                  </div>
                </>
              ) : (
                <p className="text-2xl font-bold text-muted-foreground/30">—</p>
              )}
            </div>

            {/* Mentions */}
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Total Mentions</p>
              <p className="text-2xl font-bold">{data.mentionCount}</p>
              <Link href="/mentions" className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <MessageSquare className="h-3 w-3" /> View mentions
              </Link>
            </div>

            {/* Queries */}
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Active Queries</p>
              <p className="text-2xl font-bold">{data.activeQueryCount}</p>
              <Link href="/queries" className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Search className="h-3 w-3" /> Manage queries
              </Link>
            </div>

            {/* Competitors */}
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Competitors Tracked</p>
              <p className="text-2xl font-bold">{data.competitorCount}</p>
              <Link href="/competitors" className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Users className="h-3 w-3" /> View competitors
              </Link>
            </div>
          </div>

          {/* Score gauge + provider breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Overall Score
              </p>
              {score != null ? (
                <ScoreGauge score={score} />
              ) : (
                <p className="text-center text-muted-foreground py-10">No score yet</p>
              )}
              {data.latest.snapshot_date && (
                <p className="text-xs text-muted-foreground text-center">
                  Last run: {new Date(data.latest.snapshot_date + "T00:00:00").toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Score by Provider
              </p>
              {byProvider && Object.keys(byProvider).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(byProvider).map(([provider, pScore]) => {
                    if (pScore == null) return null;
                    const pct = Math.round((pScore / 100) * 100);
                    return (
                      <div key={provider}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{PROVIDER_LABELS[provider] ?? provider}</span>
                          <span className="text-muted-foreground">{Number(pScore).toFixed(1)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No provider breakdown available yet.
                </p>
              )}

              {/* Sub-metrics */}
              <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-3 text-center">
                {data.latest.avg_position != null && (
                  <div>
                    <p className="text-lg font-semibold">{Number(data.latest.avg_position).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Avg position</p>
                  </div>
                )}
                {data.latest.share_of_voice != null && (
                  <div>
                    <p className="text-lg font-semibold">{(Number(data.latest.share_of_voice) * 100).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Share of voice</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trends link */}
          <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Visibility trends over time</p>
              <p className="text-xs text-muted-foreground">See how your score changes day by day.</p>
            </div>
            <Link
              href="/trends"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              View trends →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
