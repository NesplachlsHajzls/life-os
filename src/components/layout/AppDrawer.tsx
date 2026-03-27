'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DRAWER_SECTIONS = [
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
      { href: '/byt',          icon: '🏠', label: 'Byt'         },
      { href: '/learning',     icon: '📚', label: 'Learning'    },
      { href: '/places',       icon: '📍', label: 'Places'      },
      { href: '/bucket-list',  icon: '🎯', label: 'Bucket List' },
      { href: '/sport',        icon: '💪', label: 'Sport'       },
      { href: '/poznamky',     icon: '📝', label: 'Poznámky'    },
    ],
  },
  {
    label: 'Nastavení',
    items: [
      { href: '/nastaveni', icon: '⚙️', label: 'Nastavení' },
    ],
  },
]

interface AppDrawerProps {
  onClose: () => void
}

export function AppDrawer({ onClose }: AppDrawerProps) {
  const pathname = usePathname()

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease' }}
      />

      {/* Drawer panel — slides up from bottom, stops above the nav bar */}
      <div
        className="relative w-full max-w-[390px] rounded-t-[28px] z-10"
        style={{
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          paddingBottom: 80,
          maxHeight: '82vh',
          overflowY: 'auto',
          animation: 'drawerUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>

        {/* Title */}
        <div className="px-5 pb-3 pt-1 flex items-center justify-between">
          <span className="text-[18px] font-extrabold" style={{ color: 'var(--text-primary)' }}>Všechny sekce</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[18px]" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
          >×</button>
        </div>

        {/* Sections */}
        <div className="px-4 pb-4 flex flex-col gap-5">
          {DRAWER_SECTIONS.map(section => (
            <div key={section.label}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
                {section.label}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {section.items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-[16px] transition-all active:scale-95"
                      style={{
                        background: active ? 'var(--color-primary-light)' : 'transparent',
                        border: active ? '1.5px solid var(--color-primary-mid)' : '1.5px solid transparent',
                      }}
                    >
                      <span className="text-[26px] leading-none">{item.icon}</span>
                      <span
                        className="text-[11px] font-semibold text-center leading-tight"
                        style={{ color: active ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes drawerUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
