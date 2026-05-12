import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAuditReportEmail } from "@/lib/email";
import { z } from "zod";

const RequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 254);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email" },
      { status: 400 }
    );
  }

  const email = sanitizeEmail(parsed.data.email);

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email sending is not configured. Please contact support." },
      { status: 503 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the audit
  const { data: audit, error } = await supabase
    .from("public_audits")
    .select("id, brand_name, visibility_score, full_report_unlocked, summary")
    .eq("id", id)
    .single();

  if (error || !audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  // Unlock the report (idempotent)
  if (!audit.full_report_unlocked) {
    await supabase
      .from("public_audits")
      .update({ email, full_report_unlocked: true })
      .eq("id", id);
  }

  // Send the report email
  const brandName = audit.brand_name ?? "your store";
  try {
    await sendAuditReportEmail({
      to: email,
      brandName,
      auditId: id,
      visibilityScore: audit.visibility_score ?? 0,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://aiseen.com",
    });
  } catch (err) {
    console.error("Failed to send audit email:", err);
    return NextResponse.json(
      { error: "Failed to send email. Please try again or check your inbox." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
