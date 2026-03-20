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

        return (
          <div key={tab.id} className="flex items-center flex-shrink-0">
            <Link
              href={tab.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-[8px] text-[12px] font-semibold transition-all"
              style={{
                background: isActive ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)',
                color:      'rgba(255,255,255,' + (isActive ? '1' : '0.7') + ')',
              }}
            >
              <span className="text-[13px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
            <button
              onClick={() => closeTab(tab.id)}
              className="px-3 py-1.5 flex items-center justify-center rounded-r-[8px] text-[14px] leading-none transition-all hover:bg-white/20"
              style={{
                background: isActive ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.55)',
              }}
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
