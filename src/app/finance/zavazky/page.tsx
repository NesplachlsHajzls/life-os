'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { fmt, todayStr } from '@/features/finance/utils'
import type { Debt } from '@/features/finance/api'
import { usePrivacy } from '@/contexts/PrivacyContext'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

// ── Helpers ───────────────────────────────────────────────────────

/** Parse quick input like "Jirka 500 oběd" → { person, amount, note } */
function parseDebtText(text: string): { person: string; amount: number; note: string } | null {
  const match = text.match(/^(\S+)\s+(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(.*)$/)
  if (!match) return null
  const amount = parseFloat(match[2].replace(/\s/g, '').replace(',', '.'))
  if (!amount) return null
  return { person: match[1], amount, note: match[3].trim() }
}

/** Generate avatar initials from person name */
function initials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/** Stable color from person name */
const AVATAR_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

// ── AddDebtSheet ──────────────────────────────────────────────────

interface SheetProps {
  type: 'liability' | 'receivable'
  prefillPerson?: string
  onSave: (entry: Omit<Debt, 'id'>) => void
  onClose: () => void
}

function AddDebtSheet({ type, prefillPerson, onSave, onClose }: SheetProps) {
  const [person,   setPerson]   = useState(prefillPerson ?? '')
  const [amount,   setAmount]   = useState('')
  const [note,     setNote]     = useState('')
  const [dateFrom, setDateFrom] = useState(todayStr())
  const [dateTo,   setDateTo]   = useState('')

  const valid = person.trim() && +amount > 0

  function handleSave() {
    if (!valid) return
    onSave({ person: person.trim(), amount: +amount, note, date_from: dateFrom, date_to: dateTo || undefined, type })
    onClose()
  }

  const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--color-primary)]'
  const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5'
  const accentColor = type === 'liability' ? '#ef4444' : '#22c55e'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-[var(--surface)] rounded-t-[24px] p-5 pb-8 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[16px] font-bold mb-4">{type === 'liability' ? '💳 Nový závazek' : '💚 Nová pohledávka'}</h2>
        <div className="flex flex-col gap-4">

          <div>
            <label className={labelCls}>Osoba / firma</label>
            <input className={fieldCls} value={person} onChange={e => setPerson(e.target.value)} placeholder="Jirka, Banka, Pepík..." />
          </div>

          <div>
            <label className={labelCls}>Částka (Kč)</label>
            <input type="number" className={fieldCls} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>

          <div>
            <label className={labelCls}>Za co (poznámka)</label>
            <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="oběd, půjčka na auto, flaška na trénink..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Od kdy</label>
              <input type="date" className={fieldCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Do kdy (volitelné)</label>
              <input type="date" className={fieldCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-gray-500">Zrušit</button>
            <button
              onClick={handleSave}
              disabled={!valid}
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: accentColor }}
            >Přidat</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EditDebtSheet ─────────────────────────────────────────────────

