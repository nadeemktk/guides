"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Lightbulb, CheckCircle, XCircle, ChevronDown, ChevronUp, Zap, Search } from "lucide-react";
import { UpgradeDialog } from "@/components/dashboard/billing/UpgradeDialog";

interface Recommendation {
  id: string;
  store_id: string;
  rec_type: string;
  title: string;
  rationale: string | null;
  current_value: string | null;
  suggested_value: string | null;
  expected_impact: string | null;
  status: "pending" | "approved" | "applied" | "dismissed";
  applied_at: string | null;
  created_at: string;
}

interface Store {
  id: string;
  brand_name: string | null;
  store_url: string;
  platform: string;
}

interface Product {
  id: string;
  external_id: string;
  title: string;
  product_type: string | null;
  price: number | null;
}

const REC_TYPE_LABELS: Record<string, string> = {
  description_rewrite: "Description rewrite",
  schema_markup: "Schema markup",
  content_topic: "Content topic",
  review_site: "Review site",
  feature_gap: "Feature gap",
};

const REC_TYPE_COLORS: Record<string, string> = {
  description_rewrite: "bg-blue-50 text-blue-700",
  schema_markup: "bg-purple-50 text-purple-700",
  content_topic: "bg-green-50 text-green-700",
  review_site: "bg-orange-50 text-orange-700",
  feature_gap: "bg-yellow-50 text-yellow-700",
};

const STATUS_TABS = ["pending", "approved", "applied", "dismissed"] as const;
type StatusTab = typeof STATUS_TABS[number];

const AUTO_APPLY_PLATFORMS = new Set(["shopify", "woocommerce"]);

