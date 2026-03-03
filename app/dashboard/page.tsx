'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import LogoutButton from '../components/LogoutButton'

type MeResponse = {
  userId: string
  email: string
  trial_end: string
  subscription_status: string
}

export default function Dashboard() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    ;(async () => {
     const res = await fetch('/api/me', {
  headers: { Authorization: `Bearer ${token}` },
})
const data = await res.json()

if (!res.ok) {
  // If token is bad/expired → clean up and force login
  if (res.status === 401 || String(data.error || '').toLowerCase().includes('token')) {
    localStorage.removeItem('token')
    router.push('/login')
    return
  }

  setError(data.error || 'Failed to load account')
  return
}

setMe(data)
    })()
  }, [router])

  const trialDaysLeft = useMemo(() => {
    if (!me?.trial_end) return null
    const end = new Date(me.trial_end).getTime()
    const now = Date.now()
    const diff = end - now
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [me?.trial_end])

  const isActive = me?.subscription_status === 'active'
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0

  const upgrade = async () => {
    if (!me) return
    const out = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: me.email, userId: me.userId }),
    })
    const data = await out.json()
    if (data.url) window.location.href = data.url
    else alert(data.error || 'Checkout failed')
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      {/* Header */}
      <div className="relative border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_50%),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2">
              <Image
                src="/arx-logo.jpg"
                alt="ARX"
                width={110}
                height={48}
                className="rounded-xl"
                priority
              />
            </div>
            <div>
              <div className="text-white/60 text-sm">ARX Home AI</div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Dashboard
              </h1>
            </div>
          </div>

          <LogoutButton />
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Account card */}
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <div className="text-white/60 text-sm mb-1">Logged in as</div>
            <div className="text-lg font-semibold break-all">{me?.email || 'Loading...'}</div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isActive ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-200 border border-emerald-500/30">
                  PRO Active ✅
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[#F59E0B]/15 px-3 py-1 text-sm text-[#FFD18A] border border-[#F59E0B]/30">
                  Trial • {trialDaysLeft ?? '-'} day(s) left
                </span>
              )}
              {!isActive && trialExpired && (
                <span className="inline-flex items-center rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-200 border border-red-500/30">
                  Trial Ended
                </span>
              )}
            </div>

            {!isActive && (
              <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  onClick={upgrade}
                  className="rounded-xl bg-[#F59E0B] text-black px-5 py-2.5 font-bold shadow-lg hover:opacity-90"
                >
                  Upgrade to R79/month
                </button>
                <div className="text-xs text-white/55">
                  7-day trial • cancel anytime
                </div>
              </div>
            )}
          </div>

          {/* Status card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <div className="text-white/60 text-sm mb-2">Access</div>
            <div className="text-3xl font-extrabold">{isActive ? 'PRO' : 'TRIAL'}</div>
            <p className="mt-3 text-sm text-white/70">
              {isActive
                ? 'Unlimited diagnoses and full access.'
                : trialExpired
                  ? 'Upgrade required to continue.'
                  : 'Unlimited diagnoses during trial.'}
            </p>
          </div>
        </div>

        {/* Action card */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Start a Diagnosis</h2>
              <p className="text-sm text-white/70 mt-1">
                Get causes, risks, tools, steps, and cost ranges in ZAR.
              </p>
            </div>

            <a
              href="/diagnose"
              className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-bold ${
                trialExpired && !isActive
                  ? 'bg-white/10 text-white/40 pointer-events-none'
                  : 'bg-white text-black hover:opacity-90'
              }`}
            >
              Diagnose →
            </a>
          </div>

          {!isActive && trialExpired && (
            <div className="mt-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4 text-[#FFD18A]">
              Your free trial ended — upgrade to keep diagnosing.
            </div>
          )}
        </div>

        <div className="mt-8 text-xs text-white/45">
          ARX Home AI • Renovations • Maintenance • Construction • Steel
        </div>
      </div>
    </div>
  )
}