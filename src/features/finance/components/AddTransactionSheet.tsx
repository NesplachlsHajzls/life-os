'use client'

import { useState } from 'react'
import { Sheet } from './Sheet'
import { CatMap, todayStr } from '../utils'
import { Wallet, Expense, Income } from '../api'

// ── Field styles ──────────────────────────────────────────────────

const fieldCls = 'w-full bg-gray-50 border border-gray-200 rounded-[12px] px-3.5 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] transition-colors'
const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5'

// ── AddExpenseSheet ───────────────────────────────────────────────

interface AddExpenseSheetProps {
  expCats: CatMap
  wallets: Wallet[]
  onSave: (entry: {
    description: string
    amount: number
    category: string
    date: string
    wallet_id: string | null
    note: string
    tags: string[]
    recur_id: null
  }) => void
  onClose: () => void
}

export function AddExpenseSheet({ expCats, wallets, onSave, onClose }: AddExpenseSheetProps) {
  const [desc,     setDesc]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [category, setCategory] = useState(Object.keys(expCats)[0] ?? 'Ostatní')
  const [date,     setDate]     = useState(todayStr())
  const [walletId, setWalletId] = useState<string>('')
  const [note,     setNote]     = useState('')

  const valid = desc.trim() && +amount > 0

  function handleSave() {
    if (!valid) return
    onSave({
      description: desc.trim(),
      amount: +amount,
      category,
      date,
      wallet_id: walletId || null,
      note,
      tags: [],
      recur_id: null,
    })
    onClose()
  }

  return (
    <Sheet title="💸 Nový výdaj" onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className={labelCls}>Popis</label>
          <input className={fieldCls} value={desc} onChange={e => setDesc(e.target.value)} placeholder="oběd, taxi, netflix..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Částka (Kč)</label>
            <input type="number" className={fieldCls} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Datum</label>
            <input type="date" className={fieldCls} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Kategorie</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(expCats).map(([name, cat]) => (
              <button
                key={name}
                onClick={() => setCategory(name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  category === name
                    ? 'text-white border-transparent'
                    : 'bg-gray-100 text-gray-600 border-transparent'
                }`}
                style={category === name ? { background: cat.color } : {}}
              >
                {cat.icon} {name}
              </button>
            ))}
          </div>
        </div>

        {wallets.length > 0 && (
          <div>
            <label className={labelCls}>Odečíst z peněženky (volitelné)</label>
            <select className={fieldCls} value={walletId} onChange={e => setWalletId(e.target.value)}>
              <option value="">— bez odečtení —</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelCls}>Poznámka (volitelné)</label>
          <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="..." />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white transition-opacity"
            style={{ background: 'var(--color-primary)', opacity: valid ? 1 : 0.4 }}
          >
            Přidat výdaj
          </button>
        </div>
      </div>
    </Sheet>
  )
}

// ── EditExpenseSheet ──────────────────────────────────────────────

interface EditExpenseSheetProps {
  expense: Expense
  expCats: CatMap
  wallets: Wallet[]
  onSave: (newExpense: Expense, oldExpense: Expense) => void
  onClose: () => void
}

export function EditExpenseSheet({ expense, expCats, wallets, onSave, onClose }: EditExpenseSheetProps) {
  const [desc,     setDesc]     = useState(expense.description)
  const [amount,   setAmount]   = useState(String(expense.amount))
  const [category, setCategory] = useState(expense.category)
  const [date,     setDate]     = useState(expense.date)
  const [walletId, setWalletId] = useState<string>(expense.wallet_id ?? '')
  const [note,     setNote]     = useState(expense.note ?? '')

  const valid = desc.trim() && +amount > 0

  function handleSave() {
    if (!valid) return
    const updated: Expense = {
      ...expense,
      description: desc.trim(),
      amount: +amount,
      category,
      date,
      wallet_id: walletId || null,
      note,
    }
    onSave(updated, expense)
    onClose()
  }

  return (
    <Sheet title="✏️ Upravit výdaj" onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className={labelCls}>Popis</label>
          <input className={fieldCls} value={desc} onChange={e => setDesc(e.target.value)} placeholder="oběd, taxi, netflix..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Částka (Kč)</label>
            <input type="number" className={fieldCls} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Datum</label>
            <input type="date" className={fieldCls} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Kategorie</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(expCats).map(([name, cat]) => (
              <button
                key={name}
                onClick={() => setCategory(name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  category === name
                    ? 'text-white border-transparent'
                    : 'bg-gray-100 text-gray-600 border-transparent'
                }`}
                style={category === name ? { background: cat.color } : {}}
              >
                {cat.icon} {name}
              </button>
            ))}
          </div>
        </div>

        {wallets.length > 0 && (
          <div>
            <label className={labelCls}>Odečíst z peněženky (volitelné)</label>
            <select className={fieldCls} value={walletId} onChange={e => setWalletId(e.target.value)}>
              <option value="">— bez odečtení —</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelCls}>Poznámka (volitelné)</label>
          <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="..." />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white transition-opacity"
            style={{ background: 'var(--color-primary)', opacity: valid ? 1 : 0.4 }}
          >
            Uložit změny
          </button>
        </div>
      </div>
    </Sheet>
  )
}

