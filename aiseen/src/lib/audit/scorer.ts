import type { GeneratedQuery } from "@/types";
import type { FreeAuditProvider } from "./llmRunner";
import type { ScrapedStore } from "./scraper";
import type { BusinessProfile } from "./businessAnalyzer";

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

export interface ContentQualityScore {
  hasStructuredData: boolean;
  hasMetaDescription: boolean;
  metaDescriptionQuality: number;
  headingCount: number;
  hasAboutContent: boolean;
  hasSocialPresence: boolean;
  hasContactInfo: boolean;
  locationClarity: number;
  contentDepth: number;
  offeringsClarity: number;
  total: number;
}

export interface AuditScore {
  visibilityScore: number;
  mentionRate: number;
  avgPosition: number;
  shareOfVoice: number;
  positiveSentimentRatio: number;
  totalQueriesRun: number;
  queriesWithMention: number;
  contentQualityScore: ContentQualityScore;
  byProvider: Record<FreeAuditProvider, {
    mentionRate: number;
    avgPosition: number;
  }>;
}

export function computeContentQuality(store: ScrapedStore, profile: BusinessProfile): ContentQualityScore {
  const hasStructuredData = store.schemaTypes.length > 0;
  const hasMetaDescription = store.metaDescription.length > 30;
  const metaDescriptionQuality = Math.min(1, store.metaDescription.length / 160);
  const headingCount = Math.min(1, store.headings.length / 10);
  const hasAboutContent = store.aboutContent.length > 100;
  const hasSocialPresence = store.socialLinks.length > 0;
  const hasContactInfo = store.contactInfo.length > 0;
  const locationClarity = profile.locationSpecific.length > 0 ? 1 : (profile.location !== "global" ? 0.5 : 0);
  const contentDepth = Math.min(1, store.rawContentSnippet.length / 2000);
  const offeringsClarity = Math.min(1, profile.keyOfferings.length / 5);

  const total = Math.round(
    (
      (hasStructuredData ? 1 : 0) * 15 +
      (hasMetaDescription ? metaDescriptionQuality : 0) * 12 +
      headingCount * 10 +
      (hasAboutContent ? 1 : 0) * 12 +
      (hasSocialPresence ? 1 : 0) * 8 +
      (hasContactInfo ? 1 : 0) * 8 +
      locationClarity * 10 +
      contentDepth * 10 +
      offeringsClarity * 15
    )
  );

  return {
    hasStructuredData,
    hasMetaDescription,
    metaDescriptionQuality: Math.round(metaDescriptionQuality * 100),
    headingCount: store.headings.length,
    hasAboutContent,
    hasSocialPresence,
    hasContactInfo,
    locationClarity: Math.round(locationClarity * 100),
    contentDepth: Math.round(contentDepth * 100),
    offeringsClarity: Math.round(offeringsClarity * 100),
    total: Math.min(100, total),
  };
}

