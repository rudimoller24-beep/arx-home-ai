import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    // Create user in Supabase Auth
    const { data, error } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'User create failed' }, { status: 400 })
    }

    // Set 7-day trial
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 7)

    // Create profile row tied to auth.users id
    const { error: pErr } = await supabaseServer.from('profiles').insert({
      id: data.user.id,
      email,
      trial_end: trialEnd.toISOString(),
      subscription_status: 'trial',
    })

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Account created! You can now login.' })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}