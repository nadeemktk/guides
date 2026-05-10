import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters per LLM provider (requests per minute)
export const rateLimiters = {
  openai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    prefix: "rl:openai",
  }),
  anthropic: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    prefix: "rl:anthropic",
  }),
  gemini: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(360, "1 m"),
    prefix: "rl:gemini",
  }),
  perplexity: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "rl:perplexity",
  }),
  serpapi: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "rl:serpapi",
  }),
  // Per-user audit rate limit (free tier: 3 audits per IP per 24h)
  publicAudit: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(3, "24 h"),
    prefix: "rl:public_audit",
  }),
};

export type LLMProvider = keyof Omit<typeof rateLimiters, "publicAudit">;
