import {
  LayoutDashboard,
  Users,
  UserPlus,
  LifeBuoy,
  ShieldCheck,
  Banknote,
  Wallet,
  Handshake,
  BarChart3,
  Settings,
  Newspaper,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  label: string
  to: string
  icon: LucideIcon
}

export const adminNav: AdminNavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Clients', to: '/admin/clients', icon: Users },
  { label: 'Leads', to: '/admin/leads', icon: UserPlus },
  { label: 'Support', to: '/admin/support', icon: LifeBuoy },
  { label: 'KYC Review', to: '/admin/kyc', icon: ShieldCheck },
  { label: 'Finance', to: '/admin/finance', icon: Banknote },
  { label: 'Accounts', to: '/admin/accounts', icon: Wallet },
  { label: 'Partners', to: '/admin/partners', icon: Handshake },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Staff', to: '/admin/staff', icon: Settings },
  { label: 'Blog', to: '/admin/blog', icon: Newspaper },
]
