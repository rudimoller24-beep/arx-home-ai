import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from "@/lib/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  // remove apiVersion

// IMPORTANT: Next.js needs the raw body for Stripe signature verification

async function readRawBody(req: Request) {
  const arrayBuffer = await req.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const rawBody = await readRawBody(req)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('WEBHOOK_SIGNATURE_ERROR:', err?.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    // ✅ Payment completed / subscription created
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const subId = session.subscription as string | null
      const customerId = session.customer as string | null

      // we put userId in subscription metadata
      // but checkout.session.completed doesn’t always include it directly
      // so we retrieve subscription to read metadata
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId)
        const userId = (sub.metadata?.userId || '').trim()

        if (userId) {
          await supabaseServer
            .from('profiles')
            .update({
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subId,
            })
            .eq('id', userId)
        }
      }
    }

    // ✅ Subscription status changes (canceled/past_due/etc.)
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const userId = (sub.metadata?.userId || '').trim()
      if (userId) {
        const status =
          sub.status === 'active' || sub.status === 'trialing'
            ? 'active'
            : sub.status === 'canceled'
              ? 'canceled'
              : 'past_due'

        await supabaseServer
          .from('profiles')
          .update({
            subscription_status: status,
            stripe_customer_id: (sub.customer as string) || null,
            stripe_subscription_id: sub.id,
          })
          .eq('id', userId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('WEBHOOK_HANDLER_ERROR:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}