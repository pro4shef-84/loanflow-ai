import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe-webhook] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userId = session.metadata?.userId;

      if (userId) {
        await supabase
          .from("users")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_tier: (session.metadata?.tier ?? "starter") as "starter" | "pro" | "team",
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const status = sub.status;
      const tier = sub.metadata?.tier;

      if (customerId && tier) {
        await supabase
          .from("users")
          .update({
            subscription_tier: status === "active" ? (tier as "starter" | "pro" | "team") : "trial",
          })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      await supabase
        .from("users")
        .update({ subscription_tier: "trial", stripe_subscription_id: null })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
