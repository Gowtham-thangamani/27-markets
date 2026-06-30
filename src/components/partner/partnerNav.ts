import { LayoutDashboard, Users, Share2, type LucideIcon } from 'lucide-react'

export interface PartnerNavItem { label: string; to: string; icon: LucideIcon }

export const partnerNav: PartnerNavItem[] = [
  { label: 'Dashboard', to: '/partner/dashboard', icon: LayoutDashboard },
  { label: 'Referred Clients', to: '/partner/clients', icon: Users },
  { label: 'Referral Tools', to: '/partner/tools', icon: Share2 },
]
