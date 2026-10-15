import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { MarketingLayout } from '../layouts/MarketingLayout'
import { ExternalRedirect } from './ExternalRedirect'
import { HOST_FOR_SURFACE, SURFACE } from '../lib/surface'

const HomePage = lazy(() => import('../pages/HomePage'))
const AboutPage = lazy(() => import('../pages/AboutPage'))
const MarketsPage = lazy(() => import('../pages/MarketsPage'))
const PlatformsPage = lazy(() => import('../pages/PlatformsPage'))
const AccountsPage = lazy(() => import('../pages/AccountsPage'))
const TradingConditionsPage = lazy(() => import('../pages/TradingConditionsPage'))
const FundingPage = lazy(() => import('../pages/FundingPage'))
const TrustPage = lazy(() => import('../pages/TrustPage'))
const FaqPage = lazy(() => import('../pages/FaqPage'))
const EconomicCalendarPage = lazy(() => import('../pages/EconomicCalendarPage'))
const PartnershipPage = lazy(() => import('../pages/PartnershipPage'))
const ContactPage = lazy(() => import('../pages/ContactPage'))
const BlogListPage = lazy(() => import('../pages/BlogListPage'))
const BlogDetailPage = lazy(() => import('../pages/BlogDetailPage'))
const PartnerApplyPage = lazy(() => import('../pages/PartnerApplyPage'))
const DisclaimerPage = lazy(() => import('../pages/DisclaimerPage'))
const LegalPage = lazy(() => import('../pages/LegalPage'))

/**
 * Where the IB aliases point.
 *
 * On the marketing-only build the partner routes are not in this bundle, so the
 * alias has to leave for the partner host. On the combined build they ARE here,
 * so it must route internally — sending it to another hostname would be wrong
 * even once that host exists, and today that host has no DNS record at all.
 */
export const IB_DASHBOARD =
  SURFACE === 'marketing' ? `${HOST_FOR_SURFACE.partner}/partner/dashboard` : '/partner/dashboard'

/** Leaves for the partner host only when the partner routes are not in this build. */
function IbRedirect() {
  return IB_DASHBOARD.startsWith('https://') ? (
    <ExternalRedirect to={IB_DASHBOARD} />
  ) : (
    <Navigate to={IB_DASHBOARD} replace />
  )
}

/** Public marketing site. No authentication anywhere in this tree. */
export function marketingRoutes() {
  return (
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
      <Route path="/economic-calendar" element={<EconomicCalendarPage />} />
      <Route path="/partnership" element={<PartnershipPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogDetailPage />} />
      <Route path="/partner/apply" element={<PartnerApplyPage />} />
      {/* Short, brandable aliases for the IB portal. Where they point depends on
          the build — see IB_DASHBOARD above. */}
      <Route path="/ib-portal" element={<IbRedirect />} />
      <Route path="/ibpartner" element={<IbRedirect />} />
      <Route path="/disclaimer" element={<DisclaimerPage />} />
      <Route path="/legal/:doc" element={<LegalPage />} />
    </Route>
  )
}
