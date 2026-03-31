'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  Place, Trip, PlaceType, PlaceStatus, PLACE_TYPES,
  fetchPlaces, insertPlace, updatePlace, deletePlace,
  fetchTrips, insertTrip, deleteTrip,
} from '@/features/places/api'
import {
  BucketItem, BucketCategory, BUCKET_CATEGORIES, BUCKET_SUGGESTIONS,
  fetchBucketItems, insertBucketItem, updateBucketItem, deleteBucketItem,
} from '@/features/bucket/api'

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50 shadow-lg"
      style={{ background: 'var(--color-primary)' }}>
      {msg}
    </div>
  )
}

function TabNav({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  const tabs = [
    { id: 'mista',  label: 'Místa' },
    { id: 'vylety', label: 'Výlety' },
    { id: 'bucket', label: 'Bucket list' },
  ]
  return (
    <div className="flex gap-3 px-5 pt-4 border-b border-[var(--border)] bg-[var(--surface)]">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTab(t.id)}
          className="pb-3 text-[14px] font-semibold transition-colors"
          style={{
            color: tab === t.id ? 'var(--color-primary)' : 'var(--text-tertiary)',
            borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
          }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Místa Tab ─────────────────────────────────────────────────────────

function MistaTab({ userId }: { userId: string }) {
  const [places, setPlaces] = useState<Place[]>([])
  const [statusFilter, setStatusFilter] = useState<PlaceStatus>('want')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState<Place | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    name: '', type: 'restaurant' as PlaceType,
    city: '', country: '', status: 'want' as PlaceStatus,
    rating: '', notes: '', url: '',
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetchPlaces(userId).then(setPlaces).catch(() => showToast('Chyba')).finally(() => setLoading(false))
  }, [userId])

  const add = async () => {
    if (!form.name.trim()) return
    try {
      const p = await insertPlace({
        user_id: userId, name: form.name, type: form.type,
        city: form.city || null, country: form.country || null,
        status: form.status, rating: form.rating ? parseFloat(form.rating) : null,
        notes: form.notes || null, url: form.url || null,
        visited_at: null, tags: [],
      })
      setPlaces(prev => [p, ...prev])
      setShowAdd(false)
      setForm({ name: '', type: 'restaurant', city: '', country: '', status: 'want', rating: '', notes: '', url: '' })
      showToast('Místo přidáno')
    } catch { showToast('Chyba') }
  }

  const markVisited = async (place: Place) => {
    try {
      await updatePlace(place.id, { status: 'visited', visited_at: new Date().toISOString() })
      setPlaces(prev => prev.map(p => p.id === place.id ? { ...p, status: 'visited', visited_at: new Date().toISOString() } : p))
      showToast('Označeno jako navštíveno')
    } catch { showToast('Chyba') }
  }

  const remove = async (id: string) => {
    try {
      await deletePlace(id)
      setPlaces(prev => prev.filter(p => p.id !== id))
      setShowDetail(null)
      showToast('Smazáno')
    } catch { showToast('Chyba') }
  }

  const filtered = places.filter(p => {
    if (p.status !== statusFilter) return false
    if (typeFilter && p.type !== typeFilter) return false
    return true
  })

  const wantCount = places.filter(p => p.status === 'want').length
  const visitedCount = places.filter(p => p.status === 'visited').length

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-[14px] text-[var(--text-tertiary)]">Načítám...</div></div>

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Status toggle */}
      <div className="flex px-4 pt-4 gap-2 mb-3">
        {[{ id: 'want', label: `📍 Chci navštívit (${wantCount})` }, { id: 'visited', label: `✅ Byl jsem (${visitedCount})` }].map(s => (
          <button key={s.id} onClick={() => setStatusFilter(s.id as PlaceStatus)}
            className="flex-1 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all"
            style={{
              background: statusFilter === s.id ? 'var(--color-primary)' : 'var(--surface)',
              color: statusFilter === s.id ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${statusFilter === s.id ? 'var(--color-primary)' : 'var(--border)'}`,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        <button onClick={() => setTypeFilter(null)}
          className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap flex-shrink-0"
          style={{ background: !typeFilter ? 'var(--color-primary)' : 'var(--surface-raised)', color: !typeFilter ? 'white' : 'var(--text-secondary)' }}>
          Vše
        </button>
        {PLACE_TYPES.map(t => (
          <button key={t.id} onClick={() => setTypeFilter(typeFilter === t.id ? null : t.id)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap flex-shrink-0"
            style={{
              background: typeFilter === t.id ? 'var(--color-primary)' : 'var(--surface-raised)',
              color: typeFilter === t.id ? 'white' : 'var(--text-secondary)',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--text-tertiary)]">
            <div className="text-[40px] mb-3">📍</div>
            <div className="text-[15px] font-semibold">{statusFilter === 'want' ? 'Žádná místa k navštívení' : 'Zatím žádná navštívená místa'}</div>
            <div className="text-[13px] mt-1">Klepni na + a přidej první místo</div>
          </div>
        )}
        {filtered.map(place => {
          const typeInfo = PLACE_TYPES.find(t => t.id === place.type)
          return (
            <button key={place.id} onClick={() => setShowDetail(place)}
              className="w-full text-left rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-3 active:scale-[0.99] transition-transform">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] flex-shrink-0"
                style={{ background: 'var(--surface-raised)' }}>
                {typeInfo?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{place.name}</div>
                <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                  {[place.city, place.country].filter(Boolean).join(', ') || typeInfo?.label}
                  {place.rating != null && ` · ⭐ ${place.rating}`}
                </div>
              </div>
              <span className="text-[var(--text-tertiary)] text-[12px]">›</span>
            </button>
          )
        })}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[28px] flex items-center justify-center text-white shadow-lg z-30"
        style={{ background: 'var(--color-primary)' }}>
        +
      </button>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-bold">Přidat místo</div>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-tertiary)] text-[20px]">✕</button>
            </div>
            <input type="text" placeholder="Název místa" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[12px] text-[14px] bg-[var(--bg)]"
              style={{ color: 'var(--text-primary)' }} />
            <div className="grid grid-cols-3 gap-2">
              {PLACE_TYPES.map(t => (
                <button key={t.id} onClick={() => setForm({ ...form, type: t.id })}
                  className="py-2.5 rounded-[10px] text-[12px] font-semibold flex flex-col items-center gap-1 transition-all"
                  style={{ background: form.type === t.id ? 'var(--color-primary)' : 'var(--surface-raised)', color: form.type === t.id ? 'white' : 'var(--text-secondary)' }}>
                  <span className="text-[18px]">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Město" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="flex-1 px-3 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
              <input type="text" placeholder="Stát" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                className="flex-1 px-3 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            </div>
            <input type="url" placeholder="Odkaz na Google Maps (volitelné)" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
              className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            <textarea placeholder="Poznámky..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] resize-none bg-[var(--bg)]"
              style={{ color: 'var(--text-primary)' }} rows={3} />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-semibold border border-[var(--border-strong)] text-[var(--text-secondary)]">Zrušit</button>
              <button onClick={add}
                className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-semibold text-white"
                style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowDetail(null)}>
          <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[24px]">{PLACE_TYPES.find(t => t.id === showDetail.type)?.icon}</span>
                <div>
                  <div className="text-[16px] font-bold text-[var(--text-primary)]">{showDetail.name}</div>
                  <div className="text-[12px] text-[var(--text-tertiary)]">
                    {[showDetail.city, showDetail.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-[var(--text-tertiary)] text-[20px]">✕</button>
            </div>
            {showDetail.notes && (
              <div className="px-3 py-2.5 rounded-[10px] text-[13px]" style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}>
                {showDetail.notes}
              </div>
            )}
            {showDetail.url && (
              <a href={showDetail.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-[12px] text-[14px] font-semibold"
                style={{ background: 'var(--color-primary)', color: 'white' }}>
                <span>🗺️</span> Otevřít v Google Maps
              </a>
            )}
            {showDetail.status === 'want' && (
              <button onClick={() => markVisited(showDetail)}
                className="w-full px-4 py-3 rounded-[12px] text-[14px] font-semibold border border-[var(--border)] text-[var(--text-secondary)]">
                ✅ Označit jako navštíveno
              </button>
            )}
            {showDetail.visited_at && (
              <div className="text-[12px] text-[var(--text-tertiary)]">
                Navštíveno: {new Date(showDetail.visited_at).toLocaleDateString('cs-CZ')}
              </div>
            )}
            <button onClick={() => remove(showDetail.id)}
              className="w-full px-4 py-3 rounded-[12px] text-[14px] font-semibold text-red-400 border border-[var(--border)]">
              Smazat místo
            </button>
          </div>
        </div>
      )}

      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

// ── Výlety Tab ────────────────────────────────────────────────────────

function VyletyTab({ userId }: { userId: string }) {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    name: '', destination: '', start_date: '', end_date: '',
    budget_estimated: '', cover_emoji: '✈️',
  })

  const EMOJIS = ['✈️', '🏖️', '🏔️', '🗺️', '🚂', '🚗', '🛳️', '🏕️', '🌍', '🎒']
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetchTrips(userId).then(setTrips).catch(() => showToast('Chyba')).finally(() => setLoading(false))
  }, [userId])

  const add = async () => {
    if (!form.name.trim() || !form.destination.trim()) return
    try {
      const trip = await insertTrip({
        user_id: userId, name: form.name, destination: form.destination,
        start_date: form.start_date, end_date: form.end_date,
        status: 'planning',
        budget_estimated: form.budget_estimated ? parseFloat(form.budget_estimated) : null,
        budget_actual: null, notes: null, cover_emoji: form.cover_emoji,
      })
      setTrips(prev => [trip, ...prev])
      setShowAdd(false)
      setForm({ name: '', destination: '', start_date: '', end_date: '', budget_estimated: '', cover_emoji: '✈️' })
      showToast('Výlet přidán')
    } catch { showToast('Chyba') }
  }

  const remove = async (id: string) => {
    try {
      await deleteTrip(id)
      setTrips(prev => prev.filter(t => t.id !== id))
    } catch { showToast('Chyba') }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-[14px] text-[var(--text-tertiary)]">Načítám...</div></div>

  const planning = trips.filter(t => t.status === 'planning')
  const done = trips.filter(t => t.status === 'done')

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
      {trips.length === 0 && (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <div className="text-[40px] mb-3">✈️</div>
          <div className="text-[15px] font-semibold">Žádné výlety</div>
          <div className="text-[13px] mt-1">Klepni na + a naplánuj výlet</div>
        </div>
      )}

      {planning.length > 0 && (
        <>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide px-1">Plánované</div>
          {planning.map(trip => (
            <button key={trip.id} onClick={() => router.push(`/places/${trip.id}`)}
              className="w-full text-left rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden active:scale-[0.99] transition-transform">
              <div className="flex items-center gap-3 p-4">
                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px] flex-shrink-0"
                  style={{ background: 'var(--color-primary)' + '22' }}>
                  {trip.cover_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-[var(--text-primary)]">{trip.name}</div>
                  <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{trip.destination}</div>
                  {trip.start_date && (
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      {new Date(trip.start_date).toLocaleDateString('cs-CZ')}
                      {trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString('cs-CZ')}` : ''}
                    </div>
                  )}
                </div>
                {trip.budget_estimated != null && (
                  <div className="text-[13px] font-bold" style={{ color: 'var(--color-primary)' }}>
                    {trip.budget_estimated.toLocaleString('cs')} Kč
                  </div>
                )}
              </div>
            </button>
          ))}
        </>
      )}

      {done.length > 0 && (
        <>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide px-1 mt-4">Proběhlé</div>
          {done.map(trip => (
            <button key={trip.id} onClick={() => router.push(`/places/${trip.id}`)}
              className="w-full text-left rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-3 active:scale-[0.99] transition-transform">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] flex-shrink-0"
                style={{ background: 'var(--surface-raised)' }}>
                {trip.cover_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">{trip.name}</div>
                <div className="text-[12px] text-[var(--text-tertiary)]">{trip.destination}</div>
              </div>
              <span className="text-[var(--text-tertiary)] text-[12px]">›</span>
            </button>
          ))}
        </>
      )}

      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[28px] flex items-center justify-center text-white shadow-lg z-30"
        style={{ background: 'var(--color-primary)' }}>
        +
      </button>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-bold">Nový výlet</div>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-tertiary)] text-[20px]">✕</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setForm({ ...form, cover_emoji: e })}
                  className="w-10 h-10 rounded-[10px] text-[20px] flex items-center justify-center"
                  style={{ background: form.cover_emoji === e ? 'var(--color-primary)' : 'var(--surface-raised)' }}>
                  {e}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Název výletu" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[12px] text-[14px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            <input type="text" placeholder="Destinace (město, stát)" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}
              className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Od</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Do</label>
                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
            <input type="number" placeholder="Odhadovaný rozpočet (Kč)" value={form.budget_estimated} onChange={e => setForm({ ...form, budget_estimated: e.target.value })}
              className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-semibold border border-[var(--border-strong)] text-[var(--text-secondary)]">Zrušit</button>
              <button onClick={add} className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

