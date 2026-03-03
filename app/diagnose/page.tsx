'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wrench,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  History,
  Send,
  Search,
  FileDown,
} from 'lucide-react'

type HistoryItem = {
  id: string
  prompt: string
  result: string
  created_at: string
}

export default function DiagnosePage() {
  const router = useRouter()

  // Quote details
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('')
  const [urgency, setUrgency] = useState<'Normal' | 'Urgent'>('Normal')

  // Diagnosis
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // History
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyQuery, setHistoryQuery] = useState('')

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }, [])

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadHistory = async () => {
    const t = localStorage.getItem('token')
    if (!t) return
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/diagnoses', {
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = await res.json()
      if (res.ok) setHistory(data.items || [])
    } finally {
      setHistoryLoading(false)
    }
  }

  const run = async () => {
    setError('')
    setResult('')
    setCopied(false)
    setLoading(true)

    const t = localStorage.getItem('token')
    if (!t) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ text }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token')
          router.push('/login')
          return
        }
        setError(data.error || 'Failed')
        return
      }

      setResult(data.result)
      await loadHistory()
    } catch {
      setError('Server error')
    } finally {
      setLoading(false)
    }
  }

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy')
    }
  }

  const requestQuote = () => {
    if (!result) return

    const number = process.env.NEXT_PUBLIC_ARX_WHATSAPP
    if (!number) {
      alert('Add NEXT_PUBLIC_ARX_WHATSAPP in .env.local (then restart)')
      return
    }

    if (!name.trim() || !phone.trim()) {
      alert('Please add your name + phone number so ARX can contact you.')
      return
    }

    const msg =
      `📩 *ARX QUOTE REQUEST*\n\n` +
      `*Name:* ${name}\n` +
      `*Phone:* ${phone}\n` +
      `*Area:* ${area || '-'}\n` +
      `*Urgency:* ${urgency}\n\n` +
      `*Problem:*\n${text}\n\n` +
      `*AI Diagnosis:*\n${result}\n\n` +
      `Sent from ARX Home AI`

    const url = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const exportPDF = async () => {
    if (!result) return

    const res = await fetch('/api/diagnose/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        area,
        urgency,
        prompt: text,
        result,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'PDF export failed')
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'arx-diagnosis.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredHistory = history.filter((h) => {
    const q = historyQuery.trim().toLowerCase()
    if (!q) return true
    return h.prompt.toLowerCase().includes(q) || h.result.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      {/* Top Bar */}
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/arx-logo.jpg" alt="ARX" width={90} height={40} />
            <div>
              <div className="text-sm text-white/60">ARX Home AI</div>
              <div className="text-xl font-bold">Diagnosis</div>
            </div>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl bg-white/10 border border-white/15 px-4 py-2 hover:bg-white/15"
          >
            ← Dashboard
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-3">
        {/* LEFT: Inputs */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h2 className="text-lg font-bold mb-3">Describe the issue</h2>

          <div className="space-y-2 text-sm text-white/70 mb-4">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-[#F59E0B]" />
              Tools + repair steps
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-[#F59E0B]" />
              Safety warnings
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-[#F59E0B]" />
              When to call a pro
            </div>
          </div>

          {/* Quote details */}
          <div className="grid gap-3 mb-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (WhatsApp)"
              className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
            />
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Area / Suburb (optional)"
              className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setUrgency('Normal')}
                className={`flex-1 rounded-xl border px-3 py-2 font-semibold ${
                  urgency === 'Normal'
                    ? 'bg-[#F59E0B] text-black border-transparent'
                    : 'bg-white/10 border-white/15 hover:bg-white/15'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setUrgency('Urgent')}
                className={`flex-1 rounded-xl border px-3 py-2 font-semibold ${
                  urgency === 'Urgent'
                    ? 'bg-[#F59E0B] text-black border-transparent'
                    : 'bg-white/10 border-white/15 hover:bg-white/15'
                }`}
              >
                Urgent
              </button>
            </div>
          </div>

          <textarea
            className="w-full min-h-[150px] rounded-xl border border-white/15 bg-black/30 p-4 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#F59E0B]/60 outline-none"
            placeholder="Example: Water leaking under sink when tap is on"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-4 space-y-3">
            <button
              onClick={run}
              disabled={loading || text.trim().length < 10}
              className="w-full bg-[#F59E0B] text-black py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Diagnosing...' : 'Diagnose'}
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/40 p-3 rounded-xl text-red-200">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Result + Actions + History */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="font-bold text-lg">Result</div>
              <div className="text-sm text-white/60">Copy • PDF • Request quote</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyResult}
                disabled={!result}
                className="bg-white/10 border border-white/15 px-4 py-2 rounded-xl hover:bg-white/15 disabled:opacity-50"
                title="Copy result"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>

              <button
                onClick={exportPDF}
                disabled={!result}
                className="bg-white/10 border border-white/15 px-4 py-2 rounded-xl hover:bg-white/15 disabled:opacity-50"
                title="Export PDF"
              >
                <FileDown size={18} />
              </button>

              <button
                onClick={requestQuote}
                disabled={!result}
                className="bg-[#F59E0B] text-black px-4 py-2 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                title="Request ARX Quote"
              >
                <Send size={18} />
                Request Quote
              </button>
            </div>
          </div>

          {!result && !loading && (
            <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-white/60">
              Run a diagnosis to see results.
            </div>
          )}

          {loading && (
            <div className="bg-black/20 border border-white/10 p-4 rounded-xl text-white/70">
              Working…
            </div>
          )}

          {result && (
            <pre className="whitespace-pre-wrap bg-black/30 border border-white/10 p-4 rounded-xl text-sm">
              {result}
            </pre>
          )}

          {/* HISTORY */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold">
                <History size={18} className="text-[#F59E0B]" />
                Diagnosis History
              </div>
              <button
                onClick={loadHistory}
                className="text-sm rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 px-3 py-1.5"
              >
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-2 bg-black/20 border border-white/10 px-3 py-2 rounded-xl mb-3">
              <Search size={16} className="text-white/50" />
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search history..."
                className="bg-transparent w-full outline-none text-sm text-white placeholder:text-white/40"
              />
            </div>

            {historyLoading && <div className="text-sm text-white/60">Loading…</div>}

            <div className="space-y-3">
              {filteredHistory.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setText(h.prompt)
                    setResult(h.result)
                    setError('')
                    setCopied(false)
                  }}
                  className="w-full text-left bg-black/20 border border-white/10 p-3 rounded-xl hover:bg-black/30"
                >
                  <div className="text-xs text-white/50">
                    {new Date(h.created_at).toLocaleString()}
                  </div>
                  <div className="font-semibold">{h.prompt}</div>
                </button>
              ))}

              {!historyLoading && filteredHistory.length === 0 && (
                <div className="text-sm text-white/60">No matches.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-10 text-xs text-white/45">
        Safety first. If gas/electrical/structural risk is suspected, call a professional.
      </div>
    </div>
  )
}