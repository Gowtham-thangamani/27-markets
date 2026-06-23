import { api } from './api'

export interface CaptureLeadInput {
  name: string
  email: string
  phone?: string
  country?: string
  source?: 'DEMO' | 'MANUAL'
  message?: string
}

/** Public prospect capture — demo requests and contact enquiries become CRM leads. */
export const leadsApi = {
  capture: (input: CaptureLeadInput) => api.post<{ id: string; deduped: boolean }>('/leads', input),
}
