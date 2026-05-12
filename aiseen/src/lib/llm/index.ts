import { generateText, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type LLMProvider = "openai" | "anthropic" | "gemini" | "perplexity" | "google_aio";
export type PlanTier = "free" | "starter" | "growth" | "pro";

const MODELS: Record<LLMProvider, { pro: string; standard: string }> = {
  openai: { pro: "gpt-4o", standard: "gpt-4o-mini" },
  anthropic: { pro: "claude-sonnet-4-6", standard: "claude-3-5-haiku-20241022" },
  gemini: { pro: "gemini-2.5-pro", standard: "gemini-2.5-flash" },
  perplexity: { pro: "sonar", standard: "sonar" },
  google_aio: { pro: "google_aio", standard: "google_aio" },
};

// Cost per 1k tokens (input/output average) in USD — approximate
const COST_PER_1K: Record<string, number> = {
  "gpt-4o": 0.005,
  "gpt-4o-mini": 0.00015,
  "claude-sonnet-4-6": 0.003,
  "claude-3-5-haiku-20241022": 0.00025,
  "gemini-2.5-pro": 0.00125,
  "gemini-2.5-flash": 0.000075,
  sonar: 0.001,
};

export function getModel(provider: LLMProvider, tier: PlanTier) {
  const isPro = tier === "pro";
  const modelId = isPro ? MODELS[provider].pro : MODELS[provider].standard;

  switch (provider) {
    case "openai":
      return { model: openai(modelId), modelId };
    case "anthropic":
      return { model: anthropic(modelId), modelId };
    case "gemini": {
      // Use explicit key because env var is GOOGLE_GEMINI_API_KEY,
      // not the GOOGLE_GENERATIVE_AI_API_KEY the SDK auto-reads.
      const googleAI = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GEMINI_API_KEY ?? "",
      });
      return { model: googleAI(modelId), modelId };
    }
    default:
      return { model: null, modelId };
  }
}

export function estimateCost(modelId: string, tokensUsed: number): number {
  const rate = COST_PER_1K[modelId] ?? 0.001;
  return (tokensUsed / 1000) * rate;
}

export const SHOPPING_PROMPT_TEMPLATE = `You are a helpful shopping assistant. The user is researching a purchase. Recommend specific products and brands when relevant. Be specific — name the brands and products you'd recommend. If you'd suggest multiple options, list them in order of best fit.

User question: {query_text}`;

export const QUERY_GENERATION_PROMPT = `You are an expert e-commerce SEO and AI search optimization analyst.

I'll give you a brand and a sample of their product catalog. Generate {count} natural-language shopping queries that a real customer would type into ChatGPT, Perplexity, Gemini, or Google AI Overviews when they're considering buying products like these. The queries should NOT mention the brand by name — they're meant to test whether AI assistants recommend this brand organically.

Generate a balanced mix across these categories:
- Comparison queries (e.g., "best wireless headphones under $200")
- Problem-solving queries (e.g., "running shoes for plantar fasciitis")
- Gift queries (e.g., "thoughtful gift for new mom under $50")
- Sustainability/ethics queries (e.g., "ethical sneaker brands")
- Alternative-seeking queries (e.g., "alternatives to Allbirds wool runners")
- Budget-tier queries (e.g., "best budget yoga mat", "premium yoga mat worth the splurge")
- Feature-specific queries (e.g., "yoga mat that doesn't slip when sweaty")
- Use-case queries (e.g., "yoga mat for travel")
- Long-tail demographic queries (e.g., "yoga gear for tall women over 6 feet")

For each query return:
- query_text
- category (one of the categories above)
- intent (commercial / informational / navigational)
- expected_competitor_brands (which brands you'd expect AI to mention for this query)

Brand: {brand_name}
Sample products (up to 50): {product_sample}

Return as a JSON array. Generate exactly {count} queries.`;

export const RECOMMENDATIONS_PROMPT = `You are an AI search visibility expert. Analyze these monitoring results and generate 5-8 specific, actionable recommendations to improve how often AI assistants (ChatGPT, Gemini, Perplexity) recommend {brand_name}.

CURRENT PERFORMANCE:
- Visibility Score: {score}/100 (industry average: ~35)
- Brand mentioned in {mention_rate}% of monitored queries

QUERIES WHERE THE BRAND WAS NOT MENTIONED (recent):
{losing_queries}

COMPETITORS BEING RECOMMENDED INSTEAD:
{competitors}

PRODUCT CATALOG SAMPLE:
{products}

ATTRIBUTES AI CITES WHEN BRAND IS MENTIONED:
{winning_reasons}

Generate 5-8 recommendations. For each return:
- rec_type: one of [description_rewrite, schema_markup, content_topic, review_site, feature_gap]
- title: specific action title (max 12 words)
- rationale: why this helps AI discover the brand (2-3 sentences, specific to the data above)
- current_value: what the brand currently lacks or has (brief, based on the data — omit if not applicable)
- suggested_value: exactly what to add or change
- expected_impact: expected improvement description (e.g. "Could lift mention rate by 10-15%")

Return strict JSON array only. No markdown fences. No explanation outside the JSON.
[{"rec_type":..., "title":..., "rationale":..., "current_value":..., "suggested_value":..., "expected_impact":...}]`;

export const MENTION_EXTRACTION_PROMPT = `You are analyzing an AI shopping assistant's response to extract structured data.

Brand we're tracking: {brand_name} (also known as: {brand_aliases})
Products in our catalog: {top_50_product_titles}

Response to analyze:
"""
{response_text}
"""

Extract:
1. Was {brand_name} mentioned? (true/false)
2. If yes, position in the response (1 = first brand mentioned, 2 = second, etc.)
3. How was {brand_name} described? (verbatim 1-2 sentences from the response)
4. What reasons or attributes did the AI cite? (e.g., "affordable", "sustainable", "great reviews")
5. Sentiment toward {brand_name}: positive/neutral/negative
6. List ALL other brands mentioned in the response, in order
7. For each competitor brand: what reasons were cited for them?

Return strict JSON matching this schema:
{
  "own_brand_mentioned": boolean,
  "own_brand_position": number | null,
  "own_brand_description": string | null,
  "own_brand_reasons": string[],
  "own_brand_sentiment": "positive" | "neutral" | "negative" | null,
  "competitors": [
    { "name": string, "position": number, "reasons": string[], "description": string }
  ]
}`;
