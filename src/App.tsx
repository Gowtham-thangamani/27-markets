import { Navigate, Route, Routes } from 'react-router-dom'
import { MarketingLayout } from './layouts/MarketingLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { RequireAuth } from './components/portal/RequireAuth'

import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import MarketsPage from './pages/MarketsPage'
import AccountsPage from './pages/AccountsPage'
import PartnershipPage from './pages/PartnershipPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DemoPage from './pages/auth/DemoPage'

import DashboardPage from './pages/portal/DashboardPage'
import PortalAccountsPage from './pages/portal/PortalAccountsPage'
import FundsPage from './pages/portal/FundsPage'
import KycPage from './pages/portal/KycPage'
import DownloadsPage from './pages/portal/DownloadsPage'
import ProfilePage from './pages/portal/ProfilePage'
import SupportPage from './pages/portal/SupportPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      {/* Public marketing site */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/partnership" element={<PartnershipPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Auth (standalone full-screen) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/demo" element={<DemoPage />} />

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
        <Route path="accounts" element={<PortalAccountsPage />} />
        <Route path="funds" element={<FundsPage />} />
        <Route path="kyc" element={<KycPage />} />
        <Route path="downloads" element={<DownloadsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
