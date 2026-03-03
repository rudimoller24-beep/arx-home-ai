'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Admin() {
  const router = useRouter()
  const [stats, setStats] = useState<{ users: number; activeSubscribers: number; diagnoses: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    ;(async () => {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed')
        return
      }
      setStats(data)
    })()
  }, [router])

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/arx-logo.jpg" alt="ARX" width={90} height={40} />
            <div>
              <div className="text-sm text-white/60">ARX Home AI</div>
              <div className="text-xl font-bold">Admin Analytics</div>
            </div>
          </div>
          <a href="/dashboard" className="rounded-xl bg-white/10 border border-white/15 px-4 py-2 hover:bg-white/15">
            ← Dashboard
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {!stats && !error && <div className="text-white/70">Loading…</div>}

        {stats && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-white/60 text-sm">Users</div>
              <div className="text-4xl font-extrabold mt-2">{stats.users}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-white/60 text-sm">Active Subscribers</div>
              <div className="text-4xl font-extrabold mt-2">{stats.activeSubscribers}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-white/60 text-sm">Total Diagnoses</div>
              <div className="text-4xl font-extrabold mt-2">{stats.diagnoses}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}