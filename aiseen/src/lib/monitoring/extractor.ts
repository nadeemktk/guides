import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { MENTION_EXTRACTION_PROMPT } from "@/lib/llm";

export interface ExtractionResult {
  own_brand_mentioned: boolean;
  own_brand_position: number | null;
  own_brand_description: string | null;
  own_brand_reasons: string[];
  own_brand_sentiment: "positive" | "neutral" | "negative" | null;
  competitors: Array<{
    name: string;
    position: number;
    reasons: string[];
    description: string;
  }>;
}

const FALLBACK: ExtractionResult = {
  own_brand_mentioned: false,
  own_brand_position: null,
  own_brand_description: null,
  own_brand_reasons: [],
  own_brand_sentiment: null,
  competitors: [],
};

/**
 * Uses Claude Haiku to extract structured mention data from an LLM response.
 * Falls back to an empty result when no API key is configured.
 */
export async function extractMentionDetails(
  responseText: string,
  brandName: string,
  brandAliases: string[],
  productTitles: string[]
): Promise<ExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY || !responseText) return FALLBACK;

  const prompt = MENTION_EXTRACTION_PROMPT
    .replace("{brand_name}", brandName)
    .replace("{brand_aliases}", brandAliases.join(", ") || brandName)
    .replace("{top_50_product_titles}", productTitles.slice(0, 50).join("\n"))
    .replace("{response_text}", responseText);

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      messages: [{ role: "user", content: prompt }],
      maxOutputTokens: 1024,
      temperature: 0,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return FALLBACK;

    const parsed = JSON.parse(jsonMatch[0]) as ExtractionResult;
    return {
      own_brand_mentioned: Boolean(parsed.own_brand_mentioned),
      own_brand_position: parsed.own_brand_position ?? null,
      own_brand_description: parsed.own_brand_description ?? null,
      own_brand_reasons: Array.isArray(parsed.own_brand_reasons) ? parsed.own_brand_reasons : [],
      own_brand_sentiment: parsed.own_brand_sentiment ?? null,
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
    };
  } catch {
    return FALLBACK;
  }
}
