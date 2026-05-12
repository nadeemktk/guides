import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
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
  if (!process.env.ANTHROPIC_API_KEY) {
    return generateFallbackQueries(brandName, products, count);
  }

  const prompt = QUERY_GENERATION_PROMPT.replace("{count}", String(count))
    .replace("{brand_name}", brandName)
    .replace("{product_sample}", buildProductSample(products));

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      messages: [{ role: "user", content: prompt }],
      maxOutputTokens: 4096,
      temperature: 0.7,
    });

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuery[];
    return parsed.slice(0, count);
  } catch (err) {
    console.error("Query generation failed, using fallback:", err);
    return generateFallbackQueries(brandName, products, count);
  }
}

// Fallback queries when Claude API is unavailable — uses brand name and any detected categories
function generateFallbackQueries(
  brandName: string,
  products: ScrapedProduct[],
  count: number
): GeneratedQuery[] {
  const categories = [...new Set(products.map((p) => p.productType).filter(Boolean))];
  const category = categories[0] || "";
  const sub = category || "products";
  const brand = brandName || "this brand";

  // Brand-specific queries that test if AI recommends this brand organically
  const brandedTemplates: GeneratedQuery[] = [
    { query_text: `best alternatives to ${brand}`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `sites like ${brand}`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `is ${brand} reliable for online shopping`, category: "comparison", intent: "informational", expected_competitor_brands: [] },
    { query_text: `${brand} vs competitors`, category: "comparison", intent: "informational", expected_competitor_brands: [] },
    { query_text: `top ${sub} stores online`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
  ];

  // Category-based queries (generic but still useful)
  const categoryTemplates: GeneratedQuery[] = [
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
    { query_text: `${sub} for beginners vs advanced`, category: "comparison", intent: "informational", expected_competitor_brands: [] },
    { query_text: `best ${sub} for home use`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `highly rated ${sub} brands`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `best value ${sub}`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
  ];

  return [...brandedTemplates, ...categoryTemplates].slice(0, count);
}
