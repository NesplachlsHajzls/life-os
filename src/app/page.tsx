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

const PRIORITY_COLORS: Record<number, string> = { 3: '#ef4444', 2: '#f59e0b', 1: '#22c55e' }

// ── Sub-components ────────────────────────────────────────────────

function Tile({ href, title, icon, children }: {
  href: string; title: string; icon: string; children: React.ReactNode
}) {
  return (
    <Link href={href} className="rounded-[14px] p-4 flex flex-col gap-2.5 active:scale-[0.97] transition-transform" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
>
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{title}</span>
        <span className="text-[18px]">{icon}</span>
      </div>
      {children}
    </Link>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="text-[12px] italic" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
}

// ── Dashboard ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null
  const { hideAmounts } = usePrivacy()
  const amt = (n: number) => hideAmounts ? '••••' : fmtCZK(n)

  const [tasks,   setTasks]   = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [workTasks, setWorkTasks] = useState<Task[]>([])
  const [events,  setEvents]  = useState<CalendarEvent[]>([])
  const [finance, setFinance] = useState<{ monthIncome: number; monthExpenses: number; balance: number } | null>(null)
  const [noteCount, setNoteCount] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return
    const today = new Date()
    const from  = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const to    = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()

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
        const nowMs = Date.now()
        const thisMonth = new Date().toISOString().slice(0, 7) // "2026-03"
        const monthExp = expenses
          .filter(e => e.date.startsWith(thisMonth))
          .reduce((s, e) => s + e.amount, 0)
        const monthInc = incomes
          .filter(i => i.date.startsWith(thisMonth))
          .reduce((s, i) => s + i.amount, 0)
        const balance  = (settings?.wallets ?? []).reduce((s, w) => s + (w.balance ?? 0), 0)
        setFinance({ monthIncome: monthInc, monthExpenses: monthExp, balance })
      }
    })
  }, [userId])

  // Open personal tasks (no client_id), top 3
  const openTasks = useMemo(
    () => tasks.filter(t => t.status === 'open' && !t.client_id).slice(0, 3),
    [tasks]
  )

  // Clients with open task counts, top 4
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
      <div className="bg-[var(--color-primary)] px-5 pt-4 pb-6 text-white">
        <h2 className="text-[22px] font-bold">{greet()}, Martine 👋</h2>
        <p className="text-[13px] text-white/70 mt-0.5">{capitalize(todayLabel())}</p>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-3">

          {/* TODO */}
          <Tile href="/todo" title="Úkoly" icon="✅">
            {openTasks.length === 0 ? (
              <Empty label="Žádné otevřené úkoly" />
            ) : (
              <div className="flex flex-col gap-1.5">
                {openTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-[13px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY_COLORS[t.priority] ?? '#94a3b8' }} />
                    <span className="flex-1 truncate text-[var(--text-primary)]">{t.title}</span>
                    {t.due_date && (
                      <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">
                        {new Date(t.due_date + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))}
                {tasks.filter(t => t.status === 'open' && !t.client_id).length > 3 && (
                  <div className="text-[11px] text-[var(--text-tertiary)]">
                    +{tasks.filter(t => t.status === 'open' && !t.client_id).length - 3} dalších
                  </div>
                )}
              </div>
            )}
          </Tile>

          {/* KALENDÁŘ */}
          <Tile href="/kalendar" title="Dnes" icon="📅">
            {events.length === 0 ? (
              <Empty label="Dnes žádné události" />
            ) : (
              <div className="flex flex-col gap-1.5">
                {events.slice(0, 3).map(ev => (
                  <div key={ev.id} className="flex items-center gap-1.5 text-[13px]">
                    <span className="text-[11px] font-bold text-[var(--color-primary)] flex-shrink-0 w-10">
                      {ev.is_all_day ? 'celý' : fmtTime(ev.start_datetime)}
                    </span>
                    <span className="truncate text-[var(--text-primary)]">{ev.emoji ? `${ev.emoji} ` : ''}{ev.title}</span>
                  </div>
                ))}
                {events.length > 3 && (
                  <div className="text-[11px] text-[var(--text-tertiary)]">+{events.length - 3} dalších</div>
                )}
              </div>
            )}
          </Tile>

          {/* FINANCE */}
          <Tile href="/finance" title="Finance" icon="💰">
            {finance === null ? (
              <Empty label="Načítám…" />
            ) : (
              <>
                <div className="text-[22px] font-extrabold text-[var(--text-primary)] leading-none">
                  {amt(finance.balance)}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">celkový zůstatek</div>
                <div className="flex gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-green-500">↑</span>
                    <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{amt(finance.monthIncome)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-red-400">↓</span>
                    <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{amt(finance.monthExpenses)}</span>
                  </div>
                </div>
              </>
            )}
          </Tile>

          {/* PRÁCE */}
          <Tile href="/prace" title="Práce" icon="💼">
            {clientStats.length === 0 ? (
              <Empty label="Žádní aktivní klienti" />
            ) : (
              <div className="flex flex-col gap-1.5">
                {clientStats.map(({ client: c, count }) => (
                  <div key={c.id} className="flex justify-between items-center text-[13px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px] flex-shrink-0">{c.icon}</span>
                      <span className="truncate text-[var(--text-primary)]">{c.name}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-[11px] font-semibold text-[var(--text-tertiary)] flex-shrink-0 ml-1">
                        {count} úkol{count === 1 ? '' : count < 5 ? 'y' : 'ů'}
                      </span>
                    )}
                  </div>
                ))}
                {totalOpenWork > 0 && (
                  <div className="text-[11px] text-[var(--color-primary)] font-semibold mt-0.5">
                    {totalOpenWork} otevřených úkolů celkem
                  </div>
                )}
              </div>
            )}
          </Tile>

        </div>

        {/* Nudle — Sport a Poznámky */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/sport"
            className="bg-white rounded-[14px] px-4 py-3 flex items-center justify-between active:scale-[0.97] transition-transform"
      >
            <div className="flex items-center gap-2">
              <span className="text-[20px]">🏋️</span>
              <div>
                <div className="text-[13px] font-bold text-[var(--text-primary)]">Sport</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">Přejít na deník</div>
              </div>
            </div>
            <span className="text-[var(--text-tertiary)] text-lg">›</span>
          </Link>

          <Link href="/poznamky"
            className="bg-white rounded-[14px] px-4 py-3 flex items-center justify-between active:scale-[0.97] transition-transform"
      >
            <div className="flex items-center gap-2">
              <span className="text-[20px]">💡</span>
              <div>
                <div className="text-[13px] font-bold text-[var(--text-primary)]">Poznámky</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  {noteCount === null ? '…' : `${noteCount} ${noteCount === 1 ? 'poznámka' : noteCount < 5 ? 'poznámky' : 'poznámek'}`}
                </div>
              </div>
            </div>
            <span className="text-[var(--text-tertiary)] text-lg">›</span>
          </Link>
        </div>

      </div>
    </>
  )
}
