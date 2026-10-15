import { api } from './api'

export type Kyc = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type AccountType = 'STANDARD' | 'RAW_SPREAD' | 'VIP'
export type AccountMode = 'LIVE' | 'DEMO'
export type AccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'ARCHIVED'
export interface PartnerClientAccount { type: AccountType; mode: AccountMode; status: AccountStatus }
/** Row of the dashboard's recent-referrals strip. */
export interface PartnerClientSummary { id: string; name: string; email: string; country: string | null; kyc: Kyc; createdAt: string }
export type ClientSortBy = 'name' | 'country' | 'conversion' | 'campaign' | 'signup'
export interface ClientListParams { page?: number; pageSize?: number; search?: string; sortBy?: ClientSortBy; sortDir?: 'asc' | 'desc' }
export interface PartnerClientList { rows: PartnerClient[]; total: number; page: number; pageSize: number }
export type ConversionStatus = 'NO_ANSWER' | 'ON_BOARDING' | 'CONVERTED' | 'NOT_INTERESTED'
/** Row of the full clients list, with accounts, CRM state and financials. */
export interface PartnerClient extends PartnerClientSummary {
  phone: string | null
  campaign: string | null
  accounts: PartnerClientAccount[]
  canTrade: boolean
  conversionStatus: ConversionStatus
  convertedAt: string | null
  salesAgent: string | null
  totalDeposits: number
  lastLoginAt: string | null
}
export interface SubPartner {
  id: string; name: string; email: string; country: string | null; referralCode: string
  clients: number; commissionEarned: number; joinedAt: string
}
export interface PartnerClientDetail extends PartnerClient {
  deposits: { amount: number; reference: string | null; date: string }[]
  commissions: { amount: number; level: number; date: string; status: CommissionStatus }[]
}
export interface PartnerCampaignPerf { campaign: string; signups: number; funded: number; deposits: number; commission: number }
export interface PartnerPerformance {
  funnel: { signups: number; kycVerified: number; funded: number }
  campaigns: PartnerCampaignPerf[]
  earnings: { month: string; amount: number }[]
}
export interface SubPartnerClients {
  subPartner: { id: string; name: string }
  clients: PartnerClientSummary[]
}
export interface PartnerNotification { id: string; title: string; body: string; kind: 'info' | 'success' | 'warning'; read: boolean; date: string }
export type PartnerPayoutStatus = 'PENDING' | 'PAID' | 'REJECTED'
export interface PartnerPayoutRow {
  id: string; reference: string; amount: number; status: PartnerPayoutStatus
  commissionCount: number; requestedAt: string; reviewedAt: string | null
}
export interface PartnerDashboard {
  referralCode: string
  kpis: {
    totalReferred: { value: number; delta: number | null; spark: number[] }
    kycVerified: { value: number; spark: number[] }
    signups30d: { value: number; delta: number | null; spark: number[] }
  }
  series: { date: string; signups: number }[]
  kycDistribution: Record<Kyc, number>
  recentReferrals: PartnerClientSummary[]
}
export interface PartnerProfile { referralCode: string; referralLink: string; partnerLink: string }
export type CommissionStatus = 'AVAILABLE' | 'IN_REVIEW' | 'PAID'
export interface PartnerCommissionRow { id: string; amount: number; source: string; reference: string | null; client: string; date: string; status: CommissionStatus; level: number }
/** `direct` is level-1 earnings; `indirect` is earned through sub-partners. */
export interface PartnerCommissions { total: number; available: number; paid: number; count: number; direct: number; indirect: number; rates: { direct: number; indirect: number }; rows: PartnerCommissionRow[] }
export type PayoutMethod = 'BANK' | 'CRYPTO'
export interface TierProgress {
  tiered: boolean
  volume: number
  currentRate: number
  next: { threshold: number; rate: number } | null
}
export interface PartnerSettings {
  payoutMethod: PayoutMethod | null
  payoutDetails: Record<string, string> | null
  rates: { direct: number; indirect: number }
  tierProgress: TierProgress
}
export interface PartnerPayoutResult { reference: string; amount: number; status: string }

export const partnerApi = {
  getDashboard: () => api.get<PartnerDashboard>('/partner/dashboard'),
  getClients: (opts: { page?: number; pageSize?: number; search?: string; sortBy?: ClientSortBy; sortDir?: 'asc' | 'desc' } = {}) => {
    const q = new URLSearchParams()
    if (opts.page) q.set('page', String(opts.page))
    if (opts.pageSize) q.set('pageSize', String(opts.pageSize))
    if (opts.search) q.set('search', opts.search)
    if (opts.sortBy) q.set('sortBy', opts.sortBy)
    if (opts.sortDir) q.set('sortDir', opts.sortDir)
    const qs = q.toString()
    return api.get<PartnerClientList>(`/partner/clients${qs ? `?${qs}` : ''}`)
  },
  getClientDetail: (id: string) => api.get<PartnerClientDetail>(`/partner/clients/${id}`),
  setConversion: (clientId: string, status: ConversionStatus) =>
    api.patch<{ ok: true }>(`/partner/clients/${clientId}/conversion`, { status }),
  getPerformance: () => api.get<PartnerPerformance>('/partner/performance'),
  getSubPartners: () => api.get<SubPartner[]>('/partner/sub-partners'),
  getSubPartnerClients: (id: string) => api.get<SubPartnerClients>(`/partner/sub-partners/${id}/clients`),
  getProfile: () => api.get<PartnerProfile>('/partner/profile'),
  getCommissions: (range?: { from?: string; to?: string }) => {
    const q = new URLSearchParams()
    if (range?.from) q.set('from', range.from)
    if (range?.to) q.set('to', range.to)
    const qs = q.toString()
    return api.get<PartnerCommissions>(`/partner/commissions${qs ? `?${qs}` : ''}`)
  },
  getPayouts: () => api.get<PartnerPayoutRow[]>('/partner/payouts'),
  requestPayout: () => api.post<PartnerPayoutResult>('/partner/payouts'),
  getStatementPdf: (range?: { from?: string; to?: string }) => {
    const q = new URLSearchParams()
    if (range?.from) q.set('from', range.from)
    if (range?.to) q.set('to', range.to)
    const qs = q.toString()
    return api.getBlob(`/partner/commissions/statement.pdf${qs ? `?${qs}` : ''}`)
  },
  getNotifications: () => api.get<PartnerNotification[]>('/notifications'),
  markNotificationsRead: () => api.post<{ ok: true }>('/notifications/read-all'),
  getSettings: () => api.get<PartnerSettings>('/partner/settings'),
  updatePayoutMethod: (method: PayoutMethod, details: Record<string, string>) =>
    api.patch<{ ok: true }>('/partner/settings/payout-method', { method, details }),
}
