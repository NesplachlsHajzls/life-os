'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  CalendarEvent,
  EventCategory,
  RecurrenceType,
  RECURRENCE_LABELS,
  EVENT_EMOJIS,
  getCategoryLabel,
  getCategoryInlineStyle,
  fetchEventsInRange,
  insertEvent,
  updateEvent,
  deleteEvent,
  expandRecurring,
  fetchCompletedEventIds,
  setEventCompleted,
} from '@/features/calendar/api'
import { fetchTasks, updateTask, Task } from '@/features/todo/api'
import { fetchClients } from '@/features/prace/api'
import { AddTaskSheet } from '@/features/todo/components/AddTaskSheet'
import { AppCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'
import { fetchCategories } from '@/features/categories/api'
import { AddEventModal, fmtDateInput } from '@/features/calendar/components/AddEventModal'

// ── Helpers ────────────────────────────────────────────────────────

const CZ_DAYS_SHORT  = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
const CZ_DAYS_FULL   = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota']
const CZ_MONTHS      = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince']
const CZ_MONTHS_SHORT = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro']

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}


// ── EventChip ─────────────────────────────────────────────────────

function EventChip({ event, onClick, onComplete, isCompleted, appCategories = DEFAULT_CATEGORIES, clientsMap = {} }: {
  event: CalendarEvent
  onClick?: () => void
  onComplete?: () => void
  isCompleted?: boolean
  appCategories?: AppCategory[]
  clientsMap?: Record<string, string>
}) {
  const style = getCategoryInlineStyle(event.category, appCategories)
  const clientName = event.client_id ? clientsMap[event.client_id] : null
  return (
    <div
      onClick={onClick}
      className="rounded-xl px-3 py-2 border-l-[3px] cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
      style={{ background: style.background, borderColor: style.borderColor }}
    >
      {onComplete && (
        <button
          onClick={e => { e.stopPropagation(); onComplete() }}
          className={`w-[20px] h-[20px] rounded-[5px] border-2 flex-shrink-0 transition-all flex items-center justify-center ${
            isCompleted
              ? 'bg-green-400 border-green-400'
              : 'border-[var(--border-strong)] hover:border-green-400 hover:bg-green-50'
          }`}
          aria-label="Dokončit"
        >
          {isCompleted && <span className="text-[9px] text-white font-bold leading-none">✓</span>}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: style.color }}>
          {event.is_all_day ? '📌 Celý den' : `${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}`}
        </div>
        <div className="text-[13px] font-semibold text-[var(--text-primary)] mt-0.5 truncate">
          {event.emoji && <span className="mr-1">{event.emoji}</span>}
          {event.title}
          {event.is_recurring && <span className="ml-1 text-[10px] text-[var(--text-tertiary)]">🔁</span>}
        </div>
        {clientName && (
          <div className="text-[10px] font-semibold text-[var(--text-tertiary)] mt-0.5 truncate">💼 {clientName}</div>
        )}
        {event.description && (
          <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate opacity-70">{event.description}</div>
        )}
      </div>
    </div>
  )
}

// ── TaskChip ──────────────────────────────────────────────────────

function TaskChip({ task, onClick, onComplete, isCompleted, appCategories = DEFAULT_CATEGORIES, clientsMap = {} }: {
  task: Task
  onClick?: () => void
  onComplete?: () => void
  isCompleted?: boolean
  appCategories?: AppCategory[]
  clientsMap?: Record<string, string>
}) {
  const style = getCategoryInlineStyle(task.category ?? 'osobni', appCategories)
  const clientName = task.client_id ? clientsMap[task.client_id] : null
  return (
    <div
      onClick={onClick}
      className={`rounded-xl px-3 py-2 border-l-[3px] ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} flex items-center gap-2`}
      style={{ background: style.background, borderColor: style.borderColor }}
    >
      {onComplete && (
        <button
          onClick={e => { e.stopPropagation(); onComplete() }}
          className={`w-[20px] h-[20px] rounded-[5px] border-2 flex-shrink-0 transition-all flex items-center justify-center ${
            isCompleted
              ? 'bg-green-400 border-green-400'
              : 'border-[var(--border-strong)] hover:border-green-400 hover:bg-green-50'
          }`}
          aria-label="Dokončit úkol"
        >
          {isCompleted && <span className="text-[9px] text-white font-bold leading-none">✓</span>}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: style.color }}>
          ✅ {clientName ? clientName : 'Úkol'}
        </div>
        <div className="text-[13px] font-semibold text-[var(--text-secondary)] mt-0.5 truncate">
          {task.title}
        </div>
        {task.note && (
          <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate opacity-70">{task.note}</div>
        )}
      </div>
    </div>
  )
}

