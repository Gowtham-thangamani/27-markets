import type { TxKind, TxStatus } from './types'

/**
 * Client-facing label for a funding request. Withdrawals go through finance
 * approval, so their statuses read more clearly than the raw ledger state:
 *   Pending   → "Pending approval"
 *   Completed → "Paid"
 *   Rejected  → "Rejected"
 */
export function fundingStatusLabel(kind: TxKind, status: TxStatus): string {
  if (kind === 'Withdrawal') {
    if (status === 'Pending') return 'Pending approval'
    if (status === 'Completed') return 'Paid'
  }
  return status
}
