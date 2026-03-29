'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  Room, RoomTodo,
  fetchRooms, insertRoom, updateRoom, deleteRoom,
  fetchRoomTodos, insertRoomTodo, updateRoomTodo, deleteRoomTodo,
  ROOM_PRESETS, ROOM_COLORS,
  ShoppingItem, fetchShoppingItems, insertShoppingItem, updateShoppingItem, deleteShoppingItem, clearDoneShoppingItems,
  HomeTask, fetchHomeTasks, insertHomeTask, updateHomeTask, deleteHomeTask,
} from '@/features/byt/api'

// ── Helpers ──────────────────────────────────────────────────────────

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50 shadow-lg"
      style={{ background: 'var(--color-primary)' }}
    >
      {msg}
    </div>
  )
}

function TabNav({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  const tabs = [
    { id: 'rooms',    label: 'Místnosti' },
    { id: 'shopping', label: 'Nákupy' },
    { id: 'tasks',    label: 'Úkoly domu' },
  ]
  return (
    <div className="flex gap-3 px-5 pt-4 border-b border-[var(--border)] bg-[var(--surface)]">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          className="pb-3 text-[14px] font-semibold transition-colors"
          style={{
            color: tab === t.id ? 'var(--color-primary)' : 'var(--text-tertiary)',
            borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Room Modal ────────────────────────────────────────────────────────

function RoomModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: { name: string; icon: string; color: string }
  onSave: (name: string, icon: string, color: string) => void
  onClose: () => void
}) {
  const [step, setStep] = useState<'preset' | 'custom'>(initial ? 'custom' : 'preset')
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '🏠')
  const [color, setColor] = useState(initial?.color ?? ROOM_COLORS[0])

  const pickPreset = (p: { name: string; icon: string; color: string }) => {
    setName(p.name); setIcon(p.icon); setColor(p.color)
    setStep('custom')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-bold">{initial ? 'Upravit místnost' : 'Nová místnost'}</div>
          <button onClick={onClose} className="text-[var(--text-tertiary)] text-[20px]">✕</button>
        </div>

        {step === 'preset' && !initial && (
          <>
            <div className="text-[13px] text-[var(--text-secondary)]">Vyber typ místnosti nebo přidej vlastní</div>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => pickPreset(p)}
                  className="flex flex-col items-center gap-1 p-3 rounded-[12px] border border-[var(--border)] active:scale-95 transition-transform"
                  style={{ borderColor: p.color + '44', background: p.color + '11' }}
                >
                  <span className="text-[24px]">{p.icon}</span>
                  <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: p.color }}>{p.name}</span>
                </button>
              ))}
              <button
                onClick={() => setStep('custom')}
                className="flex flex-col items-center gap-1 p-3 rounded-[12px] border border-dashed border-[var(--border-strong)]"
              >
                <span className="text-[24px]">✏️</span>
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Vlastní</span>
              </button>
            </div>
          </>
        )}

        {(step === 'custom' || initial) && (
          <>
            {!initial && (
              <button onClick={() => setStep('preset')} className="text-[13px] text-[var(--text-secondary)]">← Zpět na výběr</button>
            )}
            <div className="flex items-center gap-3 p-3 rounded-[12px]" style={{ background: color + '18' }}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[22px]" style={{ background: color }}>
                {icon}
              </div>
              <span className="font-semibold" style={{ color }}>{name || 'Název místnosti'}</span>
            </div>
            <input
              type="text"
              placeholder="Název místnosti"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]"
            />
            <div>
              <div className="text-[12px] font-bold text-[var(--text-secondary)] mb-2">IKONA</div>
              <div className="flex gap-2 flex-wrap">
                {ROOM_PRESETS.map(p => (
                  <button
                    key={p.icon}
                    onClick={() => setIcon(p.icon)}
                    className="text-[22px] p-2 rounded-[10px] transition-all"
                    style={{ background: icon === p.icon ? color + '30' : 'var(--surface-raised)', outline: icon === p.icon ? `2px solid ${color}` : 'none' }}
                  >
                    {p.icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[12px] font-bold text-[var(--text-secondary)] mb-2">BARVA</div>
              <div className="flex gap-2 flex-wrap">
                {ROOM_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full transition-transform active:scale-90"
                    style={{ background: c, outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-[var(--text-secondary)] border border-[var(--border-strong)]">Zrušit</button>
              <button
                onClick={() => { if (name.trim()) onSave(name.trim(), icon, color) }}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white"
                style={{ background: name.trim() ? color : 'var(--border-strong)' }}
              >
                {initial ? 'Uložit' : 'Přidat'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Rooms Tab ─────────────────────────────────────────────────────────

function AddTodoForm({ color, onAdd }: { color: string; onAdd: (title: string) => void }) {
  const [input, setInput] = useState('')
  const submit = () => { if (!input.trim()) return; onAdd(input.trim()); setInput('') }
  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        placeholder="Přidat úkol..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className="flex-1 px-3 py-1.5 border border-[var(--border)] rounded-[8px] text-[13px] bg-[var(--bg)]"
      />
      <button onClick={submit} className="px-3 py-1.5 rounded-[8px] text-[12px] font-bold text-white" style={{ background: color }}>+</button>
    </div>
  )
}

function AddBuyForm({ color, onAdd }: { color: string; onAdd: (title: string, price: number | null) => void }) {
  const [input, setInput] = useState('')
  const [price, setPrice] = useState('')
  const submit = () => {
    if (!input.trim()) return
    onAdd(input.trim(), price ? parseFloat(price) : null)
    setInput(''); setPrice('')
  }
  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        placeholder="Co koupit..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className="flex-1 px-3 py-1.5 border border-[var(--border)] rounded-[8px] text-[13px] bg-[var(--bg)]"
      />
      <input
        type="number"
        placeholder="Kč"
        value={price}
        onChange={e => setPrice(e.target.value)}
        className="w-16 px-2 py-1.5 border border-[var(--border)] rounded-[8px] text-[13px] bg-[var(--bg)]"
      />
      <button onClick={submit} className="px-3 py-1.5 rounded-[8px] text-[12px] font-bold text-white" style={{ background: color }}>+</button>
    </div>
  )
}

function RoomsTab({ userId }: { userId: string }) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [todos, setTodos] = useState<Record<string, RoomTodo[]>>({})
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = async () => {
    try {
      setLoading(true)
      const data = await fetchRooms(userId)
      setRooms(data)
      const todosMap: Record<string, RoomTodo[]> = {}
      await Promise.all(data.map(async room => {
        todosMap[room.id] = await fetchRoomTodos(room.id)
      }))
      setTodos(todosMap)
    } catch {
      showToast('Chyba při načítání')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  const addRoom = async (name: string, icon: string, color: string) => {
    try {
      const room = await insertRoom({ user_id: userId, name, icon, color, order_index: rooms.length })
      setRooms(r => [...r, room])
      setTodos(t => ({ ...t, [room.id]: [] }))
      setShowAdd(false)
      showToast('Místnost přidána')
    } catch { showToast('Chyba') }
  }

  const saveEditRoom = async (name: string, icon: string, color: string) => {
    if (!editRoom) return
    try {
      await updateRoom(editRoom.id, { name, icon, color })
      setRooms(r => r.map(rm => rm.id === editRoom.id ? { ...rm, name, icon, color } : rm))
      setEditRoom(null)
      showToast('Uloženo')
    } catch { showToast('Chyba') }
  }

  const removeRoom = async (roomId: string) => {
    try {
      await deleteRoom(roomId)
      setRooms(r => r.filter(rm => rm.id !== roomId))
      setTodos(t => { const n = { ...t }; delete n[roomId]; return n })
      setExpandedRoom(null)
      showToast('Místnost smazána')
    } catch { showToast('Chyba') }
  }

  const toggleTodoDone = async (roomId: string, todoId: string, done: boolean) => {
    try {
      await updateRoomTodo(todoId, { done: !done })
      setTodos(t => ({ ...t, [roomId]: t[roomId].map(td => td.id === todoId ? { ...td, done: !done } : td) }))
    } catch { showToast('Chyba') }
  }

  const removeTodo = async (roomId: string, todoId: string) => {
    try {
      await deleteRoomTodo(todoId)
      setTodos(t => ({ ...t, [roomId]: t[roomId].filter(td => td.id !== todoId) }))
    } catch { showToast('Chyba') }
  }

  const addTodo = async (roomId: string, title: string, type: 'todo' | 'buy', price: number | null) => {
    try {
      const todo = await insertRoomTodo({ room_id: roomId, user_id: userId, title, done: false, type, price, notes: null })
      setTodos(t => ({ ...t, [roomId]: [todo, ...(t[roomId] ?? [])] }))
    } catch { showToast('Chyba') }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[14px] text-[var(--text-tertiary)]">Načítám...</div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
      {rooms.length === 0 && (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <div className="text-[40px] mb-3">🏠</div>
          <div className="text-[15px] font-semibold">Zatím žádné místnosti</div>
          <div className="text-[13px] mt-1">Klepni na + a přidej první místnost</div>
        </div>
      )}

      {rooms.map(room => {
        const roomTodos = todos[room.id] ?? []
        const todoCount = roomTodos.filter(t => t.type === 'todo' && !t.done).length
        const buyCount = roomTodos.filter(t => t.type === 'buy' && !t.done).length
        const totalCost = roomTodos.filter(t => t.type === 'buy' && !t.done).reduce((s, t) => s + (t.price ?? 0), 0)
        const isExpanded = expandedRoom === room.id

        return (
          <div key={room.id} className="rounded-[16px] overflow-hidden shadow-sm border border-[var(--border)]">
            <button
              onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
              className="w-full text-left flex items-center bg-[var(--surface)]"
            >
              <div className="w-1.5 self-stretch rounded-l-[16px]" style={{ background: room.color }} />
              <div className="flex items-center gap-3 flex-1 px-4 py-3.5">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0" style={{ background: room.color + '22' }}>
                  {room.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">{room.name}</div>
                  <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5 flex gap-2">
                    {todoCount > 0 && <span>📋 {todoCount} úkolů</span>}
                    {buyCount > 0 && <span>🛒 {buyCount} k nákupu{totalCost > 0 ? ` • ${totalCost.toLocaleString('cs')} Kč` : ''}</span>}
                    {todoCount === 0 && buyCount === 0 && <span>Vše hotovo ✓</span>}
                  </div>
                </div>
                <span className="text-[var(--text-tertiary)] text-[12px]">{isExpanded ? '▼' : '▶'}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-4 space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditRoom(room)}
                    className="flex-1 py-2 rounded-[10px] text-[12px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
                  >
                    ✏️ Upravit místnost
                  </button>
                  <button
                    onClick={() => removeRoom(room.id)}
                    className="px-3 py-2 rounded-[10px] text-[12px] font-semibold text-red-400 border border-[var(--border)]"
                  >
                    🗑️
                  </button>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-[var(--text-tertiary)] mb-2 tracking-wide uppercase">Co udělat</div>
                  {roomTodos.filter(t => t.type === 'todo').map(todo => (
                    <div key={todo.id} className="flex items-center gap-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => toggleTodoDone(room.id, todo.id, todo.done)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: room.color }}
                      />
                      <span
                        className="flex-1 text-[13px]"
                        style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
                      >
                        {todo.title}
                      </span>
                      <button onClick={() => removeTodo(room.id, todo.id)} className="text-[var(--text-tertiary)] text-[14px] px-1">✕</button>
                    </div>
                  ))}
                  <AddTodoForm color={room.color} onAdd={title => addTodo(room.id, title, 'todo', null)} />
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <div className="text-[11px] font-bold text-[var(--text-tertiary)] mb-2 tracking-wide uppercase">Co koupit</div>
                  {roomTodos.filter(t => t.type === 'buy').map(todo => (
                    <div key={todo.id} className="flex items-center gap-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => toggleTodoDone(room.id, todo.id, todo.done)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: room.color }}
                      />
                      <span
                        className="flex-1 text-[13px]"
                        style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
                      >
                        {todo.title}
                      </span>
                      {todo.price != null && <span className="text-[12px] text-[var(--text-tertiary)]">{todo.price.toLocaleString('cs')} Kč</span>}
                      <button onClick={() => removeTodo(room.id, todo.id)} className="text-[var(--text-tertiary)] text-[14px] px-1">✕</button>
                    </div>
                  ))}
                  <AddBuyForm color={room.color} onAdd={(title, price) => addTodo(room.id, title, 'buy', price)} />
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[28px] flex items-center justify-center text-white shadow-lg"
        style={{ background: 'var(--color-primary)' }}
      >
        +
      </button>

      {showAdd && <RoomModal onSave={addRoom} onClose={() => setShowAdd(false)} />}
      {editRoom && (
        <RoomModal
          initial={{ name: editRoom.name, icon: editRoom.icon, color: editRoom.color }}
          onSave={saveEditRoom}
          onClose={() => setEditRoom(null)}
        />
      )}
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

// ── Shopping Tab ──────────────────────────────────────────────────────

function ShoppingTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetchShoppingItems(userId)
      .then(setItems)
      .catch(() => showToast('Chyba při načítání'))
      .finally(() => setLoading(false))
  }, [userId])

  const addItem = async () => {
    if (!input.trim()) return
    try {
      const item = await insertShoppingItem({ user_id: userId, title: input.trim(), done: false })
      setItems(prev => [item, ...prev])
      setInput('')
      inputRef.current?.focus()
    } catch { showToast('Chyba') }
  }

  const toggle = async (id: string, done: boolean) => {
    try {
      await updateShoppingItem(id, { done: !done })
      setItems(prev => prev.map(i => i.id === id ? { ...i, done: !done } : i))
    } catch { showToast('Chyba') }
  }

  const removeItem = async (id: string) => {
    try {
      await deleteShoppingItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { showToast('Chyba') }
  }

  const clearDone = async () => {
    try {
      await clearDoneShoppingItems(userId)
      setItems(prev => prev.filter(i => !i.done))
      showToast('Hotové položky smazány')
    } catch { showToast('Chyba') }
  }

  const doneCount = items.filter(i => i.done).length
  const pending = items.filter(i => !i.done)
  const done = items.filter(i => i.done)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[14px] text-[var(--text-tertiary)]">Načítám...</div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
      {/* Quick add */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Přidat položku..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          className="flex-1 px-4 py-3 border border-[var(--border)] rounded-[12px] text-[14px] bg-[var(--surface)]"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={addItem}
          className="w-12 h-12 rounded-[12px] text-white font-bold text-[20px] flex items-center justify-center"
          style={{ background: 'var(--color-primary)' }}
        >
          +
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <div className="text-[40px] mb-3">🛒</div>
          <div className="text-[15px] font-semibold">Nákupní seznam je prázdný</div>
          <div className="text-[13px] mt-1">Přidej první položku výše</div>
        </div>
      )}

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="space-y-1">
          {pending.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]"
            >
              <button
                onClick={() => toggle(item.id, item.done)}
                className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all"
                style={{ borderColor: 'var(--color-primary)' }}
              />
              <span className="flex-1 text-[14px]" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
              <button onClick={() => removeItem(item.id)} className="text-[var(--text-tertiary)] text-[16px] px-1">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Done items */}
      {done.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
              Hotovo ({doneCount})
            </div>
            <button
              onClick={clearDone}
              className="text-[12px] font-semibold"
              style={{ color: 'var(--color-primary)' }}
            >
              Vymazat hotové
            </button>
          </div>
          {done.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]"
            >
              <button
                onClick={() => toggle(item.id, item.done)}
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: 'var(--color-primary)' }}
              >
                <span className="text-white text-[10px]">✓</span>
              </button>
              <span className="flex-1 text-[14px] line-through" style={{ color: 'var(--text-tertiary)' }}>{item.title}</span>
              <button onClick={() => removeItem(item.id)} className="text-[var(--text-tertiary)] text-[16px] px-1">✕</button>
            </div>
          ))}
        </div>
      )}

      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

// ── Tasks Tab ─────────────────────────────────────────────────────────

function TasksTab({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<HomeTask[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetchHomeTasks(userId)
      .then(setTasks)
      .catch(() => showToast('Chyba při načítání'))
      .finally(() => setLoading(false))
  }, [userId])

  const addTask = async () => {
    if (!input.trim()) return
    try {
      const task = await insertHomeTask({ user_id: userId, title: input.trim(), done: false })
      setTasks(prev => [task, ...prev])
      setInput('')
      inputRef.current?.focus()
    } catch { showToast('Chyba') }
  }

  const toggle = async (id: string, done: boolean) => {
    try {
      await updateHomeTask(id, { done: !done })
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t))
    } catch { showToast('Chyba') }
  }

  const removeTask = async (id: string) => {
    try {
      await deleteHomeTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch { showToast('Chyba') }
  }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[14px] text-[var(--text-tertiary)]">Načítám...</div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
      {/* Quick add */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Nový úkol..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          className="flex-1 px-4 py-3 border border-[var(--border)] rounded-[12px] text-[14px] bg-[var(--surface)]"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={addTask}
          className="w-12 h-12 rounded-[12px] text-white font-bold text-[20px] flex items-center justify-center"
          style={{ background: 'var(--color-primary)' }}
        >
          +
        </button>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <div className="text-[40px] mb-3">🔧</div>
          <div className="text-[15px] font-semibold">Žádné úkoly</div>
          <div className="text-[13px] mt-1">Věci k zařízení doma — servis, opravy, administrativa</div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-1">
          {pending.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]"
            >
              <button
                onClick={() => toggle(task.id, task.done)}
                className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                style={{ borderColor: 'var(--color-primary)' }}
              />
              <span className="flex-1 text-[14px]" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
              <button onClick={() => removeTask(task.id)} className="text-[var(--text-tertiary)] text-[16px] px-1">✕</button>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-1 mt-2">
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide px-1 mb-2">
            Hotovo ({done.length})
          </div>
          {done.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]"
            >
              <button
                onClick={() => toggle(task.id, task.done)}
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: 'var(--color-primary)' }}
              >
                <span className="text-white text-[10px]">✓</span>
              </button>
              <span className="flex-1 text-[14px] line-through" style={{ color: 'var(--text-tertiary)' }}>{task.title}</span>
              <button onClick={() => removeTask(task.id)} className="text-[var(--text-tertiary)] text-[16px] px-1">✕</button>
            </div>
          ))}
        </div>
      )}

      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function BytPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [tab, setTab] = useState('rooms')

  if (!userId) return null

  return (
    <div className="flex flex-col h-full">
      <Header title="Domácnost" />
      <TabNav tab={tab} onTab={setTab} />
      {tab === 'rooms'    && <RoomsTab userId={userId} />}
      {tab === 'shopping' && <ShoppingTab userId={userId} />}
      {tab === 'tasks'    && <TasksTab userId={userId} />}
    </div>
  )
}
