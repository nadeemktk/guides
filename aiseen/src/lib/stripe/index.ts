import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Convenience alias used in server-side code
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER,
    price: 39,
    stores: 1,
    queries: 100,
    schedule: "weekly",
    providers: ["openai", "anthropic"],
    features: [
      "1 store",
      "100 tracked queries",
      "Weekly monitoring",
      "OpenAI + Anthropic",
    ],
  },
  growth: {
    name: "Growth",
    priceId: process.env.STRIPE_PRICE_GROWTH,
    price: 99,
    stores: 3,
    queries: 500,
    schedule: "daily",
    providers: ["openai", "anthropic", "gemini", "perplexity", "google_aio"],
    features: [
      "3 stores",
      "500 tracked queries",
      "Daily monitoring",
      "All 5 AI providers",
      "Recommendations engine",
    ],
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO,
    price: 249,
    stores: Infinity,
    queries: 2000,
    schedule: "daily",
    providers: ["openai", "anthropic", "gemini", "perplexity", "google_aio"],
    features: [
      "Unlimited stores",
      "2000 tracked queries",
      "Daily monitoring",
      "All 5 AI providers",
      "Full recommendations engine",
      "Auto-apply to store",
    ],
  },
} as const;

export type PlanTier = keyof typeof PLANS;
