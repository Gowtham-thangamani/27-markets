import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isStaffRole } from '@/lib/roles'
import { Logo } from '@/components/Logo'

/** Gate /admin routes behind an authenticated STAFF (Admin/Agent) session. */
export function RequireStaff({ children }: { children: ReactNode }) {
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

  if (!isStaffRole(user.role as Parameters<typeof isStaffRole>[0])) {
    return <Navigate to="/portal/dashboard" replace />
  }

  return <>{children}</>
}
