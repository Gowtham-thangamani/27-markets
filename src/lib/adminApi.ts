import { api } from './api'

export interface AdminDashboardSummary {
  totalClients: number
  pendingKyc: number
  pendingWithdrawals: number
  depositsToday: number
  openTickets: number
}

/** Typed CRM admin API surface. Thin wrapper over the shared `api` client. */
export const adminApi = {
  getDashboard: () => api.get<AdminDashboardSummary>('/admin/dashboard'),
}
