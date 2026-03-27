'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  insertClient,
  insertContact,
  CLIENT_COLORS,
  CLIENT_STATUSES,
  SUBJECT_TYPES,
  ClientStatus,
  SubjectType,
} from '@/features/prace/api'

// ── Types ─────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done'

interface ParsedRow {
  [col: string]: string
}

interface ClientGroup {
  mainRow: ParsedRow
  extraContacts: ParsedRow[]
}

// Fields the user can map to — null means "skip this column"
type ClientField =
  | 'name' | 'contact_name' | 'email' | 'phone' | 'website' | 'address'
  | 'notes' | 'status' | 'subject_type' | 'tags'
  | 'billing_email' | 'monthly_avg_invoice' | 'ra_count'
  | 'kraj' | 'pp_value' | 'has_ra'
  | null

const FIELD_OPTIONS: { value: ClientField; label: string; hint?: string }[] = [
  { value: null,                   label: '— Přeskočit —' },
  { value: 'name',                 label: 'Název firmy', hint: 'povinné' },
  { value: 'contact_name',         label: 'Jméno kontaktu / osoby' },
  { value: 'email',                label: 'E-mail' },
  { value: 'phone',                label: 'Telefon' },
  { value: 'billing_email',        label: 'Fakturační e-mail' },
  { value: 'kraj',                 label: 'Kraj' },
  { value: 'pp_value',             label: 'PP (hodnota)' },
  { value: 'has_ra',               label: 'Má RA (ano/ne)' },
  { value: 'ra_count',             label: 'Počet RA' },
  { value: 'subject_type',         label: 'Typ subjektu / Kategorie' },
  { value: 'status',               label: 'Status klienta' },
  { value: 'tags',                 label: 'Štítky (čárkou oddělené)' },
  { value: 'website',              label: 'Web' },
  { value: 'address',              label: 'Adresa' },
  { value: 'notes',                label: 'Poznámky' },
  { value: 'monthly_avg_invoice',  label: 'Průměrná fakturace/měs. (Kč)' },
]

// ── SheetJS loader ────────────────────────────────────────────────

declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer, opts: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> }
      utils: {
        sheet_to_json: (sheet: unknown, opts?: { header?: number; defval?: string }) => Record<string, string>[]
      }
    }
  }
}

function useXlsx() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (window.XLSX) { setReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => setReady(true)
    document.head.appendChild(script)
  }, [])
  return ready
}

// ── CSV parser ────────────────────────────────────────────────────

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = splitCsvLine(line)
    const row: ParsedRow = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  }).filter(r => Object.values(r).some(v => v.trim()))
}

function splitCsvLine(line: string): string[] {
  const res: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else { inQ = !inQ }
    } else if (c === ',' && !inQ) {
      res.push(cur.trim()); cur = ''
    } else {
      cur += c
    }
  }
  res.push(cur.trim())
  return res
}

// ── Kraj normaliser ───────────────────────────────────────────────

type KrajEntry = [RegExp, string]

const KRAJ_MAP: KrajEntry[] = [
  [/^(pha|pr|pra)$|^(praha|prague)/i,                  'Praha'],
  [/^(sc|stc)$|stredoc|středoc/i,                       'Středočeský'],
  [/^(jc|jhc)$|jihoc|jihočes/i,                         'Jihočeský'],
  [/^(pl|plz|plk)$|plzensky|plzeňský|plzen/i,           'Plzeňský'],
  [/^(kv|kvk)$|karlovar/i,                              'Karlovarský'],
  [/^(ul|ulk)$|usteck|ústeck|usti nad labem|ústí/i,     'Ústecký'],
  [/^(lb|lbk)$|liberec/i,                               'Liberecký'],
  [/^(hk|khk)$|hradec|kralovehr|královéhrad/i,          'Královéhradecký'],
  [/^(pa|pak)$|pardub/i,                                 'Pardubický'],
  [/^(vy|vys)$|vysocin|vysočin/i,                       'Vysočina'],
  [/^(jm|jmk)$|jihomor|jihomorav/i,                    'Jihomoravský'],
  [/^(ol|olk)$|olomou/i,                                'Olomoucký'],
  [/^(zl|zlk)$|zlinsk|zlínsk/i,                        'Zlínský'],
  [/^(ms|msk)$|moravsk.*slez|ostrav/i,                  'Moravskoslezský'],
]

