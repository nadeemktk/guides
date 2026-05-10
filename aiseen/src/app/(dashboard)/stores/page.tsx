import { createServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import { StoreManager } from "@/components/dashboard/stores/StoreManager";

export const metadata = { title: "Stores – AISeen" };

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { connected, error } = await searchParams;
  const flash = connected ? connected : error ? `error:${error}` : null;

  const supabase = createServiceClient();
  const { data: stores } = await (supabase as any)
    .from("stores")
    .select("id, platform, store_url, store_name, brand_name, brand_aliases, is_active, catalog_last_synced_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Stores</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect your e-commerce stores to enable AI visibility monitoring.
        </p>
      </div>
      <StoreManager stores={stores ?? []} flash={flash} />
    </div>
  );
}
