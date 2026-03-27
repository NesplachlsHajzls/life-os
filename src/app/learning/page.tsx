'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  LearningArea, LearningItem, KnowledgeItem,
  AREA_ICONS, AREA_COLORS,
  fetchLearningAreas, insertLearningArea, updateLearningArea, deleteLearningArea,
  fetchLearningItems, insertLearningItem, updateLearningItem, deleteLearningItem,
  fetchAllKnowledgeItems,
  getAreaProgress,
} from '@/features/learning/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

function AddAreaModal({ initial, onSave, onClose }: {
  initial?: LearningArea | null
  onSave: (data: Partial<LearningArea>) => void
  onClose: () => void
}) {
  const [name, setName]   = useState(initial?.name ?? '')
  const [icon, setIcon]   = useState(initial?.icon ?? '🧠')
  const [color, setColor] = useState(initial?.color ?? AREA_COLORS[0])
  const [desc, setDesc]   = useState(initial?.description ?? '')
  const valid = name.trim().length > 0
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-[var(--surface)] rounded-t-[24px] p-5 pb-10 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[17px] font-bold mb-5">{initial ? '✏️ Upravit oblast' : '➕ Nová oblast učení'}</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Název</label>
            <input className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]"
              value={name} onChange={e => setName(e.target.value)} placeholder="Digitalizace zdravotnictví..." autoFocus />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Popis (volitelný)</label>
            <textarea className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)] resize-none"
              rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Krátký popis oblasti..." />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Ikonka</label>
            <div className="flex flex-wrap gap-2">
              {AREA_ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className={'w-10 h-10 rounded-xl text-[20px] flex items-center justify-center transition-all ' + (icon === ic ? 'ring-2 ring-[var(--color-primary)] bg-indigo-50' : 'bg-[var(--surface-raised)] hover:bg-[var(--border)]')}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Barva</label>
            <div className="flex flex-wrap gap-2">
              {AREA_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={'w-8 h-8 rounded-full transition-all ' + (color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : '')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">Zrušit</button>
            <button onClick={() => { if (valid) { onSave({ name: name.trim(), icon, color, description: desc || null }); onClose() } }}
              disabled={!valid} className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}>{initial ? 'Uložit' : 'Vytvořit'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddBookModal({ userId, onSave, onClose }: { userId: string; onSave: (item: LearningItem) => void; onClose: () => void }) {
  const [title, setTitle]   = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState<'wishlist' | 'active' | 'done'>('wishlist')
  const [pages, setPages]   = useState('')
  const valid = title.trim().length > 0
  async function handleSave() {
    if (!valid) return
    const item = await insertLearningItem({
      user_id: userId, type: 'book', title: title.trim(), author: author.trim() || null,
      status, progress: 0, rating: null, notes: null,
      started_at: status === 'active' ? new Date().toISOString() : null,
      finished_at: status === 'done' ? new Date().toISOString() : null,
      url: null, total_pages: pages ? parseInt(pages) : null, current_page: 0, cover_emoji: '📚',
    })
    onSave(item); onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-[var(--surface)] rounded-t-[24px] p-5 pb-10">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
        <h2 className="text-[17px] font-bold mb-5">📚 Přidat knihu</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Název</label>
            <input className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]"
              value={title} onChange={e => setTitle(e.target.value)} placeholder="Název knihy" autoFocus />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Autor</label>
            <input className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]"
              value={author} onChange={e => setAuthor(e.target.value)} placeholder="Jméno autora" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Počet stránek</label>
            <input type="number" className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]"
              value={pages} onChange={e => setPages(e.target.value)} placeholder="300" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Stav</label>
            <div className="flex gap-2">
              {(['wishlist', 'active', 'done'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={'flex-1 py-2 rounded-[12px] text-[12px] font-semibold transition-all ' + (status === s ? 'text-white' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]')}
                  style={status === s ? { background: 'var(--color-primary)' } : {}}>
                  {s === 'wishlist' ? '📖 Chci' : s === 'active' ? '🔖 Čtu' : '✅ Přečteno'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">Zrušit</button>
            <button onClick={handleSave} disabled={!valid} className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}>Přidat</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AreaCard({ area, items, onEdit, onDelete, onClick }: {
  area: LearningArea; items: KnowledgeItem[]
  onEdit: () => void; onDelete: () => void; onClick: () => void
}) {
  const { learned, total, pct } = getAreaProgress(items)
  const toLearn   = items.filter(i => i.status === 'to_learn').length
  const uncertain = items.filter(i => i.status === 'uncertain').length
  return (
    <div className="bg-[var(--surface)] rounded-[18px] overflow-hidden shadow-sm border border-[var(--border)] cursor-pointer active:scale-[0.98] transition-transform" onClick={onClick}>
      <div className="h-1.5 w-full" style={{ background: area.color }} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0" style={{ background: area.color + '18' }}>
            {area.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-[var(--text-primary)] leading-tight">{area.name}</div>
            {area.description && <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5 truncate">{area.description}</div>}
          </div>
          <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-[13px]">✏️</button>
            <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-red-400 text-[15px]">×</button>
          </div>
        </div>
        {total > 0 ? (
          <>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex gap-3 text-[11px]">
                <span className="text-green-600 font-semibold">✅ {learned}</span>
                {toLearn > 0 && <span className="text-blue-500 font-semibold">📋 {toLearn}</span>}
                {uncertain > 0 && <span className="text-amber-500 font-semibold">❓ {uncertain}</span>}
              </div>
              <span className="text-[12px] font-bold" style={{ color: area.color }}>{pct}%</span>
            </div>
            <div className="h-2 bg-[var(--surface-raised)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: area.color }} />
            </div>
          </>
        ) : (
          <div className="text-[12px] text-[var(--text-tertiary)] italic">Klikni pro přidání znalostí →</div>
        )}
      </div>
    </div>
  )
}

function BookRow({ item, onStatusChange, onDelete }: {
  item: LearningItem
  onStatusChange: (id: string, s: 'wishlist' | 'active' | 'done') => void
  onDelete: (id: string) => void
}) {
  const statusLabels: Record<string, string> = { wishlist: '📖', active: '🔖', done: '✅' }
  return (
    <div className="bg-[var(--surface)] rounded-[14px] px-4 py-3.5 flex items-center gap-3 shadow-sm border border-gray-50">
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0 bg-[var(--bg)]">{item.cover_emoji ?? '📚'}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{item.title}</div>
        {item.author && <div className="text-[11px] text-[var(--text-tertiary)]">{item.author}</div>}
        {item.status === 'active' && item.total_pages != null && item.current_page != null && (
          <div className="mt-1.5">
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-0.5">
              <span>{item.current_page}/{item.total_pages} str.</span>
              <span>{Math.round((item.current_page / item.total_pages) * 100)}%</span>
            </div>
            <div className="h-1 bg-[var(--surface-raised)] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: ((item.current_page / item.total_pages) * 100) + '%', background: 'var(--color-primary)' }} />
            </div>
          </div>
        )}
      </div>
      <button onClick={() => { const next = item.status === 'wishlist' ? 'active' : item.status === 'active' ? 'done' : 'wishlist'; onStatusChange(item.id, next) }}
        className="text-[18px] w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-raised)] transition-colors flex-shrink-0">
        {statusLabels[item.status]}
      </button>
      <button onClick={() => onDelete(item.id)}
        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-200 hover:text-red-400 text-[15px] flex-shrink-0">×</button>
    </div>
  )
}

export default function LearningPage() {
  const router = useRouter()
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID

  const [tab, setTab]               = useState<'areas' | 'books'>('areas')
  const [areas, setAreas]           = useState<LearningArea[]>([])
  const [allItems, setAllItems]     = useState<KnowledgeItem[]>([])
  const [books, setBooks]           = useState<LearningItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState('')
  const [showAddArea, setShowAddArea] = useState(false)
  const [editingArea, setEditingArea] = useState<LearningArea | null>(null)
  const [showAddBook, setShowAddBook] = useState(false)
  const [bookFilter, setBookFilter]   = useState<'all' | 'active' | 'done' | 'wishlist'>('all')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    Promise.all([fetchLearningAreas(userId), fetchAllKnowledgeItems(userId), fetchLearningItems(userId)])
      .then(([a, ki, b]) => { setAreas(a); setAllItems(ki); setBooks(b) })
      .catch(() => showToast('Chyba při načítání'))
      .finally(() => setLoading(false))
  }, [userId])

  async function handleAddArea(data: Partial<LearningArea>) {
    try {
      const area = await insertLearningArea({ user_id: userId, name: data.name!, icon: data.icon ?? '🧠', color: data.color ?? AREA_COLORS[0], description: data.description ?? null, sort_order: areas.length })
      setAreas(prev => [...prev, area]); showToast('Oblast přidána ✅')
    } catch { showToast('Chyba') }
  }

  async function handleEditArea(data: Partial<LearningArea>) {
    if (!editingArea) return
    try { await updateLearningArea(editingArea.id, data); setAreas(prev => prev.map(a => a.id === editingArea.id ? { ...a, ...data } : a)); showToast('Uloženo ✅') }
    catch { showToast('Chyba') }
  }

  async function handleDeleteArea(id: string) {
    if (!confirm('Smazat oblast a všechny znalosti v ní?')) return
    try { await deleteLearningArea(id); setAreas(prev => prev.filter(a => a.id !== id)); setAllItems(prev => prev.filter(i => i.area_id !== id)) }
    catch { showToast('Chyba') }
  }

  async function handleBookStatusChange(id: string, status: 'wishlist' | 'active' | 'done') {
    try {
      await updateLearningItem(id, { status, started_at: status === 'active' ? new Date().toISOString() : undefined, finished_at: status === 'done' ? new Date().toISOString() : undefined })
      setBooks(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    } catch { showToast('Chyba') }
  }

  async function handleDeleteBook(id: string) {
    try { await deleteLearningItem(id); setBooks(prev => prev.filter(b => b.id !== id)) } catch { showToast('Chyba') }
  }

  const learnedKnowledge = allItems.filter(i => i.status === 'learned').length
  const globalPct = allItems.length === 0 ? 0 : Math.round((learnedKnowledge / allItems.length) * 100)
  const booksRead = books.filter(b => b.status === 'done').length
  const filteredBooks = bookFilter === 'all' ? books : books.filter(b => b.status === bookFilter)

  return (
    <>
      <Header title="Učení" />

      <div className="px-4 pt-4">
        <div className="rounded-[18px] p-4 text-white" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] font-semibold opacity-70 uppercase tracking-wide">Celkový pokrok</div>
              <div className="text-[28px] font-extrabold leading-none mt-0.5">{globalPct}<span className="text-[16px] opacity-70">%</span></div>
            </div>
            <div className="flex gap-4 text-right">
              <div><div className="text-[20px] font-bold">{learnedKnowledge}</div><div className="text-[10px] opacity-60">naučeno</div></div>
              <div><div className="text-[20px] font-bold">{booksRead}</div><div className="text-[10px] opacity-60">knih</div></div>
              <div><div className="text-[20px] font-bold">{areas.length}</div><div className="text-[10px] opacity-60">oblastí</div></div>
            </div>
          </div>
          <div className="h-2 bg-[var(--surface)]/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[var(--surface)]/80 transition-all duration-700" style={{ width: globalPct + '%' }} />
          </div>
        </div>
      </div>

      <div className="flex px-4 pt-4 gap-1 border-b border-[var(--border)]">
        {([{ id: 'areas' as const, label: '🎯 Témata' }, { id: 'books' as const, label: '📚 Knihy' }]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="pb-3 px-2 text-[14px] font-semibold transition-colors"
            style={{ color: tab === t.id ? 'var(--color-primary)' : 'var(--text-tertiary)', borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {tab === 'areas' && (loading ? (
          <div className="text-center py-12 text-[var(--text-tertiary)] text-[13px]">Načítám…</div>
        ) : (
          <div className="flex flex-col gap-3">
            {areas.length === 0 && (
              <div className="text-center py-12">
                <div className="text-[40px] mb-3">🎯</div>
                <div className="text-[15px] font-semibold text-[var(--text-secondary)] mb-1">Žádné oblasti</div>
                <div className="text-[13px] text-[var(--text-tertiary)]">Přidej první oblast — např. Digitalizace zdravotnictví</div>
              </div>
            )}
            {areas.map(area => (
              <AreaCard key={area.id} area={area} items={allItems.filter(i => i.area_id === area.id)}
                onEdit={() => setEditingArea(area)} onDelete={() => handleDeleteArea(area.id)}
                onClick={() => router.push('/learning/' + area.id)} />
            ))}
          </div>
        ))}

        {tab === 'books' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {([{ id: 'all' as const, label: 'Vše' }, { id: 'active' as const, label: '🔖 Čtu' }, { id: 'done' as const, label: '✅ Přečteno' }, { id: 'wishlist' as const, label: '📖 Chci číst' }]).map(f => (
                <button key={f.id} onClick={() => setBookFilter(f.id)}
                  className={'px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ' + (bookFilter === f.id ? 'text-white' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]')}
                  style={bookFilter === f.id ? { background: 'var(--color-primary)' } : {}}>
                  {f.label}
                </button>
              ))}
            </div>
            {filteredBooks.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-tertiary)] text-[13px]">{books.length === 0 ? 'Žádné knihy — přidej první kliknutím na +' : 'Žádné knihy v tomto filtru'}</div>
            ) : filteredBooks.map(b => (
              <BookRow key={b.id} item={b} onStatusChange={handleBookStatusChange} onDelete={handleDeleteBook} />
            ))}
          </div>
        )}
      </div>

      <button onClick={() => tab === 'areas' ? setShowAddArea(true) : setShowAddBook(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white text-[26px] flex items-center justify-center shadow-lg z-40"
        style={{ background: 'var(--color-primary)' }}>+</button>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--surface-raised)] text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">{toast}</div>
      )}

      {showAddArea && <AddAreaModal onSave={handleAddArea} onClose={() => setShowAddArea(false)} />}
      {editingArea && <AddAreaModal initial={editingArea} onSave={handleEditArea} onClose={() => setEditingArea(null)} />}
      {showAddBook && <AddBookModal userId={userId} onSave={b => setBooks(prev => [b, ...prev])} onClose={() => setShowAddBook(false)} />}
    </>
  )
}
