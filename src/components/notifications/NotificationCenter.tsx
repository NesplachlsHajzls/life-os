'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  AppNotification,
  fetchNotifications,
  markAllRead,
  markRead,
  deleteNotification,
  generateUpcomingNotifications,
  getNotifLeadTime,
  setNotifLeadTime,
  NOTIF_LEAD_OPTIONS,
  NotifLeadTime,
} from '@/features/notifications/api'

// Module-level flag — persists across page navigations (component remounts)
// so generateUpcomingNotifications only runs ONCE per browser session
let _sessionGenerated = false

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Právě teď'
  if (min < 60) return `Před ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Před ${h} hod`
  return `Před ${Math.floor(h / 24)} d`
}

export function NotificationCenter() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [leadTime, setLeadTimeState] = useState<NotifLeadTime>(60)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  // Read lead time from localStorage after mount
  useEffect(() => {
    setLeadTimeState(getNotifLeadTime())
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    const data = await fetchNotifications(userId)
    setNotifications(data)
  }, [userId])

  // Generate notifications once per browser session (module-level guard prevents
  // duplicate calls when Header remounts on every page navigation)
  useEffect(() => {
    if (!userId || _sessionGenerated) return
    _sessionGenerated = true
    generateUpcomingNotifications(userId).then(() => load())
  }, [userId, load])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowSettings(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleMarkAllRead() {
    if (!userId) return
    await markAllRead(userId)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function handleMarkRead(id: string) {
    await markRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function handleDelete(id: string) {
    await deleteNotification(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  function handleLeadChange(v: NotifLeadTime) {
    setLeadTimeState(v)
    setNotifLeadTime(v)
    // Reset session flag so next app open re-generates with new setting
    _sessionGenerated = false
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(v => !v); setShowSettings(false); if (!open) load() }}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
        aria-label="Notifikace"
      >
        <span className="text-[18px]">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-[320px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[14px] font-bold text-gray-800">
              Notifikace {unread > 0 && <span className="ml-1 text-[11px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">{unread} nových</span>}
            </span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={handleMarkAllRead} className="text-[11px] text-[var(--color-primary)] font-semibold hover:opacity-70">
                  Vše přečteno
                </button>
              )}
              <button
                onClick={() => setShowSettings(v => !v)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[14px] transition-colors ${showSettings ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                title="Nastavení upozornění"
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Upozornit mě</p>
              <div className="flex flex-wrap gap-1.5">
                {NOTIF_LEAD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleLeadChange(opt.value)}
                    className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all"
                    style={{
                      background: leadTime === opt.value ? 'var(--color-primary)' : '#e5e7eb',
                      color: leadTime === opt.value ? '#fff' : '#6b7280',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Upozornění se generují při otevření appky.</p>
            </div>
          )}

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <span className="text-3xl mb-2">🔕</span>
                <span className="text-[13px]">Žádné notifikace</span>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[13px] font-semibold leading-snug ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {n.title}
                      </p>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(n.id) }}
                        className="text-gray-300 hover:text-gray-500 text-[12px] shrink-0 mt-0.5"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{fmtRelative(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
