import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuditResultClient } from "@/components/marketing/AuditResultClient";

async function getAudit(id: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/audits/${id}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const metadata = {
  title: "Your AI Visibility Report",
  description: "See how often ChatGPT, Perplexity, and Gemini recommend your store.",
};

export default async function AuditResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getAudit(id);

  if (!audit) {
    // If DB isn't configured yet, show a placeholder
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Setup required</h1>
          <p className="text-muted-foreground mb-4">
            Connect your Supabase database to see audit results.
            Configure <code className="bg-secondary px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="bg-secondary px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
            <code className="bg-secondary px-1 rounded">.env.local</code>.
          </p>
          <Link href="/free-audit" className="text-sm underline">
            ← Back to audit form
          </Link>
        </div>
      );
    }
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/free-audit"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> New audit
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">AI Visibility Report</h1>
        <p className="text-muted-foreground text-sm">
          {audit.store_url}
        </p>
      </div>

      <AuditResultClient auditId={id} initialData={audit} />
    </div>
  );
}
