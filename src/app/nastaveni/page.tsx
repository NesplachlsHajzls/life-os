'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { applyTheme, applyFont, getSavedTheme, getSavedFont } from '@/components/layout/ThemeProvider'
import { useUser } from '@/hooks/useUser'
import { useCategories } from '@/hooks/useCategories'
import { AppCategory } from '@/features/categories/api'

const THEMES = [
  { id: 'ocean',     name: 'Oceán',       color: '#1E4B8E' },
  { id: 'indigo',    name: 'Indigo',      color: '#4F46E5' },
  { id: 'violet',    name: 'Fialová',     color: '#7C3AED' },
  { id: 'fuchsia',   name: 'Fuchsia',     color: '#A21CAF' },
  { id: 'rose',      name: 'Růžová',      color: '#E11D48' },
  { id: 'coral',     name: 'Korál',       color: '#C2410C' },
  { id: 'amber',     name: 'Zlatá',       color: '#B45309' },
  { id: 'emerald',   name: 'Smaragd',     color: '#047857' },
  { id: 'forest',    name: 'Les',         color: '#1A5C32' },
  { id: 'cyan',      name: 'Azurová',     color: '#0E7490' },
  { id: 'sky',       name: 'Obloha',      color: '#0369A1' },
  { id: 'lavender',  name: 'Levandule',   color: '#5B3A8C' },
  { id: 'sunset',    name: 'Západ',       color: '#B84800' },
  { id: 'slate',     name: 'Břidlice',    color: '#334155' },
  { id: 'charcoal',  name: 'Uhlí',        color: '#1A1F2E' },
]

const FONTS = [
  { id: 'inter',         name: 'Inter',         sample: 'Moderní & čistý' },
  { id: 'poppins',       name: 'Poppins',       sample: 'Zaoblený & přívětivý' },
  { id: 'dm-sans',       name: 'DM Sans',       sample: 'Minimalistický' },
  { id: 'nunito',        name: 'Nunito',        sample: 'Přátelský & kulatý' },
  { id: 'montserrat',    name: 'Montserrat',    sample: 'Profesionální' },
  { id: 'space-grotesk', name: 'Space Grotesk', sample: 'Technický' },
  { id: 'josefin',       name: 'Josefin Sans',  sample: 'Geometrický' },
  { id: 'syne',          name: 'Syne',          sample: 'Výrazný' },
  { id: 'quicksand',     name: 'Quicksand',     sample: 'Hravý & lehký' },
  { id: 'outfit',        name: 'Outfit',        sample: 'Elegantní' },
]

const CAT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1',
  '#a855f7', '#94a3b8',
]

const CAT_ICONS = [
  '👤', '💼', '💪', '💰', '🚨', '🏠', '🏥', '📦',
  '✈️', '🎉', '📚', '🎯', '🛒', '🔔', '❤️', '🌱',
  '🎮', '🍕', '🚗', '🐶', '🎵', '📸', '🧠', '⚽',
]

function SettingsSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-1 mb-2">{label}</div>
      <div className="bg-white rounded-[14px] shadow-card overflow-hidden">{children}</div>
    </div>
  )
}

// ── CategoryForm ──────────────────────────────────────────────────

function CategoryForm({ initial, onSave, onCancel }: {
  initial?: Partial<AppCategory>
  onSave: (values: { name: string; icon: string; color: string }) => void
  onCancel: () => void
}) {
  const [name,  setName]  = useState(initial?.name  ?? '')
  const [icon,  setIcon]  = useState(initial?.icon  ?? '📦')
  const [color, setColor] = useState(initial?.color ?? '#3b82f6')

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
      {/* Icon picker */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CAT_ICONS.map(em => (
          <button key={em}
            onClick={() => setIcon(em)}
            className={`w-8 h-8 rounded-lg text-[16px] flex items-center justify-center transition-all ${icon === em ? 'bg-white shadow-sm ring-2 ring-[var(--color-primary)]' : 'hover:bg-white'}`}
          >{em}</button>
        ))}
      </div>

      {/* Name */}
      <input
        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)] mb-3"
        placeholder="Název kategorie…"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      {/* Color picker */}
      <div className="flex flex-wrap gap-2 mb-3">
        {CAT_COLORS.map(c => (
          <button key={c}
            onClick={() => setColor(c)}
            className="w-7 h-7 rounded-full transition-all"
            style={{
              background: c,
              outline: color === c ? `3px solid ${c}` : '2px solid transparent',
              outlineOffset: '2px',
              boxShadow: color === c ? `0 0 0 4px ${c}22` : 'none',
            }}
          />
        ))}
      </div>

      {/* Preview + actions */}
      <div className="flex items-center gap-2">
        <span
          className="text-[12px] font-semibold px-3 py-1 rounded-lg border"
          style={{ background: color + '18', borderColor: color, color }}
        >{icon} {name || 'Náhled'}</span>
        <div className="flex-1" />
        <button onClick={onCancel} className="px-3 py-1.5 text-[12px] text-gray-500 rounded-lg hover:bg-gray-200">Zrušit</button>
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), icon, color })}
          disabled={!name.trim()}
          className="px-3 py-1.5 text-[12px] text-white font-semibold rounded-lg disabled:opacity-40"
          style={{ background: 'var(--color-primary)' }}
        >Uložit</button>
      </div>
    </div>
  )
}

