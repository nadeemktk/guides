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

  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  await inngest.send({ name: "recommendations/generate.requested", data: { storeId: id } });

  return NextResponse.json({ ok: true, message: "Recommendation generation started" });
}
