import { api } from './api'

export type AmlStatus = 'CLEAR' | 'REVIEW' | 'HIT'

export interface AmlScreening {
  id: string
  userId: string
  client?: string
  status: AmlStatus
  provider: string
  hits: unknown
  screenedAt: string
}

export const amlApi = {
  // Screenings needing a compliance decision (REVIEW / HIT).
  listScreenings: () => api.get<AmlScreening[]>('/admin/aml/screenings'),
  // Run (or re-run) a screening for a client.
  screen: (userId: string) => api.post<AmlScreening>(`/admin/aml/screen/${userId}`),
}
