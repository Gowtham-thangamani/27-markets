import { api } from './api'

export type InstrumentCategory =
  | 'Forex'
  | 'Metals'
  | 'Indices'
  | 'Commodities'
  | 'Stocks'
  | 'Crypto'

export interface TradingInstrument {
  id: string
  symbol: string
  name: string
  category: InstrumentCategory
  feed: string | null
  spread: number
  enabled: boolean
  sortOrder: number
}

export interface SaveInstrumentInput {
  symbol: string
  name: string
  category: InstrumentCategory
  feed?: string
  spread?: number
  sortOrder?: number
  enabled?: boolean
}

export const instrumentsApi = {
  // Public — enabled instruments for the markets page + trade terminal.
  list: () => api.get<TradingInstrument[]>('/instruments'),

  // Admin CRUD.
  adminList: () => api.get<TradingInstrument[]>('/admin/instruments'),
  create: (input: SaveInstrumentInput) => api.post<TradingInstrument>('/admin/instruments', input),
  update: (id: string, input: Partial<SaveInstrumentInput>) =>
    api.patch<TradingInstrument>(`/admin/instruments/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/admin/instruments/${id}`),
}
