import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { findMatchingProduct } from "@/lib/apply/matcher";
import { applyDescriptionToStore } from "@/lib/apply";
import { checkGate } from "@/lib/billing/gate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Auto-apply via platform API requires pro plan
  const gate = await checkGate(user.id, "autoApply");
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason, upgradeTo: gate.upgradeTo }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { productId?: string };

  const supabase = createServiceClient();
  const db = supabase as any;

  // Verify ownership + fetch recommendation
  const { data: rec } = await db
    .from("recommendations")
    .select("id, store_id, rec_type, title, rationale, suggested_value, status, stores!inner(user_id)")
    .eq("id", id)
    .eq("stores.user_id", user.id)
    .maybeSingle();

  if (!rec) return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  if (rec.status !== "approved") {
    return NextResponse.json({ error: "Recommendation must be approved before applying" }, { status: 422 });
  }
  if (!rec.suggested_value) {
    return NextResponse.json({ error: "No suggested value to apply" }, { status: 422 });
  }

  // Non-description types: just mark applied (no API call needed)
  if (rec.rec_type !== "description_rewrite") {
    await db
      .from("recommendations")
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ ok: true, autoApplied: false, message: "Marked as applied" });
  }

  // --- description_rewrite: auto-apply via platform API ---

  // Fetch the store with credentials
  const { data: store } = await db
    .from("stores")
    .select("id, platform, store_url, api_credentials")
    .eq("id", rec.store_id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  // Platforms without write-back support
  if (store.platform === "amazon" || store.platform === "manual") {
    await db
      .from("recommendations")
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({
      ok: true,
      autoApplied: false,
      message: `Auto-apply is not available for ${store.platform} stores. Marked as applied — please update manually.`,
    });
  }

  // Resolve product: use provided productId or auto-match
  let productId: string | null = body.productId ?? null;
  let externalId: string | null = null;
  let productTitle: string | null = null;

  if (productId) {
    const { data: p } = await db
      .from("products")
      .select("id, external_id, title")
      .eq("id", productId)
      .eq("store_id", rec.store_id)
      .maybeSingle();
    if (!p) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    externalId = p.external_id as string;
    productTitle = p.title as string;
  } else {
    // Auto-match from recommendation text
    const recText = [rec.title, rec.rationale, rec.suggested_value].filter(Boolean).join(" ");
    const matched = await findMatchingProduct(rec.store_id, recText);
    if (!matched) {
      return NextResponse.json({
        error: "Could not auto-match a product. Please select a product manually.",
        needsProductSelection: true,
      }, { status: 422 });
    }
    productId = matched.id;
    externalId = matched.external_id;
    productTitle = matched.title;
  }

  // Push to platform
  try {
    await applyDescriptionToStore(store, externalId!, rec.suggested_value);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Platform update failed" },
      { status: 502 }
    );
  }

  // Mark as applied in DB
  await db
    .from("recommendations")
    .update({
      status: "applied",
      applied_at: new Date().toISOString(),
      product_id: productId,
    })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    autoApplied: true,
    productTitle,
    message: `Description updated on "${productTitle}"`,
  });
}
