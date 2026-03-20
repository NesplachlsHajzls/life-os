'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { useUser } from '@/hooks/useUser'
import {
  ImportedEmail,
  fetchEmails,
  insertEmails,
  updateEmail,
  deleteEmail,
  parseOutlookCSV,
} from '@/features/emails/api'
import { fetchClients } from '@/features/prace/api'

// ── Helpers ────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Včera'
  if (days < 7) return `Před ${days} dny`
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

function initials(name: string | null, addr: string | null): string {
  const n = name || addr || '?'
  const parts = n.split(/[\s@]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n[0]?.toUpperCase() ?? '?'
}

// ── EmailCard ──────────────────────────────────────────────────────

function EmailCard({
  email, clients, onToggleDone, onAssignClient, onDelete,
}: {
  email: ImportedEmail
  clients: { id: string; name: string; color: string }[]
  onToggleDone: (id: string) => void
  onAssignClient: (id: string, clientId: string | null) => void
  onDelete: (id: string) => void
}) {
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [search, setSearch] = useState('')
  const isDone = email.status === 'done'
  const clientName = email.client_id ? clients.find(c => c.id === email.client_id)?.name : null
  const clientColor = email.client_id ? clients.find(c => c.id === email.client_id)?.color : null

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className={`bg-white rounded-[14px] p-4 flex gap-3 transition-opacity ${isDone ? 'opacity-50' : ''}`}
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0"
        style={{ background: clientColor ?? '#94a3b8' }}>
        {initials(email.from_name, email.from_address)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className={`text-[14px] font-bold truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {email.subject || '(bez předmětu)'}
            </div>
            <div className="text-[12px] text-gray-400 truncate mt-0.5">
              {email.from_name
                ? <>{email.from_name} <span className="text-gray-300">·</span> {email.from_address}</>
                : email.from_address
              }
            </div>
          </div>
          <span className="text-[11px] text-gray-300 flex-shrink-0">{fmtDate(email.received_at)}</span>
        </div>

        {email.body_preview && (
          <div className="text-[12px] text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
            {email.body_preview}
          </div>
        )}

        {/* Footer: klient + akce */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {/* Klient picker */}
          <div className="relative">
            <button
              onClick={() => setShowClientPicker(v => !v)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                clientName
                  ? 'text-white border-transparent'
                  : 'text-gray-400 border-gray-200 hover:border-gray-300'
              }`}
              style={clientName && clientColor ? { background: clientColor, borderColor: clientColor } : undefined}
            >
              {clientName ? `👤 ${clientName}` : '+ Klient'}
            </button>
            {showClientPicker && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg w-56 max-h-56 overflow-y-auto">
                <div className="p-2 border-b border-gray-100">
                  <input
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[var(--color-primary)]"
                    placeholder="Hledat klienta…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {email.client_id && (
                  <button
                    onClick={() => { onAssignClient(email.id, null); setShowClientPicker(false); setSearch('') }}
                    className="w-full text-left px-3 py-2 text-[12px] text-red-400 hover:bg-red-50"
                  >
                    × Odebrat klienta
                  </button>
                )}
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-gray-400">Nenalezen</div>
                ) : filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { onAssignClient(email.id, c.id); setShowClientPicker(false); setSearch('') }}
                    className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 flex items-center gap-2 ${email.client_id === c.id ? 'font-bold' : 'text-gray-700'}`}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Vyřízeno */}
          <button
            onClick={() => onToggleDone(email.id)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              isDone
                ? 'bg-green-50 border-green-200 text-green-600'
                : 'border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600'
            }`}
          >
            {isDone ? '✓ Vyřízeno' : 'Vyřídit'}
          </button>

          {/* Smazat */}
          <button
            onClick={() => onDelete(email.id)}
            className="text-[11px] text-gray-300 hover:text-red-400 transition-colors px-1"
            title="Smazat email"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Import modal ───────────────────────────────────────────────────

