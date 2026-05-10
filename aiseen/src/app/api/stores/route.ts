import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await (supabase as any)
    .from("stores")
    .select("id, platform, store_url, store_name, brand_name, brand_aliases, is_active, catalog_last_synced_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stores: data ?? [] });
}
