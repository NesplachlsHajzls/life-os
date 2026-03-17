'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { TaskItem } from '@/features/todo/components/TaskItem'
import {
  fetchClientTasks, fetchClients, fetchContacts, fetchActivities, fetchDeals,
  insertContact, updateContact, deleteContact, insertActivity, deleteActivity, insertDeal, updateDeal, deleteDeal,
  updateClient, deleteClient,
  fetchOrders, insertOrder, updateOrder, deleteOrder,
  Client, ClientContact, ClientActivity, Deal, ClientOrder,
  DEAL_STAGES, DEAL_STAGE_COLORS, DealStage,
  ACTIVITY_TYPES, ACTIVITY_ICONS, ACTIVITY_LABELS, ActivityType,
  CLIENT_STATUSES, CLIENT_COLORS, CLIENT_ICONS,
  SUBJECT_TYPES, SubjectType, SUBJECT_TYPE_COLORS,
  FIRST_MEETING_COLORS, FIRST_MEETING_LABELS,
  PriceList, EMPTY_PRICE_LIST, CERT_PRICE_KEYS, CERT_PRICE_LABELS,
} from '@/features/prace/api'
import { insertTask, updateTask, deleteTask, Task, DEFAULT_TODO_CATEGORIES } from '@/features/todo/api'
import { parseTaskInput } from '@/features/todo/utils'
import { fetchClientMeetings, fetchClientNote, fetchOrCreateClientNote, insertNote, updateNote, Note } from '@/features/notes/api'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
function fmtCZK(v: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v)
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLORS: Record<string, string> = {
  'Potenciální': '#f59e0b', 'Aktivní': '#10b981', 'Pozastavený': '#94a3b8', 'Ukončený': '#ef4444',
}

const fieldCls = 'w-full bg-gray-50 border border-gray-200 rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--color-primary)]'
const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5'

// ── OrderRow ──────────────────────────────────────────────────────

