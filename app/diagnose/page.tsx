'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DiagnosePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('')
  const [urgency, setUrgency] = useState('Medium')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState<string | number>('...')
  const [copied, setCopied] = useState(false)
  const [quoteSent, setQuoteSent] = useState(false)

  const [imageBase64, setImageBase64] = useState('')
  const [imageMimeType, setImageMimeType] = useState('')
  const [imagePreview, setImagePreview] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const loadLimit = async () => {
      try {
        const res = await fetch('/api/diagnose/check', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await res.json()

        if (res.ok) {
          setRemaining(data.remaining)
        }
      } catch {
        setRemaining('...')
      }
    }

    loadLimit()
  }, [router])

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || ''
      setImageBase64(base64)
      setImageMimeType(file.type)
      setImagePreview(result)
    }

    reader.readAsDataURL(file)
  }

  const runDiagnosis = async () => {
    setError('')
    setResult('')
    setQuoteSent(false)
    setLoading(true)

    try {
      const token = localStorage.getItem('token')

      if (!token) {
        router.push('/login')
        return
      }

      const checkRes = await fetch('/api/diagnose/check', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const checkData = await checkRes.json()

      if (!checkRes.ok) {
        setError(checkData.error || 'Could not check usage')
        setLoading(false)
        return
      }

      if (!checkData.allowed) {
        setError('You have reached your 3 free diagnoses. Please upgrade to continue.')
        setRemaining(0)
        setLoading(false)
        return
      }

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone,
          area,
          urgency,
          prompt,
          imageBase64,
          imageMimeType,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Diagnosis failed')
        setLoading(false)
        return
      }

      setResult(data.result)

      const refreshRes = await fetch('/api/diagnose/check', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const refreshData = await refreshRes.json()
      if (refreshRes.ok) {
        setRemaining(refreshData.remaining)
      }
    } catch {
      setError('Server error')
    } finally {
      setLoading(false)
    }
  }

  const requestQuote = async () => {
    try {
      setError('')
      const token = localStorage.getItem('token')

      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone,
          area,
          urgency,
          problem: prompt,
          diagnosis: result,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Could not send quote request')
        return
      }

      setQuoteSent(true)
    } catch {
      setError('Could not send quote request')
    }
  }

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy result')
    }
  }

  const exportPdf = async () => {
    try {
      const res = await fetch('/api/diagnose/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phone, area, urgency, prompt, result }),
      })

      if (!res.ok) {
        setError('Could not generate PDF')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'arx-diagnosis.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('PDF export failed')
    }
  }

  const whatsappText = encodeURIComponent(
    `ARX Home AI Diagnosis\n\nProblem:\n${prompt}\n\nDiagnosis:\n${result}`
  )

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
              <div className="text-3xl font-bold">Diagnose a Problem</div>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-semibold hover:bg-white/10"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          Remaining diagnoses:{' '}
          <span className="font-bold text-[#F59E0B]">{remaining}</span>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {quoteSent && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            Quote request sent to ARX successfully.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <h2 className="mb-2 text-2xl font-bold">Tell us what’s wrong</h2>
            <p className="mb-5 text-white/60">
              Describe the issue and optionally upload a photo for AI image diagnosis.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Your name"
                className="rounded-xl border border-white/15 bg-black/30 p-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="text"
                placeholder="Phone number"
                className="rounded-xl border border-white/15 bg-black/30 p-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                type="text"
                placeholder="Area / suburb"
                className="rounded-xl border border-white/15 bg-black/30 p-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60 sm:col-span-2"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />

              <select
                className="rounded-xl border border-white/15 bg-black/30 p-3 text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60 sm:col-span-2"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="Low">Low urgency</option>
                <option value="Medium">Medium urgency</option>
                <option value="High">High urgency</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            <textarea
              placeholder="Example: My ceiling has a damp patch that is growing near the bathroom and paint is peeling."
              className="mt-4 min-h-[180px] w-full rounded-xl border border-white/15 bg-black/30 p-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="mt-4">
              <label className="mb-2 block text-sm text-white/60">
                Upload a photo of the problem (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
                className="block w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-[#F59E0B] file:px-4 file:py-2 file:font-bold file:text-black"
              />

              {imagePreview && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                  <Image
                    src={imagePreview}
                    alt="Problem preview"
                    width={600}
                    height={400}
                    className="h-auto w-full rounded-xl object-cover"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={runDiagnosis}
                disabled={loading}
                className="rounded-xl bg-[#F59E0B] px-5 py-3 font-extrabold text-black hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Diagnosing…' : 'Run Diagnosis'}
              </button>

              <button
                onClick={() => {
                  setName('')
                  setPhone('')
                  setArea('')
                  setUrgency('Medium')
                  setPrompt('')
                  setResult('')
                  setError('')
                  setImageBase64('')
                  setImageMimeType('')
                  setImagePreview('')
                  setQuoteSent(false)
                }}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <h2 className="mb-2 text-2xl font-bold">Diagnosis Result</h2>
            <p className="mb-5 text-white/60">
              Your AI-generated ARX diagnosis will appear here.
            </p>

            <div className="min-h-[300px] rounded-xl border border-white/10 bg-black/20 p-4 whitespace-pre-wrap text-white/90">
              {result || 'No diagnosis yet.'}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={copyResult}
                disabled={!result}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10 disabled:opacity-40"
              >
                {copied ? 'Copied!' : 'Copy Result'}
              </button>

              <button
                onClick={exportPdf}
                disabled={!result}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10 disabled:opacity-40"
              >
                Export PDF
              </button>

              <button
                onClick={requestQuote}
                disabled={!result}
                className="rounded-xl bg-[#F59E0B] px-4 py-3 font-bold text-black hover:opacity-90 disabled:opacity-40"
              >
                Request ARX Quote
              </button>

              <a
                href={result ? `https://wa.me/?text=${whatsappText}` : '#'}
                target="_blank"
                rel="noreferrer"
                className={`rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10 ${
                  !result ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                WhatsApp to ARX
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}