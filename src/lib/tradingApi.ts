import { api } from './api'

export type OrderSide = 'BUY' | 'SELL'
export type PositionStatus = 'OPEN' | 'CLOSED'

// Prisma Decimals serialize to strings over the wire.
export interface Position {
  id: string
  accountId: string
  symbol: string
  side: OrderSide
  quantity: string
  entryPrice: string
  exitPrice: string | null
  realizedPnl: string | null
  status: PositionStatus
  openedAt: string
  closedAt: string | null
}

export interface Order {
  id: string
  symbol: string
  side: OrderSide
  quantity: string
  price: string
  status: string
  simulated: boolean
  createdAt: string
}

export const tradingApi = {
  placeOrder: (body: { accountId: string; symbol: string; side: OrderSide; quantity: number }) =>
    api.post<Position>('/trading/orders', body),
  listOrders: () => api.get<Order[]>('/trading/orders'),
  listPositions: (status?: PositionStatus) =>
    api.get<Position[]>(`/trading/positions${status ? `?status=${status}` : ''}`),
  closePosition: (id: string) => api.post<Position>(`/trading/positions/${id}/close`),
}
