import { AuditForm } from "@/components/marketing/AuditForm";
import { Search, TrendingUp, Zap } from "lucide-react";

export const metadata = {
  title: "Free AI Visibility Audit",
  description: "Paste your store URL and see how often ChatGPT, Perplexity, and Gemini recommend your brand. Free, no account required.",
};

export default function FreeAuditPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Free AI Visibility Audit</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Paste your store URL below. We&apos;ll scrape your catalog, generate 25 shopping queries,
          run them across ChatGPT, Perplexity, and Gemini, and show you your visibility score.
        </p>
      </div>

      {/* Form card */}
      <div className="border border-border rounded-2xl p-8 bg-card shadow-sm mb-10">
        <AuditForm />
      </div>

      {/* What you'll get */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-5 text-center">What you&apos;ll see</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Zap,
              title: "AI Visibility Score",
              desc: "Your 0–100 score across ChatGPT, Perplexity, and Gemini.",
            },
            {
              icon: TrendingUp,
              title: "Winning & losing queries",
              desc: "The exact queries where you appear — and where competitors beat you.",
            },
            {
              icon: Search,
              title: "Full report via email",
              desc: "All 25 queries, top competitors, and the 5 fixes with highest impact.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-secondary/40 border border-border"
            >
              <div className="mb-3 p-2 rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-sm mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <p className="text-xs text-muted-foreground text-center">
        We only read your public product catalog. We never store customer data or order history.
        <br />
        No account required. Email optional (required for full report).
      </p>
    </div>
  );
}
