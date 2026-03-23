'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  Room, RoomTodo, HomeContract, HomeAppliance,
  fetchRooms, insertRoom, deleteRoom,
  fetchRoomTodos, insertRoomTodo, updateRoomTodo, deleteRoomTodo,
  fetchContracts, insertContract, deleteContract,
  fetchAppliances, insertAppliance, deleteAppliance,
  ROOM_ICONS, CONTRACT_TYPES,
} from '@/features/byt/api'

function TabNav({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  const tabs = [
    { id: 'rooms', label: 'Místnosti' },
    { id: 'contracts', label: 'Smlouvy' },
    { id: 'appliances', label: 'Spotřebiče' },
  ]
  return (
    <div className="flex gap-3 px-5 pt-4 border-b border-gray-200">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          className="pb-3 text-[14px] font-semibold transition-colors"
          style={{
            color: tab === t.id ? 'var(--color-primary)' : '#9ca3af',
            borderBottom: tab === t.id ? '2px solid var(--color-primary)' : 'none',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return (
    <div
      className="fixed bottom-5 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50"
      style={{ background: 'var(--color-primary)' }}
    >
      {msg}
    </div>
  )
}

function RoomsTab({ userId }: { userId: string }) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [todos, setTodos] = useState<Record<string, RoomTodo[]>>({})
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const [newRoomIcon, setNewRoomIcon] = useState(ROOM_ICONS[0])
  const [newRoomName, setNewRoomName] = useState('')
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [toast, setToast] = useState('')

  const loadRooms = async () => {
    try {
      const data = await fetchRooms(userId)
      setRooms(data)
      for (const room of data) {
        const roomTodos = await fetchRoomTodos(room.id)
        setTodos(t => ({ ...t, [room.id]: roomTodos }))
      }
    } catch (e) {
      setToast('Chyba při načítání')
    }
  }

  useEffect(() => {
    loadRooms()
  }, [userId])

  const addRoom = async () => {
    if (!newRoomName.trim()) return
    try {
      const room = await insertRoom({
        user_id: userId,
        name: newRoomName,
        icon: newRoomIcon,
        order_index: rooms.length,
      })
      setRooms(r => [...r, room])
      setTodos(t => ({ ...t, [room.id]: [] }))
      setNewRoomName('')
      setShowAddRoom(false)
      setToast('Místnost přidána')
    } catch (e) {
      setToast('Chyba')
    }
  }

  const toggleRoomTodoDone = async (todoId: string, done: boolean) => {
    try {
      await updateRoomTodo(todoId, { done: !done })
      setTodos(t => ({
        ...t,
        [expandedRoom!]: t[expandedRoom!].map(td => td.id === todoId ? { ...td, done: !done } : td),
      }))
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteRoomTodoHandler = async (todoId: string) => {
    try {
      await deleteRoomTodo(todoId)
      setTodos(t => ({
        ...t,
        [expandedRoom!]: t[expandedRoom!].filter(td => td.id !== todoId),
      }))
    } catch (e) {
      setToast('Chyba')
    }
  }

  const addRoomTodo = async (roomId: string, title: string, type: 'todo' | 'buy', price: number | null) => {
    if (!title.trim()) return
    try {
      const todo = await insertRoomTodo({
        room_id: roomId,
        user_id: userId,
        title,
        done: false,
        type,
        price: price && type === 'buy' ? price : null,
        notes: null,
      })
      setTodos(t => ({ ...t, [roomId]: [todo, ...t[roomId]] }))
      setToast('Přidáno')
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteRoomHandler = async (roomId: string) => {
    try {
      await deleteRoom(roomId)
      setRooms(r => r.filter(rm => rm.id !== roomId))
      setTodos(t => {
        const newT = { ...t }
        delete newT[roomId]
        return newT
      })
      setExpandedRoom(null)
      setToast('Místnost smazána')
    } catch (e) {
      setToast('Chyba')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
      <div className="space-y-3">
        {rooms.map(room => {
          const roomTodos = todos[room.id] ?? []
          const todoCount = roomTodos.filter(t => t.type === 'todo' && !t.done).length
          const buyCount = roomTodos.filter(t => t.type === 'buy' && !t.done).length
          const totalCost = roomTodos.filter(t => t.type === 'buy').reduce((sum, t) => sum + (t.price ?? 0), 0)
          const isExpanded = expandedRoom === room.id

          return (
            <div key={room.id} className="rounded-[14px] border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-[18px]">{room.icon}</span>
                  <div>
                    <div className="text-[14px] font-semibold text-gray-800">{room.name}</div>
                    <div className="text-[12px] text-gray-500">
                      {todoCount > 0 && <span>{todoCount} úkolů </span>}
                      {buyCount > 0 && <span>{buyCount} k nákupu </span>}
                      {totalCost > 0 && <span>• {totalCost.toFixed(0)} Kč</span>}
                    </div>
                  </div>
                </div>
                <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-3">
                  <div>
                    <div className="text-[12px] font-bold text-gray-500 mb-2">CO UDĚLAT</div>
                    {roomTodos.filter(t => t.type === 'todo').map(todo => (
                      <div key={todo.id} className="flex items-center gap-2 py-1.5">
                        <input type="checkbox" checked={todo.done} onChange={() => toggleRoomTodoDone(todo.id, todo.done)} className="w-5 h-5" />
                        <span className="flex-1 text-[13px]" style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#9ca3af' : '#374151' }}>{todo.title}</span>
                        <button onClick={() => deleteRoomTodoHandler(todo.id)} className="text-[12px] text-gray-400">✕</button>
                      </div>
                    ))}
                    <AddTodoForm onAdd={(title) => addRoomTodo(room.id, title, 'todo', null)} />
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-[12px] font-bold text-gray-500 mb-2">CO KOUPIT</div>
                    {roomTodos.filter(t => t.type === 'buy').map(todo => (
                      <div key={todo.id} className="flex items-center gap-2 py-1.5">
                        <input type="checkbox" checked={todo.done} onChange={() => toggleRoomTodoDone(todo.id, todo.done)} className="w-5 h-5" />
                        <span className="flex-1 text-[13px]" style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#9ca3af' : '#374151' }}>{todo.title}</span>
                        {todo.price && <span className="text-[12px] text-gray-500">{todo.price} Kč</span>}
                        <button onClick={() => deleteRoomTodoHandler(todo.id)} className="text-[12px] text-gray-400">✕</button>
                      </div>
                    ))}
                    <AddBuyForm onAdd={(title, price) => addRoomTodo(room.id, title, 'buy', price)} />
                  </div>
                  <button onClick={() => deleteRoomHandler(room.id)} className="w-full text-[12px] text-red-500 py-2 border-t border-gray-200">Smazat</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {showAddRoom && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-white rounded-t-[20px] p-5 space-y-4">
            <div className="text-[16px] font-bold">Nová místnost</div>
            <input type="text" placeholder="Název" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <div className="flex gap-2 flex-wrap">
              {ROOM_ICONS.map(icon => (
                <button key={icon} onClick={() => setNewRoomIcon(icon)} className="text-[24px] p-2 rounded-[10px]" style={{ background: newRoomIcon === icon ? 'var(--color-primary-light)' : '#f3f4f6' }}>{icon}</button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddRoom(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-gray-700 border border-gray-300">Zrušit</button>
              <button onClick={addRoom} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setShowAddRoom(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

function AddTodoForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [input, setInput] = useState('')
  const handleAdd = () => {
    if (!input.trim()) return
    onAdd(input)
    setInput('')
  }
  return (
    <div className="flex gap-2 mt-2">
      <input type="text" placeholder="Přidat..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-[8px] text-[12px]" />
      <button onClick={handleAdd} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>+</button>
    </div>
  )
}

function AddBuyForm({ onAdd }: { onAdd: (title: string, price: number | null) => void }) {
  const [input, setInput] = useState('')
  const [price, setPrice] = useState('')
  const handleAdd = () => {
    if (!input.trim()) return
    onAdd(input, price ? parseFloat(price) : null)
    setInput('')
    setPrice('')
  }
  return (
    <div className="flex gap-2 mt-2">
      <input type="text" placeholder="Co koupit..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-[8px] text-[12px]" />
      <input type="number" placeholder="Cena" value={price} onChange={(e) => setPrice(e.target.value)} className="w-16 px-2 py-1.5 border border-gray-200 rounded-[8px] text-[12px]" />
      <button onClick={handleAdd} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>+</button>
    </div>
  )
}

function ContractsTab({ userId }: { userId: string }) {
  const [contracts, setContracts] = useState<HomeContract[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', type: 'utility' as const, provider: '', amount_monthly: 0, renewal_date: '', auto_renew: true })

  useEffect(() => {
    fetchContracts(userId).then(setContracts).catch(() => setToast('Chyba'))
  }, [userId])

  const addContract = async () => {
    if (!form.name.trim()) return
    try {
      const contract = await insertContract({ user_id: userId, ...form, notes: null })
      setContracts(c => [...c, contract])
      setShowAdd(false)
      setForm({ name: '', type: 'utility', provider: '', amount_monthly: 0, renewal_date: '', auto_renew: true })
      setToast('Přidáno')
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteContractHandler = async (id: string) => {
    try {
      await deleteContract(id)
      setContracts(c => c.filter(ct => ct.id !== id))
    } catch (e) {
      setToast('Chyba')
    }
  }

  const daysUntilRenewal = (date: string | null) => {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
      <div className="space-y-3">
        {contracts.map(contract => {
          const days = daysUntilRenewal(contract.renewal_date)
          const isUrgent = days !== null && days <= 30 && days > 0
          return (
            <div key={contract.id} className="rounded-[14px] border border-gray-200 p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-semibold">{contract.name}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#1e40af' }}>{CONTRACT_TYPES.find(t => t.id === contract.type)?.label}</span>
                  </div>
                  {contract.provider && <div className="text-[12px] text-gray-500 mb-1">{contract.provider}</div>}
                  <div className="text-[13px] font-semibold">{contract.amount_monthly} Kč/měsíc</div>
                  {contract.renewal_date && <div className="text-[12px] mt-1" style={{ color: isUrgent ? '#dc2626' : '#6b7280' }}>Obnovení: {new Date(contract.renewal_date).toLocaleDateString('cs-CZ')}</div>}
                </div>
                <button onClick={() => deleteContractHandler(contract.id)} className="text-[12px] text-gray-400">✕</button>
              </div>
            </div>
          )
        })}
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-white rounded-t-[20px] p-5 space-y-4">
            <div className="text-[16px] font-bold">Nová smlouva</div>
            <input type="text" placeholder="Název" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]">
              {CONTRACT_TYPES.map(t => (<option key={t.id} value={t.id}>{t.label}</option>))}
            </select>
            <input type="text" placeholder="Poskytovatel" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="number" placeholder="Měsíční náklad" value={form.amount_monthly} onChange={(e) => setForm({ ...form, amount_monthly: parseFloat(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} className="w-4 h-4" /><span className="text-[13px]">Automatické obnovení</span></label>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-gray-700 border border-gray-300">Zrušit</button>
              <button onClick={addContract} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setShowAdd(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

function AppliancesTab({ userId }: { userId: string }) {
  const [appliances, setAppliances] = useState<HomeAppliance[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', brand: '', purchase_date: '', warranty_until: '' })

  useEffect(() => {
    fetchAppliances(userId).then(setAppliances).catch(() => setToast('Chyba'))
  }, [userId])

  const addAppliance = async () => {
    if (!form.name.trim()) return
    try {
      const appliance = await insertAppliance({
        user_id: userId,
        name: form.name,
        brand: form.brand || null,
        purchase_date: form.purchase_date || null,
        warranty_until: form.warranty_until || null,
        room_id: null,
        notes: null,
      })
      setAppliances(a => [...a, appliance])
      setShowAdd(false)
      setForm({ name: '', brand: '', purchase_date: '', warranty_until: '' })
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteApplianceHandler = async (id: string) => {
    try {
      await deleteAppliance(id)
      setAppliances(a => a.filter(ap => ap.id !== id))
    } catch (e) {
      setToast('Chyba')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
      <div className="space-y-3">
        {appliances.map(app => (
          <div key={app.id} className="rounded-[14px] border border-gray-200 p-4 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-[14px] font-semibold">{app.name}</div>
                {app.brand && <div className="text-[12px] text-gray-500">{app.brand}</div>}
                {app.warranty_until && <div className="text-[12px] mt-1 text-gray-500">Záruka do: {new Date(app.warranty_until).toLocaleDateString('cs-CZ')}</div>}
              </div>
              <button onClick={() => deleteApplianceHandler(app.id)} className="text-[12px] text-gray-400">✕</button>
            </div>
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-white rounded-t-[20px] p-5 space-y-4">
            <div className="text-[16px] font-bold">Nový spotřebič</div>
            <input type="text" placeholder="Název" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="text" placeholder="Značka" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="date" placeholder="Záruka do" value={form.warranty_until} onChange={(e) => setForm({ ...form, warranty_until: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-gray-700 border border-gray-300">Zrušit</button>
              <button onClick={addAppliance} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setShowAdd(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

export default function BytPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [tab, setTab] = useState('rooms')
  if (!userId) return null
  return (
    <>
      <Header title="🏠 Byt" />
      <TabNav tab={tab} onTab={setTab} />
      {tab === 'rooms' && <RoomsTab userId={userId} />}
      {tab === 'contracts' && <ContractsTab userId={userId} />}
      {tab === 'appliances' && <AppliancesTab userId={userId} />}
    </>
  )
}
