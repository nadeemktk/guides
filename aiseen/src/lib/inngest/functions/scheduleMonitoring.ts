import { inngest } from "@/lib/inngest/client";
import { createServiceClient } from "@/lib/supabase/server";

async function fetchStoresByTiers(tiers: string[]): Promise<string[]> {
  const supabase = createServiceClient();
  const db = supabase as any;

  // Fetch stores with at least one active query
  const { data: storeData } = await db
    .from("stores")
    .select("id, user_id, queries!inner(id)")
    .eq("is_active", true)
    .eq("queries.is_active", true);

  if (!storeData || storeData.length === 0) return [];

  const userIds = [...new Set<string>(storeData.map((s: { user_id: string }) => s.user_id))];

  // Fetch profiles for those users and filter by tier
  const { data: profiles } = await db
    .from("profiles")
    .select("id, subscription_tier")
    .in("id", userIds)
    .in("subscription_tier", tiers);

  const eligibleUsers = new Set<string>((profiles ?? []).map((p: { id: string }) => p.id));

  return [
    ...new Set<string>(
      storeData
        .filter((s: { user_id: string }) => eligibleUsers.has(s.user_id))
        .map((s: { id: string }) => s.id)
    ),
  ];
}

// Runs daily at 6 AM UTC — Growth and Pro stores only
export const scheduleMonitoringFunction = inngest.createFunction(
  {
    id: "schedule-monitoring",
    name: "Schedule Daily Monitoring (Growth + Pro)",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async ({ step }) => {
    const storeIds = await step.run("fetch-growth-pro-stores", () =>
      fetchStoresByTiers(["growth", "pro"])
    );

    if (storeIds.length === 0) {
      return { scheduled: 0, reason: "No growth/pro stores with active queries" };
    }

    await step.sendEvent(
      "fan-out-daily-monitoring",
      storeIds.map((storeId) => ({
        name: "monitoring/run.requested" as const,
        data: { storeId },
      }))
    );

    return { scheduled: storeIds.length, storeIds };
  }
);

// Runs weekly on Sundays at 6 AM UTC — Starter stores only
export const scheduleWeeklyMonitoringFunction = inngest.createFunction(
  {
    id: "schedule-weekly-monitoring",
    name: "Schedule Weekly Monitoring (Starter)",
    triggers: [{ cron: "0 6 * * 0" }],
  },
  async ({ step }) => {
    const storeIds = await step.run("fetch-starter-stores", () =>
      fetchStoresByTiers(["starter"])
    );

    if (storeIds.length === 0) {
      return { scheduled: 0, reason: "No starter stores with active queries" };
    }

    await step.sendEvent(
      "fan-out-weekly-monitoring",
      storeIds.map((storeId) => ({
        name: "monitoring/run.requested" as const,
        data: { storeId },
      }))
    );

    return { scheduled: storeIds.length, storeIds };
  }
);
