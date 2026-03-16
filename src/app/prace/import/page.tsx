'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  insertClient,
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

// Fields the user can map to — null means "skip this column"
type ClientField =
  | 'name' | 'email' | 'phone' | 'website' | 'address'
  | 'notes' | 'status' | 'subject_type' | 'tags'
  | 'billing_email' | 'monthly_avg_invoice' | 'ra_count'
  | 'is_prague' | null

const FIELD_OPTIONS: { value: ClientField; label: string; hint?: string }[] = [
  { value: null,                   label: '— Přeskočit —' },
  { value: 'name',                 label: 'Název / Jméno firmy', hint: 'povinné' },
  { value: 'email',                label: 'E-mail' },
  { value: 'phone',                label: 'Telefon' },
  { value: 'website',              label: 'Web' },
  { value: 'address',              label: 'Adresa' },
  { value: 'notes',                label: 'Poznámky' },
  { value: 'status',               label: 'Status klienta' },
  { value: 'subject_type',         label: 'Typ subjektu' },
  { value: 'tags',                 label: 'Štítky (čárkou oddělené)' },
  { value: 'billing_email',        label: 'Fakturační e-mail' },
  { value: 'monthly_avg_invoice',  label: 'Průměrná fakturace/měs. (Kč)' },
  { value: 'ra_count',             label: 'Počet RA' },
  { value: 'is_prague',            label: 'Praha (ano/ne)' },
]

// ── SheetJS loader ────────────────────────────────────────────────
// Loaded from CDN — never touches user data server-side

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

// ── CSV parser (no library needed) ───────────────────────────────

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

// ── Smart column guesser ──────────────────────────────────────────

function guessField(col: string): ClientField {
  const c = col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/nazev|jmeno|firma|name|company|spolecnost/.test(c)) return 'name'
  if (/billing.mail|fakturac/.test(c)) return 'billing_email'
  if (/email|e.mail|mail/.test(c)) return 'email'
  if (/tel|phone|mobil/.test(c)) return 'phone'
  if (/web|www|url|site/.test(c)) return 'website'
  if (/adres|address|sidlo/.test(c)) return 'address'
  if (/poznamk|note|comment/.test(c)) return 'notes'
  if (/status|stav/.test(c)) return 'status'
  if (/typ.subj|subjekt|sektor|obor/.test(c)) return 'subject_type'
  if (/stitk|tag/.test(c)) return 'tags'
  if (/fakturac|invoice|mesicni/.test(c)) return 'monthly_avg_invoice'
  if (/\bra\b|r\.a|certif/.test(c)) return 'ra_count'
  if (/prah|prague/.test(c)) return 'is_prague'
  return null
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
  const l = v.toLowerCase()
  if (/obec|muni/.test(l)) return 'Obec'
  if (/verej.*sprav|public/.test(l)) return 'Veřejná správa'
  if (/zdrav.*verej|public.*health/.test(l)) return 'Zdravotnictví veřejné'
  if (/zdrav|health|hospital/.test(l)) return 'Zdravotnictví soukromé'
  if (/komerc|commerc/.test(l)) return 'Komerční'
  return null
}

