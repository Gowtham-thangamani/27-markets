import * as Sentry from '@sentry/react'

/**
 * Initialise frontend error monitoring. No-op unless VITE_SENTRY_DSN is set at
 * build time — mirrors the server's DSN-gated Sentry, so dev and un-configured
 * builds stay silent. Called once before the app renders.
 */
export function initObservability(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Capture unhandled errors + a light performance sample; no PII by default.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
}

/** Sentry error boundary, so a render crash shows a fallback instead of a blank page. */
export const ErrorBoundary = Sentry.ErrorBoundary
