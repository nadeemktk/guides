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
  metaDescription: string;
  headings: string[];
  navItems: string[];
  rawContentSnippet: string;
  aboutContent: string;
  schemaTypes: string[];
  locationSignals: string[];
  businessCategory: string;
  keyPhrases: string[];
  socialLinks: string[];
  contactInfo: string;
}

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
}

function extractMetaDescription(html: string): string {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim().slice(0, 400);
  }
  return "";
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const tagRegex = /<h[1-4][^>]*>([\s\S]{0,300}?)<\/h[1-4]>/gi;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
    if (text && text.length > 2 && text.length < 200) {
      headings.push(text);
    }
    if (headings.length >= 20) break;
  }
  return headings;
}

function extractNavItemsFromHtml(html: string): string[] {
  const navSection =
    html.match(/<nav[^>]*>([\s\S]{0,12000}?)<\/nav>/i)?.[1] ?? html.slice(0, 30000);
  const allMatches = [...navSection.matchAll(/<a[^>]*>([^<]{2,35})<\/a>/gi)];
  const linkTexts = allMatches.map((m) => m[1].trim());
  const skipWords =
    /^(login|sign in|sign up|cart|account|about|contact|help|faq|blog|terms|privacy|order|track|wishlist|cookie|language|menu|home|search|\d+|\$|€|£)$/i;
  const items: string[] = [];
  for (const text of linkTexts) {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length < 2) continue;
    if (skipWords.test(clean)) continue;
    if (/^\d+$/.test(clean)) continue;
    if (!items.includes(clean)) {
      items.push(clean);
    }
    if (items.length >= 15) break;
  }
  return items;
}

function extractRawContent(html: string, limit = 3000): string {
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, limit);
}

function extractSchemaTypes(html: string): string[] {
  const types: string[] = [];
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"]) {
          const t = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          types.push(...t);
        }
        if (item["@graph"]) {
          for (const g of (item["@graph"] as Array<{ "@type"?: string | string[] }>) ) {
            if (g["@type"]) {
              const t = Array.isArray(g["@type"]) ? g["@type"] : [g["@type"]];
              types.push(...t);
            }
          }
        }
      }
    } catch {
      // skip invalid JSON-LD
    }
  }
  return [...new Set(types)];
}

