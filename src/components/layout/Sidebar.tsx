'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTabs } from '@/contexts/TabsContext'

const SIDEBAR_SECTIONS = [
  {
    label: 'Každodenní',
    items: [
      { href: '/',          icon: '⊞',  label: 'Dashboard'   },
      { href: '/todo',      icon: '✅', label: 'Todo'        },
      { href: '/finance',   icon: '💰', label: 'Finance'     },
      { href: '/prace',     icon: '💼', label: 'I.CA'        },
      { href: '/kalendar',  icon: '📅', label: 'Kalendář'    },
      { href: '/emaily',    icon: '✉️', label: 'Emaily'      },
    ],
  },
  {
    label: 'Život',
    items: [
      { href: '/byt',         icon: '🏠', label: 'Domácnost'   },
      { href: '/learning',    icon: '📚', label: 'Learning'    },
      { href: '/zazitky',     icon: '🌍', label: 'Zážitky'     },
      { href: '/navyky',      icon: '🎯', label: 'Návyky'      },
      { href: '/sport',       icon: '💪', label: 'Tělo & Mysl'       },
      { href: '/poznamky',    icon: '📝', label: 'Poznámky'    },
    ],
  },
  {
    label: 'Systém',
    items: [
      { href: '/nastaveni', icon: '⚙️', label: 'Nastavení' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const { openTab } = useTabs()
  const [todoCount, setTodoCount] = useState<number>(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', data.user.id)
        .eq('status', 'open')
        .then(({ count }) => setTodoCount(count ?? 0))
    })
  }, [])

  return (
    <aside
      className="hidden lg:flex flex-col w-[220px] min-h-screen flex-shrink-0"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[16px] font-black"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(212,74,26,0.4)',
            }}
          >
            ⚡
          </div>
          <div>
            <div className="text-[15px] font-extrabold" style={{ color: 'var(--text-primary)' }}>Life OS</div>
            <div className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>Personal OS</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SIDEBAR_SECTIONS.map(section => (
          <div key={section.label} className="mb-5">
            <div
              className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {section.label}
            </div>
            {section.items.map(item => {
              const active = isActive(item.href)
              return (
                <div key={item.href} className="relative group/nav mb-0.5">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-[10px] transition-all w-full"
                    style={{
                      background: active ? 'var(--color-primary-light)' : 'transparent',
                      borderLeft: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                    }}
                  >
                    <span className="text-[17px] leading-none flex-shrink-0">{item.icon}</span>
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: active ? 'var(--color-primary-mid)' : 'var(--text-secondary)' }}
                    >
                      {item.label}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {item.href === '/todo' && todoCount > 0 && (
                        <span
                          className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                          style={{ background: 'var(--color-primary)', color: '#fff' }}
                        >
                          {todoCount > 99 ? '99+' : todoCount}
                        </span>
                      )}
                    </div>
                  </Link>
                  {/* Otevřít jako záložku — viditelné při hoveru */}
                  <button
                    onClick={e => { e.preventDefault(); openTab(item.href, item.label, item.icon) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-[6px] flex items-center justify-center opacity-0 group-hover/nav:opacity-100 transition-opacity"
                    title="Otevřít jako záložku"
                    style={{
                      color: 'var(--text-tertiary)',
                      background: 'var(--surface-raised)',
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.5 1.5H1.5v8h8V6.5" />
                      <path d="M6.5 1.5H9.5V4.5" />
                      <line x1="5.5" y1="5.5" x2="9.5" y2="1.5" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom — user */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            M
          </div>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Martin</span>
        </div>
      </div>
    </aside>
  )
}