// ── EditIncomeSheet ───────────────────────────────────────────────

interface EditIncomeSheetProps {
  income: Income
  incCats: CatMap
  onSave: (income: Income) => void
  onClose: () => void
}

export function EditIncomeSheet({ income, incCats, onSave, onClose }: EditIncomeSheetProps) {
  const [desc,     setDesc]     = useState(income.description)
  const [amount,   setAmount]   = useState(String(income.amount))
  const [category, setCategory] = useState(income.category)
  const [date,     setDate]     = useState(income.date)
  const [note,     setNote]     = useState(income.note ?? '')

  const valid = desc.trim() && +amount > 0

  function handleSave() {
    if (!valid) return
    onSave({ ...income, description: desc.trim(), amount: +amount, category, date, note })
    onClose()
  }

  return (
    <Sheet title="✏️ Upravit příjem" onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className={labelCls}>Popis</label>
          <input className={fieldCls} value={desc} onChange={e => setDesc(e.target.value)} placeholder="výplata, faktura..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Částka (Kč)</label>
            <input type="number" className={fieldCls} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Datum</label>
            <input type="date" className={fieldCls} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Kategorie</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(incCats).map(([name, cat]) => (
              <button
                key={name}
                onClick={() => setCategory(name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  category === name ? 'text-white border-transparent' : 'bg-gray-100 text-gray-600 border-transparent'
                }`}
                style={category === name ? { background: cat.color } : {}}
              >
                {cat.icon} {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Poznámka (volitelné)</label>
          <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="..." />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white bg-green-500 transition-opacity"
            style={{ opacity: valid ? 1 : 0.4 }}
          >
            Uložit změny
          </button>
        </div>
      </div>
    </Sheet>
  )
}

// ── AddIncomeSheet ────────────────────────────────────────────────

interface AddIncomeSheetProps {
  incCats: CatMap
  onSave: (entry: {
    description: string
    amount: number
    category: string
    date: string
    note: string
  }) => void
  onClose: () => void
}

export function AddIncomeSheet({ incCats, onSave, onClose }: AddIncomeSheetProps) {
  const [desc,     setDesc]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [category, setCategory] = useState(Object.keys(incCats)[0] ?? 'Výplata')
  const [date,     setDate]     = useState(todayStr())
  const [note,     setNote]     = useState('')

  const valid = desc.trim() && +amount > 0

  function handleSave() {
    if (!valid) return
    onSave({ description: desc.trim(), amount: +amount, category, date, note })
    onClose()
  }

  return (
    <Sheet title="💚 Nový příjem" onClose={onClose}>
      <div className="flex flex-col gap-4">

        <div>
          <label className={labelCls}>Popis</label>
          <input className={fieldCls} value={desc} onChange={e => setDesc(e.target.value)} placeholder="výplata, faktura..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Částka (Kč)</label>
            <input type="number" className={fieldCls} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Datum</label>
            <input type="date" className={fieldCls} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Kategorie</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(incCats).map(([name, cat]) => (
              <button
                key={name}
                onClick={() => setCategory(name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  category === name ? 'text-white border-transparent' : 'bg-gray-100 text-gray-600 border-transparent'
                }`}
                style={category === name ? { background: cat.color } : {}}
              >
                {cat.icon} {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Poznámka (volitelné)</label>
          <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="..." />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white bg-green-500 transition-opacity"
            style={{ opacity: valid ? 1 : 0.4 }}
          >
            Přidat příjem
          </button>
        </div>
      </div>
    </Sheet>
  )
}
