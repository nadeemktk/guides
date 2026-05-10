import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runFreeAuditFunction } from "@/lib/inngest/functions/runFreeAudit";
import { syncCatalogFunction } from "@/lib/inngest/functions/syncCatalog";
import { generateQueriesFunction } from "@/lib/inngest/functions/generateQueries";
import { runMonitoringFunction } from "@/lib/inngest/functions/runMonitoring";
import { scheduleMonitoringFunction, scheduleWeeklyMonitoringFunction } from "@/lib/inngest/functions/scheduleMonitoring";
import { generateRecommendationsFunction } from "@/lib/inngest/functions/generateRecommendations";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    runFreeAuditFunction,
    syncCatalogFunction,
    generateQueriesFunction,
    runMonitoringFunction,
    scheduleMonitoringFunction,
    scheduleWeeklyMonitoringFunction,
    generateRecommendationsFunction,
  ],
});
