import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("store_id");

  const supabase = createServiceClient();
  const db = supabase as any;

  let query = db
    .from("competitors")
    .select("id, store_id, name, mention_count, created_at, stores!inner(user_id)")
    .eq("stores.user_id", user.id)
    .order("mention_count", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ competitors: data ?? [] });
}
