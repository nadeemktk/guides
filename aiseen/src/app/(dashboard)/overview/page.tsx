import { LayoutDashboard } from "lucide-react";

export const metadata = { title: "Overview – AISeen" };

export default function OverviewPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Your AI search visibility at a glance.</p>
      </div>

      {/* Stat cards placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {["Visibility Score", "Mentions", "Queries Tracked", "Competitors"].map((label) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-muted-foreground/30">—</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
        <LayoutDashboard className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-muted-foreground">No data yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Connect your store to start tracking AI visibility.
        </p>
      </div>
    </div>
  );
}
