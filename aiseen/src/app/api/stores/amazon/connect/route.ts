import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { testAmazonConnection } from "@/lib/stores/amazon";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";
import { checkStoreLimit } from "@/lib/billing/gate";

const schema = z.object({
  store_id: z.string().uuid().optional(), // update existing store
  seller_id: z.string().min(1),
  marketplace_id: z.string().min(1),
  lwa_client_id: z.string().min(1),
  lwa_client_secret: z.string().min(1),
  lwa_refresh_token: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { store_id, ...creds } = parsed.data;

  // Test the credentials before saving
  const test = await testAmazonConnection(creds);
  if (!test.ok) {
    return NextResponse.json({ error: `Connection test failed: ${test.error}` }, { status: 422 });
  }

  const supabase = createServiceClient();
  const db = supabase as any;

  if (store_id) {
    // Verify ownership before updating
    const { data } = await db
      .from("stores")
      .select("id")
      .eq("id", store_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    await db.from("stores").update({ api_credentials: creds, is_active: true }).eq("id", store_id);
    return NextResponse.json({ ok: true });
  }

  // Gate: check store limit before creating new store
  const gate = await checkStoreLimit(user.id);
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason, upgradeTo: gate.upgradeTo }, { status: 403 });
  }

  const { data } = await db.from("stores").insert({
    user_id: user.id,
    platform: "amazon",
    store_url: `https://www.amazon.com/s?merchant=${creds.seller_id}`,
    brand_name: null,
    brand_aliases: [],
    api_credentials: creds,
    is_active: true,
  }).select("id").single();

  return NextResponse.json({ ok: true, store_id: data?.id });
}
