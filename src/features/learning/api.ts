import { supabase } from '@/lib/supabase'

// ── Learning Items (Books) ─────────────────────────────────────────

export type LearningStatus = 'wishlist' | 'active' | 'done'

export interface LearningItem {
  id: string
  user_id: string
  type: 'book'
  title: string
  author: string | null
  status: LearningStatus
  progress: number
  rating: number | null
  notes: string | null
  started_at: string | null
  finished_at: string | null
  url: string | null
  total_pages: number | null
  current_page: number | null
  cover_emoji: string
}

export async function fetchLearningItems(userId: string): Promise<LearningItem[]> {
  const { data, error } = await supabase
    .from('learning_items')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'book')
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

// ── Learning Areas ────────────────────────────────────────────────

export interface LearningArea {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  description: string | null
  sort_order: number
  created_at: string
}

export const AREA_ICONS = ['🏥', '🤝', '🚀', '💼', '🧠', '📊', '🔐', '⚙️', '📱', '🌐', '💡', '🎯', '📋', '🔬', '💊', '🏛️', '📡', '🤖', '📈', '🗣️']
export const AREA_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#f97316']

export async function fetchLearningAreas(userId: string): Promise<LearningArea[]> {
  const { data, error } = await supabase
    .from('learning_areas')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as LearningArea[]) ?? []
}

export async function insertLearningArea(payload: Omit<LearningArea, 'id' | 'created_at'>): Promise<LearningArea> {
  const { data, error } = await supabase
    .from('learning_areas')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LearningArea
}

export async function updateLearningArea(id: string, patch: Partial<LearningArea>): Promise<void> {
  const { error } = await supabase.from('learning_areas').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteLearningArea(id: string): Promise<void> {
  const { error } = await supabase.from('learning_areas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Knowledge Items ───────────────────────────────────────────────

export type KnowledgeStatus = 'to_learn' | 'learned' | 'uncertain'

export interface KnowledgeItem {
  id: string
  user_id: string
  area_id: string
  title: string
  notes: string | null
  status: KnowledgeStatus
  source_title: string | null
  source_url: string | null
  created_at: string
  learned_at: string | null
}

export const KNOWLEDGE_STATUS_CONFIG: Record<KnowledgeStatus, { label: string; icon: string; color: string; bg: string }> = {
  learned:   { label: 'Naučil jsem se', icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
  to_learn:  { label: 'Chci se naučit',  icon: '📋', color: '#2563eb', bg: '#eff6ff' },
  uncertain: { label: 'Nejsem si jistý', icon: '❓', color: '#d97706', bg: '#fffbeb' },
}

export async function fetchKnowledgeItems(userId: string, areaId: string): Promise<KnowledgeItem[]> {
  const { data, error } = await supabase
    .from('knowledge_items')
    .select('*')
    .eq('user_id', userId)
    .eq('area_id', areaId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as KnowledgeItem[]) ?? []
}

export async function fetchAllKnowledgeItems(userId: string): Promise<KnowledgeItem[]> {
  const { data, error } = await supabase
    .from('knowledge_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as KnowledgeItem[]) ?? []
}

export async function insertKnowledgeItem(payload: Omit<KnowledgeItem, 'id' | 'created_at'>): Promise<KnowledgeItem> {
  const { data, error } = await supabase
    .from('knowledge_items')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as KnowledgeItem
}

export async function updateKnowledgeItem(id: string, patch: Partial<KnowledgeItem>): Promise<void> {
  const { error } = await supabase.from('knowledge_items').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  const { error } = await supabase.from('knowledge_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function getAreaProgress(items: KnowledgeItem[]): { learned: number; total: number; pct: number } {
  const learned = items.filter(i => i.status === 'learned').length
  const total = items.length
  return { learned, total, pct: total === 0 ? 0 : Math.round((learned / total) * 100) }
}
