'use client'

import { Header } from '@/components/layout/Header'
import { FAB } from '@/components/ui/FAB'

const ITEMS = [
  { initials: '🏦', bg: 'bg-red-500', name: 'Banka — spotřebitelský úvěr', note: 'Splátky 2 000 Kč / měsíc', amount: '12 000 Kč', date: 'zbývá 6 měsíců' },
  { initials: 'JN', bg: 'bg-gray-500', name: 'Jana Nováková', note: 'Vrátit do konce března', amount: '5 000 Kč', date: '31. 3. 2026' },
]

export default function ZavazkyPage() {
  return (
    <>
      <Header title="Závazky" subtitle="Dlužím celkem 17 000 Kč" backHref="/finance/penezenky" backLabel="Peněženky" />
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
              <div className="text-[15px] font-bold text-red-500">−{item.amount}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{item.date}</div>
            </div>
          </div>
        ))}
      </div>
      <FAB />
    </>
  )
}
