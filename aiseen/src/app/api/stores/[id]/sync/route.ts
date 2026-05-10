import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();

  // Verify ownership
  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id, platform")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  if (store.platform === "manual") {
    return NextResponse.json(
      { error: "Manual stores do not support automatic catalog sync" },
      { status: 422 }
    );
  }

  await inngest.send({
    name: "catalog/sync.requested",
    data: { storeId: id },
  });

  return NextResponse.json({ ok: true, message: "Catalog sync started" });
}
