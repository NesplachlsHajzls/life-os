'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import { usePrace } from '@/features/prace/hooks/usePrace'
import { CLIENT_COLORS, CLIENT_ICONS, CLIENT_STATUSES, ClientStatus, SUBJECT_TYPES, SubjectType, SUBJECT_TYPE_COLORS, FIRST_MEETING_COLORS } from '@/features/prace/api'
import { fetchNoteCountsByClient } from '@/features/notes/api'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

const STATUS_COLORS: Record<string, string> = {
  'Potenciální': '#f59e0b',
  'Aktivní':     '#10b981',
  'Pozastavený': '#94a3b8',
  'Ukončený':    '#ef4444',
}

export default function PracePage() {
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null

  const { loading, toast, clients, openTasks, dueThisWeek, deals, addClient, getClientOpenTasks } = usePrace(userId)

  useScrollRestoration('prace', !loading)

  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!userId) return
    fetchNoteCountsByClient(userId).then(setNoteCounts).catch(() => {})
  }, [userId])

  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<ClientStatus | 'Vše'>('Vše')
  const [subjectFilter, setSubjectFilter] = useState<SubjectType | 'Vše'>('Vše')
  const [krajFilter,    setKrajFilter]    = useState<Set<string>>(new Set())

  // Restore filters from localStorage after hydration (lazy init doesn't work in Next.js SSR)
  useEffect(() => {
    try {
      const s = localStorage.getItem('prace_status_filter')
      if (s) setStatusFilter(s as ClientStatus | 'Vše')
      const t = localStorage.getItem('prace_subject_filter')
      if (t) setSubjectFilter(t as SubjectType | 'Vše')
      const k = localStorage.getItem('prace_kraj_filter')
      if (k) setKrajFilter(new Set(JSON.parse(k) as string[]))
    } catch {}
  }, [])
  const [showAdd,      setShowAdd]      = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newColor,     setNewColor]     = useState(CLIENT_COLORS[0])
  const [newIcon,      setNewIcon]      = useState('💼')
  const [newStatus,    setNewStatus]    = useState<ClientStatus>('Aktivní')

  // ── Drag-to-scroll for kraj filter ──────────────────────────────
  const krajScrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0, moved: false })

  const onKrajMouseDown = useCallback((e: React.MouseEvent) => {
    const el = krajScrollRef.current
    if (!el) return
    dragState.current = { dragging: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [])

  const onKrajMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.dragging) return
    const el = krajScrollRef.current
    if (!el) return
    const dx = e.clientX - dragState.current.startX
    if (Math.abs(dx) > 3) dragState.current.moved = true
    el.scrollLeft = dragState.current.scrollLeft - dx
  }, [])

  const onKrajMouseUp = useCallback(() => {
    const el = krajScrollRef.current
    if (el) { el.style.cursor = 'grab'; el.style.userSelect = '' }
    dragState.current.dragging = false
  }, [])

  function toggleKraj(k: string) {
    // Prevent toggling when user just dragged
    if (dragState.current.moved) { dragState.current.moved = false; return }
    setKrajFilter(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      try { localStorage.setItem('prace_kraj_filter', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  async function handleAdd() {
    if (!newName.trim()) return
    await addClient(newName.trim(), newColor, newIcon, newStatus)
    setNewName(''); setNewColor(CLIENT_COLORS[0]); setNewIcon('💼'); setNewStatus('Aktivní')
    setShowAdd(false)
  }

  // Extract kraj value from tags (stored as "kraj:Praha" etc.)
  function getKraj(tags: string[]): string | null {
    const t = tags.find(t => t.startsWith('kraj:'))
    return t ? t.slice(5) : null
  }

  // Collect all unique kraj values present in the data
  const availableKraje = useMemo(() => {
    const krajSet = new Set<string>()
    clients.forEach(c => {
      const k = getKraj(c.tags ?? [])
      if (k) krajSet.add(k)
    })
    return Array.from(krajSet).sort()
  }, [clients])

  const filtered = useMemo(() => {
    return clients
      .filter(c => statusFilter === 'Vše' || c.status === statusFilter)
      .filter(c => subjectFilter === 'Vše' || c.subject_type === subjectFilter)
      .filter(c => krajFilter.size === 0 || krajFilter.has(getKraj(c.tags ?? []) ?? ''))
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
  }, [clients, search, statusFilter, subjectFilter, krajFilter])

  const activeDeals = deals.filter(d => d.stage !== 'Uzavřen' && d.stage !== 'Ztracen')
  const totalDealValue = activeDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <>
      <Header title="Práce" />

      <div className="p-4 lg:p-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Klienti',       value: clients.length,      icon: '👥' },
            { label: 'Otevřené úkoly',value: openTasks.length,    icon: '📋' },
            { label: 'Aktivní obchody',value: activeDeals.length, icon: '💰' },
            { label: 'Tento týden',   value: dueThisWeek.length,  icon: '📅' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--surface)] rounded-[14px] px-4 py-3 flex items-center gap-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <span className="text-[22px]">{s.icon}</span>
              <div>
                <div className="text-[20px] font-extrabold text-[var(--text-primary)] leading-tight">{s.value}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Row 1: Search + Pipeline + Add */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[15px]">🔍</span>
              <input
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[12px] pl-9 pr-4 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]"
                placeholder="Hledat klienta…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              />
            </div>
            <Link href="/prace/pipeline"
              className="px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg)] transition-colors whitespace-nowrap flex-shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              📊 Pipeline
            </Link>
            <Link href="/prace/import"
              className="px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg)] transition-colors whitespace-nowrap flex-shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              📥 Import
            </Link>
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2.5 rounded-[12px] text-[13px] font-bold text-white whitespace-nowrap flex-shrink-0"
              style={{ background: 'var(--color-primary)' }}>
              + Přidat
            </button>
          </div>

          {/* Row 2: Status filter */}
          <div className="flex gap-2 overflow-x-auto items-center" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide flex-shrink-0">Status:</span>
            {(['Vše', ...CLIENT_STATUSES] as const).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); try { localStorage.setItem('prace_status_filter', s) } catch {} }}
                className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold whitespace-nowrap transition-all"
                style={{
                  background: statusFilter === s ? (s === 'Vše' ? 'var(--color-primary)' : STATUS_COLORS[s]) : 'var(--surface-raised)',
                  color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Row 3: Subject type filter */}
          <div className="flex gap-2 overflow-x-auto items-center" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide flex-shrink-0">Typ:</span>
            <button onClick={() => { setSubjectFilter('Vše'); try { localStorage.setItem('prace_subject_filter', 'Vše') } catch {} }}
              className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold whitespace-nowrap transition-all"
              style={{ background: subjectFilter === 'Vše' ? 'var(--color-primary)' : 'var(--surface-raised)', color: subjectFilter === 'Vše' ? '#fff' : 'var(--text-secondary)' }}>
              Vše
            </button>
            {SUBJECT_TYPES.map(t => (
              <button key={t} onClick={() => { setSubjectFilter(t); try { localStorage.setItem('prace_subject_filter', t) } catch {} }}
                className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold whitespace-nowrap transition-all"
                style={{
                  background: subjectFilter === t ? SUBJECT_TYPE_COLORS[t] : SUBJECT_TYPE_COLORS[t] + '15',
                  color: subjectFilter === t ? '#fff' : SUBJECT_TYPE_COLORS[t],
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Row 4: Kraj filter — only shown when there are clients with kraj tags */}
          {availableKraje.length > 0 && (
            <div
              ref={krajScrollRef}
              className="flex gap-2 overflow-x-auto items-center select-none"
              style={{ scrollbarWidth: 'none', cursor: 'grab' }}
              onMouseDown={onKrajMouseDown}
              onMouseMove={onKrajMouseMove}
              onMouseUp={onKrajMouseUp}
              onMouseLeave={onKrajMouseUp}
            >
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide flex-shrink-0">Kraj:</span>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => { setKrajFilter(new Set()); try { localStorage.setItem('prace_kraj_filter', '[]') } catch {} }}
                className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={{ background: krajFilter.size === 0 ? 'var(--color-primary)' : 'var(--surface-raised)', color: krajFilter.size === 0 ? '#fff' : 'var(--text-secondary)' }}>
                Vše
              </button>
              {availableKraje.map(k => (
                <button key={k}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => toggleKraj(k)}
                  className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                  style={{
                    background: krajFilter.has(k) ? 'var(--color-primary)' : 'var(--color-primary-light)',
                    color: krajFilter.has(k) ? '#fff' : 'var(--color-primary-mid)',
                    outline: krajFilter.has(k) ? '2px solid var(--color-primary)' : 'none',
                    outlineOffset: '1px',
                  }}>
                  📍 {k}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Client list */}
        {loading ? (
          <div className="text-center py-12 text-[var(--text-tertiary)]">Načítám…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[40px] mb-2">🔍</div>
            <p className="text-[14px] font-semibold text-[var(--text-secondary)]">{search ? 'Žádný klient nenalezen' : 'Zatím žádní klienti'}</p>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {/* Table header */}
            <div className="hidden lg:grid grid-cols-[2fr_160px_80px_80px_80px_80px_40px] gap-4 px-5 py-3 border-b border-[var(--border)] text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
              <span>Klient</span>
              <span>Kontakt</span>
              <span className="text-center">Úkoly</span>
              <span className="text-center">Obchody</span>
              <span className="text-center">Pozn.</span>
              <span>Status</span>
              <span />
            </div>

            {filtered.map((client, i) => {
              const openCount  = getClientOpenTasks(client.id).length
              const dealCount  = deals.filter(d => d.client_id === client.id && d.stage !== 'Uzavřen' && d.stage !== 'Ztracen').length
              const noteCount  = noteCounts[client.id] ?? 0
              const subjColor  = client.subject_type ? SUBJECT_TYPE_COLORS[client.subject_type] : null

              return (
                <Link key={client.id} href={`/prace/${client.id}`}
                  className={`flex lg:grid lg:grid-cols-[2fr_160px_80px_80px_80px_80px_40px] items-center gap-3 lg:gap-4 px-5 py-3.5 hover:bg-[var(--bg)] transition-colors ${i < filtered.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>

                  {/* Name + icon + badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[17px] flex-shrink-0"
                      style={{ background: client.color + '18', borderLeft: `3px solid ${client.color}` }}>
                      {client.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-[var(--text-primary)] truncate">{client.name}</div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {client.subject_type && subjColor && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px]"
                            style={{ background: subjColor + '18', color: subjColor }}>
                            {client.subject_type}
                          </span>
                        )}
                        {(() => {
                          const k = getKraj(client.tags ?? [])
                          return k ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px]" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-mid)' }}>
                              📍 {k}
                            </span>
                          ) : client.is_prague ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px]" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-mid)' }}>
                              🏙️ Praha
                            </span>
                          ) : null
                        })()}
                        {!client.subject_type && !getKraj(client.tags ?? []) && !client.is_prague && client.address && (
                          <span className="text-[11px] text-[var(--text-tertiary)] truncate hidden lg:block">{client.address}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="hidden lg:block min-w-0">
                    {client.phone && <div className="text-[12px] text-[var(--text-secondary)] truncate">📞 {client.phone}</div>}
                    {client.email && <div className="text-[12px] text-[var(--text-tertiary)] truncate">✉️ {client.email}</div>}
                    {!client.phone && !client.email && <span className="text-[12px] text-[var(--text-tertiary)]">—</span>}
                  </div>

                  {/* Open tasks */}
                  <div className="hidden lg:flex justify-center">
                    {openCount > 0
                      ? <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-mid)' }}>{openCount}</span>
                      : <span className="text-[12px] text-[var(--text-tertiary)]">—</span>}
                  </div>

                  {/* Active deals */}
                  <div className="hidden lg:flex justify-center">
                    {dealCount > 0
                      ? <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{dealCount}</span>
                      : <span className="text-[12px] text-[var(--text-tertiary)]">—</span>}
                  </div>

                  {/* Notes count */}
                  <div className="hidden lg:flex justify-center">
                    {noteCount > 0
                      ? <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">📝 {noteCount}</span>
                      : <span className="text-[12px] text-[var(--text-tertiary)]">—</span>}
                  </div>

                  {/* Status + first meeting dot */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: STATUS_COLORS[client.status] + '18', color: STATUS_COLORS[client.status] }}>
                      {client.status}
                    </span>
                    {client.first_meeting_status && (
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: FIRST_MEETING_COLORS[client.first_meeting_status] }}
                        title={client.first_meeting_status === 'done' ? 'Byl jsem' : client.first_meeting_status === 'scheduled' ? 'Čeká mě' : 'Ještě ne'}
                      />
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="hidden lg:flex justify-center text-[var(--text-tertiary)] text-[16px]">→</div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Count */}
        {!loading && filtered.length > 0 && (
          <p className="text-[12px] text-[var(--text-tertiary)] text-center mt-3">
            {filtered.length} z {clients.length} klientů
          </p>
        )}
      </div>

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="bg-[var(--surface)] rounded-[24px] p-6 w-full shadow-2xl mx-4" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-[var(--text-primary)]">👥 Nový klient</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Název *</label>
                <input className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]"
                  value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Název firmy nebo klienta" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {CLIENT_STATUSES.map(s => (
                    <button key={s} onClick={() => setNewStatus(s)}
                      className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
                      style={{ background: newStatus === s ? STATUS_COLORS[s] : STATUS_COLORS[s] + '15', color: newStatus === s ? '#fff' : STATUS_COLORS[s] }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Ikona</label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_ICONS.map(icon => (
                    <button key={icon} onClick={() => setNewIcon(icon)}
                      className="w-9 h-9 rounded-[10px] text-[18px] flex items-center justify-center transition-all"
                      style={{ background: newIcon === icon ? newColor + '20' : 'var(--surface-raised)', border: `2px solid ${newIcon === icon ? newColor : 'transparent'}` }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Barva</label>
                <div className="flex gap-2 flex-wrap">
                  {CLIENT_COLORS.map(color => (
                    <button key={color} onClick={() => setNewColor(color)}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{ background: color, border: '2px solid white', outline: newColor === color ? `3px solid ${color}` : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-[12px]" style={{ background: newColor + '10' }}>
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[16px]" style={{ background: newColor + '20' }}>{newIcon}</div>
                <span className="text-[14px] font-bold" style={{ color: newColor }}>{newName || 'Náhled klienta'}</span>
                <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: STATUS_COLORS[newStatus] + '20', color: STATUS_COLORS[newStatus] }}>{newStatus}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">Zrušit</button>
                <button onClick={handleAdd} disabled={!newName.trim()}
                  className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
                  style={{ background: newColor }}>Přidat klienta</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 bg-[var(--surface-raised)] text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </>
  )
}
