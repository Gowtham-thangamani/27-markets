import * as Sentry from '@sentry/node';

let enabled = false;

/**
 * Initialise Sentry error tracking when SENTRY_DSN is set; a no-op otherwise, so
 * the app runs identically with monitoring off. Call as early as possible in
 * bootstrap. Set SENTRY_DSN (+ optional SENTRY_TRACES_SAMPLE_RATE) in the env to
 * turn it on — no code change needed.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // Never send request bodies/headers/cookies — matches the PII-safe logging posture.
    sendDefaultPii: false,
  });
  enabled = true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

/** Report an unexpected server error to Sentry (no-op when not configured). */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
