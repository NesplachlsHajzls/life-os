'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { useTodo } from '@/features/todo/hooks/useTodo'
import { useUser } from '@/hooks/useUser'
import { Task } from '@/features/todo/api'
import { TaskItem } from '@/features/todo/components/TaskItem'
import { AddTaskSheet } from '@/features/todo/components/AddTaskSheet'
import { fetchClients } from '@/features/prace/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
const FREQ_LABELS = { daily: '📅 Denně', weekly: '📆 Týdně', monthly: '🗓️ Měsíčně' }

// ── Custom dropdown ────────────────────────────────────────────────
function SectionDropdown({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; icon?: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 group"
      >
        <span className="text-[17px] font-extrabold text-[var(--text-primary)]">
          {selected?.icon && <span className="mr-1">{selected.icon}</span>}
          {selected?.label ?? value}
        </span>
        <span
          className="text-[11px] text-[var(--text-tertiary)] transition-transform duration-200"
          style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 bg-[var(--surface)] rounded-[16px] py-1.5 z-50 min-w-[180px]"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.13)', border: '1px solid #f0f0f0' }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-[var(--bg)] transition-colors"
              style={{ fontWeight: opt.value === value ? 700 : 500, color: opt.value === value ? 'var(--color-primary)' : '#374151' }}
            >
              {opt.icon && <span className="text-[16px] w-5 text-center">{opt.icon}</span>}
              <span className="flex-1">{opt.label}</span>
              {opt.value === value && <span className="text-[12px]" style={{ color: 'var(--color-primary)' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Persist helper ─────────────────────────────────────────────────
function usePersist<T>(key: string, def: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === 'undefined') return def
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def } catch { return def }
  })
  function set(v: T) { setVal(v); try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }
  return [val, set]
}

// ─────────────────────────────────────────────────────────────────
export default function TodoPage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID

  // Load clients for task badges
  const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    if (!userId) return
    fetchClients(userId).then(cs => setClientsList(cs.map(c => ({ id: c.id, name: c.name })))).catch(() => {})
  }, [userId])
  const clientsMap = useMemo(() =>
    Object.fromEntries(clientsList.map(c => [c.id, c.name])),
  [clientsList])

  const {
    loading, toast,
    openTasks, doneTasks,
    routines, categories,
    addTaskText, addTask, toggleTask, editTask, removeTask,
  } = useTodo(userId)

  // ── Persistent state ──────────────────────────────────────────
  const [mobileTab,     setMobileTab]     = usePersist<'ukoly' | 'hotove' | 'rutiny'>('todo_mobileTab', 'ukoly')
  const [mobileCat,     setMobileCat]     = usePersist<string>('todo_mobileCat', 'Vše')
  const [leftSection,   setLeftSection]   = usePersist<string>('todo_leftSection', 'Vše')
  const [rightSection,  setRightSection]  = usePersist<string>('todo_rightSection', 'Osobní')
  const [overdueOpen,   setOverdueOpen]   = useState(false)

  // ── Quick add ─────────────────────────────────────────────────
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickInput,   setQuickInput]   = useState('')
  const [quickError,   setQuickError]   = useState('')
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingTask,  setEditingTask]  = useState<Task | null>(null)

  // ── Overdue + upcoming split ──────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const overdueTasks  = openTasks.filter(t => t.due_date && t.due_date < today)
  const upcomingTasks = openTasks.filter(t => !t.due_date || t.due_date >= today)
  // Sort upcoming chronologically: with date first (asc), then no-date by priority
  const sortedUpcoming = useMemo(() => [
    ...upcomingTasks.filter(t => t.due_date).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
    ...upcomingTasks.filter(t => !t.due_date).sort((a, b) => b.priority - a.priority),
  ], [upcomingTasks])

  async function handleQuickAdd() {
    if (!quickInput.trim()) return
    setQuickError('')
    const err = await addTaskText(quickInput, mobileCat !== 'Vše' ? mobileCat : 'Osobní')
    if (err) { setQuickError(err); return }
    setQuickInput('')
    setShowQuickAdd(false)
  }

  function getTasksForSection(section: string) {
    if (section === 'Hotové') return doneTasks
    if (section === 'Vše') return sortedUpcoming
    return sortedUpcoming.filter(t => t.category === section)
  }

  function getOverdueForSection(section: string) {
    if (section === 'Hotové' || section === 'Rutiny') return []
    if (section === 'Vše') return overdueTasks
    return overdueTasks.filter(t => t.category === section)
  }

  // PC dropdown options
  const pcOptions = [
    { value: 'Vše',    label: 'Vše otevřené', icon: '📋' },
    ...categories.map(c => ({ value: c.name, label: c.name, icon: c.icon })),
    { value: 'Hotové', label: 'Hotové',        icon: '✅' },
    { value: 'Rutiny', label: 'Rutiny',        icon: '🔄' },
  ]

  const catChips = ['Vše', ...categories.map(c => c.name)]
  const mobileIsHotove = mobileTab === 'hotove'
  const filteredMobile = mobileIsHotove
    ? (mobileCat === 'Vše' ? doneTasks : doneTasks.filter(t => t.category === mobileCat))
    : (mobileCat === 'Vše' ? sortedUpcoming : sortedUpcoming.filter(t => t.category === mobileCat))
  const filteredMobileOverdue = mobileIsHotove ? [] :
    (mobileCat === 'Vše' ? overdueTasks : overdueTasks.filter(t => t.category === mobileCat))

  // ── Task list ─────────────────────────────────────────────────
  function renderTaskRows(tasks: Task[]) {
    return (
      <div className="bg-[var(--surface)] rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {tasks.map((task, i) => (
          <div key={task.id}>
            <TaskItem
              task={task}
              categories={categories}
              onToggle={toggleTask}
              onDelete={removeTask}
              onEdit={setEditingTask}
              clientsMap={clientsMap}
            />
            {i < tasks.length - 1 && <div className="h-px bg-[var(--surface-raised)] mx-4" />}
          </div>
        ))}
      </div>
    )
  }

  function TaskList({ tasks, overdue, emptyIcon, emptyText }: {
    tasks: Task[]
    overdue?: Task[]
    emptyIcon: string
    emptyText: string
  }) {
    if (loading) return <div className="text-center py-10 text-[var(--text-tertiary)] text-[13px]">Načítám…</div>

    const hasOverdue = (overdue?.length ?? 0) > 0

    if (tasks.length === 0 && !hasOverdue) return (
      <div className="text-center py-10">
        <div className="text-[36px] mb-2">{emptyIcon}</div>
        <p className="text-[14px] font-semibold text-[var(--text-secondary)]">{emptyText}</p>
      </div>
    )
    return (
      <div className="flex flex-col gap-3">
        {/* Overdue collapsible */}
        {hasOverdue && (
          <div className="rounded-[16px] overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            <button
              onClick={() => setOverdueOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left" style={{ background: 'var(--surface-raised)' }}
            >
              <span className="text-[12px] font-bold text-red-500 uppercase tracking-wide">
                🔴 Prošlé · {overdue!.length}
              </span>
              <span className="text-red-400 text-[14px]">{overdueOpen ? '▲' : '▼'}</span>
            </button>
            {overdueOpen && (
              <div className="bg-[var(--surface)]">
                {overdue!.map((task, i) => (
                  <div key={task.id}>
                    <TaskItem
                      task={task}
                      categories={categories}
                      onToggle={toggleTask}
                      onDelete={removeTask}
                      onEdit={setEditingTask}
                      clientsMap={clientsMap}
                    />
                    {i < overdue!.length - 1 && <div className="h-px bg-[var(--surface-raised)] mx-4" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Main tasks */}
        {tasks.length > 0 && renderTaskRows(tasks)}
      </div>
    )
  }

  // ── Routines list ─────────────────────────────────────────────
  function RoutinesList() {
    return (
      <>
        {(['daily', 'weekly', 'monthly'] as const).map(freq => {
          const items = routines.filter(r => r.frequency === freq)
          return (
            <div key={freq} className="mb-4">
              <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">{FREQ_LABELS[freq]}</div>
              {items.length === 0 ? (
                <div className="bg-[var(--surface)] rounded-[16px] px-4 py-3 text-[13px] text-[var(--text-tertiary)]" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  Žádné rutiny
                </div>
              ) : (
                <div className="bg-[var(--surface)] rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  {items.map((r, i) => {
                    const cat = categories.find(c => c.name === r.category)
                    return (
                      <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                        <span className="text-[18px]">{cat?.icon ?? '🔄'}</span>
                        <div className="flex-1">
                          <div className="text-[14px] font-semibold text-[var(--text-primary)]">{r.title}</div>
                          {cat && <div className="text-[11px]" style={{ color: cat.color }}>{cat.name}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <>
      <Header title="Todo" />

      {/* ════════ MOBILE ════════ */}
      <div className="lg:hidden">
        <div className="flex bg-[var(--surface)] border-b border-[var(--border)]">
          {([
            ['ukoly',  `Úkoly (${openTasks.length})`],
            ['hotove', `Hotové (${doneTasks.length})`],
            ['rutiny', 'Rutiny'],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setMobileTab(id)}
              className="flex-1 py-3 text-[13px] font-bold border-b-2 transition-colors"
              style={{ borderColor: mobileTab === id ? 'var(--color-primary)' : 'transparent', color: mobileTab === id ? 'var(--color-primary)' : '#9ca3af' }}>
              {label}
            </button>
          ))}
        </div>

        {mobileTab !== 'rutiny' && (
          <div className="flex gap-2 px-4 py-2.5 bg-[var(--surface)] border-b border-[var(--border)] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {catChips.map(cat => (
              <button key={cat} onClick={() => setMobileCat(cat)}
                className="px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap flex-shrink-0 transition-colors"
                style={{ background: mobileCat === cat ? 'var(--color-primary)' : 'var(--surface-raised)', color: mobileCat === cat ? '#fff' : '#6b7280' }}>
                {categories.find(c => c.name === cat)?.icon ?? ''} {cat}
              </button>
            ))}
          </div>
        )}

        <div className="p-4">
          {mobileTab === 'rutiny' ? <RoutinesList /> : (
            <>
              {showQuickAdd && mobileTab === 'ukoly' && (
                <div className="bg-[var(--surface)] rounded-[16px] p-3 mb-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                    💡 koupit trička p2 · zavolat !3 zítra · logo https://...
                  </div>
                  <div className="flex gap-2">
                    <input className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
                      value={quickInput} onChange={e => setQuickInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                      placeholder="Napiš úkol..." autoFocus />
                    <button onClick={handleQuickAdd} className="px-4 py-2 rounded-[12px] text-white text-[13px] font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
                    <button onClick={() => { setShowQuickAdd(false); setQuickInput('') }} className="px-3 py-2 rounded-[12px] border border-[var(--border)] text-[var(--text-tertiary)] text-[13px]">✕</button>
                  </div>
                  {quickError && <p className="text-[11px] text-red-500 mt-1">⚠️ {quickError}</p>}
                </div>
              )}
              <TaskList
                tasks={filteredMobile}
                overdue={filteredMobileOverdue}
                emptyIcon={mobileTab === 'hotove' ? '📭' : '✅'}
                emptyText={mobileTab === 'hotove' ? 'Zatím nic hotového' : 'Všechno hotovo!'} />
            </>
          )}
        </div>
      </div>

      {/* ════════ PC ════════ */}
      <div className="hidden lg:flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

        {showQuickAdd && (
          <div className="mx-6 mt-5 bg-[var(--surface)] rounded-[16px] p-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
              💡 koupit trička p2 · zavolat !3 zítra · animinimal logo https://...
            </div>
            <div className="flex gap-2">
              <input className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
                value={quickInput} onChange={e => setQuickInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                placeholder="Napiš úkol..." autoFocus />
              <button onClick={handleQuickAdd} className="px-5 py-2 rounded-[12px] text-white text-[13px] font-bold" style={{ background: 'var(--color-primary)' }}>Přidat</button>
              <button onClick={() => { setShowQuickAdd(false); setQuickInput('') }} className="px-3 py-2 rounded-[12px] border border-[var(--border)] text-[var(--text-tertiary)] text-[13px]">✕</button>
            </div>
            {quickError && <p className="text-[11px] text-red-500 mt-1">⚠️ {quickError}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 p-6 flex-1 overflow-hidden">
          {([
            { section: leftSection,  setSection: setLeftSection },
            { section: rightSection, setSection: setRightSection },
          ] as const).map(({ section, setSection }, colIdx) => {
            const isRoutines = section === 'Rutiny'
            const tasks = isRoutines ? [] : getTasksForSection(section)
            const count = isRoutines ? routines.length : tasks.length

            return (
              <div key={colIdx} className="flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <SectionDropdown
                    value={section}
                    onChange={setSection}
                    options={pcOptions}
                  />
                  <span className="text-[12px] font-semibold text-[var(--text-tertiary)] bg-[var(--surface-raised)] px-2.5 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {isRoutines
                    ? <RoutinesList />
                    : <TaskList
                        tasks={tasks}
                        overdue={getOverdueForSection(section)}
                        emptyIcon={section === 'Hotové' ? '📭' : '✅'}
                        emptyText={section === 'Hotové' ? 'Zatím nic hotového' : 'Vše splněno!'} />
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 bg-[var(--surface-raised)] text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* FABs */}
      <div className="fixed z-40 flex flex-col items-end gap-2 bottom-24 lg:bottom-6 right-5">
        <button
          onClick={() => setShowQuickAdd(v => !v)}
          className="w-10 h-10 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] shadow-md flex items-center justify-center text-[18px] transition-all active:scale-95"
          title="Rychlé přidání textem"
        >⚡</button>
        <button
          onClick={() => setShowAddSheet(true)}
          className="w-[52px] h-[52px] rounded-[16px] text-white text-[26px] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
        >+</button>
      </div>

      {showAddSheet && (
        <AddTaskSheet
          categories={categories}
          defaultCategory={mobileCat !== 'Vše' ? mobileCat : undefined}
          clients={clientsList}
          onSave={payload => addTask({ user_id: userId, status: 'open', done_at: null, ...payload })}
          onClose={() => setShowAddSheet(false)}
        />
      )}

      {editingTask && (
        <AddTaskSheet
          categories={categories}
          clients={clientsList}
          existingTask={editingTask}
          onSave={payload => editTask({ ...editingTask, ...payload })}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  )
}
