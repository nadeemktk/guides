import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Settings – AISeen" };

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold mb-3">Profile</h2>
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full name</label>
              <p className="mt-1 text-sm text-muted-foreground/50 italic">Coming soon</p>
            </div>
            <Separator />
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-sm text-muted-foreground/50 italic">Coming soon</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Notifications</h2>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground/50 italic">Notification preferences — coming soon.</p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Danger zone</h2>
          <div className="rounded-lg border border-destructive/30 bg-card p-5">
            <p className="text-sm text-muted-foreground/50 italic">Account deletion — coming soon.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
