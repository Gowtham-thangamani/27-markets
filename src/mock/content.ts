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
  title: string
  description: string
}

export const whyFeatures: Feature[] = [
  {
    icon: Droplets,
    title: 'Deep Liquidity',
    description: 'Access institutional-grade liquidity aggregated from top-tier global providers.',
  },
  {
    icon: Gauge,
    title: 'Tight Spreads',
    description: 'Raw spreads from 0.0 pips on major pairs with fully transparent pricing.',
  },
  {
    icon: Zap,
    title: 'Fast Execution',
    description: 'Lightning-fast order execution under 30ms with no dealing desk and no re-quotes.',
  },
  {
    icon: Eye,
    title: 'Transparent Trading',
    description: 'No hidden fees, no markups. Clear conditions you can verify on every trade.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Funds',
    description: 'Segregated client accounts held with industry-leading banking partners.',
  },
]

export interface PartnerBenefit {
  icon: LucideIcon
  title: string
  description: string
}

export const partnerBenefits: PartnerBenefit[] = [
  {
    icon: Coins,
    title: 'Competitive Rebates',
    description: 'Industry-leading rebates that scale with your referred trading volume.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Reports',
    description: 'Advanced reporting and earnings analytics in a dedicated partner dashboard.',
  },
  {
    icon: UserCog,
    title: 'Dedicated Manager',
    description: 'A personal account manager committed to growing your business.',
  },
  {
    icon: Megaphone,
    title: 'Marketing Support',
    description: 'Banners, landing pages, and promotional materials ready to deploy.',
  },
  {
    icon: TrendingUp,
    title: 'Business Growth',
    description: 'Grow your network and earn alongside a trusted global partner.',
  },
]

export interface MarketCategory {
  key: InstrumentCategory
  icon: LucideIcon
  /** Optional image used instead of the lucide icon (e.g. the Bitcoin coin). */
  image?: string
  title: string
  subtitle: string
  examples: string
}

export const marketCategories: MarketCategory[] = [
  {
    key: 'Forex',
    icon: Handshake,
    title: 'Forex',
    subtitle: 'Major, minor & exotic currency pairs',
    examples: 'EUR/USD · GBP/USD · USD/JPY',
  },
  {
    key: 'Metals',
    icon: Coins,
    title: 'Metals',
    subtitle: 'Precious metals spot trading',
    examples: 'Gold (XAU) · Silver (XAG)',
  },
  {
    key: 'Indices',
    icon: LineChart,
    title: 'Indices',
    subtitle: 'Global index cash & futures',
    examples: 'US500 · US100 · GER40',
  },
  {
    key: 'Commodities',
    icon: Boxes,
    title: 'Commodities',
    subtitle: 'Energy, softs & agricultural',
    examples: 'Brent · WTI · NatGas',
  },
  {
    key: 'Stocks',
    icon: CandlestickChart,
    title: 'Stocks',
    subtitle: 'Global share CFDs',
    examples: 'AAPL · TSLA · NVDA',
  },
  {
    key: 'Crypto',
    icon: Bitcoin,
    image: '/bitcoin-coin.png',
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
      'Minimum deposit $100',
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

export const aboutValues = [
  {
    icon: Eye,
    title: 'Our Vision',
    description:
      'To be a global leader in online trading, recognized for our integrity, innovation, and partnership-driven growth.',
  },
  {
    icon: Building2,
    title: 'Our Mission',
    description:
      'To deliver exceptional trading experiences by combining technology, liquidity, and a relentlessly customer-centric service.',
  },
  {
    icon: ShieldCheck,
    title: 'Our Values',
    description:
      'We believe in integrity, transparency, innovation, performance, and building lasting partnerships with everyone we serve.',
  },
]
