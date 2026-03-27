'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import { BucketItem, BucketCategory, BUCKET_CATEGORIES, BUCKET_SUGGESTIONS, fetchBucketItems, insertBucketItem, updateBucketItem, deleteBucketItem } from '@/features/bucket/api'

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50" style={{ background: 'var(--color-primary)' }}>{msg}</div>
}

export default function BucketListPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [items, setItems] = useState<BucketItem[]>([])
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInspiration, setShowInspiration] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ title: '', size: 'big' as const, category: 'travel' as const, notes: '' })

  useEffect(() => {
    if (!userId) return
    fetchBucketItems(userId).then(setItems).catch(() => setToast('Chyba'))
  }, [userId])

  if (!userId) return null

  const filtered = items.filter(item => {
    if (filterCategory && item.category !== filterCategory) return false
    if (!showDone && item.status === 'done') return false
    return true
  })

  const done = items.filter(i => i.status === 'done').length
  const total = items.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const addItem = async (title: string, category: BucketItem['category'], size: BucketItem['size']) => {
    try {
      const item = await insertBucketItem({
        user_id: userId,
        title,
        category,
        size,
        status: 'todo',
        done_at: null,
        notes: null,
      })
      setItems(it => [...it, item])
      setToast('Přidáno')
    } catch (e) {
      setToast('Chyba')
    }
  }

  const toggleDone = async (id: string, status: BucketItem['status']) => {
    try {
      const newStatus = status === 'done' ? 'todo' : 'done'
      await updateBucketItem(id, { status: newStatus, done_at: newStatus === 'done' ? new Date().toISOString() : null })
      setItems(it => it.map(i => i.id === id ? { ...i, status: newStatus, done_at: newStatus === 'done' ? new Date().toISOString() : null } : i))
    } catch (e) {
      setToast('Chyba')
    }
  }

  const deleteHandler = async (id: string) => {
    try {
      await deleteBucketItem(id)
      setItems(it => it.filter(i => i.id !== id))
    } catch (e) {
      setToast('Chyba')
    }
  }

  const big = filtered.filter(i => i.size === 'big').sort((a, b) => (b.status === 'done' ? 1 : -1) - (a.status === 'done' ? 1 : -1))
  const small = filtered.filter(i => i.size === 'small').sort((a, b) => (b.status === 'done' ? 1 : -1) - (a.status === 'done' ? 1 : -1))

  const unusedSuggestions = BUCKET_SUGGESTIONS.filter(s => !items.some(i => i.title === s.title))

  return (
    <>
      <Header title="Bucket List" />
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
        {/* Progress */}
        <div className="rounded-[14px] bg-[var(--surface)] p-4 mb-4 border border-[var(--border)]">
          <div className="text-[12px] font-bold text-[var(--text-secondary)] mb-2">{progress}% splněno</div>
          <div className="w-full bg-[var(--border)] rounded-full h-2.5"><div className="h-2.5 rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--color-primary)' }} /></div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-2">{done} z {total} cílů</div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCategory(null)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap"
            style={{ background: !filterCategory ? 'var(--color-primary)' : 'var(--border)', color: !filterCategory ? 'white' : 'var(--text-secondary)' }}
          >
            Všechny
          </button>
          {BUCKET_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap"
              style={{ background: filterCategory === cat.id ? 'var(--color-primary)' : 'var(--border)', color: filterCategory === cat.id ? 'white' : 'var(--text-secondary)' }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Show/hide completed toggle */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-[13px] text-[var(--text-secondary)]">Zobrazit splněné</span>
        </label>

        {/* Big goals */}
        {big.length > 0 && (
          <div className="mb-5">
            <div className="text-[14px] font-bold text-[var(--text-primary)] mb-3">🏔️ Velké cíle</div>
            <div className="space-y-2">
              {big.map(item => {
                const cat = BUCKET_CATEGORIES.find(c => c.id === item.category)
                return (
                  <div key={item.id} className="rounded-[12px] border border-[var(--border)] p-3 bg-[var(--surface)] flex items-start gap-2">
                    <button
                      onClick={() => toggleDone(item.id, item.status)}
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all"
                      style={{
                        background: item.status === 'done' ? 'var(--color-primary)' : 'white',
                        borderColor: item.status === 'done' ? 'var(--color-primary)' : 'var(--border-strong)',
                      }}
                    >
                      {item.status === 'done' && <span className="text-[11px] text-white font-bold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold" style={{ textDecoration: item.status === 'done' ? 'line-through' : 'none', color: item.status === 'done' ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                        {item.title}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: cat?.icon === '✈️' ? '#e0e7ff' : '#fef3c7', color: cat?.icon === '✈️' ? '#3730a3' : '#92400e' }}>
                          {cat?.icon} {cat?.label}
                        </span>
                      </div>
                      {item.done_at && <div className="text-[11px] text-[var(--text-secondary)] mt-1">✓ {new Date(item.done_at).toLocaleDateString('cs-CZ')}</div>}
                    </div>
                    <button onClick={() => deleteHandler(item.id)} className="text-[12px] text-[var(--text-tertiary)] flex-shrink-0">✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Small goals */}
        {small.length > 0 && (
          <div className="mb-5">
            <div className="text-[14px] font-bold text-[var(--text-primary)] mb-3">✨ Malé cíle</div>
            <div className="space-y-2">
              {small.map(item => {
                const cat = BUCKET_CATEGORIES.find(c => c.id === item.category)
                return (
                  <div key={item.id} className="rounded-[12px] border border-[var(--border)] p-3 bg-[var(--surface)] flex items-start gap-2">
                    <button
                      onClick={() => toggleDone(item.id, item.status)}
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{
                        background: item.status === 'done' ? 'var(--color-primary)' : 'white',
                        borderColor: item.status === 'done' ? 'var(--color-primary)' : 'var(--border-strong)',
                      }}
                    >
                      {item.status === 'done' && <span className="text-[11px] text-white font-bold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold" style={{ textDecoration: item.status === 'done' ? 'line-through' : 'none', color: item.status === 'done' ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                        {item.title}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
                          {cat?.icon} {cat?.label}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => deleteHandler(item.id)} className="text-[12px] text-[var(--text-tertiary)] flex-shrink-0">✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Inspiration modal */}
      {showInspiration && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-[var(--surface)] rounded-t-[20px] p-5 max-h-[80vh] overflow-y-auto">
            <div className="text-[16px] font-bold mb-4">💡 Inspirace</div>
            <div className="grid grid-cols-1 gap-2">
              {unusedSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    addItem(s.title, s.category, s.size)
                    setShowInspiration(false)
                  }}
                  className="text-left p-3 rounded-[10px] border border-[var(--border)] hover:bg-[var(--bg)] transition-colors"
                >
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">{s.title}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{BUCKET_CATEGORIES.find(c => c.id === s.category)?.label} • {s.size === 'big' ? '🏔️ Velký' : '✨ Malý'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="w-full bg-[var(--surface)] rounded-t-[20px] p-5 space-y-4">
            <div className="text-[16px] font-bold">Nový cíl</div>
            <input type="text" placeholder="Co chceš zažít?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value as any })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]">
              <option value="big">🏔️ Velký cíl</option>
              <option value="small">✨ Malý cíl</option>
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]">
              {BUCKET_CATEGORIES.map(cat => (<option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>))}
            </select>
            <textarea placeholder="Poznámky" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 border border-[var(--border-strong)] rounded-[10px] text-[14px]" />
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-[var(--text-secondary)] border border-[var(--border-strong)]">Zrušit</button>
              <button onClick={() => { addItem(form.title, form.category, form.size); setShowAddModal(false); setForm({ title: '', size: 'big', category: 'travel', notes: '' }) }} className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-white" style={{ background: 'var(--color-primary)' }}>Přidat</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB buttons */}
      <button onClick={() => setShowInspiration(true)} className="fixed bottom-24 right-6 w-12 h-12 rounded-full text-[18px] flex items-center justify-center text-white font-bold border-2 border-white" style={{ background: 'var(--color-primary)' }}>
        💡
      </button>
      <button onClick={() => setShowAddModal(true)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-[24px] flex items-center justify-center text-white font-bold" style={{ background: 'var(--color-primary)' }}>
        +
      </button>

      <Toast show={!!toast} msg={toast} />
    </>
  )
}
