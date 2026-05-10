import { inngest } from "@/lib/inngest/client";
import { createServiceClient } from "@/lib/supabase/server";
import { processBatch, finalizeMonitoringRun, type DBQuery, type BatchSummary, type OwnBrandMentionData } from "@/lib/monitoring/runner";
import { extractMentionDetails } from "@/lib/monitoring/extractor";
import type { QueryResult } from "@/lib/audit/scorer";

const BATCH_SIZE = 5;

export const runMonitoringFunction = inngest.createFunction(
  {
    id: "run-monitoring",
    name: "Run Store Monitoring",
    triggers: [{ event: "monitoring/run.requested" as const }],
    retries: 1,
    // Concurrency: max 3 stores monitored in parallel globally
    concurrency: { limit: 3 },
  },
  async ({ event, step }) => {
    const { storeId } = event.data as { storeId: string };

    // Step 1: Load store + active queries
    const { store, queries } = await step.run("load-store-queries", async () => {
      const supabase = createServiceClient();
      const db = supabase as any;

      const { data: storeRow } = await db
        .from("stores")
        .select("id, brand_name, brand_aliases, store_url")
        .eq("id", storeId)
        .single();

      if (!storeRow) throw new Error(`Store ${storeId} not found`);

      const { data: queryRows } = await db
        .from("queries")
        .select("id, query_text, category, intent")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      return {
        store: storeRow as {
          id: string;
          brand_name: string | null;
          brand_aliases: string[] | null;
          store_url: string;
        },
        queries: (queryRows ?? []) as DBQuery[],
      };
    });

    if (queries.length === 0) {
      return { storeId, skipped: true, reason: "No active queries" };
    }

    const brandName =
      store.brand_name ??
      new URL(store.store_url.startsWith("http") ? store.store_url : `https://${store.store_url}`)
        .hostname.replace(/^www\./, "")
        .split(".")[0];

    const brandAliases = store.brand_aliases ?? [];

    // Step 2–N: Process queries in batches; Inngest checkpoints each batch
    const allQueryResults: QueryResult[] = [];
    const allOwnBrandMentionData: OwnBrandMentionData[] = [];
    const totalBatches = Math.ceil(queries.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const batch = queries.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      const batchSummary: BatchSummary = await step.run(
        `process-batch-${i + 1}-of-${totalBatches}`,
        async () => processBatch(batch, storeId, brandName, brandAliases)
      );

      allQueryResults.push(...batchSummary.queryResults);
      allOwnBrandMentionData.push(...batchSummary.ownBrandMentionData);

      // Brief pause between batches to respect provider rate limits
      if (i < totalBatches - 1) {
        await step.sleep(`cool-down-${i}`, "8s");
      }
    }

    // Enrich own-brand mentions with structured LLM extraction (description + reasons)
    if (allOwnBrandMentionData.length > 0) {
      await step.run("enrich-mentions", async () => {
        const supabase = createServiceClient();
        const db = supabase as any;

        // Fetch product titles once for context
        const { data: products } = await db
          .from("products")
          .select("title")
          .eq("store_id", storeId)
          .limit(50);

        const productTitles: string[] = (products ?? []).map((p: { title: string }) => p.title);

        for (const { mentionId, responseText } of allOwnBrandMentionData) {
          const extraction = await extractMentionDetails(
            responseText,
            brandName,
            brandAliases,
            productTitles
          );

          await db
            .from("mentions")
            .update({
              description_in_response: extraction.own_brand_description,
              reasons_cited: extraction.own_brand_reasons,
            })
            .eq("id", mentionId);
        }

        return { enriched: allOwnBrandMentionData.length };
      });
    }

    // Final step: upsert competitors + save visibility snapshot
    const visibilityScore = await step.run("finalize", async () => {
      return finalizeMonitoringRun(storeId, allQueryResults);
    });

    return {
      storeId,
      queriesRun: queries.length,
      batches: totalBatches,
      ownBrandMentionsEnriched: allOwnBrandMentionData.length,
      visibilityScore,
    };
  }
);
