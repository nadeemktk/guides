import { createServiceClient } from "@/lib/supabase/server";
import { generateQueries } from "@/lib/audit/queryGenerator";
import type { ScrapedProduct, ScrapedStore } from "@/lib/audit/scraper";
import type { GeneratedQuery } from "@/types";

interface DBProduct {
  id: string;
  title: string;
  product_type: string | null;
  vendor: string | null;
  price: number | null;
  tags: string[] | null;
}

function toScrapedProduct(p: DBProduct): ScrapedProduct {
  return {
    title: p.title,
    description: "",
    productType: p.product_type ?? "",
    vendor: p.vendor ?? "",
    price: p.price ?? 0,
    tags: p.tags ?? [],
    url: "",
  };
}

export interface StoreForGeneration {
  id: string;
  brand_name: string | null;
  store_url: string;
}

/**
 * Generates queries for a store using its synced product catalog.
 * Returns the generated queries without touching the DB.
 */
export async function generateQueriesForStore(
  store: StoreForGeneration,
  count = 40
): Promise<GeneratedQuery[]> {
  const supabase = createServiceClient();
  const { data: products } = await (supabase as any)
    .from("products")
    .select("id, title, product_type, vendor, price, tags")
    .eq("store_id", store.id)
    .limit(100);

  const scrapedProducts: ScrapedProduct[] = (products ?? []).map(toScrapedProduct);

  // Derive brand name: prefer stored brand_name, fall back to domain
  const brandName =
    store.brand_name ??
    new URL(store.store_url.startsWith("http") ? store.store_url : `https://${store.store_url}`)
      .hostname.replace(/^www\./, "")
      .split(".")[0];

  const storeUrl = store.store_url.startsWith("http")
    ? store.store_url
    : `https://${store.store_url}`;

  const storeForAnalysis: ScrapedStore = {
    brandName,
    storeName: brandName,
    products: scrapedProducts,
    storeUrl,
    metaDescription: "",
    headings: [],
    navItems: [],
    rawContentSnippet: "",
  };

  return generateQueries(storeForAnalysis, count);
}

/**
 * Upserts generated queries into the queries table.
 * Uses (store_id, query_text) unique constraint for idempotency.
 * Returns the count of rows upserted.
 */
export async function upsertQueries(
  storeId: string,
  queries: GeneratedQuery[]
): Promise<number> {
  if (queries.length === 0) return 0;

  const supabase = createServiceClient();
  const rows = queries.map((q) => ({
    store_id: storeId,
    query_text: q.query_text,
    category: q.category,
    intent: q.intent,
    is_active: true,
  }));

  const { error } = await (supabase as any)
    .from("queries")
    .upsert(rows, { onConflict: "store_id,query_text", ignoreDuplicates: true });

  if (error) throw new Error(`Query upsert failed: ${error.message}`);
  return rows.length;
}
