import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { MentionsClient } from "@/components/dashboard/mentions/MentionsClient";

export const metadata = { title: "Mentions – AISeen" };

export default async function MentionsPage() {
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
        <h1 className="text-2xl font-bold">Mentions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every time an AI cited your brand in a response.
        </p>
      </div>
      <MentionsClient stores={stores ?? []} />
    </div>
  );
}
