import { LayoutDashboard, Users, TrendingUp, Network, Coins, Wallet, Share2, Megaphone, Settings, type LucideIcon } from 'lucide-react'

export interface PartnerNavItem { label: string; to: string; icon: LucideIcon }

export const partnerNav: PartnerNavItem[] = [
  { label: 'Dashboard', to: '/partner/dashboard', icon: LayoutDashboard },
  { label: 'Referred Clients', to: '/partner/clients', icon: Users },
  { label: 'Performance', to: '/partner/performance', icon: TrendingUp },
  { label: 'Sub-Partners', to: '/partner/sub-partners', icon: Network },
  { label: 'Commissions', to: '/partner/commissions', icon: Coins },
  { label: 'Payouts', to: '/partner/payouts', icon: Wallet },
  { label: 'Referral Tools', to: '/partner/tools', icon: Share2 },
  { label: 'Marketing', to: '/partner/marketing', icon: Megaphone },
  { label: 'Settings', to: '/partner/settings', icon: Settings },
]
