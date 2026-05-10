"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectShopify } from "./ConnectShopify";
import { ConnectAmazon } from "./ConnectAmazon";
import { ConnectWooCommerce } from "./ConnectWooCommerce";
import { ShoppingBag, Trash2, RefreshCw, CheckCircle, XCircle, Database } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Store {
  id: string;
  platform: string;
  store_url: string;
  store_name: string | null;
  brand_name: string | null;
  brand_aliases: string[] | null;
  is_active: boolean;
  catalog_last_synced_at: string | null;
  created_at: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  amazon: "Amazon",
  woocommerce: "WooCommerce",
  manual: "Manual",
};

export function StoreCard({ store }: { store: Store }) {
  const router = useRouter();
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/stores/${store.id}/test`, { method: "POST" });
      const data = await res.json() as { ok: boolean; error?: string };
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, error: "Network error" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/stores/${store.id}/sync`, { method: "POST" });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) { setSyncMsg(`Error: ${data.error ?? "Sync failed"}`); return; }
      setSyncMsg("Sync started — catalog will update in the background.");
      // Refresh after a brief delay so the user sees the message
      setTimeout(() => router.refresh(), 3000);
    } catch {
      setSyncMsg("Network error — try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this store? This will also delete associated products and queries.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const hasCredentials = store.platform === "manual" || store.platform === "shopify"
    ? true // Shopify uses OAuth, manual has no creds needed
    : false; // Amazon/WooCommerce need manual credential entry (shown as reconnect button)

  void hasCredentials;

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {store.brand_name ?? store.store_name ?? store.store_url}
            </p>
            <p className="text-xs text-muted-foreground truncate">{store.store_url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={store.is_active ? "default" : "secondary"} className="text-xs">
            {PLATFORM_LABELS[store.platform] ?? store.platform}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {store.catalog_last_synced_at
          ? `Catalog synced ${formatDate(store.catalog_last_synced_at)}`
          : "Catalog not synced yet"}
      </p>

      {testResult && (
        <div className={`flex items-center gap-1.5 text-xs rounded-md px-3 py-2 ${
          testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {testResult.ok
            ? <CheckCircle className="h-3.5 w-3.5" />
            : <XCircle className="h-3.5 w-3.5" />
          }
          {testResult.ok ? "Connection OK" : testResult.error ?? "Connection failed"}
        </div>
      )}
      {syncMsg && (
        <p className="text-xs text-muted-foreground">{syncMsg}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {store.platform !== "manual" && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleSync}
            disabled={syncing}
          >
            <Database className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-pulse" : ""}`} />
            {syncing ? "Starting…" : "Sync catalog"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={handleTest}
          disabled={testing}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${testing ? "animate-spin" : ""}`} />
          Test connection
        </Button>

        {/* Reconnect button for platforms using manual credentials */}
        {store.platform === "amazon" && <ConnectAmazon storeId={store.id} />}
        {store.platform === "woocommerce" && (
          <ConnectWooCommerce storeId={store.id} currentUrl={store.store_url} />
        )}
        {store.platform === "shopify" && (
          <ConnectShopify />
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-destructive hover:text-destructive ml-auto"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}
