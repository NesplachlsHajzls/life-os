'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { AddExpenseSheet, AddIncomeSheet, EditExpenseSheet, EditIncomeSheet } from '@/features/finance/components/AddTransactionSheet'
import { fmt, mLabel, mKey, todayStr } from '@/features/finance/utils'
import { FAB } from '@/components/ui/FAB'
import type { Expense, Income } from '@/features/finance/api'
import { usePrivacy } from '@/contexts/PrivacyContext'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export default function TransakcePage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID
  const { hideAmounts } = usePrivacy()

  const {
    loading, toast,
    curMonth, setCurMonth,
    filtExpenses, filtIncomes,
    expCats, incCats, wallets,
    addExpenseManual, addIncomeManual,
    removeExpense, removeIncome,
    editExpenseWithWallet, editIncome,
    allMonths,
  } = useFinance(userId)

  const [showAddExp, setShowAddExp]       = useState(false)
  const [showAddInc, setShowAddInc]       = useState(false)
  const [editingExp, setEditingExp]       = useState<Expense | null>(null)
  const [editingInc, setEditingInc]       = useState<Income | null>(null)
  const [filter, setFilter]               = useState<'all' | 'exp' | 'inc'>('all')

  // Merge and sort all transactions
  const allItems = [
    ...filtExpenses.map(e => ({ ...e, kind: 'exp' as const })),
    ...filtIncomes.map(i => ({ ...i, kind: 'inc' as const })),
  ]
    .filter(item => filter === 'all' || item.kind === filter)
    .sort((a, b) => b.date.localeCompare(a.date))

  // Group by date
  const grouped: Record<string, typeof allItems> = {}
  for (const item of allItems) {
    if (!grouped[item.date]) grouped[item.date] = []
    grouped[item.date].push(item)
  }

  return (
    <>
      <Header title="Finance" />
      <FinanceTabs active="Transakce" />

      {/* Month selector */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <button onClick={() => { const i = allMonths.indexOf(curMonth); if (i > 0) setCurMonth(allMonths[i - 1]) }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] text-lg">‹</button>
        <span className="text-[13px] font-bold text-[var(--text-secondary)]">{mLabel(curMonth)}</span>
        <button onClick={() => { const i = allMonths.indexOf(curMonth); if (i < allMonths.length - 1) setCurMonth(allMonths[i + 1]) }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] text-lg">›</button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-2.5 bg-[var(--surface)] border-b border-[var(--border)]">
        {(['all', 'exp', 'inc'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-colors ${
              filter === f ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
            }`}
          >
            {f === 'all' ? 'Vše' : f === 'exp' ? '💸 Výdaje' : '💚 Příjmy'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading && (
          <div className="text-center py-10 text-[var(--text-tertiary)] text-[13px]">Načítám…</div>
        )}

        {!loading && allItems.length === 0 && (
          <div className="text-center py-10 text-[var(--text-tertiary)] text-[13px]">
            Žádné záznamy pro {mLabel(curMonth)}.
          </div>
        )}

        {Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-4">
            <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
              {date === todayStr()
                ? '📍 Dnes'
                : date.slice(5).replace('-', '. ') + '. ' + date.slice(0, 4)}
            </div>
            <div className="bg-[var(--surface)] rounded-[16px] shadow-card overflow-hidden">
              {items.map((item, idx) => {
                const isExp = item.kind === 'exp'
                const cat = isExp ? (expCats[item.category] ?? { icon: '📦', color: '#94a3b8' }) : null
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx < items.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] flex-shrink-0"
                      style={{ background: isExp ? (cat!.color + '22') : '#22c55e22' }}
                    >
                      {isExp ? cat!.icon : '💚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{item.description}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">{item.category}</div>
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
                        title="Upravit"
                      >✏️</button>
                      <button
                        onClick={() => isExp ? removeExpense(item.id) : removeIncome(item.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-50 text-[14px] transition-colors"
                      >×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-[var(--surface-raised)] text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      <FAB onClick={() => setShowAddExp(true)} />

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
