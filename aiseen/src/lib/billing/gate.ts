import { createServiceClient } from "@/lib/supabase/server";

export type PlanTier = "free" | "starter" | "growth" | "pro";

export interface PlanLimits {
  stores: number;        // max connected stores (Infinity = unlimited)
  queries: number;       // max tracked queries
  monitoring: boolean;   // can run monitoring
  recommendations: boolean;
  autoApply: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free:    { stores: 1,        queries: 25,   monitoring: false, recommendations: false, autoApply: false },
  starter: { stores: 1,        queries: 100,  monitoring: true,  recommendations: false, autoApply: false },
  growth:  { stores: 3,        queries: 500,  monitoring: true,  recommendations: true,  autoApply: false },
  pro:     { stores: Infinity, queries: 2000, monitoring: true,  recommendations: true,  autoApply: true  },
};

export interface GateResult {
  allowed: boolean;
  reason?: string;
  upgradeTo?: PlanTier;
}

export async function getUserProfile(userId: string) {
  const supabase = createServiceClient();
  const { data } = await (supabase as any)
    .from("profiles")
    .select("subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end")
    .eq("id", userId)
    .maybeSingle();
  return data as {
    subscription_tier: PlanTier;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
  } | null;
}

export async function checkGate(userId: string, feature: keyof PlanLimits): Promise<GateResult> {
  const profile = await getUserProfile(userId);
  const tier: PlanTier = profile?.subscription_tier ?? "free";
  const limits = PLAN_LIMITS[tier];
  const value = limits[feature];

  if (typeof value === "boolean") {
    if (value) return { allowed: true };

    // Determine which tier unlocks this feature
    const upgradeTo = (Object.entries(PLAN_LIMITS) as [PlanTier, PlanLimits][])
      .find(([, l]) => l[feature] === true)?.[0];

    const labels: Record<keyof PlanLimits, string> = {
      monitoring: "Monitoring",
      recommendations: "Recommendations",
      autoApply: "Auto-apply",
      stores: "Additional stores",
      queries: "Additional queries",
    };

    return {
      allowed: false,
      reason: `${labels[feature]} requires the ${upgradeTo ?? "paid"} plan or higher.`,
      upgradeTo,
    };
  }

  // Numeric limit — caller must check separately
  return { allowed: true };
}

export async function checkStoreLimit(userId: string): Promise<GateResult> {
  const profile = await getUserProfile(userId);
  const tier: PlanTier = profile?.subscription_tier ?? "free";
  const limit = PLAN_LIMITS[tier].stores;

  if (limit === Infinity) return { allowed: true };

  const supabase = createServiceClient();
  const { count } = await (supabase as any)
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  const current = count ?? 0;
  if (current < limit) return { allowed: true };

  const upgradeTo = (Object.entries(PLAN_LIMITS) as [PlanTier, PlanLimits][])
    .find(([, l]) => l.stores > limit)?.[0];

  return {
    allowed: false,
    reason: `Your ${tier} plan allows ${limit} store${limit !== 1 ? "s" : ""}. You've reached the limit.`,
    upgradeTo,
  };
}
