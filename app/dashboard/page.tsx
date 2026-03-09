'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <Image
              src="/arx-logo.jpg"
              alt="ARX"
              width={95}
              height={42}
              className="rounded-lg"
            />
          </div>

          <div>
            <div className="text-white/60 text-sm">ARX Home AI</div>
            <div className="text-xl font-bold">Dashboard</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-semibold"
        >
          Logout
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="border border-white/10 bg-white/5 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-2">AI Diagnosis Tool</h2>

          <p className="text-white/60 mb-4">
            Describe your home problem and let ARX Home AI diagnose it.
          </p>

          <button
            onClick={() => router.push('/diagnose')}
            className="bg-[#F59E0B] text-black px-4 py-2 rounded-xl font-bold hover:opacity-90"
          >
            Start Diagnosis
          </button>
        </div>

        <div className="border border-white/10 bg-white/5 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-2">Diagnosis History</h2>

          <p className="text-white/60 mb-4">
            Revisit your previous AI diagnoses and past problems.
          </p>

          <button
            onClick={() => router.push('/history')}
            className="bg-[#F59E0B] text-black px-4 py-2 rounded-xl font-bold hover:opacity-90"
          >
            View History
          </button>
        </div>

        <div className="border border-white/10 bg-white/5 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-2">Subscription</h2>

          <p className="text-white/60 mb-4">
            Manage your ARX Home AI subscription.
          </p>

          <button
            onClick={() => router.push('/billing')}
            className="bg-[#F59E0B] text-black px-4 py-2 rounded-xl font-bold hover:opacity-90"
          >
            Manage Subscription
          </button>
        </div>

        <div className="border border-white/10 bg-white/5 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-2">Admin</h2>

          <p className="text-white/60 mb-4">
            View platform stats and ARX Home AI usage.
          </p>

          <button
            onClick={() => router.push('/admin')}
            className="bg-[#F59E0B] text-black px-4 py-2 rounded-xl font-bold hover:opacity-90"
          >
            Open Admin
          </button>
        </div>
      </div>
    </div>
  )
}