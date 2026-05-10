import type { MentionResult } from "./mentionDetector";
import type { GeneratedQuery } from "@/types";
import type { FreeAuditProvider, LLMResult } from "./llmRunner";

export interface QueryResult {
  query: GeneratedQuery;
  results: Record<FreeAuditProvider, {
    mentioned: boolean;
    position: number | null;
    contextSnippet: string | null;
    sentiment: "positive" | "neutral" | "negative" | null;
    competitors: Array<{ name: string; position: number }>;
    responseText: string;
    error?: string;
  }>;
}

export interface AuditScore {
  visibilityScore: number;
  mentionRate: number;
  avgPosition: number;
  shareOfVoice: number;
  positiveSentimentRatio: number;
  totalQueriesRun: number;
  queriesWithMention: number;
  byProvider: Record<FreeAuditProvider, {
    mentionRate: number;
    avgPosition: number;
  }>;
}

export function computeScore(queryResults: QueryResult[]): AuditScore {
  const providers: FreeAuditProvider[] = ["openai", "gemini", "perplexity"];

  let totalRuns = 0;
  let runsWithMention = 0;
  let positionSum = 0;
  let positionCount = 0;
  let ownMentions = 0;
  let competitorMentions = 0;
  let positiveMentions = 0;
  let sentimentMentionCount = 0;

  const byProvider: Record<string, { mentionCount: number; positionSum: number; positionCount: number; totalRuns: number }> = {};
  for (const p of providers) {
    byProvider[p] = { mentionCount: 0, positionSum: 0, positionCount: 0, totalRuns: 0 };
  }

  for (const qr of queryResults) {
    let queryHadMention = false;

    for (const provider of providers) {
      const result = qr.results[provider];
      if (!result) continue;

      totalRuns++;
      byProvider[provider].totalRuns++;

      if (result.mentioned) {
        queryHadMention = true;
        ownMentions++;
        byProvider[provider].mentionCount++;

        if (result.position !== null) {
          positionSum += result.position;
          positionCount++;
          byProvider[provider].positionSum += result.position;
          byProvider[provider].positionCount++;
        }

        if (result.sentiment) {
          sentimentMentionCount++;
          if (result.sentiment === "positive") positiveMentions++;
        }
      }

      // Count competitor mentions
      competitorMentions += result.competitors.length;
    }

    if (queryHadMention) runsWithMention++;
  }

  const mentionRate = totalRuns > 0 ? ownMentions / totalRuns : 0;
  const avgPosition = positionCount > 0 ? positionSum / positionCount : 10;
  const shareOfVoice = ownMentions + competitorMentions > 0
    ? ownMentions / (ownMentions + competitorMentions)
    : 0;
  const positiveSentimentRatio = sentimentMentionCount > 0
    ? positiveMentions / sentimentMentionCount
    : 0;

  // Formula from spec:
  // visibility_score = (0.40 * mention_rate + 0.25 * (1 - (avg_pos - 1) / 10) + 0.20 * share_of_voice + 0.15 * positive_sentiment_ratio) * 100
  const positionScore = Math.max(0, 1 - (avgPosition - 1) / 10);
  const rawScore =
    0.4 * mentionRate +
    0.25 * positionScore +
    0.2 * shareOfVoice +
    0.15 * positiveSentimentRatio;

  const visibilityScore = Math.round(Math.min(100, Math.max(0, rawScore * 100)));

  const byProviderResult: Record<FreeAuditProvider, { mentionRate: number; avgPosition: number }> = {
    openai: {
      mentionRate: byProvider.openai.totalRuns > 0 ? byProvider.openai.mentionCount / byProvider.openai.totalRuns : 0,
      avgPosition: byProvider.openai.positionCount > 0 ? byProvider.openai.positionSum / byProvider.openai.positionCount : 0,
    },
    gemini: {
      mentionRate: byProvider.gemini.totalRuns > 0 ? byProvider.gemini.mentionCount / byProvider.gemini.totalRuns : 0,
      avgPosition: byProvider.gemini.positionCount > 0 ? byProvider.gemini.positionSum / byProvider.gemini.positionCount : 0,
    },
    perplexity: {
      mentionRate: byProvider.perplexity.totalRuns > 0 ? byProvider.perplexity.mentionCount / byProvider.perplexity.totalRuns : 0,
      avgPosition: byProvider.perplexity.positionCount > 0 ? byProvider.perplexity.positionSum / byProvider.perplexity.positionCount : 0,
    },
  };

  return {
    visibilityScore,
    mentionRate,
    avgPosition,
    shareOfVoice,
    positiveSentimentRatio,
    totalQueriesRun: queryResults.length,
    queriesWithMention: Math.round(mentionRate * queryResults.length),
    byProvider: byProviderResult,
  };
}

export function getWinningQueries(
  queryResults: QueryResult[],
  limit: number = 3
): QueryResult[] {
  return queryResults
    .filter((qr) =>
      Object.values(qr.results).some((r) => r.mentioned)
    )
    .sort((a, b) => {
      const aMentions = Object.values(a.results).filter((r) => r.mentioned).length;
      const bMentions = Object.values(b.results).filter((r) => r.mentioned).length;
      return bMentions - aMentions;
    })
    .slice(0, limit);
}

export function getLosingQueries(
  queryResults: QueryResult[],
  limit: number = 3
): QueryResult[] {
  return queryResults
    .filter((qr) =>
      !Object.values(qr.results).some((r) => r.mentioned)
    )
    .sort((a, b) => {
      const aCompetitors = Object.values(a.results).flatMap((r) => r.competitors).length;
      const bCompetitors = Object.values(b.results).flatMap((r) => r.competitors).length;
      return bCompetitors - aCompetitors;
    })
    .slice(0, limit);
}

export function getTopCompetitors(
  queryResults: QueryResult[]
): Array<{ name: string; mentionCount: number }> {
  const counts: Record<string, number> = {};
  for (const qr of queryResults) {
    for (const result of Object.values(qr.results)) {
      for (const comp of result.competitors) {
        counts[comp.name] = (counts[comp.name] ?? 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, mentionCount]) => ({ name, mentionCount }));
}

export function buildAuditSummary(
  queryResults: QueryResult[],
  score: AuditScore
) {
  return {
    status: "completed",
    visibilityScore: score.visibilityScore,
    mentionRate: score.mentionRate,
    avgPosition: score.avgPosition,
    shareOfVoice: score.shareOfVoice,
    totalQueriesRun: score.totalQueriesRun,
    queriesWithMention: score.queriesWithMention,
    byProvider: score.byProvider,
    winningQueries: getWinningQueries(queryResults, 3).map((qr) => ({
      query: qr.query.query_text,
      providers: Object.entries(qr.results)
        .filter(([, r]) => r.mentioned)
        .map(([p]) => p),
      competitors: Object.values(qr.results).flatMap((r) => r.competitors.map((c) => c.name)),
    })),
    losingQueries: getLosingQueries(queryResults, 3).map((qr) => ({
      query: qr.query.query_text,
      competitors: Object.values(qr.results).flatMap((r) => r.competitors.map((c) => c.name)).slice(0, 5),
    })),
    topCompetitors: getTopCompetitors(queryResults),
    allQueries: queryResults.map((qr) => ({
      query: qr.query.query_text,
      category: qr.query.category,
      results: Object.fromEntries(
        Object.entries(qr.results).map(([provider, r]) => [
          provider,
          {
            mentioned: r.mentioned,
            position: r.position,
            sentiment: r.sentiment,
            competitors: r.competitors.slice(0, 5).map((c) => c.name),
          },
        ])
      ),
    })),
  };
}