function normalizeKraj(v: string): string {
  const s = v.trim()
  if (!s) return s
  const lower = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const [re, name] of KRAJ_MAP) {
    if (re.test(lower)) return name
  }
  return s
}

// ── Subject type abbreviations ────────────────────────────────────

const SUBJECT_ABBR: Record<string, SubjectType> = {
  'k':  'Komerční',
  'zs': 'Zdravotnictví soukromé',
  'zv': 'Zdravotnictví veřejné',
  'o':  'Obec',
  'vs': 'Veřejná správa',
}

// ── Smart column guesser ──────────────────────────────────────────
// 1) name-based  2) index-based fallback for the user's specific CRM format
// Column index: 0=PP, 1=hasRA, 2=raCount, 3=category, 4=kraj, 5=name, 6=skip, 7=contact, 8=phone, 9=email, 10=skip, 11=billingEmail

function guessByName(col: string): ClientField | undefined {
  const c = col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/^pp$/.test(c))                                        return 'pp_value'
  if (/ma.ra|has.ra|registr.*autorit/.test(c))               return 'has_ra'
  if (/pocet.ra|ra.pocet|count.ra|ra.count/.test(c))         return 'ra_count'
  if (/^ra$/.test(c))                                        return 'ra_count'
  if (/kraj/.test(c))                                        return 'kraj'
  if (/nazev|jmeno.firmy|firma|name|company|spolecnost/.test(c)) return 'name'
  if (/jmeno.kontakt|contact|osoba|kontakt.jmen/.test(c))    return 'contact_name'
  if (/billing.mail|fakturac.*mail|fakturac.*email/.test(c)) return 'billing_email'
  if (/email|e.mail|mail/.test(c))                           return 'email'
  if (/tel|phone|mobil/.test(c))                             return 'phone'
  if (/web|www|url|site/.test(c))                            return 'website'
  if (/adres|address|sidlo/.test(c))                         return 'address'
  if (/poznamk|note|comment/.test(c))                        return 'notes'
  if (/status|stav/.test(c))                                 return 'status'
  if (/typ.subj|subjekt|kategori|sektor|obor/.test(c))       return 'subject_type'
  if (/stitk|tag/.test(c))                                   return 'tags'
  if (/fakturac|invoice|mesicni/.test(c))                    return 'monthly_avg_invoice'
  return undefined
}

function guessByIndex(colIndex: number): ClientField {
  switch (colIndex) {
    case 0:  return 'pp_value'
    case 1:  return 'has_ra'
    case 2:  return 'ra_count'
    case 3:  return 'subject_type'
    case 4:  return 'kraj'
    case 5:  return 'name'
    case 6:  return null          // position — skip
    case 7:  return 'contact_name'
    case 8:  return 'phone'
    case 9:  return 'email'
    case 10: return null
    case 11: return 'billing_email'
    default: return null
  }
}

function guessField(col: string, colIndex: number): ClientField {
  return guessByName(col) ?? guessByIndex(colIndex)
}

// ── Value normalizers ─────────────────────────────────────────────

function normalizeStatus(v: string): ClientStatus {
  const l = v.toLowerCase()
  if (/aktiv/.test(l)) return 'Aktivní'
  if (/potenc|lead|new/.test(l)) return 'Potenciální'
  if (/pozastav|pause|hold/.test(l)) return 'Pozastavený'
  if (/ukonc|closed|inactive/.test(l)) return 'Ukončený'
  return 'Aktivní'
}

function normalizeSubjectType(v: string): SubjectType | null {
  const l = v.toLowerCase().trim()
  if (SUBJECT_ABBR[l]) return SUBJECT_ABBR[l]
  if (/obec|muni/.test(l)) return 'Obec'
  if (/verej.*sprav|public.admin|vs/.test(l)) return 'Veřejná správa'
  if (/zdrav.*verej|public.*health|zv/.test(l)) return 'Zdravotnictví veřejné'
  if (/zdrav|health|hospital|zs/.test(l)) return 'Zdravotnictví soukromé'
  if (/komerc|commerc/.test(l)) return 'Komerční'
  return null
}

