export interface WooCommerceCredentials {
  consumer_key: string;
  consumer_secret: string;
}

function authHeader(key: string, secret: string): string {
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function testWooCommerceConnection(
  storeUrl: string,
  creds: WooCommerceCredentials
): Promise<{ ok: boolean; productCount?: number; error?: string }> {
  const base = storeUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/wp-json/wc/v3/products?per_page=1&_fields=id`, {
      headers: { Authorization: authHeader(creds.consumer_key, creds.consumer_secret) },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json() as unknown[];
    return { ok: true, productCount: data.length };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
