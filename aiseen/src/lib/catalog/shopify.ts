export interface NormalizedProduct {
  external_id: string;
  title: string;
  description: string | null;
  product_type: string | null;
  vendor: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  product_url: string | null;
  tags: string[] | null;
  raw_data: Record<string, unknown>;
}

interface ShopifyVariant {
  price: string;
}

interface ShopifyImage {
  src: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  product_type: string;
  vendor: string;
  handle: string;
  tags: string;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
}

function parseLinkHeader(header: string | null): string | null {
  if (!header) return null;
  // <https://...?page_info=xxx&limit=250>; rel="next"
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  if (!match) return null;
  const url = new URL(match[1]);
  return url.searchParams.get("page_info");
}

function normalize(shop: string, p: ShopifyProduct): NormalizedProduct {
  const price = p.variants[0]?.price ? parseFloat(p.variants[0].price) : null;
  const tags = p.tags
    ? p.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : null;
  return {
    external_id: String(p.id),
    title: p.title,
    description: p.body_html?.replace(/<[^>]+>/g, "").slice(0, 2000) ?? null,
    product_type: p.product_type || null,
    vendor: p.vendor || null,
    price: price,
    currency: "USD", // Shopify REST doesn't return currency per-product; default USD
    image_url: p.images[0]?.src ?? null,
    product_url: `https://${shop}/products/${p.handle}`,
    tags,
    raw_data: p as unknown as Record<string, unknown>,
  };
}

export async function fetchShopifyProducts(
  shop: string,
  accessToken: string
): Promise<NormalizedProduct[]> {
  const all: NormalizedProduct[] = [];
  const limit = 250;
  let pageInfo: string | null = null;
  let firstPage = true;

  while (firstPage || pageInfo) {
    firstPage = false;
    const params = new URLSearchParams({ limit: String(limit), fields: "id,title,body_html,product_type,vendor,handle,tags,images,variants" });
    if (pageInfo) params.set("page_info", pageInfo);

    const res = await fetch(
      `https://${shop}/admin/api/2024-04/products.json?${params}`,
      { headers: { "X-Shopify-Access-Token": accessToken } }
    );
    if (!res.ok) throw new Error(`Shopify products fetch failed: ${res.status}`);

    const data = await res.json() as { products: ShopifyProduct[] };
    all.push(...data.products.map((p) => normalize(shop, p)));

    pageInfo = parseLinkHeader(res.headers.get("Link"));
    if (data.products.length < limit) break; // last page
  }

  return all;
}
