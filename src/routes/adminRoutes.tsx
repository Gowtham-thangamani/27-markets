import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
import { AgentLayout } from '../layouts/AgentLayout'
import { RequireStaff } from '../components/admin/RequireStaff'
import { RequireAgent } from '../components/agent/RequireAgent'
import { placeholderLinks } from '../components/admin/adminNav'

const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminClientsPage = lazy(() => import('../pages/admin/AdminClientsPage'))
const AdminClientDetailPage = lazy(() => import('../pages/admin/AdminClientDetailPage'))
const AdminKycFieldsTabsPage = lazy(() => import('../pages/admin/AdminKycFieldsTabsPage'))
const AdminPaymentMethodTypesTabsPage = lazy(() => import('../pages/admin/AdminPaymentMethodTypesTabsPage'))
const AdminTemplatesTabsPage = lazy(() => import('../pages/admin/AdminTemplatesTabsPage'))
const AdminReferralsTabsPage = lazy(() => import('../pages/admin/AdminReferralsTabsPage'))
const AdminBlockedUsersPage = lazy(() => import('../pages/admin/AdminBlockedUsersPage'))
const AdminLeadsPage = lazy(() => import('../pages/admin/AdminLeadsPage'))
const AdminSupportPage = lazy(() => import('../pages/admin/AdminSupportPage'))
const AdminKycPage = lazy(() => import('../pages/admin/AdminKycPage'))
const AdminAmlPage = lazy(() => import('../pages/admin/AdminAmlPage'))
const AdminUsersKycPage = lazy(() => import('../pages/admin/AdminUsersKycPage'))
const AdminDocumentTrackerPage = lazy(() => import('../pages/admin/AdminDocumentTrackerPage'))
const AdminFinancePage = lazy(() => import('../pages/admin/AdminFinancePage'))
const AdminWithdrawalsPage = lazy(() => import('../pages/admin/AdminWithdrawalsPage'))
const AdminDepositRequestsPage = lazy(() => import('../pages/admin/AdminDepositRequestsPage'))
const AdminWalletsPage = lazy(() => import('../pages/admin/AdminWalletsPage'))
const AdminDormantAccountsPage = lazy(() => import('../pages/admin/AdminDormantAccountsPage'))
const AdminAccountRequestsPage = lazy(() => import('../pages/admin/AdminAccountRequestsPage'))
const AdminAccountsPage = lazy(() => import('../pages/admin/AdminAccountsPage'))
const AdminAccountTypesPage = lazy(() => import('../pages/admin/AdminAccountTypesPage'))
const AdminPaymentGatewaysPage = lazy(() => import('../pages/admin/AdminPaymentGatewaysPage'))
const AdminNotificationTemplatesPage = lazy(
  () => import('../pages/admin/AdminNotificationTemplatesPage'),
)
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'))
const AdminServersPage = lazy(() => import('../pages/admin/AdminServersPage'))
const AdminEconomicCalendarPage = lazy(() => import('../pages/admin/AdminEconomicCalendarPage'))
const AdminInstrumentsPage = lazy(() => import('../pages/admin/AdminInstrumentsPage'))
const AdminSiteContentPage = lazy(() => import('../pages/admin/AdminSiteContentPage'))
const AdminPaymentMethodTypesPage = lazy(
  () => import('../pages/admin/AdminPaymentMethodTypesPage'),
)
const AdminExchangeRatesPage = lazy(() => import('../pages/admin/AdminExchangeRatesPage'))
const AdminKycFieldsPage = lazy(() => import('../pages/admin/AdminKycFieldsPage'))
const AdminKycFormsPage = lazy(() => import('../pages/admin/AdminKycFormsPage'))
const AdminConsentsPage = lazy(() => import('../pages/admin/AdminConsentsPage'))
const AdminTextTemplatesPage = lazy(() => import('../pages/admin/AdminTextTemplatesPage'))
const AdminCampaignsPage = lazy(() => import('../pages/admin/AdminCampaignsPage'))
const AdminNotificationLogsPage = lazy(() => import('../pages/admin/AdminNotificationLogsPage'))
const AdminStaffFormAssignmentsPage = lazy(
  () => import('../pages/admin/AdminStaffFormAssignmentsPage'),
)
const AdminReferralsPage = lazy(() => import('../pages/admin/AdminReferralsPage'))
const AdminUserReferralsPage = lazy(() => import('../pages/admin/AdminUserReferralsPage'))
const AdminIbCampaignsPage = lazy(() => import('../pages/admin/AdminIbCampaignsPage'))
const AdminDataChangeRequestsPage = lazy(
  () => import('../pages/admin/AdminDataChangeRequestsPage'),
)
const AdminPartnersPage = lazy(() => import('../pages/admin/AdminPartnersPage'))
const AdminPartnerApplicationsPage = lazy(
  () => import('../pages/admin/AdminPartnerApplicationsPage'),
)
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage'))
const AdminStaffPage = lazy(() => import('../pages/admin/AdminStaffPage'))
const AdminBlogListPage = lazy(() => import('../pages/admin/AdminBlogListPage'))
const AdminBlogEditorPage = lazy(() => import('../pages/admin/AdminBlogEditorPage'))
const AdminDownloadsPage = lazy(() => import('../pages/admin/AdminDownloadsPage'))
const AdminPlaceholderPage = lazy(() => import('../pages/admin/AdminPlaceholderPage'))

