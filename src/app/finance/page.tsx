'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { AddExpenseSheet, AddIncomeSheet, EditExpenseSheet, EditIncomeSheet } from '@/features/finance/components/AddTransactionSheet'
import { fmt, mLabel } from '@/features/finance/utils'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import type { Expense, Income } from '@/features/finance/api'
import { usePrivacy } from '@/contexts/PrivacyContext'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

// ── Finance Overview Page ─────────────────────────────────────────
export default function FinancePage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID
  const { hideAmounts } = usePrivacy()
  const h = (n: number) => hideAmounts ? '••••' : `${fmt(n)} Kč`

  const {
    loading, toast,
    curMonth, setCurMonth,
    totalInc, totalExp, totalCom, volne,
    filtExpenses, filtIncomes, catSums,
    expCats, incCats, wallets,
    addExpenseText, addExpenseManual,
    addIncomeText, addIncomeManual,
    editExpenseWithWallet, editIncome,
    removeExpense, removeIncome,
    allMonths,
  } = useFinance(userId)

  const [expInput,    setExpInput]   = useState('')
  const [incInput,    setIncInput]   = useState('')
  const [expError,    setExpError]   = useState('')
  const [incError,    setIncError]   = useState('')
  const [showAddExp,  setShowAddExp] = useState(false)
  const [showAddInc,  setShowAddInc] = useState(false)
  const [editingExp,  setEditingExp] = useState<Expense | null>(null)
  const [editingInc,  setEditingInc] = useState<Income | null>(null)

  async function handleExpSubmit() {
    if (!expInput.trim()) return
    setExpError('')
    const err = await addExpenseText(expInput)
    if (err) { setExpError(err); return }
    setExpInput('')
  }

  async function handleIncSubmit() {
    if (!incInput.trim()) return
    setIncError('')
    const err = await addIncomeText(incInput)
    if (err) { setIncError(err); return }
    setIncInput('')
  }

  // All categories — those with expenses first (sorted by amount), then empty ones
  const catBarData = [
    ...Object.entries(catSums).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value, color: (expCats[name] ?? { color: '#94a3b8' }).color })),
    ...Object.entries(expCats).filter(([name]) => !catSums[name]).map(([name, cat]) => ({ name, value: 0, color: cat.color })),
  ]
  const maxCat = catBarData[0]?.value || 1

  return (
    <>
      <Header title="Finance" />
      <FinanceTabs active="Přehled" />

      {/* Month selector */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <button
          onClick={() => { const i = allMonths.indexOf(curMonth); if (i > 0) setCurMonth(allMonths[i - 1]) }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] text-lg"
        >‹</button>
        <span className="text-[13px] font-bold text-[var(--text-secondary)]">{mLabel(curMonth)}</span>
        <button
          onClick={() => { const i = allMonths.indexOf(curMonth); if (i < allMonths.length - 1) setCurMonth(allMonths[i + 1]) }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] text-lg"
        >›</button>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Hero card */}
        <div className="rounded-[20px] p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))' }}>
          <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide mb-1">Volné prostředky</div>
          {loading
            ? <div className="text-[28px] font-bold animate-pulse">…</div>
            : <div className="text-[32px] font-bold">{hideAmounts ? '••••' : <>{fmt(volne)} <span className="text-[18px] opacity-70">Kč</span></>}</div>
          }
          <div className="flex gap-5 mt-4 text-sm">
            <div>
              <div className="text-[10px] opacity-60 uppercase tracking-wide">Příjmy</div>
              <div className="text-[14px] font-bold text-green-300">+{h(totalInc)}</div>
            </div>
            <div>
              <div className="text-[10px] opacity-60 uppercase tracking-wide">Závazky</div>
              <div className="text-[14px] font-bold text-orange-300">−{h(totalCom)}</div>
            </div>
            <div>
              <div className="text-[10px] opacity-60 uppercase tracking-wide">Výdaje</div>
              <div className="text-[14px] font-bold text-red-300">−{h(totalExp)}</div>
            </div>
          </div>
        </div>

        {/* Quick add */}
        <div className="bg-[var(--surface)] rounded-[16px] shadow-card overflow-hidden">
          <div className="px-4 pt-3.5 pb-2">
            <div className="text-[10px] font-bold text-green-500 uppercase tracking-wide mb-2">➕ Příjem</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[13px] outline-none focus:border-green-400"
                value={incInput}
                onChange={e => setIncInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleIncSubmit()}
                placeholder="výplata 45000 / faktura 12000"
              />
              <button onClick={handleIncSubmit} disabled={!incInput.trim()} className="px-4 py-2.5 rounded-[12px] bg-green-500 text-white text-[13px] font-bold disabled:opacity-40">+</button>
              <button onClick={() => setShowAddInc(true)} className="px-3 py-2.5 rounded-[12px] border border-[var(--border)] text-[var(--text-secondary)] text-[13px]">✎</button>
            </div>
            {incError && <p className="text-[11px] text-red-500 mt-1.5">⚠️ {incError}</p>}
          </div>

          <div className="mx-4 h-px bg-[var(--surface-raised)]" />

          <div className="px-4 pt-2 pb-3.5">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">➖ Výdaj</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[13px] outline-none focus:border-red-400"
                value={expInput}
                onChange={e => setExpInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExpSubmit()}
                placeholder="oběd 150 ucet / netflix 299 banka"
              />
              <button onClick={handleExpSubmit} disabled={!expInput.trim()} className="px-4 py-2.5 rounded-[12px] bg-red-500 text-white text-[13px] font-bold disabled:opacity-40">−</button>
              <button onClick={() => setShowAddExp(true)} className="px-3 py-2.5 rounded-[12px] border border-[var(--border)] text-[var(--text-secondary)] text-[13px]">✎</button>
            </div>
            {expError && <p className="text-[11px] text-red-500 mt-1.5">⚠️ {expError}</p>}
          </div>
        </div>

        {/* Category bars — always shown when categories exist */}
        {!loading && catBarData.length > 0 && (
          <div className="bg-[var(--surface)] rounded-[16px] shadow-card p-4">
            <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">Výdaje dle kategorie</div>
            <div className="flex flex-col gap-2.5">
              {catBarData.map(({ name, value, color }) => (
                <div key={name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{expCats[name]?.icon} {name}</span>
                    <span className={`text-[12px] font-bold ${value > 0 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}`}>{value > 0 ? (hideAmounts ? '••••' : `${fmt(value)} Kč`) : '—'}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(value / maxCat) * 100}%`, background: color, opacity: value > 0 ? 1 : 0 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {(filtExpenses.length > 0 || filtIncomes.length > 0) && (
          <div className="bg-[var(--surface)] rounded-[16px] shadow-card overflow-hidden">
            <div className="px-4 pt-3.5 pb-2 flex justify-between items-center">
              <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Poslední záznamy</div>
              <a href="/finance/transakce" className="text-[11px] font-semibold" style={{ color: 'var(--color-primary)' }}>Vše ›</a>
            </div>
            {[
              ...filtExpenses.slice(0, 3).map(e => ({ ...e, kind: 'exp' as const })),
              ...filtIncomes.slice(0, 2).map(i => ({ ...i, kind: 'inc' as const })),
            ]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((item, idx, arr) => {
                const isExp = item.kind === 'exp'
                const cat = isExp ? (expCats[item.category] ?? { icon: '📦', color: '#94a3b8' }) : null
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < arr.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] flex-shrink-0"
                      style={{ background: isExp ? (cat!.color + '22') : '#22c55e22' }}>
                      {isExp ? cat!.icon : '💚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{item.description}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">{item.category} · {item.date.slice(5).replace('-', '.')}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[14px] font-bold ${isExp ? 'text-[var(--text-secondary)]' : 'text-green-600'}`}>
                        {isExp ? '−' : '+'}{hideAmounts ? '••••' : `${fmt(item.amount)} Kč`}
                      </span>
                      <button
                        onClick={() => {
                          if (isExp) {
                            const exp = filtExpenses.find(e => e.id === item.id)
                            if (exp) setEditingExp(exp)
                          } else {
                            const inc = filtIncomes.find(i => i.id === item.id)
                            if (inc) setEditingInc(inc)
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:text-[var(--color-primary)] hover:bg-indigo-50 text-[12px] transition-colors"
                      >✏️</button>
                      <button
                        onClick={() => isExp ? removeExpense(item.id) : removeIncome(item.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-50 text-[14px] transition-colors"
                      >×</button>
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}

        {!loading && filtExpenses.length === 0 && filtIncomes.length === 0 && (
          <div className="text-center py-8 text-[var(--text-tertiary)] text-[13px]">
            Žádné záznamy pro {mLabel(curMonth)}.<br />
            <span className="text-[12px]">Přidej první výdaj nebo příjem ↑</span>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-[var(--surface-raised)] text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}

      {showAddExp && (
        <AddExpenseSheet expCats={expCats} wallets={wallets} onSave={addExpenseManual} onClose={() => setShowAddExp(false)} />
      )}
      {showAddInc && (
        <AddIncomeSheet incCats={incCats} onSave={addIncomeManual} onClose={() => setShowAddInc(false)} />
      )}
      {editingExp && (
        <EditExpenseSheet
          expense={editingExp}
          expCats={expCats}
          wallets={wallets}
          onSave={(newExp, oldExp) => editExpenseWithWallet(newExp, oldExp)}
          onClose={() => setEditingExp(null)}
        />
      )}
      {editingInc && (
        <EditIncomeSheet
          income={editingInc}
          incCats={incCats}
          onSave={editIncome}
          onClose={() => setEditingInc(null)}
        />
      )}
    </>
  )
}
