"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

export function ConnectShopify() {
  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function handleConnect() {
    const raw = shop.trim();
    if (!raw) { setError("Enter your store name."); return; }
    setError("");
    // The auth route handles validation + redirect to Shopify
    window.location.href = `/api/stores/shopify/auth?shop=${encodeURIComponent(raw)}`;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Connect Shopify</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect your Shopify store</DialogTitle>
          <DialogDescription>
            Enter your store name below. You&apos;ll be redirected to Shopify to authorize read-only
            access to your product catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="shopify-store">Store name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="shopify-store"
                placeholder="my-store"
                value={shop}
                onChange={(e) => { setShop(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className={error ? "border-destructive" : ""}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">.myshopify.com</span>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            We request <strong>read_products</strong> scope only — we never modify your store.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConnect}>
            Authorize <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
