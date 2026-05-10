"use client";

import { ConnectShopify } from "./ConnectShopify";
import { ConnectAmazon } from "./ConnectAmazon";
import { ConnectWooCommerce } from "./ConnectWooCommerce";
import { StoreCard } from "./StoreCard";
import { ShoppingBag } from "lucide-react";

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

export function StoreManager({ stores, flash }: { stores: Store[]; flash?: string | null }) {
  return (
    <div className="space-y-6">
      {/* Flash message from OAuth callback */}
      {flash === "shopify" && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Shopify store connected successfully.
        </div>
      )}
      {flash && flash.startsWith("error:") && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          Connection failed: {flash.replace("error:", "").replace(/_/g, " ")}
        </div>
      )}

      {/* Connected stores */}
      {stores.length > 0 ? (
        <div className="space-y-3">
          {stores.map((s) => <StoreCard key={s.id} store={s} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-muted-foreground">No stores connected yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-6">
            Connect a store to start monitoring your AI search visibility.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <ConnectShopify />
            <ConnectAmazon />
            <ConnectWooCommerce />
          </div>
        </div>
      )}

      {/* Add another store */}
      {stores.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Add another store</p>
          <div className="flex flex-wrap gap-2">
            <ConnectShopify />
            <ConnectAmazon />
            <ConnectWooCommerce />
          </div>
        </div>
      )}
    </div>
  );
}
