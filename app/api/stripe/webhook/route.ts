import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.userId;

        if (userId) {
          await supabaseServer
            .from("profiles")
            .update({
              subscription_status: "active",
            })
            .eq("id", userId);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const userId = subscription.metadata?.userId;

        if (userId) {
          await supabaseServer
            .from("profiles")
            .update({
              subscription_status: "inactive",
            })
            .eq("id", userId);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}