import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

// Import all functions here as they're created
// import { syncStoreCatalog } from "@/lib/inngest/functions/syncStore";
// import { generateQueries } from "@/lib/inngest/functions/generateQueries";
// import { runQuery } from "@/lib/inngest/functions/runQuery";
// import { detectMentions } from "@/lib/inngest/functions/detectMentions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Functions will be added here in subsequent phases
  ],
});
