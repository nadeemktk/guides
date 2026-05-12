"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  TrendingUp,
  TrendingDown,
  Lock,
  ArrowRight,
} from "lucide-react";

interface AuditSummary {
  status: string;
  step?: string;
  completedQueries?: number;
  totalQueries?: number;
  visibilityScore?: number;
  winningQueries?: Array<{ query: string; providers: string[]; competitors: string[] }>;
  losingQueries?: Array<{ query: string; competitors: string[] }>;
  topCompetitors?: Array<{ name: string; mentionCount: number }>;
  allQueries?: Array<{
    query: string;
    category: string;
    results: Record<string, { mentioned: boolean; position: number | null; sentiment: string | null; competitors: string[] }>;
  }>;
}

interface AuditData {
  id: string;
  store_url: string;
  brand_name: string | null;
  visibility_score: number | null;
  summary: AuditSummary | null;
  full_report_unlocked: boolean;
  created_at: string;
}

function ScoreGauge({ score }: { score: number }) {
  const label =
    score <= 30 ? "Invisible" : score <= 60 ? "Emerging" : score <= 80 ? "Strong" : "Dominant";
  const color =
    score <= 30
      ? "text-red-500"
      : score <= 60
      ? "text-yellow-500"
      : score <= 80
      ? "text-blue-500"
      : "text-green-500";
  const bgColor =
    score <= 30
      ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
      : score <= 60
      ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900"
      : score <= 80
      ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
      : "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900";

  return (
    <div className={`rounded-2xl border p-8 text-center ${bgColor}`}>
      <div className={`text-7xl font-bold mb-2 ${color}`}>{score}</div>
      <div className="text-sm text-muted-foreground mb-1">AI Visibility Score</div>
      <Badge
        variant={score > 60 ? "success" : score > 30 ? "warning" : "destructive"}
        className="text-sm px-3 py-0.5"
      >
        {label}
      </Badge>
      <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="text-red-400">0–30 Invisible</span>
        <span className="text-yellow-400">31–60 Emerging</span>
        <span className="text-blue-400">61–80 Strong</span>
        <span className="text-green-400">81–100 Dominant</span>
      </div>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    openai: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
    gemini: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
    perplexity: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    anthropic: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  };
  const labels: Record<string, string> = {
    openai: "ChatGPT",
    gemini: "Gemini",
    perplexity: "Perplexity",
    anthropic: "Claude",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[provider] ?? "bg-secondary text-secondary-foreground"
      }`}
    >
      {labels[provider] ?? provider}
    </span>
  );
}

function EmailGate({
  auditId,
  onUnlock,
}: {
  auditId: string;
  onUnlock: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? "Failed to unlock");
      }
      setSent(true);
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle className="h-8 w-8 text-green-500" />
        <p className="font-medium">Full report sent to {email}</p>
        <p className="text-sm text-muted-foreground">Check your inbox — it arrives within 60 seconds.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="unlock-email">Enter your email to unlock the full report</Label>
        <div className="flex gap-2">
          <Input
            id="unlock-email"
            type="email"
            placeholder="you@yourstore.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !email}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <Mail className="h-4 w-4 mr-1" />
                Send report
              </>
            )}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        We&apos;ll send you all 25 queries, competitor breakdown, and top 5 fixes.
        No spam — unsubscribe anytime.
      </p>
    </form>
  );
}

function ProgressDisplay({ summary }: { summary: AuditSummary }) {
  const stepLabels: Record<string, string> = {
    queued: "Queued for analysis...",
    pending: "Starting analysis...",
    scraping: "Scraping your product catalog...",
    generating: "Generating shopping queries with AI...",
    running: `Running queries across ChatGPT, Gemini, and Claude...`,
    scoring: "Computing visibility score...",
  };

  const label = stepLabels[summary.step ?? "pending"] ?? "Processing...";
  const progress =
    summary.step === "running" && summary.totalQueries
      ? Math.round(((summary.completedQueries ?? 0) / summary.totalQueries) * 100)
      : summary.step === "scoring"
      ? 95
      : summary.step === "generating"
      ? 20
      : summary.step === "scraping"
      ? 10
      : 5;

  return (
    <div className="text-center py-8 space-y-4">
      <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
      <p className="font-medium">{label}</p>
      {summary.step === "running" && summary.totalQueries && (
        <p className="text-sm text-muted-foreground">
          {summary.completedQueries ?? 0} of {summary.totalQueries} queries complete
        </p>
      )}
      {/* Progress bar */}
      <div className="max-w-xs mx-auto bg-secondary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        This typically takes 60–90 seconds. Don&apos;t close this tab.
      </p>
    </div>
  );
}

export function AuditResultClient({ auditId, initialData }: { auditId: string; initialData: AuditData }) {
  const [data, setData] = useState<AuditData>(initialData);
  const [reportUnlocked, setReportUnlocked] = useState(initialData.full_report_unlocked);

  const isCompleted = data.summary?.status === "completed";
  const isFailed = data.summary?.status === "failed";

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/audits/${auditId}`, { cache: "no-store" });
      if (res.ok) {
        const newData = await res.json() as AuditData;
        setData(newData);
        if (newData.full_report_unlocked) setReportUnlocked(true);
        return newData.summary?.status === "completed" || newData.summary?.status === "failed";
      }
    } catch {}
    return false;
  }, [auditId]);

  useEffect(() => {
    if (isCompleted || isFailed) return;

    const interval = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(interval);
    }, 2500);

    return () => clearInterval(interval);
  }, [isCompleted, isFailed, poll]);

  const summary = data.summary;

  if (isFailed) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Audit failed</h2>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t complete the audit for this store. This sometimes happens with stores that block scrapers.
        </p>
        <Button asChild>
          <a href="/free-audit">Try a different URL</a>
        </Button>
      </div>
    );
  }

  if (!isCompleted || !summary) {
    return <ProgressDisplay summary={summary ?? { status: "pending" }} />;
  }

  const score = data.visibility_score ?? summary.visibilityScore ?? 0;
  const brandName = data.brand_name ?? data.store_url;
  const winningQueries = summary.winningQueries ?? [];
  const losingQueries = summary.losingQueries ?? [];
  const topCompetitors = summary.topCompetitors ?? [];
  const allQueries = summary.allQueries ?? [];

  return (
    <div className="space-y-8">
      {/* Score */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          AI Visibility Score for {brandName}
        </h2>
        <ScoreGauge score={score} />
      </div>

      <Separator />

      {/* Winning queries */}
      {winningQueries.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h3 className="font-semibold">Queries you&apos;re winning</h3>
          </div>
          <div className="space-y-3">
            {winningQueries.map((wq, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{wq.query}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {wq.providers.map((p) => <ProviderBadge key={p} provider={p} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Losing queries */}
      {losingQueries.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold">Queries you&apos;re losing</h3>
          </div>
          <div className="space-y-3">
            {losingQueries.map((lq, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{lq.query}</p>
                  {lq.competitors.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      AI mentioned instead: {lq.competitors.slice(0, 3).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Email gate for full report */}
      {!reportUnlocked ? (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Unlock the full report</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {allQueries.length > 3 ? `See all ${allQueries.length} queries,` : "See"} your complete competitor breakdown, and the top 5 fixes to improve your score.
            </p>
          </CardHeader>
          <CardContent>
            <EmailGate auditId={auditId} onUnlock={() => setReportUnlocked(true)} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top competitors */}
          {topCompetitors.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Competitors beating you</h3>
              <div className="space-y-2">
                {topCompetitors.slice(0, 8).map((comp, i) => (
                  <div key={comp.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}</span>
                      <span className="text-sm font-medium">{comp.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      mentioned {comp.mentionCount}× across your queries
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All queries table */}
          {allQueries.length > 3 && (
            <div>
              <h3 className="font-semibold mb-4">All {allQueries.length} queries</h3>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-3 font-medium">Query</th>
                      <th className="text-center p-3 font-medium">ChatGPT</th>
                      <th className="text-center p-3 font-medium">Gemini</th>
                      <th className="text-center p-3 font-medium">Claude</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allQueries.map((q, i) => (
                      <tr key={i} className="hover:bg-secondary/30">
                        <td className="p-3 max-w-xs">
                          <span className="line-clamp-2">{q.query}</span>
                        </td>
                        {(["openai", "gemini", "anthropic"] as const).map((provider) => {
                          const r = q.results[provider];
                          return (
                            <td key={provider} className="p-3 text-center">
                              {r ? (
                                r.mentioned ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                                )
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upgrade CTA */}
      <div className="text-center border border-border rounded-xl p-8 bg-secondary/20">
        <p className="font-semibold mb-2">Track this score continuously</p>
        <p className="text-sm text-muted-foreground mb-5">
          Get weekly or daily monitoring, recommendations, and automatic fixes on the Starter, Growth, or Pro plan.
        </p>
        <Button asChild>
          <a href="/pricing">
            See plans <ArrowRight className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
