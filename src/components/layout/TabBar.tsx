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
      className="flex items-center gap-1 px-3 py-1.5 bg-white border-b border-gray-100 overflow-x-auto flex-shrink-0"
      style={{ scrollbarWidth: 'none' }}
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
              className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-l-[8px] text-[12px] font-semibold transition-all"
              style={{
                background: isActive ? 'var(--color-primary)' + '15' : '#f3f4f6',
                color:      isActive ? 'var(--color-primary)' : '#6b7280',
              }}
            >
              <span className="text-[13px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
            <button
              onClick={() => closeTab(tab.id)}
              className="px-1.5 py-1 rounded-r-[8px] text-[13px] leading-none transition-colors"
              style={{
                background: isActive ? 'var(--color-primary)' + '15' : '#f3f4f6',
                color: '#9ca3af',
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
