import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

const VALID_STATUSES = new Set(["pending", "approved", "applied", "dismissed"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null) as { status?: string } | null;

  if (!body?.status || !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const db = supabase as any;

  // Verify ownership via stores join
  const { data: rec } = await db
    .from("recommendations")
    .select("id, stores!inner(user_id)")
    .eq("id", id)
    .eq("stores.user_id", user.id)
    .maybeSingle();

  if (!rec) return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });

  const update: Record<string, unknown> = { status: body.status };
  if (body.status === "applied") update.applied_at = new Date().toISOString();

  await db.from("recommendations").update(update).eq("id", id);
  return NextResponse.json({ ok: true });
}
