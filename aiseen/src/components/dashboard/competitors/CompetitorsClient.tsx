"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, RefreshCw, TrendingUp } from "lucide-react";

interface Competitor {
  id: string;
  store_id: string;
  name: string;
  mention_count: number;
  created_at: string;
}

interface Store {
  id: string;
  brand_name: string | null;
  store_url: string;
  platform: string;
}

export function CompetitorsClient({ stores, initialStoreId }: { stores: Store[]; initialStoreId?: string }) {
  const [storeId, setStoreId] = useState(initialStoreId ?? stores[0]?.id ?? "");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCompetitors = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/competitors?store_id=${sid}`);
      const data = await res.json() as { competitors: Competitor[] };
      setCompetitors(data.competitors ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useState(() => { if (storeId) fetchCompetitors(storeId); });

  function handleStoreChange(sid: string) {
    setStoreId(sid);
    fetchCompetitors(sid);
  }

  const maxMentions = competitors[0]?.mention_count ?? 1;

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
          onClick={() => fetchCompetitors(storeId)}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty state */}
      {!loading && competitors.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-muted-foreground">No competitors tracked yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Competitor brands are auto-detected when monitoring runs.
          </p>
        </div>
      )}

      {/* Competitor bars */}
      {competitors.length > 0 && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {competitors.map((c, i) => {
            const pct = Math.round((c.mention_count / maxMentions) * 100);
            return (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3">
                <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {c.mention_count} mention{c.mention_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
