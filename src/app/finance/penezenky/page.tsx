'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { fmt } from '@/features/finance/utils'
import { Wallet } from '@/features/finance/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

// ── WalletTransfer sheet (inline) ─────────────────────────────────
function TransferSheet({ wallets, onTransfer, onClose }: { wallets: Wallet[]; onTransfer: (f: string, t: string, amt: number) => void; onClose: () => void }) {
  const [from, setFrom] = useState(wallets[0]?.id ?? '')
  const [to,   setTo]   = useState(wallets[1]?.id ?? '')
  const [amt,  setAmt]  = useState('')
  const valid = from && to && from !== to && +amt > 0
  const sel = 'w-full bg-gray-50 border border-gray-200 rounded-[12px] px-3 py-2.5 text-[13px] outline-none'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-[24px] p-5 pb-8">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[16px] font-bold mb-4">💸 Přesun peněz</h2>
        <div className="flex flex-col gap-3">
          <div><label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Z</label>
            <select className={sel} value={from} onChange={e => setFrom(e.target.value)}>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name} — {fmt(w.balance)} Kč</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Na</label>
            <select className={sel} value={to} onChange={e => setTo(e.target.value)}>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name} — {fmt(w.balance)} Kč</option>)}
            </select>
          </div>
          <div><label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Částka (Kč)</label>
            <input type="number" className={sel} value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
          <button
            onClick={() => { onTransfer(from, to, +amt); onClose() }}
            disabled={!valid}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white bg-[var(--color-primary)] disabled:opacity-40"
          >Přesunout</button>
        </div>
      </div>
    </div>
  )
}

export default function PenezenkyPage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID

  const { loading, wallets, totalWallets, handleTransfer, toast } = useFinance(userId)

  const [showTransfer, setShowTransfer] = useState(false)

  // Split wallets by rough type
  const assets    = wallets.filter(w => !['receivable', 'liability'].includes(w.type ?? ''))
  const totalAssets = assets.reduce((s, w) => s + w.balance, 0)

  return (
    <>
      <Header title="Finance 💰" />
      <FinanceTabs active="Peněženky" />

      <div className="p-4">
        {/* Net worth card */}
        <div className="rounded-[20px] p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))' }}>
          <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide mb-1">Celkový majetek</div>
          {loading
            ? <div className="text-[28px] font-bold animate-pulse">…</div>
            : <div className="text-[32px] font-bold">{fmt(totalWallets)} <span className="text-[18px] opacity-70">Kč</span></div>
          }
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowTransfer(true)}
              className="px-4 py-2 rounded-xl bg-white/20 text-white text-[12px] font-semibold"
            >💸 Přesunout</button>
            <a href="/finance/pohledavky" className="px-4 py-2 rounded-xl bg-white/20 text-white text-[12px] font-semibold">🤝 Pohledávky</a>
            <a href="/finance/zavazky" className="px-4 py-2 rounded-xl bg-white/20 text-white text-[12px] font-semibold">💳 Závazky</a>
          </div>
        </div>

        {/* Wallets list */}
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">💵 Peněženky</div>

        {loading ? (
          <div className="text-center py-6 text-gray-400 text-[13px]">Načítám…</div>
        ) : (
          <div className="flex flex-col gap-2">
            {wallets.map(w => (
              <div key={w.id} className="bg-white rounded-[16px] px-4 py-3.5 flex items-center gap-3 shadow-card">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
                  style={{ background: (w.color ?? '#94a3b8') + '22' }}
                >
                  {w.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold">{w.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5 capitalize">{w.type ?? 'běžná'}</div>
                </div>
                <span className="text-[15px] font-bold" style={{ color: w.balance < 0 ? '#ef4444' : '#111827' }}>
                  {fmt(w.balance)} Kč
                </span>
              </div>
            ))}

            {wallets.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-[13px]">Žádné peněženky</div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {showTransfer && (
        <TransferSheet
          wallets={wallets}
          onTransfer={handleTransfer}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </>
  )
}