// ── Bucket List Tab ───────────────────────────────────────────────────

function BucketTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<BucketItem[]>([])
  const [filterCat, setFilterCat] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ title: '', category: 'travel' as BucketCategory, size: 'big' as 'big' | 'small' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetchBucketItems(userId).then(setItems).catch(() => showToast('Chyba'))
  }, [userId])

  const add = async () => {
    if (!form.title.trim()) return
    try {
      const item = await insertBucketItem({ user_id: userId, title: form.title, category: form.category, size: form.size, status: 'todo', done_at: null, notes: null })
      setItems(prev => [item, ...prev])
      setShowAdd(false)
      setForm({ title: '', category: 'travel', size: 'big' })
      showToast('Přidáno')
    } catch { showToast('Chyba') }
  }

  const toggle = async (item: BucketItem) => {
    const newStatus = item.status === 'done' ? 'todo' : 'done'
    try {
      await updateBucketItem(item.id, { status: newStatus, done_at: newStatus === 'done' ? new Date().toISOString() : null })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    } catch { showToast('Chyba') }
  }

  const remove = async (id: string) => {
    try {
      await deleteBucketItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { showToast('Chyba') }
  }

  const done = items.filter(i => i.status === 'done').length
  const total = items.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const filtered = items.filter(i => {
    if (filterCat && i.category !== filterCat) return false
    if (!showDone && i.status === 'done') return false
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
      {/* Progress */}
      {total > 0 && (
        <div className="rounded-[14px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between text-[12px] mb-2">
            <span className="text-[var(--text-tertiary)]">{done} / {total} splněno</span>
            <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setFilterCat(null)}
          className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap flex-shrink-0"
          style={{ background: !filterCat ? 'var(--color-primary)' : 'var(--surface-raised)', color: !filterCat ? 'white' : 'var(--text-secondary)' }}>
          Vše
        </button>
        {BUCKET_CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? null : c.id)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap flex-shrink-0"
            style={{ background: filterCat === c.id ? 'var(--color-primary)' : 'var(--surface-raised)', color: filterCat === c.id ? 'white' : 'var(--text-secondary)' }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Toggle done */}
      <button onClick={() => setShowDone(!showDone)}
        className="text-[12px] font-semibold px-1"
        style={{ color: 'var(--text-tertiary)' }}>
        {showDone ? 'Skrýt splněné' : 'Zobrazit splněné'}
      </button>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <div className="text-[40px] mb-3">🎯</div>
          <div className="text-[15px] font-semibold">Bucket list je prázdný</div>
          <div className="text-[13px] mt-1">Co chceš zažít dřív než zemřeš?</div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(item => {
          const cat = BUCKET_CATEGORIES.find(c => c.id === item.category)
          const isDone = item.status === 'done'
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
              <button onClick={() => toggle(item)}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: isDone ? 'var(--color-primary)' : 'var(--bg)', border: `2px solid ${isDone ? 'var(--color-primary)' : 'var(--border-strong)'}` }}>
                {isDone && <span className="text-white text-[12px]">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[14px]" style={{ color: isDone ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>
                  {item.title}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{cat?.icon} {cat?.label} · {item.size === 'big' ? '🌟 Velký' : '✨ Malý'}</div>
              </div>
              <button onClick={() => remove(item.id)} className="text-[var(--text-tertiary)] text-[16px] px-1">✕</button>
            </div>
          )
        })}
      </div>

      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[28px] flex items-center justify-center text-white shadow-lg z-30"
        style={{ background: 'var(--color-primary)' }}>
        +
      </button>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-bold">Nový sen / cíl</div>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-tertiary)] text-[20px]">✕</button>
            </div>
            <input type="text" placeholder="Co chceš zažít?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[12px] text-[14px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            <div className="grid grid-cols-4 gap-2">
              {BUCKET_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setForm({ ...form, category: c.id })}
                  className="py-2.5 rounded-[10px] text-[11px] font-semibold flex flex-col items-center gap-1"
                  style={{ background: form.category === c.id ? 'var(--color-primary)' : 'var(--surface-raised)', color: form.category === c.id ? 'white' : 'var(--text-secondary)' }}>
                  <span className="text-[16px]">{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[{ id: 'big', label: '🌟 Velký sen' }, { id: 'small', label: '✨ Malý cíl' }].map(s => (
                <button key={s.id} onClick={() => setForm({ ...form, size: s.id as any })}
                  className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold"
                  style={{ background: form.size === s.id ? 'var(--color-primary)' : 'var(--surface-raised)', color: form.size === s.id ? 'white' : 'var(--text-secondary)' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-semibold border border-[var(--border-strong)] text-[var(--text-secondary)]">Zrušit</button>
              <button onClick={add} className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ZazitkyPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [tab, setTab] = useState('mista')

  if (!userId) return null

  return (
    <div className="flex flex-col h-full">
      <Header title="Zážitky" />
      <TabNav tab={tab} onTab={setTab} />
      {tab === 'mista'  && <MistaTab userId={userId} />}
      {tab === 'vylety' && <VyletyTab userId={userId} />}
      {tab === 'bucket' && <BucketTab userId={userId} />}
    </div>
  )
}
