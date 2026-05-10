import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/actions";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { priceId?: string } | null;
  if (!body?.priceId) return NextResponse.json({ error: "priceId required" }, { status: 400 });

  const supabase = createServiceClient();
  const db = supabase as any;
  const stripe = getStripe();

  // Get or create Stripe customer
  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .maybeSingle();

  let customerId: string = profile?.stripe_customer_id ?? "";
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: body.priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?upgraded=1`,
    cancel_url: `${appUrl}/billing`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
