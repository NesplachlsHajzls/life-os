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
} from '@/features/calendar/api'
import { fetchTasks, updateTask, Task } from '@/features/todo/api'
import { fetchClients } from '@/features/prace/api'
import { AddTaskSheet } from '@/features/todo/components/AddTaskSheet'
import { AppCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'
import { fetchCategories } from '@/features/categories/api'

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

function fmtDateInput(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ── EventChip ─────────────────────────────────────────────────────

function EventChip({ event, onClick, onComplete, isCompleted, appCategories = DEFAULT_CATEGORIES }: {
  event: CalendarEvent
  onClick?: () => void
  onComplete?: () => void
  isCompleted?: boolean
  appCategories?: AppCategory[]
}) {
  const style = getCategoryInlineStyle(event.category, appCategories)
  return (
    <div
      onClick={onClick}
      className="rounded-xl px-3 py-2 border-l-[3px] cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
      style={{ background: style.background, borderColor: style.borderColor }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: style.color }}>
          {event.is_all_day ? '📌 Celý den' : `${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}`}
        </div>
        <div className="text-[13px] font-semibold text-gray-800 mt-0.5 truncate">
          {event.emoji && <span className="mr-1">{event.emoji}</span>}
          {event.title}
          {event.is_recurring && <span className="ml-1 text-[10px] text-gray-400">🔁</span>}
        </div>
      </div>
      {onComplete && (
        <button
          onClick={e => { e.stopPropagation(); onComplete() }}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center ${
            isCompleted
              ? 'bg-green-400 border-green-400'
              : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
          }`}
          aria-label="Dokončit"
        >
          {isCompleted && <span className="text-[9px] text-white font-bold leading-none">✓</span>}
        </button>
      )}
    </div>
  )
}

// ── TaskChip ──────────────────────────────────────────────────────

function TaskChip({ task, onClick, onComplete, isCompleted, appCategories = DEFAULT_CATEGORIES }: {
  task: Task
  onClick?: () => void
  onComplete?: () => void
  isCompleted?: boolean
  appCategories?: AppCategory[]
}) {
  const style = getCategoryInlineStyle(task.category ?? 'osobni', appCategories)
  const isWork = task.category === 'prace' || !!task.client_id
  return (
    <div
      onClick={onClick}
      className={`rounded-xl px-3 py-2 border-l-[3px] ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} flex items-center gap-2`}
      style={{ background: style.background, borderColor: style.borderColor }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: style.color }}>
          ✅ Úkol{isWork ? ' · práce' : ''}
        </div>
        <div className="text-[13px] font-semibold text-gray-700 mt-0.5 truncate">
          {task.title}
        </div>
      </div>
      {onComplete && (
        <button
          onClick={e => { e.stopPropagation(); onComplete() }}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center ${
            isCompleted
              ? 'bg-green-400 border-green-400'
              : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
          }`}
          aria-label="Dokončit úkol"
        >
          {isCompleted && <span className="text-[9px] text-white font-bold leading-none">✓</span>}
        </button>
      )}
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
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: style.background, color: style.color }}>
            {label}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <h2 className="text-[18px] font-bold text-gray-900 mb-1">
          {event.emoji && <span className="mr-2">{event.emoji}</span>}
          {event.title}
        </h2>
        {event.description && <p className="text-[13px] text-gray-500 mb-3">{event.description}</p>}
        <div className="text-[13px] text-gray-600 space-y-1 mb-4">
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
            className="flex-1 py-2.5 rounded-xl bg-gray-50 text-gray-700 text-[13px] font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
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

// ── AddEventModal ─────────────────────────────────────────────────

