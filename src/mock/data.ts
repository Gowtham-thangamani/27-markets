import type {
  Instrument,
  KycStep,
  NotificationItem,
  PlatformDownload,
  SupportTicket,
  TradingAccount,
  Transaction,
  UserProfile,
} from '@/lib/types'

export const demoUser: UserProfile = {
  id: 'usr_10241',
  name: 'Jordan Avery',
  email: 'jordan.avery@example.com',
  role: 'CLIENT',
  phone: '+971 50 123 4567',
  country: 'United Arab Emirates',
  joinedAt: '2025-02-14T10:00:00Z',
  avatarColor: '#e11d2e',
}

export const seedAccounts: TradingAccount[] = [
  {
    id: '21001234',
    number: '21001234',
    type: 'Raw Spread',
    mode: 'Live',
    currency: 'USD',
    balance: 18450.25,
    equity: 18620.4,
    freeMargin: 16120.6,
    marginLevel: 512.45,
    leverage: '1:500',
    status: 'Active',
    createdAt: '2025-03-02T09:30:00Z',
  },
  {
    id: '21005678',
    number: '21005678',
    type: 'Standard',
    mode: 'Live',
    currency: 'USD',
    balance: 8760.25,
    equity: 8910.1,
    freeMargin: 7430.0,
    marginLevel: 384.2,
    leverage: '1:400',
    status: 'Active',
    createdAt: '2025-04-18T14:05:00Z',
  },
  {
    id: '21009876',
    number: '21009876',
    type: 'VIP',
    mode: 'Live',
    currency: 'USD',
    balance: 6420.25,
    equity: 6430.15,
    freeMargin: 5980.0,
    marginLevel: 690.5,
    leverage: '1:500',
    status: 'Active',
    createdAt: '2025-05-21T11:45:00Z',
  },
  {
    id: '90001122',
    number: '90001122',
    type: 'Standard',
    mode: 'Demo',
    currency: 'USD',
    balance: 50000.0,
    equity: 50000.0,
    freeMargin: 50000.0,
    marginLevel: 0,
    leverage: '1:500',
    status: 'Active',
    createdAt: '2025-06-01T08:00:00Z',
  },
]

export const seedTransactions: Transaction[] = [
  { id: 'TX-90412', kind: 'Deposit', method: 'Bank Transfer', amount: 5000, currency: 'USD', status: 'Completed', account: '21001234', date: '2026-06-18T12:30:00Z' },
  { id: 'TX-90388', kind: 'Withdrawal', method: 'Credit / Debit Card', amount: 1200, currency: 'USD', status: 'Pending', account: '21005678', date: '2026-06-17T09:12:00Z' },
  { id: 'TX-90355', kind: 'Deposit', method: 'Crypto (USDT)', amount: 2500, currency: 'USD', status: 'Completed', account: '21001234', date: '2026-06-15T16:48:00Z' },
  { id: 'TX-90299', kind: 'Transfer', method: 'Internal Transfer', amount: 800, currency: 'USD', status: 'Completed', account: '21009876', date: '2026-06-12T10:05:00Z' },
  { id: 'TX-90187', kind: 'Deposit', method: 'E-Wallet (Skrill)', amount: 3000, currency: 'USD', status: 'Completed', account: '21005678', date: '2026-06-08T14:20:00Z' },
  { id: 'TX-90055', kind: 'Withdrawal', method: 'Bank Transfer', amount: 600, currency: 'USD', status: 'Failed', account: '21001234', date: '2026-06-03T18:00:00Z' },
]

export const seedKyc: KycStep[] = [
  {
    id: 'identity',
    title: 'Identity Verification',
    description: 'Upload a clear photo of your passport, national ID, or driver license.',
    status: 'Approved',
    fileName: 'passport-front.jpg',
  },
  {
    id: 'address',
    title: 'Proof of Address',
    description: 'Upload a recent utility bill or bank statement (issued within 3 months).',
    status: 'Pending',
    fileName: 'utility-bill.pdf',
  },
  {
    id: 'selfie',
    title: 'Selfie Verification',
    description: 'Take a selfie holding your ID document next to your face.',
    status: 'Not Submitted',
  },
]

export const seedTickets: SupportTicket[] = [
  {
    id: 'TK-2041',
    subject: 'Withdrawal taking longer than expected',
    category: 'Funding',
    priority: 'High',
    status: 'In Progress',
    message: 'My card withdrawal of $1,200 has been pending for two days.',
    createdAt: '2026-06-17T09:30:00Z',
  },
  {
    id: 'TK-2009',
    subject: 'How do I enable two-factor authentication?',
    category: 'Account',
    priority: 'Low',
    status: 'Resolved',
    message: 'I would like to secure my account with 2FA.',
    createdAt: '2026-06-10T13:10:00Z',
  },
]

