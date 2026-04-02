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

export interface FinanceSettings {
  user_id: string
  exp_cats: CatMap
  wallets: Wallet[]
  budgets: Record<string, number>
  debts?: Debt[]
}

// ── Load all finance data ─────────────────────────────────────────

export async function loadFinanceData(userId: string) {
  const [
    { data: expenses },
    { data: incomes },
    { data: commitments },
    { data: recurring },
    { data: settings },
  ] = await Promise.all([
    supabase.from('ft_expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('ft_incomes').select('*').eq('user_id', userId).order('date', { ascending: false }),
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

  return {
    expenses:    (expenses    as Expense[]    | null) ?? [],
    incomes:     (incomes     as Income[]     | null) ?? [],
    commitments: (commitments as Commitment[] | null) ?? [],
    recurring:   (recurring   as Recurring[]  | null) ?? [],
    settings:    settings as FinanceSettings | null,
  }
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
  return data as Expense
}

export async function updateExpense(expense: Expense) {
  const { error } = await supabase.from('ft_expenses').update(expense).eq('id', expense.id)
  if (error) throw new Error(error.message)
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('ft_expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Incomes ───────────────────────────────────────────────────────

export async function insertIncome(payload: Omit<Income, 'id'>) {
  const { data, error } = await supabase.from('ft_incomes').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Income
}

export async function updateIncome(income: Income) {
  const { error } = await supabase.from('ft_incomes').update(income).eq('id', income.id)
  if (error) throw new Error(error.message)
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
