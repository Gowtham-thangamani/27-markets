import {
  LayoutDashboard,
  CandlestickChart,
  Wallet,
  ArrowLeftRight,
  Download,
  User,
  LifeBuoy,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export interface NavLinkItem {
  label: string
  to: string
  icon: LucideIcon
}

export const portalNav: NavLinkItem[] = [
  { label: 'Dashboard', to: '/portal/dashboard', icon: LayoutDashboard },
  { label: 'Trade', to: '/portal/trade', icon: CandlestickChart },
  { label: 'Accounts', to: '/portal/accounts', icon: Wallet },
  { label: 'Funds', to: '/portal/funds', icon: ArrowLeftRight },
  { label: 'KYC', to: '/portal/kyc', icon: ShieldCheck },
  { label: 'Downloads', to: '/portal/downloads', icon: Download },
  { label: 'Profile', to: '/portal/profile', icon: User },
  { label: 'Support', to: '/portal/support', icon: LifeBuoy },
]
