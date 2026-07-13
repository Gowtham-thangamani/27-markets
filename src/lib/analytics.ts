// Thin GA4 event helper. No-ops if gtag isn't loaded (blocked, dev, etc.) and
// never throws into the app.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Fire a GA4 event. Use GA4 recommended names where they fit (sign_up, login,
 * generate_lead) so they map to standard reports; mark the ones you care about
 * as conversions in GA4 → Admin → Events.
 */
export function track(event: string, params?: Record<string, unknown>): void {
  try {
    window.gtag?.('event', event, params)
  } catch {
    /* analytics must never break the app */
  }
}

export {}
