import { Users } from "lucide-react";

export const metadata = { title: "Competitors – AISeen" };

export default function CompetitorsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Competitors</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Brands mentioned alongside yours in AI responses.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
        <Users className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-muted-foreground">No competitors tracked yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Competitor brands will be auto-detected from AI responses.
        </p>
      </div>
    </div>
  );
}
