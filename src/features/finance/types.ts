export type TransactionType = 'income' | 'expense'

export type WalletType = 'bank' | 'cash' | 'investment' | 'real_estate' | 'receivable' | 'liability'

export interface Wallet {
  id: string
  user_id: string
  name: string
  type: WalletType
  balance: number
  currency: string
  icon?: string
  color?: string
  created_at: string
}

export interface TransactionCategory {
  id: string
  user_id: string
  name: string
  type: TransactionType
  icon?: string
  color?: string
}

export interface Transaction {
  id: string
  user_id: string
  wallet_id: string
  category_id?: string
  type: TransactionType
  amount: number
  title: string
  note?: string
  date: string
  recurring_id?: string
  created_at: string
}

export interface RecurringPayment {
  id: string
  user_id: string
  wallet_id: string
  category_id?: string
  type: TransactionType
  amount: number
  title: string
  day_of_month: number    // 1–31
  is_active: boolean
  created_at: string
}

export interface DebtItem {
  id: string
  user_id: string
  type: 'receivable' | 'liability'   // dluží mi / dlužím já
  person_name: string
  amount: number
  note?: string
  date?: string
  created_at: string
}
