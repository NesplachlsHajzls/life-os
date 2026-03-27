'use client'

import { useState, useEffect, useRef } from 'react'
import { Sheet } from '@/features/finance/components/Sheet'
import { TodoCategory, Task } from '../api'

const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] transition-colors'
const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5'

const PRIORITY_OPTIONS: Array<{ value: 1 | 2 | 3; label: string; color: string }> = [
  { value: 1, label: '● Nízká',   color: '#d1d5db' },
  { value: 2, label: '●● Střední', color: '#f59e0b' },
  { value: 3, label: '●●● Vysoká', color: '#ef4444' },
]

interface ClientOption { id: string; name: string }

interface AddTaskSheetProps {
  categories: TodoCategory[]
  defaultCategory?: string
  clients?: ClientOption[]
  existingTask?: Task            // pre-fill for editing
  onSave: (payload: {
    title: string
    priority: 1 | 2 | 3
    category: string
    due_date: string | null
    note: string | null
    url: string | null
    client_id: string | null
  }) => void
  onClose: () => void
}

export function AddTaskSheet({
  categories,
  defaultCategory,
  clients = [],
  existingTask,
  onSave,
  onClose,
}: AddTaskSheetProps) {
  const isEdit = !!existingTask

  const [title,        setTitle]       = useState(existingTask?.title ?? '')
  const [priority,     setPriority]    = useState<1 | 2 | 3>(existingTask?.priority ?? 2)
  const [category,     setCategory]    = useState(() => {
    // Normalize stored category (e.g. 'prace' → 'Práce') for legacy tasks
    const raw = existingTask?.category ?? defaultCategory ?? categories[0]?.name ?? 'Osobní'
    const matched = categories.find(c =>
      c.name === raw ||
      c.name.toLowerCase() === raw.toLowerCase() ||
      c.id === raw.toLowerCase()
    )
    return matched?.name ?? raw
  })
  const [dueDate,      setDueDate]     = useState(existingTask?.due_date ?? '')
  const [note,         setNote]        = useState(existingTask?.note ?? '')
  const [url,          setUrl]         = useState(existingTask?.url ?? '')
  const [isPC,         setIsPC]        = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientId,     setClientId]    = useState<string | null>(existingTask?.client_id ?? null)
  const [clientName,   setClientName]  = useState(() => {
    if (existingTask?.client_id && clients.length > 0) {
      return clients.find(c => c.id === existingTask.client_id)?.name ?? ''
    }
    return ''
  })
  const [showDropdown, setShowDropdown] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  const isPrace = category.toLowerCase() === 'práce' || category.toLowerCase() === 'prace'

  useEffect(() => { setIsPC(window.innerWidth >= 1024) }, [])

  // Reset client when switching away from Práce
  useEffect(() => {
    if (!isPrace) { setClientId(null); setClientName(''); setClientSearch('') }
  }, [isPrace])

  // Close client dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const valid = title.trim().length > 0

  function handleSelectClient(c: ClientOption) {
    setClientId(c.id)
    setClientName(c.name)
    setClientSearch('')
    setShowDropdown(false)
  }

  function handleSave() {
    if (!valid) return
    onSave({
      title: title.trim(),
      priority,
      category,
      due_date: dueDate || null,
      note: note || null,
      url: url || null,
      client_id: isPrace ? (clientId ?? null) : null,
    })
    onClose()
  }

  // ── Shared form JSX (inlined — NOT a nested component, avoids focus loss) ──
  const formJsx = (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Název</label>
        <input
          className={fieldCls}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Co je potřeba udělat..."
        />
      </div>

      {/* Priority */}
      <div>
        <label className={labelCls}>Priorita</label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map(p => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className="flex-1 py-2 rounded-[12px] text-[12px] font-bold border-2 transition-all"
              style={{
                borderColor: priority === p.value ? p.color : '#e5e7eb',
                color:       priority === p.value ? p.color : '#9ca3af',
                background:  priority === p.value ? p.color + '18' : 'transparent',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className={labelCls}>Kategorie</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
              style={{
                background: category === cat.name ? cat.color : cat.color + '15',
                color:      category === cat.name ? '#fff'    : cat.color,
              }}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Client picker — only for Práce */}
      {isPrace && (
        <div ref={clientRef}>
          <label className={labelCls}>Klient (volitelné)</label>
          {clientId ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-[12px]">
              <span className="text-[13px] font-semibold text-indigo-700 flex-1">💼 {clientName}</span>
              <button
                onClick={() => { setClientId(null); setClientName('') }}
                className="text-indigo-400 hover:text-indigo-600 text-[13px]"
              >✕</button>
            </div>
          ) : (
            <div className="relative">
              <input
                className={fieldCls}
                placeholder="Hledat klienta…"
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && filteredClients.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[12px] shadow-lg z-20 max-h-48 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-800 hover:bg-[var(--bg)] first:rounded-t-[12px] last:rounded-b-[12px]"
                    >
                      💼 {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label className={labelCls}>Termín (volitelné)</label>
        <input type="date" className={fieldCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>Poznámka (volitelné)</label>
        <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="..." />
      </div>

      <div>
        <label className={labelCls}>URL odkaz (volitelné)</label>
        <input className={fieldCls} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-gray-500 hover:bg-[var(--bg)] transition-colors"
        >
          Zrušit
        </button>
        <button
          onClick={handleSave}
          disabled={!valid}
          className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white transition-opacity disabled:opacity-40"
          style={{ background: 'var(--color-primary)' }}
        >
          {isEdit ? 'Uložit změny' : 'Přidat úkol'}
        </button>
      </div>
    </div>
  )

  const sheetTitle = isEdit ? '✏️ Upravit úkol' : '✅ Nový úkol'

  // ── PC: centered modal ────────────────────────────────────────
  if (isPC) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-[var(--surface)] rounded-[24px] p-6 w-full shadow-2xl" style={{ maxWidth: 480 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] font-extrabold text-gray-900">{sheetTitle}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-[var(--surface-raised)] text-[18px] transition-colors"
            >×</button>
          </div>
          {formJsx}
        </div>
      </div>
    )
  }

  // ── Mobile: bottom sheet ──────────────────────────────────────
  return (
    <Sheet title={sheetTitle} onClose={onClose}>
      {formJsx}
    </Sheet>
  )
}
