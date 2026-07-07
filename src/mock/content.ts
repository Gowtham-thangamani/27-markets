import {
  Droplets,
  Gauge,
  ShieldCheck,
  Zap,
  Eye,
  Coins,
  LineChart,
  Boxes,
  CandlestickChart,
  Bitcoin,
  Building2,
  Handshake,
  BarChart3,
  UserCog,
  Megaphone,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { InstrumentCategory } from '@/lib/types'

export interface Feature {
  icon: LucideIcon
  image?: string
  title: string
  description: string
  titleKey?: string
  descKey?: string
}

export const whyFeatures: Feature[] = [
  {
    icon: Droplets,
    image: '/feat-liquidity.png',
    title: 'Deep Liquidity',
    description: 'Access institutional-grade liquidity aggregated from top-tier global providers.',
    titleKey: 'why.f1t',
    descKey: 'why.f1d',
  },
  {
    icon: Gauge,
    image: '/feat-spreads.png',
    title: 'Tight Spreads',
    description: 'Raw spreads from 0.0 pips on major pairs with fully transparent pricing.',
    titleKey: 'why.f2t',
    descKey: 'why.f2d',
  },
  {
    icon: Zap,
    image: '/feat-execution.png',
    title: 'Fast Execution',
    description: 'Lightning-fast order execution under 30ms with no dealing desk and no re-quotes.',
    titleKey: 'why.f3t',
    descKey: 'why.f3d',
  },
  {
    icon: Eye,
    image: '/feat-transparent.png',
    title: 'Transparent Trading',
    description: 'No hidden fees, no markups. Clear conditions you can verify on every trade.',
    titleKey: 'why.f4t',
    descKey: 'why.f4d',
  },
  {
    icon: ShieldCheck,
    image: '/feat-secure.png',
    title: 'Secure Funds',
    description: 'Segregated client accounts held with industry-leading banking partners.',
    titleKey: 'why.f5t',
    descKey: 'why.f5d',
  },
]

export interface PartnerBenefit {
  icon: LucideIcon
  image?: string
  title: string
  description: string
}

export const partnerBenefits: PartnerBenefit[] = [
  {
    icon: Coins,
    image: '/partner-rebates.png',
    title: 'Competitive Rebates',
    description: 'Industry-leading rebates that scale with your referred trading volume.',
  },
  {
    icon: BarChart3,
    image: '/partner-reports.png',
    title: 'Real-Time Reports',
    description: 'Advanced reporting and earnings analytics in a dedicated partner dashboard.',
  },
  {
    icon: UserCog,
    image: '/partner-manager.png',
    title: 'Dedicated Manager',
    description: 'A personal account manager committed to growing your business.',
  },
  {
    icon: Megaphone,
    image: '/partner-marketing.png',
    title: 'Marketing Support',
    description: 'Banners, landing pages, and promotional materials ready to deploy.',
  },
  {
    icon: TrendingUp,
    image: '/partner-growth.png',
    title: 'Business Growth',
    description: 'Grow your network and earn alongside a trusted global partner.',
  },
]

export interface MarketCategory {
  key: InstrumentCategory
  icon: LucideIcon
  /** Optional image used instead of the lucide icon (e.g. the Bitcoin coin). */
  image?: string
  /** Optional light-theme override for `image` (falls back to `image`). */
  imageLight?: string
  title: string
  subtitle: string
  examples: string
}

export const marketCategories: MarketCategory[] = [
  {
    key: 'Forex',
    icon: Handshake,
    image: '/icon-forex.png',
    imageLight: '/icon-forex-light.png',
    title: 'Forex',
    subtitle: 'Major, minor & exotic currency pairs',
    examples: 'EUR/USD · GBP/USD · USD/JPY',
  },
  {
    key: 'Metals',
    icon: Coins,
    image: '/icon-metals.png',
    imageLight: '/icon-metals-light.png',
    title: 'Metals',
    subtitle: 'Precious metals spot trading',
    examples: 'Gold (XAU) · Silver (XAG)',
  },
  {
    key: 'Indices',
    icon: LineChart,
    image: '/icon-indices.png',
    imageLight: '/icon-indices-light.png',
    title: 'Indices',
    subtitle: 'Global index cash & futures',
    examples: 'US500 · US100 · GER40',
  },
  {
    key: 'Commodities',
    icon: Boxes,
    image: '/icon-commodities.png',
    imageLight: '/icon-commodities-light.png',
    title: 'Commodities',
    subtitle: 'Energy, softs & agricultural',
    examples: 'Brent · WTI · NatGas',
  },
  {
    key: 'Stocks',
    icon: CandlestickChart,
    image: '/icon-stocks.png',
    title: 'Stocks',
    subtitle: 'Global share CFDs',
    examples: 'AAPL · TSLA · NVDA',
  },
  {
    key: 'Crypto',
    icon: Bitcoin,
    image: '/bitcoin-coin.png',
    imageLight: '/icon-crypto.png',
    title: 'Crypto CFDs',
    subtitle: 'Top cryptocurrencies with competitive spreads',
    examples: 'BTC · ETH · SOL',
  },
]

export interface AccountTier {
  name: 'Standard' | 'Raw Spread' | 'VIP'
  audience: string
  spread: string
  leverage: string
  popular?: boolean
  features: string[]
}

export const accountTiers: AccountTier[] = [
  {
    name: 'Standard',
    audience: 'Perfect for all traders',
    spread: '0.8',
    leverage: '1:500',
    features: [
      'Commission free',
      'Access to all markets',
      '24/5 customer support',
      'Minimum deposit $50',
    ],
  },
  {
    name: 'Raw Spread',
    audience: 'For experienced traders',
    spread: '0.0',
    leverage: '1:500',
    popular: true,
    features: [
      'Low raw spreads',
      '$7 commission per lot',
      'Access to all markets',
      '24/5 priority support',
    ],
  },
  {
    name: 'VIP',
    audience: 'For high-volume traders',
    spread: '0.0',
    leverage: '1:500',
    features: [
      'Lowest raw spreads',
      'Custom commission',
      'Personal account manager',
      'Priority withdrawals',
    ],
  },
]

/** Maps each English account-tier feature string to its i18n key (accts.f.*). */
export const accountFeatureKey: Record<string, string> = {
  'Commission free': 'accts.f.commissionFree',
  'Access to all markets': 'accts.f.allMarkets',
  '24/5 customer support': 'accts.f.support',
  'Minimum deposit $50': 'accts.f.min',
  'Low raw spreads': 'accts.f.lowRaw',
  '$7 commission per lot': 'accts.f.commission7',
  '24/5 priority support': 'accts.f.priority',
  'Lowest raw spreads': 'accts.f.lowestRaw',
  'Custom commission': 'accts.f.customComm',
  'Personal account manager': 'accts.f.manager',
  'Priority withdrawals': 'accts.f.priorityW',
}

export const aboutValues = [
  { icon: Eye, titleKey: 'abt.v1t', descKey: 'abt.v1d' },
  { icon: Building2, titleKey: 'abt.v2t', descKey: 'abt.v2d' },
  { icon: ShieldCheck, titleKey: 'abt.v3t', descKey: 'abt.v3d' },
]
