'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  fetchClients, fetchAllWorkTasks, fetchDeals,
  insertClient, deleteClient, updateClient,
  getPraceCache, setPraceCache, invalidatePraceCache,
  Client, Deal, ClientStatus,
} from '../api'
import { insertTask, updateTask, deleteTask, Task } from '@/features/todo/api'
import { parseTaskInput } from '@/features/todo/utils'

export function usePrace(userId: string | null) {
  const [clients, setClients] = useState<Client[]>([])
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [deals,   setDeals]   = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    // Zobraz cache okamžitě → stránka se ukáže bez čekání
    const cached = getPraceCache(userId)
    if (cached) {
      setClients(cached.clients)
      setTasks(cached.tasks)
      setDeals(cached.deals)
      setLoading(false)
    } else {
      setLoading(true)
    }

    // Vždy fetch na pozadí pro aktuální data
    Promise.all([
      fetchClients(userId),
      fetchAllWorkTasks(userId),
      fetchDeals(userId),
    ]).then(([c, t, d]) => {
      if (cancelled) return
      setClients(c)
      setTasks(t)
      setDeals(d)
      setLoading(false)
      setPraceCache(userId, { clients: c, tasks: t, deals: d })
    }).catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [userId])

  // ── Clients ───────────────────────────────────────────────────
  const addClient = useCallback(async (
    name: string, color: string, icon: string, status: ClientStatus = 'Aktivní'
  ) => {
    if (!userId) return
    const data = await insertClient({
      user_id: userId, name, color, icon, status,
      email: null, phone: null, website: null, address: null, notes: null, tags: [],
      products: [], ra_count: null, monthly_avg_invoice: null, price_list: null,
      is_prague: false, subject_type: null, partner_id: null,
      billing_email: null, first_meeting_status: null,
    })
    setClients(prev => {
      const next = [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'cs'))
      invalidatePraceCache(userId)
      return next
    })
    showToast(`✅ ${name} přidán`)
  }, [userId])

  const editClient = useCallback(async (id: string, payload: Partial<Client>) => {
    await updateClient(id, payload)
    setClients(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...payload } : c)
        .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
      invalidatePraceCache(id)
      return next
    })
  }, [])

  const removeClient = useCallback(async (id: string) => {
    await deleteClient(id)
    if (userId) invalidatePraceCache(userId)
    setClients(prev => prev.filter(c => c.id !== id))
    setTasks(prev => prev.filter(t => t.client_id !== id))
    setDeals(prev => prev.filter(d => d.client_id !== id))
  }, [userId])

  // ── Tasks ─────────────────────────────────────────────────────
  const addTaskToClient = useCallback(async (
    clientId: string, raw: string,
  ): Promise<string | null> => {
    if (!raw.trim() || !userId) return null
    const parsed = parseTaskInput(raw, [])
    try {
      const data = await insertTask({
        user_id: userId, title: parsed.title, priority: parsed.priority,
        category: 'Práce', client_id: clientId,
        due_date: parsed.due_date, note: null, url: parsed.url,
        status: 'open', done_at: null,
      })
      invalidatePraceCache(userId)
      setTasks(prev => [data, ...prev])
      showToast(`✅ ${parsed.title}`)
      return null
    } catch (e: any) { return e.message }
  }, [userId])

  const toggleTask = useCallback(async (task: Task) => {
    const newStatus: 'open' | 'done' = task.status === 'done' ? 'open' : 'done'
    const done_at = newStatus === 'done' ? new Date().toISOString() : null
    await updateTask({ id: task.id, status: newStatus, done_at })
    if (userId) invalidatePraceCache(userId)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, done_at } : t))
  }, [userId])

  const removeTask = useCallback(async (id: string) => {
    await deleteTask(id)
    if (userId) invalidatePraceCache(userId)
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [userId])

  // ── Derived ───────────────────────────────────────────────────
  const openTasks = tasks.filter(t => t.status === 'open')
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const weekEnd   = new Date(today); weekEnd.setDate(today.getDate() + 7)
  const dueThisWeek = openTasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date + 'T00:00:00')
    return d >= today && d <= weekEnd
  })

  function getClientOpenTasks(clientId: string) {
    return tasks.filter(t => t.client_id === clientId && t.status === 'open')
  }

  return {
    loading, toast,
    clients, tasks, deals, openTasks, dueThisWeek,
    addClient, editClient, removeClient,
    addTaskToClient, toggleTask, removeTask,
    getClientOpenTasks,
  }
}
