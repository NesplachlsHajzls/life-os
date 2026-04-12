// ── Finance API — Supabase CRUD operations ────────────────────────
// Uses same table names as original FinanceTracker (no migration needed)

import { supabase } from '@/lib/supabase'
import { DEFAULT_EXP_CATS, DEFAULT_WALLETS, CatMap } from './utils'

export interface Expense {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  date: string
  wallet_id: string | null
  recur_id: string | null
  note: string
  tags: string[]
}

export interface Income {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  date: string
  note: string
}

export interface Commitment {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual'
  start_date?: string
  end_date?: string
}

export interface Recurring {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  last_added?: string
}

export interface Wallet {
  id: string
  name: string
  icon: string
  color: string
  balance: number
  type: string
}

// ── Debt (závazkek / pohledávka) ─────────────────────────────────

export interface Debt {
  id: string
  person: string          // name of person/entity ("Jirka", "Banka")
  amount: number          // amount of this specific entry
  note: string            // what it's for ("oběd", "půjčka na auto")
  date_from: string       // ISO date — when debt started
  date_to?: string        // ISO date — when it should be settled (optional)
  type: 'liability' | 'receivable'   // závazek | pohledávka
}

// ── RecurringItem (stored in settings.recurring_v2) ──────────────

export interface RecurringItem {
  id: string
  description: string
  amount: number
  category: string
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual'
  day_of_month: number       // 1–31: day the payment is due
  wallet_id: string | null   // wallet to deduct from
  last_paid?: string         // ISO date of last confirmed payment
}

/** Uzavřené výplatní období — automaticky zapisováno při nastavení nového dne */
export interface PeriodRecord {
  start: string    // ISO date — první den období
  end: string      // ISO date — poslední den (den před novým obdobím)
  income: number   // součet příjmů v období
  expenses: number // součet výdajů v období
  saved: number    // income - expenses (kladné = uspořeno, záporné = přečerpáno)
}

export interface FinanceSettings {
  user_id: string
  exp_cats: CatMap
  wallets: Wallet[]
  budgets: Record<string, number>
  debts?: Debt[]
  recurring_v2?: RecurringItem[]
  monthly_income_budget?: number
  pay_period_start?: string      // ISO date — začátek aktuálního výplatního období
  period_history?: PeriodRecord[] // uzavřená období (nejnovější první)
}

// ── In-memory cache (stale-while-revalidate) ─────────────────────
// Eliminates redundant DB fetches when navigating between finance tabs.

type FinanceDataResult = {
  expenses: Expense[]
  incomes: Income[]
  commitments: Commitment[]
  recurring: Recurring[]
  settings: FinanceSettings | null
}

const _cache = new Map<string, { data: FinanceDataResult; ts: number }>()
const CACHE_TTL = 45_000 // 45 seconds

export function invalidateFinanceCache(userId: string) {
  _cache.delete(userId)
}

// ── Load all finance data ─────────────────────────────────────────

export async function loadFinanceData(userId: string): Promise<FinanceDataResult> {
  // Return cached data immediately if fresh enough
  const cached = _cache.get(userId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  // Limit to last 2 years for performance — covers all practical use cases
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const cutoff = twoYearsAgo.toISOString().slice(0, 10)

  const [
    { data: expenses },
    { data: incomes },
    { data: commitments },
    { data: recurring },
    { data: settings },
  ] = await Promise.all([
    supabase.from('ft_expenses').select('*').eq('user_id', userId).gte('date', cutoff).order('date', { ascending: false }),
    supabase.from('ft_incomes').select('*').eq('user_id', userId).gte('date', cutoff).order('date', { ascending: false }),
    supabase.from('ft_commitments').select('*').eq('user_id', userId),
    supabase.from('ft_recurring').select('*').eq('user_id', userId),
    supabase.from('ft_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  // First run — seed default settings ONLY if no row exists
  // ⚠️ NEVER use upsert here — it would overwrite custom wallets & categories on conflict
  if (!settings) {
    await supabase.from('ft_settings')
      .insert({ user_id: userId, exp_cats: DEFAULT_EXP_CATS, wallets: DEFAULT_WALLETS, budgets: {} })
    // Ignore conflict error — means row exists (race condition / RLS glitch)
  }

  const result: FinanceDataResult = {
    expenses:    (expenses    as Expense[]    | null) ?? [],
    incomes:     (incomes     as Income[]     | null) ?? [],
    commitments: (commitments as Commitment[] | null) ?? [],
    recurring:   (recurring   as Recurring[]  | null) ?? [],
    settings:    settings as FinanceSettings | null,
  }
  _cache.set(userId, { data: result, ts: Date.now() })
  return result
}

// ── Settings ──────────────────────────────────────────────────────

export async function saveSettings(userId: string, patch: Partial<FinanceSettings>) {
  // Use UPDATE (not upsert) — loadFinanceData always ensures the row exists first.
  // This eliminates the extra SELECT that was needed before every save.
  const { error } = await supabase.from('ft_settings')
    .update(patch)
    .eq('user_id', userId)
  if (error) console.error('saveSettings error:', error)
}

// ── Expenses ──────────────────────────────────────────────────────

export async function insertExpense(payload: Omit<Expense, 'id'>) {
  const { data, error } = await supabase.from('ft_expenses').insert(payload).select().single()
  if (error) throw new Error(error.message)
  invalidateFinanceCache(payload.user_id)
  return data as Expense
}

export async function updateExpense(expense: Expense) {
  const { error } = await supabase.from('ft_expenses').update(expense).eq('id', expense.id)
  if (error) throw new Error(error.message)
  invalidateFinanceCache(expense.user_id)
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('ft_expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  // userId not available here — cache will expire via TTL
}

// ── Incomes ───────────────────────────────────────────────────────

export async function insertIncome(payload: Omit<Income, 'id'>) {
  const { data, error } = await supabase.from('ft_incomes').insert(payload).select().single()
  if (error) throw new Error(error.message)
  invalidateFinanceCache(payload.user_id)
  return data as Income
}

export async function updateIncome(income: Income) {
  const { error } = await supabase.from('ft_incomes').update(income).eq('id', income.id)
  if (error) throw new Error(error.message)
  invalidateFinanceCache(income.user_id)
}

export async function deleteIncome(id: string) {
  const { error } = await supabase.from('ft_incomes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Commitments ───────────────────────────────────────────────────

export async function saveCommitments(userId: string, list: Omit<Commitment, 'user_id'>[]) {
  await supabase.from('ft_commitments').delete().eq('user_id', userId)
  if (!list.length) return []
  const { data } = await supabase
    .from('ft_commitments')
    .insert(list.map(c => ({ ...c, user_id: userId })))
    .select()
  return (data as Commitment[]) ?? []
}

// ── Recurring ─────────────────────────────────────────────────────

export async function insertRecurring(payload: Omit<Recurring, 'id'>) {
  const { data, error } = await supabase.from('ft_recurring').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Recurring
}

export async function deleteRecurring(id: string) {
  const { error } = await supabase.from('ft_recurring').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
