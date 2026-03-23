'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface PrivacyCtx {
  hideAmounts: boolean
  toggleHideAmounts: () => void
}

const PrivacyContext = createContext<PrivacyCtx>({
  hideAmounts: false,
  toggleHideAmounts: () => {},
})

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideAmounts, setHideAmounts] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('privacy_hide_amounts')
      if (saved === 'true') setHideAmounts(true)
    } catch {}
  }, [])

  function toggleHideAmounts() {
    setHideAmounts(prev => {
      const next = !prev
      try { localStorage.setItem('privacy_hide_amounts', String(next)) } catch {}
      return next
    })
  }

  return (
    <PrivacyContext.Provider value={{ hideAmounts, toggleHideAmounts }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  return useContext(PrivacyContext)
}

/** Renders amount string or •••• based on privacy mode */
export function masked(value: string, hide: boolean): string {
  return hide ? '••••' : value
}
