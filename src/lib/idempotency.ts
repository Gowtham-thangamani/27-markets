import { useRef } from 'react'

/**
 * A client-generated idempotency key. Send the SAME key for retries of one
 * "intent" (e.g. one deposit) so a double-submit / network retry can't be
 * processed twice server-side — the ledger dedupes on it.
 */
export function newIdempotencyKey(): string {
  const c = globalThis.crypto as Crypto | undefined
  return c?.randomUUID
    ? c.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Stable idempotency key for one submit intent. `current` stays the same across
 * re-renders and retries; call `next()` after a SUCCESSFUL submit to start a
 * fresh key for the next one.
 */
export function useIdempotencyKey() {
  const ref = useRef(newIdempotencyKey())
  return {
    get current() {
      return ref.current
    },
    next() {
      ref.current = newIdempotencyKey()
    },
  }
}
