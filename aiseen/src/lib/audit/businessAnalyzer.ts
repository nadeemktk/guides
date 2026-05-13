import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ScrapedStore } from "./scraper";

export interface BusinessProfile {
  businessType: string;
  niche: string;
  subNiche: string;
  targetAudience: string;
  location: string;
  locationSpecific: string[];
  keyOfferings: string[];
  topKeywords: string[];
  pricePoint: "budget" | "mid-range" | "premium" | "luxury";
  uniqueSellingPoints: string[];
  estimatedCompetitors: string[];
  businessModel: "b2c" | "b2b" | "both";
  industryVertical: string;
  problemsSolved: string[];
}

const ANALYSIS_PROMPT = `You are an expert business intelligence analyst specializing in AI search visibility. Analyze this business and extract a precise, niche-specific business profile.

BUSINESS URL: {store_url}
BUSINESS NAME: {store_name}
DETECTED CATEGORY: {business_category}
LOCATION SIGNALS: {location_signals}
META DESCRIPTION: {meta_description}
PAGE HEADINGS: {headings}
NAVIGATION ITEMS: {nav_items}
WEBSITE CONTENT: {content_snippet}
ABOUT/SERVICES PAGE: {about_content}
SCHEMA TYPES DETECTED: {schema_types}
CONTACT INFO: {contact_info}
KEY PHRASES: {key_phrases}
PRODUCTS/SERVICES:
{product_sample}

Your job: produce a HIGHLY SPECIFIC business profile. Do NOT be generic. Every field must be specific to THIS business.

Rules:
- "niche" must be ultra-specific (e.g. "residential pest control UAE" not just "pest control")
- "subNiche" is even more specific (e.g. "cockroach and termite treatment Dubai" not "pest services")
- "keyOfferings" must list ACTUAL services/products from the data, not generic terms
- "estimatedCompetitors" must be REAL competitor businesses in the SAME niche and location
- "topKeywords" must be actual search terms customers would use to find THIS business
- "problemsSolved" must be real problems this business solves for customers
- "targetAudience" must be specific (e.g. "UAE homeowners and property managers" not "customers")
- "location" must reflect the actual geographic market served
- "locationSpecific" must list actual cities/regions this business serves

Return strict JSON only, no markdown:
{
  "businessType": "precise business type (e.g. 'residential pest control company', 'B2B SaaS analytics platform', 'luxury skincare DTC brand')",
  "niche": "specific market niche with location if applicable",
  "subNiche": "even more specific sub-niche or specialty",
  "targetAudience": "precise primary customer description with demographics and geography",
  "location": "primary geographic market (e.g. 'UAE', 'Dubai', 'UK', 'global')",
  "locationSpecific": ["list of specific cities/regions served, e.g. 'Dubai', 'Abu Dhabi'"],
  "keyOfferings": ["list of 5-8 specific products/services this business actually provides"],
  "topKeywords": ["10-15 specific search phrases customers would type to find this business"],
  "pricePoint": "one of: budget, mid-range, premium, luxury",
  "uniqueSellingPoints": ["3-6 specific differentiators for this business"],
  "estimatedCompetitors": ["6-10 real named competing businesses in the same niche and market"],
  "businessModel": "b2c or b2b or both",
  "industryVertical": "industry sector (e.g. 'pest control', 'SaaS', 'fashion retail', 'professional services')",
  "problemsSolved": ["3-5 specific customer problems this business solves"]
}`;

function buildAnalysisPrompt(store: ScrapedStore): string {
  const productSample =
    store.products
      .slice(0, 25)
      .map(
        (p) =>
          `- ${p.title}${p.productType ? ` [${p.productType}]` : ""}${p.price && p.price > 0 ? ` — $${p.price}` : ""}${p.description ? `: ${p.description.slice(0, 100)}` : ""}`
      )
      .join("\n") || "No structured product/service data extracted — analyze from content above";

  return ANALYSIS_PROMPT
    .replace("{store_url}", store.storeUrl)
    .replace("{store_name}", store.storeName)
    .replace("{business_category}", store.businessCategory)
    .replace("{location_signals}", store.locationSignals.join(", ") || "Not detected — infer from content")
    .replace("{meta_description}", store.metaDescription || "Not available")
    .replace("{headings}", store.headings.slice(0, 15).join(" | ") || "Not available")
    .replace("{nav_items}", store.navItems.slice(0, 12).join(", ") || "Not available")
    .replace("{content_snippet}", store.rawContentSnippet?.slice(0, 1500) || "Not available")
    .replace("{about_content}", store.aboutContent?.slice(0, 1000) || "Not available")
    .replace("{schema_types}", store.schemaTypes.join(", ") || "None detected")
    .replace("{contact_info}", store.contactInfo || "Not available")
    .replace("{key_phrases}", store.keyPhrases.slice(0, 15).join(", ") || "Not available")
    .replace("{product_sample}", productSample);
}

