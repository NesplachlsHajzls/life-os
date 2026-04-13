'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { useTodo } from '@/features/todo/hooks/useTodo'
import { useUser } from '@/hooks/useUser'
import { Task } from '@/features/todo/api'
import { TaskItem } from '@/features/todo/components/TaskItem'
import { AddTaskSheet } from '@/features/todo/components/AddTaskSheet'
import { fetchClients } from '@/features/prace/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

type TabId = 'open' | 'done' | 'routines'
const FREQ_LABELS = { daily: 'Denně', weekly: 'Týdně', monthly: 'Měsíčně' }
const FREQ_ICONS  = { daily: '📅',    weekly: '📆',    monthly: '🗓️' }

// ── Section header ────────────────────────────────────────────────
function SectionHead({ label, count, accent }: {
  label: string; count: number; accent?: string
}) {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <span
        className="text-[11px] font-bold uppercase tracking-[0.07em] flex-shrink-0"
        style={{ color: accent ?? 'var(--text-tertiary)' }}
      >
        {label}
      </span>
      <span
        className="text-[11px] font-bold px-1.5 py-[1px] rounded-full flex-shrink-0"
        style={{
          background: accent ? accent + '20' : 'var(--surface-raised)',
          color:      accent ?? 'var(--text-tertiary)',
        }}
      >
        {count}
      </span>
      <div className="flex-1 h-px" style={{ background: accent ? accent + '30' : 'var(--border)' }} />
    </div>
  )
}

