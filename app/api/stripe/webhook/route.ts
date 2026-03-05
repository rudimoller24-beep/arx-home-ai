import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

// Force Node runtime (Stripe + raw body handling is safest in Node)
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();

  // IMPORTANT: headers() is async in newer Next versions
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("STRIPE_WEBHOOK_SIGNATURE_ERROR:", err?.message || err);
    return NextResponse.json(
      { error: `Webhook Error: ${err?.message || "Invalid signature"}` },
      { status: 400 }
    );
  }

  try {
    // Handle events you care about
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Example: session.metadata?.userId
        // const userId = session.metadata?.userId;

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        // Example: sub.status, sub.customer, sub.metadata?.userId
        break;
      }

      default:
        // console.log(`Unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("STRIPE_WEBHOOK_HANDLER_ERROR:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}