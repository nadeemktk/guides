import { Search } from "lucide-react";

export const metadata = { title: "Queries – AISeen" };

export default function QueriesPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Queries</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI queries monitored for your brand mentions.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
        <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-muted-foreground">No queries yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Auto-generated queries will appear here once your store is connected.
        </p>
      </div>
    </div>
  );
}
