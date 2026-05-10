import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("store_id");
  const provider = req.nextUrl.searchParams.get("provider");
  const sentiment = req.nextUrl.searchParams.get("sentiment");

  const supabase = createServiceClient();
  const db = supabase as any;

  let query = db
    .from("mentions")
    .select(`
      id,
      store_id,
      entity_type,
      entity_name,
      position,
      context_snippet,
      sentiment,
      description_in_response,
      reasons_cited,
      created_at,
      stores!inner(user_id),
      query_runs(provider, model, query_id, queries(query_text, category, intent))
    `)
    .eq("stores.user_id", user.id)
    .eq("entity_type", "own_brand")
    .order("created_at", { ascending: false })
    .limit(100);

  if (storeId) query = query.eq("store_id", storeId);
  if (provider) query = query.eq("query_runs.provider", provider);
  if (sentiment) query = query.eq("sentiment", sentiment);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ mentions: data ?? [] });
}
