import { createServiceClient } from "@/lib/supabase/server";
import { runQueryAgainstProviders, type FreeAuditProvider } from "@/lib/audit/llmRunner";
import { detectMention } from "@/lib/audit/mentionDetector";
import { computeScore } from "@/lib/audit/scorer";
import type { QueryResult } from "@/lib/audit/scorer";

const PROVIDERS: FreeAuditProvider[] = ["openai", "gemini", "perplexity"];

export interface DBQuery {
  id: string;
  query_text: string;
  category: string | null;
  intent: string | null;
}

export interface OwnBrandMentionData {
  mentionId: string;
  responseText: string;
}

export interface BatchSummary {
  queriesProcessed: number;
  runsInserted: number;
  ownMentions: number;
  competitorMentions: number;
  queryResults: QueryResult[];
  ownBrandMentionData: OwnBrandMentionData[];
}

/**
 * Processes a batch of queries: runs LLMs, writes query_runs + mentions rows,
 * and returns structured results for scoring.
 */
export async function processBatch(
  queries: DBQuery[],
  storeId: string,
  brandName: string,
  brandAliases: string[]
): Promise<BatchSummary> {
  const supabase = createServiceClient();
  const db = supabase as any;

  let runsInserted = 0;
  let ownMentions = 0;
  let competitorMentions = 0;
  const queryResults: QueryResult[] = [];
  const ownBrandMentionData: OwnBrandMentionData[] = [];

  for (const query of queries) {
    const llmResults = await runQueryAgainstProviders(query.query_text, PROVIDERS);
    const resultMap: QueryResult["results"] = {} as QueryResult["results"];

    for (const llm of llmResults) {
      const mention = detectMention(llm.responseText, brandName, brandAliases);

      // Insert query_run row
      const { data: runRow } = await db.from("query_runs").insert({
        query_id: query.id,
        provider: llm.provider,
        model: llm.model,
        response_text: llm.responseText,
        tokens_used: llm.tokensUsed,
        cost_usd: llm.costUsd,
        duration_ms: llm.durationMs,
        status: llm.error ? "failed" : "completed",
      }).select("id").single();

      runsInserted++;

      const queryRunId = runRow?.id as string | undefined;

      if (queryRunId) {
        const mentionRows: object[] = [];

        // Own brand mention
        if (mention.mentioned) {
          ownMentions++;
          mentionRows.push({
            query_run_id: queryRunId,
            store_id: storeId,
            entity_type: "own_brand",
            entity_name: brandName,
            position: mention.position,
            context_snippet: mention.contextSnippet,
            sentiment: mention.sentiment,
          });
        }

        // Competitor mentions
        for (const comp of mention.competitors) {
          competitorMentions++;
          mentionRows.push({
            query_run_id: queryRunId,
            store_id: storeId,
            entity_type: "competitor_brand",
            entity_name: comp.name,
            position: comp.position,
            context_snippet: null,
            sentiment: null,
          });
        }

        if (mentionRows.length > 0) {
          const { data: inserted } = await db
            .from("mentions")
            .insert(mentionRows)
            .select("id, entity_type");

          for (const row of inserted ?? []) {
            if (row.entity_type === "own_brand" && llm.responseText) {
              ownBrandMentionData.push({ mentionId: row.id as string, responseText: llm.responseText });
            }
          }
        }
      }

      resultMap[llm.provider] = {
        mentioned: mention.mentioned,
        position: mention.position,
        contextSnippet: mention.contextSnippet,
        sentiment: mention.sentiment,
        competitors: mention.competitors,
        responseText: llm.responseText,
        error: llm.error,
      };
    }

    queryResults.push({
      query: {
        query_text: query.query_text,
        category: query.category ?? "general",
        intent: query.intent ?? "commercial",
        expected_competitor_brands: [],
      },
      results: resultMap,
    });
  }

  return { queriesProcessed: queries.length, runsInserted, ownMentions, competitorMentions, queryResults, ownBrandMentionData };
}

/**
 * After all batches are done: upsert competitors and write a visibility snapshot.
 */
export async function finalizeMonitoringRun(
  storeId: string,
  allQueryResults: QueryResult[]
): Promise<number> {
  const supabase = createServiceClient();
  const db = supabase as any;

  // --- Competitors: fetch existing counts, merge with new, upsert ---
  const competitorTally: Record<string, number> = {};
  for (const qr of allQueryResults) {
    for (const r of Object.values(qr.results)) {
      for (const c of r.competitors) {
        competitorTally[c.name] = (competitorTally[c.name] ?? 0) + 1;
      }
    }
  }

  if (Object.keys(competitorTally).length > 0) {
    const { data: existing } = await db
      .from("competitors")
      .select("name, mention_count")
      .eq("store_id", storeId)
      .in("name", Object.keys(competitorTally));

    const existingMap: Record<string, number> = {};
    for (const row of existing ?? []) existingMap[row.name] = row.mention_count ?? 0;

    const competitorRows = Object.entries(competitorTally).map(([name, newCount]) => ({
      store_id: storeId,
      name,
      mention_count: (existingMap[name] ?? 0) + newCount,
    }));

    await db.from("competitors").upsert(competitorRows, { onConflict: "store_id,name" });
  }

  // --- Visibility snapshot ---
  const score = computeScore(allQueryResults);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  await db.from("visibility_snapshots").upsert(
    {
      store_id: storeId,
      snapshot_date: today,
      visibility_score: score.visibilityScore,
      total_queries_run: score.totalQueriesRun,
      queries_with_mention: score.queriesWithMention,
      avg_position: score.avgPosition,
      share_of_voice: score.shareOfVoice,
      by_provider: score.byProvider,
    },
    { onConflict: "store_id,snapshot_date" }
  );

  return score.visibilityScore;
}
