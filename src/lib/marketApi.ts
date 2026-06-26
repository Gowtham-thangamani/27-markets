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

export interface Candle {
  time: number // epoch seconds
  open: number
  high: number
  low: number
  close: number
}

export const marketApi = {
  overview: () => api.get<Quote[]>('/market/overview'),
  quotes: (symbols: string[]) =>
    api.get<Quote[]>(`/market/quotes?symbols=${encodeURIComponent(symbols.join(','))}`),
  candles: (symbol: string, res = 60) =>
    api.get<Candle[]>(`/market/candles?symbol=${encodeURIComponent(symbol)}&res=${res}`),
  health: () => api.get<MarketHealth>('/market/health'),
}