// ── EventDetailModal ──────────────────────────────────────────────

function EventDetailModal({ event, onClose, onDelete, onEdit, onDuplicate, appCategories = DEFAULT_CATEGORIES }: {
  event: CalendarEvent
  onClose: () => void
  onDelete: (id: string) => void
  onEdit: (event: CalendarEvent) => void
  onDuplicate: (event: CalendarEvent) => void
  appCategories?: AppCategory[]
}) {
  const style = getCategoryInlineStyle(event.category, appCategories)
  const label = getCategoryLabel(event.category, appCategories)
  const baseId = event.id.split('_')[0]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: style.background, color: style.color }}>
            {label}
          </span>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-lg">✕</button>
        </div>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-1">
          {event.emoji && <span className="mr-2">{event.emoji}</span>}
          {event.title}
        </h2>
        {event.description && <p className="text-[13px] text-[var(--text-secondary)] mb-3">{event.description}</p>}
        <div className="text-[13px] text-[var(--text-secondary)] space-y-1 mb-4">
          {event.is_all_day
            ? <p>📅 Celý den</p>
            : <p>🕐 {fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}</p>
          }
          {event.is_recurring && event.recurrence_type && (
            <p>🔁 {RECURRENCE_LABELS[event.recurrence_type]}</p>
          )}
        </div>

        {/* Akce */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onEdit(event)}
            className="flex-1 py-2.5 rounded-xl bg-[var(--bg)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--surface-raised)] transition-colors flex items-center justify-center gap-1.5"
          >
            ✏️ Upravit
          </button>
          <button
            onClick={() => onDuplicate(event)}
            className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-[13px] font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
          >
            📋 Duplikovat
          </button>
        </div>
        <button
          onClick={() => onDelete(baseId)}
          className="w-full py-2.5 rounded-xl bg-red-50 text-red-500 text-[13px] font-semibold hover:bg-red-100 transition-colors"
        >
          Smazat událost
        </button>
      </div>
    </div>
  )
}


// ── WeekStrip ─────────────────────────────────────────────────────

