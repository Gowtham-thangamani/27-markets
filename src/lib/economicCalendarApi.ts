import { api } from './api'

export type EconomicImpact = 'LOW' | 'MEDIUM' | 'HIGH'

export interface EconomicEvent {
  id: string
  title: string
  country: string
  currency: string
  impact: EconomicImpact
  eventAt: string
  actual: string | null
  forecast: string | null
  previous: string | null
  enabled: boolean
}

export interface SaveEventInput {
  title: string
  country: string
  currency: string
  impact?: EconomicImpact
  eventAt: string
  actual?: string
  forecast?: string
  previous?: string
  enabled?: boolean
}

export const economicCalendarApi = {
  // Public — enabled, forward-looking events for the client calendar.
  list: (from?: string, to?: string) => {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    const qs = q.toString()
    return api.get<EconomicEvent[]>(`/economic-calendar${qs ? `?${qs}` : ''}`)
  },

  // Admin CRUD.
  adminList: () => api.get<EconomicEvent[]>('/admin/economic-calendar'),
  create: (input: SaveEventInput) => api.post<EconomicEvent>('/admin/economic-calendar', input),
  update: (id: string, input: Partial<SaveEventInput>) =>
    api.patch<EconomicEvent>(`/admin/economic-calendar/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/admin/economic-calendar/${id}`),
}
