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

type Lead = {
  id: string
  name: string
  phone: string
  area: string
  urgency: string
  problem: string
  diagnosis: string
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/login')
      return
    }

    const loadAdmin = async () => {
      try {
        const [statsRes, leadsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/leads'),
        ])

        const statsData = await statsRes.json()
        const leadsData = await leadsRes.json()

        if (!statsRes.ok) {
          setError(statsData.error || 'Could not load admin stats')
          return
        }

        if (!leadsRes.ok) {
          setError(leadsData.error || 'Could not load leads')
          return
        }

        setStats(statsData)
        setLeads(leadsData.leads || [])
      } catch {
        setError('Server error')
      } finally {
        setLoading(false)
      }
    }

    loadAdmin()
  }, [router])

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

      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Loading admin data...
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
              <h2 className="text-2xl font-bold mb-4">Latest Leads</h2>

              {leads.length === 0 ? (
                <div className="text-white/60">No leads yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-white/50 border-b border-white/10">
                        <th className="py-3 pr-4">Date</th>
                        <th className="py-3 pr-4">Name</th>
                        <th className="py-3 pr-4">Phone</th>
                        <th className="py-3 pr-4">Area</th>
                        <th className="py-3 pr-4">Urgency</th>
                        <th className="py-3 pr-4">Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-b border-white/5 align-top"
                        >
                          <td className="py-3 pr-4 whitespace-nowrap text-white/60">
                            {new Date(lead.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 pr-4">{lead.name || '-'}</td>
                          <td className="py-3 pr-4">{lead.phone || '-'}</td>
                          <td className="py-3 pr-4">{lead.area || '-'}</td>
                          <td className="py-3 pr-4">{lead.urgency || '-'}</td>
                          <td className="py-3 pr-4 max-w-[340px]">
                            <div className="line-clamp-3">{lead.problem || '-'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}