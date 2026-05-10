"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, RefreshCw } from "lucide-react";

interface MentionQueryRun {
  provider: string;
  model: string;
  query_id: string;
  queries: { query_text: string; category: string | null; intent: string | null } | null;
}

interface Mention {
  id: string;
  store_id: string;
  entity_name: string;
  position: number | null;
  context_snippet: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  description_in_response: string | null;
  reasons_cited: string[] | null;
  created_at: string;
  query_runs: MentionQueryRun | null;
}

interface Store {
  id: string;
  brand_name: string | null;
  store_url: string;
  platform: string;
}

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-green-50 text-green-700",
  neutral: "bg-gray-50 text-gray-600",
  negative: "bg-red-50 text-red-700",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export function MentionsClient({ stores, initialStoreId }: { stores: Store[]; initialStoreId?: string }) {
  const [storeId, setStoreId] = useState(initialStoreId ?? stores[0]?.id ?? "");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("all");
  const [sentiment, setSentiment] = useState("all");

  const fetchMentions = useCallback(async (sid: string, prov: string, sent: string) => {
    if (!sid) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ store_id: sid });
      if (prov !== "all") params.set("provider", prov);
      if (sent !== "all") params.set("sentiment", sent);
      const res = await fetch(`/api/mentions?${params}`);
      const data = await res.json() as { mentions: Mention[] };
      setMentions(data.mentions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useState(() => { if (storeId) fetchMentions(storeId, "all", "all"); });

  function handleStoreChange(sid: string) {
    setStoreId(sid);
    fetchMentions(sid, provider, sentiment);
  }

  function handleProviderChange(p: string) {
    setProvider(p);
    fetchMentions(storeId, p, sentiment);
  }

  function handleSentimentChange(s: string) {
    setSentiment(s);
    fetchMentions(storeId, provider, s);
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

        <Select value={provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            <SelectItem value="openai">ChatGPT</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="perplexity">Perplexity</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sentiment} onValueChange={handleSentimentChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All sentiments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sentiments</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMentions(storeId, provider, sentiment)}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty state */}
      {!loading && mentions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-muted-foreground">No mentions detected yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Run monitoring from the Stores page to detect brand mentions.
          </p>
        </div>
      )}

      {/* Mention cards */}
      <div className="space-y-3">
        {mentions.map((m) => {
          const qr = m.query_runs;
          const providerLabel = qr ? (PROVIDER_LABELS[qr.provider] ?? qr.provider) : null;
          const queryText = qr?.queries?.query_text;
          const category = qr?.queries?.category;

          return (
            <div key={m.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {providerLabel && (
                    <Badge variant="outline" className="text-xs shrink-0">{providerLabel}</Badge>
                  )}
                  {category && (
                    <span className="text-xs text-muted-foreground shrink-0">{category}</span>
                  )}
                  {m.position != null && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      Position #{m.position}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.sentiment && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      SENTIMENT_STYLE[m.sentiment] ?? "bg-gray-50 text-gray-600"
                    }`}>
                      {m.sentiment}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {queryText && (
                <p className="text-sm font-medium text-foreground/80 truncate">
                  &ldquo;{queryText}&rdquo;
                </p>
              )}

              {m.description_in_response && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {m.description_in_response}
                </p>
              )}

              {m.context_snippet && !m.description_in_response && (
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  {m.context_snippet}
                </p>
              )}

              {m.reasons_cited && m.reasons_cited.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.reasons_cited.map((r, i) => (
                    <span
                      key={i}
                      className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
