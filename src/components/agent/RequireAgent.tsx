import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isAgentRole, isAdminRole, isPartnerRole } from '@/lib/roles'
import { Logo } from '@/components/Logo'

/** Gate /agent routes behind an authenticated AGENT (or ADMIN, for oversight). */
export function RequireAgent({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo size={40} />
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="text-sm text-gray-500">Checking access…</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  const role = user.role
  if (!isAgentRole(role) && !isAdminRole(role)) {
    return <Navigate to={isPartnerRole(role) ? '/partner/dashboard' : '/portal/dashboard'} replace />
  }

  return <>{children}</>
}
