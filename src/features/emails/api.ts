import { supabase } from '@/lib/supabase'

export interface ImportedEmail {
  id: string
  user_id: string
  subject: string | null
  from_name: string | null
  from_address: string | null
  to_address: string | null
  received_at: string | null   // ISO
  body_preview: string | null
  client_id: string | null
  status: 'pending' | 'done'
  imported_at: string
}

// ── Fetch ──────────────────────────────────────────────────────────

export async function fetchEmails(userId: string): Promise<ImportedEmail[]> {
  const { data, error } = await supabase
    .from('imported_emails')
    .select('*')
    .eq('user_id', userId)
    .order('received_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ImportedEmail[]) ?? []
}

export async function fetchClientEmails(clientId: string): Promise<ImportedEmail[]> {
  const { data, error } = await supabase
    .from('imported_emails')
    .select('*')
    .eq('client_id', clientId)
    .order('received_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ImportedEmail[]) ?? []
}

export async function insertEmails(
  emails: Omit<ImportedEmail, 'id' | 'imported_at'>[],
): Promise<ImportedEmail[]> {
  const { data, error } = await supabase
    .from('imported_emails')
    .insert(emails)
    .select()
  if (error) throw new Error(error.message)
  return (data as ImportedEmail[]) ?? []
}

export async function updateEmail(
  id: string,
  patch: Partial<Pick<ImportedEmail, 'status' | 'client_id'>>,
): Promise<void> {
  const { error } = await supabase
    .from('imported_emails')
    .update(patch)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteEmail(id: string): Promise<void> {
  const { error } = await supabase
    .from('imported_emails')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── CSV parsing ────────────────────────────────────────────────────
// Outlook CSV columns (varies by locale/version):
//   Subject, Body, From: (Name), From: (Address), To: (Name), To: (Address),
//   Received, Categories, Importance, Attachments

export interface ParsedEmail {
  subject: string | null
  from_name: string | null
  from_address: string | null
  to_address: string | null
  received_at: string | null
  body_preview: string | null
}

function parseOutlookDate(raw: string): string | null {
  if (!raw) return null
  // Try direct parse first
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString()
  // Czech format: DD.MM.YYYY HH:MM
  const m = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/)
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T${m[4].padStart(2,'0')}:${m[5]}:00`
    const d2 = new Date(iso)
    if (!isNaN(d2.getTime())) return d2.toISOString()
  }
  return null
}

export function parseOutlookCSV(csvText: string): ParsedEmail[] {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []

  // Parse header
  const header = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase())

  // Map known column names (Outlook varies by language/version)
  function col(keys: string[]): number {
    for (const k of keys) {
      const i = header.findIndex(h => h.includes(k))
      if (i >= 0) return i
    }
    return -1
  }

  const iSubject  = col(['subject', 'předmět', 'betreff'])
  const iBody     = col(['body', 'tělo', 'text', 'inhalt'])
  const iFromName = col(['from: (name)', 'od: (jméno)', 'von: (name)', 'from (name)'])
  const iFromAddr = col(['from: (address)', 'od: (adresa)', 'von: (adresse)', 'from (address)', 'from'])
  const iToAddr   = col(['to: (address)', 'komu: (adresa)', 'to (address)', 'to'])
  const iReceived = col(['received', 'přijato', 'empfangen', 'date'])

  const results: ParsedEmail[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseCSVRow(line)

    const subject   = iSubject  >= 0 ? cols[iSubject]?.trim()  || null : null
    const fromName  = iFromName >= 0 ? cols[iFromName]?.trim() || null : null
    const fromAddr  = iFromAddr >= 0 ? cols[iFromAddr]?.trim() || null : null
    const toAddr    = iToAddr   >= 0 ? cols[iToAddr]?.trim()   || null : null
    const received  = iReceived >= 0 ? cols[iReceived]?.trim() || null : null
    const bodyRaw   = iBody     >= 0 ? cols[iBody]?.trim()     || null : null

    // Skip rows with no useful data
    if (!subject && !fromAddr) continue

    results.push({
      subject,
      from_name:  fromName,
      from_address: fromAddr,
      to_address:   toAddr,
      received_at:  parseOutlookDate(received ?? ''),
      body_preview: bodyRaw ? bodyRaw.slice(0, 300) : null,
    })
  }

  return results
}

/** Simple CSV row parser that handles quoted fields with commas/newlines */
function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'; i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}