function AddEventModal({ defaultDate, isWork, userId, existingEvent, isDuplicate, onSave, onUpdate, onClose, appCategories = DEFAULT_CATEGORIES }: {
  defaultDate: Date
  isWork: boolean
  userId: string
  existingEvent?: CalendarEvent   // pre-fill for edit or duplicate
  isDuplicate?: boolean           // if true → insert as new, if false+existingEvent → update
  onSave: (ev: CalendarEvent) => void
  onUpdate?: (ev: CalendarEvent) => void
  onClose: () => void
  appCategories?: AppCategory[]
}) {
  const prefill = existingEvent

  const [title, setTitle]             = useState(prefill?.title ?? '')
  const [emoji, setEmoji]             = useState(prefill?.emoji ?? '📅')
  const [description, setDesc]        = useState(prefill?.description ?? '')
  const [category, setCategory]       = useState<EventCategory>(prefill?.category ?? (isWork ? 'prace' : (appCategories[0]?.id ?? 'osobni')))
  const [isAllDay, setIsAllDay]       = useState(prefill?.is_all_day ?? false)
  const [date, setDate]               = useState(
    prefill ? fmtDateInput(new Date(prefill.start_datetime)) : fmtDateInput(defaultDate)
  )
  const [startTime, setStartTime]     = useState(() => {
    if (prefill && !prefill.is_all_day) {
      const d = new Date(prefill.start_datetime)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return '09:00'
  })
  const [endTime, setEndTime]         = useState(() => {
    if (prefill && !prefill.is_all_day) {
      const d = new Date(prefill.end_datetime)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return '10:00'
  })
  // Duplicates are always one-time — never inherit recurring status from original
  const [isRecurring, setIsRecurring] = useState(isDuplicate ? false : (prefill?.is_recurring ?? false))
  const [recType, setRecType]         = useState<RecurrenceType>(prefill?.recurrence_type ?? 'weekly')
  const [recInterval, setRecInterval] = useState(prefill?.recurrence_interval ?? 1)
  const [saving, setSaving]           = useState(false)
  const [showEmojis, setShowEmojis]   = useState(false)

  const isEditMode = !!existingEvent && !isDuplicate

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      // Parse times from hh:mm strings
      const startISO = isAllDay
        ? `${date}T00:00:00.000Z`
        : new Date(`${date}T${startTime}`).toISOString()
      const endISO = isAllDay
        ? `${date}T23:59:59.000Z`
        : new Date(`${date}T${endTime}`).toISOString()

      const payload = {
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        start_datetime: startISO,
        end_datetime: endISO,
        is_all_day: isAllDay,
        category,
        emoji: emoji || null,
        is_work: isWork || category === 'prace' || category === 'work',
        client_id: existingEvent?.client_id ?? null,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recType : null,
        recurrence_interval: isRecurring ? recInterval : 1,
        recurrence_end_date: existingEvent?.recurrence_end_date ?? null,
      }

      if (isEditMode && existingEvent) {
        // Update existing event
        const baseId = existingEvent.id.split('_')[0]
        await updateEvent({ id: baseId, ...payload })
        const updated: CalendarEvent = { ...existingEvent, ...payload, id: baseId }
        onUpdate?.(updated)
      } else {
        // Insert new (new event or duplicate)
        const ev = await insertEvent(payload)
        onSave(ev)
      }
    } finally {
      setSaving(false)
    }
  }

  const fieldCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-[var(--color-primary)]'
  const labelCls = 'text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1 block'

  const modalTitle = isEditMode ? 'Upravit událost' : isDuplicate ? 'Duplikovat událost' : 'Nová událost'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[16px] font-bold">{modalTitle}</h2>
          <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
        </div>
        <div className="p-5 space-y-4">

          {/* Emoji + Title */}
          <div>
            <label className={labelCls}>Název</label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmojis(v => !v)}
                className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 text-[20px] flex items-center justify-center shrink-0"
              >
                {emoji}
              </button>
              <input
                className={fieldCls}
                placeholder="Název události…"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            {showEmojis && (
              <div className="flex flex-wrap gap-2 mt-2 p-2 bg-gray-50 rounded-xl">
                {EVENT_EMOJIS.map(em => (
                  <button key={em} onClick={() => { setEmoji(em); setShowEmojis(false) }}
                    className={`text-[20px] w-8 h-8 rounded-lg hover:bg-white ${emoji === em ? 'bg-white shadow' : ''}`}
                  >{em}</button>
                ))}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Kategorie</label>
            <div className="flex flex-wrap gap-2">
              {appCategories.map(cat => {
                const catStyle = getCategoryInlineStyle(cat.id, appCategories)
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                    style={isSelected
                      ? { background: catStyle.background, borderColor: catStyle.borderColor, color: catStyle.color }
                      : { background: '#f9fafb', borderColor: '#e5e7eb', color: '#6b7280' }
                    }
                  >
                    {cat.icon} {cat.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Datum</label>
            <input type="date" className={`${fieldCls} min-w-0 max-w-full`} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* All day toggle */}
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-gray-700">Celý den</label>
            <button
              onClick={() => setIsAllDay(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isAllDay ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isAllDay ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Time */}
          {!isAllDay && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>Od</label>
                <input type="time" className={fieldCls} value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Do</label>
                <input type="time" className={fieldCls} value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Popis (volitelný)</label>
            <textarea
              className={`${fieldCls} resize-none`}
              rows={2}
              placeholder="Poznámka…"
              value={description}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-gray-700">🔁 Opakující se</label>
            <button
              onClick={() => setIsRecurring(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isRecurring ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isRecurring ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>

          {isRecurring && (
            <div className="space-y-3 pl-2 border-l-2 border-gray-100">
              <div>
                <label className={labelCls}>Frekvence</label>
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map(rt => (
                    <button
                      key={rt}
                      onClick={() => setRecType(rt)}
                      className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        recType === rt
                          ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {RECURRENCE_LABELS[rt]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Opakovat každých N</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className={`${fieldCls} w-24`}
                  value={recInterval}
                  onChange={e => setRecInterval(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 pt-0">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-bold disabled:opacity-50"
          >
            {saving ? 'Ukládám…' : isEditMode ? 'Uložit změny' : isDuplicate ? 'Vytvořit kopii' : 'Přidat událost'}
          </button>
        </div>
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
    <div className="grid grid-cols-7 gap-1 px-4 py-3 bg-white border-b border-gray-100">
      {days.map((day, i) => {
        const isToday = isSameDay(day, today)
        const hasDot = daysWithEvents.has(day.toDateString())
        return (
          <div
            key={day.toDateString()}
            onClick={() => onDayClick(day)}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-xl cursor-pointer transition-colors ${isToday ? 'bg-[var(--color-primary)]' : 'hover:bg-gray-50'}`}
          >
            <span className={`text-[10px] font-semibold uppercase ${isToday ? 'text-white/70' : 'text-gray-400'}`}>
              {dayLabels[i]}
            </span>
            <span className={`text-[16px] font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>
              {day.getDate()}
            </span>
            {hasDot && (
              <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white/70' : 'bg-[var(--color-primary)]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── WeekView ──────────────────────────────────────────────────────

function WeekView({ weekStart, events, tasks, onDayClick, onEventClick, onTaskClick, onEventComplete, onTaskComplete, completedIds, highlightDay, appCategories = DEFAULT_CATEGORIES }: {
  weekStart: Date
  events: CalendarEvent[]
  tasks: Task[]
  onDayClick: (d: Date) => void
  onEventClick: (ev: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
  onEventComplete?: (ev: CalendarEvent) => void
  onTaskComplete?: (task: Task) => void
  completedIds?: Set<string>
  highlightDay?: string | null
  appCategories?: AppCategory[]
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
        <div className="text-center py-12 text-gray-400">
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
        const label = isToday
          ? `📍 ${CZ_DAYS_FULL[day.getDay()]} ${day.getDate()}. ${CZ_MONTHS[day.getMonth()]} — dnes`
          : `${CZ_DAYS_FULL[day.getDay()]} ${day.getDate()}. ${CZ_MONTHS[day.getMonth()]}`

        return (
          <div
            key={day.toDateString()}
            style={isHighlight ? { animation: 'calFlash 1.4s ease-out', borderRadius: 12 } : undefined}
          >
            {di > 0 && <div className="h-px bg-gray-100 my-4" />}
            <div className="flex items-center justify-between mb-2">
              <div className={`text-[11px] font-bold uppercase tracking-wide ${isToday ? 'text-[var(--color-primary)]' : 'text-gray-400'}`}>
                {label}
              </div>
              <button onClick={() => onDayClick(day)} className="text-[11px] text-[var(--color-primary)] font-semibold">
                + přidat
              </button>
            </div>
            {evs.length === 0 && tks.length === 0
              ? <div className="text-[12px] text-gray-300 py-2 text-center">Žádné události</div>
              : (
                <div className="flex flex-col gap-2">
                  {/* Tasks without time → top of day (before timed events) */}
                  {tks.map(t => (
                    <TaskChip
                      key={t.id}
                      task={t}
                      onClick={onTaskClick ? () => onTaskClick(t) : undefined}
                      onComplete={onTaskComplete ? () => onTaskComplete(t) : undefined}
                      isCompleted={completedIds?.has(t.id)}
                      appCategories={appCategories}
                    />
                  ))}
                  {evs.map(ev => (
                    <EventChip
                      key={ev.id}
                      event={ev}
                      onClick={() => onEventClick(ev)}
                      onComplete={onEventComplete ? () => onEventComplete(ev) : undefined}
                      isCompleted={completedIds?.has(ev.id)}
                      appCategories={appCategories}
                    />
                  ))}
                </div>
              )
            }
          </div>
        )
      })}
    </div>
  )
}

// ── MonthView ─────────────────────────────────────────────────────

function MonthView({ month, events, tasks, onNavigateToDay, onEventClick, appCategories = DEFAULT_CATEGORIES }: {
  month: Date
  events: CalendarEvent[]
  tasks: Task[]
  onNavigateToDay: (d: Date) => void
  onEventClick: (ev: CalendarEvent) => void
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

  return (
    <div className="p-3">
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map(day => {
          const isCurrentMonth = day.getMonth() === month.getMonth()
          const isToday = isSameDay(day, today)
          const evs = eventsByDay[day.toDateString()] ?? []
          const tks = tasksByDay[day.toDateString()] ?? []
          const totalItems = evs.length + tks.length

          // Show up to 2 items total (events first, then tasks)
          const shownEvs = evs.slice(0, 2)
          const remainingSlots = 2 - shownEvs.length
          const shownTks = tks.slice(0, remainingSlots)
          const overflow = totalItems - shownEvs.length - shownTks.length

          return (
            <div
              key={day.toDateString()}
              onClick={() => isCurrentMonth && onNavigateToDay(day)}
              className={`min-h-[64px] rounded-xl p-1.5 transition-colors ${
                isCurrentMonth ? 'cursor-pointer hover:bg-gray-50' : 'opacity-25 pointer-events-none'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold mb-1 mx-auto ${
                isToday ? 'bg-[var(--color-primary)] text-white' : 'text-gray-700'
              }`}>
                {day.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {shownEvs.map(ev => {
                  const catStyle = getCategoryInlineStyle(ev.category, appCategories)
                  return (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                      className="text-[9px] font-semibold px-1 py-0.5 rounded truncate"
                      style={{ background: catStyle.background, color: catStyle.color }}
                    >
                      {ev.emoji} {ev.title}
                    </div>
                  )
                })}
                {shownTks.map(t => (
                  <div
                    key={t.id}
                    onClick={e => e.stopPropagation()}
                    className="text-[9px] font-semibold px-1 py-0.5 rounded truncate bg-indigo-50 text-indigo-500"
                  >
                    ✅ {t.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); onNavigateToDay(day) }}
                    className="text-[9px] text-[var(--color-primary)] font-bold text-center w-full hover:underline"
                  >
                    +{overflow} další
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

type CalView = 'week' | 'month'

export default function KalendarPage() {
  const { user } = useUser()
  const userId = user?.id ?? null

  const [view, setView]         = useState<CalView>('week')
  const [currentDate, setCurrent] = useState(new Date())
  const [events, setEvents]     = useState<CalendarEvent[]>([])
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [addDate, setAddDate]         = useState(new Date())
  const [editEvent, setEditEvent]     = useState<CalendarEvent | null>(null)
  const [dupEvent, setDupEvent]       = useState<CalendarEvent | null>(null)
  const [detailEvent, setDetail]      = useState<CalendarEvent | null>(null)
  const [editingCalTask, setEditingCalTask] = useState<Task | null>(null)
  const [appCategories, setAppCategories]  = useState<AppCategory[]>(DEFAULT_CATEGORIES)
  const [calClients, setCalClients]        = useState<{ id: string; name: string }[]>([])
  const [highlightDay, setHighlightDay]    = useState<string | null>(null)
  const [completedIds, setCompletedIds]    = useState<Set<string>>(new Set())
  const lastSaveRef = useRef<number>(0)

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
    // Switch to week view, navigate to the clicked day, then flash highlight
    setView('week')
    setCurrent(day)
    const dayIso = day.toISOString().split('T')[0]
    setHighlightDay(dayIso)
    setTimeout(() => setHighlightDay(null), 1600)
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

  // Pure visual toggle — no DB changes, no removal from list
  function handleCompleteEvent(event: CalendarEvent) {
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (next.has(event.id)) next.delete(event.id)
      else next.add(event.id)
      return next
    })
  }

  function handleCompleteTask(task: Task) {
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (next.has(task.id)) next.delete(task.id)
      else next.add(task.id)
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
    <>
      <Header
        title="Kalendář"
        action={
          <div className="flex bg-white/15 rounded-lg p-0.5">
            {(['week', 'month'] as CalView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  view === v ? 'bg-white/25 text-white' : 'text-white/60'
                }`}
              >
                {v === 'week' ? 'Týden' : 'Měsíc'}
              </button>
            ))}
          </div>
        }
      />

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-bold">‹</button>
        <span className="text-[14px] font-bold text-gray-800">{headerTitle}</span>
        <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-bold">›</button>
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
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-[13px]">Načítám…</div>
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
            highlightDay={highlightDay}
            appCategories={appCategories}
          />
        ) : (
          <MonthView
            month={currentDate}
            events={events}
            tasks={tasks}
            onNavigateToDay={handleMonthDayClick}
            onEventClick={setDetail}
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

      {/* Modals */}
      {showAdd && userId && (
        <AddEventModal
          defaultDate={addDate}
          isWork={false}
          userId={userId}
          onSave={handleEventSaved}
          onClose={() => setShowAdd(false)}
          appCategories={appCategories}
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
    </>
  )
}
