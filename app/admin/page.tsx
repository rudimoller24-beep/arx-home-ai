'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Stats = {
  users: number
  diagnoses: number
  paidSubscribers: number
  leads: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/login')
      return
    }

    const loadStats = async () => {
      try {
        const res = await fetch('/api/admin/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Could not load admin stats')
          return
        }

        setStats(data)
      } catch {
        setError('Server error')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [router])

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-gradient-to-r from-[#1b1307] via-[#0b0f14] to-[#101826]">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
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
              <div className="text-3xl font-bold">Admin Analytics</div>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold hover:bg-white/10"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Loading admin stats...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && stats && (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="text-white/60 text-sm mb-2">Total Users</div>
                <div className="text-4xl font-extrabold text-[#F59E0B]">
                  {stats.users}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="text-white/60 text-sm mb-2">Total Diagnoses</div>
                <div className="text-4xl font-extrabold text-[#F59E0B]">
                  {stats.diagnoses}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="text-white/60 text-sm mb-2">Paid Subscribers</div>
                <div className="text-4xl font-extrabold text-[#F59E0B]">
                  {stats.paidSubscribers}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="text-white/60 text-sm mb-2">Quote Leads</div>
                <div className="text-4xl font-extrabold text-[#F59E0B]">
                  {stats.leads}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold mb-3">Business Snapshot</h2>
              <div className="text-white/70 space-y-2">
                <p>• Users registered: {stats.users}</p>
                <p>• Diagnoses generated: {stats.diagnoses}</p>
                <p>• Paid conversions: {stats.paidSubscribers}</p>
                <p>• Quote leads captured: {stats.leads}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}