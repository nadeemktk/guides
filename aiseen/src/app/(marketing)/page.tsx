import Link from "next/link";
import { ArrowRight, BarChart3, Lightbulb, Search, CheckCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "AISeen — Find out when ChatGPT recommends your store",
  description:
    "AI shopping is 51% of buyers in 2026. Most stores are invisible to it. Find out where you rank in 90 seconds — free.",
};

const FEATURES = [
  {
    icon: Search,
    title: "Track",
    description:
      "See exactly which queries trigger AI assistants to mention your brand — and which ones send customers to your competitors.",
  },
  {
    icon: BarChart3,
    title: "Diagnose",
    description:
      "Understand why ChatGPT, Perplexity, and Gemini recommend your competitors over you. See the exact reasons they cite.",
  },
  {
    icon: Lightbulb,
    title: "Fix",
    description:
      "Get a prioritized list of specific fixes — description rewrites, schema markup, content topics — and apply them with one click.",
  },
];

const PROVIDERS = [
  { name: "ChatGPT", color: "bg-green-500" },
  { name: "Perplexity", color: "bg-blue-500" },
  { name: "Gemini", color: "bg-purple-500" },
  { name: "Claude", color: "bg-orange-500" },
  { name: "Google AI Overviews", color: "bg-red-500" },
];

const FAQS = [
  {
    q: "How does the free audit work?",
    a: "Paste your store URL and we'll scrape your public product catalog, generate 25 realistic shopping queries, run them across ChatGPT, Perplexity, and Gemini, and show you a visibility score — all in under 90 seconds. No login or credit card required.",
  },
  {
    q: "What is an AI Visibility Score?",
    a: "It's a 0–100 score that combines four signals: how often AI assistants mention you, your average position in their recommendations, your share of voice vs. competitors, and whether the sentiment toward your brand is positive.",
  },
  {
    q: "Which platforms do you support?",
    a: "Shopify first (including auto-apply fixes), WooCommerce second, Amazon third. Any store can use the free audit by pasting a URL.",
  },
  {
    q: "What do the paid plans include?",
    a: "Paid plans add continuous monitoring (daily or weekly), tracking across all 5 AI providers, the AI-powered recommendations engine, and on Pro — automatic one-click fixes pushed back to your Shopify store.",
  },
  {
    q: "How is this different from traditional SEO tools?",
    a: "Traditional SEO tracks Google rankings. AI assistants don't use the same signals as Google — they need structured, machine-readable data, comparison-style content, and coverage on third-party sites. AISeen specifically optimizes for how LLMs learn about products.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-32 text-center">
          <Badge variant="secondary" className="mb-6 text-xs font-medium">
            Free AI visibility check — no account needed
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Find out when ChatGPT recommends your store —<br className="hidden md:block" />
            <span className="text-muted-foreground"> and when it doesn&apos;t.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            AI shopping is 51% of buyers in 2026. Most stores are invisible to it.
            Find out where you rank in 90 seconds.
          </p>

          {/* Inline audit CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-xl mx-auto">
            <Button asChild size="lg" className="w-full sm:w-auto text-base px-8">
              <Link href="/free-audit">
                Check my store&apos;s AI visibility
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base">
              <Link href="/pricing">See plans</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free · No account required · Results in &lt; 90 seconds
          </p>

          {/* Provider logos strip */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground mr-2">Tracks mentions on:</span>
            {PROVIDERS.map((p) => (
              <span
                key={p.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
              >
                <span className={`h-2 w-2 rounded-full ${p.color}`} />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature blocks */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">The full loop, automated</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From catalog to AI recommendations and back again. AISeen closes the loop that no other tool touches.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Card key={f.title} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground">Three steps from invisible to recommended.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Connect your store",
                body: "Paste your store URL for a free audit, or connect Shopify/WooCommerce for ongoing monitoring. We sync your product catalog automatically.",
              },
              {
                step: "2",
                title: "We run the queries",
                body: "Our engine generates hundreds of real shopping queries customers ask AI assistants, then runs them across ChatGPT, Perplexity, Gemini, Claude, and Google AI Overviews.",
              },
              {
                step: "3",
                title: "Fix and repeat",
                body: "Get a visibility score, see exactly which competitors win and why, then apply our AI-generated fixes to your catalog. Score improves. Repeat weekly.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">What sellers are discovering</h2>
          <p className="text-muted-foreground">Real visibility scores from real stores.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { score: 12, label: "Invisible", brand: "Sports accessories brand", finding: "ChatGPT mentioned 4 competitors for every one of their core queries — none mentioned this brand." },
            { score: 67, label: "Strong", brand: "Sustainable clothing brand", finding: "Perplexity cited them in 68% of sustainability queries after adding certifications to product descriptions." },
            { score: 41, label: "Emerging", brand: "Kitchen tools brand", finding: "Gemini ranked them #4 on average. After description rewrites, moved to #2 within 3 weeks." },
          ].map((item) => (
            <Card key={item.brand}>
              <CardContent className="p-6">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-bold">{item.score}</span>
                  <span className="text-sm font-medium text-muted-foreground">/100</span>
                  <Badge variant={item.score > 60 ? "success" : item.score > 30 ? "warning" : "destructive"} className="ml-auto">
                    {item.label}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{item.brand}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.finding}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-y border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Simple pricing</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you see the value.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$39",
                period: "/month",
                features: ["1 store", "100 tracked queries", "Weekly monitoring", "2 AI providers"],
                cta: "Start free trial",
                highlighted: false,
              },
              {
                name: "Growth",
                price: "$99",
                period: "/month",
                features: ["3 stores", "500 tracked queries", "Daily monitoring", "All 5 AI providers", "Recommendations engine"],
                cta: "Start free trial",
                highlighted: true,
              },
              {
                name: "Pro",
                price: "$249",
                period: "/month",
                features: ["Unlimited stores", "2000 tracked queries", "Daily monitoring", "All 5 AI providers", "Auto-apply fixes"],
                cta: "Start free trial",
                highlighted: false,
              },
            ].map((plan) => (
              <Card key={plan.name} className={plan.highlighted ? "border-primary shadow-md ring-1 ring-primary" : ""}>
                <CardContent className="p-6">
                  {plan.highlighted && (
                    <Badge className="mb-3">Most popular</Badge>
                  )}
                  <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-0.5 mb-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                  >
                    <Link href="/pricing">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            14-day free trial on all plans. No credit card required.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Frequently asked questions</h2>
        </div>
        <div className="divide-y divide-border">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group py-4">
              <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-sm gap-4">
                {faq.q}
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Check your AI visibility now — it&apos;s free</h2>
          <p className="text-primary-foreground/80 mb-8">
            Results in 90 seconds. No account, no credit card, no catch.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-base px-8">
            <Link href="/free-audit">
              Start free audit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
