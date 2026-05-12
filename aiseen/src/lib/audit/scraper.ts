export interface ScrapedProduct {
  title: string;
  description: string;
  productType: string;
  vendor: string;
  price: number;
  tags: string[];
  url: string;
}

export interface ScrapedStore {
  brandName: string;
  storeName: string;
  products: ScrapedProduct[];
  storeUrl: string;
}

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  // Strip trailing slash
  return url.replace(/\/$/, "");
}

// Shopify public products.json — works on all public Shopify stores
async function scrapeShopify(baseUrl: string): Promise<ScrapedStore | null> {
  try {
    const res = await fetch(`${baseUrl}/products.json?limit=250`, {
      headers: { "User-Agent": "AISeen/1.0 (AI Visibility Scanner)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.products || !Array.isArray(data.products)) return null;

    const products: ScrapedProduct[] = data.products.slice(0, 50).map((p: {
      title?: string;
      body_html?: string;
      product_type?: string;
      vendor?: string;
      variants?: Array<{ price?: string }>;
      tags?: string | string[];
      handle?: string;
    }) => ({
      title: p.title ?? "",
      description: stripHtml(p.body_html ?? ""),
      productType: p.product_type ?? "",
      vendor: p.vendor ?? "",
      price: parseFloat(p.variants?.[0]?.price ?? "0"),
      tags: Array.isArray(p.tags)
        ? p.tags
        : typeof p.tags === "string"
        ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [],
      url: `${baseUrl}/products/${p.handle}`,
    }));

    // Brand name: most common vendor value, or store name from meta
    const vendorCounts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.vendor) vendorCounts[p.vendor] = (vendorCounts[p.vendor] ?? 0) + 1;
    });
    const brandName =
      Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      extractDomainBrand(baseUrl);

    const storeMeta = await scrapeStoreMeta(baseUrl);

    return {
      brandName,
      storeName: storeMeta.title || brandName,
      products,
      storeUrl: baseUrl,
    };
  } catch {
    return null;
  }
}

async function scrapeStoreMeta(baseUrl: string): Promise<{ title: string }> {
  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "AISeen/1.0 (AI Visibility Scanner)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return { title: titleMatch?.[1]?.trim() ?? "" };
  } catch {
    return { title: "" };
  }
}

// Generic scraper for non-Shopify stores — extracts title, products, and category hints
async function scrapeGeneric(baseUrl: string): Promise<ScrapedStore | null> {
  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AISeen/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const brandName = extractBrandFromHtml(html) || extractDomainBrand(baseUrl);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const storeName = titleMatch?.[1]?.trim() ?? brandName;

    // Try JSON-LD products first
    const jsonLdProducts = extractJsonLdProducts(html);
    if (jsonLdProducts.length > 0) {
      return { brandName, storeName, products: jsonLdProducts, storeUrl: baseUrl };
    }

    // For SPAs/non-Shopify stores: synthesise synthetic "products" from nav + meta
    // so the query generator has category context even without real product data
    const categoryHints = extractCategoryHints(html);
    const syntheticProducts: ScrapedProduct[] = categoryHints.map((cat) => ({
      title: cat,
      description: "",
      productType: cat,
      vendor: brandName,
      price: 0,
      tags: [],
      url: baseUrl,
    }));

    return {
      brandName,
      storeName,
      products: syntheticProducts,
      storeUrl: baseUrl,
    };
  } catch {
    return null;
  }
}

// Extract category names from nav menus and meta description
function extractCategoryHints(html: string): string[] {
  const hints = new Set<string>();

  // Meta description often contains product categories
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,200})["']/i)?.[1] ?? "";
  const descWords = metaDesc.match(/\b(electronics|fashion|clothing|shoes|beauty|home|furniture|sports|toys|books|grocery|jewelry|watches|bags|accessories|mobiles|laptops|cameras|appliances)\b/gi) ?? [];
  descWords.forEach((w) => hints.add(w.toLowerCase()));

  // og:description
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{10,200})["']/i)?.[1] ?? "";
  const ogWords = ogDesc.match(/\b(electronics|fashion|clothing|shoes|beauty|home|furniture|sports|toys|books|grocery|jewelry|watches|bags|accessories|mobiles|laptops|cameras|appliances)\b/gi) ?? [];
  ogWords.forEach((w) => hints.add(w.toLowerCase()));

  // Nav links — grab short link texts that look like product categories
  const navSection = html.match(/<nav[^>]*>([\s\S]{0,8000}?)<\/nav>/i)?.[1] ?? html.slice(0, 20000);
  const linkTexts = [...navSection.matchAll(/<a[^>]*>([^<]{3,25})<\/a>/gi)].map((m) => m[1].trim());
  const skipWords = /login|sign|cart|account|about|contact|help|faq|blog|terms|privacy|order|track|wish/i;
  for (const text of linkTexts) {
    if (!skipWords.test(text) && /^[a-z &'-]+$/i.test(text)) {
      hints.add(text.toLowerCase());
    }
  }

  return [...hints].slice(0, 8);
}

function extractBrandFromHtml(html: string): string {
  const patterns = [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function extractJsonLdProducts(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product") {
          products.push({
            title: item.name ?? "",
            description: item.description ?? "",
            productType: item.category ?? "",
            vendor: item.brand?.name ?? "",
            price: parseFloat(item.offers?.price ?? "0"),
            tags: [],
            url: item.url ?? "",
          });
        }
      }
    } catch {
      // skip invalid JSON-LD
    }
  }
  return products.slice(0, 50);
}

function extractDomainBrand(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname.split(".")[0];
  } catch {
    return "Unknown";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export async function scrapeStore(rawUrl: string): Promise<ScrapedStore> {
  const url = normalizeUrl(rawUrl);

  // Try Shopify first (most of our target users are on Shopify)
  const shopify = await scrapeShopify(url);
  if (shopify && shopify.products.length > 0) return shopify;

  // Fallback: generic scraper
  const generic = await scrapeGeneric(url);
  if (generic) return generic;

  // Last resort: return placeholder with domain-based brand name
  return {
    brandName: extractDomainBrand(url),
    storeName: extractDomainBrand(url),
    products: [],
    storeUrl: url,
  };
}
