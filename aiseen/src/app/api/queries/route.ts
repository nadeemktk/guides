import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("store_id");

  const supabase = createServiceClient();
  const db = supabase as any;

  // Only return queries for stores owned by this user
  let query = db
    .from("queries")
    .select("id, store_id, query_text, category, intent, is_active, created_at, stores!inner(user_id)")
    .eq("stores.user_id", user.id)
    .order("category", { ascending: true })
    .order("query_text", { ascending: true });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ queries: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { id: string; is_active: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing query id" }, { status: 400 });

  const supabase = createServiceClient();
  const db = supabase as any;

  // Verify ownership via stores join
  const { data: q } = await db
    .from("queries")
    .select("id, stores!inner(user_id)")
    .eq("id", body.id)
    .eq("stores.user_id", user.id)
    .maybeSingle();

  if (!q) return NextResponse.json({ error: "Query not found" }, { status: 404 });

  await db.from("queries").update({ is_active: body.is_active }).eq("id", body.id);
  return NextResponse.json({ ok: true });
}