export const seedNotifications: NotificationItem[] = [
  { id: 'n1', title: 'Deposit confirmed', body: 'Your $5,000 bank transfer was credited to account 21001234.', date: '2026-06-18T12:31:00Z', read: false, kind: 'success' },
  { id: 'n2', title: 'KYC update required', body: 'Your proof of address is under review. We will notify you shortly.', date: '2026-06-17T09:15:00Z', read: false, kind: 'warning' },
  { id: 'n3', title: 'New platform release', body: '27 Terminal 5.2 is now available in the Download Center.', date: '2026-06-14T08:00:00Z', read: true, kind: 'info' },
]

export const downloads: PlatformDownload[] = [
  { id: 'd1', name: '27 Terminal — Windows', platform: 'Windows 10/11', description: 'Full-featured desktop trading terminal with advanced charting.', size: '86 MB', version: '5.2.1', icon: 'desktop' },
  { id: 'd2', name: '27 Terminal — macOS', platform: 'macOS 12+', description: 'Native Apple Silicon build of the desktop terminal.', size: '92 MB', version: '5.2.1', icon: 'desktop' },
  { id: 'd3', name: '27 Mobile — iOS', platform: 'iPhone / iPad', description: 'Trade on the go with biometric login and price alerts.', size: '64 MB', version: '4.8.0', icon: 'mobile' },
  { id: 'd4', name: '27 Mobile — Android', platform: 'Android 9+', description: 'Lightweight mobile app with one-tap order execution.', size: '58 MB', version: '4.8.0', icon: 'mobile' },
  { id: 'd5', name: 'WebTrader', platform: 'Any browser', description: 'Launch the full trading experience directly in your browser.', size: '—', version: 'Live', icon: 'web' },
  { id: 'd6', name: 'Account Terms (PDF)', platform: 'Document', description: 'Client agreement, risk disclosure, and fee schedule.', size: '1.2 MB', version: '2026.1', icon: 'doc' },
]

const mk = (
  symbol: string,
  name: string,
  category: Instrument['category'],
  price: number,
  changePct: number,
  spread: number
): Instrument => ({ symbol, name, category, price, changePct, spread })

export const instruments: Instrument[] = [
  mk('EUR/USD', 'Euro vs US Dollar', 'Forex', 1.0842, 0.18, 0.1),
  mk('GBP/USD', 'British Pound vs US Dollar', 'Forex', 1.2731, -0.24, 0.3),
  mk('USD/JPY', 'US Dollar vs Japanese Yen', 'Forex', 156.42, 0.42, 0.2),
  mk('AUD/USD', 'Australian Dollar vs US Dollar', 'Forex', 0.6612, -0.11, 0.4),
  mk('XAU/USD', 'Gold Spot', 'Metals', 2348.6, 0.86, 0.8),
  mk('XAG/USD', 'Silver Spot', 'Metals', 30.42, 1.24, 1.2),
  mk('US500', 'S&P 500 Index', 'Indices', 5478.2, 0.34, 0.4),
  mk('US100', 'Nasdaq 100 Index', 'Indices', 19842.5, 0.61, 1.0),
  mk('GER40', 'DAX 40 Index', 'Indices', 18412.0, -0.22, 0.9),
  mk('UKOIL', 'Brent Crude Oil', 'Commodities', 82.14, -0.74, 0.3),
  mk('USOIL', 'WTI Crude Oil', 'Commodities', 78.36, -0.68, 0.3),
  mk('NATGAS', 'Natural Gas', 'Commodities', 2.84, 2.15, 0.5),
  mk('AAPL', 'Apple Inc.', 'Stocks', 213.4, 0.92, 0.05),
  mk('TSLA', 'Tesla Inc.', 'Stocks', 184.6, -1.34, 0.08),
  mk('NVDA', 'NVIDIA Corp.', 'Stocks', 126.8, 2.41, 0.06),
  mk('AMZN', 'Amazon.com Inc.', 'Stocks', 186.2, 0.48, 0.07),
  mk('BTC/USD', 'Bitcoin', 'Crypto', 64280.0, 1.86, 18.0),
  mk('ETH/USD', 'Ethereum', 'Crypto', 3412.0, 2.42, 2.4),
  mk('SOL/USD', 'Solana', 'Crypto', 142.8, 4.12, 0.6),
  mk('XRP/USD', 'Ripple', 'Crypto', 0.4821, -0.92, 0.01),
]
