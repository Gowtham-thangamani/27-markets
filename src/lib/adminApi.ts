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

export interface ReferralRow {
  id: string
  referred: { id: string; name: string; email: string }
  referrer: { id: string; name: string; email: string } | null
  joinedAt: string
}

export interface ReferralSummaryRow {
  id: string
  name: string
  email: string
  referralCount: number
}

export interface KycDocumentRow {
  id: string
  step: string
  fileName: string
  mimeType: string | null
  createdAt: string
  owner: { id: string; name: string; email: string } | null
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
  kycAnswers: { label: string; value: string }[]
  consents: { label: string; accepted: boolean }[]
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

export interface DataChangeRequestRow {
  id: string
  field: string
  currentValue: string | null
  requestedValue: string
  status: string
  createdAt: string
  reviewedAt: string | null
  client: { id: string; name: string; email: string } | null
}

export interface IbCampaign {
  id: string
  name: string
  code: string
  description: string | null
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type IbCampaignInput = { name: string; code: string; description?: string; enabled?: boolean; sortOrder?: number }

export type CampaignChannel = 'EMAIL' | 'SMS' | 'PUSH'
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENT'

export interface Campaign {
  id: string
  name: string
  channel: CampaignChannel
  audience: string
  subject: string | null
  message: string
  status: CampaignStatus
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
}

export type CampaignInput = {
  name: string
  channel?: CampaignChannel
  audience?: string
  subject?: string
  message: string
  status?: CampaignStatus
}

export type TextTemplateKind = 'PDF' | 'COMMENT'

export interface TextTemplate {
  id: string
  kind: TextTemplateKind
  name: string
  body: string
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface StaffFormAssignment {
  id: string
  kycFormId: string
  formName: string
  staffId: string
  staffName: string
  staffRole: string | null
  createdAt: string
}

export interface KycForm {
  id: string
  name: string
  description: string | null
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Consent {
  id: string
  label: string
  body: string
  required: boolean
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type KycFieldKind = 'QUESTION' | 'EXTENDED'
export type KycFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN'

export interface KycFieldDefinition {
  id: string
  kind: KycFieldKind
  label: string
  fieldType: KycFieldType
  required: boolean
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type KycFieldInput = {
  label?: string
  fieldType?: KycFieldType
  required?: boolean
  enabled?: boolean
  sortOrder?: number
}

export interface ExchangeRate {
  id: string
  base: string
  quote: string
  rate: string
  updatedAt: string
  createdAt: string
}

export type PaymentMethodCategory = 'CARD' | 'EWALLET'

export interface PaymentMethodType {
  id: string
  category: PaymentMethodCategory
  name: string
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface TradingServer {
  id: string
  name: string
  host: string
  platform: string
  environment: 'LIVE' | 'DEMO'
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type TradingServerInput = {
  name: string
  host: string
  platform?: string
  environment?: 'LIVE' | 'DEMO'
  enabled?: boolean
  sortOrder?: number
}

export interface AppSetting {
  id: string
  key: string
  label: string
  value: string
  group: string
  sortOrder: number
  updatedAt: string
}

export interface NotificationTemplate {
  id: string
  key: string
  name: string
  subject: string
  body: string
  updatedAt: string
}

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
  /** All uploaded KYC documents across clients (Document Tracker). */
  listAllKycDocuments: () => api.get<KycDocumentRow[]>('/admin/kyc-documents'),
  /** Clients who signed up via a referral (Referrals). */
  listReferrals: () => api.get<ReferralRow[]>('/admin/referrals'),
  /** Referring partners with their referral counts (User Referrals). */
  referralSummary: () => api.get<ReferralSummaryRow[]>('/admin/referrals/summary'),
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

  // Data change requests (client-submitted, admin approves)
  listDataChangeRequests: (status?: 'PENDING' | 'APPROVED' | 'REJECTED') =>
    api.get<DataChangeRequestRow[]>(`/admin/data-change-requests${status ? `?status=${status}` : ''}`),
  approveDataChangeRequest: (id: string) => api.post<{ ok: boolean; status: string }>(`/admin/data-change-requests/${id}/approve`),
  rejectDataChangeRequest: (id: string, reason?: string) => api.post<{ ok: boolean; status: string }>(`/admin/data-change-requests/${id}/reject`, { reason }),

  // IB campaigns (config — Admin edits)
  listIbCampaigns: () => api.get<IbCampaign[]>('/admin/ib-campaigns'),
  createIbCampaign: (body: IbCampaignInput) => api.post<IbCampaign>('/admin/ib-campaigns', body),
  updateIbCampaign: (id: string, patch: Partial<IbCampaignInput>) => api.patch<IbCampaign>(`/admin/ib-campaigns/${id}`, patch),
  deleteIbCampaign: (id: string) => api.del<{ ok: boolean }>(`/admin/ib-campaigns/${id}`),

  // Campaigns (config — Admin edits)
  listCampaigns: () => api.get<Campaign[]>('/admin/campaigns'),
  createCampaign: (body: CampaignInput) => api.post<Campaign>('/admin/campaigns', body),
  updateCampaign: (id: string, patch: Partial<CampaignInput>) => api.patch<Campaign>(`/admin/campaigns/${id}`, patch),
  deleteCampaign: (id: string) => api.del<{ ok: boolean }>(`/admin/campaigns/${id}`),

  // Text templates (PDF / Comment — config, Admin edits)
  listTextTemplates: (kind: TextTemplateKind) => api.get<TextTemplate[]>(`/admin/text-templates?kind=${kind}`),
  createTextTemplate: (body: { kind: TextTemplateKind; name: string; body: string; enabled?: boolean }) => api.post<TextTemplate>('/admin/text-templates', body),
  updateTextTemplate: (id: string, patch: { name?: string; body?: string; enabled?: boolean }) => api.patch<TextTemplate>(`/admin/text-templates/${id}`, patch),
  deleteTextTemplate: (id: string) => api.del<{ ok: boolean }>(`/admin/text-templates/${id}`),

  // Staff form assignments (KYC form -> staff)
  listStaffFormAssignments: () => api.get<StaffFormAssignment[]>('/admin/staff-form-assignments'),
  createStaffFormAssignment: (body: { kycFormId: string; staffId: string }) => api.post<StaffFormAssignment>('/admin/staff-form-assignments', body),
  deleteStaffFormAssignment: (id: string) => api.del<{ ok: boolean }>(`/admin/staff-form-assignments/${id}`),

  // KYC forms (config — Admin edits)
  listKycForms: () => api.get<KycForm[]>('/admin/kyc-forms'),
  createKycForm: (body: { name: string; description?: string; enabled?: boolean }) => api.post<KycForm>('/admin/kyc-forms', body),
  updateKycForm: (id: string, patch: { name?: string; description?: string; enabled?: boolean }) => api.patch<KycForm>(`/admin/kyc-forms/${id}`, patch),
  deleteKycForm: (id: string) => api.del<{ ok: boolean }>(`/admin/kyc-forms/${id}`),

  // Consents (config — Admin edits)
  listConsents: () => api.get<Consent[]>('/admin/consents'),
  createConsent: (body: { label: string; body: string; required?: boolean; enabled?: boolean }) => api.post<Consent>('/admin/consents', body),
  updateConsent: (id: string, patch: { label?: string; body?: string; required?: boolean; enabled?: boolean }) => api.patch<Consent>(`/admin/consents/${id}`, patch),
  deleteConsent: (id: string) => api.del<{ ok: boolean }>(`/admin/consents/${id}`),

  // KYC field definitions (Questions / Extended Fields — config, Admin edits)
  listKycFields: (kind: KycFieldKind) => api.get<KycFieldDefinition[]>(`/admin/kyc-fields?kind=${kind}`),
  createKycField: (body: { kind: KycFieldKind; label: string; fieldType?: KycFieldType; required?: boolean }) =>
    api.post<KycFieldDefinition>('/admin/kyc-fields', body),
  updateKycField: (id: string, patch: KycFieldInput) => api.patch<KycFieldDefinition>(`/admin/kyc-fields/${id}`, patch),
  deleteKycField: (id: string) => api.del<{ ok: boolean }>(`/admin/kyc-fields/${id}`),

  // Exchange rates (config — Admin edits)
  listExchangeRates: () => api.get<ExchangeRate[]>('/admin/exchange-rates'),
  createExchangeRate: (body: { base: string; quote: string; rate: string }) => api.post<ExchangeRate>('/admin/exchange-rates', body),
  updateExchangeRate: (id: string, rate: string) => api.patch<ExchangeRate>(`/admin/exchange-rates/${id}`, { rate }),
  deleteExchangeRate: (id: string) => api.del<{ ok: boolean }>(`/admin/exchange-rates/${id}`),

  // Payment method types (Card / E-Wallet — config, Admin edits)
  listPaymentMethodTypes: (category: 'CARD' | 'EWALLET') =>
    api.get<PaymentMethodType[]>(`/admin/payment-method-types?category=${category}`),
  createPaymentMethodType: (body: { category: 'CARD' | 'EWALLET'; name: string; enabled?: boolean; sortOrder?: number }) =>
    api.post<PaymentMethodType>('/admin/payment-method-types', body),
  updatePaymentMethodType: (id: string, patch: { name?: string; enabled?: boolean; sortOrder?: number }) =>
    api.patch<PaymentMethodType>(`/admin/payment-method-types/${id}`, patch),
  deletePaymentMethodType: (id: string) => api.del<{ ok: boolean }>(`/admin/payment-method-types/${id}`),

  // Trading servers (config — Admin edits)
  listServers: () => api.get<TradingServer[]>('/admin/servers'),
  createServer: (body: TradingServerInput) => api.post<TradingServer>('/admin/servers', body),
  updateServer: (id: string, patch: Partial<TradingServerInput>) => api.patch<TradingServer>(`/admin/servers/${id}`, patch),
  deleteServer: (id: string) => api.del<{ ok: boolean }>(`/admin/servers/${id}`),

  // Platform settings (config — Admin edits)
  listSettings: () => api.get<AppSetting[]>('/admin/settings'),
  updateSettings: (updates: { key: string; value: string }[]) =>
    api.patch<AppSetting[]>('/admin/settings', { updates }),

  // Notification templates (config — Admin edits)
  listNotificationTemplates: () => api.get<NotificationTemplate[]>('/admin/notification-templates'),
  updateNotificationTemplate: (id: string, patch: { subject?: string; body?: string }) =>
    api.patch<NotificationTemplate>(`/admin/notification-templates/${id}`, patch),

  // Payment gateways (config — Admin edits)
  listPaymentGateways: () => api.get<PaymentGateway[]>('/admin/payment-gateways'),
  createPaymentGateway: (body: PaymentGatewayInput) => api.post<PaymentGateway>('/admin/payment-gateways', body),
  updatePaymentGateway: (id: string, patch: Partial<PaymentGatewayInput>) =>
    api.patch<PaymentGateway>(`/admin/payment-gateways/${id}`, patch),
  deletePaymentGateway: (id: string) => api.del<{ ok: boolean }>(`/admin/payment-gateways/${id}`),

  // Partners (read-only stub)
  listPartners: () => api.get<PartnerItem[]>('/admin/partners'),
}