function EditDebtSheet({ debt, onSave, onClose }: { debt: Debt; onSave: (d: Debt) => void; onClose: () => void }) {
  const [person,   setPerson]   = useState(debt.person)
  const [amount,   setAmount]   = useState(String(debt.amount))
  const [note,     setNote]     = useState(debt.note)
  const [dateFrom, setDateFrom] = useState(debt.date_from)
  const [dateTo,   setDateTo]   = useState(debt.date_to ?? '')

  const valid = person.trim() && +amount > 0
  const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--color-primary)]'
  const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-[var(--surface)] rounded-t-[24px] p-5 pb-8 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[16px] font-bold mb-4">✏️ Upravit záznam</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Osoba / firma</label>
            <input className={fieldCls} value={person} onChange={e => setPerson(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Částka (Kč)</label>
            <input type="number" className={fieldCls} value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Za co (poznámka)</label>
            <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Od kdy</label>
              <input type="date" className={fieldCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Do kdy</label>
              <input type="date" className={fieldCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-gray-500">Zrušit</button>
            <button
              onClick={() => { if (valid) { onSave({ ...debt, person: person.trim(), amount: +amount, note, date_from: dateFrom, date_to: dateTo || undefined }); onClose() } }}
              disabled={!valid}
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white bg-[var(--color-primary)] disabled:opacity-40"
            >Uložit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function ZavazkyPage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID

  const { loading, debts, addDebt, removeDebt, editDebt, toast } = useFinance(userId)
  const { hideAmounts } = usePrivacy()
  const h = (n: number) => hideAmounts ? '••••' : `${fmt(n)} Kč`


  const [quickInput,  setQuickInput]  = useState('')
  const [quickError,  setQuickError]  = useState('')
  const [showAdd,     setShowAdd]     = useState(false)
  const [addPerson,   setAddPerson]   = useState('')
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set())

  // Only liabilities on this page
  const myDebts = debts.filter(d => d.type === 'liability')

  // Group by person name (case-insensitive)
  const grouped = myDebts.reduce<Record<string, Debt[]>>((acc, d) => {
    const key = d.person.toLowerCase()
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  const totalOwed = myDebts.reduce((s, d) => s + d.amount, 0)

  function toggleExpanded(person: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(person)) next.delete(person)
      else next.add(person)
      return next
    })
  }

  async function handleQuickAdd() {
    const parsed = parseDebtText(quickInput.trim())
    if (!parsed) { setQuickError('Zkus: "Jirka 500 oběd" nebo "Banka 30000 půjčka"'); return }
    setQuickError('')
    await addDebt({ ...parsed, date_from: todayStr(), type: 'liability' })
    setQuickInput('')
  }

  function formatDate(d: string) {
    return d.slice(5).replace('-', '. ') + '. ' + d.slice(0, 4)
  }

  return (
    <>
      <Header title="Finance" />
      <FinanceTabs active="Peněženky" />

      <div className="p-4 flex flex-col gap-4">

        {/* Hero card */}
        <div className="rounded-[20px] p-5 text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
          <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide mb-1">Dlužím celkem</div>
          {loading
            ? <div className="text-[28px] font-bold animate-pulse">…</div>
            : <div className="text-[32px] font-bold">{hideAmounts ? '••••' : <>{fmt(totalOwed)} <span className="text-[18px] opacity-70">Kč</span></>}</div>
          }
          <div className="text-[12px] opacity-60 mt-1">
            {Object.keys(grouped).length} {Object.keys(grouped).length === 1 ? 'osoba' : Object.keys(grouped).length < 5 ? 'osoby' : 'osob'}
          </div>
        </div>

        {/* Quick text input */}
        <div className="bg-[var(--surface)] rounded-[16px] shadow-card px-4 py-3.5">
          <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">➕ Přidat závazek</div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[13px] outline-none focus:border-red-400"
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
              placeholder="Jirka 500 oběd / Banka 30000 půjčka"
            />
            <button onClick={handleQuickAdd} disabled={!quickInput.trim()} className="px-4 py-2.5 rounded-[12px] bg-red-500 text-white text-[13px] font-bold disabled:opacity-40">+</button>
            <button onClick={() => { setAddPerson(''); setShowAdd(true) }} className="px-3 py-2.5 rounded-[12px] border border-[var(--border)] text-gray-500 text-[13px]">✎</button>
          </div>
          {quickError && <p className="text-[11px] text-red-500 mt-1.5">⚠️ {quickError}</p>}
        </div>

        {/* Person groups */}
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-[13px]">Načítám…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-[13px]">
            Žádné závazky 🎉<br /><span className="text-[12px]">Přidej záznamy výše</span>
          </div>
        ) : (
          Object.entries(grouped)
            .sort((a, b) => b[1].reduce((s, d) => s + d.amount, 0) - a[1].reduce((s, d) => s + d.amount, 0))
            .map(([personKey, entries]) => {
              const personName = entries[0].person
              const total = entries.reduce((s, d) => s + d.amount, 0)
              const isOpen = expanded.has(personKey)
              const color = avatarColor(personName)
              const latestNote = [...entries].sort((a, b) => b.date_from.localeCompare(a.date_from))[0]?.note

              return (
                <div key={personKey} className="bg-[var(--surface)] rounded-[16px] shadow-card overflow-hidden">
                  {/* Person header row */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    onClick={() => toggleExpanded(personKey)}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0"
                      style={{ background: color }}
                    >
                      {initials(personName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold">{personName}</div>
                      {latestNote && <div className="text-[11px] text-gray-400 truncate">{latestNote}{entries.length > 1 ? ` +${entries.length - 1} další` : ''}</div>}
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <div className="text-[15px] font-bold text-red-500">−{h(total)}</div>
                      {entries.length > 1 && <div className="text-[11px] text-gray-400">{entries.length} záznamy</div>}
                    </div>
                    <span className="text-gray-400 text-[12px]">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded entries */}
                  {isOpen && (
                    <div className="border-t border-[var(--border)]">
                      {entries
                        .sort((a, b) => b.date_from.localeCompare(a.date_from))
                        .map((entry, idx) => (
                          <div
                            key={entry.id}
                            className={`flex items-start gap-3 px-4 py-3 ${idx < entries.length - 1 ? 'border-b border-gray-50' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-gray-800">
                                {entry.note || '—'}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {formatDate(entry.date_from)}
                                {entry.date_to ? ` → ${formatDate(entry.date_to)}` : ''}
                              </div>
                            </div>
                            <span className="text-[13px] font-bold text-red-500 flex-shrink-0">−{h(entry.amount)}</span>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => setEditingDebt(entry)}
                                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-[var(--color-primary)] hover:bg-indigo-50 text-[12px]"
                              >✏️</button>
                              <button
                                onClick={() => removeDebt(entry.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 text-[14px]"
                              >×</button>
                            </div>
                          </div>
                        ))
                      }
                      {/* Add another entry for same person */}
                      <button
                        onClick={() => { setAddPerson(personName); setShowAdd(true) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--bg)] transition-colors"
                      >
                        <span className="text-[16px]">+</span> Přidat další záznam pro {personName}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {showAdd && (
        <AddDebtSheet
          type="liability"
          prefillPerson={addPerson}
          onSave={addDebt}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editingDebt && (
        <EditDebtSheet
          debt={editingDebt}
          onSave={editDebt}
          onClose={() => setEditingDebt(null)}
        />
      )}
    </>
  )
}
