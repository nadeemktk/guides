import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { RecommendationsClient } from "@/components/dashboard/recommendations/RecommendationsClient";

export const metadata = { title: "Recommendations – AISeen" };

export default async function RecommendationsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createServiceClient();
  const { data: stores } = await (supabase as any)
    .from("stores")
    .select("id, brand_name, store_url, platform")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-generated actions to improve your visibility score.
        </p>
      </div>
      <RecommendationsClient stores={stores ?? []} />
    </div>
  );
}
