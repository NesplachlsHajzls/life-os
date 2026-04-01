'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { fetchTasks, Task } from '@/features/todo/api'
import { fetchClients, fetchAllWorkTasks, Client } from '@/features/prace/api'
import { fetchEventsInRange, CalendarEvent } from '@/features/calendar/api'
import { loadFinanceData } from '@/features/finance/api'
import { fetchRootNotes } from '@/features/notes/api'
import { usePrivacy } from '@/contexts/PrivacyContext'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

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
  return new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

function fmtCZK(n: number): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Local today date string YYYY-MM-DD for filtering events
function localDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isToday(isoDatetime: string): boolean {
  const today = localDateStr()
  // Handle both "2026-04-01T..." and "2026-04-01" formats
  return isoDatetime.startsWith(today)
}

const PRIORITY_COLORS: Record<number, string> = { 3: '#ef4444', 2: '#f59e0b', 1: '#22c55e' }

// ── Tile component ─────────────────────────────────────────────────

function Tile({ href, title, icon, accent = 'var(--color-primary)', children, badge }: {
  href: string
  title: string
  icon: string
  accent?: string
  children: React.ReactNode
  badge?: string | number
}) {
  return (
    <Link
      href={href}
      className="rounded-[16px] flex flex-col overflow-hidden active:scale-[0.97] transition-transform"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[18px] leading-none">{icon}</span>
        <span className="text-[13px] font-bold flex-1 tracking-[-0.01em]"
          style={{ color: 'var(--text-primary)' }}>{title}</span>
        {badge !== undefined && (
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: accent + '22', color: accent }}>
            {badge}
          </span>
        )}
        <span className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>›</span>
      </div>
      {/* Card content */}
      <div className="px-4 py-3 flex flex-col gap-1.5 flex-1">
        {children}
      </div>
    </Link>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="text-[12px] italic py-1" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
}

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null
  const { hideAmounts } = usePrivacy()
  const amt = (n: number) => hideAmounts ? '••••' : fmtCZK(n)

  const [tasks,     setTasks]     = useState<Task[]>([])
  const [clients,   setClients]   = useState<Client[]>([])
  const [workTasks, setWorkTasks] = useState<Task[]>([])
  const [events,    setEvents]    = useState<CalendarEvent[]>([])
  const [finance,   setFinance]   = useState<{ monthIncome: number; monthExpenses: number; balance: number } | null>(null)
  const [noteCount, setNoteCount] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return

    // Use a wide window (±2 days) to avoid timezone edge cases,
    // then filter events to today client-side using local date string
    const now   = new Date()
    const from  = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const to    = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()

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
        const monthExp = expenses
          .filter(e => e.date.startsWith(thisMonth))
          .reduce((s, e) => s + e.amount, 0)
        const monthInc = incomes
          .filter(i => i.date.startsWith(thisMonth))
          .reduce((s, i) => s + i.amount, 0)
        const balance = (settings?.wallets ?? []).reduce((s, w) => s + (w.balance ?? 0), 0)
        setFinance({ monthIncome: monthInc, monthExpenses: monthExp, balance })
      }
    })
  }, [userId])

  // Open personal tasks (no client_id), top 3
  const openTasks = useMemo(
    () => tasks.filter(t => t.status === 'open' && !t.client_id).slice(0, 3),
    [tasks]
  )
  const openTasksTotal = useMemo(
    () => tasks.filter(t => t.status === 'open' && !t.client_id).length,
    [tasks]
  )

  // Filter events to LOCAL today
  const todayEvents = useMemo(
    () => events.filter(ev => ev.is_all_day || isToday(ev.start_datetime)),
    [events]
  )

  // Active clients with open task counts, top 4
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

        {/* 2×2 main grid */}
        <div className="grid grid-cols-2 gap-3">

          {/* ÚKOLY */}
          <Tile
            href="/todo"
            title="Úkoly"
            icon="✅"
            accent="#22c55e"
            badge={openTasksTotal > 0 ? openTasksTotal : undefined}
          >
            {openTasks.length === 0 ? (
              <Empty label="Žádné otevřené úkoly" />
            ) : (
              <>
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
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    +{openTasksTotal - 3} dalších
                  </div>
                )}
              </>
            )}
          </Tile>

          {/* KALENDÁŘ */}
          <Tile
            href="/kalendar"
            title="Dnes"
            icon="📅"
            accent="#6366f1"
            badge={todayEvents.length > 0 ? todayEvents.length : undefined}
          >
            {todayEvents.length === 0 ? (
              <Empty label="Dnes žádné události" />
            ) : (
              <>
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
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    +{todayEvents.length - 3} dalších
                  </div>
                )}
              </>
            )}
          </Tile>

          {/* FINANCE */}
          <Tile href="/finance" title="Finance" icon="💰" accent="#f59e0b">
            {finance === null ? (
              <Empty label="Načítám…" />
            ) : (
              <>
                <div className="text-[20px] font-extrabold leading-none mt-0.5"
                  style={{ color: 'var(--text-primary)' }}>
                  {amt(finance.balance)}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>celkový zůstatek</div>
                <div className="flex gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-green-500">↑</span>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {amt(finance.monthIncome)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-red-400">↓</span>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {amt(finance.monthExpenses)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </Tile>

          {/* PRÁCE */}
          <Tile
            href="/prace"
            title="Práce"
            icon="💼"
            accent="#8b5cf6"
            badge={totalOpenWork > 0 ? totalOpenWork : undefined}
          >
            {clientStats.length === 0 ? (
              <Empty label="Žádní aktivní klienti" />
            ) : (
              <>
                {clientStats.map(({ client: c, count }) => (
                  <div key={c.id} className="flex justify-between items-center text-[13px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px] flex-shrink-0">{c.icon}</span>
                      <span className="truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-[11px] font-semibold flex-shrink-0 ml-1"
                        style={{ color: 'var(--text-tertiary)' }}>
                        {count}×
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}
          </Tile>

        </div>

        {/* Bottom row — quick links */}
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

      </div>
    </>
  )
}
