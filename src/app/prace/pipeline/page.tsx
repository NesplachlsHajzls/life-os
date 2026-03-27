'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { fetchDeals, fetchClients, insertDeal, updateDeal, deleteDeal, Deal, Client, DEAL_STAGES, DEAL_STAGE_COLORS, DealStage } from '@/features/prace/api'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

function fmtCZK(v: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v)
}

export default function PipelinePage() {
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null

  const [deals,   setDeals]   = useState<Deal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)

  // Form state
  const [fTitle,        setFTitle]        = useState('')
  const [fClient,       setFClient]       = useState('')        // client_id
  const [fClientSearch, setFClientSearch] = useState('')        // display text
  const [fClientOpen,   setFClientOpen]   = useState(false)
  const [fValue,        setFValue]        = useState('')
  const [fStage,        setFStage]        = useState<DealStage>('Nový lead')
  const [fProb,         setFProb]         = useState('50')
  const [fClose,        setFClose]        = useState('')
  const [fNotes,        setFNotes]        = useState('')

  useEffect(() => {
    if (!userId) return   // počkat na auth
    let cancelled = false
    Promise.all([fetchDeals(userId), fetchClients(userId)])
      .then(([d, c]) => { if (cancelled) return; setDeals(d); setClients(c); setLoading(false) })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  function openAdd() {
    setFTitle(''); setFClient(''); setFClientSearch(''); setFClientOpen(false)
    setFValue(''); setFStage('Nový lead'); setFProb('50'); setFClose(''); setFNotes('')
    setEditDeal(null); setShowAdd(true)
  }

  function openEdit(deal: Deal) {
    const c = clients.find(x => x.id === deal.client_id)
    setFTitle(deal.title); setFClient(deal.client_id)
    setFClientSearch(c ? `${c.icon} ${c.name}` : ''); setFClientOpen(false)
    setFValue(deal.value?.toString() ?? '')
    setFStage(deal.stage); setFProb(deal.probability.toString()); setFClose(deal.expected_close ?? ''); setFNotes(deal.notes ?? '')
    setEditDeal(deal); setShowAdd(true)
  }

  const clientResults = fClientSearch.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(fClientSearch.replace(/^.+\s/, '').toLowerCase()))
    : clients

  async function handleSave() {
    if (!fTitle.trim() || !fClient || !userId) return
    const payload = {
      user_id: userId, client_id: fClient, title: fTitle.trim(),
      value: fValue ? parseFloat(fValue) : null, currency: 'CZK',
      stage: fStage, probability: parseInt(fProb) || 0,
      expected_close: fClose || null, notes: fNotes || null,
    }
    if (editDeal) {
      await updateDeal(editDeal.id, payload)
      setDeals(prev => prev.map(d => d.id === editDeal.id ? { ...d, ...payload } : d))
    } else {
      const data = await insertDeal(payload)
      setDeals(prev => [data, ...prev])
    }
    setShowAdd(false)
  }

  async function handleDelete(id: string) {
    await deleteDeal(id)
    setDeals(prev => prev.filter(d => d.id !== id))
    setShowAdd(false)
  }

  async function handleStageChange(deal: Deal, stage: DealStage) {
    await updateDeal(deal.id, { stage })
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage } : d))
  }

  const activeDealValue = deals
    .filter(d => d.stage !== 'Uzavřen' && d.stage !== 'Ztracen')
    .reduce((s, d) => s + (d.value ?? 0), 0)
  const wonValue = deals.filter(d => d.stage === 'Uzavřen').reduce((s, d) => s + (d.value ?? 0), 0)

  const fieldCls = 'w-full bg-[var(--bg)] border border-[var(--border)] rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]'
  const labelCls = 'block text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5'

  return (
    <>
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-4 lg:px-6 flex items-center gap-3">
        <Link href="/prace" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-raised)] text-[var(--text-tertiary)] text-[18px]">←</Link>
        <div className="flex-1">
          <div className="text-[17px] font-extrabold text-[var(--text-primary)]">📊 Pipeline</div>
          <div className="text-[12px] text-[var(--text-tertiary)]">{deals.length} obchodů · {fmtCZK(activeDealValue)} aktivně · {fmtCZK(wonValue)} uzavřeno</div>
        </div>
        <button onClick={openAdd}
          className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-white"
          style={{ background: 'var(--color-primary)' }}>
          + Obchod
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">Načítám…</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 p-4 lg:p-6 min-w-max">
            {DEAL_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage)
              const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0)
              const color = DEAL_STAGE_COLORS[stage]

              return (
                <div key={stage} className="flex flex-col w-[260px] flex-shrink-0">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-[13px] font-bold text-[var(--text-secondary)]">{stage}</span>
                      <span className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-[var(--surface-raised)] px-1.5 rounded-full">{stageDeals.length}</span>
                    </div>
                    {stageValue > 0 && <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{fmtCZK(stageValue)}</span>}
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-3 flex-1">
                    {stageDeals.map(deal => {
                      const client = clients.find(c => c.id === deal.client_id)
                      return (
                        <div key={deal.id}
                          className="bg-[var(--surface)] rounded-[14px] p-4 cursor-pointer hover:shadow-md transition-shadow"
                          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.07)', borderTop: `3px solid ${color}` }}
                          onClick={() => openEdit(deal)}>
                          <div className="text-[13px] font-bold text-[var(--text-primary)] mb-1">{deal.title}</div>
                          {client && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-[12px]">{client.icon}</span>
                              <span className="text-[12px] text-[var(--text-secondary)]">{client.name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            {deal.value
                              ? <span className="text-[13px] font-bold" style={{ color }}>{fmtCZK(deal.value)}</span>
                              : <span className="text-[12px] text-[var(--text-tertiary)]">Bez hodnoty</span>}
                            <span className="text-[11px] text-[var(--text-tertiary)]">{deal.probability}%</span>
                          </div>
                          {deal.expected_close && (
                            <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
                              📅 {new Date(deal.expected_close + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Add button per column */}
                    <button onClick={() => { openAdd(); setFStage(stage) }}
                      className="w-full py-2.5 rounded-[12px] border-2 border-dashed border-[var(--border)] text-[12px] font-semibold text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-colors">
                      + Přidat
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="bg-[var(--surface)] rounded-[24px] p-6 w-full shadow-2xl mx-4 overflow-y-auto" style={{ maxWidth: 480, maxHeight: '90vh' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-[var(--text-primary)]">{editDeal ? '✏️ Upravit obchod' : '💰 Nový obchod'}</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Název obchodu *</label>
                <input className={fieldCls} value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Název projektu nebo zakázky" />
              </div>
              <div className="relative">
                <label className={labelCls}>Klient *</label>
                <input
                  className={fieldCls}
                  value={fClientSearch}
                  onChange={e => { setFClientSearch(e.target.value); setFClient(''); setFClientOpen(true) }}
                  onFocus={() => setFClientOpen(true)}
                  onBlur={() => setTimeout(() => setFClientOpen(false), 150)}
                  placeholder="Hledat klienta…"
                  autoComplete="off"
                />
                {fClient && (
                  <button onClick={() => { setFClient(''); setFClientSearch(''); setFClientOpen(true) }}
                    className="absolute right-3 top-[34px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-[16px]">×</button>
                )}
                {fClientOpen && clientResults.length > 0 && !fClient && (
                  <div className="absolute z-50 mt-1 w-full bg-[var(--surface)] border border-[var(--border)] rounded-[12px] shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
                    {clientResults.slice(0, 8).map(c => (
                      <button key={c.id} type="button"
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[var(--bg)] transition-colors"
                        onMouseDown={e => { e.preventDefault(); setFClient(c.id); setFClientSearch(`${c.icon} ${c.name}`); setFClientOpen(false) }}>
                        <span className="text-[16px]">{c.icon}</span>
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Hodnota (CZK)</label>
                  <input className={fieldCls} type="number" value={fValue} onChange={e => setFValue(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Pravděpodobnost (%)</label>
                  <input className={fieldCls} type="number" min="0" max="100" value={fProb} onChange={e => setFProb(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Fáze</label>
                <div className="flex flex-wrap gap-2">
                  {DEAL_STAGES.map(s => (
                    <button key={s} onClick={() => setFStage(s)}
                      className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
                      style={{ background: fStage === s ? DEAL_STAGE_COLORS[s] : DEAL_STAGE_COLORS[s] + '18', color: fStage === s ? '#fff' : DEAL_STAGE_COLORS[s] }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Očekávané uzavření</label>
                <input className={fieldCls} type="date" value={fClose} onChange={e => setFClose(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Poznámky</label>
                <textarea className={fieldCls + ' resize-none'} rows={3} value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Volné poznámky k obchodu…" />
              </div>
              <div className="flex gap-3 pt-1">
                {editDeal && (
                  <button onClick={() => handleDelete(editDeal.id)}
                    className="px-4 py-3 rounded-[14px] border border-red-200 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors">
                    Smazat
                  </button>
                )}
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-[14px] border border-[var(--border)] text-[14px] font-semibold text-[var(--text-secondary)]">Zrušit</button>
                <button onClick={handleSave} disabled={!fTitle.trim() || !fClient}
                  className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
                  style={{ background: DEAL_STAGE_COLORS[fStage] }}>
                  {editDeal ? 'Uložit' : 'Přidat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
