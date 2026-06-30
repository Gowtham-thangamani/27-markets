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

export const partnerApi = {
  getDashboard: () => api.get<PartnerDashboard>('/partner/dashboard'),
  getClients: () => api.get<PartnerClient[]>('/partner/clients'),
  getProfile: () => api.get<PartnerProfile>('/partner/profile'),
}