function inferLocationFromStore(store: ScrapedStore): string {
  if (store.locationSignals.length > 0) return store.locationSignals[0];

  const allText = `${store.metaDescription} ${store.headings.join(" ")} ${store.rawContentSnippet}`.toLowerCase();
  if (/dubai|abu dhabi|sharjah|\buae\b|emirates/.test(allText)) return "UAE";
  if (/london|\buk\b|united kingdom|england|scotland/.test(allText)) return "UK";
  if (/australia|sydney|melbourne|brisbane/.test(allText)) return "Australia";
  if (/saudi|riyadh|jeddah/.test(allText)) return "Saudi Arabia";
  if (/singapore|sg/.test(allText)) return "Singapore";
  if (/canada|toronto|vancouver|calgary/.test(allText)) return "Canada";

  return "global";
}

function buildFallbackProfile(store: ScrapedStore): BusinessProfile {
  const location = inferLocationFromStore(store);
  const locationSuffix = location !== "global" ? ` in ${location}` : "";

  // Use business category and nav items to build a specific niche
  const categoryMap: Record<string, { niche: string; offerings: string[]; keywords: string[]; competitors: string[] }> = {
    home_services: {
      niche: `home services${locationSuffix}`,
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["cleaning", "maintenance", "repair", "installation", "inspection"],
      keywords: ["home services", `home maintenance${locationSuffix}`, `professional cleaning${locationSuffix}`, `home repair${locationSuffix}`],
      competitors: [],
    },
    saas_software: {
      niche: "SaaS software platform",
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["analytics", "automation", "integrations", "reporting", "dashboard"],
      keywords: ["SaaS platform", "business software", "online tool", "automation software", "analytics platform"],
      competitors: [],
    },
    healthcare: {
      niche: `healthcare services${locationSuffix}`,
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["consultation", "treatment", "diagnosis", "therapy", "checkup"],
      keywords: [`medical clinic${locationSuffix}`, `healthcare provider${locationSuffix}`, `doctor${locationSuffix}`, "medical consultation"],
      competitors: [],
    },
    real_estate: {
      niche: `real estate${locationSuffix}`,
      offerings: ["property sales", "rentals", "property management", "investment properties", "commercial leasing"],
      keywords: [`property for sale${locationSuffix}`, `rent apartment${locationSuffix}`, `real estate agent${locationSuffix}`, "property investment"],
      competitors: [],
    },
    food_restaurant: {
      niche: `food and dining${locationSuffix}`,
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["dine-in", "takeaway", "delivery", "catering", "private dining"],
      keywords: [`restaurant${locationSuffix}`, `food delivery${locationSuffix}`, `best restaurant${locationSuffix}`, "online food order"],
      competitors: [],
    },
    education: {
      niche: `education and training${locationSuffix}`,
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["online courses", "tutoring", "certifications", "workshops", "coaching"],
      keywords: [`online courses${locationSuffix}`, "learning platform", "professional training", `certification programs${locationSuffix}`],
      competitors: [],
    },
    legal: {
      niche: `legal services${locationSuffix}`,
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["legal consultation", "contract review", "litigation", "compliance", "documentation"],
      keywords: [`law firm${locationSuffix}`, `legal services${locationSuffix}`, `lawyer${locationSuffix}`, "legal advice"],
      competitors: [],
    },
    finance: {
      niche: `financial services${locationSuffix}`,
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["tax filing", "accounting", "financial planning", "audit", "bookkeeping"],
      keywords: [`accounting firm${locationSuffix}`, `tax services${locationSuffix}`, `financial advisor${locationSuffix}`, "bookkeeping service"],
      competitors: [],
    },
    marketing_agency: {
      niche: `digital marketing agency${locationSuffix}`,
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["SEO", "social media marketing", "content marketing", "PPC advertising", "branding"],
      keywords: [`digital marketing agency${locationSuffix}`, `SEO agency${locationSuffix}`, "online marketing", "social media agency"],
      competitors: [],
    },
    logistics: {
      niche: `logistics and freight${locationSuffix}`,
      offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["freight forwarding", "warehousing", "last-mile delivery", "customs clearance", "supply chain"],
      keywords: [`logistics company${locationSuffix}`, `freight forwarding${locationSuffix}`, `shipping company${locationSuffix}`, "courier service"],
      competitors: [],
    },
    ecommerce: {
      niche: `online retail${locationSuffix}`,
      offerings: store.products.slice(0, 5).map((p) => p.title || p.productType).filter(Boolean).slice(0, 5),
      keywords: [`buy online${locationSuffix}`, `best products${locationSuffix}`, `online shop${locationSuffix}`, "free shipping"],
      competitors: [],
    },
  };

  const catData = categoryMap[store.businessCategory] ?? {
    niche: store.navItems[0] || store.metaDescription.split(" ").slice(0, 4).join(" ") || `services${locationSuffix}`,
    offerings: store.navItems.slice(0, 5).length > 0 ? store.navItems.slice(0, 5) : ["professional services"],
    keywords: [store.brandName, `${store.navItems[0] || "services"}${locationSuffix}`],
    competitors: [],
  };

  const categories = [...new Set(store.products.map((p) => p.productType).filter(Boolean))];
  if (categories.length > 0 && catData.offerings.length === 0) {
    catData.offerings = categories.slice(0, 5);
  }

  return {
    businessType: store.businessCategory.replace(/_/g, " "),
    niche: catData.niche,
    subNiche: store.navItems.slice(0, 2).join(" and ") || catData.niche,
    targetAudience: location !== "global" ? `${location} customers` : "online customers",
    location,
    locationSpecific: store.locationSignals,
    keyOfferings: catData.offerings.length > 0 ? catData.offerings : [catData.niche],
    topKeywords: [...catData.keywords, store.brandName].filter(Boolean),
    pricePoint: "mid-range",
    uniqueSellingPoints: ["professional service", "experienced team", "quality guaranteed"],
    estimatedCompetitors: catData.competitors,
    businessModel: "b2c",
    industryVertical: store.businessCategory.replace(/_/g, " "),
    problemsSolved: [`need for ${catData.offerings[0] || catData.niche}`, `finding reliable ${catData.niche} providers`],
  };
}

