'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  Habit, HabitLog,
  HABIT_EMOJIS, HABIT_COLORS,
  fetchHabits, insertHabit, deleteHabit,
  fetchHabitLogs, toggleHabitLog,
  getStreak, getDoneCount, getLast7Days, isTodayDone,
} from '@/features/navyky/api'

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50 shadow-lg"
      style={{ background: 'var(--color-primary)' }}>
      {msg}
    </div>
  )
}

// ── Add Habit Modal ───────────────────────────────────────────────────

function AddHabitModal({ onSave, onClose }: {
  onSave: (title: string, emoji: string, color: string, goalDays: number) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('💪')
  const [color, setColor] = useState(HABIT_COLORS[0])
  const [goalDays, setGoalDays] = useState(30)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="w-full bg-[var(--surface)] rounded-t-[24px] p-5 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-bold">Nový návyk</div>
          <button onClick={onClose} className="text-[var(--text-tertiary)] text-[20px]">✕</button>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-[14px]" style={{ background: color + '18' }}>
          <div className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px]"
            style={{ background: color }}>
            {emoji}
          </div>
          <div>
            <div className="text-[15px] font-bold" style={{ color }}>{title || 'Název návyku'}</div>
            <div className="text-[12px] text-[var(--text-tertiary)]">Cíl: {goalDays} dní</div>
          </div>
        </div>

        {/* Name */}
        <input
          type="text"
          placeholder="Název návyku (např. Nekouřit, Číst 20 minut)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-4 py-3 border border-[var(--border-strong)] rounded-[12px] text-[14px] bg-[var(--bg)]"
          style={{ color: 'var(--text-primary)' }}
        />

        {/* Emoji */}
        <div>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Ikona</div>
          <div className="flex flex-wrap gap-2">
            {HABIT_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-[10px] text-[20px] flex items-center justify-center transition-all"
                style={{ background: emoji === e ? color + '30' : 'var(--surface-raised)', outline: emoji === e ? `2px solid ${color}` : 'none' }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Barva</div>
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full transition-transform active:scale-90"
                style={{ background: c, outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        </div>

        {/* Goal */}
        <div>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Cíl (počet dní)</div>
          <div className="flex gap-2">
            {[7, 21, 30, 66, 90].map(d => (
              <button key={d} onClick={() => setGoalDays(d)}
                className="flex-1 py-2 rounded-[10px] text-[13px] font-bold transition-all"
                style={{
                  background: goalDays === d ? color : 'var(--surface-raised)',
                  color: goalDays === d ? 'white' : 'var(--text-secondary)',
                }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-semibold border border-[var(--border-strong)] text-[var(--text-secondary)]">
            Zrušit
          </button>
          <button
            onClick={() => { if (title.trim()) onSave(title.trim(), emoji, color, goalDays) }}
            className="flex-1 px-4 py-3 rounded-[12px] text-[14px] font-semibold text-white"
            style={{ background: title.trim() ? color : 'var(--border-strong)' }}>
            Přidat návyk
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Habit Card ────────────────────────────────────────────────────────

function HabitCard({ habit, logs, userId, onToggle, onDelete }: {
  habit: Habit
  logs: HabitLog[]
  userId: string
  onToggle: (habitId: string, today: string, currentlyDone: boolean) => void
  onDelete: (habitId: string) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const todayDone = isTodayDone(habit.id, logs)
  const streak = getStreak(habit.id, logs)
  const doneCount = getDoneCount(habit.id, logs)
  const progress = Math.min(doneCount / habit.goal_days, 1)
  const last7 = getLast7Days(habit.id, logs)
  const [showDelete, setShowDelete] = useState(false)

  const DAY_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Top bar color accent */}
      <div className="h-1 w-full" style={{ background: habit.color }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] flex-shrink-0"
            style={{ background: habit.color + '22' }}>
            {habit.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-[var(--text-primary)] truncate">{habit.title}</div>
            <div className="text-[12px] text-[var(--text-tertiary)]">
              {streak > 0 ? `🔥 ${streak} dní v řadě` : 'Začni dnes'}
              {' · '}
              {doneCount}/{habit.goal_days} dní
            </div>
          </div>
          {/* Today checkbox */}
          <button
            onClick={() => onToggle(habit.id, today, todayDone)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] transition-all active:scale-90 flex-shrink-0"
            style={{
              background: todayDone ? habit.color : 'var(--bg)',
              border: `2px solid ${todayDone ? habit.color : 'var(--border-strong)'}`,
            }}>
            {todayDone ? <span className="text-white text-[16px]">✓</span> : ''}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] mb-1">
            <span>Progress</span>
            <span>{Math.round(progress * 100)}% z {habit.goal_days} dní</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%`, background: habit.color }} />
          </div>
        </div>

        {/* Last 7 days */}
        <div className="flex justify-between">
          {last7.map((day, i) => {
            const d = new Date(day.date)
            const dayLabel = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]
            const isToday = day.date === today
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                  style={{
                    background: day.done ? habit.color : 'var(--surface-raised)',
                    color: day.done ? 'white' : 'var(--text-tertiary)',
                    outline: isToday ? `2px solid ${habit.color}` : 'none',
                    outlineOffset: 1,
                  }}>
                  {day.done ? '✓' : ''}
                </div>
                <span className="text-[9px] font-semibold" style={{ color: isToday ? habit.color : 'var(--text-tertiary)' }}>
                  {dayLabel}
                </span>
              </div>
            )
          })}
        </div>

        {/* Delete */}
        {showDelete ? (
          <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            <button onClick={() => setShowDelete(false)}
              className="flex-1 py-2 rounded-[10px] text-[12px] font-semibold border border-[var(--border)] text-[var(--text-secondary)]">
              Zrušit
            </button>
            <button onClick={() => onDelete(habit.id)}
              className="flex-1 py-2 rounded-[10px] text-[12px] font-semibold text-red-400 border border-[var(--border)]">
              Smazat návyk
            </button>
          </div>
        ) : (
          <button onClick={() => setShowDelete(true)}
            className="mt-3 text-[11px] text-[var(--text-tertiary)] w-full text-right">
            ··· možnosti
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function NavykyPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = async () => {
    if (!userId) return
    try {
      setLoading(true)
      // Fetch logs for last 90 days (enough for streak + goal)
      const from = new Date()
      from.setDate(from.getDate() - 90)
      const fromStr = from.toISOString().split('T')[0]
      const [h, l] = await Promise.all([fetchHabits(userId), fetchHabitLogs(userId, fromStr)])
      setHabits(h)
      setLogs(l)
    } catch {
      showToast('Chyba při načítání')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  const addHabit = async (title: string, emoji: string, color: string, goalDays: number) => {
    if (!userId) return
    try {
      const habit = await insertHabit({ user_id: userId, title, emoji, color, goal_days: goalDays, is_active: true })
      setHabits(h => [...h, habit])
      setShowAdd(false)
      showToast('Návyk přidán')
    } catch { showToast('Chyba') }
  }

  const handleToggle = async (habitId: string, date: string, currentlyDone: boolean) => {
    if (!userId) return
    try {
      await toggleHabitLog(userId, habitId, date, currentlyDone)
      // Refresh logs
      const from = new Date()
      from.setDate(from.getDate() - 90)
      const fromStr = from.toISOString().split('T')[0]
      const updated = await fetchHabitLogs(userId, fromStr)
      setLogs(updated)
    } catch { showToast('Chyba') }
  }

  const handleDelete = async (habitId: string) => {
    try {
      await deleteHabit(habitId)
      setHabits(h => h.filter(x => x.id !== habitId))
      showToast('Návyk smazán')
    } catch { showToast('Chyba') }
  }

  const today = new Date().toISOString().split('T')[0]
  const todayDoneCount = habits.filter(h => isTodayDone(h.id, logs)).length

  if (!userId) return null

  return (
    <div className="flex flex-col h-full">
      <Header title="Návyky" />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">

        {loading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-[14px] text-[var(--text-tertiary)]">Načítám...</div>
          </div>
        )}

        {!loading && habits.length === 0 && (
          <div className="text-center py-20 text-[var(--text-tertiary)]">
            <div className="text-[48px] mb-4">🎯</div>
            <div className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Žádné návyky</div>
            <div className="text-[13px] text-[var(--text-secondary)]">Přidej první návyk a začni budovat lepší život</div>
          </div>
        )}

        {!loading && habits.length > 0 && (
          <>
            {/* Today summary */}
            <div className="rounded-[16px] p-4 flex items-center justify-between"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] uppercase tracking-wide font-bold">Dnes</div>
                <div className="text-[18px] font-bold text-[var(--text-primary)] mt-0.5">
                  {todayDoneCount} / {habits.length} splněno
                </div>
              </div>
              {todayDoneCount === habits.length && habits.length > 0 ? (
                <div className="text-[32px]">🔥</div>
              ) : (
                <div className="w-14 h-14">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--surface-raised)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke="var(--color-primary)" strokeWidth="3"
                      strokeDasharray={`${habits.length > 0 ? (todayDoneCount / habits.length) * 100 : 0} 100`}
                      strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>

            {/* Habit cards */}
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                logs={logs}
                userId={userId}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[28px] flex items-center justify-center text-white shadow-lg z-30"
        style={{ background: 'var(--color-primary)' }}>
        +
      </button>

      {showAdd && <AddHabitModal onSave={addHabit} onClose={() => setShowAdd(false)} />}
      <Toast show={!!toast} msg={toast} />
    </div>
  )
}
