import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ScrapedStore } from "./scraper";
import { analyzeBusinessProfile, type BusinessProfile } from "./businessAnalyzer";
import type { GeneratedQuery } from "@/types";

const QUERY_GENERATION_PROMPT = `You are a world-class AI search visibility analyst. Your job is to generate {count} highly specific, realistic queries that real customers type into ChatGPT, Gemini, Claude, or Perplexity when searching for products or services like those provided by {brand_name}.

━━━ BUSINESS INTELLIGENCE ━━━
Brand: {brand_name}
Business Type: {business_type}
Industry Vertical: {industry_vertical}
Specific Niche: {niche}
Sub-niche: {sub_niche}
Market/Location: {location}
Specific Areas Served: {location_specific}
Target Audience: {target_audience}
Key Offerings: {key_offerings}
Problems Solved: {problems_solved}
Price Tier: {price_point}
Business Model: {business_model}
Unique Differentiators: {unique_selling_points}
Known Competitors in This Space: {competitors}
Core Search Keywords: {keywords}

━━━ CRITICAL RULES ━━━
1. NEVER mention {brand_name} by name in any query — queries simulate real users who don't know about this brand
2. ALL queries MUST be directly relevant to the "{niche}" niche in the "{location}" market
3. Queries must sound natural — exactly how a real person would type or speak to an AI assistant
4. Every query must be UNIQUE — no similar-sounding duplicates
5. Include location context naturally where it fits (e.g. "in Dubai", "UAE", "in the UK")
6. Cover these intent types proportionally:
   - Informational: "how to...", "what is the best...", "which is better..."
   - Commercial: "best [service/product] in [location]", "recommend a [niche] provider"
   - Comparison: "[option A] vs [option B]", "which [type] should I choose"
   - Problem-solving: addressing specific pain points from {problems_solved}
   - Local intent: "[niche] near me", "[niche] in [specific city]"
   - Trust/validation: "most trusted [niche]", "top-rated [niche]"

━━━ QUERY CATEGORIES (distribute across all) ━━━
- comparison: ranking/best-of queries for this niche
- problem-solving: queries about specific pain points the target audience faces
- local-intent: location-specific queries (critical for local/regional businesses)
- use-case: specific scenarios where the offerings are needed
- budget-tier: price-sensitivity queries at the {price_point} level
- feature-specific: queries about specific capabilities or attributes of the offerings
- trust-validation: queries about reliability, reviews, credentials
- discovery: queries for people researching options for the first time
- competitor-alternative: "alternatives to [competitor]" style queries

━━━ OUTPUT FORMAT ━━━
Return a JSON array only. No markdown. No explanation. Exactly {count} queries.
Each object:
{
  "query_text": "the exact natural-language query",
  "category": "one of the categories above",
  "intent": "commercial | informational | navigational",
  "expected_competitor_brands": ["brands you'd expect AI to mention for this query"]
}

━━━ QUALITY BAR ━━━
Each query must pass this test: "Would a real customer searching for {niche} in {location} actually type this?"
Reject any query that is too generic, too broad, or not specific to this niche.`;

function buildQueryPrompt(store: ScrapedStore, profile: BusinessProfile, count: number): string {
  const locationSpecific = profile.locationSpecific.length > 0
    ? profile.locationSpecific.join(", ")
    : profile.location;

  return QUERY_GENERATION_PROMPT
    .replace(/{brand_name}/g, store.brandName)
    .replace("{business_type}", profile.businessType)
    .replace("{industry_vertical}", profile.industryVertical)
    .replace("{niche}", profile.niche)
    .replace("{sub_niche}", profile.subNiche)
    .replace("{location}", profile.location)
    .replace("{location_specific}", locationSpecific)
    .replace("{target_audience}", profile.targetAudience)
    .replace("{key_offerings}", profile.keyOfferings.join(", "))
    .replace("{problems_solved}", profile.problemsSolved.join(", "))
    .replace("{price_point}", profile.pricePoint)
    .replace("{business_model}", profile.businessModel)
    .replace("{unique_selling_points}", profile.uniqueSellingPoints.join(", "))
    .replace("{competitors}", profile.estimatedCompetitors.join(", ") || "not identified")
    .replace("{keywords}", profile.topKeywords.join(", "))
    .replace("{count}", String(count));
}

function validateQueries(queries: GeneratedQuery[], profile: BusinessProfile, brandName: string): GeneratedQuery[] {
  const niches = [profile.niche.toLowerCase(), profile.subNiche.toLowerCase(), profile.industryVertical.toLowerCase()];
  const niicheWords = niches.flatMap((n) => n.split(/[\s,]+/)).filter((w) => w.length > 3);
  const locationWords = [profile.location.toLowerCase(), ...profile.locationSpecific.map((l) => l.toLowerCase())];
  const offeringWords = profile.keyOfferings.flatMap((o) => o.toLowerCase().split(/\s+/)).filter((w) => w.length > 3);
  const relevantWords = [...niicheWords, ...locationWords, ...offeringWords];

  const seen = new Set<string>();
  const validated: GeneratedQuery[] = [];

  for (const q of queries) {
    if (!q.query_text || typeof q.query_text !== "string") continue;
    const queryLower = q.query_text.toLowerCase();

    // Skip if brand name is mentioned
    if (queryLower.includes(brandName.toLowerCase())) continue;

    // Skip duplicates (normalized)
    const normalized = queryLower.replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    // Skip if too short or too long
    if (q.query_text.length < 10 || q.query_text.length > 200) continue;

    // Check relevance: at least one relevant word should appear
    const hasRelevantWord = relevantWords.some((w) => queryLower.includes(w));
    if (!hasRelevantWord && validated.length >= 10) continue; // allow some looser queries early on

    validated.push(q);
  }

  return validated;
}

