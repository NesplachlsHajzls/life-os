'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'

// ── Types ─────────────────────────────────────────────────────────

interface ShoppingItem {
  id: string
  name: string
  qty: string     // e.g. "2 ks", "500 g" — empty if not specified
  checked: boolean
}

// ── Local storage ─────────────────────────────────────────────────

const STORAGE_KEY = 'life-os-shopping'

function loadItems(): ShoppingItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ShoppingItem[]
  } catch {}
  return []
}

function persistItems(items: ShoppingItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
}

// ── Parse input text ──────────────────────────────────────────────
// "mléko 2l"   → { name: "mléko",  qty: "2l" }
// "jogurt 4ks" → { name: "jogurt", qty: "4ks" }
// "2x chleba"  → { name: "chleba", qty: "2x" }
// "chleba"     → { name: "chleba", qty: "" }

const UNITS = 'ks|kg|dkg|g|l|ml|x|×|bal|balení'

function parseInput(text: string): { name: string; qty: string } {
  const t = text.trim()

  // name + number+unit at the end: "mléko 2l", "jogurt 4 ks"
  const suffixRe = new RegExp(`^(.+?)\\s+(\\d+[,.]?\\d*\\s*(?:${UNITS})?)$`, 'i')
  const suffix = t.match(suffixRe)
  if (suffix) return { name: suffix[1].trim(), qty: suffix[2].trim() }

  // number+unit at the start: "2x mléko", "500g tvarohu"
  const prefixRe = new RegExp(`^(\\d+[,.]?\\d*\\s*(?:${UNITS})?)\\s+(.+)$`, 'i')
  const prefix = t.match(prefixRe)
  if (prefix) return { name: prefix[2].trim(), qty: prefix[1].trim() }

  return { name: t, qty: '' }
}

// ── ItemRow ───────────────────────────────────────────────────────

function ItemRow({ item, borderBottom, onToggle, onDelete }: {
  item: ShoppingItem
  borderBottom: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-gray-50 ${
        borderBottom ? 'border-b border-gray-100' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        className={`w-[26px] h-[26px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          item.checked
            ? 'bg-orange-400 border-orange-400'
            : 'border-gray-300 hover:border-orange-400'
        }`}
      >
        {item.checked && <span className="text-[11px] text-white font-bold leading-none">✓</span>}
      </button>

      {/* Name + qty */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className={`text-[15px] font-semibold leading-snug ${
          item.checked ? 'line-through text-gray-300' : 'text-gray-800'
        }`}>
          {item.name}
        </span>
        {item.qty && (
          <span className={`text-[12px] font-medium flex-shrink-0 ${
            item.checked ? 'text-gray-300' : 'text-gray-400'
          }`}>
            {item.qty}
          </span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="w-7 h-7 flex items-center justify-center text-[18px] text-gray-200 hover:text-red-400 transition-colors flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function BytPage() {
  const [items,   setItems]   = useState<ShoppingItem[]>([])
  const [input,   setInput]   = useState('')
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setItems(loadItems())
    setMounted(true)
  }, [])

  function commit(next: ShoppingItem[]) {
    setItems(next)
    persistItems(next)
  }

  function addItem() {
    const text = input.trim()
    if (!text) return
    const { name, qty } = parseInput(text)
    const newItem: ShoppingItem = { id: Date.now().toString(), name, qty, checked: false }
    // New unchecked items go to the top of the unchecked section
    const unchecked = items.filter(i => !i.checked)
    const checked   = items.filter(i =>  i.checked)
    commit([...unchecked, newItem, ...checked])
    setInput('')
    inputRef.current?.focus()
  }

  function toggleItem(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const updated = { ...item, checked: !item.checked }
    const rest = items.filter(i => i.id !== id)
    if (updated.checked) {
      // Moving to checked — put at bottom
      commit([...rest.filter(i => !i.checked), ...rest.filter(i => i.checked), updated])
    } else {
      // Un-checking — put back at top of unchecked
      commit([updated, ...rest.filter(i => !i.checked), ...rest.filter(i => i.checked)])
    }
  }

  function deleteItem(id: string) {
    commit(items.filter(i => i.id !== id))
  }

  const unchecked = items.filter(i => !i.checked)
  const checked   = items.filter(i =>  i.checked)
  const total     = items.length
  const remaining = unchecked.length

  if (!mounted) return null

  return (
    <>
      <Header title="🛒 Nákupní seznam" />

      <div className="p-4 flex flex-col gap-4">

        {/* Hero stats — only show when there's something */}
        {total > 0 && (
          <div
            className="rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
          >
            <div className="text-[13px] font-semibold opacity-75 mb-1">Zbývá nakoupit</div>
            <div className="flex items-end gap-2">
              <span className="text-[44px] font-extrabold leading-none">{remaining}</span>
              <span className="text-[16px] font-semibold opacity-60 mb-1.5">z {total} položek</span>
            </div>
            {remaining === 0 && total > 0 && (
              <div className="mt-1.5 text-[13px] font-semibold opacity-90">🎉 Vše nakoupeno!</div>
            )}
          </div>
        )}

        {/* Quick add input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 bg-white rounded-[14px] border border-gray-200 px-4 py-3 text-[14px] shadow-card outline-none focus:border-orange-400 transition-colors placeholder:text-gray-300"
            placeholder="mléko 2l, chleba, jogurt 4ks…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            autoFocus
          />
          <button
            onClick={addItem}
            disabled={!input.trim()}
            className="w-12 h-12 rounded-[14px] text-white text-[22px] font-bold flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-30"
            style={{ background: '#f97316' }}
          >
            +
          </button>
        </div>

        {/* Empty state */}
        {total === 0 && (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="text-[60px] mb-3">🛒</div>
            <div className="text-[17px] font-bold text-gray-700">Seznam je prázdný</div>
            <div className="text-[13px] text-gray-400 mt-1.5">Napiš co potřebuješ nakoupit</div>
          </div>
        )}

        {/* Unchecked items */}
        {unchecked.length > 0 && (
          <div className="bg-white rounded-[16px] shadow-card overflow-hidden">
            {unchecked.map((item, i) => (
              <ItemRow
                key={item.id}
                item={item}
                borderBottom={i < unchecked.length - 1}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            ))}
          </div>
        )}

        {/* Checked / done items */}
        {checked.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                Hotovo ({checked.length})
              </span>
              <button
                onClick={() => commit(items.filter(i => !i.checked))}
                className="text-[12px] font-semibold text-red-400 hover:text-red-500 transition-colors"
              >
                Smazat hotové
              </button>
            </div>
            <div className="bg-white rounded-[16px] shadow-card overflow-hidden">
              {checked.map((item, i) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  borderBottom={i < checked.length - 1}
                  onToggle={toggleItem}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          </div>
        )}

        {/* Clear all */}
        {total > 0 && (
          <button
            onClick={() => commit([])}
            className="w-full py-3 rounded-[14px] border border-gray-100 bg-gray-50 text-gray-400 text-[13px] font-semibold hover:bg-red-50 hover:text-red-400 hover:border-red-100 transition-colors"
          >
            Vymazat celý seznam
          </button>
        )}

      </div>
    </>
  )
}
