import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { partnerNav } from './partnerNav'
import { cn } from '@/lib/cn'

export function PartnerSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-5">
        <Logo size={26} />
        <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-300 ring-1 ring-brand-500/30">
          Partner
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {partnerNav.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-500/12 text-white ring-1 ring-brand-500/30' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white',
            )}>
            <item.icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-danger/10 hover:text-danger">
          <LogOut className="h-[18px] w-[18px]" /> Logout
        </button>
      </div>
    </div>
  )
}