function generateNicheSpecificFallback(store: ScrapedStore, profile: BusinessProfile, count: number): GeneratedQuery[] {
  const loc = profile.location !== "global" ? ` in ${profile.location}` : "";
  const locAlt = profile.locationSpecific.length > 0 ? ` in ${profile.locationSpecific[0]}` : loc;
  const niche = profile.niche;
  const subNiche = profile.subNiche;
  const offering1 = profile.keyOfferings[0] || niche;
  const offering2 = profile.keyOfferings[1] || niche;
  const offering3 = profile.keyOfferings[2] || subNiche;
  const audience = profile.targetAudience;
  const problem1 = profile.problemsSolved[0] || `finding reliable ${niche}`;
  const problem2 = profile.problemsSolved[1] || `choosing the best ${niche}`;
  const comp1 = profile.estimatedCompetitors[0];
  const comp2 = profile.estimatedCompetitors[1];
  const priceAdj = profile.pricePoint === "budget" ? "affordable" :
    profile.pricePoint === "premium" ? "premium" :
    profile.pricePoint === "luxury" ? "luxury" : "best value";

  const templates: GeneratedQuery[] = [
    {
      query_text: `best ${niche}${locAlt}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 3),
    },
    {
      query_text: `top rated ${offering1} companies${loc}`,
      category: "trust-validation",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 2),
    },
    {
      query_text: `${offering1} for ${audience}`,
      category: "use-case",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `who provides the best ${offering2}${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 3),
    },
    {
      query_text: `${priceAdj} ${niche}${loc}`,
      category: "budget-tier",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 2),
    },
    {
      query_text: `how to solve ${problem1}`,
      category: "problem-solving",
      intent: "informational",
      expected_competitor_brands: [],
    },
    {
      query_text: `most trusted ${offering1} provider${loc}`,
      category: "trust-validation",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 2),
    },
    {
      query_text: `${offering2} near me${loc !== "" ? "" : " online"}`,
      category: "local-intent",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `best way to handle ${problem2}`,
      category: "problem-solving",
      intent: "informational",
      expected_competitor_brands: [],
    },
    {
      query_text: `${niche} recommendations for ${audience}`,
      category: "discovery",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 2),
    },
    ...(comp1 ? [{
      query_text: `alternatives to ${comp1} for ${offering1}`,
      category: "competitor-alternative",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 4),
    }] : []),
    {
      query_text: `which company is best for ${offering2}${loc}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 3),
    },
    {
      query_text: `${offering3} prices and costs${loc}`,
      category: "budget-tier",
      intent: "informational",
      expected_competitor_brands: [],
    },
    {
      query_text: `how to choose a ${offering1} provider`,
      category: "discovery",
      intent: "informational",
      expected_competitor_brands: [],
    },
    {
      query_text: `reliable ${niche} company${locAlt}`,
      category: "trust-validation",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 2),
    },
    {
      query_text: `${offering1} reviews${loc}`,
      category: "trust-validation",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 3),
    },
    {
      query_text: `professional ${offering2} services${locAlt}`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    ...(comp2 ? [{
      query_text: `${comp2} vs other ${niche} providers`,
      category: "comparison",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 4),
    }] : []),
    {
      query_text: `what to look for in a ${offering1} service`,
      category: "feature-specific",
      intent: "informational",
      expected_competitor_brands: [],
    },
    {
      query_text: `${niche} for businesses${loc}`,
      category: "use-case",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 2),
    },
    {
      query_text: `emergency ${offering1}${locAlt}`,
      category: "local-intent",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `${offering3} specialists${loc}`,
      category: "feature-specific",
      intent: "commercial",
      expected_competitor_brands: [],
    },
    {
      query_text: `how much does ${offering1} cost${loc}`,
      category: "budget-tier",
      intent: "informational",
      expected_competitor_brands: [],
    },
    {
      query_text: `recommended ${niche} providers 2025`,
      category: "discovery",
      intent: "commercial",
      expected_competitor_brands: profile.estimatedCompetitors.slice(0, 3),
    },
    {
      query_text: `${priceAdj} ${offering2} that actually works`,
      category: "feature-specific",
      intent: "commercial",
      expected_competitor_brands: [],
    },
  ];

  // Deduplicate
  const seen = new Set<string>();
  return templates.filter((t) => {
    const key = t.query_text.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, count);
}

export async function generateQueries(
  store: ScrapedStore,
  count: number = 25,
  precomputedProfile?: BusinessProfile
): Promise<GeneratedQuery[]> {
  const profile = precomputedProfile ?? await analyzeBusinessProfile(store);
  const prompt = buildQueryPrompt(store, profile, count);

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { text } = await generateText({
        model: anthropic("claude-3-5-haiku-20241022"),
        messages: [{ role: "user", content: prompt }],
        maxOutputTokens: 6000,
        temperature: 0.7,
      });
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuery[];
        const validated = validateQueries(parsed, profile, store.brandName);
        if (validated.length >= Math.floor(count * 0.7)) {
          return validated.slice(0, count);
        }
      }
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
        maxOutputTokens: 6000,
        temperature: 0.7,
      });
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuery[];
        const validated = validateQueries(parsed, profile, store.brandName);
        if (validated.length >= Math.floor(count * 0.7)) {
          return validated.slice(0, count);
        }
      }
    } catch (err) {
      console.error("Gemini query generation failed:", err);
    }
  }

  console.warn("AI query generation failed — using niche-specific fallback for:", store.brandName, "niche:", profile.niche);
  return generateNicheSpecificFallback(store, profile, count);
}

export { analyzeBusinessProfile };
export type { BusinessProfile };
