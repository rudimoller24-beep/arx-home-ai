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

  const [images, setImages] = useState<string[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

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
        } else {
          setError(data.error || 'Could not load usage')
        }
      } catch {
        setRemaining('...')
      }
    }

    loadLimit()
  }, [router])

  const handleImageUpload = (files: FileList) => {
    const selectedFiles = Array.from(files).slice(0, 5 - images.length)

    selectedFiles.forEach((file) => {
      const reader = new FileReader()

      reader.onloadend = () => {
        const dataUrl = reader.result as string

        setImages((prev) => {
          if (prev.length >= 5) return prev
          return [...prev, dataUrl]
        })

        setImagePreviews((prev) => {
          if (prev.length >= 5) return prev
          return [...prev, dataUrl]
        })
      }

      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
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
          images,
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
      a.download = 'diagnosis-report.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('PDF export failed')
    }
  }

  const whatsappText = encodeURIComponent(
    `Diagnosis Report\n\nProblem:\n${prompt}\n\nDiagnosis:\n${result}`
  )

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_26%),linear-gradient(to_right,#1b1307,#0b0f14,#101826)]">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-[#F59E0B]/25 bg-white/5 p-2 shadow-[0_0_30px_rgba(245,158,11,0.10)]">
              <Image
                src="/arx-logo.jpg"
                alt="Logo"
                width={105}
                height={50}
                className="rounded-xl"
              />
            </div>
            <div>
              <div className="text-[#F59E0B] text-sm font-semibold">BuildMind</div>
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
        <div className="mb-6 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/8 p-4 text-sm text-white/85">
          Remaining diagnoses:{' '}
          <span className="font-extrabold text-[#F59E0B]">{remaining}</span>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {quoteSent && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            Quote request sent successfully.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/7 to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-5">
              <div className="text-[#F59E0B] text-sm font-semibold mb-2">
                Smart issue intake
              </div>
              <h2 className="text-2xl font-bold">Tell us what’s wrong</h2>
              <p className="mt-2 text-white/65">
                Describe the issue and upload up to 5 photos for better diagnosis.
              </p>
            </div>

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
              placeholder="Example: Client has a leaking roof above the bedroom and water marks are spreading on the ceiling."
              className="mt-4 min-h-[190px] w-full rounded-xl border border-white/15 bg-black/30 p-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="mt-4 rounded-2xl border border-[#F59E0B]/15 bg-[#F59E0B]/5 p-4">
              <label className="mb-2 block text-sm font-semibold text-[#F59E0B]">
                Upload up to 5 photos
              </label>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files
                  if (files) handleImageUpload(files)
                }}
                className="block w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-[#F59E0B] file:px-4 file:py-2 file:font-bold file:text-black"
              />

              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-white/10 bg-black/20 p-2"
                    >
                      <Image
                        src={preview}
                        alt={`Problem preview ${index + 1}`}
                        width={300}
                        height={220}
                        className="h-32 w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="mt-2 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={runDiagnosis}
                disabled={loading}
                className="rounded-xl bg-[#F59E0B] px-5 py-3 font-extrabold text-black hover:opacity-90 shadow-[0_10px_30px_rgba(245,158,11,0.25)] disabled:opacity-50"
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
                  setImages([])
                  setImagePreviews([])
                  setQuoteSent(false)
                }}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/7 to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-5">
              <div className="text-[#F59E0B] text-sm font-semibold mb-2">
                Diagnosis result
              </div>
              <h2 className="text-2xl font-bold">Professional Output</h2>
              <p className="mt-2 text-white/65">
                Your diagnosis report will appear here.
              </p>
            </div>

            <div className="min-h-[320px] rounded-2xl border border-white/10 bg-black/20 p-5 whitespace-pre-wrap text-white/90">
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
                Request Quote
              </button>

              <a
                href={result ? `https://wa.me/?text=${whatsappText}` : '#'}
                target="_blank"
                rel="noreferrer"
                className={`rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10 ${
                  !result ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                Share on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}