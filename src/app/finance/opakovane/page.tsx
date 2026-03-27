'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { fmt } from '@/features/finance/utils'
import { Sheet } from '@/features/finance/components/Sheet'
import { FAB } from '@/components/ui/FAB'
import { usePrivacy } from '@/contexts/PrivacyContext'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

const FREQ_LABELS: Record<string, string> = {
  monthly:   'Každý měsíc',
  quarterly: 'Každý čtvrtletí',
  biannual:  'Každé půl roku',
  annual:    'Každý rok',
}

// ── Add recurring sheet ───────────────────────────────────────────
function AddRecurringSheet({ onClose }: { onClose: () => void }) {
  // Simplified — just shows a placeholder for now
  return (
    <Sheet title="🔄 Nová opakovaná platba" onClose={onClose}>
      <p className="text-[13px] text-gray-500">Správa opakovaných plateb bude brzy k dispozici.</p>
      <button onClick={onClose} className="mt-4 w-full py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-gray-500">Zavřít</button>
    </Sheet>
  )
}

export default function OpakovAnePage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID

  const { loading, recurring, expCats, toast, dueRecurring, confirmRecurring } = useFinance(userId)
  const { hideAmounts } = usePrivacy()

  const [showAdd,  setShowAdd]  = useState(false)
  const [showDue,  setShowDue]  = useState(dueRecurring.length > 0)

  const totalMonthly = recurring.reduce((s, r) => s + r.amount, 0)

  return (
    <>
      <Header title="Finance" />
      <FinanceTabs active="Opakované" />

      <div className="p-4">
        {dueRecurring.length > 0 && (
          <button
            onClick={() => setShowDue(true)}
            className="w-full mb-4 py-3 rounded-[16px] bg-orange-50 border border-orange-200 text-[13px] font-semibold text-orange-600 flex items-center justify-center gap-2"
          >
            🔔 {dueRecurring.length} splatná platba tento měsíc — potvrdit
          </button>
        )}

        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
          Celkem měsíčně: {loading ? '…' : hideAmounts ? '••••' : `${fmt(totalMonthly)} Kč`}
        </div>

        {loading ? (
          <div className="text-center py-6 text-gray-400 text-[13px]">Načítám…</div>
        ) : recurring.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-[13px]">
            Žádné opakované platby.<br />
            <span className="text-[12px]">Přidej první kliknutím na +</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recurring.map(r => {
              const cat = expCats[r.category] ?? { icon: '📦', color: '#94a3b8' }
              const isDue = dueRecurring.some(d => d.id === r.id)
              return (
                <div key={r.id} className="bg-[var(--surface)] rounded-[16px] px-4 py-3.5 flex items-center gap-3 shadow-card">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px]"
                    style={{ background: cat.color + '22' }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold">{r.description}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{FREQ_LABELS[r.category] ?? 'Každý měsíc'} · {r.category}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-red-500">−{hideAmounts ? '••••' : `${fmt(r.amount)} Kč`}</span>
                    {isDue && (
                      <button
                        onClick={() => confirmRecurring(r)}
                        className="px-2 py-1 rounded-lg bg-green-500 text-white text-[11px] font-bold"
                      >✓</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      <FAB onClick={() => setShowAdd(true)} />

      {showAdd && <AddRecurringSheet onClose={() => setShowAdd(false)} />}
    </>
  )
}