function isTruthy(v: string): boolean {
  return /^(ano|yes|1|true|x|✓|√|jo)$/i.test(v.trim())
}

// ── Multi-contact row grouping ────────────────────────────────────
// Rows where the "name" column (company name) is empty are treated as
// additional contacts belonging to the most recent client above them.

function buildGroups(rows: ParsedRow[], nameCol: string | null): ClientGroup[] {
  const groups: ClientGroup[] = []
  let current: ClientGroup | null = null
  for (const row of rows) {
    const name = nameCol ? (row[nameCol] ?? '').trim() : ''
    if (name) {
      if (current) groups.push(current)
      current = { mainRow: row, extraContacts: [] }
    } else if (current) {
      current.extraContacts.push(row)
    }
  }
  if (current) groups.push(current)
  return groups
}

// ── Main component ────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter()
  const { user } = useUser()
  const xlsxReady = useXlsx()

  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, ClientField>>({})
  const [progress, setProgress] = useState(0)
  const [imported, setImported] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function processRows(rawRows: ParsedRow[], cols: string[]) {
    setColumns(cols)
    setRows(rawRows)
    const autoMap: Record<string, ClientField> = {}
    cols.forEach((col, idx) => { autoMap[col] = guessField(col, idx) })
    setMapping(autoMap)
    setStep('map')
  }

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.onload = e => {
        const text = e.target?.result as string
        const parsed = parseCsv(text)
        if (!parsed.length) return
        processRows(parsed, Object.keys(parsed[0]))
      }
      reader.readAsText(file, 'utf-8')
      return
    }

    // Excel — requires SheetJS
    reader.onload = e => {
      const data = e.target?.result as ArrayBuffer
      if (!window.XLSX) return
      const wb = window.XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[]
      if (raw.length < 2) return
      const headers = (raw[0] as string[]).map((h, i) => String(h) || `Sloupec ${i + 1}`)
      const dataRows = (raw.slice(1) as string[][])
        .map(row => {
          const obj: ParsedRow = {}
          headers.forEach((h, i) => { obj[h] = String(row[i] ?? '') })
          return obj
        })
        .filter(r => Object.values(r).some(v => v.trim()))
      processRows(dataRows, headers)
    }
    reader.readAsArrayBuffer(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [xlsxReady]) // eslint-disable-line

  function buildClientPayload(row: ParsedRow): Record<string, string> {
    const mapped: Record<string, string> = {}
    for (const [col, field] of Object.entries(mapping)) {
      if (field) mapped[field] = row[col] ?? ''
    }
    return mapped
  }

  // Find the column key mapped to the given field
  function findMappedCol(field: ClientField): string | null {
    return Object.entries(mapping).find(([, f]) => f === field)?.[0] ?? null
  }

  function getPreviewGroups(): ClientGroup[] {
    const nameCol = findMappedCol('name')
    return buildGroups(rows, nameCol).slice(0, 5)
  }

  const nameField = Object.values(mapping).includes('name')
  const mappedFields = new Set(Object.values(mapping).filter(Boolean))

  async function runImport() {
    if (!user) return
    setStep('importing')
    setProgress(0)
    let ok = 0, skip = 0
    const errs: string[] = []

    const nameCol = findMappedCol('name')
    const groups = buildGroups(rows, nameCol)

    for (let gi = 0; gi < groups.length; gi++) {
      const { mainRow, extraContacts } = groups[gi]
      const data = buildClientPayload(mainRow)
      const name = (data.name ?? '').trim()

      if (!name) { skip++; setSkipped(skip); continue }

      try {
        // Build tags: existing tags + PP + kraj
        const tags: string[] = []
        if (data.tags) data.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tags.push(t))
        if (data.pp_value?.trim()) tags.push(`PP:${data.pp_value.trim()}`)
        const krajNorm = data.kraj ? normalizeKraj(data.kraj) : ''
        if (krajNorm) tags.push(`kraj:${krajNorm}`)

        const hasRa = isTruthy(data.has_ra ?? '')
        const raCount = hasRa && data.ra_count ? (parseInt(data.ra_count) || null) : null
        const isPrague = krajNorm === 'Praha'

        const color = CLIENT_COLORS[gi % CLIENT_COLORS.length]

        const client = await insertClient({
          user_id: user.id,
          name,
          color,
          icon: '💼',
          status: data.status ? normalizeStatus(data.status) : 'Aktivní',
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          website: data.website?.trim() || null,
          address: data.address?.trim() || null,
          notes: data.notes?.trim() || null,
          billing_email: data.billing_email?.trim() || null,
          tags,
          subject_type: data.subject_type ? normalizeSubjectType(data.subject_type) : null,
          monthly_avg_invoice: data.monthly_avg_invoice ? parseFloat(data.monthly_avg_invoice.replace(',', '.')) || null : null,
          ra_count: raCount,
          is_prague: isPrague,
          products: [],
          price_list: null,
          partner_id: null,
          first_meeting_status: null,
        })

        // Primary contact from the main row (if contact_name is mapped)
        const mainContactName = data.contact_name?.trim()
        if (mainContactName) {
          await insertContact({
            client_id: client.id,
            user_id: user.id,
            name: mainContactName,
            role: null,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            is_primary: true,
          })
        }

        // Extra contacts from subsequent rows with empty company name
        for (const extraRow of extraContacts) {
          const extraData = buildClientPayload(extraRow)
          const extraName = extraData.contact_name?.trim() || ''
          if (!extraName) continue
          await insertContact({
            client_id: client.id,
            user_id: user.id,
            name: extraName,
            role: null,
            phone: extraData.phone?.trim() || null,
            email: extraData.email?.trim() || null,
            is_primary: false,
          })
        }

        ok++
        setImported(ok)
      } catch (err) {
        errs.push(`Klient ${gi + 1}: ${name} — ${err instanceof Error ? err.message : 'chyba'}`)
        skip++; setSkipped(skip)
      }

      setProgress(Math.round(((gi + 1) / groups.length) * 100))
    }

    setErrors(errs)
    setStep('done')
  }

  const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]'

  // Count groups for preview
  const previewGroups = step === 'preview' ? getPreviewGroups() : []
  const allGroups = step === 'preview' ? buildGroups(rows, findMappedCol('name')) : []

  return (
    <>
      <Header title="Import klientů" />
      <div className="p-4 max-w-2xl mx-auto">

        {/* ── Step indicator ── */}
        {step !== 'done' && (
          <div className="flex items-center gap-1.5 mb-5">
            {(['upload', 'map', 'preview'] as const).map((s, i) => {
              const stepIdx = ['upload', 'map', 'preview', 'importing'].indexOf(step)
              const thisIdx = i
              const active = stepIdx === thisIdx
              const done = stepIdx > thisIdx
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
                    done ? 'bg-green-400 text-white' :
                    active ? 'text-white' : 'bg-[var(--border)] text-gray-400'
                  }`} style={active ? { background: 'var(--color-primary)' } : {}}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] font-semibold ${active ? 'text-gray-700' : 'text-gray-400'}`}>
                    {s === 'upload' ? 'Soubor' : s === 'map' ? 'Mapování' : 'Náhled'}
                  </span>
                  {i < 2 && <div className="w-6 h-px bg-[var(--border)] mx-1" />}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div>
            <div className="bg-[var(--surface)] rounded-[16px] p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 className="text-[16px] font-bold text-gray-900 mb-1">Nahraj svůj CRM soubor</h2>
              <p className="text-[13px] text-gray-500 mb-4">
                Soubor se zpracuje <strong>přímo v prohlížeči</strong> — data nikdy neopustí tvůj počítač.
              </p>

              <div
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] rounded-[14px] p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--color-primary)] hover:bg-blue-50/30 transition-all"
              >
                <div className="text-[40px]">📄</div>
                <div className="text-[14px] font-semibold text-gray-700">Přetáhni sem soubor, nebo klikni</div>
                <div className="text-[12px] text-gray-400">Podporované formáty: .xlsx, .xls, .csv</div>
                {!xlsxReady && (
                  <div className="text-[11px] text-orange-400 mt-1">⏳ Načítám knihovnu pro Excel…</div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>

            <div className="bg-blue-50 rounded-[14px] p-4 text-[12px] text-blue-700">
              <div className="font-bold mb-1.5">💡 Tipy pro přehledný import</div>
              <div className="space-y-1 text-blue-600">
                <div>• <strong>První řádek</strong> musí být záhlaví sloupců (názvy polí)</div>
                <div>• Importér automaticky rozpozná sloupce PP, Kraj, RA, Kategorie, Jméno, Telefon, Email aj.</div>
                <div>• <strong>Více kontaktů u jednoho klienta</strong>: řádky s prázdným názvem firmy se automaticky přiřadí k předchozímu klientovi</div>
                <div>• Kraj se uloží jako štítek <em>kraj:Praha</em>, PP jako <em>PP:hodnota</em></div>
                <div>• Zkratky kategorií: K, ZS, ZV, O, VS jsou automaticky rozpoznány</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Column mapping ── */}
        {step === 'map' && (
          <div>
            <div className="bg-[var(--surface)] rounded-[16px] p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[16px] font-bold text-gray-900">Namapuj sloupce</h2>
                <span className="text-[12px] text-gray-400">{rows.length} řádků · {fileName}</span>
              </div>
              <p className="text-[13px] text-gray-500 mb-4">
                Přiřaď každý sloupec z tabulky k příslušnému poli. Sloupce, které nepotřebuješ, nastav na <em>Přeskočit</em>.
              </p>

              <div className="space-y-2.5">
                {columns.map((col, idx) => {
                  const sample = rows.slice(0, 3).map(r => r[col]).filter(Boolean).join(', ')
                  return (
                    <div key={col} className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-300 w-5 text-right flex-shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <div className="text-[12px] font-bold text-gray-700 truncate">{col}</div>
                        </div>
                        {sample && <div className="text-[11px] text-gray-400 truncate pl-6">{sample}</div>}
                      </div>
                      <div className="text-gray-300 text-[14px] mt-1 flex-shrink-0">→</div>
                      <select
                        value={mapping[col] ?? ''}
                        onChange={e => setMapping(prev => ({ ...prev, [col]: (e.target.value || null) as ClientField }))}
                        className={`${fieldCls} w-52 flex-shrink-0`}
                      >
                        {FIELD_OPTIONS.map(opt => (
                          <option
                            key={String(opt.value)}
                            value={opt.value ?? ''}
                            disabled={!!opt.value && mappedFields.has(opt.value) && mapping[col] !== opt.value}
                          >
                            {opt.label}{opt.hint ? ` (${opt.hint})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            {!nameField && (
              <div className="bg-red-50 rounded-[14px] p-3 text-[12px] text-red-600 mb-4">
                ⚠️ Musíš namapovat aspoň sloupec <strong>Název firmy</strong>. Bez toho nelze importovat.
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('upload')} className="flex-1 py-3 rounded-[14px] bg-[var(--surface-raised)] text-gray-600 text-[13px] font-semibold">
                ← Zpět
              </button>
              <button
                onClick={() => setStep('preview')}
                disabled={!nameField}
                className="flex-1 py-3 rounded-[14px] text-white text-[13px] font-bold disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                Náhled →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 'preview' && (
          <div>
            <div className="bg-[var(--surface)] rounded-[16px] p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[16px] font-bold text-gray-900">Náhled importu</h2>
                <span className="text-[12px] text-gray-400">{allGroups.length} klientů</span>
              </div>
              <p className="text-[13px] text-gray-500 mb-4">Prvních 5 klientů — takto budou vypadat po importu:</p>

              <div className="space-y-2">
                {previewGroups.map((group, i) => {
                  const data = buildClientPayload(group.mainRow)
                  const krajNorm = data.kraj ? normalizeKraj(data.kraj) : ''
                  const ppVal = data.pp_value?.trim()
                  const hasRa = isTruthy(data.has_ra ?? '')
                  const raCountVal = data.ra_count?.trim()
                  const subjType = data.subject_type ? normalizeSubjectType(data.subject_type) : null
                  return (
                    <div key={i} className="bg-[var(--bg)] rounded-[12px] px-3 py-2.5">
                      <div className="text-[13px] font-bold text-gray-900 mb-1">
                        💼 {data.name || <span className="text-red-400 font-normal">— chybí název, bude přeskočen —</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1">
                        {data.contact_name && <span className="text-[11px] text-gray-600">👤 {data.contact_name}</span>}
                        {data.email        && <span className="text-[11px] text-gray-500">✉️ {data.email}</span>}
                        {data.phone        && <span className="text-[11px] text-gray-500">📞 {data.phone}</span>}
                        {subjType          && <span className="text-[11px] text-blue-600">🏷 {subjType}</span>}
                        {krajNorm          && <span className="text-[11px] text-teal-600">📍 {krajNorm}</span>}
                        {ppVal             && <span className="text-[11px] text-purple-600">PP: {ppVal}</span>}
                        {hasRa             && <span className="text-[11px] text-green-600">RA{raCountVal ? ` ×${raCountVal}` : ''}</span>}
                      </div>
                      {group.extraContacts.length > 0 && (
                        <div className="text-[10px] text-gray-400 pl-1">
                          + {group.extraContacts.length} další kontakt{group.extraContacts.length > 1 ? 'y' : ''}:
                          {' '}{group.extraContacts
                            .map(r => buildClientPayload(r).contact_name?.trim())
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
                {allGroups.length > 5 && (
                  <div className="text-[12px] text-gray-400 text-center py-1">
                    … a dalších {allGroups.length - 5} klientů
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 rounded-[14px] p-3 text-[12px] text-amber-700 mb-4">
              ⚠️ Import přidá <strong>{allGroups.length} nových klientů</strong> do práce. Duplicity nejsou automaticky detekovány.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('map')} className="flex-1 py-3 rounded-[14px] bg-[var(--surface-raised)] text-gray-600 text-[13px] font-semibold">
                ← Zpět
              </button>
              <button
                onClick={runImport}
                className="flex-1 py-3 rounded-[14px] text-white text-[13px] font-bold"
                style={{ background: 'var(--color-primary)' }}
              >
                Importovat {allGroups.length} klientů
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Importing (progress) ── */}
        {step === 'importing' && (
          <div className="bg-[var(--surface)] rounded-[16px] p-8 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="text-[40px] mb-3">⏳</div>
            <h2 className="text-[16px] font-bold text-gray-900 mb-1">Importuji klienty…</h2>
            <p className="text-[13px] text-gray-500 mb-5">{imported} / {rows.length}</p>
            <div className="w-full bg-[var(--surface-raised)] rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'var(--color-primary)' }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-3">Nezavírej okno…</p>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === 'done' && (
          <div>
            <div className="bg-[var(--surface)] rounded-[16px] p-8 text-center mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="text-[48px] mb-3">🎉</div>
              <h2 className="text-[20px] font-extrabold text-gray-900 mb-2">Import dokončen</h2>
              <div className="flex justify-center gap-6 mt-4">
                <div>
                  <div className="text-[32px] font-extrabold text-green-500">{imported}</div>
                  <div className="text-[12px] text-gray-400">importováno</div>
                </div>
                {skipped > 0 && (
                  <div>
                    <div className="text-[32px] font-extrabold text-amber-400">{skipped}</div>
                    <div className="text-[12px] text-gray-400">přeskočeno</div>
                  </div>
                )}
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 rounded-[14px] p-4 mb-4">
                <div className="text-[12px] font-bold text-red-600 mb-2">Chyby při importu:</div>
                <div className="space-y-0.5">
                  {errors.map((e, i) => <div key={i} className="text-[11px] text-red-500">{e}</div>)}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/prace')}
              className="w-full py-3.5 rounded-[14px] text-white text-[14px] font-bold"
              style={{ background: 'var(--color-primary)' }}
            >
              Zobrazit klienty →
            </button>
          </div>
        )}

      </div>
    </>
  )
}