const AgentDashboardPage = lazy(() => import('../pages/agent/AgentDashboardPage'))
const AgentLeadsPage = lazy(() => import('../pages/agent/AgentLeadsPage'))
const AgentTicketsPage = lazy(() => import('../pages/agent/AgentTicketsPage'))

/**
 * Secure staff back-office (CRM) and the agent workspace.
 * Both ship together: AGENT is a staff role, so the two trees share a host.
 */
export function adminRoutes() {
  return (
    <>
      <Route
        path="/admin"
        element={
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="clients" element={<AdminClientsPage />} />
        <Route path="clients/:id" element={<AdminClientDetailPage />} />
        <Route path="blocked-users" element={<AdminBlockedUsersPage />} />
        <Route path="leads" element={<AdminLeadsPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="kyc" element={<AdminKycPage />} />
        <Route path="aml" element={<AdminAmlPage />} />
        <Route path="users-kyc-forms" element={<AdminUsersKycPage />} />
        <Route path="document-tracker" element={<AdminDocumentTrackerPage />} />
        <Route path="finance" element={<AdminFinancePage />} />
        <Route path="withdrawal-requests" element={<AdminWithdrawalsPage />} />
        <Route path="deposit-requests" element={<AdminDepositRequestsPage />} />
        <Route path="wallets" element={<AdminWalletsPage />} />
        <Route path="dormant-accounts" element={<AdminDormantAccountsPage />} />
        <Route path="account-requests" element={<AdminAccountRequestsPage />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="account-types" element={<AdminAccountTypesPage />} />
        <Route path="payment-gateways" element={<AdminPaymentGatewaysPage />} />
        <Route path="notification-templates" element={<AdminNotificationTemplatesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="servers" element={<AdminServersPage />} />
        <Route path="economic-calendar" element={<AdminEconomicCalendarPage />} />
        <Route path="instruments" element={<AdminInstrumentsPage />} />
        <Route path="site-content" element={<AdminSiteContentPage />} />
        <Route
          path="credit-card-types"
          element={
            <AdminPaymentMethodTypesPage
              category="CARD"
              title="Credit Card Types"
              subtitle="Card brands accepted for deposits."
            />
          }
        />
        <Route
          path="ewallet-types"
          element={
            <AdminPaymentMethodTypesPage
              category="EWALLET"
              title="E-Wallet Types"
              subtitle="E-wallet providers accepted for deposits."
            />
          }
        />
        <Route path="exchange-rates" element={<AdminExchangeRatesPage />} />
        <Route
          path="kyc-questions"
          element={
            <AdminKycFieldsPage
              kind="QUESTION"
              title="KYC Questions"
              subtitle="Questions asked during KYC onboarding."
            />
          }
        />
        <Route
          path="extended-fields"
          element={
            <AdminKycFieldsPage
              kind="EXTENDED"
              title="Extended Fields"
              subtitle="Additional profile fields collected from clients."
            />
          }
        />
        <Route path="kyc-forms" element={<AdminKycFormsPage />} />
        <Route path="consents" element={<AdminConsentsPage />} />
        <Route
          path="pdf-templates"
          element={
            <AdminTextTemplatesPage
              kind="PDF"
              title="PDF Templates"
              subtitle="Document templates for statements, receipts, etc."
            />
          }
        />
        <Route
          path="comment-templates"
          element={
            <AdminTextTemplatesPage
              kind="COMMENT"
              title="Comment Templates"
              subtitle="Canned replies staff can reuse."
            />
          }
        />
        <Route path="campaigns" element={<AdminCampaignsPage />} />
        <Route path="notification-logs" element={<AdminNotificationLogsPage />} />
        <Route path="staff-forms-assignments" element={<AdminStaffFormAssignmentsPage />} />
        {/* Merged, tabbed pages. The old paths still resolve so existing
            bookmarks and links keep working. */}
        <Route path="kyc-fields" element={<AdminKycFieldsTabsPage />} />
        <Route path="payment-method-types" element={<AdminPaymentMethodTypesTabsPage />} />
        <Route path="templates" element={<AdminTemplatesTabsPage />} />
        <Route path="referrals" element={<AdminReferralsTabsPage />} />
        <Route path="user-referrals" element={<AdminUserReferralsPage />} />
        <Route path="ib-campaigns" element={<AdminIbCampaignsPage />} />
        <Route path="data-change-requests" element={<AdminDataChangeRequestsPage />} />
        <Route path="partners" element={<AdminPartnersPage />} />
        <Route path="partner-applications" element={<AdminPartnerApplicationsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="staff" element={<AdminStaffPage />} />
        <Route path="blog" element={<AdminBlogListPage />} />
        <Route path="blog/new" element={<AdminBlogEditorPage />} />
        <Route path="blog/:id" element={<AdminBlogEditorPage />} />
        <Route path="downloads" element={<AdminDownloadsPage />} />
        {placeholderLinks().map((l) => (
          <Route
            key={l.to}
            path={l.to.replace('/admin/', '')}
            element={<AdminPlaceholderPage />}
          />
        ))}
      </Route>

      {/* Secure agent workspace */}
      <Route
        path="/agent"
        element={
          <RequireAgent>
            <AgentLayout />
          </RequireAgent>
        }
      >
        <Route index element={<Navigate to="/agent/dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboardPage />} />
        <Route path="leads" element={<AgentLeadsPage />} />
        <Route path="tickets" element={<AgentTicketsPage />} />
      </Route>
    </>
  )
}
