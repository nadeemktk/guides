import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ScrapedStore } from "./scraper";
import { analyzeBusinessProfile, type BusinessProfile } from "./businessAnalyzer";
import type { GeneratedQuery } from "@/types";

const QUERY_GENERATION_PROMPT = `You are an expert AI SEO analyst specializing in improving brand visibility in AI assistants (ChatGPT, Gemini, Claude, Perplexity).

BRAND BEING ANALYZED: {brand_name}
BUSINESS TYPE: {business_type}
NICHE: {niche}
TARGET AUDIENCE: {target_audience}
MARKET/LOCATION: {location}
KEY OFFERINGS: {key_offerings}
PRICE POINT: {price_point}
UNIQUE SELLING POINTS: {unique_selling_points}
MAIN COMPETITORS: {competitors}
RELEVANT KEYWORDS: {keywords}

Generate {count} natural-language shopping queries that a real customer would type into ChatGPT, Gemini, or Google AI Overviews when looking for products/services like {brand_name}'s.

CRITICAL RULES:
- Do NOT mention {brand_name} by name in any query — these test whether AI recommends the brand organically
- Do NOT write queries like "best alternatives to {brand_name}" — those prompt AI to list competitors, not the brand
- ALL queries must be specific to the "{niche}" niche and "{location}" market
- Include location/market qualifiers where natural (e.g. "in UAE", "online in Australia", "for US customers")
- Write queries that are genuinely the types of questions where AI would potentially recommend {brand_name}

Generate a balanced mix across these categories:
- comparison: "best {niche} brands in {location}", ranking-style queries
- problem-solving: specific pain points the {target_audience} face that {key_offerings} solve
- gift: gift idea queries for occasions relevant to the {target_audience}
- sustainability: ethical/eco-friendly queries if relevant to the niche
- budget-tier: price-sensitive queries at the {price_point} tier
- feature-specific: queries about specific features/attributes of the key offerings
- use-case: queries for specific situations the {target_audience} encounters
- long-tail-demographic: queries for specific demographic sub-groups within {target_audience}

For each query return:
- query_text: the exact query (natural language, conversational tone)
- category: one of the categories listed above
- intent: commercial / informational / navigational
- expected_competitor_brands: which brands you'd expect AI to mention for this query

Return as a JSON array only. No markdown. No explanation. Generate exactly {count} queries.`;

function buildQueryPrompt(store: ScrapedStore, profile: BusinessProfile, count: number): string {
  return QUERY_GENERATION_PROMPT
    .replace(/{brand_name}/g, store.brandName)
    .replace("{business_type}", profile.businessType)
    .replace("{niche}", profile.niche)
    .replace("{target_audience}", profile.targetAudience)
    .replace("{location}", profile.location)
    .replace("{key_offerings}", profile.keyOfferings.join(", "))
    .replace("{price_point}", profile.pricePoint)
    .replace("{unique_selling_points}", profile.uniqueSellingPoints.join(", "))
    .replace("{competitors}", profile.estimatedCompetitors.join(", ") || "unknown")
    .replace("{keywords}", profile.topKeywords.join(", "))
    .replace("{count}", String(count));
}

function generateFallbackQueries(
  store: ScrapedStore,
  profile: BusinessProfile,
  count: number
): GeneratedQuery[] {
  const { niche, targetAudience, location, keyOfferings, pricePoint, estimatedCompetitors } =
    profile;
  const loc = location !== "global" ? ` in ${location}` : "";
  const offering = keyOfferings[0] || niche;
  const alt = keyOfferings[1] || offering;

  const templates: GeneratedQuery[] = [
    {
      query_text: `best ${niche} brands${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: estimatedCompetitors.slice(0, 3),
    },
    {
      query_text: `top ${offering} for ${targetAudience}`,
      category: "use-case",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `best ${pricePoint === "budget" ? "affordable" : pricePoint} ${niche}${loc}`,
      category: "budget-tier",
      intent: "commercial",
      expected_competitor_brands: estimatedCompetitors.slice(0, 2),
    },
    {
      query_text: `recommended ${offering} online${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `where to buy ${offering}${loc}`,
      category: "use-case",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${niche} gift ideas for ${targetAudience}`,
      category: "gift",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `sustainable ${niche} brands${loc}`,
      category: "sustainability",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${offering} under $100${loc}`,
      category: "budget-tier",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `premium ${niche} worth buying${loc}`,
      category: "budget-tier",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `best ${offering} for beginners`,
      category: "feature-specific",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `most popular ${niche} online stores${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: estimatedCompetitors.slice(0, 3),
    },
    {
      query_text: `${offering} with best reviews${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${niche} recommendations 2026${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `ethical ${niche} brands to support`,
      category: "sustainability",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `high quality ${offering} online`,
      category: "feature-specific",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${offering} for everyday use`,
      category: "use-case",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `best ${niche} deals online${loc}`,
      category: "budget-tier",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${offering} that lasts long`,
      category: "feature-specific",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${niche} shopping guide 2026`,
      category: "comparison",
      intent: "informational",
      expected_competitor_brands: [],
    },
    {
      query_text: `trusted ${niche} online store${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${alt} for professionals${loc}`,
      category: "use-case",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `best ${alt} in ${location !== "global" ? location : "2026"}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${niche} brand recommendations from experts`,
      category: "comparison",
      intent: "informational",
      expected_competitor_brands: [],
    },
    {
      query_text: `${offering} gift for ${targetAudience}`,
      category: "gift",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `top rated ${niche} stores${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: estimatedCompetitors.slice(0, 2),
    },
  ];

  // Deduplicate by query_text and filter store brand name from texts
  const seen = new Set<string>();
  const filtered = templates.filter((t) => {
    if (seen.has(t.query_text)) return false;
    seen.add(t.query_text);
    return true;
  });

  return filtered.slice(0, count);
}

export async function generateQueries(
  store: ScrapedStore,
  count: number = 25
): Promise<GeneratedQuery[]> {
  // Step 1: Understand the business — extract niche, audience, location, competitors
  const profile = await analyzeBusinessProfile(store);

  // Step 2: Build a dynamic niche-specific prompt using the business profile
  const prompt = buildQueryPrompt(store, profile, count);

  // Step 3: Try AI generation — Anthropic first, then Gemini, then profile-aware fallback
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
      if (parsed.length >= Math.floor(count * 0.8)) return parsed.slice(0, count);
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
      if (parsed.length >= Math.floor(count * 0.8)) return parsed.slice(0, count);
    } catch (err) {
      console.error("Gemini query generation failed:", err);
    }
  }

  console.warn("All AI query generation failed — using profile-aware fallback for:", store.brandName);
  return generateFallbackQueries(store, profile, count);
}
