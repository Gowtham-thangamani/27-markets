import { useState } from 'react'
import { LogOut, ChevronDown } from 'lucide-react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { adminNav, isGroup, type AdminNavGroup } from './adminNav'
import { cn } from '@/lib/cn'

const STORAGE_KEY = 'admin-nav-expanded'

function loadExpanded(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function groupOfPath(pathname: string): string | undefined {
  const g = adminNav.find(
    (e): e is AdminNavGroup => isGroup(e) && e.children.some((c) => c.to === pathname),
  )
  return g?.label
}

export function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { pathname } = useLocation()
  const activeGroup = groupOfPath(pathname)

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const stored = loadExpanded()
    return activeGroup ? { ...stored, [activeGroup]: true } : stored
  })

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore persistence failures */
      }
      return next
    })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-brand-500/12 text-white ring-1 ring-brand-500/30'
        : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
    )

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-5">
        <Logo size={26} />
        <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-300 ring-1 ring-brand-500/30">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {adminNav.map((entry) => {
          if (!isGroup(entry)) {
            return (
              <NavLink key={entry.to} to={entry.to} onClick={onNavigate} className={linkClass}>
                <entry.icon className="h-[18px] w-[18px]" />
                <span>{entry.label}</span>
              </NavLink>
            )
          }
          const open = expanded[entry.label] ?? false
          const isActiveGroup = entry.label === activeGroup
          return (
            <div key={entry.label}>
              <button
                type="button"
                onClick={() => toggle(entry.label)}
                aria-expanded={open}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActiveGroup ? 'text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
                )}
              >
                <entry.icon className="h-[18px] w-[18px]" />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
              </button>
              {open && (
                <div className="mt-1 space-y-1 pl-4">
                  {entry.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={onNavigate}
                      end
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-brand-500/12 text-white ring-1 ring-brand-500/30'
                            : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
                        )
                      }
                    >
                      <span>{child.label}</span>
                      {child.placeholder && (
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                          soon
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Logout
        </button>
      </div>
    </div>
  )
}
