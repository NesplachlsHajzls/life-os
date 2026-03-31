import { supabase } from '@/lib/supabase'

// ── Habit ────────────────────────────────────────────────────────────

export interface Habit {
  id: string
  user_id: string
  title: string
  emoji: string
  color: string
  goal_days: number
  is_active: boolean
  created_at: string
}

export interface HabitLog {
  id: string
  user_id: string
  habit_id: string
  date: string   // ISO date string YYYY-MM-DD
  done: boolean
  created_at: string
}

export const HABIT_EMOJIS = [
  '💪', '🏃', '📚', '🧘', '🥗', '💤', '🚫', '📵',
  '🧠', '✍️', '🎯', '🌅', '💧', '🚶', '🎸', '🍎',
]

export const HABIT_COLORS = [
  '#D44A1A', '#E86B3A', '#16a34a', '#0ea5e9',
  '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4',
  '#64748b', '#ef4444',
]

export async function fetchHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Habit[]) ?? []
}

export async function insertHabit(payload: Omit<Habit, 'id' | 'created_at'>): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Habit
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<void> {
  const { error } = await supabase.from('habits').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

// ── HabitLog ─────────────────────────────────────────────────────────

export async function fetchHabitLogs(userId: string, fromDate: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as HabitLog[]) ?? []
}

export async function toggleHabitLog(userId: string, habitId: string, date: string, currentlyDone: boolean): Promise<void> {
  if (currentlyDone) {
    // Delete the log
    await supabase
      .from('habit_logs')
      .delete()
      .eq('habit_id', habitId)
      .eq('date', date)
  } else {
    // Insert log (upsert to handle race conditions)
    const { error } = await supabase
      .from('habit_logs')
      .upsert({ user_id: userId, habit_id: habitId, date, done: true }, { onConflict: 'habit_id,date' })
    if (error) throw new Error(error.message)
  }
}

// ── Client-side helpers ───────────────────────────────────────────────

export function getStreak(habitId: string, logs: HabitLog[]): number {
  const doneDates = new Set(
    logs.filter(l => l.habit_id === habitId && l.done).map(l => l.date)
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (doneDates.has(dateStr)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function getDoneCount(habitId: string, logs: HabitLog[]): number {
  return logs.filter(l => l.habit_id === habitId && l.done).length
}

export function getLast7Days(habitId: string, logs: HabitLog[]): { date: string; done: boolean }[] {
  const doneDates = new Set(
    logs.filter(l => l.habit_id === habitId && l.done).map(l => l.date)
  )
  const result = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, done: doneDates.has(dateStr) })
  }
  return result
}

export function isTodayDone(habitId: string, logs: HabitLog[]): boolean {
  const today = new Date().toISOString().split('T')[0]
  return logs.some(l => l.habit_id === habitId && l.date === today && l.done)
}
