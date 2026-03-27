'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  Room, RoomTodo, HomeContract,
  fetchRooms, insertRoom, updateRoom, deleteRoom,
  fetchRoomTodos, insertRoomTodo, updateRoomTodo, deleteRoomTodo,
  fetchContracts, insertContract, deleteContract,
  ROOM_PRESETS, ROOM_COLORS, CONTRACT_TYPES,
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
    { id: 'rooms',     label: '🏠 Místnosti' },
    { id: 'contracts', label: '📄 Smlouvy' },
  ]
  return (
    <div className="flex gap-3 px-5 pt-4 border-b border-[var(--border)] bg-[var(--surface)]">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          className="pb-3 text-[14px] font-semibold transition-colors"
          style={{
            color: tab === t.id ? 'var(--color-primary)' : '#9ca3af',
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
          <button onClick={onClose} className="text-gray-400 text-[20px]">✕</button>
        </div>

        {step === 'preset' && !initial && (
          <>
            <div className="text-[13px] text-gray-500">Vyber typ místnosti nebo přidej vlastní</div>
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
                <span className="text-[11px] font-semibold text-gray-500">Vlastní</span>
              </button>
            </div>
          </>
        )}

        {(step === 'custom' || initial) && (
          <>
            {!initial && (
              <button onClick={() => setStep('preset')} className="text-[13px] text-gray-500">← Zpět na výběr</button>
            )}

            {/* Preview */}
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
              <div className="text-[12px] font-bold text-gray-500 mb-2">IKONA</div>
              <div className="flex gap-2 flex-wrap">
                {ROOM_PRESETS.map(p => (
                  <button
                    key={p.icon}
                    onClick={() => setIcon(p.icon)}
                    className="text-[22px] p-2 rounded-[10px] transition-all"
                    style={{ background: icon === p.icon ? color + '30' : '#f3f4f6', outline: icon === p.icon ? `2px solid ${color}` : 'none' }}
                  >
                    {p.icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[12px] font-bold text-gray-500 mb-2">BARVA</div>
              <div className="flex gap-2 flex-wrap">
                {ROOM_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full transition-transform active:scale-90"
                    style={{
                      background: c,
                      outline: color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-gray-700 border border-[var(--border-strong)]">Zrušit</button>
              <button
                onClick={() => { if (name.trim()) onSave(name.trim(), icon, color) }}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white"
                style={{ background: name.trim() ? color : '#d1d5db' }}
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
        className="flex-1 px-3 py-1.5 border border-[var(--border)] rounded-[8px] text-[13px]"
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
        className="flex-1 px-3 py-1.5 border border-[var(--border)] rounded-[8px] text-[13px]"
      />
      <input
        type="number"
        placeholder="Kč"
        value={price}
        onChange={e => setPrice(e.target.value)}
        className="w-16 px-2 py-1.5 border border-[var(--border)] rounded-[8px] text-[13px]"
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
      <div className="text-[14px] text-gray-400">Načítám...</div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
      {rooms.length === 0 && (
        <div className="text-center py-16 text-gray-400">
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
            {/* Room header */}
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
                  <div className="text-[14px] font-semibold text-gray-800">{room.name}</div>
                  <div className="text-[12px] text-gray-400 mt-0.5 flex gap-2">
                    {todoCount > 0 && <span>📋 {todoCount} úkolů</span>}
                    {buyCount > 0 && <span>🛒 {buyCount} k nákupu{totalCost > 0 ? ` • ${totalCost.toLocaleString('cs')} Kč` : ''}</span>}
                    {todoCount === 0 && buyCount === 0 && <span className="text-gray-300">Vše hotovo</span>}
                  </div>
                </div>
                <span className="text-gray-300 text-[12px]">{isExpanded ? '▼' : '▶'}</span>
              </div>
            </button>

            {/* Room body */}
            {isExpanded && (
              <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-4 space-y-4">

                {/* Edit / Delete */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditRoom(room)}
                    className="flex-1 py-2 rounded-[10px] text-[12px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-gray-600"
                  >
                    ✏️ Upravit místnost
                  </button>
                  <button
                    onClick={() => removeRoom(room.id)}
                    className="px-3 py-2 rounded-[10px] text-[12px] font-semibold border border-red-100 bg-red-50 text-red-500"
                  >
                    🗑️ Smazat
                  </button>
                </div>

                {/* Todos */}
                <div>
                  <div className="text-[11px] font-bold text-gray-400 mb-2 tracking-wide">CO UDĚLAT</div>
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
                        style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#9ca3af' : '#374151' }}
                      >
                        {todo.title}
                      </span>
                      <button onClick={() => removeTodo(room.id, todo.id)} className="text-gray-300 text-[14px] px-1">✕</button>
                    </div>
                  ))}
                  <AddTodoForm color={room.color} onAdd={title => addTodo(room.id, title, 'todo', null)} />
                </div>

                {/* Buy */}
                <div className="border-t border-[var(--border)] pt-4">
                  <div className="text-[11px] font-bold text-gray-400 mb-2 tracking-wide">CO KOUPIT</div>
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
                        style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#9ca3af' : '#374151' }}
                      >
                        {todo.title}
                      </span>
                      {todo.price != null && <span className="text-[12px] text-gray-400">{todo.price.toLocaleString('cs')} Kč</span>}
                      <button onClick={() => removeTodo(room.id, todo.id)} className="text-gray-300 text-[14px] px-1">✕</button>
                    </div>
                  ))}
                  <AddBuyForm color={room.color} onAdd={(title, price) => addTodo(room.id, title, 'buy', price)} />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* FAB */}
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

// ── Contracts Tab ─────────────────────────────────────────────────────

function ContractsTab({ userId }: { userId: string }) {
  const [contracts, setContracts] = useState<HomeContract[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    name: '', type: 'utility' as const, provider: '',
    amount_monthly: '', renewal_date: '', auto_renew: true, file_url: '',
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetchContracts(userId)
      .then(setContracts)
      .catch(() => showToast('Chyba při načítání'))
      .finally(() => setLoading(false))
  }, [userId])

  const addContract = async () => {
    if (!form.name.trim()) return
    try {
      const contract = await insertContract({
        user_id: userId,
        name: form.name,
        type: form.type,
        provider: form.provider || null,
        amount_monthly: parseFloat(form.amount_monthly) || 0,
        renewal_date: form.renewal_date || null,
        auto_renew: form.auto_renew,
        notes: null,
        file_url: form.file_url || null,
      })
      setContracts(c => [...c, contract].sort((a, b) => {
        if (!a.renewal_date) return 1
        if (!b.renewal_date) return -1
        return a.renewal_date.localeCompare(b.renewal_date)
      }))
      setShowAdd(false)
      setForm({ name: '', type: 'utility', provider: '', amount_monthly: '', renewal_date: '', auto_renew: true, file_url: '' })
      showToast('Smlouva přidána')
    } catch { showToast('Chyba') }
  }

  const removeContract = async (id: string) => {
    try {
      await deleteContract(id)
      setContracts(c => c.filter(ct => ct.id !== id))
    } catch { showToast('Chyba') }
  }

  const daysUntil = (date: string | null) => {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[14px] text-gray-400">Načítám...</div>
    </div>
  )

  const totalMonthly = contracts.reduce((s, c) => s + c.amount_monthly, 0)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">

      {/* Summary */}
      {contracts.length > 0 && (
        <div className="rounded-[14px] p-4 mb-2" style={{ background: 'var(--color-primary)', color: 'white' }}>
          <div className="text-[12px] opacity-70">Celkové měsíční náklady</div>
          <div className="text-[24px] font-bold">{totalMonthly.toLocaleString('cs')} Kč</div>
          <div className="text-[12px] opacity-70 mt-0.5">{contracts.length} smluv celkem</div>
        </div>
      )}

      {contracts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-[40px] mb-3">📄</div>
          <div className="text-[15px] font-semibold">Zatím žádné smlouvy</div>
          <div className="text-[13px] mt-1">Klepni na + a přidej první smlouvu</div>
        </div>
      )}

      {contracts.map(contract => {
        const days = daysUntil(contract.renewal_date)
        const isUrgent = days !== null && days <= 30 && days >= 0
        const isOverdue = days !== null && days < 0
        const typeInfo = CONTRACT_TYPES.find(t => t.id === contract.type)

        return (
          <div key={contract.id} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            {isUrgent && <div className="h-1 bg-orange-400" />}
            {isOverdue && <div className="h-1 bg-red-500" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[16px]">{typeInfo?.icon}</span>
                    <span className="text-[14px] font-semibold text-gray-800">{contract.name}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-raised)] text-gray-500">{typeInfo?.label}</span>
                  </div>
                  {contract.provider && <div className="text-[12px] text-gray-400 mb-1">{contract.provider}</div>}
                  <div className="text-[15px] font-bold text-gray-800">{contract.amount_monthly.toLocaleString('cs')} Kč<span className="text-[12px] font-normal text-gray-400">/měs</span></div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {contract.renewal_date && (
                      <span className="text-[12px] font-semibold" style={{ color: isOverdue ? '#dc2626' : isUrgent ? '#ea580c' : '#6b7280' }}>
                        {isOverdue ? '⚠️ Prošlé' : isUrgent ? `⏰ Za ${days} dní` : `📅 ${new Date(contract.renewal_date).toLocaleDateString('cs-CZ')}`}
                      </span>
                    )}
                    {contract.auto_renew && <span className="text-[11px] text-green-600 font-semibold">↩ Auto-obnova</span>}
                    {contract.file_url && (
                      <a
                        href={contract.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-primary)' + '18', color: 'var(--color-primary)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        📎 Dokument
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => removeContract(contract.id)} className="text-gray-300 text-[18px] px-1 flex-shrink-0">✕</button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-bold">Nová smlouva</div>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-[20px]">✕</button>
            </div>

            <input
              type="text"
              placeholder="Název smlouvy"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]"
            />

            <div className="grid grid-cols-2 gap-2">
              {CONTRACT_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setForm({ ...form, type: t.id as any })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-all"
                  style={{
                    background: form.type === t.id ? 'var(--color-primary)' : '#f9fafb',
                    color: form.type === t.id ? 'white' : '#374151',
                    borderColor: form.type === t.id ? 'var(--color-primary)' : '#e5e7eb',
                  }}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Poskytovatel (např. ČEZ, Kooperativa)"
              value={form.provider}
              onChange={e => setForm({ ...form, provider: e.target.value })}
              className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]"
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[12px] text-gray-500 mb-1 block">Měsíční náklad (Kč)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount_monthly}
                  onChange={e => setForm({ ...form, amount_monthly: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[12px] text-gray-500 mb-1 block">Datum obnovení</label>
                <input
                  type="date"
                  value={form.renewal_date}
                  onChange={e => setForm({ ...form, renewal_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] text-gray-500 mb-1 block">Odkaz na dokument (Google Drive, Disk...)</label>
              <input
                type="url"
                placeholder="https://..."
                value={form.file_url}
                onChange={e => setForm({ ...form, file_url: e.target.value })}
                className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]"
              />
            </div>

            <label className="flex items-center gap-3">
              <div
                className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                style={{ background: form.auto_renew ? 'var(--color-primary)' : '#d1d5db' }}
                onClick={() => setForm({ ...form, auto_renew: !form.auto_renew })}
              >
                <div className="absolute top-0.5 w-4 h-4 bg-[var(--surface)] rounded-full shadow transition-all" style={{ left: form.auto_renew ? '22px' : '2px' }} />
              </div>
              <span className="text-[13px] text-gray-700">Automatické obnovení</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-gray-700 border border-[var(--border-strong)]">Zrušit</button>
              <button
                onClick={addContract}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                Přidat
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[28px] flex items-center justify-center text-white shadow-lg"
        style={{ background: 'var(--color-primary)' }}
      >
        +
      </button>

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
      <Header title="Byt" />
      <TabNav tab={tab} onTab={setTab} />
      {tab === 'rooms'     && <RoomsTab userId={userId} />}
      {tab === 'contracts' && <ContractsTab userId={userId} />}
    </div>
  )
}
