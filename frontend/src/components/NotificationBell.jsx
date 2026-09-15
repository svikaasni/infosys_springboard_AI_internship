import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'

const TYPE_ICON_COLOR = {
  bug_assigned: 'bg-alert-medium',
  bug_resolved: 'bg-signal-500',
  critical_bug: 'bg-alert-critical',
  ai_analysis_complete: 'bg-alert-high',
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/notifications', { params: { page: 1, page_size: 15 } })
      setItems(data.items)
      setUnreadCount(data.unread_count)
    } catch (err) {
      // Silently ignore — the bell just won't update this cycle.
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // simple poll; no websocket/push in this build
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openPanel = async () => {
    setOpen((v) => !v)
    if (!open) {
      setLoading(true)
      await load()
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await client.patch(`/notifications/${notif.id}/read`)
        setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)))
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch (err) {
        // non-fatal
      }
    }
    setOpen(false)
    if (notif.related_bug_id) {
      navigate(`/bugs/${notif.related_bug_id}`)
    }
  }

  const markAllRead = async () => {
    try {
      await client.patch('/notifications/read-all')
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      // non-fatal
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={openPanel}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-overlay/5 transition-colors"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5 text-slate-400">
          <path
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.65V5a2 2 0 1 0-4 0v.35A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-alert-critical px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 bg-surface border border-overlay/10 rounded-xl shadow-panel py-2 z-30"
          style={{ maxHeight: '70vh' }}
        >
          <div className="flex items-center justify-between px-4 pb-2 border-b border-overlay/5">
            <p className="text-sm font-semibold text-slate-200">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-signal-400 hover:text-signal-300">
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '55vh' }}>
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-overlay/5">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleNotificationClick(n)}
                      className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-overlay/5 transition-colors ${
                        n.is_read ? 'opacity-60' : ''
                      }`}
                    >
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${TYPE_ICON_COLOR[n.type] || 'bg-slate-500'}`} />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        {n.message}
                        <span className="block text-[11px] text-slate-600 mt-0.5">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
