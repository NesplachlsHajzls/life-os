'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { FloatingNoteButton } from './FloatingNoteButton'

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)
  const [authed,  setAuthed]  = useState(false)

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    // Timeout fallback — pokud getSession visí déle než 8s, přesměruj na login
    const timeout = setTimeout(() => {
      setChecked(true)
      if (pathname !== '/login') window.location.href = '/login'
    }, 8000)

    supabase.auth.getSession()
      .then(({ data }) => {
        clearTimeout(timeout)
        const loggedIn = !!data.session
        setAuthed(loggedIn)
        setChecked(true)
        if (!loggedIn && pathname !== '/login') {
          window.location.href = '/login'
        }
      })
      .catch(() => {
        clearTimeout(timeout)
        setChecked(true)
        if (pathname !== '/login') window.location.href = '/login'
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
      if (!session && pathname !== '/login') {
        window.location.href = '/login'
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [pathname])

  // Login page — bez chrome
  if (isLoginPage) return <>{children}</>

  // Auth check probíhá
  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F4F6FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[40px]">🌀</div>
          <div className="text-gray-400 text-[14px] animate-pulse">Načítám…</div>
        </div>
      </div>
    )
  }

  if (!authed) return null

  return (
    <>
      {/* ── PC layout (lg+): sidebar left + content right ── */}
      <div className="hidden lg:flex w-full min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F6FA]">
          {children}
        </main>
      </div>

      {/* ── Mobile layout: content + bottom nav ── */}
      <div className="lg:hidden flex flex-col flex-1" style={{ overflow: 'visible' }}>
        <main className="flex-1 overflow-y-auto pb-[80px]">
          {children}
        </main>
        <BottomNav />
      </div>

      {/* ── Global floating note button ── */}
      <FloatingNoteButton />
    </>
  )
}
