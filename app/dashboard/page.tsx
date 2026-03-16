'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type MeResponse =
  | {
      id?: string
      email?: string
      role?: string
      subscription_status?: string
      trial_end?: string | null
      user?: {
        id?: string
        email?: string
        role?: string
        subscription_status?: string
        trial_end?: string | null
      }
    }
  | null

type DiagnoseCheckResponse = {
  allowed?: boolean
  remaining?: number | string
  error?: string
} | null

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial')
  const [trialEnd, setTrialEnd] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<string | number>('...')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/login')
      return
    }

    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError('')

        const [meRes, checkRes] = await Promise.all([
          fetch('/api/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('/api/diagnose/check', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ])

        const meData: MeResponse = await meRes.json().catch(() => null)
        const checkData: DiagnoseCheckResponse = await checkRes.json().catch(() => null)

        if (meRes.status === 401) {
          localStorage.clear()
          router.push('/login')
          return
        }

        if (!meRes.ok) {
          setError(
            (meData as any)?.error || 'Could not load your profile information.'
          )
        } else {
          const resolvedUser = meData?.user ?? meData ?? {}
          setEmail(resolvedUser.email || '')
          setRole((resolvedUser.role || 'user').toLowerCase())
          setSubscriptionStatus(resolvedUser.subscription_status || 'trial')
          setTrialEnd(resolvedUser.trial_end || null)
        }

        if (checkRes.ok) {
          setRemaining(checkData?.remaining ?? '...')
        } else if (checkRes.status === 401) {
          localStorage.clear()
          router.push('/login')
          return
        } else {
          setRemaining('...')
        }
      } catch {
        setError('Could not load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  const accessLabel = useMemo(() => {
    if (role === 'admin') return 'Administrator'
    return 'Customer'
  }, [role])

  const planLabel = useMemo(() => {
    if (subscriptionStatus === 'active') return 'Active Plan'
    return 'Trial Plan'
  }, [subscriptionStatus])

  const trialEndLabel = useMemo(() => {
    if (!trialEnd) return '7-day starter access'
    const date = new Date(trialEnd)
    if (Number.isNaN(date.getTime())) return '7-day starter access'
    return `Trial ends ${date.toLocaleDateString()}`
  }, [trialEnd])

  const handleLogout = () => {
    localStorage.clear()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_24%),linear-gradient(to_right,#1b1307,#0b0f14,#101826)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-[#F59E0B]/25 bg-white/5 p-2 shadow-[0_0_35px_rgba(245,158,11,0.12)]">
              <Image
                src="/arx-logo.jpg"
                alt="ARX"
                width={110}
                height={56}
                className="rounded-xl"
              />
            </div>

            <div>
              <div className="text-sm font-semibold text-[#F59E0B]">ARX Home AI</div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Dashboard
              </h1>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-base font-bold text-white transition hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mb-8 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/8 to-white/[0.03] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-2 text-sm font-semibold text-[#F59E0B]">
                Smart contractor assistant
              </div>

              <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                Welcome back
              </h2>

              <p className="mt-4 max-w-3xl text-lg text-white/72">
                Diagnose home issues, keep job history, request ARX quotes, and
                manage your work faster with a cleaner, more professional workflow.
              </p>
            </div>

            <div className="rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-5 py-3 text-base font-bold text-[#F59E0B]">
              {planLabel}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="mb-2 text-white/60">Logged in as</div>
              <div className="text-2xl font-bold">
                {loading ? 'Loading...' : email || 'Unknown user'}
              </div>
              <div className="mt-2 text-sm text-white/45">
                {trialEndLabel}
              </div>
            </div>

            <div className="rounded-3xl border border-[#F59E0B]/20 bg-[#F59E0B]/8 p-5">
              <div className="mb-2 text-white/70">Diagnoses left</div>
              <div className="text-2xl font-extrabold text-[#F59E0B]">
                {loading ? '...' : remaining}
              </div>
              <div className="mt-2 text-sm text-white/50">
                Free users can run up to 3 diagnoses.
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="mb-2 text-white/60">Access level</div>
              <div className="text-2xl font-bold">{accessLabel}</div>
              <div className="mt-2 text-sm text-white/45">
                Admin tools stay hidden unless your role is admin.
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Link
            href="/diagnose"
            className="group rounded-[28px] border border-white/10 bg-gradient-to-br from-[#1a1408] via-[#11161f] to-[#0d131c] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:border-[#F59E0B]/30"
          >
            <div className="mb-3 text-sm font-semibold text-[#F59E0B]">
              Quick action
            </div>
            <h3 className="text-3xl font-extrabold">Start a new diagnosis</h3>
            <p className="mt-3 text-white/65">
              Upload an issue, explain what’s wrong, and get a practical ARX result.
            </p>
            <div className="mt-6 inline-flex rounded-xl bg-[#F59E0B] px-4 py-3 font-bold text-black transition group-hover:opacity-90">
              Open Diagnose
            </div>
          </Link>

          <Link
            href="/diagnose"
            className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/7 to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:bg-white/[0.06]"
          >
            <div className="mb-3 text-sm font-semibold text-[#F59E0B]">
              Productivity
            </div>
            <h3 className="text-2xl font-bold">Run jobs faster</h3>
            <p className="mt-3 text-white/65">
              Keep your issue capture structured with urgency, area, photos, and
              AI-guided next steps.
            </p>
            <div className="mt-6 text-sm font-semibold text-white/75">
              Better intake. Better quotes. Better follow-up.
            </div>
          </Link>

          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/7 to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-3 text-sm font-semibold text-[#F59E0B]">
              Account status
            </div>
            <h3 className="text-2xl font-bold">
              {subscriptionStatus === 'active' ? 'Subscription active' : 'Trial access'}
            </h3>
            <p className="mt-3 text-white/65">
              {subscriptionStatus === 'active'
                ? 'Your account is active and ready for unlimited diagnoses.'
                : 'You are currently using the starter plan while you test the ARX workflow.'}
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              {trialEndLabel}
            </div>
          </div>
        </div>

        {role === 'admin' && (
          <div className="mt-8 rounded-[28px] border border-[#F59E0B]/25 bg-gradient-to-r from-[#2b1a06]/70 via-[#17120b]/80 to-[#101826]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#F59E0B]">
              Admin controls
            </div>
            <h3 className="text-3xl font-extrabold">Management tools</h3>
            <p className="mt-3 max-w-3xl text-white/70">
              Because your role is admin, you can access ARX management screens and
              deeper business controls from here.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="rounded-xl bg-[#F59E0B] px-5 py-3 font-extrabold text-black hover:opacity-90"
              >
                Open Admin Panel
              </Link>

              <Link
                href="/diagnose"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10"
              >
                Test User Flow
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/7 to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-3 text-sm font-semibold text-[#F59E0B]">
              Why this helps
            </div>
            <h3 className="text-2xl font-bold">Built for contractor workflow</h3>
            <ul className="mt-4 space-y-3 text-white/70">
              <li>Clear issue intake before you waste time on site.</li>
              <li>Professional AI summaries you can use for planning.</li>
              <li>Faster quote requests and cleaner customer communication.</li>
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/7 to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-3 text-sm font-semibold text-[#F59E0B]">
              ARX branding
            </div>
            <h3 className="text-2xl font-bold">Cleaner premium feel</h3>
            <p className="mt-4 text-white/70">
              This layout uses stronger contrast, more depth, ARX orange highlights,
              cleaner card spacing, and clearer action sections so the platform feels
              more premium and easier to use.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}