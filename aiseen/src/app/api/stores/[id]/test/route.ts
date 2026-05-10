import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";
import { testShopifyConnection } from "@/lib/stores/shopify";
import { testAmazonConnection } from "@/lib/stores/amazon";
import { testWooCommerceConnection } from "@/lib/stores/woocommerce";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();
  const db = supabase as any;

  const { data: store } = await db
    .from("stores")
    .select("id, platform, store_url, api_credentials")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const creds = store.api_credentials as Record<string, string> | null;

  try {
    if (store.platform === "shopify") {
      if (!creds?.access_token || !creds?.shop) {
        return NextResponse.json({ ok: false, error: "Not connected — reconnect via OAuth" });
      }
      const result = await testShopifyConnection(creds.shop, creds.access_token);
      return NextResponse.json(result);
    }

    if (store.platform === "amazon") {
      if (!creds?.lwa_refresh_token) {
        return NextResponse.json({ ok: false, error: "No credentials stored" });
      }
      const result = await testAmazonConnection(creds as any);
      return NextResponse.json(result);
    }

    if (store.platform === "woocommerce") {
      if (!creds?.consumer_key) {
        return NextResponse.json({ ok: false, error: "No credentials stored" });
      }
      const result = await testWooCommerceConnection(store.store_url, creds as any);
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, error: "Manual stores cannot be tested" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
