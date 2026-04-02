'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { useFinance } from '@/features/finance/hooks/useFinance'
import { useUser } from '@/hooks/useUser'
import { FinanceTabs } from '@/features/finance/components/FinanceTabs'
import type { CatMap } from '@/features/finance/utils'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

const PRESET_COLORS = [
  '#f97316', '#ef4444', '#ec4899', '#a855f7',
  '#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e',
  '#10b981', '#f59e0b', '#84cc16', '#94a3b8',
]

// ── Category Row ──────────────────────────────────────────────────

interface CatRowProps {
  name: string
  icon: string
  color: string
  onEdit: () => void
  onDelete: () => void
}

function CatRow({ name, icon, color, onEdit, onDelete }: CatRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] flex-shrink-0"
        style={{ background: color + '22' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold">{name}</div>
        <div className="w-12 h-2 rounded-full mt-1" style={{ background: color }} />
      </div>
      <button
        onClick={onEdit}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] transition-colors text-[15px]"
      >
        ✏️
      </button>
      <button
        onClick={onDelete}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-red-50 hover:text-red-500 transition-colors text-[15px]"
      >
        🗑️
      </button>
    </div>
  )
}

// ── Edit/Add Modal ────────────────────────────────────────────────

interface EditModalProps {
  initial?: { name: string; icon: string; color: string }
  onSave: (name: string, icon: string, color: string) => void
  onCancel: () => void
}

function EditModal({ initial, onSave, onCancel }: EditModalProps) {
  const [name,  setName]  = useState(initial?.name  ?? '')
  const [icon,  setIcon]  = useState(initial?.icon  ?? '📦')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])

  const isEdit = !!initial
  const valid  = name.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onCancel}>
      <div
        className="w-full max-w-md bg-[var(--surface)] rounded-t-[24px] p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-[16px] font-bold">{isEdit ? 'Upravit kategorii' : 'Nová kategorie'}</div>

        <div className="flex gap-3">
          <div className="w-[64px]">
            <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Ikona</div>
            <input
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-2 py-2 text-[22px] text-center outline-none focus:border-[var(--color-primary)]"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              maxLength={2}
            />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Název</div>
            <input
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nikotin, Sport, Hobby…"
              autoFocus
            />
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Barva</div>
          <div className="flex flex-wrap gap-2.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full transition-all"
                style={{
                  background: c,
                  outline: color === c ? `3px solid ${c}` : 'none',
                  outlineOffset: '2px',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg)] rounded-[12px]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[16px]"
            style={{ background: color + '22' }}>
            {icon}
          </div>
          <span className="text-[13px] font-semibold" style={{ color }}>
            {name || 'Náhled'}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]"
          >
            Zrušit
          </button>
          <button
            onClick={() => valid && onSave(name.trim(), icon, color)}
            disabled={!valid}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white transition-opacity"
            style={{ background: color, opacity: valid ? 1 : 0.4 }}
          >
            {isEdit ? 'Uložit' : 'Přidat'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────

function DeleteConfirm({ name, color, onConfirm, onCancel }: { name: string; color: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[var(--surface)] rounded-[20px] p-5" onClick={e => e.stopPropagation()}>
        <div className="text-[16px] font-bold mb-2">Smazat kategorii?</div>
        <div className="text-[13px] text-[var(--text-secondary)] mb-4">
          Kategorie <span className="font-semibold" style={{ color }}>{name}</span> bude odstraněna. Existující transakce s touto kategorií zůstanou nezměněny.
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-[12px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">
            Zrušit
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-[12px] bg-red-500 text-white text-[14px] font-bold">
            Smazat
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function KategoriePage() {
  const { user } = useUser()
  const userId = user?.id ?? DEMO_USER_ID

  const { expCats, saveExpCats, loading } = useFinance(userId)

  const [editingCat, setEditingCat] = useState<{ name: string; icon: string; color: string } | null>(null)
  const [addingNew,  setAddingNew]  = useState(false)
  const [deletingCat, setDeletingCat] = useState<string | null>(null)

  async function handleSaveEdit(oldName: string, newName: string, icon: string, color: string) {
    const updated: CatMap = {}
    for (const [k, v] of Object.entries(expCats)) {
      if (k === oldName) {
        updated[newName] = { icon, color }
      } else {
        updated[k] = v
      }
    }
    await saveExpCats(updated)
    setEditingCat(null)
  }

  async function handleAddNew(name: string, icon: string, color: string) {
    if (expCats[name]) return // Already exists
    const updated = { ...expCats, [name]: { icon, color } }
    await saveExpCats(updated)
    setAddingNew(false)
  }

  async function handleDelete(name: string) {
    const updated: CatMap = { ...expCats }
    delete updated[name]
    await saveExpCats(updated)
    setDeletingCat(null)
  }

  const cats = Object.entries(expCats)

  return (
    <>
      <Header title="Finance" />
      <FinanceTabs active="Kategorie" />

      <div className="p-4 flex flex-col gap-4">
        <div className="bg-[var(--surface)] rounded-[16px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
              Výdajové kategorie ({cats.length})
            </div>
            <button
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              + Přidat
            </button>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-[var(--text-tertiary)] text-[13px]">Načítám…</div>
          ) : cats.length === 0 ? (
            <div className="px-4 py-8 text-center text-[var(--text-tertiary)] text-[13px]">Žádné kategorie</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {cats.map(([name, cat]) => (
                <CatRow
                  key={name}
                  name={name}
                  icon={cat.icon}
                  color={cat.color}
                  onEdit={() => setEditingCat({ name, ...cat })}
                  onDelete={() => setDeletingCat(name)}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-[12px] text-[var(--text-tertiary)] text-center px-4">
          Přejmenování kategorie neovlivní existující transakce — ty se zobrazí se záložní ikonou.
        </p>
      </div>

      {/* Edit modal */}
      {editingCat && (
        <EditModal
          initial={editingCat}
          onSave={(newName, icon, color) => handleSaveEdit(editingCat.name, newName, icon, color)}
          onCancel={() => setEditingCat(null)}
        />
      )}

      {/* Add new modal */}
      {addingNew && (
        <EditModal
          onSave={handleAddNew}
          onCancel={() => setAddingNew(false)}
        />
      )}

      {/* Delete confirm */}
      {deletingCat && (
        <DeleteConfirm
          name={deletingCat}
          color={expCats[deletingCat]?.color ?? '#94a3b8'}
          onConfirm={() => handleDelete(deletingCat)}
          onCancel={() => setDeletingCat(null)}
        />
      )}
    </>
  )
}
