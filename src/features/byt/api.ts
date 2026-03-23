import { supabase } from '@/lib/supabase'

// ── Room ────────────────────────────────────────────────────────────

export interface Room {
  id: string
  user_id: string
  name: string
  icon: string
  order_index: number
}

export const ROOM_ICONS = ['🛋️', '🛏️', '🍳', '🚿', '🏠', '📦', '🚗', '🌿', '🏋️', '🖥️']

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
}

export const CONTRACT_TYPES: { id: ContractType; label: string; icon: string }[] = [
  { id: 'insurance', label: 'Pojištění', icon: '🛡️' },
  { id: 'utility', label: 'Energie/voda', icon: '💧' },
  { id: 'subscription', label: 'Předplatné', icon: '📱' },
  { id: 'other', label: 'Ostatní', icon: '📄' },
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

// ── HomeAppliance ───────────────────────────────────────────────────

export interface HomeAppliance {
  id: string
  user_id: string
  room_id: string | null
  name: string
  brand: string | null
  purchase_date: string | null
  warranty_until: string | null
  notes: string | null
}

export async function fetchAppliances(userId: string): Promise<HomeAppliance[]> {
  const { data, error } = await supabase
    .from('byt_appliances')
    .select('*')
    .eq('user_id', userId)
    .order('purchase_date', { ascending: false, nullsFirst: true })
  if (error) throw new Error(error.message)
  return (data as HomeAppliance[]) ?? []
}

export async function insertAppliance(payload: Omit<HomeAppliance, 'id'>): Promise<HomeAppliance> {
  const { data, error } = await supabase
    .from('byt_appliances')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as HomeAppliance
}

export async function updateAppliance(id: string, patch: Partial<HomeAppliance>): Promise<void> {
  const { error } = await supabase.from('byt_appliances').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteAppliance(id: string): Promise<void> {
  const { error } = await supabase.from('byt_appliances').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
