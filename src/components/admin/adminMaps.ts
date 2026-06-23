import type { KycStepStatus, LeadStatus, LeadSource } from '@/lib/adminApi'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

export const kycLabel: Record<KycStepStatus, string> = {
  NOT_SUBMITTED: 'Not Submitted',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}
export const kycTone: Record<KycStepStatus, Tone> = {
  NOT_SUBMITTED: 'neutral',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

export const leadStatusLabel: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  LOST: 'Lost',
}
export const leadStatusTone: Record<LeadStatus, Tone> = {
  NEW: 'info',
  CONTACTED: 'warning',
  QUALIFIED: 'brand',
  CONVERTED: 'success',
  LOST: 'danger',
}
export const leadSourceLabel: Record<LeadSource, string> = {
  DEMO: 'Demo',
  REGISTER: 'Register',
  MANUAL: 'Manual',
}

/** Overall KYC verdict for a client from their three step statuses. */
export function kycSummary(
  kyc: { identityStatus: KycStepStatus; addressStatus: KycStepStatus; selfieStatus: KycStepStatus } | null,
): { label: string; tone: Tone } {
  if (!kyc) return { label: 'No profile', tone: 'neutral' }
  const steps = [kyc.identityStatus, kyc.addressStatus, kyc.selfieStatus]
  if (steps.every((s) => s === 'APPROVED')) return { label: 'Verified', tone: 'success' }
  if (steps.some((s) => s === 'REJECTED')) return { label: 'Rejected', tone: 'danger' }
  if (steps.some((s) => s === 'PENDING')) return { label: 'Pending', tone: 'warning' }
  return { label: 'Not Started', tone: 'neutral' }
}
