'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  fetchTasks, insertTask, updateTask, deleteTask,
  fetchRoutines, insertRoutine, deleteRoutine,
  fetchTodoSettings, saveTodoSettings,
  Task, Routine, TodoCategory, DEFAULT_TODO_CATEGORIES,
} from '../api'
import { parseTaskInput } from '../utils'

export function useTodo(userId: string) {
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [routines,   setRoutines]   = useState<Routine[]>([])
  const [categories, setCategories] = useState<TodoCategory[]>(DEFAULT_TODO_CATEGORIES)
  const [loading,    setLoading]    = useState(true)
  const [toast,      setToast]      = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchTasks(userId),
      fetchRoutines(userId),
      fetchTodoSettings(userId),
    ]).then(([t, r, s]) => {
      if (cancelled) return
      setTasks(t)
      setRoutines(r)
      if (s?.categories?.length) setCategories(s.categories)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [userId])

  // ── Add task via smart text input ───────────────────────────────
  const addTaskText = useCallback(async (
    raw: string,
    defaultCategory = 'Osobní'
  ): Promise<string | null> => {
    if (!raw.trim()) return null
    const parsed = parseTaskInput(raw, categories.map(c => c.name))
    try {
      const data = await insertTask({
        user_id: userId,
        title: parsed.title,
        priority: parsed.priority,
        category: parsed.category_hint ?? defaultCategory,
        client_id: null,
        due_date: parsed.due_date,
        note: null,
        url: parsed.url,
        status: 'open',
        done_at: null,
      })
      setTasks(prev => [data, ...prev].sort(sortTasks))
      showToast(`✅ ${parsed.title}`)
      return null
    } catch (e: any) {
      return e.message
    }
  }, [userId, categories])

  // ── Add task via form ───────────────────────────────────────────
  const addTask = useCallback(async (
    payload: Omit<Task, 'id' | 'created_at'>
  ): Promise<void> => {
    const data = await insertTask(payload)
    setTasks(prev => [data, ...prev].sort(sortTasks))
    showToast(`✅ ${payload.title}`)
  }, [])

  // ── Toggle done ─────────────────────────────────────────────────
  const toggleTask = useCallback(async (task: Task) => {
    const newStatus: 'open' | 'done' = task.status === 'done' ? 'open' : 'done'
    const done_at = newStatus === 'done' ? new Date().toISOString() : null
    await updateTask({ id: task.id, status: newStatus, done_at })
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: newStatus, done_at } : t
    ).sort(sortTasks))
  }, [])

  // ── Edit task ───────────────────────────────────────────────────
  const editTask = useCallback(async (task: Task) => {
    await updateTask(task)
    setTasks(prev => prev.map(t => t.id === task.id ? task : t).sort(sortTasks))
    showToast('✏️ Úkol upraven')
  }, [])

  // ── Delete task ─────────────────────────────────────────────────
  const removeTask = useCallback(async (id: string) => {
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Routines ────────────────────────────────────────────────────
  const addRoutine = useCallback(async (
    payload: Omit<Routine, 'id'>
  ): Promise<void> => {
    const data = await insertRoutine(payload)
    setRoutines(prev => [...prev, data])
    showToast(`🔄 ${payload.title} přidáno`)
  }, [])

  const removeRoutine = useCallback(async (id: string) => {
    await deleteRoutine(id)
    setRoutines(prev => prev.filter(r => r.id !== id))
  }, [])

  // ── Categories ───────────────────────────────────────────────────
  const saveCategories = useCallback(async (cats: TodoCategory[]) => {
    setCategories(cats)
    await saveTodoSettings(userId, cats)
    showToast('✅ Kategorie uloženy')
  }, [userId])

  // ── Derived ─────────────────────────────────────────────────────
  const openTasks = tasks.filter(t => t.status === 'open')
  const doneTasks = tasks.filter(t => t.status === 'done')

  return {
    loading, toast,
    tasks, openTasks, doneTasks,
    routines, categories,
    addTaskText, addTask, toggleTask, editTask, removeTask,
    addRoutine, removeRoutine, saveCategories,
  }
}

// ── Sort: priority desc → due_date asc → created_at desc ─────────
function sortTasks(a: Task, b: Task): number {
  if (b.priority !== a.priority) return b.priority - a.priority
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
  if (a.due_date) return -1
  if (b.due_date) return 1
  return b.created_at.localeCompare(a.created_at)
}
