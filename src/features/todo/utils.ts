// ── Todo Smart Parser ─────────────────────────────────────────────

export interface ParsedTask {
  title: string
  priority: 1 | 2 | 3
  due_date: string | null
  url: string | null
  category_hint: string | null
}

// ── Priority detection ────────────────────────────────────────────
// Supports: p1 p2 p3 | !1 !2 !3 | !! (=3) | ! (=2)

function parsePriority(text: string): { priority: 1 | 2 | 3; clean: string } {
  let priority: 1 | 2 | 3 = 1
  let clean = text

  // "!!!" or "!3" or "p3"
  if (/!!!|!3|p3/i.test(clean)) { priority = 3; clean = clean.replace(/!!!|!3|p3/gi, '') }
  else if (/!!|!2|p2/i.test(clean)) { priority = 2; clean = clean.replace(/!!|!2|p2/gi, '') }
  else if (/!1|p1/i.test(clean)) { priority = 1; clean = clean.replace(/!1|p1/gi, '') }
  // single ! at word boundary = priority 2
  else if (/\s!(\s|$)/.test(clean)) { priority = 2; clean = clean.replace(/\s!(\s|$)/, ' ') }

  return { priority, clean: clean.trim() }
}

// ── Date detection ────────────────────────────────────────────────
// Supports: dnes, zítra, pozítří, příští týden, pondělí–neděle, D.M. or D.M.YYYY

function parseDate(text: string): { date: string | null; clean: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let date: Date | null = null
  let clean = text

  const addDays = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return d
  }

  const DAY_MAP: Record<string, number> = {
    pondělí: 1, úterý: 2, středa: 3, čtvrtek: 4, pátek: 5, sobota: 6, neděle: 0,
    po: 1, út: 2, st: 3, čt: 4, pá: 5, so: 6, ne: 0,
  }

  const lower = clean.toLowerCase()

  if (/\bdnes\b/.test(lower)) {
    date = today; clean = clean.replace(/\bdnes\b/i, '')
  } else if (/\bzítra\b|\bzitra\b/.test(lower)) {
    date = addDays(1); clean = clean.replace(/\bzítra\b|\bzitra\b/i, '')
  } else if (/\bpozítří\b|\bpozitri\b/.test(lower)) {
    date = addDays(2); clean = clean.replace(/\bpozítří\b|\bpozitri\b/i, '')
  } else if (/příští týden|pristi tyden/i.test(lower)) {
    date = addDays(7); clean = clean.replace(/příští týden|pristi tyden/i, '')
  } else {
    // Match day names
    for (const [day, dow] of Object.entries(DAY_MAP)) {
      const re = new RegExp(`\\b${day}\\b`, 'i')
      if (re.test(lower)) {
        const current = today.getDay()
        let diff = dow - current
        if (diff <= 0) diff += 7
        date = addDays(diff)
        clean = clean.replace(re, '')
        break
      }
    }
    // Match D.M. or D.M.YYYY
    if (!date) {
      const m = clean.match(/\b(\d{1,2})\.(\d{1,2})\.?(\d{4})?\b/)
      if (m) {
        const year = m[3] ? +m[3] : today.getFullYear()
        date = new Date(year, +m[2] - 1, +m[1])
        clean = clean.replace(m[0], '')
      }
    }
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  return { date: date ? fmt(date) : null, clean: clean.trim() }
}

// ── URL detection ─────────────────────────────────────────────────

function parseUrl(text: string): { url: string | null; clean: string } {
  const m = text.match(/https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|cz|sk|io|app|dev|net|org)[^\s]*/i)
  if (!m) return { url: null, clean: text }
  let url = m[0]
  if (!url.startsWith('http')) url = 'https://' + url
  return { url, clean: text.replace(m[0], '').trim() }
}

// ── Category hint ─────────────────────────────────────────────────
// Simple keyword matching — can be extended with user categories

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Animinimal: ['animinimal', 'oblečení', 'tričko', 'mikina', 'eshop'],
  Práce:      ['práce', 'klient', 'faktura', 'schůzka', 'meeting', 'i.ca', 'ica'],
  Byt:        ['byt', 'doma', 'nájem', 'ikea', 'jysk', 'oprava', 'nákup'],
}

function parseCategoryHint(text: string, categories: string[]): string | null {
  const lower = text.toLowerCase()
  // Check user category names directly
  for (const cat of categories) {
    if (lower.includes(cat.toLowerCase())) return cat
  }
  // Check keyword map
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) return cat
  }
  return null
}

// ── Main parse function ───────────────────────────────────────────

export function parseTaskInput(
  raw: string,
  categories: string[] = []
): ParsedTask {
  let text = raw.trim()

  const { priority, clean: c1 } = parsePriority(text)
  text = c1

  const { url, clean: c2 } = parseUrl(text)
  text = c2

  const { date, clean: c3 } = parseDate(text)
  text = c3

  const category_hint = parseCategoryHint(raw, categories) // use original for hints

  // Capitalize first letter
  const title = text.replace(/\s+/g, ' ').trim()
  const finalTitle = title.charAt(0).toUpperCase() + title.slice(1) || 'Nový úkol'

  return { title: finalTitle, priority, due_date: date, url, category_hint }
}

// ── Priority display helpers ──────────────────────────────────────

export const PRIORITY_DOTS = {
  1: { label: '●',   color: 'var(--border-strong)', title: 'Nízká'   },
  2: { label: '●●',  color: '#f59e0b', title: 'Střední'  },
  3: { label: '●●●', color: '#ef4444', title: 'Vysoká'  },
} as const

export function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
  const DAY = ['Ne','Po','Út','St','Čt','Pá','So']
  const d = date.getDate()
  const m = date.getMonth() + 1
  if (diff === 0) return 'Dnes'
  if (diff === 1) return 'Zítra'
  if (diff === -1) return 'Včera'
  return `${DAY[date.getDay()]} ${d}. ${m}.`
}

export function isDueSoon(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  return date <= today
}
