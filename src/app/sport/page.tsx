'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  Workout, MealLog, Supplement, MindLog,
  WORKOUT_TYPES,
  fetchWorkouts, insertWorkout, deleteWorkout, fetchWorkoutStats,
  fetchMeals, insertMeal, deleteMeal,
  fetchSupplements, insertSupplement, deleteSupplement,
  fetchMindLogs, upsertMindLog,
} from '@/features/sport/api'

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50 shadow-lg" style={{ background: 'var(--color-primary)' }}>{msg}</div>
}

function TabNav({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  const tabs = [
    { id: 'pohyb',      label: 'Pohyb' },
    { id: 'jidlo',      label: 'Jídlo' },
    { id: 'mysl',       label: 'Mysl' },
    { id: 'suplementy', label: 'Suplementy' },
  ]
  return (
    <div className="flex gap-1 px-4 pt-3 border-b border-[var(--border)] bg-[var(--surface)] overflow-x-auto no-scrollbar">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTab(t.id)}
          className="pb-3 px-3 text-[13px] font-semibold transition-colors whitespace-nowrap flex-shrink-0"
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

// ── Pohyb Tab ─────────────────────────────────────────────────────────

function PohybTab({ userId }: { userId: string }) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [stats, setStats] = useState({ total_workouts: 0, total_km: 0, total_hours: 0, this_week: 0, this_month: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ type: 'run' as const, title: '', date: new Date().toISOString().split('T')[0], duration_min: 30, distance_km: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    Promise.all([fetchWorkouts(userId), fetchWorkoutStats(userId)])
      .then(([w, s]) => { setWorkouts(w); setStats(s) })
      .catch(() => showToast('Chyba'))
  }, [userId])

  const add = async () => {
    if (!form.title.trim()) return
    try {
      const w = await insertWorkout({
        user_id: userId, type: form.type, title: form.title, date: form.date,
        duration_min: form.duration_min,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        notes: null, calories: null, calendar_event_id: null,
      })
      setWorkouts(prev => [w, ...prev])
      setShowAdd(false)
      setForm({ type: 'run', title: '', date: new Date().toISOString().split('T')[0], duration_min: 30, distance_km: '' })
      showToast('Trénink přidán')
    } catch { showToast('Chyba') }
  }

  const remove = async (id: string) => {
    try {
      await deleteWorkout(id)
      setWorkouts(prev => prev.filter(w => w.id !== id))
    } catch { showToast('Chyba') }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Tento týden', value: stats.this_week, unit: 'tréninků' },
          { label: 'Tento měsíc', value: stats.this_month, unit: 'tréninků' },
          { label: 'Celkem km', value: stats.total_km, unit: 'km' },
        ].map(s => (
          <div key={s.label} className="rounded-[12px] p-3 text-center border border-[var(--border)] bg-[var(--surface)]">
            <div className="text-[18px] font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{s.unit}</div>
            <div className="text-[9px] text-[var(--text-tertiary)]">{s.label}</div>
          </div>
        ))}
      </div>

      {workouts.length === 0 && (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <div className="text-[40px] mb-3">💪</div>
          <div className="text-[15px] font-semibold">Zatím žádné tréninky</div>
          <div className="text-[13px] mt-1">Zaloguj první trénink</div>
        </div>
      )}

      {workouts.map(w => {
        const typeInfo = WORKOUT_TYPES.find(t => t.id === w.type)
        return (
          <div key={w.id} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] flex-shrink-0"
              style={{ background: (typeInfo?.color ?? '#888') + '22' }}>
              {typeInfo?.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[var(--text-primary)]">{w.title}</div>
              <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                {new Date(w.date).toLocaleDateString('cs-CZ')} · {w.duration_min} min
                {w.distance_km != null && ` · ${w.distance_km} km`}
              </div>
            </div>
            <button onClick={() => remove(w.id)} className="text-[var(--text-tertiary)] text-[16px] px-1">✕</button>
          </div>
        )
      })}

      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[28px] flex items-center justify-center text-white shadow-lg z-30"
        style={{ background: 'var(--color-primary)' }}>
        +
      </button>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-bold">Nový trénink</div>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-tertiary)] text-[20px]">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_TYPES.map(t => (
                <button key={t.id} onClick={() => setForm({ ...form, type: t.id as any })}
                  className="py-2.5 rounded-[10px] text-[12px] font-semibold flex flex-col items-center gap-1"
                  style={{ background: form.type === t.id ? t.color : 'var(--surface-raised)', color: form.type === t.id ? 'white' : 'var(--text-secondary)' }}>
                  <span className="text-[20px]">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Název (např. Ranní běh)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[12px] text-[14px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Datum</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Délka (min)</label>
                <input type="number" value={form.duration_min} onChange={e => setForm({ ...form, duration_min: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
            <input type="number" placeholder="Vzdálenost km (volitelné)" value={form.distance_km} onChange={e => setForm({ ...form, distance_km: e.target.value })}
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

// ── Jídlo Tab ─────────────────────────────────────────────────────────

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Snídaně', icon: '🌅' },
  { id: 'lunch',     label: 'Oběd',    icon: '☀️' },
  { id: 'dinner',    label: 'Večeře',  icon: '🌙' },
  { id: 'snack',     label: 'Svačina', icon: '🍎' },
]

function JidloTab({ userId }: { userId: string }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [meals, setMeals] = useState<MealLog[]>([])
  const [input, setInput] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetchMeals(userId, date).then(setMeals).catch(() => showToast('Chyba'))
  }, [userId, date])

  const add = async () => {
    if (!input.trim()) return
    try {
      const meal = await insertMeal({ user_id: userId, date, meal_type: mealType, description: input.trim(), calories: null })
      setMeals(prev => [...prev, meal])
      setInput('')
      showToast('Přidáno')
    } catch { showToast('Chyba') }
  }

  const remove = async (id: string) => {
    try {
      await deleteMeal(id)
      setMeals(prev => prev.filter(m => m.id !== id))
    } catch { showToast('Chyba') }
  }

  const prevDay = () => {
    const d = new Date(date); d.setDate(d.getDate() - 1)
    setDate(d.toISOString().split('T')[0])
  }
  const nextDay = () => {
    const d = new Date(date); d.setDate(d.getDate() + 1)
    setDate(d.toISOString().split('T')[0])
  }
  const isToday = date === new Date().toISOString().split('T')[0]

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevDay} className="w-8 h-8 flex items-center justify-center text-[var(--text-tertiary)] text-[20px]">‹</button>
        <div className="text-center">
          <div className="text-[14px] font-bold text-[var(--text-primary)]">
            {isToday ? 'Dnes' : new Date(date).toLocaleDateString('cs-CZ', { weekday: 'long' })}
          </div>
          <div className="text-[12px] text-[var(--text-tertiary)]">{new Date(date).toLocaleDateString('cs-CZ')}</div>
        </div>
        <button onClick={nextDay} className="w-8 h-8 flex items-center justify-center text-[var(--text-tertiary)] text-[20px]">›</button>
      </div>

      {/* Meal type selector */}
      <div className="grid grid-cols-4 gap-2">
        {MEAL_TYPES.map(t => (
          <button key={t.id} onClick={() => setMealType(t.id as any)}
            className="py-2.5 rounded-[10px] text-[11px] font-semibold flex flex-col items-center gap-1 transition-all"
            style={{ background: mealType === t.id ? 'var(--color-primary)' : 'var(--surface-raised)', color: mealType === t.id ? 'white' : 'var(--text-secondary)' }}>
            <span className="text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <input type="text" placeholder="Co jsi jedl?" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 px-4 py-3 border border-[var(--border)] rounded-[12px] text-[14px] bg-[var(--surface)]"
          style={{ color: 'var(--text-primary)' }} />
        <button onClick={add} className="w-12 h-12 rounded-[12px] text-white font-bold text-[20px] flex items-center justify-center"
          style={{ background: 'var(--color-primary)' }}>+</button>
      </div>

      {/* Meals grouped by type */}
      {MEAL_TYPES.map(type => {
        const typeMeals = meals.filter(m => m.meal_type === type.id)
        if (typeMeals.length === 0) return null
        return (
          <div key={type.id}>
            <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2 px-1">
              {type.icon} {type.label}
            </div>
            <div className="space-y-1">
              {typeMeals.map(meal => (
                <div key={meal.id} className="flex items-center gap-3 px-4 py-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
                  <span className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>{meal.description}</span>
                  <button onClick={() => remove(meal.id)} className="text-[var(--text-tertiary)] text-[14px] px-1">✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {meals.length === 0 && (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <div className="text-[36px] mb-2">🍽️</div>
          <div className="text-[14px] font-semibold">Zatím nic nezaznamenáno</div>
          <div className="text-[12px] mt-1">Zapiš co jíš — stačí jen název</div>
        </div>
      )}

      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

// ── Mysl Tab ──────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Špatně' },
  { value: 2, emoji: '😕', label: 'Nic moc' },
  { value: 3, emoji: '😐', label: 'Ujde' },
  { value: 4, emoji: '😊', label: 'Dobře' },
  { value: 5, emoji: '😄', label: 'Skvěle' },
]

const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Vyčerpaný' },
  { value: 2, emoji: '🥱', label: 'Unavený' },
  { value: 3, emoji: '😐', label: 'Normální' },
  { value: 4, emoji: '⚡', label: 'Nabytý' },
  { value: 5, emoji: '🔥', label: 'Plný energie' },
]

function MyslTab({ userId }: { userId: string }) {
  const today = new Date().toISOString().split('T')[0]
  const [logs, setLogs] = useState<MindLog[]>([])
  const [mood, setMood] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    const from = new Date(); from.setDate(from.getDate() - 30)
    fetchMindLogs(userId, from.toISOString().split('T')[0]).then(data => {
      setLogs(data)
      const todayLog = data.find(l => l.date === today)
      if (todayLog) {
        setMood(todayLog.mood)
        setEnergy(todayLog.energy)
        setNotes(todayLog.notes ?? '')
        setSaved(true)
      }
    }).catch(() => showToast('Chyba'))
  }, [userId])

  const save = async () => {
    try {
      const log = await upsertMindLog({ user_id: userId, date: today, mood, energy, notes: notes || null })
      setLogs(prev => [log, ...prev.filter(l => l.date !== today)])
      setSaved(true)
      showToast('Uloženo')
    } catch { showToast('Chyba') }
  }

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const log = logs.find(l => l.date === dateStr)
    return { date: dateStr, log, isToday: dateStr === today }
  })

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-5">
      {/* Today check-in */}
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold text-[var(--text-primary)]">Jak se dnes cítíš?</div>
          {saved && <span className="text-[11px] font-semibold text-green-500">✓ Uloženo</span>}
        </div>

        <div>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Nálada</div>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map(o => (
              <button key={o.value} onClick={() => { setMood(o.value); setSaved(false) }}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-[10px] transition-all"
                style={{ background: mood === o.value ? 'var(--color-primary)' : 'var(--surface-raised)' }}>
                <span className="text-[22px]">{o.emoji}</span>
                <span className="text-[9px] font-semibold" style={{ color: mood === o.value ? 'white' : 'var(--text-tertiary)' }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Energie</div>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map(o => (
              <button key={o.value} onClick={() => { setEnergy(o.value); setSaved(false) }}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-[10px] transition-all"
                style={{ background: energy === o.value ? 'var(--color-primary)' : 'var(--surface-raised)' }}>
                <span className="text-[22px]">{o.emoji}</span>
                <span className="text-[9px] font-semibold" style={{ color: energy === o.value ? 'white' : 'var(--text-tertiary)' }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); setSaved(false) }}
          placeholder="Poznámka k dnešnímu dni (volitelné)..."
          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-[10px] text-[13px] resize-none bg-[var(--bg)]"
          style={{ color: 'var(--text-primary)' }}
          rows={3}
        />

        <button onClick={save}
          className="w-full py-3 rounded-[12px] text-[14px] font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}>
          Uložit dnešní záznam
        </button>
      </div>

      {/* Last 7 days */}
      <div>
        <div className="text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-3 px-1">Posledních 7 dní</div>
        <div className="flex gap-2">
          {last7.map(day => {
            const moodEmoji = day.log ? MOOD_OPTIONS.find(o => o.value === day.log!.mood)?.emoji : null
            const d = new Date(day.date)
            const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[18px]"
                  style={{
                    background: day.log ? 'var(--color-primary)' + '22' : 'var(--surface-raised)',
                    outline: day.isToday ? '2px solid var(--color-primary)' : 'none',
                    outlineOffset: 1,
                  }}>
                  {moodEmoji ?? '·'}
                </div>
                <span className="text-[9px] font-semibold" style={{ color: day.isToday ? 'var(--color-primary)' : 'var(--text-tertiary)' }}>
                  {dayNames[d.getDay()]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

// ── Suplementy Tab ────────────────────────────────────────────────────

const TIMING_OPTIONS = [
  { id: 'morning',      label: 'Ráno',          icon: '🌅' },
  { id: 'evening',      label: 'Večer',         icon: '🌙' },
  { id: 'pre_workout',  label: 'Před tréninkem', icon: '⚡' },
  { id: 'post_workout', label: 'Po tréninku',    icon: '💪' },
  { id: 'anytime',      label: 'Kdykoliv',       icon: '🕐' },
]

function SupplementyTab({ userId }: { userId: string }) {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', dose: '', timing: 'morning' as const })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetchSupplements(userId).then(setSupplements).catch(() => showToast('Chyba'))
  }, [userId])

  const add = async () => {
    if (!form.name.trim() || !form.dose.trim()) return
    try {
      const s = await insertSupplement({ user_id: userId, name: form.name, dose: form.dose, timing: form.timing, notes: null, active: true })
      setSupplements(prev => [s, ...prev])
      setShowAdd(false)
      setForm({ name: '', dose: '', timing: 'morning' })
      showToast('Přidáno')
    } catch { showToast('Chyba') }
  }

  const remove = async (id: string) => {
    try {
      await deleteSupplement(id)
      setSupplements(prev => prev.filter(s => s.id !== id))
    } catch { showToast('Chyba') }
  }

  const grouped = TIMING_OPTIONS.map(t => ({
    ...t,
    items: supplements.filter(s => s.timing === t.id),
  })).filter(g => g.items.length > 0)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
      {supplements.length === 0 && (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <div className="text-[40px] mb-3">💊</div>
          <div className="text-[15px] font-semibold">Zatím žádné suplementy</div>
          <div className="text-[13px] mt-1">Přidej co pravidelně bereš</div>
        </div>
      )}

      {grouped.map(group => (
        <div key={group.id}>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2 px-1">
            {group.icon} {group.label}
          </div>
          <div className="space-y-2">
            {group.items.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">{s.name}</div>
                  <div className="text-[12px] text-[var(--text-tertiary)]">{s.dose}</div>
                </div>
                <button onClick={() => remove(s.id)} className="text-[var(--text-tertiary)] text-[16px] px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[28px] flex items-center justify-center text-white shadow-lg z-30"
        style={{ background: 'var(--color-primary)' }}>
        +
      </button>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowAdd(false)}>
          <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-bold">Nový suplement</div>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-tertiary)] text-[20px]">✕</button>
            </div>
            <input type="text" placeholder="Název (např. Vitamín D, Kreatin)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[12px] text-[14px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            <input type="text" placeholder="Dávka (např. 2000 IU, 5g)" value={form.dose} onChange={e => setForm({ ...form, dose: e.target.value })}
              className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[13px] bg-[var(--bg)]" style={{ color: 'var(--text-primary)' }} />
            <div className="grid grid-cols-3 gap-2">
              {TIMING_OPTIONS.map(t => (
                <button key={t.id} onClick={() => setForm({ ...form, timing: t.id as any })}
                  className="py-2.5 rounded-[10px] text-[11px] font-semibold flex flex-col items-center gap-1"
                  style={{ background: form.timing === t.id ? 'var(--color-primary)' : 'var(--surface-raised)', color: form.timing === t.id ? 'white' : 'var(--text-secondary)' }}>
                  <span className="text-[16px]">{t.icon}</span>
                  {t.label}
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

export default function TeloMyslPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [tab, setTab] = useState('pohyb')

  if (!userId) return null

  return (
    <div className="flex flex-col h-full">
      <Header title="Tělo & Mysl" />
      <TabNav tab={tab} onTab={setTab} />
      {tab === 'pohyb'      && <PohybTab userId={userId} />}
      {tab === 'jidlo'      && <JidloTab userId={userId} />}
      {tab === 'mysl'       && <MyslTab userId={userId} />}
      {tab === 'suplementy' && <SupplementyTab userId={userId} />}
    </div>
  )
}
