import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runFreeAuditFunction } from "@/lib/inngest/functions/runFreeAudit";
import { syncCatalogFunction } from "@/lib/inngest/functions/syncCatalog";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runFreeAuditFunction, syncCatalogFunction],
});
