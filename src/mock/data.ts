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
  emailVerified: true,
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
    leverage: '1:50',
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
    leverage: '1:10',
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
    leverage: '1:100',
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
    leverage: '1:10',
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
  { id: 'd1', name: 'Desktop — Windows (MT5)', platform: 'Windows 10/11', description: 'The MetaTrader 5 desktop terminal with advanced charting and algo trading.', size: '23 MB', version: '5.00', icon: 'desktop', url: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' },
  { id: 'd2', name: 'Desktop — macOS (MT5)', platform: 'macOS 12+', description: 'The MetaTrader 5 desktop terminal for Mac.', size: '35 MB', version: '5.00', icon: 'desktop', url: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.dmg' },
  { id: 'd5', name: 'WebTrader', platform: 'Any browser', description: 'Launch the full trading experience directly in your browser.', size: '—', version: 'Live', icon: 'web' },
  { id: 'd6', name: 'MetaTrader 5', platform: 'Windows 10/11', description: 'The industry-standard MT5 terminal with EAs, algo trading, and 21 timeframes.', size: '23 MB', version: '5.00', icon: 'desktop', url: 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' },
  { id: 'd7', name: 'Account Terms (PDF)', platform: 'Document', description: 'Client agreement, risk disclosure, and fee schedule.', size: '1.2 MB', version: '2026.1', icon: 'doc' },
]

const mk = (
  symbol: string,
  name: string,
  category: Instrument['category'],
  price: number,
  changePct: number,
  spread: number,
  feed?: string
): Instrument => ({ symbol, name, category, price, changePct, spread, feed })

export const instruments: Instrument[] = [
  // ── Forex (live via OANDA) ──
  mk('EUR/USD', 'Euro vs US Dollar', 'Forex', 1.0842, 0.18, 0.1, 'OANDA:EUR_USD'),
  mk('GBP/USD', 'British Pound vs US Dollar', 'Forex', 1.2731, -0.24, 0.3, 'OANDA:GBP_USD'),
  mk('USD/JPY', 'US Dollar vs Japanese Yen', 'Forex', 156.42, 0.42, 0.2, 'OANDA:USD_JPY'),
  mk('AUD/USD', 'Australian Dollar vs US Dollar', 'Forex', 0.6612, -0.11, 0.4, 'OANDA:AUD_USD'),
  mk('USD/CAD', 'US Dollar vs Canadian Dollar', 'Forex', 1.3674, 0.09, 0.3, 'OANDA:USD_CAD'),
  mk('USD/CHF', 'US Dollar vs Swiss Franc', 'Forex', 0.8932, -0.07, 0.3, 'OANDA:USD_CHF'),
  mk('NZD/USD', 'NZ Dollar vs US Dollar', 'Forex', 0.6124, 0.21, 0.5, 'OANDA:NZD_USD'),
  mk('EUR/JPY', 'Euro vs Japanese Yen', 'Forex', 169.58, 0.31, 0.4, 'OANDA:EUR_JPY'),
  mk('EUR/GBP', 'Euro vs British Pound', 'Forex', 0.8515, -0.05, 0.4, 'OANDA:EUR_GBP'),
  mk('GBP/JPY', 'British Pound vs Japanese Yen', 'Forex', 199.12, 0.52, 0.6, 'OANDA:GBP_JPY'),
  // ── Metals (live via OANDA) ──
  mk('XAU/USD', 'Gold Spot', 'Metals', 2348.6, 0.86, 0.8, 'OANDA:XAU_USD'),
  mk('XAG/USD', 'Silver Spot', 'Metals', 30.42, 1.24, 1.2, 'OANDA:XAG_USD'),
  mk('XPT/USD', 'Platinum Spot', 'Metals', 962.4, 0.44, 2.0, 'OANDA:XPT_USD'),
  mk('XPD/USD', 'Palladium Spot', 'Metals', 1024.8, -0.62, 2.5, 'OANDA:XPD_USD'),
  // ── Indices (indicative — no free real-time feed) ──
  mk('US500', 'S&P 500 Index', 'Indices', 5478.2, 0.34, 0.4),
  mk('US100', 'Nasdaq 100 Index', 'Indices', 19842.5, 0.61, 1.0),
  mk('US30', 'Dow Jones 30', 'Indices', 38502.0, 0.18, 2.0),
  mk('GER40', 'DAX 40 Index', 'Indices', 18412.0, -0.22, 0.9),
  mk('UK100', 'FTSE 100 Index', 'Indices', 8214.5, 0.12, 1.0),
  mk('JP225', 'Nikkei 225 Index', 'Indices', 39102.0, 0.74, 5.0),
  mk('FRA40', 'CAC 40 Index', 'Indices', 7642.0, -0.18, 1.0),
  mk('AUS200', 'ASX 200 Index', 'Indices', 7812.0, 0.26, 1.5),
  // ── Commodities (indicative — no free real-time feed) ──
  mk('UKOIL', 'Brent Crude Oil', 'Commodities', 82.14, -0.74, 0.3),
  mk('USOIL', 'WTI Crude Oil', 'Commodities', 78.36, -0.68, 0.3),
  mk('NATGAS', 'Natural Gas', 'Commodities', 2.84, 2.15, 0.5),
  mk('COPPER', 'Copper', 'Commodities', 4.52, 0.34, 0.4),
  mk('WHEAT', 'Wheat', 'Commodities', 598.2, -0.42, 1.0),
  mk('COFFEE', 'Coffee', 'Commodities', 242.6, 1.12, 1.2),
  // ── Stocks (live via Finnhub) ──
  mk('AAPL', 'Apple Inc.', 'Stocks', 213.4, 0.92, 0.05, 'AAPL'),
  mk('TSLA', 'Tesla Inc.', 'Stocks', 184.6, -1.34, 0.08, 'TSLA'),
  mk('NVDA', 'NVIDIA Corp.', 'Stocks', 126.8, 2.41, 0.06, 'NVDA'),
  mk('AMZN', 'Amazon.com Inc.', 'Stocks', 186.2, 0.48, 0.07, 'AMZN'),
  mk('MSFT', 'Microsoft Corp.', 'Stocks', 441.6, 0.36, 0.05, 'MSFT'),
  mk('GOOGL', 'Alphabet Inc.', 'Stocks', 178.4, 0.54, 0.06, 'GOOGL'),
  mk('META', 'Meta Platforms', 'Stocks', 504.2, 1.18, 0.07, 'META'),
  mk('AMD', 'Advanced Micro Devices', 'Stocks', 162.3, -0.84, 0.07, 'AMD'),
]

/** All live feed symbols across instruments — used to configure the market stream. */
export const instrumentFeedSymbols: string[] = instruments
  .map((i) => i.feed)
  .filter((f): f is string => !!f)