// ── Task group card ───────────────────────────────────────────────
function TaskGroup({ tasks, categories, onToggle, onEdit, onDelete, clientsMap, showCategory }: {
  tasks: Task[]
  categories: ReturnType<typeof useTodo>['categories']
  onToggle: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  clientsMap: Record<string, string>
  showCategory?: boolean
}) {
  if (tasks.length === 0) return null
  return (
    <div
      className="rounded-[13px] overflow-hidden mb-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {tasks.map((task, i) => (
        <div key={task.id}>
          <TaskItem
            task={task}
            categories={categories}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
            clientsMap={clientsMap}
            showCategory={showCategory}
          />
          {i < tasks.length - 1 && (
            <div className="h-px ml-[52px] mr-4" style={{ background: 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Quick add bar ─────────────────────────────────────────────────
function QuickAddBar({ defaultCat, onAdd, onClose }: {
  defaultCat: string
  onAdd: (text: string, cat: string) => Promise<string | null>
  onClose: () => void
}) {
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')

  async function submit() {
    if (!val.trim()) return
    const e = await onAdd(val, defaultCat !== 'Vše' ? defaultCat : 'Osobní')
    if (e) { setErr(e); return }
    setVal('')
    onClose()
  }

  return (
    <div
      className="rounded-[13px] p-3 mb-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-2"
         style={{ color: 'var(--text-tertiary)' }}>
        💡 koupit trička p2 · zavolat !3 zítra · logo https://…
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-[10px] px-3 py-2 text-[13px] outline-none transition-colors"
          style={{ background: 'var(--bg)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
          placeholder="Napiš úkol…"
          value={val}
          autoFocus
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-strong)')}
        />
        <button
          onClick={submit}
          className="px-4 py-2 rounded-[10px] text-[13px] font-bold text-white flex-shrink-0"
          style={{ background: 'var(--color-primary)' }}
        >
          Přidat
        </button>
        <button
          onClick={onClose}
          className="px-3 py-2 rounded-[10px] text-[13px] flex-shrink-0"
          style={{ border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
        >
          ✕
        </button>
      </div>
      {err && <p className="text-[11px] text-red-400 mt-1.5">⚠ {err}</p>}
    </div>
  )
}

// ── ICA grouped view ──────────────────────────────────────────────
function IcaGroups({ tasks, categories, onToggle, onEdit, onDelete, clientsMap }: {
  tasks: Task[]
  categories: ReturnType<typeof useTodo>['categories']
  onToggle: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  clientsMap: Record<string, string>
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; tasks: Task[] }>()
    for (const t of tasks) {
      const key = t.client_id ?? '__none__'
      const name = t.client_id ? (clientsMap[t.client_id] ?? 'Neznámý klient') : 'Bez klienta'
      if (!map.has(key)) map.set(key, { name, tasks: [] })
      map.get(key)!.tasks.push(t)
    }
    // Sort: clients with most tasks first, "Bez klienta" last
    return Array.from(map.entries())
      .sort(([ka], [kb]) => {
        if (ka === '__none__') return 1
        if (kb === '__none__') return -1
        return map.get(kb)!.tasks.length - map.get(ka)!.tasks.length
      })
      .map(([, v]) => v)
  }, [tasks, clientsMap])

  if (grouped.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[44px] mb-3">💼</div>
        <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Žádné klientské úkoly</p>
      </div>
    )
  }

  return (
    <div>
      {grouped.map(group => (
        <div key={group.name} className="mb-5">
          <SectionHead label={group.name} count={group.tasks.length} accent="var(--color-primary)" />
          <TaskGroup
            tasks={group.tasks}
            categories={categories}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            clientsMap={clientsMap}
            showCategory={false}
          />
        </div>
      ))}
    </div>
  )
}

// ── Inner page (needs useSearchParams) ────────────────────────────
function TodoPageInner() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID
  const searchParams = useSearchParams()

  const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    fetchClients(userId)
      .then(cs => setClientsList(cs.map(c => ({ id: c.id, name: c.name }))))
      .catch(() => {})
  }, [userId])
  const clientsMap = useMemo(
    () => Object.fromEntries(clientsList.map(c => [c.id, c.name])),
    [clientsList]
  )

  const {
    loading, toast,
    openTasks, doneTasks, routines, categories,
    addTaskText, addTask, toggleTask, editTask, removeTask,
  } = useTodo(userId)

  const [activeTab,    setActiveTab]    = useState<TabId>('open')
  const [activeCat,    setActiveCat]    = useState('Vše')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingTask,  setEditingTask]  = useState<Task | null>(null)

  // Read ?cat=ica from URL on mount
  useEffect(() => {
    if (searchParams.get('cat') === 'ica') {
      setActiveCat('I.CA')
    }
  }, [searchParams])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const weekEnd = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 6)
    return d.toISOString().slice(0, 10)
  }, [])

  const isIca = activeCat === 'I.CA'

  // Category-filtered tasks
  const filteredOpen = useMemo(
    () => openTasks.filter(t =>
      activeCat === 'Vše' ? true
      : isIca ? t.client_id !== null
      : t.category === activeCat
    ),
    [openTasks, activeCat, isIca]
  )
  const filteredDone = useMemo(
    () => doneTasks.filter(t =>
      activeCat === 'Vše' ? true
      : isIca ? t.client_id !== null
      : t.category === activeCat
    ).slice(0, 60),
    [doneTasks, activeCat, isIca]
  )

  // Time-based sections
  const sections = useMemo(() => ({
    overdue:  filteredOpen
      .filter(t => t.due_date && t.due_date < today)
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!)),
    today:    filteredOpen
      .filter(t => t.due_date === today)
      .sort((a, b) => b.priority - a.priority),
    week:     filteredOpen
      .filter(t => t.due_date && t.due_date > today && t.due_date <= weekEnd)
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!)),
    later:    filteredOpen
      .filter(t => !t.due_date || t.due_date > weekEnd)
      .sort((a, b) => b.priority - a.priority),
  }), [filteredOpen, today, weekEnd])

  const noOpenTasks = filteredOpen.length === 0

  // Category chips — "I.CA" is a special synthetic filter for client tasks
  const catChips = useMemo(
    () => ['Vše', 'I.CA', ...categories.map(c => c.name)],
    [categories]
  )

  // Tab counts
  const tabCounts = {
    open:     openTasks.length,
    done:     doneTasks.length,
    routines: routines.length,
  }

  return (
    <>
      <Header title="Úkoly" />

      {/* ── Tab bar ── */}
      <div className="flex" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {(['open', 'done', 'routines'] as const).map(tab => {
          const labels = { open: 'Otevřené', done: 'Hotové', routines: 'Rutiny' }
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold border-b-2 transition-all"
              style={{
                borderColor: active ? 'var(--color-primary)' : 'transparent',
                color:       active ? 'var(--color-primary)' : 'var(--text-tertiary)',
              }}
            >
              {labels[tab]}
              <span
                className="text-[11px] font-bold px-1.5 py-[1px] rounded-full transition-all"
                style={{
                  background: active ? 'var(--color-primary)' : 'var(--surface-raised)',
                  color:      active ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                {tabCounts[tab]}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Category chip filter (not for routines) ── */}
      {activeTab !== 'routines' && (
        <div
          className="flex gap-2 px-4 py-2.5 hide-scrollbar"
          style={{
            overflowX: 'auto',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {catChips.map(cat => {
            const catObj = categories.find(c => c.name === cat)
            const isActive = activeCat === cat
            const isIcaChip = cat === 'I.CA'
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-[6px] rounded-full text-[12px] font-semibold transition-all"
                style={{
                  background:  isActive ? (isIcaChip ? '#8b5cf6' : catObj?.color ?? 'var(--color-primary)') : 'var(--surface-raised)',
                  color:       isActive ? '#fff' : 'var(--text-secondary)',
                  border:     `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                }}
              >
                {isIcaChip ? <span className="text-[13px]">💼</span> : catObj?.icon && <span className="text-[13px]">{catObj.icon}</span>}
                {cat}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Main scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl md:max-w-5xl mx-auto px-4 pt-4 pb-32">

          {/* ── OPEN TASKS ── */}
          {activeTab === 'open' && (
            <>
              {showQuickAdd && (
                <QuickAddBar
                  defaultCat={activeCat}
                  onAdd={addTaskText}
                  onClose={() => setShowQuickAdd(false)}
                />
              )}

              {loading ? (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  Načítám…
                </div>
              ) : isIca ? (
                /* ── I.CA: skupiny per klient ── */
                <IcaGroups
                  tasks={filteredOpen}
                  categories={categories}
                  onToggle={toggleTask}
                  onEdit={setEditingTask}
                  onDelete={removeTask}
                  clientsMap={clientsMap}
                />
              ) : noOpenTasks ? (
                <div className="text-center py-16">
                  <div className="text-[44px] mb-3">✅</div>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Všechno hotovo!
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {activeCat !== 'Vše' ? `V kategorii ${activeCat} nic nečeká` : 'Žádné otevřené úkoly'}
                  </p>
                </div>
              ) : (
                /* ── Two-column layout on desktop, single column on mobile ── */
                <div className="md:flex md:gap-5 md:items-start">

                  {/* ── LEFT / MAIN column ── */}
                  <div className="md:flex-1 min-w-0">
                    {/* Dnes */}
                    {sections.today.length > 0 && (
                      <div>
                        <SectionHead label="Dnes" count={sections.today.length} accent="var(--color-primary)" />
                        <TaskGroup
                          tasks={sections.today}
                          categories={categories}
                          onToggle={toggleTask}
                          onEdit={setEditingTask}
                          onDelete={removeTask}
                          clientsMap={clientsMap}
                          showCategory={activeCat === 'Vše'}
                        />
                      </div>
                    )}

                    {/* Tento týden */}
                    {sections.week.length > 0 && (
                      <div>
                        <SectionHead label="Tento týden" count={sections.week.length} />
                        <TaskGroup
                          tasks={sections.week}
                          categories={categories}
                          onToggle={toggleTask}
                          onEdit={setEditingTask}
                          onDelete={removeTask}
                          clientsMap={clientsMap}
                          showCategory={activeCat === 'Vše'}
                        />
                      </div>
                    )}

                    {/* Ostatní / Inbox */}
                    {sections.later.length > 0 && (
                      <div>
                        <SectionHead label="Ostatní" count={sections.later.length} />
                        <TaskGroup
                          tasks={sections.later}
                          categories={categories}
                          onToggle={toggleTask}
                          onEdit={setEditingTask}
                          onDelete={removeTask}
                          clientsMap={clientsMap}
                          showCategory={activeCat === 'Vše'}
                        />
                      </div>
                    )}

                    {/* Prošlé — pouze na mobilu (na desktopu je v pravém sloupci) */}
                    {sections.overdue.length > 0 && (
                      <div className="md:hidden">
                        <SectionHead label="Prošlé" count={sections.overdue.length} accent="#ef4444" />
                        <TaskGroup
                          tasks={sections.overdue}
                          categories={categories}
                          onToggle={toggleTask}
                          onEdit={setEditingTask}
                          onDelete={removeTask}
                          clientsMap={clientsMap}
                          showCategory={activeCat === 'Vše'}
                        />
                      </div>
                    )}
                  </div>

                  {/* ── RIGHT column — Prošlé (pouze desktop) ── */}
                  {sections.overdue.length > 0 && (
                    <div className="hidden md:block md:w-[320px] flex-shrink-0">
                      <SectionHead label="Prošlé" count={sections.overdue.length} accent="#ef4444" />
                      <TaskGroup
                        tasks={sections.overdue}
                        categories={categories}
                        onToggle={toggleTask}
                        onEdit={setEditingTask}
                        onDelete={removeTask}
                        clientsMap={clientsMap}
                        showCategory={activeCat === 'Vše'}
                      />
                    </div>
                  )}

                </div>
              )}
            </>
          )}

          {/* ── DONE TASKS ── */}
          {activeTab === 'done' && (
            <>
              {loading ? (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  Načítám…
                </div>
              ) : filteredDone.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-[44px] mb-3">📭</div>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Zatím nic hotového
                  </p>
                </div>
              ) : (
                <div>
                  <SectionHead label={`Hotové${activeCat !== 'Vše' ? ` · ${activeCat}` : ''}`} count={filteredDone.length} />
                  <TaskGroup
                    tasks={filteredDone}
                    categories={categories}
                    onToggle={toggleTask}
                    onEdit={setEditingTask}
                    onDelete={removeTask}
                    clientsMap={clientsMap}
                    showCategory={activeCat === 'Vše'}
                  />
                </div>
              )}
            </>
          )}

          {/* ── ROUTINES ── */}
          {activeTab === 'routines' && (
            <>
              {(['daily', 'weekly', 'monthly'] as const).map(freq => {
                const items = routines.filter(r => r.frequency === freq)
                if (items.length === 0) return null
                return (
                  <div key={freq} className="mb-6">
                    <SectionHead
                      label={`${FREQ_ICONS[freq]} ${FREQ_LABELS[freq]}`}
                      count={items.length}
                    />
                    <div
                      className="rounded-[13px] overflow-hidden"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      {items.map((r, i) => {
                        const cat = categories.find(c => c.name === r.category)
                        return (
                          <div key={r.id}>
                            <div className="flex items-center gap-3 px-4 py-3">
                              <div
                                className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0"
                                style={{ background: cat ? cat.color + '20' : 'var(--surface-raised)' }}
                              >
                                {cat?.icon ?? '🔄'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {r.title}
                                </div>
                                {cat && (
                                  <span
                                    className="text-[11px] font-semibold"
                                    style={{ color: cat.color }}
                                  >
                                    {cat.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            {i < items.length - 1 && (
                              <div className="h-px ml-[64px] mr-4" style={{ background: 'var(--border)' }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {routines.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-[44px] mb-3">🔄</div>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Žádné rutiny
                  </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed bottom-28 left-1/2 -translate-x-1/2 text-[13px] font-medium px-4 py-2.5 rounded-[12px] shadow-lg z-50 whitespace-nowrap"
          style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          {toast}
        </div>
      )}

      {/* ── FABs ── */}
      <div className="fixed z-40 flex flex-col items-end gap-2 bottom-24 lg:bottom-6 right-5">
        {activeTab === 'open' && (
          <button
            onClick={() => setShowQuickAdd(v => !v)}
            className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[18px] transition-all active:scale-95"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
            title="Rychlé přidání"
          >
            ⚡
          </button>
        )}
        <button
          onClick={() => setShowAddSheet(true)}
          className="w-[52px] h-[52px] rounded-[16px] text-white text-[26px] flex items-center justify-center active:scale-95 transition-all"
          style={{
            background:  'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))',
            boxShadow:   '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          +
        </button>
      </div>

      {/* ── Add sheet ── */}
      {showAddSheet && (
        <AddTaskSheet
          categories={categories}
          defaultCategory={activeCat !== 'Vše' && activeCat !== 'I.CA' ? activeCat : undefined}
          clients={clientsList}
          onSave={payload => addTask({ user_id: userId, status: 'open', done_at: null, ...payload })}
          onClose={() => setShowAddSheet(false)}
        />
      )}

      {/* ── Edit sheet ── */}
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

// ── Default export wrapped in Suspense (useSearchParams requirement) ──
export default function TodoPage() {
  return (
    <Suspense>
      <TodoPageInner />
    </Suspense>
  )
}
