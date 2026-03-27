'use client'

import { useEffect } from 'react'

const THEME_KEY = 'life-os-theme'
const FONT_KEY  = 'life-os-font'

export const DEFAULT_THEME = 'terracotta'
export const DEFAULT_FONT  = 'dm-sans'

// Google Fonts query strings — only loaded on demand when the user selects that font.
// Inter is preloaded in layout.tsx; all others are lazy-injected here.
const FONT_URLS: Record<string, string> = {
  'poppins':       'Poppins:wght@400;500;600;700;800;900',
  'dm-sans':       'DM+Sans:wght@400;500;600;700;800;900',
  'nunito':        'Nunito:wght@400;500;600;700;800;900',
  'montserrat':    'Montserrat:wght@400;500;600;700;800;900',
  'space-grotesk': 'Space+Grotesk:wght@400;500;600;700',
  'josefin':       'Josefin+Sans:wght@400;500;600;700',
  'syne':          'Syne:wght@400;500;600;700;800',
  'quicksand':     'Quicksand:wght@400;500;600;700',
  'outfit':        'Outfit:wght@400;500;600;700;800;900',
}

function ensureFontLoaded(id: string) {
  if (id === 'inter' || id === 'dm-sans') return  // preloaded in layout.tsx
  const linkId = `gfont-${id}`
  if (document.getElementById(linkId)) return  // already injected
  const family = FONT_URLS[id]
  if (!family) return
  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
  document.head.appendChild(link)
}

export function applyTheme(id: string) {
  const html = document.documentElement
  html.classList.forEach(cls => { if (cls.startsWith('theme-')) html.classList.remove(cls) })
  html.classList.add(`theme-${id}`)
  try { localStorage.setItem(THEME_KEY, id) } catch {}
  window.dispatchEvent(new CustomEvent('life-os-theme-change', { detail: id }))
}

export function applyFont(id: string) {
  ensureFontLoaded(id)
  const html = document.documentElement
  html.classList.forEach(cls => { if (cls.startsWith('font-')) html.classList.remove(cls) })
  if (id !== 'system') html.classList.add(`font-${id}`)
  try { localStorage.setItem(FONT_KEY, id) } catch {}
  window.dispatchEvent(new CustomEvent('life-os-font-change', { detail: id }))
}

export function getSavedTheme(): string {
  try { return localStorage.getItem(THEME_KEY) ?? DEFAULT_THEME } catch { return DEFAULT_THEME }
}

export function getSavedFont(): string {
  try { return localStorage.getItem(FONT_KEY) ?? DEFAULT_FONT } catch { return DEFAULT_FONT }
}

export function ThemeProvider() {
  useEffect(() => {
    applyTheme(getSavedTheme())
    applyFont(getSavedFont())
  }, [])
  return null
}
