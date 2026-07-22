import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui'
import { Dropdown } from '@/components/ui/Dropdown'
import { formatDateTime } from '@/lib/format'
import { partnerApi, type PartnerNotification } from '@/lib/partnerApi'

/**
 * Notifications bell for the partner portal header. Uses the shared
 * /notifications endpoint (same as the client portal), scoped by the auth user.
 */
export function PartnerNotificationsBell() {
  const [items, setItems] = useState<PartnerNotification[]>([])
  const unread = items.filter((n) => !n.read).length

  const load = useCallback(async () => {
    try { setItems(await partnerApi.getNotifications()) } catch { /* header widget stays quiet on failure */ }
  }, [])
  useEffect(() => { void load() }, [load])

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true }))) // optimistic
    try { await partnerApi.markNotificationsRead() } catch { void load() }
  }

  return (
    <Dropdown
      align="right"
      className="w-80"
      trigger={
        <span className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </span>
      }
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold text-white">Notifications</span>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300">Mark all read</button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">No notifications yet.</p>
        ) : items.map((n) => (
          <div key={n.id} className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 hover:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-white">{n.title}</span>
              {!n.read && <Badge tone="brand" dot>New</Badge>}
            </div>
            <span className="text-xs text-gray-400">{n.body}</span>
            <span className="text-[10px] text-gray-600">{formatDateTime(n.date)}</span>
          </div>
        ))}
      </div>
    </Dropdown>
  )
}
