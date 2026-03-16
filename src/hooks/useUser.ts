'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { cachedUser, setCachedUser } from '@/lib/authCache'

export function useUser() {
  // Initialize synchronously from cache — eliminates loading waterfall on page navigation
  const [user, setUser] = useState<User | null>(cachedUser ?? null)
  const [loading, setLoading] = useState(cachedUser === undefined)

  useEffect(() => {
    // Always subscribe to auth changes (handles login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setCachedUser(u)
      setUser(u)
      setLoading(false)
    })

    // Only fetch session if not yet cached (first page load)
    if (cachedUser === undefined) {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user ?? null
        setCachedUser(u)
        setUser(u)
        setLoading(false)
      })
    }

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
