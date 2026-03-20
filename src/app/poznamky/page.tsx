'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import { fetchRootNotes, insertNote, deleteNote, Note } from '@/features/notes/api'
import { fetchCategories, AppCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'
import { fetchClients, Client } from '@/features/prace/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

function fmtRelative(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  <  1) return 'Právě teď'
  if (mins  < 60) return `Před ${mins} min`
  if (hours < 24) return `Před ${hours} h`
  if (days  <  7) return `Před ${days} d`
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export default function PoznamkyPage() {
  const router   = useRouter()
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null

  const [notes,      setNotes]      = useState<Note[]>([])
  const [categories, setCategories] = useState<AppCategory[]>(DEFAULT_CATEGORIES)
  const [clients,    setClients]    = useState<Client[]>([])
  const [activeCat,  setActiveCat]  = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [creating,   setCreating]   = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    Promise.all([fetchRootNotes(userId), fetchCategories(userId), fetchClients(userId)])
      .then(([data, cats, cls]) => {
        if (cancelled) return
        setNotes(data)
        if (cats.length) setCategories(cats)
        setClients(cls)
        setLoading(false)
      }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const handleNewNote = useCallback(async () => {
    if (!userId || creating) return
    setCreating(true)
    try {
      const note = await insertNote({
        user_id: userId, title: 'Nová poznámka', content: '',
        parent_id: null, client_id: null, is_meeting: false,
        meeting_date: null, icon: '📝',
        category: activeCat === '__none__' ? null : activeCat,
      })
      router.push(`/poznamky/${note.id}`)
    } catch {
      setCreating(false)
    }
  }, [userId, creating, router, activeCat])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    await deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }, [])

  const filtered = notes.filter(n => {
    if (activeCat === '__none__' && n.category) return false
    if (activeCat && activeCat !== '__none__' && n.category !== activeCat) return false
    if (search) {
      const q = search.toLowerCase()
      if (!n.title.toLowerCase().includes(q) && !stripHtml(n.content ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const countByCat = (id: string) => notes.filter(n => n.category === id).length
  const uncategorised = notes.filter(n => !n.category).length

  return (
    <>
      <Header title="📝 Poznámky" />
      <div className="p-4 lg:p-6">

        {/* Toolbar */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              className="w-full bg-white border border-gray-200 rounded-[12px] pl-9 pr-4 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]"
              placeholder="Hledat v poznámkách…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            />
          </div>
          <button onClick={handleNewNote} disabled={creating}
            className="px-4 py-2.5 rounded-[12px] text-[13px] font-bold text-white flex-shrink-0 disabled:opacity-60"
            style={{ background: 'var(--color-primary)' }}>
            {creating ? '…' : '+ Nová'}
          </button>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto mb-5 pb-0.5" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCat(null)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
            style={{ background: activeCat === null ? 'var(--color-primary)' : '#f3f4f6', color: activeCat === null ? '#fff' : '#6b7280' }}
          >
            Vše <span className="text-[10px] opacity-70">{notes.length}</span>
          </button>
          {categories.map(cat => {
            const count = countByCat(cat.id)
            const isActive = activeCat === cat.id
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
                style={{ background: isActive ? cat.color : cat.color + '18', color: isActive ? '#fff' : cat.color }}
              >
                {cat.icon} {cat.name}
                {count > 0 && <span className="text-[10px] opacity-80">{count}</span>}
              </button>
            )
          })}
          {uncategorised > 0 && (
            <button onClick={() => setActiveCat('__none__')}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
              style={{ background: activeCat === '__none__' ? '#94a3b8' : '#f3f4f6', color: activeCat === '__none__' ? '#fff' : '#94a3b8' }}
            >
              📦 Bez kategorie <span className="text-[10px] opacity-70">{uncategorised}</span>
            </button>
          )}
        </div>

        {/* Notes grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Načítám…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[48px] mb-3">📝</div>
            <p className="text-[15px] font-bold text-gray-500 mb-1">
              {search || activeCat ? 'Nic nenalezeno' : 'Zatím žádné poznámky'}
            </p>
            {!search && !activeCat && (
              <p className="text-[13px] text-gray-400 mt-1">Klikni na &quot;+ Nová&quot; nebo stiskni ✏️ kdekoliv v appce</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(note => {
              const cat    = note.category  ? categories.find(c => c.id === note.category)  : null
              const client = note.client_id ? clients.find(c => c.id === note.client_id)    : null
              return (
                <Link key={note.id} href={`/poznamky/${note.id}`}
                  className="group bg-white rounded-[16px] p-4 hover:shadow-md transition-all relative"
                  style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <button onClick={e => handleDelete(note.id, e)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 text-[16px]">
                    ×
                  </button>
                  <div className="flex items-start gap-3">
                    <span className="text-[24px] flex-shrink-0 mt-0.5">{note.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-gray-900 truncate pr-6">{note.title}</div>
                      {note.content ? (
                        <div className="text-[12px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                          {stripHtml(note.content).slice(0, 120)}
                        </div>
                      ) : (
                        <div className="text-[12px] text-gray-300 mt-0.5 italic">Prázdná poznámka…</div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[11px] text-gray-300">{fmtRelative(note.updated_at)}</span>
                        {cat && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px]"
                            style={{ background: cat.color + '18', color: cat.color }}>
                            {cat.icon} {cat.name}
                          </span>
                        )}
                        {client && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px]"
                            style={{ background: client.color + '18', color: client.color }}>
                            {client.icon} {client.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
