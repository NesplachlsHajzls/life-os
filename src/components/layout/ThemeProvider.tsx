'use client'

import { useEffect } from 'react'

const THEME_KEY = 'life-os-theme'
const FONT_KEY  = 'life-os-font'

export const DEFAULT_THEME = 'ocean'
export const DEFAULT_FONT  = 'inter'

export function applyTheme(id: string) {
  const html = document.documentElement
  // Odeber všechny theme-* třídy
  html.classList.forEach(cls => { if (cls.startsWith('theme-')) html.classList.remove(cls) })
  html.classList.add(`theme-${id}`)
  try { localStorage.setItem(THEME_KEY, id) } catch {}
  window.dispatchEvent(new CustomEvent('life-os-theme-change', { detail: id }))
}

export function applyFont(id: string) {
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
