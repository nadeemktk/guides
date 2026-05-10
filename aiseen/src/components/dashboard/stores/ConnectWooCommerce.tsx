"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export function ConnectWooCommerce({ storeId, currentUrl }: { storeId?: string; currentUrl?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storeUrl, setStoreUrl] = useState(currentUrl ?? "");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");

  async function handleSave() {
    if (!storeUrl) { setError("Store URL is required."); return; }
    if (!consumerKey || !consumerSecret) { setError("Consumer key and secret are required."); return; }

    let url = storeUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/stores/woocommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          store_url: url,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Connection failed."); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Connect WooCommerce</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect WooCommerce</DialogTitle>
          <DialogDescription>
            Enter your store URL and WooCommerce REST API keys. Generate them in
            WooCommerce → Settings → Advanced → REST API (read-only access is sufficient).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="wc-url">Store URL</Label>
            <Input
              id="wc-url"
              placeholder="https://yourstore.com"
              value={storeUrl}
              onChange={(e) => { setStoreUrl(e.target.value); setError(""); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-key">Consumer key</Label>
            <Input
              id="wc-key"
              placeholder="ck_..."
              value={consumerKey}
              onChange={(e) => { setConsumerKey(e.target.value); setError(""); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-secret">Consumer secret</Label>
            <Input
              id="wc-secret"
              type="password"
              placeholder="cs_..."
              value={consumerSecret}
              onChange={(e) => { setConsumerSecret(e.target.value); setError(""); }}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Testing…" : "Save & test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
