'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface AppTab {
  id:    string
  href:  string
  label: string
  icon:  string
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
  const router = useRouter()
  const [tabs, setTabs] = useState<AppTab[]>([])

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_internal_tabs')
      if (saved) setTabs(JSON.parse(saved) as AppTab[])
    } catch { /* ignore */ }
  }, [])

  // Persist to localStorage whenever tabs change
  useEffect(() => {
    try { localStorage.setItem('app_internal_tabs', JSON.stringify(tabs)) } catch { /* ignore */ }
  }, [tabs])

  const openTab = useCallback((href: string, label: string, icon: string) => {
    setTabs(prev => {
      // Don't duplicate — just navigate if already open
      if (prev.some(t => t.href === href)) {
        router.push(href)
        return prev
      }
      const newTab: AppTab = { id: `${href}_${Date.now()}`, href, label, icon }
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
