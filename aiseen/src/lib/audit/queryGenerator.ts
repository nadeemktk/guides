import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ScrapedProduct } from "./scraper";
import { QUERY_GENERATION_PROMPT } from "@/lib/llm";
import type { GeneratedQuery } from "@/types";

function buildProductSample(products: ScrapedProduct[]): string {
  return products
    .slice(0, 20)
    .map(
      (p) =>
        `- ${p.title}${p.productType ? ` (${p.productType})` : ""}${
          p.price ? ` — $${p.price}` : ""
        }${p.tags.length ? ` [${p.tags.slice(0, 5).join(", ")}]` : ""}`
    )
    .join("\n");
}

export async function generateQueries(
  brandName: string,
  products: ScrapedProduct[],
  count: number = 25
): Promise<GeneratedQuery[]> {
  const prompt = QUERY_GENERATION_PROMPT.replace("{count}", String(count))
    .replace("{brand_name}", brandName)
    .replace("{product_sample}", buildProductSample(products));

  // Try Anthropic first, then Gemini, then hardcoded fallback
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { text } = await generateText({
        model: anthropic("claude-3-5-haiku-20241022"),
        messages: [{ role: "user", content: prompt }],
        maxOutputTokens: 4096,
        temperature: 0.7,
      });
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array in response");
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuery[];
      if (parsed.length > 0) return parsed.slice(0, count);
    } catch (err) {
      console.error("Anthropic query generation failed:", err);
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
        maxOutputTokens: 4096,
        temperature: 0.7,
      });
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array in response");
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuery[];
      if (parsed.length > 0) return parsed.slice(0, count);
    } catch (err) {
      console.error("Gemini query generation failed:", err);
    }
  }

  console.warn("All AI query generation failed — using static fallback for brand:", brandName);
  return generateFallbackQueries(brandName, products, count);
}

function generateFallbackQueries(
  brandName: string,
  products: ScrapedProduct[],
  count: number
): GeneratedQuery[] {
  const categories = [...new Set(products.map((p) => p.productType).filter(Boolean))];
  const category = categories[0] || "";
  const sub = category || "products";
  const noCategory = !category;

  // When no product category is known, use general e-commerce queries where
  // a popular brand could be organically recommended by AI.
  // IMPORTANT: never use "best alternatives to X" — that prompts AI to list
  // competitors, not the brand itself, making the score always 0.
  const contextualTemplates: GeneratedQuery[] = noCategory ? [
    { query_text: "best online shopping websites 2026", category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: "most popular online marketplaces", category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: "top e-commerce sites with fast delivery", category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: "trusted online stores for shopping", category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: "best websites to shop online for deals", category: "comparison", intent: "commercial", expected_competitor_brands: [] },
  ] : [
    { query_text: `best online stores for ${sub}`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `top websites to buy ${sub} online`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `most popular ${sub} retailers online`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `where to buy ${sub} with fast delivery`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `recommended sites for ${sub} shopping`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
  ];

  const genericTemplates: GeneratedQuery[] = [
    { query_text: `best ${sub} for beginners`, category: "feature-specific", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `top rated ${sub} under $100`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `best ${sub} 2026`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `sustainable ${sub} brands`, category: "sustainability", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${sub} gift ideas`, category: "gift", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `best ${sub} for professionals`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `affordable ${sub} that lasts`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `eco-friendly ${sub} alternatives`, category: "sustainability", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${sub} for travel`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `premium ${sub} worth the price`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `most durable ${sub}`, category: "feature-specific", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${sub} with best reviews`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `beginner ${sub} starter kit`, category: "feature-specific", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `ethical ${sub} brands`, category: "sustainability", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${sub} under $50`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `luxury ${sub} brands`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `best ${sub} for home use`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `highly rated ${sub} brands`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `best value ${sub}`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${sub} for kids and families`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
  ];

  return [...contextualTemplates, ...genericTemplates].slice(0, count);
}
