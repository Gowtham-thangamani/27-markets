import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isPartnerRole, isStaffRole } from '@/lib/roles'
import { Logo } from '@/components/Logo'

/** Gate /partner routes behind an authenticated PARTNER session. */
export function RequirePartner({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo withWordmark={false} size={40} />
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="text-sm text-gray-500">Checking access…</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  const role = user.role as Parameters<typeof isPartnerRole>[0]
  if (!isPartnerRole(role)) {
    return <Navigate to={isStaffRole(role) ? '/admin/dashboard' : '/portal/dashboard'} replace />
  }

  return <>{children}</>
}
