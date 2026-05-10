import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/gate";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const db = supabase as any;

  const [profileRes, storeRes, queryRes] = await Promise.all([
    db
      .from("profiles")
      .select("subscription_tier, subscription_status, stripe_customer_id, current_period_end")
      .eq("id", user.id)
      .maybeSingle(),
    db
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true),
    db
      .from("queries")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .in(
        "store_id",
        db.from("stores").select("id").eq("user_id", user.id)
      ),
  ]);

  const tier: PlanTier = profileRes.data?.subscription_tier ?? "free";
  const limits = PLAN_LIMITS[tier];

  return NextResponse.json({
    tier,
    status: profileRes.data?.subscription_status ?? null,
    periodEnd: profileRes.data?.current_period_end ?? null,
    hasStripeCustomer: Boolean(profileRes.data?.stripe_customer_id),
    usage: {
      stores: storeRes.count ?? 0,
      storeLimit: limits.stores === Infinity ? null : limits.stores,
      queries: queryRes.count ?? 0,
      queryLimit: limits.queries,
    },
    features: {
      monitoring: limits.monitoring,
      recommendations: limits.recommendations,
      autoApply: limits.autoApply,
    },
  });
}
