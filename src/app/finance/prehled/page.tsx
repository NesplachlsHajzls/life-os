'use client'

import { useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import { fmt } from '@/features/finance/utils'
import { usePrivacy } from '@/contexts/PrivacyContext'
import type { PeriodRecord } from '@/features/finance/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

function fmtDate(iso: string) {
  return `${iso.slice(8, 10)}. ${iso.slice(5, 7)}. ${iso.slice(0, 4)}`
}

// ── PeriodCard ────────────────────────────────────────────────────

function PeriodCard({ record, hide }: { record: PeriodRecord; hide: boolean }) {
  const saved = record.saved
  const isPositive = saved >= 0
  const pct = record.income > 0 ? Math.min(Math.abs(saved) / record.income * 100, 100) : 0

  return (
    <div
      className="rounded-[16px] p-4 border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Date range */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          {fmtDate(record.start)} → {fmtDate(record.end)}
        </div>
        <div
          className="text-[13px] font-bold px-3 py-1 rounded-full"
          style={{
            background: isPositive ? '#16a34a18' : '#ef444418',
            color: isPositive ? '#16a34a' : '#ef4444',
          }}
        >
          {isPositive ? '↑ ušetřeno' : '↓ přečerpáno'}
        </div>
      </div>

      {/* Main amount */}
      <div
        className="text-[28px] font-bold mb-3"
        style={{ color: isPositive ? '#16a34a' : '#ef4444' }}
      >
        {hide ? '••••' : `${isPositive ? '+' : ''}${fmt(saved)} Kč`}
      </div>

      {/* Bar */}
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--surface-raised)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: isPositive ? '#16a34a' : '#ef4444',
          }}
        />
      </div>

      {/* Income / Expenses row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[10px] p-2.5" style={{ background: 'var(--surface-raised)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide text-green-500 mb-0.5">Příjmy</div>
          <div className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {hide ? '••••' : `${fmt(record.income)} Kč`}
          </div>
        </div>
        <div className="rounded-[10px] p-2.5" style={{ background: 'var(--surface-raised)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide text-red-400 mb-0.5">Výdaje</div>
          <div className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {hide ? '••••' : `${fmt(record.expenses)} Kč`}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function PrehledPage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID
  const { hideAmounts } = usePrivacy()

  const {
    loading,
    payPeriodStart, periodStart, periodIncome, periodExpenses, volne,
    periodHistory,
    setPayPeriod,
    totalCom,
  } = useFinance(userId)

  const dateInputRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().split('T')[0]
  const isPositive = volne >= 0

  // Savings rate for current period
  const savingsRate = periodIncome > 0 ? Math.round((volne / periodIncome) * 100) : 0

  return (
    <>
      <Header title="Finance" />
      <FinanceTabs active="Přehled" />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 flex flex-col gap-4 pb-24">

          {/* ── Aktuální období ── */}
          <div
            className="rounded-[20px] p-5 text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))' }}
          >
            {/* Period selector */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-60 mb-0.5">
                  Aktuální výplatní období
                </div>
                <div className="text-[13px] font-semibold">
                  {payPeriodStart
                    ? `${fmtDate(periodStart)} → dnes`
                    : 'Výplatní den není nastaven'}
                </div>
              </div>
              <button
                onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors rounded-[10px] px-3 py-1.5 text-[12px] font-semibold"
              >
                📅 {payPeriodStart ? 'Změnit' : 'Nastavit'}
              </button>
              <input
                ref={dateInputRef}
                type="date"
                className="absolute opacity-0 w-0 h-0"
                max={today}
                value={payPeriodStart ?? ''}
                onChange={e => { if (e.target.value) setPayPeriod(e.target.value) }}
              />
            </div>

            {/* Current period result */}
            {loading ? (
              <div className="text-[32px] font-bold animate-pulse">…</div>
            ) : (
              <>
                <div className="text-[11px] opacity-70 uppercase tracking-wide mb-1">
                  {isPositive ? 'Zbývá' : 'Přečerpáno'}
                </div>
                <div className={`text-[36px] font-bold ${volne < 0 ? 'text-red-300' : ''}`}>
                  {hideAmounts ? '••••' : <>{fmt(volne)} <span className="text-[20px] opacity-70">Kč</span></>}
                </div>

                {/* Mini stats */}
                <div className="flex gap-4 mt-4">
                  <div>
                    <div className="text-[10px] opacity-60 uppercase tracking-wide">Příjmy</div>
                    <div className="text-[14px] font-bold text-green-300">
                      +{hideAmounts ? '••••' : `${fmt(periodIncome)} Kč`}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-60 uppercase tracking-wide">Výdaje</div>
                    <div className="text-[14px] font-bold text-red-300">
                      −{hideAmounts ? '••••' : `${fmt(periodExpenses)} Kč`}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-60 uppercase tracking-wide">Závazky</div>
                    <div className="text-[14px] font-bold text-orange-300">
                      −{hideAmounts ? '••••' : `${fmt(totalCom)} Kč`}
                    </div>
                  </div>
                </div>

                {/* Savings rate bar */}
                {periodIncome > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] mb-1.5 opacity-80">
                      <span>Míra úspor</span>
                      <span className="font-bold">{savingsRate}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-white/20">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(0, savingsRate)}%`,
                          background: savingsRate >= 20 ? '#4ade80' : savingsRate >= 0 ? '#fbbf24' : '#f87171',
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Tip pokud není nastaven výplatní den ── */}
          {!payPeriodStart && !loading && (
            <div
              className="rounded-[14px] p-4 border border-dashed"
              style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary)0d' }}
            >
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
                💡 Nastav výplatní den
              </div>
              <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                Klikni na "Nastavit" výše a vyber datum kdy ti přišla poslední výplata. Od té doby se budou počítat volné prostředky.
              </div>
            </div>
          )}

          {/* ── Historie období ── */}
          {periodHistory.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>
                Historie období
              </div>
              <div className="flex flex-col gap-3">
                {periodHistory.map((record, i) => (
                  <PeriodCard key={i} record={record} hide={hideAmounts} />
                ))}
              </div>
            </div>
          )}

          {/* Prázdný stav */}
          {!loading && periodHistory.length === 0 && payPeriodStart && (
            <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
              <div className="text-[40px] mb-3">📊</div>
              <div className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Zatím žádná uzavřená období
              </div>
              <div className="text-[12px] mt-1">
                Historie se zapíše automaticky při nastavení dalšího výplatního dne.
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
