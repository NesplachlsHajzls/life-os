'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { fmt, genId, todayStr } from '@/features/finance/utils'
import { RecurringItem, Wallet } from '@/features/finance/api'
import type { CatMap } from '@/features/finance/utils'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { insertEvent, updateEvent, deleteEvent } from '@/features/calendar/api'
import type { RecurrenceType } from '@/features/calendar/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

const FREQ_OPTIONS: { value: RecurringItem['frequency']; label: string }[] = [
  { value: 'weekly',   label: 'Týdně'        },
  { value: 'monthly',  label: 'Měsíčně'      },
  { value: 'quarterly',label: 'Čtvrtletně'   },
  { value: 'biannual', label: 'Pololetně'    },
  { value: 'annual',   label: 'Ročně'        },
]

const FREQ_MONTHS: Record<RecurringItem['frequency'], number> = {
  weekly: 0.25, monthly: 1, quarterly: 3, biannual: 6, annual: 12,
}

// ── Date helpers ──────────────────────────────────────────────────

function nextDueDate(item: RecurringItem): string {
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const day = item.day_of_month

  if (item.frequency === 'weekly') {
    const next = new Date(today)
    next.setDate(today.getDate() + (7 - today.getDay() + 1) % 7 || 7)
    return next.toISOString().slice(0, 10)
  }

  // Compute candidate date in current month
  const candidate = new Date(today.getFullYear(), today.getMonth(), Math.min(day, 28))
  const candidateIso = candidate.toISOString().slice(0, 10)

  // Already paid this cycle?
  if (item.last_paid) {
    const lastPaid = new Date(item.last_paid)
    const monthsSincePaid =
      (today.getFullYear() - lastPaid.getFullYear()) * 12 +
      (today.getMonth() - lastPaid.getMonth())
    const freqMonths = FREQ_MONTHS[item.frequency]

    if (monthsSincePaid < freqMonths) {
      // Not due yet — advance by frequency
      const next = new Date(lastPaid.getFullYear(), lastPaid.getMonth() + freqMonths, Math.min(day, 28))
      return next.toISOString().slice(0, 10)
    }
  }

  // Due: return current month's date if still upcoming, else next period
  if (candidateIso >= todayIso) return candidateIso
  const freqMonths = FREQ_MONTHS[item.frequency]
  const next = new Date(today.getFullYear(), today.getMonth() + freqMonths, Math.min(day, 28))
  return next.toISOString().slice(0, 10)
}

function isDue(item: RecurringItem): boolean {
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const due = nextDueDate(item)
  return due <= todayIso
}

function formatDueDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const today = todayStr()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIso = tomorrow.toISOString().slice(0, 10)
  if (iso === today) return 'Dnes'
  if (iso === tomorrowIso) return 'Zítra'
  return `${d}. ${m}. ${y}`
}

// ── Field styles ──────────────────────────────────────────────────

const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)] placeholder-gray-400 outline-none focus:border-[var(--color-primary)]'
const labelCls = 'block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5'

// ── Add / Edit Sheet ──────────────────────────────────────────────

interface EditSheetProps {
  initial?: RecurringItem
  expCats: CatMap
  wallets: Wallet[]
  onSave: (item: RecurringItem) => void
  onClose: () => void
}

