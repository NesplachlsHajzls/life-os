import { supabase } from '@/lib/supabase'
import { Task } from '@/features/todo/api'

// ── Constants ─────────────────────────────────────────────────────

export const CLIENT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
]

export const CLIENT_ICONS = ['💼', '🏢', '🎯', '⚡', '🌐', '📱', '🎨', '🔧', '📊', '🚀', '🏗️', '🛒']

export const CLIENT_STATUSES = ['Potenciální', 'Aktivní', 'Pozastavený', 'Ukončený'] as const
export type ClientStatus = typeof CLIENT_STATUSES[number]

export const SUBJECT_TYPES = [
  'Komerční',
  'Zdravotnictví soukromé',
  'Zdravotnictví veřejné',
  'Obec',
  'Veřejná správa',
] as const
export type SubjectType = typeof SUBJECT_TYPES[number]

export const SUBJECT_TYPE_COLORS: Record<SubjectType, string> = {
  'Komerční':                '#6366f1',
  'Zdravotnictví soukromé':  '#ec4899',
  'Zdravotnictví veřejné':   '#06b6d4',
  'Obec':                    '#f59e0b',
  'Veřejná správa':          '#10b981',
}

export const DEAL_STAGES = ['Nový lead', 'Kontaktován', 'Nabídka', 'Vyjednávání', 'Uzavřen', 'Ztracen'] as const
export type DealStage = typeof DEAL_STAGES[number]

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  'Nový lead':    '#94a3b8',
  'Kontaktován':  '#3b82f6',
  'Nabídka':      '#f59e0b',
  'Vyjednávání':  '#8b5cf6',
  'Uzavřen':      '#10b981',
  'Ztracen':      '#ef4444',
}

export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note'] as const
export type ActivityType = typeof ACTIVITY_TYPES[number]

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call:    '📞',
  email:   '✉️',
  meeting: '🤝',
  note:    '📝',
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call:    'Hovor',
  email:   'Email',
  meeting: 'Schůzka',
  note:    'Poznámka',
}

// ── Types ─────────────────────────────────────────────────────────

export interface PriceList {
  // HW — dva pojmenovatelné typy (např. Čip. karta, Čtečka)
  hw_1_name:           string | null
  hw_1_price:          number | null
  hw_2_name:           string | null
  hw_2_price:          number | null
  // Certifikáty
  twins_kval_komercni: number | null   // TWINS Kval + Komerční
  twins_identitni:     number | null   // TWINS Identitní (Kval + Identitní)
  cert_kval:           number | null   // Certifikát Kval (samostatně)
  cert_komercni:       number | null   // Certifikát Komerční (samostatně)
  cert_identitni:      number | null   // Certifikát Identitní (samostatně)
}

export const EMPTY_PRICE_LIST: PriceList = {
  hw_1_name: null, hw_1_price: null,
  hw_2_name: null, hw_2_price: null,
  twins_kval_komercni: null, twins_identitni: null,
  cert_kval: null, cert_komercni: null, cert_identitni: null,
}

// Pouze certifikátové klíče (HW se renderuje zvlášť s vlastními názvy)
export const CERT_PRICE_KEYS = ['twins_kval_komercni', 'twins_identitni', 'cert_kval', 'cert_komercni', 'cert_identitni'] as const
export type CertPriceKey = typeof CERT_PRICE_KEYS[number]

export const CERT_PRICE_LABELS: Record<CertPriceKey, string> = {
  twins_kval_komercni: 'TWINS Kval + Komerční',
  twins_identitni:     'TWINS Identitní',
  cert_kval:           'Certifikát Kval',
  cert_komercni:       'Certifikát Komerční',
  cert_identitni:      'Certifikát Identitní',
}

// Zachováno pro zpětnou kompatibilitu
export const PRICE_LIST_LABELS = CERT_PRICE_LABELS as Record<string, string>

export interface Client {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  status: ClientStatus
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  notes: string | null
  tags: string[]
  // Interní pole
  products: string[]
  ra_count: number | null
  monthly_avg_invoice: number | null
  price_list: PriceList | null
  // Kategorizace
  is_prague: boolean
  subject_type: SubjectType | null
  partner_id: string | null
  // Kontaktní / obchodní
  billing_email: string | null
  first_meeting_status: 'done' | 'scheduled' | 'not_yet' | null
  created_at: string
}

