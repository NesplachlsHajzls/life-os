'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { fetchTasks, Task } from '@/features/todo/api'
import { fetchClients, fetchAllWorkTasks, Client } from '@/features/prace/api'
import { fetchEventsInRange, CalendarEvent } from '@/features/calendar/api'
import { loadFinanceData, insertExpense, insertIncome, Wallet } from '@/features/finance/api'
import { fetchRootNotes } from '@/features/notes/api'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { fetchCategories, AppCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'
import { AddTaskSheet } from '@/features/todo/components/AddTaskSheet'
import { AddExpenseSheet, AddIncomeSheet } from '@/features/finance/components/AddTransactionSheet'
import { AddEventModal } from '@/features/calendar/components/AddEventModal'
import { CatMap, DEFAULT_INC_CATS } from '@/features/finance/utils'
import { ICAIcon } from '@/components/ui/ICAIcon'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
const DASH_NOTE_KEY   = (uid: string) => `dash_note_${uid}`
const TILE_ORDER_KEY  = (uid: string) => `dash_tile_order_${uid}`

// ── Tile system ────────────────────────────────────────────────────

type TileId = 'todo' | 'calendar' | 'finance' | 'ica' | 'sport' | 'poznamky' | 'note'

interface TileConfig { id: TileId; visible: boolean }

const TILE_META: Record<TileId, { label: string; size: 'half' | 'full' }> = {
  todo:     { label: 'Úkoly',           size: 'half' },
  calendar: { label: 'Dnes',            size: 'half' },
  finance:  { label: 'Finance',         size: 'half' },
  ica:      { label: 'I.CA',            size: 'half' },
  sport:    { label: 'Tělo & Mysl',     size: 'half' },
  poznamky: { label: 'Poznámky',        size: 'half' },
  note:     { label: 'Rychlá poznámka', size: 'full'  },
}

const DEFAULT_TILE_ORDER: TileConfig[] = [
  { id: 'todo',     visible: true },
  { id: 'calendar', visible: true },
  { id: 'finance',  visible: true },
  { id: 'ica',      visible: true },
  { id: 'sport',    visible: true },
  { id: 'poznamky', visible: true },
  { id: 'note',     visible: true },
]

// Merge saved order with defaults (handles new tiles added later)
function mergeTileOrder(saved: TileConfig[]): TileConfig[] {
  const knownIds = new Set(saved.map(t => t.id))
  const merged = [...saved]
  for (const def of DEFAULT_TILE_ORDER) {
    if (!knownIds.has(def.id)) merged.push(def)
  }
  return merged
}

// ── Helpers ────────────────────────────────────────────────────────

function greet(): string {
  const h = new Date().getHours()
  if (h < 5)  return 'Dobrou noc'
  if (h < 10) return 'Dobré ráno'
  if (h < 13) return 'Dobré dopoledne'
  if (h < 18) return 'Dobré odpoledne'
  return 'Dobrý večer'
}

function todayLabel(): string {
  return new Date().toLocaleDateString('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

function fmtCZK(n: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency', currency: 'CZK', maximumFractionDigits: 0,
  }).format(n)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isToday(isoDatetime: string): boolean {
  return isoDatetime.startsWith(localDateStr())
}

const PRIORITY_COLORS: Record<number, string> = { 3: '#ef4444', 2: '#f59e0b', 1: '#3b82f6' }

// ── Tile component ────────────────────────────────────────────────

function Tile({
  href, title, icon, iconNode, accent = 'var(--color-primary)',
  children, badge, onAdd, editMode, dragProps,
}: {
  href: string
  title: string
  icon?: string
  iconNode?: React.ReactNode
  accent?: string
  children: React.ReactNode
  badge?: number
  onAdd?: () => void
  editMode?: boolean
  dragProps?: React.HTMLAttributes<HTMLDivElement>
}) {
  const header = (
    <div
      className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {iconNode ?? <span className="text-[18px] leading-none">{icon}</span>}
      <span className="text-[13px] font-bold flex-1 tracking-[-0.01em]"
        style={{ color: 'var(--text-primary)' }}>{title}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[11px] font-bold px-1.5 py-[1px] rounded-full"
          style={{ background: accent + '22', color: accent }}>
          {badge}
        </span>
      )}
      {!editMode && onAdd && (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onAdd() }}
          className="w-6 h-6 rounded-[7px] flex items-center justify-center text-[16px] font-bold transition-all active:scale-90 flex-shrink-0"
          style={{ background: accent + '20', color: accent }}
          title="Přidat"
        >
          +
        </button>
      )}
      {!editMode && (
        <span className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>›</span>
      )}
    </div>
  )

  const body = (
    <div className="px-4 py-3 flex flex-col gap-1.5 flex-1">
      {children}
    </div>
  )

  if (editMode) {
    return (
      <div
        className="rounded-[16px] flex flex-col overflow-hidden"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
        {...dragProps}
      >
        {header}
        {body}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="rounded-[16px] flex flex-col overflow-hidden active:scale-[0.97] transition-transform"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
    >
      {header}
      {body}
    </Link>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="text-[12px] italic py-1" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
}

// ── Finance type toggle ───────────────────────────────────────────

type FinanceModal = 'expense' | 'income' | null

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null
  const { hideAmounts } = usePrivacy()
  const amt = (n: number) => hideAmounts ? '••••' : fmtCZK(n)

  // ── Main data ─────────────────────────────────────────────────
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [clients,   setClients]   = useState<Client[]>([])
  const [workTasks, setWorkTasks] = useState<Task[]>([])
  const [events,    setEvents]    = useState<CalendarEvent[]>([])
  const [finance,   setFinance]   = useState<{ monthIncome: number; monthExpenses: number; balance: number } | null>(null)
  const [noteCount, setNoteCount] = useState<number | null>(null)

  // ── Dashboard note ────────────────────────────────────────────
  const [dashNote,  setDashNote]  = useState('')
  const [noteSaved, setNoteSaved] = useState(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!userId) return
    try {
      const saved = localStorage.getItem(DASH_NOTE_KEY(userId)) ?? ''
      setDashNote(saved)
    } catch {}
  }, [userId])

  function handleDashNoteChange(val: string) {
    setDashNote(val)
    setNoteSaved(false)
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => {
      try { localStorage.setItem(DASH_NOTE_KEY(userId!), val) } catch {}
      setNoteSaved(true)
    }, 600)
  }

  // ── Tile order & edit mode ────────────────────────────────────
  const [tileOrder, setTileOrder] = useState<TileConfig[]>(DEFAULT_TILE_ORDER)
  const [editMode,  setEditMode]  = useState(false)
  const [draggingId, setDraggingId] = useState<TileId | null>(null)
  const [dragOverId, setDragOverId] = useState<TileId | null>(null)

  // Load saved tile order
  useEffect(() => {
    if (!userId) return
    try {
      const raw = localStorage.getItem(TILE_ORDER_KEY(userId))
      if (raw) {
        const parsed = JSON.parse(raw) as TileConfig[]
        setTileOrder(mergeTileOrder(parsed))
      }
    } catch {}
  }, [userId])

  function saveTileOrder(order: TileConfig[]) {
    setTileOrder(order)
    if (!userId) return
    try { localStorage.setItem(TILE_ORDER_KEY(userId), JSON.stringify(order)) } catch {}
  }

  function toggleVisible(id: TileId) {
    saveTileOrder(tileOrder.map(t => t.id === id ? { ...t, visible: !t.visible } : t))
  }

  function handleDrop(targetId: TileId) {
    if (!draggingId || draggingId === targetId) return
    const newOrder = [...tileOrder]
    const fromIdx = newOrder.findIndex(t => t.id === draggingId)
    const toIdx   = newOrder.findIndex(t => t.id === targetId)
    const [removed] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, removed)
    saveTileOrder(newOrder)
    setDraggingId(null)
    setDragOverId(null)
  }

  function exitEdit() {
    setEditMode(false)
    setDraggingId(null)
    setDragOverId(null)
  }

  // ── Modal state ───────────────────────────────────────────────
  const [showAddTask,    setShowAddTask]    = useState(false)
  const [showAddEvent,   setShowAddEvent]   = useState(false)
  const [showAddFinance, setShowAddFinance] = useState<FinanceModal>(null)

  // ── Lazy-loaded modal data ────────────────────────────────────
  const [taskCats,   setTaskCats]   = useState<AppCategory[]>(DEFAULT_CATEGORIES)
  const [clientList, setClientList] = useState<{ id: string; name: string }[]>([])
  const [expCats,    setExpCats]    = useState<CatMap>({})
  const [incCats,    setIncCats]    = useState<CatMap>(DEFAULT_INC_CATS)
  const [wallets,    setWallets]    = useState<Wallet[]>([])
  const modalDataLoaded = useRef(false)

  async function loadModalData() {
    if (!userId || modalDataLoaded.current) return
    modalDataLoaded.current = true
    const [cats, cls, fin] = await Promise.allSettled([
      fetchCategories(userId),
      fetchClients(userId),
      loadFinanceData(userId),
    ])
    if (cats.status === 'fulfilled') setTaskCats(cats.value)
    if (cls.status === 'fulfilled')  setClientList(cls.value.map(c => ({ id: c.id, name: c.name })))
    if (fin.status === 'fulfilled') {
      setExpCats(fin.value.settings?.exp_cats ?? {})
      setWallets(fin.value.settings?.wallets ?? [])
    }
  }

  function openAddTask()                 { loadModalData(); setShowAddTask(true) }
  function openAddEvent()                { loadModalData(); setShowAddEvent(true) }
  function openAddFinance(t: FinanceModal) { loadModalData(); setShowAddFinance(t) }

  // ── Main data fetch ───────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const now  = new Date()
    const from = new Date(now.getTime() - 2 * 86400000).toISOString()
    const to   = new Date(now.getTime() + 2 * 86400000).toISOString()

    Promise.allSettled([
      fetchTasks(userId),
      fetchClients(userId),
      fetchAllWorkTasks(userId),
      fetchEventsInRange(userId, from, to),
      loadFinanceData(userId),
      fetchRootNotes(userId),
    ]).then(([rTasks, rClients, rWorkTasks, rEvents, rFinance, rNotes]) => {
      if (rTasks.status     === 'fulfilled') setTasks(rTasks.value)
      if (rClients.status   === 'fulfilled') setClients(rClients.value)
      if (rWorkTasks.status === 'fulfilled') setWorkTasks(rWorkTasks.value)
      if (rEvents.status    === 'fulfilled') setEvents(rEvents.value)
      if (rNotes.status     === 'fulfilled') setNoteCount(rNotes.value.length)
      if (rFinance.status   === 'fulfilled') {
        const { expenses, incomes, settings } = rFinance.value
        const thisMonth = new Date().toISOString().slice(0, 7)
        const monthExp = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0)
        const monthInc = incomes.filter(i => i.date.startsWith(thisMonth)).reduce((s, i) => s + i.amount, 0)
        const balance  = (settings?.wallets ?? []).reduce((s, w) => s + (w.balance ?? 0), 0)
        setFinance({ monthIncome: monthInc, monthExpenses: monthExp, balance })
        setExpCats(settings?.exp_cats ?? {})
        setWallets(settings?.wallets ?? [])
      }
    })
  }, [userId])

  // ── Derived ───────────────────────────────────────────────────
  const openTasks = useMemo(
    () => tasks.filter(t => t.status === 'open' && !t.client_id).slice(0, 3),
    [tasks]
  )
  const openTasksTotal = useMemo(
    () => tasks.filter(t => t.status === 'open' && !t.client_id).length,
    [tasks]
  )
  const todayEvents = useMemo(
    () => events.filter(ev => ev.is_all_day || isToday(ev.start_datetime)),
    [events]
  )
  const clientStats = useMemo(() => {
    const openWork = workTasks.filter(t => t.status === 'open')
    return clients
      .filter(c => c.status === 'Aktivní')
      .map(c => ({ client: c, count: openWork.filter(t => t.client_id === c.id).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [clients, workTasks])
  const totalOpenWork = useMemo(
    () => workTasks.filter(t => t.status === 'open').length,
    [workTasks]
  )

  // ── Tile content map ─────────────────────────────────────────

  function renderTileContent(id: TileId) {
    switch (id) {
      case 'todo':
        return openTasks.length === 0
          ? <Empty label="Žádné úkoly" />
          : <>
              {openTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-[13px]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: PRIORITY_COLORS[t.priority] ?? '#94a3b8' }} />
                  <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                  {t.due_date && (
                    <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(t.due_date + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
              {openTasksTotal > 3 && (
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>+{openTasksTotal - 3} dalších</div>
              )}
            </>

      case 'calendar':
        return todayEvents.length === 0
          ? <Empty label="Dnes žádné události" />
          : <>
              {todayEvents.slice(0, 3).map(ev => (
                <div key={ev.id} className="flex items-center gap-1.5 text-[13px]">
                  <span className="text-[11px] font-bold flex-shrink-0 w-10"
                    style={{ color: 'var(--color-primary)' }}>
                    {ev.is_all_day ? 'celý' : fmtTime(ev.start_datetime)}
                  </span>
                  <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                    {ev.emoji ? `${ev.emoji} ` : ''}{ev.title}
                  </span>
                </div>
              ))}
              {todayEvents.length > 3 && (
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>+{todayEvents.length - 3} dalších</div>
              )}
            </>

      case 'finance':
        return finance === null
          ? <Empty label="Načítám…" />
          : <>
              <div className="text-[20px] font-extrabold leading-none mt-0.5"
                style={{ color: 'var(--text-primary)' }}>
                {amt(finance.balance)}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>celkový zůstatek</div>
              <div className="flex gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-green-500">↑</span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{amt(finance.monthIncome)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-red-400">↓</span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{amt(finance.monthExpenses)}</span>
                </div>
              </div>
            </>

      case 'ica':
        return clientStats.length === 0
          ? <Empty label="Žádní aktivní klienti" />
          : <>
              {clientStats.map(({ client: c, count }) => (
                <div key={c.id} className="flex justify-between items-center text-[13px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[13px] flex-shrink-0">{c.icon}</span>
                    <span className="truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-[11px] font-semibold flex-shrink-0 ml-1"
                      style={{ color: 'var(--text-tertiary)' }}>{count}×</span>
                  )}
                </div>
              ))}
            </>

      case 'sport':
        return (
          <div className="flex flex-col gap-0.5">
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Pohyb, jídlo, nálada</div>
          </div>
        )

      case 'poznamky':
        return (
          <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {noteCount === null ? '…'
              : `${noteCount} ${noteCount === 1 ? 'poznámka' : noteCount < 5 ? 'poznámky' : 'poznámek'}`}
          </div>
        )

      case 'note':
        return (
          <textarea
            value={dashNote}
            onChange={e => handleDashNoteChange(e.target.value)}
            placeholder="Sem si piš co chceš — myšlenky, připomínky, nápady…"
            rows={4}
            onClick={e => e.stopPropagation()}
            className="w-full resize-none outline-none text-[14px] leading-relaxed"
            style={{ background: 'transparent', color: 'var(--text-primary)' }}
          />
        )
    }
  }

  // ── Tile props per id ─────────────────────────────────────────

  const TILE_PROPS: Record<TileId, {
    href: string
    icon?: string
    iconNode?: React.ReactNode
    accent: string
    badge?: number
    onAdd?: () => void
    extraHeader?: React.ReactNode
  }> = {
    todo:     { href: '/todo',      icon: '✅', accent: '#22c55e', badge: openTasksTotal,  onAdd: openAddTask },
    calendar: { href: '/kalendar',  icon: '📅', accent: '#6366f1', badge: todayEvents.length, onAdd: openAddEvent },
    finance:  { href: '/finance',   icon: '💰', accent: '#f59e0b', onAdd: () => openAddFinance('expense') },
    ica:      { href: '/prace',     iconNode: <ICAIcon size={22} />, accent: '#1D38A8', badge: totalOpenWork },
    sport:    { href: '/sport',     icon: '🏋️', accent: '#10b981' },
    poznamky: { href: '/poznamky',  icon: '💡', accent: '#8b5cf6' },
    note:     { href: '#',         icon: '📋', accent: 'var(--color-primary)' },
  }

  // ── Render tiles ─────────────────────────────────────────────
  // Group visible tiles into rows: consecutive 'half' tiles → 2-col grid; 'full' tiles → own row
  function renderTiles() {
    const visible = tileOrder.filter(t => t.visible)
    const rows: TileId[][] = []
    let halfBuf: TileId[] = []

    for (const tile of visible) {
      const size = TILE_META[tile.id].size
      if (size === 'half') {
        halfBuf.push(tile.id)
        if (halfBuf.length === 2) { rows.push([...halfBuf]); halfBuf = [] }
      } else {
        if (halfBuf.length > 0) { rows.push([...halfBuf]); halfBuf = [] }
        rows.push([tile.id])
      }
    }
    if (halfBuf.length > 0) rows.push([...halfBuf])

    return rows.map((row, ri) => {
      if (row.length === 1 && TILE_META[row[0]].size === 'full') {
        const id = row[0]
        const { href, icon, iconNode, accent } = TILE_PROPS[id]
        const meta = TILE_META[id]
        if (id === 'note') {
          return (
            <div key={id} className="rounded-[16px] overflow-hidden"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-center gap-2.5 px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[16px]">📋</span>
                <span className="text-[13px] font-bold flex-1" style={{ color: 'var(--text-primary)' }}>
                  Rychlá poznámka
                </span>
                <span className="text-[11px] transition-colors"
                  style={{ color: noteSaved ? 'var(--text-tertiary)' : '#f59e0b' }}>
                  {noteSaved ? 'Uloženo' : 'Ukládám…'}
                </span>
              </div>
              <div className="px-4 py-3">
                <textarea
                  value={dashNote}
                  onChange={e => handleDashNoteChange(e.target.value)}
                  placeholder="Sem si piš co chceš — myšlenky, připomínky, nápady…"
                  rows={4}
                  className="w-full resize-none outline-none text-[14px] leading-relaxed"
                  style={{ background: 'transparent', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )
        }
        return (
          <Link key={id} href={href}
            className="rounded-[16px] px-4 py-3.5 flex items-center justify-between active:scale-[0.97] transition-transform"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-center gap-2.5">
              {iconNode ?? <span className="text-[20px]">{icon}</span>}
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{meta.label}</div>
              </div>
            </div>
            <span className="text-[18px]" style={{ color: 'var(--text-tertiary)' }}>›</span>
          </Link>
        )
      }

      // 1-col or 2-col grid row
      return (
        <div key={ri} className={`grid gap-3 ${row.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {row.map(id => {
            const { href, icon, iconNode, accent, badge, onAdd } = TILE_PROPS[id]
            const meta = TILE_META[id]
            return (
              <Tile key={id} href={href} title={meta.label} icon={icon} iconNode={iconNode}
                accent={accent} badge={badge} onAdd={onAdd} editMode={false}>
                {renderTileContent(id)}
              </Tile>
            )
          })}
        </div>
      )
    })
  }

  // ── Edit mode tile list ───────────────────────────────────────
  function renderEditList() {
    return tileOrder.map((tile, idx) => {
      const meta  = TILE_META[tile.id]
      const props = TILE_PROPS[tile.id]
      const isDragOver = dragOverId === tile.id
      const isDragging = draggingId === tile.id

      return (
        <div
          key={tile.id}
          draggable
          onDragStart={() => setDraggingId(tile.id)}
          onDragOver={e => { e.preventDefault(); setDragOverId(tile.id) }}
          onDrop={() => handleDrop(tile.id)}
          onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
          className="rounded-[14px] flex items-center gap-3 px-4 py-3 transition-all"
          style={{
            background: 'var(--surface)',
            boxShadow: isDragOver ? '0 0 0 2px var(--color-primary)' : 'var(--shadow-md)',
            opacity: isDragging ? 0.4 : tile.visible ? 1 : 0.45,
            cursor: 'grab',
            transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
          }}
        >
          {/* Drag handle */}
          <div className="flex flex-col gap-[3px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
            {[0,1,2].map(i => (
              <div key={i} className="flex gap-[3px]">
                <div className="w-[3px] h-[3px] rounded-full" style={{ background: 'currentColor' }} />
                <div className="w-[3px] h-[3px] rounded-full" style={{ background: 'currentColor' }} />
              </div>
            ))}
          </div>

          {/* Icon */}
          {props.iconNode
            ? <div className="flex-shrink-0">{props.iconNode}</div>
            : <span className="text-[20px] leading-none flex-shrink-0">{props.icon}</span>
          }

          {/* Label */}
          <span className="flex-1 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {meta.label}
          </span>

          {/* Size badge */}
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}>
            {meta.size === 'half' ? '½' : '↔'}
          </span>

          {/* Visibility toggle */}
          <button
            onClick={() => toggleVisible(tile.id)}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-all active:scale-90"
            style={{
              background: tile.visible ? 'var(--color-primary)' : 'var(--surface-raised)',
              color: tile.visible ? '#fff' : 'var(--text-tertiary)',
            }}
            title={tile.visible ? 'Skrýt' : 'Zobrazit'}
          >
            {tile.visible
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            }
          </button>
        </div>
      )
    })
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Hero header */}
      <div className="px-5 pt-6 pb-5" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-tertiary)' }}>
              {capitalize(todayLabel())}
            </p>
            <h2 className="text-[24px] font-bold leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
              {greet()}, <span style={{ color: 'var(--color-primary)' }}>Martine</span>
            </h2>
          </div>

          {/* Edit mode toggle */}
          {editMode ? (
            <button
              onClick={exitEdit}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-bold transition-all active:scale-95"
              style={{ background: 'var(--color-primary)', color: '#fff' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Hotovo
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="mt-1 w-8 h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}
              title="Upravit dashboard"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Edit mode hint */}
        {editMode && (
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Přetahuj dlaždice pro změnu pořadí • Oko = skrýt/zobrazit
          </p>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {editMode ? renderEditList() : renderTiles()}
      </div>

      {/* ── Finance type picker ── */}
      {showAddFinance === null ? null : (
        <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-3 pointer-events-none">
          <div className="flex rounded-[12px] p-1 pointer-events-auto"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
            <button onClick={() => setShowAddFinance('expense')}
              className="px-4 py-1.5 rounded-[9px] text-[13px] font-bold transition-all"
              style={showAddFinance === 'expense'
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { color: 'var(--text-secondary)' }}>
              Výdaj
            </button>
            <button onClick={() => setShowAddFinance('income')}
              className="px-4 py-1.5 rounded-[9px] text-[13px] font-bold transition-all"
              style={showAddFinance === 'income'
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { color: 'var(--text-secondary)' }}>
              Příjem
            </button>
          </div>
        </div>
      )}

      {/* ── Add Task ── */}
      {showAddTask && userId && (
        <AddTaskSheet
          categories={taskCats}
          clients={clientList}
          onSave={async payload => {
            const { insertTask } = await import('@/features/todo/api')
            const t = await insertTask({ user_id: userId, status: 'open', done_at: null, ...payload })
            setTasks(prev => [t, ...prev])
          }}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {/* ── Add Event ── */}
      {showAddEvent && userId && (
        <AddEventModal
          defaultDate={new Date()}
          isWork={false}
          userId={userId}
          appCategories={taskCats}
          clients={clientList}
          onSave={ev => { setEvents(prev => [...prev, ev]); setShowAddEvent(false) }}
          onClose={() => setShowAddEvent(false)}
        />
      )}

      {/* ── Add Expense ── */}
      {showAddFinance === 'expense' && (
        <div className="fixed inset-0 z-50">
          <AddExpenseSheet
            expCats={expCats}
            wallets={wallets}
            onSave={async entry => {
              if (!userId) return
              const { insertExpense } = await import('@/features/finance/api')
              await insertExpense({ user_id: userId, ...entry })
              setFinance(prev => prev ? { ...prev, monthExpenses: prev.monthExpenses + entry.amount } : prev)
              setShowAddFinance(null)
            }}
            onClose={() => setShowAddFinance(null)}
          />
        </div>
      )}

      {/* ── Add Income ── */}
      {showAddFinance === 'income' && (
        <div className="fixed inset-0 z-50">
          <AddIncomeSheet
            incCats={incCats}
            onSave={async entry => {
              if (!userId) return
              const { insertIncome } = await import('@/features/finance/api')
              await insertIncome({ user_id: userId, ...entry })
              setFinance(prev => prev ? { ...prev, monthIncome: prev.monthIncome + entry.amount } : prev)
              setShowAddFinance(null)
            }}
            onClose={() => setShowAddFinance(null)}
          />
        </div>
      )}
    </>
  )
}
