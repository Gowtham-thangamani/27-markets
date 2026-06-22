import type {
  AccountStatus,
  KycStatus,
  TicketStatus,
  TxStatus,
} from '@/lib/types'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const map: Record<string, Tone> = {
  // Account
  Active: 'success',
  Pending: 'warning',
  Suspended: 'danger',
  Archived: 'neutral',
  // Transactions
  Completed: 'success',
  Failed: 'danger',
  // KYC
  Approved: 'success',
  Rejected: 'danger',
  'Not Submitted': 'neutral',
  // Tickets
  Open: 'info',
  'In Progress': 'warning',
  Resolved: 'success',
}

export function statusTone(
  status: AccountStatus | TxStatus | KycStatus | TicketStatus
): Tone {
  return map[status] ?? 'neutral'
}
