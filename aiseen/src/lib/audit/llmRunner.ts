import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { SHOPPING_PROMPT_TEMPLATE } from "@/lib/llm";

export type FreeAuditProvider = "openai" | "gemini" | "anthropic";

export interface LLMResult {
  provider: FreeAuditProvider;
  model: string;
  responseText: string;
  tokensUsed: number;
  costUsd: number;
  durationMs: number;
  error?: string;
}

const COST_PER_1K: Record<string, number> = {
  "gpt-4o-mini": 0.00015,
  "gemini-2.5-flash": 0.000075,
  "claude-haiku-4-5-20251001": 0.0000008,
};

function buildShoppingPrompt(queryText: string): string {
  return SHOPPING_PROMPT_TEMPLATE.replace("{query_text}", queryText);
}

async function callOpenAI(queryText: string): Promise<LLMResult> {
  const model = "gpt-4o-mini";
  const start = Date.now();
  try {
    const { text, usage } = await generateText({
      model: openai(model),
      messages: [{ role: "user", content: buildShoppingPrompt(queryText) }],
      maxOutputTokens: 512,
      temperature: 0.3,
    });
    const tokens = (usage?.totalTokens ?? 0);
    return {
      provider: "openai",
      model,
      responseText: text,
      tokensUsed: tokens,
      costUsd: (tokens / 1000) * COST_PER_1K[model],
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider: "openai",
      model,
      responseText: "",
      tokensUsed: 0,
      costUsd: 0,
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

async function callGemini(queryText: string): Promise<LLMResult> {
  const model = "gemini-2.5-flash";
  const start = Date.now();
  try {
    const { text, usage } = await generateText({
      model: google(model),
      messages: [{ role: "user", content: buildShoppingPrompt(queryText) }],
      maxOutputTokens: 512,
      temperature: 0.3,
    });
    const tokens = (usage?.totalTokens ?? 0);
    return {
      provider: "gemini",
      model,
      responseText: text,
      tokensUsed: tokens,
      costUsd: (tokens / 1000) * COST_PER_1K[model],
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider: "gemini",
      model,
      responseText: "",
      tokensUsed: 0,
      costUsd: 0,
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

async function callAnthropic(queryText: string): Promise<LLMResult> {
  const model = "claude-haiku-4-5-20251001";
  const start = Date.now();
  try {
    const { text, usage } = await generateText({
      model: anthropic(model),
      messages: [{ role: "user", content: buildShoppingPrompt(queryText) }],
      maxOutputTokens: 512,
      temperature: 0.3,
    });
    const tokens = (usage?.totalTokens ?? 0);
    return {
      provider: "anthropic",
      model,
      responseText: text,
      tokensUsed: tokens,
      costUsd: (tokens / 1000) * COST_PER_1K[model],
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider: "anthropic",
      model,
      responseText: "",
      tokensUsed: 0,
      costUsd: 0,
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

export async function runQueryAgainstProviders(
  queryText: string,
  providers: FreeAuditProvider[]
): Promise<LLMResult[]> {
  const calls: Promise<LLMResult>[] = [];

  for (const provider of providers) {
    switch (provider) {
      case "openai":
        if (process.env.OPENAI_API_KEY) calls.push(callOpenAI(queryText));
        break;
      case "gemini":
        if (process.env.GOOGLE_GEMINI_API_KEY) calls.push(callGemini(queryText));
        break;
      case "anthropic":
        if (process.env.ANTHROPIC_API_KEY) calls.push(callAnthropic(queryText));
        break;
    }
  }

  if (calls.length === 0) {
    // No API keys configured — return mock data for development
    return providers.map((provider) => ({
      provider,
      model: provider === "openai" ? "gpt-4o-mini" : provider === "gemini" ? "gemini-2.5-flash" : "sonar",
      responseText: MOCK_RESPONSES[provider] ?? "",
      tokensUsed: 0,
      costUsd: 0,
      durationMs: 0,
    }));
  }

  return Promise.all(calls);
}

const MOCK_RESPONSES: Record<string, string> = {
  openai: "For this type of product, I'd recommend looking at several established brands. Brand A is known for quality and durability, while Brand B offers great value at a lower price point. Brand C has excellent customer reviews and a strong warranty.",
  gemini: "There are several great options to consider. Brand B and Brand C are top picks in this category based on user reviews. Brand D is also worth considering for eco-conscious shoppers.",
  anthropic: "Based on my analysis, Brand C stands out as the top choice for quality and value. Brand A is also frequently recommended by experts. For budget-conscious shoppers, Brand B offers similar features at a lower cost.",
};
