import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { getPlanByTier, type PlanTier } from "@/lib/stripe/plans";
import { env } from "@/lib/env";
import { z } from "zod";
import { parseBody } from "@/lib/validation/api-schemas";

const checkoutSchema = z.object({
  tier: z.enum(["starter", "pro", "team"]),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseBody(checkoutSchema, await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { tier } = parsed.data;
  const plan = getPlanByTier(tier);
  if (!plan || !plan.priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Fetch user profile for existing stripe customer
  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id, email, full_name")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? undefined;

  // Create Stripe customer if not exists
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email ?? undefined,
      name: profile?.full_name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${env.appUrl}/settings/billing?success=true`,
    cancel_url: `${env.appUrl}/settings/billing?canceled=true`,
    metadata: { userId: user.id, tier },
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
