import { lazy } from 'react'
import { Route } from 'react-router-dom'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'))
const DemoPage = lazy(() => import('../pages/auth/DemoPage'))
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'))

/**
 * Standalone full-screen auth pages.
 * `withSignup` is false on surfaces that don't self-register: IB partners are
 * onboarded via /partner/apply and approved in the CRM, and staff accounts are
 * created by an admin.
 */
export function authRoutes({ withSignup = true }: { withSignup?: boolean } = {}) {
  return (
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {withSignup && <Route path="/register" element={<RegisterPage />} />}
      {withSignup && <Route path="/demo" element={<DemoPage />} />}
    </>
  )
}
