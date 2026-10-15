/** Shared domain types for the 27 Markets portal (mock data). */

export type AccountType = 'Standard' | 'Raw Spread' | 'VIP'
export type AccountStatus = 'Active' | 'Pending' | 'Suspended' | 'Archived'
export type AccountMode = 'Live' | 'Demo'

export interface TradingAccount {
  id: string
  /** Human-facing 8-digit account number (display); `id` is the API identifier. */
  number: string
  type: AccountType
  mode: AccountMode
  currency: string
  balance: number
  equity: number
  freeMargin: number
  marginLevel: number
  leverage: string
  status: AccountStatus
  createdAt: string
}

export type TxKind = 'Deposit' | 'Withdrawal' | 'Transfer'
export type TxStatus = 'Completed' | 'Pending' | 'Failed' | 'Rejected'

export interface Transaction {
  id: string
  kind: TxKind
  method: string
  amount: number
  currency: string
  status: TxStatus
  account: string
  date: string
}

export type KycStatus = 'Approved' | 'Pending' | 'Rejected' | 'Not Submitted'

export interface KycStep {
  id: 'identity' | 'address' | 'selfie'
  title: string
  description: string
  status: KycStatus
  fileName?: string
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved'
export type TicketPriority = 'Low' | 'Medium' | 'High'

export interface SupportTicket {
  id: string
  subject: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  message: string
  createdAt: string
}

export interface PlatformDownload {
  id: string
  name: string
  platform: string
  description: string
  size: string
  version: string
  icon: 'desktop' | 'mobile' | 'web' | 'doc'
  /** Real external download/app-store URL. When set, the button links out to it. */
  url?: string
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  date: string
  read: boolean
  kind: 'info' | 'success' | 'warning'
}

export type AppRole = 'CLIENT' | 'PARTNER' | 'ADMIN' | 'AGENT'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: AppRole
  phone: string
  country: string
  joinedAt: string
  emailVerified: boolean
  avatarColor: string
  notifySecurity: boolean
  notifyProduct: boolean
  notifyMarketing: boolean
}

export type InstrumentCategory =
  | 'Forex'
  | 'Metals'
  | 'Indices'
  | 'Commodities'
  | 'Stocks'
  | 'Crypto'

export interface Instrument {
  symbol: string
  name: string
  category: InstrumentCategory
  price: number
  changePct: number
  spread: number
  /** Provider feed symbol (Finnhub/Binance) for live prices; omitted = no live feed yet. */
  feed?: string
}
