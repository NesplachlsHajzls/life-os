import { supabase } from '@/lib/supabase'
import { AppCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'

// TodoCategory = AppCategory (zpětná kompatibilita)
export type TodoCategory = AppCategory
export { DEFAULT_CATEGORIES as DEFAULT_TODO_CATEGORIES }

// ── Types ─────────────────────────────────────────────────────────

export interface Task {
  id: string
  user_id: string
  title: string
  priority: 1 | 2 | 3
  category: string
  client_id: string | null
  due_date: string | null
  note: string | null
  url: string | null
  status: 'open' | 'done'
  done_at: string | null
  created_at: string
}

export interface Routine {
  id: string
  user_id: string
  title: string
  frequency: 'daily' | 'weekly' | 'monthly'
  category: string
}

export interface TodoSettings {
  user_id: string
  categories: TodoCategory[]
}

// ── Module-level cache ────────────────────────────────────────────

const CACHE_TTL = 60_000

interface TodoCache { tasks: Task[]; ts: number }
const _todoCache = new Map<string, TodoCache>()

export function getTodoCache(userId: string): Task[] | null {
  const c = _todoCache.get(userId)
  if (!c || Date.now() - c.ts > CACHE_TTL) { _todoCache.delete(userId); return null }
  return c.tasks
}
export function setTodoCache(userId: string, tasks: Task[]) {
  _todoCache.set(userId, { tasks, ts: Date.now() })
}
export function invalidateTodoCache(userId: string) {
  _todoCache.delete(userId)
}

// ── Tasks ─────────────────────────────────────────────────────────

export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Task[]) ?? []
}

export async function insertTask(payload: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Task
}

export async function updateTask(task: Partial<Task> & { id: string }): Promise<void> {
  const { error } = await supabase.from('tasks').update(task).eq('id', task.id)
  if (error) throw new Error(error.message)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Routines ──────────────────────────────────────────────────────

export async function fetchRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (data as Routine[]) ?? []
}

export async function insertRoutine(payload: Omit<Routine, 'id'>): Promise<Routine> {
  const { data, error } = await supabase.from('routines').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Routine
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Settings (categories) ─────────────────────────────────────────

export async function fetchTodoSettings(userId: string): Promise<TodoSettings | null> {
  const { data } = await supabase
    .from('todo_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data as TodoSettings | null
}

export async function saveTodoSettings(userId: string, categories: TodoCategory[]): Promise<void> {
  const { error } = await supabase
    .from('todo_settings')
    .upsert({ user_id: userId, categories }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}
