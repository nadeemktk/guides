import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("store_id");
  if (!storeId) return NextResponse.json({ error: "store_id required" }, { status: 400 });

  const supabase = createServiceClient();
  const db = supabase as any;

  // Verify ownership
  const { data: store } = await db
    .from("stores")
    .select("id, brand_name, store_url")
    .eq("id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  // Run all queries in parallel
  const [latestSnap, weekAgoSnap, mentionsRes, queriesRes, competitorsRes] = await Promise.all([
    // Latest snapshot
    db
      .from("visibility_snapshots")
      .select("snapshot_date, visibility_score, total_queries_run, queries_with_mention, avg_position, share_of_voice, by_provider")
      .eq("store_id", storeId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Snapshot from ~7 days ago for delta
    db
      .from("visibility_snapshots")
      .select("visibility_score, snapshot_date")
      .eq("store_id", storeId)
      .lte("snapshot_date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Total own-brand mentions
    db
      .from("mentions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("entity_type", "own_brand"),

    // Active queries count
    db
      .from("queries")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("is_active", true),

    // Competitors count
    db
      .from("competitors")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId),
  ]);

  const latest = latestSnap.data;
  const weekAgo = weekAgoSnap.data;
  const scoreDelta =
    latest && weekAgo
      ? Number(latest.visibility_score) - Number(weekAgo.visibility_score)
      : null;

  return NextResponse.json({
    store: { id: store.id, brand_name: store.brand_name, store_url: store.store_url },
    latest: latest ?? null,
    scoreDelta,
    mentionCount: mentionsRes.count ?? 0,
    activeQueryCount: queriesRes.count ?? 0,
    competitorCount: competitorsRes.count ?? 0,
  });
}