export const FIRST_MEETING_COLORS: Record<'done' | 'scheduled' | 'not_yet', string> = {
  done:      '#10b981',  // zelená — byl jsem
  scheduled: '#f59e0b',  // oranžová — čeká mě
  not_yet:   '#ef4444',  // červená — ještě ne
}
export const FIRST_MEETING_LABELS: Record<'done' | 'scheduled' | 'not_yet', string> = {
  done:      'Byl jsem',
  scheduled: 'Čeká mě',
  not_yet:   'Ještě ne',
}

export interface ClientContact {
  id: string
  client_id: string
  user_id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
  created_at: string
}

export interface ClientActivity {
  id: string
  client_id: string
  user_id: string
  type: ActivityType
  title: string
  description: string | null
  activity_date: string
  created_at: string
}

export interface Deal {
  id: string
  client_id: string
  user_id: string
  title: string
  value: number | null
  currency: string
  stage: DealStage
  probability: number
  expected_close: string | null
  notes: string | null
  created_at: string
}

// ── Clients ───────────────────────────────────────────────────────

export async function fetchClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) return null
  return data as Client
}

export async function fetchClients(userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Client[]) ?? []
}

export async function insertClient(payload: Omit<Client, 'id' | 'created_at'>): Promise<Client> {
  const { data, error } = await supabase.from('clients').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Client
}

export async function updateClient(id: string, payload: Partial<Client>): Promise<void> {
  const { error } = await supabase.from('clients').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Client contacts ───────────────────────────────────────────────

export async function fetchContacts(clientId: string): Promise<ClientContact[]> {
  const { data, error } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as ClientContact[]) ?? []
}

export async function insertContact(payload: Omit<ClientContact, 'id' | 'created_at'>): Promise<ClientContact> {
  const { data, error } = await supabase.from('client_contacts').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as ClientContact
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from('client_contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Activities ────────────────────────────────────────────────────

export async function fetchActivities(clientId: string): Promise<ClientActivity[]> {
  const { data, error } = await supabase
    .from('client_activities')
    .select('*')
    .eq('client_id', clientId)
    .order('activity_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ClientActivity[]) ?? []
}

export async function insertActivity(payload: Omit<ClientActivity, 'id' | 'created_at'>): Promise<ClientActivity> {
  const { data, error } = await supabase.from('client_activities').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as ClientActivity
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('client_activities').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Deals ─────────────────────────────────────────────────────────

export async function fetchDeals(userId: string, clientId?: string): Promise<Deal[]> {
  let q = supabase.from('deals').select('*').eq('user_id', userId)
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Deal[]) ?? []
}

export async function insertDeal(payload: Omit<Deal, 'id' | 'created_at'>): Promise<Deal> {
  const { data, error } = await supabase.from('deals').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Deal
}

export async function updateDeal(id: string, payload: Partial<Deal>): Promise<void> {
  const { error } = await supabase.from('deals').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Tasks ─────────────────────────────────────────────────────────

export async function fetchClientTasks(userId: string, clientId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .order('priority',   { ascending: false })
    .order('due_date',   { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Task[]) ?? []
}

export async function fetchAllWorkTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .not('client_id', 'is', null)
    .order('due_date',   { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Task[]) ?? []
}

// ── Client Orders ─────────────────────────────────────────────────
// Tracks services / products delivered to a client that still need invoicing.
// SQL migration to run in Supabase:
//
//   CREATE TABLE client_orders (
//     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
//     user_id    UUID NOT NULL,
//     date       DATE NOT NULL DEFAULT CURRENT_DATE,
//     subject    TEXT NOT NULL,
//     amount     NUMERIC(10,2),
//     invoiced   BOOLEAN NOT NULL DEFAULT FALSE,
//     note       TEXT,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//   );
//   CREATE INDEX ON client_orders(client_id);
//   CREATE INDEX ON client_orders(user_id);

export interface ClientOrder {
  id:         string
  client_id:  string
  user_id:    string
  date:       string          // ISO date "YYYY-MM-DD"
  subject:    string
  amount:     number | null
  invoiced:   boolean
  note:       string | null
  created_at: string
}

export async function fetchOrders(clientId: string): Promise<ClientOrder[]> {
  const { data, error } = await supabase
    .from('client_orders')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ClientOrder[]) ?? []
}

export async function insertOrder(payload: Omit<ClientOrder, 'id' | 'created_at'>): Promise<ClientOrder> {
  const { data, error } = await supabase.from('client_orders').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as ClientOrder
}

export async function updateOrder(id: string, payload: Partial<ClientOrder>): Promise<void> {
  const { error } = await supabase.from('client_orders').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('client_orders').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
