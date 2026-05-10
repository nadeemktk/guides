import type { NormalizedProduct } from "./shopify";

interface WCProduct {
  id: number;
  name: string;
  description: string;
  type: string;
  price: string;
  permalink: string;
  images: { src: string }[];
  categories: { name: string }[];
  tags: { name: string }[];
}

function authHeader(key: string, secret: string): string {
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

function normalize(p: WCProduct): NormalizedProduct {
  return {
    external_id: String(p.id),
    title: p.name,
    description: p.description?.replace(/<[^>]+>/g, "").slice(0, 2000) ?? null,
    product_type: p.type || null,
    vendor: null,
    price: p.price ? parseFloat(p.price) : null,
    currency: null, // WC REST doesn't include currency per-product at this endpoint
    image_url: p.images[0]?.src ?? null,
    product_url: p.permalink ?? null,
    tags: p.tags?.map((t) => t.name) ?? null,
    raw_data: p as unknown as Record<string, unknown>,
  };
}

export async function fetchWooCommerceProducts(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<NormalizedProduct[]> {
  const base = storeUrl.replace(/\/$/, "");
  const auth = authHeader(consumerKey, consumerSecret);
  const perPage = 100;
  const all: NormalizedProduct[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
      status: "publish",
      _fields: "id,name,description,type,price,permalink,images,categories,tags",
    });

    const res = await fetch(`${base}/wp-json/wc/v3/products?${params}`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`WooCommerce fetch failed: ${res.status}`);

    const products = await res.json() as WCProduct[];
    all.push(...products.map(normalize));

    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") ?? "1", 10);
    if (page >= totalPages || products.length < perPage) break;
    page++;
  }

  return all;
}
