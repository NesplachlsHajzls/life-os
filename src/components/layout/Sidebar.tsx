'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SIDEBAR_SECTIONS = [
  {
    label: 'Každodenní',
    items: [
      { href: '/',          icon: '⊞',  label: 'Dashboard'   },
      { href: '/todo',      icon: '✅', label: 'Todo'        },
      { href: '/finance',   icon: '💰', label: 'Finance'     },
      { href: '/prace',     icon: '💼', label: 'Práce'       },
      { href: '/kalendar',  icon: '📅', label: 'Kalendář'    },
    ],
  },
  {
    label: 'Život',
    items: [
      { href: '/byt',         icon: '🏠', label: 'Byt'         },
      { href: '/learning',    icon: '📚', label: 'Learning'    },
      { href: '/places',      icon: '📍', label: 'Places'      },
      { href: '/bucket-list', icon: '🎯', label: 'Bucket List' },
      { href: '/sport',       icon: '💪', label: 'Sport'       },
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
      style={{ background: 'var(--color-primary)' }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[18px]"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            🌀
          </div>
          <span className="text-[17px] font-extrabold text-white">Life OS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {SIDEBAR_SECTIONS.map(section => (
          <div key={section.label} className="mb-5">
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1"
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              {section.label}
            </div>
            {section.items.map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-[10px] mb-0.5 transition-all"
                  style={{
                    background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  }}
                >
                  <span className="text-[18px] leading-none flex-shrink-0">{item.icon}</span>
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: active ? '#fff' : 'rgba(255,255,255,0.72)' }}
                  >
                    {item.label}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    {item.href === '/todo' && todoCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                        {todoCount > 99 ? '99+' : todoCount}
                      </span>
                    )}
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom — user */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            M
          </div>
          <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Martin</span>
        </div>
      </div>
    </aside>
  )
}
