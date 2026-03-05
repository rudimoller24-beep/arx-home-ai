import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { email, userId } = await req.json()

    if (!email || !userId) {
      return NextResponse.json({ error: 'Missing email or userId' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId },
      },
      success_url: `${process.env.APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.APP_URL}/dashboard?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('STRIPE_CHECKOUT_ERROR:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}