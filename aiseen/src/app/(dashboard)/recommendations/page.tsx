import { Lightbulb } from "lucide-react";

export const metadata = { title: "Recommendations – AISeen" };

export default function RecommendationsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-generated actions to improve your visibility score.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
        <Lightbulb className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-muted-foreground">No recommendations yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Personalized recommendations will generate after your first monitoring cycle.
        </p>
      </div>
    </div>
  );
}
