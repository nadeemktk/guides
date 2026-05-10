import { inngest } from "@/lib/inngest/client";
import { createServiceClient } from "@/lib/supabase/server";
import { generateRecommendations } from "@/lib/recommendations/generator";

export const generateRecommendationsFunction = inngest.createFunction(
  {
    id: "generate-recommendations",
    name: "Generate Store Recommendations",
    triggers: [{ event: "recommendations/generate.requested" as const }],
    retries: 1,
  },
  async ({ event, step }) => {
    const { storeId } = event.data as { storeId: string };

    const count = await step.run("generate", async () => {
      const supabase = createServiceClient();
      const db = supabase as any;

      const { data: store } = await db
        .from("stores")
        .select("brand_name, brand_aliases, store_url")
        .eq("id", storeId)
        .maybeSingle();

      if (!store) throw new Error(`Store ${storeId} not found`);

      const brandName =
        store.brand_name ??
        new URL(store.store_url.startsWith("http") ? store.store_url : `https://${store.store_url}`)
          .hostname.replace(/^www\./, "")
          .split(".")[0];

      return generateRecommendations(storeId, brandName, store.brand_aliases ?? []);
    });

    return { storeId, recommendationsGenerated: count };
  }
);