function ImportModal({ userId, onImported, onClose }: {
  userId: string
  onImported: (emails: ImportedEmail[]) => void
  onClose: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState<ReturnType<typeof parseOutlookCSV>>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Prosím nahraj soubor .csv z Outlooku')
      return
    }
    setError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseOutlookCSV(text)
      setParsed(rows)
    }
    reader.readAsText(file, 'windows-1250') // Outlook often uses cp1250
  }

  async function handleImport() {
    if (!parsed.length) return
    setImporting(true)
    try {
      const payload = parsed.map(p => ({
        user_id: userId,
        subject: p.subject,
        from_name: p.from_name,
        from_address: p.from_address,
        to_address: p.to_address,
        received_at: p.received_at,
        body_preview: p.body_preview,
        client_id: null,
        status: 'pending' as const,
      }))
      const inserted = await insertEmails(payload)
      onImported(inserted)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Chyba při importu')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-[24px] p-6 w-full mx-4 shadow-2xl" style={{ maxWidth: 480 }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-extrabold text-gray-900">📥 Import emailů z Outlooku</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-[20px]">×</button>
        </div>

        {/* Instrukce */}
        <div className="bg-blue-50 rounded-[12px] p-4 mb-4 text-[13px] text-blue-700 leading-relaxed">
          <div className="font-bold mb-1">Jak exportovat z Outlooku:</div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>V Outlooku otevři složku s označenými emaily</li>
            <li>Soubor → Otevřít a exportovat → Importovat nebo exportovat</li>
            <li>Exportovat do souboru → Hodnoty oddělené čárkami (.CSV)</li>
            <li>Vyber složku a ulož soubor</li>
          </ol>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-[14px] p-8 text-center cursor-pointer transition-all ${
            dragging ? 'border-[var(--color-primary)] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {parsed.length > 0 ? (
            <>
              <div className="text-[32px] mb-2">✅</div>
              <div className="text-[14px] font-bold text-gray-800">{fileName}</div>
              <div className="text-[13px] text-green-600 font-semibold mt-1">
                Načteno {parsed.length} emailů
              </div>
              <div className="text-[12px] text-gray-400 mt-1">Klikni pro výběr jiného souboru</div>
            </>
          ) : (
            <>
              <div className="text-[32px] mb-2">📂</div>
              <div className="text-[14px] font-semibold text-gray-600">Přetáhni CSV soubor sem</div>
              <div className="text-[12px] text-gray-400 mt-1">nebo klikni pro výběr souboru</div>
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 text-[12px] text-red-500 text-center">{error}</div>
        )}

        {parsed.length > 0 && (
          <div className="mt-4 bg-gray-50 rounded-[12px] p-3 text-[12px] text-gray-600 max-h-40 overflow-y-auto">
            <div className="font-bold text-gray-700 mb-2">Náhled ({Math.min(3, parsed.length)} z {parsed.length}):</div>
            {parsed.slice(0, 3).map((e, i) => (
              <div key={i} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                <div className="font-semibold text-gray-800 truncate">{e.subject || '(bez předmětu)'}</div>
                <div className="text-gray-400">{e.from_name || e.from_address} · {e.received_at ? new Date(e.received_at).toLocaleDateString('cs-CZ') : '—'}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
          <button
            onClick={handleImport}
            disabled={parsed.length === 0 || importing}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
            style={{ background: 'var(--color-primary)' }}
          >
            {importing ? 'Importuji…' : `Importovat ${parsed.length > 0 ? parsed.length : ''} emailů`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────

type FilterTab = 'pending' | 'done' | 'all'

export default function EmalyPage() {
  const { user } = useUser()
  const userId = user?.id ?? null

  const [emails, setEmails]   = useState<ImportedEmail[]>([])
  const [clients, setClients] = useState<{ id: string; name: string; color: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<FilterTab>('pending')
  const [search, setSearch]   = useState('')
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast]     = useState<string | null>(null)

  function showToastMsg(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    if (!userId) return
    Promise.all([
      fetchEmails(userId),
      fetchClients(userId) as Promise<{ id: string; name: string; color: string }[]>,
    ]).then(([em, cl]) => {
      setEmails(em)
      setClients(cl.map(c => ({ id: c.id, name: c.name, color: (c as { color: string }).color })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  const handleToggleDone = useCallback(async (id: string) => {
    const email = emails.find(e => e.id === id)
    if (!email) return
    const newStatus: 'pending' | 'done' = email.status === 'done' ? 'pending' : 'done'
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e))
    await updateEmail(id, { status: newStatus })
    showToastMsg(newStatus === 'done' ? '✅ Označeno jako vyřízeno' : '↩️ Označeno jako nevyřízeno')
  }, [emails])

  const handleAssignClient = useCallback(async (id: string, clientId: string | null) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, client_id: clientId } : e))
    await updateEmail(id, { client_id: clientId })
    const name = clientId ? clients.find(c => c.id === clientId)?.name : null
    showToastMsg(name ? `👤 Přiřazeno: ${name}` : 'Klient odebrán')
  }, [clients])

  const handleDelete = useCallback(async (id: string) => {
    setEmails(prev => prev.filter(e => e.id !== id))
    await deleteEmail(id)
    showToastMsg('🗑️ Email smazán')
  }, [])

  const displayed = emails
    .filter(e => filter === 'all' || e.status === filter)
    .filter(e => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        e.subject?.toLowerCase().includes(q) ||
        e.from_name?.toLowerCase().includes(q) ||
        e.from_address?.toLowerCase().includes(q) ||
        e.body_preview?.toLowerCase().includes(q)
      )
    })

  const pendingCount = emails.filter(e => e.status === 'pending').length

  return (
    <>
      <Header
        title="Emaily"
        action={
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
          >
            📥 Import
          </button>
        }
      />

      {/* Filter + search bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {([
            { id: 'pending', label: `Nevyřízené${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { id: 'done',    label: 'Vyřízené' },
            { id: 'all',     label: 'Vše' },
          ] as { id: FilterTab; label: string }[]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: filter === f.id ? 'var(--color-primary)' : '#f3f4f6',
                color: filter === f.id ? '#fff' : '#6b7280',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-[var(--color-primary)]"
          placeholder="Hledat…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-[13px]">Načítám…</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[48px] mb-3">📭</div>
            <p className="text-[14px] font-semibold text-gray-500 mb-1">
              {emails.length === 0 ? 'Zatím žádné emaily' : 'Žádné emaily odpovídají filtru'}
            </p>
            {emails.length === 0 && (
              <p className="text-[12px] text-gray-400 mb-4">Importuj emaily z Outlooku a přiřaď je ke klientům</p>
            )}
            {emails.length === 0 && (
              <button
                onClick={() => setShowImport(true)}
                className="px-5 py-2.5 rounded-[12px] text-[13px] font-bold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                📥 Importovat emaily
              </button>
            )}
          </div>
        ) : (
          displayed.map(email => (
            <EmailCard
              key={email.id}
              email={email}
              clients={clients}
              onToggleDone={handleToggleDone}
              onAssignClient={handleAssignClient}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Import modal */}
      {showImport && userId && (
        <ImportModal
          userId={userId}
          onImported={imported => {
            setEmails(prev => [...imported, ...prev])
            showToastMsg(`✅ Importováno ${imported.length} emailů`)
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </>
  )
}
