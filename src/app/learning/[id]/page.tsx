'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  LearningArea, KnowledgeItem, KnowledgeStatus,
  KNOWLEDGE_STATUS_CONFIG,
  fetchLearningAreas, updateLearningArea,
  fetchKnowledgeItems, insertKnowledgeItem, updateKnowledgeItem, deleteKnowledgeItem,
  getAreaProgress,
} from '@/features/learning/api'

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50 shadow-lg"
      style={{ background: 'var(--color-primary)' }}>
      {msg}
    </div>
  )
}

// ── Knowledge Item Row ────────────────────────────────────────────────

function KnowledgeRow({ item, onStatusChange, onDelete }: {
  item: KnowledgeItem
  onStatusChange: (id: string, status: KnowledgeStatus) => void
  onDelete: (id: string) => void
}) {
  const cfg = KNOWLEDGE_STATUS_CONFIG[item.status]
  const statuses: KnowledgeStatus[] = ['to_learn', 'learned', 'uncertain']

  const nextStatus = (): KnowledgeStatus => {
    const idx = statuses.indexOf(item.status)
    return statuses[(idx + 1) % statuses.length]
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
      {/* Status toggle button */}
      <button
        onClick={() => onStatusChange(item.id, nextStatus())}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] flex-shrink-0 transition-all active:scale-90"
        style={{ background: cfg.color + '22', border: `1.5px solid ${cfg.color}` }}
        title={`Klepni pro změnu: ${cfg.label}`}
      >
        {cfg.icon}
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-[var(--text-primary)]">{item.title}</div>
        {item.notes && (
          <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5 truncate">{item.notes}</div>
        )}
      </div>

      <button onClick={() => onDelete(item.id)} className="text-[var(--text-tertiary)] text-[16px] px-1 flex-shrink-0">✕</button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function LearningAreaPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const userId = user?.id ?? null
  const router = useRouter()

  const [area, setArea] = useState<LearningArea | null>(null)
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [filter, setFilter] = useState<KnowledgeStatus | 'all'>('all')
  const [tab, setTab] = useState<'knowledge' | 'notes'>('knowledge')
  const [newItem, setNewItem] = useState('')
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(true)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      try {
        const [areas, knowledge] = await Promise.all([
          fetchLearningAreas(userId),
          fetchKnowledgeItems(userId, params.id),
        ])
        const found = areas.find(a => a.id === params.id)
        if (!found) { router.push('/learning'); return }
        setArea(found)
        setNotes((found as any).notes_content ?? '')
        setItems(knowledge)
      } catch {
        showToast('Chyba při načítání')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, params.id])

  // Autosave notes after 1s of inactivity
  const saveNotes = useCallback(async (value: string) => {
    if (!area) return
    try {
      await updateLearningArea(area.id, { notes_content: value } as any)
      setNotesSaved(true)
    } catch {
      showToast('Chyba při ukládání')
    }
  }, [area])

  useEffect(() => {
    setNotesSaved(false)
    const timer = setTimeout(() => saveNotes(notes), 1000)
    return () => clearTimeout(timer)
  }, [notes])

  const addItem = async () => {
    if (!newItem.trim() || !userId || !area) return
    try {
      const item = await insertKnowledgeItem({
        user_id: userId,
        area_id: area.id,
        title: newItem.trim(),
        notes: null,
        status: 'to_learn',
        source_title: null,
        source_url: null,
        learned_at: null,
      })
      setItems(prev => [item, ...prev])
      setNewItem('')
    } catch { showToast('Chyba') }
  }

  const changeStatus = async (id: string, status: KnowledgeStatus) => {
    try {
      await updateKnowledgeItem(id, {
        status,
        learned_at: status === 'learned' ? new Date().toISOString() : null,
      })
      setItems(prev => prev.map(i => i.id === id ? { ...i, status, learned_at: status === 'learned' ? new Date().toISOString() : null } : i))
    } catch { showToast('Chyba') }
  }

  const removeItem = async (id: string) => {
    try {
      await deleteKnowledgeItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { showToast('Chyba') }
  }

  if (loading || !area) return (
    <div className="flex flex-col h-full">
      <Header title="Učení" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[14px] text-[var(--text-tertiary)]">Načítám...</div>
      </div>
    </div>
  )

  const { learned, total, pct } = getAreaProgress(items)

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  const FILTERS: { id: KnowledgeStatus | 'all'; label: string }[] = [
    { id: 'all',       label: 'Vše' },
    { id: 'to_learn',  label: '📋 Chci se naučit' },
    { id: 'learned',   label: '✅ Naučeno' },
    { id: 'uncertain', label: '❓ Nejistý' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header title={area.name} />

      {/* Area header */}
      <div className="px-4 pt-4 pb-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/learning')} className="text-[var(--text-tertiary)] text-[20px] mr-1">←</button>
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
            style={{ background: area.color }}>
            {area.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-bold text-[var(--text-primary)]">{area.name}</div>
            {area.description && (
              <div className="text-[12px] text-[var(--text-tertiary)] truncate">{area.description}</div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[12px] mb-1.5">
            <span className="text-[var(--text-tertiary)]">{learned} / {total} naučeno</span>
            <span className="font-bold" style={{ color: area.color }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: area.color }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4">
          {[{ id: 'knowledge', label: 'Znalosti' }, { id: 'notes', label: 'Poznámky' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className="pb-3 text-[14px] font-semibold transition-colors"
              style={{
                color: tab === t.id ? area.color : 'var(--text-tertiary)',
                borderBottom: tab === t.id ? `2px solid ${area.color}` : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge tab */}
      {tab === 'knowledge' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
          {/* Quick add */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Přidat novou znalost..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="flex-1 px-4 py-3 border border-[var(--border)] rounded-[12px] text-[14px] bg-[var(--surface)]"
              style={{ color: 'var(--text-primary)' }}
            />
            <button onClick={addItem}
              className="w-12 h-12 rounded-[12px] text-white font-bold text-[20px] flex items-center justify-center"
              style={{ background: area.color }}>
              +
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: filter === f.id ? area.color : 'var(--surface-raised)',
                  color: filter === f.id ? 'white' : 'var(--text-secondary)',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <div className="text-[32px] mb-2">{area.icon}</div>
              <div className="text-[14px] font-semibold">
                {filter === 'all' ? 'Zatím žádné znalosti' : 'Nic v této kategorii'}
              </div>
              {filter === 'all' && (
                <div className="text-[12px] mt-1">Přidej první věc co se chceš naučit</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {filtered.map(item => (
              <KnowledgeRow
                key={item.id}
                item={item}
                onStatusChange={changeStatus}
                onDelete={removeItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <div className="flex-1 flex flex-col px-4 py-4 pb-24">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] text-[var(--text-tertiary)]">Osobní wiki — piš co se učíš, postřehy, citáty</div>
            <div className="text-[11px]" style={{ color: notesSaved ? '#16a34a' : 'var(--text-tertiary)' }}>
              {notesSaved ? '✓ Uloženo' : 'Ukládám...'}
            </div>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={`Sem piš vše co tě napadne k oblasti ${area.name}...\n\nNapříklad:\n- Co jsem se naučil\n- Zajímavé citáty\n- Klíčové koncepty\n- Odkazy na zdroje`}
            className="flex-1 w-full px-4 py-3 rounded-[14px] border border-[var(--border)] text-[14px] resize-none leading-relaxed"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              minHeight: 300,
            }}
          />
        </div>
      )}

      <Toast show={!!toast} msg={toast} />
    </div>
  )
}
