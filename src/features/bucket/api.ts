import { supabase } from '@/lib/supabase'

export type BucketSize = 'big' | 'small'
export type BucketCategory = 'travel' | 'experience' | 'career' | 'personal' | 'health' | 'finance' | 'family' | 'other'

export const BUCKET_CATEGORIES: { id: BucketCategory; label: string; icon: string }[] = [
  { id: 'travel',     label: 'Cestování',  icon: '✈️' },
  { id: 'experience', label: 'Zážitky',    icon: '🎉' },
  { id: 'career',     label: 'Kariéra',    icon: '💼' },
  { id: 'personal',   label: 'Osobní',     icon: '🌱' },
  { id: 'health',     label: 'Zdraví',     icon: '💪' },
  { id: 'finance',    label: 'Finance',    icon: '💰' },
  { id: 'family',     label: 'Rodina',     icon: '❤️' },
  { id: 'other',      label: 'Ostatní',    icon: '✨' },
]

export const BUCKET_SUGGESTIONS: { title: string; category: BucketCategory; size: BucketSize }[] = [
  // Big
  { title: 'Projet celou Evropu vlakem', category: 'travel', size: 'big' },
  { title: 'Navštívit Japonsko', category: 'travel', size: 'big' },
  { title: 'Vylézt na Kilimandžáro', category: 'experience', size: 'big' },
  { title: 'Skočit parašutem', category: 'experience', size: 'big' },
  { title: 'Napsat knihu', category: 'personal', size: 'big' },
  { title: 'Postavit vlastní dům', category: 'family', size: 'big' },
  { title: 'Dosáhnout finanční svobody', category: 'finance', size: 'big' },
  { title: 'Naučit se plynně druhý jazyk', category: 'personal', size: 'big' },
  { title: 'Absolvovat Iron Man', category: 'health', size: 'big' },
  { title: 'Navštívit všechna kontinenty', category: 'travel', size: 'big' },
  // Small
  { title: 'Naučit se vařit sushi', category: 'experience', size: 'small' },
  { title: 'Přečíst 12 knih za rok', category: 'personal', size: 'small' },
  { title: 'Naučit se základy kytary', category: 'personal', size: 'small' },
  { title: 'Uběhnout půlmaraton', category: 'health', size: 'small' },
  { title: 'Navštívit 5 nových restaurací', category: 'experience', size: 'small' },
  { title: 'Zvládnout měsíc bez sociálních sítí', category: 'personal', size: 'small' },
  { title: 'Naučit se meditovat', category: 'health', size: 'small' },
  { title: 'Víkend bez telefonu v přírodě', category: 'experience', size: 'small' },
  { title: 'Naučit se surfovat', category: 'experience', size: 'small' },
  { title: 'Dát si studenou sprchu 30 dní', category: 'health', size: 'small' },
]

export interface BucketItem {
  id: string
  user_id: string
  title: string
  category: BucketCategory
  size: BucketSize
  status: 'todo' | 'done'
  done_at: string | null
  notes: string | null
  created_at: string
}

export async function fetchBucketItems(userId: string): Promise<BucketItem[]> {
  const { data, error } = await supabase
    .from('bucket_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as BucketItem[]) ?? []
}

export async function insertBucketItem(payload: Omit<BucketItem, 'id' | 'created_at'>): Promise<BucketItem> {
  const { data, error } = await supabase.from('bucket_items').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as BucketItem
}

export async function updateBucketItem(id: string, patch: Partial<BucketItem>): Promise<void> {
  const { error } = await supabase.from('bucket_items').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteBucketItem(id: string): Promise<void> {
  const { error } = await supabase.from('bucket_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
