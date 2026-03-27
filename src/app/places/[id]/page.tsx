'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  Trip, TripItem, fetchTrips, updateTrip, fetchTripItems, insertTripItem, updateTripItem, deleteTripItem,
} from '@/features/places/api'

export default function TripDetailPage() {
  const { user } = useUser()
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [items, setItems] = useState<TripItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [itemType, setItemType] = useState<'pack' | 'activity' | 'expense'>('pack')
  const [itemInput, setItemInput] = useState('')
  const [itemPrice, setItemPrice] = useState('')

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      try {
        const trips = await fetchTrips(user.id ?? '')
        const t = trips.find(tr => tr.id === tripId)
        if (t) setTrip(t)
        const tripItems = await fetchTripItems(tripId)
        setItems(tripItems)
      } catch (e) {
        setToast('Chyba')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, tripId])

  const toggleItemDone = async (id: string, done: boolean) => {
    try {
      await updateTripItem(id, { done: !done })
      setItems(its => its.map(it => it.id === id ? { ...it, done: !done } : it))
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteItemHandler = async (id: string) => {
    try {
      await deleteTripItem(id)
      setItems(its => its.filter(it => it.id !== id))
    } catch (e) {
      setToast('Chyba')
    }
  }

  const addItem = async () => {
    if (!itemInput.trim() || !trip) return
    try {
      const newItem = await insertTripItem({
        trip_id: trip.id,
        type: itemType,
        title: itemInput,
        done: false,
        price: itemPrice ? parseFloat(itemPrice) : null,
        notes: null,
      })
      setItems(its => [newItem, ...its])
      setItemInput('')
      setItemPrice('')
      setShowAddModal(false)
      setToast('Přidáno')
    } catch (e) {
      setToast('Chyba')
    }
  }

  const markTripDone = async () => {
    if (!trip) return
    try {
      const expenseTotal = items.filter(it => it.type === 'expense').reduce((sum, it) => sum + (it.price ?? 0), 0)
      await updateTrip(trip.id, { status: 'done', budget_actual: expenseTotal || null })
      setTrip(t => t ? { ...t, status: 'done', budget_actual: expenseTotal || null } : null)
      setToast('Výlet označen jako hotový')
    } catch (e) {
      setToast('Chyba')
    }
  }

  if (loading || !trip) return <div>Načítání...</div>

  const packItems = items.filter(it => it.type === 'pack')
  const activityItems = items.filter(it => it.type === 'activity')
  const expenseItems = items.filter(it => it.type === 'expense')
  const expenseTotal = expenseItems.reduce((sum, it) => sum + (it.price ?? 0), 0)

  return (
    <>
      <Header title={`${trip.cover_emoji} ${trip.name}`} />
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
        {/* Trip header */}
        <div className="rounded-[14px] border border-[var(--border)] p-4 bg-[var(--surface)] mb-4">
          <div className="text-[14px] font-semibold mb-2">{trip.destination}</div>
          <div className="text-[12px] text-[var(--text-secondary)] mb-3">
            📅 {new Date(trip.start_date).toLocaleDateString('cs-CZ')} - {new Date(trip.end_date).toLocaleDateString('cs-CZ')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold px-2 py-1 rounded-full" style={{ background: trip.status === 'done' ? '#dcfce7' : '#fef3c7', color: trip.status === 'done' ? '#166534' : '#92400e' }}>
              {trip.status === 'done' ? 'Hotovo' : 'Plánuji'}
            </span>
            {trip.status === 'planning' && (
              <button
                onClick={markTripDone}
                className="text-[12px] font-semibold text-white px-3 py-1.5 rounded-[8px]"
                style={{ background: 'var(--color-primary)' }}
              >
                Označit hotové
              </button>
            )}
          </div>
        </div>

        {/* Budget overview */}
        {(trip.budget_estimated || trip.status === 'done') && (
          <div className="rounded-[14px] border border-[var(--border)] p-4 bg-[var(--surface)] mb-4">
            <div className="text-[12px] font-bold text-[var(--text-secondary)] mb-2">ROZPOČET</div>
            {trip.budget_estimated && (
              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-[12px]">Odhadovaný: {trip.budget_estimated} Kč</span>
                  {trip.status === 'done' && <span className="text-[12px]">Skutečný: {trip.budget_actual ?? 0} Kč</span>}
                </div>
                {trip.status === 'done' && (
                  <div className="w-full bg-[var(--border)] rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(((trip.budget_actual ?? 0) / trip.budget_estimated) * 100, 100)}%`, background: 'var(--color-primary)' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pack section */}
        <div className="mb-4">
          <div className="text-[13px] font-bold text-[var(--text-secondary)] mb-2">🎒 Co sbalit</div>
          <div className="space-y-2">
            {packItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-[var(--bg)] rounded-[10px]">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItemDone(item.id, item.done)}
                  className="w-4 h-4"
                />
                <span className="flex-1 text-[13px]" style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                  {item.title}
                </span>
                <button onClick={() => deleteItemHandler(item.id)} className="text-[12px] text-[var(--text-tertiary)]">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Activity section */}
        <div className="mb-4">
          <div className="text-[13px] font-bold text-[var(--text-secondary)] mb-2">🗺️ Aktivity</div>
          <div className="space-y-2">
            {activityItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-[var(--bg)] rounded-[10px]">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItemDone(item.id, item.done)}
                  className="w-4 h-4"
                />
                <span className="flex-1 text-[13px]" style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                  {item.title}
                </span>
                <button onClick={() => deleteItemHandler(item.id)} className="text-[12px] text-[var(--text-tertiary)]">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Expense section */}
        <div className="mb-4">
          <div className="text-[13px] font-bold text-[var(--text-secondary)] mb-2">💰 Výdaje ({expenseTotal} Kč)</div>
          <div className="space-y-2">
            {expenseItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-[var(--bg)] rounded-[10px]">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItemDone(item.id, item.done)}
                  className="w-4 h-4"
                />
                <span className="flex-1 text-[13px]" style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                  {item.title}
                </span>
                {item.price && <span className="text-[12px] text-[var(--text-secondary)]">{item.price} Kč</span>}
                <button onClick={() => deleteItemHandler(item.id)} className="text-[12px] text-[var(--text-tertiary)]">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Add item modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/30 flex items-end z-50">
            <div className="w-full bg-[var(--surface)] rounded-t-[20px] p-5 space-y-4">
              <div className="text-[16px] font-bold">Přidat položku</div>
              <div className="flex gap-2">
                {['pack', 'activity', 'expense'].map(type => (
                  <button
                    key={type}
                    onClick={() => setItemType(type as any)}
                    className="flex-1 px-3 py-2 rounded-[8px] text-[12px] font-semibold transition-colors"
                    style={{
                      background: itemType === type ? 'var(--color-primary)' : 'var(--surface-raised)',
                      color: itemType === type ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {type === 'pack' ? '🎒' : type === 'activity' ? '🗺️' : '💰'}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Název"
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]"
              />
              {itemType === 'expense' && (
                <input
                  type="number"
                  placeholder="Cena"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]"
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-[var(--text-secondary)] border border-[var(--border-strong)]"
                >
                  Zrušit
                </button>
                <button
                  onClick={addItem}
                  className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Přidat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold"
          style={{ background: 'var(--color-primary)' }}
        >
          +
        </button>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="fixed top-4 left-4 text-[14px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← Zpět
        </button>
      </div>
    </>
  )
}
