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

// Fallback queries when no API key is available — covers common query patterns
function generateFallbackQueries(
  _brandName: string,
  products: ScrapedProduct[],
  count: number
): GeneratedQuery[] {
  const categories = [...new Set(products.map((p) => p.productType).filter(Boolean))];
  const category = categories[0] || "products";

  const templates: GeneratedQuery[] = [
    { query_text: `best ${category} for beginners`, category: "feature-specific", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `top rated ${category} under $100`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `best ${category} 2026`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `sustainable ${category} brands`, category: "sustainability", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} gift ideas`, category: "gift", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `best ${category} for professionals`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `affordable ${category} that lasts`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `eco-friendly ${category} alternatives`, category: "sustainability", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} for travel`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `premium ${category} worth the price`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `most durable ${category}`, category: "feature-specific", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} with best reviews`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `beginner ${category} starter kit`, category: "feature-specific", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} for small spaces`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `ethical ${category} brands`, category: "sustainability", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} under $50`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `luxury ${category} brands`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} for beginners vs advanced`, category: "comparison", intent: "informational", expected_competitor_brands: [] },
    { query_text: `best ${category} for home use`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} that doesn't break easily`, category: "feature-specific", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `highly rated ${category} brands`, category: "comparison", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} gift under $75`, category: "gift", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `best value ${category}`, category: "budget-tier", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `${category} for kids and adults`, category: "use-case", intent: "commercial", expected_competitor_brands: [] },
    { query_text: `waterproof ${category}`, category: "feature-specific", intent: "commercial", expected_competitor_brands: [] },
  ];

  return templates.slice(0, count);
}
