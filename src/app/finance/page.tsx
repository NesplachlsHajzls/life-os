'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { AddExpenseSheet, AddIncomeSheet } from '@/features/finance/components/AddTransactionSheet'
import { fmt, mLabel } from '@/features/finance/utils'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

// ── Finance Overview Page ─────────────────────────────────────────
export default function FinancePage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID

  const {
    loading, toast,
    curMonth, setCurMonth,
    totalInc, totalExp, totalCom, volne,
    filtExpenses, filtIncomes, catSums,
    expCats, incCats, wallets,
    addExpenseText, addExpenseManual,
    addIncomeText, addIncomeManual,
    allMonths,
  } = useFinance(userId)

  const [expInput,   setExpInput]   = useState('')
  const [incInput,   setIncInput]   = useState('')
  const [expError,   setExpError]   = useState('')
  const [incError,   setIncError]   = useState('')
  const [showAddExp, setShowAddExp] = useState(false)
  const [showAddInc, setShowAddInc] = useState(false)

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

  const catBarData = Object.entries(catSums)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value, color: (expCats[name] ?? { color: '#94a3b8' }).color }))
  const maxCat = catBarData[0]?.value || 1

  return (
    <>
      <Header title="Finance 💰" />
      <FinanceTabs active="Přehled" />

      {/* Month selector */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <button
          onClick={() => { const i = allMonths.indexOf(curMonth); if (i > 0) setCurMonth(allMonths[i - 1]) }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-lg"
        >‹</button>
        <span className="text-[13px] font-bold text-gray-700">{mLabel(curMonth)}</span>
        <button
          onClick={() => { const i = allMonths.indexOf(curMonth); if (i < allMonths.length - 1) setCurMonth(allMonths[i + 1]) }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-lg"
        >›</button>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Hero card */}
        <div className="rounded-[20px] p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))' }}>
          <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide mb-1">Volné prostředky</div>
          {loading
            ? <div className="text-[28px] font-bold animate-pulse">…</div>
            : <div className="text-[32px] font-bold">{fmt(volne)} <span className="text-[18px] opacity-70">Kč</span></div>
          }
          <div className="flex gap-5 mt-4 text-sm">
            <div>
              <div className="text-[10px] opacity-60 uppercase tracking-wide">Příjmy</div>
              <div className="text-[14px] font-bold text-green-300">+{fmt(totalInc)} Kč</div>
            </div>
            <div>
              <div className="text-[10px] opacity-60 uppercase tracking-wide">Závazky</div>
              <div className="text-[14px] font-bold text-orange-300">−{fmt(totalCom)} Kč</div>
            </div>
            <div>
              <div className="text-[10px] opacity-60 uppercase tracking-wide">Výdaje</div>
              <div className="text-[14px] font-bold text-red-300">−{fmt(totalExp)} Kč</div>
            </div>
          </div>
        </div>

        {/* Quick add */}
        <div className="bg-white rounded-[16px] shadow-card overflow-hidden">
          <div className="px-4 pt-3.5 pb-2">
            <div className="text-[10px] font-bold text-green-500 uppercase tracking-wide mb-2">➕ Příjem</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-50 border border-gray-200 rounded-[12px] px-3.5 py-2.5 text-[13px] outline-none focus:border-green-400"
                value={incInput}
                onChange={e => setIncInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleIncSubmit()}
                placeholder="výplata 45000 / faktura 12000"
              />
              <button onClick={handleIncSubmit} disabled={!incInput.trim()} className="px-4 py-2.5 rounded-[12px] bg-green-500 text-white text-[13px] font-bold disabled:opacity-40">+</button>
              <button onClick={() => setShowAddInc(true)} className="px-3 py-2.5 rounded-[12px] border border-gray-200 text-gray-500 text-[13px]">✎</button>
            </div>
            {incError && <p className="text-[11px] text-red-500 mt-1.5">⚠️ {incError}</p>}
          </div>

          <div className="mx-4 h-px bg-gray-100" />

          <div className="px-4 pt-2 pb-3.5">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">➖ Výdaj</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-50 border border-gray-200 rounded-[12px] px-3.5 py-2.5 text-[13px] outline-none focus:border-red-400"
                value={expInput}
                onChange={e => setExpInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExpSubmit()}
                placeholder="oběd 150 / netflix 299 - banka"
              />
              <button onClick={handleExpSubmit} disabled={!expInput.trim()} className="px-4 py-2.5 rounded-[12px] bg-red-500 text-white text-[13px] font-bold disabled:opacity-40">−</button>
              <button onClick={() => setShowAddExp(true)} className="px-3 py-2.5 rounded-[12px] border border-gray-200 text-gray-500 text-[13px]">✎</button>
            </div>
            {expError && <p className="text-[11px] text-red-500 mt-1.5">⚠️ {expError}</p>}
          </div>
        </div>

        {/* Category bars */}
        {catBarData.length > 0 && (
          <div className="bg-white rounded-[16px] shadow-card p-4">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Výdaje dle kategorie</div>
            <div className="flex flex-col gap-2.5">
              {catBarData.map(({ name, value, color }) => (
                <div key={name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] font-semibold text-gray-700">{expCats[name]?.icon} {name}</span>
                    <span className="text-[12px] font-bold text-gray-600">{fmt(value)} Kč</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(value / maxCat) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {(filtExpenses.length > 0 || filtIncomes.length > 0) && (
          <div className="bg-white rounded-[16px] shadow-card overflow-hidden">
            <div className="px-4 pt-3.5 pb-2 flex justify-between items-center">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Poslední záznamy</div>
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
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] flex-shrink-0"
                      style={{ background: isExp ? (cat!.color + '22') : '#22c55e22' }}>
                      {isExp ? cat!.icon : '💚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{item.description}</div>
                      <div className="text-[11px] text-gray-400">{item.category} · {item.date.slice(5).replace('-', '.')}</div>
                    </div>
                    <div className={`text-[14px] font-bold ${isExp ? 'text-gray-700' : 'text-green-600'}`}>
                      {isExp ? '−' : '+'}{fmt(item.amount)} Kč
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}

        {!loading && filtExpenses.length === 0 && filtIncomes.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-[13px]">
            Žádné záznamy pro {mLabel(curMonth)}.<br />
            <span className="text-[12px]">Přidej první výdaj nebo příjem ↑</span>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}

      {showAddExp && (
        <AddExpenseSheet expCats={expCats} wallets={wallets} onSave={addExpenseManual} onClose={() => setShowAddExp(false)} />
      )}
      {showAddInc && (
        <AddIncomeSheet incCats={incCats} onSave={addIncomeManual} onClose={() => setShowAddInc(false)} />
      )}
    </>
  )
}
