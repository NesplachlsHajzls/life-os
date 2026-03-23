import { supabase } from '@/lib/supabase'

// ── Place ────────────────────────────────────────────────────────

export type PlaceType = 'restaurant' | 'cafe' | 'hotel' | 'bar' | 'attraction' | 'other'
export type PlaceStatus = 'want' | 'visited'

export interface Place {
  id: string
  user_id: string
  name: string
  type: PlaceType
  city: string | null
  country: string | null
  status: PlaceStatus
  rating: number | null
  notes: string | null
  url: string | null
  visited_at: string | null
  tags: string[]
}

export const PLACE_TYPES: { id: PlaceType; label: string; icon: string }[] = [
  { id: 'restaurant', label: 'Restaurace', icon: '🍽️' },
  { id: 'cafe', label: 'Kavárna', icon: '☕' },
  { id: 'hotel', label: 'Hotel', icon: '🏨' },
  { id: 'bar', label: 'Bar', icon: '🍹' },
  { id: 'attraction', label: 'Atrakce', icon: '🎭' },
  { id: 'other', label: 'Ostatní', icon: '📍' },
]

export async function fetchPlaces(userId: string): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Place[]) ?? []
}

export async function insertPlace(payload: Omit<Place, 'id'>): Promise<Place> {
  const { data, error } = await supabase
    .from('places')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Place
}

export async function updatePlace(id: string, patch: Partial<Place>): Promise<void> {
  const { error } = await supabase.from('places').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase.from('places').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Trip ─────────────────────────────────────────────────────────

export type TripStatus = 'planning' | 'done'

export interface Trip {
  id: string
  user_id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  status: TripStatus
  budget_estimated: number | null
  budget_actual: number | null
  notes: string | null
  cover_emoji: string
}

export async function fetchTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Trip[]) ?? []
}

export async function insertTrip(payload: Omit<Trip, 'id'>): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Trip
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<void> {
  const { error } = await supabase.from('trips').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── TripItem ─────────────────────────────────────────────────────

export type TripItemType = 'pack' | 'activity' | 'expense'

export interface TripItem {
  id: string
  trip_id: string
  type: TripItemType
  title: string
  done: boolean
  price: number | null
  notes: string | null
}

export async function fetchTripItems(tripId: string): Promise<TripItem[]> {
  const { data, error } = await supabase
    .from('trip_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as TripItem[]) ?? []
}

export async function insertTripItem(payload: Omit<TripItem, 'id'>): Promise<TripItem> {
  const { data, error } = await supabase
    .from('trip_items')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as TripItem
}

export async function updateTripItem(id: string, patch: Partial<TripItem>): Promise<void> {
  const { error } = await supabase.from('trip_items').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTripItem(id: string): Promise<void> {
  const { error } = await supabase.from('trip_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
