import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UserMenu } from "@/components/dashboard/UserMenu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col w-56 shrink-0 border-r border-border bg-background sticky top-0 h-screen">
        <Sidebar />
        <UserMenu user={user} />
      </div>
      <main className="flex-1 overflow-y-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
}
