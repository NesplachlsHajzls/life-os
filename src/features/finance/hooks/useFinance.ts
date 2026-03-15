'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  loadFinanceData,
  saveSettings,
  insertExpense,
  insertIncome,
  updateExpense,
  updateIncome,
  deleteExpense,
  deleteIncome,
  saveCommitments,
  Expense,
  Income,
  Commitment,
  Recurring,
  Wallet,
  Debt,
} from '../api'
import {
  DEFAULT_EXP_CATS,
  DEFAULT_INC_CATS,
  DEFAULT_WALLETS,
  CatMap,
  mKey,
  todayStr,
  parseEntry,
  parseWalletHint,
  recurDue,
  monthCommitments,
  commitAmt,
  fmt,
} from '../utils'

// ── Hook ──────────────────────────────────────────────────────────

export function useFinance(userId: string) {
  const [expenses,    setExpenses]    = useState<Expense[]>([])
  const [incomes,     setIncomes]     = useState<Income[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [recurring,   setRecurring]   = useState<Recurring[]>([])
  const [expCats,     setExpCats]     = useState<CatMap>(DEFAULT_EXP_CATS)
  const [incCats]                     = useState<CatMap>(DEFAULT_INC_CATS)
  const [wallets,     setWallets]     = useState<Wallet[]>(DEFAULT_WALLETS)
  const [budgets,     setBudgets]     = useState<Record<string, number>>({})
  const [debts,       setDebts]       = useState<Debt[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [curMonth,    setCurMonth]    = useState(() => mKey(todayStr()))
  const [toast,       setToast]       = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadFinanceData(userId).then(data => {
      if (cancelled) return
      setExpenses(data.expenses)
      setIncomes(data.incomes)
      setCommitments(data.commitments)
      setRecurring(data.recurring)
      if (data.settings) {
        if (data.settings.exp_cats) setExpCats(data.settings.exp_cats)
        if (data.settings.wallets)  setWallets(data.settings.wallets)
        if (data.settings.budgets)  setBudgets(data.settings.budgets)
        if (data.settings.debts)    setDebts(data.settings.debts)
      }
      setLoading(false)
    }).catch(err => {
      if (!cancelled) { setError(err.message); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [userId])

  // ── Add expense (quick text parse) ─────────────────────────────

  const addExpenseText = useCallback(async (text: string): Promise<string | null> => {
    const parsed = parseEntry(text, expCats, '', 'exp', wallets)
    if (parsed.error) return 'Nezadáno číslo. Zkus: "oběd 150" nebo "benzin 800"'
    const walletId = parseWalletHint(text, wallets)
    try {
      const data = await insertExpense({
        user_id: userId,
        description: parsed.description,
        amount: parsed.amount,
        category: parsed.category,
        date: parsed.date,
        wallet_id: walletId,
        recur_id: null,
        note: '',
        tags: [],
      })
      setExpenses(prev => [data, ...prev])
      setCurMonth(mKey(parsed.date))
      if (walletId) {
        const updated = wallets.map(w => w.id === walletId ? { ...w, balance: w.balance - parsed.amount } : w)
        setWallets(updated)
        await saveSettings(userId, { wallets: updated })
        const wName = wallets.find(w => w.id === walletId)?.name ?? 'peněženky'
        showToast(`💸 ${parsed.description} — ${fmt(parsed.amount)} Kč (z ${wName})`)
      } else {
        showToast(`💸 ${parsed.description} — ${fmt(parsed.amount)} Kč`)
      }
      return null
    } catch (e: any) {
      return e.message
    }
  }, [userId, expCats, wallets])

  // ── Add expense (manual form) ───────────────────────────────────

  const addExpenseManual = useCallback(async (entry: Omit<Expense, 'id' | 'user_id'>): Promise<void> => {
    const data = await insertExpense({ user_id: userId, ...entry })
    setExpenses(prev => [data, ...prev])
    setCurMonth(mKey(entry.date))
    if (entry.wallet_id) {
      const updated = wallets.map(w => w.id === entry.wallet_id ? { ...w, balance: w.balance - entry.amount } : w)
      setWallets(updated)
      await saveSettings(userId, { wallets: updated })
      const wName = wallets.find(w => w.id === entry.wallet_id)?.name ?? 'peněženky'
      showToast(`💸 ${entry.description} — ${fmt(entry.amount)} Kč (z ${wName})`)
    } else {
      showToast(`💸 ${entry.description} — ${fmt(entry.amount)} Kč`)
    }
  }, [userId, wallets])

  // ── Add income (quick text parse) ──────────────────────────────

  const addIncomeText = useCallback(async (text: string): Promise<string | null> => {
    const parsed = parseEntry(text, incCats, '', 'inc')
    if (parsed.error) return 'Nezadáno číslo. Zkus: "výplata 45000"'
    try {
      const data = await insertIncome({
        user_id: userId,
        description: parsed.description,
        amount: parsed.amount,
        category: parsed.category,
        date: parsed.date,
        note: '',
      })
      setIncomes(prev => [data, ...prev])
      setCurMonth(mKey(parsed.date))
      showToast(`💚 ${parsed.description} +${fmt(parsed.amount)} Kč`)
      return null
    } catch (e: any) {
      return e.message
    }
  }, [userId, incCats])

  // ── Add income (manual form) ────────────────────────────────────

  const addIncomeManual = useCallback(async (entry: Omit<Income, 'id' | 'user_id'>): Promise<void> => {
    const data = await insertIncome({ user_id: userId, ...entry })
    setIncomes(prev => [data, ...prev])
    setCurMonth(mKey(entry.date))
    showToast(`💚 ${entry.description} +${fmt(entry.amount)} Kč`)
  }, [userId])

  // ── Delete ──────────────────────────────────────────────────────

  const removeExpense = useCallback(async (id: string) => {
    await deleteExpense(id)
    setExpenses(prev => prev.filter(x => x.id !== id))
  }, [])

  const removeIncome = useCallback(async (id: string) => {
    await deleteIncome(id)
    setIncomes(prev => prev.filter(x => x.id !== id))
  }, [])

  // ── Edit ────────────────────────────────────────────────────────

  const editExpense = useCallback(async (expense: Expense) => {
    await updateExpense(expense)
    setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e))
    showToast('✅ Výdaj upraven')
  }, [])

  const editIncome = useCallback(async (income: Income) => {
    await updateIncome(income)
    setIncomes(prev => prev.map(i => i.id === income.id ? income : i))
    showToast('✅ Příjem upraven')
  }, [])

  // Edit expense with wallet balance recalculation
  const editExpenseWithWallet = useCallback(async (newExp: Expense, oldExp: Expense) => {
    const oldWalletId = oldExp.wallet_id
    const newWalletId = newExp.wallet_id

    let updatedWallets = wallets

    if (oldWalletId === newWalletId && oldWalletId) {
      // Same wallet — adjust only the difference
      const diff = oldExp.amount - newExp.amount
      updatedWallets = wallets.map(w =>
        w.id === oldWalletId ? { ...w, balance: w.balance + diff } : w
      )
    } else if (oldWalletId !== newWalletId) {
      // Wallet changed (or one is null) — give back old, deduct new
      updatedWallets = wallets.map(w => {
        if (oldWalletId && w.id === oldWalletId) return { ...w, balance: w.balance + oldExp.amount }
        if (newWalletId && w.id === newWalletId) return { ...w, balance: w.balance - newExp.amount }
        return w
      })
    }

    await updateExpense(newExp)
    setExpenses(prev => prev.map(e => e.id === newExp.id ? newExp : e))

    if (updatedWallets !== wallets) {
      setWallets(updatedWallets)
      await saveSettings(userId, { wallets: updatedWallets })
    }

    showToast('✅ Výdaj upraven')
  }, [userId, wallets])

  // ── Wallets ─────────────────────────────────────────────────────

  const saveWallets = useCallback(async (list: Wallet[]) => {
    setWallets(list)
    await saveSettings(userId, { wallets: list })
    showToast('✅ Peněženky uloženy')
  }, [userId])

  const handleTransfer = useCallback(async (fromId: string, toId: string, amount: number) => {
    const updated = wallets.map(w => {
      if (w.id === fromId) return { ...w, balance: w.balance - amount }
      if (w.id === toId)   return { ...w, balance: w.balance + amount }
      return w
    })
    setWallets(updated)
    await saveSettings(userId, { wallets: updated })
    showToast(`💸 Přesunuto ${fmt(amount)} Kč`)
  }, [userId, wallets])

  // ── Debts (závazky / pohledávky) ───────────────────────────────

  const addDebt = useCallback(async (entry: Omit<Debt, 'id'>) => {
    const newDebt: Debt = { ...entry, id: Math.random().toString(36).slice(2, 10) }
    const updated = [...debts, newDebt]
    setDebts(updated)
    await saveSettings(userId, { debts: updated })
    showToast(entry.type === 'liability' ? `💳 Přidán závazek — ${entry.person} ${fmt(entry.amount)} Kč` : `💚 Přidána pohledávka — ${entry.person} ${fmt(entry.amount)} Kč`)
  }, [userId, debts])

  const removeDebt = useCallback(async (id: string) => {
    const updated = debts.filter(d => d.id !== id)
    setDebts(updated)
    await saveSettings(userId, { debts: updated })
    showToast('🗑️ Smazáno')
  }, [userId, debts])

  const editDebt = useCallback(async (debt: Debt) => {
    const updated = debts.map(d => d.id === debt.id ? debt : d)
    setDebts(updated)
    await saveSettings(userId, { debts: updated })
    showToast('✅ Upraveno')
  }, [userId, debts])

  const saveDebts = useCallback(async (list: Debt[]) => {
    setDebts(list)
    await saveSettings(userId, { debts: list })
  }, [userId])

  // ── Commitments ─────────────────────────────────────────────────

  const saveCommitmentsData = useCallback(async (list: Omit<Commitment, 'user_id'>[]) => {
    const saved = await saveCommitments(userId, list)
    setCommitments(saved)
    showToast('✅ Závazky uloženy')
  }, [userId])

  // ── Settings ─────────────────────────────────────────────────────

  const saveExpCats = useCallback(async (cats: CatMap) => {
    setExpCats(cats)
    await saveSettings(userId, { exp_cats: cats })
    showToast('✅ Kategorie uloženy')
  }, [userId])

  const saveBudgets = useCallback(async (b: Record<string, number>) => {
    setBudgets(b)
    await saveSettings(userId, { budgets: b })
    showToast('✅ Limity uloženy')
  }, [userId])

  // ── Confirm recurring payment ───────────────────────────────────

  const confirmRecurring = useCallback(async (r: Recurring) => {
    const data = await insertExpense({
      user_id: userId,
      description: r.description,
      amount: r.amount,
      category: r.category,
      date: todayStr(),
      recur_id: r.id,
      note: '',
      tags: [],
      wallet_id: null,
    })
    setExpenses(prev => [data, ...prev])
    showToast(`✅ ${r.description} zaznamenáno`)
  }, [userId])

  // ── Derived data ─────────────────────────────────────────────────

  const filtExpenses = expenses.filter(e => mKey(e.date) === curMonth).sort((a, b) => b.date.localeCompare(a.date))
  const filtIncomes  = incomes.filter(i => mKey(i.date) === curMonth)
  const totalInc     = filtIncomes.reduce((s, i) => s + i.amount, 0)
  const totalExp     = filtExpenses.reduce((s, e) => s + e.amount, 0)
  const mCom         = monthCommitments(commitments, curMonth)
  const totalCom     = mCom.reduce((s, c) => s + commitAmt(c, curMonth), 0)
  const volne        = totalInc - totalCom - totalExp
  const totalWallets = wallets.reduce((s, w) => s + w.balance, 0)
  const catSums      = filtExpenses.reduce<Record<string, number>>((a, e) => { a[e.category] = (a[e.category] || 0) + e.amount; return a }, {})
  const dueRecurring = recurDue(recurring, expenses)

  const allMonths = [...new Set([
    ...expenses.map(e => mKey(e.date)),
    ...incomes.map(i => mKey(i.date)),
    mKey(todayStr()),
  ])].sort()

  return {
    // State
    loading, error, toast, curMonth, setCurMonth,
    expenses, incomes, commitments, recurring, wallets, budgets, expCats, incCats, debts,
    // Derived
    filtExpenses, filtIncomes, totalInc, totalExp, totalCom, volne, totalWallets, catSums, dueRecurring, allMonths,
    // Actions
    addExpenseText, addExpenseManual, addIncomeText, addIncomeManual,
    removeExpense, removeIncome, editExpense, editIncome, editExpenseWithWallet,
    saveWallets, handleTransfer, saveCommitmentsData, saveExpCats, saveBudgets, confirmRecurring,
    addDebt, removeDebt, editDebt, saveDebts,
  }
}
