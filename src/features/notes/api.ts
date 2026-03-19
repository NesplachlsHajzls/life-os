import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────

export interface Note {
  id:           string
  user_id:      string
  title:        string
  content:      string | null
  parent_id:    string | null
  client_id:    string | null
  is_meeting:   boolean
  meeting_date: string | null
  icon:         string
  category:     string | null   // AppCategory.id — shared with todo/calendar
  created_at:   string
  updated_at:   string
}

export const NOTE_ICONS = ['📝', '💡', '🎯', '📋', '🔖', '✍️', '🗒️', '📌', '💭', '🧠', '🤝', '📊'] as const

// ── Fetch ─────────────────────────────────────────────────────────

/** Všechny root poznámky uživatele (parent_id = null), seřazené dle updated_at */
export async function fetchRootNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .is('parent_id', null)
    .eq('is_meeting', false)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Note[]) ?? []
}

/** Všechny poznámky uživatele (pro search) */
export async function fetchAllNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Note[]) ?? []
}

/** Jedna poznámka dle ID */
export async function fetchNote(id: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Note
}

/** Sub-poznámky (children) dané poznámky */
export async function fetchSubNotes(parentId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Note[]) ?? []
}

/** Pracovní poznámka klienta (is_meeting = false, client_id = clientId) — vrátí jednu nebo null */
export async function fetchClientNote(userId: string, clientId: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .eq('is_meeting', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data as Note | null
}

/** Vrátí existující klientskou poznámku, nebo vytvoří novou */
export async function fetchOrCreateClientNote(userId: string, clientId: string, clientName: string): Promise<Note> {
  const existing = await fetchClientNote(userId, clientId)
  if (existing) return existing
  return insertNote({
    user_id:      userId,
    client_id:    clientId,
    title:        `Poznámky – ${clientName}`,
    content:      null,
    parent_id:    null,
    is_meeting:   false,
    meeting_date: null,
    icon:         '📝',
    category:     null,
  })
}

/** Schůzky (is_meeting = true) pro daného klienta */
export async function fetchClientMeetings(clientId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_meeting', true)
    .order('meeting_date', { ascending: false, nullsFirst: false })
    .order('created_at',   { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Note[]) ?? []
}

// ── Mutations ─────────────────────────────────────────────────────

export async function insertNote(
  payload: Omit<Note, 'id' | 'created_at' | 'updated_at'>
): Promise<Note> {
  const { data, error } = await supabase.from('notes').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Note
}

export async function updateNote(
  id: string,
  payload: Partial<Pick<Note, 'title' | 'content' | 'icon' | 'meeting_date' | 'category'>>
): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