function EditSheet({ initial, expCats, wallets, onSave, onClose }: EditSheetProps) {
  const [desc,    setDesc]    = useState(initial?.description ?? '')
  const [amount,  setAmount]  = useState(initial ? String(initial.amount) : '')
  const [catName, setCatName] = useState(initial?.category ?? Object.keys(expCats)[0] ?? 'Ostatní')
  const [freq,    setFreq]    = useState<RecurringItem['frequency']>(initial?.frequency ?? 'monthly')
  const [day,     setDay]     = useState(initial?.day_of_month ?? 1)
  const [walletId,setWalletId]= useState<string>(initial?.wallet_id ?? '')

  const valid = desc.trim() && +amount > 0

  function handleSave() {
    if (!valid) return
    onSave({
      id: initial?.id ?? genId(),
      description: desc.trim(),
      amount: +amount,
      category: catName,
      frequency: freq,
      day_of_month: day,
      wallet_id: walletId || null,
      last_paid: initial?.last_paid,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-[var(--surface)] rounded-t-[24px] p-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[16px] font-bold mb-4">{initial ? '✏️ Upravit platbu' : '➕ Nová opakovaná platba'}</h2>
        <div className="flex flex-col gap-4">

          <div>
            <label className={labelCls}>Název</label>
            <input className={fieldCls} value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Netflix, Nájem, Pojištění…" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Částka (Kč)</label>
              <input type="number" className={fieldCls} value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Den splatnosti</label>
              <input type="number" min={1} max={31} className={fieldCls} value={day}
                onChange={e => setDay(Math.min(31, Math.max(1, +e.target.value)))} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Frekvence</label>
            <div className="flex flex-wrap gap-2">
              {FREQ_OPTIONS.map(f => (
                <button key={f.value} onClick={() => setFreq(f.value)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    freq === f.value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                  }`}>{f.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Kategorie</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(expCats).map(([name, cat]) => (
                <button key={name} onClick={() => setCatName(name)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    catName === name ? 'text-white' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                  }`}
                  style={catName === name ? { background: cat.color } : {}}>
                  {cat.icon} {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Strhávat z peněženky (volitelné)</label>
            <select className={fieldCls} value={walletId} onChange={e => setWalletId(e.target.value)}>
              <option value="">— bez odečtení —</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">
              Zrušit
            </button>
            <button onClick={handleSave} disabled={!valid}
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}>
              {initial ? 'Uložit' : 'Přidat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Calendar event helpers ────────────────────────────────────────

/** Maps recurring frequency to calendar recurrence type + interval */
function freqToCalRecurrence(freq: RecurringItem['frequency']): { type: RecurrenceType; interval: number } {
  switch (freq) {
    case 'weekly':    return { type: 'weekly',  interval: 1 }
    case 'monthly':   return { type: 'monthly', interval: 1 }
    case 'quarterly': return { type: 'monthly', interval: 3 }
    case 'biannual':  return { type: 'monthly', interval: 6 }
    case 'annual':    return { type: 'yearly',  interval: 1 }
  }
}

/** Returns the ISO date of the next (or current) occurrence of day_of_month */
function firstOccurrence(item: RecurringItem): string {
  const today = new Date()
  const yr = today.getFullYear()
  const mo = today.getMonth()
  const maxDay = new Date(yr, mo + 1, 0).getDate()
  const day = Math.min(item.day_of_month, maxDay)
  const candidate = new Date(yr, mo, day)
  const todayMid  = new Date(yr, mo, today.getDate())
  if (candidate >= todayMid) {
    return `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  // Advance by one period
  const freqMonths = FREQ_MONTHS[item.frequency]
  const nextMo = Math.floor(freqMonths)
  const next = new Date(yr, mo + nextMo, Math.min(item.day_of_month, 28))
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

/** Build the calendar event payload for a recurring finance item */
function buildCalPayload(item: RecurringItem, userId: string) {
  const dateIso = firstOccurrence(item)
  const { type, interval } = freqToCalRecurrence(item.frequency)
  return {
    user_id: userId,
    title: `💸 ${item.description}`,
    description: `Opakovaná platba – ${fmt(item.amount)} Kč`,
    start_datetime: `${dateIso}T00:00:00`,
    end_datetime:   `${dateIso}T00:00:00`,
    is_all_day: true,
    category: 'finance',
    emoji: '💸',
    is_work: false,
    client_id: null,
    is_recurring: true,
    recurrence_type: type,
    recurrence_interval: interval,
    recurrence_end_date: null,
  }
}

// ── Page ──────────────────────────────────────────────────────────

export default function OpakovAnePage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID
  const { hideAmounts } = usePrivacy()

  const {
    loading, toast,
    recurringV2, monthlyIncomeBudget,
    expCats, wallets,
    saveRecurringV2, saveMonthlyIncomeBudget, confirmRecurringV2,
  } = useFinance(userId)

  const [showAdd,     setShowAdd]    = useState(false)
  const [editing,     setEditing]    = useState<RecurringItem | null>(null)
  const [deletingId,  setDeletingId] = useState<string | null>(null)
  const [incomeInput, setIncomeInput]= useState('')
  const [editIncome,  setEditIncome] = useState(false)

  // Monthly-equivalent total
  const totalMonthly = useMemo(() =>
    recurringV2.reduce((s, r) => s + r.amount / FREQ_MONTHS[r.frequency], 0)
  , [recurringV2])

  const remaining = monthlyIncomeBudget - totalMonthly

  // Sort: due items first, then by next due date
  const sorted = useMemo(() =>
    [...recurringV2].sort((a, b) => {
      const aDue = isDue(a), bDue = isDue(b)
      if (aDue !== bDue) return aDue ? -1 : 1
      return nextDueDate(a).localeCompare(nextDueDate(b))
    })
  , [recurringV2])

  async function handleAdd(item: RecurringItem) {
    try {
      const ev = await insertEvent(buildCalPayload(item, userId))
      item = { ...item, cal_event_id: ev.id }
    } catch { /* calendar creation optional — don't block */ }
    saveRecurringV2([...recurringV2, item])
  }

  async function handleEdit(item: RecurringItem) {
    const prev = recurringV2.find(r => r.id === item.id)
    // Update calendar event if title or day changed
    if (prev?.cal_event_id && (
      prev.description !== item.description ||
      prev.day_of_month !== item.day_of_month ||
      prev.frequency !== item.frequency
    )) {
      try {
        await updateEvent({ id: prev.cal_event_id, ...buildCalPayload(item, userId) })
        item = { ...item, cal_event_id: prev.cal_event_id }
      } catch { item = { ...item, cal_event_id: prev.cal_event_id } }
    } else if (prev?.cal_event_id) {
      item = { ...item, cal_event_id: prev.cal_event_id }
    }
    saveRecurringV2(recurringV2.map(r => r.id === item.id ? item : r))
  }

  async function handleDelete(id: string) {
    const item = recurringV2.find(r => r.id === id)
    if (item?.cal_event_id) {
      try { await deleteEvent(item.cal_event_id) } catch { /* ignore */ }
    }
    saveRecurringV2(recurringV2.filter(r => r.id !== id))
    setDeletingId(null)
  }

  function handleSaveIncome() {
    const n = parseFloat(incomeInput.replace(/\s/g, '').replace(',', '.'))
    if (!isNaN(n) && n >= 0) saveMonthlyIncomeBudget(n)
    setEditIncome(false)
  }

  return (
    <>
      <Header title="Finance" />
      <FinanceTabs active="Opakované" />

      <div className="p-4 flex flex-col gap-4">

        {/* Summary card */}
        <div className="rounded-[20px] p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))' }}>
          <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide mb-3">Měsíční přehled</div>
          <div className="flex flex-col gap-2">

            {/* Income row */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] opacity-80">💰 Měsíční příjem</span>
              {editIncome ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-28 bg-white/20 text-white placeholder-white/60 rounded-lg px-2 py-1 text-[13px] outline-none"
                    value={incomeInput}
                    onChange={e => setIncomeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveIncome()}
                    placeholder="0"
                    autoFocus
                  />
                  <button onClick={handleSaveIncome} className="text-[12px] font-bold bg-white/20 px-2 py-1 rounded-lg">OK</button>
                </div>
              ) : (
                <button
                  onClick={() => { setIncomeInput(String(monthlyIncomeBudget || '')); setEditIncome(true) }}
                  className="text-[14px] font-bold flex items-center gap-1"
                >
                  {hideAmounts ? '••••' : monthlyIncomeBudget ? `${fmt(monthlyIncomeBudget)} Kč` : '+ nastavit'}
                  <span className="text-[11px] opacity-60">✏️</span>
                </button>
              )}
            </div>

            {/* Recurring total */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] opacity-80">🔄 Opakované platby</span>
              <span className="text-[14px] font-bold text-red-300">
                {loading ? '…' : hideAmounts ? '••••' : `−${fmt(Math.round(totalMonthly))} Kč`}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/20 my-1" />

            {/* Remainder */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] opacity-80">📊 Zůstatek po zaplacení</span>
              <span className={`text-[18px] font-bold ${remaining < 0 ? 'text-red-300' : 'text-green-300'}`}>
                {hideAmounts ? '••••' : monthlyIncomeBudget
                  ? `${remaining >= 0 ? '' : '−'}${fmt(Math.abs(Math.round(remaining)))} Kč`
                  : '—'
                }
              </span>
            </div>
          </div>
        </div>

        {/* List header */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
            Platby ({recurringV2.length})
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            + Přidat
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[var(--text-tertiary)] text-[13px]">Načítám…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-tertiary)] text-[13px]">
            Žádné opakované platby.<br />
            <span className="text-[12px]">Přidej první kliknutím na + Přidat</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map(item => {
              const catKey = Object.keys(expCats).find(k => k.toLowerCase() === item.category.toLowerCase()) ?? item.category
              const cat  = expCats[catKey] ?? { icon: '📦', color: '#94a3b8' }
              const due  = isDue(item)
              const next = nextDueDate(item)
              const wallet = wallets.find(w => w.id === item.wallet_id)
              const freqLabel = FREQ_OPTIONS.find(f => f.value === item.frequency)?.label ?? 'Měsíčně'

              return (
                <div key={item.id}
                  className={`bg-[var(--surface)] rounded-[16px] px-4 py-3.5 shadow-card ${due ? 'ring-1 ring-orange-400/50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0"
                      style={{ background: cat.color + '22' }}>
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold">{item.description}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-[var(--text-tertiary)]">{freqLabel} · den {item.day_of_month}.</span>
                        {wallet && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: (wallet.color ?? '#94a3b8') + '22', color: wallet.color ?? '#94a3b8' }}>
                            {wallet.icon} {wallet.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[14px] font-bold text-red-500">
                        {hideAmounts ? '••••' : `−${fmt(item.amount)} Kč`}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        📅 {formatDueDate(next)}
                      </span>
                    </div>
                  </div>

                  {/* Due indicator */}
                  {due && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-orange-500">
                      <span>🔔</span>
                      <span>Splatné {formatDueDate(next)}</span>
                      {item.last_paid && (
                        <span className="text-[var(--text-tertiary)] font-normal ml-1">
                          · naposledy {item.last_paid.slice(8, 10)}.{item.last_paid.slice(5, 7)}.
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => confirmRecurringV2(item)}
                      className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-bold transition-all active:scale-95 ${
                        due
                          ? 'bg-orange-500 text-white'
                          : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                      }`}
                    >
                      💸 Zaplatit
                    </button>
                    <button onClick={() => setEditing(item)}
                      className="px-3 py-1.5 rounded-[10px] bg-[var(--surface-raised)] text-[11px] font-semibold text-[var(--text-secondary)]">
                      ✏️
                    </button>
                    <button onClick={() => setDeletingId(item.id)}
                      className="px-3 py-1.5 rounded-[10px] bg-[var(--surface-raised)] text-[11px] font-semibold text-red-400">
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-[#f97316] text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Add sheet */}
      {showAdd && (
        <EditSheet
          expCats={expCats}
          wallets={wallets}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit sheet */}
      {editing && (
        <EditSheet
          initial={editing}
          expCats={expCats}
          wallets={wallets}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete confirm */}
      {deletingId && (() => {
        const item = recurringV2.find(r => r.id === deletingId)
        if (!item) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setDeletingId(null)}>
            <div className="w-full max-w-sm bg-[var(--surface)] rounded-[20px] p-5"
              onClick={e => e.stopPropagation()}>
              <div className="text-[16px] font-bold mb-2">Smazat platbu?</div>
              <div className="text-[13px] text-[var(--text-secondary)] mb-4">
                <span className="font-semibold">{item.description}</span> bude odstraněna ze seznamu.
                Již zaznamenané platby v historii zůstanou.
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 rounded-[12px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">
                  Zrušit
                </button>
                <button onClick={() => handleDelete(deletingId)}
                  className="flex-1 py-2.5 rounded-[12px] bg-red-500 text-white text-[14px] font-bold">
                  Smazat
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
