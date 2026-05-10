import { createHmac, timingSafeEqual } from "node:crypto";

export interface ShopifyCredentials {
  access_token: string;
  scope: string;
  shop: string;
}

const SHOPIFY_SCOPES = "read_products,read_inventory,write_products";

export function normalizeShop(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/^https?:\/\//, "");
  return s.endsWith(".myshopify.com") ? s : `${s}.myshopify.com`;
}

export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9-]+\.myshopify\.com$/.test(shop);
}

export function getShopifyAuthUrl(shop: string, state: string): string {
  const apiKey = process.env.SHOPIFY_API_KEY!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/stores/shopify/callback`;
  const params = new URLSearchParams({
    client_id: apiKey,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    "grant_options[]": "per-user",
  });
  return `https://${shop}/admin/oauth/authorize?${params}`;
}

export function verifyShopifyHmac(query: Record<string, string>): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("&");

  const expected = createHmac("sha256", secret).update(message).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function exchangeShopifyCode(
  shop: string,
  code: string
): Promise<ShopifyCredentials> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify token exchange failed: ${text}`);
  }
  const data = await res.json() as { access_token: string; scope: string };
  return { access_token: data.access_token, scope: data.scope, shop };
}

export async function testShopifyConnection(
  shop: string,
  accessToken: string
): Promise<{ ok: boolean; productCount: number }> {
  const res = await fetch(
    `https://${shop}/admin/api/2024-04/products.json?limit=1&fields=id`,
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );
  if (!res.ok) return { ok: false, productCount: 0 };
  const data = await res.json() as { products: unknown[] };
  return { ok: true, productCount: data.products.length };
}
