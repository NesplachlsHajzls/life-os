'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email,   setEmail]   = useState('')
  const [code,    setCode]    = useState(['', '', '', '', '', ''])
  const [step,    setStep]    = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  // Handle incoming magic links (legacy — fallback)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) window.location.href = '/'
    })
    return () => subscription.unsubscribe()
  }, [])

  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-[14px] px-4 py-3 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--color-primary)] transition-colors'

  // ── Step 1: Send OTP ─────────────────────────────────────────────
  async function handleSendCode() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('code')
    setTimeout(() => inputs.current[0]?.focus(), 100)
  }

  // ── Step 2: Verify OTP ───────────────────────────────────────────
  async function handleVerify() {
    const token = code.join('')
    if (token.length < 6) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    })
    setLoading(false)
    if (error) { setError('Neplatný nebo expirovaný kód. Zkus to znovu.'); return }
    window.location.href = '/'
  }

  // ── OTP digit input handler ──────────────────────────────────────
  function handleDigit(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = digit
    setCode(next)
    if (digit && i < 5) inputs.current[i + 1]?.focus()
    if (next.every(d => d !== '')) {
      // Auto-submit when all 6 digits entered
      setTimeout(() => {
        const token = next.join('')
        if (token.length === 6) handleVerifyToken(token)
      }, 100)
    }
  }

  function handleDigitKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  async function handleVerifyToken(token: string) {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    })
    setLoading(false)
    if (error) { setError('Neplatný nebo expirovaný kód. Zkus to znovu.'); return }
    window.location.href = '/'
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputs.current[5]?.focus()
      setTimeout(() => handleVerifyToken(pasted), 100)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA] p-6">
      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-[56px] mb-3">🌀</div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Life OS</h1>
          <p className="text-[14px] text-gray-400 mt-1">
            {step === 'email' ? 'Přihlaš se pomocí emailu' : 'Zadej kód z emailu'}
          </p>
        </div>

        <div className="bg-white rounded-[20px] shadow-lg p-6 flex flex-col gap-4">

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tvuj@email.cz"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                />
              </div>

              {error && (
                <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-[10px] px-3 py-2">
                  ⚠️ {error}
                </p>
              )}

              <button
                onClick={handleSendCode}
                disabled={loading || !email.trim()}
                className="w-full py-3.5 rounded-[14px] text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                {loading ? 'Odesílám…' : '✉️ Odeslat kód'}
              </button>

              <p className="text-[12px] text-center text-gray-400">
                Na email přijde 6místný kód — bez hesla.
              </p>
            </>
          )}

          {/* ── Step 2: 6-digit code ── */}
          {step === 'code' && (
            <>
              <p className="text-[13px] text-gray-500 text-center">
                Kód byl odeslán na <strong className="text-gray-800">{email}</strong>
              </p>

              {/* 6 digit boxes */}
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleDigitKey(i, e)}
                    className="w-11 h-14 text-center text-[22px] font-bold bg-gray-50 border-2 rounded-[12px] outline-none transition-colors"
                    style={{
                      borderColor: digit ? 'var(--color-primary)' : '#e5e7eb',
                      color: 'var(--color-primary)',
                    }}
                  />
                ))}
              </div>

              {error && (
                <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-[10px] px-3 py-2 text-center">
                  ⚠️ {error}
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || code.some(d => !d)}
                className="w-full py-3.5 rounded-[14px] text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                {loading ? 'Přihlašuji…' : '🔓 Přihlásit se'}
              </button>

              <button
                onClick={() => { setStep('email'); setCode(['','','','','','']); setError('') }}
                className="text-[13px] text-center font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                ← Zpět / jiný email
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
