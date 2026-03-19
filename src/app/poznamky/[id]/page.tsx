'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import {
  fetchNote, fetchSubNotes, insertNote, updateNote, deleteNote,
  Note, NOTE_ICONS,
} from '@/features/notes/api'
import { fetchClientById } from '@/features/prace/api'
import { fetchCategories, AppCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

const DEMO_USER_ID  = '00000000-0000-0000-0000-000000000001'
const AUTOSAVE_MS   = 800

type SaveState = 'saved' | 'saving' | 'unsaved'

export default function NoteDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const noteId   = params.id as string
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null

  const [note,       setNote]       = useState<Note | null>(null)
  const [parent,     setParent]     = useState<Note | null>(null)
  const [subNotes,   setSubNotes]   = useState<Note[]>([])
  const [clientName, setClientName] = useState<string | null>(null)
  const [categories, setCategories] = useState<AppCategory[]>(DEFAULT_CATEGORIES)
  const [loading,    setLoading]    = useState(true)

  // Editable state
  const [title,    setTitle]    = useState('')
  const [content,  setContent]  = useState('')
  const [icon,     setIcon]     = useState('📝')
  const [category, setCategory] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')

  const [showIconPicker,   setShowIconPicker]   = useState(false)
  const [showCatPicker,    setShowCatPicker]    = useState(false)
  const [creating, setCreating] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty   = useRef(false)

  // ── Load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!noteId || !userId) return
    let cancelled = false
    Promise.all([
      fetchNote(noteId),
      fetchSubNotes(noteId),
      fetchCategories(userId),
    ]).then(([n, subs, cats]) => {
      if (cancelled) return
      if (!n) { router.push('/poznamky'); return }
      setNote(n)
      setTitle(n.title)
      setContent(n.content ?? '')
      setIcon(n.icon)
      setCategory(n.category ?? null)
      setSubNotes(subs)
      if (cats.length) setCategories(cats)
      setLoading(false)
      if (n.parent_id) fetchNote(n.parent_id).then(p => { if (!cancelled) setParent(p) })
      if (n.is_meeting && n.client_id) {
        fetchClientById(n.client_id).then(c => { if (!cancelled) setClientName(c?.name ?? null) })
      }
    })
    return () => { cancelled = true }
  }, [noteId, userId, router])

  // ── Autosave ─────────────────────────────────────────────────
  const scheduleSave = useCallback((
    newTitle: string, newContent: string, newIcon: string, newCat: string | null
  ) => {
    if (!note) return
    isDirty.current = true
    setSaveState('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        await updateNote(note.id, {
          title: newTitle || 'Nová poznámka',
          content: newContent,
          icon: newIcon,
          category: newCat,
        })
        setNote(prev => prev ? {
          ...prev, title: newTitle || 'Nová poznámka', content: newContent, icon: newIcon, category: newCat,
        } : prev)
        setSaveState('saved')
        isDirty.current = false
      } catch {
        setSaveState('unsaved')
      }
    }, AUTOSAVE_MS)
  }, [note])

  function handleTitleChange(val: string)    { setTitle(val);    scheduleSave(val,   content, icon, category) }
  function handleContentChange(val: string)  { setContent(val);  scheduleSave(title, val,     icon, category) }
  function handleIconChange(ic: string)      { setIcon(ic); setShowIconPicker(false); scheduleSave(title, content, ic, category) }
  function handleCategoryChange(id: string | null) {
    setCategory(id); setShowCatPicker(false); scheduleSave(title, content, icon, id)
  }

  useEffect(() => { return () => { if (saveTimer.current) clearTimeout(saveTimer.current) } }, [])

  // ── New sub-note ──────────────────────────────────────────────
  const handleNewSubNote = useCallback(async () => {
    if (!userId || !note || creating) return
    setCreating(true)
    try {
      const sub = await insertNote({
        user_id: userId, title: 'Nová podstránka', content: '',
        parent_id: note.id, client_id: note.client_id,
        is_meeting: false, meeting_date: null, icon: '📝', category: null,
      })
      router.push(`/poznamky/${sub.id}`)
    } catch { setCreating(false) }
  }, [userId, note, creating, router])

  // ── Delete ────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false)
  async function handleDelete() {
    if (!note) return
    await deleteNote(note.id)
    if (note.is_meeting && note.client_id) router.push(`/prace/${note.client_id}`)
    else if (note.parent_id) router.push(`/poznamky/${note.parent_id}`)
    else router.push('/poznamky')
  }

  async function handleDeleteSub(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    await deleteNote(id)
    setSubNotes(prev => prev.filter(s => s.id !== id))
  }

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[32px] animate-pulse">📝</div>
      </div>
    )
  }
  if (!note) return null

  const isMeeting = note.is_meeting && !!note.client_id
  const backHref  = isMeeting
    ? `/prace/${note.client_id}`
    : parent ? `/poznamky/${parent.id}` : '/poznamky'

  const activeCat = category ? categories.find(c => c.id === category) : null

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href={backHref}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-[18px] transition-colors flex-shrink-0">
          ←
        </Link>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 text-[12px] text-gray-400">
          {isMeeting ? (
            <>
              <Link href="/prace" className="hover:text-gray-600 flex-shrink-0">Práce</Link>
              {clientName && (<><span className="flex-shrink-0">/</span><Link href={`/prace/${note.client_id}`} className="hover:text-gray-600 truncate max-w-[140px]">{clientName}</Link></>)}
              <span className="flex-shrink-0">/</span>
              <span className="text-gray-600 font-semibold truncate">{title || 'Schůzka'}</span>
            </>
          ) : (
            <>
              <Link href="/poznamky" className="hover:text-gray-600 flex-shrink-0">Poznámky</Link>
              {parent && (<><span className="flex-shrink-0">/</span><Link href={`/poznamky/${parent.id}`} className="hover:text-gray-600 truncate max-w-[120px]">{parent.title}</Link></>)}
              <span className="flex-shrink-0">/</span>
              <span className="text-gray-600 font-semibold truncate">{title || 'Nová poznámka'}</span>
            </>
          )}
        </div>
        <div className="flex-shrink-0 text-[11px] font-medium">
          {saveState === 'saving'  && <span className="text-amber-400">Ukládám…</span>}
          {saveState === 'saved'   && <span className="text-gray-300">Uloženo</span>}
          {saveState === 'unsaved' && <span className="text-red-400">●</span>}
        </div>
        {note.is_meeting && (
          <span className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">🤝 Schůzka</span>
        )}
        <button onClick={() => setConfirmDelete(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-[16px]">
          🗑
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 max-w-[780px] w-full mx-auto px-4 lg:px-8 py-6 flex flex-col gap-4">

        {note.is_meeting && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400 font-semibold">Datum schůzky:</span>
            <input type="date" value={note.meeting_date ?? ''}
              onChange={e => { const val = e.target.value; setNote(prev => prev ? { ...prev, meeting_date: val } : prev); if (note) updateNote(note.id, { meeting_date: val || null }) }}
              className="text-[12px] bg-transparent border-none outline-none text-gray-600 font-semibold"
            />
          </div>
        )}

        {/* Icon + Title */}
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowIconPicker(v => !v)}
              className="text-[40px] hover:bg-gray-100 rounded-[12px] p-1 transition-colors leading-none" title="Změnit ikonu">
              {icon}
            </button>
            {showIconPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-[16px] shadow-2xl p-3 z-20 flex flex-wrap gap-1.5 w-[220px]"
                style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
                {NOTE_ICONS.map(ic => (
                  <button key={ic} onClick={() => handleIconChange(ic)}
                    className="text-[22px] w-9 h-9 rounded-[8px] hover:bg-gray-100 flex items-center justify-center transition-colors"
                    style={{ background: ic === icon ? 'var(--color-primary)' + '18' : undefined }}>
                    {ic}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input value={title} onChange={e => handleTitleChange(e.target.value)}
            placeholder="Nadpis…"
            className="flex-1 text-[28px] lg:text-[32px] font-extrabold text-gray-900 bg-transparent border-none outline-none placeholder-gray-200 leading-tight"
          />
        </div>

        {/* Category picker */}
        {!isMeeting && (
          <div className="relative">
            <button
              onClick={() => setShowCatPicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all border"
              style={activeCat
                ? { background: activeCat.color + '18', borderColor: activeCat.color + '40', color: activeCat.color }
                : { background: '#f3f4f6', borderColor: '#e5e7eb', color: '#9ca3af' }
              }
            >
              {activeCat ? <>{activeCat.icon} {activeCat.name}</> : '📦 Bez kategorie'}
              <span className="text-[10px] opacity-60">▾</span>
            </button>

            {showCatPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-[14px] shadow-xl border border-gray-100 p-2 z-20 flex flex-wrap gap-1.5 min-w-[240px]"
                style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
                <button onClick={() => handleCategoryChange(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold w-full text-left transition-all hover:bg-gray-50"
                  style={{ color: !category ? 'var(--color-primary)' : '#6b7280', background: !category ? 'var(--color-primary-light, #eff6ff)' : 'transparent' }}>
                  📦 Bez kategorie
                </button>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold w-full text-left transition-all"
                    style={{
                      background: category === cat.id ? cat.color + '18' : 'transparent',
                      color: category === cat.id ? cat.color : '#374151',
                    }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rich text editor */}
        <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <RichTextEditor
            value={content}
            onChange={handleContentChange}
            placeholder="Začni psát… Přidávej poznámky, myšlenky, zápisky ze schůzky…"
            minHeight={360}
            autoFocus={!note.content}
            className="px-3"
          />
        </div>

        {/* Sub-notes */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">
              Podstránky {subNotes.length > 0 && `(${subNotes.length})`}
            </span>
            <button onClick={handleNewSubNote} disabled={creating}
              className="text-[12px] font-bold px-3 py-1.5 rounded-[10px] text-white disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: 'var(--color-primary)' }}>
              + Nová podstránka
            </button>
          </div>
          {subNotes.length === 0 ? (
            <p className="text-[13px] text-gray-300 italic">Žádné podstránky. Stránky lze zanořovat jako v Notion.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {subNotes.map(sub => (
                <Link key={sub.id} href={`/poznamky/${sub.id}`}
                  className="group flex items-center gap-3 bg-white rounded-[12px] px-4 py-3 hover:shadow-sm transition-all"
                  style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                  <span className="text-[18px] flex-shrink-0">{sub.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-gray-800 truncate">{sub.title}</div>
                    {sub.content && <div className="text-[11px] text-gray-400 truncate">{sub.content.slice(0, 60)}</div>}
                  </div>
                  <button onClick={e => handleDeleteSub(sub.id, e)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all text-[14px]">
                    ×
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
          onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-[20px] p-6 mx-4 w-full max-w-[360px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-[18px] font-extrabold text-gray-900 mb-2">Smazat poznámku?</div>
            <p className="text-[13px] text-gray-500 mb-5">Smaže se i všechny podstránky. Tuto akci nelze vrátit.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
              <button onClick={handleDelete}
                className="flex-1 py-3 rounded-[14px] bg-red-500 text-white text-[14px] font-bold">Smazat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
