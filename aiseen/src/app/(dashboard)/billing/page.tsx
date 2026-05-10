import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Billing – AISeen" };

export default function BillingPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your subscription and invoices.</p>
      </div>

      <div className="space-y-4">
        {/* Current plan */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Current plan</h2>
            <Badge variant="secondary">Free trial</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            You&apos;re on the 14-day free trial. Upgrade to keep access after it ends.
          </p>
        </div>

        {/* Payment method */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Payment method</h2>
          </div>
          <p className="text-sm text-muted-foreground/50 italic">No payment method on file.</p>
        </div>

        {/* Invoices */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Invoices</h2>
          <p className="text-sm text-muted-foreground/50 italic">No invoices yet.</p>
        </div>
      </div>
    </div>
  );
}
