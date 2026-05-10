import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();
  const db = supabase as any;

  // Verify ownership before deleting
  const { data } = await db.from("stores").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  await db.from("stores").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const allowed = ["brand_name", "brand_aliases", "is_active", "store_name"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const supabase = createServiceClient();
  const db = supabase as any;
  const { data } = await db.from("stores").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  await db.from("stores").update(update).eq("id", id);
  return NextResponse.json({ ok: true });
}
