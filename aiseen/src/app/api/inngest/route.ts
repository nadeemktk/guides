import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runFreeAuditFunction } from "@/lib/inngest/functions/runFreeAudit";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runFreeAuditFunction],
});
