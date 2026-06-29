import { api } from './api'

export type PartnerApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface PartnerApplication {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  country: string | null
  company: string | null
  website: string | null
  audience: string | null
  status: PartnerApplicationStatus
  notes: string | null
  createdAt: string
  reviewedAt: string | null
  resultingUserId: string | null
}

export interface ApplyPartnerBody {
  firstName: string; lastName: string; email: string
  phone?: string; country?: string; company?: string; website?: string; audience?: string
}

export interface ApproveResult { ok: true; referralCode: string; inviteUrl: string }

export const partnersApi = {
  apply: (body: ApplyPartnerBody) => api.post<{ id: string }>('/partners/apply', body),
  listApplications: (status?: PartnerApplicationStatus) =>
    api.get<PartnerApplication[]>(`/admin/partner-applications${status ? `?status=${status}` : ''}`),
  approve: (id: string) => api.post<ApproveResult>(`/admin/partner-applications/${id}/approve`, {}),
  reject: (id: string, reason?: string) =>
    api.post<{ ok: true }>(`/admin/partner-applications/${id}/reject`, { reason }),
}
