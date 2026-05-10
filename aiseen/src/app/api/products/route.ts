import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get("store_id");
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!storeId) return NextResponse.json({ error: "store_id required" }, { status: 400 });

  const supabase = createServiceClient();
  const db = supabase as any;

  // Ownership check
  const { data: store } = await db
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  let query = db
    .from("products")
    .select("id, external_id, title, product_type, price, image_url")
    .eq("store_id", storeId)
    .order("title", { ascending: true })
    .limit(50);

  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ products: data ?? [] });
}
