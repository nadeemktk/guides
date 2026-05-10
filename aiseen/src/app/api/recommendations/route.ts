import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("store_id");
  const status = req.nextUrl.searchParams.get("status"); // pending | approved | applied | dismissed

  const supabase = createServiceClient();
  const db = supabase as any;

  let query = db
    .from("recommendations")
    .select("id, store_id, rec_type, title, rationale, current_value, suggested_value, expected_impact, status, applied_at, created_at, stores!inner(user_id)")
    .eq("stores.user_id", user.id)
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recommendations: data ?? [] });
}
