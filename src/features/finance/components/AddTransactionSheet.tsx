'use client'

import { useState } from 'react'
import { Sheet } from './Sheet'
import { CatMap, todayStr } from '../utils'
import { Wallet, Expense, Income } from '../api'

// ── Field styles ──────────────────────────────────────────────────

const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)] placeholder-gray-400 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] transition-colors'
const labelCls = 'block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5'

const PRESET_COLORS = [
  '#f97316', '#ef4444', '#ec4899', '#a855f7',
  '#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e',
  '#10b981', '#f59e0b', '#84cc16', '#94a3b8',
]

// ── Inline New Category Form ──────────────────────────────────────

interface NewCatFormProps {
  onSave: (name: string, icon: string, color: string) => void
  onCancel: () => void
}

function NewCatForm({ onSave, onCancel }: NewCatFormProps) {
  const [name,  setName]  = useState('')
  const [icon,  setIcon]  = useState('📦')
  const [color, setColor] = useState(PRESET_COLORS[0])

  const valid = name.trim().length > 0

  return (
    <div className="mt-2 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-[14px] flex flex-col gap-3">
      <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Nová kategorie</div>
      <div className="flex gap-2">
        <div className="w-[56px]">
          <label className={labelCls}>Ikona</label>
          <input
            className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-[10px] px-2 py-2 text-[18px] text-center outline-none focus:border-[var(--color-primary)]"
            value={icon}
            onChange={e => setIcon(e.target.value)}
            maxLength={2}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Název</label>
          <input
            className={fieldCls}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nikotin, Sport…"
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Barva</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-transform"
              style={{
                background: c,
                outline: color === c ? `3px solid ${c}` : 'none',
                outlineOffset: '2px',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-[10px] border border-[var(--border)] text-[13px] font-semibold text-[var(--text-secondary)]"
        >
          Zrušit
        </button>
        <button
          onClick={() => valid && onSave(name.trim(), icon, color)}
          disabled={!valid}
          className="flex-1 py-2 rounded-[10px] text-[13px] font-bold text-white transition-opacity"
          style={{ background: color, opacity: valid ? 1 : 0.4 }}
        >
          Přidat
        </button>
      </div>
    </div>
  )
}

// ── CategoryPicker ────────────────────────────────────────────────

interface CategoryPickerProps {
  cats: CatMap
  selected: string
  onSelect: (name: string) => void
  onAddCategory?: (name: string, icon: string, color: string) => void
}

function CategoryPicker({ cats, selected, onSelect, onAddCategory }: CategoryPickerProps) {
  const [showNew, setShowNew] = useState(false)

  function handleAdd(name: string, icon: string, color: string) {
    onAddCategory?.(name, icon, color)
    onSelect(name)
    setShowNew(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(cats).map(([name, cat]) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
              selected === name
                ? 'text-white border-transparent'
                : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-transparent'
            }`}
            style={selected === name ? { background: cat.color } : {}}
          >
            {cat.icon} {name}
          </button>
        ))}
        {onAddCategory && !showNew && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[var(--surface-raised)] text-[var(--text-tertiary)] border border-dashed border-[var(--border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            + přidat
          </button>
        )}
      </div>
      {showNew && (
        <NewCatForm onSave={handleAdd} onCancel={() => setShowNew(false)} />
      )}
    </div>
  )
}

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
  onAddCategory?: (name: string, icon: string, color: string) => void
  onClose: () => void
}

export function AddExpenseSheet({ expCats, wallets, onSave, onAddCategory, onClose }: AddExpenseSheetProps) {
  const [desc,     setDesc]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [category, setCategory] = useState(Object.keys(expCats)[0] ?? 'Ostatní')
  const [date,     setDate]     = useState(todayStr())
  const [walletId, setWalletId] = useState<string>('')
  const [note,     setNote]     = useState('')

  // Keep category in sync when new cat is added
  const [localCats, setLocalCats] = useState<CatMap>(expCats)

  function handleAddCat(name: string, icon: string, color: string) {
    const updated = { ...localCats, [name]: { icon, color } }
    setLocalCats(updated)
    onAddCategory?.(name, icon, color)
    setCategory(name)
  }

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
          <CategoryPicker
            cats={localCats}
            selected={category}
            onSelect={setCategory}
            onAddCategory={handleAddCat}
          />
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
            className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]"
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
  onAddCategory?: (name: string, icon: string, color: string) => void
  onClose: () => void
}

export function EditExpenseSheet({ expense, expCats, wallets, onSave, onAddCategory, onClose }: EditExpenseSheetProps) {
  const [desc,     setDesc]     = useState(expense.description)
  const [amount,   setAmount]   = useState(String(expense.amount))
  // Normalize category key to match expCats canonical casing
  const canonCat = Object.keys(expCats).find(k => k.toLowerCase() === expense.category.toLowerCase()) ?? expense.category
  const [category, setCategory] = useState(canonCat)
  const [date,     setDate]     = useState(expense.date)
  const [walletId, setWalletId] = useState<string>(expense.wallet_id ?? '')
  const [note,     setNote]     = useState(expense.note ?? '')

  const [localCats, setLocalCats] = useState<CatMap>(expCats)

  function handleAddCat(name: string, icon: string, color: string) {
    const updated = { ...localCats, [name]: { icon, color } }
    setLocalCats(updated)
    onAddCategory?.(name, icon, color)
    setCategory(name)
  }

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
          <CategoryPicker
            cats={localCats}
            selected={category}
            onSelect={setCategory}
            onAddCategory={handleAddCat}
          />
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
            className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]"
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
                  category === name ? 'text-white border-transparent' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-transparent'
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
          <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">Zrušit</button>
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
                  category === name ? 'text-white border-transparent' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-transparent'
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
          <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">Zrušit</button>
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
