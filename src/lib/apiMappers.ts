/**
 * Translate API DTOs (backend enums/shapes) into the frontend domain types the
 * UI already speaks. Keeps the rest of the app decoupled from wire formats.
 */
import type {
  AccountMode,
  AccountStatus,
  AccountType,
  AppRole,
  KycStatus,
  KycStep,
  TradingAccount,
  Transaction,
  TxKind,
  TxStatus,
  UserProfile,
} from './types'

// ── enum maps ──

export const accountTypeToApi: Record<AccountType, string> = {
  Standard: 'STANDARD',
  'Raw Spread': 'RAW_SPREAD',
  VIP: 'VIP',
}
const accountTypeFromApi: Record<string, AccountType> = {
  STANDARD: 'Standard',
  RAW_SPREAD: 'Raw Spread',
  VIP: 'VIP',
}
export const accountModeToApi: Record<AccountMode, string> = { Live: 'LIVE', Demo: 'DEMO' }
const accountModeFromApi: Record<string, AccountMode> = { LIVE: 'Live', DEMO: 'Demo' }
const accountStatusFromApi: Record<string, AccountStatus> = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  SUSPENDED: 'Suspended',
  ARCHIVED: 'Archived',
}
const txKindFromApi: Record<string, TxKind> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Deposit',
  FEE: 'Withdrawal',
}
const txStatusFromApi: Record<string, TxStatus> = {
  POSTED: 'Completed',
  PENDING: 'Pending',
  FAILED: 'Failed',
  REVERSED: 'Failed',
}
const kycStatusFromApi: Record<string, KycStatus> = {
  NOT_SUBMITTED: 'Not Submitted',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

// ── DTO shapes ──

export interface ApiAccount {
  id: string
  number: string
  type: string
  mode: string
  currency: string
  leverage: string
  status: string
  balance: string
  createdAt: string
}

export interface ApiTransaction {
  reference: string
  kind: string
  status: string
  simulated: boolean
  amount: string
  signedAmount: string
  date: string
  memo?: string | null
}

export interface ApiUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  country?: string | null
  role: string
  twoFactorEnabled: boolean
  joinedAt: string
}

export interface ApiKycStatus {
  steps: { id: 'identity' | 'address' | 'selfie'; status: string }[]
  progress: number
  verified: boolean
}

// ── mappers ──

/**
 * Balance is ledger-derived on the server. This foundation has no open
 * positions, so equity = balance, free margin = balance, margin level = 0.
 */
export function mapAccount(a: ApiAccount): TradingAccount {
  const balance = Number(a.balance)
  return {
    id: a.id,
    number: a.number,
    type: accountTypeFromApi[a.type] ?? 'Standard',
    mode: accountModeFromApi[a.mode] ?? 'Live',
    currency: a.currency,
    balance,
    equity: balance,
    freeMargin: balance,
    marginLevel: 0,
    leverage: a.leverage,
    status: accountStatusFromApi[a.status] ?? 'Active',
    createdAt: a.createdAt,
  }
}

export function mapTransaction(t: ApiTransaction): Transaction {
  return {
    id: t.reference,
    kind: txKindFromApi[t.kind] ?? 'Transfer',
    method: t.memo ?? '—',
    amount: Number(t.amount),
    currency: 'USD',
    status: txStatusFromApi[t.status] ?? 'Completed',
    account: '',
    date: t.date,
  }
}

export function mapUser(u: ApiUser): UserProfile {
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    role: u.role as AppRole,
    phone: u.phone ?? '',
    country: u.country ?? '',
    joinedAt: u.joinedAt,
    avatarColor: '#e11d2e',
  }
}

const KYC_META: Record<KycStep['id'], { title: string; description: string }> = {
  identity: {
    title: 'Identity Verification',
    description: 'Upload a clear photo of your passport, national ID, or driver license.',
  },
  address: {
    title: 'Proof of Address',
    description: 'Upload a recent utility bill or bank statement (issued within 3 months).',
  },
  selfie: {
    title: 'Selfie Verification',
    description: 'Take a selfie holding your ID document next to your face.',
  },
}

export function mapKyc(status: ApiKycStatus): KycStep[] {
  return status.steps.map((s) => ({
    id: s.id,
    title: KYC_META[s.id].title,
    description: KYC_META[s.id].description,
    status: kycStatusFromApi[s.status] ?? 'Not Submitted',
  }))
}
