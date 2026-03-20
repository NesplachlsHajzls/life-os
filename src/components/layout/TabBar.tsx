'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTabs } from '@/contexts/TabsContext'

export function TabBar() {
  const { tabs, closeTab } = useTabs()
  const pathname = usePathname()

  if (tabs.length === 0) return null

  return (
    <div
      className="flex items-center gap-1 px-3 py-2 overflow-x-auto flex-shrink-0"
      style={{ background: 'var(--color-primary)', scrollbarWidth: 'none' }}
    >
      {tabs.map(tab => {
        const isActive =
          tab.href === '/'
            ? pathname === '/'
            : pathname === tab.href || pathname.startsWith(tab.href + '/')

        const bg = isActive ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)'
        return (
          <div key={tab.id} className="flex items-stretch flex-shrink-0 rounded-[8px] overflow-hidden transition-all" style={{ background: bg }}>
            <Link
              href={tab.href}
              className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-[12px] font-semibold"
              style={{ color: 'rgba(255,255,255,' + (isActive ? '1' : '0.7') + ')' }}
            >
              <span className="text-[13px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
            <button
              onClick={() => closeTab(tab.id)}
              className="pl-1.5 pr-3 flex items-center justify-center text-[12px] leading-none hover:bg-white/20 transition-colors"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              title="Zavřít záložku"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
