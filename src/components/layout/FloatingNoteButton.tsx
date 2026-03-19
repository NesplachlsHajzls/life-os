'use client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { insertNote } from '@/features/notes/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export function FloatingNoteButton() {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null

  const [loading, setLoading] = useState(false)

  // useCallback musí být před jakýmkoliv podmíněným returnem (pravidlo hooks)
  const handleCreate = useCallback(async () => {
    if (!userId || loading) return
    setLoading(true)
    try {
      const note = await insertNote({
        user_id: userId, title: 'Nová poznámka', content: '',
        parent_id: null, client_id: null, is_meeting: false,
        meeting_date: null, icon: '📝', category: null,
      })
      router.push(`/poznamky/${note.id}`)
    } catch {
      setLoading(false)
    }
  }, [userId, loading, router])

  // Zobrazit pouze na dashboardu — na ostatních stránkách má každá sekce vlastní tlačítko přidání
  if (pathname !== '/') return null

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      title="Nová poznámka"
      className="fixed z-40 flex items-center justify-center rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-60"
      style={{
        width: 52, height: 52,
        background: 'var(--color-primary)',
        // Na mobilu: nad bottom navem (bottom nav je 64px + 16px)
        // Na PC: v pravém dolním rohu
        bottom: 'calc(64px + 20px)',
        right: 20,
      }}>
      <span className="text-[22px] leading-none">{loading ? '…' : '✏️'}</span>
      {/* Na PC label vedle */}
      <style>{`
        @media (min-width: 1024px) {
          .fab-note-btn { bottom: 28px !important; }
        }
      `}</style>
    </button>
  )
}
