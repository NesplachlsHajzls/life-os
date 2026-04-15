'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  DriveSettings, DriveTrip, DriveRefuel,
  fetchDriveSettings, upsertDriveSettings,
  fetchDriveTrips, insertDriveTrip, updateDriveTrip, deleteDriveTrip,
  fetchDriveRefuels, insertDriveRefuel, updateDriveRefuel, deleteDriveRefuel,
} from '@/features/drive/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

// ── Helpers ───────────────────────────────────────────────────────

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mKey(date: string) { return date.slice(0, 7) }

function mLabel(key: string) {
  const [y, m] = key.split('-')
  const months = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']
  return `${months[+m - 1]} ${y}`
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}. ${m}. ${y}`
}

function fmtNum(n: number, decimals = 1) {
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)] placeholder-gray-400 outline-none focus:border-[var(--color-primary)]'
const labelCls = 'block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5'

// ── Trip Sheet ────────────────────────────────────────────────────

interface TripSheetProps {
  initial?: DriveTrip
  onSave: (t: Omit<DriveTrip, 'id' | 'created_at'>) => void
  onClose: () => void
  userId: string
}

function TripSheet({ initial, onSave, onClose, userId }: TripSheetProps) {
  const [date,      setDate]      = useState(initial?.date ?? todayIso())
  const [fromPlace, setFromPlace] = useState(initial?.from_place ?? '')
  const [toPlace,   setToPlace]   = useState(initial?.to_place ?? '')
  const [km,        setKm]        = useState(initial ? String(initial.km) : '')
  const [type,      setType]      = useState<'business' | 'private'>(initial?.type ?? 'private')
  const [note,      setNote]      = useState(initial?.note ?? '')

  const valid = +km > 0

  function handleSave() {
    if (!valid) return
    onSave({ user_id: userId, date, from_place: fromPlace, to_place: toPlace, km: +km, type, note })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] lg:max-w-[520px] bg-[var(--surface)] rounded-t-[24px] lg:rounded-[20px] lg:mb-8 p-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center mb-4 lg:hidden"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[16px] font-bold mb-4">{initial ? '✏️ Upravit jízdu' : '🚗 Nová jízda'}</h2>
        <div className="flex flex-col gap-4">

          <div>
            <label className={labelCls}>Datum</label>
            <input type="date" className={fieldCls} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Odkud</label>
              <input className={fieldCls} value={fromPlace} onChange={e => setFromPlace(e.target.value)} placeholder="Praha" />
            </div>
            <div>
              <label className={labelCls}>Kam</label>
              <input className={fieldCls} value={toPlace} onChange={e => setToPlace(e.target.value)} placeholder="Brno" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Počet km</label>
            <input type="number" min="0" step="0.1" className={fieldCls} value={km}
              onChange={e => setKm(e.target.value)} placeholder="0" autoFocus={!initial} />
          </div>

          <div>
            <label className={labelCls}>Typ jízdy</label>
            <div className="flex gap-2">
              {(['private', 'business'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${
                    type === t
                      ? t === 'business' ? 'bg-blue-500 text-white' : 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                  }`}>
                  {t === 'business' ? '💼 Služební' : '🏠 Soukromá'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Poznámka (volitelné)</label>
            <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Účel cesty…" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">
              Zrušit
            </button>
            <button onClick={handleSave} disabled={!valid}
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}>
              {initial ? 'Uložit' : 'Přidat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Refuel Sheet ──────────────────────────────────────────────────

interface RefuelSheetProps {
  initial?: DriveRefuel
  onSave: (r: Omit<DriveRefuel, 'id' | 'created_at'>) => void
  onClose: () => void
  userId: string
}

function RefuelSheet({ initial, onSave, onClose, userId }: RefuelSheetProps) {
  const [date,    setDate]    = useState(initial?.date ?? todayIso())
  const [liters,  setLiters]  = useState(initial ? String(initial.liters) : '')
  const [ppl,     setPpl]     = useState(initial ? String(initial.price_per_liter) : '')
  const [note,    setNote]    = useState(initial?.note ?? '')

  const total = (+liters || 0) * (+ppl || 0)
  const valid = +liters > 0 && +ppl > 0

  function handleSave() {
    if (!valid) return
    onSave({ user_id: userId, date, liters: +liters, price_per_liter: +ppl, note })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] lg:max-w-[520px] bg-[var(--surface)] rounded-t-[24px] lg:rounded-[20px] lg:mb-8 p-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center mb-4 lg:hidden"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[16px] font-bold mb-4">{initial ? '✏️ Upravit tankování' : '⛽ Nové tankování'}</h2>
        <div className="flex flex-col gap-4">

          <div>
            <label className={labelCls}>Datum</label>
            <input type="date" className={fieldCls} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Litry</label>
              <input type="number" min="0" step="0.01" className={fieldCls} value={liters}
                onChange={e => setLiters(e.target.value)} placeholder="45.00" autoFocus={!initial} />
            </div>
            <div>
              <label className={labelCls}>Kč / litr</label>
              <input type="number" min="0" step="0.01" className={fieldCls} value={ppl}
                onChange={e => setPpl(e.target.value)} placeholder="38.90" />
            </div>
          </div>

          {/* Total preview */}
          {total > 0 && (
            <div className="rounded-[12px] p-3 text-center" style={{ background: 'var(--surface-raised)' }}>
              <span className="text-[12px] text-[var(--text-tertiary)]">Celkem: </span>
              <span className="text-[16px] font-bold text-[var(--text-primary)]">
                {Math.round(total)} Kč
              </span>
            </div>
          )}

          <div>
            <label className={labelCls}>Poznámka (volitelné)</label>
            <input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Benzínka…" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">
              Zrušit
            </button>
            <button onClick={handleSave} disabled={!valid}
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}>
              {initial ? 'Uložit' : 'Přidat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Odometer Setup Sheet ──────────────────────────────────────────

function OdometerSheet({ current, onSave, onClose }: {
  current: number
  onSave: (v: number, name: string) => void
  onClose: () => void
}) {
  const [val,  setVal]  = useState(current > 0 ? String(current) : '')
  const [name, setName] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] lg:max-w-[520px] bg-[var(--surface)] rounded-t-[24px] lg:rounded-[20px] lg:mb-8 p-5 pb-8">
        <div className="flex justify-center mb-4 lg:hidden"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[16px] font-bold mb-1">🚘 Nastavení vozidla</h2>
        <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Zadej aktuální stav odometru — od teď se bude každá jízda přičítat automaticky.</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Název vozidla (volitelné)</label>
            <input className={fieldCls} value={name} onChange={e => setName(e.target.value)} placeholder="Škoda Octavia…" />
          </div>
          <div>
            <label className={labelCls}>Počáteční stav odometru (km)</label>
            <input type="number" min="0" className={fieldCls} value={val}
              onChange={e => setVal(e.target.value)} placeholder="45000" autoFocus />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">
              Zrušit
            </button>
            <button onClick={() => { if (+val >= 0) { onSave(+val, name); onClose() } }}
              disabled={!val}
              className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}>
              Uložit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

type SubTab = 'jizdy' | 'tankování'

export default function JizdyPage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID

  const [loading,    setLoading]    = useState(true)
  const [settings,   setSettings]   = useState<DriveSettings>({ user_id: userId, initial_odometer: 0, vehicle_name: '' })
  const [trips,      setTrips]      = useState<DriveTrip[]>([])
  const [refuels,    setRefuels]    = useState<DriveRefuel[]>([])
  const [curMonth,   setCurMonth]   = useState(() => mKey(todayIso()))
  const [subTab,     setSubTab]     = useState<SubTab>('jizdy')
  const [toast,      setToast]      = useState('')

  const [showTrip,    setShowTrip]    = useState(false)
  const [editingTrip, setEditingTrip] = useState<DriveTrip | null>(null)
  const [showRefuel,  setShowRefuel]  = useState(false)
  const [editingRef,  setEditingRef]  = useState<DriveRefuel | null>(null)
  const [showOdo,     setShowOdo]     = useState(false)
  const [deletingId,  setDeletingId]  = useState<{ id: string; kind: 'trip' | 'refuel' } | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || userId === DEMO_USER_ID) return
    Promise.all([
      fetchDriveSettings(userId),
      fetchDriveTrips(userId).catch(() => [] as DriveTrip[]),
      fetchDriveRefuels(userId).catch(() => [] as DriveRefuel[]),
    ]).then(([s, t, r]) => {
      setSettings(s)
      setTrips(t)
      setRefuels(r)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  // ── Derived ─────────────────────────────────────────────────────

  // All months with data
  const allMonths = useMemo(() => {
    const keys = new Set<string>()
    const now = mKey(todayIso())
    keys.add(now)
    trips.forEach(t => keys.add(mKey(t.date)))
    refuels.forEach(r => keys.add(mKey(r.date)))
    return Array.from(keys).sort((a, b) => b.localeCompare(a))
  }, [trips, refuels])

  // Total km driven (all time) → current odometer
  const totalKmAllTime = useMemo(() => trips.reduce((s, t) => s + t.km, 0), [trips])
  const currentOdometer = settings.initial_odometer + totalKmAllTime

  // This month's trips
  const monthTrips = useMemo(() =>
    trips.filter(t => mKey(t.date) === curMonth).sort((a, b) => b.date.localeCompare(a.date))
  , [trips, curMonth])

  const monthBusiness = useMemo(() => monthTrips.filter(t => t.type === 'business').reduce((s, t) => s + t.km, 0), [monthTrips])
  const monthPrivate  = useMemo(() => monthTrips.filter(t => t.type === 'private').reduce((s, t) => s + t.km, 0), [monthTrips])
  const monthKm       = monthBusiness + monthPrivate

  // This month's refuels
  const monthRefuels = useMemo(() =>
    refuels.filter(r => mKey(r.date) === curMonth).sort((a, b) => b.date.localeCompare(a.date))
  , [refuels, curMonth])

  const monthFuelCost   = useMemo(() => monthRefuels.reduce((s, r) => s + r.liters * r.price_per_liter, 0), [monthRefuels])
  const monthFuelLiters = useMemo(() => monthRefuels.reduce((s, r) => s + r.liters, 0), [monthRefuels])

  // Per-refuel consumption: km since previous refuel
  const refuelsWithConsumption = useMemo(() => {
    // Sort all refuels ascending by date for calculation
    const sorted = [...refuels].sort((a, b) => a.date.localeCompare(b.date))
    return sorted.map((r, i) => {
      if (i === 0) return { ...r, consumption: null as number | null, kmSince: null as number | null }
      const prev = sorted[i - 1]
      // km driven between prev refuel date and this refuel date
      const kmBetween = trips
        .filter(t => t.date > prev.date && t.date <= r.date)
        .reduce((s, t) => s + t.km, 0)
      const consumption = kmBetween > 0 ? (r.liters / kmBetween) * 100 : null
      return { ...r, consumption, kmSince: kmBetween }
    })
  }, [refuels, trips])

  // Average consumption across all refuels that have it
  const avgConsumption = useMemo(() => {
    const valid = refuelsWithConsumption.filter(r => r.consumption !== null)
    if (!valid.length) return null
    return valid.reduce((s, r) => s + r.consumption!, 0) / valid.length
  }, [refuelsWithConsumption])

  // For display, re-index to month (descending)
  const monthRefuelsWithCons = useMemo(() =>
    refuelsWithConsumption
      .filter(r => mKey(r.date) === curMonth)
      .sort((a, b) => b.date.localeCompare(a.date))
  , [refuelsWithConsumption, curMonth])

  // ── Trip actions ─────────────────────────────────────────────────

  async function handleAddTrip(payload: Omit<DriveTrip, 'id' | 'created_at'>) {
    try {
      const t = await insertDriveTrip(payload)
      setTrips(prev => [t, ...prev])
      showToast('✅ Jízda přidána')
    } catch { showToast('❌ Nepodařilo se přidat jízdu') }
  }

  async function handleEditTrip(payload: Omit<DriveTrip, 'id' | 'created_at'>) {
    if (!editingTrip) return
    try {
      await updateDriveTrip({ id: editingTrip.id, ...payload })
      setTrips(prev => prev.map(t => t.id === editingTrip.id ? { ...t, ...payload } : t))
      showToast('✅ Jízda uložena')
    } catch { showToast('❌ Nepodařilo se uložit') }
  }

  async function handleDeleteTrip(id: string) {
    try {
      await deleteDriveTrip(id)
      setTrips(prev => prev.filter(t => t.id !== id))
      setDeletingId(null)
      showToast('🗑️ Jízda smazána')
    } catch { showToast('❌ Nepodařilo se smazat') }
  }

  // ── Refuel actions ───────────────────────────────────────────────

  async function handleAddRefuel(payload: Omit<DriveRefuel, 'id' | 'created_at'>) {
    try {
      const r = await insertDriveRefuel(payload)
      setRefuels(prev => [r, ...prev])
      showToast('✅ Tankování přidáno')
    } catch { showToast('❌ Nepodařilo se přidat tankování') }
  }

  async function handleEditRefuel(payload: Omit<DriveRefuel, 'id' | 'created_at'>) {
    if (!editingRef) return
    try {
      await updateDriveRefuel({ id: editingRef.id, ...payload })
      setRefuels(prev => prev.map(r => r.id === editingRef.id ? { ...r, ...payload } : r))
      showToast('✅ Tankování uloženo')
    } catch { showToast('❌ Nepodařilo se uložit') }
  }

  async function handleDeleteRefuel(id: string) {
    try {
      await deleteDriveRefuel(id)
      setRefuels(prev => prev.filter(r => r.id !== id))
      setDeletingId(null)
      showToast('🗑️ Tankování smazáno')
    } catch { showToast('❌ Nepodařilo se smazat') }
  }

  // ── Settings ─────────────────────────────────────────────────────

  async function handleSaveOdo(val: number, name: string) {
    const updated: DriveSettings = { user_id: userId, initial_odometer: val, vehicle_name: name || settings.vehicle_name }
    try {
      await upsertDriveSettings(updated)
      setSettings(updated)
      showToast('✅ Nastavení uloženo')
    } catch { showToast('❌ Nepodařilo se uložit') }
  }

  // ── Render ───────────────────────────────────────────────────────

  const monthIdx = allMonths.indexOf(curMonth)

  return (
    <>
      <Header title="Kniha jízd" />

      <div className="flex flex-col min-h-screen lg:min-h-0">

        {/* Odometer banner */}
        <div
          className="mx-4 mt-4 rounded-[20px] p-5 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-mid))' }}
        >
          <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide mb-1">
            {settings.vehicle_name || 'Vozidlo'} · Aktuální odometr
          </div>
          <div className="text-[32px] font-black tracking-tight">
            {loading ? '…' : Math.round(currentOdometer).toLocaleString('cs-CZ')}
            <span className="text-[16px] font-semibold opacity-70 ml-1">km</span>
          </div>
          <div className="text-[12px] opacity-60 mt-0.5">
            Počáteční stav: {settings.initial_odometer.toLocaleString('cs-CZ')} km
            {settings.initial_odometer === 0 && ' · '}
            {settings.initial_odometer === 0 && <span className="underline cursor-pointer" onClick={() => setShowOdo(true)}>nastavit</span>}
          </div>
          <button
            onClick={() => setShowOdo(true)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[13px]"
            title="Upravit nastavení"
          >⚙️</button>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-between px-4 py-2 mt-3 bg-[var(--surface)] border-b border-[var(--border)]">
          <button
            onClick={() => monthIdx < allMonths.length - 1 && setCurMonth(allMonths[monthIdx + 1])}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] text-lg disabled:opacity-30"
            disabled={monthIdx >= allMonths.length - 1}
          >‹</button>
          <span className="text-[13px] font-bold text-[var(--text-secondary)]">{mLabel(curMonth)}</span>
          <button
            onClick={() => monthIdx > 0 && setCurMonth(allMonths[monthIdx - 1])}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] text-lg disabled:opacity-30"
            disabled={monthIdx <= 0}
          >›</button>
        </div>

        {/* Sub-tabs */}
        <div className="flex px-4 pt-3 gap-2">
          {(['jizdy', 'tankování'] as SubTab[]).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`flex-1 py-2 rounded-[12px] text-[13px] font-bold transition-all ${
                subTab === t
                  ? 'text-white'
                  : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)]'
              }`}
              style={subTab === t ? { background: 'var(--color-primary)' } : {}}>
              {t === 'jizdy' ? '🚗 Jízdy' : '⛽ Tankování'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3">

          {/* ── JÍZDY ── */}
          {subTab === 'jizdy' && (
            <div className="flex flex-col gap-3">

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Celkem km', value: fmtNum(monthKm, 0), sub: `${monthTrips.length} jízd` },
                  { label: 'Služební', value: fmtNum(monthBusiness, 0), color: '#3b82f6' },
                  { label: 'Soukromé', value: fmtNum(monthPrivate, 0), color: 'var(--color-primary)' },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--surface)] rounded-[14px] p-3 text-center shadow-card">
                    <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{s.label}</div>
                    <div className="text-[18px] font-black" style={{ color: s.color ?? 'var(--text-primary)' }}>
                      {loading ? '…' : s.value}
                    </div>
                    {s.sub && <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{s.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button
                onClick={() => { setEditingTrip(null); setShowTrip(true) }}
                className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)' }}
              >
                + Přidat jízdu
              </button>

              {/* List */}
              {loading ? (
                <div className="text-center py-8 text-[var(--text-tertiary)] text-[13px]">Načítám…</div>
              ) : monthTrips.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-tertiary)]">
                  <div className="text-[32px] mb-2">🚗</div>
                  <div className="text-[14px] font-semibold">Žádné jízdy tento měsíc</div>
                  <div className="text-[12px] mt-1">Přidej první kliknutím výše</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {monthTrips.map(trip => (
                    <div key={trip.id}
                      className="bg-[var(--surface)] rounded-[14px] px-4 py-3.5 shadow-card group">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0 ${
                          trip.type === 'business' ? 'bg-blue-100' : 'bg-orange-100'
                        }`}>
                          {trip.type === 'business' ? '💼' : '🏠'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {trip.from_place || trip.to_place ? (
                              <span className="text-[14px] font-semibold">
                                {trip.from_place}{trip.from_place && trip.to_place ? ' → ' : ''}{trip.to_place}
                              </span>
                            ) : (
                              <span className="text-[14px] font-semibold text-[var(--text-tertiary)]">—</span>
                            )}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              trip.type === 'business' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                              {trip.type === 'business' ? 'Služební' : 'Soukromá'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[12px] text-[var(--text-tertiary)]">
                            <span>📅 {fmtDate(trip.date)}</span>
                            {trip.note && <span>· {trip.note}</span>}
                          </div>
                        </div>
                        <div className="text-[16px] font-black text-[var(--text-primary)] flex-shrink-0">
                          {fmtNum(trip.km, 0)} km
                        </div>
                      </div>
                      {/* Actions on hover */}
                      <div className="flex gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity lg:flex">
                        <button onClick={() => { setEditingTrip(trip); setShowTrip(true) }}
                          className="flex-1 py-1.5 rounded-[10px] bg-[var(--surface-raised)] text-[11px] font-semibold text-[var(--text-secondary)]">
                          ✏️ Upravit
                        </button>
                        <button onClick={() => setDeletingId({ id: trip.id, kind: 'trip' })}
                          className="px-3 py-1.5 rounded-[10px] bg-[var(--surface-raised)] text-[11px] font-semibold text-red-400">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TANKOVÁNÍ ── */}
          {subTab === 'tankování' && (
            <div className="flex flex-col gap-3">

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Celkem Kč', value: `${Math.round(monthFuelCost).toLocaleString('cs-CZ')} Kč` },
                  { label: 'Celkem litrů', value: `${fmtNum(monthFuelLiters)} l` },
                  { label: 'Průměr l/100', value: avgConsumption ? `${fmtNum(avgConsumption)} l` : '—' },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--surface)] rounded-[14px] p-3 text-center shadow-card">
                    <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{s.label}</div>
                    <div className="text-[16px] font-black text-[var(--text-primary)]">
                      {loading ? '…' : s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button
                onClick={() => { setEditingRef(null); setShowRefuel(true) }}
                className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'var(--color-primary)' }}
              >
                + Přidat tankování
              </button>

              {/* List */}
              {loading ? (
                <div className="text-center py-8 text-[var(--text-tertiary)] text-[13px]">Načítám…</div>
              ) : monthRefuelsWithCons.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-tertiary)]">
                  <div className="text-[32px] mb-2">⛽</div>
                  <div className="text-[14px] font-semibold">Žádná tankování tento měsíc</div>
                  <div className="text-[12px] mt-1">Přidej první kliknutím výše</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {monthRefuelsWithCons.map(r => {
                    const total = Math.round(r.liters * r.price_per_liter)
                    return (
                      <div key={r.id} className="bg-[var(--surface)] rounded-[14px] px-4 py-3.5 shadow-card group">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-[16px] flex-shrink-0">
                            ⛽
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold">
                              {fmtNum(r.liters)} l · {fmtNum(r.price_per_liter, 2)} Kč/l
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[12px] text-[var(--text-tertiary)] flex-wrap">
                              <span>📅 {fmtDate(r.date)}</span>
                              {r.kmSince !== null && r.kmSince > 0 && (
                                <span>· {fmtNum(r.kmSince, 0)} km od posledního</span>
                              )}
                              {r.consumption !== null && (
                                <span className="font-semibold text-amber-600">
                                  · {fmtNum(r.consumption)} l/100 km
                                </span>
                              )}
                              {r.note && <span>· {r.note}</span>}
                            </div>
                          </div>
                          <div className="text-[16px] font-black text-[var(--text-primary)] flex-shrink-0">
                            {total.toLocaleString('cs-CZ')} Kč
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity lg:flex">
                          <button onClick={() => { setEditingRef(r); setShowRefuel(true) }}
                            className="flex-1 py-1.5 rounded-[10px] bg-[var(--surface-raised)] text-[11px] font-semibold text-[var(--text-secondary)]">
                            ✏️ Upravit
                          </button>
                          <button onClick={() => setDeletingId({ id: r.id, kind: 'refuel' })}
                            className="px-3 py-1.5 rounded-[10px] bg-[var(--surface-raised)] text-[11px] font-semibold text-red-400">
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[88px] lg:bottom-6 left-1/2 -translate-x-1/2 bg-[#1e1e2e] text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Sheets */}
      {showTrip && (
        <TripSheet
          initial={editingTrip ?? undefined}
          onSave={editingTrip ? handleEditTrip : handleAddTrip}
          onClose={() => { setShowTrip(false); setEditingTrip(null) }}
          userId={userId}
        />
      )}
      {showRefuel && (
        <RefuelSheet
          initial={editingRef ?? undefined}
          onSave={editingRef ? handleEditRefuel : handleAddRefuel}
          onClose={() => { setShowRefuel(false); setEditingRef(null) }}
          userId={userId}
        />
      )}
      {showOdo && (
        <OdometerSheet
          current={settings.initial_odometer}
          onSave={handleSaveOdo}
          onClose={() => setShowOdo(false)}
        />
      )}

      {/* Delete confirm */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDeletingId(null)}>
          <div className="w-full max-w-sm bg-[var(--surface)] rounded-[20px] p-5"
            onClick={e => e.stopPropagation()}>
            <div className="text-[16px] font-bold mb-2">Smazat záznam?</div>
            <div className="text-[13px] text-[var(--text-secondary)] mb-4">
              Tato akce je nevratná.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-[12px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">
                Zrušit
              </button>
              <button
                onClick={() => deletingId.kind === 'trip' ? handleDeleteTrip(deletingId.id) : handleDeleteRefuel(deletingId.id)}
                className="flex-1 py-2.5 rounded-[12px] bg-red-500 text-white text-[14px] font-bold">
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