export async function analyzeBusinessProfile(store: ScrapedStore): Promise<BusinessProfile> {
  const prompt = buildAnalysisPrompt(store);

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { text } = await generateText({
        model: anthropic("claude-3-5-haiku-20241022"),
        messages: [{ role: "user", content: prompt }],
        maxOutputTokens: 1500,
        temperature: 0.2,
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as BusinessProfile;
        if (parsed.niche && Array.isArray(parsed.keyOfferings) && parsed.keyOfferings.length > 0) {
          // Validate quality — reject generic outputs
          const isGeneric = parsed.niche.length < 5 ||
            parsed.niche === "e-commerce" ||
            parsed.niche === "products" ||
            parsed.estimatedCompetitors.length === 0;

          if (!isGeneric) return parsed;

          // Retry with stricter prompt if output was too generic
          parsed.location = parsed.location || inferLocationFromStore(store);
          if (parsed.estimatedCompetitors.length === 0) {
            parsed.estimatedCompetitors = [];
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error("Anthropic business analysis failed:", err);
    }
  }

  if (process.env.GOOGLE_GEMINI_API_KEY) {
    try {
      const googleAI = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      });
      const { text } = await generateText({
        model: googleAI("gemini-2.5-flash"),
        messages: [{ role: "user", content: prompt }],
        maxOutputTokens: 1500,
        temperature: 0.2,
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as BusinessProfile;
        if (parsed.niche && Array.isArray(parsed.keyOfferings) && parsed.keyOfferings.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("Gemini business analysis failed:", err);
    }
  }

  return buildFallbackProfile(store);
}
