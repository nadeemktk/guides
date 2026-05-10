import { inngest } from "@/lib/inngest/client";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchProductsForStore, type NormalizedProduct } from "@/lib/catalog";

const UPSERT_BATCH = 100; // rows per Supabase upsert call

export const syncCatalogFunction = inngest.createFunction(
  {
    id: "sync-catalog",
    name: "Sync Store Catalog",
    triggers: [{ event: "catalog/sync.requested" as const }],
    // Retry up to 2 times on failure; individual steps won't re-run
    retries: 2,
  },
  async ({ event, step }) => {
    const { storeId } = event.data as { storeId: string };

    // Step 1: Fetch store with credentials
    const store = await step.run("fetch-store", async () => {
      const supabase = createServiceClient();
      const { data, error } = await (supabase as any)
        .from("stores")
        .select("id, platform, store_url, api_credentials")
        .eq("id", storeId)
        .single();
      if (error || !data) throw new Error(`Store ${storeId} not found`);
      return data as { id: string; platform: string; store_url: string; api_credentials: Record<string, string> | null };
    });

    // Step 2: Mark sync in progress
    await step.run("mark-syncing", async () => {
      const supabase = createServiceClient();
      await (supabase as any)
        .from("stores")
        .update({ catalog_last_synced_at: null })
        .eq("id", storeId);
    });

    // Step 3: Fetch all products from the platform
    const products = await step.run("fetch-products", async () => {
      return fetchProductsForStore(store);
    });

    // Step 4: Upsert in batches to stay within Supabase payload limits
    const totalBatches = Math.ceil(products.length / UPSERT_BATCH);
    for (let i = 0; i < totalBatches; i++) {
      const batch = products.slice(i * UPSERT_BATCH, (i + 1) * UPSERT_BATCH);
      await step.run(`upsert-batch-${i + 1}-of-${totalBatches}`, async () => {
        const supabase = createServiceClient();
        const rows = batch.map((p: NormalizedProduct) => ({
          store_id: storeId,
          external_id: p.external_id,
          title: p.title,
          description: p.description,
          product_type: p.product_type,
          vendor: p.vendor,
          price: p.price,
          currency: p.currency,
          image_url: p.image_url,
          product_url: p.product_url,
          tags: p.tags,
          raw_data: p.raw_data,
        }));

        const { error } = await (supabase as any)
          .from("products")
          .upsert(rows, { onConflict: "store_id,external_id", ignoreDuplicates: false });

        if (error) throw new Error(`Upsert batch ${i + 1} failed: ${error.message}`);
        return { upserted: rows.length };
      });
    }

    // Step 5: Mark catalog_last_synced_at
    await step.run("finalize", async () => {
      const supabase = createServiceClient();
      await (supabase as any)
        .from("stores")
        .update({ catalog_last_synced_at: new Date().toISOString() })
        .eq("id", storeId);
    });

    return { storeId, productCount: products.length, batches: totalBatches };
  }
);
