'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cachedUser, setCachedUser } from '@/lib/authCache'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { FloatingNoteButton } from './FloatingNoteButton'
import { TabBar } from './TabBar'
import { TabsProvider } from '@/contexts/TabsContext'

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // If cache is populated we already know auth state — skip the spinner entirely
  const [checked, setChecked] = useState(cachedUser !== undefined)
  const [authed,  setAuthed]  = useState(cachedUser !== null && cachedUser !== undefined)

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    // If already known from cache, nothing to do (onAuthStateChange handles future changes)
    if (cachedUser !== undefined) {
      if (!cachedUser && pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    // Timeout fallback — reduced from 8s to 3s
    const timeout = setTimeout(() => {
      setChecked(true)
      if (pathname !== '/login') window.location.href = '/login'
    }, 3000)

    supabase.auth.getSession()
      .then(({ data }) => {
        clearTimeout(timeout)
        const loggedIn = !!data.session
        const u = data.session?.user ?? null
        setCachedUser(u)
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
      const u = session?.user ?? null
      setCachedUser(u)
      setAuthed(!!session)
      setChecked(true)
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

  // Auth check probíhá — only shown on FIRST load (subsequent navigations skip this)
  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-[40px]">🌀</div>
          <div className="text-[var(--text-tertiary)] text-[14px] animate-pulse">Načítám…</div>
        </div>
      </div>
    )
  }

  if (!authed) return null

  return (
    <TabsProvider>
      {/* ── PC layout (lg+): sidebar left + content right ── */}
      <div className="hidden lg:flex w-full min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Interní záložkový pruh — zobrazí se jen pokud jsou otevřené záložky */}
          <TabBar />
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
            {children}
          </main>
        </div>
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
    </TabsProvider>
  )
}
