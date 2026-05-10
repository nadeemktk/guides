import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";

const RequestSchema = z.object({
  storeUrl: z.string().url("Please enter a valid store URL"),
});

function sanitizeInput(input: string): string {
  return input.replace(/[<>"'`]/g, "").trim().slice(0, 500);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const storeUrl = sanitizeInput(parsed.data.storeUrl);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create the audit record
  const { data: audit, error } = await supabase
    .from("public_audits")
    .insert({
      store_url: storeUrl,
      summary: { status: "pending", step: "queued" },
    })
    .select("id")
    .single();

  if (error || !audit) {
    console.error("Failed to create audit record:", error);
    return NextResponse.json({ error: "Failed to create audit" }, { status: 500 });
  }

  // Dispatch Inngest event
  await inngest.send({
    name: "audit/run.requested",
    data: { auditId: audit.id, storeUrl, brandName: "" },
  });

  return NextResponse.json({ id: audit.id });
}
