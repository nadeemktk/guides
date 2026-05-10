import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyHmac, exchangeShopifyCode, isValidShopDomain } from "@/lib/stores/shopify";
import { createServiceClient } from "@/lib/supabase/server";
import { checkStoreLimit } from "@/lib/billing/gate";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { shop, code, state } = params;

  // Validate shop domain
  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.redirect(new URL("/stores?error=invalid_shop", req.nextUrl.origin));
  }

  // Verify CSRF state
  const cookieState = req.cookies.get("shopify_oauth_state")?.value ?? "";
  const [expectedState, userId] = cookieState.split(":");
  if (!state || state !== expectedState || !userId) {
    return NextResponse.redirect(new URL("/stores?error=invalid_state", req.nextUrl.origin));
  }

  // Verify Shopify HMAC signature
  if (!verifyShopifyHmac(params)) {
    return NextResponse.redirect(new URL("/stores?error=invalid_hmac", req.nextUrl.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/stores?error=missing_code", req.nextUrl.origin));
  }

  try {
    const creds = await exchangeShopifyCode(shop, code);
    const supabase = createServiceClient();

    // Upsert store — if this shop is already connected, update the token
    const existing = await (supabase as any)
      .from("stores")
      .select("id")
      .eq("user_id", userId)
      .eq("store_url", `https://${shop}`)
      .maybeSingle();

    if (existing.data?.id) {
      await (supabase as any)
        .from("stores")
        .update({ api_credentials: creds, is_active: true })
        .eq("id", existing.data.id);
    } else {
      // Gate: check store limit before creating new store
      const gate = await checkStoreLimit(userId);
      if (!gate.allowed) {
        return NextResponse.redirect(new URL(`/stores?error=store_limit&reason=${encodeURIComponent(gate.reason ?? "")}`, req.nextUrl.origin));
      }

      await (supabase as any)
        .from("stores")
        .insert({
          user_id: userId,
          platform: "shopify",
          store_url: `https://${shop}`,
          brand_name: shop.replace(".myshopify.com", ""),
          brand_aliases: [],
          api_credentials: creds,
          is_active: true,
        });
    }

    const res = NextResponse.redirect(new URL("/stores?connected=shopify", req.nextUrl.origin));
    res.cookies.delete("shopify_oauth_state");
    return res;
  } catch (e) {
    console.error("Shopify callback error:", e);
    return NextResponse.redirect(new URL("/stores?error=token_exchange", req.nextUrl.origin));
  }
}
