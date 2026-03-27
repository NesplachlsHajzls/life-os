import { supabase } from '@/lib/supabase'

// ── Room ────────────────────────────────────────────────────────────

export interface Room {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  order_index: number
}

export const ROOM_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#0ea5e9', '#06b6d4',
  '#475569', '#92400e', '#16a34a', '#3b82f6',
  '#ea580c', '#64748b', '#44403c',
]

export const ROOM_PRESETS: { name: string; icon: string; color: string }[] = [
  { name: 'Obývací pokoj',      icon: '🛋️', color: '#6366f1' },
  { name: 'Ložnice',            icon: '🛏️', color: '#8b5cf6' },
  { name: 'Dětský pokoj',       icon: '🧸', color: '#ec4899' },
  { name: 'Kuchyň',             icon: '🍳', color: '#f59e0b' },
  { name: 'Koupelna',           icon: '🚿', color: '#0ea5e9' },
  { name: 'WC',                 icon: '🚽', color: '#06b6d4' },
  { name: 'Chodba',             icon: '🚪', color: '#6b7280' },
  { name: 'Pracovna',           icon: '🖥️', color: '#3b82f6' },
  { name: 'Balkón',             icon: '🌅', color: '#10b981' },
  { name: 'Terasa',             icon: '☀️', color: '#22c55e' },
  { name: 'Zahrada',            icon: '🌿', color: '#16a34a' },
  { name: 'Garáž',              icon: '🚗', color: '#475569' },
  { name: 'Kůlna',              icon: '🪚', color: '#92400e' },
  { name: 'Sklep',              icon: '📦', color: '#44403c' },
  { name: 'Technická místnost', icon: '⚙️', color: '#64748b' },
  { name: 'Posilovna',          icon: '🏋️', color: '#ef4444' },
  { name: 'Sauna',              icon: '🔥', color: '#ea580c' },
]

export const ROOM_ICONS = ROOM_PRESETS.map(p => p.icon)

export async function fetchRooms(userId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from('byt_rooms')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Room[]) ?? []
}

export async function insertRoom(payload: Omit<Room, 'id'>): Promise<Room> {
  const { data, error } = await supabase
    .from('byt_rooms')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Room
}

export async function updateRoom(id: string, patch: Partial<Room>): Promise<void> {
  const { error } = await supabase.from('byt_rooms').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('byt_rooms').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── RoomTodo ────────────────────────────────────────────────────────

export type RoomTodoType = 'todo' | 'buy'

export interface RoomTodo {
  id: string
  room_id: string
  user_id: string
  title: string
  done: boolean
  type: RoomTodoType
  price: number | null
  notes: string | null
  created_at: string
}

export async function fetchRoomTodos(roomId: string): Promise<RoomTodo[]> {
  const { data, error } = await supabase
    .from('byt_room_todos')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as RoomTodo[]) ?? []
}

export async function insertRoomTodo(payload: Omit<RoomTodo, 'id' | 'created_at'>): Promise<RoomTodo> {
  const { data, error } = await supabase
    .from('byt_room_todos')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as RoomTodo
}

export async function updateRoomTodo(id: string, patch: Partial<RoomTodo>): Promise<void> {
  const { error } = await supabase.from('byt_room_todos').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRoomTodo(id: string): Promise<void> {
  const { error } = await supabase.from('byt_room_todos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── HomeContract ────────────────────────────────────────────────────

export type ContractType = 'insurance' | 'utility' | 'subscription' | 'other'

export interface HomeContract {
  id: string
  user_id: string
  name: string
  type: ContractType
  provider: string | null
  amount_monthly: number
  renewal_date: string | null
  notes: string | null
  auto_renew: boolean
  file_url: string | null
}

export const CONTRACT_TYPES: { id: ContractType; label: string; icon: string }[] = [
  { id: 'insurance',    label: 'Pojištění',      icon: '🛡️' },
  { id: 'utility',      label: 'Energie / voda', icon: '💧' },
  { id: 'subscription', label: 'Předplatné',     icon: '📱' },
  { id: 'other',        label: 'Ostatní',        icon: '📄' },
]

export async function fetchContracts(userId: string): Promise<HomeContract[]> {
  const { data, error } = await supabase
    .from('byt_contracts')
    .select('*')
    .eq('user_id', userId)
    .order('renewal_date', { ascending: true, nullsFirst: true })
  if (error) throw new Error(error.message)
  return (data as HomeContract[]) ?? []
}

export async function insertContract(payload: Omit<HomeContract, 'id'>): Promise<HomeContract> {
  const { data, error } = await supabase
    .from('byt_contracts')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as HomeContract
}

export async function updateContract(id: string, patch: Partial<HomeContract>): Promise<void> {
  const { error } = await supabase.from('byt_contracts').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from('byt_contracts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
