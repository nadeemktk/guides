"use client";

import { useState, useCallback, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";

interface Query {
  id: string;
  store_id: string;
  query_text: string;
  category: string | null;
  intent: string | null;
  is_active: boolean;
  created_at: string;
}

interface Store {
  id: string;
  brand_name: string | null;
  store_url: string;
  platform: string;
}

const INTENT_COLORS: Record<string, string> = {
  commercial: "bg-blue-50 text-blue-700",
  informational: "bg-purple-50 text-purple-700",
  navigational: "bg-gray-50 text-gray-600",
};

export function QueriesClient({ stores, initialStoreId }: { stores: Store[]; initialStoreId?: string }) {
  const [storeId, setStoreId] = useState(initialStoreId ?? stores[0]?.id ?? "");
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, startGenerating] = useTransition();
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const fetchQueries = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/queries?store_id=${sid}`);
      const data = await res.json() as { queries: Query[] };
      setQueries(data.queries ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and store change
  useState(() => { if (storeId) fetchQueries(storeId); });

  function handleStoreChange(sid: string) {
    setStoreId(sid);
    setGenMsg(null);
    fetchQueries(sid);
  }

  async function toggleQuery(q: Query) {
    const newActive = !q.is_active;
    // Optimistic update
    setQueries((prev) => prev.map((x) => x.id === q.id ? { ...x, is_active: newActive } : x));
    await fetch("/api/queries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, is_active: newActive }),
    });
  }

  function handleGenerate() {
    if (!storeId) return;
    setGenMsg(null);
    startGenerating(async () => {
      const res = await fetch(`/api/stores/${storeId}/generate-queries`, { method: "POST" });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) { setGenMsg(`Error: ${data.error}`); return; }
      setGenMsg("Query generation started — refresh in a moment to see results.");
      setTimeout(() => fetchQueries(storeId), 5000);
    });
  }

  const visible = queries.filter((q) =>
    filter === "all" ? true : filter === "active" ? q.is_active : !q.is_active
  );

  // Group by category
  const grouped = visible.reduce<Record<string, Query[]>>((acc, q) => {
    const key = q.category ?? "Uncategorized";
    (acc[key] ??= []).push(q);
    return acc;
  }, {});

  const activeCount = queries.filter((q) => q.is_active).length;
  const selectedStore = stores.find((s) => s.id === storeId);

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

        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({queries.length})</SelectItem>
            <SelectItem value="active">Active ({activeCount})</SelectItem>
            <SelectItem value="inactive">Inactive ({queries.length - activeCount})</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchQueries(storeId)}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generating || !storeId}
          className="ml-auto"
        >
          {generating ? "Generating…" : "Generate queries"}
        </Button>
      </div>

      {genMsg && <p className="text-sm text-muted-foreground">{genMsg}</p>}

      {/* Empty state */}
      {!loading && queries.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
          <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-muted-foreground">No queries yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
            {selectedStore
              ? "Sync your catalog first, then generate queries."
              : "Select a store to view its queries."}
          </p>
          {storeId && (
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              Generate queries
            </Button>
          )}
        </div>
      )}

      {/* Grouped query list */}
      {Object.keys(grouped).sort().map((category) => (
        <section key={category}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {category} ({grouped[category].length})
          </h3>
          <div className="space-y-1">
            {grouped[category].map((q) => (
              <div
                key={q.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm transition-colors ${
                  q.is_active
                    ? "border-border bg-card"
                    : "border-border/50 bg-muted/30 opacity-60"
                }`}
              >
                <span className="flex-1 truncate">{q.query_text}</span>
                {q.intent && (
                  <span className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    INTENT_COLORS[q.intent] ?? "bg-gray-50 text-gray-600"
                  }`}>
                    {q.intent}
                  </span>
                )}
                <button
                  onClick={() => toggleQuery(q)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  title={q.is_active ? "Deactivate" : "Activate"}
                >
                  {q.is_active
                    ? <ToggleRight className="h-4 w-4 text-primary" />
                    : <ToggleLeft className="h-4 w-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
