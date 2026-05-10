import Link from "next/link";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for AI visibility monitoring. Start free, upgrade when you see value.",
};

const PLANS = [
  {
    name: "Starter",
    price: 39,
    description: "For single-store sellers getting started with AI visibility.",
    features: [
      { text: "1 connected store", included: true },
      { text: "100 tracked queries", included: true },
      { text: "Weekly monitoring", included: true },
      { text: "OpenAI + Anthropic providers", included: true },
      { text: "Visibility score & trends", included: true },
      { text: "Competitor tracking", included: true },
      { text: "All 5 AI providers", included: false },
      { text: "Recommendations engine", included: false },
      { text: "Auto-apply fixes", included: false },
    ],
    cta: "Start 14-day free trial",
    highlighted: false,
    tier: "starter",
  },
  {
    name: "Growth",
    price: 99,
    description: "For growing brands that need daily tracking and actionable fixes.",
    features: [
      { text: "3 connected stores", included: true },
      { text: "500 tracked queries", included: true },
      { text: "Daily monitoring", included: true },
      { text: "All 5 AI providers", included: true },
      { text: "Visibility score & trends", included: true },
      { text: "Competitor tracking", included: true },
      { text: "Recommendations engine", included: true },
      { text: "Manual approve & apply", included: true },
      { text: "Auto-apply fixes", included: false },
    ],
    cta: "Start 14-day free trial",
    highlighted: true,
    tier: "growth",
  },
  {
    name: "Pro",
    price: 249,
    description: "For serious sellers who want full automation across unlimited stores.",
    features: [
      { text: "Unlimited stores", included: true },
      { text: "2,000 tracked queries per store", included: true },
      { text: "Daily monitoring", included: true },
      { text: "All 5 AI providers", included: true },
      { text: "Visibility score & trends", included: true },
      { text: "Competitor tracking", included: true },
      { text: "Full recommendations engine", included: true },
      { text: "Auto-apply fixes to Shopify", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Start 14-day free trial",
    highlighted: false,
    tier: "pro",
  },
];

const COMPARISON_ROWS = [
  { feature: "Stores", starter: "1", growth: "3", pro: "Unlimited" },
  { feature: "Tracked queries", starter: "100", growth: "500", pro: "2,000" },
  { feature: "Monitoring cadence", starter: "Weekly", growth: "Daily", pro: "Daily" },
  { feature: "AI providers", starter: "2", growth: "5", pro: "5" },
  { feature: "Competitor tracking", starter: "✓", growth: "✓", pro: "✓" },
  { feature: "Recommendations engine", starter: "—", growth: "✓", pro: "✓" },
  { feature: "Auto-apply to Shopify", starter: "—", growth: "—", pro: "✓" },
  { feature: "Email digests", starter: "Weekly", growth: "Daily", pro: "Daily" },
];

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
          Start with a free audit, no account required. Upgrade when you&apos;re ready to monitor continuously.
        </p>
        <p className="text-sm text-muted-foreground">
          All paid plans include a 14-day free trial. No credit card required to start.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-20">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlighted ? "border-primary shadow-lg ring-2 ring-primary relative" : "relative"}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="shadow-sm">Most popular</Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                asChild
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full mb-6"
              >
                <Link href={`/signup?plan=${plan.tier}`}>{plan.cta}</Link>
              </Button>
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? "" : "text-muted-foreground"}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison table */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Compare plans</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 font-medium">Feature</th>
                <th className="text-center p-4 font-medium">Starter</th>
                <th className="text-center p-4 font-medium bg-primary/5">Growth</th>
                <th className="text-center p-4 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-medium text-muted-foreground">{row.feature}</td>
                  <td className="p-4 text-center">{row.starter}</td>
                  <td className="p-4 text-center bg-primary/5 font-medium">{row.growth}</td>
                  <td className="p-4 text-center">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Free audit CTA */}
      <div className="text-center border border-border rounded-2xl p-12 bg-secondary/30">
        <h2 className="text-2xl font-bold mb-3">Not sure yet?</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Run a free audit first. No account, no credit card. See your score and the top 3 gaps before deciding on a plan.
        </p>
        <Button asChild size="lg">
          <Link href="/free-audit">Run free audit →</Link>
        </Button>
      </div>
    </div>
  );
}
