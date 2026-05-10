import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createServiceClient } from "@/lib/supabase/server";
import { RECOMMENDATIONS_PROMPT } from "@/lib/llm";

interface RecRow {
  rec_type: string;
  title: string;
  rationale: string;
  current_value: string | null;
  suggested_value: string | null;
  expected_impact: string | null;
}

const REC_TYPES = new Set([
  "description_rewrite",
  "schema_markup",
  "content_topic",
  "review_site",
  "feature_gap",
]);

/**
 * Generates 5-8 AI recommendations for a store based on monitoring results,
 * deletes existing pending recommendations, and inserts fresh ones.
 * Returns the number of recommendations inserted.
 */
export async function generateRecommendations(
  storeId: string,
  brandName: string,
  brandAliases: string[]
): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) return 0;

  const supabase = createServiceClient();
  const db = supabase as any;

  // --- Gather context ---
  const [snapRes, mentionsRes, competitorsRes, productsRes, losingRes] = await Promise.all([
    // Latest visibility snapshot
    db
      .from("visibility_snapshots")
      .select("visibility_score, total_queries_run, queries_with_mention")
      .eq("store_id", storeId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // What AI says when brand IS mentioned (reasons_cited from recent mentions)
    db
      .from("mentions")
      .select("reasons_cited, description_in_response")
      .eq("store_id", storeId)
      .eq("entity_type", "own_brand")
      .not("reasons_cited", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),

    // Top competitors
    db
      .from("competitors")
      .select("name, mention_count")
      .eq("store_id", storeId)
      .order("mention_count", { ascending: false })
      .limit(10),

    // Sample products
    db
      .from("products")
      .select("title, description, product_type, tags")
      .eq("store_id", storeId)
      .limit(15),

    // Losing queries: query_runs for this store's queries where brand was NOT mentioned
    // Join queries → query_runs, then left join mentions to find runs with no own_brand hit
    db
      .from("query_runs")
      .select("response_text, queries!inner(query_text, store_id)")
      .eq("queries.store_id", storeId)
      .eq("status", "completed")
      .not("response_text", "is", null)
      .order("ran_at", { ascending: false })
      .limit(30),
  ]);

  const snapshot = snapRes.data;
  const mentions = mentionsRes.data ?? [];
  const competitors = competitorsRes.data ?? [];
  const products = productsRes.data ?? [];
  const recentRuns = losingRes.data ?? [];

  // Filter losing runs (response doesn't contain brand name or aliases)
  const brandTerms = [brandName, ...brandAliases].map((t) => t.toLowerCase());
  const losingRuns = recentRuns
    .filter((r: { response_text: string }) => {
      const text = (r.response_text ?? "").toLowerCase();
      return !brandTerms.some((t) => text.includes(t));
    })
    .slice(0, 10);

  // --- Format context ---
  const score = snapshot ? Number(snapshot.visibility_score ?? 0).toFixed(1) : "unknown";
  const mentionRate =
    snapshot?.total_queries_run && snapshot.queries_with_mention
      ? Math.round((snapshot.queries_with_mention / snapshot.total_queries_run) * 100)
      : 0;

  const losingQueriesText = losingRuns
    .map((r: { queries: { query_text: string } }) => `- "${r.queries?.query_text ?? ""}"`)
    .join("\n") || "No losing query data yet";

  const competitorsText = competitors
    .map((c: { name: string; mention_count: number }) => `- ${c.name} (${c.mention_count} mentions)`)
    .join("\n") || "No competitor data yet";

  const productsText = products
    .map((p: { title: string; description: string | null; product_type: string | null; tags: string[] | null }) =>
      `• ${p.title}${p.product_type ? ` [${p.product_type}]` : ""}${p.description ? ` — ${p.description.slice(0, 120)}` : ""}`
    )
    .join("\n") || "No product data yet";

  const allReasons = mentions.flatMap((m: { reasons_cited: string[] | null }) => m.reasons_cited ?? []);
  const uniqueReasons = [...new Set(allReasons)].slice(0, 15);
  const winningReasonsText = uniqueReasons.length > 0
    ? uniqueReasons.map((r) => `- ${r}`).join("\n")
    : "No mention data yet — brand may not be visible in AI results";

  // --- Build and call LLM ---
  const prompt = RECOMMENDATIONS_PROMPT
    .replace("{brand_name}", brandName)
    .replace("{score}", score)
    .replace("{mention_rate}", String(mentionRate))
    .replace("{losing_queries}", losingQueriesText)
    .replace("{competitors}", competitorsText)
    .replace("{products}", productsText)
    .replace("{winning_reasons}", winningReasonsText);

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    messages: [{ role: "user", content: prompt }],
    maxOutputTokens: 2048,
    temperature: 0.3,
  });

  // Parse JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return 0;

  let parsed: RecRow[];
  try {
    parsed = JSON.parse(jsonMatch[0]) as RecRow[];
  } catch {
    return 0;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return 0;

  // Validate and clean
  const validRecs = parsed
    .filter((r) => r.title && REC_TYPES.has(r.rec_type))
    .slice(0, 8)
    .map((r) => ({
      store_id: storeId,
      rec_type: r.rec_type,
      title: String(r.title).slice(0, 200),
      rationale: r.rationale ? String(r.rationale) : null,
      current_value: r.current_value ? String(r.current_value) : null,
      suggested_value: r.suggested_value ? String(r.suggested_value) : null,
      expected_impact: r.expected_impact ? String(r.expected_impact) : null,
      status: "pending",
    }));

  if (validRecs.length === 0) return 0;

  // Delete existing pending recommendations, insert fresh batch
  await db.from("recommendations").delete().eq("store_id", storeId).eq("status", "pending");
  await db.from("recommendations").insert(validRecs);

  return validRecs.length;
}
