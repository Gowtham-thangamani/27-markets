import { api } from './api'

export interface Quote {
  symbol: string
  price: number
  prevClose?: number
  changePct?: number
  asOf: number
  stale: boolean
}

export interface MarketHealth {
  provider: string
  configured: boolean
  wsConnected: boolean
  symbols: string[]
  cached: number
}

export const marketApi = {
  overview: () => api.get<Quote[]>('/market/overview'),
  quotes: (symbols: string[]) =>
    api.get<Quote[]>(`/market/quotes?symbols=${encodeURIComponent(symbols.join(','))}`),
  health: () => api.get<MarketHealth>('/market/health'),
}
