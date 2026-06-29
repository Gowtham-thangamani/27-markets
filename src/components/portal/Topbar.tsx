import { Bell, Menu, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge } from '@/components/ui'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { usePortalData } from '@/context/PortalDataContext'
import { initials, formatDateTime } from '@/lib/format'

interface TopbarProps {
  onOpenSidebar: () => void
  onOpenAccount: () => void
}

export function Topbar({ onOpenSidebar, onOpenAccount }: TopbarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notifications, markAllNotificationsRead } = usePortalData()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-900/85 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onOpenSidebar}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-white/[0.06] hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden sm:block">
        <p className="text-xs text-gray-500">Welcome back</p>
        <p className="text-sm font-semibold text-white">{user?.name ?? 'Trader'}</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" className="hidden gap-1.5 sm:inline-flex" onClick={onOpenAccount}>
          <Plus className="h-4 w-4" /> Open New Account
        </Button>

        <ThemeToggle />

        {/* Notifications */}
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
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 hover:bg-white/[0.04]"
              >
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

        {/* User menu */}
        <Dropdown
          align="right"
          trigger={
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-300 ring-1 ring-brand-500/30">
              {initials(user?.name ?? '27 Trader')}
            </span>
          }
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <div className="my-1 h-px bg-white/[0.06]" />
          <DropdownItem onClick={() => navigate('/portal/profile')}>Profile settings</DropdownItem>
          <DropdownItem onClick={() => navigate('/portal/kyc')}>KYC verification</DropdownItem>
          <DropdownItem onClick={() => navigate('/portal/support')}>Support</DropdownItem>
        </Dropdown>
      </div>
    </header>
  )
}
