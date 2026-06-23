import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { portalNav } from './sidebarNav'
import { cn } from '@/lib/cn'

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const toast = useToast()

  const handleLogout = async () => {
    await logout()
    toast.info('Signed out', 'You have been logged out of your portal.')
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-white/[0.06] px-5">
        <NavLink to="/" aria-label="27 Markets home">
          <Logo size={26} />
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {portalNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="portal-active"
                    className="absolute inset-0 rounded-xl bg-brand-500/12 ring-1 ring-brand-500/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-brand-500" style={{ width: 3 }} />
                )}
                <item.icon className={cn('relative z-10 h-[18px] w-[18px]', isActive && 'text-brand-400')} />
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
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
