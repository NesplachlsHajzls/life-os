'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  Place, Trip, PlaceStatus, fetchPlaces, insertPlace, deletePlace, fetchTrips, insertTrip, deleteTrip, PLACE_TYPES,
} from '@/features/places/api'

function TabNav({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  const tabs = [
    { id: 'places', label: 'Místa' },
    { id: 'trips', label: 'Výlety' },
  ]
  return (
    <div className="flex gap-3 px-5 pt-4 border-b border-[var(--border)]">
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

function PlacesTab({ userId }: { userId: string }) {
  const [places, setPlaces] = useState<Place[]>([])
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    name: '',
    type: 'restaurant' as const,
    city: '',
    country: '',
    status: 'want' as const,
    rating: '',
    notes: '',
    url: '',
  })

  useEffect(() => {
    fetchPlaces(userId).then(setPlaces).catch(() => setToast('Chyba'))
  }, [userId])

  const filtered = places.filter(p => {
    if (filterType && p.type !== filterType) return false
    if (filterStatus === 'want' && p.status !== 'want') return false
    if (filterStatus === 'visited' && p.status !== 'visited') return false
    return true
  })

  const addPlace = async () => {
    if (!form.name.trim()) return
    try {
      const place = await insertPlace({
        user_id: userId,
        name: form.name,
        type: form.type,
        city: form.city || null,
        country: form.country || null,
        status: form.status,
        rating: form.rating ? parseInt(form.rating) : null,
        notes: form.notes || null,
        url: form.url || null,
        visited_at: (form.status as PlaceStatus) === 'visited' ? new Date().toISOString().split('T')[0] : null,
        tags: [],
      })
      setPlaces(p => [...p, place])
      setShowAdd(false)
      setForm({ name: '', type: 'restaurant', city: '', country: '', status: 'want', rating: '', notes: '', url: '' })
      setToast('Místo přidáno')
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteHandler = async (id: string) => {
    try {
      await deletePlace(id)
      setPlaces(p => p.filter(pl => pl.id !== id))
      setToast('Smazáno')
    } catch (e) {
      setToast('Chyba')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
      <div className="mb-4 flex gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-[var(--border)] rounded-[8px] text-[12px]"
        >
          <option value="all">Všechna</option>
          <option value="want">Chci jít</option>
          <option value="visited">Byl jsem</option>
        </select>
        <select
          value={filterType || ''}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="px-3 py-1.5 border border-[var(--border)] rounded-[8px] text-[12px]"
        >
          <option value="">Všechny typy</option>
          {PLACE_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map(place => (
          <div key={place.id} className="rounded-[14px] border border-[var(--border)] p-4 bg-[var(--surface)]">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">{place.name}</div>
                {(place.city || place.country) && (
                  <div className="text-[12px] text-[var(--text-secondary)]">
                    {place.city}{place.city && place.country ? ', ' : ''}{place.country}
                  </div>
                )}
              </div>
              <button onClick={() => deleteHandler(place.id)} className="text-[12px] text-[var(--text-tertiary)]">✕</button>
            </div>
            <div className="flex gap-2 mb-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                {PLACE_TYPES.find(t => t.id === place.type)?.icon} {PLACE_TYPES.find(t => t.id === place.type)?.label}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: place.status === 'visited' ? '#dcfce7' : '#fef3c7', color: place.status === 'visited' ? '#166534' : '#92400e' }}>
                {place.status === 'visited' ? '✓ Byl jsem' : 'Chci jít'}
              </span>
            </div>
            {place.rating && <div className="text-[12px] text-[var(--text-secondary)]">⭐ {place.rating}/5</div>}
            {place.notes && <div className="text-[12px] text-[var(--text-secondary)] mt-1">{place.notes}</div>}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-[var(--surface)] rounded-t-[20px] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="text-[16px] font-bold">Nové místo</div>
            <input type="text" placeholder="Název" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]">
              {PLACE_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <input type="text" placeholder="Město" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <input type="text" placeholder="Země" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]">
              <option value="want">Chci jít</option>
              <option value="visited">Byl jsem</option>
            </select>
            {(form.status as PlaceStatus) === 'visited' && (
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]">
                <option value="">Bez hodnocení</option>
                <option value="1">1 hvězda</option>
                <option value="2">2 hvězdy</option>
                <option value="3">3 hvězdy</option>
                <option value="4">4 hvězdy</option>
                <option value="5">5 hvězd</option>
              </select>
            )}
            <textarea placeholder="Poznámky" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <input type="url" placeholder="URL (web)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-[var(--text-secondary)] border border-[var(--border-strong)]">Zrušit</button>
              <button onClick={addPlace} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowAdd(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

function TripsTab({ userId }: { userId: string }) {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    budget_estimated: '',
    cover_emoji: '✈️',
  })

  useEffect(() => {
    fetchTrips(userId).then(setTrips).catch(() => setToast('Chyba'))
  }, [userId])

  const addTrip = async () => {
    if (!form.name.trim() || !form.destination.trim() || !form.start_date || !form.end_date) return
    try {
      const trip = await insertTrip({
        user_id: userId,
        name: form.name,
        destination: form.destination,
        start_date: form.start_date,
        end_date: form.end_date,
        status: 'planning',
        budget_estimated: form.budget_estimated ? parseFloat(form.budget_estimated) : null,
        budget_actual: null,
        notes: null,
        cover_emoji: form.cover_emoji,
      })
      setTrips(t => [...t, trip])
      setShowAdd(false)
      setForm({ name: '', destination: '', start_date: '', end_date: '', budget_estimated: '', cover_emoji: '✈️' })
      setToast('Výlet přidán')
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteHandler = async (id: string) => {
    try {
      await deleteTrip(id)
      setTrips(t => t.filter(tr => tr.id !== id))
      setToast('Smazáno')
    } catch (e) {
      setToast('Chyba')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
      <div className="space-y-3">
        {trips.map(trip => (
          <button
            key={trip.id}
            onClick={() => router.push(`/places/${trip.id}`)}
            className="w-full text-left rounded-[14px] border border-[var(--border)] p-4 bg-[var(--surface)] hover:bg-[var(--bg)] transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{trip.cover_emoji}</span>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">{trip.name}</div>
                    <div className="text-[12px] text-[var(--text-secondary)]">{trip.destination}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteHandler(trip.id)
                }}
                className="text-[12px] text-[var(--text-tertiary)]"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 text-[12px] text-[var(--text-secondary)]">
              <span>📅 {new Date(trip.start_date).toLocaleDateString('cs-CZ')} - {new Date(trip.end_date).toLocaleDateString('cs-CZ')}</span>
              {trip.budget_estimated && <span>💰 {trip.budget_estimated} Kč</span>}
              <span className="px-1.5 py-0.5 rounded-full" style={{ background: trip.status === 'done' ? '#dcfce7' : '#fef3c7', color: trip.status === 'done' ? '#166534' : '#92400e' }}>
                {trip.status === 'done' ? 'Hotovo' : 'Plánuji'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-[var(--surface)] rounded-t-[20px] p-5 space-y-4">
            <div className="text-[16px] font-bold">Nový výlet</div>
            <input type="text" placeholder="Název výletu" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <input type="text" placeholder="Destinace" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <input type="number" placeholder="Rozpočet (Kč)" value={form.budget_estimated} onChange={(e) => setForm({ ...form, budget_estimated: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <div className="flex gap-2 flex-wrap">
              {['✈️', '🚗', '🏖️', '⛷️', '🏕️', '🎒', '🗻', '🌍'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setForm({ ...form, cover_emoji: emoji })}
                  className="text-[24px] p-2 rounded-[10px]"
                  style={{ background: form.cover_emoji === emoji ? 'var(--color-primary-light)' : 'var(--surface-raised)' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-[var(--text-secondary)] border border-[var(--border-strong)]">Zrušit</button>
              <button onClick={addTrip} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowAdd(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

export default function PlacesPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [tab, setTab] = useState('places')

  if (!userId) return null

  return (
    <>
      <Header title="Místa a výlety" />
      <TabNav tab={tab} onTab={setTab} />
      {tab === 'places' && <PlacesTab userId={userId} />}
      {tab === 'trips' && <TripsTab userId={userId} />}
    </>
  )
}
