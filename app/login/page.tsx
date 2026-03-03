'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setMessage('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (res.ok) {
        localStorage.setItem('token', data.token)
        router.push('/dashboard')
      } else {
        setMessage(data.error || 'Login failed')
      }
    } catch {
      setMessage('Server error')
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-2">
            <Image src="/arx-logo.jpg" alt="ARX" width={95} height={42} className="rounded-xl" />
          </div>
          <div>
            <div className="text-white/60 text-sm">ARX Home AI</div>
            <div className="text-xl font-bold">Login</div>
          </div>
        </div>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-3 rounded-xl border border-white/15 bg-black/30 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-3 rounded-xl border border-white/15 bg-black/30 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full rounded-xl bg-[#F59E0B] text-black py-3 font-extrabold hover:opacity-90"
        >
          Login
        </button>

        {message && <p className="mt-3 text-sm text-red-300">{message}</p>}

        <div className="mt-5 text-sm text-white/70">
          Don’t have an account?{' '}
          <a href="/register" className="text-[#F59E0B] font-semibold hover:underline">
            Register
          </a>
        </div>
      </div>
    </div>
  )
}