function WeekStrip({ weekStart, events, onDayClick }: {
  weekStart: Date
  events: CalendarEvent[]
  onDayClick: (d: Date) => void
}) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const daysWithEvents = new Set(events.map(ev => new Date(ev.start_datetime).toDateString()))
  // Mo=0..Su=6 in our strip
  const dayLabels = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

  return (
    <div className="grid grid-cols-7 gap-1 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
      {days.map((day, i) => {
        const isToday = isSameDay(day, today)
        const hasDot = daysWithEvents.has(day.toDateString())
        return (
          <div
            key={day.toDateString()}
            onClick={() => onDayClick(day)}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-xl cursor-pointer transition-colors ${isToday ? 'bg-[var(--color-primary)]' : 'hover:bg-[var(--bg)]'}`}
          >
            <span className={`text-[10px] font-semibold uppercase ${isToday ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>
              {dayLabels[i]}
            </span>
            <span className={`text-[16px] font-bold ${isToday ? 'text-white' : 'text-[var(--text-primary)]'}`}>
              {day.getDate()}
            </span>
            {hasDot && (
              <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-[var(--surface)]/70' : 'bg-[var(--color-primary)]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── WeekView ──────────────────────────────────────────────────────

function WeekView({ weekStart, events, tasks, onDayClick, onEventClick, onTaskClick, onEventComplete, onTaskComplete, completedIds, collapsedDays, onToggleDay, highlightDay, appCategories = DEFAULT_CATEGORIES, clientsMap = {} }: {
  weekStart: Date
  events: CalendarEvent[]
  tasks: Task[]
  onDayClick: (d: Date) => void
  onEventClick: (ev: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
  onEventComplete?: (ev: CalendarEvent) => void
  onTaskComplete?: (task: Task) => void
  completedIds?: Set<string>
  collapsedDays?: Set<string>
  onToggleDay?: (dayIso: string) => void
  highlightDay?: string | null
  appCategories?: AppCategory[]
  clientsMap?: Record<string, string>
}) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      const key = new Date(ev.start_datetime).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }
    return map
  }, [events])

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!t.due_date) continue
      // Use T00:00:00 to force local time parsing (avoid UTC offset shifting the date)
      const key = new Date(t.due_date + 'T00:00:00').toDateString()
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return map
  }, [tasks])

  // Show ALL 7 days so navigating to a week always shows every day,
  // even if events haven't loaded yet or the day is empty
  const visibleDays = days

  return (
    <div className="p-4 flex flex-col gap-0">
      <style>{`@keyframes calFlash{0%{background:transparent}20%{background:rgba(59,130,246,0.12)}60%{background:rgba(59,130,246,0.08)}100%{background:transparent}}`}</style>
      {visibleDays.length === 0 && (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-[13px]">Tento týden nic naplánováno</p>
        </div>
      )}
      {visibleDays.map((day, di) => {
        const isToday = isSameDay(day, today)
        const evs = eventsByDay[day.toDateString()] ?? []
        const tks = tasksByDay[day.toDateString()] ?? []
        const dayIso = day.toISOString().split('T')[0]
        const isHighlight = highlightDay === dayIso
        const isCollapsed = collapsedDays?.has(dayIso) ?? false
        const totalItems = evs.length + tks.length
        const label = isToday
          ? `📍 ${CZ_DAYS_FULL[day.getDay()]} ${day.getDate()}. ${CZ_MONTHS[day.getMonth()]} — dnes`
          : `${CZ_DAYS_FULL[day.getDay()]} ${day.getDate()}. ${CZ_MONTHS[day.getMonth()]}`

        return (
          <div
            key={day.toDateString()}
            style={isHighlight ? { animation: 'calFlash 1.4s ease-out', borderRadius: 12 } : undefined}
          >
            {di > 0 && <div className="h-px bg-[var(--surface-raised)] my-4" />}
            {/* Day header — kliknutím kolaps/rozbalení */}
            <div
              className="flex items-center justify-between mb-2 cursor-pointer select-none group"
              onClick={() => onToggleDay?.(dayIso)}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'} text-[var(--text-tertiary)]`}>▶</span>
                <div className={`text-[11px] font-bold uppercase tracking-wide ${isToday ? 'text-[var(--color-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                  {label}
                </div>
                {isCollapsed && totalItems > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                    {totalItems}
                  </span>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDayClick(day) }}
                className="text-[11px] text-[var(--color-primary)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
              >
                + přidat
              </button>
            </div>
            {!isCollapsed && (
              evs.length === 0 && tks.length === 0
                ? <div className="text-[12px] text-[var(--text-tertiary)] py-1.5 text-center">Žádné události ani úkoly</div>
                : (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Levý sloupec — Události */}
                    <div className="flex flex-col gap-2">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-0.5">Události</div>
                      {evs.length === 0
                        ? <div className="text-[11px] text-gray-200 italic">—</div>
                        : evs.map(ev => (
                          <EventChip
                            key={ev.id}
                            event={ev}
                            onClick={() => onEventClick(ev)}
                            onComplete={onEventComplete ? () => onEventComplete(ev) : undefined}
                            isCompleted={completedIds?.has(ev.id.includes('_') ? ev.id.split('_')[0] : ev.id)}
                            appCategories={appCategories}
                            clientsMap={clientsMap}
                          />
                        ))
                      }
                    </div>
                    {/* Pravý sloupec — Úkoly */}
                    <div className="flex flex-col gap-2">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-0.5">Úkoly</div>
                      {tks.length === 0
                        ? <div className="text-[11px] text-gray-200 italic">—</div>
                        : tks.map(t => (
                          <TaskChip
                            key={t.id}
                            task={t}
                            onClick={onTaskClick ? () => onTaskClick(t) : undefined}
                            onComplete={onTaskComplete ? () => onTaskComplete(t) : undefined}
                            isCompleted={completedIds?.has(t.id)}
                            appCategories={appCategories}
                            clientsMap={clientsMap}
                          />
                        ))
                      }
                    </div>
                  </div>
                )
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── MonthView ─────────────────────────────────────────────────────

function MonthView({ month, events, tasks, onDayClick, appCategories = DEFAULT_CATEGORIES }: {
  month: Date
  events: CalendarEvent[]
  tasks: Task[]
  onDayClick: (d: Date) => void
  appCategories?: AppCategory[]
}) {
  const today = new Date()
  const mStart = startOfMonth(month)
  const mEnd = endOfMonth(month)
  const gridStart = startOfWeek(mStart)
  const totalCells = Math.ceil(
    (mEnd.getDate() + (mStart.getDay() === 0 ? 6 : mStart.getDay() - 1)) / 7
  ) * 7
  const grid = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i))

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      const key = new Date(ev.start_datetime).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }
    return map
  }, [events])

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!t.due_date) continue
      const key = new Date(t.due_date + 'T00:00:00').toDateString()
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return map
  }, [tasks])

  const dayLabels = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

  const numRows = totalCells / 7

  return (
    <div className="flex flex-col h-full">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        {dayLabels.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-[var(--text-tertiary)] uppercase py-1.5 border-r last:border-r-0" style={{ borderColor: 'var(--border)' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid — fills all remaining height */}
      <div
        className="flex-1 grid grid-cols-7"
        style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}
      >
        {grid.map(day => {
          const isCurrentMonth = day.getMonth() === month.getMonth()
          const isToday = isSameDay(day, today)
          const evs = eventsByDay[day.toDateString()] ?? []
          const tks = tasksByDay[day.toDateString()] ?? []
          const totalItems = evs.length + tks.length

          const MAX_CHIPS = 4
          type AnyItem = { type: 'event'; ev: CalendarEvent } | { type: 'task'; t: Task }
          const allItems: AnyItem[] = [
            ...evs.map(ev => ({ type: 'event' as const, ev })),
            ...tks.map(t  => ({ type: 'task'  as const, t  })),
          ]
          const shown = allItems.slice(0, MAX_CHIPS)
          const overflow = totalItems - shown.length

          return (
            <div
              key={day.toDateString()}
              onClick={() => isCurrentMonth && onDayClick(day)}
              className={`p-1 border-r border-b last:border-r-0 flex flex-col transition-colors ${
                isCurrentMonth
                  ? 'cursor-pointer hover:bg-[var(--surface-raised)]'
                  : 'opacity-25 pointer-events-none'
              }`}
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Date number */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold mb-1 flex-shrink-0 ${
                isToday
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--text-secondary)]'
              }`}>
                {day.getDate()}
              </div>

              {/* Mini chips */}
              <div className="flex flex-col gap-[2px] flex-1 overflow-hidden">
                {shown.map((item: AnyItem, idx: number) => {
                  if (item.type === 'event') {
                    const s = getCategoryInlineStyle(item.ev.category, appCategories)
                    return (
                      <div
                        key={item.ev.id}
                        className="flex items-center gap-[3px] rounded-[4px] px-[3px] py-[1px]"
                        style={{ background: s.background }}
                      >
                        <span className="w-[3px] h-[3px] rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-[9px] font-semibold leading-tight truncate" style={{ color: s.color }}>
                          {item.ev.emoji ? `${item.ev.emoji} ` : ''}{item.ev.title}
                        </span>
                      </div>
                    )
                  } else {
                    const s = getCategoryInlineStyle(item.t.category ?? 'osobni', appCategories)
                    return (
                      <div
                        key={item.t.id}
                        className="flex items-center gap-[3px] rounded-[4px] px-[3px] py-[1px]"
                        style={{ background: s.background }}
                      >
                        <span className="w-[3px] h-[3px] rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-[9px] font-semibold leading-tight truncate" style={{ color: s.color }}>
                          {item.t.title}
                        </span>
                      </div>
                    )
                  }
                })}
                {overflow > 0 && (
                  <div className="text-[8px] font-bold leading-tight px-1" style={{ color: 'var(--text-tertiary)' }}>
                    +{overflow} další
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── DayPanel — bottom sheet pro jeden den ─────────────────────────

function DayPanel({ day, events, tasks, onClose, onEventClick, onTaskClick, onEventComplete, onTaskComplete, completedIds, onAddEvent, onAddTask, appCategories = DEFAULT_CATEGORIES, clientsMap = {} }: {
  day: Date
  events: CalendarEvent[]
  tasks: Task[]
  onClose: () => void
  onEventClick: (ev: CalendarEvent) => void
  onTaskClick?: (t: Task) => void
  onEventComplete?: (ev: CalendarEvent) => void
  onTaskComplete?: (t: Task) => void
  completedIds?: Set<string>
  onAddEvent: () => void
  onAddTask: () => void
  appCategories?: AppCategory[]
  clientsMap?: Record<string, string>
}) {
  const dayIso  = day.toISOString().split('T')[0]
  const isToday = isSameDay(day, new Date())

  const dayEvs = events.filter(ev => new Date(ev.start_datetime).toDateString() === day.toDateString())
  const dayTks = tasks.filter(t => t.due_date === dayIso)

  const dayLabel = `${CZ_DAYS_FULL[day.getDay()]} ${day.getDate()}. ${CZ_MONTHS[day.getMonth()]} ${day.getFullYear()}`

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end lg:left-[220px] lg:items-center lg:justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet — bottom sheet on mobile, centered modal on desktop */}
      <div
        className="relative w-full max-h-[82vh] flex flex-col rounded-t-[24px] overflow-hidden
          lg:rounded-[20px] lg:w-full lg:max-w-[520px] lg:max-h-[85vh] lg:mx-auto lg:my-auto"
        style={{ background: 'var(--surface)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>
        {/* Desktop top padding */}
        <div className="hidden lg:block pt-5" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className={`text-[17px] font-bold ${isToday ? 'text-[var(--color-primary)]' : 'text-[var(--text-primary)]'}`}>
              {isToday ? '📍 ' : ''}{dayLabel}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {dayEvs.length + dayTks.length === 0
                ? 'Nic naplánováno'
                : `${dayEvs.length} ${dayEvs.length === 1 ? 'událost' : dayEvs.length < 5 ? 'události' : 'událostí'} · ${dayTks.length} ${dayTks.length === 1 ? 'úkol' : dayTks.length < 5 ? 'úkoly' : 'úkolů'}`}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[16px]" style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Události */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                Události · {dayEvs.length}
              </span>
              <button
                onClick={onAddEvent}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--color-primary)' + '18', color: 'var(--color-primary)' }}
              >
                + přidat
              </button>
            </div>
            {dayEvs.length === 0
              ? <div className="text-[12px] italic py-2" style={{ color: 'var(--text-tertiary)' }}>Žádné události</div>
              : <div className="flex flex-col gap-2">
                  {dayEvs.map(ev => (
                    <EventChip
                      key={ev.id}
                      event={ev}
                      onClick={() => onEventClick(ev)}
                      onComplete={onEventComplete ? () => onEventComplete(ev) : undefined}
                      isCompleted={completedIds?.has(ev.id.includes('_') ? ev.id.split('_')[0] : ev.id)}
                      appCategories={appCategories}
                      clientsMap={clientsMap}
                    />
                  ))}
                </div>
            }
          </div>

          {/* Úkoly */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                Úkoly · {dayTks.length}
              </span>
              <button
                onClick={onAddTask}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--color-primary)' + '18', color: 'var(--color-primary)' }}
              >
                + přidat
              </button>
            </div>
            {dayTks.length === 0
              ? <div className="text-[12px] italic py-2" style={{ color: 'var(--text-tertiary)' }}>Žádné úkoly</div>
              : <div className="flex flex-col gap-2">
                  {dayTks.map(t => (
                    <TaskChip
                      key={t.id}
                      task={t}
                      onClick={onTaskClick ? () => onTaskClick(t) : undefined}
                      onComplete={onTaskComplete ? () => onTaskComplete(t) : undefined}
                      isCompleted={completedIds?.has(t.id)}
                      appCategories={appCategories}
                      clientsMap={clientsMap}
                    />
                  ))}
                </div>
            }
          </div>

          {/* Spacer for safe area */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

type CalView = 'week' | 'month'

export default function KalendarPage() {
  const { user } = useUser()
  const userId = user?.id ?? null

  const [view, setView]         = useState<CalView>('month')
  const [currentDate, setCurrent] = useState(new Date())
  const [events, setEvents]     = useState<CalendarEvent[]>([])
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [addDate, setAddDate]         = useState(new Date())
  const [editEvent, setEditEvent]     = useState<CalendarEvent | null>(null)
  const [dupEvent, setDupEvent]       = useState<CalendarEvent | null>(null)
  const [detailEvent, setDetail]      = useState<CalendarEvent | null>(null)
  const [editingCalTask, setEditingCalTask] = useState<Task | null>(null)
  const [selectedDay, setSelectedDay]      = useState<Date | null>(null)
  const [appCategories, setAppCategories]  = useState<AppCategory[]>(DEFAULT_CATEGORIES)
  const [calClients, setCalClients]        = useState<{ id: string; name: string }[]>([])
  const [highlightDay, setHighlightDay]    = useState<string | null>(null)
  const [completedIds, setCompletedIds]    = useState<Set<string>>(new Set())
  const [collapsedDays, setCollapsedDays]  = useState<Set<string>>(new Set())

  // Restore collapsed days from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cal_collapsed_days')
      if (stored) setCollapsedDays(new Set(JSON.parse(stored) as string[]))
    } catch {}
  }, [])
  const lastSaveRef = useRef<number>(0)

  // Load completed event IDs from DB (cross-device sync)
  useEffect(() => {
    if (!userId) return
    fetchCompletedEventIds(userId).then(ids => {
      if (ids.size > 0) setCompletedIds(ids)
    }).catch(() => {})
  }, [userId])

  const weekStart = startOfWeek(currentDate)
  const weekEnd   = endOfDay(addDays(weekStart, 6))

  // ── Single shared fetch range: always the full calendar month ──────────────
  // Both week view and month view read from the SAME state so there are no
  // "two memories". Week view already filters client-side by day key, so it
  // only renders events that fall in the visible 7 days.
  const rangeStart = startOfWeek(startOfMonth(currentDate))   // Mon of first displayed week
  const rangeEnd   = endOfDay(addDays(                        // Sun of last displayed week
    startOfWeek(endOfMonth(currentDate)),
    6,
  ))

  const load = useCallback(async (silent = false) => {
    if (!userId) return
    // Always clear stale data — even on silent reload — so ghost items never linger
    setEvents([])
    setTasks([])
    if (!silent) setLoading(true)
    try {
      const [rawEvents, rawTasks] = await Promise.all([
        fetchEventsInRange(userId, rangeStart.toISOString(), rangeEnd.toISOString()),
        fetchTasks(userId),
      ])

      const expanded: CalendarEvent[] = []
      for (const ev of rawEvents) {
        if (ev.is_recurring) {
          expanded.push(...expandRecurring(ev, rangeStart, rangeEnd))
        } else {
          expanded.push(ev)
        }
      }
      setEvents(expanded)
      setTasks(rawTasks.filter(t => t.status === 'open' && !!t.due_date))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentDate])   // 'view' removed — range no longer depends on it

  useEffect(() => { load() }, [load])

  // Refresh when user switches back to this tab — but skip if we just saved (avoids flash)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && Date.now() - lastSaveRef.current > 1500) {
        load(true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  // Load categories and clients
  useEffect(() => {
    if (!userId) return
    fetchCategories(userId).then(cats => {
      if (cats.length) setAppCategories(cats)
    }).catch(() => {})
    fetchClients(userId).then(cs => setCalClients(cs.map(c => ({ id: c.id, name: c.name })))).catch(() => {})
  }, [userId])

  const headerTitle = view === 'week'
    ? `${weekStart.getDate()}. ${CZ_MONTHS[weekStart.getMonth()]} – ${weekEnd.getDate()}. ${CZ_MONTHS[weekEnd.getMonth()]}`
    : `${CZ_MONTHS_SHORT[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  function navigate(dir: 1 | -1) {
    if (view === 'week') {
      setCurrent(d => addDays(d, dir * 7))
    } else {
      setCurrent(d => {
        const n = new Date(d)
        n.setMonth(n.getMonth() + dir)
        return n
      })
    }
  }

  function handleDayClick(day: Date) {
    setAddDate(day)
    setShowAdd(true)
  }

  function handleMonthDayClick(day: Date) {
    setSelectedDay(day)
    setAddDate(day)
  }

  async function handleDeleteEvent(id: string) {
    await deleteEvent(id)
    lastSaveRef.current = Date.now()
    setDetail(null)
    load(true)
  }

  function handleEventSaved(ev: CalendarEvent) {
    lastSaveRef.current = Date.now()
    setShowAdd(false)
    setDupEvent(null)
    // If the saved event is outside the current range (e.g. duplicate to another week),
    // navigate there so it's visible — load() fires automatically via useEffect
    const evDate = new Date(ev.start_datetime)
    if (evDate < rangeStart || evDate > rangeEnd) {
      setCurrent(evDate)
    } else {
      load(true)
    }
  }

  function handleEventUpdated(updated: CalendarEvent) {
    lastSaveRef.current = Date.now()
    setEditEvent(null)
    setDetail(null)
    // Navigate to updated event's date if it moved outside the current range
    const evDate = new Date(updated.start_datetime)
    if (evDate < rangeStart || evDate > rangeEnd) {
      setCurrent(evDate)
    } else {
      load(true)
    }
  }

  // Event toggle — persists to DB for cross-device sync
  function handleCompleteEvent(event: CalendarEvent) {
    if (!userId) return
    // Always use base ID (recurring events have suffix "uuid_2026-03-17")
    const baseId = event.id.includes('_') ? event.id.split('_')[0] : event.id
    const willComplete = !completedIds.has(baseId)
    // Optimistic update — store base ID so it matches what DB returns on reload
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (willComplete) next.add(baseId)
      else next.delete(baseId)
      return next
    })
    // Persist to DB
    setEventCompleted(userId, baseId, willComplete).catch(() => {
      // Revert on error
      setCompletedIds(prev => {
        const next = new Set(prev)
        if (willComplete) next.delete(baseId)
        else next.add(baseId)
        return next
      })
    })
  }

  // Task toggle — persists to DB
  async function handleCompleteTask(task: Task) {
    const newStatus: 'open' | 'done' = completedIds.has(task.id) ? 'open' : 'done'
    const done_at = newStatus === 'done' ? new Date().toISOString() : null
    // Optimistic update
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (newStatus === 'done') next.add(task.id)
      else next.delete(task.id)
      return next
    })
    try {
      await updateTask({ id: task.id, status: newStatus, done_at })
      // Remove from visible list when done (tasks are filtered to open)
      if (newStatus === 'done') {
        setTimeout(() => setTasks(prev => prev.filter(t => t.id !== task.id)), 600)
      }
    } catch {
      // Revert on error
      setCompletedIds(prev => {
        const next = new Set(prev)
        if (newStatus === 'done') next.delete(task.id)
        else next.add(task.id)
        return next
      })
    }
  }

  // Toggle collapse for a day — persisted to localStorage
  function handleToggleDay(dayIso: string) {
    setCollapsedDays(prev => {
      const next = new Set(prev)
      if (next.has(dayIso)) next.delete(dayIso)
      else next.add(dayIso)
      try { localStorage.setItem('cal_collapsed_days', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  function handleOpenEdit(ev: CalendarEvent) {
    setDetail(null)
    setEditEvent(ev)
  }

  function handleOpenDuplicate(ev: CalendarEvent) {
    setDetail(null)
    setDupEvent(ev)
  }

  return (
    <div className="flex flex-col min-h-screen lg:min-h-0 lg:h-full">
      <Header
        title="Kalendář"
        action={
          <div className="flex bg-[var(--surface)]/15 rounded-lg p-0.5">
            {(['week', 'month'] as CalView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  view === v ? 'bg-[var(--surface)]/25 text-white' : 'text-white/60'
                }`}
              >
                {v === 'week' ? 'Týden' : 'Měsíc'}
              </button>
            ))}
          </div>
        }
      />

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg hover:bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-secondary)] text-lg font-bold">‹</button>
        <span className="text-[14px] font-bold text-[var(--text-primary)]">{headerTitle}</span>
        <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg hover:bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-secondary)] text-lg font-bold">›</button>
      </div>

      {/* Week strip (only in week view) */}
      {view === 'week' && (
        <WeekStrip
          weekStart={weekStart}
          events={events}
          onDayClick={handleDayClick}
        />
      )}

      {/* Content */}
      <div className={`flex-1 ${view === 'month' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)] text-[13px]">Načítám…</div>
        ) : view === 'week' ? (
          <WeekView
            weekStart={weekStart}
            events={events}
            tasks={tasks}
            onDayClick={handleDayClick}
            onEventClick={setDetail}
            onTaskClick={setEditingCalTask}
            onEventComplete={handleCompleteEvent}
            onTaskComplete={handleCompleteTask}
            completedIds={completedIds}
            collapsedDays={collapsedDays}
            onToggleDay={handleToggleDay}
            highlightDay={highlightDay}
            appCategories={appCategories}
            clientsMap={Object.fromEntries(calClients.map(c => [c.id, c.name]))}
          />
        ) : (
          <MonthView
            month={currentDate}
            events={events}
            tasks={tasks}
            onDayClick={handleMonthDayClick}
            appCategories={appCategories}
          />
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setAddDate(new Date()); setShowAdd(true) }}
        className="fixed bottom-[calc(64px+20px)] right-5 sm:bottom-5 w-[52px] h-[52px] rounded-full bg-[var(--color-primary)] text-white text-[22px] shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-40"
      >
        +
      </button>

      {/* DayPanel */}
      {selectedDay && (
        <DayPanel
          day={selectedDay}
          events={events}
          tasks={tasks}
          onClose={() => setSelectedDay(null)}
          onEventClick={ev => { setDetail(ev) }}
          onTaskClick={t => { setEditingCalTask(t) }}
          onEventComplete={handleCompleteEvent}
          onTaskComplete={handleCompleteTask}
          completedIds={completedIds}
          onAddEvent={() => { setAddDate(selectedDay); setShowAdd(true) }}
          onAddTask={() => { setAddDate(selectedDay); setShowAddTask(true) }}
          appCategories={appCategories}
          clientsMap={Object.fromEntries(calClients.map(c => [c.id, c.name]))}
        />
      )}

      {/* Modals */}
      {showAdd && userId && (
        <AddEventModal
          defaultDate={addDate}
          isWork={false}
          userId={userId}
          onSave={handleEventSaved}
          onClose={() => setShowAdd(false)}
          appCategories={appCategories}
          clients={calClients}
        />
      )}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          onClose={() => setDetail(null)}
          onDelete={handleDeleteEvent}
          onEdit={handleOpenEdit}
          onDuplicate={handleOpenDuplicate}
          appCategories={appCategories}
        />
      )}

      {/* Edit modal */}
      {editEvent && userId && (
        <AddEventModal
          defaultDate={new Date(editEvent.start_datetime)}
          isWork={editEvent.is_work}
          userId={userId}
          existingEvent={editEvent}
          isDuplicate={false}
          onSave={handleEventSaved}
          onUpdate={handleEventUpdated}
          onClose={() => setEditEvent(null)}
          appCategories={appCategories}
          clients={calClients}
        />
      )}

      {/* Duplicate modal */}
      {dupEvent && userId && (
        <AddEventModal
          defaultDate={new Date(dupEvent.start_datetime)}
          isWork={dupEvent.is_work}
          userId={userId}
          existingEvent={dupEvent}
          isDuplicate={true}
          onSave={handleEventSaved}
          onClose={() => setDupEvent(null)}
          appCategories={appCategories}
          clients={calClients}
        />
      )}

      {/* Task edit modal — opened by clicking a task chip in calendar */}
      {editingCalTask && (
        <AddTaskSheet
          categories={appCategories}
          clients={calClients}
          existingTask={editingCalTask}
          onSave={async payload => {
            const updated = { ...editingCalTask, ...payload }
            await updateTask(updated)
            lastSaveRef.current = Date.now()
            setEditingCalTask(null)
            load(true)
          }}
          onClose={() => setEditingCalTask(null)}
        />
      )}

      {/* Add task modal — opened from DayPanel */}
      {showAddTask && userId && (
        <AddTaskSheet
          categories={appCategories}
          clients={calClients}
          defaultDueDate={`${addDate.getFullYear()}-${String(addDate.getMonth()+1).padStart(2,'0')}-${String(addDate.getDate()).padStart(2,'0')}`}
          onSave={async payload => {
            const { insertTask } = await import('@/features/todo/api')
            await insertTask({ user_id: userId, status: 'open', done_at: null, ...payload })
            lastSaveRef.current = Date.now()
            setShowAddTask(false)
            load(true)
          }}
          onClose={() => setShowAddTask(false)}
        />
      )}
    </div>
  )
}
