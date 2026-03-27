'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [method,  setMethod]  = useState<'google' | 'email'>('google')
  const [email,   setEmail]   = useState('')
  const [code,    setCode]    = useState(['', '', '', '', '', ''])
  const [step,    setStep]    = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.location.href = '/'
    })
    return () => subscription.unsubscribe()
  }, [])

  const inputCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[14px] px-4 py-3 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--color-primary)] transition-colors'

  // ── Google OAuth ─────────────────────────────────────────────────
  async function handleGoogle() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  // ── OTP email ────────────────────────────────────────────────────
  async function handleSendCode() {
    if (!email.trim()) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('code')
    setTimeout(() => inputs.current[0]?.focus(), 100)
  }

  async function handleVerifyToken(token: string) {
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    setLoading(false)
    if (error) { setError('Neplatný nebo expirovaný kód. Zkus to znovu.'); return }
    window.location.href = '/'
  }

  function handleDigit(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]; next[i] = digit; setCode(next)
    if (digit && i < 5) inputs.current[i + 1]?.focus()
    if (next.every(d => d !== '')) setTimeout(() => handleVerifyToken(next.join('')), 100)
  }

  function handleDigitKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus()
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

        <div className="text-center mb-8">
          <div className="text-[56px] mb-3">🌀</div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Life OS</h1>
          <p className="text-[14px] text-gray-400 mt-1">Přihlaš se pro pokračování</p>
        </div>

        <div className="bg-[var(--surface)] rounded-[20px] shadow-lg p-6 flex flex-col gap-4">

          {/* ── Google button (primary) ── */}
          {method === 'google' && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-[14px] border-2 border-[var(--border)] bg-[var(--surface)] text-[15px] font-bold text-gray-700 hover:bg-[var(--bg)] transition-colors disabled:opacity-40"
              >
                {/* Google logo SVG */}
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.1-6.1C34.46 3.19 29.52 1 24 1 14.82 1 7.07 6.48 3.64 14.19l7.11 5.52C12.4 13.64 17.73 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v8.97h12.43c-.54 2.9-2.17 5.36-4.63 7.02l7.11 5.52C42.99 37.53 46.1 31.46 46.1 24.55z"/>
                  <path fill="#FBBC05" d="M10.75 28.29A14.52 14.52 0 0 1 9.5 24c0-1.49.26-2.93.72-4.29l-7.11-5.52A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.56 10.74l8.19-6.45z"/>
                  <path fill="#34A853" d="M24 47c5.52 0 10.15-1.83 13.53-4.96l-7.11-5.52C28.71 37.84 26.47 38.5 24 38.5c-6.27 0-11.6-4.14-13.51-9.77l-7.11 5.52C7.07 41.52 14.82 47 24 47z"/>
                </svg>
                {loading ? 'Přihlašuji…' : 'Přihlásit se přes Google'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--surface-raised)]" />
                <span className="text-[12px] text-gray-400">nebo</span>
                <div className="flex-1 h-px bg-[var(--surface-raised)]" />
              </div>

              <button
                onClick={() => setMethod('email')}
                className="w-full py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-gray-500 hover:bg-[var(--bg)] transition-colors"
              >
                ✉️ Přihlásit se emailem
              </button>
            </>
          )}

          {/* ── Email OTP ── */}
          {method === 'email' && step === 'email' && (
            <>
              <button
                onClick={() => setMethod('google')}
                className="flex items-center gap-1.5 text-[13px] font-medium -mb-1"
                style={{ color: 'var(--color-primary)' }}
              >
                ← Zpět
              </button>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email" className={inputCls} value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tvuj@email.cz" autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                />
              </div>

              {error && <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-[10px] px-3 py-2">⚠️ {error}</p>}

              <button onClick={handleSendCode} disabled={loading || !email.trim()}
                className="w-full py-3.5 rounded-[14px] text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}>
                {loading ? 'Odesílám…' : '✉️ Odeslat kód'}
              </button>
              <p className="text-[12px] text-center text-gray-400">Na email přijde 6místný kód.</p>
            </>
          )}

          {/* ── OTP code entry ── */}
          {method === 'email' && step === 'code' && (
            <>
              <p className="text-[13px] text-gray-500 text-center">
                Kód byl odeslán na <strong className="text-gray-800">{email}</strong>
              </p>

              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input key={i} ref={el => { inputs.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleDigitKey(i, e)}
                    className="w-11 h-14 text-center text-[22px] font-bold bg-[var(--bg)] border-2 rounded-[12px] outline-none transition-colors"
                    style={{ borderColor: digit ? 'var(--color-primary)' : '#e5e7eb', color: 'var(--color-primary)' }}
                  />
                ))}
              </div>

              {error && <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-[10px] px-3 py-2 text-center">⚠️ {error}</p>}

              <button onClick={() => handleVerifyToken(code.join(''))} disabled={loading || code.some(d => !d)}
                className="w-full py-3.5 rounded-[14px] text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}>
                {loading ? 'Přihlašuji…' : '🔓 Přihlásit se'}
              </button>

              <button onClick={() => { setStep('email'); setCode(['','','','','','']); setError('') }}
                className="text-[13px] text-center font-medium" style={{ color: 'var(--color-primary)' }}>
                ← Zpět / jiný email
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
