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

        if (meRes.ok) {
          setMe(meData)
        }

        if (checkRes.ok) {
          setRemaining(checkData.remaining)
        }
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
      <div className="border-b border-white/10 bg-gradient-to-r from-[#1b1307] via-[#0b0f14] to-[#101826]">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2">
              <Image
                src="/arx-logo.jpg"
                alt="ARX"
                width={105}
                height={50}
                className="rounded-xl"
              />
            </div>

            <div>
              <div className="text-white/60 text-sm">ARX Home AI</div>
              <div className="text-3xl font-bold">Dashboard</div>
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
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-white/60 text-sm mb-2">Welcome back</div>
                <h1 className="text-3xl font-extrabold mb-2">
                  {loading ? 'Loading...' : 'ARX Home AI'}
                </h1>
                <p className="text-white/70">
                  Diagnose home issues, keep job history, and request ARX quotes faster.
                </p>
              </div>

              <div className="rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-4 py-2 text-sm font-semibold text-[#F59E0B]">
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

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-white/50 text-sm">Diagnoses left</div>
                <div className="mt-2 text-2xl font-extrabold text-[#F59E0B]">
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

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="text-white/60 text-sm mb-2">Quick action</div>
            <h2 className="text-2xl font-bold mb-3">Start a new diagnosis</h2>
            <p className="text-white/70 mb-5">
              Get practical repair guidance, risk level, tools, and cost range.
            </p>

            <button
              onClick={() => router.push('/diagnose')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-5 py-3 font-extrabold text-black hover:opacity-90"
            >
              Diagnose Now
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={() => router.push('/diagnose')}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-xl transition hover:bg-white/10"
          >
            <div className="mb-4 inline-flex rounded-xl bg-[#F59E0B]/10 p-3 text-[#F59E0B]">
              <Wrench size={22} />
            </div>
            <div className="text-xl font-bold mb-2">AI Diagnosis</div>
            <div className="text-white/65">
              Describe a problem and upload a photo for a smarter diagnosis.
            </div>
          </button>

          <button
            onClick={() => router.push('/history')}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-xl transition hover:bg-white/10"
          >
            <div className="mb-4 inline-flex rounded-xl bg-[#F59E0B]/10 p-3 text-[#F59E0B]">
              <History size={22} />
            </div>
            <div className="text-xl font-bold mb-2">Diagnosis History</div>
            <div className="text-white/65">
              Revisit previous diagnoses and old customer jobs.
            </div>
          </button>

          <button
            onClick={() => router.push('/billing')}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-xl transition hover:bg-white/10"
          >
            <div className="mb-4 inline-flex rounded-xl bg-[#F59E0B]/10 p-3 text-[#F59E0B]">
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
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-xl transition hover:bg-white/10"
            >
              <div className="mb-4 inline-flex rounded-xl bg-[#F59E0B]/10 p-3 text-[#F59E0B]">
                <LayoutDashboard size={22} />
              </div>
              <div className="text-xl font-bold mb-2">Admin Panel</div>
              <div className="text-white/65">
                View users, diagnoses, subscriptions, and incoming quote leads.
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="text-white/60 text-sm mb-2">Need more?</div>
              <div className="text-xl font-bold mb-2">Upgrade for unlimited use</div>
              <div className="text-white/65 mb-4">
                Great for contractors, handymen, and service teams doing regular jobs.
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