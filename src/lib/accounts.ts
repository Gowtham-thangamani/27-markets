import type { TradingAccount } from './types'

/**
 * Which account a page should act on.
 *
 * Pages each kept their own selection and defaulted to the first account in
 * the list, so switching accounts in one place changed nothing anywhere else.
 * They now all start from the globally selected account — but only when it is
 * eligible for that page: the Trade page cannot act on a live account and the
 * deposit form cannot act on a demo one. When it is not eligible, fall back to
 * the first one that is, rather than leaving the form pointing at nothing.
 */
export function preferredAccountId(
  eligible: Pick<TradingAccount, 'id'>[],
  selectedId: string | null,
): string {
  if (selectedId && eligible.some((a) => a.id === selectedId)) return selectedId
  return eligible[0]?.id ?? ''
}

/**
 * History rows belonging to the selected account.
 *
 * Rows with no accountId are entries with no client-side leg; they are kept so
 * that nothing silently vanishes from a client's history. A payload with no
 * attribution at all (an API older than the per-account history change) is
 * passed through whole for the same reason.
 */
export function transactionsForAccount<T extends { accountId?: string | null }>(
  transactions: T[],
  selectedId: string | null,
): T[] {
  if (!selectedId) return transactions
  if (transactions.every((t) => !t.accountId)) return transactions
  return transactions.filter((t) => t.accountId === selectedId || !t.accountId)
}
