"use client";

import { useState, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";
import { VisibilityLineChart } from "@/components/charts/VisibilityLineChart";

interface Snapshot {
  snapshot_date: string;
  visibility_score: number | null;
  total_queries_run: number | null;
  queries_with_mention: number | null;
  avg_position: number | null;
  share_of_voice: number | null;
  by_provider: Record<string, number> | null;
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

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-emerald-500",
  gemini: "bg-blue-500",
  perplexity: "bg-purple-500",
};

export function TrendsClient({ stores, initialStoreId }: { stores: Store[]; initialStoreId?: string }) {
  const [storeId, setStoreId] = useState(initialStoreId ?? stores[0]?.id ?? "");
  const [days, setDays] = useState("30");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSnapshots = useCallback(async (sid: string, d: string) => {
    if (!sid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/snapshots?store_id=${sid}&days=${d}`);
      if (!res.ok) return;
      const json = await res.json() as { snapshots: Snapshot[] };
      setSnapshots(json.snapshots ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useState(() => { if (storeId) fetchSnapshots(storeId, days); });

  function handleStoreChange(sid: string) {
    setStoreId(sid);
    fetchSnapshots(sid, days);
  }

  function handleDaysChange(d: string) {
    setDays(d);
    fetchSnapshots(storeId, d);
  }

  const latest = snapshots[snapshots.length - 1];
  const first = snapshots[0];
  const scoreDelta =
    latest && first && latest !== first
      ? Number(latest.visibility_score ?? 0) - Number(first.visibility_score ?? 0)
      : null;

  // Collect unique providers from all snapshots
  const providers = [...new Set(
    snapshots.flatMap((s) => s.by_provider ? Object.keys(s.by_provider) : [])
  )];

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
        <Select value={days} onValueChange={handleDaysChange}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSnapshots(storeId, days)}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty state */}
      {!loading && snapshots.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-muted-foreground">Not enough data yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Trend charts appear after your first monitoring run.
          </p>
        </div>
      )}

      {snapshots.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Current Score</p>
              <p className="text-2xl font-bold">
                {latest.visibility_score != null ? Number(latest.visibility_score).toFixed(1) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Change ({days}d)</p>
              <p className={`text-2xl font-bold ${
                scoreDelta == null ? "text-muted-foreground/30"
                  : scoreDelta > 0 ? "text-green-600"
                  : scoreDelta < 0 ? "text-red-500"
                  : "text-muted-foreground"
              }`}>
                {scoreDelta == null ? "—"
                  : scoreDelta > 0 ? `+${scoreDelta.toFixed(1)}`
                  : scoreDelta.toFixed(1)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Data points</p>
              <p className="text-2xl font-bold">{snapshots.length}</p>
            </div>
          </div>

          {/* Line chart */}
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Visibility Score Over Time
            </p>
            <VisibilityLineChart snapshots={snapshots} />
          </div>

          {/* Per-provider breakdown table */}
          {providers.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Latest Score by Provider
              </p>
              <div className="space-y-3">
                {providers.map((provider) => {
                  const pScore = latest.by_provider?.[provider];
                  const pct = pScore != null ? Math.round((pScore / 100) * 100) : 0;
                  return (
                    <div key={provider}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{PROVIDER_LABELS[provider] ?? provider}</span>
                        <span className="text-muted-foreground">
                          {pScore != null ? Number(pScore).toFixed(1) : "—"}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${PROVIDER_COLORS[provider] ?? "bg-primary/70"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
