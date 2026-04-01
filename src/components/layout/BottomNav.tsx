'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppDrawer } from './AppDrawer'

const LEFT_ITEMS = [
  { href: '/todo',    icon: '✅', label: 'Todo'    },
  { href: '/finance', icon: '💰', label: 'Finance' },
]
const RIGHT_ITEMS = [
  { href: '/kalendar', icon: '📅', label: 'Kalendář' },
  { href: '/prace',    icon: '💼', label: 'I.CA'     },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const dashActive = pathname === '/'

  // Double-click detection on dashboard button:
  // – single click → navigate to /
  // – double click → open drawer (native onDoubleClick, no delay on single tap)
  function handleDashClick() {
    router.push('/')
  }

  function handleDashDoubleClick(e: React.MouseEvent) {
    e.preventDefault()
    setOpen(true)
  }

  return (
    <>
      {/* Nav bar — overflow visible so center button can poke above */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-40 overflow-visible"
        style={{ height: 64, background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center h-full overflow-visible">

          {/* Left items */}
          {LEFT_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive(item.href) ? 'text-[var(--color-primary)]' : 'text-[var(--text-tertiary)]'
              }`}
            >
              <span className="text-[22px] leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          ))}

          {/* ── Center dashboard button ── */}
          <div className="flex-1 flex justify-center overflow-visible">
            <div
              className="flex flex-col items-center"
              style={{ marginTop: -20 }}
            >
              {/* Dashboard home button — single tap: go home, double tap: open drawer */}
              <button
                onClick={handleDashClick}
                onDoubleClick={handleDashDoubleClick}
                aria-label="Dashboard"
                className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform"
              >
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
                  style={{ color: dashActive ? 'var(--color-primary)' : 'var(--text-tertiary)' }}
                >
                  Dashboard
                </span>
              </button>
            </div>
          </div>

          {/* Right items */}
          {RIGHT_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive(item.href) ? 'text-[var(--color-primary)]' : 'text-[var(--text-tertiary)]'
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
