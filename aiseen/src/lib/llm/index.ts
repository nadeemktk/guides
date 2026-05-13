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

// Used by the LLM runner to simulate real AI assistant queries.
// Neutral prompt that works for ALL business types (products, services, SaaS, local).
export const SHOPPING_PROMPT_TEMPLATE = `You are a knowledgeable AI assistant helping someone research options and make informed decisions. Answer the following question with specific, named recommendations where appropriate. Include real brand names, companies, service providers, or products you know about. When you have multiple options to recommend, list them clearly in order of best fit with brief explanations for each.

Question: {query_text}`;

export const QUERY_GENERATION_PROMPT = `You are an expert AI search visibility analyst. Generate {count} highly specific, natural-language queries that real customers type into ChatGPT, Gemini, Claude, or Perplexity when looking for products or services like those offered by {brand_name}.

CRITICAL: Do NOT mention {brand_name} by name. These queries test whether AI assistants recommend the brand organically.

BUSINESS CONTEXT:
- Brand: {brand_name}
- Niche: {niche}
- Location/Market: {location}
- Key Offerings: {key_offerings}
- Target Audience: {target_audience}
- Known Competitors: {competitors}

Generate queries covering: comparison, problem-solving, local-intent, use-case, budget-tier, feature-specific, trust-validation, discovery, and competitor-alternative categories.

Every query must be:
- Directly relevant to the {niche} niche in {location}
- Naturally phrased as a real customer would speak
- Unique (no duplicate-style phrasing)
- Specific enough to surface real competitors in the same niche

For each query return:
- query_text: the exact natural-language query
- category: one of the categories above
- intent: commercial | informational | navigational
- expected_competitor_brands: brands you'd expect AI to mention for this query

Return as a JSON array only. No markdown. Generate exactly {count} queries.`;

export const RECOMMENDATIONS_PROMPT = `You are an AI search visibility expert and strategic consultant. Analyze these audit results and generate 5-8 highly specific, actionable recommendations to improve how often AI assistants (ChatGPT, Gemini, Perplexity) recommend {brand_name}.

━━━ BRAND INTELLIGENCE ━━━
Brand: {brand_name}
Industry/Niche: {niche}
Market: {location}
Business Type: {business_type}

━━━ CURRENT AI VISIBILITY PERFORMANCE ━━━
AI Visibility Score: {score}/100
Mention Rate: {mention_rate}% of queries (industry average: 15-35%)
Content Quality Score: {content_quality}/100

━━━ QUERIES WHERE THE BRAND IS NOT MENTIONED (missing out) ━━━
{losing_queries}

━━━ COMPETITORS BEING RECOMMENDED INSTEAD ━━━
{competitors}

━━━ PRODUCT/SERVICE CATALOG SAMPLE ━━━
{products}

━━━ ATTRIBUTES AI CITES WHEN BRAND IS MENTIONED ━━━
{winning_reasons}

Generate 5-8 recommendations. Each must be:
1. Specific to {brand_name}'s actual situation (not generic advice)
2. Directly actionable (what to write, create, or add)
3. Grounded in the data above (reference specific gaps)
4. Prioritized by expected impact

For each recommendation return:
- rec_type: one of [description_rewrite, schema_markup, content_topic, review_site, feature_gap, entity_building, structured_data, local_seo]
- title: specific action title (max 12 words)
- rationale: why this helps AI discover the brand — reference the specific data above (2-3 sentences)
- current_value: what the brand currently lacks or has (specific, based on data)
- suggested_value: exactly what to add or change (be specific)
- expected_impact: expected improvement description

Return strict JSON array only. No markdown fences. No explanation outside the JSON.
[{"rec_type":..., "title":..., "rationale":..., "current_value":..., "suggested_value":..., "expected_impact":...}]`;

export const MENTION_EXTRACTION_PROMPT = `You are analyzing an AI assistant's response to extract structured brand mention data.

Brand we're tracking: {brand_name} (also known as: {brand_aliases})
Our product/service catalog: {top_50_product_titles}

AI Response to analyze:
"""
{response_text}
"""

Extract the following:
1. Was {brand_name} mentioned? (true/false)
2. If yes, position in response (1 = first brand mentioned, 2 = second, etc.)
3. How was {brand_name} described? (verbatim 1-2 sentences from the response)
4. What reasons or attributes did the AI cite? (e.g., "affordable", "sustainable", "certified", "local experts")
5. Sentiment toward {brand_name}: positive/neutral/negative
6. ALL other brands mentioned in the response, in order of appearance
7. For each competitor: what reasons were cited and what position were they mentioned?

Return strict JSON:
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

// Re-export for backwards compatibility
export { generateText, generateObject };
