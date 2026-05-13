import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";

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
  "claude-3-5-haiku-20241022": 0.0000008,
};

// Neutral AI assistant prompt that works for ALL business types
// (products, services, SaaS, local businesses, professional services, etc.)
// The query text itself provides all the context — the prompt just sets the assistant role.
function buildAuditPrompt(queryText: string): string {
  return `You are a knowledgeable AI assistant helping someone research options and make decisions. Answer the following question with specific, named recommendations where appropriate. Include real brand names, companies, service providers, or products that you know about. If recommending multiple options, list them clearly with brief explanations of why each is worth considering.

Question: ${queryText}`;
}

async function callOpenAI(queryText: string): Promise<LLMResult> {
  const model = "gpt-4o-mini";
  const start = Date.now();
  try {
    const { text, usage } = await generateText({
      model: openai(model),
      messages: [{ role: "user", content: buildAuditPrompt(queryText) }],
      maxOutputTokens: 600,
      temperature: 0.4,
    });
    const tokens = usage?.totalTokens ?? 0;
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
    const googleAI = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY ?? "",
    });
    const { text, usage } = await generateText({
      model: googleAI(model),
      messages: [{ role: "user", content: buildAuditPrompt(queryText) }],
      maxOutputTokens: 600,
      temperature: 0.4,
    });
    const tokens = usage?.totalTokens ?? 0;
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
  const model = "claude-3-5-haiku-20241022";
  const start = Date.now();
  try {
    const { text, usage } = await generateText({
      model: anthropic(model),
      messages: [{ role: "user", content: buildAuditPrompt(queryText) }],
      maxOutputTokens: 600,
      temperature: 0.4,
    });
    const tokens = usage?.totalTokens ?? 0;
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
    return providers.map((provider) => ({
      provider,
      model:
        provider === "openai"
          ? "gpt-4o-mini"
          : provider === "gemini"
          ? "gemini-2.5-flash"
          : "claude-3-5-haiku-20241022",
      responseText: MOCK_RESPONSES[provider] ?? "",
      tokensUsed: 0,
      costUsd: 0,
      durationMs: 0,
    }));
  }

  return Promise.all(calls);
}

// Mock responses contain no brand names — they are generic enough to simulate
// real AI responses where the audited brand is not yet well-known to AI systems.
const MOCK_RESPONSES: Record<string, string> = {
  openai:
    "There are several well-regarded options in this space. For established providers with strong track records, you might look at the leading companies in this sector. I'd recommend researching customer reviews and comparing pricing before deciding.",
  gemini:
    "Based on available information, the top options typically include established market leaders known for quality and reliability. Consider factors like customer support, pricing transparency, and service coverage when evaluating your choices.",
  anthropic:
    "This is a competitive market with several strong contenders. The best choice depends on your specific needs and location. I'd suggest getting quotes from multiple providers and checking their certifications and customer testimonials.",
};
