import { supabase } from '@/lib/supabase'

// ── AppCategory — sdílená kategorie pro celou aplikaci ────────────

export interface AppCategory {
  id: string      // unique slug, e.g. 'osobni', 'prace'
  name: string    // display name, e.g. 'Osobní', 'Práce'
  icon: string    // emoji
  color: string   // hex color
  order: number   // for custom sorting
}

// ── Výchozí kategorie ─────────────────────────────────────────────
// IDs záměrně odpovídají starým hodnotám kalendáře (personal → osobni s mapou)

export const DEFAULT_CATEGORIES: AppCategory[] = [
  { id: 'osobni',   name: 'Osobní',   icon: '👤', color: '#3b82f6', order: 0 },
  { id: 'prace',    name: 'Práce',    icon: '💼', color: '#8b5cf6', order: 1 },
  { id: 'sport',    name: 'Sport',    icon: '💪', color: '#22c55e', order: 2 },
  { id: 'finance',  name: 'Finance',  icon: '💰', color: '#f59e0b', order: 3 },
  { id: 'deadline', name: 'Deadline', icon: '🚨', color: '#ef4444', order: 4 },
  { id: 'byt',      name: 'Byt',      icon: '🏠', color: '#f97316', order: 5 },
  { id: 'zdravi',   name: 'Zdraví',   icon: '🏥', color: '#14b8a6', order: 6 },
  { id: 'ostatni',  name: 'Ostatní',  icon: '📦', color: '#94a3b8', order: 7 },
]

// Mapování starých hodnot EventCategory na nové IDs
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  personal: 'osobni',
  work:     'prace',
  // 'sport', 'finance', 'deadline' jsou shodné
}

/** Najde kategorii podle ID — s podporou starých hodnot kalendáře */
export function findCategory(id: string, cats: AppCategory[]): AppCategory | undefined {
  return cats.find(c => c.id === id)
    ?? cats.find(c => c.id === LEGACY_CATEGORY_MAP[id])
    ?? cats.find(c => c.name.toLowerCase() === id.toLowerCase())
}

/** Vrátí hex barvu kategorie (s fallbackem) */
export function getCategoryColor(id: string, cats: AppCategory[]): string {
  return findCategory(id, cats)?.color ?? '#94a3b8'
}

/** Vrátí tailwind-kompatibilní inline styly pro chip kategorie */
export function getCategoryStyle(id: string, cats: AppCategory[]): { bg: string; border: string; text: string } {
  const color = getCategoryColor(id, cats)
  return {
    bg:     color + '18',
    border: color,
    text:   color,
  }
}

// ── Persistence — sdílená s todo_settings ─────────────────────────

export async function fetchCategories(userId: string): Promise<AppCategory[]> {
  const { data } = await supabase
    .from('todo_settings')
    .select('categories')
    .eq('user_id', userId)
    .maybeSingle()
  if (data?.categories?.length) return data.categories as AppCategory[]
  return DEFAULT_CATEGORIES
}

export async function saveCategories(userId: string, cats: AppCategory[]): Promise<void> {
  const { error } = await supabase
    .from('todo_settings')
    .upsert({ user_id: userId, categories: cats }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}
