import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ScrapedStore } from "./scraper";

export interface BusinessProfile {
  businessType: string;
  niche: string;
  targetAudience: string;
  location: string;
  keyOfferings: string[];
  topKeywords: string[];
  pricePoint: "budget" | "mid-range" | "premium" | "luxury";
  uniqueSellingPoints: string[];
  estimatedCompetitors: string[];
}

const ANALYSIS_PROMPT = `You are an expert e-commerce and retail analyst. Analyze this online store and extract a structured business profile.

Store URL: {store_url}
Store Name: {store_name}
Meta Description: {meta_description}
Page Headings: {headings}
Navigation Items: {nav_items}
Content Snippet: {content_snippet}
Sample Products:
{product_sample}

Based on all available information, extract a structured business profile. Return strict JSON only, no markdown fences:
{
  "businessType": "type of business (e.g. DTC brand, marketplace, retailer, service, SaaS)",
  "niche": "specific niche (e.g. sustainable activewear, artisan coffee, luxury skincare, pet supplies)",
  "targetAudience": "primary customer segment (e.g. eco-conscious millennials, fitness enthusiasts, UAE shoppers, small business owners)",
  "location": "primary market or region (e.g. UAE, US, UK, Australia, Middle East, global)",
  "keyOfferings": ["top 5 product or service types this brand sells"],
  "topKeywords": ["8-10 specific shopping keywords a customer would search to find this brand"],
  "pricePoint": "one of: budget, mid-range, premium, luxury",
  "uniqueSellingPoints": ["3-5 things that make this brand stand out"],
  "estimatedCompetitors": ["5-8 real competing brands in the same niche and market"]
}`;

function buildAnalysisPrompt(store: ScrapedStore): string {
  const productSample =
    store.products
      .slice(0, 15)
      .map(
        (p) =>
          `- ${p.title}${p.productType ? ` (${p.productType})` : ""}${p.price ? ` — $${p.price}` : ""}`
      )
      .join("\n") || "No products available";

  return ANALYSIS_PROMPT
    .replace("{store_url}", store.storeUrl)
    .replace("{store_name}", store.storeName)
    .replace("{meta_description}", store.metaDescription || "Not available")
    .replace("{headings}", store.headings.slice(0, 10).join(" | ") || "Not available")
    .replace("{nav_items}", store.navItems.slice(0, 10).join(", ") || "Not available")
    .replace("{content_snippet}", store.rawContentSnippet?.slice(0, 500) || "Not available")
    .replace("{product_sample}", productSample);
}

function buildFallbackProfile(store: ScrapedStore): BusinessProfile {
  const categories = [...new Set(store.products.map((p) => p.productType).filter(Boolean))];
  const niche = categories[0] || store.navItems[0] || store.metaDescription.split(" ").slice(0, 3).join(" ") || "products";

  return {
    businessType: "e-commerce retailer",
    niche,
    targetAudience: "online shoppers",
    location: "global",
    keyOfferings: categories.length > 0 ? categories.slice(0, 5) : [niche],
    topKeywords: [
      niche,
      `best ${niche}`,
      `buy ${niche} online`,
      `${niche} shop`,
      `${store.brandName} ${niche}`,
    ],
    pricePoint: "mid-range",
    uniqueSellingPoints: ["quality products", "online shopping convenience"],
    estimatedCompetitors: [],
  };
}

export async function analyzeBusinessProfile(store: ScrapedStore): Promise<BusinessProfile> {
  const prompt = buildAnalysisPrompt(store);

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { text } = await generateText({
        model: anthropic("claude-3-5-haiku-20241022"),
        messages: [{ role: "user", content: prompt }],
        maxOutputTokens: 1024,
        temperature: 0.3,
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as BusinessProfile;
        if (parsed.niche && Array.isArray(parsed.keyOfferings)) return parsed;
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
        maxOutputTokens: 1024,
        temperature: 0.3,
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as BusinessProfile;
        if (parsed.niche && Array.isArray(parsed.keyOfferings)) return parsed;
      }
    } catch (err) {
      console.error("Gemini business analysis failed:", err);
    }
  }

  return buildFallbackProfile(store);
}
