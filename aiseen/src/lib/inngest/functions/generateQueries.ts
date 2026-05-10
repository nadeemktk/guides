import { inngest } from "@/lib/inngest/client";
import { createServiceClient } from "@/lib/supabase/server";
import { generateQueriesForStore, upsertQueries } from "@/lib/queries/generator";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/gate";

export const generateQueriesFunction = inngest.createFunction(
  {
    id: "generate-queries",
    name: "Generate Store Queries",
    triggers: [{ event: "queries/generate.requested" as const }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { storeId } = event.data as { storeId: string };

    const store = await step.run("fetch-store", async () => {
      const supabase = createServiceClient();
      const { data, error } = await (supabase as any)
        .from("stores")
        .select("id, brand_name, store_url")
        .eq("id", storeId)
        .single();
      if (error || !data) throw new Error(`Store ${storeId} not found`);
      return data as { id: string; brand_name: string | null; store_url: string };
    });

    const productCount = await step.run("check-product-count", async () => {
      const supabase = createServiceClient();
      const { count } = await (supabase as any)
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);
      return count ?? 0;
    });

    if (productCount === 0) {
      return { storeId, skipped: true, reason: "No products in catalog — sync catalog first" };
    }

    const queryLimitCheck = await step.run("check-query-limit", async () => {
      const supabase = createServiceClient();
      const db = supabase as any;

      const { data: storeRow } = await db
        .from("stores")
        .select("user_id")
        .eq("id", storeId)
        .single();
      if (!storeRow) return { allowed: false, current: 0, limit: 0, tier: "free" as PlanTier };

      const { data: profile } = await db
        .from("profiles")
        .select("subscription_tier")
        .eq("id", storeRow.user_id)
        .maybeSingle();

      const tier: PlanTier = profile?.subscription_tier ?? "free";
      const limit = PLAN_LIMITS[tier].queries;

      // Count active queries across all this user's stores
      const { data: userStores } = await db
        .from("stores")
        .select("id")
        .eq("user_id", storeRow.user_id)
        .eq("is_active", true);

      const storeIds: string[] = (userStores ?? []).map((s: { id: string }) => s.id);
      const { count } = await db
        .from("queries")
        .select("id", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("is_active", true);

      const current = count ?? 0;
      return { allowed: current < limit, current, limit, tier };
    });

    if (!queryLimitCheck.allowed) {
      const { current, limit, tier } = queryLimitCheck;
      return {
        storeId,
        skipped: true,
        reason: `Query limit reached (${current}/${limit} on ${tier} plan)`,
      };
    }

    const queries = await step.run("generate-queries", async () => {
      // Scale query count with catalog size — more products = broader query set, capped at 60
      const count = Math.min(Math.max(25, Math.floor(productCount / 5)), 60);
      return generateQueriesForStore(store, count);
    });

    const upserted = await step.run("upsert-queries", async () => {
      return upsertQueries(storeId, queries);
    });

    return { storeId, generated: queries.length, upserted };
  }
);
