import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  const { data: userData, error: userErr } = await supabasePublic.auth.getUser(token)
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const userId = userData.user.id

  const { data: profile, error: pErr } = await supabaseServer
    .from('profiles')
    .select('email, trial_end, subscription_status')
    .eq('id', userId)
    .single()

  if (pErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json({
  userId,
  email: profile.email,
  trial_end: profile.trial_end,
  subscription_status: profile.subscription_status,
})
}