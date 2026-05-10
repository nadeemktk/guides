"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, CreditCard, Zap, ExternalLink } from "lucide-react";

type PlanTier = "free" | "starter" | "growth" | "pro";

interface PlanDef {
  name: string;
  priceId: string | undefined;
  price: number;
  stores: number;
  queries: number;
  features: readonly string[];
}

interface Props {
  tier: PlanTier;
  status: string | null;
  periodEnd: string | null;
  hasStripeCustomer: boolean;
  storeCount: number;
  storeLimit: number | null;
  queryCount: number;
  queryLimit: number;
  features: { monitoring: boolean; recommendations: boolean; autoApply: boolean };
  plans: Record<string, PlanDef>;
  justUpgraded: boolean;
}

const TIER_LABELS: Record<PlanTier, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  trialing: "bg-blue-50 text-blue-700",
  past_due: "bg-red-50 text-red-700",
  canceled: "bg-gray-50 text-gray-500",
};

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit == null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <span className={`text-xs font-semibold ${isAtLimit ? "text-red-500" : isNearLimit ? "text-yellow-600" : "text-foreground"}`}>
          {used}{limit != null ? ` / ${limit}` : ""}
          {limit == null ? " (unlimited)" : ""}
        </span>
      </div>
      {limit != null && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-400" : isNearLimit ? "bg-yellow-400" : "bg-primary/60"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCard({
  planKey,
  plan,
  currentTier,
  onUpgrade,
  upgrading,
}: {
  planKey: string;
  plan: PlanDef;
  currentTier: PlanTier;
  onUpgrade: (priceId: string) => void;
  upgrading: string | null;
}) {
  const isCurrent = planKey === currentTier;
  const tierOrder: PlanTier[] = ["free", "starter", "growth", "pro"];
  const isDowngrade = tierOrder.indexOf(planKey as PlanTier) < tierOrder.indexOf(currentTier);

  return (
    <div className={`rounded-lg border p-5 space-y-4 ${isCurrent ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-sm">{plan.name}</p>
          <p className="text-2xl font-bold mt-0.5">
            ${plan.price}
            <span className="text-xs text-muted-foreground font-normal">/mo</span>
          </p>
        </div>
        {isCurrent && (
          <Badge variant="default" className="text-xs">Current plan</Badge>
        )}
      </div>

      <ul className="space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-primary shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {!isCurrent && !isDowngrade && plan.priceId && (
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onUpgrade(plan.priceId!)}
          disabled={upgrading === plan.priceId}
        >
          {upgrading === plan.priceId ? "Redirecting…" : `Upgrade to ${plan.name}`}
        </Button>
      )}
      {isDowngrade && (
        <p className="text-xs text-muted-foreground text-center">Manage via billing portal</p>
      )}
    </div>
  );
}

export function BillingClient({
  tier,
  status,
  periodEnd,
  hasStripeCustomer,
  storeCount,
  storeLimit,
  queryCount,
  queryLimit,
  features,
  plans,
  justUpgraded,
}: Props) {
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(priceId: string) {
    setUpgrading(priceId);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not create checkout session");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — try again");
    } finally {
      setUpgrading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open billing portal");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — try again");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {justUpgraded && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">Subscription activated! Your plan is now live.</p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-semibold">Current plan</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status ?? ""] ?? "bg-gray-50 text-gray-500"}`}>
                {status ?? "free"}
              </span>
            </div>
            <p className="text-2xl font-bold">{TIER_LABELS[tier]}</p>
            {periodEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                Renews {new Date(periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {hasStripeCustomer && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handlePortal}
                disabled={portalLoading}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                {portalLoading ? "Opening…" : "Manage subscription"}
                <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
              </Button>
            )}
          </div>
        </div>

        {/* Feature flags */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["Monitoring", "Recommendations", "Auto-apply"] as const).map((label, i) => {
            const enabled = [features.monitoring, features.recommendations, features.autoApply][i];
            return (
              <span key={label} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                enabled ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
              }`}>
                {enabled ? <CheckCircle className="h-3 w-3" /> : <span className="h-3 w-3 flex items-center justify-center">—</span>}
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Usage meters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UsageMeter label="Stores" used={storeCount} limit={storeLimit} />
        <UsageMeter label="Active queries" used={queryCount} limit={queryLimit} />
      </div>

      {/* Plan upgrade cards */}
      {tier !== "pro" && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Upgrade your plan</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(plans).map(([key, plan]) => (
              <PlanCard
                key={key}
                planKey={key}
                plan={plan}
                currentTier={tier}
                onUpgrade={handleUpgrade}
                upgrading={upgrading}
              />
            ))}
          </div>
        </>
      )}

      {tier === "pro" && (
        <div className="rounded-lg border border-border bg-card p-5 text-center">
          <p className="text-sm font-medium mb-1">You&apos;re on the Pro plan</p>
          <p className="text-xs text-muted-foreground">All features unlocked. Manage or cancel via the billing portal.</p>
        </div>
      )}
    </div>
  );
}
