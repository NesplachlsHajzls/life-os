// ── Finance Utility Functions ─────────────────────────────────────
// Ported from FinanceTracker.jsx — all parsing & helper logic

export const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function mKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function mLabel(mk: string): string {
  const [y, m] = mk.split('-')
  return `${MONTHS[+m - 1]} ${y}`
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('cs-CZ').format(Math.round(n))
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Category defaults ─────────────────────────────────────────────

export type CatMap = Record<string, { icon: string; color: string }>

export const DEFAULT_EXP_CATS: CatMap = {
  Jídlo:        { icon: '🍽️',  color: '#f97316' },
  Doprava:      { icon: '🚗',  color: '#3b82f6' },
  Bydlení:      { icon: '🏠',  color: '#8b5cf6' },
  Zábava:       { icon: '🎮',  color: '#ec4899' },
  Zdraví:       { icon: '💊',  color: '#22c55e' },
  Oblečení:     { icon: '👕',  color: '#f59e0b' },
  Vzdělání:     { icon: '📚',  color: '#06b6d4' },
  Ostatní:      { icon: '📦',  color: '#94a3b8' },
}

export const DEFAULT_INC_CATS: CatMap = {
  Výplata:      { icon: '💼',  color: '#22c55e' },
  Brigáda:      { icon: '🛠️', color: '#f59e0b' },
  Faktura:      { icon: '📄',  color: '#3b82f6' },
  Ostatní:      { icon: '💰',  color: '#94a3b8' },
}

export const DEFAULT_COM_CATS: CatMap = {
  Bydlení:      { icon: '🏠',  color: '#8b5cf6' },
  Předplatné:   { icon: '📱',  color: '#ec4899' },
  Pojištění:    { icon: '🛡️', color: '#3b82f6' },
  Splátky:      { icon: '💳',  color: '#f97316' },
  Ostatní:      { icon: '📦',  color: '#94a3b8' },
}

export const DEFAULT_WALLETS = [
  { id: 'w1', name: 'Banka',    icon: '🏦', color: '#3b82f6', balance: 0, type: 'bank' },
  { id: 'w2', name: 'Hotovost', icon: '💵', color: '#22c55e', balance: 0, type: 'cash' },
]

// ── Keyword maps for auto-categorization ─────────────────────────

const EXP_KEYWORDS: Record<string, string[]> = {
  Jídlo:       ['jídlo','oběd','snídaně','večeře','restaurace','kavárna','pizza','burger','kebab','sushi','mc','kfc','albert','lidl','billa','tesco','kaufland','potraviny','rozvoz','delivery','wolt','bolt food','dáme jídlo'],
  Doprava:     ['taxi','uber','bolt','benzin','nafta','parkování','autobus','vlak','metro','dálnice','mýtné','cd','regiojet','bla bla','flixbus','kolo','mhd','jizdenka','lístek'],
  Bydlení:     ['nájem','elektřina','plyn','voda','internet','telefon','ikea','jysk','bauhaus','obi','leroy','rohlik','mall','alza','datart','nákup'],
  Zábava:      ['netflix','spotify','disney','hbo','apple tv','youtube','cinema','kino','divadlo','hra','steam','playstation','xbox','koncert','festival','výlet','dovolená','hotel','airbnb'],
  Zdraví:      ['lékař','doktor','lék','lékárna','vitamín','doplněk','gym','fitko','fitness','bazén','masáž'],
  Oblečení:    ['h&m','zara','reserved','pull','mango','oblečení','boty','košile','kalhoty','tepláky','tričko'],
  Vzdělání:    ['kurz','kniha','udemy','coursera','škola','školné','seminář','workshop','certifikát'],
}

const INC_KEYWORDS: Record<string, string[]> = {
  Výplata:     ['výplata','plat','mzda','salary'],
  Brigáda:     ['brigáda','přivýdělek','DPP','DPČ'],
  Faktura:     ['faktura','invoice','odměna','honorář','provize'],
}

// ── Parsing functions ─────────────────────────────────────────────

export function extractAmount(text: string): number | null {
  const m = text.match(/\d[\d\s]*([.,]\d{1,2})?/)
  if (!m) return null
  const raw = m[0].replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(raw)
  return isNaN(n) ? null : n
}

export function matchCategory(text: string, cats: CatMap, keywords: Record<string, string[]>): string {
  const lower = text.toLowerCase()
  for (const [cat, kws] of Object.entries(keywords)) {
    if (cat in cats && kws.some(kw => lower.includes(kw))) return cat
  }
  return Object.keys(cats)[Object.keys(cats).length - 1] || 'Ostatní'
}

export function extractDescription(text: string, wallets: Array<{ name: string }> = []): string {
  let s = text
  // Remove amount
  s = s.replace(/\d[\d\s]*([.,]\d{1,2})?/, '')
  // Remove known wallet names (fuzzy: strip if word appears close to a wallet name)
  for (const w of wallets) {
    const pattern = new RegExp(`[-–]?\\s*${w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi')
    s = s.replace(pattern, '')
  }
  // Remove generic wallet keywords
  s = s.replace(/[-–]?\s*(banka|bankovní|hotovost|cash|karta|card|ucet|účet|stravenky?|stravnky?)/gi, '')
  return s.replace(/\s+/g, ' ').trim().replace(/^[-–,\s]+|[-–,\s]+$/g, '') || 'Výdaj'
}

export interface ParsedEntry {
  amount: number
  description: string
  category: string
  date: string
  error?: boolean
}

export function parseEntry(
  text: string,
  cats: CatMap,
  _walletHint: string,
  type: 'exp' | 'inc',
  wallets: Array<{ name: string }> = []
): ParsedEntry & { error?: boolean } {
  const amount = extractAmount(text)
  if (!amount) return { amount: 0, description: '', category: '', date: todayStr(), error: true }
  const keywords = type === 'exp' ? EXP_KEYWORDS : INC_KEYWORDS
  const category = matchCategory(text, cats, keywords)
  const description = extractDescription(text, wallets) || (type === 'exp' ? 'Výdaj' : 'Příjem')
  return { amount, description, category, date: todayStr() }
}

// Normalize string: lowercase + remove diacritics
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Simple edit distance (Levenshtein) for short strings
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    }
  }
  return dp[m][n]
}

// Check if a query word fuzzy-matches a wallet name (tolerates typos)
function fuzzyMatchWallet(query: string, walletName: string): boolean {
  const q = norm(query)
  const w = norm(walletName)
  // Exact substring match
  if (q.includes(w) || w.includes(q)) return true
  // Split text into words and check each against wallet name words
  const qWords = q.split(/\s+/)
  const wWords = w.split(/\s+/)
  for (const qw of qWords) {
    if (qw.length < 3) continue
    for (const ww of wWords) {
      if (ww.length < 3) continue
      // Allow 1 typo for 4-6 char words, 2 typos for longer
      const maxDist = qw.length >= 7 ? 2 : 1
      if (editDistance(qw, ww) <= maxDist) return true
    }
  }
  return false
}

export function parseWalletHint(text: string, wallets: Array<{ id: string; name: string }>): string | null {
  // Try fuzzy match against each wallet name (no dash required)
  for (const w of wallets) {
    if (fuzzyMatchWallet(text, w.name)) return w.id
  }
  // Fallback keywords for common wallet types
  const lower = norm(text)
  const words = lower.split(/\s+/)
  for (const word of words) {
    // "ucet" / "account" → bank
    if (editDistance(word, 'ucet') <= 1 || editDistance(word, 'banka') <= 1) {
      const match = wallets.find(w => norm(w.name).includes('bank') || norm(w.name).includes('ucet'))
      if (match) return match.id
    }
    // "hotovost" / "cash" → cash wallet
    if (editDistance(word, 'hotovost') <= 2 || editDistance(word, 'cash') <= 1) {
      const match = wallets.find(w => norm(w.name).includes('hotov') || norm(w.name).includes('cash'))
      if (match) return match.id
    }
    // "karta" / "card" → card wallet
    if (editDistance(word, 'karta') <= 1 || editDistance(word, 'card') <= 1) {
      const match = wallets.find(w => norm(w.name).includes('kart') || norm(w.name).includes('card'))
      if (match) return match.id
    }
  }
  return null
}

// ── Commitment helpers ────────────────────────────────────────────

const FREQ_MONTHLY_FACTOR: Record<string, number> = {
  monthly: 1,
  quarterly: 1/3,
  biannual: 1/6,
  annual: 1/12,
}

export function commitAmt(c: { amount: number; frequency: string }, _mk: string): number {
  return c.amount * (FREQ_MONTHLY_FACTOR[c.frequency] ?? 1)
}

export function monthCommitments(
  commitments: Array<{ amount: number; frequency: string; start_date?: string; end_date?: string }>,
  mk: string
): typeof commitments {
  return commitments.filter(c => {
    if (c.start_date && mKey(c.start_date) > mk) return false
    if (c.end_date   && mKey(c.end_date)   < mk) return false
    if (c.frequency === 'quarterly') {
      const mNum = +mk.split('-')[1]
      return mNum % 3 === 1
    }
    if (c.frequency === 'biannual') {
      const mNum = +mk.split('-')[1]
      return mNum % 6 === 1
    }
    if (c.frequency === 'annual') {
      return mk.endsWith('-01')
    }
    return true
  })
}

// ── Recurring payments ────────────────────────────────────────────

export function recurDue(
  recurring: Array<{ id: string; description: string; amount: number; category: string; last_added?: string }>,
  expenses: Array<{ recur_id?: string | null; date: string }>
): typeof recurring {
  const mk = mKey(todayStr())
  return recurring.filter(r => {
    return !expenses.some(e => e.recur_id === r.id && mKey(e.date) === mk)
  })
}

// ── Summary & forecast ────────────────────────────────────────────

export function genSummary(
  expenses: Array<{ amount: number; category: string }>,
  incomes: Array<{ amount: number }>,
  totalCom: number,
  monthLabel: string,
  budgets: Record<string, number>
): string {
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0)
  const totalInc = incomes.reduce((s, i) => s + i.amount, 0)
  const volne = totalInc - totalCom - totalExp
  const catSums: Record<string, number> = {}
  for (const e of expenses) catSums[e.category] = (catSums[e.category] || 0) + e.amount
  const topCat = Object.entries(catSums).sort((a, b) => b[1] - a[1])[0]
  const budWarn = Object.entries(budgets).filter(([c, l]) => (catSums[c] || 0) > l)

  let text = `📅 Měsíc: ${monthLabel}\n\n`
  text += `💚 Příjmy: ${fmt(totalInc)} Kč\n`
  text += `📋 Závazky: ${fmt(totalCom)} Kč\n`
  text += `💸 Výdaje: ${fmt(totalExp)} Kč\n`
  text += `\n${volne >= 0 ? '✅' : '⚠️'} Volné prostředky: ${fmt(volne)} Kč\n`
  if (topCat) text += `\n🔝 Nejvíce utraceno za: ${topCat[0]} (${fmt(topCat[1])} Kč)`
  if (budWarn.length) text += `\n\n⚠️ Překročené limity: ${budWarn.map(([c]) => c).join(', ')}`
  return text
}

export function forecast(
  expenses: Array<{ amount: number; date: string }>,
  mk: string
): number {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const mExp = expenses.filter(e => mKey(e.date) === mk)
  const spent = mExp.reduce((s, e) => s + e.amount, 0)
  if (dayOfMonth === 0) return spent
  return Math.round((spent / dayOfMonth) * daysInMonth)
}
