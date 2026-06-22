import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/Logo'

/** Gate portal routes behind an authenticated session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // While the session is being restored, hold rather than bounce to /login.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo withWordmark={false} size={40} />
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="text-sm text-gray-500">Restoring your session…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