export function computeScore(
  queryResults: QueryResult[],
  store?: ScrapedStore,
  profile?: BusinessProfile
): AuditScore {
  const providers: FreeAuditProvider[] = ["openai", "gemini", "anthropic"];

  let totalRuns = 0;
  let ownMentions = 0;
  let competitorMentions = 0;
  let positionSum = 0;
  let positionCount = 0;
  let positiveMentions = 0;
  let sentimentMentionCount = 0;
  let queriesWithMentionCount = 0;

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

        if (result.position !== null && result.position > 0) {
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

      competitorMentions += result.competitors.length;
    }

    if (queryHadMention) queriesWithMentionCount++;
  }

  const mentionRate = totalRuns > 0 ? ownMentions / totalRuns : 0;
  const avgPosition = positionCount > 0 ? positionSum / positionCount : 10;
  const shareOfVoice =
    ownMentions + competitorMentions > 0
      ? ownMentions / (ownMentions + competitorMentions)
      : 0;
  const positiveSentimentRatio =
    sentimentMentionCount > 0 ? positiveMentions / sentimentMentionCount : 0;

  // Mention-based visibility score component
  const positionScore = Math.max(0, 1 - (avgPosition - 1) / 10);
  const mentionBasedScore =
    0.4 * mentionRate +
    0.25 * positionScore * mentionRate + // position only counts when mentioned
    0.2 * shareOfVoice +
    0.15 * positiveSentimentRatio * mentionRate; // sentiment only counts when mentioned

  // Content quality adds a meaningful floor to the score
  let contentQualityScore: ContentQualityScore = {
    hasStructuredData: false,
    hasMetaDescription: false,
    metaDescriptionQuality: 0,
    headingCount: 0,
    hasAboutContent: false,
    hasSocialPresence: false,
    hasContactInfo: false,
    locationClarity: 0,
    contentDepth: 0,
    offeringsClarity: 0,
    total: 0,
  };

  if (store && profile) {
    contentQualityScore = computeContentQuality(store, profile);
  }

  // Final blended score: 70% AI mentions, 30% content quality
  // This ensures scores vary meaningfully even for unknown brands
  const contentComponent = (contentQualityScore.total / 100) * 0.3;
  const mentionComponent = mentionBasedScore * 0.7;
  const rawScore = mentionComponent + contentComponent;

  const visibilityScore = Math.round(Math.min(100, Math.max(1, rawScore * 100)));

  const byProviderResult: Record<FreeAuditProvider, { mentionRate: number; avgPosition: number }> = {
    openai: {
      mentionRate: byProvider.openai.totalRuns > 0 ? byProvider.openai.mentionCount / byProvider.openai.totalRuns : 0,
      avgPosition: byProvider.openai.positionCount > 0 ? byProvider.openai.positionSum / byProvider.openai.positionCount : 0,
    },
    gemini: {
      mentionRate: byProvider.gemini.totalRuns > 0 ? byProvider.gemini.mentionCount / byProvider.gemini.totalRuns : 0,
      avgPosition: byProvider.gemini.positionCount > 0 ? byProvider.gemini.positionSum / byProvider.gemini.positionCount : 0,
    },
    anthropic: {
      mentionRate: byProvider.anthropic.totalRuns > 0 ? byProvider.anthropic.mentionCount / byProvider.anthropic.totalRuns : 0,
      avgPosition: byProvider.anthropic.positionCount > 0 ? byProvider.anthropic.positionSum / byProvider.anthropic.positionCount : 0,
    },
  };

  return {
    visibilityScore,
    mentionRate,
    avgPosition,
    shareOfVoice,
    positiveSentimentRatio,
    totalQueriesRun: queryResults.length,
    queriesWithMention: queriesWithMentionCount,
    contentQualityScore,
    byProvider: byProviderResult,
  };
}

export function getWinningQueries(queryResults: QueryResult[], limit = 3): QueryResult[] {
  return queryResults
    .filter((qr) => Object.values(qr.results).some((r) => r.mentioned))
    .sort((a, b) => {
      const aMentions = Object.values(a.results).filter((r) => r.mentioned).length;
      const bMentions = Object.values(b.results).filter((r) => r.mentioned).length;
      if (bMentions !== aMentions) return bMentions - aMentions;
      const aPos = Object.values(a.results).filter((r) => r.mentioned && r.position).reduce((s, r) => s + (r.position ?? 10), 0);
      const bPos = Object.values(b.results).filter((r) => r.mentioned && r.position).reduce((s, r) => s + (r.position ?? 10), 0);
      return aPos - bPos;
    })
    .slice(0, limit);
}

export function getLosingQueries(queryResults: QueryResult[], limit = 5): QueryResult[] {
  return queryResults
    .filter((qr) => !Object.values(qr.results).some((r) => r.mentioned))
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
    // Use Set per query to avoid counting same competitor twice per query
    const seenInQuery = new Set<string>();
    for (const result of Object.values(qr.results)) {
      for (const comp of result.competitors) {
        if (!seenInQuery.has(comp.name)) {
          seenInQuery.add(comp.name);
          counts[comp.name] = (counts[comp.name] ?? 0) + 1;
        }
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
    contentQualityScore: score.contentQualityScore,
    byProvider: score.byProvider,
    winningQueries: getWinningQueries(queryResults, 3).map((qr) => ({
      query: qr.query.query_text,
      category: qr.query.category,
      providers: Object.entries(qr.results)
        .filter(([, r]) => r.mentioned)
        .map(([p]) => p),
      competitors: [...new Set(Object.values(qr.results).flatMap((r) => r.competitors.map((c) => c.name)))],
      contextSnippet: Object.values(qr.results).find((r) => r.contextSnippet)?.contextSnippet ?? null,
    })),
    losingQueries: getLosingQueries(queryResults, 5).map((qr) => ({
      query: qr.query.query_text,
      category: qr.query.category,
      competitors: [...new Set(Object.values(qr.results).flatMap((r) => r.competitors.map((c) => c.name)))].slice(0, 5),
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
            contextSnippet: r.contextSnippet,
          },
        ])
      ),
    })),
  };
}