function normalizeBool(v: string): boolean {
  const l = v.toLowerCase()
  return /^(ano|yes|1|true|x|prague|praha)$/.test(l.trim())
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
    cols.forEach(col => { autoMap[col] = guessField(col) })
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
      const headers = (raw[0] as string[]).map(String)
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

  // Build preview / import data from mapping
  function buildClientPayload(row: ParsedRow) {
    const mapped: Record<string, string> = {}
    for (const [col, field] of Object.entries(mapping)) {
      if (field) mapped[field] = row[col] ?? ''
    }
    return mapped
  }

  function getPreviewRows() {
    return rows.slice(0, 5).map(buildClientPayload)
  }

  const nameField = Object.values(mapping).includes('name')

  async function runImport() {
    if (!user) return
    setStep('importing')
    setProgress(0)
    let ok = 0, skip = 0
    const errs: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const data = buildClientPayload(rows[i])
      const name = (data.name ?? '').trim()

      if (!name) { skip++; setSkipped(skip); continue }

      try {
        const color = CLIENT_COLORS[i % CLIENT_COLORS.length]
        await insertClient({
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
          tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          subject_type: data.subject_type ? normalizeSubjectType(data.subject_type) : null,
          monthly_avg_invoice: data.monthly_avg_invoice ? parseFloat(data.monthly_avg_invoice.replace(',', '.')) || null : null,
          ra_count: data.ra_count ? parseInt(data.ra_count) || null : null,
          is_prague: data.is_prague ? normalizeBool(data.is_prague) : false,
          products: [],
          price_list: null,
          partner_id: null,
          first_meeting_status: null,
        })
        ok++
        setImported(ok)
      } catch (err) {
        errs.push(`Řádek ${i + 2}: ${name} — ${err instanceof Error ? err.message : 'chyba'}`)
        skip++; setSkipped(skip)
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100))
    }

    setErrors(errs)
    setStep('done')
  }

  const fieldCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]'
  const mappedFields = new Set(Object.values(mapping).filter(Boolean))

  return (
    <>
      <Header title="📥 Import klientů" />
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
                    active ? 'text-white' : 'bg-gray-200 text-gray-400'
                  }`} style={active ? { background: 'var(--color-primary)' } : {}}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] font-semibold ${active ? 'text-gray-700' : 'text-gray-400'}`}>
                    {s === 'upload' ? 'Soubor' : s === 'map' ? 'Mapování' : 'Náhled'}
                  </span>
                  {i < 2 && <div className="w-6 h-px bg-gray-200 mx-1" />}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div>
            <div className="bg-white rounded-[16px] p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 className="text-[16px] font-bold text-gray-900 mb-1">Nahraj svůj CRM soubor</h2>
              <p className="text-[13px] text-gray-500 mb-4">
                Soubor se zpracuje <strong>přímo v prohlížeči</strong> — data nikdy neopustí tvůj počítač.
              </p>

              <div
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-[14px] p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--color-primary)] hover:bg-blue-50/30 transition-all"
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
                <div>• Jediné povinné pole je <strong>název firmy / klienta</strong></div>
                <div>• Ostatní sloupce (email, telefon…) namapuješ v dalším kroku</div>
                <div>• Sloupce, které nechceš importovat, jednoduše přeskočíš</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Column mapping ── */}
        {step === 'map' && (
          <div>
            <div className="bg-white rounded-[16px] p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[16px] font-bold text-gray-900">Namapuj sloupce</h2>
                <span className="text-[12px] text-gray-400">{rows.length} řádků · {fileName}</span>
              </div>
              <p className="text-[13px] text-gray-500 mb-4">
                Přiřaď každý sloupec z tabulky k příslušnému poli. Sloupce, které nepotřebuješ, nastav na <em>Přeskočit</em>.
              </p>

              <div className="space-y-2.5">
                {columns.map(col => {
                  const sample = rows.slice(0, 3).map(r => r[col]).filter(Boolean).join(', ')
                  return (
                    <div key={col} className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-gray-700 mb-0.5 truncate">{col}</div>
                        {sample && <div className="text-[11px] text-gray-400 truncate">{sample}</div>}
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
                ⚠️ Musíš namapovat aspoň sloupec <strong>Název / Jméno firmy</strong>. Bez toho nelze importovat.
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('upload')} className="flex-1 py-3 rounded-[14px] bg-gray-100 text-gray-600 text-[13px] font-semibold">
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
            <div className="bg-white rounded-[16px] p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[16px] font-bold text-gray-900">Náhled importu</h2>
                <span className="text-[12px] text-gray-400">{rows.length} klientů</span>
              </div>
              <p className="text-[13px] text-gray-500 mb-4">Prvních 5 záznamů — takto budou vypadat po importu:</p>

              <div className="space-y-2">
                {getPreviewRows().map((row, i) => (
                  <div key={i} className="bg-gray-50 rounded-[12px] px-3 py-2.5">
                    <div className="text-[13px] font-bold text-gray-900 mb-1">
                      💼 {row.name || <span className="text-red-400 font-normal">— chybí název, bude přeskočen —</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {row.email    && <span className="text-[11px] text-gray-500">✉️ {row.email}</span>}
                      {row.phone    && <span className="text-[11px] text-gray-500">📞 {row.phone}</span>}
                      {row.status   && <span className="text-[11px] text-gray-500">● {normalizeStatus(row.status)}</span>}
                      {row.subject_type && <span className="text-[11px] text-gray-500">🏷 {normalizeSubjectType(row.subject_type) ?? row.subject_type}</span>}
                      {row.address  && <span className="text-[11px] text-gray-500 w-full">📍 {row.address}</span>}
                    </div>
                  </div>
                ))}
                {rows.length > 5 && (
                  <div className="text-[12px] text-gray-400 text-center py-1">
                    … a dalších {rows.length - 5} záznamů
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 rounded-[14px] p-3 text-[12px] text-amber-700 mb-4">
              ⚠️ Import přidá <strong>{rows.length} nových klientů</strong> do práce. Duplicity nejsou automaticky detekovány.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('map')} className="flex-1 py-3 rounded-[14px] bg-gray-100 text-gray-600 text-[13px] font-semibold">
                ← Zpět
              </button>
              <button
                onClick={runImport}
                className="flex-1 py-3 rounded-[14px] text-white text-[13px] font-bold"
                style={{ background: 'var(--color-primary)' }}
              >
                Importovat {rows.length} klientů
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Importing (progress) ── */}
        {step === 'importing' && (
          <div className="bg-white rounded-[16px] p-8 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="text-[40px] mb-3">⏳</div>
            <h2 className="text-[16px] font-bold text-gray-900 mb-1">Importuji klienty…</h2>
            <p className="text-[13px] text-gray-500 mb-5">{imported} / {rows.length}</p>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
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
            <div className="bg-white rounded-[16px] p-8 text-center mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
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
