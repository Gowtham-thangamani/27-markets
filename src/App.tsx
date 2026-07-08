import { Navigate, Route, Routes } from 'react-router-dom'
import { SplashScreen } from './components/SplashScreen'
import { MarketingLayout } from './layouts/MarketingLayout'
import LegalPage from './pages/LegalPage'
import { PortalLayout } from './layouts/PortalLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { RequireAuth } from './components/portal/RequireAuth'
import { RequireStaff } from './components/admin/RequireStaff'
import { RequirePartner } from './components/partner/RequirePartner'
import { PartnerLayout } from './layouts/PartnerLayout'
import PartnerDashboardPage from './pages/partner/PartnerDashboardPage'
import PartnerClientsPage from './pages/partner/PartnerClientsPage'
import PartnerReferralToolsPage from './pages/partner/PartnerReferralToolsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminClientsPage from './pages/admin/AdminClientsPage'
import AdminBlockedUsersPage from './pages/admin/AdminBlockedUsersPage'
import AdminLeadsPage from './pages/admin/AdminLeadsPage'
import AdminSupportPage from './pages/admin/AdminSupportPage'
import AdminKycPage from './pages/admin/AdminKycPage'
import AdminFinancePage from './pages/admin/AdminFinancePage'
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage'
import AdminDepositRequestsPage from './pages/admin/AdminDepositRequestsPage'
import AdminWalletsPage from './pages/admin/AdminWalletsPage'
import AdminDormantAccountsPage from './pages/admin/AdminDormantAccountsPage'
import AdminAccountsPage from './pages/admin/AdminAccountsPage'
import AdminAccountTypesPage from './pages/admin/AdminAccountTypesPage'
import AdminPartnersPage from './pages/admin/AdminPartnersPage'
import AdminPartnerApplicationsPage from './pages/admin/AdminPartnerApplicationsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminStaffPage from './pages/admin/AdminStaffPage'
import AdminBlogListPage from './pages/admin/AdminBlogListPage'
import AdminBlogEditorPage from './pages/admin/AdminBlogEditorPage'
import AdminPlaceholderPage from './pages/admin/AdminPlaceholderPage'
import { placeholderLinks } from './components/admin/adminNav'

import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import MarketsPage from './pages/MarketsPage'
import PlatformsPage from './pages/PlatformsPage'
import AccountsPage from './pages/AccountsPage'
import FundingPage from './pages/FundingPage'
import TradingConditionsPage from './pages/TradingConditionsPage'
import TrustPage from './pages/TrustPage'
import FaqPage from './pages/FaqPage'
import PartnershipPage from './pages/PartnershipPage'
import ContactPage from './pages/ContactPage'
import BlogListPage from './pages/BlogListPage'
import BlogDetailPage from './pages/BlogDetailPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DemoPage from './pages/auth/DemoPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

import DashboardPage from './pages/portal/DashboardPage'
import TradePage from './pages/portal/TradePage'
import PortalAccountsPage from './pages/portal/PortalAccountsPage'
import FundsPage from './pages/portal/FundsPage'
import KycPage from './pages/portal/KycPage'
import DownloadsPage from './pages/portal/DownloadsPage'
import ProfilePage from './pages/portal/ProfilePage'
import SupportPage from './pages/portal/SupportPage'
import NotFoundPage from './pages/NotFoundPage'
import PartnerApplyPage from './pages/PartnerApplyPage'
import DisclaimerPage from './pages/DisclaimerPage'

export default function App() {
  return (
    <>
      <SplashScreen />
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
        <Route path="finance" element={<AdminFinancePage />} />
        <Route path="withdrawal-requests" element={<AdminWithdrawalsPage />} />
        <Route path="deposit-requests" element={<AdminDepositRequestsPage />} />
        <Route path="wallets" element={<AdminWalletsPage />} />
        <Route path="dormant-accounts" element={<AdminDormantAccountsPage />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="account-types" element={<AdminAccountTypesPage />} />
        <Route path="partners" element={<AdminPartnersPage />} />
        <Route path="partner-applications" element={<AdminPartnerApplicationsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="staff" element={<AdminStaffPage />} />
        <Route path="blog" element={<AdminBlogListPage />} />
        <Route path="blog/new" element={<AdminBlogEditorPage />} />
        <Route path="blog/:id" element={<AdminBlogEditorPage />} />
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
    </>
  )
}