function extractLocationSignals(html: string, url: string): string[] {
  const signals: string[] = [];

  try {
    const hostname = new URL(url).hostname;
    const tldMap: Record<string, string> = {
      ae: "UAE", sa: "Saudi Arabia", qa: "Qatar", kw: "Kuwait",
      bh: "Bahrain", om: "Oman", jo: "Jordan", eg: "Egypt",
      uk: "United Kingdom", au: "Australia", ca: "Canada",
      de: "Germany", fr: "France", sg: "Singapore", in: "India",
      pk: "Pakistan", ng: "Nigeria", za: "South Africa",
      nz: "New Zealand", ie: "Ireland", my: "Malaysia",
    };
    if (hostname.endsWith(".co.uk") || hostname.endsWith(".uk")) signals.push("United Kingdom");
    if (hostname.endsWith(".com.au") || hostname.endsWith(".au")) signals.push("Australia");
    if (hostname.endsWith(".com.sg") || hostname.endsWith(".sg")) signals.push("Singapore");
    const tld = hostname.split(".").pop()?.toLowerCase() ?? "";
    if (tldMap[tld] && !signals.includes(tldMap[tld])) signals.push(tldMap[tld]);
  } catch {}

  const geoMatch = html.match(/<meta[^>]+name=["']geo\.region["'][^>]+content=["']([^"']+)["']/i);
  if (geoMatch?.[1]) signals.push(geoMatch[1]);

  if (/\+971|\b971\b|Dubai|Abu Dhabi|Sharjah|\bUAE\b|Emirates/i.test(html) && !signals.includes("UAE")) signals.push("UAE");
  if (/\+44|\bLondon\b|\bUnited Kingdom\b|\bEngland\b/i.test(html) && !signals.includes("United Kingdom")) signals.push("United Kingdom");
  if (/\+61|\bAustralia\b|\bSydney\b|\bMelbourne\b/i.test(html) && !signals.includes("Australia")) signals.push("Australia");
  if (/\+1[\s-]?\(?\d{3}\)?|\bUSA\b|\bUnited States\b/i.test(html) && !signals.includes("USA")) signals.push("USA");
  if (/\+966|\bSaudi Arabia\b|\bRiyadh\b/i.test(html) && !signals.includes("Saudi Arabia")) signals.push("Saudi Arabia");

  return [...new Set(signals)].slice(0, 3);
}

function extractKeyPhrases(html: string, metaDesc: string, headings: string[]): string[] {
  const phrases = new Set<string>();

  const kwMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
  if (kwMatch?.[1]) {
    kwMatch[1].split(",").map((k) => k.trim()).filter((k) => k.length > 2 && k.length < 50)
      .slice(0, 10).forEach((k) => phrases.add(k.toLowerCase()));
  }

  metaDesc.toLowerCase().split(/[\s,|–—]+/).filter((w) => w.length > 3)
    .slice(0, 30).forEach((w) => phrases.add(w));

  for (const h of headings.slice(0, 8)) {
    h.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
      .filter((w) => w.length > 3).slice(0, 5).forEach((w) => phrases.add(w));
  }

  const stopWords = new Set([
    "that", "this", "with", "from", "have", "your", "will", "more", "been",
    "they", "their", "what", "when", "where", "which", "about", "also",
    "into", "than", "then", "them", "these", "those", "some", "such",
    "only", "over", "like", "just", "even", "here", "there", "make",
    "many", "much", "very", "most", "best", "find", "know", "need",
    "shop", "store", "online", "free", "get", "now", "order",
  ]);
  return [...phrases].filter((p) => !stopWords.has(p)).slice(0, 20);
}

function extractSocialLinks(html: string): string[] {
  const socialDomains = ["facebook.com", "instagram.com", "twitter.com", "linkedin.com", "youtube.com", "tiktok.com"];
  const links: string[] = [];
  const hrefRegex = /href=["'](https?:\/\/(?:www\.)?[^"'?#]+)["']/gi;
  let m;
  while ((m = hrefRegex.exec(html)) !== null) {
    const href = m[1];
    if (socialDomains.some((d) => href.includes(d))) {
      if (!links.includes(href)) links.push(href);
    }
    if (links.length >= 6) break;
  }
  return links;
}

function extractContactInfo(html: string): string {
  const parts: string[] = [];
  const phoneMatch = html.match(/(\+[\d\s\-().]{8,20}|\b0\d{9,}\b)/);
  if (phoneMatch?.[0]) parts.push(`Phone: ${phoneMatch[0].trim()}`);
  const emailMatch = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch?.[0] && !emailMatch[0].includes("example.com")) parts.push(`Email: ${emailMatch[0]}`);
  return parts.join(" | ").slice(0, 200);
}

function detectBusinessCategory(
  schemaTypes: string[],
  navItems: string[],
  headings: string[],
  metaDesc: string,
  content: string
): string {
  const allText = `${navItems.join(" ")} ${headings.join(" ")} ${metaDesc} ${content}`.toLowerCase();

  if (schemaTypes.some((t) => /SoftwareApplication|WebApplication|MobileApplication/.test(t))) return "saas_software";
  if (schemaTypes.some((t) => /LocalBusiness|HomeAndConstruction|ProfessionalService/.test(t))) return "local_business";
  if (schemaTypes.some((t) => /Restaurant|FoodEstablishment/.test(t))) return "food_restaurant";
  if (schemaTypes.some((t) => /MedicalBusiness|Dentist|Physician|Hospital/.test(t))) return "healthcare";
  if (schemaTypes.some((t) => /RealEstateAgent|RealEstateListing/.test(t))) return "real_estate";
  if (schemaTypes.some((t) => /Hotel|LodgingBusiness|TouristAttraction/.test(t))) return "travel_hospitality";
  if (schemaTypes.some((t) => /Product|ItemList|Offer/.test(t))) return "ecommerce";

  if (/\b(app|software|saas|platform|tool|dashboard|api|subscription|free trial|sign.?in|log.?in|pricing plan)\b/.test(allText)) return "saas_software";
  if (/\b(pest control|cleaning service|plumbing|electrical|hvac|air.?condition|roofing|painting|landscaping|renovation|handyman)\b/.test(allText)) return "home_services";
  if (/\b(restaurant|cafe|food|delivery|menu|dining|cuisine|catering)\b/.test(allText)) return "food_restaurant";
  if (/\b(clinic|hospital|medical|dental|doctor|therapy|healthcare|treatment|pharmacy|health center)\b/.test(allText)) return "healthcare";
  if (/\b(real estate|property|rent|lease|mortgage|apartment|villa|house|realtor|agent)\b/.test(allText)) return "real_estate";
  if (/\b(travel|hotel|resort|tour|flight|vacation|holiday|booking|visa|tourism)\b/.test(allText)) return "travel_hospitality";
  if (/\b(education|course|training|school|university|tutoring|learning|certificate|bootcamp|academy)\b/.test(allText)) return "education";
  if (/\b(law|legal|attorney|solicitor|advocate|court|compliance|notary|immigration)\b/.test(allText)) return "legal";
  if (/\b(accounting|finance|tax|audit|bookkeeping|investment|financial planning|insurance)\b/.test(allText)) return "finance";
  if (/\b(marketing|seo|advertising|branding|social media|digital marketing|pr agency|content agency)\b/.test(allText)) return "marketing_agency";
  if (/\b(logistics|freight|shipping|courier|delivery|warehousing|supply chain|cargo)\b/.test(allText)) return "logistics";
  if (/\b(construction|contracting|engineering|architecture|infrastructure|fitout|interior design)\b/.test(allText)) return "construction";
  if (/\b(shop|store|buy|cart|checkout|products?|collection|catalogue|ecommerce)\b/.test(allText)) return "ecommerce";

  return "general_business";
}

async function fetchPage(url: string, timeout = 12000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchAboutContent(baseUrl: string): Promise<string> {
  const paths = ["/about", "/about-us", "/services", "/our-services", "/what-we-do", "/who-we-are", "/contact"];
  for (const path of paths) {
    const html = await fetchPage(`${baseUrl}${path}`, 8000);
    if (html) {
      const snippet = extractRawContent(html, 1500);
      if (snippet.length > 150) return snippet;
    }
  }
  return "";
}

async function scrapeShopify(baseUrl: string): Promise<ScrapedStore | null> {
  try {
    const res = await fetch(`${baseUrl}/products.json?limit=250`, {
      headers: { "User-Agent": "AISeen/1.0 (AI Visibility Scanner)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = await res.json() as { products?: unknown[] };
    if (!data.products || !Array.isArray(data.products)) return null;

    const products: ScrapedProduct[] = (data.products as Array<{
      title?: string;
      body_html?: string;
      product_type?: string;
      vendor?: string;
      variants?: Array<{ price?: string }>;
      tags?: string | string[];
      handle?: string;
    }>).slice(0, 80).map((p) => ({
      title: p.title ?? "",
      description: stripHtml(p.body_html ?? "").slice(0, 300),
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

    if (products.length === 0) return null;

    const vendorCounts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.vendor) vendorCounts[p.vendor] = (vendorCounts[p.vendor] ?? 0) + 1;
    });
    const brandName =
      Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      extractDomainBrand(baseUrl);

    const html = await fetchPage(baseUrl) ?? "";
    const metaDescription = extractMetaDescription(html);
    const headings = extractHeadings(html);
    const navItems = extractNavItemsFromHtml(html);
    const rawContentSnippet = extractRawContent(html, 2500);
    const schemaTypes = extractSchemaTypes(html);
    const locationSignals = extractLocationSignals(html, baseUrl);
    const keyPhrases = extractKeyPhrases(html, metaDescription, headings);
    const socialLinks = extractSocialLinks(html);
    const contactInfo = extractContactInfo(html);
    const aboutContent = await fetchAboutContent(baseUrl);

    const productTypes = [...new Set(products.map((p) => p.productType).filter(Boolean))].slice(0, 8);
    const allTags = [...new Set(products.flatMap((p) => p.tags))].slice(0, 15);

    return {
      brandName,
      storeName: extractTitle(html) || brandName,
      products,
      storeUrl: baseUrl,
      metaDescription,
      headings,
      navItems: [...new Set([...navItems, ...productTypes])].slice(0, 15),
      rawContentSnippet: aboutContent
        ? `${rawContentSnippet}\n\n[About/Services]: ${aboutContent}`
        : rawContentSnippet,
      aboutContent,
      schemaTypes,
      locationSignals,
      businessCategory: "ecommerce",
      keyPhrases: [...new Set([...keyPhrases, ...allTags])].slice(0, 25),
      socialLinks,
      contactInfo,
    };
  } catch {
    return null;
  }
}

async function scrapeGeneric(baseUrl: string): Promise<ScrapedStore | null> {
  const html = await fetchPage(baseUrl);
  if (!html) return null;

  const brandName = extractBrandFromHtml(html) || extractDomainBrand(baseUrl);
  const storeName = extractTitle(html) || brandName;
  const metaDescription = extractMetaDescription(html);
  const headings = extractHeadings(html);
  const navItems = extractNavItemsFromHtml(html);
  const rawContentSnippet = extractRawContent(html, 2500);
  const schemaTypes = extractSchemaTypes(html);
  const locationSignals = extractLocationSignals(html, baseUrl);
  const keyPhrases = extractKeyPhrases(html, metaDescription, headings);
  const socialLinks = extractSocialLinks(html);
  const contactInfo = extractContactInfo(html);
  const aboutContent = await fetchAboutContent(baseUrl);
  const businessCategory = detectBusinessCategory(schemaTypes, navItems, headings, metaDescription, rawContentSnippet);

  const jsonLdProducts = extractJsonLdProducts(html);
  const categoryHints = extractCategoryHints(navItems, metaDescription);
  const syntheticProducts: ScrapedProduct[] = [
    ...jsonLdProducts,
    ...categoryHints.map((cat) => ({
      title: cat,
      description: "",
      productType: cat,
      vendor: brandName,
      price: 0,
      tags: [],
      url: baseUrl,
    })),
  ].slice(0, 20);

  return {
    brandName,
    storeName,
    products: syntheticProducts,
    storeUrl: baseUrl,
    metaDescription,
    headings,
    navItems,
    rawContentSnippet: aboutContent
      ? `${rawContentSnippet}\n\n[About/Services]: ${aboutContent}`
      : rawContentSnippet,
    aboutContent,
    schemaTypes,
    locationSignals,
    businessCategory,
    keyPhrases,
    socialLinks,
    contactInfo,
  };
}

function extractCategoryHints(navItems: string[], metaDesc: string): string[] {
  const hints = new Set<string>();

  // Directly use nav items as category hints
  navItems.slice(0, 10).forEach((item) => {
    if (item.length > 2 && item.length < 50) hints.add(item);
  });

  // Extract business-relevant terms from meta description
  const commonTerms =
    /\b(pest control|cleaning|plumbing|electrical|landscaping|hvac|roofing|painting|flooring|renovation|interior design|architecture|logistics|freight|shipping|courier|immigration|visa|legal|accounting|tax|it support|cybersecurity|web design|marketing|seo|social media|real estate|property|construction|manufacturing|catering|event management|photography|videography|wellness|fitness|yoga|physiotherapy|dentistry|skincare|haircare|cosmetics|jewellery|jewelry|watches|footwear|clothing|fashion|electronics|furniture|appliances|automotive|car|vehicle|travel|tours|hotel|restaurant|education|tutoring|coaching|consulting|financial|insurance|banking|telecom|software|saas|app|mobile|ecommerce|retail|wholesale|grocery|pharmacy|veterinary|childcare|elder care|security|surveillance|printing|signage|advertising)\b/gi;

  const matches = [...metaDesc.matchAll(commonTerms)];
  matches.forEach((m) => hints.add(m[0]));

  return [...hints].filter((h) => h.length > 2).slice(0, 10);
}

function extractBrandFromHtml(html: string): string {
  const patterns = [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{1,60})["']/i,
    /<meta[^>]+content=["']([^"']{1,60})["'][^>]+property=["']og:site_name["']/i,
    /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']{1,60})["']/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]) return m[1].trim();
  }
  const orgMatch = html.match(/"@type"\s*:\s*"(?:Organization|LocalBusiness|Brand)"[^}]*?"name"\s*:\s*"([^"]{1,60})"/i);
  if (orgMatch?.[1]) return orgMatch[1].trim();
  return "";
}

function extractJsonLdProducts(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product") {
          products.push({
            title: item.name ?? "",
            description: (item.description ?? "").slice(0, 300),
            productType: item.category ?? "",
            vendor: item.brand?.name ?? "",
            price: parseFloat(item.offers?.price ?? "0"),
            tags: [],
            url: item.url ?? "",
          });
        }
        if (item["@type"] === "Service" || item["@type"] === "LocalBusiness") {
          const services: string[] = (item.hasOfferCatalog?.itemListElement ?? [])
            .map((i: { name?: string }) => i.name)
            .filter(Boolean);
          services.forEach((s) => {
            products.push({
              title: s,
              description: "",
              productType: "service",
              vendor: item.name ?? "",
              price: 0,
              tags: [],
              url: item.url ?? "",
            });
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
    const brand = hostname.split(".")[0];
    return brand.charAt(0).toUpperCase() + brand.slice(1);
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
    .trim();
}

export async function scrapeStore(rawUrl: string): Promise<ScrapedStore> {
  const url = normalizeUrl(rawUrl);

  const shopify = await scrapeShopify(url);
  if (shopify && shopify.products.length > 0) return shopify;

  const generic = await scrapeGeneric(url);
  if (generic) return generic;

  return {
    brandName: extractDomainBrand(url),
    storeName: extractDomainBrand(url),
    products: [],
    storeUrl: url,
    metaDescription: "",
    headings: [],
    navItems: [],
    rawContentSnippet: "",
    aboutContent: "",
    schemaTypes: [],
    locationSignals: [],
    businessCategory: "general_business",
    keyPhrases: [],
    socialLinks: [],
    contactInfo: "",
  };
}
