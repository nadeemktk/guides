import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("store_id");
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);

  if (!storeId) return NextResponse.json({ error: "store_id required" }, { status: 400 });

  const supabase = createServiceClient();
  const db = supabase as any;

  // Verify ownership
  const { data: store } = await db
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await db
    .from("visibility_snapshots")
    .select("snapshot_date, visibility_score, total_queries_run, queries_with_mention, avg_position, share_of_voice, by_provider")
    .eq("store_id", storeId)
    .gte("snapshot_date", sinceStr)
    .order("snapshot_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ snapshots: data ?? [] });
}
