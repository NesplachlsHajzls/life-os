'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AppCategory,
  DEFAULT_CATEGORIES,
  fetchCategories,
  saveCategories,
} from '@/features/categories/api'

export function useCategories(userId: string) {
  const [categories, setCategories] = useState<AppCategory[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchCategories(userId).then(cats => {
      if (!cancelled) { setCategories(cats); setLoading(false) }
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [userId])

  const save = useCallback(async (cats: AppCategory[]) => {
    setCategories(cats)
    await saveCategories(userId, cats)
  }, [userId])

  const addCategory = useCallback(async (cat: Omit<AppCategory, 'order'>) => {
    const next = [...categories, { ...cat, order: categories.length }]
    setCategories(next)
    await saveCategories(userId, next)
  }, [userId, categories])

  const updateCategory = useCallback(async (updated: AppCategory) => {
    const next = categories.map(c => c.id === updated.id ? updated : c)
    setCategories(next)
    await saveCategories(userId, next)
  }, [userId, categories])

  const removeCategory = useCallback(async (id: string) => {
    const next = categories.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i }))
    setCategories(next)
    await saveCategories(userId, next)
  }, [userId, categories])

  const reorder = useCallback(async (from: number, to: number) => {
    const next = [...categories]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    const reindexed = next.map((c, i) => ({ ...c, order: i }))
    setCategories(reindexed)
    await saveCategories(userId, reindexed)
  }, [userId, categories])

  return { categories, loading, save, addCategory, updateCategory, removeCategory, reorder }
}
