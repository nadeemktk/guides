import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { TrendsClient } from "@/components/dashboard/trends/TrendsClient";

export const metadata = { title: "Trends – AISeen" };

export default async function TrendsPage() {
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
        <h1 className="text-2xl font-bold">Trends</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visibility score over time across all AI providers.
        </p>
      </div>
      <TrendsClient stores={stores ?? []} />
    </div>
  );
}
