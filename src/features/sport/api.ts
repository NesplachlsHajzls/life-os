import { supabase } from '@/lib/supabase'

export type WorkoutType = 'run' | 'swim' | 'gym' | 'bike' | 'yoga' | 'other'

export interface Workout {
  id: string
  user_id: string
  type: WorkoutType
  title: string
  date: string
  duration_min: number
  distance_km: number | null
  notes: string | null
  calories: number | null
  calendar_event_id: string | null
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  name: string
  sets: number | null
  reps: number | null
  weight_kg: number | null
  distance_km: number | null
  duration_min: number | null
}

export interface MealLog {
  id: string
  user_id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  calories: number | null
}

export interface Supplement {
  id: string
  user_id: string
  name: string
  dose: string
  timing: 'morning' | 'evening' | 'pre_workout' | 'post_workout' | 'anytime'
  notes: string | null
  active: boolean
}

export interface WorkoutStats {
  total_workouts: number
  total_km: number
  total_hours: number
  this_week: number
  this_month: number
}

export const WORKOUT_TYPES: { id: WorkoutType; label: string; icon: string; color: string }[] = [
  { id: 'run', label: 'Běh', icon: '🏃', color: '#ef4444' },
  { id: 'swim', label: 'Plavání', icon: '🏊', color: '#0ea5e9' },
  { id: 'gym', label: 'Posilovna', icon: '🏋️', color: '#8b5cf6' },
  { id: 'bike', label: 'Kolo', icon: '🚴', color: '#f59e0b' },
  { id: 'yoga', label: 'Yoga', icon: '🧘', color: '#ec4899' },
  { id: 'other', label: 'Ostatní', icon: '⚽', color: '#6b7280' },
]

export async function fetchWorkouts(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Workout[]) ?? []
}

export async function insertWorkout(payload: Omit<Workout, 'id'>): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Workout
}

export async function updateWorkout(id: string, patch: Partial<Workout>): Promise<void> {
  const { error } = await supabase.from('workouts').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchMeals(userId: string, date: string): Promise<MealLog[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as MealLog[]) ?? []
}

export async function insertMeal(payload: Omit<MealLog, 'id'>): Promise<MealLog> {
  const { data, error } = await supabase
    .from('meal_logs')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as MealLog
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meal_logs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchSupplements(userId: string): Promise<Supplement[]> {
  const { data, error } = await supabase
    .from('supplements')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Supplement[]) ?? []
}

export async function insertSupplement(payload: Omit<Supplement, 'id'>): Promise<Supplement> {
  const { data, error } = await supabase
    .from('supplements')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Supplement
}

export async function updateSupplement(id: string, patch: Partial<Supplement>): Promise<void> {
  const { error } = await supabase.from('supplements').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteSupplement(id: string): Promise<void> {
  const { error } = await supabase.from('supplements').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchWorkoutStats(userId: string): Promise<WorkoutStats> {
  const workouts = await fetchWorkouts(userId)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const thisWeek = workouts.filter(w => new Date(w.date) >= weekAgo).length
  const thisMonth = workouts.filter(w => new Date(w.date) >= monthAgo).length
  const totalKm = workouts.reduce((sum, w) => sum + (w.distance_km ?? 0), 0)
  const totalHours = workouts.reduce((sum, w) => sum + w.duration_min, 0) / 60

  return {
    total_workouts: workouts.length,
    total_km: Math.round(totalKm * 10) / 10,
    total_hours: Math.round(totalHours * 10) / 10,
    this_week: thisWeek,
    this_month: thisMonth,
  }
}
