import { MessageSquare } from "lucide-react";

export const metadata = { title: "Mentions – AISeen" };

export default function MentionsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mentions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every time an AI cited your brand in a response.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-muted-foreground">No mentions detected yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Mentions across ChatGPT, Gemini, and Perplexity will appear here.
        </p>
      </div>
    </div>
  );
}
