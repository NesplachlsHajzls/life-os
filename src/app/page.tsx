'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { fetchTasks, Task } from '@/features/todo/api'
import { fetchClients, fetchAllWorkTasks, Client } from '@/features/prace/api'
import { fetchEventsInRange, CalendarEvent, insertEvent } from '@/features/calendar/api'
import { loadFinanceData, insertExpense, insertIncome, Wallet } from '@/features/finance/api'
import { fetchRootNotes } from '@/features/notes/api'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { fetchCategories, AppCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'
import { AddTaskSheet } from '@/features/todo/components/AddTaskSheet'
import { AddExpenseSheet, AddIncomeSheet } from '@/features/finance/components/AddTransactionSheet'
import { AddEventModal } from '@/features/calendar/components/AddEventModal'
import { CatMap, DEFAULT_INC_CATS } from '@/features/finance/utils'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
const DASH_NOTE_KEY = (uid: string) => `dash_note_${uid}`

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

// ── Tile ──────────────────────────────────────────────────────────

function Tile({ href, title, icon, accent = 'var(--color-primary)', children, badge, onAdd }: {
  href: string
  title: string
  icon: string
  accent?: string
  children: React.ReactNode
  badge?: number
  onAdd?: () => void
}) {
  return (
    <Link
      href={href}
      className="rounded-[16px] flex flex-col overflow-hidden active:scale-[0.97] transition-transform"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
    >
      <div
        className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-[18px] leading-none">{icon}</span>
        <span className="text-[13px] font-bold flex-1 tracking-[-0.01em]"
          style={{ color: 'var(--text-primary)' }}>{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="text-[11px] font-bold px-1.5 py-[1px] rounded-full"
            style={{ background: accent + '22', color: accent }}>
            {badge}
          </span>
        )}
        {onAdd && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onAdd() }}
            className="w-6 h-6 rounded-[7px] flex items-center justify-center text-[16px] font-bold transition-all active:scale-90 flex-shrink-0"
            style={{ background: accent + '20', color: accent }}
            title="Přidat"
          >
            +
          </button>
        )}
        <span className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>›</span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-1.5 flex-1">
        {children}
      </div>
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
  const [dashNote,    setDashNote]    = useState('')
  const [noteSaved,   setNoteSaved]   = useState(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Load note from localStorage when userId is known
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
      setIncCats({})  // income cats use defaults from utils
      setWallets(fin.value.settings?.wallets ?? [])
    }
  }

  function openAddTask() { loadModalData(); setShowAddTask(true) }
  function openAddEvent() { loadModalData(); setShowAddEvent(true) }
  function openAddFinance(type: FinanceModal) { loadModalData(); setShowAddFinance(type) }

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
        // Pre-fill finance modal data too
        setExpCats(settings?.exp_cats ?? {})
        setIncCats({})  // income cats use defaults from utils
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

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Hero header */}
      <div className="px-5 pt-6 pb-5" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-tertiary)' }}>
          {capitalize(todayLabel())}
        </p>
        <h2 className="text-[24px] font-bold leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>
          {greet()}, <span style={{ color: 'var(--color-primary)' }}>Martine</span>
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-3">

        {/* ── 2×2 grid ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* ÚKOLY */}
          <Tile
            href="/todo" title="Úkoly" icon="✅"
            accent="#22c55e"
            badge={openTasksTotal}
            onAdd={openAddTask}
          >
            {openTasks.length === 0
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
            }
          </Tile>

          {/* KALENDÁŘ */}
          <Tile
            href="/kalendar" title="Dnes" icon="📅"
            accent="#6366f1"
            badge={todayEvents.length}
            onAdd={openAddEvent}
          >
            {todayEvents.length === 0
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
            }
          </Tile>

          {/* FINANCE */}
          <Tile href="/finance" title="Finance" icon="💰" accent="#f59e0b"
            onAdd={() => openAddFinance('expense')}
          >
            {finance === null
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
            }
          </Tile>

          {/* PRÁCE */}
          <Tile
            href="/prace" title="Práce" icon="💼"
            accent="#8b5cf6"
            badge={totalOpenWork}
          >
            {clientStats.length === 0
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
            }
          </Tile>
        </div>

        {/* ── Quick links row ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/sport"
            className="rounded-[16px] px-4 py-3.5 flex items-center justify-between active:scale-[0.97] transition-transform"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[20px]">🏋️</span>
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Tělo & Mysl</div>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Pohyb, jídlo, nálada</div>
              </div>
            </div>
            <span className="text-[18px]" style={{ color: 'var(--text-tertiary)' }}>›</span>
          </Link>

          <Link href="/poznamky"
            className="rounded-[16px] px-4 py-3.5 flex items-center justify-between active:scale-[0.97] transition-transform"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[20px]">💡</span>
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Poznámky</div>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {noteCount === null ? '…' : `${noteCount} ${noteCount === 1 ? 'poznámka' : noteCount < 5 ? 'poznámky' : 'poznámek'}`}
                </div>
              </div>
            </div>
            <span className="text-[18px]" style={{ color: 'var(--text-tertiary)' }}>›</span>
          </Link>
        </div>

        {/* ── Dashboard poznámka ── */}
        <div
          className="rounded-[16px] overflow-hidden"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-[16px]">📋</span>
            <span className="text-[13px] font-bold flex-1" style={{ color: 'var(--text-primary)' }}>
              Rychlá poznámka
            </span>
            <span className="text-[11px] transition-colors"
              style={{ color: noteSaved ? 'var(--text-tertiary)' : '#f59e0b' }}>
              {noteSaved ? 'Uloženo' : 'Ukládám…'}
            </span>
          </div>
          {/* Textarea */}
          <textarea
            value={dashNote}
            onChange={e => handleDashNoteChange(e.target.value)}
            placeholder="Sem si piš co chceš — myšlenky, připomínky, nápady… Vidíš to jen tady."
            rows={4}
            className="w-full resize-none outline-none px-4 py-3 text-[14px] leading-relaxed"
            style={{
              background:  'transparent',
              color:       'var(--text-primary)',
            }}
          />
        </div>

      </div>

      {/* ── Finance type picker (výdaj / příjem) ── */}
      {showAddFinance === null ? null : (
        <>
          {/* If we just opened, show expense by default — switchable via toggle below */}
        </>
      )}

      {/* ── Modals ── */}

      {/* Add Task */}
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

      {/* Add Event */}
      {showAddEvent && userId && (
        <AddEventModal
          defaultDate={new Date()}
          isWork={false}
          userId={userId}
          appCategories={taskCats}
          clients={clientList}
          onSave={ev => {
            setEvents(prev => [...prev, ev])
            setShowAddEvent(false)
          }}
          onClose={() => setShowAddEvent(false)}
        />
      )}

      {/* Add Expense */}
      {showAddFinance === 'expense' && (
        <div className="fixed inset-0 z-50">
          {/* Type toggle overlay header */}
          <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-3 pointer-events-none">
            <div
              className="flex rounded-[12px] p-1 pointer-events-auto"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setShowAddFinance('expense')}
                className="px-4 py-1.5 rounded-[9px] text-[13px] font-bold transition-all"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                Výdaj
              </button>
              <button
                onClick={() => setShowAddFinance('income')}
                className="px-4 py-1.5 rounded-[9px] text-[13px] font-bold transition-all"
                style={{ color: 'var(--text-secondary)' }}
              >
                Příjem
              </button>
            </div>
          </div>
          <AddExpenseSheet
            expCats={expCats}
            wallets={wallets}
            onSave={async entry => {
              if (!userId) return
              await insertExpense({ user_id: userId, ...entry })
              setFinance(prev => prev ? { ...prev, monthExpenses: prev.monthExpenses + entry.amount } : prev)
              setShowAddFinance(null)
            }}
            onClose={() => setShowAddFinance(null)}
          />
        </div>
      )}

      {/* Add Income */}
      {showAddFinance === 'income' && (
        <div className="fixed inset-0 z-50">
          <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-3 pointer-events-none">
            <div
              className="flex rounded-[12px] p-1 pointer-events-auto"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setShowAddFinance('expense')}
                className="px-4 py-1.5 rounded-[9px] text-[13px] font-bold transition-all"
                style={{ color: 'var(--text-secondary)' }}
              >
                Výdaj
              </button>
              <button
                onClick={() => setShowAddFinance('income')}
                className="px-4 py-1.5 rounded-[9px] text-[13px] font-bold transition-all"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                Příjem
              </button>
            </div>
          </div>
          <AddIncomeSheet
            incCats={incCats}
            onSave={async entry => {
              if (!userId) return
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
