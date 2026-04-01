'use client'

import { useState } from 'react'
import {
  CalendarEvent, EventCategory, RecurrenceType,
  RECURRENCE_LABELS, EVENT_EMOJIS, getCategoryInlineStyle,
  insertEvent, updateEvent,
} from '@/features/calendar/api'
import { AppCategory, DEFAULT_CATEGORIES } from '@/features/categories/api'

export function fmtDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface AddEventModalProps {
  defaultDate: Date
  isWork: boolean
  userId: string
  existingEvent?: CalendarEvent
  isDuplicate?: boolean
  onSave: (ev: CalendarEvent) => void
  onUpdate?: (ev: CalendarEvent) => void
  onClose: () => void
  appCategories?: AppCategory[]
  clients?: { id: string; name: string }[]
}

export function AddEventModal({
  defaultDate, isWork, userId,
  existingEvent, isDuplicate,
  onSave, onUpdate, onClose,
  appCategories = DEFAULT_CATEGORIES,
  clients = [],
}: AddEventModalProps) {
  const prefill = existingEvent

  const [title,      setTitle]      = useState(prefill?.title ?? '')
  const [emoji,      setEmoji]      = useState(prefill?.emoji ?? '📅')
  const [description,setDesc]       = useState(prefill?.description ?? '')
  const [category,   setCategory]   = useState<EventCategory>(
    prefill?.category ?? (isWork ? 'prace' : (appCategories[0]?.id ?? 'osobni'))
  )
  const [isAllDay,   setIsAllDay]   = useState(prefill?.is_all_day ?? false)
  const [date,       setDate]       = useState(
    prefill ? fmtDateInput(new Date(prefill.start_datetime)) : fmtDateInput(defaultDate)
  )
  const [startTime, setStartTime] = useState(() => {
    if (prefill && !prefill.is_all_day) {
      const d = new Date(prefill.start_datetime)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return '09:00'
  })
  const [endTime, setEndTime] = useState(() => {
    if (prefill && !prefill.is_all_day) {
      const d = new Date(prefill.end_datetime)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return '10:00'
  })
  const [isRecurring,  setIsRecurring]  = useState(isDuplicate ? false : (prefill?.is_recurring ?? false))
  const [recType,      setRecType]      = useState<RecurrenceType>(prefill?.recurrence_type ?? 'weekly')
  const [recInterval,  setRecInterval]  = useState(prefill?.recurrence_interval ?? 1)
  const [saving,       setSaving]       = useState(false)
  const [showEmojis,   setShowEmojis]   = useState(false)
  const [clientId,     setClientId]     = useState<string | null>(existingEvent?.client_id ?? null)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientPicker, setShowClientPicker] = useState(false)

  const isEditMode        = !!existingEvent && !isDuplicate
  const filteredClients   = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
  const selectedClientName = clientId ? clients.find(c => c.id === clientId)?.name : null

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const startISO = isAllDay
        ? `${date}T00:00:00.000Z`
        : new Date(`${date}T${startTime}`).toISOString()
      const endISO = isAllDay
        ? `${date}T23:59:59.000Z`
        : new Date(`${date}T${endTime}`).toISOString()

      const payload = {
        user_id:            userId,
        title:              title.trim(),
        description:        description.trim() || null,
        start_datetime:     startISO,
        end_datetime:       endISO,
        is_all_day:         isAllDay,
        category,
        emoji:              emoji || null,
        is_work:            isWork || category === 'prace' || category === 'work',
        client_id:          clientId,
        is_recurring:       isRecurring,
        recurrence_type:    isRecurring ? recType : null,
        recurrence_interval: isRecurring ? recInterval : 1,
        recurrence_end_date: existingEvent?.recurrence_end_date ?? null,
      }

      if (isEditMode && existingEvent) {
        const baseId = existingEvent.id.split('_')[0]
        await updateEvent({ id: baseId, ...payload })
        onUpdate?.({ ...existingEvent, ...payload, id: baseId })
      } else {
        const ev = await insertEvent(payload)
        onSave(ev)
      }
    } finally {
      setSaving(false)
    }
  }

  const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)]'
  const labelCls = 'text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1 block'
  const modalTitle = isEditMode ? 'Upravit událost' : isDuplicate ? 'Duplikovat událost' : 'Nová událost'

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        style={{ background: 'var(--surface)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>{modalTitle}</h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] text-lg">✕</button>
        </div>

        <div className="p-5 space-y-4">

          {/* Emoji + Title */}
          <div>
            <label className={labelCls}>Název</label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmojis(v => !v)}
                className="w-11 h-11 rounded-xl text-[20px] flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                {emoji}
              </button>
              <input
                autoFocus
                className={fieldCls}
                placeholder="Název události…"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
            {showEmojis && (
              <div className="flex flex-wrap gap-2 mt-2 p-2 rounded-xl" style={{ background: 'var(--bg)' }}>
                {EVENT_EMOJIS.map(em => (
                  <button
                    key={em}
                    onClick={() => { setEmoji(em); setShowEmojis(false) }}
                    className="text-[20px] w-8 h-8 rounded-lg transition-colors"
                    style={{ background: emoji === em ? 'var(--surface-raised)' : 'transparent' }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Kategorie</label>
            <div className="flex flex-wrap gap-2">
              {appCategories.map(cat => {
                const s = getCategoryInlineStyle(cat.id, appCategories)
                const active = category === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                    style={active
                      ? { background: s.background, borderColor: s.borderColor, color: s.color }
                      : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                    }
                  >
                    {cat.icon} {cat.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Client picker */}
          {clients.length > 0 && (
            <div>
              <label className={labelCls}>Klient (volitelný)</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowClientPicker(v => !v)}
                  className={`w-full text-left ${fieldCls} flex items-center justify-between`}
                >
                  <span style={{ color: selectedClientName ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {selectedClientName ?? 'Vybrat klienta…'}
                  </span>
                  {clientId && (
                    <span
                      onClick={e => { e.stopPropagation(); setClientId(null); setClientSearch('') }}
                      className="ml-2"
                      style={{ color: 'var(--text-tertiary)' }}
                    >✕</span>
                  )}
                </button>
                {showClientPicker && (
                  <div
                    className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <div className="p-2" style={{ borderBottom: '1px solid var(--border)' }}>
                      <input
                        autoFocus
                        className="w-full rounded-lg px-2 py-1.5 text-[13px] outline-none"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        placeholder="Hledat klienta…"
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                      />
                    </div>
                    {filteredClients.length === 0
                      ? <div className="px-3 py-2 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Žádný nenalezen</div>
                      : filteredClients.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setClientId(c.id); setClientSearch(''); setShowClientPicker(false) }}
                          className="w-full text-left px-3 py-2 text-[13px] transition-colors"
                          style={{ color: clientId === c.id ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: clientId === c.id ? 600 : 400 }}
                        >
                          {c.name}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className={labelCls}>Datum</label>
            <input type="date" className={`${fieldCls} min-w-0`} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* All day toggle */}
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Celý den</label>
            <button
              onClick={() => setIsAllDay(v => !v)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: isAllDay ? 'var(--color-primary)' : 'var(--border)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all"
                style={{ background: 'var(--surface)', left: isAllDay ? '22px' : '2px' }}
              />
            </button>
          </div>

          {/* Times */}
          {!isAllDay && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>Od</label>
                <input type="time" className={fieldCls} value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Do</label>
                <input type="time" className={fieldCls} value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Popis (volitelný)</label>
            <textarea
              className={`${fieldCls} resize-none`}
              rows={2}
              placeholder="Poznámka…"
              value={description}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>🔁 Opakující se</label>
            <button
              onClick={() => setIsRecurring(v => !v)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: isRecurring ? 'var(--color-primary)' : 'var(--border)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all"
                style={{ background: 'var(--surface)', left: isRecurring ? '22px' : '2px' }}
              />
            </button>
          </div>

          {isRecurring && (
            <div className="space-y-3 pl-3" style={{ borderLeft: '2px solid var(--border)' }}>
              <div>
                <label className={labelCls}>Frekvence</label>
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map(rt => (
                    <button
                      key={rt}
                      onClick={() => setRecType(rt)}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                      style={recType === rt
                        ? { background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }
                        : { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                      }
                    >
                      {RECURRENCE_LABELS[rt]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Každých N</label>
                <input
                  type="number" min={1} max={30}
                  className={`${fieldCls} w-24`}
                  value={recInterval}
                  onChange={e => setRecInterval(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 pt-0">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="w-full py-3 rounded-xl text-white text-[14px] font-bold disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--color-primary)' }}
          >
            {saving ? 'Ukládám…' : isEditMode ? 'Uložit změny' : 'Přidat událost'}
          </button>
        </div>
      </div>
    </div>
  )
}
