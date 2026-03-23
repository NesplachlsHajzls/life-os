'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import { LearningItem, fetchLearningItems, insertLearningItem, updateLearningItem, calculateXP, getLevelFromXP } from '@/features/learning/api'

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white z-50" style={{ background: 'var(--color-primary)' }}>
      {msg}
    </div>
  )
}

export default function LearningPage() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [items, setItems] = useState<LearningItem[]>([])
  const [tab, setTab] = useState('books')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!userId) return
    fetchLearningItems(userId).then(setItems).catch(() => setToast('Chyba'))
  }, [userId])

  if (!userId) return null

  const xp = calculateXP(items)
  const level = getLevelFromXP(xp)
  const doneCount = items.filter(i => i.status === 'done').length

  const books = items.filter(i => i.type === 'book')
  const reading = books.filter(b => b.status === 'active')
  const read = books.filter(b => b.status === 'done')
  const wishlist = books.filter(b => b.status === 'wishlist')

  const courses = items.filter(i => i.type === 'course')
  const activeCourses = courses.filter(c => c.status === 'active')
  const doneCourses = courses.filter(c => c.status === 'done')

  const markBookDone = async (id: string) => {
    try {
      await updateLearningItem(id, { status: 'done', finished_at: new Date().toISOString() })
      setItems(it => it.map(i => i.id === id ? { ...i, status: 'done' } : i))
    } catch (e) {
      setToast('Chyba')
    }
  }

  return (
    <>
      <Header title="📚 Učení" />
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="rounded-[14px] p-4 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
          <div className="text-[12px] opacity-75 mb-1">Level {level.level}</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[24px] font-bold">{xp} XP</span>
            <span className="text-[13px] opacity-75">{doneCount} hotových</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2"><div className="h-2 rounded-full transition-all" style={{ width: `${level.progress * 100}%`, background: '#fbbf24' }} /></div>
        </div>
      </div>
      <div className="flex gap-3 px-5 pt-4 border-b border-gray-200">
        {[
          { id: 'books', label: '📚 Knihy' },
          { id: 'courses', label: '🎓 Kurzy' },
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
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
        {tab === 'books' && (
          <div className="space-y-4">
            {reading.length > 0 && (
              <div>
                <div className="text-[12px] font-bold text-gray-500 mb-2">Čtu teď</div>
                {reading.map(item => (
                  <div key={item.id} className="rounded-[12px] border border-gray-200 p-3 mb-2 bg-white">
                    <div className="text-[13px] font-semibold mb-1">{item.title}</div>
                    {item.author && <div className="text-[11px] text-gray-500">{item.author}</div>}
                    {item.total_pages && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                          <span>{item.current_page}/{item.total_pages}</span>
                          <span>{Math.round(item.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${item.progress}%`, background: 'var(--color-primary)' }} /></div>
                      </div>
                    )}
                    <button onClick={() => markBookDone(item.id)} className="text-[11px] font-semibold text-white px-2 py-1 rounded-[6px] mt-2" style={{ background: 'var(--color-primary)' }}>Hotovo</button>
                  </div>
                ))}
              </div>
            )}
            {read.length > 0 && (
              <div>
                <div className="text-[12px] font-bold text-gray-500 mb-2">Přečtené</div>
                {read.map(item => (
                  <div key={item.id} className="rounded-[12px] border border-gray-200 p-3 mb-2 bg-white">
                    <div className="text-[13px] font-semibold">{item.title}</div>
                    {item.rating && <div className="text-[11px] text-gray-600 mt-1">⭐ {item.rating}/5</div>}
                  </div>
                ))}
              </div>
            )}
            {wishlist.length > 0 && (
              <div>
                <div className="text-[12px] font-bold text-gray-500 mb-2">Wishlist</div>
                {wishlist.map(item => (
                  <div key={item.id} className="rounded-[12px] border border-gray-200 p-3 mb-2 bg-white opacity-60">
                    <div className="text-[13px] font-semibold">{item.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'courses' && (
          <div className="space-y-4">
            {activeCourses.map(item => (
              <div key={item.id} className="rounded-[12px] border border-gray-200 p-3 bg-white">
                <div className="text-[13px] font-semibold mb-2">{item.title}</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2"><div className="h-2 rounded-full" style={{ width: `${item.progress}%`, background: 'var(--color-primary)' }} /></div>
                <span className="text-[11px] text-gray-600">{Math.round(item.progress)}%</span>
              </div>
            ))}
            {doneCourses.length > 0 && (
              <div>
                <div className="text-[12px] font-bold text-gray-500 mb-2">Hotové</div>
                {doneCourses.map(item => (
                  <div key={item.id} className="rounded-[12px] border border-gray-200 p-3 mb-2 bg-green-50">
                    <div className="text-[13px] font-semibold text-green-900">✓ {item.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Toast show={!!toast} msg={toast} />
    </>
  )
}
