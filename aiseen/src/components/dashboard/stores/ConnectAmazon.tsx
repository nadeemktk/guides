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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AMAZON_MARKETPLACES } from "@/lib/stores/amazon";

const MARKETPLACE_OPTIONS = Object.entries(AMAZON_MARKETPLACES).map(([id, info]) => ({
  id,
  label: info.label,
}));

interface Field { id: string; label: string; placeholder: string; type?: string }
const FIELDS: Field[] = [
  { id: "seller_id", label: "Seller ID", placeholder: "A1B2C3D4E5F6G7" },
  { id: "lwa_client_id", label: "LWA App Client ID", placeholder: "amzn1.application-oa2-client...." },
  { id: "lwa_client_secret", label: "LWA App Client Secret", placeholder: "••••••••", type: "password" },
  { id: "lwa_refresh_token", label: "LWA Refresh Token", placeholder: "Atzr|...", type: "password" },
];

export function ConnectAmazon({ storeId }: { storeId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketplace, setMarketplace] = useState("ATVPDKIKX0DER");
  const [fields, setFields] = useState<Record<string, string>>({
    seller_id: "", lwa_client_id: "", lwa_client_secret: "", lwa_refresh_token: "",
  });

  async function handleSave() {
    for (const f of FIELDS) {
      if (!fields[f.id]) { setError(`${f.label} is required.`); return; }
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/stores/amazon/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, marketplace_id: marketplace, ...fields }),
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
        <Button variant="outline" size="sm">Connect Amazon</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Amazon SP-API</DialogTitle>
          <DialogDescription>
            Enter your Amazon Selling Partner API credentials. These are stored encrypted
            and used only to read your product catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-2">
            <Label>Marketplace</Label>
            <Select value={marketplace} onValueChange={setMarketplace}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_OPTIONS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {FIELDS.map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={`amazon-${f.id}`}>{f.label}</Label>
              <Input
                id={`amazon-${f.id}`}
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                value={fields[f.id]}
                onChange={(e) => setFields((p) => ({ ...p, [f.id]: e.target.value }))}
              />
            </div>
          ))}

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
