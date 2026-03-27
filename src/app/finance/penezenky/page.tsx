'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { fmt } from '@/features/finance/utils'
import { Wallet } from '@/features/finance/api'
import { usePrivacy } from '@/contexts/PrivacyContext'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

const WALLET_ICONS = ['💵', '💳', '🏦', '💰', '🪙', '💸', '🏧', '🎁', '🛒', '✈️', '🏠', '📱']
const WALLET_TYPES = ['běžná', 'spořicí', 'investiční', 'hotovost', 'kreditní', 'stravenky']
const WALLET_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b']

const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--color-primary)]'
const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5'

// ── EditWalletSheet ────────────────────────────────────────────────
function EditWalletSheet({ wallet, onSave, onClose }: { wallet: Wallet; onSave: (w: Wallet) => void; onClose: () => void }) {
  const [name,    setName]    = useState(wallet.name)
  const [icon,    setIcon]    = useState(wallet.icon)
  const [color,   setColor]   = useState(wallet.color)
  const [balance, setBalance] = useState(String(wallet.balance))
  const [type,    setType]    = useState(wallet.type ?? 'běžná')

  const valid = name.trim() && !isNaN(+balance)

  function handleSave() {
    if (!valid) return
    onSave({ ...wallet, name: name.trim(), icon, color, balance: +balance, type })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-[var(--surface)] rounded-t-[24px] p-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[16px] font-bold mb-4">✏️ Upravit peněženku</h2>
        <div className="flex flex-col gap-4">

          <div>
            <label className={labelCls}>Název</label>
            <input className={fieldCls} value={name} onChange={e => setName(e.target.value)} placeholder="Název peněženky" />
          </div>

          <div>
            <label className={labelCls}>Ikonka</label>
            <div className="flex flex-wrap gap-2">
              {WALLET_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-xl text-[18px] flex items-center justify-center transition-all ${icon === ic ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'bg-[var(--surface-raised)]'}`}
                >
                  {ic}
                </button>
              ))}
              {/* Current icon if not in list */}
              {!WALLET_ICONS.includes(icon) && (
                <button className="w-9 h-9 rounded-xl text-[18px] flex items-center justify-center ring-2 ring-[var(--color-primary)] bg-[var(--color-primary-light)]">{icon}</button>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Barva</label>
            <div className="flex flex-wrap gap-2">
              {WALLET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Aktuální zůstatek (Kč)</label>
            <input type="number" className={fieldCls} value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" />
          </div>

          <div>
            <label className={labelCls}>Typ</label>
            <div className="flex flex-wrap gap-2">
              {WALLET_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${type === t ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--surface-raised)] text-gray-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-gray-500">Zrušit</button>
            <button
              onClick={handleSave}
              disabled={!valid}
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}
            >Uložit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── WalletTransfer sheet (inline) ─────────────────────────────────
function TransferSheet({ wallets, onTransfer, onClose }: { wallets: Wallet[]; onTransfer: (f: string, t: string, amt: number) => void; onClose: () => void }) {
  const [from, setFrom] = useState(wallets[0]?.id ?? '')
  const [to,   setTo]   = useState(wallets[1]?.id ?? '')
  const [amt,  setAmt]  = useState('')
  const valid = from && to && from !== to && +amt > 0
  const sel = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3 py-2.5 text-[13px] outline-none'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-[var(--surface)] rounded-t-[24px] p-5 pb-8">
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
          <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-gray-500">Zrušit</button>
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
  const { hideAmounts } = usePrivacy()

  const { loading, wallets, totalWallets, handleTransfer, saveWallets, toast } = useFinance(userId)

  const [showTransfer, setShowTransfer]         = useState(false)
  const [editingWallet, setEditingWallet]       = useState<Wallet | null>(null)

  function handleSaveWallet(updated: Wallet) {
    const newList = wallets.map(w => w.id === updated.id ? updated : w)
    saveWallets(newList)
  }

  // Split wallets by rough type
  const assets    = wallets.filter(w => !['receivable', 'liability'].includes(w.type ?? ''))
  const totalAssets = assets.reduce((s, w) => s + w.balance, 0)

  return (
    <>
      <Header title="Finance" />
      <FinanceTabs active="Peněženky" />

      <div className="p-4">
        {/* Net worth card */}
        <div className="rounded-[20px] p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))' }}>
          <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide mb-1">Celkový majetek</div>
          {loading
            ? <div className="text-[28px] font-bold animate-pulse">…</div>
            : <div className="text-[32px] font-bold">{hideAmounts ? '••••' : <>{fmt(totalWallets)} <span className="text-[18px] opacity-70">Kč</span></>}</div>
          }
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowTransfer(true)}
              className="px-4 py-2 rounded-xl bg-[var(--surface)]/20 text-white text-[12px] font-semibold"
            >💸 Přesunout</button>
            <a href="/finance/pohledavky" className="px-4 py-2 rounded-xl bg-[var(--surface)]/20 text-white text-[12px] font-semibold">🤝 Pohledávky</a>
            <a href="/finance/zavazky" className="px-4 py-2 rounded-xl bg-[var(--surface)]/20 text-white text-[12px] font-semibold">💳 Závazky</a>
          </div>
        </div>

        {/* Wallets list */}
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">💵 Peněženky</div>

        {loading ? (
          <div className="text-center py-6 text-gray-400 text-[13px]">Načítám…</div>
        ) : (
          <div className="flex flex-col gap-2">
            {wallets.map(w => (
              <div key={w.id} className="bg-[var(--surface)] rounded-[16px] px-4 py-3.5 flex items-center gap-3 shadow-card">
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
                <span className="text-[15px] font-bold mr-1" style={{ color: !hideAmounts && w.balance < 0 ? '#ef4444' : '#111827' }}>
                  {hideAmounts ? '••••' : `${fmt(w.balance)} Kč`}
                </span>
                <button
                  onClick={() => setEditingWallet(w)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-[var(--color-primary)] hover:bg-indigo-50 text-[14px] transition-colors flex-shrink-0"
                  title="Upravit peněženku"
                >✏️</button>
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

      {editingWallet && (
        <EditWalletSheet
          wallet={editingWallet}
          onSave={handleSaveWallet}
          onClose={() => setEditingWallet(null)}
        />
      )}
    </>
  )
}
