import { api } from './api'

export type Kyc = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
export interface PartnerClient { id: string; name: string; email: string; country: string | null; kyc: Kyc; createdAt: string }
export interface PartnerDashboard {
  referralCode: string
  kpis: {
    totalReferred: { value: number; delta: number | null; spark: number[] }
    kycVerified: { value: number; spark: number[] }
    signups30d: { value: number; delta: number | null; spark: number[] }
  }
  series: { date: string; signups: number }[]
  kycDistribution: Record<Kyc, number>
  recentReferrals: PartnerClient[]
}
export interface PartnerProfile { referralCode: string; referralLink: string }
export interface PartnerCommissionRow { id: string; amount: number; source: string; reference: string | null; client: string; date: string }
export interface PartnerCommissions { total: number; available: number; count: number; rows: PartnerCommissionRow[] }
export interface PartnerPayoutResult { reference: string; amount: number; status: string }

export const partnerApi = {
  getDashboard: () => api.get<PartnerDashboard>('/partner/dashboard'),
  getClients: () => api.get<PartnerClient[]>('/partner/clients'),
  getProfile: () => api.get<PartnerProfile>('/partner/profile'),
  getCommissions: () => api.get<PartnerCommissions>('/partner/commissions'),
  requestPayout: () => api.post<PartnerPayoutResult>('/partner/payouts'),
}
