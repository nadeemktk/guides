import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { checkGate } from "@/lib/billing/gate";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Plan gate: monitoring requires starter+
  const gate = await checkGate(user.id, "monitoring");
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.reason, upgradeTo: gate.upgradeTo }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  // Check there are active queries before firing
  const { count } = await (supabase as any)
    .from("queries")
    .select("id", { count: "exact", head: true })
    .eq("store_id", id)
    .eq("is_active", true);

  if (!count || count === 0) {
    return NextResponse.json(
      { error: "No active queries — generate queries first" },
      { status: 422 }
    );
  }

  await inngest.send({ name: "monitoring/run.requested", data: { storeId: id } });

  return NextResponse.json({ ok: true, message: "Monitoring run started", activeQueries: count });
}
