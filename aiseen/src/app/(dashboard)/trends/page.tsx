import { TrendingUp } from "lucide-react";

export const metadata = { title: "Trends – AISeen" };

export default function TrendsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Trends</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visibility score over time across all AI providers.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
        <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-muted-foreground">Not enough data yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Trend charts will appear after your first monitoring run.
        </p>
      </div>
    </div>
  );
}
