'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AppDrawer } from './AppDrawer'

const LEFT_ITEMS = [
  { href: '/todo',    icon: '✅', label: 'Todo'    },
  { href: '/finance', icon: '💰', label: 'Finance' },
]
const RIGHT_ITEMS = [
  { href: '/kalendar', icon: '📅', label: 'Kalendář' },
  { href: '/prace',    icon: '💼', label: 'Práce'    },
]

export function BottomNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const dashActive = pathname === '/'

  return (
    <>
      {/* Nav bar — overflow visible so center button can poke above */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-200 z-40 overflow-visible"
        style={{ height: 64 }}
      >
        <div className="flex items-center h-full overflow-visible">

          {/* Left items */}
          {LEFT_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive(item.href) ? 'text-[var(--color-primary)]' : 'text-gray-400'
              }`}
            >
              <span className="text-[22px] leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          ))}

          {/* ── Center column: arrow + dashboard stacked, both float up ── */}
          <div className="flex-1 flex justify-center overflow-visible">
            {/* This wrapper floats the whole group above the nav line */}
            <div
              className="flex flex-col items-center"
              style={{ marginTop: -36 }}
            >
              {/* ↑ arrow pill — opens drawer */}
              <button
                onClick={() => setOpen(true)}
                aria-label="Všechny sekce"
                className="flex items-center justify-center mb-1 active:scale-90 transition-transform"
              >
                <div
                  className="flex items-center gap-1 px-3 py-1 rounded-full"
                  style={{
                    background: open ? 'var(--color-primary)' : 'var(--color-primary-light)',
                    border: '1.5px solid var(--color-primary-mid)',
                  }}
                >
                  <span
                    className="text-[12px] font-bold leading-none"
                    style={{
                      color: open ? '#fff' : 'var(--color-primary)',
                      display: 'inline-block',
                      transition: 'transform 0.2s',
                      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ↑
                  </span>
                  <span
                    className="text-[10px] font-bold leading-none"
                    style={{ color: open ? '#fff' : 'var(--color-primary)' }}
                  >
                    Vše
                  </span>
                </div>
              </button>

              {/* Dashboard home button */}
              <Link href="/" className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform">
                <div
                  className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(145deg, var(--color-primary), var(--color-primary-mid))',
                    boxShadow: dashActive
                      ? '0 4px 20px rgba(30,75,142,0.45)'
                      : '0 3px 12px rgba(30,75,142,0.28)',
                    outline: dashActive ? '2.5px solid var(--color-primary-mid)' : 'none',
                    outlineOffset: 2,
                  }}
                >
                  <span className="text-[22px] leading-none">🏠</span>
                </div>
                <span
                  className="text-[10px] font-bold mt-0.5"
                  style={{ color: dashActive ? 'var(--color-primary)' : '#9ca3af' }}
                >
                  Dashboard
                </span>
              </Link>
            </div>
          </div>

          {/* Right items */}
          {RIGHT_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive(item.href) ? 'text-[var(--color-primary)]' : 'text-gray-400'
              }`}
            >
              <span className="text-[22px] leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          ))}

        </div>
      </nav>

      {open && <AppDrawer onClose={() => setOpen(false)} />}
    </>
  )
}
