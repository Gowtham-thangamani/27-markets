import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { PortalLayout } from '../layouts/PortalLayout'
import { RequireAuth } from '../components/portal/RequireAuth'

const DashboardPage = lazy(() => import('../pages/portal/DashboardPage'))
const TradePage = lazy(() => import('../pages/portal/TradePage'))
const PortalAccountsPage = lazy(() => import('../pages/portal/PortalAccountsPage'))
const FundsPage = lazy(() => import('../pages/portal/FundsPage'))
const KycPage = lazy(() => import('../pages/portal/KycPage'))
const DownloadsPage = lazy(() => import('../pages/portal/DownloadsPage'))
const ProfilePage = lazy(() => import('../pages/portal/ProfilePage'))
const SupportPage = lazy(() => import('../pages/portal/SupportPage'))

/** Secure client portal. */
export function portalRoutes() {
  return (
    <Route
      path="/portal"
      element={
        <RequireAuth>
          <PortalLayout />
        </RequireAuth>
      }
    >
      <Route index element={<Navigate to="/portal/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="trade" element={<TradePage />} />
      <Route path="accounts" element={<PortalAccountsPage />} />
      <Route path="funds" element={<FundsPage />} />
      <Route path="kyc" element={<KycPage />} />
      <Route path="downloads" element={<DownloadsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="support" element={<SupportPage />} />
    </Route>
  )
}
