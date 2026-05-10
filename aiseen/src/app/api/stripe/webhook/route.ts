import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/types";

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
  [process.env.STRIPE_PRICE_GROWTH ?? ""]: "growth",
  [process.env.STRIPE_PRICE_PRO ?? ""]: "pro",
};

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = subscription as any;
      const priceId = sub.items?.data[0]?.price?.id ?? "";
      const tier = PRICE_TO_TIER[priceId] ?? "free";
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      await db
        .from("profiles")
        .update({
          subscription_tier: tier,
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_end: periodEnd,
        })
        .eq("stripe_customer_id", sub.customer);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = subscription as any;
      await db
        .from("profiles")
        .update({
          subscription_tier: "free",
          subscription_status: "canceled",
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", sub.customer);
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.customer_email) {
        await db
          .from("profiles")
          .update({ stripe_customer_id: session.customer })
          .eq("email", session.customer_email);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
