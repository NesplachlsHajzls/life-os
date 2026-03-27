'use client'

export function FinanceTabs({ active }: { active: string }) {
  const tabs = [
    { label: 'Přehled',   href: '/finance' },
    { label: 'Transakce', href: '/finance/transakce' },
    { label: 'Peněženky',href: '/finance/penezenky' },
    { label: 'Opakované', href: '/finance/opakovane' },
  ]
  return (
    <div className="flex gap-1 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {tabs.map(t => (
        <a
          key={t.href}
          href={t.href}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
            active === t.label
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          {t.label}
        </a>
      ))}
    </div>
  )
}
