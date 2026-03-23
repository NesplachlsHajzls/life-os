'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface AppTab {
  id:          string
  href:        string   // root href (e.g. /prace) — used for matching
  currentHref: string   // last visited URL within this tab (e.g. /prace/123)
  label:       string
  icon:        string
}

interface TabsContextValue {
  tabs:    AppTab[]
  openTab: (href: string, label: string, icon: string) => void
  closeTab:(id: string) => void
}

const TabsContext = createContext<TabsContextValue>({
  tabs:    [],
  openTab: () => {},
  closeTab:() => {},
})

export function TabsProvider({ children }: { children: ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [tabs, setTabs] = useState<AppTab[]>([])

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_internal_tabs')
      if (saved) {
        const parsed = JSON.parse(saved) as AppTab[]
        // Back-compat: old tabs without currentHref
        setTabs(parsed.map(t => ({ ...t, currentHref: t.currentHref ?? t.href })))
      }
    } catch { /* ignore */ }
  }, [])

  // Persist to localStorage whenever tabs change
  useEffect(() => {
    try { localStorage.setItem('app_internal_tabs', JSON.stringify(tabs)) } catch { /* ignore */ }
  }, [tabs])

  // Track navigation: when pathname changes, update currentHref for the matching tab
  useEffect(() => {
    if (!pathname) return
    setTabs(prev => {
      let changed = false
      const next = prev.map(t => {
        const matches = t.href === '/'
          ? pathname === '/'
          : pathname === t.href || pathname.startsWith(t.href + '/')
        if (matches && t.currentHref !== pathname) {
          changed = true
          return { ...t, currentHref: pathname }
        }
        return t
      })
      return changed ? next : prev
    })
  }, [pathname])

  const openTab = useCallback((href: string, label: string, icon: string) => {
    setTabs(prev => {
      const existing = prev.find(t => t.href === href)
      if (existing) {
        // Navigate to where user last was in this tab
        router.push(existing.currentHref)
        return prev
      }
      const newTab: AppTab = { id: `${href}_${Date.now()}`, href, currentHref: href, label, icon }
      router.push(href)
      return [...prev, newTab]
    })
  }, [router])

  const closeTab = useCallback((id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <TabsContext.Provider value={{ tabs, openTab, closeTab }}>
      {children}
    </TabsContext.Provider>
  )
}

export function useTabs() {
  return useContext(TabsContext)
}
