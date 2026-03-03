import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'
import OpenAI from 'openai'

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const { data: userData, error: userErr } = await supabasePublic.auth.getUser(token)
    if (userErr || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = userData.user.id

    const { data: profile, error: pErr } = await supabaseServer
      .from('profiles')
      .select('trial_end, subscription_status')
      .eq('id', userId)
      .single()

    if (pErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isActive = profile.subscription_status === 'active'
    const trialEnd = profile.trial_end ? new Date(profile.trial_end).getTime() : 0
    const trialValid = Date.now() <= trialEnd

    if (!isActive && !trialValid) {
      return NextResponse.json({ error: 'Trial ended. Please upgrade.' }, { status: 402 })
    }

    const body = await req.json()
    const text = body?.text

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing problem description' }, { status: 400 })
    }

    const prompt = `You are ARX Home AI for South African homeowners.
Return a clear diagnosis in this structure:

1) Category
2) Likely causes (ranked)
3) Risk level (Low/Medium/High) + why
4) DIY difficulty (1-5)
5) Tools needed
6) Materials list
7) Rough material cost estimate in ZAR (range)
8) Rough labour cost estimate in ZAR (range)
9) Safety warnings
10) When to call a professional
11) Quick next steps checklist

Problem: ${text}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    })

    const result = completion.choices?.[0]?.message?.content || 'No result'

// Save history
await supabaseServer.from('diagnoses').insert({
  user_id: userId,
  prompt: text,
  result,
})

return NextResponse.json({ result })
  } catch (err: any) {
    console.error('DIAGNOSE_ERROR:', err)
    return NextResponse.json(
      { error: err?.message || String(err) || 'Server error' },
      { status: 500 }
    )
  }
}

import { FileDown } from 'lucide-react'
