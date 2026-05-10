import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/gate";
import { PLANS } from "@/lib/stripe";
import { BillingClient } from "@/components/dashboard/billing/BillingClient";

export const metadata = { title: "Billing – AISeen" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { upgraded } = await searchParams;

  const supabase = createServiceClient();
  const db = supabase as any;

  const [profileRes, storeRes, queryRes] = await Promise.all([
    db
      .from("profiles")
      .select("subscription_tier, subscription_status, stripe_customer_id, current_period_end, email")
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
      .eq("is_active", true),
  ]);

  const tier: PlanTier = profileRes.data?.subscription_tier ?? "free";
  const limits = PLAN_LIMITS[tier];
  const storeCount = storeRes.count ?? 0;
  const queryCount = queryRes.count ?? 0;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your subscription and usage.</p>
      </div>

      <BillingClient
        tier={tier}
        status={profileRes.data?.subscription_status ?? null}
        periodEnd={profileRes.data?.current_period_end ?? null}
        hasStripeCustomer={Boolean(profileRes.data?.stripe_customer_id)}
        storeCount={storeCount}
        storeLimit={limits.stores === Infinity ? null : limits.stores}
        queryCount={queryCount}
        queryLimit={limits.queries}
        features={{
          monitoring: limits.monitoring,
          recommendations: limits.recommendations,
          autoApply: limits.autoApply,
        }}
        plans={PLANS}
        justUpgraded={upgraded === "1"}
      />
    </div>
  );
}
