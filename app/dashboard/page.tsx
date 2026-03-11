'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Wrench,
  History,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

type MeResponse = {
  id: string
  email: string
  trial_end: string | null
  subscription_status: string
  role?: string
}

export default function Dashboard() {
  const router = useRouter()

  const [me, setMe] = useState<MeResponse | null>(null)
  const [remaining, setRemaining] = useState<string | number>('...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/login')
      return
    }

    const loadDashboard = async () => {
      try {
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

        const meData = await meRes.json()
        const checkData = await checkRes.json()

        if (meRes.ok) setMe(meData)
        if (checkRes.ok) setRemaining(checkData.remaining)
      } catch {
        localStorage.removeItem('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const isAdmin = me?.role === 'admin'
  const isPaid = me?.subscription_status === 'active'

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_26%),linear-gradient(to_right,#1b1307,#0b0f14,#101826)]">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-[#F59E0B]/25 bg-white/5 p-2 shadow-[0_0_30px_rgba(245,158,11,0.10)]">
              <Image
                src="/arx-logo.jpg"
                alt="ARX"
                width={110}
                height={54}
                className="rounded-xl"
              />
            </div>

            <div>
              <div className="text-[#F59E0B] text-sm font-semibold tracking-wide">
                ARX Home AI
              </div>
              <div className="text-3xl font-extrabold">Dashboard</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold hover:bg-white/10"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-white/7 to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-3 py-1 text-sm text-[#F59E0B]">
                  <Sparkles size={14} />
                  Smart contractor assistant
                </div>

                <h1 className="mt-4 text-3xl font-extrabold">
                  {loading ? 'Loading...' : 'Welcome back'}
                </h1>

                <p className="mt-3 max-w-2xl text-white/70">
                  Diagnose home issues, keep job history, request ARX quotes, and manage your work faster with a cleaner, more professional workflow.
                </p>
              </div>

              <div className="rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-4 py-2 text-sm font-bold text-[#F59E0B]">
                {isPaid ? 'Paid Plan' : 'Trial Plan'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-white/50 text-sm">Logged in as</div>
                <div className="mt-2 font-semibold break-all">
                  {me?.email || 'Loading...'}
                </div>
              </div>

              <div className="rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/8 p-4">
                <div className="text-white/60 text-sm">Diagnoses left</div>
                <div className="mt-2 text-3xl font-extrabold text-[#F59E0B]">
                  {remaining}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-white/50 text-sm">Access level</div>
                <div className="mt-2 font-semibold">
                  {isAdmin ? 'Admin' : 'Customer'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#F59E0B]/15 bg-gradient-to-br from-[#F59E0B]/10 via-white/5 to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="text-[#F59E0B] text-sm font-semibold mb-2">
              Quick action
            </div>
            <h2 className="text-2xl font-bold mb-3">Start a new diagnosis</h2>
            <p className="text-white/70 mb-5">
              Get practical repair guidance, risk level, tools, cost range, and contractor advice.
            </p>

            <button
              onClick={() => router.push('/diagnose')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-5 py-3 font-extrabold text-black hover:opacity-90 shadow-[0_10px_30px_rgba(245,158,11,0.25)]"
            >
              Diagnose Now
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={() => router.push('/diagnose')}
            className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl transition hover:border-[#F59E0B]/25 hover:bg-white/[0.07]"
          >
            <div className="mb-4 inline-flex rounded-2xl bg-[#F59E0B]/12 p-3 text-[#F59E0B] group-hover:scale-105 transition">
              <Wrench size={22} />
            </div>
            <div className="text-xl font-bold mb-2">AI Diagnosis</div>
            <div className="text-white/65">
              Describe the issue and upload a photo for smarter diagnosis.
            </div>
          </button>

          <button
            onClick={() => router.push('/history')}
            className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl transition hover:border-[#F59E0B]/25 hover:bg-white/[0.07]"
          >
            <div className="mb-4 inline-flex rounded-2xl bg-[#F59E0B]/12 p-3 text-[#F59E0B] group-hover:scale-105 transition">
              <History size={22} />
            </div>
            <div className="text-xl font-bold mb-2">Diagnosis History</div>
            <div className="text-white/65">
              Revisit previous diagnoses and older customer jobs.
            </div>
          </button>

          <button
            onClick={() => router.push('/billing')}
            className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl transition hover:border-[#F59E0B]/25 hover:bg-white/[0.07]"
          >
            <div className="mb-4 inline-flex rounded-2xl bg-[#F59E0B]/12 p-3 text-[#F59E0B] group-hover:scale-105 transition">
              <ShieldCheck size={22} />
            </div>
            <div className="text-xl font-bold mb-2">Subscription</div>
            <div className="text-white/65">
              Manage your plan and unlock unlimited diagnoses.
            </div>
          </button>

          {isAdmin ? (
            <button
              onClick={() => router.push('/admin')}
              className="group rounded-3xl border border-[#F59E0B]/20 bg-gradient-to-br from-[#F59E0B]/10 to-white/[0.03] p-6 text-left shadow-xl transition hover:border-[#F59E0B]/35"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-[#F59E0B]/15 p-3 text-[#F59E0B] group-hover:scale-105 transition">
                <LayoutDashboard size={22} />
              </div>
              <div className="text-xl font-bold mb-2">Admin Panel</div>
              <div className="text-white/65">
                View users, diagnoses, subscriptions, and quote leads.
              </div>
            </button>
          ) : (
            <div className="rounded-3xl border border-[#F59E0B]/20 bg-gradient-to-br from-[#F59E0B]/10 to-white/[0.03] p-6 shadow-xl">
              <div className="text-[#F59E0B] text-sm font-semibold mb-2">
                Pro upgrade
              </div>
              <div className="text-xl font-bold mb-2">Stand out and move faster</div>
              <div className="text-white/65 mb-4">
                Perfect for contractors, handymen, and service teams handling regular jobs.
              </div>
              <button
                onClick={() => router.push('/billing')}
                className="rounded-xl bg-[#F59E0B] px-4 py-3 font-bold text-black hover:opacity-90"
              >
                Upgrade Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}