// ── CategoryManager ───────────────────────────────────────────────

function CategoryManager({ userId }: { userId: string }) {
  const {
    categories, loading,
    addCategory, updateCategory, removeCategory, reorder,
  } = useCategories(userId)

  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [showAdd,    setShowAdd]    = useState(false)

  if (loading) {
    return <div className="px-4 py-4 text-[13px] text-gray-400">Načítám…</div>
  }

  return (
    <div>
      {categories.map((cat, idx) => (
        <div key={cat.id}>
          {editingId === cat.id ? (
            <CategoryForm
              initial={cat}
              onSave={vals => { updateCategory({ ...cat, ...vals }); setEditingId(null) }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
              {/* Color dot + icon + name */}
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] flex-shrink-0"
                style={{ background: cat.color + '22' }}
              >{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: cat.color }}
                >{cat.name}</span>
              </div>

              {/* Reorder */}
              <button
                onClick={() => reorder(idx, idx - 1)}
                disabled={idx === 0}
                className="w-6 h-6 flex items-center justify-center text-gray-300 disabled:opacity-20 hover:text-gray-600 text-[12px]"
              >▲</button>
              <button
                onClick={() => reorder(idx, idx + 1)}
                disabled={idx === categories.length - 1}
                className="w-6 h-6 flex items-center justify-center text-gray-300 disabled:opacity-20 hover:text-gray-600 text-[12px]"
              >▼</button>

              {/* Edit */}
              <button
                onClick={() => setEditingId(cat.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 text-[13px]"
              >✏️</button>

              {/* Delete */}
              <button
                onClick={() => removeCategory(cat.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 text-[14px]"
              >×</button>
            </div>
          )}
        </div>
      ))}

      {/* Add form or button */}
      {showAdd ? (
        <CategoryForm
          onSave={vals => {
            const id = vals.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now()
            addCategory({ id, ...vals })
            setShowAdd(false)
          }}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-[13px] font-semibold text-[var(--color-primary)] hover:bg-gray-50 transition-colors"
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[14px]" style={{ background: 'var(--color-primary)' }}>+</span>
          Přidat kategorii
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function NastaveniPage() {
  const [activeTheme, setActiveTheme] = useState('ocean')
  const [activeFont,  setActiveFont]  = useState('inter')
  const { user } = useUser()

  useEffect(() => {
    setActiveTheme(getSavedTheme())
    setActiveFont(getSavedFont())
  }, [])

  function handleTheme(id: string) {
    setActiveTheme(id)
    applyTheme(id)
  }

  function handleFont(id: string) {
    setActiveFont(id)
    applyFont(id)
  }

  return (
    <>
      <Header title="Nastavení ⚙️" />
      <div className="p-4">

        {/* Kategorie */}
        <SettingsSection label="Kategorie">
          {user
            ? <CategoryManager userId={user.id} />
            : <div className="px-4 py-3 text-[13px] text-gray-400">Přihlas se pro správu kategorií.</div>
          }
        </SettingsSection>

        {/* Téma */}
        <SettingsSection label="Barevné téma">
          <div className="p-4">
            <div className="grid grid-cols-5 gap-3">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => handleTheme(t.id)}
                  className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full transition-all"
                    style={{
                      background: t.color,
                      outline: activeTheme === t.id ? `3px solid ${t.color}` : '2px solid transparent',
                      outlineOffset: '2px',
                      boxShadow: activeTheme === t.id ? `0 0 0 5px ${t.color}22` : 'none',
                    }} />
                  <span className="text-[9px] font-semibold text-gray-500 text-center leading-tight">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </SettingsSection>

        {/* Font */}
        <SettingsSection label="Písmo">
          <div className="flex flex-col">
            {FONTS.map((f, i) => (
              <button key={f.id} onClick={() => handleFont(f.id)}
                className={`flex items-center justify-between px-4 py-3.5 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''} ${activeFont === f.id ? 'bg-[var(--color-primary-pale)]' : 'hover:bg-gray-50'}`}>
                <div className="text-left">
                  <div className="text-[14px] font-semibold text-gray-900" style={{ fontFamily: `'${f.name}', sans-serif` }}>{f.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5" style={{ fontFamily: `'${f.name}', sans-serif` }}>{f.sample}</div>
                </div>
                {activeFont === f.id && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ background: 'var(--color-primary)' }}>✓</div>
                )}
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* Finance */}
        <SettingsSection label="Finance">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <span className="text-[20px]">💱</span>
            <div className="flex-1">
              <div className="text-[14px] font-semibold">Měna</div>
              <div className="text-[12px] text-gray-400 mt-0.5">CZK — Česká koruna</div>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </div>
        </SettingsSection>

        {/* Data */}
        <SettingsSection label="Data">
          <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-50">
            <span className="text-[20px]">🗑</span>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-red-500">Smazat účet</div>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </div>
        </SettingsSection>

      </div>
    </>
  )
}
