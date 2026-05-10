"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Zap } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

interface Props {
  featureName: string;
  upgradeTo: string;
  onClose: () => void;
}

export function UpgradeDialog({ featureName, upgradeTo, onClose }: Props) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-lg p-6 max-w-sm w-full mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold">Upgrade required</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{featureName}</span> is available on the{" "}
          <span className="font-medium text-foreground">
            {TIER_LABELS[upgradeTo] ?? upgradeTo}
          </span>{" "}
          plan and above.
        </p>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => router.push("/billing")}
          >
            View plans
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