// ---------- ProductPicker ----------
function ProductPicker({
  storeId,
  onSelect,
  onCancel,
}: {
  storeId: string;
  onSelect: (product: Product) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(q: string) {
    setSearching(true);
    try {
      const params = new URLSearchParams({ store_id: storeId });
      if (q) params.set("q", q);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json() as { products: Product[] };
      setProducts(data.products ?? []);
    } finally {
      setSearching(false);
    }
  }

  // Load on mount
  useState(() => { search(""); });

  return (
    <div className="border border-border rounded-md p-3 bg-muted/30 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Select product to update:</p>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products…"
          className="w-full pl-7 pr-3 py-1.5 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
        />
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {searching && <p className="text-xs text-muted-foreground px-1">Searching…</p>}
        {!searching && products.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">No products found</p>
        )}
        {products.map((p) => (
          <button
            key={p.id}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors truncate"
            onClick={() => onSelect(p)}
          >
            {p.title}{p.product_type ? ` · ${p.product_type}` : ""}
          </button>
        ))}
      </div>
      <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

// ---------- RecCard ----------
function RecCard({
  rec,
  storePlatform,
  onStatusChange,
  onApply,
}: {
  rec: Recommendation;
  storePlatform: string;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onApply: (id: string, productId?: string) => Promise<{ ok?: boolean; autoApplied?: boolean; message?: string; needsProductSelection?: boolean; error?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const canAutoApply = rec.rec_type === "description_rewrite" && AUTO_APPLY_PLATFORMS.has(storePlatform);

  async function handleStatusChange(status: string) {
    setUpdating(true);
    try {
      await onStatusChange(rec.id, status);
    } finally {
      setUpdating(false);
    }
  }

  async function handleAutoApply(productId?: string) {
    setUpdating(true);
    setApplyMsg(null);
    setApplyError(null);
    try {
      const result = await onApply(rec.id, productId);
      if (result.needsProductSelection) {
        setShowPicker(true);
        return;
      }
      if (!result.ok) {
        setApplyError(result.error ?? "Apply failed");
        return;
      }
      setApplyMsg(result.message ?? "Applied");
      setShowPicker(false);
    } finally {
      setUpdating(false);
    }
  }

  async function handleProductSelect(product: Product) {
    setShowPicker(false);
    await handleAutoApply(product.id);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
            REC_TYPE_COLORS[rec.rec_type] ?? "bg-gray-50 text-gray-600"
          }`}>
            {REC_TYPE_LABELS[rec.rec_type] ?? rec.rec_type}
          </span>
          <p className="text-sm font-medium leading-snug">{rec.title}</p>
        </div>
        {rec.expected_impact && (
          <span className="shrink-0 text-xs text-muted-foreground italic max-w-[160px] text-right leading-snug">
            {rec.expected_impact}
          </span>
        )}
      </div>

      {rec.rationale && (
        <p className="text-sm text-muted-foreground leading-relaxed">{rec.rationale}</p>
      )}

      {(rec.current_value || rec.suggested_value) && (
        <button
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide details" : "Show details"}
        </button>
      )}

      {expanded && (
        <div className="space-y-3 pt-1">
          {rec.current_value && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Current</p>
              <p className="text-sm bg-muted/50 rounded-md p-3 text-muted-foreground leading-relaxed">
                {rec.current_value}
              </p>
            </div>
          )}
          {rec.suggested_value && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Suggested</p>
              <p className="text-sm bg-primary/5 border border-primary/20 rounded-md p-3 leading-relaxed">
                {rec.suggested_value}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Product picker (shown when auto-match fails) */}
      {showPicker && (
        <ProductPicker
          storeId={rec.store_id}
          onSelect={handleProductSelect}
          onCancel={() => setShowPicker(false)}
        />
      )}

      {/* Apply feedback */}
      {applyMsg && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />{applyMsg}
        </p>
      )}
      {applyError && (
        <p className="text-xs text-red-500">{applyError}</p>
      )}

      {/* Actions */}
      {rec.status === "pending" && (
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs" onClick={() => handleStatusChange("approved")} disabled={updating}>
            <CheckCircle className="h-3 w-3 mr-1" />Approve
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleStatusChange("dismissed")} disabled={updating}>
            <XCircle className="h-3 w-3 mr-1" />Dismiss
          </Button>
        </div>
      )}

      {rec.status === "approved" && !applyMsg && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {canAutoApply && (
            <Button size="sm" className="h-7 text-xs" onClick={() => handleAutoApply()} disabled={updating}>
              <Zap className="h-3 w-3 mr-1" />Auto-apply
            </Button>
          )}
          {!canAutoApply && (
            <Button size="sm" className="h-7 text-xs" onClick={() => handleStatusChange("applied")} disabled={updating}>
              Mark as applied
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleStatusChange("dismissed")} disabled={updating}>
            Dismiss
          </Button>
        </div>
      )}

      {rec.status === "applied" && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Applied{rec.applied_at ? ` on ${new Date(rec.applied_at).toLocaleDateString()}` : ""}
        </p>
      )}

      {rec.status === "dismissed" && (
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleStatusChange("pending")} disabled={updating}>
          Restore
        </Button>
      )}
    </div>
  );
}

// ---------- Main component ----------
export function RecommendationsClient({ stores, initialStoreId }: { stores: Store[]; initialStoreId?: string }) {
  const [storeId, setStoreId] = useState(initialStoreId ?? stores[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState<{ feature: string; upgradeTo: string } | null>(null);

  const currentStore = stores.find((s) => s.id === storeId);

  const fetchRecs = useCallback(async (sid: string, status: StatusTab) => {
    if (!sid) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ store_id: sid, status });
      const res = await fetch(`/api/recommendations?${params}`);
      const data = await res.json() as { recommendations: Recommendation[] };
      setRecs(data.recommendations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useState(() => { if (storeId) fetchRecs(storeId, "pending"); });

  function handleStoreChange(sid: string) {
    setStoreId(sid);
    setGenMsg(null);
    fetchRecs(sid, activeTab);
  }

  function handleTabChange(tab: StatusTab) {
    setActiveTab(tab);
    fetchRecs(storeId, tab);
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/recommendations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setRecs((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleApply(id: string, productId?: string) {
    const res = await fetch(`/api/recommendations/${id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productId ? { productId } : {}),
    });
    const data = await res.json() as { ok?: boolean; autoApplied?: boolean; message?: string; needsProductSelection?: boolean; error?: string; upgradeTo?: string };
    if (res.status === 403 && data.upgradeTo) {
      setUpgradeDialog({ feature: "Auto-apply", upgradeTo: data.upgradeTo });
      return data;
    }
    if (data.ok && !data.needsProductSelection) {
      setRecs((prev) => prev.filter((r) => r.id !== id));
    }
    return data;
  }

  async function handleGenerate() {
    if (!storeId) return;
    setGenerating(true);
    setGenMsg(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/recommendations/generate`, { method: "POST" });
      const data = await res.json() as { message?: string; error?: string; upgradeTo?: string };
      if (res.status === 403 && data.upgradeTo) {
        setUpgradeDialog({ feature: "Recommendations", upgradeTo: data.upgradeTo });
        return;
      }
      if (!res.ok) { setGenMsg(`Error: ${data.error}`); return; }
      setGenMsg("Recommendation generation started — refresh in a moment to see results.");
      setTimeout(() => fetchRecs(storeId, activeTab), 8000);
    } finally {
      setGenerating(false);
    }
  }

  const TAB_LABELS: Record<StatusTab, string> = {
    pending: "Pending",
    approved: "Approved",
    applied: "Applied",
    dismissed: "Dismissed",
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {stores.length > 1 && (
          <Select value={storeId} onValueChange={handleStoreChange}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.brand_name ?? s.store_url}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" size="sm" onClick={() => fetchRecs(storeId, activeTab)} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <Button size="sm" onClick={handleGenerate} disabled={generating || !storeId} className="ml-auto">
          <Lightbulb className={`h-3.5 w-3.5 mr-1.5 ${generating ? "animate-pulse" : ""}`} />
          {generating ? "Starting…" : "Generate recommendations"}
        </Button>
      </div>

      {genMsg && <p className="text-sm text-muted-foreground">{genMsg}</p>}

      {/* Auto-apply notice for supported platforms */}
      {currentStore && AUTO_APPLY_PLATFORMS.has(currentStore.platform) && activeTab === "approved" && (
        <div className="flex items-start gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
          <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/70">
            <span className="font-medium text-foreground">Auto-apply available.</span>{" "}
            Description rewrites can be pushed directly to your {currentStore.platform === "shopify" ? "Shopify" : "WooCommerce"} store.
          </p>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!loading && recs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center">
          <Lightbulb className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <p className="font-medium text-muted-foreground">No {activeTab} recommendations</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
            {activeTab === "pending"
              ? "Run monitoring first, then generate recommendations."
              : `No recommendations with status "${activeTab}" yet.`}
          </p>
          {activeTab === "pending" && storeId && (
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              Generate recommendations
            </Button>
          )}
        </div>
      )}

      {/* Recommendation cards */}
      <div className="space-y-3">
        {recs.map((rec) => (
          <RecCard
            key={rec.id}
            rec={rec}
            storePlatform={currentStore?.platform ?? ""}
            onStatusChange={handleStatusChange}
            onApply={handleApply}
          />
        ))}
      </div>

      {upgradeDialog && (
        <UpgradeDialog
          featureName={upgradeDialog.feature}
          upgradeTo={upgradeDialog.upgradeTo}
          onClose={() => setUpgradeDialog(null)}
        />
      )}
    </div>
  );
}
