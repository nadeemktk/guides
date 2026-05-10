import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/dashboard/settings/SettingsClient";

export const metadata = { title: "Settings – AISeen" };

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createServiceClient();
  const db = supabase as any;
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
      </div>
      <SettingsClient
        fullName={profile?.full_name ?? null}
        email={profile?.email ?? user.email ?? ""}
      />
    </div>
  );
}
