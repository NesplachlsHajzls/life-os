'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  // Pokud přijde uživatel z magic link (token v URL), zpracuj session
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) window.location.href = '/'
    })
  }, [])

  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-[14px] px-4 py-3 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--color-primary)] transition-colors'

  async function handleSend() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA] p-6">
      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-[56px] mb-3">🌀</div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Life OS</h1>
          <p className="text-[14px] text-gray-400 mt-1">Přihlaš se pomocí emailu</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-[20px] shadow-lg p-8 text-center">
            <div className="text-[48px] mb-3">📬</div>
            <p className="text-[17px] font-bold text-gray-800 mb-2">Odkaz odeslán!</p>
            <p className="text-[14px] text-gray-500">
              Zkontroluj email <strong>{email}</strong> a klikni na přihlašovací odkaz.
            </p>
            <p className="text-[12px] text-gray-400 mt-3">
              Odkaz vyprší za 1 hodinu. Nekouká-li se email, zkontroluj spam.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-5 text-[13px] font-medium"
              style={{ color: 'var(--color-primary)' }}
            >
              Zadat jiný email
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[20px] shadow-lg p-6 flex flex-col gap-4">
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
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-[10px] px-3 py-2">
                ⚠️ {error}
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-[14px] text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? 'Odesílám…' : '✉️ Poslat přihlašovací odkaz'}
            </button>

            <p className="text-[12px] text-center text-gray-400">
              Na email dorazí odkaz pro okamžité přihlášení — bez hesla.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
