import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { testWooCommerceConnection } from "@/lib/stores/woocommerce";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";
import { checkStoreLimit } from "@/lib/billing/gate";

const schema = z.object({
  store_id: z.string().uuid().optional(),
  store_url: z.string().url(),
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { store_id, store_url, consumer_key, consumer_secret } = parsed.data;
  const creds = { consumer_key, consumer_secret };

  const test = await testWooCommerceConnection(store_url, creds);
  if (!test.ok) {
    return NextResponse.json({ error: `Connection test failed: ${test.error}` }, { status: 422 });
  }

  const supabase = createServiceClient();
  const db = supabase as any;

  if (store_id) {
    const { data } = await db
      .from("stores")
      .select("id")
      .eq("id", store_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    await db.from("stores").update({
      store_url,
      api_credentials: creds,
      is_active: true,
    }).eq("id", store_id);
    return NextResponse.json({ ok: true });
  }

  // Gate: check store limit before creating new store
  const gate = await checkStoreLimit(user.id);
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason, upgradeTo: gate.upgradeTo }, { status: 403 });
  }

  const { data } = await db.from("stores").insert({
    user_id: user.id,
    platform: "woocommerce",
    store_url,
    brand_name: null,
    brand_aliases: [],
    api_credentials: creds,
    is_active: true,
  }).select("id").single();

  return NextResponse.json({ ok: true, store_id: data?.id });
}