function OrderRow({ order, clientColor, onEdit, onToggle }: {
  order: ClientOrder
  clientColor: string
  onEdit: () => void
  onToggle: () => void
}) {
  const dateStr = new Date(order.date + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
  return (
    <div className={`bg-white rounded-[14px] p-4 flex items-start gap-3 transition-opacity ${order.invoiced ? 'opacity-60' : ''}`}
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      {/* Invoiced toggle */}
      <button onClick={onToggle}
        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          order.invoiced
            ? 'bg-green-400 border-green-400'
            : 'border-gray-300 hover:border-green-400'
        }`}
        title={order.invoiced ? 'Označit jako nefakturované' : 'Označit jako fakturované'}>
        {order.invoiced && <span className="text-[10px] text-white font-bold">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] font-bold ${order.invoiced ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {order.subject}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[12px] text-gray-400">📅 {dateStr}</span>
          {order.amount != null && (
            <span className="text-[12px] font-semibold" style={{ color: order.invoiced ? '#9ca3af' : clientColor }}>
              {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(order.amount)}
            </span>
          )}
          {order.invoiced && <span className="text-[11px] font-semibold text-green-500">Fakturováno</span>}
        </div>
        {order.note && <div className="text-[12px] text-gray-400 mt-0.5 truncate">{order.note}</div>}
      </div>

      {/* Edit */}
      <button onClick={onEdit} className="text-gray-300 hover:text-gray-500 text-[15px] transition-colors flex-shrink-0 px-1">✏️</button>
    </div>
  )
}

type Tab = 'prehled' | 'ukoly' | 'aktivity' | 'obchody' | 'objednavky' | 'kontakty' | 'schuzky' | 'poznamky'

export default function ClientPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const { user, loading: authLoading } = useUser()
  const userId = !authLoading ? (user?.id ?? DEMO_USER_ID) : null

  const [client,     setClient]     = useState<Client | null>(null)
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [contacts,   setContacts]   = useState<ClientContact[]>([])
  const [activities, setActivities] = useState<ClientActivity[]>([])
  const [deals,      setDeals]      = useState<Deal[]>([])
  const [meetings,   setMeetings]   = useState<Note[]>([])
  const [orders,     setOrders]     = useState<ClientOrder[]>([])
  const [clientNote, setClientNote] = useState<Note | null>(null)
  const [noteTitle,  setNoteTitle]  = useState('')
  const [noteContent,setNoteContent]= useState('')
  const [noteSaveState, setNoteSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [toast,      setToast]      = useState<string | null>(null)
  const [tab,        setTab]        = useState<Tab>('prehled')
  const [taskTab,    setTaskTab]    = useState<'open' | 'done'>('open')

  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickInput,   setQuickInput]   = useState('')

  // Edit task form
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [tTitle,      setTTitle]      = useState('')
  const [tPriority,   setTPriority]   = useState<1|2|3>(2)
  const [tDueDate,    setTDueDate]    = useState('')
  const [tNote,       setTNote]       = useState('')

  // Contact form
  const [showAddContact, setShowAddContact] = useState(false)
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null)
  const [cName, setCName] = useState(''); const [cRole, setCRole] = useState('')
  const [cPhone, setCPhone] = useState(''); const [cEmail, setCEmail] = useState('')
  const [cPrimary, setCPrimary] = useState(false)

  // Activity form
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [aType, setAType] = useState<ActivityType>('call')
  const [aTitle, setATitle] = useState(''); const [aDesc, setADesc] = useState('')
  const [aDate, setADate] = useState(new Date().toISOString().slice(0, 16))

  // Deal form
  const [showAddDeal, setShowAddDeal] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [dTitle, setDTitle] = useState(''); const [dValue, setDValue] = useState('')
  const [dStage, setDStage] = useState<DealStage>('Nový lead')
  const [dProb, setDProb] = useState('50'); const [dClose, setDClose] = useState('')
  const [dNotes, setDNotes] = useState('')

  // Meeting form
  const [showAddMeeting, setShowAddMeeting] = useState(false)
  const [mTitle, setMTitle] = useState('')
  const [mDate,  setMDate]  = useState(new Date().toISOString().slice(0, 10))
  const [creatingMeeting, setCreatingMeeting] = useState(false)

  // Order form
  const [showAddOrder,  setShowAddOrder]  = useState(false)
  const [editingOrder,  setEditingOrder]  = useState<ClientOrder | null>(null)
  const [oDate,    setODate]    = useState(new Date().toISOString().slice(0, 10))
  const [oSubject, setOSubject] = useState('')
  const [oAmount,  setOAmount]  = useState('')
  const [oNote,    setONote]    = useState('')

  // Edit client form
  const [showEditClient, setShowEditClient] = useState(false)
  const [eName,       setEName]       = useState('')
  const [eIcon,       setEIcon]       = useState('💼')
  const [eColor,      setEColor]      = useState(CLIENT_COLORS[0])
  const [eStatus,     setEStatus]     = useState<string>('Aktivní')
  const [eEmail,      setEEmail]      = useState('')
  const [ePhone,      setEPhone]      = useState('')
  const [eWebsite,    setEWebsite]    = useState('')
  const [eAddress,    setEAddress]    = useState('')
  const [eNotes,      setENotes]      = useState('')
  const [eRaCount,    setERaCount]    = useState('')
  const [eMonthlyAvg, setEMonthlyAvg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [eProducts,     setEProducts]     = useState<string[]>([])
  const [eProductInput, setEProductInput] = useState('')
  const [ePL, setEPL] = useState<PriceList>({ ...EMPTY_PRICE_LIST })
  // Nová pole
  const [eIsPrague,           setEIsPrague]           = useState(false)
  const [eSubjectType,        setESubjectType]        = useState<SubjectType | ''>('')
  const [ePartnerID,          setEPartnerID]          = useState('')
  const [eBillingEmail,       setEBillingEmail]       = useState('')
  const [eFirstMeeting,       setEFirstMeeting]       = useState<'done' | 'scheduled' | 'not_yet' | null>(null)

  function openEditClient() {
    if (!client) return
    setEName(client.name)
    setEIcon(client.icon)
    setEColor(client.color)
    setEStatus(client.status)
    setEEmail(client.email ?? ''); setEPhone(client.phone ?? '')
    setEWebsite(client.website ?? ''); setEAddress(client.address ?? '')
    setENotes(client.notes ?? '')
    setERaCount(client.ra_count != null ? String(client.ra_count) : '')
    setEMonthlyAvg(client.monthly_avg_invoice != null ? String(client.monthly_avg_invoice) : '')
    setEProducts(client.products ?? [])
    setEProductInput('')
    setEPL(client.price_list ?? { ...EMPTY_PRICE_LIST })
    setEIsPrague(client.is_prague ?? false)
    setESubjectType(client.subject_type ?? '')
    setEPartnerID(client.partner_id ?? '')
    setEBillingEmail(client.billing_email ?? '')
    setEFirstMeeting(client.first_meeting_status ?? null)
    setConfirmDelete(false)
    setShowEditClient(true)
  }

  async function handleDeleteClient() {
    await deleteClient(clientId)
    router.push('/prace')
  }

  function setPLField(key: keyof PriceList, val: string | number | null) {
    setEPL(prev => ({ ...prev, [key]: val }))
  }

  async function handleSaveClient() {
    if (!client) return
    const pl: PriceList = {
      hw_1_name:  ePL.hw_1_name  || null,
      hw_1_price: ePL.hw_1_price != null && ePL.hw_1_price !== ('' as unknown) ? Number(ePL.hw_1_price) : null,
      hw_2_name:  ePL.hw_2_name  || null,
      hw_2_price: ePL.hw_2_price != null && ePL.hw_2_price !== ('' as unknown) ? Number(ePL.hw_2_price) : null,
      twins_kval_komercni: ePL.twins_kval_komercni != null ? Number(ePL.twins_kval_komercni) : null,
      twins_identitni:     ePL.twins_identitni != null     ? Number(ePL.twins_identitni)     : null,
      cert_kval:           ePL.cert_kval != null           ? Number(ePL.cert_kval)           : null,
      cert_komercni:       ePL.cert_komercni != null       ? Number(ePL.cert_komercni)       : null,
      cert_identitni:      ePL.cert_identitni != null      ? Number(ePL.cert_identitni)      : null,
    }
    const payload: Partial<Client> = {
      name:                eName.trim() || client.name,
      icon:                eIcon,
      color:               eColor,
      status:              eStatus as Client['status'],
      email:               eEmail || null,
      phone:               ePhone || null,
      website:             eWebsite || null,
      address:             eAddress || null,
      notes:               eNotes || null,
      ra_count:            eRaCount ? parseInt(eRaCount) : null,
      monthly_avg_invoice: eMonthlyAvg ? parseFloat(eMonthlyAvg) : null,
      products:            eProducts,
      price_list:          pl,
      is_prague:             eIsPrague,
      subject_type:          eSubjectType || null,
      partner_id:            ePartnerID || null,
      billing_email:         eBillingEmail || null,
      first_meeting_status:  eFirstMeeting,
    }
    await updateClient(client.id, payload)
    setClient(prev => prev ? { ...prev, ...payload } : prev)
    setShowEditClient(false)
    showToast('✅ Klient uložen')
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    if (!userId) return   // počkat na auth
    let cancelled = false
    Promise.all([
      fetchClients(userId),
      fetchClientTasks(userId, clientId),
      fetchContacts(clientId),
      fetchActivities(clientId),
      fetchDeals(userId, clientId),
      fetchClientMeetings(clientId),
      fetchOrders(clientId),
    ]).then(([cls, t, co, ac, d, m, ord]) => {
      if (cancelled) return
      const foundClient = cls.find(c => c.id === clientId) ?? null
      setClient(foundClient)
      setTasks(t); setContacts(co); setActivities(ac); setDeals(d); setMeetings(m)
      setOrders(ord as ClientOrder[])
      setLoading(false)
      // Load existing client note lazily — do NOT create one automatically
      if (foundClient) {
        fetchClientNote(userId, clientId).then(note => {
          if (!cancelled && note) {
            setClientNote(note)
            setNoteTitle(note.title)
            setNoteContent(note.content ?? '')
          }
        }).catch(() => {})
      }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, clientId])

  const openTasks = tasks.filter(t => t.status === 'open')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const clientColor = client?.color ?? 'var(--color-primary)'

  // ── Task actions ──────────────────────────────────────────────
  async function handleQuickAdd() {
    if (!quickInput.trim() || !userId) return
    const parsed = parseTaskInput(quickInput, [])
    try {
      const data = await insertTask({
        user_id: userId, title: parsed.title, priority: parsed.priority,
        category: 'Práce', client_id: clientId,
        due_date: parsed.due_date, note: null, url: parsed.url, status: 'open', done_at: null,
      })
      setTasks(prev => [data, ...prev])
      setQuickInput(''); setShowQuickAdd(false)
      showToast(`✅ ${parsed.title}`)
    } catch (e: any) { showToast(`⚠️ ${e.message}`) }
  }

  function openEditTask(task: Task) {
    setEditingTask(task)
    setTTitle(task.title)
    setTPriority((task.priority as 1|2|3) ?? 2)
    setTDueDate(task.due_date ?? '')
    setTNote(task.note ?? '')
  }

  async function handleSaveTask() {
    if (!editingTask || !tTitle.trim()) return
    await updateTask({ id: editingTask.id, title: tTitle.trim(), priority: tPriority, due_date: tDueDate || null, note: tNote || null })
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, title: tTitle.trim(), priority: tPriority, due_date: tDueDate || null, note: tNote || null } : t))
    setEditingTask(null)
    showToast('✏️ Úkol upraven')
  }

  async function toggleTask(task: Task) {
    const newStatus: 'open' | 'done' = task.status === 'done' ? 'open' : 'done'
    const done_at = newStatus === 'done' ? new Date().toISOString() : null
    await updateTask({ id: task.id, status: newStatus, done_at })
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, done_at } : t))
  }

  async function removeTask(id: string) {
    await deleteTask(id); setTasks(prev => prev.filter(t => t.id !== id))
  }

  // ── Contact actions ───────────────────────────────────────────
  function openAddContact() {
    setEditingContact(null)
    setCName(''); setCRole(''); setCPhone(''); setCEmail(''); setCPrimary(false)
    setShowAddContact(true)
  }

  function openEditContact(c: ClientContact) {
    setEditingContact(c)
    setCName(c.name); setCRole(c.role ?? ''); setCPhone(c.phone ?? ''); setCEmail(c.email ?? ''); setCPrimary(c.is_primary)
    setShowAddContact(true)
  }

  async function handleSaveContact() {
    if (!cName.trim() || !userId) return
    if (editingContact) {
      await updateContact(editingContact.id, { name: cName, role: cRole || null, phone: cPhone || null, email: cEmail || null, is_primary: cPrimary })
      setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, name: cName, role: cRole || null, phone: cPhone || null, email: cEmail || null, is_primary: cPrimary } : c))
      showToast('✏️ Kontakt upraven')
    } else {
      const data = await insertContact({ client_id: clientId, user_id: userId, name: cName, role: cRole || null, phone: cPhone || null, email: cEmail || null, is_primary: cPrimary })
      setContacts(prev => [...prev, data])
      showToast('✅ Kontakt přidán')
    }
    setCName(''); setCRole(''); setCPhone(''); setCEmail(''); setCPrimary(false)
    setEditingContact(null); setShowAddContact(false)
  }

  async function handleDeleteContact(id: string) {
    await deleteContact(id); setContacts(prev => prev.filter(c => c.id !== id))
    setShowAddContact(false)
  }

  // ── Activity actions ──────────────────────────────────────────
  async function handleAddActivity() {
    if (!aTitle.trim() || !userId) return
    const data = await insertActivity({ client_id: clientId, user_id: userId, type: aType, title: aTitle, description: aDesc || null, activity_date: aDate ? new Date(aDate).toISOString() : new Date().toISOString() })
    setActivities(prev => [data, ...prev])
    setATitle(''); setADesc(''); setAType('call'); setADate(new Date().toISOString().slice(0, 16))
    setShowAddActivity(false); showToast('✅ Aktivita přidána')
  }

  async function handleDeleteActivity(id: string) {
    await deleteActivity(id); setActivities(prev => prev.filter(a => a.id !== id))
  }

  // ── Deal actions ──────────────────────────────────────────────
  function openAddDeal() {
    setDTitle(''); setDValue(''); setDStage('Nový lead'); setDProb('50'); setDClose(''); setDNotes('')
    setEditingDeal(null); setShowAddDeal(true)
  }
  function openEditDeal(deal: Deal) {
    setDTitle(deal.title); setDValue(deal.value?.toString() ?? ''); setDStage(deal.stage)
    setDProb(deal.probability.toString()); setDClose(deal.expected_close ?? ''); setDNotes(deal.notes ?? '')
    setEditingDeal(deal); setShowAddDeal(true)
  }
  async function handleSaveDeal() {
    if (!dTitle.trim() || !userId) return
    const payload = { user_id: userId, client_id: clientId, title: dTitle, value: dValue ? parseFloat(dValue) : null, currency: 'CZK', stage: dStage, probability: parseInt(dProb) || 0, expected_close: dClose || null, notes: dNotes || null }
    if (editingDeal) {
      await updateDeal(editingDeal.id, payload)
      setDeals(prev => prev.map(d => d.id === editingDeal.id ? { ...d, ...payload } : d))
    } else {
      const data = await insertDeal(payload)
      setDeals(prev => [data, ...prev])
    }
    setShowAddDeal(false); showToast(editingDeal ? '✏️ Obchod upraven' : '✅ Obchod přidán')
  }
  async function handleDeleteDeal(id: string) {
    await deleteDeal(id); setDeals(prev => prev.filter(d => d.id !== id)); setShowAddDeal(false)
  }

  // ── Meeting actions ───────────────────────────────────────────
  async function handleAddMeeting() {
    if (!mTitle.trim() || !userId || creatingMeeting) return
    setCreatingMeeting(true)
    try {
      const note = await insertNote({
        user_id: userId, title: mTitle.trim(), content: '',
        parent_id: null, client_id: clientId,
        is_meeting: true, meeting_date: mDate || null, icon: '🤝',
      })
      setMeetings(prev => [note, ...prev])
      setMTitle(''); setMDate(new Date().toISOString().slice(0, 10))
      setShowAddMeeting(false)
      router.push(`/poznamky/${note.id}`)
    } catch {
      setCreatingMeeting(false)
    }
  }

  // ── First meeting status cycle ────────────────────────────────
  async function cycleFirstMeeting() {
    if (!client) return
    const CYCLE: Array<'not_yet' | 'scheduled' | 'done' | null> = [null, 'not_yet', 'scheduled', 'done']
    const cur = client.first_meeting_status ?? null
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length]
    await updateClient(client.id, { first_meeting_status: next })
    setClient(prev => prev ? { ...prev, first_meeting_status: next } : prev)
  }

  // ── Client note autosave ──────────────────────────────────────
  const scheduleSaveNote = useCallback((title: string, content: string, noteId: string) => {
    setNoteSaveState('unsaved')
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current)
    noteSaveTimer.current = setTimeout(async () => {
      setNoteSaveState('saving')
      try {
        await updateNote(noteId, { title, content })
        setNoteSaveState('saved')
      } catch {
        setNoteSaveState('unsaved')
      }
    }, 1000)
  }, [])

  // ── Order actions ─────────────────────────────────────────────
  function openAddOrder() {
    setEditingOrder(null)
    setODate(new Date().toISOString().slice(0, 10))
    setOSubject(''); setOAmount(''); setONote('')
    setShowAddOrder(true)
  }
  function openEditOrder(order: ClientOrder) {
    setEditingOrder(order)
    setODate(order.date)
    setOSubject(order.subject)
    setOAmount(order.amount != null ? String(order.amount) : '')
    setONote(order.note ?? '')
    setShowAddOrder(true)
  }
  async function handleSaveOrder() {
    if (!oSubject.trim() || !userId) return
    const payload = {
      user_id: userId, client_id: clientId,
      date: oDate, subject: oSubject.trim(),
      amount: oAmount ? parseFloat(oAmount.replace(',', '.')) || null : null,
      invoiced: editingOrder?.invoiced ?? false,
      note: oNote.trim() || null,
    }
    if (editingOrder) {
      await updateOrder(editingOrder.id, payload)
      setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...payload } : o))
      showToast('✏️ Objednávka upravena')
    } else {
      const data = await insertOrder(payload)
      setOrders(prev => [data, ...prev])
      showToast('✅ Objednávka přidána')
    }
    setShowAddOrder(false)
  }
  async function toggleInvoiced(order: ClientOrder) {
    const invoiced = !order.invoiced
    await updateOrder(order.id, { invoiced })
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, invoiced } : o))
  }
  async function handleDeleteOrder(id: string) {
    await deleteOrder(id)
    setOrders(prev => prev.filter(o => o.id !== id))
    setShowAddOrder(false)
    showToast('🗑️ Smazáno')
  }

  const pendingOrders = orders.filter(o => !o.invoiced)

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'prehled',     label: 'Přehled' },
    { id: 'ukoly',       label: 'Úkoly',       count: openTasks.length },
    { id: 'aktivity',    label: 'Aktivity',    count: activities.length },
    { id: 'obchody',     label: 'Obchody',     count: deals.length },
    { id: 'objednavky',  label: 'Objednávky',  count: pendingOrders.length },
    { id: 'kontakty',    label: 'Kontakty',    count: contacts.length },
    { id: 'schuzky',     label: 'Schůzky',     count: meetings.length },
    { id: 'poznamky',    label: 'Poznámky' },
  ]

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Link href="/prace" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-[18px] transition-colors">←</Link>
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px]" style={{ background: clientColor + '18' }}>{client?.icon ?? '💼'}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-extrabold text-gray-900 truncate">{client?.name ?? '…'}</div>
            <div className="flex items-center gap-2">
              {client && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: STATUS_COLORS[client.status] + '18', color: STATUS_COLORS[client.status] }}>{client.status}</span>}
              {client?.phone && <span className="text-[12px] text-gray-400">{client.phone}</span>}
            </div>
          </div>
          {/* První schůzka — klikatelný dot pro rychlou změnu */}
          {client && (
            <button onClick={cycleFirstMeeting} title={client.first_meeting_status ? FIRST_MEETING_LABELS[client.first_meeting_status] : 'Nastavit stav 1. schůzky'}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] hover:bg-gray-100 transition-colors">
              <span className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: client.first_meeting_status ? FIRST_MEETING_COLORS[client.first_meeting_status] : '#d1d5db' }} />
              <span className="text-[10px] font-semibold text-gray-400 hidden lg:block">
                {client.first_meeting_status ? FIRST_MEETING_LABELS[client.first_meeting_status] : '1. schůzka'}
              </span>
            </button>
          )}
          <button onClick={openEditClient}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-[16px] transition-colors flex-shrink-0"
            title="Upravit klienta">✏️</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => {
            setTab(t.id)
            // Create client note on first open of the Poznámky tab (lazy creation)
            if (t.id === 'poznamky' && !clientNote && client && userId) {
              fetchOrCreateClientNote(userId, client.id, client.name).then(note => {
                setClientNote(note)
                setNoteTitle(note.title)
                setNoteContent(note.content ?? '')
              }).catch(() => {})
            }
          }}
            className="flex-shrink-0 px-4 py-3 text-[13px] font-bold border-b-2 transition-colors whitespace-nowrap"
            style={{ borderColor: tab === t.id ? clientColor : 'transparent', color: tab === t.id ? clientColor : '#9ca3af' }}>
            {t.label}{t.count !== undefined && t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Načítám…</div> : (
        <div className="p-4 lg:p-6">

          {/* ══ PŘEHLED ══ */}
          {tab === 'prehled' && (
            <div className="flex flex-col gap-4">

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                {/* Levý sloupec: Info o společnosti + Kontaktní osoby */}
                <div className="flex flex-col gap-4">
                  {/* Informace o společnosti */}
                  <div className="bg-white rounded-[16px] p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">Společnost</div>
                      <div className="flex items-center gap-1.5">
                        {client?.subject_type && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                            style={{ background: SUBJECT_TYPE_COLORS[client.subject_type] + '18', color: SUBJECT_TYPE_COLORS[client.subject_type] }}>
                            {client.subject_type}
                          </span>
                        )}
                        {client?.is_prague && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] bg-sky-50 text-sky-600">🏙️ Praha</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {client?.partner_id && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-gray-50 border border-gray-100">
                          <span className="text-[11px] font-bold text-gray-400 uppercase">PP:</span>
                          <span className="text-[13px] font-bold text-gray-800 font-mono">{client.partner_id}</span>
                        </div>
                      )}
                      {[
                        { label: 'Email',             value: client?.email,         icon: '✉️' },
                        { label: 'Fakturační email',  value: client?.billing_email, icon: '🧾' },
                        { label: 'Telefon',           value: client?.phone,         icon: '📞' },
                        { label: 'Web',               value: client?.website,       icon: '🌐' },
                        { label: 'Adresa',            value: client?.address,       icon: '📍' },
                      ].map(row => row.value && (
                        <div key={row.label} className="flex items-start gap-3">
                          <span className="text-[16px] mt-0.5">{row.icon}</span>
                          <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">{row.label}</div>
                            <div className="text-[14px] text-gray-800">{row.value}</div>
                          </div>
                        </div>
                      ))}
                      {client?.tags && client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {client.tags.map(tag => (
                            <span key={tag} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
                          ))}
                        </div>
                      )}
                      {client?.notes && <div className="text-[13px] text-gray-600 bg-gray-50 rounded-[10px] p-3 mt-1">{client.notes}</div>}
                    </div>
                  </div>

                  {/* Kontaktní osoby */}
                  <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                      <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">Kontaktní osoby</div>
                      <button onClick={() => openAddContact()}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-white text-[16px] font-bold leading-none"
                        style={{ background: clientColor }}>+</button>
                    </div>
                    {contacts.length === 0 ? (
                      <div className="px-5 py-4 text-[13px] text-gray-400">Zatím žádné kontaktní osoby</div>
                    ) : (
                      <div className="flex flex-col">
                        {contacts.map((c, i) => (
                          <div key={c.id} onClick={() => openEditContact(c)} className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                              style={{ background: clientColor }}>{c.name[0].toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[13px] font-bold text-gray-900">{c.name}</span>
                                {c.is_primary && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">Primární</span>}
                                {c.role && <span className="text-[11px] text-gray-500">{c.role}</span>}
                              </div>
                              <div className="flex gap-3 mt-0.5">
                                {c.phone && <span className="text-[11px] text-gray-500">📞 {c.phone}</span>}
                                {c.email && <span className="text-[11px] text-gray-500 truncate">✉️ {c.email}</span>}
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); handleDeleteContact(c.id) }} className="text-gray-300 hover:text-red-400 text-[16px] transition-colors flex-shrink-0">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pravý sloupec: Interní data */}
                <div className="bg-white rounded-[16px] p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-4">Interní data</div>
                  <div className="flex flex-col gap-0">

                    {/* Měsíční průměr — nahoře, velký */}
                    <div className="pb-3 mb-3 border-b border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Měsíční průměr fakturace</div>
                      <div className="text-[24px] font-extrabold leading-tight" style={{ color: clientColor }}>
                        {client?.monthly_avg_invoice != null ? fmtCZK(client.monthly_avg_invoice) : <span className="text-gray-300 text-[18px]">—</span>}
                      </div>
                      {/* RA — malý řádek pod fakturací */}
                      {client?.ra_count != null && (
                        <div className="text-[11px] text-gray-400 mt-1">
                          🏛️ <span className="font-semibold text-gray-600">{client.ra_count}</span> registračních autorit
                        </div>
                      )}
                    </div>

                    {/* Ceník */}
                    {client?.price_list && (
                      <div className="flex flex-col gap-0 mb-3">
                        {/* HW položky */}
                        {[
                          { name: client.price_list.hw_1_name, price: client.price_list.hw_1_price },
                          { name: client.price_list.hw_2_name, price: client.price_list.hw_2_price },
                        ].map((hw, i) => (hw.name || hw.price != null) && (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                            <span className="text-[12px] font-semibold text-gray-700">
                              HW {hw.name ? `— ${hw.name}` : ''}
                            </span>
                            <span className="text-[13px] font-bold" style={{ color: clientColor }}>
                              {hw.price != null ? fmtCZK(hw.price) : '—'}
                            </span>
                          </div>
                        ))}
                        {/* Certifikáty */}
                        {CERT_PRICE_KEYS.map(key => {
                          const val = client.price_list?.[key]
                          if (val == null) return null
                          return (
                            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                              <span className="text-[12px] text-gray-600">{CERT_PRICE_LABELS[key]}</span>
                              <span className="text-[13px] font-bold" style={{ color: clientColor }}>{fmtCZK(val)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Produkty — tagy bez nadpisu */}
                    {client?.products && client.products.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-50">
                        {client.products.map(p => (
                          <span key={p} className="text-[12px] font-semibold px-2.5 py-1 rounded-[8px] text-white" style={{ background: clientColor }}>{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Klikací sekce — Úkoly */}
              <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors" onClick={() => setTab('ukoly')}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[18px]">✅</span>
                    <span className="text-[14px] font-extrabold text-gray-900">Úkoly</span>
                    {openTasks.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#3b82f6' }}>{openTasks.length}</span>}
                  </div>
                  <span className="text-gray-300 text-[16px]">→</span>
                </button>
                {openTasks.length > 0 ? (
                  <div className="border-t border-gray-50">
                    {openTasks.slice(0, 3).map(task => {
                      const PDOT: Record<number, string> = { 1: '#10b981', 2: '#f59e0b', 3: '#ef4444' }
                      return (
                        <div key={task.id} className="flex items-center gap-3 px-5 py-3 border-t border-gray-50 first:border-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PDOT[task.priority] ?? '#f59e0b' }} />
                          <span className="text-[13px] text-gray-800 flex-1 truncate">{task.title}</span>
                          {task.due_date && <span className="text-[11px] text-gray-400 flex-shrink-0">{new Date(task.due_date + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}</span>}
                        </div>
                      )
                    })}
                    {openTasks.length > 3 && <button onClick={() => setTab('ukoly')} className="w-full text-center py-2.5 text-[12px] font-semibold border-t border-gray-50 hover:bg-gray-50 transition-colors" style={{ color: clientColor }}>+ {openTasks.length - 3} dalších úkolů</button>}
                  </div>
                ) : <div className="border-t border-gray-50 px-5 py-3 text-[13px] text-gray-400">Žádné otevřené úkoly</div>}
              </div>

              {/* Klikací sekce — Aktivity */}
              <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors" onClick={() => setTab('aktivity')}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[18px]">📋</span>
                    <span className="text-[14px] font-extrabold text-gray-900">Aktivity</span>
                    {activities.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#10b981' }}>{activities.length}</span>}
                  </div>
                  <span className="text-gray-300 text-[16px]">→</span>
                </button>
                {activities.length > 0 ? (
                  <div className="border-t border-gray-50">
                    {activities.slice(0, 3).map(a => (
                      <div key={a.id} className="flex items-center gap-3 px-5 py-3 border-t border-gray-50 first:border-0">
                        <span className="text-[16px] flex-shrink-0">{ACTIVITY_ICONS[a.type]}</span>
                        <span className="text-[13px] text-gray-800 flex-1 truncate">{a.title}</span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">{fmtDate(a.activity_date)}</span>
                      </div>
                    ))}
                    {activities.length > 3 && <button onClick={() => setTab('aktivity')} className="w-full text-center py-2.5 text-[12px] font-semibold border-t border-gray-50 hover:bg-gray-50 transition-colors" style={{ color: clientColor }}>+ {activities.length - 3} dalších aktivit</button>}
                  </div>
                ) : <div className="border-t border-gray-50 px-5 py-3 text-[13px] text-gray-400">Žádné aktivity</div>}
              </div>

              {/* Klikací sekce — Obchody */}
              {(() => {
                const activeDeals = deals.filter(d => d.stage !== 'Uzavřen' && d.stage !== 'Ztracen')
                return (
                  <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors" onClick={() => setTab('obchody')}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[18px]">💰</span>
                        <span className="text-[14px] font-extrabold text-gray-900">Obchody</span>
                        {activeDeals.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#8b5cf6' }}>{activeDeals.length} aktivní</span>}
                      </div>
                      <span className="text-gray-300 text-[16px]">→</span>
                    </button>
                    {activeDeals.length > 0 ? (
                      <div className="border-t border-gray-50">
                        {activeDeals.slice(0, 3).map(deal => (
                          <div key={deal.id} className="flex items-center gap-3 px-5 py-3 border-t border-gray-50 first:border-0">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DEAL_STAGE_COLORS[deal.stage] }} />
                            <span className="text-[13px] text-gray-800 flex-1 truncate">{deal.title}</span>
                            <span className="text-[12px] font-bold flex-shrink-0" style={{ color: DEAL_STAGE_COLORS[deal.stage] }}>{fmtCZK(deal.value)}</span>
                          </div>
                        ))}
                        {activeDeals.length > 3 && <button onClick={() => setTab('obchody')} className="w-full text-center py-2.5 text-[12px] font-semibold border-t border-gray-50 hover:bg-gray-50 transition-colors" style={{ color: clientColor }}>+ {activeDeals.length - 3} dalších obchodů</button>}
                      </div>
                    ) : <div className="border-t border-gray-50 px-5 py-3 text-[13px] text-gray-400">Žádné aktivní obchody</div>}
                  </div>
                )
              })()}

            </div>
          )}

          {/* ══ ÚKOLY ══ */}
          {tab === 'ukoly' && (
            <>
              <div className="flex gap-2 mb-4 items-center justify-between">
                <div className="flex gap-2">
                  {(['open', 'done'] as const).map(t => (
                    <button key={t} onClick={() => setTaskTab(t)}
                      className="px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all"
                      style={{ background: taskTab === t ? clientColor : '#f3f4f6', color: taskTab === t ? '#fff' : '#6b7280' }}>
                      {t === 'open' ? `Otevřené (${openTasks.length})` : `Hotové (${doneTasks.length})`}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowQuickAdd(v => !v)}
                  className="px-3 py-2 rounded-[10px] text-[13px] font-bold text-white"
                  style={{ background: clientColor }}>+ Přidat</button>
              </div>
              {showQuickAdd && (
                <div className="bg-white rounded-[14px] p-3 mb-4" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div className="flex gap-2">
                    <input className="flex-1 bg-gray-50 border rounded-[10px] px-3 py-2 text-[13px] outline-none" style={{ borderColor: clientColor }}
                      placeholder="Napiš úkol… (p2, zítra, …)" value={quickInput} onChange={e => setQuickInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); if (e.key === 'Escape') setShowQuickAdd(false) }}/>
                    <button onClick={handleQuickAdd} className="px-4 py-2 rounded-[10px] text-white text-[13px] font-bold" style={{ background: clientColor }}>+</button>
                    <button onClick={() => setShowQuickAdd(false)} className="px-3 py-2 rounded-[10px] border border-gray-200 text-gray-400">✕</button>
                  </div>
                </div>
              )}
              {(taskTab === 'open' ? openTasks : doneTasks).length === 0 ? (
                <div className="text-center py-10"><div className="text-[36px] mb-2">{taskTab === 'done' ? '📭' : '✅'}</div>
                  <p className="text-[14px] font-semibold text-gray-500">{taskTab === 'done' ? 'Zatím nic hotového' : 'Žádné úkoly'}</p></div>
              ) : (
                <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  {(taskTab === 'open' ? openTasks : doneTasks).map((task, i) => (
                    <div key={task.id}>
                      <TaskItem task={task} categories={DEFAULT_TODO_CATEGORIES} onToggle={toggleTask} onDelete={removeTask} onEdit={openEditTask} />
                      {i < (taskTab === 'open' ? openTasks : doneTasks).length - 1 && <div className="h-px bg-gray-100 mx-4" />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══ AKTIVITY ══ */}
          {tab === 'aktivity' && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowAddActivity(true)}
                  className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-white"
                  style={{ background: clientColor }}>+ Aktivita</button>
              </div>
              {activities.length === 0 ? (
                <div className="text-center py-10"><div className="text-[36px] mb-2">📋</div>
                  <p className="text-[14px] font-semibold text-gray-500">Zatím žádné aktivity</p></div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activities.map(a => (
                    <div key={a.id} className="bg-white rounded-[14px] p-4 flex items-start gap-3" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                      <span className="text-[22px] mt-0.5">{ACTIVITY_ICONS[a.type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[14px] font-bold text-gray-900">{a.title}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{ACTIVITY_LABELS[a.type]}</span>
                        </div>
                        {a.description && <div className="text-[13px] text-gray-600 mb-1">{a.description}</div>}
                        <div className="text-[11px] text-gray-400">{fmtDateTime(a.activity_date)}</div>
                      </div>
                      <button onClick={() => handleDeleteActivity(a.id)} className="text-gray-300 hover:text-red-400 text-[18px] transition-colors flex-shrink-0">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══ OBCHODY ══ */}
          {tab === 'obchody' && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={openAddDeal}
                  className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-white"
                  style={{ background: clientColor }}>+ Obchod</button>
              </div>
              {deals.length === 0 ? (
                <div className="text-center py-10"><div className="text-[36px] mb-2">💰</div>
                  <p className="text-[14px] font-semibold text-gray-500">Zatím žádné obchody</p></div>
              ) : (
                <div className="flex flex-col gap-3">
                  {deals.map(deal => (
                    <div key={deal.id} className="bg-white rounded-[14px] p-4 cursor-pointer hover:shadow-md transition-shadow"
                      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: `4px solid ${DEAL_STAGE_COLORS[deal.stage]}` }}
                      onClick={() => openEditDeal(deal)}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[15px] font-bold text-gray-900">{deal.title}</div>
                        <div className="text-[14px] font-bold" style={{ color: DEAL_STAGE_COLORS[deal.stage] }}>{fmtCZK(deal.value)}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: DEAL_STAGE_COLORS[deal.stage] + '18', color: DEAL_STAGE_COLORS[deal.stage] }}>{deal.stage}</span>
                        <span className="text-[12px] text-gray-500">{deal.probability}% pravděpodobnost</span>
                        {deal.expected_close && <span className="text-[12px] text-gray-400">📅 {fmtDate(deal.expected_close)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══ KONTAKTY ══ */}
          {tab === 'kontakty' && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => openAddContact()}
                  className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-white"
                  style={{ background: clientColor }}>+ Kontakt</button>
              </div>
              {contacts.length === 0 ? (
                <div className="text-center py-10"><div className="text-[36px] mb-2">👤</div>
                  <p className="text-[14px] font-semibold text-gray-500">Zatím žádné kontaktní osoby</p></div>
              ) : (
                <div className="flex flex-col gap-3">
                  {contacts.map(c => (
                    <div key={c.id} onClick={() => openEditContact(c)} className="bg-white rounded-[14px] p-4 flex items-start gap-4 cursor-pointer hover:shadow-md transition-all" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] font-bold text-white flex-shrink-0"
                        style={{ background: clientColor }}>{c.name[0].toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold text-gray-900">{c.name}</span>
                          {c.is_primary && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">Primární</span>}
                          {c.role && <span className="text-[12px] text-gray-500">{c.role}</span>}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {c.phone && <span className="text-[13px] text-gray-600">📞 {c.phone}</span>}
                          {c.email && <span className="text-[13px] text-gray-600">✉️ {c.email}</span>}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDeleteContact(c.id) }} className="text-gray-300 hover:text-red-400 text-[18px] transition-colors">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══ OBJEDNÁVKY ══ */}
          {tab === 'objednavky' && (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {pendingOrders.length > 0 && (
                    <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
                      🧾 {pendingOrders.length} čeká na fakturaci
                    </span>
                  )}
                </div>
                <button onClick={openAddOrder}
                  className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-white"
                  style={{ background: clientColor }}>
                  + Přidat objednávku
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-[48px] mb-3">📦</div>
                  <p className="text-[14px] font-semibold text-gray-500 mb-1">Zatím žádné objednávky</p>
                  <p className="text-[12px] text-gray-400">Zaznamenej co si klient odebral, ať nezapomeneš fakturovat</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Nefakturované */}
                  {pendingOrders.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wide px-1 mb-2">
                        Čeká na fakturaci
                      </div>
                      <div className="flex flex-col gap-2">
                        {pendingOrders.map(order => (
                          <OrderRow
                            key={order.id}
                            order={order}
                            clientColor={clientColor}
                            onEdit={() => openEditOrder(order)}
                            onToggle={() => toggleInvoiced(order)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fakturované */}
                  {orders.filter(o => o.invoiced).length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 mb-2 mt-2">
                        Fakturováno
                      </div>
                      <div className="flex flex-col gap-2">
                        {orders.filter(o => o.invoiced).map(order => (
                          <OrderRow
                            key={order.id}
                            order={order}
                            clientColor={clientColor}
                            onEdit={() => openEditOrder(order)}
                            onToggle={() => toggleInvoiced(order)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ SCHŮZKY ══ */}
          {/* ══ POZNÁMKY ══ */}
          {tab === 'poznamky' && (
            <div className="flex flex-col gap-3">
              {/* Title row + save indicator */}
              <div className="flex items-center gap-3">
                <input
                  className="flex-1 bg-transparent border-none outline-none text-[24px] font-extrabold text-gray-900 placeholder-gray-200"
                  placeholder="Název poznámky"
                  value={noteTitle}
                  onChange={e => {
                    setNoteTitle(e.target.value)
                    if (clientNote) scheduleSaveNote(e.target.value, noteContent, clientNote.id)
                  }}
                />
                <span className={`text-[11px] font-semibold flex-shrink-0 transition-colors ${
                  noteSaveState === 'saved'   ? 'text-green-400' :
                  noteSaveState === 'saving'  ? 'text-amber-400' :
                  'text-gray-300'
                }`}>
                  {noteSaveState === 'saved' ? '✓ Uloženo' : noteSaveState === 'saving' ? 'Ukládám…' : '● Neuloženo'}
                </span>
              </div>

              {/* Rich text editor */}
              <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <RichTextEditor
                  value={noteContent}
                  onChange={val => {
                    setNoteContent(val)
                    if (clientNote) scheduleSaveNote(noteTitle, val, clientNote.id)
                  }}
                  placeholder="Začni psát poznámky ke klientovi…"
                  minHeight={320}
                  className="px-3"
                />
              </div>
            </div>
          )}

          {tab === 'schuzky' && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowAddMeeting(true)}
                  className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-white"
                  style={{ background: clientColor }}>🤝 Nová schůzka</button>
              </div>

              {meetings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-[48px] mb-3">🤝</div>
                  <p className="text-[14px] font-semibold text-gray-500 mb-1">Zatím žádné schůzky</p>
                  <p className="text-[12px] text-gray-400">Přidej schůzku a rovnou si dělej zápisky</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {meetings.map(m => (
                    <Link key={m.id} href={`/poznamky/${m.id}`}
                      className="bg-white rounded-[14px] p-4 flex items-center gap-4 hover:shadow-md transition-all"
                      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] flex-shrink-0"
                        style={{ background: clientColor + '18' }}>
                        🤝
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-gray-900 truncate">{m.title}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {m.meeting_date && (
                            <span className="text-[12px] text-gray-400">
                              📅 {new Date(m.meeting_date + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {m.content && (
                            <span className="text-[11px] text-gray-300 truncate">{m.content.slice(0, 60)}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-300 text-[16px] flex-shrink-0">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Add meeting modal ── */}
      {showAddMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddMeeting(false) }}>
          <div className="bg-white rounded-[24px] p-6 w-full shadow-2xl mx-4" style={{ maxWidth: 420 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-gray-900">🤝 Nová schůzka</h2>
              <button onClick={() => setShowAddMeeting(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Název schůzky *</label>
                <input className={fieldCls} value={mTitle} onChange={e => setMTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMeeting()}
                  placeholder="Např. Prezentace nabídky, Podpis smlouvy…"/>
              </div>
              <div>
                <label className={labelCls}>Datum</label>
                <input className={fieldCls} type="date" value={mDate} onChange={e => setMDate(e.target.value)} />
              </div>
              <p className="text-[12px] text-gray-400 -mt-1">
                Po přidání se otevře zápisník přímo pro tuto schůzku.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowAddMeeting(false)} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
                <button onClick={handleAddMeeting} disabled={!mTitle.trim() || creatingMeeting}
                  className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
                  style={{ background: clientColor }}>
                  {creatingMeeting ? '…' : '🤝 Přidat & otevřít'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit order modal ── */}
      {showAddOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddOrder(false) }}>
          <div className="bg-white rounded-[24px] p-6 w-full shadow-2xl mx-4" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-gray-900">
                📦 {editingOrder ? 'Upravit objednávku' : 'Nová objednávka'}
              </h2>
              <button onClick={() => setShowAddOrder(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Datum *</label>
                  <input className={fieldCls} type="date" value={oDate} onChange={e => setODate(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Částka (Kč)</label>
                  <input className={fieldCls} type="number" value={oAmount} onChange={e => setOAmount(e.target.value)}
                    placeholder="Volitelné" min="0" step="1" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Předmět / Popis *</label>
                <input className={fieldCls} value={oSubject} onChange={e => setOSubject(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveOrder()}
                  placeholder="Např. Certifikát TWINS Kval, Čipová karta, Obnova…" />
              </div>
              <div>
                <label className={labelCls}>Poznámka</label>
                <input className={fieldCls} value={oNote} onChange={e => setONote(e.target.value)}
                  placeholder="Volitelná poznámka…" />
              </div>
              <div className="flex gap-3 pt-1">
                {editingOrder && (
                  <button onClick={() => handleDeleteOrder(editingOrder.id)}
                    className="px-4 py-3 rounded-[14px] border border-red-100 text-red-400 text-[13px] font-semibold hover:bg-red-50 transition-colors">
                    🗑️
                  </button>
                )}
                <button onClick={() => setShowAddOrder(false)} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
                <button onClick={handleSaveOrder} disabled={!oSubject.trim()}
                  className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40"
                  style={{ background: clientColor }}>
                  {editingOrder ? 'Uložit' : '+ Přidat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add contact modal ── */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAddContact(false); setEditingContact(null) } }}>
          <div className="bg-white rounded-[24px] p-6 w-full shadow-2xl mx-4" style={{ maxWidth: 420 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-gray-900">{editingContact ? '✏️ Upravit kontakt' : '👤 Nová kontaktní osoba'}</h2>
              <button onClick={() => { setShowAddContact(false); setEditingContact(null) }} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div><label className={labelCls}>Jméno *</label><input className={fieldCls} value={cName} onChange={e => setCName(e.target.value)} placeholder="Jméno a příjmení"/></div>
              <div><label className={labelCls}>Funkce / Role</label><input className={fieldCls} value={cRole} onChange={e => setCRole(e.target.value)} placeholder="CEO, Obchodní ředitel…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Telefon</label><input className={fieldCls} value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="+420…" /></div>
                <div><label className={labelCls}>Email</label><input className={fieldCls} value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="email@…" /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={cPrimary} onChange={e => setCPrimary(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-[13px] font-medium text-gray-700">Primární kontakt</span>
              </label>
              {editingContact && (
                <button onClick={() => handleDeleteContact(editingContact.id)}
                  className="w-full py-2.5 rounded-[12px] border border-red-200 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors">
                  🗑 Smazat kontakt
                </button>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowAddContact(false); setEditingContact(null) }} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
                <button onClick={handleSaveContact} disabled={!cName.trim()} className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40" style={{ background: clientColor }}>{editingContact ? 'Uložit' : 'Přidat'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add activity modal ── */}
      {showAddActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddActivity(false) }}>
          <div className="bg-white rounded-[24px] p-6 w-full shadow-2xl mx-4" style={{ maxWidth: 420 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-gray-900">📋 Nová aktivita</h2>
              <button onClick={() => setShowAddActivity(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Typ</label>
                <div className="flex gap-2">
                  {ACTIVITY_TYPES.map(t => (
                    <button key={t} onClick={() => setAType(t)}
                      className="flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-all flex flex-col items-center gap-1"
                      style={{ background: aType === t ? clientColor : '#f3f4f6', color: aType === t ? '#fff' : '#6b7280' }}>
                      <span>{ACTIVITY_ICONS[t]}</span>
                      <span className="text-[10px]">{ACTIVITY_LABELS[t]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div><label className={labelCls}>Popis *</label><input className={fieldCls} value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="Co se řešilo…"/></div>
              <div><label className={labelCls}>Podrobnosti</label><textarea className={fieldCls + ' resize-none'} rows={2} value={aDesc} onChange={e => setADesc(e.target.value)} placeholder="Volitelné podrobnosti…" /></div>
              <div><label className={labelCls}>Datum a čas</label><input className={fieldCls} type="datetime-local" value={aDate} onChange={e => setADate(e.target.value)} /></div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddActivity(false)} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
                <button onClick={handleAddActivity} disabled={!aTitle.trim()} className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40" style={{ background: clientColor }}>Přidat</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit deal modal ── */}
      {showAddDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddDeal(false) }}>
          <div className="bg-white rounded-[24px] p-6 w-full shadow-2xl mx-4 overflow-y-auto" style={{ maxWidth: 460, maxHeight: '90vh' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-gray-900">{editingDeal ? '✏️ Upravit obchod' : '💰 Nový obchod'}</h2>
              <button onClick={() => setShowAddDeal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-3">
              <div><label className={labelCls}>Název *</label><input className={fieldCls} value={dTitle} onChange={e => setDTitle(e.target.value)} placeholder="Název zakázky nebo projektu"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Hodnota (CZK)</label><input className={fieldCls} type="number" value={dValue} onChange={e => setDValue(e.target.value)} placeholder="0" /></div>
                <div><label className={labelCls}>Pravděpodobnost %</label><input className={fieldCls} type="number" min="0" max="100" value={dProb} onChange={e => setDProb(e.target.value)} /></div>
              </div>
              <div>
                <label className={labelCls}>Fáze</label>
                <div className="flex flex-wrap gap-2">
                  {DEAL_STAGES.map(s => (
                    <button key={s} onClick={() => setDStage(s)}
                      className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
                      style={{ background: dStage === s ? DEAL_STAGE_COLORS[s] : DEAL_STAGE_COLORS[s] + '18', color: dStage === s ? '#fff' : DEAL_STAGE_COLORS[s] }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className={labelCls}>Očekávané uzavření</label><input className={fieldCls} type="date" value={dClose} onChange={e => setDClose(e.target.value)} /></div>
              <div><label className={labelCls}>Poznámky</label><textarea className={fieldCls + ' resize-none'} rows={2} value={dNotes} onChange={e => setDNotes(e.target.value)} placeholder="…" /></div>
              <div className="flex gap-3 pt-1">
                {editingDeal && <button onClick={() => handleDeleteDeal(editingDeal.id)} className="px-4 py-3 rounded-[14px] border border-red-200 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors">Smazat</button>}
                <button onClick={() => setShowAddDeal(false)} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
                <button onClick={handleSaveDeal} disabled={!dTitle.trim()} className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40" style={{ background: DEAL_STAGE_COLORS[dStage] }}>
                  {editingDeal ? 'Uložit' : 'Přidat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit task modal ── */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditingTask(null) }}>
          <div className="bg-white rounded-[24px] p-6 w-full shadow-2xl mx-4" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-gray-900">✏️ Upravit úkol</h2>
              <button onClick={() => setEditingTask(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Název *</label>
                <input className={fieldCls} value={tTitle} onChange={e => setTTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTask()}/>
              </div>
              <div>
                <label className={labelCls}>Priorita</label>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map(p => {
                    const labels: Record<number, { label: string; color: string }> = {
                      1: { label: '🟢 Nízká',   color: '#10b981' },
                      2: { label: '🟡 Střední',  color: '#f59e0b' },
                      3: { label: '🔴 Vysoká',   color: '#ef4444' },
                    }
                    return (
                      <button key={p} onClick={() => setTPriority(p)}
                        className="flex-1 py-2.5 rounded-[10px] text-[12px] font-semibold transition-all"
                        style={{ background: tPriority === p ? labels[p].color : labels[p].color + '15', color: tPriority === p ? '#fff' : labels[p].color }}>
                        {labels[p].label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls}>Termín</label>
                <input className={fieldCls} type="date" value={tDueDate} onChange={e => setTDueDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Poznámka</label>
                <input className={fieldCls} value={tNote} onChange={e => setTNote(e.target.value)} placeholder="Volitelná poznámka…" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditingTask(null)} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
                <button onClick={handleSaveTask} disabled={!tTitle.trim()} className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white disabled:opacity-40" style={{ background: clientColor }}>Uložit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit client modal ── */}
      {showEditClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditClient(false) }}>
          <div className="bg-white rounded-[24px] p-6 w-full shadow-2xl mx-4 overflow-y-auto" style={{ maxWidth: 480, maxHeight: '90vh' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-gray-900">✏️ Upravit klienta</h2>
              <button onClick={() => setShowEditClient(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-[20px]">×</button>
            </div>
            <div className="flex flex-col gap-4">

              {/* Základní info */}
              <div>
                <label className={labelCls}>Název klienta *</label>
                <input className={fieldCls} value={eName} onChange={e => setEName(e.target.value)} placeholder="Název firmy…"/>
              </div>

              {/* Status */}
              <div>
                <label className={labelCls}>Status</label>
                <div className="flex gap-2 flex-wrap">
                  {CLIENT_STATUSES.map(s => {
                    const sc: Record<string,string> = { 'Potenciální':'#f59e0b','Aktivní':'#10b981','Pozastavený':'#94a3b8','Ukončený':'#ef4444' }
                    return (
                      <button key={s} onClick={() => setEStatus(s)}
                        className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
                        style={{ background: eStatus === s ? sc[s] : sc[s]+'18', color: eStatus === s ? '#fff' : sc[s] }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Ikona */}
              <div>
                <label className={labelCls}>Ikona</label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_ICONS.map(ic => (
                    <button key={ic} onClick={() => setEIcon(ic)}
                      className="w-10 h-10 text-[20px] rounded-[10px] flex items-center justify-center transition-all"
                      style={{ background: eIcon === ic ? eColor+'25' : '#f3f4f6', outline: eIcon === ic ? `2px solid ${eColor}` : 'none' }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barva */}
              <div>
                <label className={labelCls}>Barva</label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_COLORS.map(c => (
                    <button key={c} onClick={() => setEColor(c)}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{ background: c, outline: eColor === c ? `3px solid ${c}` : '2px solid transparent', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[12px]">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px]" style={{ background: eColor + '25' }}>{eIcon}</div>
                <div>
                  <div className="text-[14px] font-bold text-gray-900">{eName || 'Název klienta'}</div>
                  <div className="text-[11px] font-semibold" style={{ color: eColor }}>{eStatus}</div>
                </div>
              </div>

              {/* Kategorizace */}
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide border-t border-gray-100 pt-1">Kategorizace</div>

              {/* PP číslo */}
              <div>
                <label className={labelCls}>PP — ID zákazníka v systému</label>
                <input className={fieldCls} value={ePartnerID} onChange={e => setEPartnerID(e.target.value)} placeholder="napr. 12345" />
              </div>

              {/* Typ subjektu */}
              <div>
                <label className={labelCls}>Typ subjektu</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setESubjectType('')}
                    className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
                    style={{ background: eSubjectType === '' ? '#6b7280' : '#f3f4f6', color: eSubjectType === '' ? '#fff' : '#6b7280' }}>
                    Nezadáno
                  </button>
                  {SUBJECT_TYPES.map(t => (
                    <button key={t} onClick={() => setESubjectType(t)}
                      className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all"
                      style={{
                        background: eSubjectType === t ? SUBJECT_TYPE_COLORS[t] : SUBJECT_TYPE_COLORS[t] + '18',
                        color: eSubjectType === t ? '#fff' : SUBJECT_TYPE_COLORS[t],
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Praha checkbox */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setEIsPrague(v => !v)}
                    className="w-10 h-6 rounded-full transition-all flex-shrink-0 relative"
                    style={{ background: eIsPrague ? '#0ea5e9' : '#d1d5db' }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: eIsPrague ? 'calc(100% - 20px)' : '4px' }} />
                  </div>
                  <span className="text-[13px] font-semibold text-gray-700">🏙️ Zákazník je z Prahy</span>
                </label>
              </div>

              {/* Kontaktní sekce */}
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide border-t border-gray-100 pt-1">Kontaktní údaje</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Email</label><input className={fieldCls} value={eEmail} onChange={e => setEEmail(e.target.value)} placeholder="email@firma.cz" /></div>
                <div><label className={labelCls}>Telefon</label><input className={fieldCls} value={ePhone} onChange={e => setEPhone(e.target.value)} placeholder="+420…" /></div>
              </div>
              <div><label className={labelCls}>Fakturační email</label><input className={fieldCls} value={eBillingEmail} onChange={e => setEBillingEmail(e.target.value)} placeholder="fakturace@firma.cz" /></div>
              <div><label className={labelCls}>Web</label><input className={fieldCls} value={eWebsite} onChange={e => setEWebsite(e.target.value)} placeholder="https://…" /></div>
              <div><label className={labelCls}>Adresa</label><input className={fieldCls} value={eAddress} onChange={e => setEAddress(e.target.value)} placeholder="Ulice, Město" /></div>
              <div><label className={labelCls}>Poznámky</label><textarea className={fieldCls + ' resize-none'} rows={2} value={eNotes} onChange={e => setENotes(e.target.value)} placeholder="Volné poznámky…" /></div>

              {/* První schůzka */}
              <div>
                <label className={labelCls}>1. schůzka</label>
                <div className="flex gap-2">
                  {([null, 'not_yet', 'scheduled', 'done'] as const).map(s => {
                    const color = s ? FIRST_MEETING_COLORS[s] : '#d1d5db'
                    const label = s ? FIRST_MEETING_LABELS[s] : 'Nenastaveno'
                    return (
                      <button key={String(s)} onClick={() => setEFirstMeeting(s)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold transition-all"
                        style={{ background: eFirstMeeting === s ? color + '25' : '#f3f4f6', color: eFirstMeeting === s ? color : '#9ca3af', outline: eFirstMeeting === s ? `2px solid ${color}` : 'none' }}>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Interní sekce */}
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-1 border-t border-gray-100">Interní data</div>

              {/* Produkty */}
              <div>
                <label className={labelCls}>Produkty</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {eProducts.map(p => (
                    <span key={p} className="flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-[8px] text-white" style={{ background: clientColor }}>
                      {p}
                      <button onClick={() => setEProducts(prev => prev.filter(x => x !== p))} className="text-white/70 hover:text-white text-[14px] leading-none">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className={fieldCls} value={eProductInput} onChange={e => setEProductInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && eProductInput.trim()) {
                        e.preventDefault()
                        setEProducts(prev => [...prev, eProductInput.trim()])
                        setEProductInput('')
                      }
                    }}
                    placeholder="Název produktu, Enter pro přidání…" />
                  <button onClick={() => { if (eProductInput.trim()) { setEProducts(prev => [...prev, eProductInput.trim()]); setEProductInput('') } }}
                    className="px-3 py-2 rounded-[12px] text-white text-[13px] font-bold flex-shrink-0" style={{ background: clientColor }}>+</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Počet RA</label>
                  <input className={fieldCls} type="number" min="0" value={eRaCount} onChange={e => setERaCount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Měs. průměr fakturace (CZK)</label>
                  <input className={fieldCls} type="number" min="0" value={eMonthlyAvg} onChange={e => setEMonthlyAvg(e.target.value)} placeholder="0" />
                </div>
              </div>

              {/* Ceník */}
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-1 border-t border-gray-100">Ceník služeb (CZK / ks)</div>

              {/* HW položky — každá má název + cenu */}
              {([1, 2] as const).map(n => {
                const nameKey = `hw_${n}_name`  as 'hw_1_name' | 'hw_2_name'
                const priceKey = `hw_${n}_price` as 'hw_1_price' | 'hw_2_price'
                return (
                  <div key={n} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className={labelCls}>HW {n} — název</label>
                      <input className={fieldCls} value={ePL[nameKey] ?? ''}
                        onChange={e => setPLField(nameKey, e.target.value || null)}
                        placeholder="Čip. karta / Čtečka…" />
                    </div>
                    <div style={{ width: 120 }}>
                      <label className={labelCls}>Cena (CZK)</label>
                      <input className={fieldCls} type="number" min="0"
                        value={ePL[priceKey] ?? ''}
                        onChange={e => setPLField(priceKey, e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="—" />
                    </div>
                  </div>
                )
              })}

              {/* Certifikáty */}
              <div className="grid grid-cols-2 gap-3">
                {CERT_PRICE_KEYS.map(key => (
                  <div key={key}>
                    <label className={labelCls}>{CERT_PRICE_LABELS[key]}</label>
                    <input className={fieldCls} type="number" min="0"
                      value={ePL[key] ?? ''}
                      onChange={e => setPLField(key, e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="—" />
                  </div>
                ))}
              </div>

              {/* Smazat klienta */}
              <div className="border-t border-gray-100 pt-3">
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="w-full py-2.5 rounded-[12px] border border-red-200 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors">
                    🗑 Smazat klienta
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="text-[13px] text-red-600 font-semibold text-center">Opravdu smazat? Tato akce je nevratná.</div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-[12px] border border-gray-200 text-[13px] font-semibold text-gray-500">Zrušit</button>
                      <button onClick={handleDeleteClient} className="flex-1 py-2.5 rounded-[12px] bg-red-500 text-[13px] font-bold text-white">Smazat</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowEditClient(false)} className="flex-1 py-3 rounded-[14px] border border-gray-200 text-[14px] font-semibold text-gray-500">Zrušit</button>
                <button onClick={handleSaveClient} className="flex-1 py-3 rounded-[14px] text-[14px] font-bold text-white" style={{ background: clientColor }}>Uložit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[13px] font-medium px-4 py-2.5 rounded-[14px] shadow-lg z-50 whitespace-nowrap">{toast}</div>
      )}
    </>
  )
}
