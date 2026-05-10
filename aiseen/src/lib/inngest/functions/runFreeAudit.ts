import { inngest } from "@/lib/inngest/client";
import { runFreeAudit } from "@/lib/audit";
import { sendAuditReportEmail } from "@/lib/email";

export const runFreeAuditFunction = inngest.createFunction(
  {
    id: "run-free-audit",
    name: "Run Free AI Visibility Audit",
    concurrency: { limit: 10 },
    retries: 1,
    timeouts: { finish: "5m" },
    triggers: [{ event: "audit/run.requested" as const }],
  },
  async ({ event, step }) => {
    const { auditId, storeUrl } = event.data as { auditId: string; storeUrl: string };

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await step.run("mark-running", async () => {
      await supabase
        .from("public_audits")
        .update({
          summary: { status: "running", step: "scraping", completedQueries: 0, totalQueries: 25 },
        })
        .eq("id", auditId);
    });

    const result = await step.run("run-audit", async () => {
      return runFreeAudit(storeUrl, async (progress) => {
        await supabase
          .from("public_audits")
          .update({
            summary: {
              status: progress.step === "completed" ? "completed" : "running",
              step: progress.step,
              completedQueries: progress.completedQueries,
              totalQueries: progress.totalQueries,
            },
          })
          .eq("id", auditId);
      });
    });

    await step.run("store-results", async () => {
      await supabase
        .from("public_audits")
        .update({
          brand_name: result.brandName,
          visibility_score: result.summary.visibilityScore,
          summary: result.summary,
        })
        .eq("id", auditId);
    });

    await step.run("send-email-if-provided", async () => {
      const { data: audit } = await supabase
        .from("public_audits")
        .select("email, full_report_unlocked")
        .eq("id", auditId)
        .single();

      if (audit?.email && audit.full_report_unlocked) {
        await sendAuditReportEmail({
          to: audit.email as string,
          brandName: result.brandName,
          auditId,
          visibilityScore: result.summary.visibilityScore,
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://aiseen.com",
        });
      }
    });

    return { auditId, visibilityScore: result.summary.visibilityScore };
  }
);
