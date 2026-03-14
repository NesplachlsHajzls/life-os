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

// ── Auto-generate ─────────────────────────────────────────────────
// Called on app open — generates notifications for upcoming events if not already generated

export async function generateUpcomingNotifications(userId: string): Promise<void> {
  try {
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 3600 * 1000)

    // Fetch upcoming non-recurring events
    const upcoming = await fetchUpcomingEvents(userId, 48)

    // Also expand recurring events for next 48h
    const allEvents: CalendarEvent[] = []
    for (const ev of upcoming) {
      if (ev.is_recurring) {
        const expanded = expandRecurring(ev, now, in48h)
        allEvents.push(...expanded)
      } else {
        allEvents.push(ev)
      }
    }

    // Check which event_ids already have notifications today
    const today = now.toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('notifications')
      .select('event_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', today)

    const existingIds = new Set((existing ?? []).map((n: { event_id: string }) => n.event_id))

    const toInsert: Omit<AppNotification, 'id' | 'created_at'>[] = []

    for (const ev of allEvents) {
      // Use base ID for recurring (strip the _timestamp suffix)
      const baseId = ev.id.split('_')[0]
      if (existingIds.has(baseId)) continue

      const start = new Date(ev.start_datetime)
      const diffMin = Math.round((start.getTime() - now.getTime()) / 60000)

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
