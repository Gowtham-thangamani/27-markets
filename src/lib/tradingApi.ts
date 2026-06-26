import { api } from './api'

export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP'
export type OrderStatus = 'PENDING' | 'FILLED' | 'REJECTED' | 'CANCELLED'
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
  type: OrderType
  quantity: string
  price: string
  triggerPrice: string | null
  status: OrderStatus
  simulated: boolean
  createdAt: string
}

export const tradingApi = {
  placeOrder: (body: {
    accountId: string
    symbol: string
    side: OrderSide
    quantity: number
    type?: OrderType
    triggerPrice?: number
  }) => api.post<Position | Order>('/trading/orders', body),
  listOrders: () => api.get<Order[]>('/trading/orders'),
  listPositions: (status?: PositionStatus) =>
    api.get<Position[]>(`/trading/positions${status ? `?status=${status}` : ''}`),
  closePosition: (id: string) => api.post<Position>(`/trading/positions/${id}/close`),
  cancelOrder: (id: string) => api.post<Order>(`/trading/orders/${id}/cancel`),
}
