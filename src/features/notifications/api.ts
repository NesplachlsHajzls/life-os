import { supabase } from '@/lib/supabase'
import { CalendarEvent, fetchUpcomingEvents, expandRecurring } from '@/features/calendar/api'

// ── Types ─────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  user_id: string
  title: string
  message: string
  event_id: string | null
  read: boolean
  created_at: string
}

// ── Fetch ─────────────────────────────────────────────────────────

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return (data as AppNotification[]) ?? []
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw new Error(error.message)
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Settings helpers ──────────────────────────────────────────────

export type NotifLeadTime = 30 | 60 | 180 | 720 | 1440   // minutes before event
export const NOTIF_LEAD_OPTIONS: { value: NotifLeadTime; label: string }[] = [
  { value: 30,   label: '30 min předem' },
  { value: 60,   label: '1 hod předem' },
  { value: 180,  label: '3 hod předem' },
  { value: 720,  label: '12 hod předem' },
  { value: 1440, label: 'Den předem' },
]

export function getNotifLeadTime(): NotifLeadTime {
  try {
    const v = localStorage.getItem('notif_lead_minutes')
    if (v) return Number(v) as NotifLeadTime
  } catch {}
  return 60  // default: 1 hour
}

export function setNotifLeadTime(v: NotifLeadTime): void {
  try { localStorage.setItem('notif_lead_minutes', String(v)) } catch {}
}

// ── Auto-generate ─────────────────────────────────────────────────
// Called on app open — generates notifications for upcoming events
// Deduplication: skip if an UNREAD notification for that event already exists

export async function generateUpcomingNotifications(userId: string): Promise<void> {
  try {
    const leadMinutes = getNotifLeadTime()
    const now = new Date()
    // Fetch window: from now up to leadMinutes ahead (+ small buffer so you see
    // events that start soon, even if you open the app slightly late)
    const windowEnd = new Date(now.getTime() + (leadMinutes + 30) * 60 * 1000)

    const upcoming = await fetchUpcomingEvents(userId, Math.ceil((leadMinutes + 30) / 60))

    const allEvents: CalendarEvent[] = []
    for (const ev of upcoming) {
      if (ev.is_recurring) {
        allEvents.push(...expandRecurring(ev, now, windowEnd))
      } else {
        allEvents.push(ev)
      }
    }

    if (allEvents.length === 0) return

    // Dedup: check ALL unread notifications for these event base IDs
    const baseIds = allEvents.map(ev => ev.id.split('_')[0])
    const { data: existing } = await supabase
      .from('notifications')
      .select('event_id')
      .eq('user_id', userId)
      .eq('read', false)
      .in('event_id', baseIds)

    const existingIds = new Set((existing ?? []).map((n: { event_id: string }) => n.event_id))

    const toInsert: Omit<AppNotification, 'id' | 'created_at'>[] = []

    for (const ev of allEvents) {
      const baseId = ev.id.split('_')[0]
      if (existingIds.has(baseId)) continue

      const start = new Date(ev.start_datetime)
      const diffMin = Math.round((start.getTime() - now.getTime()) / 60000)
      // Only notify events that are actually upcoming within the lead window
      if (diffMin < 0) continue

      let timeLabel = ''
      if (diffMin < 60) timeLabel = `za ${diffMin} min`
      else if (diffMin < 1440) timeLabel = `za ${Math.round(diffMin / 60)} hod`
      else timeLabel = `zítra`

      const emoji = ev.emoji ?? '📅'

      toInsert.push({
        user_id: userId,
        title: `${emoji} ${ev.title}`,
        message: `Začíná ${timeLabel} (${formatTime(start)})`,
        event_id: baseId,
        read: false,
      })
    }

    if (toInsert.length > 0) {
      await supabase.from('notifications').insert(toInsert)
    }
  } catch {
    // Silent fail — notifications are non-critical
  }
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}
