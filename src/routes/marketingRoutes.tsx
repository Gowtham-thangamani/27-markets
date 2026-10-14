import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { MarketingLayout } from '../layouts/MarketingLayout'
import { ExternalRedirect } from './ExternalRedirect'
import { HOST_FOR_SURFACE } from '../lib/surface'

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

const IB_DASHBOARD = `${HOST_FOR_SURFACE.partner}/partner/dashboard`

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
      {/* Short, brandable aliases for the IB portal. It is a separate build on
          its own hostname, so these must leave this site rather than route
          internally — /partner/dashboard does not exist in the marketing bundle. */}
      <Route path="/ib-portal" element={<ExternalRedirect to={IB_DASHBOARD} />} />
      <Route path="/ibpartner" element={<ExternalRedirect to={IB_DASHBOARD} />} />
      <Route path="/disclaimer" element={<DisclaimerPage />} />
      <Route path="/legal/:doc" element={<LegalPage />} />
    </Route>
  )
}
