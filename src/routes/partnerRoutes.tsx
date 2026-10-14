import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { PartnerLayout } from '../layouts/PartnerLayout'
import { RequirePartner } from '../components/partner/RequirePartner'

const PartnerDashboardPage = lazy(() => import('../pages/partner/PartnerDashboardPage'))
const PartnerClientsPage = lazy(() => import('../pages/partner/PartnerClientsPage'))
const PartnerClientDetailPage = lazy(() => import('../pages/partner/PartnerClientDetailPage'))
const PartnerPerformancePage = lazy(() => import('../pages/partner/PartnerPerformancePage'))
const PartnerSubPartnersPage = lazy(() => import('../pages/partner/PartnerSubPartnersPage'))
const PartnerSubPartnerClientsPage = lazy(
  () => import('../pages/partner/PartnerSubPartnerClientsPage'),
)
const PartnerCommissionsPage = lazy(() => import('../pages/partner/PartnerCommissionsPage'))
const PartnerPayoutsPage = lazy(() => import('../pages/partner/PartnerPayoutsPage'))
const PartnerReferralToolsPage = lazy(() => import('../pages/partner/PartnerReferralToolsPage'))
const PartnerMarketingPage = lazy(() => import('../pages/partner/PartnerMarketingPage'))
const PartnerSettingsPage = lazy(() => import('../pages/partner/PartnerSettingsPage'))

/** Secure partner / IB portal. */
export function partnerRoutes() {
  return (
    <Route
      path="/partner"
      element={
        <RequirePartner>
          <PartnerLayout />
        </RequirePartner>
      }
    >
      <Route index element={<Navigate to="/partner/dashboard" replace />} />
      <Route path="dashboard" element={<PartnerDashboardPage />} />
      <Route path="clients" element={<PartnerClientsPage />} />
      <Route path="clients/:id" element={<PartnerClientDetailPage />} />
      <Route path="performance" element={<PartnerPerformancePage />} />
      <Route path="sub-partners" element={<PartnerSubPartnersPage />} />
      <Route path="sub-partners/:id/clients" element={<PartnerSubPartnerClientsPage />} />
      <Route path="commissions" element={<PartnerCommissionsPage />} />
      <Route path="payouts" element={<PartnerPayoutsPage />} />
      <Route path="tools" element={<PartnerReferralToolsPage />} />
      <Route path="marketing" element={<PartnerMarketingPage />} />
      <Route path="settings" element={<PartnerSettingsPage />} />
    </Route>
  )
}
