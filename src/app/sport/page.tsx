'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import { Workout, MealLog, Supplement, fetchWorkouts, insertWorkout, deleteWorkout, fetchMeals, insertMeal, deleteMeal, fetchSupplements, insertSupplement, deleteSupplement, fetchWorkoutStats, WORKOUT_TYPES } from '@/features/sport/api'

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50" style={{ background: 'var(--color-primary)' }}>{msg}</div>
}

function WorkoutsTab({ userId }: { userId: string }) {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [stats, setStats] = useState({ total_workouts: 0, total_km: 0, total_hours: 0, this_week: 0, this_month: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ type: 'run' as const, title: '', date: new Date().toISOString().split('T')[0], duration_min: 30, distance_km: '' })

  useEffect(() => {
    Promise.all([fetchWorkouts(userId), fetchWorkoutStats(userId)]).then(([w, s]) => { setWorkouts(w); setStats(s) }).catch(() => setToast('Chyba'))
  }, [userId])

  const addWorkout = async () => {
    if (!form.title.trim()) return
    try {
      const workout = await insertWorkout({
        user_id: userId,
        type: form.type,
        title: form.title,
        date: form.date,
        duration_min: form.duration_min,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        notes: null,
        calories: null,
        calendar_event_id: null,
      })
      setWorkouts(w => [workout, ...w])
      setShowAdd(false)
      setForm({ type: 'run', title: '', date: new Date().toISOString().split('T')[0], duration_min: 30, distance_km: '' })
      setToast('Trénink přidán')
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteHandler = async (id: string) => {
    try {
      await deleteWorkout(id)
      setWorkouts(w => w.filter(wo => wo.id !== id))
    } catch (e) {
      setToast('Chyba')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
      <div className="rounded-[14px] p-4 mb-4 text-white" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
        <div className="text-[12px] opacity-75">Tento týden</div>
        <div className="text-[24px] font-bold">{stats.this_week} tréninků</div>
        <div className="text-[12px] opacity-75 mt-1">Tento měsíc: {stats.this_month} tréninků, {stats.total_km} km</div>
      </div>

      {/* Weekly dots */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 aspect-square rounded-full" style={{ background: Math.random() > 0.5 ? 'var(--color-primary)' : '#e5e7eb' }} />
        ))}
      </div>

      <div className="space-y-2">
        {workouts.map(w => (
          <div key={w.id} className="rounded-[12px] border border-gray-200 p-3 bg-white flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[16px]">{WORKOUT_TYPES.find(t => t.id === w.type)?.icon}</span>
                <span className="text-[13px] font-semibold">{w.title}</span>
              </div>
              <div className="text-[11px] text-gray-500">{new Date(w.date).toLocaleDateString('cs-CZ')} • {w.duration_min} minut</div>
              {w.distance_km && <div className="text-[11px] text-gray-500">{w.distance_km} km</div>}
            </div>
            <button onClick={() => deleteHandler(w.id)} className="text-[12px] text-gray-400">✕</button>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-white rounded-t-[20px] p-5 space-y-4">
            <div className="text-[16px] font-bold">Nový trénink</div>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]">
              {WORKOUT_TYPES.map(t => (<option key={t.id} value={t.id}>{t.label}</option>))}
            </select>
            <input type="text" placeholder="Název" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="number" placeholder="Délka (minut)" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: parseInt(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="number" placeholder="Vzdálenost (km)" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-gray-700 border border-gray-300">Zrušit</button>
              <button onClick={addWorkout} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowAdd(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

function MealsTab({ userId }: { userId: string }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [meals, setMeals] = useState<MealLog[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ meal_type: 'breakfast' as const, description: '', calories: '' })

  useEffect(() => {
    fetchMeals(userId, date).then(setMeals).catch(() => setToast('Chyba'))
  }, [userId, date])

  const addMeal = async () => {
    if (!form.description.trim()) return
    try {
      const meal = await insertMeal({
        user_id: userId,
        date,
        meal_type: form.meal_type,
        description: form.description,
        calories: form.calories ? parseInt(form.calories) : null,
      })
      setMeals(m => [...m, meal])
      setForm({ meal_type: 'breakfast', description: '', calories: '' })
      setShowAdd(false)
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteHandler = async (id: string) => {
    try {
      await deleteMeal(id)
      setMeals(m => m.filter(ml => ml.id !== id))
    } catch (e) {
      setToast('Chyba')
    }
  }

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0)
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px] mb-4" />
      {totalCalories > 0 && <div className="text-[13px] font-semibold text-gray-800 mb-4">Celkem: {totalCalories} kcal</div>}

      <div className="space-y-4">
        {mealTypes.map(type => (
          <div key={type}>
            <div className="text-[12px] font-bold text-gray-500 mb-2 capitalize">{type === 'breakfast' ? '🥐 Snídaně' : type === 'lunch' ? '🍽️ Oběd' : type === 'dinner' ? '🍽️ Večeře' : '🍪 Svačina'}</div>
            {meals.filter(m => m.meal_type === type).map(m => (
              <div key={m.id} className="rounded-[10px] bg-gray-50 p-2.5 mb-1.5 flex items-center justify-between">
                <div className="text-[12px]">{m.description} {m.calories && <span className="text-gray-500">({m.calories} kcal)</span>}</div>
                <button onClick={() => deleteHandler(m.id)} className="text-[11px] text-gray-400">✕</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-white rounded-t-[20px] p-5 space-y-4">
            <div className="text-[16px] font-bold">Přidat jídlo</div>
            <select value={form.meal_type} onChange={(e) => setForm({ ...form, meal_type: e.target.value as any })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]">
              <option value="breakfast">Snídaně</option>
              <option value="lunch">Oběd</option>
              <option value="dinner">Večeře</option>
              <option value="snack">Svačina</option>
            </select>
            <input type="text" placeholder="Co jsi jedl" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="number" placeholder="Kalorií" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-gray-700 border border-gray-300">Zrušit</button>
              <button onClick={addMeal} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowAdd(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

function SupplementsTab({ userId }: { userId: string }) {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', dose: '', timing: 'morning' as const })

  useEffect(() => {
    fetchSupplements(userId).then(setSupplements).catch(() => setToast('Chyba'))
  }, [userId])

  const addSupplement = async () => {
    if (!form.name.trim()) return
    try {
      const supp = await insertSupplement({
        user_id: userId,
        name: form.name,
        dose: form.dose,
        timing: form.timing,
        notes: null,
        active: true,
      })
      setSupplements(s => [...s, supp])
      setShowAdd(false)
      setForm({ name: '', dose: '', timing: 'morning' })
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteHandler = async (id: string) => {
    try {
      await deleteSupplement(id)
      setSupplements(s => s.filter(su => su.id !== id))
    } catch (e) {
      setToast('Chyba')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
      <div className="space-y-2">
        {supplements.map(s => (
          <div key={s.id} className="rounded-[12px] border border-gray-200 p-3 bg-white flex items-start justify-between">
            <div>
              <div className="text-[13px] font-semibold">{s.name}</div>
              <div className="text-[11px] text-gray-500">{s.dose} • {s.timing}</div>
            </div>
            <button onClick={() => deleteHandler(s.id)} className="text-[12px] text-gray-400">✕</button>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-white rounded-t-[20px] p-5 space-y-4">
            <div className="text-[16px] font-bold">Nový suplement</div>
            <input type="text" placeholder="Název" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <input type="text" placeholder="Dávka" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]" />
            <select value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value as any })} className="w-full px-4 py-2.5 border border-gray-300 rounded-[10px] text-[14px]">
              <option value="morning">Ráno</option>
              <option value="evening">Večer</option>
              <option value="pre_workout">Před tréninkem</option>
              <option value="post_workout">Po tréninku</option>
              <option value="anytime">Kdykoliv</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-gray-700 border border-gray-300">Zrušit</button>
              <button onClick={addSupplement} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowAdd(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>+</button>
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}

export default function SportPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [tab, setTab] = useState('workouts')

  if (!userId) return null

  return (
    <>
      <Header title="💪 Sport" />
      <div className="flex gap-3 px-5 pt-4 border-b border-gray-200">
        {[
          { id: 'workouts', label: '🏋️ Tréninky' },
          { id: 'meals', label: '🥗 Jídelníček' },
          { id: 'supplements', label: '💊 Suplementy' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
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
      {tab === 'workouts' && <WorkoutsTab userId={userId} />}
      {tab === 'meals' && <MealsTab userId={userId} />}
      {tab === 'supplements' && <SupplementsTab userId={userId} />}
    </>
  )
}
