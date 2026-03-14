'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { applyTheme, applyFont, getSavedTheme, getSavedFont } from '@/components/layout/ThemeProvider'

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

function SettingsSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-1 mb-2">{label}</div>
      <div className="bg-white rounded-[14px] shadow-card overflow-hidden">{children}</div>
    </div>
  )
}

export default function NastaveniPage() {
  const [activeTheme, setActiveTheme] = useState('ocean')
  const [activeFont,  setActiveFont]  = useState('inter')

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
