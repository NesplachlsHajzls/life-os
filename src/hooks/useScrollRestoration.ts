import { useEffect } from 'react'

/**
 * Saves and restores scroll position of the <main> element.
 * @param key      Unique key per page (e.g. 'prace', 'poznamky')
 * @param ready    Set to true once data is loaded so scroll restore fires after paint
 */
export function useScrollRestoration(key: string, ready: boolean = true) {
  // Continuously save scroll position while user scrolls
  useEffect(() => {
    const el = document.querySelector('main')
    if (!el) return
    const handler = () => {
      try { sessionStorage.setItem(`scroll_${key}`, String(el.scrollTop)) } catch { /* ignore */ }
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [key])

  // Restore scroll position once content is ready
  useEffect(() => {
    if (!ready) return
    try {
      const saved = sessionStorage.getItem(`scroll_${key}`)
      if (!saved) return
      const top = parseInt(saved, 10)
      const el = document.querySelector('main')
      if (!el) return
      // Small delay ensures DOM is fully painted before scrolling
      const t = setTimeout(() => { el.scrollTo({ top, behavior: 'instant' as ScrollBehavior }) }, 60)
      return () => clearTimeout(t)
    } catch { /* ignore */ }
  }, [key, ready])
}
