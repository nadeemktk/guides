import { createServiceClient } from "@/lib/supabase/server";

interface ProductRow {
  id: string;
  external_id: string;
  title: string;
}

/**
 * Finds the best-matching product for a recommendation by scoring each product
 * title against the recommendation text (title + rationale + suggested_value).
 * Returns null if the store has no products or no reasonable match exists.
 */
export async function findMatchingProduct(
  storeId: string,
  recText: string
): Promise<ProductRow | null> {
  const supabase = createServiceClient();
  const { data: products } = await (supabase as any)
    .from("products")
    .select("id, external_id, title")
    .eq("store_id", storeId)
    .limit(200);

  if (!products || products.length === 0) return null;

  const haystack = recText.toLowerCase();

  // Score: count how many words from the product title appear in the rec text
  let best: ProductRow | null = null;
  let bestScore = 0;

  for (const p of products as ProductRow[]) {
    const words = p.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    if (words.length === 0) continue;
    const hits = words.filter((w: string) => haystack.includes(w)).length;
    const score = hits / words.length;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  // Require at least 30% word overlap to consider it a match
  return bestScore >= 0.3 ? best : null;
}
