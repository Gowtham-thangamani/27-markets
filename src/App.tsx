import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SplashScreen } from './components/SplashScreen'
import { MaintenanceBanner } from './components/MaintenanceBanner'
import { MarketingLayout } from './layouts/MarketingLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { RequireAuth } from './components/portal/RequireAuth'
import { RequireStaff } from './components/admin/RequireStaff'
import { RequirePartner } from './components/partner/RequirePartner'
import { PartnerLayout } from './layouts/PartnerLayout'
import { placeholderLinks } from './components/admin/adminNav'

// Route components are code-split: each page ships as its own chunk and is
// fetched on navigation, so a visitor to "/" no longer downloads the admin,
// partner, and portal bundles up front.
const LegalPage = lazy(() => import('./pages/LegalPage'))
const PartnerDashboardPage = lazy(() => import('./pages/partner/PartnerDashboardPage'))
const PartnerClientsPage = lazy(() => import('./pages/partner/PartnerClientsPage'))
const PartnerReferralToolsPage = lazy(() => import('./pages/partner/PartnerReferralToolsPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminClientsPage = lazy(() => import('./pages/admin/AdminClientsPage'))
const AdminBlockedUsersPage = lazy(() => import('./pages/admin/AdminBlockedUsersPage'))
const AdminLeadsPage = lazy(() => import('./pages/admin/AdminLeadsPage'))
const AdminSupportPage = lazy(() => import('./pages/admin/AdminSupportPage'))
const AdminKycPage = lazy(() => import('./pages/admin/AdminKycPage'))
const AdminAmlPage = lazy(() => import('./pages/admin/AdminAmlPage'))
const AdminUsersKycPage = lazy(() => import('./pages/admin/AdminUsersKycPage'))
const AdminDocumentTrackerPage = lazy(() => import('./pages/admin/AdminDocumentTrackerPage'))
const AdminReferralsPage = lazy(() => import('./pages/admin/AdminReferralsPage'))
const AdminUserReferralsPage = lazy(() => import('./pages/admin/AdminUserReferralsPage'))
const AdminIbCampaignsPage = lazy(() => import('./pages/admin/AdminIbCampaignsPage'))
const AdminDataChangeRequestsPage = lazy(() => import('./pages/admin/AdminDataChangeRequestsPage'))
const AdminFinancePage = lazy(() => import('./pages/admin/AdminFinancePage'))
const AdminWithdrawalsPage = lazy(() => import('./pages/admin/AdminWithdrawalsPage'))
const AdminDepositRequestsPage = lazy(() => import('./pages/admin/AdminDepositRequestsPage'))
const AdminWalletsPage = lazy(() => import('./pages/admin/AdminWalletsPage'))
const AdminDormantAccountsPage = lazy(() => import('./pages/admin/AdminDormantAccountsPage'))
const AdminAccountRequestsPage = lazy(() => import('./pages/admin/AdminAccountRequestsPage'))
const AdminAccountsPage = lazy(() => import('./pages/admin/AdminAccountsPage'))
const AdminAccountTypesPage = lazy(() => import('./pages/admin/AdminAccountTypesPage'))
const AdminPaymentGatewaysPage = lazy(() => import('./pages/admin/AdminPaymentGatewaysPage'))
const AdminNotificationTemplatesPage = lazy(() => import('./pages/admin/AdminNotificationTemplatesPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminServersPage = lazy(() => import('./pages/admin/AdminServersPage'))
const AdminPaymentMethodTypesPage = lazy(() => import('./pages/admin/AdminPaymentMethodTypesPage'))
const AdminExchangeRatesPage = lazy(() => import('./pages/admin/AdminExchangeRatesPage'))
const AdminKycFieldsPage = lazy(() => import('./pages/admin/AdminKycFieldsPage'))
const AdminKycFormsPage = lazy(() => import('./pages/admin/AdminKycFormsPage'))
const AdminConsentsPage = lazy(() => import('./pages/admin/AdminConsentsPage'))
const AdminTextTemplatesPage = lazy(() => import('./pages/admin/AdminTextTemplatesPage'))
const AdminCampaignsPage = lazy(() => import('./pages/admin/AdminCampaignsPage'))
const AdminNotificationLogsPage = lazy(() => import('./pages/admin/AdminNotificationLogsPage'))
const AdminStaffFormAssignmentsPage = lazy(() => import('./pages/admin/AdminStaffFormAssignmentsPage'))
const AdminPartnersPage = lazy(() => import('./pages/admin/AdminPartnersPage'))
const AdminPartnerApplicationsPage = lazy(() => import('./pages/admin/AdminPartnerApplicationsPage'))
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'))
const AdminStaffPage = lazy(() => import('./pages/admin/AdminStaffPage'))
const AdminBlogListPage = lazy(() => import('./pages/admin/AdminBlogListPage'))
const AdminBlogEditorPage = lazy(() => import('./pages/admin/AdminBlogEditorPage'))
const AdminDownloadsPage = lazy(() => import('./pages/admin/AdminDownloadsPage'))
const AdminPlaceholderPage = lazy(() => import('./pages/admin/AdminPlaceholderPage'))

const HomePage = lazy(() => import('./pages/HomePage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const MarketsPage = lazy(() => import('./pages/MarketsPage'))
const PlatformsPage = lazy(() => import('./pages/PlatformsPage'))
const AccountsPage = lazy(() => import('./pages/AccountsPage'))
const FundingPage = lazy(() => import('./pages/FundingPage'))
const TradingConditionsPage = lazy(() => import('./pages/TradingConditionsPage'))
const TrustPage = lazy(() => import('./pages/TrustPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const PartnershipPage = lazy(() => import('./pages/PartnershipPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const BlogListPage = lazy(() => import('./pages/BlogListPage'))
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const DemoPage = lazy(() => import('./pages/auth/DemoPage'))
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))

const DashboardPage = lazy(() => import('./pages/portal/DashboardPage'))
const TradePage = lazy(() => import('./pages/portal/TradePage'))
const PortalAccountsPage = lazy(() => import('./pages/portal/PortalAccountsPage'))
const FundsPage = lazy(() => import('./pages/portal/FundsPage'))
const KycPage = lazy(() => import('./pages/portal/KycPage'))
const DownloadsPage = lazy(() => import('./pages/portal/DownloadsPage'))
const ProfilePage = lazy(() => import('./pages/portal/ProfilePage'))
const SupportPage = lazy(() => import('./pages/portal/SupportPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const PartnerApplyPage = lazy(() => import('./pages/PartnerApplyPage'))
const DisclaimerPage = lazy(() => import('./pages/DisclaimerPage'))

export default function App() {
  return (
    <>
      <SplashScreen />
      <MaintenanceBanner />
      <Suspense fallback={null}>
      <Routes>
      {/* Public marketing site */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/platforms" element={<PlatformsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/conditions" element={<TradingConditionsPage />} />
        <Route path="/funding" element={<FundingPage />} />
        <Route path="/trust" element={<TrustPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/partnership" element={<PartnershipPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/partner/apply" element={<PartnerApplyPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/legal/:doc" element={<LegalPage />} />
      </Route>

      {/* Auth (standalone full-screen) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Secure client portal */}
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

      {/* Secure staff back-office (CRM) */}
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
        <Route path="credit-card-types" element={<AdminPaymentMethodTypesPage category="CARD" title="Credit Card Types" subtitle="Card brands accepted for deposits." />} />
        <Route path="ewallet-types" element={<AdminPaymentMethodTypesPage category="EWALLET" title="E-Wallet Types" subtitle="E-wallet providers accepted for deposits." />} />
        <Route path="exchange-rates" element={<AdminExchangeRatesPage />} />
        <Route path="kyc-questions" element={<AdminKycFieldsPage kind="QUESTION" title="KYC Questions" subtitle="Questions asked during KYC onboarding." />} />
        <Route path="extended-fields" element={<AdminKycFieldsPage kind="EXTENDED" title="Extended Fields" subtitle="Additional profile fields collected from clients." />} />
        <Route path="kyc-forms" element={<AdminKycFormsPage />} />
        <Route path="consents" element={<AdminConsentsPage />} />
        <Route path="pdf-templates" element={<AdminTextTemplatesPage kind="PDF" title="PDF Templates" subtitle="Document templates for statements, receipts, etc." />} />
        <Route path="comment-templates" element={<AdminTextTemplatesPage kind="COMMENT" title="Comment Templates" subtitle="Canned replies staff can reuse." />} />
        <Route path="campaigns" element={<AdminCampaignsPage />} />
        <Route path="notification-logs" element={<AdminNotificationLogsPage />} />
        <Route path="staff-forms-assignments" element={<AdminStaffFormAssignmentsPage />} />
        <Route path="referrals" element={<AdminReferralsPage />} />
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
          <Route key={l.to} path={l.to.replace('/admin/', '')} element={<AdminPlaceholderPage />} />
        ))}
      </Route>

      {/* Secure partner / IB portal */}
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
        <Route path="tools" element={<PartnerReferralToolsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </>
  )
}
