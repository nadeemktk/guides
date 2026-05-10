import { inngest } from "@/lib/inngest/client";
import { createServiceClient } from "@/lib/supabase/server";

export const scheduleMonitoringFunction = inngest.createFunction(
  {
    id: "schedule-monitoring",
    name: "Schedule Daily Monitoring",
    triggers: [
      { cron: "0 6 * * *" }, // 6:00 AM UTC daily
    ],
  },
  async ({ step }) => {
    // Fetch all active stores that have at least one active query
    const storeIds = await step.run("fetch-active-stores", async () => {
      const supabase = createServiceClient();
      const db = supabase as any;

      // Join stores with queries to only monitor stores with active queries
      const { data } = await db
        .from("stores")
        .select("id, queries!inner(id)")
        .eq("is_active", true)
        .eq("queries.is_active", true);

      const ids: string[] = [...new Set<string>((data ?? []).map((s: { id: string }) => s.id))];
      return ids;
    });

    if (storeIds.length === 0) {
      return { scheduled: 0, reason: "No active stores with active queries" };
    }

    // Fan out — one monitoring event per store (runMonitoring handles each)
    await step.sendEvent(
      "fan-out-monitoring",
      storeIds.map((storeId) => ({
        name: "monitoring/run.requested" as const,
        data: { storeId },
      }))
    );

    return { scheduled: storeIds.length, storeIds };
  }
);
