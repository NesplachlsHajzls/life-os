import { supabase } from '@/lib/supabase'

export type LearningItemType = 'book' | 'course' | 'topic' | 'podcast'
export type LearningStatus = 'wishlist' | 'active' | 'done'

export interface LearningItem {
  id: string
  user_id: string
  type: LearningItemType
  title: string
  author: string | null
  status: LearningStatus
  progress: number
  rating: number | null
  notes: string | null
  started_at: string | null
  finished_at: string | null
  url: string | null
  category_id: string | null
  total_pages: number | null
  current_page: number | null
  cover_emoji: string
}

export interface LearningCategory {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
}

export interface LearningGoal {
  id: string
  user_id: string
  title: string
  type: 'books_per_year' | 'courses_per_year' | 'custom'
  target: number
  current: number
  year: number
}

export const ITEM_TYPES: { id: LearningItemType; label: string; icon: string }[] = [
  { id: 'book', label: 'Kniha', icon: '📚' },
  { id: 'course', label: 'Kurz', icon: '🎓' },
  { id: 'topic', label: 'Téma', icon: '🧠' },
  { id: 'podcast', label: 'Podcast', icon: '🎙️' },
]

const XP_VALUES = { book: 100, course: 150, topic: 50, podcast: 75 }

export async function fetchLearningItems(userId: string): Promise<LearningItem[]> {
  const { data, error } = await supabase
    .from('learning_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as LearningItem[]) ?? []
}

export async function insertLearningItem(payload: Omit<LearningItem, 'id'>): Promise<LearningItem> {
  const { data, error } = await supabase
    .from('learning_items')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LearningItem
}

export async function updateLearningItem(id: string, patch: Partial<LearningItem>): Promise<void> {
  const { error } = await supabase.from('learning_items').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteLearningItem(id: string): Promise<void> {
  const { error } = await supabase.from('learning_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchLearningGoals(userId: string): Promise<LearningGoal[]> {
  const { data, error } = await supabase
    .from('learning_goals')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as LearningGoal[]) ?? []
}

export async function insertLearningGoal(payload: Omit<LearningGoal, 'id'>): Promise<LearningGoal> {
  const { data, error } = await supabase
    .from('learning_goals')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LearningGoal
}

export async function updateLearningGoal(id: string, patch: Partial<LearningGoal>): Promise<void> {
  const { error } = await supabase.from('learning_goals').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export function calculateXP(items: LearningItem[]): number {
  return items.filter(it => it.status === 'done').reduce((sum, it) => sum + (XP_VALUES[it.type] ?? 0), 0)
}

export function getLevelFromXP(xp: number): { level: string; nextLevelXP: number; progress: number } {
  const levels = [
    { name: 'Začátečník', min: 0, max: 200 },
    { name: 'Pokročilý', min: 200, max: 500 },
    { name: 'Expert', min: 500, max: 1000 },
    { name: 'Mistr', min: 1000, max: Infinity },
  ]
  const current = levels.find(l => xp >= l.min && xp < l.max) || levels[levels.length - 1]
  return {
    level: current.name,
    nextLevelXP: current.max,
    progress: Math.min((xp - current.min) / (current.max - current.min), 1),
  }
}
