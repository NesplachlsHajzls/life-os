import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────

export interface DriveSettings {
  user_id: string
  initial_odometer: number
  vehicle_name: string
}

export interface DriveTrip {
  id: string
  user_id: string
  date: string          // YYYY-MM-DD
  from_place: string
  to_place: string
  km: number
  type: 'business' | 'private'
  note: string
  created_at: string
}

export interface DriveRefuel {
  id: string
  user_id: string
  date: string          // YYYY-MM-DD
  liters: number
  price_per_liter: number
  note: string
  created_at: string
}

// ── Settings ──────────────────────────────────────────────────────

export async function fetchDriveSettings(userId: string): Promise<DriveSettings> {
  const { data } = await supabase
    .from('drive_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data ?? { user_id: userId, initial_odometer: 0, vehicle_name: '' }
}

export async function upsertDriveSettings(settings: DriveSettings): Promise<void> {
  const { error } = await supabase
    .from('drive_settings')
    .upsert({ ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

// ── Trips ─────────────────────────────────────────────────────────

export async function fetchDriveTrips(userId: string): Promise<DriveTrip[]> {
  const { data, error } = await supabase
    .from('drive_trips')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as DriveTrip[]) ?? []
}

export async function insertDriveTrip(
  payload: Omit<DriveTrip, 'id' | 'created_at'>
): Promise<DriveTrip> {
  const { data, error } = await supabase
    .from('drive_trips')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as DriveTrip
}

export async function updateDriveTrip(trip: Partial<DriveTrip> & { id: string }): Promise<void> {
  const { error } = await supabase.from('drive_trips').update(trip).eq('id', trip.id)
  if (error) throw new Error(error.message)
}

export async function deleteDriveTrip(id: string): Promise<void> {
  const { error } = await supabase.from('drive_trips').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Refuels ───────────────────────────────────────────────────────

export async function fetchDriveRefuels(userId: string): Promise<DriveRefuel[]> {
  const { data, error } = await supabase
    .from('drive_refuels')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as DriveRefuel[]) ?? []
}

export async function insertDriveRefuel(
  payload: Omit<DriveRefuel, 'id' | 'created_at'>
): Promise<DriveRefuel> {
  const { data, error } = await supabase
    .from('drive_refuels')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as DriveRefuel
}

export async function updateDriveRefuel(
  refuel: Partial<DriveRefuel> & { id: string }
): Promise<void> {
  const { error } = await supabase.from('drive_refuels').update(refuel).eq('id', refuel.id)
  if (error) throw new Error(error.message)
}

export async function deleteDriveRefuel(id: string): Promise<void> {
  const { error } = await supabase.from('drive_refuels').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
