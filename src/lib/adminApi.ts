import { api, API_BASE_URL } from './api'
import type { TicketPriority, TicketStatus } from './supportApi'

export interface DailyPoint {
  date: string
  deposits: number
  withdrawals: number
  signups: number
}

export interface KpiTrend {
  value: number
  delta: number | null
  spark: number[]
}

export interface KpiCount {
  value: number
  spark: number[]
}

export interface AdminDashboard {
  kpis: {
    totalClients: KpiTrend
    netFlow: { value: string; delta: number | null; spark: number[] }
    pendingKyc: KpiCount
    pendingWithdrawals: KpiCount
    openTickets: KpiCount
  }
  series: DailyPoint[]
  distributions: {
    funnel: Record<'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST', number>
    kyc: Record<'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED', number>
  }
  recentSignups: { id: string; name: string; email: string; country: string | null; createdAt: string }[]
  recentActivity: { id: string; action: string; entity: string | null; createdAt: string; actor: string | null }[]
  recentWithdrawals: { id: string; reference: string; client: string | null; amount: string; createdAt: string }[]
}

export type KycStepStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface KycDocument {
  id: string
  step: 'identity' | 'address' | 'selfie'
  fileName: string
  mimeType: string | null
  createdAt: string
}
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
export type LeadSource = 'DEMO' | 'REGISTER' | 'MANUAL'

export interface StaffMember {
  id: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'AGENT'
}

export interface ClientListItem {
  id: string
  email: string
  firstName: string
  lastName: string
  country: string | null
  status: string
  createdAt: string
  kycProfile: { identityStatus: KycStepStatus; addressStatus: KycStepStatus; selfieStatus: KycStepStatus } | null
  _count: { tradingAccounts: number }
}

export interface ClientNote {
  id: string
  body: string
  pinned: boolean
  createdAt: string
  author: { firstName: string; lastName: string }
}

export interface ClientDetail {
  id: string
  email: string
  name: string
  phone: string | null
  country: string | null
  status: string
  joinedAt: string
  kyc: { identityStatus: KycStepStatus; addressStatus: KycStepStatus; selfieStatus: KycStepStatus } | null
  accounts: { id: string; number: string; type: string; mode: string; status: string; balance: string }[]
  notes: ClientNote[]
  tickets: { id: string; subject: string; status: TicketStatus; updatedAt: string }[]
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  country: string | null
  source: LeadSource
  status: LeadStatus
  assignedToId: string | null
  assignedTo: { firstName: string; lastName: string } | null
  createdAt: string
  _count?: { notes: number }
}

export interface LeadDetail extends Lead {
  notes: { id: string; body: string; createdAt: string; author: { firstName: string; lastName: string } }[]
}

export interface AdminTicketListItem {
  id: string
  subject: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  updatedAt: string
  user: { firstName: string; lastName: string; email: string }
  assignedTo: { firstName: string; lastName: string } | null
  _count: { messages: number }
}

export interface AdminTicketDetail extends AdminTicketListItem {
  user: { id: string; firstName: string; lastName: string; email: string }
  messages: { id: string; body: string; internal: boolean; createdAt: string; author: { firstName: string; lastName: string; role: string } }[]
}

export type StaffRole = 'ADMIN' | 'AGENT'

export interface ReportsSummary {
  deposits: string
  withdrawals: string
  netFlow: string
  totalClients: number
  funnel: Record<LeadStatus, number>
}

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role: StaffRole
  status: string
  createdAt: string
}

export interface AuditEntry {
  id: string
  action: string
  entity: string | null
  entityId: string | null
  metadata: unknown
  createdAt: string
  user: { firstName: string; lastName: string; email: string } | null
}

export interface AccountTypeConfig {
  id: string
  type: 'STANDARD' | 'RAW_SPREAD' | 'VIP'
  displayName: string
  spreadFrom: string
  commission: string
  leverage: string
  minDeposit: number
  popular: boolean
  sortOrder: number
  updatedAt: string
}

export type AccountTypePatch = Partial<
  Pick<AccountTypeConfig, 'displayName' | 'spreadFrom' | 'commission' | 'leverage' | 'minDeposit' | 'popular' | 'sortOrder'>
>

export type PaymentGatewayType = 'BANK' | 'CRYPTO' | 'CARD' | 'EWALLET'

