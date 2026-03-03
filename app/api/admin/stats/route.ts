import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const isAdminEmail = (email: string) => {
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return list.includes((email || '').toLowerCase())
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  const { data: userData, error: userErr } = await supabasePublic.auth.getUser(token)
  if (userErr || !userData.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const email = userData.user.email || ''
  if (!isAdminEmail(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // total users (from profiles)
  const { count: userCount } = await supabaseServer
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // active subscribers
  const { count: activeCount } = await supabaseServer
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'active')

  // diagnoses count
  const { count: diagCount } = await supabaseServer
    .from('diagnoses')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    users: userCount || 0,
    activeSubscribers: activeCount || 0,
    diagnoses: diagCount || 0,
  })
}