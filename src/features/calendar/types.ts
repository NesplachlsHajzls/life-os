export type EventCategory = 'work' | 'personal' | 'sport'

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description?: string
  start: string    // ISO datetime
  end: string      // ISO datetime
  category: EventCategory
  color?: string
  emoji?: string   // volitelné emoji / ikona
  created_at: string
}