export interface PaymentGateway {
  id: string
  name: string
  type: PaymentGatewayType
  enabled: boolean
  instructions: string | null
  minAmount: number
  maxAmount: number | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type PaymentGatewayInput = {
  name: string
  type: PaymentGatewayType
  enabled?: boolean
  instructions?: string | null
  minAmount?: number
  maxAmount?: number | null
  sortOrder?: number
}

export interface PartnerItem {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string | null
  status: string
  createdAt: string
}

export const adminApi = {
  getDashboard: () => api.get<AdminDashboard>('/admin/dashboard'),
  getStaff: () => api.get<StaffMember[]>('/admin/staff'),

  // Clients
  listClients: (search?: string, status?: 'ACTIVE' | 'SUSPENDED' | 'CLOSED') => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (status) p.set('status', status)
    const qs = p.toString()
    return api.get<ClientListItem[]>(`/admin/clients${qs ? `?${qs}` : ''}`)
  },
  getClient: (id: string) => api.get<ClientDetail>(`/admin/clients/${id}`),
  /** Block (SUSPENDED) or unblock (ACTIVE) a client. Admin-only. */
  setClientStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api.patch<{ id: string; status: string }>(`/admin/clients/${id}/status`, { status }),
  addClientNote: (id: string, body: string, pinned?: boolean) =>
    api.post<ClientDetail>(`/admin/clients/${id}/notes`, { body, pinned }),

  // Leads
  listLeads: (status?: LeadStatus) =>
    api.get<Lead[]>(`/admin/leads${status ? `?status=${status}` : ''}`),
  getLead: (id: string) => api.get<LeadDetail>(`/admin/leads/${id}`),
  updateLead: (id: string, patch: { status?: LeadStatus; assignedToId?: string | null }) =>
    api.patch<LeadDetail>(`/admin/leads/${id}`, patch),
  addLeadNote: (id: string, body: string) => api.post<LeadDetail>(`/admin/leads/${id}/notes`, { body }),

  // Tickets
  listTickets: (status?: TicketStatus) =>
    api.get<AdminTicketListItem[]>(`/admin/tickets${status ? `?status=${status}` : ''}`),
  getTicket: (id: string) => api.get<AdminTicketDetail>(`/admin/tickets/${id}`),
  updateTicket: (id: string, patch: { status?: TicketStatus; priority?: TicketPriority; assignedToId?: string | null }) =>
    api.patch<AdminTicketDetail>(`/admin/tickets/${id}`, patch),
  replyTicket: (id: string, body: string, internal?: boolean) =>
    api.post<AdminTicketDetail>(`/admin/tickets/${id}/reply`, { body, internal }),

  // KYC review (ADMIN/AGENT)
  listKycDocuments: (userId: string) => api.get<KycDocument[]>(`/kyc/documents/${userId}`),
  /** Direct URL to stream a document inline (auth cookie is same-site, sent on navigation). */
  kycDocumentUrl: (id: string) => `${API_BASE_URL}/kyc/document/${id}`,
  reviewKyc: (userId: string, step: 'identity' | 'address' | 'selfie', status: 'APPROVED' | 'REJECTED' | 'PENDING') =>
    api.post('/kyc/review', { userId, step, status }),

  // Reports (Admin full, Agent read)
  getReports: () => api.get<ReportsSummary>('/admin/reports'),

  // Staff & audit (Admin only)
  listTeam: () => api.get<TeamMember[]>('/admin/team'),
  setStaffRole: (id: string, role: StaffRole) =>
    api.patch<{ id: string; role: StaffRole }>(`/admin/team/${id}/role`, { role }),
  getAuditLog: (action?: string) =>
    api.get<AuditEntry[]>(`/admin/audit${action ? `?action=${encodeURIComponent(action)}` : ''}`),

  // Account types (config — Admin edits)
  listAccountTypes: () => api.get<AccountTypeConfig[]>('/admin/account-types'),
  updateAccountType: (type: string, patch: AccountTypePatch) =>
    api.patch<AccountTypeConfig>(`/admin/account-types/${type}`, patch),

  // Payment gateways (config — Admin edits)
  listPaymentGateways: () => api.get<PaymentGateway[]>('/admin/payment-gateways'),
  createPaymentGateway: (body: PaymentGatewayInput) => api.post<PaymentGateway>('/admin/payment-gateways', body),
  updatePaymentGateway: (id: string, patch: Partial<PaymentGatewayInput>) =>
    api.patch<PaymentGateway>(`/admin/payment-gateways/${id}`, patch),
  deletePaymentGateway: (id: string) => api.del<{ ok: boolean }>(`/admin/payment-gateways/${id}`),

  // Partners (read-only stub)
  listPartners: () => api.get<PartnerItem[]>('/admin/partners'),
}
