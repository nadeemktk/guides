import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  full_name: z.string().min(1).max(100),
});

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const db = supabase as any;
  await db.from("profiles").update({ full_name: parsed.data.full_name }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();
  await supabase.auth.admin.deleteUser(user.id);
  return NextResponse.json({ ok: true });
}
