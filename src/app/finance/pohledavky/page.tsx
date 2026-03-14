'use client'

import { Header } from '@/components/layout/Header'
import { FAB } from '@/components/ui/FAB'

const ITEMS = [
  { initials: 'MN', bg: 'bg-blue-500', name: 'Martin Novák', note: 'Půjčka na auto', amount: '5 000 Kč', date: '15. 1. 2026' },
  { initials: 'PK', bg: 'bg-orange-500', name: 'Petr Kratochvíl', note: 'Záloha za projekt', amount: '3 000 Kč', date: '3. 2. 2026' },
]

export default function PohledavkyPage() {
  return (
    <>
      <Header title="Pohledávky" subtitle="Dluží mi celkem 8 000 Kč" backHref="/finance/penezenky" backLabel="Peněženky" />
      <div className="p-4 flex flex-col gap-2">
        {ITEMS.map(item => (
          <div key={item.name} className="bg-white rounded-[14px] px-4 py-3.5 flex items-center gap-3 shadow-card">
            <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center text-white font-bold text-[15px] flex-shrink-0`}>
              {item.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold">{item.name}</div>
              <div className="text-[12px] text-gray-400 mt-0.5">{item.note}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[15px] font-bold text-green-600">{item.amount}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{item.date}</div>
            </div>
          </div>
        ))}
      </div>
      <FAB />
    </>
  )
}
