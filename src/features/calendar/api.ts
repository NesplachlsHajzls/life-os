import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────

// EventCategory je nyní volný string — odpovídá AppCategory.id (nebo legacy hodnoty)
export type EventCategory = string

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  start_datetime: string   // ISO
  end_datetime: string     // ISO
  is_all_day: boolean
  category: EventCategory
  emoji: string | null
  is_work: boolean
  client_id: string | null
  is_recurring: boolean
  recurrence_type: RecurrenceType | null
  recurrence_interval: number
  recurrence_end_date: string | null
  created_at: string
}

import { AppCategory, findCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'

// Zpětná kompatibilita — statické barvy pro staré hodnoty, nahrazeno dynamickými kategoriemi
export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  personal:  { bg: '#3b82f618', border: '#3b82f6', text: '#3b82f6' },
  work:      { bg: '#8b5cf618', border: '#8b5cf6', text: '#8b5cf6' },
  sport:     { bg: '#22c55e18', border: '#22c55e', text: '#22c55e' },
  deadline:  { bg: '#ef444418', border: '#ef4444', text: '#ef4444' },
  finance:   { bg: '#f59e0b18', border: '#f59e0b', text: '#f59e0b' },
}

export const CATEGORY_LABELS: Record<string, string> = {
  personal: 'Osobní',
  work:     'Práce',
  sport:    'Sport',
  deadline: 'Deadline',
  finance:  'Finance',
}

/** Dynamické barvy z AppCategory (inline styly, ne Tailwind třídy) */
export function getCategoryInlineStyle(
  categoryId: string,
  cats: AppCategory[] = DEFAULT_CATEGORIES
): { background: string; borderColor: string; color: string } {
  const cat = findCategory(categoryId, cats)
  const color = cat?.color ?? '#94a3b8'
  return {
    background:  color + '18',
    borderColor: color,
    color:       color,
  }
}

/** Vrátí název kategorie */
export function getCategoryLabel(categoryId: string, cats: AppCategory[] = DEFAULT_CATEGORIES): string {
  return findCategory(categoryId, cats)?.name ?? categoryId
}

/** Vrátí ikonu kategorie */
export function getCategoryIcon(categoryId: string, cats: AppCategory[] = DEFAULT_CATEGORIES): string {
  return findCategory(categoryId, cats)?.icon ?? '📅'
}

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  daily:   'Každý den',
  weekly:  'Každý týden',
  monthly: 'Každý měsíc',
  yearly:  'Každý rok',
}

export const EVENT_EMOJIS = ['📅', '💼', '🏋️', '🍕', '📞', '💰', '🏠', '✈️', '🎉', '📋', '💊', '🛒', '📌', '🎯', '🔔']

// ── Fetch ─────────────────────────────────────────────────────────

export async function fetchEventsInRange(
  userId: string,
  from: string,
  to: string,
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .or(`start_datetime.gte.${from},is_recurring.eq.true`)
    .lte('start_datetime', to)
    .order('start_datetime', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as CalendarEvent[]) ?? []
}

export async function fetchUpcomingEvents(userId: string, hours = 48): Promise<CalendarEvent[]> {
  const now = new Date().toISOString()
  const until = new Date(Date.now() + hours * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_datetime', now)
    .lte('start_datetime', until)
    .order('start_datetime', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as CalendarEvent[]) ?? []
}

export async function insertEvent(
  payload: Omit<CalendarEvent, 'id' | 'created_at'>,
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CalendarEvent
}

export async function updateEvent(
  event: Partial<CalendarEvent> & { id: string },
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update(event)
    .eq('id', event.id)
  if (error) throw new Error(error.message)
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Recurring expansion ───────────────────────────────────────────
// Generates virtual occurrences of recurring events within a date range

export function expandRecurring(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  if (!event.is_recurring || !event.recurrence_type) return [event]

  const results: CalendarEvent[] = []
  const orig = new Date(event.start_datetime)
  const origEnd = new Date(event.end_datetime)
  const duration = origEnd.getTime() - orig.getTime()

  let cursor = new Date(orig)
  const endLimit = event.recurrence_end_date ? new Date(event.recurrence_end_date) : rangeEnd

  // Move cursor to first occurrence within range
  while (cursor < rangeStart) {
    cursor = addRecurrence(cursor, event.recurrence_type, event.recurrence_interval)
  }

  let safety = 0
  while (cursor <= rangeEnd && cursor <= endLimit && safety < 200) {
    safety++
    const occEnd = new Date(cursor.getTime() + duration)
    results.push({
      ...event,
      id: `${event.id}_${cursor.toISOString()}`,
      start_datetime: cursor.toISOString(),
      end_datetime: occEnd.toISOString(),
    })
    cursor = addRecurrence(cursor, event.recurrence_type, event.recurrence_interval)
  }

  return results
}

function addRecurrence(date: Date, type: RecurrenceType, interval: number): Date {
  const d = new Date(date)
  switch (type) {
    case 'daily':   d.setDate(d.getDate() + interval); break
    case 'weekly':  d.setDate(d.getDate() + 7 * interval); break
    case 'monthly': d.setMonth(d.getMonth() + interval); break
    case 'yearly':  d.setFullYear(d.getFullYear() + interval); break
  }
  return d
}
